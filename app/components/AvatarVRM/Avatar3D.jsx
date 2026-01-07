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

// 掃描光環組件 (獨立存在)
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
  
  // 🌟 建立裁切平面：Normal (0, -1, 0) 代表保留平面「下方」的物體
  // 初始 constant = 0 代表只顯示 y < 0 (也就是全部切掉，除了腳底板)
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  
  const scannerRef = useRef();
  const scanY = useRef(0);
  const targetY = 2.0; // 頭頂高度

  // 1. 初始化模型 (只執行一次，絕對安全)
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    
    // VRM 初始化
    VRMUtils.rotateVRM0(loadedVrm);
    applyNaturalPose(loadedVrm);

    // 遍歷材質，只做一次設定
    loadedVrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false; // 防止消失
        
        // 備份原始材質
        if (!obj.userData.originalMat) {
            obj.userData.originalMat = obj.material; 
        }

        // 判斷眼睛
        const isEye = obj.name.toLowerCase().includes("eye") || obj.material.name.toLowerCase().includes("eye");
        obj.userData.isEye = isEye; 

        // 🌟 關鍵：直接給原材質加上裁切平面
        // 這樣骨架絕對不會壞！
        obj.material.clippingPlanes = [clippingPlane];
        obj.material.clipShadows = true; 
      }
    });

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
    
    // 重置掃描狀態
    scanY.current = 0;
    clippingPlane.constant = 0;

  }, [gltf, onReady, clippingPlane]);

  // 2. 狀態切換監聽 (unlocked 改變時執行)
  useEffect(() => {
    if (!vrm) return;
    
    vrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        if (!unlocked) {
            // --- 鎖定模式 (Hologram) ---
            if (!obj.userData.isEye) {
                // 身體：變成線框、青色
                // 直接修改屬性，不換材質
                obj.material.wireframe = true;
                obj.material.color.setHex(0x00ffff);
                obj.material.emissive.setHex(0x001133);
            }
            // 眼睛：套用裁切
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
        obj.material.needsUpdate = true; // 通知 Three.js 更新
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


  // 3. 動畫迴圈 (極輕量，只更新數值)
  useFrame((state, delta) => {
    if (unlocked) return; // 解鎖後就不跑這段，節省效能

    // 讓掃描線上升 (Lerp 平滑移動)
    scanY.current = THREE.MathUtils.lerp(scanY.current, targetY + 0.1, delta * 0.8);
    
    // 🌟 更新裁切平面高度
    // 因為 plane.constant 是參照值，所有材質都會自動吃到這個更新，不需要遍歷！
    clippingPlane.constant = scanY.current;

    // 同步更新光環位置
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
      {/* 顯示模型 */}
      {vrm && <primitive object={vrm.scene} />}
      
      {/* 顯示掃描光環 (傳入 Ref) */}
      <ScannerRing ringRef={scannerRef} />
    </>
  );
}
