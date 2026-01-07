// app/page.js
"use client";

import { useState, useEffect, Suspense } from "react";
import AvatarStage from "./components/AvatarVRM/AvatarStage";
import CompassCreator from "./components/Creator/CompassCreator";
import ChatHUD from "./components/HUD/ChatHUD";

// --- 安全存檔邏輯 ---
const SAFE_STORAGE_KEY = "my_ai_character";
function safeSave(data) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SAFE_STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
}
function safeLoad() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(SAFE_STORAGE_KEY)); } catch (e) { return null; }
}

// 🌟 新增組件：開機動畫 (Boot Screen)
function BootScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 模擬讀取進度條
    const timer = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500); // 跑完後停頓 0.5 秒進入下一頁
          return 100;
        }
        // 隨機增加進度，感覺比較像真的在跑
        return old + Math.random() * 15;
      });
    }, 150);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black font-mono z-50">
      <div className="w-64">
        {/* 閃爍的標題 */}
        <h1 className="text-blue-400 text-xs tracking-[0.3em] mb-2 animate-pulse">
          SYSTEM INITIALIZING...
        </h1>
        {/* 進度條外框 */}
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
          {/* 進度條本體 */}
          <div 
            className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* 隨機亂碼裝飾 */}
        <div className="text-[10px] text-gray-500 mt-2 h-4 overflow-hidden">
          {progress < 100 ? `LOADING MODULE: 0x${Math.floor(progress * 1234).toString(16)}` : "COMPLETE"}
        </div>
      </div>
    </div>
  );
}

// 🌟 新增組件：轉場過度頁 (Transition Overlay)
function SystemExtracting() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-fadeIn">
      {/* 旋轉的科技圈圈 */}
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="absolute inset-2 border-4 border-t-cyan-400 rounded-full animate-spin-reverse opacity-70"></div>
      </div>
      <h2 className="text-xl font-bold text-white tracking-widest animate-pulse">
        AI 系統啟動提取中...
      </h2>
      <p className="text-blue-400 text-xs mt-2 font-mono">SYNCING DATA...</p>
    </div>
  );
}

export default function Home() {
  // 狀態流程： 'boot' (開機) -> 'email' (輸入) -> 'extracting' (過場) -> 'create' (選角) -> 'chat' (聊天)
  const [step, setStep] = useState("boot"); 
  const [email, setEmail] = useState("");
  const [tempConfig, setTempConfig] = useState(null); 
  const [finalCharacter, setFinalCharacter] = useState(null); 
  const [isClient, setIsClient] = useState(false);
  
  //用來控制信箱視窗的「縮小特效」
  const [isEmailExiting, setIsEmailExiting] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // 檢查是否有存檔，如果有，直接跳過開機動畫去聊天
    try {
      const saved = safeLoad();
      if (saved && saved.email) {
        setFinalCharacter(saved);
        setStep("chat");
      }
    } catch (e) {}
  }, []);

  if (!isClient) return <div className="bg-black h-screen"></div>;

  // 1. 開機動畫結束 -> 進入 Email
  const handleBootComplete = () => {
    setStep("email");
  };

  // 2. Email 送出 -> 觸發縮小特效 -> 進入提取過場
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return alert("請輸入信箱喔！");
    
    // A. 先觸發縮小動畫
    setIsEmailExiting(true);

    // B. 等動畫跑完 (0.8秒) 後，切換到提取畫面
    setTimeout(() => {
      setStep("extracting");
      
      // C. 提取畫面停留 2 秒後 -> 進入選角
      setTimeout(() => {
        setStep("create");
      }, 2500); 
    }, 800);
  };

  // 3. 選角完成
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
    if(confirm("確定要重置嗎？系統將重新啟動。")) {
        localStorage.removeItem(SAFE_STORAGE_KEY);
        setFinalCharacter(null);
        setEmail("");
        setStep("boot"); // 重置後回到開機動畫
        setIsEmailExiting(false);
    }
  };

  const currentModelId = step === 'create' 
    ? (tempConfig?.model || "C1") 
    : (finalCharacter?.model || "C1");

  const currentEmotion = (step === 'create' ? tempConfig?.personality : finalCharacter?.personality) === 'cool' 
    ? 'neutral' : 'happy';

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* 1. 開機動畫層 */}
      {step === "boot" && <BootScreen onComplete={handleBootComplete} />}

      {/* 2. Email 層 */}
      {step === "email" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6">
          {/* Email 視窗本體 */}
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
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_30px_rgba(37,99,235,0.8)] transition-all active:scale-95 flex justify-center items-center gap-2"
              >
                <span>確認連結</span>
                <span className="text-xs">CONNECT</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. 資料提取過場層 */}
      {step === "extracting" && <SystemExtracting />}

      {/* 4. 3D 背景層 (在 extracting, create, chat 時都存在，可以預先載入) */}
      {(step === 'extracting' || step === 'create' || step === 'chat') && (
        <div className={`absolute inset-0 z-0 bg-gradient-to-b from-gray-900 to-black transition-opacity duration-1000 ${step === 'extracting' ? 'opacity-0' : 'opacity-100'}`}>
          <Suspense fallback={null}>
            <AvatarStage 
              vrmId={currentModelId}
              emotion={currentEmotion}
            />
          </Suspense>
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
        </div>
      )}

      {/* 5. 選角 UI */}
      {step === "create" && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end pb-safe-bottom pointer-events-none animate-fadeIn">
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
             <button onClick={handleReset} className="absolute top-4 left-4 z-50 text-[10px] text-white/20 hover:text-white/80">RESET</button>
           </div>
        </div>
      )}
    </main>
  );
}
