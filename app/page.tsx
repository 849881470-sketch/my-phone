"use client";

import React, { useState, useEffect, useRef } from "react";
import { HarmonySplash } from "../components/HarmonySplash";
import SettingsApp, { WorldSettings } from "../components/SettingsApp";
import WeChatApp from "../components/WeChatApp";
import RedBookApp from "../components/RedBookApp";
import NotesApp from "../components/NotesApp";
import ShoppingApp from "../components/ShoppingApp";
import MusicApp from "../components/MusicApp";
import SnoopPhoneApp from "../components/SnoopPhoneApp";
import { TavernCharacterCard } from "../types";
import DouyinSFWApp from "../components/DouyinSFWApp";

const DEFAULT_SETTINGS: WorldSettings = {
  userName: "我",
  userPersona: "目前居住在上海，平时喜欢安静地待在家里。",
  worldView: "真实世界观",
  apiBaseUrl: "https://api.openai.com/v1",
  apiKey: "",
  modelName: "gpt-4o-mini",
  idleHours: 2,
  maxBurst: 1,
  doNotDisturb: true,
  dndStart: "23:00",
  dndEnd: "08:00",
};

const CITY_COORDS: Record<string, { lat: number; lon: number; keywords: string[] }> = {
  上海: { lat: 31.23, lon: 121.47, keywords: ["上海", "沪", "魔都", "海滨", "外滩", "东海", "江浙沪", "沄海"] },
  北京: { lat: 39.90, lon: 116.40, keywords: ["北京", "京", "帝都", "北方", "皇城"] },
  广州: { lat: 23.13, lon: 113.26, keywords: ["广州", "穗", "岭南", "珠江", "花城"] },
  深圳: { lat: 22.54, lon: 114.05, keywords: ["深圳", "深", "特区", "南山", "湾区"] },
  杭州: { lat: 30.27, lon: 120.15, keywords: ["杭州", "杭", "西湖", "江南", "临安"] },
  成都: { lat: 30.57, lon: 104.06, keywords: ["成都", "蓉", "蜀", "巴蜀", "天府", "西南"] },
  重庆: { lat: 29.56, lon: 106.55, keywords: ["重庆", "渝", "山城", "雾都", "江城"] },
  南京: { lat: 32.06, lon: 118.79, keywords: ["南京", "宁", "金陵", "秦淮"] },
  武汉: { lat: 30.59, lon: 114.30, keywords: ["武汉", "汉", "江城", "荆楚"] },
  东京: { lat: 35.68, lon: 139.69, keywords: ["东京", "新宿", "涉谷", "日本", "关东"] },
  首尔: { lat: 37.56, lon: 126.97, keywords: ["首尔", "汉江", "韩国", "江南区"] },
  伦敦: { lat: 51.50, lon: -0.12, keywords: ["伦敦", "泰晤士", "英国", "雾都英伦"] },
  纽约: { lat: 40.71, lon: -74.00, keywords: ["纽约", "曼哈顿", "美国", "东海岸"] },
};

function resolveWorldLocation(userPersona: string, worldView: string) {
  const combinedText = `${worldView} ${userPersona}`;
  const isRealWorld = worldView.includes("真实") || worldView.trim() === "";

  let fictionalCity = "";
  if (!isRealWorld) {
    const cityMatch = worldView.match(/([\u4e00-\u9fa5]{2,4}(?:市|城|镇|都|岛))/);
    if (cityMatch && !["真实世界", "架空世界", "现代城市", "海滨城市"].includes(cityMatch[1])) {
      fictionalCity = cityMatch[1];
    }
  }

  let matchedAnchor = "上海";
  let maxScore = 0;
  for (const [city, info] of Object.entries(CITY_COORDS)) {
    let score = combinedText.includes(city) ? 10 : 0;
    for (const kw of info.keywords) {
      if (combinedText.includes(kw)) score += 3;
    }
    if (score > maxScore) {
      maxScore = score;
      matchedAnchor = city;
    }
  }

  const coords = CITY_COORDS[matchedAnchor] || CITY_COORDS["上海"];
  return {
    displayCity: fictionalCity || `${matchedAnchor}市`,
    anchorCity: matchedAnchor,
    lat: coords.lat,
    lon: coords.lon,
  };
}

