// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

// 🌟 攝影師：負責讓鏡頭永遠看著角色胸口
function CameraRig() {
  useFrame((state) => {
    // 讓攝影機看向 (x=0, y=1.2, z=0) 大約是胸口到脖子的位置
    state.camera.lookAt(0, 1.2, 0);
  });
  return null;
}

// 核心模型組件
function AvatarModel({ vrmId, emotion }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);
  const tRef = React.useRef(0);

  useEffect(() => {
    if (!gltf?.userData?.vrm) return;
    const loadedVrm = gltf.userData.vrm;
    VRMUtils.rotateVRM0(loadedVrm);
    
    // 開啟陰影與材質修正
    loadedVrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.frustumCulled = false;
      }
    });
    setVrm(loadedVrm);
  }, [gltf]);

  // 動作迴圈：眨眼 + 呼吸
  useFrame((state, delta) => {
    if (!vrm) return;
    
    // 1. 自動眨眼
    const blinkVal = Math.max(0, Math.sin(state.clock.elapsedTime * 2) * 5 - 4);
    if (vrm.expressionManager) {
      vrm.expressionManager.setValue('blink', Math.min(1, blinkVal));
      
      // 表情控制
      // 先歸零
      vrm.expressionManager.setValue('happy', 0);
      vrm.expressionManager.setValue('neutral', 0);
      
      // 再設定
      if (emotion === 'happy') vrm.expressionManager.setValue('happy', 1.0);
      else vrm.expressionManager.setValue('neutral', 0.5);
      
      vrm.expressionManager.update();
    }

    // 2. 呼吸律動
    tRef.current += delta;
    if (vrm.humanoid) {
       const spine = vrm.humanoid.getNormalizedBoneNode('spine');
       // 微微呼吸感
       if(spine) spine.rotation.x = Math.sin(tRef.current * 1.5) * 0.02;
    }
    
    vrm.update(delta);
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}

export default function Avatar3D(props) {
  return (
    <div className="w-full h-full relative">
      <Canvas 
        shadows 
        // 為了手機直式螢幕，把相機拉遠一點 (z=3.5)
        camera={{ position: [0, 1.3, 3.5], fov: 30 }}
        dpr={[1, 1.5]} // 手機效能優化
        gl={{ preserveDrawingBuffer: true, alpha: true }}
      >
        {/* 呼叫攝影師 */}
        <CameraRig />
        
        <ambientLight intensity={1.0} />
        <spotLight position={[2, 2, 2]} intensity={2.0} castShadow shadow-mapSize={[512, 512]} color="#fff0f0" />
        <directionalLight position={[-2, 2, 5]} intensity={1.5} color="#f0f0ff" />

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
