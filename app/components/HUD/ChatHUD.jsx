"use client";
import React, { useState, useEffect, useRef } from "react";

// 假對話資料 (保持不變)
const FAKE_HISTORY = [
  { id: 1, role: "ai", content: "神經連結建立完成。系統初始化成功，隨時準備執行指令。" },
  { id: 2, role: "user", content: "回報目前狀態。" },
  { id: 3, role: "ai", content: "所有模組運作正常。環境掃描完畢，無異常反應。電池續航力充足。" },
];

// 🌟 新增：打字機效果元件 (讓 AI 回覆更帥)
const TypewriterText = ({ text, onComplete }) => {
    const [displayedText, setDisplayedText] = useState("");
    useEffect(() => {
      let index = 0;
      const timer = setInterval(() => {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
        if (index === text.length) {
          clearInterval(timer);
          if(onComplete) onComplete();
        }
      }, 30); // 打字速度
      return () => clearInterval(timer);
    }, [text, onComplete]);
    return <span>{displayedText}{displayedText.length < text.length && <span className="animate-pulse">_</span>}</span>;
};

export default function ChatHUD() {
  const [history, setHistory] = useState(FAKE_HISTORY);
  const chatBoxRef = useRef(null);

  // 自動捲動到底部
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [history]);

  // 按鈕點擊事件 (目前先做假動作)
  const handleTextChat = () => {
      alert("開啟文字輸入介面 (功能開發中)");
  };
  const handleVoiceChat = () => {
      alert("開啟語音連線 (功能開發中)");
  };

  return (
    // 增加 animate-fadeIn 讓整個介面淡入
    <div className="absolute inset-0 z-30 flex flex-col justify-between pointer-events-none animate-fadeIn">
      
      {/* 頂部資訊列 */}
      <div className="w-full bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-start border-b border-cyan-500/20 backdrop-blur-md">
        <div>
          <h2 className="text-cyan-400 font-bold text-sm tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            LIVE CONNECTION
          </h2>
          <p className="text-[10px] text-cyan-600 font-mono mt-1">LATENCY: 12ms | STABLE</p>
        </div>
        <div className="text-right">
           <div className="text-[10px] text-cyan-600 font-mono border border-cyan-500/30 px-2 py-1 rounded bg-cyan-950/50">
              AI MODEL: ACTIVE
           </div>
        </div>
      </div>

      {/* 中間對話紀錄區 */}
      <div 
        ref={chatBoxRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide mask-gradient-top-bottom pointer-events-auto"
      >
        {history.map((msg, index) => {
           const isLastAI = msg.role === 'ai' && index === history.length - 1;
           return (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl backdrop-blur-md border ${
                msg.role === "user" 
                  ? "bg-blue-600/20 border-blue-500/50 text-blue-100 rounded-tr-none" 
                  : "bg-cyan-950/40 border-cyan-500/30 text-cyan-100 rounded-tl-none shadow-[0_0_15px_rgba(0,255,255,0.1)]"
              }`}>
                <div className="text-[9px] font-mono opacity-50 mb-1 tracking-wider">
                  {msg.role === "user" ? "COMMAND >>" : "RESPONSE //"}
                </div>
                <div className="text-sm leading-relaxed font-sans">
                  {isLastAI ? <TypewriterText text={msg.content} /> : msg.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🌟 底部按鈕區 (取代原本的輸入框) */}
      {/* 這裡增加了 animate-slideUp 讓它在掛載時從下方滑入 */}
      <div className="w-full p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent border-t border-cyan-500/20 backdrop-blur-md pointer-events-auto animate-slideUp">
        <div className="flex gap-4 max-w-md mx-auto">
          {/* 文字對話按鈕 */}
          <button 
            onClick={handleTextChat}
            className="flex-1 group relative overflow-hidden bg-cyan-950/40 border border-cyan-500/50 text-cyan-300 py-4 rounded-xl font-bold tracking-widest hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-300 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <span className="flex flex-col items-center">
                <span className="text-lg mb-1">💬</span>
                <span className="text-xs">文字通訊 // TEXT</span>
            </span>
          </button>

          {/* 語音對話按鈕 */}
          <button 
            onClick={handleVoiceChat}
            className="flex-1 group relative overflow-hidden bg-blue-950/40 border border-blue-500/50 text-blue-300 py-4 rounded-xl font-bold tracking-widest hover:bg-blue-500/20 hover:border-blue-400 transition-all duration-300 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <span className="flex flex-col items-center">
                <span className="text-lg mb-1">🎙️</span>
                <span className="text-xs">語音連線 // VOICE</span>
            </span>
          </button>
        </div>
      </div>

    </div>
  );
}
