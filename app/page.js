"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import AvatarStage from "./components/AvatarVRM/AvatarStage"; 
import CompassCreator from "./components/Creator/CompassCreator";
import ChatHUD from "./components/HUD/ChatHUD";

const SAFE_STORAGE_KEY = "my_ai_character";
function safeSave(data) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SAFE_STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
}
function safeLoad() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(SAFE_STORAGE_KEY)); } catch (e) { return null; }
}

function BootScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) { clearInterval(timer); setTimeout(onComplete, 500); return 100; }
        return old + Math.random() * 15;
      });
    }, 150);
    return () => clearInterval(timer);
  }, [onComplete]);
  return (
    <div className="flex flex-col items-center justify-center h-full bg-black font-mono z-50">
      <div className="w-64">
        <h1 className="text-blue-400 text-xs tracking-[0.3em] mb-2 animate-pulse">SYSTEM INITIALIZING...</h1>
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] transition-all duration-200 ease-out" style={{ width: `${progress}%` }} /></div>
        <div className="text-[10px] text-gray-500 mt-2 h-4 overflow-hidden">{progress < 100 ? `LOADING MODULE: 0x${Math.floor(progress * 1234).toString(16)}` : "COMPLETE"}</div>
      </div>
    </div>
  );
}

function SystemExtracting() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="absolute inset-4 border-4 border-t-cyan-400 rounded-full animate-spin-reverse opacity-70"></div>
      </div>
      <h2 className="text-xl font-bold text-white tracking-widest animate-pulse">AI 系統啟動提取中...</h2>
      <p className="text-blue-400 text-xs mt-2 font-mono">DOWNLOADING NEURAL MODEL...</p>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState("boot"); 
  const [email, setEmail] = useState("");
  const [tempConfig, setTempConfig] = useState(null); 
  const [finalCharacter, setFinalCharacter] = useState(null); 
  const [isClient, setIsClient] = useState(false);
  const [isEmailExiting, setIsEmailExiting] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isApproaching, setIsApproaching] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      let saved = safeLoad();
      if (saved && saved.email) {
        if (saved.model === "C1") { saved.model = "avatar_01"; safeSave(saved); }
        if (saved.model === "C2") { saved.model = "avatar_02"; safeSave(saved); }
        setFinalCharacter(saved);
        setStep("chat");
        setIsUnlocked(true);
      }
    } catch (e) {}
  }, []);

  if (!isClient) return <div className="bg-black h-screen"></div>;

  const handleBootComplete = () => { setStep("email"); };
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return alert("請輸入信箱以連結神經網路！");
    setIsEmailExiting(true);
    setTimeout(() => { setStep("extracting"); }, 800);
  };
  const handleModelReady = () => {
    if (step === "extracting") { setTimeout(() => { setStep("create"); }, 1500); }
    setIsModelReady(true);
  };
  const handleConfigChange = (newConfig) => { setTempConfig(newConfig); };

  const handleFinishCreate = () => {
    try {
      const configToSave = tempConfig || { model: "avatar_01", personality: "warm" };
      const newCharacter = { email, name: "My AI Buddy", ...configToSave, createdAt: new Date().toISOString() };
      safeSave(newCharacter);
      setFinalCharacter(newCharacter);

      setIsApproaching(true);
      setIsUnlocked(true);

      setTimeout(() => {
        setStep("chat");
        setIsApproaching(false);
      }, 2000);

    } catch (error) { alert("Error: " + error.message); }
  };

  const handleReset = () => {
    if(confirm("確定要重置系統嗎？所有記憶將被清除。")) {
        localStorage.removeItem(SAFE_STORAGE_KEY);
        setFinalCharacter(null);
        setEmail("");
        setStep("boot"); 
        setIsEmailExiting(false);
        setIsUnlocked(false); 
        setIsModelReady(false);
        setIsApproaching(false);
    }
  };

  let currentModelId = step === 'create' ? (tempConfig?.model || "avatar_01") : (finalCharacter?.model || "avatar_01");
  if (currentModelId === "C1") currentModelId = "avatar_01";
  if (currentModelId === "C2") currentModelId = "avatar_02";
  const currentEmotion = (step === 'create' ? tempConfig?.personality : finalCharacter?.personality) === 'cool' ? 'neutral' : 'happy';

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      {step === "boot" && <BootScreen onComplete={handleBootComplete} />}

      {step === "email" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6">
          <div className={`w-full max-w-md bg-gray-900/80 p-8 rounded-3xl border border-blue-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(59,130,246,0.2)] transition-all duration-700 ease-in-out ${isEmailExiting ? "scale-0 opacity-0 translate-y-20 filter blur-xl" : "scale-100 opacity-100 animate-fadeIn"}`}>
            <h1 className="text-2xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 tracking-wider">SYSTEM LOGIN</h1>
            <p className="text-gray-400 text-xs text-center mb-8 font-mono">請綁定您的 ID (Email) 以連結神經網路</p>
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl opacity-30 group-hover:opacity-100 transition duration-500 blur"></div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="relative w-full bg-black border border-gray-700 rounded-xl py-4 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" required />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.5)] active:scale-95 flex justify-center items-center gap-2"><span>確認連結</span><span className="text-xs">CONNECT</span></button>
            </form>
          </div>
        </div>
      )}

      {step === "extracting" && <SystemExtracting />}

      {(step === 'extracting' || step === 'create' || step === 'chat') && (
        <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${(step === 'extracting' && !isModelReady) ? 'opacity-0' : 'opacity-100'}`}>
          <Suspense fallback={null}>
            <AvatarStage 
              vrmId={currentModelId}
              emotion={currentEmotion}
              unlocked={isUnlocked} 
              isApproaching={isApproaching}
              onModelReady={handleModelReady} 
            />
          </Suspense>
        </div>
      )}

      {step === "create" && (
        <div className={`absolute inset-0 z-10 flex flex-col justify-end pointer-events-none transition-all duration-700 ${isApproaching ? "opacity-0 translate-y-20" : "opacity-100"}`}>
          <div className="absolute top-24 w-full text-center pointer-events-none">
             <span className="bg-blue-500/10 text-blue-300 text-[10px] px-3 py-1 rounded-full border border-blue-500/20 backdrop-blur animate-pulse">⚠️ 實體化數據不足，僅顯示全像投影</span>
          </div>
          <div className="w-full px-6 mb-2 flex justify-between items-end pointer-events-auto z-20 relative top-4">
             <div><h2 className="text-xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">角色設定</h2><p className="text-[10px] text-cyan-400 tracking-widest font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">SYSTEM CONSOLE</p></div>
             <button onClick={handleFinishCreate} className="group bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-full font-bold shadow-[0_0_15px_rgba(37,99,235,0.5)] active:scale-95 flex items-center gap-2 cursor-pointer border border-blue-400/30">
               <span className="text-sm">完成</span><span className="group-hover:translate-x-1 transition-transform">➜</span>
             </button>
          </div>
          <div className="w-full pointer-events-auto relative">
             <div className="absolute inset-0 bg-gradient-to-t from-[#02020a] via-[#0a0a1a]/90 to-transparent border-t border-cyan-500/30 shadow-[0_-10px_30px_rgba(0,255,255,0.1)] backdrop-blur-xl clip-path-console-top"></div>
             <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
             <div className="relative z-10 pt-6 pb-safe-bottom"><CompassCreator onChange={handleConfigChange} /></div>
          </div>
        </div>
      )}

      {step === "chat" && finalCharacter && (
        <div className="relative z-10 w-full h-full animate-fadeIn pointer-events-none">
           <div className="pointer-events-auto w-full h-full">
             <ChatHUD />
             <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                <button onClick={handleReset} className="bg-red-900/50 text-white/50 text-[10px] px-2 py-1 rounded hover:text-white backdrop-blur-sm">RESET SYSTEM</button>
             </div>
           </div>
        </div>
      )}
    </main>
  );
}
