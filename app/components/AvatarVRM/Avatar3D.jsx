// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame, useThree } from "@react-three/fiber";
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

// 掃描光環
function ScannerRing({ y, visible }) {
  if (!visible) return null;
  return (
    <group position={[0, y, 0]}>
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
  const { gl } = useThree();
  // 🌟 強制開啟全域裁切，這是最後一道防線
  gl.localClippingEnabled = true;

  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
  
  // 🌟 建立裁切平面：Normal (0, -1, 0) 代表顯示平面下方的物體
  // 初始 constant = 0 代表只顯示 y < 0 (腳底)
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  
  // 掃描動態數值
  const scanY = useRef(0);
  const targetY = 2.0;

  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    VRMUtils.rotateVRM0(loadedVrm);
    applyNaturalPose(loadedVrm);

    // 🌟 關鍵：遍歷所有材質，加上裁切平面，並把它改成 Wireframe (全像感)
    loadedVrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false; // 防止消失
        
        // 備份原材質
        if (!obj.userData.originalMat) obj.userData.originalMat = obj.material;

        // 如果要全像效果，我們直接把原材質改成 Wireframe 模式 (這比換材質安全)
        // 並加上裁切平面
        obj.material.clippingPlanes = [clippingPlane];
        obj.material.clipShadows = true;
      }
    });

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
    
    // 重置
    scanY.current = 0;
    clippingPlane.constant = 0;

  }, [gltf, onReady, clippingPlane]);

  useFrame((state, delta) => {
    // 1. 動畫邏輯
    if (!unlocked) {
        // 掃描線上升
        scanY.current = THREE.MathUtils.lerp(scanY.current, targetY + 0.1, delta * 0.8);
        
        // 更新裁切平面
        clippingPlane.constant = scanY.current;
    } else {
        // 解鎖：取消裁切
        clippingPlane.constant = 100.0;
    }

    // 2. 材質切換邏輯 (全像 vs 實體)
    if (vrm) {
        vrm.scene.traverse((obj) => {
            if (obj.isMesh) {
                const isEye = obj.name.toLowerCase().includes("eye") || obj.material.name.toLowerCase().includes("eye");
                
                if (!unlocked) {
                    // --- 鎖定狀態 (掃描中) ---
                    
                    // 身體：變成線框模式 + 青色
                    if (!isEye) {
                        // 為了不破壞骨架，我們修改現有材質的屬性，而不是換掉它
                        obj.material.wireframe = true;
                        obj.material.color.setHex(0x00ffff); // 變青色
                        obj.material.emissive.setHex(0x001133); // 微微發光
                    }
                    
                    // 眼睛：掃到脖子才顯示
                    if (isEye) {
                        obj.visible = scanY.current > 1.35;
                        // 眼睛保持原樣
                        obj.material.wireframe = false;
                        obj.material.color.setHex(0xffffff); 
                    }

                } else {
                    // --- 解鎖狀態 (實體) ---
                    // 恢復所有屬性
                    obj.visible = true;
                    obj.material.wireframe = false;
                    obj.material.color.setHex(0xffffff); // 恢復白色 (讓貼圖顯色)
                    obj.material.emissive.setHex(0x000000); // 關閉自發光
                }
            }
        });

        // 呼吸與眨眼
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
      {!unlocked && <ScannerRing y={scanY.current} visible={scanY.current < 2.0} />}
    </>
  );
}
