// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useRef, useState, useMemo } from "react";
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

// 帥氣的投影機特效 (純視覺，不影響模型)
const BeamShaderMaterial = {
  uniforms: {
    color: { value: new THREE.Color("#00ffff") },
    time: { value: 0 },
    opacity: { value: 0.5 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform vec3 color; uniform float time; uniform float opacity; varying vec2 vUv;
    void main() {
      // 底部亮，上部淡出
      float verticalFade = smoothstep(0.8, 0.0, vUv.y); 
      // 掃描紋路 (裝飾用)
      float scanline = sin(vUv.y * 50.0 - time * 3.0) * 0.1 + 0.9;
      gl_FragColor = vec4(color * scanline, opacity * verticalFade);
    }
  `
};

function HologramProjector() {
  const beamRef = useRef();
  const ringRef = useRef();
  const particlesRef = useRef();
  
  const beamMat = useMemo(() => new THREE.ShaderMaterial({
    ...BeamShaderMaterial, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }), []);

  const particles = useMemo(() => new Array(20).fill().map(() => ({
    x: (Math.random() - 0.5) * 1.5, 
    y: Math.random() * 2.5, 
    z: (Math.random() - 0.5) * 1.5, 
    speed: 0.01 + Math.random() * 0.02
  })), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (beamMat) beamMat.uniforms.time.value = t;
    
    // 光環旋轉
    if (ringRef.current) ringRef.current.rotation.z = t * 0.1;

    // 粒子上升
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
    <group position={[0, 0, 0]}>
      {/* 投影光束 */}
      <mesh ref={beamRef} material={beamMat} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[1.0, 0.2, 2.4, 32, 1, true]} />
      </mesh>
      
      {/* 科技底座 */}
      <group ref={ringRef} rotation={[-Math.PI/2, 0, 0]}>
         <mesh><circleGeometry args={[0.2, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.9} /></mesh>
         <mesh position={[0,0,-0.01]}><ringGeometry args={[0.25, 0.5, 32]} /><meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.4} /></mesh>
         <mesh position={[0,0,-0.02]}><ringGeometry args={[0.6, 0.62, 64]} /><meshBasicMaterial color="#0088ff" side={THREE.DoubleSide} transparent opacity={0.6} /></mesh>
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

// 運鏡
function MarketFrame({ targetRef, triggerKey }) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  
  React.useEffect(() => { doneRef.current = false; }, [triggerKey]);

  useFrame(() => {
    if (doneRef.current || !targetRef.current) return;
    const root = targetRef.current;
    if (root.children.length === 0) return;

    // 平滑移動到位
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
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }} // ❌ 移除 localClippingEnabled，回復效能
        >
          <color attach="background" args={['#050510']} />
          <fog attach="fog" args={['#050510', 5, 15]} />
          
          <ambientLight intensity={0.8} color="#aaaaff" />
          <directionalLight position={[2, 5, 2]} intensity={2} color="#ffffff" castShadow />
          <spotLight position={[0, 5, 0]} intensity={3} color="#00ffff" distance={8} angle={0.6} penumbra={1} />

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
            
            {/* 地板陰影 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
              <planeGeometry args={[4, 4]} />
              <shadowMaterial opacity={0.5} color="#000000" />
            </mesh>
          </Suspense>
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
