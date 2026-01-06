// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

// --- 1. 內部核心組件：負責控制模型動作 ---
function AvatarModel({ vrmId, action, emotion, previewYaw, inPlace }) {
  // 動態計算模型路徑
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);

  // 載入模型 (這個步驟會觸發 Suspense 等待)
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
  const tRef = useRef(0);

  // --- 初始化 VRM ---
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    
    VRMUtils.rotateVRM0(loadedVrm); // 修正舊版 VRM 方向
    setVrm(loadedVrm);

    // 開啟陰影與材質修正
    loadedVrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.frustumCulled = false; // 防止轉身時衣服消失
      }
    });

    return () => {
      setVrm(null);
    };
  }, [gltf]);

  // --- 表情控制函式 ---
  const updateFace = (v, mode) => {
     if (!v || !v.expressionManager) return;
     const em = v.expressionManager;
     
     // 重置所有表情
     ['happy', 'angry', 'sad', 'relaxed', 'neutral'].forEach(k => {
        if(em.getExpression(k)) em.setValue(k, 0);
     });

     // 設定新表情
     if (mode === 'happy') em.setValue('happy', 1.0);
     else if (mode === 'neutral') em.setValue('neutral', 0.5);
  };

  // --- 每一幀的動作迴圈 ---
  useFrame((state, delta) => {
    if (!vrm) return;

    // 1. 自動眨眼
    const blinkTimer = state.clock.elapsedTime;
    const blinkTrigger = Math.sin(blinkTimer * 1.5);
    const blinkVal = THREE.MathUtils.clamp(blinkTrigger * 8 - 7, 0, 1);
    
    if (vrm.expressionManager) {
      vrm.expressionManager.setValue('blink', blinkVal);
      vrm.expressionManager.update();
    }

    // 2. 表情更新
    updateFace(vrm, emotion);

    // 3. 呼吸與微動作
    tRef.current += delta;
    const t = tRef.current;
    
    if (vrm.humanoid) {
       const spine = vrm.humanoid.getNormalizedBoneNode('spine');
       const head = vrm.humanoid.getNormalizedBoneNode('head');
       const leftEye = vrm.humanoid.getNormalizedBoneNode('leftEye');
       const rightEye = vrm.humanoid.getNormalizedBoneNode('rightEye');

       // 呼吸
       const breath = Math.sin(t * 1.5) * 0.02;
       if(spine) spine.rotation.x = breath;
       if(head) head.rotation.x = -breath * 0.5;

       // 眼神微動
       if(leftEye && rightEye) {
          const eyeX = Math.sin(t * 0.3) * 0.05;
          leftEye.rotation.y = eyeX;
          rightEye.rotation.y = eyeX;
       }
    }

    // 4. 更新 VRM 物理
    vrm.update(delta);
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}

// --- 2. 外部包裝組件：提供 Canvas 和環境 ---
export default function Avatar3D(props) {
  return (
    <div className="w-full h-full">
      {/* Canvas 設定重點：
         1. shadows: 開啟陰影
         2. dpr={[1, 1.5]}: 限制手機解析度，避免黑屏關鍵！
         3. gl={{ preserveDrawingBuffer: true }}: 避免閃爍
      */}
      <Canvas 
        shadows 
        dpr={[1, 1.5]} 
        camera={{ position: [0, 1.4, 3.5], fov: 25 }}
        gl={{ preserveDrawingBuffer: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <spotLight 
           position={[2, 2, 2]} 
           intensity={2} 
           color="#ffd0d0" 
           castShadow 
           shadow-mapSize={[512, 512]} // 手機優化：降低陰影解析度
        />
        <spotLight position={[-2, 2, 2]} intensity={2} color="#d0d0ff" />
        <directionalLight position={[0, 5, 5]} intensity={1.5} />

        {/* Suspense 必須包在 Canvas 裡面 */}
        <Suspense fallback={null}>
           <AvatarModel {...props} />
        </Suspense>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.3} />
        </mesh>
      </Canvas>
    </div>
  );
}
