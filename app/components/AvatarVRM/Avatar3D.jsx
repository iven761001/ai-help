// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

// --- 1. 內部核心組件：負責控制模型動作 (Model Logic) ---
function AvatarModel({ vrmId, action, emotion, previewYaw, inPlace }) {
  // 動態計算模型路徑
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);

  // 載入模型 (這個步驟會觸發 Suspense 等待)
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
  const mixerRef = useRef(null);
  
  // 動作相關 Ref
  const proceduralRef = useRef("idle");
  const tRef = useRef(0);
  const basePoseRef = useRef(null);
  const hipsBasePosRef = useRef(null);
  const currentActionRef = useRef(null);

  // --- 初始化 VRM ---
  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    
    VRMUtils.rotateVRM0(loadedVrm); // 修正舊版 VRM 方向
    setVrm(loadedVrm);

    // 為了讓光影更好看，開啟陰影
    loadedVrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.frustumCulled = false; // 防止轉身時衣服消失
      }
    });

    // 捕捉基礎站姿 (避免動作跑掉)
    if(loadedVrm.humanoid) {
        // 這裡可以放妳原本 applyIdlePose 的邏輯，為了簡化先略過，直接捕捉
        // 實際使用時，建議把妳原本的 applyIdlePose 函式放回來呼叫一次
    }

    return () => {
      // 清理記憶體，防止手機崩潰
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
     // ... 其他表情
  };

  // --- 每一幀的動作迴圈 (Animation Loop) ---
  useFrame((state, delta) => {
    if (!vrm) return;

    // 1. 自動眨眼 (Auto Blink) - 讓角色活起來
    const blinkTimer = state.clock.elapsedTime;
    const blinkTrigger = Math.sin(blinkTimer * 1.5); // 頻率
    const blinkVal = THREE.MathUtils.clamp(blinkTrigger * 8 - 7, 0, 1); // 只取波峰
    
    if (vrm.expressionManager) {
      vrm.expressionManager.setValue('blink', blinkVal);
      vrm.expressionManager.update();
    }

    // 2. 表情更新
    updateFace(vrm, emotion);

    // 3. 呼吸與微動作 (Breathing)
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
       if(head) head.rotation.x = -breath * 0.5; // 頭部反向補償，保持視線水平

       // 眼神微動 (Eye Darting)
       if(leftEye && rightEye) {
          const eyeX = Math.sin(t * 0.3) * 0.05;
          const eyeY = Math.cos(t * 0.2) * 0.02;
          leftEye.rotation.y = eyeX;
          rightEye.rotation.y = eyeX;
       }
    }

    // 4. 更新 VRM 物理 (頭髮飄動)
    vrm.update(delta);
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}

// --- 2. 外部包裝組件：提供 Canvas 和環境 (Scene Setup) ---
export default function Avatar3D(props) {
  return (
    <div className="w-full h-full">
      {/* shadows: 開啟陰影
         dpr: 限制像素密度，手機上設為 [1, 2] 避免過熱黑屏
         gl: preserveDrawingBuffer 避免切換時閃爍 
      */}
      <Canvas 
        shadows 
        dpr={[1, 1.5]} 
        camera={{ position: [0, 1.4, 3.5], fov: 25 }}
        gl={{ preserveDrawingBuffer: true, alpha: true }}
      >
        {/* 燈光設置 */}
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

        {/* Suspense 必須放在 Canvas 裡面包住 Model
           這樣讀取模型時，不會讓整個 App 崩潰，而是等待
        */}
        <Suspense fallback={null}>
           <AvatarModel {...props} />
        </Suspense>

        {/* 地板陰影 (隱形地板) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.3} />
        </mesh>
      </Canvas>
    </div>
  );
}
