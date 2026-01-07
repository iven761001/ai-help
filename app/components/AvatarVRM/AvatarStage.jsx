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

// 1. 投影光束 (背景裝飾)
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

function HologramProjector() {
  const beamRef = useRef();
  const baseRef = useRef();
  const beamMat = useMemo(() => new THREE.ShaderMaterial({
    ...BeamShaderMaterial, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (beamMat) beamMat.uniforms.time.value = t;
    if (beamRef.current) beamRef.current.scale.set(1 + Math.sin(t)*0.02, 1, 1 + Math.sin(t)*0.02);
    if (baseRef.current) baseRef.current.rotation.z = t * 0.15;
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={beamRef} material={beamMat} position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.8, 0.15, 1.2, 32, 1, true]} />
      </mesh>
      <group ref={baseRef} rotation={[-Math.PI/2, 0, 0]}>
         <mesh><circleGeometry args={[0.18, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.9} /></mesh>
         <mesh position={[0,0,-0.01]}><ringGeometry args={[0.22, 0.28, 32]} /><meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.7} /></mesh>
         <mesh position={[0,0,-0.02]} rotation={[0,0,1]}><ringGeometry args={[0.32, 0.45, 6, 2]} /><meshBasicMaterial color="#0088ff" side={THREE.DoubleSide} transparent opacity={0.5} /></mesh>
      </group>
    </group>
  );
}

// 2. 掃描光環 (現在直接由 Stage 控制，保證出現)
function ScannerRing({ scanYRef, visible }) {
  const groupRef = useRef();
  
  useFrame(() => {
    if (groupRef.current) {
        groupRef.current.position.y = scanYRef.current;
        groupRef.current.visible = visible;
        // 簡單旋轉
        groupRef.current.rotation.y += 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.45, 0.48, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={1} />
      </mesh>
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.4, 0.6, 32]} />
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// 3. 運鏡
function MarketFrame({ targetRef, triggerKey }) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  useEffect(() => { doneRef.current = false; }, [triggerKey]);
  useFrame(() => {
    if (doneRef.current || !targetRef.current) return;
    const root = targetRef.current;
    if (root.children.length === 0) return;
    
    // 簡單平滑運鏡
    camera.position.lerp(new THREE.Vector3(0, 1.2, 3.5), 0.1);
    camera.lookAt(0, 1.0, 0);
    if (Math.abs(camera.position.z - 3.5) < 0.1) doneRef.current = true;
  });
  return null;
}

// --- 主舞台 ---
export default function AvatarStage({ vrmId = "C1", emotion = "idle", unlocked = false }) {
  const modelRoot = useRef();
  const [readyKey, setReadyKey] = useState(0);

  // 🌟 A. 定義全域裁切平面 (Normal: 0, -1, 0 代表保留下方)
  // Constant 初始設為 0 (地板)，這樣一開始只顯示腳底以下 (也就是隱形)
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  
  // 🌟 B. 定義掃描高度的 Ref (不用 State，效能更好)
  const scanYRef = useRef(0);
  const targetScanY = 2.2;
  
  // 控制光環是否顯示
  const [showScanner, setShowScanner] = useState(true);

  // 🌟 C. 掃描動畫控制器 (放在這裡，保證光環一定會動)
  // 這裡我們只是一個 Wrapper，真正的 useFrame 需要在 Canvas 裡面
  // 所以我們把邏輯拆到下面的 SceneContent
  
  return (
    <div className="w-full h-full relative">
      <StageErrorBoundary key={vrmId}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0, 1.4, 4], fov: 35 }}
          // ⚠️ 關鍵：開啟裁切
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, localClippingEnabled: true }}
        >
          <SceneContent 
             vrmId={vrmId} 
             emotion={emotion} 
             unlocked={unlocked} 
             clippingPlane={clippingPlane}
             scanYRef={scanYRef}
             targetScanY={targetScanY}
             onReady={() => setReadyKey(k => k + 1)}
             readyKey={readyKey}
             modelRoot={modelRoot}
          />
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}

// 內部組件，方便使用 useFrame
function SceneContent({ vrmId, emotion, unlocked, clippingPlane, scanYRef, targetScanY, onReady, readyKey, modelRoot }) {
  const [showScanner, setShowScanner] = useState(true);

  // 重置掃描 (當 vrmId 改變時)
  useEffect(() => {
    scanYRef.current = 0;
    clippingPlane.constant = 0;
    setShowScanner(true);
  }, [vrmId, clippingPlane, scanYRef]);

  useFrame((state, delta) => {
    if (!unlocked) {
        // 1. 掃描動畫：讓數值往上升
        scanYRef.current = THREE.MathUtils.lerp(scanYRef.current, targetScanY + 0.1, delta * 0.8);
        
        // 2. 同步裁切平面：讓身體長出來
        clippingPlane.constant = scanYRef.current;

        // 3. 掃描結束隱藏光環
        if (scanYRef.current > 2.0 && showScanner) setShowScanner(false);
        if (scanYRef.current <= 2.0 && !showScanner) setShowScanner(true);

    } else {
        // 解鎖狀態
        clippingPlane.constant = 100.0; // 取消裁切
        if (showScanner) setShowScanner(false);
    }
  });

  return (
    <>
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 5, 15]} />
      <ambientLight intensity={0.7} color="#6666ff" />
      <directionalLight position={[2, 5, 2]} intensity={2.5} color="#ccffff" castShadow />
      
      <HologramProjector />

      {/* 掃描光環 (由 Stage 負責顯示) */}
      {!unlocked && <ScannerRing scanYRef={scanYRef} visible={showScanner} />}

      <Suspense fallback={null}>
        <group ref={modelRoot}>
          {/* 傳入 clippingPlane 和 scanYRef 給 Avatar 使用 */}
          <Avatar3D
            vrmId={vrmId}
            emotion={emotion}
            unlocked={unlocked}
            clippingPlane={clippingPlane}
            scanYRef={scanYRef}
            onReady={onReady}
          />
        </group>
        <MarketFrame targetRef={modelRoot} triggerKey={vrmId + readyKey} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <planeGeometry args={[4, 4]} />
          <shadowMaterial opacity={0.6} color="#000000" />
        </mesh>
      </Suspense>
    </>
  );
}
