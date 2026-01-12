"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

import { NATURAL_POSE_CONFIG } from "../../utils/avatar-config";
import { useAvatarAnimation } from "../../hooks/useAvatarAnimation";

function applyNaturalPose(vrm) {
  if (!vrm || !vrm.humanoid) return;
  Object.entries(NATURAL_POSE_CONFIG).forEach(([boneName, rotation]) => {
    const node = vrm.humanoid.getNormalizedBoneNode(boneName);
    if (node) node.rotation.set(...rotation);
  });
}

export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false, isApproaching = false }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
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

  // 掛載動畫 Hook (上半身)
  useAvatarAnimation(vrm, "/vrm/idle.fbx", isApproaching);

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
    const t = state.clock.elapsedTime;

    // 1. 浮動邏輯
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
        // 2. 表情控制
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

        // 3. 🌟 安全的「人工呼吸」 (Procedural Hips Sway)
        // 既然 Mixamo 的 Hips 會壞掉，我們就自己手動轉！
        // 這樣既安全，又不會像木頭人
        if (!isApproaching) {
            const hips = vrm.humanoid.getNormalizedBoneNode('hips');
            if (hips) {
                // 輕微的左右搖擺 (Z軸) 和 呼吸起伏 (X軸)
                // 這些角度很小，絕對安全
                hips.rotation.z = Math.sin(t * 0.8) * 0.02; 
                hips.rotation.x = Math.sin(t * 1.2) * 0.01; 
            }
        }

        // 4. 互動反應 (搖頭)
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
