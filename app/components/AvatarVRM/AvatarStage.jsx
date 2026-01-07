// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Avatar3D from "./Avatar3D";

// Error Boundary to catch crashes without killing the whole app
class StageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error) { console.error("3D Stage Error:", error); }
  render() {
    if (this.state.hasError) return <div className="text-red-500 text-xs p-4 flex items-center justify-center h-full">System Error</div>;
    return this.props.children;
  }
}

// Hologram Projector Visuals (The light beam and base)
function HologramProjector() {
  const beamRef = useRef();
  const ringRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (beamRef.current) {
        beamRef.current.material.opacity = 0.3 + Math.sin(t * 3) * 0.1;
    }
    if (ringRef.current) {
        ringRef.current.rotation.z = t * 0.2;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Light Beam */}
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
      {/* Tech Base */}
      <group ref={ringRef}>
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.2, 0.5, 32]} />
            <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.5} />
        </mesh>
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.45, 0.48, 32]} />
            <meshBasicMaterial color="#0088ff" side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
}

// Camera Controller
function MarketFrame({ targetRef }) {
  const { camera } = useThree();
  const doneRef = useRef(false);

  useFrame(() => {
    if (doneRef.current || !targetRef.current) return;
    const root = targetRef.current;
    
    // Only center camera once the model is loaded
    if (root.children.length === 0) return;

    // Smoothly move camera to position
    camera.position.lerp(new THREE.Vector3(0, 1.3, 3.5), 0.1);
    camera.lookAt(0, 1.1, 0);
    
    // Stop updating once close enough to save performance
    if (Math.abs(camera.position.z - 3.5) < 0.1) doneRef.current = true;
  });
  return null;
}

export default function AvatarStage({ vrmId = "C1", emotion = "idle", unlocked = false }) {
  const modelRoot = useRef();

  return (
    <div className="w-full h-full relative">
      <StageErrorBoundary key={vrmId}>
        <Canvas
          shadows
          dpr={[1, 1.5]} // Performance setting
          camera={{ position: [0, 1.4, 4], fov: 35 }}
          // IMPORTANT: Enable Clipping
          gl={{ localClippingEnabled: true, preserveDrawingBuffer: true, alpha: true }}
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
              />
            </group>
            <MarketFrame targetRef={modelRoot} />
          </Suspense>
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
