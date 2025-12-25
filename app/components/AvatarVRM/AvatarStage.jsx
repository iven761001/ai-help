// app/components/AvatarVRM/AvatarStage.jsx
"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls } from "@react-three/drei";

import Avatar3D from "./Avatar3D"; // ✅ 同資料夾就這樣引

export default function AvatarStage({
  profile,
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,
  interactive = true
}) {
  // 兼容兩種傳法：profile 優先，沒有就用 variant
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
          {/* ✅ 旋轉在 Stage 這層做，保證你拖曳一定有效 */}
          <group position={[0, -0.25, 0]} rotation={[0, previewYaw, 0]}>
            <Avatar3D variant={v} emotion={emotion} />
          </group>

          {/* 地面陰影：立體感 */}
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

        {/* Orbit 先關閉，避免跟你的 drag 互搶 */}
        <OrbitControls
          enabled={false}
          enableZoom={false}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
