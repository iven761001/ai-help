"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, OrbitControls } from "@react-three/drei";

// 會根據 emotion 上下浮動、扭動的球
function AnimatedBall({ color, emotion }) {
  const meshRef = useRef();
  const emotionRef = useRef(emotion);

  // 把最新的 emotion 存進 ref，避免 useFrame 吃到舊值
  useEffect(() => {
    emotionRef.current = emotion;
  }, [emotion]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    const emo = emotionRef.current;

    // 預設 idle
    let amp = 0.03; // 上下浮動幅度
    let speed = 1.2; // 浮動速度
    let distort = 0.15; // 扭曲程度

    if (emo === "happy") {
      amp = 0.18;
      speed = 3.2;
      distort = 0.5;
    } else if (emo === "thinking") {
      amp = 0.06;
      speed = 1.6;
      distort = 0.28;
    } else if (emo === "sorry") {
      amp = 0.02;
      speed = 0.8;
      distort = 0.22;
    } else if (emo === "idle") {
      amp = 0.03;
      speed = 1.2;
      distort = 0.18;
    }

    // 上下浮動
    meshRef.current.position.y = Math.sin(t * speed) * amp;

    // 材質扭曲（表情強弱）
    const mat = meshRef.current.material;
    if (mat && "distort" in mat) {
      mat.distort = distort;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]}>
      <MeshDistortMaterial
        color={color}
        distort={0.18}
        speed={2}
        roughness={0.2}
      />
    </Sphere>
  );
}

function BallScene({ color, emotion }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3] }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <AnimatedBall color={color} emotion={emotion} />
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
  const colorMap = {
    sky: "#38bdf8", // 天空藍
    mint: "#22c55e", // 薄荷綠
    purple: "#a855f7" // 紫色
  };
  const color = colorMap[variant] || colorMap.sky;

  // 創角階段 → 乖乖在卡片中
  if (mode === "inline") {
    return (
      <div className="w-full h-full">
        <BallScene color={color} emotion={emotion} />
      </div>
    );
  }

  // 聊天階段 → 浮在螢幕上，可以拖拉
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ x: 20, y: 120 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("floating-ball-pos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPos(parsed);
          return;
        }
      } catch (e) {
        // ignore
      }
    }
    const h = window.innerHeight || 800;
    setPos({ x: 16, y: h - 200 });
  }, []);

  useEffect(() => {
    if (!dragging) return;

    function handleMove(e) {
      if (e.cancelable) e.preventDefault();

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const width = window.innerWidth || 400;
      const height = window.innerHeight || 800;

      let x = clientX - 70;
      let y = clientY - 70;

      const maxX = width - 140;
      const maxY = height - 140;
      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x > maxX) x = maxX;
      if (y > maxY) y = maxY;

      setPos({ x, y });
    }

    function handleUp() {
      setDragging(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("floating-ball-pos", JSON.stringify(pos));
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

  const ballNode = (
    <div
      onMouseDown={handleDown}
      onTouchStart={handleDown}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 140,
        height: 140,
        zIndex: 9999,
        cursor: "grab",
        touchAction: "none",
        pointerEvents: "auto"
      }}
    >
      <BallScene color={color} emotion={emotion} />
    </div>
  );

  // 用 portal 掛在 <body>，不被版面限制
  return createPortal(ballNode, document.body);
}
