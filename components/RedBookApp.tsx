"use client";

import React, { useState, useEffect } from "react";
import { TavernCharacterCard } from "../types";
import { WorldSettings } from "./SettingsApp";

interface RedBookAppProps {
  settings: WorldSettings;
}

interface RedBookComment {
  authorName: string;
  content: string;
}

interface RedBookPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  content: string;
  time: string;
  likes: number;
  collects: number;
  isLiked: boolean;
  isCollected: boolean;
  comments: RedBookComment[];
}

export default function RedBookApp({ settings }: RedBookAppProps) {
  const [currentTab, setCurrentTab] = useState<"recommend" | "following">("recommend");
  const [posts, setPosts] = useState<RedBookPost[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [myNickname, setMyNickname] = useState<string>(settings.userName || "我");

  // 分享弹窗状态
  const [sharePostModal, setSharePostModal] = useState<RedBookPost | null>(null);
  const [friends, setFriends] = useState<TavernCharacterCard[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<TavernCharacterCard | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedProfile = localStorage.getItem("phone_wechat_profile");
    if (savedProfile) {
      try {
        const p = JSON.parse(savedProfile);
        if (p.nickname) setMyNickname(p.nickname);
      } catch {}
    }

    const savedPosts = localStorage.getItem("phone_redbook_posts");
    if (savedPosts) {
      try {
        setPosts(JSON.parse(savedPosts));
      } catch {}
    }

    // 获取微信好友供分享
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

  const savePosts = (newPosts: RedBookPost[]) => {
    setPosts(newPosts);
    localStorage.setItem("phone_redbook_posts", JSON.stringify(newPosts));
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handleShareToWeChat = (post: RedBookPost) => {
    if (!selectedFriend) {
      alert("请先在微信中添加至少一个好友，才能进行分享哦！");
      return;
    }
    setSharePostModal(post);
  };

  const confirmSharePost = () => {
    if (!sharePostModal || !selectedFriend) return;

    const chatKey = `phone_wechat_messages`;
    const savedMsgs = localStorage.getItem(chatKey);
    let msgMap: Record<string, any[]> = savedMsgs ? JSON.parse(savedMsgs) : {};

    const targetMsgs = msgMap[selectedFriend.id] || [];
    const nowTime = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

    const redBookCardMsg = {
      id: `msg_${Date.now()}_xhs`,
      sender: "user",
      content: `[小红书笔记分享] @${sharePostModal.authorName}: ${sharePostModal.title} —— ${sharePostModal.content}`,
      time: nowTime,
      msgType: "redbook",
      redBookData: sharePostModal,
    };

    msgMap[selectedFriend.id] = [...targetMsgs, redBookCardMsg];
    localStorage.setItem(chatKey, JSON.stringify(msgMap));

    setSharePostModal(null);
    showToast(`已成功将小红书笔记分享给 ${selectedFriend.name}！`);
  };

  const handleRefreshPosts = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const savedChars = localStorage.getItem("my_tavern_chars");
      const savedFriends = localStorage.getItem("phone_wechat_friends");
      let allChars: TavernCharacterCard[] = savedChars ? JSON.parse(savedChars) : [];
      let friendIds: string[] = savedFriends ? JSON.parse(savedFriends) : [];
      const activeFriends = allChars.filter(c => friendIds.includes(c.id));

      const authorPool = activeFriends.length > 0 ? activeFriends : [
        { id: "default_1", name: "岁烬", description: "你的男友，成熟稳重。", avatar: "/placeholder-avatar.png" }
      ];

      let baseUrl = settings.apiBaseUrl.trim().replace(/\/+$/, "");
      if (!baseUrl.endsWith("/v1")) baseUrl = `${baseUrl}/v1`;

      const prompt = `
你现在是小红书的AI内容生成引擎。
【全局世界观设定】
${settings.worldView}

【可用作者候选名单（必须严格从以下微信好友/NPC中挑选发帖人）】
${JSON.stringify(authorPool.map(a => ({ name: a.name, desc: a.description })))}

请根据以上世界观与作者人设，一次性批量生成 **6 到 8 条** 格式各异、生动真实的小红书笔记。
【严格约束】
1. 每条笔记的作者名字必须从上述【微信好友候选名单】中挑选。
2. 每条笔记包含：标题（吸睛、带小红书风格emoji）、正文内容（简短生活日常、吐槽、探店、穿搭或秀恩爱）、错落有致的时间线（例如：“15分钟前”、“2小时前”、“昨天 21:30”、“3天前”等）、点赞数、收藏数。
3. 每条笔记必须包含 1-2 条其他微信好友对该笔记的真实评论/互动。
4. 请务必严格输出为标准 JSON 数组格式，不要包含任何 markdown 标签或前后缀，格式如下：
[
  {
    "authorName": "作者名字",
    "title": "笔记标题",
    "content": "笔记正文",
    "time": "3小时前",
    "likes": 520,
    "collects": 1314,
    "comments": [
      {"authorName": "评论者名字", "content": "评论内容"}
    ]
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
          max_tokens: 1500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.choices?.[0]?.message?.content?.trim() || "[]";
        const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsedArray = JSON.parse(cleanJson);

        const formattedPosts: RedBookPost[] = parsedArray.map((item: any, idx: number) => {
          const matchedAuthor = authorPool.find(a => a.name === item.authorName) || authorPool[0];
          return {
            id: `rb_${Date.now()}_${idx}`,
            authorName: matchedAuthor.name,
            authorAvatar: matchedAuthor.avatar || "/placeholder-avatar.png",
            title: item.title || "日常分享 ✨",
            content: item.content || "今天也是美好的一天~",
            time: item.time || "2小时前",
            likes: item.likes || Math.floor(Math.random() * 500) + 50,
            collects: item.collects || Math.floor(Math.random() * 200) + 10,
            isLiked: false,
            isCollected: false,
            comments: item.comments || [],
          };
        });

        savePosts(formattedPosts);
      }
    } catch (err) {
      console.error("生成小红书失败", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const followedNames = (() => {
    const savedChars = localStorage.getItem("my_tavern_chars");
    const savedFriends = localStorage.getItem("phone_wechat_friends");
    let allChars: TavernCharacterCard[] = savedChars ? JSON.parse(savedChars) : [];
    let friendIds: string[] = savedFriends ? JSON.parse(savedFriends) : [];
    return allChars.filter(c => friendIds.includes(c.id)).map(c => c.name);
  })();

  const displayedPosts = currentTab === "following" 
    ? posts.filter(p => followedNames.includes(p.authorName))
    : posts;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fcfcfc", color: "#333", position: "relative" }}>
      
      {/* 顶部导航栏 */}
      <div style={{ height: "48px", background: "#fff", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "16px", fontSize: "15px" }}>
          <span 
            onClick={() => setCurrentTab("following")} 
            style={{ fontWeight: currentTab === "following" ? "bold" : "normal", color: currentTab === "following" ? "#ff2442" : "#666", cursor: "pointer" }}
          >
            关注
          </span>
          <span 
            onClick={() => setCurrentTab("recommend")} 
            style={{ fontWeight: currentTab === "recommend" ? "bold" : "normal", color: currentTab === "recommend" ? "#ff2442" : "#666", cursor: "pointer" }}
          >
            推荐
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={handleRefreshPosts}
            disabled={isGenerating}
            style={{ background: "#ff2442", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
          >
            {isGenerating ? "生成中..." : "🔄 刷新动态"}
          </button>
        </div>
      </div>

      {/* 内容流瀑布屏 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {displayedPosts.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", marginTop: "100px", fontSize: "13px", padding: "0 20px" }}>
            {currentTab === "following" ? (
              "关注流暂无内容。快去点击右上角刷新，或者检查微信通讯录是否已添加好友吧！"
            ) : (
              <>
                暂无动态，点击右上角 <span style={{ color: "#ff2442", fontWeight: "bold" }}>🔄 刷新动态</span> 自动连结世界书与微信好友生成全网笔记！
              </>
            )}
          </div>
        ) : (
          displayedPosts.map((post) => (
            <div key={post.id} style={{ background: "#fff", borderRadius: "12px", padding: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {/* 作者信息栏 */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <img src={post.authorAvatar} alt={post.authorName} style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} />
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>{post.authorName}</span>
                <span style={{ marginLeft: "auto", fontSize: "10px", color: "#999" }}>{post.time}</span>
              </div>

              {/* 标题与正文 */}
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#111", marginBottom: "4px" }}>{post.title}</div>
              <div style={{ fontSize: "13px", color: "#444", lineHeight: "1.4", marginBottom: "10px" }}>{post.content}</div>

              {/* 底部点赞收藏与分享栏 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f7f7f7", paddingTop: "8px", fontSize: "12px", color: "#666" }}>
                <div style={{ display: "flex", gap: "16px" }}>
                  <span 
                    onClick={() => {
                      const updated = posts.map(p => {
                        if (p.id === post.id) {
                          const isLiked = !p.isLiked;
                          return { ...p, isLiked, likes: isLiked ? p.likes + 1 : p.likes - 1 };
                        }
                        return p;
                      });
                      savePosts(updated);
                    }}
                    style={{ cursor: "pointer", color: post.isLiked ? "#ff2442" : "#666" }}
                  >
                    ❤️ {post.likes}
                  </span>
                  <span 
                    onClick={() => {
                      const updated = posts.map(p => {
                        if (p.id === post.id) {
                          const isCollected = !p.isCollected;
                          return { ...p, isCollected, collects: isCollected ? p.collects + 1 : p.collects - 1 };
                        }
                        return p;
                      });
                      savePosts(updated);
                    }}
                    style={{ cursor: "pointer", color: post.isCollected ? "#f59e0b" : "#666" }}
                  >
                    ⭐ {post.collects}
                  </span>
                </div>
                <button
                  onClick={() => handleShareToWeChat(post)}
                  style={{ background: "#f0f0f0", color: "#333", border: "none", padding: "3px 8px", borderRadius: "10px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}
                >
                  ↗️ 发给微信好友
                </button>
              </div>

              {/* 好友NPC评论区 */}
              {post.comments && post.comments.length > 0 && (
                <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "8px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {post.comments.map((c, idx) => (
                    <div key={idx} style={{ fontSize: "11px", lineHeight: "1.3" }}>
                      <span style={{ fontWeight: "600", color: "#576b95" }}>{c.authorName}：</span>
                      <span style={{ color: "#333" }}>{c.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 分享弹窗 */}
      {sharePostModal && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "300px", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: "16px", fontWeight: "bold", textAlign: "center" }}>分享小红书笔记到微信</div>
            <div style={{ fontSize: "12px", color: "#666", background: "#f9f9f9", padding: "8px", borderRadius: "8px" }}>
              <strong>@{sharePostModal.authorName}</strong>: {sharePostModal.title}
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "6px" }}>选择接收的微信好友：</label>
              {friends.length === 0 ? (
                <div style={{ fontSize: "12px", color: "red" }}>你还没有在微信添加任何好友！</div>
              ) : (
                <select
                  value={selectedFriend?.id || ""}
                  onChange={(e) => {
                    const f = friends.find((x) => x.id === e.target.value);
                    if (f) setSelectedFriend(f);
                  }}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "13px" }}
                >
                  {friends.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ fontSize: "11px", color: "#ff2442", lineHeight: "1.4" }}>
              💡 提示：分享后不会立刻回复。你可以随时去微信发一句话（如“这个好有意思”），他就会连同笔记一起看到并回复你！
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button onClick={() => setSharePostModal(null)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer", fontSize: "13px" }}>取消</button>
              <button onClick={confirmSharePost} disabled={friends.length === 0} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: "#ff2442", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>确认发送</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(0,0,0,0.8)", color: "#fff", padding: "10px 20px", borderRadius: "8px", fontSize: "13px", zIndex: 200, textAlign: "center" }}>
          {toastMsg}
        </div>
      )}

    </div>
  );
}