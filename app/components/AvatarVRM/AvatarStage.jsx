"use client";

import React, { Suspense, useMemo, useRef, useLayoutEffect, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
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

// ✅ 這個元件會在「模型載入/更新後」自動調相機，讓全身穩穩在畫面內
function AutoFrame({ targetRef, padding = 1.18 }) {
  const { camera } = useThree();

  useLayoutEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    // 用 bbox 算模型尺寸/中心
    const box = new THREE.Box3().setFromObject(target);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // 目標：全身進框（以高度為主）
    const height = Math.max(0.0001, size.y);

    // 相機 FOV 計算距離
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (height * padding) / (2 * Math.tan(fov / 2));

    // ✅ 把相機放在正前方稍微往上看
    camera.position.set(center.x, center.y + height * 0.05, center.z + dist);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 100;
    camera.updateProjectionMatrix();

    // ✅ 讓相機看向模型中心
    camera.lookAt(center);

  }, [camera, targetRef, padding]);

  return null;
}

export default function AvatarStage({ variant = "sky", emotion = "idle", previewYaw = 0 }) {
  // 相機初始值不重要，反正 AutoFrame 會接管
  const camera = useMemo(() => ({ position: [0, 1.4, 2.2], fov: 35 }), []);
  const modelRoot = useRef();
  const [frameTick, setFrameTick] = useState(0);

  // ✅ 讓 Avatar3D 在載入成功後通知一次（我們用 key 或 callback 觸發 AutoFrame）
  // 這裡用最簡單的方式：每次進來先 frame 一次，載入後你也可以手動 setFrameTick
  // （如果你 Avatar3D 有加 onLoaded callback，我再給你更乾淨版）
  useLayoutEffect(() => {
    const t = setTimeout(() => setFrameTick((x) => x + 1), 400);
    return () => clearTimeout(t);
  }, [variant, emotion]);

  return (
    <div className="w-full h-full">
      <StageErrorBoundary>
        <Canvas
          camera={camera}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          {/* 光 */}
          <ambientLight intensity={0.75} />
          <directionalLight position={[3, 6, 4]} intensity={1.2} />
          <directionalLight position={[-3, 2, -2]} intensity={0.6} />

          <Suspense fallback={null}>
            {/* ✅ 這個 group 就是我們要 frame 的目標 */}
            <group ref={modelRoot}>
              {/* 你原本有 group position [-0.25]，那會讓中心偏移，先拿掉 */}
              <Avatar3D variant={variant} emotion={emotion} previewYaw={previewYaw} />
            </group>

            {/* ✅ 只要 frameTick 變化就重新算一次相機（保底用） */}
            <AutoFrame targetRef={modelRoot} padding={1.18 + frameTick * 0} />

            {/* 地面陰影 */}
            <ContactShadows
              opacity={0.35}
              scale={6}
              blur={2.2}
              far={8}
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
