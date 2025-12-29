"use client";

import React, { Suspense, useMemo, useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import Avatar3D from "./Avatar3D";

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
            3D 舞台載入失敗（不影響輸入信箱/聊天）<br />
            {this.state.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * ✅ 會持續等到模型 bbox 有效才做一次「腳貼地 + 相機對焦」
 * ✅ 支援 resetKey：按「置中」就會重算一次
 * ✅ Debug：回傳 minY/maxY/height/centerY/hipsY/camZ
 */
function AutoFrame({
  targetRef,
  padding = 1.28,
  fallbackLookAtY = 0.52,
  resetKey,
  onDebug,
}) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  const retryRef = useRef(0);

  useEffect(() => {
    doneRef.current = false;
    retryRef.current = 0;
  }, [resetKey, padding, fallbackLookAtY]);

  useFrame(() => {
    if (doneRef.current) return;

    const obj = targetRef.current;
    if (!obj) return;

    // 先算 bbox
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // bbox 還沒 ready
    if (!isFinite(size.y) || size.y < 0.001) {
      retryRef.current += 1;
      if (retryRef.current > 300) doneRef.current = true;
      return;
    }

    // --- 1) 水平置中（x/z）用 bbox center OK ---
    obj.position.x -= center.x;
    obj.position.z -= center.z;

    // --- 2) 腳貼地：把 minY 拉到 0 ---
    const box2 = new THREE.Box3().setFromObject(obj);
    const minY = box2.min.y;
    obj.position.y -= minY;

    // --- 3) 重新取得最終 bbox（用來算相機距離與 debug）---
    const boxF = new THREE.Box3().setFromObject(obj);
    const sizeF = new THREE.Vector3();
    const centerF = new THREE.Vector3();
    boxF.getSize(sizeF);
    boxF.getCenter(centerF);

    const h = Math.max(0.0001, sizeF.y);

    // --- 4) 嘗試找 hipsY（更準的「人身中心」）---
    let hipsY = null;
    obj.updateWorldMatrix(true, true);
    obj.traverse((o) => {
      const n = (o.name || "").toLowerCase();
      // 很多 VRM 都會有 hips 或 J_Bip_C_Hips / hips
      if (!hipsY && (n === "hips" || n.includes("hips"))) {
        const p = new THREE.Vector3();
        o.getWorldPosition(p);
        hipsY = p.y;
      }
    });

    // 你要看的「中心點」資料
    const maxY = boxF.max.y;
    const centerY = centerF.y;

    // --- 5) 用 FOV 算距離（看得到全身）---
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (h * padding) / (2 * Math.tan(fov / 2));

    // --- 6) 相機位置：正前方 + 微抬高 ---
    // 這裡不把相機 y 設太高，因為 lookAt 會決定視線落點
    camera.position.set(0, h * 0.55, dist);

    camera.near = Math.max(0.01, dist / 120);
    camera.far = dist * 80;
    camera.updateProjectionMatrix();

    // --- 7) lookAt：優先 hipsY，沒有就用 fallbackLookAtY ---
    const targetY = hipsY ?? (h * fallbackLookAtY);
    camera.lookAt(0, targetY, 0);

    // debug 回傳
    onDebug?.({
      minY: 0, // 已貼地後，理論上是 0（保留欄位）
      rawMinY: box2.min.y,
      maxY,
      height: h,
      centerY,
      hipsY,
      camZ: camera.position.z,
      padding,
      lookAtY: fallbackLookAtY,
      targetY,
    });

    doneRef.current = true;
  });

  return null;
}

export default function AvatarStage({ variant = "sky", emotion = "idle", previewYaw = 0 }) {
  const camera = useMemo(() => ({ position: [0, 1.4, 2.2], fov: 35 }), []);
  const modelRoot = useRef();

  // ✅ 你要「看更大 / 不切腳」優先調這兩個：
  const [padding, setPadding] = useState(1.28); // 越大越容易完整看到全身（但會變小）
  const [lookAtY, setLookAtY] = useState(0.52); // 視線落點（越大越往上看，腳比較不會被切）

  // ✅ 一鍵置中：換 key 讓 AutoFrame 重新計算
  const [resetKey, setResetKey] = useState(0);

  // Debug panel
  const [dbg, setDbg] = useState(null);

  const recenter = useCallback(() => {
    setResetKey((k) => k + 1);
  }, []);

  return (
    <div className="w-full h-full relative">
      {/* 右上角 Debug + 置中 */}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-2 items-end">
        <button
          onClick={recenter}
          className="px-3 py-1 rounded-full bg-white/10 text-white text-xs border border-white/15"
        >
          置中
        </button>

        {/* Debug 面板（你要更乾淨可以整段刪掉） */}
        <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-[11px] text-white/70 leading-4 w-[220px]">
          <div className="text-white/80 mb-1">Debug</div>
          {dbg ? (
            <>
              <div>rawMinY: {Number(dbg.rawMinY).toFixed(3)}</div>
              <div>maxY: {Number(dbg.maxY).toFixed(3)}</div>
              <div>height: {Number(dbg.height).toFixed(3)}</div>
              <div>centerY: {Number(dbg.centerY).toFixed(3)}</div>
              <div>hipsY: {dbg.hipsY == null ? "null" : Number(dbg.hipsY).toFixed(3)}</div>
              <div>targetY: {Number(dbg.targetY).toFixed(3)}</div>
              <div>camZ: {Number(dbg.camZ).toFixed(3)}</div>
              <div>padding: {Number(dbg.padding).toFixed(2)}</div>
              <div>lookAtY: {Number(dbg.lookAtY).toFixed(2)}</div>
            </>
          ) : (
            <div className="text-white/50">等待模型 bbox...</div>
          )}
        </div>

        {/* 兩個快速微調（你想要可以留，不想要就刪） */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setPadding((p) => Math.min(1.6, +(p + 0.06).toFixed(2)));
              setResetKey((k) => k + 1);
            }}
            className="px-2 py-1 rounded-lg bg-white/10 text-white text-xs border border-white/15"
          >
            看更全
          </button>
          <button
            onClick={() => {
              setLookAtY((y) => Math.min(0.7, +(y + 0.03).toFixed(2)));
              setResetKey((k) => k + 1);
            }}
            className="px-2 py-1 rounded-lg bg-white/10 text-white text-xs border border-white/15"
          >
            視線↑
          </button>
        </div>
      </div>

      <StageErrorBoundary>
        <Canvas camera={camera} gl={{ alpha: true, antialias: true }} style={{ background: "transparent" }}>
          {/* 光 */}
          <ambientLight intensity={0.85} />
          <directionalLight position={[3, 6, 4]} intensity={1.2} />
          <directionalLight position={[-3, 2, -2]} intensity={0.6} />

          <Suspense fallback={null}>
            <group ref={modelRoot}>
              <Avatar3D variant={variant} emotion={emotion} previewYaw={previewYaw} />
            </group>

            <AutoFrame
              targetRef={modelRoot}
              padding={padding}
              fallbackLookAtY={lookAtY}
              resetKey={resetKey}
              onDebug={setDbg}
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
