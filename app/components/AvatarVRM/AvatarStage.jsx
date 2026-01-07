// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useRef, useState, useMemo } from "react";
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

// 投影光束
const BeamShaderMaterial = {
  uniforms: {
    color: { value: new THREE.Color("#00ffff") },
    time: { value: 0 },
    opacity: { value: 0.6 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform vec3 color; uniform float time; uniform float opacity; varying vec2 vUv;
    void main() {
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
  const beamMat = useMemo(() => new THREE.ShaderMaterial({
    ...BeamShaderMaterial, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (beamMat) beamMat.uniforms.time.value = t;
    if (targetRef.current && beamRef.current) {
      // 簡單的呼吸縮放
      beamRef.current.scale.set(1 + Math.sin(t)*0.05, 1.2, 1 + Math.sin(t)*0.05); 
    }
    if (baseRef.current) baseRef.current.rotation.z = t * 0.15;
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={beamRef} material={beamMat} position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.8, 0.15, 1.2, 32, 1, true]} />
      </mesh>
      <group ref={baseRef} rotation={[-Math.PI/2, 0, 0]}>
         <mesh><circleGeometry args={[0.18, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.9} /></mesh>
         <mesh position={[0,0,-0.01]}><ringGeometry args={[0.22, 0.4, 32]} /><meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.5} /></mesh>
      </group>
    </group>
  );
}

function MarketFrame({ targetRef, triggerKey }) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  // 每次 triggerKey 變更 (例如模型換人)，重置運鏡
  useEffect(() => { doneRef.current = false; }, [triggerKey]);

  useFrame(() => {
    if (doneRef.current || !targetRef.current) return;
    const root = targetRef.current;
    // 簡單判斷：有子物件代表模型載入了
    if (root.children.length === 0) return;

    // 直接設定到一個漂亮的角度 (不用算太複雜，避免出錯)
    camera.position.lerp(new THREE.Vector3(0, 1.2, 3.0), 0.1);
    camera.lookAt(0, 1.0, 0);
    
    // 如果位置差不多了就停
    if (Math.abs(camera.position.z - 3.0) < 0.1) doneRef.current = true;
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
          // ⚠️⚠️⚠️ 關鍵：必須開啟裁切 ⚠️⚠️⚠️
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, localClippingEnabled: true }}
        >
          <color attach="background" args={['#050510']} />
          <fog attach="fog" args={['#050510', 5, 15]} />
          <ambientLight intensity={0.7} color="#6666ff" />
          <directionalLight position={[2, 5, 2]} intensity={2.5} color="#ccffff" castShadow />
          
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
