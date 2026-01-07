// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useRef, useMemo } from "react";
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

// 投影光束 (純視覺裝飾)
const BeamShaderMaterial = {
  uniforms: {
    color: { value: new THREE.Color("#00ffff") },
    time: { value: 0 },
    opacity: { value: 0.4 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform vec3 color; uniform float time; uniform float opacity; varying vec2 vUv;
    void main() {
      // 底部亮，頂部透明
      float verticalFade = smoothstep(0.8, 0.0, vUv.y); 
      // 底部聚光感
      float bottomGlow = smoothstep(0.2, 0.0, vUv.y) * 0.5;
      // 動態掃描紋路
      float scanline = sin(vUv.y * 30.0 - time * 3.0) * 0.05 + 0.95;
      
      gl_FragColor = vec4(color * scanline + vec3(bottomGlow), opacity * verticalFade);
    }
  `
};

function HologramProjector() {
  const beamRef = useRef();
  const baseRef = useRef();
  
  const beamMat = useMemo(() => new THREE.ShaderMaterial({
    ...BeamShaderMaterial, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (beamMat) beamMat.uniforms.time.value = t;
    
    // 底座旋轉
    if (baseRef.current) baseRef.current.rotation.z = t * 0.1;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 投影光束 */}
      <mesh ref={beamRef} material={beamMat} position={[0, 1, 0]}>
        <cylinderGeometry args={[0.9, 0.15, 2, 32, 1, true]} />
      </mesh>
      
      {/* 科技底座 */}
      <group ref={baseRef} rotation={[-Math.PI/2, 0, 0]}>
         <mesh><circleGeometry args={[0.18, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.9} /></mesh>
         <mesh position={[0,0,-0.01]}><ringGeometry args={[0.22, 0.4, 32]} /><meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.6} /></mesh>
         <mesh position={[0,0,-0.02]}><ringGeometry args={[0.45, 0.48, 64]} /><meshBasicMaterial color="#0088ff" side={THREE.DoubleSide} transparent opacity={0.3} /></mesh>
      </group>
    </group>
  );
}

// 運鏡邏輯
function MarketFrame({ targetRef, triggerKey }) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  
  React.useEffect(() => { doneRef.current = false; }, [triggerKey]);

  useFrame(() => {
    if (doneRef.current || !targetRef.current) return;
    const root = targetRef.current;
    if (root.children.length === 0) return;

    // 平滑運鏡到全身視角
    camera.position.lerp(new THREE.Vector3(0, 1.2, 3.5), 0.1);
    camera.lookAt(0, 1.0, 0);
    
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
          // ⚠️ 取消 localClippingEnabled，讓渲染更單純穩定
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        >
          <color attach="background" args={['#050510']} />
          <fog attach="fog" args={['#050510', 5, 15]} />

          <ambientLight intensity={0.8} color="#6666ff" />
          <directionalLight position={[2, 5, 2]} intensity={2.5} color="#ccffff" castShadow />
          <spotLight position={[0, 5, 0]} intensity={4} color="#00ffff" distance={8} angle={0.6} penumbra={1} />

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
            
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
              <planeGeometry args={[4, 4]} />
              <shadowMaterial opacity={0.6} color="#000000" />
            </mesh>
          </Suspense>
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
