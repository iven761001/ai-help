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

/** ✅ 等模型真的「有尺寸」後才置中與對焦（會自動重試） */
function AutoNormalizeAndFrame({ targetRef, padding = 1.15 }) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  const retryRef = useRef(0);

  useFrame(() => {
    if (doneRef.current) return;
    const obj = targetRef.current;
    if (!obj) return;

    // 算 bbox
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // ✅ bbox 還沒好（高度太小 / NaN）就先不要做
    if (!isFinite(size.y) || size.y < 0.001) {
      retryRef.current += 1;
      // 避免永遠卡住：重試很久還不行就停（但通常 1~30 frame 就好了）
      if (retryRef.current > 300) doneRef.current = true;
      return;
    }

    // --- 1) 先把模型「水平置中」(x/z) ---
    obj.position.x -= center.x;
    obj.position.z -= center.z;

    // --- 2) 腳貼地：把最低點抬到 y=0 ---
    // 重新算一次（因為剛移動了）
    const box2 = new THREE.Box3().setFromObject(obj);
    const minY = box2.min.y;
    obj.position.y -= minY; // minY -> 0

    // 再算一次最終 bbox (用來算相機距離)
    const box3 = new THREE.Box3().setFromObject(obj);
    const size3 = new THREE.Vector3();
    const center3 = new THREE.Vector3();
    box3.getSize(size3);
    box3.getCenter(center3);

    const height = Math.max(0.0001, size3.y);

    // --- 3) 用 FOV 算出能完整看到全身的距離 ---
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (height * padding) / (2 * Math.tan(fov / 2));

    // --- 4) 相機放正前方 + 微微抬高看中間 ---
    camera.position.set(center3.x, center3.y + height * 0.08, center3.z + dist);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 50;
    camera.updateProjectionMatrix();
    camera.lookAt(center3);

    doneRef.current = true;
  });

  // padding 改變時，允許重新 framing
  useEffect(() => {
    doneRef.current = false;
    retryRef.current = 0;
  }, [padding]);

  return null;
}

export default function AvatarStage({ variant = "sky", emotion = "idle", previewYaw = 0 }) {
  const camera = useMemo(() => ({ position: [0, 1.4, 2.2], fov: 35 }), []);
  const modelRoot = useRef();

  // ✅ 你想放大/縮小就改這個（越小越大）
  const [padding] = useState(1.12);

  return (
    <div className="w-full h-full">
      <StageErrorBoundary>
        <Canvas
          camera={camera}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          {/* 光 */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 6, 4]} intensity={1.2} />
          <directionalLight position={[-3, 2, -2]} intensity={0.6} />

          <Suspense fallback={null}>
            <group ref={modelRoot}>
              <Avatar3D variant={variant} emotion={emotion} previewYaw={previewYaw} />
            </group>

            {/* ✅ 先置中 + 腳貼地，再自動對焦 */}
            <AutoNormalizeAndFrame targetRef={modelRoot} padding={padding} />

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
