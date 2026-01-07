// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Avatar3D from "./Avatar3D";

// 🌟 錯誤攔截器：如果 3D 壞了，顯示錯誤訊息，不要讓整個 App 黑屏
class StageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("3D Stage Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      // 顯示錯誤訊息在畫面上
      return (
        <div className="flex items-center justify-center h-full w-full text-red-500 text-xs bg-black/50 p-4 text-center">
          <p>⚠️ 3D 載入失敗<br/>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- 運鏡邏輯 ---
function MarketFrame({ targetRef, triggerKey }) {
  const { camera } = useThree();
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
  }, [triggerKey]);

  useFrame(() => {
    if (doneRef.current || !targetRef.current) return;
    const root = targetRef.current;
    
    // 簡單的防呆檢查
    if (root.children.length === 0) return;

    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    if (size.y < 0.1) return;

    // 調整位置
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;

    // 調整相機
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
  unlocked = false,
}) {
  const modelRoot = useRef();
  const [readyKey, setReadyKey] = useState(0);

  return (
    <div className="w-full h-full relative">
      {/* 🌟 包裹 ErrorBoundary，防止全站崩潰 */}
      <StageErrorBoundary key={vrmId}>
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
      </StageErrorBoundary>
    </div>
  );
}
