"use client";

import { useState } from "react";

export default function ChatHUD() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "系統連線成功。我是妳的專屬 AI 夥伴，請多指教！" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 1. 加入使用者訊息
    const newMsgs = [...messages, { role: "user", text: input }];
    setMessages(newMsgs);
    setInput("");

    // 2. 模擬 AI 回應 (之後這裡會接真正的 AI API)
    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { role: "ai", text: "收到！我正在學習這段對話..." }
      ]);
    }, 1000);
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-end pointer-events-none pb-safe-bottom">
      
      {/* 訊息顯示區 */}
      <div className="w-full px-6 mb-4 max-h-[40vh] overflow-y-auto space-y-3 pointer-events-auto no-scrollbar mask-gradient-top">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div 
              className={`
                max-w-[80%] px-4 py-2 rounded-2xl text-sm backdrop-blur-sm
                ${msg.role === "user" 
                  ? "bg-blue-600/80 text-white rounded-br-none" 
                  : "bg-gray-800/80 text-blue-100 border border-blue-500/30 rounded-bl-none"}
              `}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* 輸入區 */}
      <div className="w-full bg-gradient-to-t from-black via-black/90 to-transparent p-6 pointer-events-auto">
        <form onSubmit={handleSend} className="relative flex items-center gap-2">
           <input 
             type="text"
             value={input}
             onChange={(e) => setInput(e.target.value)}
             placeholder="輸入訊息..."
             className="w-full bg-gray-900/50 border border-gray-700 rounded-full px-5 py-3 text-white focus:outline-none focus:border-blue-500 focus:bg-gray-900/80 transition-all backdrop-blur-md"
           />
           <button 
             type="submit"
             className="bg-blue-600 p-3 rounded-full text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] active:scale-95"
           >
             ➤
           </button>
        </form>
      </div>

    </div>
  );
}
