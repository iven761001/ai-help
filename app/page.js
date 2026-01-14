"use client";

import React, { Suspense } from "react";
import { Text } from "@react-three/drei";
import { useAppFlow } from "./hooks/useAppFlow";

// 引入拆分後的元件
import StageEnvironment from "./components/World/StageEnvironment"; // 🌟 新元件
import AvatarStage from "./components/AvatarVRM/AvatarStage"; 

import ChatHUD from "./components/HUD/ChatHUD";
import BootScreen from "./components/Intro/BootScreen";
import SystemExtracting from "./components/Intro/SystemExtracting";
import EmailLogin from "./components/Auth/EmailLogin";
import CreatorHUD from "./components/HUD/CreatorHUD";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("3D Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <group position={[0, 1.5, -2]}>
           <mesh>
             <boxGeometry args={[0.5, 0.5, 0.5]} />
             <meshStandardMaterial color="red" />
           </mesh>
           <Text position={[0, 0.6, 0]} fontSize={0.2} color="red">MODEL ERROR</Text>
        </group>
      );
    }
    return this.props.children;
  }
}

export default function Home() {
  const { step, finalCharacter, flags, modelData, actions } = useAppFlow();

  if (!flags.isClient) return <div className="bg-black h-screen"></div>;

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      
      {step === "boot" && <BootScreen onComplete={actions.completeBoot} />}
      {step === "email" && <EmailLogin onSubmit={actions.submitEmail} />}
      {step === "extracting" && <SystemExtracting />}

      {/* 3D 區域 */}
      {(step === 'extracting' || step === 'create' || step === 'chat') && (
        <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${(step === 'extracting' && !flags.isModelReady) ? 'opacity-0' : 'opacity-100'}`}>
          <Suspense fallback={null}>
            
            {/* 🌟 1. 舞台環境 (放在最外層，不被 Suspense 影響，保證永遠有畫面) */}
            <StageEnvironment />

            {/* 🌟 2. 只有角色包在 ErrorBoundary 裡面 */}
            <ErrorBoundary key={modelData.id}>
               {/* 這裡可以再包一層 Suspense，如果想要角色載入時顯示轉圈圈，但目前 fallback=null 即可 */}
               <Suspense fallback={null}>
                  <AvatarStage 
                    vrmId={modelData.id}
                    emotion={modelData.emotion}
                    unlocked={flags.isUnlocked} 
                    isApproaching={flags.isApproaching}
                    onModelReady={actions.modelReady} 
                  />
               </Suspense>
            </ErrorBoundary>

          </Suspense>
        </div>
      )}

      {step === "create" && (
        <CreatorHUD 
          isApproaching={flags.isApproaching}
          onConfigChange={actions.updateTempConfig}
          onFinish={actions.finishCreation}
        />
      )}

      {step === "chat" && finalCharacter && (
        <div className="relative z-10 w-full h-full animate-fadeIn pointer-events-none">
           <ChatHUD />
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
