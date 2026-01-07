// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// 🌟 這是控制「全像投影」的核心邏輯
// isUnlocked: 如果是 true，顯示正常皮膚；如果是 false，顯示藍色光暈
function applyHologramEffect(vrm, isUnlocked) {
  if (!vrm) return;

  vrm.scene.traverse((obj) => {
    if (obj.isMesh) {
      // 1. 判斷是不是眼睛 (通常 VRM 的眼睛材質名稱會有 Eye, Face, Iris 等關鍵字)
      // 我們希望眼睛永遠保持「亮亮的實體」，這樣才有靈魂
      const isEye = obj.name.includes("Eye") || obj.name.includes("Face") || obj.material.name.includes("Eye");

      if (isEye) {
        // 眼睛保持原樣，或是稍微發光
        if (obj.userData.originalMat) {
            obj.material = obj.userData.originalMat;
        }
        obj.material.emissive = new THREE.Color(0.2, 0.2, 0.2); // 眼睛微微自發光
        return; 
      }

      // 2. 處理身體/衣服/頭髮
      if (isUnlocked) {
        // --- 解鎖狀態：恢復原本材質 ---
        if (obj.userData.originalMat) {
          obj.material = obj.userData.originalMat;
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      } else {
        // --- 鎖定狀態：變成全像投影 (Hologram) ---
        
        // 先把原本的材質備份起來 (只備份一次)
        if (!obj.userData.originalMat) {
          obj.userData.originalMat = obj.material.clone();
        }

        // 換成「高科技藍色光暈」材質
        // 使用 MeshBasicMaterial 比較省效能，且會有發光感
        obj.material = new THREE.MeshBasicMaterial({
          color: new THREE.Color("#00ffff"), // 賽博龐克藍
          transparent: true,
          opacity: 0.15, // 非常透明，像鬼魂
          wireframe: true, // 線框模式 (更有科技感，如果不喜歡可以改 false)
          side: THREE.DoubleSide,
        });
        
        // 關閉陰影 (光影不用有陰影)
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    }
  });
}

// 只匯出這個組件，不包 Canvas
export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false }) {
  // 🌟 unlocked: 從外面傳進來，決定現在是不是解鎖狀態

  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
  const tRef = useRef(0);

  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    VRMUtils.rotateVRM0(loadedVrm);
    
    // 第一次載入時，先做備份跟初始化
    loadedVrm.scene.traverse((obj) => {
        if (obj.isMesh) {
            obj.frustumCulled = false;
            // 備份原始材質
            if (!obj.userData.originalMat) {
                obj.userData.originalMat = obj.material.clone();
            }
        }
    });

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);

  }, [gltf, onReady]);

  // 🌟 當 unlocked 狀態改變時，觸發變身！
  useEffect(() => {
    if (vrm) {
        applyHologramEffect(vrm, unlocked);
    }
  }, [vrm, unlocked]);

  useFrame((state, delta) => {
    if (!vrm) return;
    
    // 眨眼
    const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2.5) * 5 - 4);
    if (vrm.expressionManager) {
      vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
      vrm.expressionManager.setValue('happy', emotion === 'happy' ? 1.0 : 0);
      vrm.expressionManager.setValue('neutral', emotion === 'neutral' ? 0.5 : 0);
      vrm.expressionManager.update();
    }
    
    // 呼吸
    tRef.current += delta;
    if (vrm.humanoid) {
       const spine = vrm.humanoid.getNormalizedBoneNode('spine');
       if(spine) spine.rotation.x = Math.sin(tRef.current) * 0.02;
    }
    vrm.update(delta);
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}
