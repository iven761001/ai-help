"use client";

import React, { Suspense, useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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

function SciFiPlatform() {
  const ringsRef = useRef();
  useFrame((state) => {
    if(ringsRef.current) ringsRef.current.rotation.y = state.clock.elapsedTime * 0.1;
  });
  return (
    <group position={[0, -0.1, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 64]} />
        <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={1.5} transparent opacity={0.9} />
      </mesh>
      <spotLight position={[0, -1, 0]} target-position={[0, 1, 0]} intensity={5} distance={5} angle={0.8} penumbra={1} color="#00ffff" />
      <pointLight position={[0, 0.2, 0]} intensity={3} distance={3} color="#0088ff" />
      <group ref={ringsRef}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><ringGeometry args={[0.75, 0.8, 64]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><ringGeometry args={[0.85, 0.95, 64]} /><meshBasicMaterial color="#0066ff" transparent opacity={0.4} side={THREE.DoubleSide} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><ringGeometry args={[1.1, 1.12, 64]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.3} side={THREE.DoubleSide} /></mesh>
      </group>
    </group>
  );
}

function RisingParticles({ active }) {
    const count = 150;
    const pointsRef = useRef();
    const [positions] = useState(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 3;
            pos[i * 3 + 1] = Math.random() * 3;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
        }
        return pos;
    });

    useFrame((state, delta) => {
        if (!pointsRef.current) return;
        const positionsAttr = pointsRef.current.geometry.attributes.position;
        // 如果 active (正在前進)，粒子上升速度變快
        const speedMultiplier = active ? 3.0 : 1.0; 
        
        for (let i = 0; i < count; i++) {
            let y = positionsAttr.array[i * 3 + 1];
            y += delta * (0.2 + Math.random() * 0.3) * speedMultiplier;
            if (y > 3.5) y = 0;
            positionsAttr.array[i * 3 + 1] = y;
        }
        positionsAttr.needsUpdate = true;
    });

    return (
        <points ref={pointsRef} position={[0, -0.5, 0]}>
            <bufferGeometry><bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} /></bufferGeometry>
            <pointsMaterial size={0.03} color={active ? "#ffffff" : "#00ffff"} transparent opacity={0.6} sizeAttenuation={true} blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
    );
}

function MarketFrame({ targetRef, triggerKey }) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  React.useEffect(() => { doneRef.current = false; }, [triggerKey]);
  useFrame(() => {
    if (doneRef.current || !targetRef.current || targetRef.current.children.length === 0) return;
    camera.position.lerp(new THREE.Vector3(0, 1.3, 3.8), 0.1);
    camera.lookAt(0, 1.1, 0);
    if (Math.abs(camera.position.z - 3.8) < 0.1) doneRef.current = true;
  });
  return null;
}

// 🌟 新增 prop: isApproaching
export default function AvatarStage({ vrmId = "avatar_01", emotion = "idle", unlocked = false, onModelReady, isApproaching = false }) {
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
          <color attach="background" args={['#02020a']} />
          <fog attach="fog" args={['#02020a', 4, 12]} />
          <ambientLight intensity={0.4} color="#3333ff" />
          <directionalLight position={[2, 5, 2]} intensity={1.5} color="#ccffff" castShadow />
          
          <SciFiPlatform />
          {/* 傳入 active 狀態給粒子 */}
          <RisingParticles active={isApproaching} />

          <Suspense fallback={<LoadingFallback />}>
            <group ref={modelRoot}>
              <Avatar3D
                vrmId={vrmId}
                emotion={emotion}
                unlocked={unlocked}
                isApproaching={isApproaching} // 🌟 傳給模型
                onReady={handleAvatarReady}
              />
            </group>
            <MarketFrame targetRef={modelRoot} triggerKey={vrmId + readyKey} />
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
