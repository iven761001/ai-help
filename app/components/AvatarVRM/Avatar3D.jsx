// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// 🌟 安全的全像投影邏輯
function applyHologramEffect(vrm, isUnlocked) {
  if (!vrm || !vrm.scene) return;

  vrm.scene.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      // 1. 眼睛保護區：眼睛永遠保持實體
      const matName = obj.material.name || "";
      const objName = obj.name || "";
      const isEye = 
        matName.toLowerCase().includes("eye") || 
        matName.toLowerCase().includes("face") || 
        objName.toLowerCase().includes("eye");

      if (isEye) {
        // 如果有備份過，恢復它，確保眼睛不被藍光覆蓋
        if (obj.userData.originalMat) {
           obj.material = obj.userData.originalMat;
        }
        // 微微發光讓眼睛更有神
        if (obj.material.emissive) {
            obj.material.emissive = new THREE.Color(0.2, 0.2, 0.2);
        }
        return; 
      }

      // 2. 身體處理
      if (isUnlocked) {
        // --- 解鎖狀態 ---
        // 如果有備份，就還原
        if (obj.userData.originalMat) {
          obj.material = obj.userData.originalMat;
        }
        obj.castShadow = true;
        obj.receiveShadow = true;
      } else {
        // --- 鎖定狀態 (Hologram) ---
        
        // 第一次變身前，先備份原始材質
        // 使用 reference 備份即可，不需要 clone (比較省效能也比較安全)
        if (!obj.userData.originalMat) {
          obj.userData.originalMat = obj.material;
        }

        // 建立全像材質
        if (!obj.userData.hologramMat) {
            obj.userData.hologramMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color("#00ffff"), // 藍色
                transparent: true,
                opacity: 0.15,
                wireframe: true, // 線框感
                side: THREE.DoubleSide,
            });
        }

        // 套用全像材質
        obj.material = obj.userData.hologramMat;
        
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    }
  });
}

export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false }) {
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
    
    // 初始化處理
    try {
        VRMUtils.rotateVRM0(loadedVrm);
        loadedVrm.scene.traverse((obj) => {
            if (obj.isMesh) {
                obj.frustumCulled = false;
                // 預先備份材質，避免第一次切換時沒有 originalMat
                if (!obj.userData.originalMat) {
                    obj.userData.originalMat = obj.material;
                }
            }
        });
    } catch (e) {
        console.error("VRM Init Error:", e);
    }

    setVrm(loadedVrm);
    
    if (onReady) onReady(loadedVrm);

  }, [gltf, onReady]);

  // 監聽 unlocked 變化，觸發變身
  useEffect(() => {
    if (vrm) {
        applyHologramEffect(vrm, unlocked);
    }
  }, [vrm, unlocked]);

  useFrame((state, delta) => {
    if (!vrm) return;
    
    // 簡單的表情動作
    const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2.5) * 5 - 4);
    if (vrm.expressionManager) {
      vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
      vrm.expressionManager.setValue('happy', emotion === 'happy' ? 1.0 : 0);
      vrm.expressionManager.setValue('neutral', emotion === 'neutral' ? 0.5 : 0);
      vrm.expressionManager.update();
    }
    
    tRef.current += delta;
    if (vrm.humanoid) {
       const spine = vrm.humanoid.getNormalizedBoneNode('spine');
       if(spine) spine.rotation.x = Math.sin(tRef.current) * 0.02;
    }
    vrm.update(delta);
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}
