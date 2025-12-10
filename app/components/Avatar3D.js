"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";

// 根據不同款式，改變顏色與一點點大小差異
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

function Character({ variant = "sky" }) {
  const style = avatarStyles[variant] || avatarStyles.sky;

  return (
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color={style.color} />
    </mesh>
  );
}

export default function Avatar3D({ variant = "sky" }) {
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
          <Character variant={variant} />
        </Float>
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}
