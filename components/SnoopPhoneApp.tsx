"use client";

import React, { useState, useEffect } from "react";
import { WorldSettings } from "./SettingsApp";
import { TavernCharacterCard } from "../types";

interface SnoopPhoneAppProps {
  settings: WorldSettings;
}

interface SnoopSecret {
  title: string;
  category: "chat" | "note" | "photo";
  content: string;
  date: string;
}

export default function SnoopPhoneApp({ settings }: SnoopPhoneAppProps) {
  // 解锁状态
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  // 角色卡选择与查岗状态
  const [chars, setChars] = useState<TavernCharacterCard[]>([]);
  const [selectedTargetChar, setSelectedTargetChar] = useState<TavernCharacterCard | null>(null);
  
  const [secrets, setSecrets] = useState<SnoopSecret[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 微信好友联动
  const [friends, setFriends] = useState<TavernCharacterCard[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<TavernCharacterCard | null>(null);
  const [shareModalSecret, setShareModalSecret] = useState<SnoopSecret | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 读取所有的酒馆角色卡（比如岑烬等）
    const savedChars = localStorage.getItem("my_tavern_chars");
    const savedFriends = localStorage.getItem("phone_wechat_friends");

    if (savedChars) {
      try {
        const parsedChars: TavernCharacterCard[] = JSON.parse(savedChars);
        setChars(parsedChars);
        if (parsedChars.length > 0) setSelectedTargetChar(parsedChars[0]);
      } catch {}
    }

    if (savedChars && savedFriends) {
      try {
        const all: TavernCharacterCard[] = JSON.parse(savedChars);
        const fIds: string[] = JSON.parse(savedFriends);
        const active = all.filter((c) => fIds.includes(c.id));
        setFriends(active);
        if (active.length > 0) setSelectedFriend(active[0]);
      } catch {}
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // 长按指纹解锁逻辑
  useEffect(() => {
    let interval: any;
    if (isHolding) {
      let current = 0;
      interval = setInterval(() => {
        current += 5;
        setHoldProgress(current);
        if (current >= 100) {
          clearInterval(interval);
          setIsUnlocked(true);
          showToast("🔓 指纹验证成功，请选择要查岗的目标对象");
        }
      }, 50);
    } else {
      setHoldProgress(0);
    }
    return () => clearInterval(interval);
  }, [isHolding]);

  // 点击查岗时：必须先弹窗提示用户，确认后才调用 API 深度解析该角色的真实角色卡
  const handleStartSnoop = async () => {
    if (!selectedTargetChar) {
      alert("请先选择要查岗的目标角色卡！");
      return;
    }

    const confirmed = window.confirm(`🔍 【查岗系统提示】即将消耗一次 API 请求，深度渗透读取角色【${selectedTargetChar.name}】的真实角色卡设定、当前状态及微信上下文，生成其私密手机动态。是否继续？`);
    if (!confirmed) return;

    setIsLoading(true);
    showToast(`🔍 正在破解 ${selectedTargetChar.name} 的手机沙盒...`);

    try {
      let baseUrl = settings.apiBaseUrl.trim().replace(/\/+$/, "");
      if (!baseUrl.endsWith("/v1")) baseUrl = `${baseUrl}/v1`;

      const chatKey = `phone_wechat_messages`;
      const savedMsgs = localStorage.getItem(chatKey) || "{}";

      // 提取该角色的核心设定与描述
      const cardDesc = selectedTargetChar.description || selectedTargetChar.personality || "暂无详细设定";

      const prompt = `
你现在是“男友手机查岗系统”的AI后台引擎。
【全局世界观设定】
${settings.worldView}

【目标查岗人物（男友）核心角色卡设定】：
姓名：${selectedTargetChar.name}
设定详情：${cardDesc}

【当前微信聊天记录摘要/上下文】：
${savedMsgs.slice(0, 1500)}

【极其重要的约束】：
1. 严禁凭空捏造与该角色卡无关的豪门或剧情（如不相干的姓氏或家族联姻），必须严格根据上述【${selectedTargetChar.name}】的真实角色卡设定（例如他的年龄、职业、身边人如妻子/助理、习惯、老宅、独特癖好等）来推演！
2. 生成 3 到 4 条该角色手机里真实可能存在的私密内容，包括：
   - 隐藏备忘录/日记 (category: "note")
   - 微信聊天草稿箱/未发送对话 (category: "chat")
   - 私密相册心情/照片描述 (category: "photo")
3. 【必须严格输出为标准的 JSON 数组格式】，不要包含任何 markdown 标签或前后缀，格式如下：
[
  {
    "title": "标题或场景",
    "category": "note",
    "content": "具体内容，必须完美契合该角色的性格与设定细节",
    "date": "刚刚 / 10分钟前 / 昨天"
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
          temperature: 0.85,
          max_tokens: 1500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.choices?.[0]?.message?.content?.trim() || "[]";
        const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsedArray = JSON.parse(cleanJson);
        setSecrets(parsedArray);
        showToast(`✨ 成功破解 ${selectedTargetChar.name} 的手机！`);
      } else {
        throw new Error("API 请求失败");
      }
    } catch (err) {
      showToast("⚠️ API 调用失败，请检查网络或 Key 设置。");
    } finally {
      setIsLoading(false);
    }
  };

  // 分享秘密到微信
  const handleShareToWeChat = (secret: SnoopSecret) => {
    if (!selectedFriend) {
      alert("请先在微信添加好友！");
      return;
    }
    setShareModalSecret(secret);
  };

  const confirmShare = () => {
    if (!shareModalSecret || !selectedFriend) return;

    const chatKey = `phone_wechat_messages`;
    const savedMsgs = localStorage.getItem(chatKey);
    let msgMap: Record<string, any[]> = savedMsgs ? JSON.parse(savedMsgs) : {};

    const targetMsgs = msgMap[selectedFriend.id] || [];
    const nowTime = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

    const secretCardMsg = {
      id: `msg_${Date.now()}_snoop`,
      sender: "user",
      content: `[查岗截图分享] 发现 ${selectedTargetChar?.name || "他"} 的小秘密：【${shareModalSecret.title}】 - ${shareModalSecret.content}`,
      time: nowTime,
      msgType: "snoop",
      snoopData: shareModalSecret,
    };

    msgMap[selectedFriend.id] = [...targetMsgs, secretCardMsg];
    localStorage.setItem(chatKey, JSON.stringify(msgMap));

    setShareModalSecret(null);
    showToast(`已将情报发送给 ${selectedFriend.name}！快去微信发消息质问他吧（发送新消息后才会触发他的回复）~`);
  };

  // 未解锁状态：指纹长按拦截
  if (!isUnlocked) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", color: "#fff", alignItems: "center", justifyContent: "center", padding: "20px", userSelect: "none" }}>
        <div style={{ fontSize: "50px", marginBottom: "16px" }}>🔒</div>
        <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>男友的私密手机</div>
        <div style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", marginBottom: "32px", padding: "0 20px" }}>
          该设备已被加密保护。请长按下方指纹区域通过生物验证：
        </div>

        <div
          onMouseDown={() => setIsHolding(true)}
          onMouseUp={() => setIsHolding(false)}
          onMouseLeave={() => setIsHolding(false)}
          onTouchStart={() => setIsHolding(true)}
          onTouchEnd={() => setIsHolding(false)}
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            border: "2px solid rgba(239, 68, 68, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
            boxShadow: isHolding ? "0 0 20px rgba(239, 68, 68, 0.8)" : "0 4px 12px rgba(0,0,0,0.3)"
          }}
        >
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(239, 68, 68, 0.4)", height: `${holdProgress}%`, transition: "height 0.05s linear" }} />
          <span style={{ fontSize: "32px", zIndex: 2, margin: "auto" }}>👆</span>
        </div>
        <div style={{ fontSize: "12px", color: isHolding ? "#ef4444" : "#64748b", marginTop: "16px", fontWeight: "bold" }}>
          {isHolding ? `正在验证生物特征... ${holdProgress}%` : "长按指纹区域不放以解锁"}
        </div>
      </div>
    );
  }

  // 解锁后：先选择要查岗的角色卡，再点击加载
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0f172a", color: "#fff", position: "relative" }}>
      
      {/* 顶部标题栏 */}
      <div style={{ background: "#1e293b", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #334155", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>👁️‍🗨️</span>
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>男友手机·深度查岗模式</span>
        </div>
        <button
          onClick={() => setIsUnlocked(false)}
          style={{ background: "#334155", color: "#cbd5e1", border: "none", padding: "4px 8px", borderRadius: "8px", fontSize: "11px", cursor: "pointer" }}
        >
          重新加锁 🔒
        </button>
      </div>

      {/* 角色卡选择与触发区 */}
      <div style={{ padding: "14px", background: "#1e293b", borderBottom: "1px solid #334155", display: "flex", flexDirection: "column", gap: "10px", flexShrink: 0 }}>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>选择你要查岗的男友角色卡：</div>
        
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {chars.length === 0 ? (
            <div style={{ fontSize: "12px", color: "#ef4444" }}>你还没有在“系统设定中心”导入任何角色卡！</div>
          ) : (
            <select
              value={selectedTargetChar?.id || ""}
              onChange={(e) => {
                const found = chars.find(c => c.id === e.target.value);
                if (found) setSelectedTargetChar(found);
              }}
              style={{ flex: 1, padding: "8px", borderRadius: "8px", background: "#0f172a", color: "#fff", border: "1px solid #475569", fontSize: "13px" }}
            >
              {chars.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.description ? c.description.slice(0, 15) + "..." : "无描述"})</option>
              ))}
            </select>
          )}

          <button
            onClick={handleStartSnoop}
            disabled={isLoading || !selectedTargetChar}
            style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {isLoading ? "深度解析中..." : "🔍 确认查岗"}
          </button>
        </div>
      </div>

      {/* 秘密内容展示区 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {secrets.length === 0 ? (
          <div style={{ textAlign: "center", color: "#64748b", marginTop: "60px", fontSize: "13px", padding: "0 20px" }}>
            请在上方选择你的男友角色卡，并点击【确认查岗】。系统将根据他的真实设定与你们的微信聊天，实时解密他的私密手机动态~
          </div>
        ) : (
          <>
            <div style={{ fontSize: "11px", color: "#38bdf8", paddingLeft: "4px" }}>
              ✨ 已成功加载【{selectedTargetChar?.name}】的私密手机沙盒数据：
            </div>
            {secrets.map((item, idx) => (
              <div key={idx} style={{ background: "#1e293b", borderRadius: "12px", padding: "12px", border: "1px solid #334155", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#f87171" }}>
                    {item.category === "chat" ? "💬 微信聊天草稿" : item.category === "note" ? "📝 隐藏备忘录/日记" : "🖼️ 私密相册心情"}：{item.title}
                  </span>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>{item.date}</span>
                </div>
                <div style={{ fontSize: "12px", color: "#e2e8f0", background: "#0f172a", padding: "8px", borderRadius: "8px", lineHeight: "1.4" }}>
                  {item.content}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px" }}>
                  <button
                    onClick={() => handleShareToWeChat(item)}
                    style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    📲 截屏发微信质问 ↗
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 分享弹窗 */}
      {shareModalSecret && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#1e293b", width: "100%", maxWidth: "300px", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", border: "1px solid #334155" }}>
            <div style={{ fontSize: "15px", fontWeight: "bold", textAlign: "center" }}>将情报发送到微信</div>
            <div style={{ fontSize: "11px", color: "#cbd5e1", background: "#0f172a", padding: "8px", borderRadius: "8px" }}>
              已截获：<strong>{shareModalSecret.title}</strong>
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>选择发送给哪个微信好友：</label>
              {friends.length === 0 ? (
                <div style={{ fontSize: "11px", color: "#ef4444" }}>你还没有添加微信好友！</div>
              ) : (
                <select
                  value={selectedFriend?.id || ""}
                  onChange={(e) => {
                    const f = friends.find((x) => x.id === e.target.value);
                    if (f) setSelectedFriend(f);
                  }}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #444", fontSize: "13px", background: "#0f172a", color: "#fff" }}
                >
                  {friends.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ fontSize: "10px", color: "#f87171", lineHeight: "1.4" }}>
              💡 机制说明：发送后不会立即回复。你需要前往微信发一句“这是什么意思？”，他才会看到并根据该设定心虚回复你！
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button onClick={() => setShareModalSecret(null)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #555", background: "#334155", cursor: "pointer", fontSize: "12px", color: "#fff" }}>取消</button>
              <button onClick={confirmShare} disabled={friends.length === 0} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>确认发送</button>
            </div>
          </div>
        </div>
      )}

      {/* 轻提示 Toast */}
      {toastMsg && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(0,0,0,0.85)", color: "#fff", padding: "10px 20px", borderRadius: "8px", fontSize: "12px", zIndex: 200, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
          {toastMsg}
        </div>
      )}

    </div>
  );
}