//AvatarStage.jsx v002.006
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
 */
function GroundClamp({ targetRef, enabled = true }) {
  const yRef = React.useRef(0); // 讓偏移穩定
  useFrame(() => {
    if (!enabled) return;
    const root = targetRef.current;
    if (!root || !root.children || root.children.length === 0) return;

    const box = new THREE.Box3().setFromObject(root);
    const minY = box.min.y;

    if (!Number.isFinite(minY)) return;

    // 目標：minY 要到 0，所以 root 要加上 -minY 的修正
    const targetY = yRef.current - minY;

    // 平滑一點，不要抖
    root.position.y = THREE.MathUtils.lerp(root.position.y, targetY, 0.35);
  });

  return null;
}

function MarketFrame({
  targetRef,
  mode = "normal", // normal | full
  bumpLook = 0, // 視線往上微調（0~0.2）
  onDebug,
  triggerKey,
  groundLock=true,//動畫時鎖地板
}) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  const retryRef = useRef(0);

  const padding = mode === "full" ? 1.45 : 1.20;

  useEffect(() => {
    doneRef.current = false;
    retryRef.current = 0;
  }, [triggerKey, mode, bumpLook]);

  useFrame(() => {
  const root = targetRef.current;
  if (!root) return;

  // ===== ① 初次 framing（只做一次）=====
  if (!doneRef.current) {
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

    // 水平置中
    root.position.x -= center.x;
    root.position.z -= center.z;

    // 腳底貼地（第一次）
    const box2 = new THREE.Box3().setFromObject(root);
    root.position.y -= box2.min.y;

    // 重新計算 bbox
    const box3 = new THREE.Box3().setFromObject(root);
    const size3 = new THREE.Vector3();
    const center3 = new THREE.Vector3();
    box3.getSize(size3);
    box3.getCenter(center3);

    const height = Math.max(0.0001, size3.y);
    const padding = mode === "full" ? 1.45 : 1.20;
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (height * padding) / (2 * Math.tan(fov / 2));
    const lookAtY = box3.min.y + height * (0.58 + bumpLook);

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

    return;
  }

  // ===== ② Ground Lock（每幀鎖地板）=====
  const box = new THREE.Box3().setFromObject(root);
  const minY = box.min.y;
  if (isFinite(minY) && Math.abs(minY) > 0.0005) {
    root.position.y -= minY;
  }
});

    // 2) 水平置中（x/z）
    root.position.x -= center.x;
    root.position.z -= center.z;

    // 3) 腳貼地：minY -> 0
    const box2 = new THREE.Box3().setFromObject(root);
    root.position.y -= box2.min.y;

    // 4) 最終 bbox
    const box3 = new THREE.Box3().setFromObject(root);
    const size3 = new THREE.Vector3();
    const center3 = new THREE.Vector3();
    box3.getSize(size3);
    box3.getCenter(center3);

    const height = Math.max(0.0001, size3.y);

    // 5) 相機距離（保證頭到腳）
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (height * padding) / (2 * Math.tan(fov / 2));

    // 6) 視線看中段
    const lookAtY = box3.min.y + height * (0.58 + bumpLook);

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
      lookAtRatio: (0.58 + bumpLook).toFixed(2)
    });
  });

  return null;
}

export default function AvatarStage({
  vrmId = "C1",
  variant = "sky",
  emotion = "idle",
  action = "idle",
  previewYaw = 0
}) {
  const camera = useMemo(() => ({ position: [0, 1.3, 2.8], fov: 35 }), []);
  const modelRoot = useRef();

  const [mode, setMode] = useState("normal");
  const [bumpLook, setBumpLook] = useState(0);
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // ✅ 置中/重 framing 觸發
  const [reframeTick, setReframeTick] = useState(0);
  const triggerKey = `${vrmId}-${action}-${mode}-${bumpLook}-${reframeTick}`;

  const hardResetRoot = () => {
    const root = modelRoot.current;
    if (!root) return;
    // ✅ 關鍵：避免「上一個模型置中的位移」殘留到下一個模型
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.set(1, 1, 1);
  };

  const onCenter = () => {
    hardResetRoot();
    setReframeTick((n) => n + 1);
  };

  return (
    <div className="w-full h-full relative">
      {/* 右上角控制鈕 */}
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
              onCenter();
            }}
            className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs backdrop-blur"
          >
            看更全
          </button>

          <button
            type="button"
            onClick={() => {
              setBumpLook((v) => (v > 0 ? 0 : 0.08));
              onCenter();
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
          <ambientLight intensity={0.85} />
          <directionalLight position={[3, 6, 4]} intensity={1.15} />
          <directionalLight position={[-3, 2, -2]} intensity={0.55} />

          <Suspense fallback={null}>
            <group ref={modelRoot}>
              <Avatar3D
                vrmId={vrmId}
                variant={variant}
                emotion={emotion}
                action={action}
                previewYaw={previewYaw}
                onReady={() => {
                  // ✅ 模型真正載好 → 先重置 root → 強制 reframe
                  hardResetRoot();
                  setReframeTick((n) => n + 1);
                }}
              />
            </group>

            <MarketFrame
              targetRef={modelRoot}
              mode={mode}
              bumpLook={bumpLook}
              triggerKey={triggerKey}
              onDebug={setDebug}
            />
            
            <GroundClamp targetRef={modelRoot} enabled />
         
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
