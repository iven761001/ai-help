// app/components/AvatarVRM/AvatarStage.jsx
"use client";

import React, { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import Avatar3D from "./Avatar3D";

/**
 * ✅ 目標：
 * - normalizedGroup：只做一次「置中 + 腳貼地 + 相機對焦」
 * - actorGroup：之後角色跑來跑去都改這層（不會再被 normalize 影響）
 * - 一鍵回中：actorGroup.position = (0,0,0)
 */

/** 防止舞台炸掉（不影響其他 UI） */
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
            3D 舞台載入失敗（不影響輸入信箱/聊天）
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
 * ✅ 等模型真的有 bbox 後，做一次：
 * 1) normalizedGroup：水平置中 + 腳貼地
 * 2) 相機自動對焦，能看到全身
 *
 * 注意：這個只會做一次（doneRef），之後不要再動 normalizedGroup，
 * 角色移動請改 actorGroup。
 */
function AutoNormalizeAndFrame({ normalizedRef, actorRef, padding = 1.12 }) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  const retryRef = useRef(0);

  useFrame(() => {
    if (doneRef.current) return;

    const normalized = normalizedRef.current;
    const actor = actorRef.current;
    if (!normalized || !actor) return;

    // bbox 用 actor（因為 VRM primitive 在 actor 裡）
    const box = new THREE.Box3().setFromObject(actor);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // bbox 還沒好就重試
    if (!isFinite(size.y) || size.y < 0.001) {
      retryRef.current += 1;
      if (retryRef.current > 300) doneRef.current = true;
      return;
    }

    // ---- 1) normalized：水平置中 (x,z) ----
    normalized.position.x -= center.x;
    normalized.position.z -= center.z;

    // ---- 2) 腳貼地：讓最低點到 y=0 ----
    const box2 = new THREE.Box3().setFromObject(actor);
    const minY = box2.min.y;
    normalized.position.y -= minY;

    // ---- 3) 再算一次 bbox，做相機距離 ----
    const box3 = new THREE.Box3().setFromObject(actor);
    const size3 = new THREE.Vector3();
    const center3 = new THREE.Vector3();
    box3.getSize(size3);
    box3.getCenter(center3);

    const height = Math.max(0.0001, size3.y);
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (height * padding) / (2 * Math.tan(fov / 2));

    // ---- 4) 相機在正前方 + 微抬高 ----
    camera.position.set(center3.x, center3.y + height * 0.08, center3.z + dist);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 50;
    camera.updateProjectionMatrix();
    camera.lookAt(center3);

    doneRef.current = true;
  });

  // padding 改變時允許重新 framing
  useEffect(() => {
    doneRef.current = false;
    retryRef.current = 0;
  }, [padding]);

  return null;
}

export default function AvatarStage({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,

  /**
   * ✅ 讓父層拿到控制權（可選）
   * 用法：
   * const apiRef = useRef(null)
   * <AvatarStage apiRef={apiRef} />
   * apiRef.current.recenter()
   */
  apiRef,
}) {
  // 你可調：fov 越小越「近」的透視感；position 只是初始值，最後會被 AutoNormalizeAndFrame 接管一次
  const camera = useMemo(() => ({ position: [0, 1.4, 2.2], fov: 35 }), []);

  // ✅ 兩層 group
  const normalizedRef = useRef(null); // 只做一次置中貼地
  const actorRef = useRef(null); // 角色移動、回中、跑跳都動這層

  // ✅ 你要放大/縮小：padding 越小角色越大（1.06~1.18 常用）
  const padding = 1.10;

  // ✅ 對外 API：一鍵回舞台中心
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      recenter: () => {
        const actor = actorRef.current;
        if (!actor) return;
        actor.position.set(0, 0, 0);
        actor.rotation.set(0, 0, 0);
      },
      setPos: (x, y, z) => {
        const actor = actorRef.current;
        if (!actor) return;
        actor.position.set(x, y, z);
      },
      getPos: () => {
        const actor = actorRef.current;
        if (!actor) return null;
        return actor.position.clone();
      },
      // 你之後要跑來跑去可以用這個設速度/狀態（先留接口）
      actorRef,
      normalizedRef,
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef]);

  return (
    <div className="w-full h-full">
      <StageErrorBoundary>
        <Canvas
          camera={camera}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          {/* 光（保守、穩定） */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 6, 4]} intensity={1.2} />
          <directionalLight position={[-3, 2, -2]} intensity={0.6} />

          <Suspense fallback={null}>
            {/* ✅ normalized: 只做一次置中貼地 */}
            <group ref={normalizedRef}>
              {/* ✅ actor: 你之後要移動就改這層 */}
              <group ref={actorRef} position={[0, 0, 0]}>
                <Avatar3D variant={variant} emotion={emotion} previewYaw={previewYaw} />
              </group>
            </group>

            {/* ✅ 只做一次 normalize + framing */}
            <AutoNormalizeAndFrame
              normalizedRef={normalizedRef}
              actorRef={actorRef}
              padding={padding}
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

          {/* 先關掉操作，避免使用者亂拉 */}
          <OrbitControls enabled={false} enableZoom={false} enablePan={false} />
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
```0
