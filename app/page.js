// app/page.js
"use client";

import { useState, useEffect, Suspense } from "react"; // 👈 1. 引入 Suspense

import Avatar3D from "./components/AvatarVRM/Avatar3D";
import CompassCreator from "./components/Creator/CompassCreator";
import ChatHUD from "./components/HUD/ChatHUD";
import { getCharacter, saveCharacter } from "./lib/storage"; 

export default function Home() {
  const [step, setStep] = useState("loading");
  
  const [email, setEmail] = useState("");
  const [tempConfig, setTempConfig] = useState(null); 
  const [finalCharacter, setFinalCharacter] = useState(null); 

  useEffect(() => {
    try {
      const saved = getCharacter();
      if (saved && saved.email) {
        setFinalCharacter(saved);
        setStep("chat");
      } else {
        setStep("email");
      }
    } catch (e) {
      console.error("Storage error:", e);
      setStep("email");
    }
  }, []);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return alert("請輸入信箱喔！");
    setStep("create");
  };

  const handleConfigChange = (newConfig) => {
    setTempConfig(newConfig);
  };

  const handleFinishCreate = () => {
    // 這裡做個安全檢查，如果使用者手太快，預設值還沒載入，就用預設的
    const configToSave = tempConfig || { model: "C1", personality: "warm" };

    const newCharacter = {
      email: email,
      name: "My AI Buddy",
      ...configToSave,
      createdAt: new Date().toISOString()
    };

    saveCharacter(newCharacter);
    setFinalCharacter(newCharacter);
    setStep("chat");
  };

  const handleReset = () => {
    localStorage.removeItem("my_ai_character");
    setFinalCharacter(null);
    setEmail("");
    setStep("email");
  };

  // 🌟 安全的 VRM ID 取得邏輯
  // 如果是選角模式 (create)，就看 tempConfig，還沒載入就給 "C1"
  // 如果是聊天模式 (chat)，就看 finalCharacter
  const currentModelId = step === 'create' 
    ? (tempConfig?.model || "C1") 
    : (finalCharacter?.model || "C1");

  const currentEmotion = (step === 'create' ? tempConfig?.personality : finalCharacter?.personality) === 'cool' 
    ? 'neutral' 
    : 'happy';

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* --- 共用背景層 (3D 角色) --- */}
      {(step === 'create' || step === 'chat') && (
        <div className="absolute inset-0 z-0">
          
          {/* 🌟 2. 加上 Suspense 等待區 */}
          {/* fallback={null} 代表載入時不顯示額外東西（或妳可以放 Loading 文字） */}
          <Suspense fallback={<div className="text-white/20 p-10">載入模型中...</div>}>
            <Avatar3D 
              vrmId={currentModelId}
              emotion={currentEmotion}
              action="idle" 
            />
          </Suspense>

          <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />
        </div>
      )}

      {/* --- UI 內容層 --- */}
      <div className="relative z-10 w-full h-full pointer-events-none">
        <div className="pointer-events-auto w-full h-full">

          {/* 1. Loading 畫面 */}
          {step === "loading" && (
             <div className="flex items-center justify-center h-full text-blue-400 animate-pulse">
               系統啟動中...
             </div>
          )}

          {/* 2. 信箱綁定頁 (Email) */}
          {step === "email" && (
            <div className="flex flex-col items-center justify-center h-full px-6 bg-gray-900 animate-fadeIn">
              <div className="w-full max-w-md bg-gray-800/50 p-8 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    IVAN LINK
                  </h1>
                  <p className="text-gray-400 text-sm mt-2">請綁定您的專屬信箱以啟動</p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-6">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">📧</span>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-black/40 border border-gray-600 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2"
                  >
                    下一步 <span>→</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 3. 選角頁 (Creator) */}
          {step === "create" && (
            <div className="absolute inset-0 flex flex-col justify-end pb-safe-bottom">
              <div className="w-full px-6 mb-4 flex justify-between items-end animate-slideUp">
                 <div>
                    <h2 className="text-xl font-bold text-white/90">角色設定</h2>
                    <p className="text-[10px] text-blue-400 tracking-[0.2em] font-bold mt-1">CUSTOMIZE</p>
                 </div>
                 
                 <button
                   onClick={handleFinishCreate}
                   className="group bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-full font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
                 >
                   <span className="text-sm">完成設定</span>
                   <span className="group-hover:translate-x-1 transition-transform">→</span>
                 </button>
              </div>

              <div className="w-full bg-gradient-to-t from-black to-transparent pt-4">
                 <CompassCreator onChange={handleConfigChange} />
              </div>
            </div>
          )}

          {/* 4. 聊天頁 (Chat) */}
          {step === "chat" && finalCharacter && (
            <div className="relative w-full h-full animate-fadeIn">
               <ChatHUD />
               
               <button 
                 onClick={handleReset}
                 className="absolute top-4 left-4 z-50 text-[10px] text-white/20 hover:text-white/80"
               >
                 RESET
               </button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
