"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

/** 生成「透明底」的電路貼圖：只有線條有顏色，背景完全透明 */
function makeCircuitTexture({ size = 512, seed = 1, glow = "#65d9ff" }) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // deterministic random
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  // 透明底（關鍵）
  ctx.clearRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";

  // 線條：用 rgba 直接控制 alpha（不要噪點、不要光暈，避免白化）
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const drawPath = (x0, y0) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    let x = x0;
    let y = y0;

    const steps = 9 + Math.floor(rand() * 10);
    for (let k = 0; k < steps; k++) {
      const dir = Math.floor(rand() * 4);
      const len = 20 + Math.floor(rand() * 85);

      if (dir === 0) x += len;
      if (dir === 1) x -= len;
      if (dir === 2) y += len;
      if (dir === 3) y -= len;

      x = Math.max(10, Math.min(size - 10, x));
      y = Math.max(10, Math.min(size - 10, y));
      ctx.lineTo(x, y);

      // 節點點點
      if (rand() < 0.55) {
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2.2 + rand() * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  };

  const lines = 45;
  for (let i = 0; i < lines; i++) {
    const x0 = rand() * size;
    const y0 = rand() * size;

    const w = 1.4 + rand() * 2.6;
    ctx.lineWidth = w;

    // 線條顏色（帶 alpha）
    // 讓它像「冷光線」：主線不透明、偶爾來一條淡的
    const a = 0.55 + rand() * 0.35;
    ctx.strokeStyle = hexToRgba(glow, a);

    drawPath(x0, y0);
  }

  // 小量的「短線」讓它更像電路
  for (let i = 0; i < 120; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 8 + rand() * 28;
    const horizontal = rand() > 0.5;
    ctx.lineWidth = 1 + rand() * 1.6;
    ctx.strokeStyle = hexToRgba(glow, 0.35 + rand() * 0.35);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(horizontal ? x + len : x, horizontal ? y : y + len);
    ctx.stroke();
  }

  return canvas;
}

