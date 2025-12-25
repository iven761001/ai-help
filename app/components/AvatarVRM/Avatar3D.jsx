// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * Avatar3D（真 3D / R3F）
 * - previewYaw: 弧度（radians）
 * - 頭身分離旋轉：bodyYaw < headYaw
 * - emotion: idle / thinking / happy / sad / sorry（你可再擴）
 *
 * ✅ 目前先用「玻璃電路熊」當 fallback，保證可跑、可旋轉、立體
 * ✅ 未來接 VRM：把 useVRMModel() 替換成真正 VRM loader，然後回傳 scene + bones
 */
export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0
}) {
  // ===== 色彩（依 variant）=====
  const { glassColor, glowColor } = useMemo(() => {
    if (variant === "mint")
      return { glassColor: "#67ffd6", glowColor: "#3dffcf" };
    if (variant === "purple")
      return { glassColor: "#d3a8ff", glowColor: "#b26bff" };
    return { glassColor: "#7fdcff", glowColor: "#65d9ff" };
  }, [variant]);

  // ===== 情緒參數（影響動作幅度）=====
  const emo = useMemo(() => {
    if (emotion === "happy")
      return { bob: 0.09, speed: 2.4, headNod: 0.20, blink: 0.65 };
    if (emotion === "thinking")
      return { bob: 0.05, speed: 1.6, headNod: 0.10, blink: 0.35 };
    if (emotion === "sad" || emotion === "sorry")
      return { bob: 0.02, speed: 0.9, headNod: 0.06, blink: 0.25 };
    return { bob: 0.035, speed: 1.2, headNod: 0.08, blink: 0.45 };
  }, [emotion]);

  // ===== 頭身分離旋轉（弧度）=====
  // 身體轉小，頭轉大（你要更誇張就把 headFactor 拉高）
  const bodyYaw = previewYaw * 0.35;
  const headYaw = previewYaw * 0.85;

  // ===== 目前：fallback（玻璃電路熊）=====
  // 未來接 VRM 時，你可以用同樣的「headGroup / bodyGroup」概念套到骨架上
  return (
    <FallbackGlassBear
      glassColor={glassColor}
      glowColor={glowColor}
      bodyYaw={bodyYaw}
      headYaw={headYaw}
      emo={emo}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                               Fallback Bear                                */
/* -------------------------------------------------------------------------- */

function FallbackGlassBear({ glassColor, glowColor, bodyYaw, headYaw, emo }) {
  const rootRef = useRef();
  const bodyRef = useRef();
  const headRef = useRef();
  const circuitRef = useRef();

  // 電路流動偏移
  const offsetRef = useRef({ x: 0, y: 0 });

  // 產生透明電路貼圖（CanvasTexture）
  const [texPack, setTexPack] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const THREE = await import("three");
      if (!alive) return;

      const canvas = makeChipCircuitTexture({ size: 640, seed: 7, glow: glowColor });
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1.2, 1.2);
      tex.needsUpdate = true;
      tex.premultiplyAlpha = true;

      setTexPack({ THREE, tex });
    })();

    return () => {
      alive = false;
    };
  }, [glowColor]);

  // 動畫：呼吸、點頭、電路流動
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const root = rootRef.current;
    const body = bodyRef.current;
    const head = headRef.current;

    if (!root || !body || !head) return;

    // 根層：微微漂浮
    root.position.y = Math.sin(t * emo.speed) * emo.bob;

    // 身體：穩定轉
    body.rotation.y = bodyYaw;

    // 頭：更明顯轉 + 微點頭
    head.rotation.y = headYaw;
    head.rotation.x = Math.sin(t * (emo.speed * 0.85)) * (emo.headNod * 0.15);

    // 些微左右擺（很輕）
    body.rotation.z = Math.sin(t * emo.speed) * 0.03;

    // 電路流動
    if (texPack?.tex) {
      offsetRef.current.x = (t * 0.045) % 1;
      offsetRef.current.y = (t * 0.03) % 1;
      texPack.tex.offset.set(offsetRef.current.x, offsetRef.current.y);
    }
  });

  // 玻璃材質（立體感）
  const glassProps = useMemo(
    () => ({
      color: glassColor,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 0.92,
      thickness: 1.6,
      ior: 1.48,
      clearcoat: 1.0,
      clearcoatRoughness: 0.14
    }),
    [glassColor]
  );

  return (
    <group ref={rootRef} position={[0, 0, 0]}>
      {/* ===================== 身體群組 ===================== */}
      <group ref={bodyRef} position={[0, -0.05, 0]}>
        {/* 身體 */}
        <mesh position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.52, 0.72, 10, 20]} />
          <meshPhysicalMaterial {...glassProps} />
        </mesh>

        {/* 手 */}
        <mesh position={[-0.62, 0.1, 0]} rotation={[0, 0, 0.35]}>
          <capsuleGeometry args={[0.18, 0.38, 10, 18]} />
          <meshPhysicalMaterial {...glassProps} />
        </mesh>
        <mesh position={[0.62, 0.1, 0]} rotation={[0, 0, -0.35]}>
          <capsuleGeometry args={[0.18, 0.38, 10, 18]} />
          <meshPhysicalMaterial {...glassProps} />
        </mesh>

        {/* 腳 */}
        <mesh position={[-0.26, -0.78, 0]} rotation={[0, 0, 0.06]}>
          <capsuleGeometry args={[0.22, 0.36, 10, 18]} />
          <meshPhysicalMaterial {...glassProps} />
        </mesh>
        <mesh position={[0.26, -0.78, 0]} rotation={[0, 0, -0.06]}>
          <capsuleGeometry args={[0.22, 0.36, 10, 18]} />
          <meshPhysicalMaterial {...glassProps} />
        </mesh>

        {/* 電路表面（身體） */}
        {texPack?.tex && (
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.525, 0.725, 10, 20]} />
            <meshBasicMaterial
              map={texPack.tex}
              color={glowColor}
              transparent
              opacity={0.62}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>

      {/* ===================== 頭部群組（獨立旋轉） ===================== */}
      <group ref={headRef} position={[0, 0.68, 0]}>
        {/* 頭 */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.46, 32, 32]} />
          <meshPhysicalMaterial {...glassProps} />
        </mesh>

        {/* 耳朵 */}
        <mesh position={[-0.36, 0.32, 0]}>
          <sphereGeometry args={[0.19, 26, 26]} />
          <meshPhysicalMaterial {...glassProps} />
        </mesh>
        <mesh position={[0.36, 0.32, 0]}>
          <sphereGeometry args={[0.19, 26, 26]} />
          <meshPhysicalMaterial {...glassProps} />
        </mesh>

        {/* 臉部內層（增加熊感） */}
        <mesh position={[0, -0.05, 0.34]}>
          <sphereGeometry args={[0.25, 22, 22]} />
          <meshPhysicalMaterial
            color={"#ffffff"}
            roughness={0.18}
            metalness={0}
            transmission={0.55}
            thickness={0.2}
            ior={1.3}
            transparent
            opacity={0.28}
          />
        </mesh>

        {/* 眼睛 */}
        <mesh position={[-0.12, 0.03, 0.54]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color={"#0b1220"} roughness={0.25} />
        </mesh>
        <mesh position={[0.12, 0.03, 0.54]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color={"#0b1220"} roughness={0.25} />
        </mesh>

        {/* 鼻子 */}
        <mesh position={[0, -0.07, 0.56]}>
          <sphereGeometry args={[0.05, 14, 14]} />
          <meshStandardMaterial color={"#0b1220"} roughness={0.35} />
        </mesh>

        {/* 電路表面（頭） */}
        {texPack?.tex && (
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.468, 32, 32]} />
            <meshBasicMaterial
              map={texPack.tex}
              color={glowColor}
              transparent
              opacity={0.56}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )}

        {/* 高光球（立體感關鍵） */}
        <mesh position={[0.14, 0.08, 0.42]} rotation={[0, 0, 0.1]}>
          <sphereGeometry args={[0.16, 20, 20]} />
          <meshPhysicalMaterial
            color={"#ffffff"}
            roughness={0.06}
            metalness={0}
            transmission={0.98}
            thickness={0.2}
            ior={1.52}
            opacity={0.18}
            transparent
          />
        </mesh>
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Chip Circuit Texture Maker                         */
/* -------------------------------------------------------------------------- */

