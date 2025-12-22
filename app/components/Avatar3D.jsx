// app/components/Avatar3D.jsx
"use client";

import * as THREE from "three";
import { useMemo } from "react";

export default function Avatar3D({ variant = "sky", emotion = "idle", previewYaw = 0 }) {
  const { bodyMat, faceMat } = useMemo(() => {
    const color =
      variant === "mint" ? new THREE.Color("#6ff0c8") :
      variant === "purple" ? new THREE.Color("#c79cff") :
      new THREE.Color("#7cc7ff");

    // 身體：偏玻璃/果凍
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.25,
      metalness: 0.0,
      transmission: 0.45,   // 透光感
      thickness: 1.0,
      clearcoat: 0.65,
      clearcoatRoughness: 0.2,
      opacity: 0.92,
      transparent: true
    });

    // 臉：更霧、更白
    const faceMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#eaf6ff"),
      roughness: 0.6,
      metalness: 0.0,
      opacity: 0.85,
      transparent: true
    });

    return { bodyMat, faceMat };
  }, [variant]);

  // ✅ 頭身分離旋轉（你要的）
  const bodyYaw = previewYaw * 0.45; // 身體較慢
  const headYaw = previewYaw * 0.95; // 頭比較靈

  // 情緒（先保留，之後接動畫用）
  const mood =
    emotion === "thinking" ? "thinking" :
    emotion === "happy" ? "happy" :
    emotion === "sad" ? "sad" :
    "idle";

  return (
    <group>
      {/* 身體群組 */}
      <group rotation={[0, bodyYaw, 0]}>
        {/* 身體 */}
        <mesh position={[0, 0.15, 0]} material={bodyMat} castShadow receiveShadow>
          <capsuleGeometry args={[0.55, 0.85, 10, 18]} />
        </mesh>

        {/* 手 */}
        <mesh position={[-0.7, 0.25, 0]} material={bodyMat} castShadow>
          <capsuleGeometry args={[0.18, 0.55, 8, 14]} />
        </mesh>
        <mesh position={[0.7, 0.25, 0]} material={bodyMat} castShadow>
          <capsuleGeometry args={[0.18, 0.55, 8, 14]} />
        </mesh>

        {/* 腳 */}
        <mesh position={[-0.22, -0.55, 0.18]} material={bodyMat} castShadow>
          <capsuleGeometry args={[0.18, 0.22, 8, 14]} />
        </mesh>
        <mesh position={[0.22, -0.55, 0.18]} material={bodyMat} castShadow>
          <capsuleGeometry args={[0.18, 0.22, 8, 14]} />
        </mesh>
      </group>

      {/* 頭群組（獨立旋轉） */}
      <group position={[0, 0.75, 0.08]} rotation={[0, headYaw, 0]}>
        {/* 頭 */}
        <mesh material={bodyMat} castShadow>
          <sphereGeometry args={[0.52, 22, 18]} />
        </mesh>

        {/* 耳朵 */}
        <mesh position={[-0.42, 0.33, -0.08]} material={bodyMat} castShadow>
          <sphereGeometry args={[0.22, 18, 14]} />
        </mesh>
        <mesh position={[0.42, 0.33, -0.08]} material={bodyMat} castShadow>
          <sphereGeometry args={[0.22, 18, 14]} />
        </mesh>

        {/* 臉罩 */}
        <mesh position={[0, -0.05, 0.35]} material={faceMat}>
          <sphereGeometry args={[0.38, 18, 14]} />
        </mesh>

        {/* 眼睛 */}
        <mesh position={[-0.16, 0.06, 0.67]}>
          <sphereGeometry args={[0.05, 16, 12]} />
          <meshStandardMaterial color="#1b2430" roughness={0.4} />
        </mesh>
        <mesh position={[0.16, 0.06, 0.67]}>
          <sphereGeometry args={[0.05, 16, 12]} />
          <meshStandardMaterial color="#1b2430" roughness={0.4} />
        </mesh>

        {/* 鼻子 */}
        <mesh position={[0, -0.08, 0.72]}>
          <sphereGeometry args={[0.07, 16, 12]} />
          <meshStandardMaterial color="#2a3642" roughness={0.3} />
        </mesh>
      </group>

      {/* 之後你要做動畫狀態機用（先留著） */}
      <group userData={{ mood }} />
    </group>
  );
}
