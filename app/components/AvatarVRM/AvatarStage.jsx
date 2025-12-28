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

export default function AvatarStage({ variant="sky", emotion="idle", previewYaw=0 }) {
  const camera = useMemo(() => ({ position: [0, 1.2, 3.2], fov: 40 }), []);

  return (
    <div className="w-full h-full">
      <StageErrorBoundary>
        <Canvas
          camera={camera}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 5, 2]} intensity={1.2} />
          <directionalLight position={[-3, 2, -2]} intensity={0.6} />

          <Suspense fallback={null}>
            <group position={[0, -0.25, 0]}>
              <Avatar3D variant={variant} emotion={emotion} previewYaw={previewYaw} />
            </group>

            <ContactShadows
              opacity={0.35}
              scale={6}
              blur={2.2}
              far={6}
              resolution={256}
              position={[0, -1.05, 0]}
            />
            <Environment preset="city" />
          </Suspense>

          <OrbitControls enabled={false} enableZoom={false} enablePan={false} />
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
