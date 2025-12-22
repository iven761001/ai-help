// app/components/Avatar3D.jsx
"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";

export default function Avatar3D({ variant="sky", emotion="idle", previewYaw=0 }) {
  const group = useRef(null);
  const { scene, animations } = useGLTF("/models/bear_rigged.glb");
  const { actions, mixer } = useAnimations(animations, group);

  // 顏色（如果模型材質允許可染色）
  const tint = useMemo(() => {
    if (variant === "mint") return new THREE.Color("#6ff0c8");
    if (variant === "purple") return new THREE.Color("#c79cff");
    return new THREE.Color("#7cc7ff");
  }, [variant]);

  useEffect(() => {
    // 嘗試把模型所有 Mesh 染色（不破壞貼圖就不要硬染）
    scene.traverse((o) => {
      if (o.isMesh && o.material && o.material.color) {
        o.material = o.material.clone();
        o.material.color.lerp(tint, 0.35);
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }, [scene, tint]);

  useEffect(() => {
    // ✅ 自動播放：優先找 idle/talk/happy，找不到就播第一個
    const names = Object.keys(actions || {});
    if (!names.length) return;

    const pick =
      actions["idle"] ||
      actions["Idle"] ||
      actions["talk"] ||
      actions["Talk"] ||
      actions[names[0]];

    if (!pick) return;

    pick.reset().fadeIn(0.2).play();
    return () => {
      pick.fadeOut(0.15);
    };
  }, [actions, emotion]);

  // ✅ 頭身分離（骨架版做法）：
  // 最標準是找到 Head bone，單獨改它的 rotation.y
  // 但骨頭命名每個模型不同，所以先做「整體 yaw」
  const yaw = previewYaw * 0.6;

  useEffect(() => {
    if (!group.current) return;
    group.current.rotation.y = yaw;
  }, [yaw]);

  // 如果你告訴我你模型 Head bone 叫什麼（例如 "Head" / "mixamorigHead"）
  // 我可以幫你把「頭轉更大、身體轉更小」完全做到骨架級別。

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/bear_rigged.glb");
