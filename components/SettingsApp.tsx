"use client";

import React, { useState, useEffect, useRef } from "react";
import CharacterManager from "./CharacterManager";
import {
  TavernCharacterCard,
  WorldBookProfile,
  UserPersonaProfile,
  ChatPresetProfile,
} from "../types";

export interface WorldSettings {
  userName: string;
  userPersona: string;
  worldView: string;
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  activeUserId?: string;
  activeWorldId?: string;
  activePresetId?: string;
  idleHours?: number;     // 多少小时没互动后主动发消息
  maxBurst?: number;      // 一次最多发几条 (1-5)
  doNotDisturb?: boolean; // 是否开启免打扰
  dndStart?: string;      // 免打扰开始时间，例如 "23:00"
  dndEnd?: string;        // 免打扰结束时间，例如 "08:00"
  // --- 新增：语音副 API 独立配置 ---
  ttsApiBaseUrl?: string;
  ttsApiKey?: string;
}

interface SettingsAppProps {
  settings: WorldSettings;
  onSaveSettings: (next: WorldSettings) => void;
  resolvedCity: string;
  weatherDesc: string;
  onSelectBoyfriend: (char: TavernCharacterCard) => void;
}

export default function SettingsApp({
  settings,
  onSaveSettings,
  resolvedCity,
  weatherDesc,
  onSelectBoyfriend,
}: SettingsAppProps) {
  const [activeTab, setActiveTab] = useState<
    "user" | "world" | "preset" | "roles" | "api"
  >("user");

  const [userList, setUserList] = useState<UserPersonaProfile[]>([]);
  const [worldList, setWorldList] = useState<WorldBookProfile[]>([]);
  const [presetList, setPresetList] = useState<ChatPresetProfile[]>([]);

  const userFileRef = useRef<HTMLInputElement>(null);
  const worldFileRef = useRef<HTMLInputElement>(null);
  const presetFileRef = useRef<HTMLInputElement>(null);

  const [modelList, setModelList] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchMsg, setFetchMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2600);
  };

  useEffect(() => {
    try {
      const savedUsers = localStorage.getItem("phone_user_profiles");
      if (savedUsers) {
        setUserList(JSON.parse(savedUsers));
      } else {
        const initUser: UserPersonaProfile = {
          id: "default_user",
          name: settings.userName || "我",
          persona: settings.userPersona || "目前居住在上海，平时喜欢安静地待在家里。",
          updatedAt: Date.now(),
        };
        setUserList([initUser]);
        localStorage.setItem("phone_user_profiles", JSON.stringify([initUser]));
      }

      const savedWorlds = localStorage.getItem("phone_world_profiles");
      if (savedWorlds) {
        setWorldList(JSON.parse(savedWorlds));
      } else {
        const initWorld: WorldBookProfile = {
          id: "default_world",
          name: "真实世界观",
          description: settings.worldView || "真实世界观",
          entries: [],
          updatedAt: Date.now(),
        };
        setWorldList([initWorld]);
        localStorage.setItem("phone_world_profiles", JSON.stringify([initWorld]));
      }

      const savedPresets = localStorage.getItem("phone_preset_profiles");
      if (savedPresets) {
        setPresetList(JSON.parse(savedPresets));
      } else {
        const initPreset: ChatPresetProfile = {
          id: "default_preset",
          name: "日常沉浸对话预设",
          systemPrompt:
            "请完全沉浸在当前角色身份与世界观中，以自然、生活化的微信聊天口吻回复，避免长篇大论与AI腔。",
          jailbreakPrompt: "",
          temperature: 0.85,
          topP: 0.9,
          maxTokens: 1024,
          presencePenalty: 0.2,
          frequencyPenalty: 0.2,
          updatedAt: Date.now(),
        };
        setPresetList([initPreset]);
        localStorage.setItem("phone_preset_profiles", JSON.stringify([initPreset]));
      }
    } catch {}
  }, []);

  const activateUser = (u: UserPersonaProfile) => {
    onSaveSettings({
      ...settings,
      activeUserId: u.id,
      userName: u.name,
      userPersona: u.persona,
    });
    showToast(`已切换身份：【${u.name}】`);
  };

  const activateWorld = (w: WorldBookProfile) => {
    const combinedDesc = [
      w.name,
      w.description,
      ...w.entries.filter((e) => e.enabled).map((e) => e.content),
    ]
      .filter(Boolean)
      .join("\n");

    onSaveSettings({
      ...settings,
      activeWorldId: w.id,
      worldView: combinedDesc || w.name,
    });
    showToast(`已启用世界观：【${w.name}】`);
  };

  const activatePreset = (p: ChatPresetProfile) => {
    onSaveSettings({
      ...settings,
      activePresetId: p.id,
    });
    localStorage.setItem("phone_active_preset", JSON.stringify(p));
    showToast(`已加载预设：【${p.name}】`);
  };

  const handleImportUserJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const name = data.name || data.user_name || file.name.replace(/\.json$/i, "");
      const persona = data.persona || data.description || data.content || JSON.stringify(data, null, 2);

      const newUser: UserPersonaProfile = {
        id: `user_${Date.now()}`,
        name: String(name),
        persona: String(persona),
        updatedAt: Date.now(),
      };
      const updated = [newUser, ...userList];
      setUserList(updated);
      localStorage.setItem("phone_user_profiles", JSON.stringify(updated));
      activateUser(newUser);
    } catch {
      showToast("❌ User JSON 解析失败");
    } finally {
      if (userFileRef.current) userFileRef.current.value = "";
    }
  };

  const handleImportWorldJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const worldName = data.name || file.name.replace(/\.json$/i, "");

      const parsedEntries: WorldBookProfile["entries"] = [];
      if (data.entries) {
        const rawEntries = Array.isArray(data.entries) ? data.entries : Object.values(data.entries);
        rawEntries.forEach((item: Record<string, unknown>, idx: number) => {
          const keys = Array.isArray(item.key) ? (item.key as string[]) : [];
          const content = String(item.content || item.entry || "");
          if (content) {
            parsedEntries.push({
              id: `entry_${idx}_${Date.now()}`,
              keys,
              content,
              enabled: item.disable === true ? false : item.enabled !== false,
            });
          }
        });
      }

      const description = data.description || (parsedEntries.length > 0 ? parsedEntries.slice(0, 3).map((en) => en.content).join("\n") : worldName);

      const newWorld: WorldBookProfile = {
        id: `world_${Date.now()}`,
        name: String(worldName),
        description,
        entries: parsedEntries,
        updatedAt: Date.now(),
      };
      const updated = [newWorld, ...worldList];
      setWorldList(updated);
      localStorage.setItem("phone_world_profiles", JSON.stringify(updated));
      activateWorld(newWorld);
      showToast(`✅ 成功导入世界观【${worldName}】`);
    } catch {
      showToast("❌ 世界观 JSON 解析失败");
    } finally {
      if (worldFileRef.current) worldFileRef.current.value = "";
    }
  };

  const handleImportPresetJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const presetName = data.name || file.name.replace(/\.json$/i, "");
      let sysPrompt = data.system_prompt || data.main_prompt || "";

      const newPreset: ChatPresetProfile = {
        id: `preset_${Date.now()}`,
        name: String(presetName),
        systemPrompt: sysPrompt || "保持角色设定，自然沉浸对话。",
        jailbreakPrompt: "",
        temperature: 0.85,
        topP: 0.9,
        maxTokens: 1024,
        presencePenalty: 0.2,
        frequencyPenalty: 0.2,
        updatedAt: Date.now(),
      };

      const updated = [newPreset, ...presetList];
      setPresetList(updated);
      localStorage.setItem("phone_preset_profiles", JSON.stringify(updated));
      activatePreset(newPreset);
    } catch {
      showToast("❌ 预设 JSON 解析失败");
    } finally {
      if (presetFileRef.current) presetFileRef.current.value = "";
    }
  };

  const handleFetchModels = async () => {
    if (!settings.apiBaseUrl.trim() || !settings.apiKey.trim()) {
      setFetchMsg("⚠️ 请先填写接口地址和 API Key");
      return;
    }
    setFetchingModels(true);
    setFetchMsg("");
    try {
      let baseUrl = settings.apiBaseUrl.trim().replace(/\/+$/, "");
      if (!baseUrl.endsWith("/v1")) baseUrl = `${baseUrl}/v1`;

      const res = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers: { Authorization: `Bearer ${settings.apiKey.trim()}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`请求失败 (${res.status})`);
      const data = await res.json();
      const rawList = Array.isArray(data?.data) ? data.data : [];
      const ids: string[] = rawList.map((item: { id?: string }) => item.id).filter((id: unknown): id is string => typeof id === "string").sort();

      if (ids.length === 0) {
        setFetchMsg("⚠️ 未返回可用模型");
      } else {
        setModelList(ids);
        setFetchMsg(`✅ 成功拉取 ${ids.length} 个模型`);
        if (!settings.modelName || !ids.includes(settings.modelName)) {
          onSaveSettings({ ...settings, modelName: ids[0] });
        }
      }
    } catch (err: unknown) {
      setFetchMsg(`❌ 拉取失败`);
    } finally {
      setFetchingModels(false);
    }
  };

  const activeUserId = settings.activeUserId || userList[0]?.id;
  const activeWorldId = settings.activeWorldId || worldList[0]?.id;
  const activePresetId = settings.activePresetId || presetList[0]?.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", color: "#fff", position: "relative" }}>
      {toastMsg && (
        <div style={{ position: "absolute", top: "48px", left: "50%", transform: "translateX(-50%)", background: "rgba(16, 185, 129, 0.95)", color: "#fff", padding: "6px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: "600", zIndex: 50, whiteSpace: "nowrap" }}>
          {toastMsg}
        </div>
      )}

      <div style={{ display: "flex", background: "#1c1c26", padding: "6px 4px", gap: "4px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, overflowX: "auto" }}>
        {[
          { id: "user", name: "User档案" },
          { id: "world", name: "世界观" },
          { id: "preset", name: "对话预设" },
          { id: "roles", name: "角色档案" },
          { id: "api", name: "API与心跳" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            style={{ flex: 1, padding: "7px 4px", borderRadius: "8px", border: "none", background: activeTab === t.id ? "#6366f1" : "transparent", color: "#fff", fontSize: "11px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "user" && (
          <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>当前定位：<strong>{resolvedCity}</strong></span>
              <button onClick={() => userFileRef.current?.click()} style={{ background: "#6366f1", border: "none", color: "#fff", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>+ 导入 USER</button>
              <input type="file" ref={userFileRef} accept=".json" onChange={handleImportUserJson} style={{ display: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {userList.map((u) => (
                <div key={u.id} onClick={() => activateUser(u)} style={{ background: u.id === activeUserId ? "rgba(99,102,241,0.18)" : "#1c1c26", border: u.id === activeUserId ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px 12px", cursor: "pointer" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>{u.id === activeUserId ? "✅ " : ""}{u.name}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{u.persona}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "12px", color: "#a5b4fc", fontWeight: "600" }}>✏️ 编辑当前身份</div>
              <input type="text" value={settings.userName} onChange={(e) => onSaveSettings({ ...settings, userName: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#1f1f2b", border: "1px solid #333", color: "#fff", fontSize: "13px", boxSizing: "border-box" }} />
              <textarea rows={4} value={settings.userPersona} onChange={(e) => onSaveSettings({ ...settings, userPersona: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#1f1f2b", border: "1px solid #333", color: "#fff", fontSize: "13px", boxSizing: "border-box" }} />
            </div>
          </div>
        )}

        {activeTab === "world" && (
          <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>自动映射：{resolvedCity} ({weatherDesc})</span>
              <button onClick={() => worldFileRef.current?.click()} style={{ background: "#6366f1", border: "none", color: "#fff", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>+ 导入世界观</button>
              <input type="file" ref={worldFileRef} accept=".json" onChange={handleImportWorldJson} style={{ display: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {worldList.map((w) => (
                <div key={w.id} onClick={() => activateWorld(w)} style={{ background: w.id === activeWorldId ? "rgba(99,102,241,0.18)" : "#1c1c26", border: w.id === activeWorldId ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px 12px", cursor: "pointer" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>{w.id === activeWorldId ? "✅ " : ""}{w.name}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{w.description}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "12px", color: "#a5b4fc", fontWeight: "600" }}>✏️ 编辑世界观背景</div>
              <textarea rows={4} value={settings.worldView} onChange={(e) => onSaveSettings({ ...settings, worldView: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#1f1f2b", border: "1px solid #333", color: "#fff", fontSize: "13px", boxSizing: "border-box" }} />
            </div>
          </div>
        )}

        {activeTab === "preset" && (
          <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>控制回复文风与采样</span>
              <button onClick={() => presetFileRef.current?.click()} style={{ background: "#6366f1", border: "none", color: "#fff", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>+ 导入预设</button>
              <input type="file" ref={presetFileRef} accept=".json" onChange={handleImportPresetJson} style={{ display: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {presetList.map((p) => (
                <div key={p.id} onClick={() => activatePreset(p)} style={{ background: p.id === activePresetId ? "rgba(99,102,241,0.18)" : "#1c1c26", border: p.id === activePresetId ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px 12px", cursor: "pointer" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>{p.id === activePresetId ? "✅ " : ""}{p.name}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.systemPrompt}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "roles" && (
          <CharacterManager onSelectCharacter={onSelectBoyfriend} />
        )}

        {activeTab === "api" && (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "#9ca3af", display: "block", marginBottom: "6px" }}>API 接口地址 (Base URL)</label>
              <input type="text" placeholder="https://api.openai.com/v1" value={settings.apiBaseUrl} onChange={(e) => onSaveSettings({ ...settings, apiBaseUrl: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1f1f2b", border: "1px solid #333", color: "#fff", fontSize: "13px", boxSizing: "border-box" }} />
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "#9ca3af", display: "block", marginBottom: "6px" }}>API Key</label>
              <input type="password" placeholder="sk-..." value={settings.apiKey} onChange={(e) => onSaveSettings({ ...settings, apiKey: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1f1f2b", border: "1px solid #333", color: "#fff", fontSize: "13px", boxSizing: "border-box" }} />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "12px", color: "#9ca3af" }}>选择对话模型</label>
                <button type="button" onClick={handleFetchModels} disabled={fetchingModels} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.5)", color: "#a5b4fc", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
                  {fetchingModels ? "拉取中..." : "🔄 自动拉取模型"}
                </button>
              </div>
              {modelList.length > 0 ? (
                <select value={settings.modelName} onChange={(e) => onSaveSettings({ ...settings, modelName: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1f1f2b", border: "1px solid #6366f1", color: "#fff", fontSize: "13px", boxSizing: "border-box" }}>
                  {modelList.map((m) => (<option key={m} value={m}>{m}</option>))}
                </select>
              ) : (
                <input type="text" value={settings.modelName} onChange={(e) => onSaveSettings({ ...settings, modelName: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1f1f2b", border: "1px solid #333", color: "#fff", fontSize: "13px", boxSizing: "border-box" }} />
              )}
              {fetchMsg && (<div style={{ fontSize: "12px", marginTop: "6px", color: fetchMsg.startsWith("✅") ? "#34d399" : "#f87171" }}>{fetchMsg}</div>)}
            </div>

            {/* 心跳主动挂机与免打扰配置 */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#a5b4fc" }}>⏰ 心跳主动连结与免打扰设置</div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "4px" }}>无互动几小时后触发</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={settings.idleHours ?? 2}
                    onChange={(e) => onSaveSettings({ ...settings, idleHours: parseFloat(e.target.value) || 2 })}
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#1f1f2b", border: "1px solid #333", color: "#fff", fontSize: "12px", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "4px" }}>单次最多连发条数 (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={settings.maxBurst ?? 1}
                    onChange={(e) => onSaveSettings({ ...settings, maxBurst: parseInt(e.target.value) || 1 })}
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#1f1f2b", border: "1px solid #333", color: "#fff", fontSize: "12px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* 免打扰时段设置 */}
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", marginTop: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "500" }}>🌙 开启睡眠免打扰时间段</span>
                  <input
                    type="checkbox"
                    checked={settings.doNotDisturb ?? false}
                    onChange={(e) => onSaveSettings({ ...settings, doNotDisturb: e.target.checked })}
                    style={{ width: "16px", height: "16px", accentColor: "#6366f1", cursor: "pointer" }}
                  />
                </div>

                {settings.doNotDisturb && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "10px", color: "#9ca3af", display: "block", marginBottom: "2px" }}>开始时间 (如 23:00)</label>
                      <input
                        type="time"
                        value={settings.dndStart ?? "23:00"}
                        onChange={(e) => onSaveSettings({ ...settings, dndStart: e.target.value })}
                        style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#1f1f2b", border: "1px solid #333", color: "#fff", fontSize: "12px" }}
                      />
                    </div>
                    <span style={{ color: "#9ca3af", marginTop: "14px" }}>至</span>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "10px", color: "#9ca3af", display: "block", marginBottom: "2px" }}>结束时间 (如 08:00)</label>
                      <input
                        type="time"
                        value={settings.dndEnd ?? "08:00"}
                        onChange={(e) => onSaveSettings({ ...settings, dndEnd: e.target.value })}
                        style={{ width: "100%", padding: "6px", borderRadius: "6px", background: "#1f1f2b", border: "1px solid #333", color: "#fff", fontSize: "12px" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.4" }}>
                💡 开启免打扰后，在指定睡眠时段内男友将默认您已入睡，<strong>绝对不会主动发消息</strong>打扰您。
              </div>
            </div>

            {/* --- 新增：语音副 API 独立配置 --- */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#ec4899" }}>🎙️ 纸片人男友专用语音 (TTS 副 API)</div>
              <div>
                <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "4px" }}>TTS 接口地址 (ElevenLabs / 微软Azure / 自定义TTS)</label>
                <input
                  type="text"
                  placeholder="https://api.elevenlabs.io/v1 或自定义TTS"
                  value={settings.ttsApiBaseUrl || ""}
                  onChange={(e) => onSaveSettings({ ...settings, ttsApiBaseUrl: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#1f1f2b", border: "1px solid #333", color: "#fff", fontSize: "12px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "4px" }}>TTS API Key / 语音密钥</label>
                <input
                  type="password"
                  placeholder="填写你的语音API Key"
                  value={settings.ttsApiKey || ""}
                  onChange={(e) => onSaveSettings({ ...settings, ttsApiKey: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "#1f1f2b", border: "1px solid #333", color: "#fff", fontSize: "12px", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.4" }}>
                💡 配置后，纸片人男友在 MoeTok 和微信连麦、发语音条时将通过此副 API 调用独立的声线库，实现千人千声的真人拟真感。
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}