// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Avatar3D from "./Avatar3D";

// --- 運鏡邏輯 (保持不變) ---
function MarketFrame({ targetRef, triggerKey }) {
  const { camera } = useThree();
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
  }, [triggerKey]);

  useFrame(() => {
    if (doneRef.current || !targetRef.current) return;
    const root = targetRef.current;
    
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    if (size.y < 0.1) return;

    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;

    const height = size.y;
    const dist = height * 1.5 + 1.5;
    const lookAtY = height * 0.6;

    camera.position.set(0, lookAtY, dist);
    camera.lookAt(0, lookAtY, 0);
    
    doneRef.current = true;
  });

  return null;
}

// --- 主組件 ---
export default function AvatarStage({
  vrmId = "C1",
  emotion = "idle",
  unlocked = false, // 🌟 新增：接收解鎖狀態
}) {
  const modelRoot = useRef();
  const [readyKey, setReadyKey] = useState(0);

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.4, 3], fov: 35 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={1.0} />
        <directionalLight position={[3, 6, 4]} intensity={1.5} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} />

        <Suspense fallback={null}>
          <group ref={modelRoot}>
            {/* 🌟 記得把 unlocked 傳進去給 Avatar3D */}
            <Avatar3D
              vrmId={vrmId}
              emotion={emotion}
              unlocked={unlocked} 
              onReady={() => setReadyKey(k => k + 1)}
            />
          </group>

          <MarketFrame targetRef={modelRoot} triggerKey={vrmId + readyKey} />

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
             <planeGeometry args={[10, 10]} />
             <shadowMaterial opacity={0.25} blur={2} />
          </mesh>
        </Suspense>
      </Canvas>
    </div>
  );
}
