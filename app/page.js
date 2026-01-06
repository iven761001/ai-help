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

  const handleFinishCreate = () => {
    // 🌟 強制彈窗，確認按鈕是否活著
    alert("按鈕被點到了！準備進入下一步...");

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
    if(confirm("重置？")) {
        localStorage.removeItem("my_ai_character");
        setFinalCharacter(null);
        setEmail("");
        setStep("email");
    }
  };

  const currentModelId = step === 'create' 
    ? (tempConfig?.model || "C1") 
    : (finalCharacter?.model || "C1");

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white">
      
      {/* 1. Loading */}
      {step === "loading" && <div className="text-center pt-20">Loading...</div>}

      {/* 2. Email */}
      {step === "email" && (
        <div className="flex flex-col items-center justify-center h-full px-6">
            <h1 className="text-2xl font-bold mb-4">IVAN LINK</h1>
            <form onSubmit={handleEmailSubmit} className="space-y-4 w-full max-w-xs">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 p-3 rounded text-white"
                placeholder="輸入信箱"
              />
              <button type="submit" className="w-full bg-blue-600 p-3 rounded">下一步</button>
            </form>
        </div>
      )}

      {/* 3. 選角與聊天共用的 3D 背景 */}
      {(step === 'create' || step === 'chat') && (
        <div className="absolute inset-0 z-0">
          <Suspense fallback={null}>
            <Avatar3D vrmId={currentModelId} />
          </Suspense>
        </div>
      )}

      {/* 4. 選角 UI */}
      {step === "create" && (
        <>
            {/* 轉輪放在底部 */}
            <div className="absolute bottom-0 left-0 w-full z-10 pb-4 bg-gradient-to-t from-black to-transparent">
                <CompassCreator onChange={setTempConfig} />
            </div>

            {/* 🌟 暴力修正按鈕位置：固定在螢幕右側中間，層級最高 z-50 */}
            <button
                onClick={handleFinishCreate}
                className="fixed top-1/2 right-4 z-50 bg-blue-600 text-white px-6 py-4 rounded-full font-bold shadow-2xl border-2 border-white"
                style={{ transform: 'translateY(-50%)' }} // 垂直置中
            >
                完成設定 (Debug)
            </button>
        </>
      )}

      {/* 5. 聊天 UI */}
      {step === "chat" && (
        <div className="absolute inset-0 z-20 pointer-events-none">
           <div className="pointer-events-auto w-full h-full">
             <ChatHUD />
             <button onClick={handleReset} className="fixed top-4 left-4 z-50 bg-red-800 p-2 text-xs">RESET</button>
           </div>
        </div>
      )}

    </main>
  );
}
