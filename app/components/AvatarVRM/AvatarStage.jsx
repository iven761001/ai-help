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
 * ✅ 舞台「正中間」定義：
 * - 地板中心： (0, 0, 0)
 * - 角色站立點：通常用 hips / root 放在 (0, 0, 0)
 *
 * 這個元件做兩件事：
 * 1) 把 modelRoot 置中到 (0,0,0) 並把腳貼地
 * 2) 用相機自動 frame 讓模型完整進畫面（可調 padding）
 */
function AutoNormalizeAndFrame({ targetRef, padding = 1.15, yOffset = 0 }) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  const retryRef = useRef(0);

  useFrame(() => {
    if (doneRef.current) return;
    const obj = targetRef.current;
    if (!obj) return;

    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    if (!isFinite(size.y) || size.y < 0.001) {
      retryRef.current += 1;
      if (retryRef.current > 300) doneRef.current = true;
      return;
    }

    // 1) 水平置中到 x/z = 0
    obj.position.x -= center.x;
    obj.position.z -= center.z;

    // 2) 腳貼地：最低點到 y=0
    const box2 = new THREE.Box3().setFromObject(obj);
    const minY = box2.min.y;
    obj.position.y -= minY;

    // 3) 額外微調（你可以用它控制角色在舞台裡更上/更下）
    obj.position.y += yOffset;

    // 4) 重新計算 bbox，算相機距離
    const box3 = new THREE.Box3().setFromObject(obj);
    const size3 = new THREE.Vector3();
    const center3 = new THREE.Vector3();
    box3.getSize(size3);
    box3.getCenter(center3);

    const height = Math.max(0.0001, size3.y);
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (height * padding) / (2 * Math.tan(fov / 2));

    camera.position.set(center3.x, center3.y + height * 0.08, center3.z + dist);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 50;
    camera.updateProjectionMatrix();
    camera.lookAt(center3);

    doneRef.current = true;
  });

  useEffect(() => {
    doneRef.current = false;
    retryRef.current = 0;
  }, [padding, yOffset]);

  return null;
}

export default function AvatarStage({ variant = "sky", emotion = "idle", previewYaw = 0 }) {
  const camera = useMemo(() => ({ position: [0, 1.4, 2.2], fov: 35 }), []);
  const modelRoot = useRef();

  // ✅ padding 越小 -> 角色越大（鏡頭更靠近）
  const [padding] = useState(1.12);

  // ✅ 角色在舞台的上下微調：正值會「整體上移」一點點
  // 你現在覺得腳掉出去，通常把它調成 0.02 ~ 0.08 會更舒服
  const [yOffset] = useState(0.05);

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
            <group ref={modelRoot}>
              <Avatar3D variant={variant} emotion={emotion} previewYaw={previewYaw} />
            </group>

            <AutoNormalizeAndFrame targetRef={modelRoot} padding={padding} yOffset={yOffset} />

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
