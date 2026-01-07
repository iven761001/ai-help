"use client";

import React, { Suspense, useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Avatar3D from "./Avatar3D";

// 錯誤處理
class StageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error) { console.error("3D Stage Error:", error); }
  render() {
    if (this.state.hasError) return (<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 text-sm bg-black/90 p-4 rounded border border-red-500">⚠️ 3D Error: Model Load Failed</div>);
    return this.props.children;
  }
}

function LoadingFallback() {
  return (<mesh visible={false}><boxGeometry /><meshBasicMaterial color="black" /></mesh>);
}

// --- 🌟 新元件：科幻平台底座 ---
function SciFiPlatform() {
  const ringsRef = useRef();
  useFrame((state) => {
    // 讓外圈緩慢旋轉
    if(ringsRef.current) ringsRef.current.rotation.y = state.clock.elapsedTime * 0.1;
  });

  return (
    <group position={[0, -0.1, 0]}>
      {/* 中心強力發光墊 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 64]} />
        <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={1.5} transparent opacity={0.9} />
      </mesh>
      
      {/* 底部聚光燈 (從下往上打光) */}
      <spotLight position={[0, -1, 0]} target-position={[0, 1, 0]} intensity={5} distance={5} angle={0.8} penumbra={1} color="#00ffff" />
      <pointLight position={[0, 0.2, 0]} intensity={3} distance={3} color="#0088ff" />

      {/* 旋轉的科技光環 */}
      <group ref={ringsRef}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.75, 0.8, 64]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.85, 0.95, 64]} />
            <meshBasicMaterial color="#0066ff" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <ringGeometry args={[1.1, 1.12, 64]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
      </group>
    </group>
  );
}

// --- 🌟 新元件：上升粒子特效 ---
function RisingParticles() {
    const count = 150; // 粒子數量
    const pointsRef = useRef();

    // 初始化粒子位置
    const [positions] = useState(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 3; // X 範圍
            pos[i * 3 + 1] = Math.random() * 3;     // Y 高度範圍
            pos[i * 3 + 2] = (Math.random() - 0.5) * 3; // Z 範圍
        }
        return pos;
    });

    // 動畫循環：讓粒子上升
    useFrame((state, delta) => {
        if (!pointsRef.current) return;
        const positionsAttr = pointsRef.current.geometry.attributes.position;
        for (let i = 0; i < count; i++) {
            let y = positionsAttr.array[i * 3 + 1];
            y += delta * (0.2 + Math.random() * 0.3); // 隨機上升速度
            // 如果超過高度，重置到底部
            if (y > 3.5) y = 0;
            positionsAttr.array[i * 3 + 1] = y;
        }
        positionsAttr.needsUpdate = true;
    });

    return (
        <points ref={pointsRef} position={[0, -0.5, 0]}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            {/* 粒子材質 */}
            <pointsMaterial size={0.03} color="#00ffff" transparent opacity={0.6} sizeAttenuation={true} blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
    );
}

// 運鏡邏輯 (保持不變)
function MarketFrame({ targetRef, triggerKey }) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  React.useEffect(() => { doneRef.current = false; }, [triggerKey]);
  useFrame(() => {
    if (doneRef.current || !targetRef.current || targetRef.current.children.length === 0) return;
    // 稍微調整運鏡高度，配合浮空
    camera.position.lerp(new THREE.Vector3(0, 1.3, 3.8), 0.1);
    camera.lookAt(0, 1.1, 0);
    if (Math.abs(camera.position.z - 3.8) < 0.1) doneRef.current = true;
  });
  return null;
}

export default function AvatarStage({ vrmId = "avatar_01", emotion = "idle", unlocked = false, onModelReady }) {
  const modelRoot = useRef();
  const [readyKey, setReadyKey] = useState(0);

  const handleAvatarReady = (vrm) => {
    setReadyKey(k => k + 1);
    if (onModelReady) onModelReady();
  };

  return (
    <div className="w-full h-full relative">
      <StageErrorBoundary key={vrmId} vrmId={vrmId}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0, 1.4, 4], fov: 35 }}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        >
          {/* 調整背景色為更深的藍黑色 */}
          <color attach="background" args={['#02020a']} />
          <fog attach="fog" args={['#02020a', 4, 12]} />

          {/* 環境光稍微調暗，強調自發光 */}
          <ambientLight intensity={0.4} color="#3333ff" />
          {/* 主光源 */}
          <directionalLight position={[2, 5, 2]} intensity={1.5} color="#ccffff" castShadow />
          
          {/* 🌟 替換成新的舞台與粒子系統 */}
          <SciFiPlatform />
          <RisingParticles />

          <Suspense fallback={<LoadingFallback />}>
            <group ref={modelRoot}>
              <Avatar3D
                vrmId={vrmId}
                emotion={emotion}
                unlocked={unlocked}
                onReady={handleAvatarReady}
              />
            </group>
            <MarketFrame targetRef={modelRoot} triggerKey={vrmId + readyKey} />
            
            {/* 地面陰影 (稍微調淡) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]} receiveShadow>
              <planeGeometry args={[6, 6]} />
              <shadowMaterial opacity={0.4} color="#000000" />
            </mesh>
          </Suspense>
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
