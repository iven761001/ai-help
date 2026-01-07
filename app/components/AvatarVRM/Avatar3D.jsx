// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// 🌟 讓角色自然站立
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

// 🌟 建立支援骨架的全像材質
function createHologramMaterial() {
  return new THREE.ShaderMaterial({
    // 關鍵 1: 必須開啟 skinning 支援
    skinning: true,
    transparent: true,
    wireframe: true, // 線框模式
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uScanY: { value: -10.0 }, // 掃描高度
      uColor: { value: new THREE.Color("#00ffff") }
    },
    // 關鍵 2: 頂點著色器必須包含 skinning 運算
    vertexShader: `
      #include <common>
      #include <skinning_pars_vertex> // 引入骨架參數
      
      varying vec3 vWorldPosition;
      
      void main() {
        #include <skinning_vertex> // 計算骨架變形 (這行最重要！)
        
        // standard vertex transform
        vec3 transformed = vec3( position );
        #include <skinning_vertex> // 套用骨架到 transformed
        
        vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
        gl_Position = projectionMatrix * mvPosition;
        
        // 計算世界座標 (用來做掃描效果)
        vec4 worldPos = modelMatrix * vec4( transformed, 1.0 );
        vWorldPosition = worldPos.xyz;
      }
    `,
    // 片段著色器 (負責掃描線效果)
    fragmentShader: `
      uniform float uScanY;
      uniform vec3 uColor;
      varying vec3 vWorldPosition;

      void main() {
        // 1. 高於掃描線的像素隱藏
        if (vWorldPosition.y > uScanY) discard;

        // 2. 掃描線發光邊緣
        float dist = uScanY - vWorldPosition.y;
        float glow = 0.0;
        if (dist >= 0.0 && dist < 0.15) {
           glow = pow((1.0 - dist/0.15), 3.0) * 1.5;
        }

        // 3. 輸出顏色
        vec3 finalColor = uColor + vec3(glow);
        float alpha = 0.15 + glow; // 基礎透明度 0.15 + 發光
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `
  });
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
  
  // 掃描動畫控制
  const scanYRef = useRef(-1.0); 
  const targetScanY = 1.8; 

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
                
                // 1. 備份原始材質
                if (!obj.userData.originalMat) {
                    obj.userData.originalMat = obj.material;
                }

                // 2. 建立全像材質
                if (!obj.userData.hologramMat) {
                    obj.userData.hologramMat = createHologramMaterial();
                }

                // 3. 分類
                const matName = obj.material.name || "";
                const objName = obj.name || "";
                const isEye = 
                    matName.toLowerCase().includes("eye") || 
                    matName.toLowerCase().includes("face") || 
                    objName.toLowerCase().includes("iris") ||
                    objName.toLowerCase().includes("pupil");
                
                if (isEye) eyeMeshes.push(obj);
                else bodyMeshes.push(obj);
            }
        });

        applyNaturalPose(loadedVrm);
        scanYRef.current = -1.0; 

    } catch (e) { console.error(e); }

    setMeshes({ eyes: eyeMeshes, body: bodyMeshes });
    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady]);

  useFrame((state, delta) => {
    if (!vrm) return;
    
    // --- 掃描與材質邏輯 ---
    if (!unlocked) {
        // 1. 上升動畫
        scanYRef.current = THREE.MathUtils.lerp(scanYRef.current, targetScanY + 0.5, delta * 1.0); 

        // 2. 更新 Uniforms
        meshes.body.forEach(mesh => {
            if (mesh.material !== mesh.userData.hologramMat) {
                mesh.material = mesh.userData.hologramMat;
                mesh.castShadow = false;
                mesh.receiveShadow = false;
            }
            if (mesh.userData.hologramMat) {
                mesh.userData.hologramMat.uniforms.uScanY.value = scanYRef.current;
            }
        });

        // 3. 眼睛邏輯 (掃描過頭部後顯示)
        const headHeight = 1.35;
        const eyesShouldBeReal = scanYRef.current > headHeight;

        meshes.eyes.forEach(eye => {
            if (eyesShouldBeReal) {
                 if (eye.material !== eye.userData.originalMat) eye.material = eye.userData.originalMat;
                 if (eye.material.emissive) eye.material.emissive.setHex(0x222222);
            } else {
                 if (eye.material !== eye.userData.hologramMat) eye.material = eye.userData.hologramMat;
                 if (eye.userData.hologramMat) {
                    eye.userData.hologramMat.uniforms.uScanY.value = scanYRef.current;
                 }
            }
        });

    } else {
        // --- 解鎖狀態 ---
        meshes.eyes.concat(meshes.body).forEach(mesh => {
            if (mesh.material !== mesh.userData.originalMat) {
                mesh.material = mesh.userData.originalMat;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
        });
    }

    // --- 基礎動畫 ---
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
