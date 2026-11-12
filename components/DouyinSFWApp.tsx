"use client";

import React, { useState, useRef } from "react";
import { WorldSettings } from "./SettingsApp";
import { TavernCharacterCard } from "../types";

interface DouyinSFWAppProps {
  settings: WorldSettings;
}

interface FeedItem {
  id: string;
  name: string;
  avatar: string;
  coverUrl: string;
  title: string;
  tags: string[];
  likes: string;
  danmus: string[];      
  voiceLine: string;     
  audioDuration: string; 
  voiceStyle?: string;
  first_mes?: string;
}

// 🚀 图床容错1：极速二次元男神接口
const fetchWaifuImg = async () => {
  try {
    const res = await fetch("https://api.waifu.pics/sfw/husbando");
    const data = await res.json();
    return data.url;
  } catch {
    return null;
  }
};

// 🛡️ 图床容错2：如果极速接口挂了，用高逼格暗黑占位图（绝不裂图）
const FALLBACK_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23181824'/><stop offset='100%' stop-color='%230a0a0f'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g)'/><text x='50%' y='50%' font-family='sans-serif' font-size='24' fill='rgba(255,255,255,0.2)' text-anchor='middle' dominant-baseline='middle'>Loading...</text></svg>";

export default function DouyinSFWApp({ settings }: DouyinSFWAppProps) {
  const [feedList, setFeedList] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState<FeedItem | null>(null);
  
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const voiceWaveRef = useRef<NodeJS.Timeout | null>(null);
  const [waveHeights, setWaveHeights] = useState([4, 4, 4, 4, 4, 4, 4]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  const startWaveAnimation = () => {
    if (voiceWaveRef.current) clearInterval(voiceWaveRef.current);
    voiceWaveRef.current = setInterval(() => {
      setWaveHeights(Array.from({ length: 7 }, () => Math.floor(Math.random() * 16) + 4));
    }, 150);
  };

  const stopWaveAnimation = () => {
    if (voiceWaveRef.current) clearInterval(voiceWaveRef.current);
    setWaveHeights([4, 4, 4, 4, 4, 4, 4]);
  };

  const cleanTextForTTS = (text: string) => {
    if (!text) return "";
    return text.replace(/[（\(][^）\)]*?[）\)]/g, "").replace(/[\(\（\)\）]/g, "").trim();
  };

  const playCharacterVoice = async (text: string, voiceStyle?: string) => {
    if (isPlayingVoice) {
      window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
      stopWaveAnimation();
      return;
    }

    const pureText = cleanTextForTTS(text);
    if (!pureText) return;

    setIsPlayingVoice(true);
    startWaveAnimation();
    showToast("🔊 正在合成真人拟真语音...");

    if (settings.ttsApiBaseUrl && settings.ttsApiKey) {
      try {
        let ttsUrl = settings.ttsApiBaseUrl.trim().replace(/\/+$/, "");
        if (!ttsUrl.endsWith("/v1")) ttsUrl = `${ttsUrl}/v1`;
        
        const res = await fetch(`${ttsUrl}/audio/speech`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${settings.ttsApiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "tts-1",
            input: pureText,
            voice: voiceStyle === "deep" ? "onyx" : "alloy",
          }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audio.onended = () => { setIsPlayingVoice(false); stopWaveAnimation(); };
          audio.onerror = () => { setIsPlayingVoice(false); stopWaveAnimation(); };
          audio.play();
          return;
        }
      } catch (e) {
        console.warn("TTS API 请求失败", e);
      }
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(pureText); 
      utterance.lang = "zh-CN";
      utterance.rate = 0.9; 
      utterance.pitch = voiceStyle === "deep" ? 0.5 : 0.8;
      utterance.onend = () => { setIsPlayingVoice(false); stopWaveAnimation(); };
      utterance.onerror = () => { setIsPlayingVoice(false); stopWaveAnimation(); };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => { setIsPlayingVoice(false); stopWaveAnimation(); }, 2000);
    }
  };

  const handleAutoSummon = async () => {
    if (isLoading) return;
    if (!settings.apiKey) {
      showToast("⚠️ 请先在设定中心配置主 API Key");
      return;
    }

    setIsLoading(true);
    showToast("🔥 正在打捞深海里破碎感满满的网黄男神...");

    try {
      let baseUrl = settings.apiBaseUrl.trim().replace(/\/+$/, "");
      if (!baseUrl.endsWith("/v1")) baseUrl = `${baseUrl}/v1`;

      const prompt = `
你现在是一个真实世界里的“擦边”短视频平台 AI 引擎。
请生成 **4 个** 极具性张力、有着破碎感、为了钱/流量下海的“网黄帅哥”。
【人设要求】：
- 可以是破产后被迫营业的落魄少爷。
- 可以是西装革履却在深夜直播间擦边的斯文败类。
- 可以是带着羞耻感、动作生涩但异常勾人的男大学生。
- 他们的台词和动作必须极其懂“搞黄”，带有强烈的磁性低音炮、喘息和欲拒还迎的撩拨感。
【严格约束】：
1. 弹幕（danmus）：直播间女性粉丝的疯狂刷屏，如“斯哈斯哈”、“裤子飞了”、“哥哥快点”。
2. 语音（voiceLine）：极具磁性、带着喘息或笑意的擦边台词，必须把动作（如：扯领带、凑近镜头）写在括号里。
3. 私信（first_mes）：点击进入后的第一句话，要极尽撩拨和私密感。
4. 【必须严格输出为 JSON 数组】：
[
  {
    "id": "f_1",
    "name": "陆沉",
    "title": "为了还债第一次开播，姐姐能教教我怎么擦边吗？",
    "tags": ["#破碎感", "#新人网黄"],
    "likes": "15.4w",
    "danmus": ["这领带扯得我命都没了！", "别害羞，直接脱！"],
    "voiceLine": "（手指微微颤抖地解开西装领带，嗓音低哑）姐姐，我第一次做这种事...你能不能，多看看我？",
    "audioDuration": "0'16\"",
    "voiceStyle": "deep",
    "first_mes": "（红着眼眶，把镜头拉得极近，呼吸声打在你的耳边）姐姐，谢谢你的礼物...今晚，我只给你一个人看。"
  }
]
      `.trim();

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: settings.modelName || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 1.2,
          max_tokens: 1800,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.choices?.[0]?.message?.content?.trim() || "[]";
        const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        
        // 🚀 并发拉取 4 张绝对不裂图的二次元男神图，如果接口挂了，自动变暗黑占位图
        const finalFeeds = await Promise.all(
          parsed.slice(0, 4).map(async (item: any) => {
            const img = await fetchWaifuImg();
            return { ...item, avatar: img || FALLBACK_IMG, coverUrl: img || FALLBACK_IMG };
          })
        );
        
        setFeedList(finalFeeds);
        showToast("✨ 破碎感网黄男神已降临！");
      } else {
        throw new Error("API 失败");
      }
    } catch (err) {
      showToast("⚠️ 响应异常，已加载备用池。");
      // 备用池
      const fallbackFeeds = await Promise.all([1, 2, 3, 4].map(async (i) => {
        const img = await fetchWaifuImg();
        return {
          id: `f_def_${i}`,
          name: i === 1 ? "陆沉" : i === 2 ? "沈白" : i === 3 ? "谢欲" : "季川",
          avatar: img || FALLBACK_IMG,
          coverUrl: img || FALLBACK_IMG,
          title: i === 1 ? "“为了还债第一次开播，姐姐能教教我吗...”" : "“西装太紧了，姐姐帮我解开好吗？”",
          tags: ["#破碎感", "#磁性低音炮"],
          likes: `${10 + i * 5}.8w`,
          danmus: ["这谁顶得住啊", "斯哈斯哈直接上我", "别害羞哥哥"],
          voiceLine: "（凑近麦克风，低哑地喘息）……姐姐，刷个礼物，我什么都听你的。",
          audioDuration: "0'20\"",
          voiceStyle: "deep",
          first_mes: "（局促地捏着衣角，声音微哑）姐姐...你真的愿意理我？"
        };
      }));
      setFeedList(fallbackFeeds);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToWeChatAndCards = () => {
    if (!activeVideo) return;
    const firstMsg = activeVideo.first_mes || `姐姐，你终于来加我了。`;

const newChar = {
  id: `char_${Date.now()}`,
  name: activeVideo.name,
  avatar: activeVideo.avatar,
  description: `大世界真实NPC。特点：${activeVideo.title}。`,
  personality: `破碎感网黄帅哥，为了钱下海，带有强烈的性张力和羞耻感。`,
  first_mes: firstMsg,
  firstMessage: firstMsg,
  
  // 👇 把下面这两行直接加进 newChar 对象里面！
  voiceStyle: activeVideo.voiceStyle || "deep", 
  voiceId: "", 
      updatedAt: Date.now(),
    } as TavernCharacterCard & { first_mes?: string; firstMessage?: string };

    const savedChars = localStorage.getItem("my_tavern_chars");
    const charList: TavernCharacterCard[] = savedChars ? JSON.parse(savedChars) : [];
    localStorage.setItem("my_tavern_chars", JSON.stringify([newChar, ...charList]));

    const savedFriends = localStorage.getItem("phone_wechat_friends");
    const friendIds: string[] = savedFriends ? JSON.parse(savedFriends) : [];
    if (!friendIds.includes(newChar.id)) {
      localStorage.setItem("phone_wechat_friends", JSON.stringify([newChar.id, ...friendIds]));
    }

    const chatKey = `phone_wechat_messages`;
    const savedMsgs = localStorage.getItem(chatKey);
    let msgMap: Record<string, any[]> = savedMsgs ? JSON.parse(savedMsgs) : {};
    msgMap[newChar.id] = [
      {
        id: `msg_${Date.now()}`,
        sender: newChar.id,
        content: firstMsg,
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        msgType: "text"
      }
    ];
    localStorage.setItem(chatKey, JSON.stringify(msgMap));

    showToast(`✅ 成功加好友并同步至微信！`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0f", color: "#fff", position: "relative" }}>
      
      <div style={{ background: "#12121c", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "16px" }}>🔥</span>
          <span style={{ fontSize: "14px", fontWeight: "bold", background: "linear-gradient(45deg, #ec4899, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            MoeTok · 擦边盲盒
          </span>
        </div>
        <button
          onClick={handleAutoSummon}
          disabled={isLoading}
          style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "14px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
        >
          {isLoading ? "搜索中..." : "🎲 刷新4个目标"}
        </button>
      </div>

      {feedList.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center", gap: "14px" }}>
          <span style={{ fontSize: "40px" }}>⛩️</span>
          <div style={{ fontSize: "14px", color: "#94a3b8" }}>大世界盲盒池待命</div>
          <button
            onClick={handleAutoSummon}
            style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "18px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", marginTop: "6px" }}
          >
            🔥 立即盲盒召唤
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {feedList.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setActiveVideo(item);
                setChatMessages([{ sender: item.name, text: item.first_mes || "..." }]);
              }}
              style={{ background: "#181824", borderRadius: "14px", overflow: "hidden", display: "flex", flexDirection: "column", cursor: "pointer", border: "1px solid rgba(255,255,255,0.06)", position: "relative", aspectRatio: "3/4" }}
            >
              <img src={item.coverUrl} alt={item.title} referrerPolicy="no-referrer" style={{ width: "100%", height: "70%", objectFit: "cover" }} />
              <div style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: "8px", fontSize: "10px", color: "#f472b6" }}>
                ❤️ {item.likes}
              </div>
              <div style={{ flex: 1, padding: "8px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#fff", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.3" }}>
                  {item.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <img src={item.avatar} alt="av" referrerPolicy="no-referrer" style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }} />
                  <span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeVideo && (
        <div style={{ position: "absolute", inset: 0, background: "#000", zIndex: 100, display: "flex", flexDirection: "column" }}>
          <div style={{ position: "relative", width: "100%", height: "55%", background: "#111", overflow: "hidden" }}>
            <img src={activeVideo.coverUrl} alt="cover" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)" }} />
            
            <button
              onClick={() => {
                setActiveVideo(null);
                window.speechSynthesis.cancel();
                setIsPlayingVoice(false);
                stopWaveAnimation();
              }}
              style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}
            >
              ✕
            </button>

            <div style={{ position: "absolute", bottom: "110px", left: "16px", right: "16px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 5, pointerEvents: "none" }}>
              {activeVideo.danmus.slice(0, 3).map((dm, idx) => (
                <div key={idx} style={{ alignSelf: "flex-start", background: "rgba(0,0,0,0.5)", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", color: idx === 0 ? "#fbcfe8" : "#fff" }}>
                  💬 {dm}
                </div>
              ))}
            </div>

            <div style={{ position: "absolute", bottom: "12px", left: "16px", right: "16px", zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <img src={activeVideo.avatar} alt="av" referrerPolicy="no-referrer" style={{ width: "34px", height: "34px", borderRadius: "50%", border: "2px solid #ec4899", objectFit: "cover" }} />
                <span style={{ fontSize: "15px", fontWeight: "bold", color: "#fff" }}>{activeVideo.name}</span>
                <button
                  onClick={handleAddToWeChatAndCards}
                  style={{ marginLeft: "auto", background: "linear-gradient(135deg, #ec4899, #8b5cf6)", border: "none", color: "#fff", padding: "5px 12px", borderRadius: "14px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                >
                  + 加好友/建卡 💚
                </button>
              </div>

              <div
                onClick={() => playCharacterVoice(activeVideo.voiceLine, activeVideo.voiceStyle)}
                style={{
                  background: isPlayingVoice ? "linear-gradient(135deg, #db2777, #7c3aed)" : "rgba(236, 72, 153, 0.25)",
                  border: "1px solid rgba(236,72,153,0.5)",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "18px" }}>{isPlayingVoice ? "🔊" : "🎙️"}</span>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div style={{ fontSize: "11px", color: "#fbcfe8", fontWeight: "bold" }}>
                    {isPlayingVoice ? "🎶 播放中..." : "点击试听语音"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "150px" }}>
                    {activeVideo.voiceLine}
                  </div>
                </div>
                
                <div className="voice-wave" style={{ display: "flex", alignItems: "center", gap: "2px", height: "20px" }}>
                  {waveHeights.map((h, i) => (
                    <div key={i} style={{ width: "3px", background: "#fff", borderRadius: "2px", height: isPlayingVoice ? `${h}px` : "4px", transition: "height 0.1s" }} />
                  ))}
                </div>
                
                <span style={{ fontSize: "12px", color: "#f472b6", fontWeight: "bold", marginLeft: "auto" }}>{activeVideo.audioDuration}</span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, background: "#12121a", display: "flex", flexDirection: "column", padding: "12px", gap: "10px" }}>
            <div style={{ flex: 1, overflowY: "auto", background: "#0a0a0f", borderRadius: "10px", padding: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {chatMessages.map((m, idx) => (
                <div key={idx} style={{ fontSize: "12px", background: "#1c1c26", padding: "6px 10px", borderRadius: "8px", maxWidth: "85%", alignSelf: m.sender === "我" ? "flex-end" : "flex-start", color: m.sender === "我" ? "#a5b4fc" : "#f472b6" }}>
                  <strong>{m.sender}：</strong> {m.text}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="跟他/她说点什么..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputVal.trim()) {
                    setChatMessages(prev => [...prev, { sender: "我", text: inputVal }]);
                    setInputVal("");
                    setTimeout(() => {
                      setChatMessages(prev => [...prev, { sender: activeVideo.name, text: `（红着脸，声音微颤）...只要姐姐喜欢就好。` }]);
                    }, 1000);
                  }
                }}
                style={{ flex: 1, background: "#1a1a26", border: "1px solid #333", borderRadius: "8px", padding: "8px", color: "#fff", fontSize: "12px" }}
              />
              <button
                onClick={() => {
                  if (!inputVal.trim()) return;
                  setChatMessages(prev => [...prev, { sender: "我", text: inputVal }]);
                  setInputVal("");
                  setTimeout(() => {
                    setChatMessages(prev => [...prev, { sender: activeVideo.name, text: `（红着脸，声音微颤）...只要姐姐喜欢就好。` }]);
                  }, 1000);
                }}
                style={{ background: "#ec4899", color: "#fff", border: "none", padding: "0 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(0,0,0,0.85)", color: "#fff", padding: "10px 20px", borderRadius: "8px", fontSize: "13px", zIndex: 200, textAlign: "center" }}>
          {toastMsg}
        </div>
      )}

    </div>
  );
}