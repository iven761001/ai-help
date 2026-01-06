// components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

// 🌟 1. 測試用的紅色方塊 (如果看到它，代表 3D 畫布是正常的)
function TestCube() {
  const meshRef = React.useRef();
  useFrame((state, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta;
  });
  return (
    <mesh ref={meshRef} position={[0.5, 1.3, 0]}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}

// 🌟 2. 模型載入器 (加了 Alert 追蹤)
function AvatarModel({ vrmId, emotion }) {
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);
  
  // 讓使用者知道程式有沒有在跑
  useEffect(() => {
    // alert(`[Debug] 準備載入模型: ${url}`);
  }, [url]);

  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const [vrm, setVrm] = useState(null);

  useEffect(() => {
    if (!gltf?.userData?.vrm) {
        // alert("[Error] 模型載入失敗或不是 VRM");
        return;
    }
    // alert("[Success] 模型載入成功！");
    
    const loadedVrm = gltf.userData.vrm;
    VRMUtils.rotateVRM0(loadedVrm);
    
    loadedVrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false; // 防止消失
      }
    });
    setVrm(loadedVrm);
  }, [gltf]);

  useFrame((state) => {
    if (vrm) vrm.update(state.clock.getDelta());
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}

export default function Avatar3D(props) {
  return (
    <div className="w-full h-full relative" style={{ background: '#222' }}> 
      {/* ↑ 強制給一個深灰色背景，確認 div 有撐開 */}
      
      <Canvas 
        shadows 
        camera={{ position: [0, 1.4, 2.5], fov: 30 }}
      >
        {/* 燈光打亮一點 */}
        <ambientLight intensity={1.5} />
        <directionalLight position={[0, 5, 5]} intensity={2} />

        {/* 測試方塊：用來驗證 Canvas 有沒有壞掉 */}
        <TestCube />

        {/* 真正的模型 */}
        <Suspense fallback={null}>
           <AvatarModel {...props} />
        </Suspense>
      </Canvas>
      
      <div className="absolute top-20 left-0 w-full text-center text-white bg-black/50 p-1">
        Debug: {props.vrmId} (若看到紅方塊代表3D正常)
      </div>
    </div>
  );
}
