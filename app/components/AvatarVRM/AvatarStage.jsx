// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Avatar3D from "./Avatar3D";

// 錯誤處理
class StageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error) { console.error("3D Stage Error:", error); }
  render() {
    if (this.state.hasError) return <div className="text-red-500 text-xs p-4">⚠️ 3D Error</div>;
    return this.props.children;
  }
}

// 投影光束 (加強亮度)
const BeamShaderMaterial = {
  uniforms: {
    color: { value: new THREE.Color("#00ffff") },
    time: { value: 0 },
    opacity: { value: 0.6 } // 提高不透明度
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform vec3 color; uniform float time; uniform float opacity; varying vec2 vUv;
    void main() {
      // 讓光束根部更實，往上漸層消失
      float verticalFade = smoothstep(0.7, 0.0, vUv.y); 
      float bottomGlow = smoothstep(0.3, 0.0, vUv.y) * 0.8;
      float scanline = sin(vUv.y * 50.0 - time * 5.0) * 0.1 + 0.9;
      gl_FragColor = vec4(color * scanline + vec3(bottomGlow), opacity * verticalFade);
    }
  `
};

function HologramProjector({ targetRef }) {
  const beamRef = useRef();
  const baseRef = useRef();
  const particlesRef = useRef();
  
  const beamMat = useMemo(() => new THREE.ShaderMaterial({
    ...BeamShaderMaterial, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }), []);

  const particles = useMemo(() => new Array(25).fill().map(() => ({
    x: (Math.random() - 0.5) * 1.2, y: Math.random() * 2.5, z: (Math.random() - 0.5) * 1.2, speed: 0.01 + Math.random() * 0.03
  })), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (beamMat) beamMat.uniforms.time.value = t;

    if (targetRef.current && beamRef.current) {
      const root = targetRef.current;
      if (root.children.length > 0) {
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        box.getSize(size);
        const radius = Math.max(size.x, size.z) * 0.8; 
        const height = size.y * 1.1; 
        
        // 平滑縮放光束
        const currentScale = beamRef.current.scale;
        beamRef.current.position.y = height / 2;
        beamRef.current.scale.lerp(new THREE.Vector3(radius, height, radius), 0.1);
      }
    }

    if (baseRef.current) baseRef.current.rotation.z = t * 0.15;

    if (particlesRef.current) {
      particlesRef.current.children.forEach((p, i) => {
        const data = particles[i];
        p.position.y += data.speed;
        p.material.opacity = 1.0 - (p.position.y / 2.0); 
        if (p.position.y > 2.0) p.position.y = 0;
      });
    }
  });

  return (
    <group>
      <mesh ref={beamRef} material={beamMat} position={[0, 1, 0]}>
        <cylinderGeometry args={[1, 0.15, 1, 32, 1, true]} />
      </mesh>
      <group ref={baseRef} rotation={[-Math.PI/2, 0, 0]}>
         <mesh><circleGeometry args={[0.18, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.9} /></mesh>
         <mesh position={[0,0,-0.01]}><ringGeometry args={[0.22, 0.28, 32]} /><meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.7} /></mesh>
         <mesh position={[0,0,-0.02]} rotation={[0,0,1]}><ringGeometry args={[0.32, 0.38, 6, 2]} /><meshBasicMaterial color="#0088ff" side={THREE.DoubleSide} transparent opacity={0.5} /></mesh>
         <mesh position={[0,0,-0.05]}><ringGeometry args={[0.48, 0.50, 64]} /><meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.3} /></mesh>
      </group>
      <group ref={particlesRef}>
        {particles.map((p, i) => (
           <mesh key={i} position={[p.x, p.y, p.z]}>
             <sphereGeometry args={[0.02, 8, 8]} />
             <meshBasicMaterial color="#00ffff" transparent />
           </mesh>
        ))}
      </group>
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
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y < 0.1) return;
    
    // 相機稍微退後一點，確保看到全身
    const height = size.y;
    const dist = height * 1.5 + 2.2; 
    const lookAtY = height * 0.6; 
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
          // ⚠️ 關鍵：一定要開啟裁切
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, localClippingEnabled: true }}
        >
          <color attach="background" args={['#050510']} />
          <fog attach="fog" args={['#050510', 5, 15]} />

          <ambientLight intensity={0.7} color="#6666ff" />
          <directionalLight position={[2, 5, 2]} intensity={2.5} color="#ccffff" castShadow />
          <spotLight position={[0, 5, 0]} intensity={4} color="#00ffff" distance={8} angle={0.6} penumbra={1} />

          <HologramProjector targetRef={modelRoot} />

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
              <shadowMaterial opacity={0.6} color="#000000" />
            </mesh>
          </Suspense>
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
