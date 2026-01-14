"use client";

import React, { useEffect, useState, useRef } from "react";
import { useGLTF } from "@react-three/drei"; 
import { useFrame } from "@react-three/fiber";
import { VRMUtils, VRMLoaderPlugin } from "@pixiv/three-vrm";

export default function Avatar3D({ vrmId, emotion, onReady }) {
  const [vrm, setVrm] = useState(null);
  const groupRef = useRef();
  
  // 🌟 修正點 1: 預設值改回 avatar_01
  const safeId = vrmId || "avatar_01";
  
  // 🌟 修正點 2: 路徑結構要符合截圖 public/vrm/
  const url = `/vrm/${safeId}.vrm`;

  console.log("🛠️ Loading VRM from:", url);

  const { scene, userData } = useGLTF(url);

  useEffect(() => {
    if (userData && userData.vrm) {
      console.log("✅ VRM Loaded:", safeId);
      const vrmInstance = userData.vrm;
      
      VRMUtils.rotateVRM0(vrmInstance);
      vrmInstance.scene.traverse((obj) => {
        obj.frustumCulled = false; 
      });

      setVrm(vrmInstance);
      if (onReady) onReady(vrmInstance);
    }
  }, [scene, userData, onReady, safeId]);

  useFrame((state, delta) => {
    if (vrm && groupRef.current) {
      vrm.update(delta);
      vrm.scene.position.y = Math.sin(state.clock.elapsedTime * 1) * 0.01;

      if (vrm.expressionManager) {
        const emotionValue = emotion === 'happy' ? 1.0 : 0.0;
        vrm.expressionManager.setValue('happy', emotionValue);
        vrm.expressionManager.setValue('blink', Math.sin(state.clock.elapsedTime * 3) > 0.98 ? 1 : 0);
        vrm.expressionManager.update(); 
      }

      if (vrm.humanoid) {
        const head = vrm.humanoid.getNormalizedBoneNode('head');
        if (head) {
          head.rotation.y = state.pointer.x * 0.25;
          head.rotation.x = -state.pointer.y * 0.25;
        }
      }
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

// 🌟 修正點 3: 預載路徑改回 avatar_01
useGLTF.preload("/vrm/avatar_01.vrm");
useGLTF.preload("/vrm/avatar_02.vrm");
