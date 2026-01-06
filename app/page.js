// app/page.js
"use client";

import { useState, useEffect } from "react";

// --- 路徑修正重點 ---
// components 和 lib 都跟 page.js 在同一個 app 資料夾內
// 所以全部都要用 ./ (同層) 開頭

import Avatar3D from "./components/AvatarVRM/Avatar3D";
import CompassCreator from "./components/Creator/CompassCreator";
import ChatHUD from "./components/HUD/ChatHUD";

// ❌ 原本錯的： import { ... } from "../lib/storage"; (這是往上一層找)
// ✅ 這次對的： 改成 ./lib/storage (這是找隔壁鄰居)
import { getCharacter, saveCharacter } from "./lib/storage"; 

export default function Home() {
  // --- 狀態管理區 ---
  const [step, setStep] = useState("loading");
  
  // 使用者資料
  const [email, setEmail] = useState("");
  const [tempConfig, setTempConfig] = useState(null); // 選角時的暫存設定
  const [finalCharacter, setFinalCharacter] = useState(null); // 最終確定的角色

  // 1. 初始化檢查
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

  // --- 動作處理區 ---

  // A. 信箱頁按下確定
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return alert("請輸入信箱喔！");
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
      name: "My AI Buddy",
      ...tempConfig,
      createdAt: new Date().toISOString()
    };

    saveCharacter(newCharacter);
    setFinalCharacter(newCharacter);
    setStep("chat");
  };

  // D. 聊天頁：重置
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
      {(step === 'create' || step === 'chat') && (
        <div className="absolute inset-0 z-0">
          <Avatar3D 
            vrmId={step === 'create' ? tempConfig?.model : finalCharacter?.model}
            emotion={
              (step === 'create' ? tempConfig?.personality : finalCharacter?.personality) === 'cool' 
              ? 'neutral' : 'happy'
            }
            action="idle" 
          />
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
               
               
