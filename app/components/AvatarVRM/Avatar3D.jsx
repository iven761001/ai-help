"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

// 🌟 1. 讓角色自然站立 (手放下)
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

// 🌟 2. 掃描線光環組件 (跟隨掃描高度)
function ScannerRing({ scanY, visible }) {
  if (!visible) return null;
  return (
    <group position={[0, scanY, 0]}>
      {/* 發光主環 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.4, 0.42, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
      {/* 暈光 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.35, 0.45, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// 🌟 3. 建立全像材質 (骨架兼容版)
// 這裡我們不取代整個 Material，而是「修改」MeshBasicMaterial
// 這樣可以保留 Skinning (骨架) 功能，又能加入我們的掃描邏輯
function createHologramMaterial() {
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    skinning: true, // ⚠️ 重要：確保支援骨架
  });

  material.onBeforeCompile = (shader) => {
    // A. 加入 Uniform (掃描高度)
    shader.uniforms.uScanY = { value: -5.0 }; // 初始值設低一點
    
    // 把 shader 存到 userData，方便我們在 useFrame 更新它
    material.userData.shader = shader;

    // B. 修改 Vertex Shader (頂點著色器)
    // 我們需要在這裡計算「世界座標」，但要確保是在骨架運算之後
    
    shader.vertexShader = `
      varying float vWorldY;
      uniform float uScanY;
    ` + shader.vertexShader;

    // 找到 project_vertex (投影運算) 的位置，在那之前插入我們的邏輯
    // 此時 'transformed' 變數已經包含了骨架的變形結果
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
        // 計算世界座標 (World Position)
        vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );
        vWorldY = worldPosition.y;

        #include <project_vertex>
      `
    );

    // C. 修改 Fragment Shader (像素著色器)
    shader.fragmentShader = `
      uniform float uScanY;
      varying float vWorldY;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
        // 1. 裁切：比掃描線高的地方隱藏
        if (vWorldY > uScanY) discard;

        // 2. 發光邊緣：在切面附近增加亮度
        float dist = uScanY - vWorldY;
        float glow = 0.0;
        if (dist > 0.0 && dist < 0.1) {
            glow = (1.0 - dist / 0.1) * 2.0; // 越近越亮
        }
        
        gl_FragColor.rgb += vec3(0.0, 1.0, 1.0) * glow;
        gl_FragColor.a += glow * 0.5;

        #include <dithering_fragment>
      `
    );
  };

  return material;
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
  const scanYRef = useRef(-0.5); 
  const targetScanY = 1.9; // 頭頂高度
  const [showScanner, setShowScanner] = useState(true);

  // 1. 模型初始化
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

                // 建立全像材質 (使用上面定義的函數)
                if (!obj.userData.hologramMat) {
                    obj.userData.hologramMat = createHologramMaterial();
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
        
        // 重置掃描狀態
        scanYRef.current = -0.5;
        setShowScanner(true);

    } catch (e) { console.error(e); }

    setMeshes({ eyes: eyeMeshes, body: bodyMeshes });
    setVrm(loadedVrm);
    if (onReady) onReady(loadedVrm);
  }, [gltf, onReady]);

  // 2. 動畫迴圈
  useFrame((state, delta) => {
    
    // --- A. 掃描線高度計算 (獨立運作，不受模型載入影響) ---
    if (!unlocked) {
        // 掃描線上升
        scanYRef.current = THREE.MathUtils.lerp(scanYRef.current, targetScanY + 0.1, delta * 0.8);
        if (scanYRef.current > 1.8) setShowScanner(false);
    } else {
        setShowScanner(false);
    }

    // --- B. 模型材質更新 (必須等 vrm 載入) ---
    if (!vrm) return;

    if (!unlocked) {
        // 身體：套用全像材質
        meshes.body.forEach(mesh => {
            if (mesh.material !== mesh.userData.hologramMat) {
                mesh.material = mesh.userData.hologramMat;
                mesh.castShadow = false;
            }
            // 更新 Shader 裡的 uScanY
            if (mesh.userData.hologramMat.userData.shader) {
                mesh.userData.hologramMat.userData.shader.uniforms.uScanY.value = scanYRef.current;
            }
        });

        // 眼睛：掃到脖子才亮起
        const headHeight = 1.35;
        const eyesVisible = scanYRef.current > headHeight;

        meshes.eyes.forEach(eye => {
             // 眼睛用可見性控制 (最簡單暴力，不會出錯)
             eye.visible = eyesVisible;
             
             if (eyesVisible) {
                 if (eye.material !== eye.userData.originalMat) eye.material = eye.userData.originalMat;
                 if (eye.material.emissive) eye.material.emissive.setHex(0x333333);
             }
        });

    } else {
        // 解鎖：全部恢復
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
  });

  return (
      <>
        {vrm && <primitive object={vrm.scene} />}
        {/* 掃描光環 (即使模型還沒出來，光環也要跑) */}
        {!unlocked && <ScannerRing scanY={scanYRef.current} visible={showScanner} />}
      </>
  );
}
