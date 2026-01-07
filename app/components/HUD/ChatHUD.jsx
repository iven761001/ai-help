// components/HUD/ChatHUD.jsx
"use client";

import { useState, useRef, useEffect } from "react";

// 如果妳沒有安裝 lucide-react，這裡用文字代替 ICON
// import { Send, User, Bot } from "lucide-react"; 

export default function ChatHUD() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [character, setCharacter] = useState(null);
  
  const messagesEndRef = useRef(null);

  // 1. 初始化：從 LocalStorage 讀取角色資料
  useEffect(() => {
    try {
      const saved = localStorage.getItem("my_ai_character");
      if (saved) {
        const parsed = JSON.parse(saved);
        setCharacter(parsed);
        // 發送第一條歡迎訊息
        setMessages([
          { role: "ai", content: `哈囉！我是${parsed.name || "AI"}，我們終於見面了！` }
        ]);
      }
    } catch (e) {
      console.error("讀取角色失敗", e);
    }
  }, []);

  // 自動捲動到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // 2. 發送訊息給 API
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userText = input;
    setInput(""); // 清空輸入框
    
    // 顯示使用者訊息
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setIsTyping(true);

    try {
      // 呼叫我們剛剛寫的 route.js
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          character: character || {} // 把角色設定傳給後端
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { role: "ai", content: data.reply }]);
        
        // 這裡未來可以擴充：根據 data.emotion 改變 3D 角色的動作
        // 例如： if (data.emotion === 'happy') setAnimation('dance');
      } else {
        setMessages((prev) => [...prev, { role: "ai", content: "發生錯誤，請稍後再試..." }]);
      }

    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [...prev, { role: "ai", content: "網路連線怪怪的..." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // 防止手機換行
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full justify-between p-4 max-w-md mx-auto font-sans relative z-10">
      
      {/* 上方標題 (顯示角色名字) */}
      <div className="flex justify-center items-center py-2">
        <div className="bg-black/40 backdrop-blur-md px-4 py-1 rounded-full border border-white/10 text-white/80 text-xs shadow-lg">
           {character?.name || "AI 夥伴"} 連線中...
        </div>
      </div>

      {/* 中間對話區 (高度自適應，背景透明) */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 py-4 px-2 mask-image-gradient">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`
                max-w-[80%] px-4 py-3 text-sm leading-relaxed shadow-md backdrop-blur-md border animate-fadeIn
                ${msg.role === "user" 
                  ? "bg-blue-600/80 text-white rounded-2xl rounded-tr-none border-blue-500/50" 
                  : "bg-gray-800/70 text-gray-100 rounded-2xl rounded-tl-none border-gray-700/50"}
              `}
            >
              {msg.content}
            </div>
          </div>
        ))}
        
        {/* 打字動畫 */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-800/60 text-gray-400 rounded-2xl rounded-tl-none px-4 py-2 text-xs border border-gray-700/50">
              思考中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 下方輸入區 */}
      <div className="pt-2 pb-safe-bottom">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入訊息..."
            className="flex-1 bg-black/60 border border-white/20 text-white placeholder-gray-400 rounded-full px-4 py-3 focus:outline-none focus:border-blue-500 backdrop-blur-md transition-all"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!input.trim() || isTyping}
            className={`
              p-3 rounded-full font-bold text-white transition-all shadow-lg
              ${input.trim() ? "bg-blue-600 hover:bg-blue-500 active:scale-95" : "bg-gray-700 text-gray-500"}
            `}
          >
            傳送
          </button>
        </div>
      </div>
    </div>
  );
}
