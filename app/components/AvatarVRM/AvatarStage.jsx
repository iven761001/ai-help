"use client";

import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls } from "@react-three/drei";
import Avatar3D from "./Avatar3D";

class StageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || "3D stage error" };
  }
  componentDidCatch(err) {
    console.error("[AvatarStage error]", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white/60 text-xs text-center px-4">
            3D 舞台載入失敗（不影響輸入信箱/聊天）<br />
            {this.state.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AvatarStage({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0
}) {
  // ✅ 比你原本更穩：距離更合理、比較不會「頭被切到」
  const camera = useMemo(() => ({ position: [0, 1.35, 1.35], fov: 28 }), []);

  return (
    <div className="w-full h-full">
      <StageErrorBoundary>
        <Canvas
          camera={camera}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
          dpr={[1, 1.75]}
        >
          {/* ✅ 讓立體感更好：環境光別太亮，主光更集中 */}
          <ambientLight intensity={0.45} />

          {/* 主光：左前上（像展示櫃打燈） */}
          <directionalLight
            position={[3.2, 5.5, 2.6]}
            intensity={1.25}
          />

          {/* 補光：右後（把陰影的死黑拉起來） */}
          <directionalLight
            position={[-2.8, 2.2, -2.2]}
            intensity={0.55}
          />

          {/* 頂光：讓頭/肩有高光邊緣 */}
          <directionalLight
            position={[0, 6.5, 0]}
            intensity={0.35}
          />

          <Suspense fallback={null}>
            {/* ✅ 重要：不要再額外把 Avatar 往下移
               因為 Avatar3D.jsx 已經做過「腳貼地」校正了 */}
            <group position={[0, -0.9, 0]}>
              <Avatar3D
                variant={variant}
                emotion={emotion}
                previewYaw={previewYaw}
              />
            </group>

            {/* ✅ 陰影貼地：把 y 放在 0 附近最穩 */}
            <ContactShadows
              opacity={0.38}
              scale={6.2}
              blur={2.4}
              far={6}
              resolution={256}
              position={[0, 0.02, 0]}
            />

            {/* ✅ 環境：city OK，但強度不要太大（避免整體灰白） */}
            <Environment preset="city" environmentIntensity={0.9} />
          </Suspense>

          {/* 禁用 Orbit，避免跟你拖曳旋轉打架 */}
          <OrbitControls enabled={false} enableZoom={false} enablePan={false} />
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
