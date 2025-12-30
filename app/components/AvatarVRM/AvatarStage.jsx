//AvatarStage.jsx v002.000
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
 * ✅ 市售選角模式（更穩）
 * - 每次 framing 都先 reset root transform，避免「越算越飄」
 * - 腳底貼地（minY → 0）
 * - 相機距離同時考慮 height & width（避免只看到腳/只看到一半）
 * - lookAt 看身體 55% 高度（不是 bbox center）
 */
function MarketCharacterFrame({
  targetRef,
  triggerKey,
  mode = "normal", // normal | full
  lookRatio = 0.55, // 0.50~0.65 常見
  padding = 1.18, // 越大看越全
  onDebug,
}) {
  const { camera, size } = useThree();
  const doneRef = useRef(false);
  const retryRef = useRef(0);

  useEffect(() => {
    doneRef.current = false;
    retryRef.current = 0;
  }, [triggerKey, mode, lookRatio, padding]);

  useFrame(() => {
    if (doneRef.current) return;

    const root = targetRef.current;
    if (!root) return;

    // ✅ 重要：每次都先 reset，避免累積位移
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.set(1, 1, 1);

    // bbox 可能前幾幀還沒出來
    const box = new THREE.Box3().setFromObject(root);
    const sizeV = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(sizeV);
    box.getCenter(center);

    if (!isFinite(sizeV.y) || sizeV.y < 0.01) {
      retryRef.current += 1;
      if (retryRef.current > 240) doneRef.current = true;
      return;
    }

    // 1) 水平置中（x/z）
    root.position.x -= center.x;
    root.position.z -= center.z;

    // 2) 腳底貼地（minY → 0）
    const box2 = new THREE.Box3().setFromObject(root);
    root.position.y -= box2.min.y;

    // 3) 最終 bbox（用來算相機）
    const box3 = new THREE.Box3().setFromObject(root);
    const size3 = new THREE.Vector3();
    const center3 = new THREE.Vector3();
    box3.getSize(size3);
    box3.getCenter(center3);

    const height = Math.max(0.0001, size3.y);
    const width = Math.max(0.0001, size3.x);

    // ✅ 視線：看身體 55%（避免只拍到腳）
    const lookAtY = box3.min.y + height * lookRatio;

    // ✅ 相機距離：同時考慮 height & width（不會切腳/切頭）
    const vFov = (camera.fov * Math.PI) / 180;
    const aspect = Math.max(0.0001, size.width / Math.max(1, size.height));
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

    const distByHeight = (height / 2) / Math.tan(vFov / 2);
    const distByWidth = (width / 2) / Math.tan(hFov / 2);

    const pad = mode === "full" ? Math.max(padding, 1.32) : padding;
    const dist = Math.max(distByHeight, distByWidth) * pad;

    // 4) 相機：正前方 + 微微抬高
    camera.position.set(center3.x, lookAtY + height * 0.08, center3.z + dist);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 50;
    camera.updateProjectionMatrix();
    camera.lookAt(center3.x, lookAtY, center3.z);

    doneRef.current = true;

    onDebug?.({
      height: height.toFixed(3),
      width: width.toFixed(3),
      minY: box3.min.y.toFixed(3),
      lookAtY: lookAtY.toFixed(3),
      dist: dist.toFixed(3),
      pad: pad.toFixed(2),
      aspect: aspect.toFixed(2),
      lookRatio: lookRatio.toFixed(2),
    });
  });

  return null;
}

export default function AvatarStage({
  vrmId = "C1",
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,
}) {
  // 初始值不重要（會被 framing 覆寫）
  const camera = useMemo(() => ({ position: [0, 1.3, 2.8], fov: 35 }), []);
  const modelRoot = useRef();

  // UI：市售選角常用「正常 / 看更全」
  const [mode, setMode] = useState("normal");
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // 一鍵重算 framing
  const [tick, setTick] = useState(0);
  const triggerKey = `${vrmId}-${mode}-${tick}`;

  return (
    <div className="w-full h-full relative">
      {/* 右上角控制 */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setTick((n) => n + 1)}
          className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs backdrop-blur"
        >
          置中
        </button>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              setMode("normal");
              setTick((n) => n + 1);
            }}
            className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs backdrop-blur"
          >
            正常
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("full");
              setTick((n) => n + 1);
            }}
            className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs backdrop-blur"
          >
            看更全
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowDebug((v) => !v)}
          className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white/60 text-xs backdrop-blur"
        >
          Debug
        </button>
      </div>

      {showDebug && debug && (
        <div className="absolute top-14 right-3 z-10 rounded-2xl bg-black/60 border border-white/10 text-white/80 text-xs p-3 backdrop-blur">
          <div className="font-semibold mb-1">Debug</div>
          <div>height: {debug.height}</div>
          <div>width: {debug.width}</div>
          <div>minY: {debug.minY}</div>
          <div>lookAtY: {debug.lookAtY}</div>
          <div>dist: {debug.dist}</div>
          <div>pad: {debug.pad}</div>
          <div>aspect: {debug.aspect}</div>
          <div>lookRatio: {debug.lookRatio}</div>
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
            {/* ✅ 只移動這個 root（最安全） */}
            <group ref={modelRoot}>
              <Avatar3D
                vrmId={vrmId}
                variant={variant}
                emotion={emotion}
                previewYaw={previewYaw}
              />
            </group>

            {/* ✅ 市售 framing（頭到腳） */}
            <MarketCharacterFrame
              targetRef={modelRoot}
              triggerKey={triggerKey}
              mode={mode}
              lookRatio={0.55}
              padding={1.18}
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
