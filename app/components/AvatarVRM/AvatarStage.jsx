"use client";

import React, { Suspense, useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
// ❌ 移除了導致卡住的 Environment 引用
import Avatar3D from "./Avatar3D";

class StageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error) { console.error("3D Stage Error:", error); }
  render() {
    if (this.state.hasError) return (<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 text-sm bg-black/90 p-4 rounded border border-red-500">⚠️ 3D Error</div>);
    return this.props.children;
  }
}

function LoadingFallback() {
  return (<mesh visible={false}><boxGeometry /><meshBasicMaterial color="black" /></mesh>);
}

// 數位傳送平台 (保持不變)
function DigitalPlatform() {
  const outerRingRef = useRef();
  const innerRingRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if(outerRingRef.current) outerRingRef.current.rotation.z = t * 0.05;
    if(innerRingRef.current) innerRingRef.current.rotation.z = -t * 0.1;
  });

  return (
    <group position={[0, -0.2, 0]}> 
      {/* 發光核心 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[0.8, 64]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} transparent opacity={0.8} />
      </mesh>
      {/* 平台主體 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.2, 64]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.18, 1.2, 64]} />
        <meshBasicMaterial color="#00aaff" />
      </mesh>
      {/* 旋轉光環 */}
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <group ref={outerRingRef}>
            <mesh><ringGeometry args={[1.3, 1.35, 64, 8]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.3} side={THREE.DoubleSide} wireframe /></mesh>
        </group>
        <group ref={innerRingRef}>
            <mesh><ringGeometry args={[1.0, 1.02, 64, 16]} /><meshBasicMaterial color="#0088ff" transparent opacity={0.5} side={THREE.DoubleSide} /></mesh>
        </group>
      </group>
      {/* 底部支架 */}
      {[0, 90, 180, 270].map((angle, i) => (
        <group key={i} rotation={[0, THREE.MathUtils.degToRad(angle), 0]}>
            <mesh position={[1.1, -0.5, 0]} rotation={[0, 0, 0.2]}>
                <boxGeometry args={[0.1, 1, 0.1]} />
                <meshStandardMaterial color="#222233" metalness={0.9} />
            </mesh>
            <mesh position={[1.1, -0.5, 0]} rotation={[0, 0, 0.2]}>
                <boxGeometry args={[0.02, 1, 0.02]} />
                <meshBasicMaterial color="#00ffff" transparent opacity={0.7} />
            </mesh>
        </group>
      ))}
      <spotLight position={[0, -2, 0]} target-position={[0, 2, 0]} intensity={8} distance={8} angle={0.6} penumbra={0.5} color="#00ffff" />
      <pointLight position={[0, 0.5, 0]} intensity={5} distance={4} color="#0088ff" />
    </group>
  );
}

function RisingParticles({ active }) {
    const count = 200;
    const pointsRef = useRef();
    const [positions] = useState(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.5 + Math.random() * 1.0; 
            pos[i * 3] = Math.cos(angle) * radius;
            pos[i * 3 + 1] = Math.random() * 3; 
            pos[i * 3 + 2] = Math.sin(angle) * radius;
        }
        return pos;
    });

    useFrame((state, delta) => {
        if (!pointsRef.current) return;
        const positionsAttr = pointsRef.current.geometry.attributes.position;
        const speedMultiplier = active ? 4.0 : 1.0; 
        for (let i = 0; i < count; i++) {
            let y = positionsAttr.array[i * 3 + 1];
            y += delta * (0.3 + Math.random() * 0.4) * speedMultiplier;
            if (y > 4.0) y = 0; 
            positionsAttr.array[i * 3 + 1] = y;
        }
        positionsAttr.needsUpdate = true;
    });

    return (
        <points ref={pointsRef} position={[0, -0.5, 0]}>
            <bufferGeometry><bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} /></bufferGeometry>
            <pointsMaterial size={0.04} color={active ? "#ffffff" : "#00aaff"} transparent opacity={0.8} sizeAttenuation={true} blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
    );
}

function MarketFrame({ targetRef, triggerKey }) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  React.useEffect(() => { doneRef.current = false; }, [triggerKey]);
  useFrame(() => {
    if (doneRef.current || !targetRef.current || targetRef.current.children.length === 0) return;
    camera.position.lerp(new THREE.Vector3(0, 1.6, 4.2), 0.1);
    camera.lookAt(0, 1.0, 0);
    if (Math.abs(camera.position.z - 4.2) < 0.1) doneRef.current = true;
  });
  return null;
}

export default function AvatarStage({ vrmId = "avatar_01", emotion = "idle", unlocked = false, onModelReady, isApproaching = false }) {
  const modelRoot = useRef();
  const [readyKey, setReadyKey] = useState(0);

  const handleAvatarReady = (vrm) => {
    setReadyKey(k => k + 1);
    if (onModelReady) onModelReady();
  };

  return (
    <div className="w-full h-full relative bg-gradient-to-b from-[#02020a] to-[#050515]">
      <StageErrorBoundary key={vrmId} vrmId={vrmId}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0, 1.8, 5], fov: 35 }}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        >
          <fog attach="fog" args={['#050515', 5, 15]} />
          
          {/* 🌟 修復重點：增強標準燈光，取代 Environment */}
          <ambientLight intensity={0.7} color="#3333ff" />
          <directionalLight position={[3, 5, 2]} intensity={2.0} color="#ffffff" castShadow />
          <spotLight position={[-2, 4, 4]} intensity={2.0} color="#00ffff" />

          {/* 移除 Environment 元件 */}

          <DigitalPlatform />
          <RisingParticles active={isApproaching} />

          <Suspense fallback={<LoadingFallback />}>
            <group ref={modelRoot}>
              <Avatar3D
                vrmId={vrmId}
                emotion={emotion}
                unlocked={unlocked}
                isApproaching={isApproaching}
                onReady={handleAvatarReady}
              />
            </group>
            <MarketFrame targetRef={modelRoot} triggerKey={vrmId + readyKey} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
              <planeGeometry args={[10, 10]} />
              <shadowMaterial opacity={0.7} color="#000000" />
            </mesh>
          </Suspense>
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
