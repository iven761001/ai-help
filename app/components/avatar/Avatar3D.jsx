"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { getProfile } from "../../lib/elementProfiles";

function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${a})`;
}

// 電路貼圖（chip/lattice/prism/liquid/haze 目前都先用不同 seed / 亮度做區分，後續再升級 shader）
function makeCircuitTexture({ size = 512, seed = 1, glow = "#65d9ff", density = 1.0 }) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  ctx.clearRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const drawPath = (x0, y0) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    let x = x0;
    let y = y0;

    const steps = Math.floor((8 + rand() * 12) * density);
    for (let k = 0; k < steps; k++) {
      const dir = Math.floor(rand() * 4);
      const len = (18 + rand() * 90) * (0.8 + 0.4 * density);

      if (dir === 0) x += len;
      if (dir === 1) x -= len;
      if (dir === 2) y += len;
      if (dir === 3) y -= len;

      x = Math.max(10, Math.min(size - 10, x));
      y = Math.max(10, Math.min(size - 10, y));
      ctx.lineTo(x, y);

      if (rand() < 0.55) {
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2.0 + rand() * 3.0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  };

  const lines = Math.floor(40 * density);
  for (let i = 0; i < lines; i++) {
    const x0 = rand() * size;
    const y0 = rand() * size;
    ctx.lineWidth = 1.2 + rand() * 2.4;
    const a = 0.45 + rand() * 0.35;
    ctx.strokeStyle = hexToRgba(glow, a);
    drawPath(x0, y0);
  }

  return canvas;
}

function TechBear({
  variant,
  emotion = "idle",
  previewYaw = 0
}) {
  const groupRef = useRef();
  const emotionRef = useRef(emotion);
  const yawRef = useRef(previewYaw);
  const texRef = useRef(null);

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { yawRef.current = previewYaw; }, [previewYaw]);

  const profile = useMemo(() => getProfile(variant), [variant]);
  const glassColor = profile.glassColor;
  const glowColor = profile.glowColor;

  const circuitCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const baseSeed =
      profile.id === "carbon" ? 19 :
      profile.id === "silicon" ? 7 :
      profile.id === "germanium" ? 13 :
      profile.id === "tin" ? 23 :
      profile.id === "lead" ? 29 : 3;

    const density =
      profile.style === "chip" ? 1.15 :
      profile.style === "lattice" ? 0.9 :
      profile.style === "prism" ? 1.0 :
      profile.style === "liquid" ? 1.05 :
      profile.style === "haze" ? 0.75 : 1.0;

    return makeCircuitTexture({ seed: baseSeed, glow: glowColor, density });
  }, [glowColor, profile]);

  useEffect(() => {
    if (!circuitCanvas) return;
    let disposed = false;

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const tex = new THREE.CanvasTexture(circuitCanvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1.25, 1.25);
      tex.needsUpdate = true;
      tex.premultiplyAlpha = true;

      texRef.current = { THREE, tex, lineOpacity: 0.55 };
    })();

    return () => { disposed = true; };
  }, [circuitCanvas]);

  const glassMaterialProps = useMemo(() => {
    const m = profile.material || {};
    return {
      color: glassColor,
      roughness: m.roughness ?? 0.08,
      metalness: 0.0,
      transmission: m.transmission ?? 0.92,
      thickness: 1.7,
      ior: m.ior ?? 1.48,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12
    };
  }, [glassColor, profile]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const t = clock.getElapsedTime();
    const emo = emotionRef.current;

    // 旋轉預覽（手指拖）
    groupRef.current.rotation.y = yawRef.current || 0;

    // 情緒 → 動作倍率（不破壞元素的 base motion）
    const base = profile.motion || { bob: 0.05, wobble: 0.06, pulse: 0.02, speed: 1.3 };
    let bobAmp = base.bob;
    let wobble = base.wobble;
    let pulse = base.pulse;
    let speed = base.speed;

    if (emo === "happy") {
      bobAmp *= 1.8;
      wobble *= 2.2;
      pulse *= 2.2;
      speed *= 1.6;
      if (texRef.current) texRef.current.lineOpacity = 0.82;
    } else if (emo === "thinking") {
      bobAmp *= 1.2;
      wobble *= 1.4;
      pulse *= 1.2;
      speed *= 1.2;
      if (texRef.current) texRef.current.lineOpacity = 0.68;
    } else if (emo === "sorry") {
      bobAmp *= 0.7;
      wobble *= 0.7;
      pulse *= 0.6;
      speed *= 0.85;
      if (texRef.current) texRef.current.lineOpacity = 0.38;
    } else {
      if (texRef.current) texRef.current.lineOpacity = 0.55;
    }

    groupRef.current.position.y = Math.sin(t * speed) * bobAmp;
    groupRef.current.rotation.z = Math.sin(t * speed) * wobble * 0.16;
    groupRef.current.rotation.x = Math.sin(t * speed * 0.85) * wobble * 0.12;

    const s = 1 + Math.sin(t * (speed + 0.7)) * pulse;
    groupRef.current.scale.set(s, 1 - pulse * 0.35 + Math.cos(t * speed) * pulse * 0.25, s);

    if (texRef.current?.tex) {
      texRef.current.tex.offset.x = (t * 0.045) % 1;
      texRef.current.tex.offset.y = (t * 0.03) % 1;
    }
  });

  const CircuitSurface = ({ geo, pos, rot }) => {
    const [ready, setReady] = useState(false);
    useEffect(() => { if (texRef.current?.tex) setReady(true); }, [circuitCanvas]);
    if (!ready) return null;

    const { THREE, tex } = texRef.current;

    return (
      <mesh position={pos} rotation={rot}>
        {geo}
        <meshBasicMaterial
          map={tex}
          color={glowColor}
          transparent
          opacity={texRef.current?.lineOpacity ?? 0.55}
          blending={THREE.NormalBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    );
  };

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh position={[0, -0.15, 0]}>
        <capsuleGeometry args={[0.5, 0.65, 10, 18]} />
        <meshPhysicalMaterial {...glassMaterialProps} />
      </mesh>

      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.42, 28, 28]} />
        <meshPhysicalMaterial {...glassMaterialProps} />
      </mesh>

      <mesh position={[-0.32, 0.88, 0]}>
        <sphereGeometry args={[0.18, 22, 22]} />
        <meshPhysicalMaterial {...glassMaterialProps} />
      </mesh>
      <mesh position={[0.32, 0.88, 0]}>
        <sphereGeometry args={[0.18, 22, 22]} />
        <meshPhysicalMaterial {...glassMaterialProps} />
      </mesh>

      <mesh position={[-0.6, 0.12, 0]} rotation={[0, 0, 0.35]}>
        <capsuleGeometry args={[0.17, 0.35, 8, 16]} />
        <meshPhysicalMaterial {...glassMaterialProps} />
      </mesh>
      <mesh position={[0.6, 0.12, 0]} rotation={[0, 0, -0.35]}>
        <capsuleGeometry args={[0.17, 0.35, 8, 16]} />
        <meshPhysicalMaterial {...glassMaterialProps} />
      </mesh>

      <mesh position={[-0.25, -0.72, 0]} rotation={[0, 0, 0.08]}>
        <capsuleGeometry args={[0.2, 0.35, 8, 16]} />
        <meshPhysicalMaterial {...glassMaterialProps} />
      </mesh>
      <mesh position={[0.25, -0.72, 0]} rotation={[0, 0, -0.08]}>
        <capsuleGeometry args={[0.2, 0.35, 8, 16]} />
        <meshPhysicalMaterial {...glassMaterialProps} />
      </mesh>

      <CircuitSurface pos={[0, -0.15, 0]} rot={[0, 0, 0]} geo={<capsuleGeometry args={[0.505, 0.655, 10, 18]} />} />
      <CircuitSurface pos={[0, 0.55, 0]} rot={[0, 0, 0]} geo={<sphereGeometry args={[0.425, 28, 28]} />} />
      <CircuitSurface pos={[-0.32, 0.88, 0]} rot={[0, 0, 0]} geo={<sphereGeometry args={[0.185, 22, 22]} />} />
      <CircuitSurface pos={[0.32, 0.88, 0]} rot={[0, 0, 0]} geo={<sphereGeometry args={[0.185, 22, 22]} />} />
      <CircuitSurface pos={[-0.6, 0.12, 0]} rot={[0, 0, 0.35]} geo={<capsuleGeometry args={[0.175, 0.355, 8, 16]} />} />
      <CircuitSurface pos={[0.6, 0.12, 0]} rot={[0, 0, -0.35]} geo={<capsuleGeometry args={[0.175, 0.355, 8, 16]} />} />
      <CircuitSurface pos={[-0.25, -0.72, 0]} rot={[0, 0, 0.08]} geo={<capsuleGeometry args={[0.205, 0.355, 8, 16]} />} />
      <CircuitSurface pos={[0.25, -0.72, 0]} rot={[0, 0, -0.08]} geo={<capsuleGeometry args={[0.205, 0.355, 8, 16]} />} />
    </group>
  );
}

function Scene({ variant, emotion, previewYaw }) {
  return (
    <Canvas
      camera={{ position: [0, 0.25, 3.2], fov: 45 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 6]} intensity={1.25} />
      <pointLight position={[-6, 2, 8]} intensity={0.9} />
      <pointLight position={[0, -2, 3]} intensity={0.35} />
      <TechBear variant={variant} emotion={emotion} previewYaw={previewYaw} />
    </Canvas>
  );
}

export default function Avatar3D({ variant = "sky", emotion = "idle", previewYaw = 0 }) {
  return (
    <div className="w-full h-full">
      <Scene variant={variant} emotion={emotion} previewYaw={previewYaw} />
    </div>
  );
}
