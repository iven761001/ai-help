"use client";

import { useState, useEffect, useRef } from "react";

// --- 子元件：打字機文字 ---
function Typewriter({ text, onComplete }) {
  const [display, setDisplay] = useState("");
  
  useEffect(() => {
    let i = 0;
    // 每次字串改變時重置
    setDisplay(""); 
    
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplay((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, 30); // 打字速度 (越小越快)

    return () => clearInterval(timer);
  }, [text]);

  return <span>{display}</span>;
}

// --- 子元件：AI 語音波紋 (視覺裝飾) ---
function AudioWave({ isActive }) {
  return (
    <div className={`flex items-end gap-[2px] h-3 transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-0"}`}>
      {[...Array(5)].map((_, i) => (
        <div 
          key={i} 
          className="w-[3px] bg-cyan-400 rounded-full"
          style={{ 
            height: isActive ? "100%" : "20%",
            animation: isActive ? `wave 0.5s ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 0.1}s` 
          }} 
        />
      ))}
      <style jsx>{`
        @keyframes wave {
          0% { height: 20%; opacity: 0.5; }
          100% { height: 100%; opacity: 1; box-shadow: 0 0 5px #22d3ee; }
        }
      `}</style>
    </div>
  );
}

export default function ChatHUD() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "系統連線成功。我是妳的專屬 AI 夥伴，請多指教！", typing: true }
  ]);
  const [input, setInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(true); // 控制波紋

  const messagesEndRef = useRef(null);

  // 自動捲動到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setInput("");

    // 1. 顯示使用者訊息
    setMessages(prev => [...prev, { role: "user", text: userText }]);

    // 2. 模擬 AI 思考與回應
    setIsAiTyping(true);
    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { role: "ai", text: `收到！關於 "${userText}"，我正在分析資料庫...`, typing: true }
      ]);
    }, 800);
  };

  const handleTypingComplete = () => {
    setIsAiTyping(false);
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-end pointer-events-none pb-safe-bottom z-20">
      
      {/* 訊息顯示區 */}
      <div className="w-full px-4 mb-20 max-h-[50vh] overflow-y-auto space-y-4 pointer-events-auto no-scrollbar mask-gradient-top">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            
            {/* AI 頭像與波紋 (僅 AI 訊息顯示) */}
            {msg.role === "ai" && (
              <div className="mr-2 flex flex-col items-center justify-end pb-1">
                 <div className="w-6 h-6 rounded-full bg-cyan-900/80 border border-cyan-500/50 flex items-center justify-center text-[10px] text-cyan-200 mb-1">
                    AI
                 </div>
                 {/* 只有最新的一則 AI 訊息且正在打字時，才顯示波紋 */}
                 {idx === messages.length - 1 && msg.typing && <AudioWave isActive={true} />}
              </div>
            )}

            <div 
              className={`
                max-w-[75%] px-5 py-3 text-sm backdrop-blur-md border shadow-lg
                ${msg.role === "user" 
                  ? "bg-blue-600/20 border-blue-500/50 text-white rounded-2xl rounded-br-none" 
                  : "bg-gray-900/60 border-cyan-500/30 text-cyan-100 rounded-2xl rounded-bl-none"}
              `}
            >
              {msg.role === "ai" && msg.typing ? (
                <Typewriter text={msg.text} onComplete={idx === messages.length - 1 ? handleTypingComplete : null} />
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 輸入區 (玻璃擬態) */}
      <div className="absolute bottom-6 left-4 right-4 pointer-events-auto">
        <form onSubmit={handleSend} className="relative flex items-center gap-2">
           <div className="relative w-full group">
             <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full opacity-20 group-hover:opacity-50 transition blur"></div>
             <input 
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="輸入訊息..."
               className="relative w-full bg-black/60 border border-gray-700/50 rounded-full px-6 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-all backdrop-blur-xl"
             />
           </div>
           <button 
             type="submit"
             className="bg-cyan-600/80 hover:bg-cyan-500 p-3 rounded-full text-white shadow-[0_0_15px_rgba(34,211,238,0.4)] active:scale-95 border border-cyan-400/30 transition-all backdrop-blur-md"
           >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
             </svg>
           </button>
        </form>
      </div>

    </div>
  );
}
