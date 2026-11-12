"use client";

import React, { useState, useEffect } from "react";
import { WorldSettings } from "./SettingsApp";
import { TavernCharacterCard } from "../types";

interface ShoppingAppProps {
  settings: WorldSettings;
}

interface Commodity {
  id: string;
  title: string;
  price: string;
  sales: string;
  image: string;
  shop: string;
}

export default function ShoppingApp({ settings }: ShoppingAppProps) {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [selectedFriend, setSelectedFriend] = useState<TavernCharacterCard | null>(null);
  const [friends, setFriends] = useState<TavernCharacterCard[]>([]);
  const [shareModalItem, setShareModalItem] = useState<Commodity | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 加载本地缓存的淘宝商品
    const savedComms = localStorage.getItem("phone_taobao_commodities");
    if (savedComms) {
      try {
        setCommodities(JSON.parse(savedComms));
      } catch {}
    } else {
      // 默认一组超高颜值、质感拉满的精选初始商品
      const defaultComms: Commodity[] = [
        {
          id: "c_1",
          title: "法式复古中古风高级感香薰蜡烛 卧室持久留香伴手礼",
          price: "88.00",
          sales: "已售 4.5w+件",
          image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600",
          shop: "Noir Atelier 独立香氛",
        },
        {
          id: "c_2",
          title: "日系软糯慵懒风宽松情侣针织开衫 外套秋冬加厚毛衣",
          price: "238.00",
          sales: "已售 8910件",
          image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600",
          shop: "Mignon Studio 原创",
        },
        {
          id: "c_3",
          title: "手工陶瓷粗陶不规则马克杯 高颜值情侣咖啡杯对杯",
          price: "59.00",
          sales: "已售 1.8w+件",
          image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600",
          shop: "荒野陶器研究所",
        },
        {
          id: "c_4",
          title: "极简主义北欧风落地台灯 客厅卧室氛围感设计感灯具",
          price: "329.00",
          sales: "已售 3200件",
          image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600",
          shop: "Lumina Home 美学空间",
        },
      ];
      setCommodities(defaultComms);
      localStorage.setItem("phone_taobao_commodities", JSON.stringify(defaultComms));
    }

    // 获取微信好友
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

  const saveCommodities = (list: Commodity[]) => {
    setCommodities(list);
    localStorage.setItem("phone_taobao_commodities", JSON.stringify(list));
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  // 核心：调用真实 AI 模拟淘宝搜索与上新
  const fetchTaobaoCommodities = async (keywordQuery: string) => {
    if (isGenerating) return;

    // 弹窗温馨提示将调用一次 API
    const confirmed = window.confirm(`💡 【淘宝提示】即将为您连结世界书与 AI 引擎搜索“${keywordQuery || "全网精选好物"}”，这将会消耗一次 API 请求。是否继续？`);
    if (!confirmed) return;

    setIsGenerating(true);
    showToast("🛍️ 淘宝正在为您全网搜罗高颜值好物...");

    try {
      let baseUrl = settings.apiBaseUrl.trim().replace(/\/+$/, "");
      if (!baseUrl.endsWith("/v1")) baseUrl = `${baseUrl}/v1`;

      const prompt = `
你现在是淘宝的AI高级买手与商品搜索引擎。
【全局世界观设定】
${settings.worldView}
【用户当前搜索关键词】：“${keywordQuery || "高颜值生活美学、情侣好物、精致礼物"}”

请根据上述设定，生成 4 到 6 个极具淘宝真实风格、图片必须极其高颜值且符合该搜索词的高级商品。
【极其重要的约束】：
1. 图片必须使用高质量、美观的 Unsplash 图片直链（例如家居、服装、数码、香薰、美食等符合商品主题的精美实拍图 URL）。
2. 价格要真实合理，销量要符合淘宝爆款习惯（如 "已售 1.5w+件"）。
3. 必须严格输出为标准 JSON 数组格式，不要包含任何 markdown 或前后缀，格式如下：
[
  {
    "title": "商品完整标题，要带淘宝爆款文案与emoji",
    "price": "128.00",
    "sales": "已售 5200件",
    "image": "https://images.unsplash.com/photo-...",
    "shop": "淘宝金牌店铺名称"
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

        const newItems: Commodity[] = parsedArray.map((item: any, idx: number) => ({
          id: `tb_${Date.now()}_${idx}`,
          title: item.title || "精致好物",
          price: item.price || "99.00",
          sales: item.sales || "已售 1000+件",
          image: item.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
          shop: item.shop || "淘宝严选美学店",
        }));

        saveCommodities(newItems);
        showToast("✨ 搜罗完毕，为您呈上最新高颜值好物！");
      } else {
        throw new Error("API 请求失败");
      }
    } catch (err) {
      showToast("⚠️ 搜索失败，请检查 API Key 或网络设置。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareToWeChat = (item: Commodity) => {
    if (!selectedFriend) {
      alert("请先在微信中添加至少一个好友，才能进行分享哦！");
      return;
    }
    setShareModalItem(item);
  };

  const confirmShare = () => {
    if (!shareModalItem || !selectedFriend) return;

    const chatKey = `phone_wechat_messages`;
    const savedMsgs = localStorage.getItem(chatKey);
    let msgMap: Record<string, any[]> = savedMsgs ? JSON.parse(savedMsgs) : {};
    
    const targetMsgs = msgMap[selectedFriend.id] || [];
    const nowTime = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

    const commodityCardMsg = {
      id: `msg_${Date.now()}_commodity`,
      sender: "user",
      content: `[淘宝商品分享] ${shareModalItem.title} (¥${shareModalItem.price})`,
      time: nowTime,
      msgType: "commodity",
      commodityData: shareModalItem,
    };

    msgMap[selectedFriend.id] = [...targetMsgs, commodityCardMsg];
    localStorage.setItem(chatKey, JSON.stringify(msgMap));

    setShareModalItem(null);
    showToast(`已成功分享给 ${selectedFriend.name}！快去微信找他聊天吧~`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f6f6f6", color: "#333", position: "relative" }}>
      
      {/* 淘宝顶部搜索栏与刷新按钮 */}
      <div style={{ background: "linear-gradient(135deg, #ff5000 0%, #ff7300 100%)", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: "16px", padding: "6px 14px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="搜索 淘宝/世界好物..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchTaobaoCommodities(searchKeyword)}
            style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px", width: "100%", color: "#333" }}
          />
        </div>
        <button
          onClick={() => fetchTaobaoCommodities(searchKeyword)}
          disabled={isGenerating}
          style={{ background: "#fff", color: "#ff5000", border: "none", padding: "6px 12px", borderRadius: "14px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}
        >
          {isGenerating ? "搜索中..." : "🔄 刷新"}
        </button>
      </div>

      {/* 商品瀑布流列表 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {commodities.map((item) => (
          <div key={item.id} style={{ background: "#fff", borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <img src={item.image} alt={item.title} style={{ width: "100%", height: "150px", objectFit: "cover" }} />
            <div style={{ padding: "8px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "13px", color: "#111", lineHeight: "1.3", height: "32px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "10px", color: "#999", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.shop}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#ff5000" }}>¥</span>
                  <span style={{ fontSize: "15px", fontWeight: "bold", color: "#ff5000" }}>{item.price}</span>
                  <span style={{ fontSize: "9px", color: "#999", marginLeft: "4px" }}>{item.sales}</span>
                </div>
                <button
                  onClick={() => handleShareToWeChat(item)}
                  style={{ background: "#ff5000", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "600", cursor: "pointer" }}
                >
                  分享
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分享选择弹窗 */}
      {shareModalItem && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "300px", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: "16px", fontWeight: "bold", textAlign: "center" }}>分享淘宝商品到微信</div>
            <div style={{ fontSize: "12px", color: "#666", background: "#f9f9f9", padding: "8px", borderRadius: "8px" }}>
              已选择商品：<strong>{shareModalItem.title}</strong>
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
            <div style={{ fontSize: "11px", color: "#ff5000", lineHeight: "1.4" }}>
              💡 提示：分享后不会立刻回复。你可以随时去微信发一句话（如“这个好看吗”），他就会连同商品一起看到并回复你！
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button onClick={() => setShareModalItem(null)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer", fontSize: "13px" }}>取消</button>
              <button onClick={confirmShare} disabled={friends.length === 0} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: "#ff5000", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>确认发送</button>
            </div>
          </div>
        </div>
      )}

      {/* 轻提示 Toast */}
      {toastMsg && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(0,0,0,0.8)", color: "#fff", padding: "10px 20px", borderRadius: "8px", fontSize: "13px", zIndex: 200, textAlign: "center" }}>
          {toastMsg}
        </div>
      )}

    </div>
  );
}