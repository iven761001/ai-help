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

export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false }) {
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
  // 🌟 新增：控制浮動的 Ref
  const floatGroupRef = useRef();

  // 1. 初始化與材質備份
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

  // 2. 強制換裝特效
  useEffect(() => {
    if (!vrm) return;
    const hologramMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
        skinning: true,
        side: THREE.DoubleSide
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
            }
        }
    });
  }, [unlocked, vrm]);

  // 3. 動畫迴圈 (包含浮動)
  useFrame((state, delta) => {
    // A. 浮動特效
    if (floatGroupRef.current) {
      // 利用時間產生正弦波，讓 Y 軸緩慢上下移動
      const floatHeight = Math.sin(state.clock.elapsedTime * 1.5) * 0.08 + 0.08; 
      floatGroupRef.current.position.y = floatHeight;
    }

    // B. VRM 動畫
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

  // 🌟 用 group 包裹起來做浮動
  return vrm ? (
    <group ref={floatGroupRef}>
      <primitive object={vrm.scene} />
    </group>
  ) : null;
}
