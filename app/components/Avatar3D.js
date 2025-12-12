"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

/** 果凍小熊：用幾何體拼出來（不需要外部模型） */
function GummyBear({ color, emotion }) {
  const groupRef = useRef();
  const emotionRef = useRef(emotion);

  useEffect(() => {
    emotionRef.current = emotion;
  }, [emotion]);

  // 讓果凍材質更像小熊軟糖：半透明 + 光澤
  const materialProps = useMemo(
    () => ({
      color,
      roughness: 0.18,
      metalness: 0.0,
      transmission: 0.85, // 透明感（像果凍）
      thickness: 1.2, // 果凍厚度
      ior: 1.35, // 折射率
      clearcoat: 0.7,
      clearcoatRoughness: 0.15
    }),
    [color]
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const t = clock.getElapsedTime();
    const emo = emotionRef.current;

    // 不同情緒：晃動/彈性/呼吸幅度
    let bobAmp = 0.03;
    let bobSpeed = 1.1;
    let wobbleAmp = 0.05;
    let wobbleSpeed = 1.5;
    let pulseAmp = 0.015;

    if (emo === "happy") {
      bobAmp = 0.11;
      bobSpeed = 2.8;
      wobbleAmp = 0.14;
      wobbleSpeed = 3.0;
      pulseAmp = 0.06;
    } else if (emo === "thinking") {
      bobAmp = 0.05;
      bobSpeed = 1.6;
      wobbleAmp = 0.07;
      wobbleSpeed = 1.8;
      pulseAmp = 0.02;
    } else if (emo === "sorry") {
      bobAmp = 0.02;
      bobSpeed = 0.9;
      wobbleAmp = 0.04;
      wobbleSpeed = 1.0;
      pulseAmp = 0.01;
    }

    // 上下飄
    groupRef.current.position.y = Math.sin(t * bobSpeed) * bobAmp;

    // 果凍搖晃（左右、前後、旋轉）
    groupRef.current.rotation.z = Math.sin(t * wobbleSpeed) * wobbleAmp * 0.25;
    groupRef.current.rotation.x = Math.sin(t * wobbleSpeed * 0.9) * wobbleAmp * 0.18;
    groupRef.current.rotation.y = Math.cos(t * wobbleSpeed * 0.8) * wobbleAmp * 0.12;

    // 呼吸/彈性縮放
    const s = 1 + Math.sin(t * (bobSpeed + 0.8)) * pulseAmp;
    groupRef.current.scale.set(s, 1 - pulseAmp * 0.55 + Math.cos(t * bobSpeed) * pulseAmp * 0.35, s);
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 身體 */}
      <mesh position={[0, -0.15, 0]}>
        <capsuleGeometry args={[0.5, 0.65, 10, 18]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>

      {/* 頭 */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.42, 28, 28]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>

      {/* 耳朵 */}
      <mesh position={[-0.32, 0.88, 0]}>
        <sphereGeometry args={[0.18, 22, 22]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>
      <mesh position={[0.32, 0.88, 0]}>
        <sphereGeometry args={[0.18, 22, 22]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>

      {/* 手臂 */}
      <mesh position={[-0.6, 0.12, 0]} rotation={[0, 0, 0.35]}>
        <capsuleGeometry args={[0.17, 0.35, 8, 16]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>
      <mesh position={[0.6, 0.12, 0]} rotation={[0, 0, -0.35]}>
        <capsuleGeometry args={[0.17, 0.35, 8, 16]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>

      {/* 腿 */}
      <mesh position={[-0.25, -0.72, 0]} rotation={[0, 0, 0.08]}>
        <capsuleGeometry args={[0.20, 0.35, 8, 16]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>
      <mesh position={[0.25, -0.72, 0]} rotation={[0, 0, -0.08]}>
        <capsuleGeometry args={[0.20, 0.35, 8, 16]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>

      {/* 肚子亮面小反光（讓它更像糖） */}
      <mesh position={[0.02, -0.05, 0.33]} rotation={[0, 0, 0.1]}>
        <sphereGeometry args={[0.22, 18, 18]} />
        <meshPhysicalMaterial
          color={"#ffffff"}
          roughness={0.08}
          metalness={0}
          transmission={0.95}
          thickness={0.2}
          ior={1.4}
          opacity={0.35}
          transparent
        />
      </mesh>
    </group>
  );
}

function GummyScene({ color, emotion }) {
  return (
    <Canvas
      camera={{ position: [0, 0.2, 3.2], fov: 45 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      {/* 光：糖果感要靠光 */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 5]} intensity={1.2} />
      <pointLight position={[-6, 2, 6]} intensity={0.8} />
      <pointLight position={[0, -2, 3]} intensity={0.35} />

      <GummyBear color={color} emotion={emotion} />

      {/* 允許轉動看，不能縮放 */}
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
  // 你原本的三種款式 → 變成三種小熊軟糖口味顏色
  const colorMap = {
    sky: "#35b7ff", // 藍莓冰沙（偏藍）
    mint: "#33e3a0", // 薄荷青蘋（偏綠）
    purple: "#b26bff" // 葡萄汽水（偏紫）
  };
  const color = colorMap[variant] || colorMap.sky;

  // 創角階段：嵌在卡片裡
  if (mode === "inline") {
    return (
      <div className="w-full h-full">
        <GummyScene color={color} emotion={emotion} />
      </div>
    );
  }

  // 聊天階段：浮在螢幕上，可拖拉（Portal 到 body）
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ x: 16, y: 120 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("floating-bear-pos");
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
    setPos({ x: 16, y: h - 220 });
  }, []);

  useEffect(() => {
    if (!dragging) return;

    function handleMove(e) {
      if (e.cancelable) e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const width = window.innerWidth || 400;
      const height = window.innerHeight || 800;

      // 小熊外框大小（讓它在畫面內）
      const boxW = 160;
      const boxH = 200;

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
        window.localStorage.setItem("floating-bear-pos", JSON.stringify(pos));
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
        width: 160,
        height: 200,
        zIndex: 9999,
        cursor: "grab",
        touchAction: "none",
        pointerEvents: "auto"
      }}
    >
      <GummyScene color={color} emotion={emotion} />
    </div>
  );

  return createPortal(node, document.body);
}
