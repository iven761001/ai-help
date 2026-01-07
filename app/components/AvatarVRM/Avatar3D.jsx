"use client";

import React, { useEffect, useMemo, useState } from "react";
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

  // 1. 初始化與材質備份
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    
    try {
        VRMUtils.rotateVRM0(loadedVrm);
        
        loadedVrm.scene.traverse((obj) => {
            if (obj.isMesh && obj.material) {
                obj.frustumCulled = false;
                
                // 📝 備份原始材質 (這一步最重要，因為等下我們要換掉它)
                if (!obj.userData.originalMat) {
                    // 如果是陣列材質，我們就只備份第一個，或是保持原樣
                    obj.userData.originalMat = Array.isArray(obj.material) ? obj.material : obj.material.clone();
                }

                // 標記眼睛
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

  // 2. 🌟 強制換裝特效 (Material Swapping)
  useEffect(() => {
    if (!vrm) return;

    // 製作一件「藍色全像投影制服」
    // 使用 MeshBasicMaterial，這是最簡單、效能最好、絕對不會出錯的材質
    const hologramMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,      // 青色
        wireframe: true,      // 線框模式
        transparent: true,    // 透明
        opacity: 0.3,         // 半透明
        skinning: true,       // ⚠️ 關鍵：一定要開啟 skinning，不然角色動的時候衣服會留在原地！
        side: THREE.DoubleSide // 雙面渲染，看起來更立體
    });

    vrm.scene.traverse((obj) => {
        if (obj.isMesh && obj.userData.originalMat) {
            
            // A. 眼睛：保持原樣 (不換裝)
            if (obj.userData.isEye) {
                // 確保眼睛用的是原本的材質
                obj.material = obj.userData.originalMat;
                
                // 稍微加亮一點點就好 (如果是 Standard 材質)
                if (obj.material.emissive) obj.material.emissive.setHex(0x222222);
            } 
            
            // B. 身體：換裝！
            else {
                if (!unlocked) {
                    // --- 🔒 鎖定模式：穿上藍色制服 ---
                    // 我們直接把材質「換掉」，而不是「修改」
                    // 這樣不管原本材質多複雜，都沒關係了
                    obj.material = hologramMaterial;
                    
                    obj.castShadow = false;
                    obj.receiveShadow = false;
                } else {
                    // --- 🔓 解鎖模式：穿回原本的衣服 ---
                    obj.material = obj.userData.originalMat;
                    
                    // 確保原本材質的屬性是正常的
                    if (obj.material.wireframe !== undefined) obj.material.wireframe = false;
                    if (obj.material.transparent !== undefined) obj.material.transparent = false;
                    if (obj.material.opacity !== undefined) obj.material.opacity = 1.0;
                    if (obj.material.emissive) obj.material.emissive.setHex(0x000000);

                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            }
        }
    });

  }, [unlocked, vrm]);

  // 3. 動畫
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
