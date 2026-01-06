// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { OrbitControls } from "@react-three/drei"; // 👈 使用標準控制器

// 錯誤邊界：如果模型掛了，顯示紅色方塊
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
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

function AvatarModel({ vrmId, emotion }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
  // 使用 React.useRef 確保引用正確
  const tRef = React.useRef(0);

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
    
    // 簡單眨眼邏輯
    const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2) * 5 - 4);
    if (vrm.expressionManager) {
      vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
      vrm.expressionManager.setValue('happy', emotion === 'happy' ? 1.0 : 0);
      vrm.expressionManager.setValue('neutral', emotion === 'neutral' ? 0.5 : 0);
      vrm.expressionManager.update();
    }
    
    // 簡單呼吸
    tRef.current += delta;
    if (vrm.humanoid) {
       const spine = vrm.humanoid.getNormalizedBoneNode('spine');
       if(spine) spine.rotation.x = Math.sin(tRef.current * 1.5) * 0.02;
    }
    vrm.update(delta);
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}

export default function Avatar3D(props) {
  return (
    <div className="w-full h-full relative" style={{ background: 'transparent' }}>
      <Canvas 
        shadows 
        dpr={[1, 1.5]} 
        camera={{ position: [0, 1.4, 3.8], fov: 30 }} // 相機拉遠一點
        gl={{ preserveDrawingBuffer: true, alpha: true }}
      >
        {/* 🌟 使用 OrbitControls 自動對焦 */}
        {/* target=[0, 1.3, 0] 代表鏡頭中心鎖定在角色的「胸口高度」 */}
        {/* enableZoom={false} 禁止縮放，避免誤觸 */}
        <OrbitControls target={[0, 1.3, 0]} enableZoom={false} enablePan={false} />

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
