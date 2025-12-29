"use client";

import React, { Suspense, useMemo, useRef, useEffect, useState } from "react";
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
 * ✅ 置中 + 腳貼地 + 自動對焦（考慮 aspect，避免切腳）
 * - modelKey 改變時會重算（換模型 or 按「置中」按鈕）
 */
function AutoFrame({ targetRef, modelKey, padding = 1.22, lookAtY = 0.48 }) {
  const { camera, size } = useThree();
  const doneRef = useRef(false);
  const retryRef = useRef(0);

  useEffect(() => {
    doneRef.current = false;
    retryRef.current = 0;
  }, [modelKey, padding, lookAtY]);

  useFrame(() => {
    if (doneRef.current) return;
    const obj = targetRef.current;
    if (!obj) return;

    // 1) bbox
    const box = new THREE.Box3().setFromObject(obj);
    const size3 = new THREE.Vector3();
    const center3 = new THREE.Vector3();
    box.getSize(size3);
    box.getCenter(center3);

    if (!isFinite(size3.y) || size3.y < 0.001) {
      retryRef.current += 1;
      if (retryRef.current > 240) doneRef.current = true; // 避免永遠卡
      return;
    }

    // 2) 水平置中 (x/z)
    obj.position.x -= center3.x;
    obj.position.z -= center3.z;

    // 3) 腳貼地：minY -> 0
    const box2 = new THREE.Box3().setFromObject(obj);
    obj.position.y -= box2.min.y;

    // 4) 最終 bbox（用來算相機）
    const boxF = new THREE.Box3().setFromObject(obj);
    const finalSize = new THREE.Vector3();
    const finalCenter = new THREE.Vector3();
    boxF.getSize(finalSize);
    boxF.getCenter(finalCenter);

    const h = Math.max(0.0001, finalSize.y);

    // 5) 用 aspect 修正：確保「上下」跟「左右」都塞得下
    const aspect = size.width / Math.max(1, size.height);
    const fov = (camera.fov * Math.PI) / 180;

    // 在垂直 FOV 下，若畫面很寬，左右會更容易被裁，因此用 width/aspect 參與計算
    const fitH = h;
    const fitW = finalSize.x / Math.max(0.0001, aspect);
    const fit = Math.max(fitH, fitW) * padding;

    const dist = fit / (2 * Math.tan(fov / 2));

    // 6) 相機位置：稍微往上，但 lookAt 會偏低一點（保腳）
    const camY = h * 0.55;
    const targetY = h * lookAtY; // 越小越偏下（更保腳）

    camera.position.set(0, camY, dist);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 50;
    camera.updateProjectionMatrix();
    camera.lookAt(0, targetY, 0);

    doneRef.current = true;
  });

  return null;
}

export default function AvatarStage({
  modelId,
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,
}) {
  const camera = useMemo(() => ({ fov: 35, position: [0, 1.4, 2.2] }), []);
  const modelRoot = useRef(null);

  // ✅ 一鍵置中：按一下就讓 AutoFrame 重新跑
  const [reframeTick, setReframeTick] = useState(0);
  const modelKey = `${modelId || "default"}:${reframeTick}`;

  return (
    <div className="w-full h-full relative">
      {/* ✅ 右上角：一鍵置中按鈕（你要的） */}
      <button
        type="button"
        onClick={() => setReframeTick((n) => n + 1)}
        className="
          absolute right-3 top-3 z-20
          rounded-full px-3 py-2 text-xs
          bg-black/35 text-white
          border border-white/15
          backdrop-blur
          active:scale-95 transition
        "
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        置中
      </button>

      <StageErrorBoundary>
        <Canvas
          camera={camera}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.85} />
          <directionalLight position={[3, 6, 4]} intensity={1.2} />
          <directionalLight position={[-3, 2, -2]} intensity={0.6} />

          <Suspense fallback={null}>
            <group ref={modelRoot}>
              <Avatar3D
                modelId={modelId}
                variant={variant}
                emotion={emotion}
                previewYaw={previewYaw}
              />
            </group>

            {/* ✅ 置中 + 對焦（按「置中」也會重跑） */}
            <AutoFrame
              targetRef={modelRoot}
              modelKey={modelKey}
              padding={1.26}   // 想更完整保腳：再加大到 1.32
              lookAtY={0.46}   // 想更保腳：0.42~0.46；想更看上半身：0.5~0.55
            />

            <ContactShadows
              opacity={0.35}
              scale={6}
              blur={2.6}
              far={10}
              position={[0, 0, 0]}
            />
          </Suspense>

          <OrbitControls enabled={false} enableZoom={false} enablePan={false} />
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
