"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import { useRef } from "react";

const avatarStyles = {
  sky: {
    color: "#0ea5e9" // 天空藍：溫柔、專業
  },
  mint: {
    color: "#22c55e" // 薄荷綠：清爽、偏清潔感
  },
  purple: {
    color: "#a855f7" // 紫色：科技感、神秘一點
  }
};

function Character({ variant = "sky", emotion = "idle" }) {
  const style = avatarStyles[variant] || avatarStyles.sky;
  const meshRef = useRef();
  const baseScale = 1;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();

    // 預設：微微浮動
    let y = Math.sin(t) * 0.1;
    let scale = baseScale;
    let rotY = t * 0.4;
    let rotZ = 0;

    switch (emotion) {
      case "happy":
        y = Math.sin(t * 3) * 0.2; // 跳比較大
        scale = baseScale + Math.sin(t * 5) * 0.05;
        rotY = t * 1.5;
        break;
      case "thinking":
        y = Math.sin(t * 0.8) * 0.05;
        rotY = t * 0.8; // 慢慢轉
        break;
      case "warning":
        y = Math.sin(t * 6) * 0.08;
        rotZ = Math.sin(t * 20) * 0.12; // 左右小晃
        break;
      case "sorry":
        y = -0.15 + Math.sin(t * 0.5) * 0.03;
        scale = baseScale * 0.9;
        rotY = t * 0.2;
        break;
      case "idle":
      default:
        // 用預設就好
        break;
    }

    meshRef.current.position.y = y;
    meshRef.current.scale.set(scale, scale, scale);
    meshRef.current.rotation.y = rotY;
    meshRef.current.rotation.z = rotZ;
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color={style.color} />
    </mesh>
  );
}

export default function Avatar3D({ variant = "sky", emotion = "idle" }) {
  return (
    <div className="w-full h-40 md:h-56">
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <color attach="background" args={["#e0f2fe"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 2]} intensity={0.9} />
        <Float
          speed={2}
          rotationIntensity={1}
          floatIntensity={0.7}
          floatingRange={[0.1, 0.4]}
        >
          <Character variant={variant} emotion={emotion} />
        </Float>
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}
