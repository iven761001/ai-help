"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, OrbitControls } from "@react-three/drei";

function Ball({ color, emotion }) {
  let distort = 0.15;
  let speed = 1;

  if (emotion === "happy") {
    distort = 0.35;
    speed = 2;
  } else if (emotion === "thinking") {
    distort = 0.25;
    speed = 1.5;
  } else if (emotion === "sorry") {
    distort = 0.2;
    speed = 0.8;
  }

  return (
    <Sphere args={[1, 64, 64]}>
      <MeshDistortMaterial
        color={color}
        distort={distort}
        speed={speed}
        roughness={0.2}
      />
    </Sphere>
  );
}

function BallCanvas({ color, emotion }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3] }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Ball color={color} emotion={emotion} />
      <OrbitControls enableZoom={false} />
    </Canvas>
  );
}

/**
 * mode="inline"   : 嵌在版面裡（創角畫面用）
 * mode="floating" : 浮在整個螢幕上，可拖拉（聊天室用）
 */
export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  mode = "inline"
}) {
  const colorMap = {
    sky: "#38bdf8",
    mint: "#22c55e",
    purple: "#a855f7"
  };
  const color = colorMap[variant] || colorMap.sky;

  // inline 模式：就乖乖待在容器裡
  if (mode === "inline") {
    return (
      <div className="w-full h-full">
        <BallCanvas color={color} emotion={emotion} />
      </div>
    );
  }

  // 下面是 floating 模式（整個螢幕拖拉）
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ x: 20, y: 120 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    // 讀取之前儲存的位置
    const saved = window.localStorage.getItem("floating-ball-pos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPos(parsed);
        }
      } catch (e) {
        // ignore
      }
    } else {
      const h = window.innerHeight || 800;
      setPos({ x: 16, y: h - 200 });
    }
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
      <BallCanvas color={color} emotion={emotion} />
    </div>
  );

  // 用 Portal 直接畫到 <body>，完全不受版面限制
  return createPortal(ballNode, document.body);
}