function isInDoNotDisturbTime(startStr: string = "23:00", endStr: string = "08:00") {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);

  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

function AppIcon({ label, bg, emoji, badge, onClick }: { label: string; bg: string; emoji: string; badge?: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.4)", position: "relative" }}>
        <span style={{ fontSize: "28px" }}>{emoji}</span>
        {badge && <span style={{ position: "absolute", top: "-5px", right: "-5px", background: "#ef4444", color: "#fff", fontSize: "10px", fontWeight: "bold", padding: "1px 5px", borderRadius: "999px" }}>{badge}</span>}
      </div>
      <span style={{ fontSize: "11px", color: "#fff", fontWeight: "500", textShadow: "0 1px 4px rgba(0,0,0,0.9)", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

export default function HomePage() {
  const [splashDismissed, setSplashDismissed] = useState(false);
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [settings, setSettings] = useState<WorldSettings>(DEFAULT_SETTINGS);
  const [activeBoyfriend, setActiveBoyfriend] = useState<TavernCharacterCard | null>(null);
  const [hasWeChatUnread, setHasWeChatUnread] = useState(false);

  const [resolvedCity, setResolvedCity] = useState("上海市");
  const [weatherInfo, setWeatherInfo] = useState({ temp: "18°", desc: "晴 · 空气优", range: "14° / 22°", icon: "⛅" });
  const [nowTime, setNowTime] = useState("14:06");
  const [nowDate, setNowDate] = useState("11月13日周五");

  const [albumPhotos, setAlbumPhotos] = useState<string[]>([]);
  const albumInputRef = useRef<HTMLInputElement>(null);

  // 🖼️ 壁纸状态
  const [wallpaperUrl, setWallpaperUrl] = useState<string>("/wallpaper.jpg");
  const [selectedPhotoForWallpaper, setSelectedPhotoForWallpaper] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  useEffect(() => {
    const saved = localStorage.getItem("my_phone_world_settings");
    if (saved) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) }); } catch {}
    }
    const savedWallpaper = localStorage.getItem("my_phone_wallpaper");
    if (savedWallpaper) {
      setWallpaperUrl(savedWallpaper);
    }

    const tick = () => {
      const d = new Date();
      setNowTime(d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
      setNowDate(d.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" }));
    };
    tick();
    const timer = setInterval(tick, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!splashDismissed) return;
    const heartbeatInterval = setInterval(() => {
      checkAndTriggerSilentHeartbeat();
    }, 60000);
    return () => clearInterval(heartbeatInterval);
  }, [splashDismissed, settings, activeBoyfriend]);

  const checkAndTriggerSilentHeartbeat = async () => {
    if (typeof window === "undefined") return;
    if (!settings.apiKey) return;

    if (settings.doNotDisturb) {
      if (isInDoNotDisturbTime(settings.dndStart, settings.dndEnd)) {
        return;
      }
    }

    const savedChars = localStorage.getItem("my_tavern_chars");
    const savedFriends = localStorage.getItem("phone_wechat_friends");
    if (!savedChars || !savedFriends) return;

    try {
      const allChars: TavernCharacterCard[] = JSON.parse(savedChars);
      const fIds: string[] = JSON.parse(savedFriends);
      const activeFriends = allChars.filter(c => fIds.includes(c.id));
      if (activeFriends.length === 0) return;

      const targetChar = activeBoyfriend || activeFriends[0];
      const chatKey = `phone_wechat_messages`;
      const savedMsgsMap = JSON.parse(localStorage.getItem(chatKey) || "{}");
      const targetMsgs = savedMsgsMap[targetChar.id] || [];

      if (targetMsgs.length > 0) {
        const lastMsg = targetMsgs[targetMsgs.length - 1];
        if (lastMsg.sender === targetChar.id) return; 
      }

      const idleLimitHours = settings.idleHours ?? 2;
      const lastInteractTime = Number(localStorage.getItem(`last_interact_${targetChar.id}`) || Date.now());
      const hoursSinceLast = (Date.now() - lastInteractTime) / (1000 * 60 * 60);

      if (hoursSinceLast >= idleLimitHours) {
        await triggerSilentHeartbeatMessage(targetChar, targetMsgs);
        localStorage.setItem(`last_interact_${targetChar.id}`, String(Date.now()));
      }
    } catch (e) {
      console.error("Silent heartbeat error:", e);
    }
  };

  const triggerSilentHeartbeatMessage = async (char: TavernCharacterCard, existingMsgs: any[]) => {
    try {
      let baseUrl = settings.apiBaseUrl.trim().replace(/\/+$/, "");
      if (!baseUrl.endsWith("/v1")) baseUrl = `${baseUrl}/v1`;

      const maxBurst = settings.maxBurst ?? 1;
      const currentTimeStr = new Date().toLocaleString("zh-CN");

      const prompt = `
你现在是角色扮演中的男友角色，绝对不能OOC。
【全局世界观设定】
${settings.worldView}

【你的角色卡档案】
姓名：${char.name}
详细设定：${char.description || char.personality || ""}

【当前真实时间】：${currentTimeStr}
【当前城市】：${resolvedCity}

【你们最近的微信聊天上下文】：
${JSON.stringify(existingMsgs.slice(-6))}

【核心任务】：
因为你已经有一段时间没有收到用户的消息了。请根据你的性格与上述世界观，在后台主动给用户发微信消息。
【约束条件】：
1. 严禁 OOC，语气、称呼必须 100% 贴合你的角色卡。
2. 数量限制：请生成 1 到 ${maxBurst} 条连续的消息。
3. 【必须严格输出为标准的 JSON 数组格式】：
[
  "第一条消息内容"
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
          temperature: 0.9,
          max_tokens: 800,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.choices?.[0]?.message?.content?.trim() || "[]";
        const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const msgArray: string[] = JSON.parse(cleanJson);

        const chatKey = `phone_wechat_messages`;
        const savedMsgsMap = JSON.parse(localStorage.getItem(chatKey) || "{}");
        const currentTargetMsgs = savedMsgsMap[char.id] || [];

        let updatedMsgs = [...currentTargetMsgs];
        msgArray.forEach((text, idx) => {
          const nowTime = new Date(Date.now() + idx * 1000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
          updatedMsgs.push({
            id: `msg_silent_${Date.now()}_${idx}`,
            sender: char.id,
            content: text,
            time: nowTime,
            msgType: "text"
          });
        });

        savedMsgsMap[char.id] = updatedMsgs;
        localStorage.setItem(chatKey, JSON.stringify(savedMsgsMap));
        localStorage.setItem(`last_interact_${char.id}`, String(Date.now()));
        setHasWeChatUnread(true);
      }
    } catch (err) {
      console.error("Failed to fetch silent heartbeat message", err);
    }
  };

  useEffect(() => {
    const loc = resolveWorldLocation(settings.userPersona, settings.worldView);
    setResolvedCity(loc.displayCity);

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.current_weather) {
          const curTemp = Math.round(data.current_weather.temperature);
          const code = data.current_weather.weathercode;
          let desc = "晴朗", icon = "☀️";
          if (code >= 1 && code <= 3) { desc = "多云"; icon = "⛅"; }
          else if (code >= 45 && code <= 48) { desc = "薄雾"; icon = "🌫️"; }
          else if (code >= 51 && code <= 67) { desc = "小雨"; icon = "🌧️"; }
          else if (code >= 71 && code <= 77) { desc = "降雪"; icon = "❄️"; }
          else if (code >= 80) { desc = "阵雨"; icon = "🌦️"; }
          const minT = data.daily?.temperature_2m_min?.[0] ? Math.round(data.daily.temperature_2m_min[0]) : curTemp - 4;
          const maxT = data.daily?.temperature_2m_max?.[0] ? Math.round(data.daily.temperature_2m_max[0]) : curTemp + 4;
          setWeatherInfo({ temp: `${curTemp}°`, desc: `${desc} · 同步${loc.anchorCity}`, range: `${minT}° / ${maxT}°`, icon });
        }
      })
      .catch(() => {});
  }, [settings.userPersona, settings.worldView]);

  const saveSettings = (next: WorldSettings) => {
    setSettings(next);
    localStorage.setItem("my_phone_world_settings", JSON.stringify(next));
  };

  const handleAlbumFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith("image/")) urls.push(URL.createObjectURL(files[i]));
    }
    setAlbumPhotos((prev) => [...urls, ...prev]);
  };

  return (
    <main style={{ minHeight: "100dvh", width: "100vw", background: "radial-gradient(circle at 50% 30%, #1a1826 0%, #07070a 100%)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div className="real-phone-container" style={{ width: "100%", maxWidth: "400px", height: "100dvh", maxHeight: "850px", borderRadius: "42px", border: "6px solid #23232e", boxShadow: "0 28px 80px rgba(0,0,0,0.9)", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", backgroundColor: "#0b0b10", backgroundImage: `url('${wallpaperUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <style>{`@media (max-width: 480px) { .real-phone-container { max-width: 100vw !important; max-height: 100dvh !important; border-radius: 0 !important; border: none !important; } }`}</style>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.45) 100%)", pointerEvents: "none", zIndex: 0 }} />

        {!splashDismissed ? (
          <div style={{ width: "100%", height: "100%", position: "relative", zIndex: 50 }}>
            <HarmonySplash onEnter={() => setSplashDismissed(true)} />
          </div>
        ) : (
          <>
            <div style={{ height: "36px", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.6)", zIndex: 10, flexShrink: 0 }}>
              <span>{nowTime}</span>
              <div style={{ width: "66px", height: "16px", background: "#000", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)" }} />
              <span>5G 🔋</span>
            </div>

            {!activeApp ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "14px 18px 18px 18px", zIndex: 5, overflowY: "auto" }}>
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "22px" }}>
                    <div onClick={() => setActiveApp("settings")} style={{ aspectRatio: "1/1", background: "rgba(22,26,38,0.55)", backdropFilter: "blur(16px)", borderRadius: "22px", border: "1px solid rgba(255,255,255,0.18)", padding: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#fff", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: "600" }}>📍 {resolvedCity}</span>
                        <span style={{ fontSize: "18px" }}>{weatherInfo.icon}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: "34px", fontWeight: "300", lineHeight: 1.1 }}>{weatherInfo.temp}</div>
                        <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "4px" }}>{weatherInfo.desc}</div>
                      </div>
                      <div style={{ fontSize: "10px", opacity: 0.65 }}>最高/低 {weatherInfo.range}</div>
                    </div>

                    <div onClick={() => setActiveApp("settings")} style={{ aspectRatio: "1/1", background: "rgba(22,26,38,0.55)", backdropFilter: "blur(16px)", borderRadius: "22px", border: "1px solid rgba(255,255,255,0.18)", padding: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#fff", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: "600", opacity: 0.9 }}>{resolvedCity}</span>
                        <span style={{ fontSize: "10px", background: "rgba(255,255,255,0.15)", padding: "2px 6px", borderRadius: "6px" }}>实时</span>
                      </div>
                      <div style={{ margin: "auto 0" }}>
                        <div style={{ fontSize: "34px", fontWeight: "600", letterSpacing: "1px", lineHeight: 1.1 }}>{nowTime}</div>
                        <div style={{ fontSize: "12px", opacity: 0.85, marginTop: "8px" }}>{nowDate}</div>
                      </div>
                      <div style={{ height: "4px" }} />
                    </div>
                  </div>

                  {/* 桌面应用网格 */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", rowGap: "20px", columnGap: "10px" }}>
                    <AppIcon bg="linear-gradient(135deg, #ff7a00, #ff4d00)" emoji="🛍️" label="购物" onClick={() => setActiveApp("shopping")} />
                    <AppIcon bg="linear-gradient(135deg, #f43f5e, #be123c)" emoji="🎵" label="音乐" onClick={() => setActiveApp("music")} />
                    <AppIcon bg="linear-gradient(135deg, #ff2442, #e11d48)" emoji="📕" label="小红书" onClick={() => setActiveApp("xhs")} />
                    <AppIcon bg="linear-gradient(135deg, #facc15, #eab308)" emoji="📝" label="备忘录" onClick={() => setActiveApp("notes")} />
                    <AppIcon badge="私密" bg="linear-gradient(135deg, #7c3aed, #312e81)" emoji="🔐" label="偷看男友手机" onClick={() => setActiveApp("peek")} />
                    <AppIcon badge="🔥" bg="linear-gradient(135deg, #ec4899, #8b5cf6)" emoji="💃" label="MoeTok" onClick={() => setActiveApp("moetok")} />
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.14)", backdropFilter: "blur(20px)", borderRadius: "26px", border: "1px solid rgba(255,255,255,0.18)", padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "12px" }}>
                  <AppIcon bg="linear-gradient(135deg, #64748b, #334155)" emoji="⚙️" label="设定" onClick={() => setActiveApp("settings")} />
                  <AppIcon bg="linear-gradient(135deg, #38bdf8, #0284c7)" emoji="💬" label="信息" onClick={() => setActiveApp("sms")} />
                  <AppIcon bg="linear-gradient(135deg, #f472b6, #db2777)" emoji="🖼️" label="相册" onClick={() => setActiveApp("album")} />
                  <AppIcon badge={hasWeChatUnread ? "•" : undefined} bg="linear-gradient(135deg, #22c55e, #15803d)" emoji="💚" label="微信" onClick={() => setActiveApp("wechat")} />
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, background: "#121218", zIndex: 20, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
                <div style={{ height: "44px", padding: "0 16px", background: "#181822", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff", flexShrink: 0 }}>
                  <button onClick={() => setActiveApp(null)} style={{ background: "none", border: "none", color: "#818cf8", fontSize: "14px", cursor: "pointer", fontWeight: "600" }}>‹ 桌面</button>
                  <span style={{ fontSize: "15px", fontWeight: "600" }}>
                    {activeApp === "settings" ? "系统设定中心" : activeApp === "sms" ? "短信信息" : activeApp === "album" ? "本地私密相册" : activeApp === "wechat" ? "微信" : activeApp === "xhs" ? "小红书" : activeApp === "notes" ? "备忘录" : activeApp === "shopping" ? "淘宝购物" : activeApp === "music" ? "网易云音乐" : activeApp === "peek" ? "🔐 男友手机查岗模式" : "应用空间"}
                  </span>
                  <div style={{ width: "42px" }} />
                </div>

                <div style={{ flex: 1, overflowY: "auto", color: "#fff" }}>
                  {activeApp === "settings" && (
                    <SettingsApp
                      settings={settings}
                      onSaveSettings={saveSettings}
                      resolvedCity={resolvedCity}
                      weatherDesc={weatherInfo.desc}
                      onSelectBoyfriend={(char) => {
                        setActiveBoyfriend(char);
                        setActiveApp("wechat");
                      }}
                    />
                  )}

                  {/* 🖼️ 相册页面（带一键设为壁纸功能） */}
                  {activeApp === "album" && (
                    <div style={{ padding: "14px", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                        <span style={{ fontSize: "13px", color: "#9ca3af" }}>已同步 {albumPhotos.length} 张照片 (点击可设为壁纸)</span>
                        <button onClick={() => albumInputRef.current?.click()} style={{ background: "#ec4899", border: "none", color: "#fff", padding: "7px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>+ 选择本地照片</button>
                        <input type="file" ref={albumInputRef} onChange={handleAlbumFolderSelect} multiple accept="image/*" style={{ display: "none" }} />
                      </div>
                      {albumPhotos.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#6b7280", marginTop: "80px", fontSize: "13px" }}>点击右上角按钮，选择图片同步进来。点击任意照片即可一键更换手机壁纸！</div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                          {albumPhotos.map((src, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => setSelectedPhotoForWallpaper(src)}
                              style={{ position: "relative", cursor: "pointer", borderRadius: "8px", overflow: "hidden", aspectRatio: "1/1", border: "2px solid rgba(255,255,255,0.1)" }}
                            >
                              <img src={src} alt={`p-${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", fontSize: "9px", textAlign: "center", color: "#fbcfe8", padding: "2px 0" }}>
                                设为壁纸 🖼️
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 确认更换壁纸弹窗 */}
                      {selectedPhotoForWallpaper && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                          <div style={{ background: "#181824", border: "1px solid rgba(236,72,153,0.4)", borderRadius: "20px", padding: "16px", width: "100%", maxWidth: "280px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#f472b6" }}>🖼️ 更换手机壁纸</div>
                            <img src={selectedPhotoForWallpaper} alt="preview" style={{ width: "100px", height: "130px", objectFit: "cover", borderRadius: "10px", border: "1px solid #333" }} />
                            <div style={{ fontSize: "12px", color: "#cbd5e1", textAlign: "center" }}>要把这张照片设为你的手机桌面壁纸吗？</div>
                            <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "4px" }}>
                              <button
                                onClick={() => setSelectedPhotoForWallpaper(null)}
                                style={{ flex: 1, background: "#262638", border: "none", color: "#94a3b8", padding: "8px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}
                              >
                                取消
                              </button>
                              <button
                                onClick={() => {
                                  setWallpaperUrl(selectedPhotoForWallpaper);
                                  localStorage.setItem("my_phone_wallpaper", selectedPhotoForWallpaper);
                                  setSelectedPhotoForWallpaper(null);
                                  showToast("✨ 壁纸更换成功！");
                                }}
                                style={{ flex: 1, background: "linear-gradient(135deg, #ec4899, #8b5cf6)", border: "none", color: "#fff", padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                              >
                                确认更换
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeApp === "sms" && (
                    <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ background: "#1c1c26", padding: "12px", borderRadius: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }}><span>10690000 · 速递提醒</span><span>刚刚</span></div>
                        <div style={{ fontSize: "13px" }}>【顺丰速运】{settings.userName}，您的包裹已派送至 {resolvedCity}。</div>
                      </div>
                    </div>
                  )}

                  {activeApp === "wechat" && (
                    <WeChatApp
                      settings={settings}
                      activeBoyfriend={activeBoyfriend}
                      onSelectBoyfriend={setActiveBoyfriend}
                      onUnreadChange={setHasWeChatUnread}
                    />
                  )}

                  {activeApp === "xhs" && (
                    <RedBookApp settings={settings} />
                  )}

                  {activeApp === "notes" && (
                    <NotesApp settings={settings} />
                  )}

                  {activeApp === "shopping" && (
                    <ShoppingApp settings={settings} />
                  )}

                  {activeApp === "music" && (
                    <MusicApp settings={settings} />
                  )}

                  {activeApp === "peek" && (
                    <SnoopPhoneApp settings={settings} />
                  )}

                  {activeApp === "moetok" && <DouyinSFWApp settings={settings} />}
                </div>

                <div onClick={() => setActiveApp(null)} style={{ height: "24px", background: "#121218", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <div style={{ width: "120px", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.45)" }} />
                </div>
              </div>
            )}
          </>
        )}

        {toastMsg && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(0,0,0,0.85)", color: "#fff", padding: "10px 20px", borderRadius: "8px", fontSize: "13px", zIndex: 300, textAlign: "center" }}>
            {toastMsg}
          </div>
        )}
      </div>
    </main>
  );
}