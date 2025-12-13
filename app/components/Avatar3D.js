"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

/** 生成「電路紋」貼圖：用 Canvas 畫線，不用任何外部圖片 */
function makeCircuitTexture({
  size = 512,
  seed = 1,
  glow = "#65d9ff",
  bg = "rgba(0,0,0,0)"
}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // 簡易 deterministic random
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // 背景淡淡的雜訊點
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 1800; i++) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    const a = 0.2 + rand() * 0.6;
    ctx.fillStyle = `rgba(120,220,255,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // 主電路線條
  const lines = 55;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2;
  ctx.strokeStyle = glow;

  const drawPath = (x0, y0) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    let x = x0;
    let y = y0;

    const steps = 10 + Math.floor(rand() * 14);
    for (let k = 0; k < steps; k++) {
      const dir = Math.floor(rand() * 4);
      const len = 18 + Math.floor(rand() * 75);
      if (dir === 0) x += len;
      if (dir === 1) x -= len;
      if (dir === 2) y += len;
      if (dir === 3) y -= len;

      x = Math.max(8, Math.min(size - 8, x));
      y = Math.max(8, Math.min(size - 8, y));
      ctx.lineTo(x, y);

      // 節點圓點
      if (rand() < 0.55) {
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 3 + rand() * 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(170,245,255,0.9)";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  };

  for (let i = 0; i < lines; i++) {
    const x0 = rand() * size;
    const y0 = rand() * size;
    ctx.lineWidth = 1.2 + rand() * 2.2;
    drawPath(x0, y0);
  }

  // 柔和外光（模擬 bloom 的一點點效果）
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 35; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 30 + rand() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(120,230,255,0.55)");
    g.addColorStop(1, "rgba(120,230,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/** 科技玻璃小熊（幾何拼裝 + 玻璃材質 + 內部電路貼圖） */
function TechGlassBear({ color, emotion }) {
  const groupRef = useRef();
  const matRef = useRef();
  const circuitRef = useRef();
  const emotionRef = useRef(emotion);

  useEffect(() => {
    emotionRef.current = emotion;
  }, [emotion]);

  // 生成電路貼圖（每個 variant 給不同 seed）
  const circuitCanvas = useMemo(() => {
    // 這裡用顏色不同→ seed 不同
    const seed = color === "#33e3a0" ? 7 : color === "#b26bff" ? 13 : 3;
    if (typeof document === "undefined") return null;
    return makeCircuitTexture({ seed, glow: "#78e7ff" });
  }, [color]);

  // 建立 Three texture（延後到有 document 才做）
  useEffect(() => {
    if (!circuitCanvas) return;
    // 動態 import，避免 SSR
    let disposed = false;
    (async () => {
      const THREE = await import("three");
      if (disposed) return;
      const tex = new THREE.CanvasTexture(circuitCanvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1.2, 1.2);
      tex.needsUpdate = true;
      circuitRef.current = { THREE, tex };
    })();
    return () => {
      disposed = true;
      // 交給 GC，或你也可以在這裡 dispose
    };
  }, [circuitCanvas]);

  // 玻璃材質（外層）
  const glassMaterialProps = useMemo(
    () => ({
      color,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 0.92,
      thickness: 1.5,
      ior: 1.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12
    }),
    [color]
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const emo = emotionRef.current;

    // 情緒→動作/亮度
    let bobAmp = 0.02;
    let bobSpeed = 1.0;
    let wobble = 0.03;
    let glow = 0.55; // 電路亮度
    let pulse = 0.015;

    if (emo === "happy") {
      bobAmp = 0.10;
      bobSpeed = 2.6;
      wobble = 0.12;
      glow = 1.15;
      pulse = 0.06;
    } else if (emo === "thinking") {
      bobAmp = 0.05;
      bobSpeed = 1.6;
      wobble = 0.06;
      glow = 0.85;
      pulse = 0.02;
    } else if (emo === "sorry") {
      bobAmp = 0.015;
      bobSpeed = 0.85;
      wobble = 0.03;
      glow = 0.35;
      pulse = 0.01;
    } else {
      // idle
      bobAmp = 0.02;
      bobSpeed = 1.0;
      wobble = 0.04;
      glow = 0.55;
      pulse = 0.015;
    }

    // 上下飄 + 果凍晃
    groupRef.current.position.y = Math.sin(t * bobSpeed) * bobAmp;
    groupRef.current.rotation.z = Math.sin(t * bobSpeed) * wobble * 0.18;
    groupRef.current.rotation.x = Math.sin(t * bobSpeed * 0.85) * wobble * 0.12;
    groupRef.current.rotation.y = Math.cos(t * bobSpeed * 0.8) * wobble * 0.10;

    // 呼吸縮放
    const s = 1 + Math.sin(t * (bobSpeed + 0.7)) * pulse;
    groupRef.current.scale.set(s, 1 - pulse * 0.4 + Math.cos(t * bobSpeed) * pulse * 0.25, s);

    // 電路貼圖：讓它「流動」＆亮度隨情緒變
    if (circuitRef.current?.tex) {
      circuitRef.current.tex.offset.x = (t * 0.02) % 1;
      circuitRef.current.tex.offset.y = (t * 0.015) % 1;
    }

    // 把 glow 帶到 emissive 強度（材質 ref）
    if (matRef.current) {
      matRef.current.emissiveIntensity = glow + Math.sin(t * (bobSpeed + 1.2)) * 0.12;
    }
  });

  // 內部「電路發光層」材質（用 emissiveMap 模擬）
  const InnerCircuit = ({ scale = 0.92 }) => {
    const [ready, setReady] = useState(false);
    useEffect(() => {
      if (circuitRef.current?.tex) setReady(true);
    }, [circuitCanvas]);

    // 內層：稍微縮小一點，讓它像在玻璃裡面
    if (!ready) return null;

    const THREE = circuitRef.current.THREE;
    const tex = circuitRef.current.tex;

    return (
      <group scale={[scale, scale, scale]}>
        <mesh position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.5, 0.65, 10, 18]} />
          <meshStandardMaterial
            color={"#0b1b2a"}
            emissive={new THREE.Color("#7fefff")}
            emissiveMap={tex}
            emissiveIntensity={0.7}
            transparent
            opacity={0.35}
          />
        </mesh>

        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.42, 28, 28]} />
          <meshStandardMaterial
            color={"#0b1b2a"}
            emissive={new THREE.Color("#7fefff")}
            emissiveMap={tex}
            emissiveIntensity={0.7}
            transparent
            opacity={0.32}
          />
        </mesh>

        {/* 四肢也給點紋路，但更淡 */}
        <mesh position={[-0.6, 0.12, 0]} rotation={[0, 0, 0.35]}>
          <capsuleGeometry args={[0.17, 0.35, 8, 16]} />
          <meshStandardMaterial
            color={"#0b1b2a"}
            emissive={new THREE.Color("#7fefff")}
            emissiveMap={tex}
            emissiveIntensity={0.55}
            transparent
            opacity={0.28}
          />
        </mesh>
        <mesh position={[0.6, 0.12, 0]} rotation={[0, 0, -0.35]}>
          <capsuleGeometry args={[0.17, 0.35, 8, 16]} />
          <meshStandardMaterial
            color={"#0b1b2a"}
            emissive={new THREE.Color("#7fefff")}
            emissiveMap={tex}
            emissiveIntensity={0.55}
            transparent
            opacity={0.28}
          />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 內部電路層 */}
      <InnerCircuit />

      {/* 外層玻璃小熊（主要形體） */}
      <mesh position={[0, -0.15, 0]}>
        <capsuleGeometry args={[0.5, 0.65, 10, 18]} />
        <meshPhysicalMaterial ref={matRef} {...glassMaterialProps} />
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

      {/* 小小高光點，讓它更「科技玻璃」 */}
      <mesh position={[0.02, -0.05, 0.33]} rotation={[0, 0, 0.1]}>
        <sphereGeometry args={[0.22, 18, 18]} />
        <meshPhysicalMaterial
          color={"#ffffff"}
          roughness={0.05}
          metalness={0}
          transmission={0.95}
          thickness={0.2}
          ior={1.5}
          opacity={0.25}
          transparent
        />
      </mesh>
    </group>
  );
}

function Scene({ color, emotion }) {
  return (
    <Canvas
      camera={{ position: [0, 0.25, 3.2], fov: 45 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      {/* 冷色科技打光（接近你那張圖） */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 6]} intensity={1.25} />
      <pointLight position={[-6, 2, 8]} intensity={0.9} />
      <pointLight position={[0, -2, 3]} intensity={0.35} />

      <TechGlassBear color={color} emotion={emotion} />

      <OrbitControls enableZoom={false} />
    </Canvas>
  );
}

/**
 * mode="inline"   : 創角畫面用，嵌在排版裡
 * mode="floating" : 聊天畫面用，浮在整個螢幕上，可拖拉
 */
export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  mode = "inline"
}) {
  // 三種款式＝三種色系（跟你原本一致）
  const colorMap = {
    sky: "#35b7ff", // 天空藍
    mint: "#33e3a0", // 薄荷綠
    purple: "#b26bff" // 紫色
  };
  const color = colorMap[variant] || colorMap.sky;

  // 創角階段：嵌在卡片
  if (mode === "inline") {
    return (
      <div className="w-full h-full">
        <Scene color={color} emotion={emotion} />
      </div>
    );
  }

  // 聊天階段：浮動 + 可拖拉（Portal 到 body）
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ x: 16, y: 120 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("floating-techbear-pos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPos(parsed);
          return;
        }
      } catch {}
    }
    const h = window.innerHeight || 800;
    setPos({ x: 16, y: h - 240 });
  }, []);

  useEffect(() => {
    if (!dragging) return;

    function handleMove(e) {
      if (e.cancelable) e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const width = window.innerWidth || 400;
      const height = window.innerHeight || 800;

      const boxW = 170;
      const boxH = 220;

      let x = clientX - boxW / 2;
      let y = clientY - boxH / 2;

      const maxX = width - boxW;
      const maxY = height - boxH;
      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x > maxX) x = maxX;
      if (y > maxY) y = maxY;

      setPos({ x, y });
    }

    function handleUp() {
      setDragging(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("floating-techbear-pos", JSON.stringify(pos));
      }
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    window.addEventListener("touchcancel", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
      window.removeEventListener("touchcancel", handleUp);
    };
  }, [dragging, pos]);

  const handleDown = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  if (!mounted) return null;

  const node = (
    <div
      onMouseDown={handleDown}
      onTouchStart={handleDown}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 170,
        height: 220,
        zIndex: 9999,
        cursor: "grab",
        touchAction: "none",
        pointerEvents: "auto"
      }}
    >
      <Scene color={color} emotion={emotion} />
    </div>
  );

  return createPortal(node, document.body);
}