function makeChipCircuitTexture({ size = 512, seed = 1, glow = "#65d9ff" }) {
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

  // 背景微格：晶片感
  ctx.strokeStyle = hexToRgba(glow, 0.07);
  ctx.lineWidth = 1;
  for (let x = 0; x < size; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y < size; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  const drawTrace = (x0, y0) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    let x = x0;
    let y = y0;

    const steps = 8 + Math.floor(rand() * 10);
    for (let k = 0; k < steps; k++) {
      const dir = Math.floor(rand() * 4);
      const len = 18 + Math.floor(rand() * 90);

      if (dir === 0) x += len;
      if (dir === 1) x -= len;
      if (dir === 2) y += len;
      if (dir === 3) y -= len;

      x = Math.max(12, Math.min(size - 12, x));
      y = Math.max(12, Math.min(size - 12, y));
      ctx.lineTo(x, y);

      // 節點
      if (rand() < 0.55) {
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2.2 + rand() * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  };

  // 主走線
  const traces = 54;
  for (let i = 0; i < traces; i++) {
    const x0 = rand() * size;
    const y0 = rand() * size;
    ctx.lineWidth = 1.3 + rand() * 2.4;
    ctx.strokeStyle = hexToRgba(glow, 0.50 + rand() * 0.30);
    drawTrace(x0, y0);
  }

  // 小短線（焊點感）
  for (let i = 0; i < 140; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 8 + rand() * 30;
    const horizontal = rand() > 0.5;
    ctx.lineWidth = 1 + rand() * 1.8;
    ctx.strokeStyle = hexToRgba(glow, 0.22 + rand() * 0.35);
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