function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${a})`;
}

/** 科技玻璃小熊：外層玻璃 + 表面電路線條（流動） */
function TechGlassBear({ glassColor, glowColor, emotion }) {
  const groupRef = useRef();
  const emotionRef = useRef(emotion);
  const texRef = useRef(null);

  useEffect(() => {
    emotionRef.current = emotion;
  }, [emotion]);

  const circuitCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const seed =
      glowColor === "#4fffd2" ? 7 : glowColor === "#b26bff" ? 13 : 3;
    return makeCircuitTexture({ seed, glow: glowColor });
  }, [glowColor]);

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

      // 透明貼圖更穩（避免某些裝置 alpha 發灰）
      tex.premultiplyAlpha = true;

      texRef.current = { THREE, tex };
    })();

    return () => {
      disposed = true;
    };
  }, [circuitCanvas]);

  const glassMaterialProps = useMemo(
    () => ({
      color: glassColor,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 0.92,
      thickness: 1.7,
      ior: 1.48,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12
    }),
    [glassColor]
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const emo = emotionRef.current;

    let bobAmp = 0.02;
    let bobSpeed = 1.0;
    let wobble = 0.04;
    let pulse = 0.015;

    // 線條亮度（用 opacity 控）
    let lineOpacity = 0.55;

    if (emo === "happy") {
      bobAmp = 0.1;
      bobSpeed = 2.6;
      wobble = 0.14;
      pulse = 0.06;
      lineOpacity = 0.82;
    } else if (emo === "thinking") {
      bobAmp = 0.05;
      bobSpeed = 1.6;
      wobble = 0.07;
      pulse = 0.02;
      lineOpacity = 0.68;
    } else if (emo === "sorry") {
      bobAmp = 0.012;
      bobSpeed = 0.85;
      wobble = 0.035;
      pulse = 0.01;
      lineOpacity = 0.38;
    }

    groupRef.current.position.y = Math.sin(t * bobSpeed) * bobAmp;
    groupRef.current.rotation.z = Math.sin(t * bobSpeed) * wobble * 0.16;
    groupRef.current.rotation.x = Math.sin(t * bobSpeed * 0.85) * wobble * 0.12;
    groupRef.current.rotation.y = Math.cos(t * bobSpeed * 0.8) * wobble * 0.11;

    const s = 1 + Math.sin(t * (bobSpeed + 0.7)) * pulse;
    groupRef.current.scale.set(
      s,
      1 - pulse * 0.35 + Math.cos(t * bobSpeed) * pulse * 0.25,
      s
    );

    // 貼圖流動（你要的「表面流動感」在這）
    if (texRef.current?.tex) {
      texRef.current.tex.offset.x = (t * 0.045) % 1;
      texRef.current.tex.offset.y = (t * 0.03) % 1;
      texRef.current.lineOpacity = lineOpacity;
    }
  });

  const CircuitSurface = ({ geo, pos, rot }) => {
    const [ready, setReady] = useState(false);
    useEffect(() => {
      if (texRef.current?.tex) setReady(true);
    }, [circuitCanvas]);

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
          blending={THREE.NormalBlending}   // ✅ 不用 Additive，避免整隻白
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    );
  };

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 外層玻璃（可透） */}
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

      {/* ✅ 表面電路線條（覆蓋在外層表面上） */}
      <CircuitSurface
        pos={[0, -0.15, 0]}
        rot={[0, 0, 0]}
        geo={<capsuleGeometry args={[0.505, 0.655, 10, 18]} />}
      />
      <CircuitSurface
        pos={[0, 0.55, 0]}
        rot={[0, 0, 0]}
        geo={<sphereGeometry args={[0.425, 28, 28]} />}
      />
      <CircuitSurface
        pos={[-0.32, 0.88, 0]}
        rot={[0, 0, 0]}
        geo={<sphereGeometry args={[0.185, 22, 22]} />}
      />
      <CircuitSurface
        pos={[0.32, 0.88, 0]}
        rot={[0, 0, 0]}
        geo={<sphereGeometry args={[0.185, 22, 22]} />}
      />
      <CircuitSurface
        pos={[-0.6, 0.12, 0]}
        rot={[0, 0, 0.35]}
        geo={<capsuleGeometry args={[0.175, 0.355, 8, 16]} />}
      />
      <CircuitSurface
        pos={[0.6, 0.12, 0]}
        rot={[0, 0, -0.35]}
        geo={<capsuleGeometry args={[0.175, 0.355, 8, 16]} />}
      />
      <CircuitSurface
        pos={[-0.25, -0.72, 0]}
        rot={[0, 0, 0.08]}
        geo={<capsuleGeometry args={[0.205, 0.355, 8, 16]} />}
      />
      <CircuitSurface
        pos={[0.25, -0.72, 0]}
        rot={[0, 0, -0.08]}
        geo={<capsuleGeometry args={[0.205, 0.355, 8, 16]} />}
      />

      {/* 小高光 */}
      <mesh position={[0.02, -0.05, 0.33]} rotation={[0, 0, 0.1]}>
        <sphereGeometry args={[0.22, 18, 18]} />
        <meshPhysicalMaterial
          color={"#ffffff"}
          roughness={0.05}
          metalness={0}
          transmission={0.96}
          thickness={0.2}
          ior={1.5}
          opacity={0.18}
          transparent
        />
      </mesh>
    </group>
  );
}

function Scene({ glassColor, glowColor, emotion }) {
  return (
    <Canvas
      camera={{ position: [0, 0.25, 3.2], fov: 45 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 6]} intensity={1.25} />
      <pointLight position={[-6, 2, 8]} intensity={0.9} />
      <pointLight position={[0, -2, 3]} intensity={0.35} />

      <TechGlassBear glassColor={glassColor} glowColor={glowColor} emotion={emotion} />

      <OrbitControls enableZoom={false} />
    </Canvas>
  );
}

/**
 * mode="inline"   : 創角畫面用（嵌在卡片）
 * mode="floating" : 聊天畫面用（浮在螢幕上，可拖拉）
 */
export default function Avatar3D({ variant = "sky", emotion = "idle", mode = "inline" }) {
  // 外層玻璃顏色：不要太白，保留「糖」的顏色感
  const glassMap = {
    sky: "#7fdcff",
    mint: "#6fffd6",
    purple: "#d3a8ff"
  };

  // 電路冷光：沿用你原本三色概念（線條顏色會跟著變）
  const glowMap = {
    sky: "#65d9ff",
    mint: "#4fffd2",
    purple: "#b26bff"
  };

  const glassColor = glassMap[variant] || glassMap.sky;
  const glowColor = glowMap[variant] || glowMap.sky;

  if (mode === "inline") {
    return (
      <div className="w-full h-full">
        <Scene glassColor={glassColor} glowColor={glowColor} emotion={emotion} />
      </div>
    );
  }

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
      <Scene glassColor={glassColor} glowColor={glowColor} emotion={emotion} />
    </div>
  );

  return createPortal(node, document.body);
}
