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
 * ✅ 穩定版 Auto Normalize + Auto Frame
 * - 不用 -=（避免累積偏移）
 * - 每次重算都先 reset position
 * - 等 bbox 有尺寸才做（避免手機上 mesh 還沒進來）
 */
function AutoNormalizeAndFrame({
  targetRef,
  padding = 1.12,   // 越小越放大（建議 1.05~1.25）
  yBias = 0.06,     // 鏡頭看向點微調（0~0.12）
  doneOnce = true,  // true：算一次就停；false：每幀跟著（通常不需要）
}) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  const retryRef = useRef(0);

  useFrame(() => {
    if (doneOnce && doneRef.current) return;

    const obj = targetRef.current;
    if (!obj) return;

    // 先用目前狀態算 bbox
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // bbox 還沒準備好就先等
    if (!isFinite(size.y) || size.y < 0.001) {
      retryRef.current += 1;
      if (retryRef.current > 300) doneRef.current = true;
      return;
    }

    // ✅ 1) reset（避免累積）
    obj.position.set(0, 0, 0);

    // ✅ 2) 重新算 bbox（reset後再算一次更乾淨）
    const box2 = new THREE.Box3().setFromObject(obj);
    const size2 = new THREE.Vector3();
    const center2 = new THREE.Vector3();
    box2.getSize(size2);
    box2.getCenter(center2);

    // ✅ 3) 水平置中（x/z）
    // 直接 set，避免 -= 累積
    obj.position.x = -center2.x;
    obj.position.z = -center2.z;

    // ✅ 4) 腳貼地：把最低點抬到 y=0
    const box3 = new THREE.Box3().setFromObject(obj);
    obj.position.y = -box3.min.y;

    // ✅ 5) 最終 bbox（拿來算相機）
    const box4 = new THREE.Box3().setFromObject(obj);
    const size4 = new THREE.Vector3();
    const center4 = new THREE.Vector3();
    box4.getSize(size4);
    box4.getCenter(center4);

    const height = Math.max(0.0001, size4.y);

    // ✅ 用 FOV 算距離：讓整身完整進畫面
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (height * padding) / (2 * Math.tan(fov / 2));

    // ✅ 相機位置：正前方 + 微抬高
    camera.position.set(center4.x, center4.y + height * yBias, center4.z + dist);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 50;
    camera.updateProjectionMatrix();
    camera.lookAt(center4);

    doneRef.current = true;
  });

  useEffect(() => {
    // padding / yBias 改了就允許重算一次
    doneRef.current = false;
    retryRef.current = 0;
  }, [padding, yBias]);

  return null;
}

export default function AvatarStage({ variant = "sky", emotion = "idle", previewYaw = 0 }) {
  const camera = useMemo(() => ({ position: [0, 1.4, 2.2], fov: 35 }), []);
  const modelRoot = useRef(null);
  const normalized = useRef(null);

  // 你要放大縮小：改 padding
  // 越小越大（1.05 很近、1.2 比較保守）
  const [padding] = useState(1.10);

  return (
    <div className="w-full h-full">
      <StageErrorBoundary>
        <Canvas
          camera={camera}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 6, 4]} intensity={1.2} />
          <directionalLight position={[-3, 2, -2]} intensity={0.6} />

          <Suspense fallback={null}>
            {/* modelRoot 不動，normalized 專門做置中/貼地 */}
            <group ref={modelRoot}>
              <group ref={normalized}>
                <Avatar3D variant={variant} emotion={emotion} previewYaw={previewYaw} />
              </group>
            </group>

            {/* ✅ 對 normalized 做 auto normalize + auto frame */}
            <AutoNormalizeAndFrame targetRef={normalized} padding={padding} yBias={0.06} />

            <ContactShadows
              opacity={0.35}
              scale={6}
              blur={2.2}
              far={10}
              resolution={256}
              position={[0, -0.001, 0]} // 貼地更自然，避免 z-fighting
            />
          </Suspense>

          <OrbitControls enabled={false} enableZoom={false} enablePan={false} />
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
