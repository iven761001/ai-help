// app/page.js
"use client";

import { useState, useEffect, Suspense } from "react";
// 引入我們剛修好的舞台
import AvatarStage from "./components/AvatarVRM/AvatarStage"; 
import CompassCreator from "./components/Creator/CompassCreator";
import ChatHUD from "./components/HUD/ChatHUD";

// --- 存檔工具 ---
const SAFE_STORAGE_KEY = "my_ai_character";
function safeSave(data) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SAFE_STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
}
function safeLoad() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(SAFE_STORAGE_KEY)); } catch (e) { return null; }
}

// --- 1. 開機動畫 (Boot Screen) ---
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
        <h1 className="text-blue-400 text-xs tracking-[0.3em] mb-2 animate-pulse">
          SYSTEM INITIALIZING...
        </h1>
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-[10px] text-gray-500 mt-2 h-4 overflow-hidden">
          {progress < 100 ? `LOADING MODULE: 0x${Math.floor(progress * 1234).toString(16)}` : "COMPLETE"}
        </div>
      </div>
    </div>
  );
}

// --- 2. 系統提取過場 (Loading Overlay) ---
function SystemExtracting() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="absolute inset-4 border-4 border-t-cyan-400 rounded-full animate-spin-reverse opacity-70"></div>
      </div>
      <h2 className="text-xl font-bold text-white tracking-widest animate-pulse">
        AI 系統啟動提取中...
      </h2>
      <p className="text-blue-400 text-xs mt-2 font-mono">SYNCING NEURAL DATA...</p>
    </div>
  );
}

