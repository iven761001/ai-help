// app/components/AvatarVRM/AvatarStage.jsx
"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls } from "@react-three/drei";

import Avatar3D from "./Avatar3D";

export default function AvatarStage({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0
}) {
  const camera = useMemo(() => ({ position: [0, 1.2, 3.2], fov: 40 }), []);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={camera}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        {/* ✅ 基本光（就算 Environment 沒載到也不會黑） */}
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 5, 2]} intensity={1.25} />
        <directionalLight position={[-3, 2, -2]} intensity={0.7} />
        <pointLight position={[0, 2.2, 3]} intensity={0.55} />

        {/* ✅ Avatar 不要被 Environment 的 Suspense 卡住 */}
        <group position={[0, -0.25, 0]}>
          <Avatar3D variant={variant} emotion={emotion} previewYaw={previewYaw} />
        </group>

        {/* ✅ 地面陰影：立體感關鍵 */}
        <ContactShadows
          opacity={0.32}
          scale={6}
          blur={2.2}
          far={6}
          resolution={256}
          position={[0, -1.05, 0]}
        />

        {/* ✅ Environment 單獨 Suspense：載不到也不影響模型顯示 */}
        <Suspense fallback={null}>
          <Environment preset="city" />
        </Suspense>

        {/* 你用自己的手勢 previewYaw，所以 OrbitControls 關閉 */}
        <OrbitControls enabled={false} enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}
