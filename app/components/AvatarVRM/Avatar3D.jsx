// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// 🌟 新增：讓角色自然站立 (把手放下)
function applyNaturalPose(vrm) {
  if (!vrm || !vrm.humanoid) return;
  
  const rotateBone = (name, x, y, z) => {
    const bone = vrm.humanoid.getNormalizedBoneNode(name);
    if (bone) {
      bone.rotation.set(x, y, z);
    }
  };

  // 手臂自然下垂 (Z軸旋轉約 75度)
  rotateBone('leftUpperArm',  0, 0, 1.3);
  rotateBone('rightUpperArm', 0, 0, -1.3);
  
  // 手肘微彎，比較像真人
  rotateBone('leftLowerArm',  0, 0, 0.1);
  rotateBone('rightLowerArm', 0, 0, -0.1);

  // 手掌放鬆
  rotateBone('leftHand', 0, 0, 0.1);
  rotateBone('rightHand', 0, 0, -0.1);
}

// 全像投影邏輯 (保持不變)
function applyHologramEffect(vrm, isUnlocked) {
  if (!vrm || !vrm.scene) return;

  vrm.scene.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      const matName = obj.material.name || "";
      const objName = obj.name || "";
      const isEye = 
        matName.toLowerCase().includes("eye") || 
        matName.toLowerCase().includes("face") || 
        objName.toLowerCase().includes("eye");

      if (isEye) {
        if (obj.userData.originalMat) obj.material = obj.userData.originalMat;
        if (obj.material.emissive) obj.material.emissive = new THREE.Color(0.2, 0.2, 0.2);
        return; 
      }

      if (isUnlocked) {
        if (obj.userData.originalMat) obj.material = obj.userData.originalMat;
        obj.castShadow = true;
        obj.receiveShadow = true;
      } else {
        if (!obj.userData.originalMat) obj.userData.originalMat = obj.material;
        
        if (!obj.userData.hologramMat) {
            obj.userData.hologramMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color("#00ffff"),
                transparent: true,
                opacity: 0.15,
                wireframe: true,
                side: THREE.DoubleSide,
            });
        }
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
    
    try {
        VRMUtils.rotateVRM0(loadedVrm);
        loadedVrm.scene.traverse((obj) => {
            if (obj.isMesh) {
                obj.frustumCulled = false;
                if (!obj.userData.originalMat) obj.userData.originalMat = obj.material;
            }
        });

        // 🌟 載入完成後，立刻擺出自然站姿
        applyNaturalPose(loadedVrm);

    } catch (e) {
        console.error("VRM Init Error:", e);
    }

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);

  }, [gltf, onReady]);

  // 監聽 unlocked 變化
  useEffect(() => {
    if (vrm) applyHologramEffect(vrm, unlocked);
  }, [vrm, unlocked]);

  useFrame((state, delta) => {
    if (!vrm) return;
    
    // 表情
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
