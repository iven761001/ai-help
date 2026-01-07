// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

function applyNaturalPose(vrm) {
  if (!vrm || !vrm.humanoid) return;
  const rotateBone = (name, x, y, z) => {
    const bone = vrm.humanoid.getNormalizedBoneNode(name);
    if (bone) bone.rotation.set(x, y, z);
  };
  rotateBone('leftUpperArm',  0, 0, 1.3);
  rotateBone('rightUpperArm', 0, 0, -1.3);
  rotateBone('leftLowerArm',  0, 0, 0.1);
  rotateBone('rightLowerArm', 0, 0, -0.1);
  rotateBone('leftHand', 0, 0, 0.1);
  rotateBone('rightHand', 0, 0, -0.1);
}

export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);

  // 1. 初始化模型
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    
    // 基礎設定
    VRMUtils.rotateVRM0(loadedVrm);
    applyNaturalPose(loadedVrm);

    // 遍歷並備份原材質
    loadedVrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false;
        obj.castShadow = true;
        obj.receiveShadow = true;
        
        // 備份原始材質 (只備份一次)
        if (!obj.userData.originalMat) {
            obj.userData.originalMat = obj.material;
        }

        // 標記眼睛 (重要！)
        const name = obj.name.toLowerCase();
        const matName = obj.material.name.toLowerCase();
        obj.userData.isEye = name.includes("eye") || matName.includes("eye") || name.includes("face") || matName.includes("face");
      }
    });

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);

  }, [gltf, onReady]);

  // 2. 監聽解鎖狀態，切換材質 (只在狀態改變時執行一次，極省效能)
  useEffect(() => {
    if (!vrm) return;

    vrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        if (!unlocked) {
            // --- 鎖定狀態 (Hologram Mode) ---
            
            if (obj.userData.isEye) {
                // 眼睛：保持實體 (Original Material)
                obj.material = obj.userData.originalMat;
                // 微微發光，讓眼神更亮
                if(obj.material.emissive) obj.material.emissive.setHex(0x333333);
            } else {
                // 身體：切換成線框 (修改屬性即可，不換材質)
                // 這樣最穩，不會破壞骨架
                obj.material = obj.userData.originalMat; // 先確保是原材質
                obj.material.wireframe = true;           // 開啟線框
                obj.material.color.setHex(0x00ffff);     // 變青色
                obj.material.emissive.setHex(0x001133);  // 微微自發光
                obj.material.transparent = true;
                obj.material.opacity = 0.3;
            }
        } else {
            // --- 解鎖狀態 (Normal Mode) ---
            
            // 全部恢復原狀
            obj.material = obj.userData.originalMat;
            obj.material.wireframe = false;
            obj.material.color.setHex(0xffffff); // 恢復白色 (顯示貼圖)
            obj.material.emissive.setHex(0x000000); // 關閉自發光
            obj.material.transparent = false;
            obj.material.opacity = 1.0;
        }
        
        obj.material.needsUpdate = true; // 通知 Three.js 更新
      }
    });

  }, [unlocked, vrm]); // 只有當 unlocked 改變時才執行

  // 3. 基礎動畫迴圈 (只做表情和呼吸)
  useFrame((state, delta) => {
    if (!vrm) return;

    const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2.5) * 5 - 4);
    if (vrm.expressionManager) {
      vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
      vrm.expressionManager.setValue('happy', emotion === 'happy' ? 1.0 : 0);
      vrm.expressionManager.setValue('neutral', emotion === 'neutral' ? 0.5 : 0);
      vrm.expressionManager.update();
    }
    
    if (vrm.humanoid) {
       const spine = vrm.humanoid.getNormalizedBoneNode('spine');
       if(spine) spine.rotation.x = Math.sin(state.clock.elapsedTime) * 0.02;
    }
    vrm.update(delta);
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}
