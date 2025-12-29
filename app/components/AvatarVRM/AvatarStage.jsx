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
 * 市售選角 framing（超通用）
 * - 腳底貼地（y=0）
 * - 相機距離用高度算，保證全身入鏡
 * - lookAt 看模型中段（避免只拍到腳/只拍到頭）
 *
 * 你可以用 mode 切換「看更全」或「更近」
 */
function MarketFrame({
  targetRef,
  mode = "normal", // normal | full
  bumpLook = 0, // 視線往上微調（0~0.2）
  onDebug,
  triggerKey, // vrmId 或任意字串變化時重置
}) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  const retryRef = useRef(0);

  // 依模式決定 padding（越大 = 看更全；越小 = 更近）
  const padding = mode === "full" ? 1.45 : 1.20;

  // 每次 triggerKey 變動就重做
  useEffect(() => {
    doneRef.current = false;
    retryRef.current = 0;
  }, [triggerKey, mode, bumpLook]);

  useFrame(() => {
    if (doneRef.current) return;

    const root = targetRef.current;
    if (!root) return;

    // 1) 算 bbox（注意：有些模型一開始 bbox 會是 0，要等幾幀）
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    if (!isFinite(size.y) || size.y < 0.01) {
      retryRef.current += 1;
      if (retryRef.current > 240) doneRef.current = true;
      return;
    }

    // 2) 先把模型水平置中（x/z）
    //    這裡只動 root，不動 VRM 內部骨架
    root.position.x -= center.x;
    root.position.z -= center.z;

    // 3) 腳底貼地：讓 minY 變成 0
    const box2 = new THREE.Box3().setFromObject(root);
    const minY = box2.min.y;
    root.position.y -= minY;

    // 4) 重新算 bbox（已貼地、已置中）
    const box3 = new THREE.Box3().setFromObject(root);
    const size3 = new THREE.Vector3();
    const center3 = new THREE.Vector3();
    box3.getSize(size3);
    box3.getCenter(center3);

    const height = Math.max(0.0001, size3.y);

    // 5) 用 FOV 算相機距離（以高度為準，保證頭到腳）
    //    dist = (height * padding) / (2 * tan(fov/2))
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (height * padding) / (2 * Math.tan(fov / 2));

    // 6) lookAt 用「中段」而不是 bbox center.y（避免只看到腳）
    //    市售選角常看身體 55%~65% 高度
    const lookAtY = box3.min.y + height * (0.58 + bumpLook); // bumpLook 讓你按「視線↑」

    // 7) 相機位置
    //    y 放在中段略上，z 在 dist，x 跟著 center3.x（通常已接近 0）
    camera.position.set(center3.x, lookAtY + height * 0.08, center3.z + dist);

    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 50;
    camera.updateProjectionMatrix();
    camera.lookAt(center3.x, lookAtY, center3.z);

    doneRef.current = true;

    onDebug?.({
      rawMinY: box.min.y.toFixed(3),
      rawMaxY: box.max.y.toFixed(3),
      height: height.toFixed(3),
      centerY: center3.y.toFixed(3),
      targetY: lookAtY.toFixed(3),
      camZ: camera.position.z.toFixed(3),
      padding: padding.toFixed(2),
      lookAtRatio: (0.58 + bumpLook).toFixed(2),
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
  // 相機初始值不重要（會被 MarketFrame 覆寫）
  const camera = useMemo(() => ({ position: [0, 1.3, 2.8], fov: 35 }), []);

  const modelRoot = useRef();

  // UI 狀態
  const [mode, setMode] = useState("normal"); // normal | full
  const [bumpLook, setBumpLook] = useState(0); // 0 or 0.08
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // 一鍵置中觸發：改變 triggerKey 讓 MarketFrame 重跑
  const [reframeTick, setReframeTick] = useState(0);
  const triggerKey = `${vrmId}-${mode}-${bumpLook}-${reframeTick}`;

  const onCenter = () => setReframeTick((n) => n + 1);

  return (
    <div className="w-full h-full relative">
      {/* 右上角控制鈕（在 Canvas 外，用絕對定位疊上去） */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={onCenter}
          className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs backdrop-blur"
        >
          置中
        </button>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              setMode("full");
              setReframeTick((n) => n + 1);
            }}
            className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs backdrop-blur"
          >
            看更全
          </button>

          <button
            type="button"
            onClick={() => {
              setBumpLook((v) => (v > 0 ? 0 : 0.08));
              setReframeTick((n) => n + 1);
            }}
            className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs backdrop-blur"
          >
            視線↑
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

      {/* Debug 面板 */}
      {showDebug && debug && (
        <div className="absolute top-14 right-3 z-10 rounded-2xl bg-black/60 border border-white/10 text-white/80 text-xs p-3 backdrop-blur">
          <div className="font-semibold mb-1">Debug</div>
          <div>rawMinY: {debug.rawMinY}</div>
          <div>rawMaxY: {debug.rawMaxY}</div>
          <div>height: {debug.height}</div>
          <div>centerY: {debug.centerY}</div>
          <div>targetY: {debug.targetY}</div>
          <div>camZ: {debug.camZ}</div>
          <div>padding: {debug.padding}</div>
          <div>lookAt: {debug.lookAtRatio}</div>
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
            {/* 這個 group 是整個模型根節點：我們只動這個，最安全 */}
            <group ref={modelRoot}>
              <Avatar3D
                vrmId={vrmId}
                variant={variant}
                emotion={emotion}
                previewYaw={previewYaw}
              />
            </group>

            {/* ✅ 市售 framing（保證頭到腳） */}
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
