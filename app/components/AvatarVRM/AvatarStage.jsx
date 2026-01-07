// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Avatar3D from "./Avatar3D";

// 🌟 1. 投影光束著色器 (調整後：光線提早消失)
const BeamShaderMaterial = {
  uniforms: {
    color: { value: new THREE.Color("#00ffff") },
    time: { value: 0 },
    opacity: { value: 0.6 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float time;
    uniform float opacity;
    varying vec2 vUv;

    void main() {
      // 🌟 修改重點：讓光線消失得更早
      // vUv.y = 0 (底部), vUv.y = 1 (頂部)
      // smoothstep(0.7, 0.0, vUv.y) 代表：
      // 在 0.0 (底部) 時不透明度最高
      // 超過 0.7 (約胸口高度) 就完全變透明
      float verticalFade = smoothstep(0.7, 0.0, vUv.y); 

      // 掃描動態紋路
      float scanline = sin(vUv.y * 30.0 - time * 3.0) * 0.1 + 0.9;
      
      vec3 finalColor = color * scanline;
      float finalAlpha = opacity * verticalFade;

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `
};

// 錯誤攔截
class StageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error) { console.error("3D Stage Error:", error); }
  render() {
    if (this.state.hasError) return <div className="text-red-500 text-xs p-4">⚠️ 3D Error</div>;
    return this.props.children;
  }
}

// 🌟 2. 投影機組件
function HologramProjector({ targetRef }) {
  const beamRef = useRef();
  const baseRef = useRef();
  const particlesRef = useRef();
  
  const beamMat = useMemo(() => new THREE.ShaderMaterial({
    ...BeamShaderMaterial,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), []);

  const particlesCount = 20;
  const particles = useMemo(() => {
    return new Array(particlesCount).fill().map(() => ({
      x: (Math.random() - 0.5) * 1.0,
      y: Math.random() * 2.0,
      z: (Math.random() - 0.5) * 1.0,
      speed: 0.01 + Math.random() * 0.02,
    }));
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (beamMat) beamMat.uniforms.time.value = t;

    // 自動調整光束寬度
    if (targetRef.current && beamRef.current) {
      const root = targetRef.current;
      if (root.children.length > 0) {
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        const radius = Math.max(size.x, size.z) * 0.75; 
        const height = size.y * 1.0; // 光束高度稍微調低一點

        const currentScale = beamRef.current.scale;
        beamRef.current.position.y = height / 2;
        beamRef.current.scale.x = THREE.MathUtils.lerp(currentScale.x, radius, 0.1);
        beamRef.current.scale.z = THREE.MathUtils.lerp(currentScale.z, radius, 0.1);
        beamRef.current.scale.y = THREE.MathUtils.lerp(currentScale.y, height, 0.1);
      }
    }

    if (baseRef.current) baseRef.current.rotation.z = t * 0.2;

    if (particlesRef.current) {
      particlesRef.current.children.forEach((p, i) => {
        const data = particles[i];
        p.position.y += data.speed;
        p.material.opacity = 1.0 - (p.position.y / 1.5); 
        if (p.position.y > 1.5) p.position.y = 0;
      });
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 投影光束 */}
      <mesh ref={beamRef} material={beamMat} position={[0, 1, 0]}>
        <cylinderGeometry args={[1, 0.12, 1, 32, 1, true]} />
      </mesh>

      {/* 投影底座 */}
      <group ref={baseRef} rotation={[-Math.PI/2, 0, 0]}>
         <mesh><circleGeometry args={[0.15, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.8} /></mesh>
         <mesh position={[0,0,-0.01]}><ringGeometry args={[0.2, 0.25, 32]} /><meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.6} /></mesh>
         <mesh position={[0,0,-0.02]} rotation={[0,0,1]}><ringGeometry args={[0.3, 0.35, 6, 2]} /><meshBasicMaterial color="#0088ff" side={THREE.DoubleSide} transparent opacity={0.4} /></mesh>
         <mesh position={[0,0,-0.05]}><ringGeometry args={[0.45, 0.46, 64]} /><meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.2} /></mesh>
      </group>

      {/* 粒子 */}
      <group ref={particlesRef}>
        {particles.map((p, i) => (
           <mesh key={i} position={[p.x, p.y, p.z]}>
             <sphereGeometry args={[0.015, 8, 8]} />
             <meshBasicMaterial color="#00ffff" transparent />
           </mesh>
        ))}
      </group>
    </group>
  );
}

// 運鏡邏輯
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
              <shadowMaterial opacity={0.5} color="#000000" />
            </mesh>
          </Suspense>
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
