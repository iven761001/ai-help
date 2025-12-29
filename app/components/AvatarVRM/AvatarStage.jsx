// app/components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
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
  vrmId = "C1",
  variant = "sky",
  emotion = "idle",
  previewYaw = 0
}) {
  const camera = useMemo(() => ({ position: [0, 1.4, 2.2], fov: 35 }), []);

  return (
    <div className="w-full h-full">
      <StageErrorBoundary>
        <Canvas
          camera={camera}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 6, 4]} intensity={1.2} />
          <directionalLight position={[-3, 2, -2]} intensity={0.6} />

          <Suspense fallback={null}>
            <group position={[0, 0, 0]}>
              <Avatar3D
                vrmId={vrmId}
                variant={variant}
                emotion={emotion}
                previewYaw={previewYaw}
              />
            </group>

            <ContactShadows
              opacity={0.35}
              scale={6}
              blur={2.2}
              far={10}
              resolution={256}
              position={[0, 0, 0]}
            />
          </Suspense>

          <OrbitControls enabled={false} enableZoom={false} enablePan={false} />
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
