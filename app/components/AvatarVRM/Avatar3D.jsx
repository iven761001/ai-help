// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

// 🌟 1. 攝影機腳架：強迫攝影機看著角色胸口 (y=1.3)
function CameraRig() {
  const { camera } = useThree();
  useFrame(() => {
    // 讓攝影機位置固定，但視線永遠鎖定在角色高度
    camera.lookAt(0, 1.3, 0); 
  });
  return null;
}

// 🌟 2. 錯誤邊界：如果模型壞掉，顯示紅字，不要讓整個畫面黑掉
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <mesh position={[0, 1.3, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial color="red" wireframe />
        </mesh>
      );
    }
    return this.props.children;
  }
}

// --- 3. 核心模型 ---
function AvatarModel({ vrmId, emotion }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  // 載入模型
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
  const tRef = useRef(0);

  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    VRMUtils.rotateVRM0(loadedVrm);
    
    // 修正材質與陰影
    loadedVrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.frustumCulled = false; 
      }
    });
    setVrm(loadedVrm);
    return () => setVrm(null);
  }, [gltf]);

  useFrame((state, delta) => {
    if (!vrm) return;
    
    // 簡單的自動眨眼
    const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2) * 5 - 4);
    if (vrm.expressionManager) {
      vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
      // 表情控制
      vrm.expressionManager.setValue('happy', emotion === 'happy' ? 1.0 : 0);
      vrm.expressionManager.setValue('neutral', emotion === 'neutral' ? 0.5 : 0);
      vrm.expressionManager.update();
    }

    // 呼吸律動
    tRef.current += delta;
    if (vrm.humanoid) {
       const spine = vrm.humanoid.getNormalizedBoneNode('spine');
       if(spine) spine.rotation.x = Math.sin(tRef.current) * 0.02;
    }
    vrm.update(delta);
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}

// --- 4. 主舞台 ---
export default function Avatar3D(props) {
  return (
    <div className="w-full h-full relative">
      <Canvas 
        shadows 
        dpr={[1, 1.5]} // 手機優化
        camera={{ position: [0, 1.4, 3.0], fov: 30 }} // 這裡只設定位置，視線由 CameraRig 控制
        gl={{ preserveDrawingBuffer: true, alpha: true }}
      >
        <CameraRig /> {/* 👈 加上這行，確保不會看地板 */}
        
        <ambientLight intensity={1.0} />
        <spotLight position={[2, 2, 2]} intensity={2.0} castShadow shadow-mapSize={[512, 512]} color="#fff0f0" />
        <directionalLight position={[-2, 2, 5]} intensity={1.5} color="#f0f0ff" />

        <Suspense fallback={null}>
           <ErrorBoundary>
             <AvatarModel {...props} />
           </ErrorBoundary>
        </Suspense>

        {/* 隱形地板，接收陰影 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.2} />
        </mesh>
      </Canvas>
      
      {/* 載入指示器 (Overlay) */}
      <div className="absolute top-10 left-0 w-full text-center text-[10px] text-white/30 pointer-events-none">
         正在渲染: {props.vrmId}
      </div>
    </div>
  );
}
