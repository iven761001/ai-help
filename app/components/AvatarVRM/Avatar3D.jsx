// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// 🌟 讓角色自然站立 (手放下)
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

// 🌟 核心魔法：全像掃描材質產生器
// 使用 onBeforeCompile 來保留 Three.js 原生的骨架運算 (Skinning)
function createHologramMaterial() {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,     // 賽博龐克藍
    wireframe: true,     // 線框模式
    transparent: true,
    opacity: 0.15,       // 基礎透明度
    side: THREE.DoubleSide,
  });

  // 在編譯 Shader 之前注入我們的掃描邏輯
  mat.onBeforeCompile = (shader) => {
    // 1. 加入 Uniforms (變數)
    shader.uniforms.uScanY = { value: -10.0 }; // 掃描線高度
    shader.uniforms.uGlowColor = { value: new THREE.Color(0x00ffff) };

    // 保存 reference 以便之後更新
    mat.userData.shader = shader;

    // 2. 注入 Vertex Shader (計算世界座標高度)
    shader.vertexShader = `
      varying float vWorldY;
      uniform float uScanY;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
        vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );
        // 如果有骨架 (Skinning)，Three.js 已經計算好 mvPosition，但我們需要世界座標
        // 為了簡單，我們直接用 mvPosition 的 y 近似，或者手動算
        // 最穩的方法是直接使用 varying 傳遞
        vWorldY = worldPosition.y;
        
        #include <project_vertex>
      `
    );

    // 3. 注入 Fragment Shader (執行掃描裁剪 + 發光)
    shader.fragmentShader = `
      uniform float uScanY;
      uniform vec3 uGlowColor;
      varying float vWorldY;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
        // 核心邏輯：高於掃描線的像素直接丟棄 (Discard)
        // 注意：這裡的座標可能需要根據場景縮放微調
        if (vWorldY > uScanY) discard;

        // 計算掃描邊緣發光 (Glow)
        float dist = uScanY - vWorldY;
        float glow = 0.0;
        // 在掃描線下方 0.15 單位內發光
        if (dist > 0.0 && dist < 0.15) {
           glow = (1.0 - dist / 0.15); // 越近越亮
           glow = pow(glow, 3.0);      // 讓光線更銳利
        }

        // 疊加發光顏色
        gl_FragColor.rgb += uGlowColor * glow * 2.0;
        gl_FragColor.a += glow; // 發光處不透明

        #include <dithering_fragment>
      `
    );
  };

  return mat;
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
  // 根據場景大小，掃描目標高度大概在 1.6 ~ 1.8 (頭頂)
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

                // 2. 建立全像材質 (使用上面定義的 createHologramMaterial)
                if (!obj.userData.hologramMat) {
                    obj.userData.hologramMat = createHologramMaterial();
                }

                // 3. 分類：眼睛 vs 身體
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
        scanYRef.current = -1.0; // 重置掃描高度

    } catch (e) { console.error(e); }

    setMeshes({ eyes: eyeMeshes, body: bodyMeshes });
    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady]);

  useFrame((state, delta) => {
    if (!vrm) return;
    
    // --- 掃描與材質邏輯 ---
    if (!unlocked) {
        // 1. 掃描線上升動畫 (速度可以調這裡)
        scanYRef.current = THREE.MathUtils.lerp(scanYRef.current, targetScanY + 0.5, delta * 1.0); 

        // 2. 更新 Shader Uniforms
        meshes.body.forEach(mesh => {
            // 切換成全像材質
            if (mesh.material !== mesh.userData.hologramMat) {
                mesh.material = mesh.userData.hologramMat;
                mesh.castShadow = false;
                mesh.receiveShadow = false;
            }
            // 更新掃描高度
            if (mesh.userData.hologramMat.userData.shader) {
                mesh.userData.hologramMat.userData.shader.uniforms.uScanY.value = scanYRef.current;
            }
        });

        // 3. 眼睛特殊邏輯：掃描過頭部後，眼睛瞬間實體化
        const headHeight = 1.35; // 脖子/下巴高度
        const eyesShouldBeReal = scanYRef.current > headHeight;

        meshes.eyes.forEach(eye => {
            if (eyesShouldBeReal) {
                 // 變回實體
                 if (eye.material !== eye.userData.originalMat) eye.material = eye.userData.originalMat;
                 if (eye.material.emissive) eye.material.emissive.setHex(0x222222);
            } else {
                 // 隱藏 (使用全像材質並設得很低，讓它被 discard 掉)
                 if (eye.material !== eye.userData.hologramMat) eye.material = eye.userData.hologramMat;
                 if (eye.userData.hologramMat.userData.shader) {
                    eye.userData.hologramMat.userData.shader.uniforms.uScanY.value = scanYRef.current;
                 }
            }
        });

    } else {
        // --- 解鎖狀態：全部變回實體 ---
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
