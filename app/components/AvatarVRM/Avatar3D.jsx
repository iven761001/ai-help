"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

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
  
  // 🌟 終極大絕招：直接從 GitHub 雲端 CDN 讀取檔案
  // 這樣就不怕 Vercel 找不到 public 資料夾了
  const url = useMemo(() => {
    // 這是妳的 GitHub 帳號與專案名稱
    const user = "iven761001";
    const repo = "ai-help";
    const branch = "main";
    return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/public/vrm/${vrmId}.vrm`;
  }, [vrmId]);

  const gltf = useLoader(
    GLTFLoader, 
    url, 
    (loader) => {
      loader.crossOrigin = "anonymous";
      loader.register((parser) => new VRMLoaderPlugin(parser));
    },
    null,
    (error) => {
      console.error("3D Loading Error:", error);
      // 這裡如果失敗，通常是因為 GitHub 專案是 Private (私人) 的
      // 或者檔名真的不對
    }
  );

  const [vrm, setVrm] = useState(null);

  // 1. 初始化模型
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    
    try {
        VRMUtils.rotateVRM0(loadedVrm);
        loadedVrm.scene.traverse((obj) => {
            if (obj.isMesh) {
                obj.frustumCulled = false;
                if (!obj.userData.originalMat) obj.userData.originalMat = obj.material; 
                const name = obj.name.toLowerCase();
                const matName = obj.material.name.toLowerCase();
                obj.userData.isEye = name.includes("eye") || matName.includes("eye") || name.includes("face") || matName.includes("iris");
            }
        });
        applyNaturalPose(loadedVrm);
    } catch (e) { console.error("VRM Init Error:", e); }

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady]);

  // 2. 材質與動畫
  useEffect(() => {
    if (!vrm) return;
    vrm.scene.traverse((obj) => {
        if (obj.isMesh) {
            if (obj.userData.isEye) {
                if (obj.material !== obj.userData.originalMat) obj.material = obj.userData.originalMat;
                if (obj.material.emissive) obj.material.emissive.setHex(0x222222);
            } else {
                if (!unlocked) {
                    obj.material = obj.userData.originalMat; 
                    obj.material.wireframe = true;           
                    obj.material.color.setHex(0x00ffff);     
                    obj.material.emissive.setHex(0x001133);  
                    obj.material.transparent = true;
                    obj.material.opacity = 0.3;              
                    obj.castShadow = false;
                    obj.receiveShadow = false;
                } else {
                    obj.material.wireframe = false;          
                    obj.material.color.setHex(0xffffff);     
                    obj.material.emissive.setHex(0x000000);  
                    obj.material.transparent = false; 
                    obj.material.opacity = 1.0;
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
                obj.material.needsUpdate = true; 
            }
        }
    });
  }, [unlocked, vrm]);

  useFrame((state, delta) => {
    if (vrm) {
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
    }
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}
