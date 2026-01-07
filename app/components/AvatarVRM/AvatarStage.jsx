// components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei"; // 如果妳有裝 drei，可以用這個；沒有的話我下面用原生寫法
import Avatar3D from "./Avatar3D";

// 🌟 1. 定義「投影光束著色器」 (這是讓光線漸層透明的關鍵)
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
    varying vec3 vPosition;

    void main() {
      // 1. 垂直漸層：底部(y=0)亮，頂部(y=1)透明
      // 我們假設 UV.y 從 0 到 1
      float verticalFade = 1.0 - vUv.y;
      verticalFade = pow(verticalFade, 1.5); // 讓衰減更自然

      // 2. 掃描線條感：利用 sin 波產生橫向條紋，模擬光束波動
      float scanline = sin(vUv.y * 20.0 - time * 2.0) * 0.1 + 0.9;
      
      // 3. 邊緣亮光 (Fresnel-like)：讓圓錐邊緣比較亮，中間比較透
      // 這裡簡單用 xz 平面的距離來模擬
      // 這裡簡化處理，直接用純色混合
      
      vec3 finalColor = color * scanline;
      float finalAlpha = opacity * verticalFade;

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `
};

class StageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error) { console.error("3D Stage Error:", error); }
  render() {
    if (this.state.hasError) return <div className="text-red-500 text-xs p-4">⚠️ 3D Error</div>;
    return this.props.children;
  }
}

// 🌟 2. 動態投影機 (Projector)
function HologramProjector({ targetRef }) {
  const beamRef = useRef();
  const baseRef = useRef();
  const particlesRef = useRef();
  
  // 建立 Shader Material 實例
  const beamMat = useMemo(() => new THREE.ShaderMaterial({
    ...BeamShaderMaterial,
    transparent: true,
    depthWrite: false, // 關鍵：不寫入深度，解決透明遮擋問題
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, // 發光混合模式
  }), []);

  // 簡單粒子
  const particlesCount = 20;
  const particles = useMemo(() => {
    const temp = [];
    for(let i=0; i<particlesCount; i++) {
      temp.push({
        x: (Math.random() - 0.5) * 1.0,
        y: Math.random() * 2.0,
        z: (Math.random() - 0.5) * 1.0,
        speed: 0.01 + Math.random() * 0.02,
        offset: Math.random() * Math.PI
      })
    }
    return temp;
  }, []);

  // 動態調整光束大小 (適應模型)
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // A. 更新 Shader 時間 (讓光束波動)
    if (beamMat) {
      beamMat.uniforms.time.value = t;
    }

    // B. 自動調整光束寬度
    if (targetRef.current && beamRef.current) {
      const root = targetRef.current;
      if (root.children.length > 0) {
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        // 計算半徑：讓光束比人稍微寬一點
        const radius = Math.max(size.x, size.z) * 0.7; 
        const height = size.y * 1.1;

        // 平滑過渡
        const currentScale = beamRef.current.scale;
        beamRef.current.position.y = height / 2; // 圓錐中心點上移
        
        // X 和 Z 是寬度，Y 是高度
        // CylinderGeometry(top, bottom, height) -> top=1, bottom=1
        // 我們要上面寬(radius)，下面窄(0.2)
        // 這裡我們直接用 Geometry 的參數比較難動態改，所以我們用 Scale 改寬度
        // 但是圓錐比較特殊，我們用 Shader 或 Geometry 參數比較好。
        // 為了簡單，我們固定 Geometry 為圓錐，然後縮放整體
        
        // 這裡稍微取巧：保持 scale.y 為高度，scale.x/z 為頂部寬度
        // (假設 Geometry 是頂部半徑1，底部半徑0.2)
        beamRef.current.scale.x = THREE.MathUtils.lerp(currentScale.x, radius, 0.1);
        beamRef.current.scale.z = THREE.MathUtils.lerp(currentScale.z, radius, 0.1);
        beamRef.current.scale.y = THREE.MathUtils.lerp(currentScale.y, height, 0.1);
      }
    }

    // C. 底座旋轉
    if (baseRef.current) {
      baseRef.current.rotation.z = t * 0.2;
    }

    // D. 粒子動畫
    if (particlesRef.current) {
      particlesRef.current.children.forEach((p, i) => {
        const data = particles[i];
        p.position.y += data.speed;
        p.material.opacity = 1.0 - (p.position.y / 2.0); // 越高越透明
        
        if (p.position.y > 2.0) {
          p.position.y = 0;
        }
      });
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. 投影光束 (Volumetric Cone) */}
      {/* args: [topRadius, bottomRadius, height, radialSegments, heightSegments, openEnded] */}
      {/* 我們設定 top=1, bottom=0.15 (投影孔), height=1 (之後用 scale 拉長) */}
      <mesh ref={beamRef} material={beamMat} position={[0, 1, 0]}>
        <cylinderGeometry args={[1, 0.15, 1, 32, 1, true]} />
      </mesh>

      {/* 2. 投影機底座 (Base) - 參考照片 */}
      <group ref={baseRef} rotation={[-Math.PI/2, 0, 0]}>
         {/* 內發光核心 */}
         <mesh>
            <circleGeometry args={[0.15, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
         </mesh>
         {/* 第一圈光環 */}
         <mesh position={[0,0,-0.01]}>
            <ringGeometry args={[0.2, 0.25, 32]} />
            <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.6} />
         </mesh>
         {/* 第二圈機械環 (帶缺口) */}
         <mesh position={[0,0,-0.02]} rotation={[0,0,1]}>
            <ringGeometry args={[0.3, 0.35, 6, 2]} /> {/* thetaLength 做出缺口 */}
            <meshBasicMaterial color="#0088ff" side={THREE.DoubleSide} transparent opacity={0.4} />
         </mesh>
         {/* 外圈大光盤 */}
         <mesh position={[0,0,-0.05]}>
            <ringGeometry args={[0.45, 0.46, 64]} />
            <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.2} />
         </mesh>
      </group>

      {/* 3. 上升粒子 (Particles) */}
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
    // 調整相機距離
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
          {/* 背景色：深藍黑 */}
          <color attach="background" args={['#050510']} />
          <fog attach="fog" args={['#050510', 5, 15]} />

          <ambientLight intensity={0.6} color="#4444ff" />
          <directionalLight position={[2, 5, 2]} intensity={2} color="#ccffff" castShadow />
          <spotLight position={[0, 5, 0]} intensity={3} color="#00ffff" distance={8} angle={0.5} penumbra={1} />

          {/* 🌟 呼叫新的投影機 */}
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
            
            {/* 地板陰影 */}
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
