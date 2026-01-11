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
  
  // 互動狀態
  const [interaction, setInteraction] = useState(null);
  const interactionTimer = useRef(null);

  // 🌟 效能優化：把骨架存起來，不要每秒抓 60 次
  const bonesRef = useRef({
      head: null,
      neck: null,
      spine: null,
      hips: null
  });

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

        // 🌟 快取骨架節點
        if (loadedVrm.humanoid) {
            bonesRef.current.head = loadedVrm.humanoid.getNormalizedBoneNode('head');
            bonesRef.current.neck = loadedVrm.humanoid.getNormalizedBoneNode('neck');
            bonesRef.current.spine = loadedVrm.humanoid.getNormalizedBoneNode('spine');
            bonesRef.current.hips = loadedVrm.humanoid.getNormalizedBoneNode('hips');
        }

    } catch (e) { console.error("VRM Init Error:", e); }
    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady]);

  // 2. 特效 (保持不變)
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

  // 🌟 3. 改良版點擊：點擊隱形箱子，而不是複雜模型
  const handleHitBoxClick = (e) => {
    if (!unlocked) return;
    e.stopPropagation();
    
    // 取得點擊在 HitBox 上的相對高度
    // HitBox 高度約 1.6，中心點在 0.8
    const hitY = e.point.y; 

    if (interactionTimer.current) clearTimeout(interactionTimer.current);

    // 判斷邏輯優化
    if (hitY > 1.3) {
        setInteraction('head'); // 摸頭
    } else {
        setInteraction('body'); // 戳身體
    }

    interactionTimer.current = setTimeout(() => {
        setInteraction(null);
    }, 1500);
  };

  // 4. 動畫迴圈
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // A. 浮動/滑行
    if (floatGroupRef.current) {
        if (isApproaching) {
            floatGroupRef.current.position.z = THREE.MathUtils.lerp(floatGroupRef.current.position.z, 2.5, delta * 2);
            floatGroupRef.current.position.y = THREE.MathUtils.lerp(floatGroupRef.current.position.y, 0, delta * 3);
            // 靠近時，身體前傾
            const { hips } = bonesRef.current;
            if(hips) hips.rotation.x = THREE.MathUtils.lerp(hips.rotation.x, 0.1, delta * 5);
        } else {
            // 待機浮動
            const floatHeight = Math.sin(t * 1.2) * 0.05 + 0.05; 
            floatGroupRef.current.position.y = floatHeight;
            floatGroupRef.current.position.z = THREE.MathUtils.lerp(floatGroupRef.current.position.z, 0, delta * 2);
        }
    }

    // B. 表情與骨架動畫
    if (vrm) {
        // 表情
        const blinkVal = Math.max(0, Math.sin(t * 2.5) * 5 - 4);
        let happyWeight = (emotion === 'happy' || isApproaching) ? 1.0 : 0;
        let neutralWeight = (emotion === 'neutral' && !isApproaching) ? 0.5 : 0;
        let blinkWeight = Math.min(1, blinkVal);

        if (interaction === 'head') {
            happyWeight = 1.0; 
            blinkWeight = 0;   
            neutralWeight = 0;
        } else if (interaction === 'body') {
            neutralWeight = 0; 
            happyWeight = 0.2; 
        }

        if (vrm.expressionManager) {
            vrm.expressionManager.setValue('blink', blinkWeight);
            vrm.expressionManager.setValue('happy', happyWeight);
            vrm.expressionManager.setValue('neutral', neutralWeight);
            vrm.expressionManager.update();
        }

        // 骨架反應 (使用快取的骨架，效能 UP)
        const { spine, head } = bonesRef.current;
        
        let targetSpineRotX = (!isApproaching) ? Math.sin(t) * 0.02 : 0;
        let targetHeadRotZ = 0;
        let targetHeadRotY = 0;

        if (interaction === 'head') {
            // 摸頭搖擺
            targetHeadRotZ = Math.sin(t * 15) * 0.1; 
            targetHeadRotY = Math.sin(t * 5) * 0.1;
        } else if (interaction === 'body') {
            // 戳身體後縮
            targetSpineRotX = Math.sin(t * 20) * 0.05 - 0.1; 
        }

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
      <primitive object={vrm.scene} />
      
      {/* 🌟 隱形碰撞箱 (HitBox) 
        這是一個看不見的圓柱體，包在角色外面。
        我們點擊這個簡單形狀，而不是點擊複雜的角色，這樣手機就不會卡了！
      */}
      <mesh 
        position={[0, 0.8, 0]} // 中心點約在腰部
        onClick={handleHitBoxClick}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
        visible={false} // 設為 false 讓它隱形，但依然可以接受點擊
      >
        <cylinderGeometry args={[0.4, 0.4, 1.7, 8]} /> {/* 寬0.4, 高1.7 的圓柱 */}
        <meshBasicMaterial color="red" wireframe opacity={0.5} transparent />
      </mesh>

    </group>
  ) : null;
}
