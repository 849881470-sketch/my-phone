"use client";

import React, { useState, useEffect, useRef } from "react";
import { TavernCharacterCard } from "../types";
import { importTavernCard, exportTavernCardJson } from "../lib/tavern-parser";

interface CharacterManagerProps {
  onSelectCharacter?: (char: TavernCharacterCard) => void;
}

export default function CharacterManager({ onSelectCharacter }: CharacterManagerProps) {
  const [characters, setCharacters] = useState<TavernCharacterCard[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterFavorite, setFilterFavorite] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [selectedDetail, setSelectedDetail] = useState<TavernCharacterCard | null>(null);

  // ✏️ 角色人设全量编辑弹窗状态
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editDraft, setEditDraft] = useState<TavernCharacterCard | null>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);

  // 🎙️ 专属声音配置弹窗状态
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [draftVoiceId, setDraftVoiceId] = useState<string>("");
  const [draftVoiceStyle, setDraftVoiceStyle] = useState<string>("deep");
  const [fetchedVoices, setFetchedVoices] = useState<{ id: string; name: string }[]>([]);
  const [isFetchingVoices, setIsFetchingVoices] = useState<boolean>(false);
  const [testVoiceText, setTestVoiceText] = useState<string>("这么晚还没睡，是在等我的语音消息吗？");
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2400);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("my_tavern_chars");
    if (saved) {
      try {
        setCharacters(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

const saveToLocalStorage = (newChars: TavernCharacterCard[]) => {
    setCharacters(newChars);
    try {
      localStorage.setItem("my_tavern_chars", JSON.stringify(newChars));
    } catch (e: any) {
      console.error(e);
      if (e.name === "QuotaExceededError" || e.code === 22) {
        showToast("❌ 内存爆满！头像图片太大，请改用图片链接(URL)");
        alert("【存储空间超出限制】\n\n原因：你上传的本地头像图片体积太大（Base64 超出浏览器 5MB 限制）。\n\n建议：请改用短的图片链接(URL)作为头像，或者清理一下浏览器缓存。");
      } else {
        showToast("⚠️ 保存到本地存储失败");
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const updatedList = [...characters];
      for (let i = 0; i < files.length; i++) {
        const card = await importTavernCard(files[i]);
        updatedList.unshift(card);
      }
      saveToLocalStorage(updatedList);
      showToast("✅ 角色卡导入成功！");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "角色卡导入失败，请检查文件格式";
      setErrorMsg(message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = characters.map((c) =>
      c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
    );
    saveToLocalStorage(updated);
    if (selectedDetail?.id === id) {
      setSelectedDetail({ ...selectedDetail, isFavorite: !selectedDetail.isFavorite });
    }
  };

  const deleteCharacter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("确定要从你的手机里删除这张角色卡吗？")) {
      const updated = characters.filter((c) => c.id !== id);
      saveToLocalStorage(updated);
      if (selectedDetail?.id === id) setSelectedDetail(null);
    }
  };

  // 打开角色人设编辑弹窗（支持新建或修改现有卡片）
  const openEditModal = (char?: TavernCharacterCard) => {
    if (char) {
      setEditDraft({ ...char });
    } else {
      setEditDraft({
        id: `char_${Date.now()}`,
        name: "新男友",
        avatar: "",
        tags: ["自定义"],
        description: "",
        personality: "",
        scenario: "",
        first_mes: "你好，刚加上微信，请多关照。",
        mes_example: "",
        voiceId: "",
        voiceStyle: "deep",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    setShowEditModal(true);
  };

  // 本地图片转 Base64 持久化保存，防止刷新失效
  const handleEditAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editDraft) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setEditDraft({ ...editDraft, avatar: reader.result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

// 保存编辑后的角色卡
  const handleSaveEditCard = () => {
    if (!editDraft) return;
    if (!editDraft.name.trim()) {
      showToast("⚠️ 角色名字不能为空");
      return;
    }

    const finalizedCard: TavernCharacterCard = {
      ...editDraft,
      name: editDraft.name.trim(),
      updatedAt: Date.now(),
    };

    // 1. 更新本地列表状态
    const exists = characters.some((c) => c.id === finalizedCard.id);
    const updatedList = exists
      ? characters.map((c) => (c.id === finalizedCard.id ? finalizedCard : c))
      : [finalizedCard, ...characters];

    // 2. 写入 localStorage 持久化
    saveToLocalStorage(updatedList);

    // 3. 实时同步更新当前选中的详情页，防止界面卡在旧数据
    setSelectedDetail(finalizedCard);

    // 4. 关闭弹窗并清空草稿
    setShowEditModal(false);
    setEditDraft(null);
    showToast(`✅ 已成功保存【${finalizedCard.name}】的修改！`);
  };

  // 打开专属声音配置窗口
  const openVoiceConfig = (char: TavernCharacterCard) => {
    setDraftVoiceId(char.voiceId || "");
    setDraftVoiceStyle(char.voiceStyle || "deep");
    setFetchedVoices([]);
    setShowVoiceModal(true);
  };

  // 保存专属声音配置到当前角色卡
  const handleSaveVoiceConfig = () => {
    if (!selectedDetail) return;
    const updatedCard: TavernCharacterCard = {
      ...selectedDetail,
      voiceId: draftVoiceId.trim(),
      voiceStyle: draftVoiceStyle,
      updatedAt: Date.now(),
    };
    const updatedList = characters.map((c) => (c.id === updatedCard.id ? updatedCard : c));
    saveToLocalStorage(updatedList);
    setSelectedDetail(updatedCard);
    setShowVoiceModal(false);
    showToast(`✅ 已保存【${updatedCard.name}】的专属声线！`);
  };

  // 🔄 一键拉取用户在设定中心配置的 TTS 语音库列表
  const handleFetchVoiceLibrary = async () => {
    const settingsStr = localStorage.getItem("my_phone_world_settings");
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    const ttsUrl = settings.ttsApiBaseUrl?.trim().replace(/\/+$/, "");
    const ttsKey = settings.ttsApiKey?.trim();

    if (!ttsUrl || !ttsKey) {
      showToast("⚠️ 请先在【API与心跳】填写 TTS 副 API 地址和 Key");
      return;
    }

    setIsFetchingVoices(true);
    try {
      const isEleven = ttsUrl.includes("elevenlabs");
      const endpoint = isEleven
        ? `${ttsUrl.endsWith("/v1") ? ttsUrl : ttsUrl + "/v1"}/voices`
        : `${ttsUrl.endsWith("/v1") ? ttsUrl : ttsUrl + "/v1"}/model?self=true`;

      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${ttsKey}`,
          "xi-api-key": ttsKey,
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rawList = data.voices || data.items || data.data || [];
      const mapped = rawList
        .map((v: any) => ({
          id: v.voice_id || v._id || v.id,
          name: v.name || v.title || v.voice_id || v._id,
        }))
        .filter((v: any) => v.id);

      if (mapped.length > 0) {
        setFetchedVoices(mapped);
        showToast(`✅ 成功拉取 ${mapped.length} 个音色`);
      } else {
        showToast("⚠️ 语音库为空，请直接手动粘贴 Voice ID");
      }
    } catch {
      showToast("⚠️ 无法自动拉取列表，请直接粘贴你的音色 ID");
    } finally {
      setIsFetchingVoices(false);
    }
  };

  // 🎧 试听当前调配的声音效果
  const handleTestVoice = async () => {
    const settingsStr = localStorage.getItem("my_phone_world_settings");
    const settings = settingsStr ? JSON.parse(settingsStr) : {};

    setIsTestingVoice(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: testVoiceText,
          voiceId: draftVoiceId.trim(),
          voiceStyle: draftVoiceStyle,
          ttsApiBaseUrl: settings.ttsApiBaseUrl,
          ttsApiKey: settings.ttsApiKey,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => setIsTestingVoice(false);
        audio.onerror = () => setIsTestingVoice(false);
        await audio.play();
        return;
      }
      throw new Error("TTS 代理异常");
    } catch {
      showToast("⚠️ 副 API 试听未响应，已使用浏览器兜底试听");
      const u = new SpeechSynthesisUtterance(testVoiceText);
      u.lang = "zh-CN";
      u.pitch = draftVoiceStyle === "deep" ? 0.6 : 0.95;
      u.onend = () => setIsTestingVoice(false);
      window.speechSynthesis.speak(u);
    }
  };

  const filteredChars = characters.filter((c) => {
    if (filterFavorite && !c.isFavorite) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ✏️ 全量编辑角色卡弹窗（新建 & 修改通用）
  const renderEditModal = () => {
    if (!showEditModal || !editDraft) return null;
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", zIndex: 190, display: "flex", alignItems: "center", justifyContent: "center", padding: "14px" }}>
        <div style={{ background: "#181824", border: "1px solid rgba(99,102,241,0.5)", borderRadius: "18px", padding: "16px", width: "100%", maxWidth: "360px", maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px" }}>
            <span style={{ fontSize: "15px", fontWeight: "bold", color: "#a5b4fc" }}>
              ✏️ 编辑角色卡档案
            </span>
            <button onClick={() => setShowEditModal(false)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "16px", cursor: "pointer" }}>
              ✕
            </button>
          </div>

          {/* 头像替换与名字 */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div
              onClick={() => editAvatarInputRef.current?.click()}
              style={{ width: "64px", height: "80px", borderRadius: "10px", background: "#252536", overflow: "hidden", position: "relative", cursor: "pointer", flexShrink: 0, border: "1px dashed #6366f1" }}
              title="点击更换本地头像"
            >
              {editDraft.avatar ? (
                <img src={editDraft.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#9ca3af", textAlign: "center", padding: "4px" }}>
                  点击传图
                </div>
              )}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.65)", fontSize: "9px", textAlign: "center", padding: "2px 0", color: "#fff" }}>
                换头像
              </div>
            </div>
            <input type="file" ref={editAvatarInputRef} accept="image/*" onChange={handleEditAvatarUpload} style={{ display: "none" }} />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "3px" }}>角色名字 *</label>
                <input
                  type="text"
                  value={editDraft.name}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  style={{ width: "100%", padding: "7px 9px", borderRadius: "8px", background: "#222232", border: "1px solid #3f3f5a", color: "#fff", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "3px" }}>头像图片链接 (可选)</label>
                <input
                  type="text"
                  placeholder="粘贴图片 URL 或点左侧上传"
                  value={editDraft.avatar}
                  onChange={(e) => setEditDraft({ ...editDraft, avatar: e.target.value })}
                  style={{ width: "100%", padding: "6px 9px", borderRadius: "8px", background: "#222232", border: "1px solid #3f3f5a", color: "#fff", fontSize: "11px", boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>

          {/* 性格摘要 */}
          <div>
            <label style={{ fontSize: "11px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>性格标签 / 摘要 (Personality)</label>
            <input
              type="text"
              placeholder="例如：表面高冷禁欲，私下粘人爱吃醋"
              value={editDraft.personality || ""}
              onChange={(e) => setEditDraft({ ...editDraft, personality: e.target.value })}
              style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#222232", border: "1px solid #3f3f5a", color: "#fff", fontSize: "12px", boxSizing: "border-box" }}
            />
          </div>

          {/* 场景背景 */}
          <div>
            <label style={{ fontSize: "11px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>关系与场景背景 (Scenario)</label>
            <input
              type="text"
              placeholder="例如：同居男友 / 刚在盲盒里认识的邻居"
              value={editDraft.scenario || ""}
              onChange={(e) => setEditDraft({ ...editDraft, scenario: e.target.value })}
              style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#222232", border: "1px solid #3f3f5a", color: "#fff", fontSize: "12px", boxSizing: "border-box" }}
            />
          </div>

          {/* 核心人设描述 */}
          <div>
            <label style={{ fontSize: "11px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>核心人设与外貌设定 (Description)</label>
            <textarea
              rows={5}
              placeholder="详细描述他的外貌、职业、对你的态度、说话习惯..."
              value={editDraft.description || ""}
              onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
              style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#222232", border: "1px solid #3f3f5a", color: "#fff", fontSize: "12px", lineHeight: "1.5", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          {/* 第一条开场白 */}
          <div>
            <label style={{ fontSize: "11px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>微信开场白 (First Message)</label>
            <textarea
              rows={3}
              placeholder="加上好友或开聊时的第一句话..."
              value={editDraft.first_mes || ""}
              onChange={(e) => setEditDraft({ ...editDraft, first_mes: e.target.value })}
              style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#222232", border: "1px solid #3f3f5a", color: "#fff", fontSize: "12px", lineHeight: "1.5", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          {/* 对话示例 */}
          <div>
            <label style={{ fontSize: "11px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>说话语气示例 (Example Dialogue，可选)</label>
            <textarea
              rows={2}
              placeholder="写几句他的典型口头禅，帮助 AI 模仿语气..."
              value={editDraft.mes_example || ""}
              onChange={(e) => setEditDraft({ ...editDraft, mes_example: e.target.value })}
              style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#222232", border: "1px solid #3f3f5a", color: "#fff", fontSize: "12px", lineHeight: "1.5", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button
              onClick={() => setShowEditModal(false)}
              style={{ flex: 1, background: "#262638", border: "none", color: "#94a3b8", padding: "10px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}
            >
              取消
            </button>
            <button
              onClick={handleSaveEditCard}
              style={{ flex: 1, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", color: "#fff", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
            >
              💾 保存修改
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (selectedDetail) {
    return (
      <div style={{ padding: "16px", color: "#fff", height: "100%", overflowY: "auto", background: "#14141c", position: "relative" }}>
        {toastMsg && (
          <div style={{ position: "fixed", top: "64px", left: "50%", transform: "translateX(-50%)", background: "rgba(16,185,129,0.95)", color: "#fff", padding: "6px 14px", borderRadius: "999px", fontSize: "12px", zIndex: 200, whiteSpace: "nowrap" }}>
            {toastMsg}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "6px", flexWrap: "wrap" }}>
          <button
            onClick={() => setSelectedDetail(null)}
            style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}
          >
            ← 返回
          </button>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              onClick={() => openEditModal(selectedDetail)}
              style={{ background: "#4f46e5", border: "none", color: "#fff", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
            >
              ✏️ 编辑人设
            </button>
            <button
              onClick={() => openVoiceConfig(selectedDetail)}
              style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)", border: "none", color: "#fff", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
            >
              🎙️ 专属声音
            </button>
            <button
              onClick={() => exportTavernCardJson(selectedDetail)}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "6px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}
            >
              导出
            </button>
            {onSelectCharacter && (
              <button
                onClick={() => onSelectCharacter(selectedDetail)}
                style={{ background: "#10b981", border: "none", color: "#fff", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
              >
                💬 聊天
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "14px", marginBottom: "16px", alignItems: "center" }}>
          <img
            src={selectedDetail.avatar || "/placeholder-avatar.png"}
            alt={selectedDetail.name}
            style={{ width: "72px", height: "96px", objectFit: "cover", borderRadius: "10px", background: "#222" }}
          />
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 6px 0" }}>{selectedDetail.name}</h2>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "6px" }}>
              约 {Math.round(((selectedDetail.description?.length || 0) + (selectedDetail.first_mes?.length || 0)) * 0.75)} Tokens
            </div>
            <div
              onClick={() => openVoiceConfig(selectedDetail)}
              style={{ display: "inline-block", background: "rgba(236,72,153,0.18)", border: "1px solid rgba(236,72,153,0.45)", color: "#fbcfe8", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
            >
              🎙️ {selectedDetail.voiceId ? `已绑定专属音色 (${selectedDetail.voiceId.slice(0, 10)}...)` : `默认声线：${selectedDetail.voiceStyle || "deep"}（点击调配）`}
            </div>
          </div>
        </div>

        {selectedDetail.personality && (
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "12px", color: "#a5b4fc", fontWeight: "bold", marginBottom: "6px" }}>性格摘要 (Personality)</div>
            <div style={{ background: "rgba(0,0,0,0.35)", padding: "10px", borderRadius: "8px", fontSize: "13px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
              {selectedDetail.personality}
            </div>
          </div>
        )}

        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "12px", color: "#a5b4fc", fontWeight: "bold", marginBottom: "6px" }}>角色描述 (Description)</div>
          <div style={{ background: "rgba(0,0,0,0.35)", padding: "10px", borderRadius: "8px", fontSize: "13px", lineHeight: "1.6", whiteSpace: "pre-wrap", maxHeight: "200px", overflowY: "auto" }}>
            {selectedDetail.description || "暂无描述"}
          </div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "12px", color: "#a5b4fc", fontWeight: "bold", marginBottom: "6px" }}>开场白 (First Message)</div>
          <div style={{ background: "rgba(0,0,0,0.35)", padding: "10px", borderRadius: "8px", fontSize: "13px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
            {selectedDetail.first_mes || "暂无开场白"}
          </div>
        </div>

        {/* 🎙️ 角色专属语音调配独立窗口 */}
        {showVoiceModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)", zIndex: 180, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div style={{ background: "#181824", border: "1px solid rgba(236,72,153,0.5)", borderRadius: "18px", padding: "18px", width: "100%", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "15px", fontWeight: "bold", color: "#f472b6" }}>
                  🎙️ {selectedDetail.name} · 专属语音库
                </span>
                <button onClick={() => setShowVoiceModal(false)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "16px", cursor: "pointer" }}>
                  ✕
                </button>
              </div>

              <div style={{ fontSize: "11px", color: "#9ca3af", lineHeight: "1.4" }}>
                为当前角色卡单独指定声线（从 MoeTok 视频加来的角色会自动保留他自带的声线，也可在此重新调配）。
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>声线气质（基础兜底音色）</label>
                <select
                  value={draftVoiceStyle}
                  onChange={(e) => setDraftVoiceStyle(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#222232", border: "1px solid #3f3f5a", color: "#fff", fontSize: "12px" }}
                >
                  <option value="deep">低沉磁性 / 青年攻音 (Deep)</option>
                  <option value="youth">清冽少年 / 阳光干净 (Youth)</option>
                  <option value="cold">冷感禁欲 / 斯文败类 (Cold)</option>
                  <option value="sweet">温柔宠溺 / 软糯贴耳 (Sweet)</option>
                </select>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ fontSize: "11px", color: "#cbd5e1" }}>专属音色 ID (Voice ID / Model ID)</label>
                  <button
                    type="button"
                    onClick={handleFetchVoiceLibrary}
                    disabled={isFetchingVoices}
                    style={{ background: "rgba(99,102,241,0.25)", border: "1px solid rgba(99,102,241,0.5)", color: "#a5b4fc", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", cursor: "pointer" }}
                  >
                    {isFetchingVoices ? "拉取中..." : "🔄 拉取我的语音库"}
                  </button>
                </div>

                {fetchedVoices.length > 0 && (
                  <select
                    value={draftVoiceId}
                    onChange={(e) => setDraftVoiceId(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#222232", border: "1px solid #6366f1", color: "#fff", fontSize: "12px", marginBottom: "6px" }}
                  >
                    <option value="">-- 从拉取的声线库中选择 --</option>
                    {fetchedVoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.id.slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="text"
                  placeholder="粘贴 ElevenLabs / Fish Audio 音色 ID（留空则用上方默认气质）"
                  value={draftVoiceId}
                  onChange={(e) => setDraftVoiceId(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#222232", border: "1px solid #3f3f5a", color: "#fff", fontSize: "12px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ background: "#12121a", padding: "10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>🎧 试听当前调配效果</span>
                <input
                  type="text"
                  value={testVoiceText}
                  onChange={(e) => setTestVoiceText(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", background: "#1c1c28", border: "1px solid #333", color: "#fff", fontSize: "11px", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={handleTestVoice}
                  disabled={isTestingVoice}
                  style={{ background: isTestingVoice ? "#7c3aed" : "rgba(236,72,153,0.25)", border: "1px solid #ec4899", color: "#fff", padding: "6px", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
                >
                  {isTestingVoice ? "🔊 正在播放..." : "▶ 点击试听"}
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  onClick={() => setShowVoiceModal(false)}
                  style={{ flex: 1, background: "#262638", border: "none", color: "#94a3b8", padding: "9px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveVoiceConfig}
                  style={{ flex: 1, background: "linear-gradient(135deg, #ec4899, #8b5cf6)", border: "none", color: "#fff", padding: "9px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                >
                  保存配置
                </button>
              </div>
            </div>
          </div>
        )}

        {renderEditModal()}
      </div>
    );
  }

  return (
    <div style={{ padding: "14px", color: "#fff", height: "100%", overflowY: "auto", background: "rgba(18, 18, 24, 0.96)", position: "relative" }}>
      {toastMsg && (
        <div style={{ position: "fixed", top: "64px", left: "50%", transform: "translateX(-50%)", background: "rgba(16,185,129,0.95)", color: "#fff", padding: "6px 14px", borderRadius: "999px", fontSize: "12px", zIndex: 200, whiteSpace: "nowrap" }}>
          {toastMsg}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", gap: "8px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => openEditModal()}
            style={{ background: "rgba(99,102,241,0.22)", border: "1px solid #6366f1", color: "#c7d2fe", padding: "7px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
          >
            + 新建角色
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ background: "#6366f1", border: "none", color: "#fff", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
          >
            {loading ? "解析中..." : "+ 导入卡片"}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept=".png,.json"
            style={{ display: "none" }}
          />
          <button
            onClick={() => setFilterFavorite(!filterFavorite)}
            style={{ background: filterFavorite ? "#f59e0b" : "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}
          >
            ⭐
          </button>
        </div>

        <input
          type="text"
          placeholder="搜索角色..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "6px 10px", color: "#fff", fontSize: "12px", width: "100px" }}
        />
      </div>

      {errorMsg && <div style={{ color: "#f87171", fontSize: "12px", marginBottom: "10px" }}>⚠️ {errorMsg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
        {filteredChars.map((char) => (
          <div
            key={char.id}
            onClick={() => setSelectedDetail(char)}
            style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.12)",
              overflow: "hidden",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <div style={{ width: "100%", aspectRatio: "3/4", background: "#262630", position: "relative" }}>
              {char.avatar ? (
                <img src={char.avatar} alt={char.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280", fontSize: "22px", fontWeight: "bold" }}>?</div>
              )}

              <button
                onClick={(e) => toggleFavorite(char.id, e)}
                style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", fontSize: "10px", color: "#fbbf24" }}
              >
                {char.isFavorite ? "★" : "☆"}
              </button>

              <button
                onClick={(e) => deleteCharacter(char.id, e)}
                style={{ position: "absolute", top: "4px", left: "4px", background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", fontSize: "10px", color: "#ef4444" }}
              >
                ×
              </button>

              {char.voiceId && (
                <span style={{ position: "absolute", bottom: "4px", right: "4px", background: "rgba(236,72,153,0.85)", borderRadius: "4px", padding: "1px 4px", fontSize: "9px", color: "#fff" }}>
                  🎙️
                </span>
              )}
            </div>

            <div style={{ padding: "5px 4px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {char.name}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredChars.length === 0 && !loading && (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", marginTop: "60px", fontSize: "13px" }}>
          还没有角色卡哦~ 点击左上角【+ 新建角色】或【+ 导入卡片】把你的男友接回家！
        </div>
      )}

      {renderEditModal()}
    </div>
  );
}