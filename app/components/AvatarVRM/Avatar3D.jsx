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

// 掃描光環：獨立於模型，保證會出現
function ScannerRing({ scanY }) {
  // 如果掃描高度太高，就隱藏
  const visible = scanY < 2.0; 
  if (!visible) return null;

  return (
    <group position={[0, scanY, 0]}>
      {/* 亮環 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.4, 0.42, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
      {/* 殘影 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.35, 0.45, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
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
  
  // 🌟 建立裁切平面
  // Normal (0, -1, 0) 代表保留平面「下方」的物體
  // Constant 代表平面在 Y 軸的位置
  // 例如：Constant = 0.5，代表保留 Y < 0.5 的部分 (腳部)
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);

  const scanYRef = useRef(0); // 掃描高度
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
                
                // 備份原始材質
                if (!obj.userData.originalMat) obj.userData.originalMat = obj.material;

                // 建立全像材質 (Wireframe + Clipping)
                if (!obj.userData.hologramMat) {
                    obj.userData.hologramMat = new THREE.MeshBasicMaterial({
                        color: 0x00ffff,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.15,
                        side: THREE.DoubleSide,
                        clippingPlanes: [clippingPlane], // 綁定裁切面
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
        
        // 每次換模型，重置掃描高度到 0 (腳底)
        scanYRef.current = 0;
        clippingPlane.constant = 0;

    } catch (e) { console.error(e); }

    setMeshes({ eyes: eyeMeshes, body: bodyMeshes });
    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady, clippingPlane]);

  // 2. 動畫迴圈
  useFrame((state, delta) => {
    
    // --- 獨立的掃描動畫 (保證光環會動) ---
    if (!unlocked) {
        // 讓掃描線往上升
        scanYRef.current = THREE.MathUtils.lerp(scanYRef.current, targetScanY + 0.1, delta * 0.8);
        
        // 同步更新裁切平面 (讓身體長出來)
        // 注意：如果 scanYRef 增加，clippingPlane.constant 也要增加，才能顯示更多
        clippingPlane.constant = scanYRef.current;
    } else {
        // 解鎖：取消裁切 (讓平面飛到很高的地方)
        clippingPlane.constant = 100.0;
    }

    // --- 模型邏輯 ---
    if (vrm) {
        if (!unlocked) {
            // 身體：全像模式
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
        {/* 掃描光環：只要沒解鎖，就一定會顯示 (跟隨 scanYRef) */}
        {!unlocked && <ScannerRing scanY={scanYRef.current} />}
      </>
  );
}
