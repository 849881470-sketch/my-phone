"use client";

import React, { useState, useEffect } from "react";

export function HarmonySplash({ onEnter }: { onEnter: () => void }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // 自动触发开屏门帘展开动画
    const timer = setTimeout(() => setAnimate(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "#000", overflow: "hidden" }}>
      <style>{`
        .center-logo {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          z-index: 5;
          display: flex; flex-direction: column; align-items: center;
          transition: opacity 0.8s ease;
          opacity: 0;
        }
        .animate-on .center-logo { opacity: 1; transition-delay: 0.4s; }
        
        .logo-title {
          color: #ffffff; 
          font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
          font-size: 32px; 
          font-weight: 700; 
          letter-spacing: 0.1em; 
          margin-bottom: 6px;
          text-shadow: 0 0 20px rgba(255,255,255,0.4);
        }
        .logo-sub {
          color: rgba(255, 255, 255, 0.5); 
          font-size: 11px; 
          letter-spacing: 0.4em; 
        }

        .fold-panel {
          position: absolute;
          top: 0; bottom: 0;
          width: 50.5%;
          background: linear-gradient(to right, #111, #000);
          z-index: 10;
          transition: transform 1.4s cubic-bezier(0.19, 1, 0.22, 1);
          box-shadow: 0 0 15px rgba(0,0,0,0.8) inset; 
        }
        
        .fold-left { 
          left: 0; 
          transform: translateX(0); 
          border-right: 1px solid #333;
        }
        .fold-right { 
          right: 0; 
          transform: translateX(0); 
          background: linear-gradient(to left, #111, #000);
          border-left: 1px solid #333;
        }

        .animate-on .fold-left { transform: translateX(-100%); }
        .animate-on .fold-right { transform: translateX(100%); }

        .enter-btn {
          position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
          padding: 12px 45px; border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.08);
          color: #fff; font-size: 14px; cursor: pointer;
          opacity: 0; transition: opacity 0.8s ease; 
          z-index: 20;
        }
        .animate-on .enter-btn { opacity: 1; transition-delay: 0.8s; }
      `}</style>

      <div className={animate ? "animate-on animate" : ""} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div className="center-logo">
          <div className="logo-title">HUAWEI</div>
          <div className="logo-sub">HARMONYOS</div>
        </div>

        <div className="fold-panel fold-left" />
        <div className="fold-panel fold-right" />

        <button type="button" onClick={onEnter} className="enter-btn">
          进入专属终端
        </button>
      </div>
    </div>
  );
}