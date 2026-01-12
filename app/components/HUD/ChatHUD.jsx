"use client";

import React, { useState, useEffect, useRef } from "react";

export default function ChatHUD() {
  const [messages, setMessages] = useState([
    { id: 1, role: "ai", text: "系統連線成功。我是妳的專屬 AI 夥伴，請多指教！" }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false); // 思考狀態
  const scrollRef = useRef(null);

  // 自動捲動到底部
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isThinking]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userText = input;
    setInput(""); // 清空輸入框

    // 1. 顯示玩家的訊息
    setMessages(prev => [...prev, { id: Date.now(), role: "user", text: userText }]);
    
    // 2. 進入思考模式
    setIsThinking(true);

    try {
        // 3. 🌟 呼叫我們剛剛寫好的後端 API
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText })
        });

        const data = await res.json();

        // 4. 顯示 AI 的回答
        setMessages(prev => [...prev, { id: Date.now() + 1, role: "ai", text: data.reply }]);

    } catch (error) {
        setMessages(prev => [...prev, { id: Date.now() + 1, role: "ai", text: "⚠️ 連線錯誤，請檢查網路狀態。" }]);
    } finally {
        setIsThinking(false); // 思考結束
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-8 z-50 flex flex-col items-center pointer-events-none"> {/* 外層不擋點擊 */}
      
      {/* 聊天記錄區塊 */}
      <div className="w-full max-w-lg px-4 mb-4 flex flex-col gap-2 max-h-[40vh] overflow-y-auto pointer-events-auto no-scrollbar" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[80%] px-4 py-2 rounded-2xl text-sm backdrop-blur-md shadow-lg border border-white/10
              ${msg.role === 'user' 
                ? 'bg-blue-600/80 text-white rounded-br-none' 
                : 'bg-gray-900/80 text-cyan-100 rounded-bl-none animate-fadeIn'}
            `}>
              {/* 如果是 AI，顯示一個小頭像標示 */}
              {msg.role === 'ai' && <span className="text-[10px] text-cyan-400 block mb-1 font-bold tracking-wider">AI</span>}
              {msg.text}
            </div>
          </div>
        ))}
        
        {/* 思考中的動畫 */}
        {isThinking && (
           <div className="flex justify-start animate-pulse">
             <div className="bg-gray-900/60 text-cyan-400 px-4 py-2 rounded-2xl rounded-bl-none text-xs border border-cyan-500/30 backdrop-blur-md">
               AI 正在思考中... 💭
             </div>
           </div>
        )}
      </div>

      {/* 輸入框區塊 */}
      <form onSubmit={handleSend} className="w-full max-w-md px-4 pointer-events-auto">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full opacity-30 group-hover:opacity-70 transition duration-300 blur"></div>
          <div className="relative flex items-center bg-black/80 backdrop-blur-xl rounded-full border border-white/10 p-1 shadow-2xl">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="輸入訊息..." 
              className="flex-1 bg-transparent text-white px-4 py-3 focus:outline-none placeholder-gray-500 text-sm"
            />
            <button 
              type="submit" 
              disabled={isThinking}
              className={`p-3 rounded-full transition-all duration-300 ${isThinking ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:scale-105 active:scale-95'}`}
            >
              {/* 發送圖示 */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-center text-[10px] text-gray-500 mt-2 font-mono">POWERED BY GEMINI NEURAL NET</p>
      </form>
    </div>
  );
}
