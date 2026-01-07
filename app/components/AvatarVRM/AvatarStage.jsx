// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Avatar3D from "./Avatar3D";

// 🌟 錯誤攔截器
class StageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error) { console.error("3D Stage Error:", error); }
  render() {
    if (this.state.hasError) return <div className="text-red-500 text-xs p-4">⚠️ 3D Error</div>;
    return this.props.children;
  }
}

// 🌟 新增：全像投影台特效 (底座 + 光束 + 粒子)
function HologramBase() {
  const beamRef = useRef();
  const ringRef = useRef();
  
  // 簡單的粒子系統
  const particlesCount = 30;
  const particles = useRef(new Array(particlesCount).fill().map(() => ({
    x: (Math.random() - 0.5) * 1.5,
    y: Math.random() * 2,
    z: (Math.random() - 0.5) * 1.5,
    speed: Math.random() * 0.02 + 0.01,
  })));
  const particlesMesh = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // 1. 光束呼吸效果
    if (beamRef.current) {
      beamRef.current.scale.x = 1 + Math.sin(t * 2) * 0.05;
      beamRef.current.scale.z = 1 + Math.sin(t * 2) * 0.05;
      beamRef.current.material.opacity = 0.15 + Math.sin(t * 3) * 0.05;
    }

    // 2. 底座光環旋轉
    if (ringRef.current) {
      ringRef.current.rotation.z -= 0.01;
    }

    // 3. 粒子上升動畫
    if (particlesMesh.current) {
       // 這裡用簡單的方式模擬粒子，為了效能我們只做簡單的位移
       particlesMesh.current.rotation.y += 0.005;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* A. 投影光束 (圓錐體，底部透明度高，頂部透明) */}
      <mesh ref={beamRef} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.8, 0.4, 2.5, 32, 1, true]} />
        <meshBasicMaterial 
          color="#00ffff" 
          transparent 
          opacity={0.15} 
          side={THREE.DoubleSide} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending} // 發光混合模式
        />
      </mesh>

      {/* B. 底座科技光環 (多層圓環) */}
      <group ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
         {/* 內圈實線 */}
         <mesh>
            <ringGeometry args={[0.35, 0.38, 64]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.8} side={THREE.DoubleSide} />
         </mesh>
         {/* 外圈虛線裝飾 */}
         <mesh position={[0,0,-0.01]}>
            <ringGeometry args={[0.45, 0.46, 64]} />
            <meshBasicMaterial color="#0088ff" transparent opacity={0.5} side={THREE.DoubleSide} />
         </mesh>
         {/* 底部發光盤 */}
         <mesh position={[0,0,-0.02]}>
            <circleGeometry args={[0.3, 32]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.2} />
         </mesh>
      </group>

      {/* C. 地板網格 (Grid) - 營造數據空間感 */}
      <gridHelper args={[10, 20, 0x00ffff, 0x111133]} position={[0, 0.01, 0]} />
    </group>
  );
}

// --- 運鏡邏輯 (保持不變，稍微把相機抬高一點，避開輪盤) ---
function MarketFrame({ targetRef, triggerKey }) {
  const { camera } = useThree();
  const doneRef = useRef(false);

  useEffect(() => { doneRef.current = false; }, [triggerKey]);

  useFrame(() => {
    if (doneRef.current || !targetRef.current) return;
    const root = targetRef.current;
    if (root.children.length === 0) return;

    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);

    if (size.y < 0.1) return;

    // 調整相機：稍微看高一點 (lookAtY * 0.7)，避免腳被UI擋住
    const height = size.y;
    const dist = height * 1.5 + 1.8; 
    const lookAtY = height * 0.65; // 看向胸口偏上

    // 平滑移動
    camera.position.lerp(new THREE.Vector3(0, lookAtY, dist), 0.1);
    camera.lookAt(0, lookAtY, 0);
    
    // 如果位置差不多了就停止計算
    if (camera.position.z - dist < 0.1) doneRef.current = true;
  });

  return null;
}

export default function AvatarStage({ vrmId = "C1", emotion = "idle", unlocked = false }) {
  const modelRoot = useRef();
  const [readyKey, setReadyKey] = useState(0);

  return (
    <div className="w-full h-full relative">
      <StageErrorBoundary key={vrmId}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0, 1.4, 3], fov: 35 }}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        >
          {/* 燈光設置：稍微暗一點的背景，強一點的角色光，營造投影感 */}
          <color attach="background" args={['#050510']} /> {/* 深藍色背景 */}
          <fog attach="fog" args={['#050510', 5, 15]} /> {/* 遠處霧氣 */}

          <ambientLight intensity={0.6} color="#4444ff" /> {/* 藍色環境光 */}
          <directionalLight position={[2, 5, 2]} intensity={2} color="#ccffff" castShadow />
          <spotLight position={[0, 5, 0]} intensity={3} color="#00ffff" distance={8} angle={0.5} penumbra={1} /> {/* 頂光 */}

          {/* 🌟 呼叫全像投影底座 */}
          <HologramBase />

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
            
            {/* 地板陰影 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
              <planeGeometry args={[4, 4]} />
              <shadowMaterial opacity={0.5} color="#000000" />
            </mesh>
          </Suspense>
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
