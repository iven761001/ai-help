// components/HUD/ChatHUD.jsx
"use client";

import { useState, useRef, useEffect } from "react";

export default function ChatHUD() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "ai", content: "嗨！我是妳的專屬 AI 夥伴，今天想聊什麼呢？✨" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // 自動捲動到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // 發送訊息給 API
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput(""); // 清空輸入框
    
    // 1. 顯示使用者訊息
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);

    try {
      // 2. 呼叫我們剛剛寫好的 API
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg,
          nickname: "玻璃小幫手", 
          personality: "warm"    
        }),
      });

      const data = await res.json();

      // 3. 顯示 AI 回覆
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "ai", content: data.reply }]);
      }

    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [...prev, { role: "ai", content: "糟糕，我好像斷線了... 😵" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full justify-between max-w-lg mx-auto font-sans text-sm relative z-50">
      
      {/* 頂部狀態列 */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none">
        <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
           <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
           <span className="text-white/80 text-xs font-bold tracking-wider">ONLINE</span>
        </div>
      </div>

      {/* 中間：對話區 */}
      <div className="flex-1 overflow-y-auto px-4 pt-20 pb-4 space-y-4 no-scrollbar" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%)' }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`
                max-w-[85%] px-5 py-3 rounded-2xl text-white/90 shadow-lg backdrop-blur-md border
                ${msg.role === "user" 
                  ? "bg-blue-600/80 rounded-tr-sm border-blue-400/30" 
                  : "bg-gray-800/70 rounded-tl-sm border-white/10"}
              `}
            >
              {msg.content}
            </div>
          </div>
        ))}
        
        {/* Loading 動畫 */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-800/70 px-4 py-3 rounded-2xl rounded-tl-sm border border-white/10 backdrop-blur-md">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 底部：輸入框 */}
      <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="relative flex items-center bg-gray-900/90 border border-gray-600 rounded-full p-1 shadow-2xl transition-colors focus-within:border-blue-500">
          
          <button className="p-3 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            🎤
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入妳的問題..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 px-2 focus:outline-none"
          />

          <button 
            onClick={handleSendMessage}
            disabled={!input.trim() || isTyping}
            className={`
              p-3 rounded-full font-bold transition-all
              ${input.trim() ? "bg-blue-600 text-white shadow-lg scale-100" : "bg-gray-800 text-gray-500 scale-95"}
            `}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
