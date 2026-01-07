// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Avatar3D from "./Avatar3D";

class StageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error) { console.error("3D Stage Error:", error); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xs p-4 bg-black/80 z-50">
          ⚠️ 3D 載入錯誤: {this.state.error?.message}
        </div>
      );
    }
    return this.props.children;
  }
}

// 投影光束
function HologramProjector() {
  const beamRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (beamRef.current) {
        // 呼吸燈效果
        const opacity = 0.3 + Math.sin(t * 3) * 0.1;
        if (Array.isArray(beamRef.current.material)) {
            beamRef.current.material.forEach(m => m.opacity = opacity);
        } else {
            beamRef.current.material.opacity = opacity;
        }
        beamRef.current.rotation.y = t * 0.1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 光束 */}
      <mesh ref={beamRef} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.9, 0.2, 2.4, 32, 1, true]} />
        <meshBasicMaterial 
            color="#00ffff" 
            transparent 
            opacity={0.3} 
            side={THREE.DoubleSide} 
            depthWrite={false} 
            blending={THREE.AdditiveBlending} 
        />
      </mesh>
      {/* 底座光環 */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
         <ringGeometry args={[0.2, 0.5, 32]} />
         <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// 運鏡
function MarketFrame({ targetRef, triggerKey }) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  
  useEffect(() => { doneRef.current = false; }, [triggerKey]);

  useFrame(() => {
    if (doneRef.current || !targetRef.current) return;
    const root = targetRef.current;
    if (root.children.length === 0) return;

    // 平滑移動到展示位置
    camera.position.lerp(new THREE.Vector3(0, 1.3, 3.8), 0.1);
    camera.lookAt(0, 1.1, 0);
    
    if (Math.abs(camera.position.z - 3.8) < 0.1) doneRef.current = true;
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
          camera={{ position: [0, 1.4, 4.5], fov: 35 }}
          // ⚠️ 關鍵：開啟裁切
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, localClippingEnabled: true }}
        >
          <color attach="background" args={['#050510']} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 2, 2]} intensity={2} />
          
          <HologramProjector />

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
          </Suspense>
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
