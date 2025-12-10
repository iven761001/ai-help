"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";

function Character() {
  // 這裡先用一顆「會浮起來的球」當作角色
  // 未來可以換成真正的 3D 模型
  return (
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#0ea5e9" />
    </mesh>
  );
}

export default function Avatar3D() {
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
          <Character />
        </Float>
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}
