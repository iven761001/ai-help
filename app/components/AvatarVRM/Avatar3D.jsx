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

export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false, isApproaching = false }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  const gltf = useLoader(
    GLTFLoader, url, 
    (loader) => {
      loader.crossOrigin = "anonymous";
      loader.register((parser) => new VRMLoaderPlugin(parser));
    },
    null,
    (error) => console.error("3D Loading Error:", error)
  );

  const [vrm, setVrm] = useState(null);
  const floatGroupRef = useRef();
  
  // 🌟 新增：互動狀態 ('head', 'body', null)
  const [interaction, setInteraction] = useState(null);
  // 用來計時恢復正常狀態
  const interactionTimer = useRef(null);

  // 1. 初始化
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    try {
        VRMUtils.rotateVRM0(loadedVrm);
        loadedVrm.scene.traverse((obj) => {
            if (obj.isMesh && obj.material) {
                obj.frustumCulled = false;
                if (!obj.userData.originalMat) {
                    obj.userData.originalMat = Array.isArray(obj.material) ? obj.material : obj.material.clone();
                }
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

  // 2. 特效
  useEffect(() => {
    if (!vrm) return;
    const hologramMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.3, skinning: true, side: THREE.DoubleSide
    });

    vrm.scene.traverse((obj) => {
        if (obj.isMesh && obj.userData.originalMat) {
            if (obj.userData.isEye) {
                obj.material = obj.userData.originalMat;
                if (obj.material.emissive) obj.material.emissive.setHex(0x222222);
            } else {
                if (!unlocked) {
                    obj.material = hologramMaterial;
                    obj.castShadow = false; obj.receiveShadow = false;
                } else {
                    obj.material = obj.userData.originalMat;
                    if (obj.material.wireframe !== undefined) obj.material.wireframe = false;
                    if (obj.material.transparent !== undefined) obj.material.transparent = false;
                    if (obj.material.opacity !== undefined) obj.material.opacity = 1.0;
                    if (obj.material.emissive) obj.material.emissive.setHex(0x000000);
                    obj.castShadow = true; obj.receiveShadow = true;
                }
                obj.material.needsUpdate = true;
            }
        }
    });
  }, [unlocked, vrm]);

  // 🌟 3. 處理點擊事件
  const handlePointerDown = (e) => {
    // 只有在實體化 (unlocked) 後才能互動，不然還在投影中摸不到
    if (!unlocked) return;
    
    e.stopPropagation(); // 防止點擊穿透到背景
    const hitY = e.point.y; // 取得點擊高度 (世界座標)

    // 清除舊的計時器
    if (interactionTimer.current) clearTimeout(interactionTimer.current);

    // 判斷高度：大約 1.3m 以上算頭，以下算身體
    if (hitY > 1.3) {
        console.log("Touch: HEAD");
        setInteraction('head');
    } else {
        console.log("Touch: BODY");
        setInteraction('body');
    }

    // 1.5秒後恢復正常
    interactionTimer.current = setTimeout(() => {
        setInteraction(null);
    }, 1500);
  };

  // 4. 動畫迴圈 (加入互動反應)
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // A. 浮動/滑行邏輯 (保持不變)
    if (floatGroupRef.current) {
        if (isApproaching) {
            floatGroupRef.current.position.z = THREE.MathUtils.lerp(floatGroupRef.current.position.z, 2.5, delta * 2);
            floatGroupRef.current.position.y = THREE.MathUtils.lerp(floatGroupRef.current.position.y, 0, delta * 3);
            if (vrm && vrm.humanoid) {
                const hips = vrm.humanoid.getNormalizedBoneNode('hips');
                if(hips) hips.rotation.x = THREE.MathUtils.lerp(hips.rotation.x, 0.1, delta * 5);
            }
        } else {
            // 待機浮動
            const floatHeight = Math.sin(t * 1.2) * 0.05 + 0.05; 
            floatGroupRef.current.position.y = floatHeight;
            floatGroupRef.current.position.z = THREE.MathUtils.lerp(floatGroupRef.current.position.z, 0, delta * 2);
        }
    }

    // B. 表情與骨架動畫
    if (vrm && vrm.humanoid) {
        // --- 表情控制 ---
        const blinkVal = Math.max(0, Math.sin(t * 2.5) * 5 - 4);
        
        // 判斷當前應該顯示的快樂值
        let happyWeight = (emotion === 'happy' || isApproaching) ? 1.0 : 0;
        let neutralWeight = (emotion === 'neutral' && !isApproaching) ? 0.5 : 0;
        let blinkWeight = Math.min(1, blinkVal);

        // 🌟 互動表情覆蓋
        if (interaction === 'head') {
            happyWeight = 1.0; // 摸頭會很開心
            blinkWeight = 0;   // 開心時眼睛可能會瞇起來 (Happy 自帶)
            neutralWeight = 0;
        } else if (interaction === 'body') {
            neutralWeight = 0; // 戳身體會驚訝或撒嬌
            happyWeight = 0.2; 
            // 這裡可以設 surprise，但大部分 VRM 預設只有 joy, angry, sorrow, fun
        }

        if (vrm.expressionManager) {
            vrm.expressionManager.setValue('blink', blinkWeight);
            vrm.expressionManager.setValue('happy', happyWeight);
            vrm.expressionManager.setValue('neutral', neutralWeight);
            vrm.expressionManager.update();
        }

        // --- 骨架動作反應 ---
        const spine = vrm.humanoid.getNormalizedBoneNode('spine');
        const head = vrm.humanoid.getNormalizedBoneNode('head');
        const neck = vrm.humanoid.getNormalizedBoneNode('neck');
        
        // 基礎呼吸
        let targetSpineRotX = (!isApproaching) ? Math.sin(t) * 0.02 : 0;
        let targetHeadRotZ = 0;
        let targetHeadRotY = 0;

        // 🌟 互動動作覆蓋
        if (interaction === 'head') {
            // 摸頭：頭部左右搖擺 (撒嬌)
            targetHeadRotZ = Math.sin(t * 15) * 0.1; 
            targetHeadRotY = Math.sin(t * 5) * 0.1;
        } else if (interaction === 'body') {
            // 戳身體：身體微縮 (驚訝) + 快速呼吸
            targetSpineRotX = Math.sin(t * 20) * 0.05 - 0.1; 
        }

        // 平滑插值 (Lerp) 讓動作不僵硬
        if(spine) spine.rotation.x = THREE.MathUtils.lerp(spine.rotation.x, targetSpineRotX, 0.1);
        if(head) {
            head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, targetHeadRotZ, 0.1);
            head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetHeadRotY, 0.1);
        }
        
        vrm.update(delta);
    }
  });

  return vrm ? (
    <group ref={floatGroupRef}>
      <primitive 
        object={vrm.scene} 
        // 🌟 加入點擊事件
        onPointerDown={handlePointerDown}
        // 🌟 滑鼠移上去變手指
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      />
    </group>
  ) : null;
}
