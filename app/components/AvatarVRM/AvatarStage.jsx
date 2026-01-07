// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Avatar3D from "./Avatar3D";

class StageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error) { console.error("3D Stage Error:", error); }
  render() {
    if (this.state.hasError) return <div className="text-red-500 text-xs p-4">⚠️ 3D Error</div>;
    return this.props.children;
  }
}

// 🌟 新增：動態適應投影光束
function DynamicHologramBeam({ targetRef }) {
  const groupRef = useRef();
  const coneRef = useRef();
  const ringsRef = useRef();
  
  // 自動調整光束寬度
  useFrame(() => {
    if (!targetRef.current || !groupRef.current) return;
    
    // 抓取模型大小
    const root = targetRef.current;
    if (root.children.length === 0) return; // 還沒載入

    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // 計算目標半徑 (取 X 和 Z 的最大值，並加一點寬裕度)
    const radius = Math.max(size.x, size.z) * 0.8; 
    const height = size.y * 1.2; // 光束比人高一點

    // 平滑過渡 (Lerp) 避免瞬間跳動
    const currentScale = groupRef.current.scale;
    currentScale.x = THREE.MathUtils.lerp(currentScale.x, radius, 0.1);
    currentScale.z = THREE.MathUtils.lerp(currentScale.z, radius, 0.1);
    currentScale.y = THREE.MathUtils.lerp(currentScale.y, height, 0.1);
  });

  // 動畫效果：旋轉與掃描
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (coneRef.current) {
      // 網格旋轉
      coneRef.current.rotation.y = t * 0.2;
      // 呼吸閃爍
      coneRef.current.material.opacity = 0.1 + Math.sin(t * 3) * 0.05;
    }

    if (ringsRef.current) {
      // 掃描圈圈往上跑 (利用 texture offset 或直接移動 mesh)
      // 這裡簡單用 position y 循環
      ringsRef.current.children.forEach((ring, i) => {
        // 讓圈圈在 0 ~ 1 之間循環上升
        const speed = 0.5;
        const offset = i * 0.3;
        ring.position.y = ((t * speed + offset) % 1.2) - 0.1;
        
        // 靠近頂部和底部時透明度降低 (Fade edges)
        const h = ring.position.y;
        const fade = 1 - Math.pow((h - 0.5) * 2, 2); // 拋物線透明度
        ring.material.opacity = Math.max(0, fade * 0.8);
        
        // 隨高度縮放 (符合圓錐體形狀)
        // 圓錐體：底大頭小 (假設頂點在 y=1, 底在 y=0) -> 半徑 = 1 - y
        // 但我們光束是直的或是稍微錐形，這裡做一點點錐形效果
        const scale = 1.2 - (h * 0.4); 
        ring.scale.set(scale, scale, scale);
      });
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* A. 線框圓錐 (Wireframe Beam) - 創造線條感 */}
      <mesh ref={coneRef} position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.6, 1.2, 1, 16, 8, true]} />
        <meshBasicMaterial 
          color="#00ffff" 
          wireframe={true} // 🌟 關鍵：線框模式
          transparent 
          opacity={0.1} 
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* B. 掃描光環組 (Moving Rings) - 創造動態掃描感 */}
      <group ref={ringsRef}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[0.95, 1.0, 32]} />
            <meshBasicMaterial color="#00ffff" transparent side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>

      {/* C. 底部強力光斑 */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
         <circleGeometry args={[1.2, 32]} />
         <meshBasicMaterial color="#0088ff" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// --- 運鏡 (保持不變) ---
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

    const height = size.y;
    const dist = height * 1.5 + 2.0; 
    const lookAtY = height * 0.65; 

    camera.position.lerp(new THREE.Vector3(0, lookAtY, dist), 0.1);
    camera.lookAt(0, lookAtY, 0);
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
          <color attach="background" args={['#050510']} />
          <fog attach="fog" args={['#050510', 5, 15]} />

          <ambientLight intensity={0.6} color="#4444ff" />
          <directionalLight position={[2, 5, 2]} intensity={2} color="#ccffff" castShadow />
          <spotLight position={[0, 5, 0]} intensity={3} color="#00ffff" distance={8} angle={0.5} penumbra={1} />

          {/* 🌟 傳入 modelRoot 讓光束知道模型有多寬 */}
          <DynamicHologramBeam targetRef={modelRoot} />

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
