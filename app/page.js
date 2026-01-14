"use client";

import { Suspense } from "react";
// 引入 Hook
import { useAppFlow } from "./hooks/useAppFlow";

// 引入元件
import AvatarStage from "./components/AvatarVRM/AvatarStage"; 
import ChatHUD from "./components/HUD/ChatHUD";
import BootScreen from "./components/Intro/BootScreen";
import SystemExtracting from "./components/Intro/SystemExtracting";
import EmailLogin from "./components/Auth/EmailLogin";
import CreatorHUD from "./components/HUD/CreatorHUD";

export default function Home() {
  // 呼叫邏輯掛鉤，取得所有狀態與動作
  const { step, finalCharacter, flags, modelData, actions } = useAppFlow();

  // 防止 SSR 渲染錯誤
  if (!flags.isClient) return <div className="bg-black h-screen"></div>;

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* 1. 開機畫面 */}
      {step === "boot" && (
        <BootScreen onComplete={actions.completeBoot} />
      )}

      {/* 2. 登入畫面 */}
      {step === "email" && (
        <EmailLogin onSubmit={actions.submitEmail} />
      )}

      {/* 3. 系統提取過場 */}
      {step === "extracting" && (
        <SystemExtracting />
      )}

      {/* 4. 3D 舞台 (持續存在，根據狀態改變透明度) */}
      {(step === 'extracting' || step === 'create' || step === 'chat') && (
        <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${(step === 'extracting' && !flags.isModelReady) ? 'opacity-0' : 'opacity-100'}`}>
          <Suspense fallback={null}>
            <AvatarStage 
              vrmId={modelData.id}
              emotion={modelData.emotion}
              unlocked={flags.isUnlocked} 
              isApproaching={flags.isApproaching}
              onModelReady={actions.modelReady} 
            />
          </Suspense>
        </div>
      )}

      {/* 5. 角色創造介面 */}
      {step === "create" && (
        <CreatorHUD 
          isApproaching={flags.isApproaching}
          onConfigChange={actions.updateTempConfig}
          onFinish={actions.finishCreation}
        />
      )}

      {/* 6. 聊天介面 (Chat) */}
      {step === "chat" && finalCharacter && (
        <div className="relative z-10 w-full h-full animate-fadeIn pointer-events-none">
           <ChatHUD />
           
           {/* 重置按鈕 */}
           <div className="absolute top-4 left-4 z-50 pointer-events-auto">
              <button 
                onClick={actions.resetSystem} 
                className="bg-red-900/50 text-white/50 text-[10px] px-2 py-1 rounded hover:text-white backdrop-blur-sm cursor-pointer"
              >
                RESET SYSTEM
              </button>
           </div>
        </div>
      )}

    </main>
  );
}
