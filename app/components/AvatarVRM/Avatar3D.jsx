"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// --- 🌟 智慧骨架過濾表 ---
// 這裡就是「業界秘訣」：對於待機動作，直接把下半身"屏蔽"掉
const mixamoVRMMap = {
  // ❌ 封鎖屁股 (Hips)：這是萬惡之源，關掉它，模型就不會折疊了！
  // mixamorigHips: "hips", 

  // ✅ 開啟脊椎 (Spine)：這是呼吸的核心，會帶動胸口起伏
  mixamorigSpine: "spine",
  mixamorigSpine1: "chest",
  mixamorigSpine2: "upperChest",
  
  // ✅ 開啟頭頸 (Neck/Head)：讓頭部有自然的微動
  mixamorigNeck: "neck",
  mixamorigHead: "head",
  
  // ✅ 開啟手臂 (Arms)：但在程式碼中我們會降低它的影響力
  mixamorigLeftShoulder: "leftShoulder",
  mixamorigLeftArm: "leftUpperArm",
  mixamorigLeftForeArm: "leftLowerArm",
  mixamorigLeftHand: "leftHand",
  
  mixamorigRightShoulder: "rightShoulder",
  mixamorigRightArm: "rightUpperArm",
  mixamorigRightForeArm: "rightLowerArm",
  mixamorigRightHand: "rightHand",

  // ❌ 封鎖腿部 (Legs)：讓她穩穩站著，不要滑步或變形
  // mixamorigLeftUpLeg: "leftUpperLeg",
  // mixamorigLeftLeg: "leftLowerLeg",
  // mixamorigLeftFoot: "leftFoot",
  // mixamorigRightUpLeg: "rightUpperLeg",
  // mixamorigRightLeg: "rightLowerLeg",
  // mixamorigRightFoot: "rightFoot",
};

function applyNaturalPose(vrm) {
  if (!vrm || !vrm.humanoid) return;
  const rotateBone = (name, x, y, z) => {
    const bone = vrm.humanoid.getNormalizedBoneNode(name);
    if (bone) bone.rotation.set(x, y, z);
  };
  // 確保初始姿勢是自然的 A-Pose (雙手下垂)
  rotateBone('leftUpperArm',  0, 0, 1.3);
  rotateBone('rightUpperArm', 0, 0, -1.3);
  rotateBone('leftLowerArm',  0, 0, 0.1);
  rotateBone('rightLowerArm', 0, 0, -0.1);
}

export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false, isApproaching = false }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  // 載入妳上傳的 idle.fbx
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
    
    loadedVrm.scene.traverse((obj) => {
        if (obj.isMesh && obj.material) {
            obj.frustumCulled = false;
            if (!obj.userData.originalMat) obj.userData.originalMat = Array.isArray(obj.material) ? obj.material : obj.material.clone();
            const name = obj.name.toLowerCase();
            const matName = obj.material.name ? obj.material.name.toLowerCase() : "";
            obj.userData.isEye = name.includes("eye") || matName.includes("eye") || name.includes("face") || matName.includes("iris");
        }
    });

    applyNaturalPose(loadedVrm);
    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady]);

  // 初始化 Mixamo 動畫
  useEffect(() => {
    if (!fbx) return;
    const newMixer = new THREE.AnimationMixer(fbx);
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

    // 🌟 核心轉譯邏輯 (Retargeting)
    if (vrm && fbx && !isApproaching) {
        fbx.traverse((mixamoBone) => {
            if (mixamoBone.isBone && mixamoVRMMap[mixamoBone.name]) {
                const vrmBoneName = mixamoVRMMap[mixamoBone.name];
                const vrmBone = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
                
                if (vrmBone) {
                    // 🌟 智慧權重控制：
                    // 如果是脊椎 (Spine)，我們給 1.0 (完全跟隨動畫)，保證呼吸明顯
                    // 如果是手臂 (Arm)，我們只給 0.3 (輕微跟隨)，避免被 T-Pose 拉壞
                    const isArm = vrmBoneName.includes('Arm') || vrmBoneName.includes('Hand') || vrmBoneName.includes('Shoulder');
                    const weight = isArm ? 0.3 : 1.0; 

                    // 使用 slerp (球面線性插值) 平滑過渡
                    // 這就是為什麼手臂不會折斷的原因，我們只取了 30% 的旋轉量
                    vrmBone.quaternion.slerp(mixamoBone.quaternion, weight);
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
            // 讓浮動配合呼吸節奏
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
