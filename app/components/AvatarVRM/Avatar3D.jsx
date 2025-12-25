// app/components/AvatarVRM/AvatarStage.jsx
"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls } from "@react-three/drei";

import Avatar3D from "./Avatar3D"; // ✅ 同資料夾，固定這條

export default function AvatarStage({
  profile,
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,
  interactive = true
}) {
  // 兼容：profile 優先
  const v = profile?.avatar || profile?.color || variant || "sky";
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
          {/* ✅ 旋轉固定在這層做：你拖曳一定會動 */}
          <group position={[0, -0.25, 0]} rotation={[0, previewYaw, 0]}>
            <Avatar3D variant={v} emotion={emotion} />
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

        {/* 避免跟你的拖曳打架 */}
        <OrbitControls enabled={false} enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}