export default function Home() {
  // 狀態流程： 'boot' -> 'email' -> 'extracting' -> 'create' -> 'chat'
  const [step, setStep] = useState("boot"); 
  const [email, setEmail] = useState("");
  const [tempConfig, setTempConfig] = useState(null); 
  const [finalCharacter, setFinalCharacter] = useState(null); 
  const [isClient, setIsClient] = useState(false);
  
  // UI 動畫控制
  const [isEmailExiting, setIsEmailExiting] = useState(false);

  // 🌟 關鍵：解鎖狀態 (預設 false = 掃描/全像狀態)
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // 檢查存檔
    try {
      const saved = safeLoad();
      if (saved && saved.email) {
        setFinalCharacter(saved);
        setStep("chat");
        // 如果是舊用戶，是否要直接解鎖？這裡先設為 false 讓妳可以測試解鎖特效
        // setIsUnlocked(true); 
      }
    } catch (e) {}
  }, []);

  if (!isClient) return <div className="bg-black h-screen"></div>;

  // --- 事件處理 ---

  const handleBootComplete = () => {
    setStep("email");
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return alert("請輸入信箱以連結神經網路！");
    
    // 1. 觸發 Email 視窗縮小動畫
    setIsEmailExiting(true);

    // 2. 0.8秒後進入提取畫面
    setTimeout(() => {
      setStep("extracting");
      
      // 3. 2.5秒後進入選角畫面 (這時候 3D 應該已經在背景預載好了)
      setTimeout(() => {
        setStep("create");
      }, 2500); 
    }, 800);
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
      
      // 進入聊天室
      setStep("chat");
      
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleReset = () => {
    if(confirm("確定要重置系統嗎？所有記憶將被清除。")) {
        localStorage.removeItem(SAFE_STORAGE_KEY);
        setFinalCharacter(null);
        setEmail("");
        setStep("boot"); 
        setIsEmailExiting(false);
        setIsUnlocked(false); // 重置解鎖狀態
    }
  };

  // 🌟 模擬達成任務 (解鎖按鈕邏輯)
  const handleMissionComplete = () => {
    // 這裡未來可以接 API 或 QR Code 掃描結果
    alert("✨ 任務目標達成！身體組件下載完畢！ ✨");
    setIsUnlocked(true); // 觸發變身！
  };

  // 計算當前要顯示的模型參數
  const currentModelId = step === 'create' 
    ? (tempConfig?.model || "C1") 
    : (finalCharacter?.model || "C1");

  const currentEmotion = (step === 'create' ? tempConfig?.personality : finalCharacter?.personality) === 'cool' 
    ? 'neutral' : 'happy';

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* --- 1. 開機層 --- */}
      {step === "boot" && <BootScreen onComplete={handleBootComplete} />}

      {/* --- 2. Email 層 --- */}
      {step === "email" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6">
          <div 
            className={`
              w-full max-w-md bg-gray-900/80 p-8 rounded-3xl border border-blue-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(59,130,246,0.2)]
              transition-all duration-700 ease-in-out
              ${isEmailExiting ? "scale-0 opacity-0 translate-y-20 filter blur-xl" : "scale-100 opacity-100 animate-fadeIn"}
            `}
          >
            <h1 className="text-2xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 tracking-wider">
              SYSTEM LOGIN
            </h1>
            <p className="text-gray-400 text-xs text-center mb-8 font-mono">
              請綁定您的 ID (Email) 以連結神經網路
            </p>

            <form onSubmit={handleEmailSubmit} className="space-y-6">
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
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.5)] active:scale-95 flex justify-center items-center gap-2"
              >
                <span>確認連結</span>
                <span className="text-xs">CONNECT</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- 3. 提取過場層 --- */}
      {step === "extracting" && <SystemExtracting />}

      {/* --- 4. 3D 舞台層 (核心) --- */}
      {/* 在 extracting, create, chat 時都存在，確保過場流暢 */}
      {(step === 'extracting' || step === 'create' || step === 'chat') && (
        <div className={`
            absolute inset-0 z-0 bg-gradient-to-b from-gray-900 to-black 
            transition-opacity duration-1000 
            ${step === 'extracting' ? 'opacity-0' : 'opacity-100'}
        `}>
          <Suspense fallback={null}>
            {/* 🌟 這裡將 isUnlocked 傳給舞台，舞台再傳給 Avatar3D */}
            <AvatarStage 
              vrmId={currentModelId}
              emotion={currentEmotion}
              unlocked={isUnlocked} 
            />
          </Suspense>
          
          {/* 底部漸層遮罩 (讓 UI 更清楚) */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
        </div>
      )}

      {/* --- 5. 選角 UI --- */}
      {step === "create" && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end pb-safe-bottom pointer-events-none animate-fadeIn">
          
          {/* 頂部提示：投影中 */}
          <div className="absolute top-24 w-full text-center pointer-events-none">
             <span className="bg-blue-500/10 text-blue-300 text-[10px] px-3 py-1 rounded-full border border-blue-500/20 backdrop-blur animate-pulse">
                ⚠️ 實體化數據不足，僅顯示全像投影
             </span>
          </div>

          <div className="w-full px-6 mb-4 flex justify-between items-end pointer-events-auto">
             <div>
                <h2 className="text-xl font-bold text-white">角色設定</h2>
                <p className="text-[10px] text-blue-400 tracking-widest font-bold">CUSTOMIZE</p>
             </div>
             
             <button onClick={handleFinishCreate} className="group bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-full font-bold shadow-lg active:scale-95 flex items-center gap-2 z-50 cursor-pointer">
               <span className="text-sm">完成</span>
               <span className="group-hover:translate-x-1 transition-transform">➜</span>
             </button>
          </div>

          <div className="w-full pointer-events-auto bg-gradient-to-t from-black to-transparent pt-4">
             <CompassCreator onChange={handleConfigChange} />
          </div>
        </div>
      )}

      {/* --- 6. 聊天 UI --- */}
      {step === "chat" && finalCharacter && (
        <div className="relative z-10 w-full h-full animate-fadeIn pointer-events-none">
           <div className="pointer-events-auto w-full h-full">
             <ChatHUD />
             
             {/* 測試按鈕區 */}
             <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                <button 
                    onClick={handleReset} 
                    className="bg-red-900/50 text-white/50 text-[10px] px-2 py-1 rounded hover:text-white backdrop-blur-sm"
                >
                    RESET SYSTEM
                </button>

                {/* 🌟 只有在「未解鎖」時才顯示這個按鈕 */}
                {!isUnlocked && (
                    <button 
                        onClick={handleMissionComplete} 
                        className="bg-yellow-600/90 text-white text-xs px-4 py-2 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)] border border-yellow-400/50 hover:bg-yellow-500 active:scale-95 transition-all animate-bounce"
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
