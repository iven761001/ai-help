"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

/** 生成「電路紋」貼圖：用 Canvas 畫線，不用外部圖片 */
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

  ctx.clearRect(0, 0, size, size);

  // 背景淡淡的雜訊點（讓它更像「晶片底」）
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 2200; i++) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    const a = 0.15 + rand() * 0.55;
    ctx.fillStyle = `rgba(180,245,255,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // 主電路線條：更粗、更亮（手機才看得清楚）
  ctx.globalAlpha = 0.95;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = glow;

  const drawPath = (x0, y0) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    let x = x0;
    let y = y0;

    const steps = 8 + Math.floor(rand() * 10);
    for (let k = 0; k < steps; k++) {
      const dir = Math.floor(rand() * 4);
      const len = 25 + Math.floor(rand() * 90);

      if (dir === 0) x += len;
      if (dir === 1) x -= len;
      if (dir === 2) y += len;
      if (dir === 3) y -= len;

      x = Math.max(10, Math.min(size - 10, x));
      y = Math.max(10, Math.min(size - 10, y));
      ctx.lineTo(x, y);

      // 節點
      if (rand() < 0.6) {
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 3 + rand() * 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(235,255,255,0.95)";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  };

  const lines = 42;
  for (let i = 0; i < lines; i++) {
    const x0 = rand() * size;
    const y0 = rand() * size;
    ctx.lineWidth = 1.8 + rand() * 3.0; // ← 加粗
    drawPath(x0, y0);
  }

  // 外光暈（用 lighter 疊加）
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.26;
  for (let i = 0; i < 40; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 35 + rand() * 110;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(190,255,255,0.55)");
    g.addColorStop(1, "rgba(190,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/** 科技玻璃小熊：外層玻璃 + 內層電路發光（Additive） */
function TechGlassBear({ glassColor, glowColor, emotion }) {
  const groupRef = useRef();
  const emotionRef = useRef(emotion);
  const circuitRef = useRef(null);

  useEffect(() => {
    emotionRef.current = emotion;
  }, [emotion]);

  // 生成電路貼圖（依 variant seed）
  const circuitCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    // 用 glowColor 也來影響 seed，讓三款線條分佈不同
    const seed =
      glowColor === "#4fffd2" ? 7 : glowColor === "#b26bff" ? 13 : 3;
    return makeCircuitTexture({ seed, glow: glowColor });
  }, [glowColor]);

  // 建立 THREE CanvasTexture
  useEffect(() => {
    if (!circuitCanvas) return;
    let disposed = false;

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const tex = new THREE.CanvasTexture(circuitCanvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1.1, 1.1);
      tex.needsUpdate = true;

      circuitRef.current = { THREE, tex };
    })();

    return () => {
      disposed = true;
    };
  }, [circuitCanvas]);

  // 外層玻璃（讓它更像你那張「玻璃糖」）
  const glassMaterialProps = useMemo(
    () => ({
      color: glassColor,
      roughness: 0.06,
      metalness: 0.0,
      transmission: 0.95,
      thickness: 1.8,
      ior: 1.48,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    }),
    [glassColor]
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const t = clock.getElapsedTime();
    const emo = emotionRef.current;

    // 情緒→動作/亮度
    let bobAmp = 0.02;
    let bobSpeed = 1.0;
    let wobble = 0.04;
    let glow = 0.55; // 電路亮度
    let pulse = 0.015;

    if (emo === "happy") {
      bobAmp = 0.1;
      bobSpeed = 2.6;
      wobble = 0.14;
      glow = 1.25;
      pulse = 0.06;
    } else if (emo === "thinking") {
      bobAmp = 0.05;
      bobSpeed = 1.6;
      wobble = 0.07;
      glow = 0.95;
      pulse = 0.02;
    } else if (emo === "sorry") {
      bobAmp = 0.012;
      bobSpeed = 0.85;
      wobble = 0.035;
      glow = 0.35;
      pulse = 0.01;
    }

    // 上下飄 + 果凍晃
    groupRef.current.position.y = Math.sin(t * bobSpeed) * bobAmp;
    groupRef.current.rotation.z = Math.sin(t * bobSpeed) * wobble * 0.16;
    groupRef.current.rotation.x = Math.sin(t * bobSpeed * 0.85) * wobble * 0.12;
    groupRef.current.rotation.y = Math.cos(t * bobSpeed * 0.8) * wobble * 0.11;

    // 呼吸縮放
    const s = 1 + Math.sin(t * (bobSpeed + 0.7)) * pulse;
    groupRef.current.scale.set(
      s,
      1 - pulse * 0.35 + Math.cos(t * bobSpeed) * pulse * 0.25,
      s
    );

    // 電路貼圖：流動
    if (circuitRef.current?.tex) {
      circuitRef.current.tex.offset.x = (t * 0.03) % 1;
      circuitRef.current.tex.offset.y = (t * 0.022) % 1;
    }

    // 把 glow 寫回 ref，讓內層材質吃到
    if (circuitRef.current) {
      circuitRef.current.glow = glow;
    }
  });

  /** 內層電路材質：用 Additive 疊加，手機更清楚 */
  const InnerCircuitMeshes = () => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
      if (circuitRef.current?.tex) setReady(true);
    }, [circuitCanvas]);

    if (!ready) return null;

    const { THREE, tex } = circuitRef.current;

    const CircuitMat = ({ opacity = 0.55 }) => (
      <meshBasicMaterial
        color={new THREE.Color(glowColor)}
        map={tex}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    );

    // 內層縮小一點，確保「在玻璃裡面」，但不要太小（不然看不到）
    return (
      <group scale={[0.965, 0.965, 0.965]}>
        {/* 身體 */}
        <mesh position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.5, 0.65, 10, 18]} />
          <CircuitMat opacity={0.62} />
        </mesh>

        {/* 頭 */}
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.42, 28, 28]} />
          <CircuitMat opacity={0.6} />
        </mesh>

        {/* 耳朵 */}
        <mesh position={[-0.32, 0.88, 0]}>
          <sphereGeometry args={[0.18, 22, 22]} />
          <CircuitMat opacity={0.52} />
        </mesh>
        <mesh position={[0.32, 0.88, 0]}>
          <sphereGeometry args={[0.18, 22, 22]} />
          <CircuitMat opacity={0.52} />
        </mesh>

        {/* 手臂 */}
        <mesh position={[-0.6, 0.12, 0]} rotation={[0, 0, 0.35]}>
          <capsuleGeometry args={[0.17, 0.35, 8, 16]} />
          <CircuitMat opacity={0.55} />
        </mesh>
        <mesh position={[0.6, 0.12, 0]} rotation={[0, 0, -0.35]}>
          <capsuleGeometry args={[0.17, 0.35, 8, 16]} />
          <CircuitMat opacity={0.55} />
        </mesh>

        {/* 腿 */}
        <mesh position={[-0.25, -0.72, 0]} rotation={[0, 0, 0.08]}>
          <capsuleGeometry args={[0.2, 0.35, 8, 16]} />
          <CircuitMat opacity={0.5} />
        </mesh>
        <mesh position={[0.25, -0.72, 0]} rotation={[0, 0, -0.08]}>
          <capsuleGeometry args={[0.2, 0.35, 8, 16]} />
          <CircuitMat opacity={0.5} />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 內層電路發光 */}
      <InnerCircuitMeshes />

      {/* 外層玻璃 */}
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
          opacity={0.22}
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
      {/* 冷色科技打光 */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 6]} intensity={1.25} />
      <pointLight position={[-6, 2, 8]} intensity={0.9} />
      <pointLight position={[0, -2, 3]} intensity={0.35} />

      <TechGlassBear
        glassColor={glassColor}
        glowColor={glowColor}
        emotion={emotion}
      />

      <OrbitControls enableZoom={false} />
    </Canvas>
  );
}

/**
 * mode="inline"   : 創角畫面用（嵌在卡片）
 * mode="floating" : 聊天畫面用（浮在螢幕上，可拖拉）
 */
export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  mode = "inline"
}) {
  // ✅ 外層玻璃顏色（比較淡，不要吃掉電路）
  const glassMap = {
    sky: "#cfefff",
    mint: "#d6fff1",
    purple: "#efe2ff"
  };

  // ✅ 電路冷光顏色（跟你原本三色連動）
  // sky: 冷藍光、mint: 冷薄荷光、purple: 冷紫光
  const glowMap = {
    sky: "#65d9ff",
    mint: "#4fffd2",
    purple: "#b26bff"
  };

  const glassColor = glassMap[variant] || glassMap.sky;
  const glowColor = glowMap[variant] || glowMap.sky;

  // 創角畫面：嵌在卡片
  if (mode === "inline") {
    return (
      <div className="w-full h-full">
        <Scene glassColor={glassColor} glowColor={glowColor} emotion={emotion} />
      </div>
    );
  }

  // 聊天畫面：浮動 + 可拖拉（Portal 到 body）
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
