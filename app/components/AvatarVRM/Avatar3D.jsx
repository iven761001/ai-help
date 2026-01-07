"use client";

import React, { useEffect, useMemo, useState, useRef, forwardRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// 姿勢調整
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

// 獨立的掃描光環組件
const ScannerRing = forwardRef((props, ref) => {
  return (
    <group ref={ref} position={[0, 0, 0]}>
      {/* 亮環 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.45, 0.48, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={1} />
      </mesh>
      {/* 暈光 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.4, 0.6, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
});
ScannerRing.displayName = "ScannerRing";

export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
  // 用來分類 mesh，方便後續處理
  const [meshes, setMeshes] = useState({ eyes: [], body: [] });
  
  // 🌟 1. 建立裁切平面 (保留平面下方的物件)
  // 初始設為 0 (腳底)，這樣剛開始模型是從腳底開始生長
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  
  // 🌟 2. 建立全像材質 (Wireframe + 裁切)
  const hologramMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    clippingPlanes: [clippingPlane], // 綁定裁切面
  }), [clippingPlane]);

  const scannerRef = useRef();
  const scanYRef = useRef(0);
  const targetScanY = 2.2; 

  // 初始化模型
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    const eyeMeshes = [];
    const bodyMeshes = [];

    try {
        VRMUtils.rotateVRM0(loadedVrm);
        applyNaturalPose(loadedVrm);

        // 遍歷模型，備份材質並分類
        loadedVrm.scene.traverse((obj) => {
            if (obj.isMesh) {
                obj.frustumCulled = false;
                // 備份原始材質
                if (!obj.userData.originalMat) obj.userData.originalMat = obj.material;

                const matName = obj.material.name || "";
                const objName = obj.name || "";
                const isEye = matName.toLowerCase().includes("eye") || 
                              matName.toLowerCase().includes("face") || 
                              objName.toLowerCase().includes("iris");
                
                if (isEye) eyeMeshes.push(obj);
                else bodyMeshes.push(obj);
            }
        });

        // 重置掃描狀態
        scanYRef.current = 0;
        clippingPlane.constant = 0;

    } catch (e) { console.error(e); }

    setMeshes({ eyes: eyeMeshes, body: bodyMeshes });
    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady, clippingPlane]);

  // 🌟 關鍵修正：材質切換邏輯移到 useEffect (避免 crash)
  useEffect(() => {
    if (!vrm) return;

    if (unlocked) {
        // --- 解鎖狀態：恢復原廠設定 ---
        clippingPlane.constant = 100.0; // 取消裁切
        if (scannerRef.current) scannerRef.current.visible = false;

        meshes.eyes.concat(meshes.body).forEach(mesh => {
            mesh.visible = true;
            if (mesh.userData.originalMat) {
                mesh.material = mesh.userData.originalMat;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
        });
    } else {
        // --- 鎖定狀態：切換到全像材質 ---
        // 這裡只做一次材質替換，不要在 useFrame 做
        meshes.body.forEach(mesh => {
            mesh.material = hologramMat;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
        });
        // 眼睛先隱藏 (等掃描到了再開)
        meshes.eyes.forEach(eye => { eye.visible = false; });
        
        if (scannerRef.current) scannerRef.current.visible = true;
    }
  }, [vrm, unlocked, meshes, hologramMat, clippingPlane]);


  // 動畫迴圈 (只負責數值更新)
  useFrame((state, delta) => {
    // A. 掃描動畫 (獨立運行，保證光環會動)
    if (!unlocked) {
        scanYRef.current = THREE.MathUtils.lerp(scanYRef.current, targetScanY + 0.1, delta * 0.8);
        
        // 1. 更新裁切面 -> 身體長出來
        clippingPlane.constant = scanYRef.current;
        
        // 2. 更新光環位置
        if (scannerRef.current) {
            scannerRef.current.position.y = scanYRef.current;
            // 掃描完隱藏
            if (scanYRef.current > 2.0) scannerRef.current.visible = false;
        }

        // 3. 眼睛邏輯 (掃到脖子才顯示)
        const headHeight = 1.35;
        if (scanYRef.current > headHeight) {
            meshes.eyes.forEach(eye => {
                if (!eye.visible) {
                    eye.visible = true;
                    // 確保眼睛是原始材質
                    if (eye.material !== eye.userData.originalMat) eye.material = eye.userData.originalMat;
                    if (eye.material.emissive) eye.material.emissive.setHex(0x333333);
                }
            });
        }
    }

    // B. 表情與呼吸 (如果有模型)
    if (vrm) {
        const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2.5) * 5 - 4);
        if (vrm.expressionManager) {
            vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
            vrm.expressionManager.setValue('happy', emotion === 'happy' ? 1.0 : 0);
            vrm.expressionManager.setValue('neutral', emotion === 'neutral' ? 0.5 : 0);
            vrm.expressionManager.update();
        }
        vrm.update(delta);
    }
  });

  return (
    <>
      {vrm && <primitive object={vrm.scene} />}
      {/* 掃描光環 (即使模型還沒好，光環也會動) */}
      <ScannerRing ref={scannerRef} />
    </>
  );
}
