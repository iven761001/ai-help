// app/page.js
"use client";

import { useState, useEffect, Suspense } from "react";
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
    if(confirm("確定要重置嗎？")) {
        localStorage.removeItem("my_ai_character");
        setFinalCharacter(null);
        setEmail("");
        setStep("email");
    }
  };

  const currentModelId = step === 'create' 
    ? (tempConfig?.model || "C1") 
    : (finalCharacter?.model || "C1");

  const currentEmotion = (step === 'create' ? tempConfig?.personality : finalCharacter?.personality) === 'cool' 
    ? 'neutral' : 'happy';

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* 1. Loading */}
      {step === "loading" && (
         <div className="flex items-center justify-center h-full text-blue-400">Loading...</div>
      )}

      {/* 2. Email 頁面 */}
      {step === "email" && (
        <div className="flex flex-col items-center justify-center h-full px-6 animate-fadeIn z-20 relative">
          <div className="w-full max-w-md bg-gray-900/80 p-8 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
            <h1 className="text-2xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              IVAN LINK
            </h1>
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-black/40 border border-gray-600 rounded-xl py-4 px-4 text-white"
                required
              />
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
              >
                下一步 ➜
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. 3D 背景層 (Create & Chat 共用) */}
      {(step === 'create' || step === 'chat') && (
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-gray-900 to-black">
          <Suspense fallback={<div className="text-white/30 text-center pt-20">載入模型中...</div>}>
            <Avatar3D 
              key={currentModelId} // 確保切換模型時重新渲染
              vrmId={currentModelId}
              emotion={currentEmotion}
            />
          </Suspense>
          {/* 底部漸層，讓 UI 比較清楚 */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
        </div>
      )}

      {/* 4. 選角 UI */}
      {step === "create" && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end pb-safe-bottom pointer-events-none">
          {/* 上半部：按鈕區 (允許互動) */}
          <div className="w-full px-6 mb-4 flex justify-between items-end animate-slideUp pointer-events-auto">
             <div>
                <h2 className="text-xl font-bold text-white">角色設定</h2>
                <p className="text-[10px] text-blue-400 tracking-widest font-bold">CUSTOMIZE</p>
             </div>
             
             {/* 🌟 漂亮的完成按鈕 */}
             <button
               onClick={handleFinishCreate}
               className="group bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-full font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2 z-50"
             >
               <span className="text-sm">完成</span>
               <span className="group-hover:translate-x-1 transition-transform">➜</span>
             </button>
          </div>

          {/* 下半部：轉輪區 (允許互動) */}
          <div className="w-full pointer-events-auto bg-gradient-to-t from-black to-transparent pt-4">
             <CompassCreator onChange={handleConfigChange} />
          </div>
        </div>
      )}

      {/* 5. 聊天 UI */}
      {step === "chat" && finalCharacter && (
        <div className="relative z-10 w-full h-full animate-fadeIn pointer-events-none">
           {/* ChatHUD 內部已經有 pointer-events-auto */}
           <div className="pointer-events-auto w-full h-full">
             <ChatHUD />
             <button 
               onClick={handleReset}
               className="absolute top-4 left-4 z-50 text-[10px] text-white/20 hover:text-white/80"
             >
               RESET
             </button>
           </div>
        </div>
      )}

    </main>
  );
}
