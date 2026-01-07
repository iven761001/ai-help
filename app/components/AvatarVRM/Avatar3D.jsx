// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame, useThree } from "@react-three/fiber";
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

// 掃描光環
function ScannerRing({ y, visible }) {
  // 如果不可見，直接返回 null，節省效能
  if (!visible) return null;
  
  return (
    <group position={[0, y, 0]}>
      {/* 亮光圈 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.5, 0.55, 64]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
      {/* 暈光 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.45, 0.7, 64]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false }) {
  const { gl } = useThree();
  // 再次確保裁切開啟
  gl.localClippingEnabled = true;

  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
  
  // 🌟 裁切平面：normal(0, -1, 0) 代表保留下方，constant 代表 Y 軸高度
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  
  const scanY = useRef(0);
  const targetY = 2.2; // 頭頂高度

  // 🌟 安全材質處理函數 (防黑屏關鍵！)
  const applyClippingToMaterial = (material, plane, isWireframe) => {
    if (!material) return;
    
    // 設定裁切平面
    material.clippingPlanes = [plane];
    material.clipShadows = true;
    
    // 設定外觀 (全像 vs 實體)
    if (isWireframe) {
        material.wireframe = true;
        material.color.setHex(0x00ffff);
        material.emissive.setHex(0x001133);
    } else {
        material.wireframe = false;
        material.color.setHex(0xffffff);
        material.emissive.setHex(0x000000);
    }
    // 標記需要更新
    material.needsUpdate = true;
  };

  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    
    try {
        VRMUtils.rotateVRM0(loadedVrm);
        applyNaturalPose(loadedVrm);

        // 初始化材質
        loadedVrm.scene.traverse((obj) => {
          if (obj.isMesh) {
            obj.frustumCulled = false;
            
            // 備份原始材質 (如果是陣列，也要拷貝陣列)
            if (!obj.userData.originalMat) {
                if (Array.isArray(obj.material)) {
                    obj.userData.originalMat = obj.material.map(m => m.clone());
                } else {
                    obj.userData.originalMat = obj.material.clone();
                }
            }

            // 處理多材質情況
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => applyClippingToMaterial(m, clippingPlane, true));
            } else {
                applyClippingToMaterial(obj.material, clippingPlane, true);
            }
          }
        });

    } catch (e) {
        console.error("VRM Init Error:", e);
    }

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
    
    // 重置掃描
    scanY.current = 0;
    clippingPlane.constant = 0;

  }, [gltf, onReady, clippingPlane]);

  useFrame((state, delta) => {
    // 1. 動畫邏輯：掃描線上升
    if (!unlocked) {
        scanY.current = THREE.MathUtils.lerp(scanY.current, targetY + 0.1, delta * 0.8);
        clippingPlane.constant = scanY.current;
    } else {
        // 解鎖：取消裁切
        clippingPlane.constant = 100.0;
    }

    // 2. 材質即時切換邏輯
    if (vrm) {
        vrm.scene.traverse((obj) => {
            if (obj.isMesh) {
                const isEye = obj.name.toLowerCase().includes("eye") || 
                              (obj.material.name && obj.material.name.toLowerCase().includes("eye"));
                
                // 決定是否為全像模式 (Wireframe)
                // 只有在「未解鎖」且「不是眼睛」的情況下才用 Wireframe
                // 眼睛在未解鎖且掃描到時，顯示實體
                let useWireframe = !unlocked && !isEye;
                
                // 眼睛的特殊邏輯：掃描過脖子才顯示
                if (isEye) {
                    obj.visible = unlocked || (scanY.current > 1.35);
                }

                // 應用樣式
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => {
                        // 簡單優化：只在狀態改變時設定，避免每幀都設 (雖然 Three.js 會擋，但這樣更保險)
                        if (m.wireframe !== useWireframe) {
                            if (useWireframe) {
                                m.wireframe = true;
                                m.color.setHex(0x00ffff);
                                m.emissive.setHex(0x001133);
                            } else {
                                // 恢復原始 (如果是解鎖或眼睛顯示時)
                                m.wireframe = false;
                                m.color.setHex(0xffffff);
                                m.emissive.setHex(0x000000);
                            }
                        }
                    });
                } else {
                    const m = obj.material;
                    if (m.wireframe !== useWireframe) {
                        if (useWireframe) {
                            m.wireframe = true;
                            m.color.setHex(0x00ffff);
                            m.emissive.setHex(0x001133);
                        } else {
                            m.wireframe = false;
                            m.color.setHex(0xffffff);
                            m.emissive.setHex(0x000000);
                        }
                    }
                }
            }
        });

        // 表情與呼吸
        const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2.5) * 5 - 4);
        if (vrm.expressionManager) {
            vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
            vrm.expressionManager.update();
        }
        vrm.update(delta);
    }
  });

  return (
    <>
      {vrm && <primitive object={vrm.scene} />}
      {/* 掃描光環：只在未解鎖且高度小於 2.0 時顯示 */}
      <ScannerRing y={scanY.current} visible={!unlocked && scanY.current < 2.0} />
    </>
  );
}
