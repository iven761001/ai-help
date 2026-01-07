// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useRef, useMemo } from "react";
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

// 投影光束 (視覺裝飾)
function HologramProjector() {
  const beamRef = useRef();
  
  // 簡單的圓錐光束
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (beamRef.current) {
        beamRef.current.material.opacity = 0.3 + Math.sin(t * 3) * 0.1;
        beamRef.current.rotation.y = t * 0.1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 光束 */}
      <mesh ref={beamRef} position={[0, 1, 0]}>
        <cylinderGeometry args={[0.8, 0.2, 2, 32, 1, true]} />
        <meshBasicMaterial 
            color="#00ffff" 
            transparent 
            opacity={0.3} 
            side={THREE.DoubleSide} 
            depthWrite={false} 
            blending={THREE.AdditiveBlending} 
        />
      </mesh>
      {/* 底座 */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
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
  
  React.useEffect(() => { doneRef.current = false; }, [triggerKey]);

  useFrame(() => {
    if (doneRef.current || !targetRef.current) return;
    const root = targetRef.current;
    if (root.children.length === 0) return;

    camera.position.lerp(new THREE.Vector3(0, 1.3, 3.5), 0.1);
    camera.lookAt(0, 1.1, 0);
    
    if (Math.abs(camera.position.z - 3.5) < 0.1) doneRef.current = true;
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
          camera={{ position: [0, 1.4, 4], fov: 35 }}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
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
