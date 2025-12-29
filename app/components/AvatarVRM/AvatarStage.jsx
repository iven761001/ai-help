// app/components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import Avatar3D from "./Avatar3D";

/** ❌ 不讓 3D 錯誤炸整頁 */
class StageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center text-white/60 text-xs">
          3D 舞台載入失敗（不影響其他功能）
        </div>
      );
    }
    return this.props.children;
  }
}

/** ✅ 模型一換就「回舞台正中」 */
function AutoFrame({ targetRef, modelKey, padding = 1.15, yLift = 0.06 }) {
  const { camera } = useThree();
  const doneRef = useRef(false);

  useEffect(() => {
    // 👈 模型 key 改變時，強制重來
    doneRef.current = false;
  }, [modelKey]);

  useFrame(() => {
    if (doneRef.current) return;
    const obj = targetRef.current;
    if (!obj) return;

    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    if (!isFinite(size.y) || size.y < 0.001) return;

    // 1️⃣ 水平置中
    obj.position.x -= center.x;
    obj.position.z -= center.z;

    // 2️⃣ 腳貼地
    const minY = box.min.y;
    obj.position.y -= minY;

    // 3️⃣ 相機距離（完整看到全身）
    const height = size.y;
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (height * padding) / (2 * Math.tan(fov / 2));

    camera.position.set(0, height * 0.5 + yLift * height, dist);
    camera.near = dist / 100;
    camera.far = dist * 50;
    camera.updateProjectionMatrix();
    camera.lookAt(0, height * 0.5, 0);

    doneRef.current = true;
  });

  return null;
}

export default function AvatarStage({
  modelId,            // ⭐ 關鍵：模型 id
  variant = "sky",
  emotion = "idle",
  previewYaw = 0
}) {
  const camera = useMemo(() => ({ fov: 35, position: [0, 1.4, 2.2] }), []);
  const modelRoot = useRef();

  return (
    <div className="w-full h-full">
      <StageErrorBoundary>
        <Canvas
          camera={camera}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          {/* 光源 */}
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

            {/* ⭐ 核心：模型一換就重置 */}
            <AutoFrame targetRef={modelRoot} modelKey={modelId} />

            <ContactShadows
              opacity={0.35}
              scale={6}
              blur={2.5}
              far={10}
              position={[0, 0, 0]}
            />
          </Suspense>

          <OrbitControls enabled={false} />
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
