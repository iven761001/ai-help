"use client";

import React, { useEffect, useMemo, useState, useRef, forwardRef } from "react";
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

// 🌟 掃描光環：改成 forwardRef，讓我們可以直接控制它
const ScannerRing = forwardRef((props, ref) => {
  return (
    <group ref={ref} position={[0, 0, 0]}> 
      {/* 亮環 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.45, 0.48, 64]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={1.0} />
      </mesh>
      {/* 暈光 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.40, 0.55, 64]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* 掃描面發光 (增加視覺厚度) */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
         <circleGeometry args={[0.44, 32]} />
         <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.05} blending={THREE.AdditiveBlending} />
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
  const [meshes, setMeshes] = useState({ eyes: [], body: [] });
  const tRef = useRef(0);
  
  // 🌟 裁切平面：保留平面「下方」的物體 (Normal: 0, -1, 0)
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  
  // 🌟 直接控制光環的 Ref
  const scannerGroupRef = useRef();

  // 掃描動態數值
  const scanYRef = useRef(0);
  const targetScanY = 2.2; 

  // 1. 初始化模型
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
                
                if (!obj.userData.originalMat) obj.userData.originalMat = obj.material;

                // 建立全像材質 (Wireframe + Clipping)
                if (!obj.userData.hologramMat) {
                    obj.userData.hologramMat = new THREE.MeshBasicMaterial({
                        color: 0x00ffff,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.2, // 稍微調高一點
                        side: THREE.DoubleSide,
                        clippingPlanes: [clippingPlane], // 綁定裁切
                    });
                }

                const matName = obj.material.name || "";
                const objName = obj.name || "";
                const isEye = matName.toLowerCase().includes("eye") || 
                              matName.toLowerCase().includes("face") || 
                              objName.toLowerCase().includes("iris") ||
                              objName.toLowerCase().includes("pupil");
                
                if (isEye) eyeMeshes.push(obj);
                else bodyMeshes.push(obj);
            }
        });

        applyNaturalPose(loadedVrm);
        
        // 重置掃描狀態 (從 0 開始，不要從負數開始，確保一開始看得到腳)
        scanYRef.current = 0.05;
        clippingPlane.constant = 0.05;

    } catch (e) { console.error(e); }

    setMeshes({ eyes: eyeMeshes, body: bodyMeshes });
    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady, clippingPlane]);

  // 2. 動畫迴圈
  useFrame((state, delta) => {
    
    // --- 掃描動畫 (直接操作 Ref，不依賴 State) ---
    if (!unlocked) {
        // 1. 數值增加
        scanYRef.current = THREE.MathUtils.lerp(scanYRef.current, targetScanY + 0.1, delta * 0.8);
        
        // 2. 同步光環位置 (直接修改 Transform)
        if (scannerGroupRef.current) {
            scannerGroupRef.current.position.y = scanYRef.current;
            scannerGroupRef.current.visible = scanYRef.current < 2.0; // 超過頭頂就隱藏
        }

        // 3. 同步裁切平面
        clippingPlane.constant = scanYRef.current;

    } else {
        // 解鎖：隱藏光環，取消裁切
        if (scannerGroupRef.current) scannerGroupRef.current.visible = false;
        clippingPlane.constant = 100.0;
    }

    // --- 模型材質更新 ---
    if (vrm) {
        if (!unlocked) {
            // 鎖定：全像模式
            meshes.body.forEach(mesh => {
                if (mesh.material !== mesh.userData.hologramMat) {
                    mesh.material = mesh.userData.hologramMat;
                }
            });

            // 眼睛：過了脖子才顯示
            const headHeight = 1.35;
            const eyesVisible = scanYRef.current > headHeight;
            meshes.eyes.forEach(eye => {
                eye.visible = eyesVisible;
                if (eyesVisible) {
                    if (eye.material !== eye.userData.originalMat) eye.material = eye.userData.originalMat;
                    if (eye.material.emissive) eye.material.emissive.setHex(0x333333);
                }
            });
        } else {
            // 解鎖：實體模式
            meshes.eyes.concat(meshes.body).forEach(mesh => {
                mesh.visible = true;
                if (mesh.material !== mesh.userData.originalMat) {
                    mesh.material = mesh.userData.originalMat;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
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
    }
  });

  return (
      <>
        {vrm && <primitive object={vrm.scene} />}
        {/* 🌟 掃描光環 (傳入 Ref) */}
        <ScannerRing ref={scannerGroupRef} />
      </>
  );
}
