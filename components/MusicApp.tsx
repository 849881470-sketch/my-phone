"use client";

import React, { useState, useEffect } from "react";
import { WorldSettings } from "./SettingsApp";
import { TavernCharacterCard } from "../types";

interface MusicAppProps {
  settings: WorldSettings;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  albumCover: string;
  comment: string;
}

export default function MusicApp({ settings }: MusicAppProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [selectedFriend, setSelectedFriend] = useState<TavernCharacterCard | null>(null);
  const [friends, setFriends] = useState<TavernCharacterCard[]>([]);
  const [shareModalSong, setShareModalSong] = useState<Song | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 默认初始精选歌单
    const defaultSongs: Song[] = [
      {
        id: "s_init_1",
        title: "晴天",
        artist: "周杰伦",
        albumCover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600",
        comment: "故事的小黄花，从出生那年就飘着..."
      },
      {
        id: "s_init_2",
        title: "Starlight",
        artist: "Taylor Swift",
        albumCover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600",
        comment: "It was the best night, sparkling like a starlight."
      },
      {
        id: "s_init_3",
        title: "落日与晚风",
        artist: "独立音乐人",
        albumCover: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=600",
        comment: "晚风踩着云，月亮溺入海，而我想你..."
      }
    ];

    const savedSongs = localStorage.getItem("phone_netease_songs_v11");
    if (savedSongs) {
      try {
        const parsed = JSON.parse(savedSongs);
        setSongs(parsed);
        if (parsed.length > 0) setCurrentSong(parsed[0]);
      } catch {
        setSongs(defaultSongs);
        setCurrentSong(defaultSongs[0]);
      }
    } else {
      setSongs(defaultSongs);
      setCurrentSong(defaultSongs[0]);
      localStorage.setItem("phone_netease_songs_v11", JSON.stringify(defaultSongs));
    }

    const savedChars = localStorage.getItem("my_tavern_chars");
    const savedFriends = localStorage.getItem("phone_wechat_friends");
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

  const saveSongs = (list: Song[]) => {
    setSongs(list);
    localStorage.setItem("phone_netease_songs_v11", JSON.stringify(list));
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  const togglePlay = (song?: Song) => {
    if (song && currentSong?.id !== song.id) {
      setCurrentSong(song);
      setIsPlaying(true);
      showToast(`正在播放: 《${song.title}》 - ${song.artist}`);
      return;
    }
    setIsPlaying(!isPlaying);
  };

  // 核心：调用 AI 真正动态全网搜罗新歌
  const fetchNeteaseSongs = async (keywordQuery: string) => {
    if (isGenerating) return;

    const confirmed = window.confirm(`🎵 【网易云音乐提示】即将连结世界书与 AI 引擎为您深度搜索“${keywordQuery || "全网精选推荐"}”，这将会消耗一次 API 请求。是否继续？`);
    if (!confirmed) return;

    setIsGenerating(true);
    showToast("🎵 网易云音乐AI买手正在全网为您搜罗最新灵感歌曲...");

    try {
      let baseUrl = settings.apiBaseUrl.trim().replace(/\/+$/, "");
      if (!baseUrl.endsWith("/v1")) baseUrl = `${baseUrl}/v1`;

      const prompt = `
你现在是网易云音乐的AI高级曲库与歌单推荐引擎。
【全局世界观设定】
${settings.worldView}
【用户当前搜索关键词/偏好】：“${keywordQuery || "浪漫情歌、治愈独立音乐、深夜电台"}”

请根据上述设定，发挥创造力，自由生成 4 到 6 首极其符合该风格、真实或富有情调的精选歌曲（不要每次都只返回周杰伦，要根据关键词随心所欲变化）。
【极其重要的约束】：
1. 专辑封面必须使用高质量、美观的 Unsplash 摄影图片直链（例如音乐现场、黑胶唱片、唯美风景、浪漫天空等符合意境的 URL）。
2. 每首歌必须配有一条走心的网易云神仙热评。
3. 必须严格输出为标准的 JSON 数组格式，不要包含任何 markdown 标签（如\`\`\`json）或前后缀，格式如下：
[
  {
    "title": "歌曲名",
    "artist": "歌手名",
    "albumCover": "https://images.unsplash.com/photo-...",
    "comment": "走心的网易云热评"
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
          temperature: 0.9,
          max_tokens: 1200,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.choices?.[0]?.message?.content?.trim() || "[]";
        const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsedArray = JSON.parse(cleanJson);

        const newSongs: Song[] = parsedArray.map((item: any, idx: number) => ({
          id: `song_${Date.now()}_${idx}`,
          title: item.title || "未知好歌",
          artist: item.artist || "未知音乐人",
          albumCover: item.albumCover || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600",
          comment: item.comment || "这首歌真的很好听。",
        }));

        saveSongs(newSongs);
        if (newSongs.length > 0) {
          setCurrentSong(newSongs[0]);
          setIsPlaying(true);
        }
        showToast("✨ 搜歌完毕，全新歌单已为您奉上！");
      } else {
        throw new Error("API 请求失败");
      }
    } catch (err) {
      showToast("⚠️ 搜歌失败，请检查 API Key 或网络设置。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareToWeChat = (song: Song) => {
    if (!selectedFriend) {
      alert("请先在微信中添加至少一个好友，才能进行分享哦！");
      return;
    }
    setShareModalSong(song);
  };

  const confirmShare = () => {
    if (!shareModalSong || !selectedFriend) return;

    const chatKey = `phone_wechat_messages`;
    const savedMsgs = localStorage.getItem(chatKey);
    let msgMap: Record<string, any[]> = savedMsgs ? JSON.parse(savedMsgs) : {};

    const targetMsgs = msgMap[selectedFriend.id] || [];
    const nowTime = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

    const musicCardMsg = {
      id: `msg_${Date.now()}_music`,
      sender: "user",
      content: `[网易云音乐分享] 《${shareModalSong.title}》 - ${shareModalSong.artist}`,
      time: nowTime,
      msgType: "music",
      musicData: shareModalSong,
    };

    msgMap[selectedFriend.id] = [...targetMsgs, musicCardMsg];
    localStorage.setItem(chatKey, JSON.stringify(msgMap));

    setShareModalSong(null);
    showToast(`已成功将音乐分享给 ${selectedFriend.name}！快去微信找他聊天吧~`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161823", color: "#fff", position: "relative" }}>
      
      {/* 网易云红色顶部搜索栏与动态刷新按钮 */}
      <div style={{ background: "#d32f2f", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.2)", borderRadius: "16px", padding: "6px 14px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="输入任何想听的风格/歌名 (回车全网搜歌)..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchNeteaseSongs(searchKeyword)}
            style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px", width: "100%", color: "#fff" }}
          />
        </div>
        <button
          onClick={() => fetchNeteaseSongs(searchKeyword)}
          disabled={isGenerating}
          style={{ background: "#fff", color: "#d32f2f", border: "none", padding: "6px 12px", borderRadius: "14px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          {isGenerating ? "搜歌中..." : "🔄 刷新"}
        </button>
      </div>

      {/* 提示栏 */}
      <div style={{ background: "#1f2233", padding: "8px 16px", fontSize: "11px", color: "#9ca3af", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <span>🎧 提示：点击右上角刷新或搜索任意词，AI 都会为你实时生成全新歌单！</span>
      </div>

      {/* 动态歌曲列表 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {songs.map((song) => {
          const isThisPlaying = currentSong?.id === song.id && isPlaying;
          return (
            <div
              key={song.id}
              onClick={() => togglePlay(song)}
              style={{ background: "#1f2233", borderRadius: "12px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", border: currentSong?.id === song.id ? "1px solid #d32f2f" : "1px solid transparent" }}
            >
              <div style={{ position: "relative" }}>
                <img src={song.albumCover} alt={song.title} style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                  {isThisPlaying ? "⏸️" : "▶️"}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</div>
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>{song.artist}</div>
                <div style={{ fontSize: "10px", color: "#cbd5e1", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: 0.8 }}>💬 “{song.comment}”</div>
              </div>
              {/* 伪装分享按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareToWeChat(song);
                }}
                style={{ background: "#d32f2f", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "14px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(211,47,47,0.4)" }}
              >
                分享 ↗
              </button>
            </div>
          );
        })}
      </div>

      {/* 底部当前播放栏控制条 */}
      {currentSong && (
        <div style={{ background: "#181a26", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "10px 16px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <img src={currentSong.albumCover} alt="playing" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", animation: isPlaying ? "spin 10s linear infinite" : "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentSong.title} - {currentSong.artist}</div>
            <div style={{ fontSize: "10px", color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{isPlaying ? "🎵 正在同步听歌中..." : "⏸️ 已暂停"}</div>
          </div>
          <button
            onClick={() => togglePlay()}
            style={{ background: "#d32f2f", color: "#fff", border: "none", width: "36px", height: "36px", borderRadius: "50%", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {isPlaying ? "⏸️" : "▶️"}
          </button>
        </div>
      )}

      {/* 分享弹窗 */}
      {shareModalSong && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#1f2233", width: "100%", maxWidth: "300px", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", color: "#fff" }}>
            <div style={{ fontSize: "16px", fontWeight: "bold", textAlign: "center" }}>分享音乐到微信</div>
            <div style={{ fontSize: "12px", color: "#cbd5e1", background: "#12121c", padding: "8px", borderRadius: "8px" }}>
              已选择：<strong>《{shareModalSong.title}》 - {shareModalSong.artist}</strong>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#9ca3af", display: "block", marginBottom: "6px" }}>选择接收的微信好友：</label>
              {friends.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#ef4444" }}>你还没有在微信添加任何好友！</div>
              ) : (
                <select
                  value={selectedFriend?.id || ""}
                  onChange={(e) => {
                    const f = friends.find((x) => x.id === e.target.value);
                    if (f) setSelectedFriend(f);
                  }}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #444", fontSize: "13px", background: "#12121c", color: "#fff" }}
                >
                  {friends.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ fontSize: "11px", color: "#f87171", lineHeight: "1.4" }}>
              💡 提示：分享后不会立刻回复。你可以随时去微信发一句话（如“这首歌好好听”），他就会连同音乐一起看到并回复你！
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button onClick={() => setShareModalSong(null)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #555", background: "#2a2d3e", cursor: "pointer", fontSize: "13px", color: "#fff" }}>取消</button>
              <button onClick={confirmShare} disabled={friends.length === 0} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: "#d32f2f", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>确认发送</button>
            </div>
          </div>
        </div>
      )}

      {/* 轻提示 Toast */}
      {toastMsg && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(0,0,0,0.85)", color: "#fff", padding: "10px 20px", borderRadius: "8px", fontSize: "13px", zIndex: 200, textAlign: "center" }}>
          {toastMsg}
        </div>
      )}

    </div>
  );
}