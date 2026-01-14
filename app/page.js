"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber"; // 🌟 補回這行，它是 3D 的心臟
import { Text } from "@react-three/drei";
import { useAppFlow } from "./hooks/useAppFlow";

// 引入拆分後的元件
import StageEnvironment from "./components/World/StageEnvironment";
import AvatarStage from "./components/AvatarVRM/AvatarStage"; 

import ChatHUD from "./components/HUD/ChatHUD";
import BootScreen from "./components/Intro/BootScreen";
import SystemExtracting from "./components/Intro/SystemExtracting";
import EmailLogin from "./components/Auth/EmailLogin";
import CreatorHUD from "./components/HUD/CreatorHUD";

// 錯誤邊界
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

      {/* 4. 3D 舞台區域 */}
      {/* 🌟 只要不是開機畫面，就顯示 3D (不要用 opacity 隱藏了，直接讓它顯示) */}
      {step !== "boot" && (
        <div className="absolute inset-0 z-0">
          {/* 🌟 關鍵修正：加上 Canvas！沒有它什麼都跑不出來 */}
          <Canvas>
            <Suspense fallback={null}>
              
              {/* 1. 舞台環境 (地板/燈光) - 這個現在一定會出來！ */}
              <StageEnvironment />

              {/* 2. 角色 (只有這裡可能會出錯，所以包 ErrorBoundary) */}
              {(step === 'extracting' || step === 'create' || step === 'chat') && (
                <ErrorBoundary key={modelData.id}>
                   <AvatarStage 
                     vrmId={modelData.id}
                     emotion={modelData.emotion}
                     unlocked={flags.isUnlocked} 
                     isApproaching={flags.isApproaching}
                     onModelReady={actions.modelReady} 
                   />
                </ErrorBoundary>
              )}

            </Suspense>
          </Canvas>
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
