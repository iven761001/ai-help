// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// 🌟 1. 定義全像掃描材質 (ShaderMaterial)
const HologramScanShader = {
  uniforms: {
    uColor: { value: new THREE.Color("#00ffff") },
    uScanY: { value: -10.0 }, // 掃描高度，初始值很低代表看不見
    uOpacity: { value: 0.15 }
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      // 計算世界座標，確保掃描線是水平的，不受模型姿勢影響
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uScanY;
    uniform float uOpacity;
    varying vec3 vWorldPosition;

    void main() {
      // 如果像素高度高於掃描線，直接丟棄 (隱藏)
      if (vWorldPosition.y > uScanY) discard;

      // 計算掃描邊緣的發光線 (Scanline Glow)
      // 距離掃描線越近越亮
      float dist = uScanY - vWorldPosition.y;
      float glow = 0.0;
      if (dist < 0.1 && dist > 0.0) {
         glow = (1.0 - dist / 0.1) * 0.8; // 0.1米範圍內發光
      }

      // 基礎顏色 + 發光
      vec3 finalColor = uColor + vec3(glow);
      float finalAlpha = uOpacity + glow; // 掃描線處不透明度也增加

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `
};

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

// 應用材質
function applyHologramEffect(vrm, isUnlocked, scanY) {
  if (!vrm || !vrm.scene) return;

  vrm.scene.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      // 眼睛保護
      const matName = obj.material.name || "";
      const objName = obj.name || "";
      const isEye = 
        matName.toLowerCase().includes("eye") || 
        matName.toLowerCase().includes("face") || 
        objName.toLowerCase().includes("eye");

      if (isEye) {
        if (obj.userData.originalMat) obj.material = obj.userData.originalMat;
        // 眼睛也要受掃描影響嗎？通常眼睛保持亮著比較有靈魂，但為了掃描感統一，我們可以讓眼睛一直顯示
        // 或者我們簡單點：眼睛永遠顯示
        if (obj.material.emissive) obj.material.emissive = new THREE.Color(0.2, 0.2, 0.2);
        return; 
      }

      if (isUnlocked) {
        // 解鎖：恢復原狀
        if (obj.userData.originalMat) obj.material = obj.userData.originalMat;
        obj.castShadow = true;
        obj.receiveShadow = true;
      } else {
        // 鎖定：使用掃描 Shader
        if (!obj.userData.originalMat) obj.userData.originalMat = obj.material;
        
        // 建立或更新 Shader Material
        if (!obj.userData.hologramMat) {
            // 複製一份 Shader 樣板
            obj.userData.hologramMat = new THREE.ShaderMaterial({
                uniforms: THREE.UniformsUtils.clone(HologramScanShader.uniforms),
                vertexShader: HologramScanShader.vertexShader,
                fragmentShader: HologramScanShader.fragmentShader,
                transparent: true,
                wireframe: true, // 線框模式
                side: THREE.DoubleSide,
            });
        }

        // 更新 Uniform (掃描高度)
        obj.userData.hologramMat.uniforms.uScanY.value = scanY;
        
        obj.material = obj.userData.hologramMat;
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    }
  });
}

export default function Avatar3D({ vrmId, emotion, onReady, unlocked = false }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
  const tRef = useRef(0);
  
  // 🌟 掃描動畫控制
  const scanYRef = useRef(-1.0); // 從腳底以下開始
  const targetScanY = 2.5; // 目標高度 (超過頭頂)

  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    
    try {
        VRMUtils.rotateVRM0(loadedVrm);
        loadedVrm.scene.traverse((obj) => {
            if (obj.isMesh) {
                obj.frustumCulled = false;
                if (!obj.userData.originalMat) obj.userData.originalMat = obj.material;
            }
        });
        applyNaturalPose(loadedVrm);
        
        // 重置掃描高度 (每次換模型都重掃一次)
        scanYRef.current = -1.0;

    } catch (e) { console.error(e); }

    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady]);

  useFrame((state, delta) => {
    if (!vrm) return;
    
    // 🌟 更新掃描高度動畫 (Lerp)
    if (!unlocked) {
        // 慢慢往上升
        scanYRef.current = THREE.MathUtils.lerp(scanYRef.current, targetScanY, delta * 1.5); 
        // 套用效果
        applyHologramEffect(vrm, unlocked, scanYRef.current);
    } else {
        // 如果解鎖了，直接顯示
        applyHologramEffect(vrm, unlocked, 100.0);
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

  return vrm ? <primitive object={vrm.scene} /> : null;
}
