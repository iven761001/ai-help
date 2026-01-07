// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Avatar3D from "./Avatar3D";

// --- 輔助工具：MarketFrame (自動運鏡) ---
function MarketFrame({ targetRef, triggerKey }) {
  const { camera } = useThree();
  const doneRef = useRef(false);

  // 當 triggerKey (模型ID) 改變時，重置運鏡狀態
  useEffect(() => {
    doneRef.current = false;
  }, [triggerKey]);

  useFrame(() => {
    if (doneRef.current || !targetRef.current) return;
    const root = targetRef.current;
    
    // 算 Bounding Box
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    if (size.y < 0.1) return; // 還沒載入好

    // 1. 調整位置：把角色腳底置於 (0,0,0)
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;

    // 2. 調整相機：根據身高自動拉遠近
    const height = size.y;
    const dist = height * 1.5 + 1.5; // 自動距離公式
    const lookAtY = height * 0.6; // 看向胸口附近

    // 平滑移動相機 (這裡直接設定，避免抖動)
    camera.position.set(0, lookAtY, dist);
    camera.lookAt(0, lookAtY, 0);
    
    doneRef.current = true; // 完成運鏡
  });

  return null;
}

// --- 主組件 ---
export default function AvatarStage({
  vrmId = "C1",
  emotion = "idle",
}) {
  const modelRoot = useRef();
  // 用來觸發重算的 key
  const [readyKey, setReadyKey] = useState(0);

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.4, 3], fov: 35 }} // 初始相機，隨後會被 MarketFrame 接管
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={1.0} />
        <directionalLight position={[3, 6, 4]} intensity={1.5} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} />

        <Suspense fallback={null}>
          <group ref={modelRoot}>
            <Avatar3D
              vrmId={vrmId}
              emotion={emotion}
              onReady={() => setReadyKey(k => k + 1)} // 模型載入完成後，觸發運鏡
            />
          </group>

          {/* 自動運鏡邏輯 */}
          <MarketFrame targetRef={modelRoot} triggerKey={vrmId + readyKey} />

          {/* 簡單的地板陰影 (不依賴套件) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
             <planeGeometry args={[10, 10]} />
             <shadowMaterial opacity={0.25} blur={2} />
          </mesh>
        </Suspense>
      </Canvas>
      
      {/* 讀取中的提示 (HTML層) */}
      <div className="absolute top-4 right-4 text-[10px] text-white/20 pointer-events-none">
        STAGE ACTIVE: {vrmId}
      </div>
    </div>
  );
}
