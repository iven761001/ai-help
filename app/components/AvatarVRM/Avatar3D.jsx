"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

// 讓角色自然站立 (這段是安全的，保留)
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
  
  // 還是用標準路徑，因為妳說 02 讀得到，表示路徑是對的
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  const gltf = useLoader(
    GLTFLoader, 
    url, 
    (loader) => {
      loader.crossOrigin = "anonymous";
      loader.register((parser) => new VRMLoaderPlugin(parser));
    },
    null,
    (error) => {
      console.error("仍然讀取失敗:", error);
      // 如果連這個版本都失敗，那就真的是檔案壞掉了
    }
  );

  const [vrm, setVrm] = useState(null);

  // 1. 初始化模型 (簡化版：只做旋轉和姿勢，不碰材質)
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    
    try {
        VRMUtils.rotateVRM0(loadedVrm);
        
        // ⚠️ 我把這裡所有「材質遍歷 (traverse)」的程式碼都拿掉了
        // 這樣就不會因為找不到 eye 或 originalMat 而報錯
        
        applyNaturalPose(loadedVrm);

    } catch (e) { console.error("VRM Init Error:", e); }

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);

  }, [gltf, onReady]);

  // 2. ⚠️ 我把整個「材質切換特效 (useEffect [unlocked, vrm])」全部註解掉暫停運作
  // 這樣我們可以確認是不是這段程式碼害死 C1 的
  /*
  useEffect(() => {
    if (!vrm) return;
    vrm.scene.traverse((obj) => {
        // ... (省略特效代碼) ...
    });
  }, [unlocked, vrm]);
  */

  // 3. 基礎動畫 (眨眼呼吸保留，這通常不會導致崩潰)
  useFrame((state, delta) => {
    if (vrm) {
        // 簡單的眨眼邏輯
        const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2.5) * 5 - 4);
        if (vrm.expressionManager) {
            vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
            // 忽略 emotion，先求顯示
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
