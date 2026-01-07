// app/page.js
"use client";

import { useState, useEffect, Suspense } from "react";
// 🌟 改用 AvatarStage (舞台版)
import AvatarStage from "./components/AvatarVRM/AvatarStage"; 
import CompassCreator from "./components/Creator/CompassCreator";
import ChatHUD from "./components/HUD/ChatHUD";

// --- 安全存檔 ---
const SAFE_STORAGE_KEY = "my_ai_character";
function safeSave(data) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SAFE_STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
}
function safeLoad() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(SAFE_STORAGE_KEY)); } catch (e) { return null; }
}

export default function Home() {
  const [step, setStep] = useState("loading");
  const [email, setEmail] = useState("");
  const [tempConfig, setTempConfig] = useState(null); 
  const [finalCharacter, setFinalCharacter] = useState(null); 
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const saved = safeLoad();
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

  if (!isClient) return <div className="bg-black h-screen"></div>;

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return alert("請輸入信箱喔！");
    setStep("create");
  };

  const handleConfigChange = (newConfig) => {
    setTempConfig(newConfig);
  };

  const handleFinishCreate = () => {
    try {
      const configToSave = tempConfig || { model: "C1", personality: "warm" };
      const newCharacter = {
        email: email,
        name: "My AI Buddy",
        ...configToSave,
        createdAt: new Date().toISOString()
      };
      safeSave(newCharacter);
      setFinalCharacter(newCharacter);
      setStep("chat");
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleReset = () => {
    if(confirm("確定要重置嗎？")) {
        localStorage.removeItem(SAFE_STORAGE_KEY);
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
      
      {step === "email" && (
        <div className="flex flex-col items-center justify-center h-full px-6 animate-fadeIn z-20 relative">
          <div className="w-full max-w-md bg-gray-900/80 p-8 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
            <h1 className="text-2xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">IVAN LINK</h1>
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full bg-black/40 border border-gray-600 rounded-xl py-4 px-4 text-white" required />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95">下一步 ➜</button>
            </form>
          </div>
        </div>
      )}

      {/* 3D 背景層 */}
      {(step === 'create' || step === 'chat') && (
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-gray-900 to-black">
          <Suspense fallback={<div className="text-white/20 text-center pt-20">Loading...</div>}>
            {/* 🌟 這裡呼叫的是 AvatarStage，它包含了 Canvas 和運鏡邏輯 */}
            <AvatarStage 
              vrmId={currentModelId}
              emotion={currentEmotion}
            />
          </Suspense>
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
        </div>
      )}

      {/* 選角 UI */}
      {step === "create" && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end pb-safe-bottom pointer-events-none">
          <div className="w-full px-6 mb-4 flex justify-between items-end animate-slideUp pointer-events-auto">
             <div><h2 className="text-xl font-bold text-white">角色設定</h2><p className="text-[10px] text-blue-400 tracking-widest font-bold">CUSTOMIZE</p></div>
             <button onClick={handleFinishCreate} className="group bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-full font-bold shadow-lg active:scale-95 flex items-center gap-2 z-50 cursor-pointer">
               <span className="text-sm">完成</span><span className="group-hover:translate-x-1 transition-transform">➜</span>
             </button>
          </div>
          <div className="w-full pointer-events-auto bg-gradient-to-t from-black to-transparent pt-4">
             <CompassCreator onChange={handleConfigChange} />
          </div>
        </div>
      )}

      {/* 聊天 UI */}
      {step === "chat" && finalCharacter && (
        <div className="relative z-10 w-full h-full animate-fadeIn pointer-events-none">
           <div className="pointer-events-auto w-full h-full">
             <ChatHUD />
             <button onClick={handleReset} className="absolute top-4 left-4 z-50 text-[10px] text-white/20 hover:text-white/80">RESET</button>
           </div>
        </div>
      )}
    </main>
  );
}
