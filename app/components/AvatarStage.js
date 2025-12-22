// app/components/AvatarStage.jsx
"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls } from "@react-three/drei";
import Avatar3D from "./Avatar3D";

export default function AvatarStage({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,
  interactive = true
}) {
  // 背景透明：讓你外層 TechBackground 可以透出來
  const camera = useMemo(() => ({ position: [0, 1.2, 3.2], fov: 40 }), []);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={camera}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        {/* 光 */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 2]} intensity={1.2} />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} />

        <Suspense fallback={null}>
          <group position={[0, -0.25, 0]}>
            <Avatar3D variant={variant} emotion={emotion} previewYaw={previewYaw} />
          </group>

          {/* 地面陰影：立體感關鍵 */}
          <ContactShadows
            opacity={0.35}
            scale={6}
            blur={2.2}
            far={6}
            resolution={256}
            position={[0, -1.05, 0]}
          />

          {/* 環境光場：立體質感加倍 */}
          <Environment preset="city" />
        </Suspense>

        {/* ✅ 先鎖住使用者直接用 Orbit 控制，避免跟你手勢旋轉打架
            但保留備用：如果你要測試可先打開 enableRotate */}
        <OrbitControls
          enabled={false}
          enableZoom={false}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
