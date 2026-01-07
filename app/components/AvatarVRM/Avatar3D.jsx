// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// 讓角色自然站立
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

// 掃描光環 (視覺組件)
function ScannerRing({ ringRef }) {
  return (
    <group ref={ringRef} position={[0, 0, 0]}>
      {/* 亮光圈 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.5, 0.55, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>
      {/* 暈光 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.4, 0.7, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
  
  // 🌟 核心：建立裁切平面
  // Vector3(0, -1, 0) 意思是「保留平面下方的東西」
  // 初始 constant = 0 (腳底)
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  
  const scannerRef = useRef();
  const scanY = useRef(0);
  const targetY = 2.0;

  // 1. 初始化 (只執行一次)
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    VRMUtils.rotateVRM0(loadedVrm);
    applyNaturalPose(loadedVrm);

    // 遍歷材質，只做一次設定
    loadedVrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false;
        
        // 備份原始材質
        if (!obj.userData.originalMat) {
            obj.userData.originalMat = obj.material; // 這裡不 clone，直接引用
        }

        // 判斷眼睛
        const isEye = obj.name.toLowerCase().includes("eye") || obj.material.name.toLowerCase().includes("eye");
        obj.userData.isEye = isEye; // 標記起來

        // 設定裁切平面 (所有 Mesh 都受此平面影響)
        // 為了安全，我們先把所有材質都加上裁切面
        obj.material.clippingPlanes = [clippingPlane];
        obj.material.clipShadows = true;
      }
    });

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
    
    // 重置變數
    scanY.current = 0;
    clippingPlane.constant = 0;

  }, [gltf, onReady, clippingPlane]);

  // 2. 狀態監聽 (當 unlocked 改變時執行)
  useEffect(() => {
    if (!vrm) return;
    
    vrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        if (!unlocked) {
            // --- 鎖定模式 (Hologram) ---
            if (!obj.userData.isEye) {
                // 身體：變成線框、青色
                obj.material.wireframe = true;
                obj.material.color.setHex(0x00ffff);
                obj.material.emissive.setHex(0x002244);
            }
            // 眼睛：保持原樣，但受裁切影響
            obj.material.clippingPlanes = [clippingPlane];
        } else {
            // --- 解鎖模式 (Normal) ---
            // 恢復原狀
            obj.material.wireframe = false;
            obj.material.color.setHex(0xffffff);
            obj.material.emissive.setHex(0x000000);
            // 移除裁切 (設為 null)
            obj.material.clippingPlanes = null;
        }
        obj.material.needsUpdate = true; // 通知 Three.js 更新材質
      }
    });
    
    if (unlocked) {
        // 如果解鎖，把光環藏起來
        if (scannerRef.current) scannerRef.current.visible = false;
    } else {
        // 如果重置，把光環顯示出來，並重置高度
        if (scannerRef.current) scannerRef.current.visible = true;
        scanY.current = 0;
    }

  }, [unlocked, vrm, clippingPlane]);


  // 3. 動畫迴圈 (極輕量)
  useFrame((state, delta) => {
    if (unlocked) return; // 解鎖後就不跑這段，節省效能

    // 讓掃描線上升
    // 這裡用 Lerp 讓它慢慢接近目標高度
    scanY.current = THREE.MathUtils.lerp(scanY.current, targetY + 0.1, delta * 0.8);
    
    // 🌟 關鍵：更新裁切平面高度
    // 因為 plane.constant 是參照值，所有材質都會自動更新，不用遍歷！
    clippingPlane.constant = scanY.current;

    // 更新光環位置
    if (scannerRef.current) {
        scannerRef.current.position.y = scanY.current;
        // 超過頭頂就隱藏光環
        scannerRef.current.visible = scanY.current < 2.0;
    }

    // 眨眼動畫
    if (vrm && vrm.expressionManager) {
        const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2.5) * 5 - 4);
        vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
        vrm.expressionManager.update();
    }
  });

  return (
    <>
      {vrm && <primitive object={vrm.scene} />}
      <ScannerRing ringRef={scannerRef} />
    </>
  );
}
