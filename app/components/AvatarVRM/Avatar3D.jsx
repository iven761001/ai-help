// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// 自然站姿
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

// 🌟 掃描線光環組件 (跟隨掃描高度)
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
  
  // 🌟 裁切平面 (用來控制身體生長)
  // normal: (0, -1, 0) 代表平面朝下，保留平面下方的物體 (反之亦然，視需求調整)
  // 這裡我們用 (0, 1, 0) 配合 constant 來切
  // 實際上：想要保留 y < scanY 的部分 -> normal (0, -1, 0), constant = scanY
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), -10), []);

  const scanYRef = useRef(-0.5); // 初始高度
  const targetScanY = 2.0; 
  const [showScanner, setShowScanner] = useState(true);

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
                
                // 1. 備份材質
                if (!obj.userData.originalMat) obj.userData.originalMat = obj.material;

                // 2. 建立全像材質 (MeshBasicMaterial + Wireframe)
                if (!obj.userData.hologramMat) {
                    obj.userData.hologramMat = new THREE.MeshBasicMaterial({
                        color: 0x00ffff,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.15,
                        side: THREE.DoubleSide,
                        clippingPlanes: [clippingPlane], // 🌟 綁定裁切平面
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
        scanYRef.current = -0.5; // 重置高度
        setShowScanner(true);

    } catch (e) { console.error(e); }

    setMeshes({ eyes: eyeMeshes, body: bodyMeshes });
    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady, clippingPlane]);

  useFrame((state, delta) => {
    if (!vrm) return;
    
    if (!unlocked) {
        // --- 鎖定狀態：執行掃描動畫 ---
        
        // 1. 掃描線慢慢往上
        scanYRef.current = THREE.MathUtils.lerp(scanYRef.current, targetScanY + 0.1, delta * 0.8);
        
        // 2. 更新裁切平面高度
        // Plane constant = distance from origin. For (0,-1,0), constant needs to be scanY
        clippingPlane.constant = scanYRef.current;

        // 3. 身體套用全像材質
        meshes.body.forEach(mesh => {
            if (mesh.material !== mesh.userData.hologramMat) {
                mesh.material = mesh.userData.hologramMat;
                mesh.castShadow = false;
            }
        });

        // 4. 眼睛邏輯：高度過了脖子(1.35)才顯示
        const headHeight = 1.35;
        const eyesVisible = scanYRef.current > headHeight;

        meshes.eyes.forEach(eye => {
             // 眼睛用原始材質，因為要有靈魂
             // 但如果還沒掃到，就讓它被裁切掉 (設定 visible = false 或同樣套用 clipping)
             // 為了簡單，我們直接用 visibility 控制
             eye.visible = eyesVisible;
             
             if (eyesVisible) {
                 if (eye.material !== eye.userData.originalMat) eye.material = eye.userData.originalMat;
                 if (eye.material.emissive) eye.material.emissive.setHex(0x333333);
             }
        });

        // 5. 掃描完畢隱藏掃描環
        if (scanYRef.current > 1.9) setShowScanner(false);

    } else {
        // --- 解鎖狀態：恢復實體 ---
        setShowScanner(false);
        clippingPlane.constant = 100; // 取消裁切

        meshes.eyes.concat(meshes.body).forEach(mesh => {
            mesh.visible = true;
            if (mesh.material !== mesh.userData.originalMat) {
                mesh.material = mesh.userData.originalMat;
                mesh.castShadow = true;
            }
        });
    }

    // 基礎動畫
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
        {/* 實體掃描光環 (跟著裁切面移動) */}
        {!unlocked && <ScannerRing scanY={scanYRef.current} visible={showScanner} />}
      </>
  );
}
