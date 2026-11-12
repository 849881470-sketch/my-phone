"use client";

import React, { useState, useEffect } from "react";
import { WorldSettings } from "./SettingsApp";

interface NotesAppProps {
  settings: WorldSettings;
}

interface NoteItem {
  id: string;
  title: string;
  content: string;
  time: string;
}

export default function NotesApp({ settings }: NotesAppProps) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [currentView, setCurrentView] = useState<"list" | "edit">("list");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // 编辑表单状态
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // 加载本地备忘录
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("phone_local_notes");
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch {}
    } else {
      // 默认给用户初始化一条华为风格的欢迎备忘录
      const defaultNotes: NoteItem[] = [
        {
          id: "note_1",
          title: "🌸 我们的恋爱小日常",
          content: "记录一些甜蜜的瞬间：今天阳光很好，一起去吃了下午茶。希望以后的每一天都像今天一样温柔。",
          time: "11月13日 14:20",
        },
        {
          id: "note_2",
          title: "📌 待办清单",
          content: "1. 整理房间\n2. 背 50 个单词\n3. 晚上提醒他按时吃饭",
          time: "11月12日 09:10",
        },
      ];
      setNotes(defaultNotes);
      localStorage.setItem("phone_local_notes", JSON.stringify(defaultNotes));
    }
  }, []);

  const saveToLocal = (newNotes: NoteItem[]) => {
    setNotes(newNotes);
    localStorage.setItem("phone_local_notes", JSON.stringify(newNotes));
  };

  const handleCreateNew = () => {
    setActiveNoteId(null);
    setEditTitle("");
    setEditContent("");
    setCurrentView("edit");
  };

  const handleOpenNote = (note: NoteItem) => {
    setActiveNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setCurrentView("edit");
  };

  const handleSaveNote = () => {
    if (!editTitle.trim() && !editContent.trim()) {
      setCurrentView("list");
      return;
    }

    const nowStr = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" }) + " " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

    if (activeNoteId) {
      // 修改现有笔记
      const updated = notes.map((n) => (n.id === activeNoteId ? { ...n, title: editTitle.trim() || "无标题笔记", content: editContent, time: nowStr } : n));
      saveToLocal(updated);
    } else {
      // 新增笔记
      const newNote: NoteItem = {
        id: `note_${Date.now()}`,
        title: editTitle.trim() || "无标题笔记",
        content: editContent,
        time: nowStr,
      };
      saveToLocal([newNote, ...notes]);
    }
    setCurrentView("list");
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("确定要删除这条备忘录吗？")) {
      const filtered = notes.filter((n) => n.id !== id);
      saveToLocal(filtered);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f5f5f7", color: "#111", position: "relative" }}>
      
      {currentView === "list" ? (
        <>
          {/* 华为风格顶部栏 */}
          <div style={{ padding: "16px 20px 10px 20px", background: "#fff", borderBottom: "1px solid #e5e5ea", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#000" }}>备忘录</div>
              <div style={{ fontSize: "11px", color: "#8e8e93", marginTop: "2px" }}>全部笔记 ({notes.length}) · 仅自己可见</div>
            </div>
            <button
              onClick={handleCreateNew}
              style={{ background: "#cf0a2c", color: "#fff", border: "none", width: "36px", height: "36px", borderRadius: "50%", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 10px rgba(207,10,44,0.3)" }}
              title="新建备忘录"
            >
              +
            </button>
          </div>

          {/* 笔记卡片列表 */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {notes.length === 0 ? (
              <div style={{ textAlign: "center", color: "#8e8e93", marginTop: "120px", fontSize: "13px" }}>
                暂无备忘录，点击右上角 <strong style={{ color: "#cf0a2c" }}>+</strong> 开始记录吧~
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleOpenNote(note)}
                  style={{ background: "#fff", borderRadius: "12px", padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", cursor: "pointer", position: "relative", border: "1px solid rgba(0,0,0,0.02)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "15px", fontWeight: "600", color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "75%" }}>
                      {note.title}
                    </span>
                    <span style={{ fontSize: "11px", color: "#8e8e93" }}>{note.time}</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#666", lineHeight: "1.4", whiteSpace: "pre-wrap", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {note.content || "无正文内容..."}
                  </div>
                  <button
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    style={{ position: "absolute", bottom: "10px", right: "12px", background: "none", border: "none", color: "#c7c7cc", fontSize: "13px", cursor: "pointer" }}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* 编辑 / 新建详情页 */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", overflow: "hidden" }}>
          <div style={{ height: "48px", background: "#fff", borderBottom: "1px solid #e5e5ea", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
            <button onClick={() => setCurrentView("list")} style={{ background: "none", border: "none", color: "#cf0a2c", fontSize: "15px", cursor: "pointer", fontWeight: "600" }}>
              ‹ 返回
            </button>
            <span style={{ fontSize: "15px", fontWeight: "600" }}>{activeNoteId ? "编辑备忘录" : "新建备忘录"}</span>
            <button onClick={handleSaveNote} style={{ background: "none", border: "none", color: "#cf0a2c", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>
              保存
            </button>
          </div>

          <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto" }}>
            <input
              type="text"
              placeholder="请输入标题..."
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{ fontSize: "18px", fontWeight: "bold", border: "none", borderBottom: "1px solid #f0f0f0", paddingBottom: "8px", outline: "none", background: "transparent", color: "#111" }}
            />
            <textarea
              placeholder="在这里记录你的心事或灵感..."
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{ flex: 1, fontSize: "14px", border: "none", outline: "none", background: "transparent", resize: "none", lineHeight: "1.6", color: "#333", minHeight: "300px" }}
            />
          </div>
        </div>
      )}

    </div>
  );
}