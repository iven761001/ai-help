//AvatarStage.jsx v002.001
// app/components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import Avatar3D from "./Avatar3D";

/** 舞台錯誤不炸整頁 */
class StageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || "3D stage error" };
  }
  componentDidCatch(err) {
    console.error("[AvatarStage error]", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white/60 text-xs text-center px-4">
            3D 舞台載入失敗（不影響其他 UI）
            <br />
            {this.state.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * ✅ v002.001：市售選角 framing（更穩）
 * 關鍵修正：
 * 1) 每次 framing 先把 root.position reset（避免累積位移）
 * 2) 使用「腳底貼地」+「水平置中」一次到位
 * 3) lookAt 直接鎖在「身體中段」(避免只看到腳)
 */
function MarketFrame({
  targetRef,
  mode = "normal", // normal | full
  bumpLook = 0, // 0~0.2
  triggerKey,
  onDebug
}) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  const retryRef = useRef(0);

  // 讓「全身」更穩定：full 會看更全
  const padding = mode === "full" ? 1.55 : 1.25;

  // ✅ 記住 root 初始位置（這裡通常是 0,0,0，但保險）
  const basePosRef = useRef(new THREE.Vector3(0, 0, 0));
  const baseCapturedRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    retryRef.current = 0;
  }, [triggerKey, mode, bumpLook]);

  useFrame(() => {
    if (doneRef.current) return;

    const root = targetRef.current;
    if (!root) return;

    // capture base pos once
    if (!baseCapturedRef.current) {
      basePosRef.current.copy(root.position);
      baseCapturedRef.current = true;
    }

    // ✅ 每次重新 framing 都先 reset（避免累積位移越跑越歪）
    root.position.copy(basePosRef.current);

    // 1) bbox（等模型真的有尺寸）
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    if (!isFinite(size.y) || size.y < 0.05) {
      retryRef.current += 1;
      if (retryRef.current > 240) doneRef.current = true;
      return;
    }

    // 2) 水平置中 + 腳貼地（一次到位）
    //    x/z：把中心拉回 0
    //    y：把 minY 拉到 0（腳底貼地）
    root.position.x = basePosRef.current.x - center.x;
    root.position.z = basePosRef.current.z - center.z;

    const box2 = new THREE.Box3().setFromObject(root);
    const minY = box2.min.y;
    root.position.y = basePosRef.current.y - minY; // minY -> 0

    // 3) 再算一次 final bbox（用來算相機距離）
    const box3 = new THREE.Box3().setFromObject(root);
    const size3 = new THREE.Vector3();
    const center3 = new THREE.Vector3();
    box3.getSize(size3);
    box3.getCenter(center3);

    const height = Math.max(0.0001, size3.y);

    // 4) 相機距離（保證全身）
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (height * padding) / (2 * Math.tan(fov / 2));

    // 5) 視線：鎖「身體中段」55%~65%（避免只看到腳）
    const lookAtRatio = 0.62 + bumpLook; // ✅ 比你原本 0.58 更往上（更像市售選角）
    const lookAtY = box3.min.y + height * lookAtRatio;

    // 6) 相機位置：y 稍微比 lookAt 再高一點點，z 在 dist
    camera.position.set(center3.x, lookAtY + height * 0.10, center3.z + dist);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 50;
    camera.updateProjectionMatrix();
    camera.lookAt(center3.x, lookAtY, center3.z);

    doneRef.current = true;

    onDebug?.({
      minY: box3.min.y.toFixed(3),
      maxY: box3.max.y.toFixed(3),
      height: height.toFixed(3),
      lookAtY: lookAtY.toFixed(3),
      ratio: lookAtRatio.toFixed(2),
      camY: camera.position.y.toFixed(3),
      camZ: camera.position.z.toFixed(3),
      padding: padding.toFixed(2)
    });
  });

  return null;
}

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function AvatarStage({
  vrmId = "C1",
  variant = "sky",
  emotion = "idle",
  previewYaw = 0
}) {
  const camera = useMemo(() => ({ position: [0, 1.3, 2.8], fov: 35 }), []);
  const modelRoot = useRef();

  const [mode, setMode] = useState("normal"); // normal | full
  const [bumpLook, setBumpLook] = useState(0); // 0 / 0.06 / 0.12
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  const [reframeTick, setReframeTick] = useState(0);
  const triggerKey = `${vrmId}-${mode}-${bumpLook}-${reframeTick}`;

  const onCenter = () => setReframeTick((n) => n + 1);

  return (
    <div className="w-full h-full relative">
      {/* 右上角控制鈕（Canvas 外疊上去） */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={onCenter}
          className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs backdrop-blur active:scale-95 transition"
        >
          置中
        </button>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "full" ? "normal" : "full"));
              setReframeTick((n) => n + 1);
            }}
            className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs backdrop-blur active:scale-95 transition"
          >
            {mode === "full" ? "正常" : "看更全"}
          </button>

          <button
            type="button"
            onClick={() => {
              setBumpLook((v) => (v >= 0.12 ? 0 : v + 0.06));
              setReframeTick((n) => n + 1);
            }}
            className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs backdrop-blur active:scale-95 transition"
            title="把視線往上移一點（避免切腳）"
          >
            視線↑
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowDebug((v) => !v)}
          className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white/60 text-xs backdrop-blur active:scale-95 transition"
        >
          Debug
        </button>
      </div>

      {showDebug && debug && (
        <div className="absolute top-14 right-3 z-10 rounded-2xl bg-black/60 border border-white/10 text-white/80 text-xs p-3 backdrop-blur">
          <div className="font-semibold mb-1">Debug</div>
          <div>minY: {debug.minY}</div>
          <div>maxY: {debug.maxY}</div>
          <div>height: {debug.height}</div>
          <div>lookAtY: {debug.lookAtY}</div>
          <div>ratio: {debug.ratio}</div>
          <div>camY: {debug.camY}</div>
          <div>camZ: {debug.camZ}</div>
          <div>padding: {debug.padding}</div>
        </div>
      )}

      <StageErrorBoundary>
        <Canvas
          camera={camera}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          {/* 光 */}
          <ambientLight intensity={0.85} />
          <directionalLight position={[3, 6, 4]} intensity={1.15} />
          <directionalLight position={[-3, 2, -2]} intensity={0.55} />

          <Suspense fallback={null}>
            <group ref={modelRoot}>
              <Avatar3D
                vrmId={vrmId}
                variant={variant}
                emotion={emotion}
                previewYaw={previewYaw}
              />
            </group>

            <MarketFrame
              targetRef={modelRoot}
              mode={mode}
              bumpLook={bumpLook}
              triggerKey={triggerKey}
              onDebug={setDebug}
            />

            <ContactShadows
              opacity={0.35}
              scale={6}
              blur={2.2}
              far={10}
              resolution={256}
              position={[0, 0, 0]}
            />
          </Suspense>

          <OrbitControls enabled={false} enableZoom={false} enablePan={false} />
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
