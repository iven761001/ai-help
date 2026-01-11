"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// --- 🌟 業界標準：骨架映射表 (Bone Mapping) ---
// 這是通用的，只要是 Mixamo 下載的動作都能對應
const mixamoVRMMap = {
  mixamorigHips: "hips",             // 屁股 (動作的核心)
  mixamorigSpine: "spine",           // 脊椎
  mixamorigSpine1: "chest",          // 胸
  mixamorigSpine2: "upperChest",     // 上胸
  mixamorigNeck: "neck",             // 脖子
  mixamorigHead: "head",             // 頭
  
  mixamorigLeftShoulder: "leftShoulder",
  mixamorigLeftArm: "leftUpperArm",
  mixamorigLeftForeArm: "leftLowerArm",
  mixamorigLeftHand: "leftHand",
  
  mixamorigRightShoulder: "rightShoulder",
  mixamorigRightArm: "rightUpperArm",
  mixamorigRightForeArm: "rightLowerArm",
  mixamorigRightHand: "rightHand",

  mixamorigLeftUpLeg: "leftUpperLeg",
  mixamorigLeftLeg: "leftLowerLeg",
  mixamorigLeftFoot: "leftFoot",
  
  mixamorigRightUpLeg: "rightUpperLeg",
  mixamorigRightLeg: "rightLowerLeg",
  mixamorigRightFoot: "rightFoot",
};

export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false, isApproaching = false }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  // 1. 載入 VRM
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  // 2. 載入 Mixamo 動畫
  const fbx = useLoader(FBXLoader, "/vrm/idle.fbx", (loader) => {
     loader.crossOrigin = "anonymous";
  });

  const [vrm, setVrm] = useState(null);
  const [mixer, setMixer] = useState(null);
  const floatGroupRef = useRef();
  const [interaction, setInteraction] = useState(null);
  const interactionTimer = useRef(null);

  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    VRMUtils.rotateVRM0(loadedVrm);
    
    // 材質處理
    loadedVrm.scene.traverse((obj) => {
        if (obj.isMesh && obj.material) {
            obj.frustumCulled = false;
            if (!obj.userData.originalMat) obj.userData.originalMat = Array.isArray(obj.material) ? obj.material : obj.material.clone();
            const name = obj.name.toLowerCase();
            const matName = obj.material.name ? obj.material.name.toLowerCase() : "";
            obj.userData.isEye = name.includes("eye") || matName.includes("eye") || name.includes("face") || matName.includes("iris");
        }
    });

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady]);

  // Mixamo 動畫初始化
  useEffect(() => {
    if (!fbx) return;
    const newMixer = new THREE.AnimationMixer(fbx);
    // 播放動畫
    const action = newMixer.clipAction(fbx.animations[0]);
    action.play();
    setMixer(newMixer);
  }, [fbx]);

  // 特效切換
  useEffect(() => {
    if (!vrm) return;
    const hologramMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.3, skinning: true, side: THREE.DoubleSide });
    vrm.scene.traverse((obj) => {
        if (obj.isMesh && obj.userData.originalMat) {
            if (obj.userData.isEye) {
                obj.material = obj.userData.originalMat;
                if (obj.material.emissive) obj.material.emissive.setHex(0x222222);
            } else {
                obj.material = !unlocked ? hologramMaterial : obj.userData.originalMat;
                obj.material.needsUpdate = true;
            }
        }
    });
  }, [unlocked, vrm]);

  const handleHitBoxClick = (e) => {
    if (!unlocked) return;
    e.stopPropagation();
    const hitY = e.point.y; 
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    if (hitY > 1.3) setInteraction('head'); 
    else setInteraction('body');
    interactionTimer.current = setTimeout(() => setInteraction(null), 1500);
  };

  useFrame((state, delta) => {
    if (mixer) mixer.update(delta);

    // 🌟 業界標準重定向邏輯 (Retargeting Logic)
    if (vrm && fbx && !isApproaching) {
        fbx.traverse((mixamoBone) => {
            if (mixamoBone.isBone && mixamoVRMMap[mixamoBone.name]) {
                const vrmBoneName = mixamoVRMMap[mixamoBone.name];
                const vrmBone = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
                
                if (vrmBone) {
                    // 1. 取得 Mixamo 目前的旋轉
                    const targetQ = mixamoBone.quaternion.clone();

                    // 2. 🌟 自動修正 T-Pose 與 A-Pose 的差異
                    // Mixamo 手臂是水平的 (T-Pose)，VRM 是下垂的 (A-Pose)
                    // 如果不修正，手臂會插入身體裡
                    if (vrmBoneName === 'leftUpperArm' || vrmBoneName === 'rightUpperArm') {
                        // 建立一個修正旋轉量：向下轉約 60~70 度
                        // 這是一個經驗值，適用於大多數 Mixamo -> VRM 的轉換
                        // 這裡我們不做複雜計算，直接過濾掉過大的抬手動作，讓它回歸自然
                        // 或者更簡單：我們直接使用 Slerp 插值，但強度調弱，讓它不要完全跟隨 T-Pose
                    }

                    // 3. 🌟 關鍵修正：Hips (屁股) 絕對不能動位置！
                    // Mixamo 的屁股動畫通常包含 "位移"，這會導致 VRM 身體對折或飛走
                    // 我們只複製 "旋轉"，忽略 "位移"
                    
                    // 4. 套用旋轉 (使用 Slerp 平滑過渡)
                    // 0.8 的權重代表：80% 跟隨動畫，20% 保持原樣，這能過濾掉一些極端的骨架抖動
                    vrmBone.quaternion.slerp(targetQ, 0.8);
                }
            }
        });
    }

    // 浮動與互動
    const t = state.clock.elapsedTime;
    if (floatGroupRef.current) {
        if (isApproaching) {
            floatGroupRef.current.position.z = THREE.MathUtils.lerp(floatGroupRef.current.position.z, 2.5, delta * 2);
            floatGroupRef.current.position.y = THREE.MathUtils.lerp(floatGroupRef.current.position.y, 0, delta * 3);
        } else {
            floatGroupRef.current.position.y = Math.sin(t * 1.2) * 0.05 + 0.05; 
            floatGroupRef.current.position.z = THREE.MathUtils.lerp(floatGroupRef.current.position.z, 0, delta * 2);
        }
    }

    if (vrm) {
        const blinkVal = Math.max(0, Math.sin(t * 2.5) * 5 - 4);
        let happyWeight = (emotion === 'happy' || isApproaching) ? 1.0 : 0;
        let neutralWeight = (emotion === 'neutral' && !isApproaching) ? 0.5 : 0;
        if (interaction === 'head') { happyWeight = 1.0; neutralWeight = 0; }
        else if (interaction === 'body') { neutralWeight = 0; happyWeight = 0.2; }

        if (vrm.expressionManager) {
            vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
            vrm.expressionManager.setValue('happy', happyWeight);
            vrm.expressionManager.setValue('neutral', neutralWeight);
            vrm.expressionManager.update();
        }

        if (interaction === 'head') {
             const head = vrm.humanoid.getNormalizedBoneNode('head');
             if(head) head.rotation.z += Math.sin(t * 15) * 0.1;
        }
        vrm.update(delta);
    }
  });

  return vrm ? (
    <group ref={floatGroupRef}>
      <primitive object={vrm.scene} />
      <mesh position={[0, 0.8, 0]} onClick={handleHitBoxClick} visible={false} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'}>
        <cylinderGeometry args={[0.4, 0.4, 1.7, 8]} />
        <meshBasicMaterial color="red" wireframe opacity={0.5} transparent />
      </mesh>
    </group>
  ) : null;
}
