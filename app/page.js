// app/page.js
"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Mail } from "lucide-react"; // 確保有安裝，沒有也沒關係，我有做備案

// 引入妳的組件 (根據截圖路徑)
import Avatar3D from "@/components/AvatarVRM/Avatar3D";
import CompassCreator from "@/components/Creator/CompassCreator";
import ChatHUD from "@/components/HUD/ChatHUD";
import { getCharacter, saveCharacter } from "@/lib/storage"; 

export default function Home() {
  // --- 狀態管理區 ---
  // step: 'loading' | 'email' | 'create' | 'chat'
  const [step, setStep] = useState("loading");
  
  // 使用者資料
  const [email, setEmail] = useState("");
  const [tempConfig, setTempConfig] = useState(null); // 選角時的暫存設定
  const [finalCharacter, setFinalCharacter] = useState(null); // 最終確定的角色

  // 1. 初始化檢查 (看看是不是老朋友)
  useEffect(() => {
    const saved = getCharacter();
    if (saved && saved.email) {
      // 如果有存檔且有信箱，直接去聊天
      setFinalCharacter(saved);
      setStep("chat");
    } else {
      // 否則從信箱頁開始
      setStep("email");
    }
  }, []);

  // --- 動作處理區 ---

  // A. 信箱頁按下確定
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return alert("請輸入信箱喔！");
    // 進入選角模式
    setStep("create");
  };

  // B. 選角頁：當轉輪轉動時
  const handleConfigChange = (newConfig) => {
    setTempConfig(newConfig);
  };

  // C. 選角頁：按下完成
  const handleFinishCreate = () => {
    if (!tempConfig) return;

    const newCharacter = {
      email: email,
      name: "My AI Buddy", // 這裡暫時寫死，之後可讓使用者改
      ...tempConfig,       // 包含 model, color, personality...
      createdAt: new Date().toISOString()
    };

    // 存檔並進入聊天
    saveCharacter(newCharacter);
    setFinalCharacter(newCharacter);
    setStep("chat");
  };

  // D. 聊天頁：重置 (測試用)
  const handleReset = () => {
    localStorage.removeItem("my_ai_character");
    setFinalCharacter(null);
    setEmail("");
    setStep("email");
  };

  // --- 畫面渲染區 ---

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* --- 共用背景層 (3D 角色) --- */}
      {/* 只有在 'create' 或 'chat' 模式才顯示 3D */}
      {(step === 'create' || step === 'chat') && (
        <div className="absolute inset-0 z-0">
          <Avatar3D 
            // 如果是選角模式，讀取轉輪的暫存值 (tempConfig)
            // 如果是聊天模式，讀取最終確定的值 (finalCharacter)
            vrmId={step === 'create' ? tempConfig?.model : finalCharacter?.model}
            // 根據個性簡單切換表情
            emotion={
              (step === 'create' ? tempConfig?.personality : finalCharacter?.personality) === 'cool' 
              ? 'neutral' : 'happy'
            }
            action="idle" 
          />
          {/* 底部黑色漸層，讓 UI 更清楚 */}
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
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
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
                    下一步 <ArrowRight size={18} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 3. 選角頁 (Creator) */}
          {step === "create" && (
            <div className="absolute inset-0 flex flex-col justify-end pb-safe-bottom">
              {/* 按鈕區 (浮在轉輪上方) */}
              <div className="w-full px-6 mb-4 flex justify-between items-end animate-slideUp">
                 <div>
                    <h2 className="text-xl font-bold text-white/90">角色設定</h2>
                    <p className="text-[10px] text-blue-400 tracking-[0.2em] font-bold mt-1">CUSTOMIZE</p>
                 </div>
                 
                 {/* 🌟 這是妳要的「下一頁」按鈕 */}
                 <button
                   onClick={handleFinishCreate}
                   className="group bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-full font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
                 >
                   <span className="text-sm">完成設定</span>
                   <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                 </button>
              </div>

              {/* 轉輪區 */}
              <div className="w-full bg-gradient-to-t from-black to-transparent pt-4">
                 <CompassCreator onChange={handleConfigChange} />
              </div>
            </div>
          )}

          {/* 4. 聊天頁 (Chat) */}
          {step === "chat" && finalCharacter && (
            <div className="relative w-full h-full animate-fadeIn">
               {/* 這裡直接放 ChatHUD，它會疊在 Avatar3D 上面 */}
               <ChatHUD />
               
               {/* 測試用的重置按鈕 (左上角隱密處) */}
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
