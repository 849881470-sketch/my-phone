"use client";

import React, { useState, useEffect } from "react";

interface TriFoldPhoneShellProps {
  children: React.ReactNode;
  activeTab: "chars" | "chat" | "xhs" | "settings";
  onTabChange: (tab: "chars" | "chat" | "xhs" | "settings") => void;
  activeBoyfriendName?: string;
}

export function TriFoldPhoneShell({
  children,
  activeTab,
  onTabChange,
  activeBoyfriendName,
}: TriFoldPhoneShellProps) {
  // 控制三折叠屏的“合上锁屏态”与“三折展开态”
  const [isUnfolded, setIsUnfolded] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      );
      setCurrentDate(
        now.toLocaleDateString("zh-CN", {
          month: "long",
          day: "numeric",
          weekday: "long",
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: "radial-gradient(circle at 50% 30%, #1c192b 0%, #07070a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* 三折叠机身动态外框 */}
      <div
        style={{
          width: isUnfolded ? "100%" : "360px",
          maxWidth: isUnfolded ? "1020px" : "360px",
          height: "800px",
          maxHeight: "92dvh",
          backgroundColor: "#0e0e14",
          borderRadius: isUnfolded ? "28px" : "42px",
          border: "6px solid #2e2a3b",
          boxShadow: isUnfolded
            ? "0 30px 90px rgba(99, 102, 241, 0.25), inset 0 0 0 1px rgba(255,255,255,0.12)"
            : "0 25px 60px rgba(0, 0, 0, 0.85), inset 0 0 0 1px rgba(255,255,255,0.15)",
          transition: "all 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 状态一：合上时的封面锁屏（三折叠开屏动画入口） */}
        {!isUnfolded ? (
          <div
            onClick={() => setIsUnfolded(true)}
            style={{
              flex: 1,
              background:
                "linear-gradient(160deg, #1e1b4b 0%, #311042 48%, #0f172a 100%)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "48px 24px",
              cursor: "pointer",
              position: "relative",
              userSelect: "none",
            }}
          >
            {/* 顶部灵动岛与信号 */}
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <span>专属加密频段</span>
              <div
                style={{
                  width: "76px",
                  height: "20px",
                  background: "#000",
                  borderRadius: "12px",
                }}
              />
              <span>100% 🔋</span>
            </div>

            {/* 中央锁屏时间与专属提示 */}
            <div style={{ textAlign: "center", marginTop: "-40px" }}>
              <div
                style={{
                  fontSize: "64px",
                  fontWeight: "200",
                  letterSpacing: "2px",
                  color: "#fff",
                  lineHeight: 1.1,
                }}
              >
                {currentTime || "21:20"}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.75)",
                  marginTop: "8px",
                }}
              >
                {currentDate}
              </div>

              {/* 锁屏呼吸通知卡片 */}
              <div
                style={{
                  marginTop: "36px",
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  borderRadius: "16px",
                  padding: "14px 18px",
                  textAlign: "left",
                  width: "270px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#c7d2fe",
                    fontWeight: "600",
                    marginBottom: "4px",
                  }}
                >
                  💌 私人终端已就绪
                </div>
                <div style={{ fontSize: "13px", color: "#f3f4f6" }}>
                  {activeBoyfriendName
                    ? `【${activeBoyfriendName}】正在等待你的连线...`
                    : "点击展开三折叠屏幕，唤醒你的专属世界"}
                </div>
              </div>
            </div>

            {/* 底部展开引导 */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  padding: "10px 24px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: "500",
                  letterSpacing: "1px",
                }}
              >
                ✨ 点击展开三折叠主屏
              </div>
            </div>
          </div>
        ) : (
          /* 状态二：三折叠完全展开态（自带两条微光折痕质感 + 顶部控制栏） */
          <>
            {/* 展开态顶部状态栏 */}
            <div
              style={{
                height: "38px",
                padding: "0 20px",
                background: "rgba(18, 18, 26, 0.95)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "rgba(255,255,255,0.8)",
                flexShrink: 0,
                zIndex: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontWeight: "600" }}>{currentTime}</span>
                <span style={{ color: "#818cf8", fontSize: "11px" }}>
                  ● 本地私密模式 (0后台偷跑)
                </span>
              </div>

              <button
                onClick={() => setIsUnfolded(false)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#d1d5db",
                  padding: "3px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
              >
                🔒 折叠锁屏
              </button>
            </div>

            {/* 三折叠核心屏幕内容区域（带两条模拟铰链微光折痕） */}
            <div
              style={{
                flex: 1,
                position: "relative",
                overflow: "hidden",
                display: "flex",
              }}
            >
              {/* 左侧铰链折痕视觉线 (33.33%) */}
              <div
                style={{
                  position: "absolute",
                  left: "33.33%",
                  top: 0,
                  bottom: 0,
                  width: "2px",
                  background:
                    "linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)",
                  boxShadow: "0 0 12px rgba(0,0,0,0.8)",
                  pointerEvents: "none",
                  zIndex: 20,
                }}
              />
              {/* 右侧铰链折痕视觉线 (66.66%) */}
              <div
                style={{
                  position: "absolute",
                  left: "66.66%",
                  top: 0,
                  bottom: 0,
                  width: "2px",
                  background:
                    "linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)",
                  boxShadow: "0 0 12px rgba(0,0,0,0.8)",
                  pointerEvents: "none",
                  zIndex: 20,
                }}
              />

              {/* 实际 App 页面容器 */}
              <div style={{ flex: 1, height: "100%", overflow: "hidden" }}>
                {children}
              </div>
            </div>

            {/* 展开态底部全局 Dock 栏 */}
            <div
              style={{
                height: "62px",
                background: "rgba(16, 16, 22, 0.98)",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "48px",
                flexShrink: 0,
                zIndex: 10,
              }}
            >
              {[
                { id: "chars", icon: "🃏", label: "酒馆卡库" },
                { id: "chat", icon: "💬", label: "专属微信" },
                { id: "xhs", icon: "📕", label: "小红书" },
                { id: "settings", icon: "⚙️", label: "API设置" },
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id as typeof activeTab)}
                    style={{
                      background: isActive
                        ? "rgba(99, 102, 241, 0.16)"
                        : "transparent",
                      border: isActive
                        ? "1px solid rgba(99, 102, 241, 0.4)"
                        : "1px solid transparent",
                      borderRadius: "12px",
                      padding: "6px 16px",
                      color: isActive ? "#a5b4fc" : "rgba(255,255,255,0.55)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: isActive ? "600" : "400",
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}