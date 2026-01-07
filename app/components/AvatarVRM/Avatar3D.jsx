// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// 🌟 全像掃描材質 (增加掃描線亮度)
const HologramScanShader = {
  uniforms: {
    uColor: { value: new THREE.Color("#00ffff") },
    uScanY: { value: -10.0 }, 
    uOpacity: { value: 0.15 }
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
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
      // 核心邏輯：高於掃描線的像素直接隱藏 (Discard)
      if (vWorldPosition.y > uScanY) discard;

      // 掃描邊緣發光 (Glow)
      float dist = uScanY - vWorldPosition.y;
      float glow = 0.0;
      if (dist < 0.15 && dist > 0.0) {
         // 讓發光帶寬一點、亮一點
         glow = pow((1.0 - dist / 0.15), 2.0) * 1.5; 
      }

      vec3 finalColor = uColor + vec3(glow);
      float finalAlpha = uOpacity + glow; 

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `
};

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
  const [meshes, setMeshes] = useState({ eyes: [], body: [] }); // 分類儲存 mesh
  const tRef = useRef(0);
  
  const scanYRef = useRef(-1.0); 
  const targetScanY = 2.5;

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

                // 2. 建立全像材質 (每個 Mesh 獨立一份，以便共用 Uniform 但不干擾)
                if (!obj.userData.hologramMat) {
                    obj.userData.hologramMat = new THREE.ShaderMaterial({
                        uniforms: THREE.UniformsUtils.clone(HologramScanShader.uniforms),
                        vertexShader: HologramScanShader.vertexShader,
                        fragmentShader: HologramScanShader.fragmentShader,
                        transparent: true,
                        wireframe: true, // 保持線框感
                        side: THREE.DoubleSide,
                    });
                }

                // 3. 分類：眼睛 vs 身體
                const matName = obj.material.name || "";
                const objName = obj.name || "";
                const isEye = 
                    matName.toLowerCase().includes("eye") || 
                    matName.toLowerCase().includes("face") || 
                    objName.toLowerCase().includes("eye");
                
                if (isEye) eyeMeshes.push(obj);
                else bodyMeshes.push(obj);
            }
        });

        applyNaturalPose(loadedVrm);
        scanYRef.current = -1.0; // 重置掃描

    } catch (e) { console.error(e); }

    setMeshes({ eyes: eyeMeshes, body: bodyMeshes });
    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady]);

  useFrame((state, delta) => {
    if (!vrm) return;
    
    // --- 掃描與材質邏輯 ---
    if (!unlocked) {
        // 1. 掃描線上升
        scanYRef.current = THREE.MathUtils.lerp(scanYRef.current, targetScanY, delta * 1.5); 

        // 2. 更新所有 Mesh 的掃描高度 Uniform
        const updateUniform = (mesh) => {
             if (mesh.userData.hologramMat) {
                 mesh.userData.hologramMat.uniforms.uScanY.value = scanYRef.current;
             }
        };
        meshes.body.forEach(updateUniform);
        meshes.eyes.forEach(updateUniform);

        // 3. 眼睛特殊邏輯：掃描過頭部(y > 1.35)後，眼睛切換回實體 (亮起來！)
        //    掃描未過頭部前，眼睛保持全像狀態 (這樣才會被 clip 掉，不會懸空)
        const headHeight = 1.35;
        const eyesShouldBeReal = scanYRef.current > headHeight;

        meshes.eyes.forEach(eye => {
            if (eyesShouldBeReal) {
                 // 掃描通過 -> 變回實體 (Original)
                 if (eye.material !== eye.userData.originalMat) eye.material = eye.userData.originalMat;
                 // 確保實體眼睛微微發光
                 if (eye.material.emissive) eye.material.emissive.setHex(0x333333);
            } else {
                 // 還沒掃到 -> 保持全像 (Hologram) 以便隱藏
                 if (eye.material !== eye.userData.hologramMat) eye.material = eye.userData.hologramMat;
            }
        });

        // 身體永遠保持全像狀態 (直到解鎖)
        meshes.body.forEach(body => {
            if (body.material !== body.userData.hologramMat) body.material = body.userData.hologramMat;
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

    // --- 基礎動畫 (表情/呼吸) ---
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
