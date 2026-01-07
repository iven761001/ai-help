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

// 掃描線光環組件
function ScannerRing({ scanY, visible }) {
  if (!visible) return null;
  return (
    <group position={[0, scanY, 0]}>
      {/* 發光主環 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.4, 0.42, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>
      {/* 暈光 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.35, 0.45, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.2} blending={THREE.AdditiveBlending} />
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
  const [meshes, setMeshes] = useState({ eyes: [], body: [] });
  const tRef = useRef(0);
  
  // 建立裁切平面 (初始設在非常低的位置，避免一開始就切到不該切的)
  // normal (0, -1, 0) 代表「保留平面下方」，constant 代表平面高度
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);

  const scanYRef = useRef(-0.5); // 初始高度 (地板下)
  const targetScanY = 2.0; 
  const [showScanner, setShowScanner] = useState(true);

  // 1. 模型載入邏輯
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    const eyeMeshes = [];
    const bodyMeshes = [];

    try {
        VRMUtils.rotateVRM0(loadedVrm);
        
        loadedVrm.scene.traverse((obj) => {
            if (obj.isMesh) {
                obj.frustumCulled = false;
                
                // 備份材質
                if (!obj.userData.originalMat) obj.userData.originalMat = obj.material;

                // 建立全像材質 (綁定裁切平面)
                if (!obj.userData.hologramMat) {
                    obj.userData.hologramMat = new THREE.MeshBasicMaterial({
                        color: 0x00ffff,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.15,
                        side: THREE.DoubleSide,
                        clippingPlanes: [clippingPlane], // 綁定平面
                    });
                }

                const matName = obj.material.name || "";
                const objName = obj.name || "";
                const isEye = matName.toLowerCase().includes("eye") || 
                              matName.toLowerCase().includes("face") || 
                              objName.toLowerCase().includes("iris");
                
                if (isEye) eyeMeshes.push(obj);
                else bodyMeshes.push(obj);
            }
        });

        applyNaturalPose(loadedVrm);
        
        // 每次換模型，重置掃描高度
        scanYRef.current = -0.5;
        setShowScanner(true);

    } catch (e) { console.error(e); }

    setMeshes({ eyes: eyeMeshes, body: bodyMeshes });
    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady, clippingPlane]); // 加入 clippingPlane 依賴

  // 2. 動畫迴圈
  useFrame((state, delta) => {
    
    // 🌟 修正重點：不管 vrm 載入了沒，掃描動畫都要跑！
    // 這樣光環才會升起來，裁切平面才會移動
    if (!unlocked) {
        // --- 掃描動畫 ---
        scanYRef.current = THREE.MathUtils.lerp(scanYRef.current, targetScanY + 0.1, delta * 0.8);
        
        // 更新裁切平面高度
        clippingPlane.constant = scanYRef.current;

        // 如果掃描結束，隱藏光環
        if (scanYRef.current > 1.9) setShowScanner(false);
    } else {
        // --- 解鎖狀態 ---
        clippingPlane.constant = 100.0; // 拉到很高，不裁切
        setShowScanner(false);
    }

    // --- 以下是針對模型的邏輯，必須等 vrm 載入後才執行 ---
    if (!vrm) return;

    if (!unlocked) {
        // 套用全像材質
        meshes.body.forEach(mesh => {
            if (mesh.material !== mesh.userData.hologramMat) {
                mesh.material = mesh.userData.hologramMat;
                mesh.castShadow = false;
            }
        });

        // 眼睛邏輯
        const headHeight = 1.35;
        const eyesVisible = scanYRef.current > headHeight;

        meshes.eyes.forEach(eye => {
             eye.visible = eyesVisible; // 沒掃到就隱藏
             if (eyesVisible) {
                 if (eye.material !== eye.userData.originalMat) eye.material = eye.userData.originalMat;
                 if (eye.material.emissive) eye.material.emissive.setHex(0x333333);
             }
        });

    } else {
        // 解鎖：恢復實體
        meshes.eyes.concat(meshes.body).forEach(mesh => {
            mesh.visible = true;
            if (mesh.material !== mesh.userData.originalMat) {
                mesh.material = mesh.userData.originalMat;
                mesh.castShadow = true;
            }
        });
    }

    // 表情與呼吸
    const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2.5) * 5 - 4);
    if (vrm.expressionManager) {
      vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
      vrm.expressionManager.setValue('happy', emotion === 'happy' ? 1.0 : 0);
      vrm.expressionManager.setValue('neutral', emotion === 'neutral' ? 0.5 : 0);
      vrm.expressionManager.update();
    }
    
    tRef.current += delta;
    if (vrm.humanoid) {
       const spine = vrm.humanoid.getNormalizedBoneNode('spine');
       if(spine) spine.rotation.x = Math.sin(tRef.current) * 0.02;
    }
    vrm.update(delta);
  });

  return (
      <>
        {vrm && <primitive object={vrm.scene} />}
        {/* 掃描光環：只要未解鎖且需要顯示，就顯示 (不管模型好了沒) */}
        {!unlocked && <ScannerRing scanY={scanYRef.current} visible={showScanner} />}
      </>
  );
}
