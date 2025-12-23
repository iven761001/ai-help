// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import VRMModel from "./VRMModel";

export default function Avatar3D({
  url = "/vrm/hero.vrm",
  emotion = "idle",
  previewYaw = 0,
  className = ""
}) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 1.35, 2.6], fov: 35 }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 6, 4]} intensity={1.2} />
        <pointLight position={[-2, 1.5, 2]} intensity={0.6} />

        {/* 讓材質更漂亮（可換掉） */}
        <Environment preset="city" />

        <VRMModel url={url} emotion={emotion} previewYaw={previewYaw} />
      </Canvas>
    </div>
  );
}
