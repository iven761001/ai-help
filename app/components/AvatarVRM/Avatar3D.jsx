"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three"; 

// --- 通用骨架修正 ---
// 這個函式適用於所有標準 VRM Humanoid 骨架
// 只要模型符合 VRM 標準，這個站姿修正就會生效
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
  
  // 使用標準路徑 (因為我們確定路徑是對的)
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  const gltf = useLoader(
    GLTFLoader, 
    url, 
    (loader) => {
      loader.crossOrigin = "anonymous";
      loader.register((parser) => new VRMLoaderPlugin(parser));
    },
    null,
    (error) => console.error("3D Loading Error:", error)
  );

  const [vrm, setVrm] = useState(null);

  // 1. 初始化模型
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    
    try {
        // VRM 0.0 旋轉修正 (對 VRM 1.0 無害)
        VRMUtils.rotateVRM0(loadedVrm);
        
        // 🛡️ 通用遍歷：找出所有 Mesh 並備份材質
        loadedVrm.scene.traverse((obj) => {
            // 只處理是網格(Mesh)且有材質的物件
            if (obj.isMesh && obj.material) {
                // 排除多重材質 (Array)，避免複雜結構報錯
                if (Array.isArray(obj.material)) return;

                obj.frustumCulled = false; // 防止模型在邊緣消失
                
                // 備份原始材質 (Clone 是最安全的備份方式)
                if (!obj.userData.originalMat) {
                    obj.userData.originalMat = obj.material.clone(); 
                }

                // 智慧判斷：透過名字猜測這是眼睛還是身體
                // 未來模型只要材質名稱包含這些關鍵字，眼睛就會發亮
                const name = obj.name.toLowerCase();
                const matName = obj.material.name ? obj.material.name.toLowerCase() : "";
                obj.userData.isEye = name.includes("eye") || matName.includes("eye") || name.includes("face") || matName.includes("iris");
            }
        });

        applyNaturalPose(loadedVrm);

    } catch (e) { console.error("VRM Init Error:", e); }

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);

  }, [gltf, onReady]);

  // 2. 🌟 通用版特效切換 (Robust Hologram Effect)
  useEffect(() => {
    if (!vrm) return;

    vrm.scene.traverse((obj) => {
        // 嚴格檢查：必須是 Mesh，而且必須有單一材質
        if (obj.isMesh && obj.material && !Array.isArray(obj.material)) {
            
            try {
                // A. 眼睛處理
                if (obj.userData.isEye) {
                    // 恢復備份材質
                    if (obj.userData.originalMat) {
                         obj.material.copy(obj.userData.originalMat);
                    }
                    // 微微發光，讓眼睛更有神
                    if (obj.material.emissive) obj.material.emissive.setHex(0x222222);
                } 
                // B. 身體處理：全像投影 vs 實體
                else {
                    if (!unlocked) {
                        // --- 🔒 鎖定模式 (Hologram) ---
                        // 安全檢查：確認屬性存在才修改，避免報錯
                        if (obj.material.color) obj.material.color.setHex(0x00ffff); // 青色
                        if (obj.material.emissive) obj.material.emissive.setHex(0x001133); // 藍色自發光
                        
                        obj.material.wireframe = true;   // 線框模式
                        obj.material.transparent = true; // 開啟透明
                        obj.material.opacity = 0.3;      // 半透明度
                        
                        // 投影狀態下不產生影子，節省效能
                        obj.castShadow = false;
                        obj.receiveShadow = false;
                    } else {
                        // --- 🔓 解鎖模式 (實體化) ---
                        // 用最強力的方式：直接用備份的材質「複製」回去
                        if (obj.userData.originalMat) {
                            obj.material.copy(obj.userData.originalMat);
                        }
                        
                        // 強制重設關鍵屬性，確保變回實體
                        obj.material.wireframe = false;
                        obj.material.transparent = false;
                        obj.material.opacity = 1.0;
                        
                        obj.castShadow = true;
                        obj.receiveShadow = true;
                    }
                    // 通知 Three.js 更新這個材質
                    obj.material.needsUpdate = true;
                }
            } catch (err) {
                // 🌟 通用的關鍵：如果這個部位壞了，就略過它，不要讓網頁掛掉
                console.warn(`Skipping bad material on part: ${obj.name}`);
            }
        }
    });

  }, [unlocked, vrm]);

  // 3. 通用動畫迴圈
  useFrame((state, delta) => {
    if (vrm) {
        const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2.5) * 5 - 4);
        // 安全檢查：確認模型有表情管理器才執行
        if (vrm.expressionManager) {
            vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
            vrm.expressionManager.setValue('happy', emotion === 'happy' ? 1.0 : 0);
            vrm.expressionManager.setValue('neutral', emotion === 'neutral' ? 0.5 : 0);
            vrm.expressionManager.update();
        }
        // 安全檢查：確認模型有骨架才執行呼吸
        if (vrm.humanoid) {
           const spine = vrm.humanoid.getNormalizedBoneNode('spine');
           if(spine) spine.rotation.x = Math.sin(state.clock.elapsedTime) * 0.02;
        }
        vrm.update(delta);
    }
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}
