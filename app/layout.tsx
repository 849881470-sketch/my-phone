import React from "react";

export const metadata = {
  title: "AI 专属虚拟手机",
  description: "你的专属网恋与虚拟世界小手机",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#07070a",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}