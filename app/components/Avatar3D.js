"use client";

import { Canvas } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, OrbitControls } from "@react-three/drei";

function Ball({ color, emotion }) {
  // 依照情緒調整球的變形與速度
  let distort = 0.15;
  let speed = 1;

  if (emotion === "happy") {
    distort = 0.35;
    speed = 2;
  } else if (emotion === "thinking") {
    distort = 0.25;
    speed = 1.5;
  } else if (emotion === "sorry") {
    distort = 0.2;
    speed = 0.8;
  }

  return (
    <Sphere args={[1, 64, 64]}>
      <MeshDistortMaterial
        color={color}
        distort={distort}
        speed={speed}
        roughness={0.2}
      />
    </Sphere>
  );
}

export default function Avatar3D({ variant = "sky", emotion = "idle" }) {
  // 球球顏色依照選的款式
  const colorMap = {
    sky: "#38bdf8",    // 天空藍
    mint: "#22c55e",   // 薄荷綠
    purple: "#a855f7"  // 紫色
  };

  const color = colorMap[variant] || colorMap.sky;

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 3] }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1} />

        <Ball color={color} emotion={emotion} />

        {/* 可以轉轉看球，不允許縮放 */}
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}
