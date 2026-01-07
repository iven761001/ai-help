// app/page.js
"use client";

import { useState, useEffect, Suspense } from "react";
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

// --- 過場動畫組件 (保持不變) ---
function BootScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return old + Math.random() * 15;
      });
    }, 150);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black font-mono z-50">
      <div className="w-64">
        <h1 className="text-blue-400 text-xs tracking-[0.3em] mb-2 animate-pulse">SYSTEM INITIALIZING...</h1>
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] transition-all duration-200 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-[10px] text-gray-500 mt-2 h-4 overflow-hidden">
          {progress < 100 ? `LOADING MODULE: 0x${Math.floor(progress * 1234).toString(16)}` : "COMPLETE"}
        </div>
      </div>
    </div>
  );
}

function SystemExtracting() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
      <h2 className="text-xl font-bold text-white tracking-widest animate-pulse">AI 系統啟動提取中...</h2>
      <p className="text-blue-400 text-xs mt-2 font-mono">SYNCING DATA...</p>
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

  // 🌟 新增：解鎖狀態 (預設是 false = 全像投影)
  // 未來這個狀態可以存進 localStorage，記住使用者已經解鎖了
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const saved = safeLoad();
      if (saved && saved.email) {
        setFinalCharacter(saved);
        setStep("chat");
        // 如果是舊用戶，假設已經解鎖 (或是也要讀取 saved.isUnlocked)
        // setIsUnlocked(true); // 👈 如果希望舊用戶直接是實體，把這行打開
      }
    } catch (e) {}
  }, []);

  if (!isClient) return <div className="bg-black h-screen"></div>;

  const handleBootComplete = () => setStep("email");

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return alert("請輸入信箱喔！");
    setIsEmailExiting(true);
    setTimeout(() => {
      setStep("extracting");
      setTimeout(() => setStep("create"), 2500); 
    }, 800);
  };

  const handleConfigChange = (newConfig) => setTempConfig(newConfig);

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
    if(confirm("確定要重置嗎？系統將重新啟動。")) {
        localStorage.removeItem(SAFE_STORAGE_KEY);
        setFinalCharacter(null);
        setEmail("");
        setStep("boot"); 
        setIsEmailExiting(false);
        setIsUnlocked(false); // 重置時也鎖回去
    }
  };

  // 🌟 模擬達成任務的函數
  const handleMissionComplete = () => {
    // 這裡可以加一些特效音效或慶祝動畫
    alert("✨ 任務達成！身體組件已傳輸完畢！ ✨");
    setIsUnlocked(true);
  };

  const currentModelId = step === 'create' 
    ? (tempConfig?.model || "C1") 
    : (finalCharacter?.model || "C1");

  const currentEmotion = (step === 'create' ? tempConfig?.personality : finalCharacter?.personality) === 'cool' 
    ? 'neutral' : 'happy';

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* 1. 開機動畫 */}
      {step === "boot" && <BootScreen onComplete={handleBootComplete} />}

      {/* 2. Email */}
      {step === "email" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6">
          <div className={`w-full max-w-md bg-gray-900/80 p-8 rounded-3xl border border-blue-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(59,130,246,0.2)] transition-all duration-700 ease-in-out ${isEmailExiting ? "scale-0 opacity-0 translate-y-20 filter blur-xl" : "scale-100 opacity-100 animate-fadeIn"}`}>
            <h1 className="text-2xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 tracking-wider">SYSTEM LOGIN</h1>
            <p className="text-gray-400 text-xs text-center mb-8 font-mono">請綁定您的 ID (Email) 以連結神經網路</p>
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full bg-black border border-gray-700 rounded-xl py-4 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all" required />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.5)] active:scale-95 flex justify-center items-center gap-2"><span>確認連結</span><span className="text-xs">CONNECT</span></button>
            </form>
          </div>
        </div>
      )}

      {/* 3. 提取過場 */}
      {step === "extracting" && <SystemExtracting />}

      {/* 4. 3D 背景層 (核心) */}
      {(step === 'extracting' || step === 'create' || step === 'chat') && (
        <div className={`absolute inset-0 z-0 bg-gradient-to-b from-gray-900 to-black transition-opacity duration-1000 ${step === 'extracting' ? 'opacity-0' : 'opacity-100'}`}>
          <Suspense fallback={null}>
            {/* 🌟 傳入 unlocked 狀態，控制變身 */}
            <AvatarStage 
              vrmId={currentModelId}
              emotion={currentEmotion}
              unlocked={isUnlocked} 
            />
          </Suspense>
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
        </div>
      )}

      {/* 5. 選角 UI */}
      {step === "create" && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end pb-safe-bottom pointer-events-none animate-fadeIn">
          {/* 選角時，提示使用者目前是投影狀態 */}
          <div className="absolute top-20 w-full text-center pointer-events-none">
             <span className="bg-blue-500/20 text-blue-300 text-[10px] px-3 py-1 rounded-full border border-blue-500/30 backdrop-blur animate-pulse">
                ⚠️ 實體化數據不足，僅顯示全像投影
             </span>
          </div>

          <div className="w-full px-6 mb-4 flex justify-between items-end pointer-events-auto">
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

      {/* 6. 聊天 UI */}
      {step === "chat" && finalCharacter && (
        <div className="relative z-10 w-full h-full animate-fadeIn pointer-events-none">
           <div className="pointer-events-auto w-full h-full">
             <ChatHUD />
             
             {/* 測試按鈕區 */}
             <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                <button onClick={handleReset} className="bg-red-900/50 text-white/50 text-[10px] px-2 py-1 rounded hover:text-white">
                    RESET
                </button>

                {/* 🌟 測試解鎖按鈕 (只在未解鎖時顯示) */}
                {!isUnlocked && (
                    <button 
                        onClick={handleMissionComplete} 
                        className="bg-yellow-600/80 text-white text-xs px-3 py-2 rounded-full shadow-lg border border-yellow-400/50 hover:bg-yellow-500 animate-bounce"
                    >
                        🏆 模擬達成任務 (解鎖身體)
                    </button>
                )}
             </div>
           </div>
        </div>
      )}
    </main>
  );
}
