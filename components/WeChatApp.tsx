"use client";

import React, { useState, useEffect, useRef } from "react";
import { TavernCharacterCard } from "../types";
import { WorldSettings } from "./SettingsApp";

interface WeChatAppProps {
  settings: WorldSettings;
  activeBoyfriend: TavernCharacterCard | null;
  onSelectBoyfriend: (char: TavernCharacterCard) => void;
  onUnreadChange?: (hasUnread: boolean) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "boyfriend";
  content: string;
  time: string;
  msgType?: "text" | "image" | "transfer" | "redpacket" | "location" | "voice";
  amount?: number;
  voiceDuration?: string; // 语音时长，如 "8""
}

interface MomentsComment {
  id: string;
  authorName: string;
  content: string;
}

interface MomentsPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  time: string;
  likes: string[];
  comments: MomentsComment[];
}

export default function WeChatApp({
  settings,
  activeBoyfriend,
  onSelectBoyfriend,
  onUnreadChange,
}: WeChatAppProps) {
  const [allChars, setAllChars] = useState<TavernCharacterCard[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [currentChatTarget, setCurrentChatTarget] = useState<TavernCharacterCard | null>(activeBoyfriend);

  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});

  const [currentTab, setCurrentTab] = useState<"chats" | "contacts" | "discover" | "me" | "chat_room" | "wallet" | "add_friends">("chats");

  const [walletBalance, setWalletBalance] = useState<string>("888888.00");
  const [myNickname, setMyNickname] = useState<string>(settings.userName || "我");
  const [myWxId, setMyWxId] = useState<string>("wxid_virtualphone");
  const [myAvatar, setMyAvatar] = useState<string>("/placeholder-user.png");

  const [momentsBg, setMomentsBg] = useState<string>("https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800");
  const [momentsList, setMomentsList] = useState<MomentsPost[]>([]);
  const [isGeneratingMoments, setIsGeneratingMoments] = useState(false);

  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  const [pendingImage, setPendingImage] = useState<string | null>(null);

  const [transferModal, setTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState("520");
  const [transferNote, setTransferNote] = useState("给你的零花钱");

  const [redpacketModal, setRedpacketModal] = useState(false);
  const [redpacketAmount, setRedpacketAmount] = useState("88");
  const [redpacketWish, setRedpacketWish] = useState("恭喜发财，大吉大利");

  const [deleteModalChar, setDeleteModalChar] = useState<TavernCharacterCard | null>(null);

  // 🔊 当前正在播放语音的 ID
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const momentsBgInputRef = useRef<HTMLInputElement>(null);
  const chatPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedChars = localStorage.getItem("my_tavern_chars");
    if (savedChars) {
      try {
        const parsed: TavernCharacterCard[] = JSON.parse(savedChars);
        setAllChars(parsed);
        const savedFriends = localStorage.getItem("phone_wechat_friends");
        if (savedFriends) setFriendIds(JSON.parse(savedFriends));
      } catch {}
    }

    const savedMsgs = localStorage.getItem("phone_wechat_messages");
    if (savedMsgs) {
      try { setMessagesMap(JSON.parse(savedMsgs)); } catch {}
    }

    const savedWallet = localStorage.getItem("phone_wechat_wallet");
    if (savedWallet) setWalletBalance(savedWallet);

    const savedProfile = localStorage.getItem("phone_wechat_profile");
    if (savedProfile) {
      try {
        const p = JSON.parse(savedProfile);
        if (p.nickname) setMyNickname(p.nickname);
        if (p.wxId) setMyWxId(p.wxId);
        if (p.avatar) setMyAvatar(p.avatar);
      } catch {}
    }

    const savedMomentsBg = localStorage.getItem("phone_wechat_moments_bg");
    if (savedMomentsBg) setMomentsBg(savedMomentsBg);

    const savedMomentsList = localStorage.getItem("phone_wechat_moments_list");
    if (savedMomentsList) {
      try { setMomentsList(JSON.parse(savedMomentsList)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (activeBoyfriend) {
      setCurrentChatTarget(activeBoyfriend);
      setCurrentTab("chat_room");
      clearUnread(activeBoyfriend.id);
    }
  }, [activeBoyfriend]);

  useEffect(() => {
    const hasAnyUnread = Object.values(unreadMap).some(Boolean);
    if (onUnreadChange) onUnreadChange(hasAnyUnread);
  }, [unreadMap, onUnreadChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesMap, currentTab, pendingImage]);

  const clearUnread = (charId: string) => {
    setUnreadMap((prev) => ({ ...prev, [charId]: false }));
  };

  const saveWallet = (val: string) => {
    setWalletBalance(val);
    localStorage.setItem("phone_wechat_wallet", val);
  };

  const saveProfile = (nickname: string, wxId: string, avatar: string) => {
    setMyNickname(nickname);
    setMyWxId(wxId);
    setMyAvatar(avatar);
    localStorage.setItem("phone_wechat_profile", JSON.stringify({ nickname, wxId, avatar }));
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      saveProfile(myNickname, myWxId, url);
    }
  };

  const handleMomentsBgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMomentsBg(url);
      localStorage.setItem("phone_wechat_moments_bg", url);
    }
  };

  const handleChatPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPendingImage(url);
    }
    e.target.value = "";
  };

  const currentFriends = allChars.filter((c) => friendIds.includes(c.id));

  // 🔊 核心语音播放与转文字触发逻辑
  const playVoiceMessage = async (msgId: string, contentText: string, charCard: TavernCharacterCard) => {
    if (playingVoiceId === msgId) {
      window.speechSynthesis.cancel();
      setPlayingVoiceId(null);
      return;
    }

    setPlayingVoiceId(msgId);

    // 如果配置了 TTS 副 API，尝试通过 API 播放
    if (settings.ttsApiBaseUrl && settings.ttsApiKey) {
      try {
        let ttsUrl = settings.ttsApiBaseUrl.trim().replace(/\/+$/, "");
        if (!ttsUrl.endsWith("/v1")) ttsUrl = `${ttsUrl}/v1`;

// 找到调用 tts 的地方，把请求体改成这样：
const res = await fetch("/api/tts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: contentText,
    voiceId: currentChatTarget?.voiceId,       // 👈 核心：读取当前微信男友绑定的专属音色 ID
    voiceStyle: currentChatTarget?.voiceStyle, // 👈 核心：读取他的声线气质
    ttsApiBaseUrl: settings.ttsApiBaseUrl,
    ttsApiKey: settings.ttsApiKey,
  }),
});

        if (res.ok) {
          const blob = await res.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audio.onended = () => setPlayingVoiceId(null);
          audio.play();
          return;
        }
      } catch (e) {
        console.warn("API 语音播放失败，降级合成", e);
      }
    }

    // 降级使用浏览器内置语音合成
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(contentText);
      utterance.lang = "zh-CN";
      utterance.rate = 0.9;
      utterance.onend = () => setPlayingVoiceId(null);
      utterance.onerror = () => setPlayingVoiceId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setPlayingVoiceId(null), 3000);
    }
  };

  const handleExecuteDeleteOption = (optionType: 1 | 2 | 3) => {
    if (!deleteModalChar) return;
    const charId = deleteModalChar.id;

    if (optionType === 1 || optionType === 3) {
      const newMap = { ...messagesMap };
      delete newMap[charId];
      setMessagesMap(newMap);
      localStorage.setItem("phone_wechat_messages", JSON.stringify(newMap));
    }
    if (optionType === 2 || optionType === 3) {
      const nextFriends = friendIds.filter((id) => id !== charId);
      setFriendIds(nextFriends);
      localStorage.setItem("phone_wechat_friends", JSON.stringify(nextFriends));
    }

    setDeleteModalChar(null);
  };

  const handleSendMessage = async (customText?: string, msgType: ChatMessage["msgType"] = "text", amount?: number) => {
    const textToSend = customText || inputText.trim();
    if (!textToSend && !pendingImage && msgType === "text") return;
    if (!currentChatTarget || isGenerating) return;

    if (!customText) setInputText("");
    setShowPlusMenu(false);

    const charId = currentChatTarget.id;
    const nowTime = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

    let newMessagesToAdd: ChatMessage[] = [];

    if (pendingImage) {
      const imgMsg: ChatMessage = {
        id: `msg_${Date.now()}_img`,
        sender: "user",
        content: pendingImage,
        time: nowTime,
        msgType: "image",
      };
      newMessagesToAdd.push(imgMsg);
      setPendingImage(null);
    }

    if (textToSend || msgType !== "text") {
      const textMsg: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        sender: "user",
        content: textToSend,
        time: nowTime,
        msgType,
        amount,
        voiceDuration: msgType === "voice" ? "6″" : undefined,
      };
      newMessagesToAdd.push(textMsg);
    }

    const currentMsgs = messagesMap[charId] || [];
    const updatedMsgs = [...currentMsgs, ...newMessagesToAdd];
    const newMap = { ...messagesMap, [charId]: updatedMsgs };
    setMessagesMap(newMap);
    localStorage.setItem("phone_wechat_messages", JSON.stringify(newMap));

    setIsGenerating(true);

    try {
      const activePresetStr = localStorage.getItem("phone_active_preset");
      const preset = activePresetStr ? JSON.parse(activePresetStr) : {
        systemPrompt: "请完全沉浸在当前角色身份与世界观中，以自然、生活化的微信聊天口吻回复。",
        temperature: 0.85,
        maxTokens: 1024,
      };

      const systemPrompt = `
【🚨 微信聊天格式规范】
1. 当前场景是【手机微信聊天界面】，通过手机打字或语音聊天。
2. 严禁任何小说式的旁白、场景描写、心理描写或动作描写（绝对不能出现 *叹气*、括号动作等）。
3. 必须完全像真人发微信一样说话：口语化, 简短, 自然, 有松弛感。
4. 回复时绝对不能在开头带上你自己的名字，直接输出回复的话即可。
5. 【语音功能设定】你可以通过输出特定指令或直接在回复中夹带语音内容，如果需要发送语音消息，请在回复时使用格式：[VOICE:你想说的语音文本内容]。系统会自动将其转化为微信语音条，并支持固定语音转文字呈现给用户。

【全局世界观设定】
${settings.worldView}

【手机主人 (User) 身份设定】
名字：${myNickname}
人设：${settings.userPersona}

【当前聊天对象 (男友) 角色设定】
名字：${currentChatTarget.name}
描述/人设：${currentChatTarget.description}
性格：${currentChatTarget.personality}
背景/场景：${currentChatTarget.scenario}
      `.trim();

      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...updatedMsgs.slice(-12).map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.msgType === "image" ? "[发来了一张照片]" : m.content,
        })),
      ];

      let baseUrl = settings.apiBaseUrl.trim().replace(/\/+$/, "");
      if (!baseUrl.endsWith("/v1")) baseUrl = `${baseUrl}/v1`;

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: settings.modelName || "gpt-4o-mini",
          messages: apiMessages,
          temperature: preset.temperature || 0.85,
          max_tokens: preset.maxTokens || 1024,
          stream: true,
        }),
      });

      if (!res.ok) throw new Error(`API 请求失败 (${res.status})`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let botReplyText = "";

      const botMsgId = `msg_${Date.now()}_bot`;
      const placeholderBotMsg: ChatMessage = {
        id: botMsgId,
        sender: "boyfriend",
        content: "...",
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessagesMap((prev) => ({
        ...prev,
        [charId]: [...updatedMsgs, placeholderBotMsg],
      }));

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const dataStr = trimmed.replace(/^data:\s*/, "");
            if (dataStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) {
                botReplyText += delta;
                setMessagesMap((prev) => {
                  const list = prev[charId] || [];
                  return {
                    ...prev,
                    [charId]: list.map((m) => (m.id === botMsgId ? { ...m, content: botReplyText } : m)),
                  };
                });
              }
            } catch {}
          }
        }
      }

      // 检查回复中是否包含 [VOICE: ...] 标签，如果包含则自动转为语音消息类型
      let finalMsgType: ChatMessage["msgType"] = "text";
      let finalContent = botReplyText || "（对方发来了一条消息）";
      let finalDuration = undefined;

      const voiceMatch = finalContent.match(/\[VOICE:\s*(.*?)\]/);
      if (voiceMatch) {
        finalMsgType = "voice";
        finalContent = voiceMatch[1]; // 语音转文字的内容
        finalDuration = `${Math.max(3, Math.min(20, Math.floor(finalContent.length * 0.8)))}″`;
      }

      const finalBotMsg: ChatMessage = {
        id: botMsgId,
        sender: "boyfriend",
        content: finalContent,
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        msgType: finalMsgType,
        voiceDuration: finalDuration,
      };

      setMessagesMap((prev) => {
        const list = prev[charId] || [];
        const finalized = {
          ...prev,
          [charId]: list.map((m) => (m.id === botMsgId ? finalBotMsg : m)),
        };
        localStorage.setItem("phone_wechat_messages", JSON.stringify(finalized));
        return finalized;
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "未知错误";
      const errorMsgObj: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: "boyfriend",
        content: `⚠️ [系统提示] 消息发送失败：${errMsg}`,
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessagesMap((prev) => {
        const list = prev[charId] || [];
        const finalized = { ...prev, [charId]: [...list, errorMsgObj] };
        localStorage.setItem("phone_wechat_messages", JSON.stringify(finalized));
        return finalized;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefreshMoments = async () => {
    if (currentFriends.length === 0 || isGeneratingMoments) return;
    setIsGeneratingMoments(true);

    try {
      const randomFriend = currentFriends[Math.floor(Math.random() * currentFriends.length)];
      let baseUrl = settings.apiBaseUrl.trim().replace(/\/+$/, "");
      if (!baseUrl.endsWith("/v1")) baseUrl = `${baseUrl}/v1`;

      const otherFriendNames = currentFriends.filter(f => f.id !== randomFriend.id).map(f => f.name);

      const prompt = `
请以微信朋友圈的口吻，为角色“${randomFriend.name}”生成一条生活动态。
人设描述：${randomFriend.description}

【极其重要的生成约束】
1. 动态内容要简短日常（不超过40字），严禁任何小说旁白和动作描写。
2. 绝对不要每次都写“刚刚”发生的事！请根据当前现实时间或生活常识，随机赋予一个合理的过去时间（例如：“2小时前”、“昨天 21:30”等）。
3. 另外，请从以下你的好友/NPC候选名单中随机挑1-2人（名单：${otherFriendNames.join(", ") || "无其他好友"}），针对这条动态写一句简短、符合其身份的微信评论或吐槽。
4. 请务必严格按照以下 JSON 格式输出，不要包含任何多余的markdown标签：
{
  "content": "动态文字内容",
  "time": "时间描述，如 3小时前",
  "comments": [
    {"authorName": "评论者名字", "content": "评论内容"}
  ]
}
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
          temperature: 0.9,
          max_tokens: 200,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.choices?.[0]?.message?.content?.trim() || "{}";
        
        let parsedData = { content: "今天天气不错。", time: "3小时前", comments: [] as MomentsComment[] };
        try {
          const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
          parsedData = JSON.parse(cleanJson);
        } catch {
          parsedData.content = rawText;
        }

        const newPost: MomentsPost = {
          id: `m_${Date.now()}`,
          authorName: randomFriend.name,
          authorAvatar: randomFriend.avatar,
          content: parsedData.content || "分享日常生活。",
          time: parsedData.time || "3小时前",
          likes: [],
          comments: parsedData.comments || [],
        };

        const updatedMoments = [newPost, ...momentsList];
        setMomentsList(updatedMoments);
        localStorage.setItem("phone_wechat_moments_list", JSON.stringify(updatedMoments));
      }
    } catch {} finally {
      setIsGeneratingMoments(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ededed", color: "#333", position: "relative" }}>
      
      {(currentTab === "chats" || currentTab === "contacts" || currentTab === "discover" || currentTab === "me") && (
        <div style={{ height: "48px", background: "#ededed", borderBottom: "1px solid #d8d8d8", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
          <span style={{ fontSize: "16px", fontWeight: "600", color: "#111" }}>
            {currentTab === "chats" && "微信"}
            {currentTab === "contacts" && "通讯录"}
            {currentTab === "discover" && "发现"}
            {currentTab === "me" && "我"}
          </span>
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <span style={{ fontSize: "18px", cursor: "pointer" }} title="搜索">🔍</span>
            <span onClick={() => setCurrentTab("add_friends")} style={{ fontSize: "20px", fontWeight: "bold", cursor: "pointer" }} title="添加朋友">+</span>
          </div>
        </div>
      )}

      {currentTab === "chats" && (
        <div style={{ flex: 1, overflowY: "auto", background: "#ededed" }}>
          {currentFriends.length === 0 ? (
            <div style={{ textAlign: "center", color: "#888", marginTop: "100px", fontSize: "13px", padding: "0 20px" }}>
              这是一个崭新的微信。请点击右上角 <strong style={{ color: "#07c160" }}>+</strong> 号添加你的男友好友！
            </div>
          ) : (
            currentFriends.map((char) => {
              const lastMsgs = messagesMap[char.id] || [];
              const lastMsg = lastMsgs[lastMsgs.length - 1];
              const hasUnread = unreadMap[char.id];

              return (
                <div
                  key={char.id}
                  onClick={() => {
                    setCurrentChatTarget(char);
                    setCurrentTab("chat_room");
                    clearUnread(char.id);
                    onSelectBoyfriend(char);
                  }}
                  style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "#fff", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                >
                  <div style={{ position: "relative", marginRight: "12px" }}>
                    <img src={char.avatar || "/placeholder-avatar.png"} alt={char.name} style={{ width: "48px", height: "48px", borderRadius: "6px", objectFit: "cover", background: "#ddd" }} />
                    {hasUnread && <span style={{ position: "absolute", top: "-3px", right: "-3px", width: "10px", height: "10px", background: "#ef4444", borderRadius: "50%", border: "2px solid #fff" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "15px", fontWeight: "600", color: "#111" }}>{char.name}</span>
                      <span style={{ fontSize: "11px", color: "#b2b2b2" }}>{lastMsg ? lastMsg.time : ""}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {lastMsg ? (lastMsg.msgType === "image" ? "[图片]" : lastMsg.msgType === "voice" ? `[语音消息 ${lastMsg.voiceDuration || ""}]` : lastMsg.content) : "已成功添加为好友，发条消息打个招呼吧~"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {currentTab === "contacts" && (
        <div style={{ flex: 1, overflowY: "auto", background: "#ededed" }}>
          <div style={{ padding: "8px 16px", fontSize: "12px", color: "#888" }}>新的朋友 (长按或右键可进行精细化删除)</div>
          <div style={{ background: "#fff" }}>
            {currentFriends.map((char) => (
              <div
                key={char.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setDeleteModalChar(char);
                }}
                style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
              >
                <img src={char.avatar || "/placeholder-avatar.png"} alt={char.name} style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover", marginRight: "12px" }} />
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>{char.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentTab === "discover" && (
        <div style={{ flex: 1, overflowY: "auto", background: "#f7f7f7", paddingBottom: "30px" }}>
          <div 
            onClick={() => momentsBgInputRef.current?.click()}
            style={{ 
              backgroundImage: `url(${momentsBg})`, 
              backgroundSize: "cover", 
              backgroundPosition: "center", 
              height: "220px", 
              position: "relative", 
              marginBottom: "40px",
              cursor: "pointer" 
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.15)" }} />
            <div style={{ position: "absolute", bottom: "-16px", right: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "#fff", fontSize: "15px", fontWeight: "bold", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{myNickname}</span>
              <img src={myAvatar} alt="me" style={{ width: "64px", height: "64px", borderRadius: "6px", border: "2px solid #fff", objectFit: "cover", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }} />
            </div>
            <div style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(0,0,0,0.5)", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>
              📷 点击更换封面
            </div>
          </div>
          <input type="file" ref={momentsBgInputRef} accept="image/*" onChange={handleMomentsBgSelect} style={{ display: "none" }} />

          <div style={{ padding: "0 16px", marginBottom: "16px" }}>
            <button
              onClick={handleRefreshMoments}
              disabled={isGeneratingMoments}
              style={{ width: "100%", background: "#07c160", color: "#fff", border: "none", padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
            >
              {isGeneratingMoments ? "AI 正在生成朋友圈..." : "🔄 刷新 / 获取好友最新动态与互动"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "0 16px" }}>
            {momentsList.map((post) => (
              <div key={post.id} style={{ display: "flex", gap: "10px", background: "#fff", padding: "14px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <img src={post.authorAvatar || "/placeholder-avatar.png"} alt="avatar" style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#576b95", marginBottom: "4px" }}>{post.authorName}</div>
                  <div style={{ fontSize: "14px", color: "#111", lineHeight: 1.5, marginBottom: "8px" }}>{post.content}</div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#888", marginBottom: post.comments && post.comments.length > 0 ? "8px" : "0" }}>
                    <span>{post.time}</span>
                    <span
                      onClick={() => {
                        const updated = momentsList.map((p) => {
                          if (p.id === post.id) {
                            const hasLiked = p.likes.includes(myNickname);
                            return { ...p, likes: hasLiked ? p.likes.filter(l => l !== myNickname) : [...p.likes, myNickname] };
                          }
                          return p;
                        });
                        setMomentsList(updated);
                        localStorage.setItem("phone_wechat_moments_list", JSON.stringify(updated));
                      }}
                      style={{ color: "#576b95", cursor: "pointer" }}
                    >
                      ❤️ {post.likes.length > 0 ? post.likes.join(", ") : "赞"}
                    </span>
                  </div>

                  {post.comments && post.comments.length > 0 && (
                    <div style={{ background: "#f7f7f7", borderRadius: "6px", padding: "8px 10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {post.comments.map((c, idx) => (
                        <div key={idx} style={{ fontSize: "12px", lineHeight: "1.4" }}>
                          <span style={{ color: "#576b95", fontWeight: "600" }}>{c.authorName}：</span>
                          <span style={{ color: "#333" }}>{c.content}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentTab === "me" && (
        <div style={{ flex: 1, overflowY: "auto", background: "#f7f7f7", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ background: "#fff", padding: "20px 16px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div onClick={() => avatarInputRef.current?.click()} style={{ position: "relative", cursor: "pointer" }}>
              <img src={myAvatar} alt="avatar" style={{ width: "64px", height: "64px", borderRadius: "8px", objectFit: "cover" }} />
            </div>
            <input type="file" ref={avatarInputRef} accept="image/*" onChange={handleAvatarFileSelect} style={{ display: "none" }} />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <input
                type="text"
                value={myNickname}
                onChange={(e) => saveProfile(e.target.value, myWxId, myAvatar)}
                style={{ fontSize: "18px", fontWeight: "bold", border: "none", borderBottom: "1px solid #ddd", width: "100%", outline: "none", background: "transparent", color: "#111" }}
              />
              <input
                type="text"
                value={myWxId}
                onChange={(e) => saveProfile(myNickname, e.target.value, myAvatar)}
                style={{ fontSize: "12px", color: "#888", border: "none", borderBottom: "1px solid #eee", width: "100%", outline: "none", background: "transparent" }}
              />
            </div>
          </div>

          <div
            onClick={() => setCurrentTab("wallet")}
            style={{ background: "#fff", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>💳</span>
              <span style={{ fontSize: "15px", color: "#111" }}>服务 (钱包)</span>
            </div>
            <span style={{ color: "#888" }}>›</span>
          </div>
        </div>
      )}

      {currentTab === "chat_room" && currentChatTarget && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#ededed", overflow: "hidden", position: "relative" }}>
          <div style={{ height: "48px", background: "#ededed", borderBottom: "1px solid #d8d8d8", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", flexShrink: 0 }}>
            <button onClick={() => setCurrentTab("chats")} style={{ background: "none", border: "none", color: "#07c160", fontSize: "15px", cursor: "pointer", fontWeight: "600" }}>‹ 返回</button>
            <span style={{ fontSize: "16px", fontWeight: "600", color: "#111" }}>{currentChatTarget.name}</span>
            <div style={{ width: "36px" }} />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {(messagesMap[currentChatTarget.id] || []).map((m) => {
              const isUser = m.sender === "user";
              const isVoicePlaying = playingVoiceId === m.id;

              return (
                <div key={m.id} style={{ display: "flex", alignItems: "flex-start", flexDirection: isUser ? "row-reverse" : "row", gap: "10px" }}>
                  <img src={isUser ? myAvatar : currentChatTarget.avatar || "/placeholder-avatar.png"} alt="avatar" style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover", background: "#ccc" }} />
                  <div style={{ maxWidth: "70%" }}>
                    <div
                      onClick={() => {
                        if (m.msgType === "voice") {
                          playVoiceMessage(m.id, m.content, currentChatTarget);
                        }
                      }}
                      style={{
                        padding: m.msgType === "image" ? "4px" : "10px 14px",
                        borderRadius: "6px",
                        background: isUser ? "#95ec69" : "#ffffff",
                        color: "#111",
                        fontSize: "14px",
                        lineHeight: "1.5",
                        wordBreak: "break-word",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                        cursor: m.msgType === "voice" ? "pointer" : "default",
                        display: "flex",
                        alignItems: "center",
                        gap: m.msgType === "voice" ? "8px" : "0",
                      }}
                    >
                      {m.msgType === "image" ? (
                        <img src={m.content} alt="chat-img" style={{ maxWidth: "160px", maxHeight: "200px", borderRadius: "4px", display: "block", objectFit: "cover" }} />
                      ) : m.msgType === "transfer" ? (
                        <div style={{ background: "#fa9d3b", color: "#fff", padding: "10px 14px", borderRadius: "6px", minWidth: "160px" }}>
                          <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "2px" }}>微信转账</div>
                          <div style={{ fontSize: "20px", fontWeight: "bold" }}>¥ {m.amount}.00</div>
                          <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "4px" }}>{m.content}</div>
                        </div>
                      ) : m.msgType === "redpacket" ? (
                        <div style={{ background: "#fa9d3b", color: "#fff", padding: "10px 14px", borderRadius: "6px", minWidth: "160px" }}>
                          <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "2px" }}>🧧 微信红包</div>
                          <div style={{ fontSize: "14px", fontWeight: "bold" }}>{m.content}</div>
                        </div>
                      ) : m.msgType === "voice" ? (
                        <>
                          <span style={{ fontSize: "16px" }}>{isVoicePlaying ? "🔊" : "🎙️"}</span>
                          <span style={{ fontWeight: "600", color: "#333" }}>{isVoicePlaying ? "语音播放中..." : "语音消息"}</span>
                          <span style={{ fontSize: "12px", color: "#888", marginLeft: "12px" }}>{m.voiceDuration || "6″"}</span>
                        </>
                      ) : (
                        m.content
                      )}
                    </div>

                    {/* 🎙️ 语音固定转文字呈现 */}
                    {m.msgType === "voice" && (
                      <div style={{ fontSize: "11px", color: "#888", marginTop: "3px", marginLeft: isUser ? "auto" : "2px" }}>
                        转文字：{m.content}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {pendingImage && (
              <div style={{ display: "flex", alignItems: "flex-start", flexDirection: "row-reverse", gap: "10px" }}>
                <img src={myAvatar} alt="avatar" style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} />
                <div style={{ maxWidth: "70%", padding: "4px", borderRadius: "6px", background: "#95ec69", boxShadow: "0 1px 2px rgba(0,0,0,0.06)", position: "relative" }}>
                  <img src={pendingImage} alt="pending" style={{ maxWidth: "160px", maxHeight: "200px", borderRadius: "4px", display: "block", objectFit: "cover" }} />
                  <span onClick={() => setPendingImage(null)} style={{ position: "absolute", top: "-6px", right: "-6px", background: "#ff4d4f", color: "#fff", width: "18px", height: "18px", borderRadius: "50%", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: "bold" }}>×</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div style={{ background: "#f7f7f7", borderTop: "1px solid #d8d8d8", flexShrink: 0 }}>
            <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="text"
                placeholder={pendingImage ? "给图片附带说点什么..." : `发给 ${currentChatTarget.name}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                style={{ flex: 1, padding: "10px 12px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", fontSize: "14px", outline: "none", color: "#111" }}
              />
              <button
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                style={{ background: "#ddd", color: "#333", border: "none", width: "36px", height: "36px", borderRadius: "50%", fontSize: "20px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                +
              </button>
              <button
                onClick={() => handleSendMessage()}
                disabled={isGenerating || (!inputText.trim() && !pendingImage)}
                style={{ background: (inputText.trim() || pendingImage) && !isGenerating ? "#07c160" : "#c3e7d4", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
              >
                {isGenerating ? "生成中" : "发送"}
              </button>
            </div>

            {showPlusMenu && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", padding: "16px", background: "#f1f1f1", borderTop: "1px solid #e5e5e5" }}>
                {[
                  { icon: "🖼️", label: "照片", action: () => { setShowPlusMenu(false); chatPhotoInputRef.current?.click(); } },
                  { icon: "💰", label: "转账", action: () => { setShowPlusMenu(false); setTransferModal(true); } },
                  { icon: "🧧", label: "红包", action: () => { setShowPlusMenu(false); setRedpacketModal(true); } },
                  { icon: "📍", label: "位置", action: () => { handleSendMessage("分享了一个实时定位坐标", "location"); } },
                  { icon: "🎤", label: "语音", action: () => { setShowPlusMenu(false); handleSendMessage("[VOICE: 哼，真拿你没办法，快点回我消息啦。]", "voice"); } },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={item.action}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", cursor: "pointer" }}
                  >
                    <div style={{ width: "48px", height: "48px", background: "#fff", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}>
                      {item.icon}
                    </div>
                    <span style={{ fontSize: "11px", color: "#666" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <input type="file" ref={chatPhotoInputRef} accept="image/*" onChange={handleChatPhotoSelect} style={{ display: "none" }} />

          {transferModal && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
              <div style={{ background: "#fff", width: "100%", maxWidth: "300px", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
                <div style={{ fontSize: "16px", fontWeight: "bold", textAlign: "center", color: "#111" }}>发起微信转账</div>
                <div>
                  <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>转账金额 (元)</label>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "16px", fontWeight: "bold", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>转账备注</label>
                  <input
                    type="text"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button onClick={() => setTransferModal(false)} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer", fontSize: "13px" }}>取消</button>
                  <button
                    onClick={() => {
                      const amt = parseFloat(transferAmount) || 0;
                      setTransferModal(false);
                      handleSendMessage(`给对方转账了 ${amt} 元（备注：${transferNote}）`, "transfer", amt);
                    }}
                    style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "none", background: "#07c160", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
                  >
                    确认转账
                  </button>
                </div>
              </div>
            </div>
          )}

          {redpacketModal && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
              <div style={{ background: "#fff", width: "100%", maxWidth: "300px", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
                <div style={{ fontSize: "16px", fontWeight: "bold", textAlign: "center", color: "#111" }}>发微信红包</div>
                <div>
                  <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>红包金额 (元)</label>
                  <input
                    type="number"
                    value={redpacketAmount}
                    onChange={(e) => setRedpacketAmount(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "16px", fontWeight: "bold", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "$666", display: "block", marginBottom: "4px" }}>祝福语</label>
                  <input
                    type="text"
                    value={redpacketWish}
                    onChange={(e) => setRedpacketWish(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button onClick={() => setRedpacketModal(false)} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer", fontSize: "13px" }}>取消</button>
                  <button
                    onClick={() => {
                      const amt = parseFloat(redpacketAmount) || 0;
                      setRedpacketModal(false);
                      handleSendMessage(`发了一个金额为 ${amt} 元的红包：“${redpacketWish}”`, "redpacket", amt);
                    }}
                    style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "none", background: "#fa9d3b", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
                  >
                    塞钱进红包
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {deleteModalChar && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "320px", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: "16px", fontWeight: "bold", textAlign: "center", color: "#111" }}>
              管理好友：{deleteModalChar.name}
            </div>
            <div style={{ fontSize: "12px", color: "#666", textAlign: "center", marginBottom: "4px" }}>
              请选择你希望的清理方式：
            </div>

            <button
              onClick={() => handleExecuteDeleteOption(1)}
              style={{ background: "#f3f4f6", color: "#1f2937", border: "1px solid #d1d5db", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}
            >
              🗑️ 删除聊天记录但不删除记忆与好友
            </button>

            <button
              onClick={() => handleExecuteDeleteOption(3)}
              style={{ background: "#f3f4f6", color: "#1f2937", border: "1px solid #d1d5db", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}
            >
              🔄 删除上下文与记忆但不删除好友
            </button>

            <button
              onClick={() => handleExecuteDeleteOption(2)}
              style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}
            >
              ❌ 删除全部记忆请重新添加好友
            </button>

            <button
              onClick={() => setDeleteModalChar(null)}
              style={{ background: "none", border: "none", color: "#6b7280", padding: "6px", fontSize: "13px", cursor: "pointer", marginTop: "4px" }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {currentTab === "wallet" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f5f5f5", overflow: "hidden" }}>
          <div style={{ height: "48px", background: "#f5f5f5", borderBottom: "1px solid #ddd", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
            <button onClick={() => setCurrentTab("me")} style={{ background: "none", border: "none", color: "#07c160", fontSize: "15px", cursor: "pointer", fontWeight: "600" }}>‹ 返回</button>
            <span style={{ fontSize: "16px", fontWeight: "600", color: "#111" }}>微信钱包</span>
            <div style={{ width: "36px" }} />
          </div>

          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", flex: 1 }}>
            <div style={{ background: "linear-gradient(135deg, #07c160 0%, #10b981 100%)", borderRadius: "16px", padding: "24px", color: "#fff", boxShadow: "0 10px 25px rgba(7,193,96,0.3)" }}>
              <div style={{ fontSize: "13px", opacity: 0.9, marginBottom: "8px" }}>💰 零钱余额 (CNY)</div>
              <div style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "16px" }}>¥ {walletBalance}</div>
              <div style={{ fontSize: "11px", opacity: 0.85 }}>支持收支转账、发红包与互动开销</div>
            </div>

            <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", border: "1px solid #e5e5e5" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#333", display: "block", marginBottom: "8px" }}>
                ✏️ 自定义修改我的钱包余额
              </label>
              <input
                type="text"
                value={walletBalance}
                onChange={(e) => saveWallet(e.target.value)}
                placeholder="输入金额，如 1.13 或 888888.00"
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>
        </div>
      )}

      {currentTab === "add_friends" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", overflow: "hidden" }}>
          <div style={{ height: "48px", background: "#ededed", borderBottom: "1px solid #d8d8d8", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
            <button onClick={() => setCurrentTab("chats")} style={{ background: "none", border: "none", color: "#07c160", fontSize: "15px", cursor: "pointer", fontWeight: "600" }}>‹ 完成</button>
            <span style={{ fontSize: "16px", fontWeight: "600", color: "#111" }}>添加与管理微信好友</span>
            <div style={{ width: "36px" }} />
          </div>

          <div style={{ padding: "14px", overflowY: "auto", flex: 1 }}>
            {allChars.length === 0 ? (
              <div style={{ textAlign: "center", color: "#888", marginTop: "60px", fontSize: "13px" }}>
                你还没有导入任何角色卡！请先去【⚙️ 设定 → 角色档案】导入你的男友卡片。
              </div>
            ) : (
              allChars.map((char) => {
                const isFriend = friendIds.includes(char.id);
                return (
                  <div key={char.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img src={char.avatar || "/placeholder-avatar.png"} alt={char.name} style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} />
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>{char.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        const next = isFriend ? friendIds.filter((id) => id !== char.id) : [...friendIds, char.id];
                        setFriendIds(next);
                        localStorage.setItem("phone_wechat_friends", JSON.stringify(next));
                      }}
                      style={{ background: isFriend ? "#e5e5e5" : "#07c160", color: isFriend ? "#333" : "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                    >
                      {isFriend ? "已添加 ✓" : "+ 添加"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {(currentTab === "chats" || currentTab === "contacts" || currentTab === "discover" || currentTab === "me") && (
        <div style={{ height: "54px", background: "#f7f7f7", borderTop: "1px solid #d8d8d8", display: "flex", justifyContent: "space-around", alignItems: "center", flexShrink: 0 }}>
          <div onClick={() => setCurrentTab("chats")} style={{ display: "flex", flexDirection: "column", alignItems: "center", color: currentTab === "chats" ? "#07c160" : "#555", fontSize: "11px", cursor: "pointer" }}>
            <span style={{ fontSize: "18px" }}>💬</span>
            <span>微信</span>
          </div>
          <div onClick={() => setCurrentTab("contacts")} style={{ display: "flex", flexDirection: "column", alignItems: "center", color: currentTab === "contacts" ? "#07c160" : "#555", fontSize: "11px", cursor: "pointer" }}>
            <span style={{ fontSize: "18px" }}>👤</span>
            <span>通讯录</span>
          </div>
          <div onClick={() => setCurrentTab("discover")} style={{ display: "flex", flexDirection: "column", alignItems: "center", color: currentTab === "discover" ? "#07c160" : "#555", fontSize: "11px", cursor: "pointer" }}>
            <span style={{ fontSize: "18px" }}>🧭</span>
            <span>发现</span>
          </div>
          <div onClick={() => setCurrentTab("me")} style={{ display: "flex", flexDirection: "column", alignItems: "center", color: currentTab === "me" ? "#07c160" : "#555", fontSize: "11px", cursor: "pointer" }}>
            <span style={{ fontSize: "18px" }}>🙂</span>
            <span>我</span>
          </div>
        </div>
      )}
    </div>
  );
}