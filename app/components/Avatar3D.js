"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";

/** 透明底電路貼圖 */
function makeCircuitTexture({ size = 512, seed = 1, glow = "#65d9ff" }) {
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
    ctx.lineWidth = 1.4 + rand() * 2.6;
    const a = 0.55 + rand() * 0.35;
    ctx.strokeStyle = hexToRgba(glow, a);
    drawPath(x0, y0);
  }

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
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${a})`;
}

/** 角色本體：帶電路的玻璃小熊 */
function TechGlassBear({ glassColor, glowColor, emotion, isDragging, previewRotationY }) {
  const groupRef = useRef();
  const emotionRef = useRef(emotion);
  const dragRef = useRef(isDragging);
  const previewRotRef = useRef(previewRotationY);
  const texRef = useRef(null);

  useEffect(() => {
    emotionRef.current = emotion;
  }, [emotion]);

  useEffect(() => {
    dragRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    previewRotRef.current = previewRotationY;
  }, [previewRotationY]);

  const circuitCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const seed = glowColor === "#4fffd2" ? 7 : glowColor === "#b26bff" ? 13 : 3;
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
      tex.premultiplyAlpha = true;

      texRef.current = { THREE, tex, lineOpacity: 0.55 };
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
    const dragging = dragRef.current;

    // 單指旋轉預覽：永遠套用 previewRotationY
    groupRef.current.rotation.y = previewRotRef.current || 0;

    // 兩指拖拉時：停掉其它晃動，避免看起來亂飄
    if (dragging) {
      groupRef.current.position.y = 0;
      groupRef.current.rotation.x = 0;
      groupRef.current.rotation.z = 0;
      groupRef.current.scale.set(1, 1, 1);

      if (texRef.current?.tex) {
        texRef.current.tex.offset.x = (t * 0.045) % 1;
        texRef.current.tex.offset.y = (t * 0.03) % 1;
      }
      return;
    }

    let bobAmp = 0.02;
    let bobSpeed = 1.0;
    let wobble = 0.04;
    let pulse = 0.015;
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

    const s = 1 + Math.sin(t * (bobSpeed + 0.7)) * pulse;
    groupRef.current.scale.set(
      s,
      1 - pulse * 0.35 + Math.cos(t * bobSpeed) * pulse * 0.25,
      s
    );

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

      {/* 電路表面 */}
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

      {/* 高光 */}
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

function Scene({ glassColor, glowColor, emotion, isDragging, previewRotationY }) {
  return (
    <Canvas
      camera={{ position: [0, 0.25, 3.2], fov: 45 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 6]} intensity={1.25} />
      <pointLight position={[-6, 2, 8]} intensity={0.9} />
      <pointLight position={[0, -2, 3]} intensity={0.35} />

      <TechGlassBear
        glassColor={glassColor}
        glowColor={glowColor}
        emotion={emotion}
        isDragging={isDragging}
        previewRotationY={previewRotationY}
      />
    </Canvas>
  );
}

function getBoxSize(emotion, vw) {
  const baseW = Math.max(130, Math.min(170, Math.floor(vw * 0.36)));
  const baseH = Math.floor(baseW * 1.28);

  let k = 1.0;
  if (emotion === "happy") k = 1.08;
  else if (emotion === "thinking") k = 1.03;
  else if (emotion === "sorry") k = 0.98;

  return { w: Math.round(baseW * k), h: Math.round(baseH * k) };
}

/**
 * mode="inline"   : 創角（嵌入）
 * mode="floating" : 聊天（浮動）
 *
 * ✅ 新增 previewYaw：讓 inline 也能吃到「單指拖拉旋轉」的角度
 */
export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  mode = "inline",
  previewYaw = 0
}) {
  const glassMap = {
    sky: "#7fdcff",
    mint: "#6fffd6",
    purple: "#d3a8ff"
  };

  const glowMap = {
    sky: "#65d9ff",
    mint: "#4fffd2",
    purple: "#b26bff"
  };

  const glassColor = glassMap[variant] || glassMap.sky;
  const glowColor = glowMap[variant] || glowMap.sky;

  // ✅ inline：吃得到外部傳入的 previewYaw
  if (mode === "inline") {
    return (
      <div className="w-full h-full">
        <Scene
          glassColor={glassColor}
          glowColor={glowColor}
          emotion={emotion}
          isDragging={false}
          previewRotationY={previewYaw}
        />
      </div>
    );
  }

  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ x: 16, y: 120 });
  const [box, setBox] = useState({ w: 170, h: 220 });

  // ✅ 兩指拖拉時用
  const [twoFingerDrag, setTwoFingerDrag] = useState(false);

  // ✅ 單指旋轉預覽
  const [previewRotY, setPreviewRotY] = useState(0);

  // 觸控追蹤
  const touchModeRef = useRef("none"); // "rotate" | "drag" | "none"
  const startRef = useRef({
    x: 0,
    y: 0,
    rotY: 0,
    posX: 0,
    posY: 0
  });

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    setBox(getBoxSize(emotion, window.innerWidth || 390));

    const onResize = () => {
      setBox(getBoxSize(emotion, window.innerWidth || 390));
    };
    window.addEventListener("resize", onResize);

    const saved = window.localStorage.getItem("floating-techbear-pos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPos(parsed);
        }
      } catch {}
    } else {
      const h = window.innerHeight || 800;
      setPos({ x: 16, y: h - 240 });
    }

    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBox(getBoxSize(emotion, window.innerWidth || 390));
  }, [emotion]);

  // ✅ 手勢：單指旋轉 / 兩指拖拉
  const onTouchStart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const touches = e.touches;
    if (!touches || touches.length === 0) return;

    // 兩指：拖拉移動
    if (touches.length >= 2) {
      touchModeRef.current = "drag";
      setTwoFingerDrag(true);

      const midX = (touches[0].clientX + touches[1].clientX) / 2;
      const midY = (touches[0].clientY + touches[1].clientY) / 2;

      startRef.current = {
        ...startRef.current,
        x: midX,
        y: midY,
        posX: pos.x,
        posY: pos.y
      };
      return;
    }

    // 單指：旋轉預覽
    touchModeRef.current = "rotate";
    setTwoFingerDrag(false);

    startRef.current = {
      ...startRef.current,
      x: touches[0].clientX,
      y: touches[0].clientY,
      rotY: previewRotY
    };
  };

  const onTouchMove = (e) => {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const touches = e.touches;
    if (!touches || touches.length === 0) return;

    // 若中途變兩指 → 切拖拉
    if (touches.length >= 2 && touchModeRef.current !== "drag") {
      touchModeRef.current = "drag";
      setTwoFingerDrag(true);
      const midX = (touches[0].clientX + touches[1].clientX) / 2;
      const midY = (touches[0].clientY + touches[1].clientY) / 2;
      startRef.current = {
        ...startRef.current,
        x: midX,
        y: midY,
        posX: pos.x,
        posY: pos.y
      };
    }

    if (touchModeRef.current === "rotate") {
      // 單指旋轉：水平移動 → 旋轉 Y
      const dx = touches[0].clientX - startRef.current.x;
      const rot = startRef.current.rotY + dx * 0.01;
      setPreviewRotY(rot);
      return;
    }

    if (touchModeRef.current === "drag") {
      // 兩指拖拉：用兩指中點移動容器位置
      const midX = (touches[0].clientX + touches[1].clientX) / 2;
      const midY = (touches[0].clientY + touches[1].clientY) / 2;

      const dx = midX - startRef.current.x;
      const dy = midY - startRef.current.y;

      const width = window.innerWidth || 400;
      const height = window.innerHeight || 800;

      const boxW = box.w;
      const boxH = box.h;

      let x = startRef.current.posX + dx;
      let y = startRef.current.posY + dy;

      const maxX = width - boxW;
      const maxY = height - boxH;

      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x > maxX) x = maxX;
      if (y > maxY) y = maxY;

      setPos({ x, y });
      return;
    }
  };

  const onTouchEnd = () => {
    const mode = touchModeRef.current;
    touchModeRef.current = "none";
    setTwoFingerDrag(false);

    if (mode === "drag") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("floating-techbear-pos", JSON.stringify(pos));
      }
    }
  };

  if (!mounted) return null;

  const node = (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: box.w,
        height: box.h,
        zIndex: 9999,
        touchAction: "none",
        pointerEvents: "auto",
        overflow: "visible"
      }}
    >
      <Scene
        glassColor={glassColor}
        glowColor={glowColor}
        emotion={emotion}
        isDragging={twoFingerDrag}
        previewRotationY={previewRotY}
      />
    </div>
  );

  return createPortal(node, document.body);
          }
