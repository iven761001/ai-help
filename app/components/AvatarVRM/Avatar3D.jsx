"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js"; // 引入 FBX 讀取器
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// --- 🌟 Mixamo -> VRM 骨架對照表 ---
// 這就像是翻譯機，把 Mixamo 的骨頭名稱翻譯成 VRM 聽得懂的名字
const mixamoVRMMap = {
  mixamorigHips: "hips",
  mixamorigSpine: "spine",
  mixamorigSpine1: "chest",
  mixamorigSpine2: "upperChest",
  mixamorigNeck: "neck",
  mixamorigHead: "head",
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
  
  // 1. 載入 VRM 模型
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  // 2. 🌟 載入 Mixamo 動畫 (idle.fbx)
  // 如果妳下載了其他動作，只要改這裡的檔名就好
  const fbx = useLoader(FBXLoader, "/vrm/idle.fbx", (loader) => {
     loader.crossOrigin = "anonymous";
  });

  const [vrm, setVrm] = useState(null);
  const [mixer, setMixer] = useState(null); // 動畫混合器
  const floatGroupRef = useRef();
  
  // 互動狀態
  const [interaction, setInteraction] = useState(null);
  const interactionTimer = useRef(null);

  // 初始化 VRM
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    VRMUtils.rotateVRM0(loadedVrm);
    
    // 材質處理 (保留之前的通用邏輯)
    loadedVrm.scene.traverse((obj) => {
        if (obj.isMesh && obj.material) {
            obj.frustumCulled = false;
            if (!obj.userData.originalMat) obj.userData.originalMat = Array.isArray(obj.material) ? obj.material : obj.material.clone();
            const name = obj.name.toLowerCase();
            const matName = obj.material.name ? obj.material.name.toLowerCase() : "";
            obj.userData.isEye = name.includes("eye") || matName.includes("eye") || name.includes("face") || matName.includes("iris");
        }
    });

    // 初始姿勢：先把手臂放下，避免 T-Pose 太醜 (雖然馬上會被動畫覆蓋)
    if(loadedVrm.humanoid) {
        const resetBone = (name, z) => {
            const node = loadedVrm.humanoid.getNormalizedBoneNode(name);
            if(node) node.rotation.set(0,0,z);
        };
        resetBone('leftUpperArm', 1.3);
        resetBone('rightUpperArm', -1.3);
    }

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady]);

  // 🌟 初始化 Mixamo 動畫
  useEffect(() => {
    if (!fbx) return;
    // 建立一個混合器來播放 FBX 的動畫
    const newMixer = new THREE.AnimationMixer(fbx);
    const action = newMixer.clipAction(fbx.animations[0]);
    action.play();
    setMixer(newMixer);
  }, [fbx]);

  // 特效切換 (保持不變)
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

  // 🌟 動畫核心迴圈
  useFrame((state, delta) => {
    // 1. 更新 Mixamo 動畫進度
    if (mixer) mixer.update(delta);

    // 2. 🌟 骨架轉譯 (Retargeting)
    // 把 Mixamo 隱形骨架的旋轉角度，複製到 VRM 身上
    if (vrm && fbx && !isApproaching) {
        // 只有在「待機」時才使用 Mixamo 動畫
        // 如果正在靠近 (isApproaching)，我們用程式控制滑行，避免衝突
        
        fbx.traverse((obj) => {
            if (obj.isBone && mixamoVRMMap[obj.name]) {
                const vrmBoneName = mixamoVRMMap[obj.name];
                const vrmNode = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
                if (vrmNode) {
                    // 複製旋轉
                    vrmNode.quaternion.copy(obj.quaternion);
                    
                    // 針對 VRM 手臂角度做一點修正 (Mixamo 是 T-Pose，VRM 也是，但有時候角度會差一點)
                    // 這裡不做複雜修正，直接套用通常就很自然了
                }
            }
        });
    }

    // 3. 互動與浮動邏輯
    const t = state.clock.elapsedTime;
    if (floatGroupRef.current) {
        if (isApproaching) {
            floatGroupRef.current.position.z = THREE.MathUtils.lerp(floatGroupRef.current.position.z, 2.5, delta * 2);
            floatGroupRef.current.position.y = THREE.MathUtils.lerp(floatGroupRef.current.position.y, 0, delta * 3);
        } else {
            // 待機浮動 (配合呼吸動畫會更自然)
            floatGroupRef.current.position.y = Math.sin(t * 1.2) * 0.05 + 0.05; 
            floatGroupRef.current.position.z = THREE.MathUtils.lerp(floatGroupRef.current.position.z, 0, delta * 2);
        }
    }

    // 4. 表情與互動覆蓋
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

        // 🌟 互動動作 (疊加在 Mixamo 動畫之上)
        if (interaction === 'head') {
             const head = vrm.humanoid.getNormalizedBoneNode('head');
             if(head) {
                 head.rotation.z += Math.sin(t * 15) * 0.1; // 搖頭
             }
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
