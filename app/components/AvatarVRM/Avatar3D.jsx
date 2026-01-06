// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, Suspense, useRef } from "react";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

// 🌟 1. 原生攝影師：不需要外部套件，直接控制鏡頭
function CameraRig() {
  useFrame((state) => {
    // 每一幀都強迫攝影機看著 (x=0, y=1.3, z=0) -> 角色胸口
    // 這樣絕對不會跑掉！
    state.camera.lookAt(0, 1.3, 0);
  });
  return null;
}

// 🌟 2. 錯誤保護：如果模型讀取失敗，顯示紅球
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color="red" />
        </mesh>
      );
    }
    return this.props.children;
  }
}

// 🌟 3. 模型本體
function AvatarModel({ vrmId, emotion }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
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
    
    loadedVrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.frustumCulled = false;
      }
    });
    setVrm(loadedVrm);
  }, [gltf]);

  useFrame((state, delta) => {
    if (!vrm) return;
    
    // 眨眼
    const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2.5) * 5 - 4);
    if (vrm.expressionManager) {
      vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
      
      // 表情
      vrm.expressionManager.setValue('happy', emotion === 'happy' ? 1.0 : 0);
      vrm.expressionManager.setValue('neutral', emotion === 'neutral' ? 0.5 : 0);
      
      vrm.expressionManager.update();
    }
    
    // 呼吸
    tRef.current += delta;
    if (vrm.humanoid) {
       const spine = vrm.humanoid.getNormalizedBoneNode('spine');
       if(spine) spine.rotation.x = Math.sin(tRef.current) * 0.02;
    }
    
    vrm.update(delta);
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}

// 🌟 4. 主入口
export default function Avatar3D(props) {
  return (
    <div className="w-full h-full relative">
      <Canvas 
        shadows 
        // 為了手機，把鏡頭拉遠一點 (Z=4.0)
        camera={{ position: [0, 1.4, 4.0], fov: 30 }}
        dpr={[1, 1.5]}
        gl={{ preserveDrawingBuffer: true, alpha: true }}
      >
        {/* 呼叫原生攝影師 */}
        <CameraRig />

        <ambientLight intensity={1.0} />
        <spotLight position={[2, 2, 2]} intensity={2.0} castShadow shadow-mapSize={[512, 512]} color="#fff0f0" />
        <directionalLight position={[-2, 2, 5]} intensity={1.5} color="#f0f0ff" />

        <Suspense fallback={null}>
           <ErrorBoundary>
             <AvatarModel {...props} />
           </ErrorBoundary>
        </Suspense>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.3} />
        </mesh>
      </Canvas>
    </div>
  );
}
