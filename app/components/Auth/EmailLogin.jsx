"use client";
import { useState } from "react";

export default function EmailLogin({ onSubmit }) {
  const [email, setEmail] = useState("");
  const [isExiting, setIsExiting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return alert("請輸入信箱以連結神經網路！");
    
    setIsExiting(true);
    // 等待動畫結束後呼叫父層
    setTimeout(() => {
      onSubmit(email);
    }, 800);
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6">
      <div className={`w-full max-w-md bg-gray-900/80 p-8 rounded-3xl border border-blue-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(59,130,246,0.2)] transition-all duration-700 ease-in-out ${isExiting ? "scale-0 opacity-0 translate-y-20 filter blur-xl" : "scale-100 opacity-100 animate-fadeIn"}`}>
        <h1 className="text-2xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 tracking-wider">SYSTEM LOGIN</h1>
        <p className="text-gray-400 text-xs text-center mb-8 font-mono">請綁定您的 ID (Email) 以連結神經網路</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl opacity-30 group-hover:opacity-100 transition duration-500 blur"></div>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="name@example.com" 
              className="relative w-full bg-black border border-gray-700 rounded-xl py-4 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
              required 
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.5)] active:scale-95 flex justify-center items-center gap-2">
            <span>確認連結</span><span className="text-xs">CONNECT</span>
          </button>
        </form>
      </div>
    </div>
  );
}
