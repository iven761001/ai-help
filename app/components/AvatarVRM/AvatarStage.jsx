"use client";

import React, { Suspense, useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/fiber";
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

// 🌟 全新設計：大型數位傳送平台
function DigitalPlatform() {
  const outerRingRef = useRef();
  const innerRingRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if(outerRingRef.current) outerRingRef.current.rotation.z = t * 0.05; // 外圈慢速旋轉
    if(innerRingRef.current) innerRingRef.current.rotation.z = -t * 0.1; // 內圈反向旋轉
  });

  return (
    <group position={[0, -0.2, 0]}> 
      {/* 1. 中央發光能量場 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[0.8, 64]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} transparent opacity={0.8} />
      </mesh>

      {/* 2. 平台主體結構 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.2, 64]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* 平台邊緣發光線條 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.18, 1.2, 64]} />
        <meshBasicMaterial color="#00aaff" />
      </mesh>

      {/* 3. 旋轉的數據光環 */}
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <group ref={outerRingRef}>
            <mesh><ringGeometry args={[1.3, 1.35, 64, 8]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.3} side={THREE.DoubleSide} wireframe /></mesh>
        </group>
        <group ref={innerRingRef}>
            <mesh><ringGeometry args={[1.0, 1.02, 64, 16]} /><meshBasicMaterial color="#0088ff" transparent opacity={0.5} side={THREE.DoubleSide} /></mesh>
        </group>
      </group>

      {/* 4. 向下延伸的支架與光纜 (製造懸浮感) */}
      {[0, 90, 180, 270].map((angle, i) => (
        <group key={i} rotation={[0, THREE.MathUtils.degToRad(angle), 0]}>
            {/* 支架 */}
            <mesh position={[1.1, -0.5, 0]} rotation={[0, 0, 0.2]}>
                <boxGeometry args={[0.1, 1, 0.1]} />
                <meshStandardMaterial color="#222233" metalness={0.9} />
            </mesh>
            {/* 發光纜線 */}
            <mesh position={[1.1, -0.5, 0]} rotation={[0, 0, 0.2]}>
                <boxGeometry args={[0.02, 1, 0.02]} />
                <meshBasicMaterial color="#00ffff" transparent opacity={0.7} />
            </mesh>
        </group>
      ))}

      {/* 底部聚光燈 */}
      <spotLight position={[0, -2, 0]} target-position={[0, 2, 0]} intensity={8} distance={8} angle={0.6} penumbra={0.5} color="#00ffff" />
      <pointLight position={[0, 0.5, 0]} intensity={5} distance={4} color="#0088ff" />
    </group>
  );
}

function RisingParticles({ active }) {
    const count = 200; // 增加粒子數量
    const pointsRef = useRef();
    const [positions] = useState(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            // 讓粒子分布在平台周圍
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.5 + Math.random() * 1.0; 
            pos[i * 3] = Math.cos(angle) * radius;
            pos[i * 3 + 1] = Math.random() * 3; // 高度
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
            if (y > 4.0) y = 0; // 重置高度
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
    // 調整攝影機角度，稍微拉高並往下看平台
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
          // 初始攝影機位置調整
          camera={{ position: [0, 1.8, 5], fov: 35 }}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        >
          <fog attach="fog" args={['#050515', 5, 15]} />
          <ambientLight intensity={0.3} color="#3333ff" />
          <directionalLight position={[3, 5, 2]} intensity={1.2} color="#ccffff" castShadow />
          {/* 添加環境反射 */}
          <Environment preset="night" />

          {/* 🌟 新的數位平台 */}
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
            
            {/* 更深邃的地面陰影 */}
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
