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

export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
  
  // 🌟 1. 定義裁切平面：Vector3(0, -1, 0) 代表保留平面下方的物體
  // constant 一開始設為 -0.1 (腳底附近)，這樣一開始是隱形的 (因為全身都在 y>-0.1)
  // 隨著 constant 變大 (變成 2.0)，裁切平面往上移，身體就露出來了
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), -0.1), []);
  
  // 🌟 2. 定義全像材質 (Wireframe)
  const hologramMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    clippingPlanes: [clippingPlane], // 綁定平面
  }), [clippingPlane]);

  // 掃描光環的 Ref
  const scannerRef = useRef();
  
  // 掃描動態數值 (Y軸高度)
  // 初始值設為 0.0 (腳底)
  const scanY = useRef(0.0);

  // 初始化模型
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    VRMUtils.rotateVRM0(loadedVrm);
    applyNaturalPose(loadedVrm);

    // 備份原始材質
    loadedVrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false;
        if (!obj.userData.originalMat) obj.userData.originalMat = obj.material;
      }
    });

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
    
    // 重置掃描
    scanY.current = 0.0;
    clippingPlane.constant = 0.0;

  }, [gltf, onReady, clippingPlane]);

  useFrame((state, delta) => {
    
    // ---------------------------------------------
    // Part A: 掃描動畫 (一定要跑，不管有沒有模型)
    // ---------------------------------------------
    if (!unlocked) {
        // 1. 讓掃描線往上升 (目標高度 2.0)
        scanY.current = THREE.MathUtils.lerp(scanY.current, 2.2, delta * 0.8);
        
        // 2. 更新裁切平面 (這行最重要！讓身體長出來)
        // 因為 Plane Normal 是 (0, -1, 0)，所以 Constant = Y
        clippingPlane.constant = scanY.current;

        // 3. 更新光環位置
        if (scannerRef.current) {
            scannerRef.current.position.y = scanY.current;
            // 如果超過頭頂，隱藏光環
            scannerRef.current.visible = scanY.current < 2.0;
        }
    } else {
        // 解鎖狀態：取消裁切
        clippingPlane.constant = 100.0;
        if (scannerRef.current) scannerRef.current.visible = false;
    }

    // ---------------------------------------------
    // Part B: 模型狀態更新
    // ---------------------------------------------
    if (vrm) {
        // 遍歷所有 Mesh，確保材質正確
        vrm.scene.traverse((obj) => {
            if (obj.isMesh) {
                // 判斷是否為眼睛
                const matName = obj.material.name || "";
                const objName = obj.name || "";
                const isEye = matName.toLowerCase().includes("eye") || 
                              matName.toLowerCase().includes("face") || 
                              objName.toLowerCase().includes("iris");

                if (!unlocked) {
                    // --- 鎖定狀態 ---
                    
                    if (isEye) {
                        // 眼睛邏輯：掃描線超過 1.35 (脖子) 才顯示
                        // 我們用 visibility 控制，因為裁切平面會切掉它們
                        const eyesVisible = scanY.current > 1.35;
                        obj.visible = eyesVisible; 
                        
                        // 眼睛始終用原材質 (但被 visible 控制)
                        if (obj.material !== obj.userData.originalMat) obj.material = obj.userData.originalMat;
                    } else {
                        // 身體邏輯：強制用全像材質
                        if (obj.material !== hologramMat) {
                            obj.material = hologramMat;
                            obj.castShadow = false;
                        }
                    }
                } else {
                    // --- 解鎖狀態 ---
                    obj.visible = true;
                    // 恢復原材質
                    if (obj.material !== obj.userData.originalMat) {
                        obj.material = obj.userData.originalMat;
                        obj.castShadow = true;
                    }
                }
            }
        });

        // 眨眼與呼吸
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
      {/* 模型本體 */}
      {vrm && <primitive object={vrm.scene} />}
      
      {/* 掃描光環 (放在這裡跟模型同一層) */}
      <group ref={scannerRef} position={[0, 0, 0]}>
          <mesh rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[0.45, 0.48, 32]} />
            <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={1} />
          </mesh>
          <mesh rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[0.4, 0.6, 32]} />
            <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.2} blending={THREE.AdditiveBlending} />
          </mesh>
      </group>
    </>
  );
}
