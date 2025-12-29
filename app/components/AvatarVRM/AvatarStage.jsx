"use client";

import React, { Suspense, useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Avatar3D from "./Avatar3D";

/**
 * 舞台規則（固定）：
 * - 舞台正中間 = (0, 0, 0)
 * - 地面高度   = y = 0
 * - 角色的「跑位」只改 modelRoot.position（不要再用 bbox 自動置中）
 */

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

/** 內部控制器：統一相機 lookAt + 角色跳躍更新 */
function WorldController({
  modelRoot,
  lookAtY = 0.9,
  camZ = 3.85,
  camY = 1.35,
  exposeApi, // (api) => void
}) {
  const { camera } = useThree();

  // 跳躍簡單物理
  const velY = useRef(0);
  const jumping = useRef(false);

  // 角色位置（世界座標）
  const posRef = useRef(new THREE.Vector3(0, 0, 0));

  // 對外 API（可選）
  useEffect(() => {
    if (!exposeApi) return;

    const api = {
      /** 一鍵回正中間 */
      reset: () => {
        posRef.current.set(0, 0, 0);
        velY.current = 0;
        jumping.current = false;
      },
      /** 平面跑位：x / z（y 仍由跳躍或 setPosition 控制） */
      moveTo: (x, z) => {
        posRef.current.x = Number(x) || 0;
        posRef.current.z = Number(z) || 0;
      },
      /** 直接設定位置 */
      setPosition: (x, y, z) => {
        posRef.current.set(Number(x) || 0, Number(y) || 0, Number(z) || 0);
      },
      /** 跳一下（y 方向） */
      jump: (power = 1.6) => {
        if (jumping.current) return;
        jumping.current = true;
        velY.current = power; // 初速
      },
      /** 直接設相機 */
      setCamera: ({ y, z } = {}) => {
        if (typeof y === "number") camera.position.y = y;
        if (typeof z === "number") camera.position.z = z;
        camera.updateProjectionMatrix();
      },
      /** 取得目前位置 */
      getPosition: () => posRef.current.clone(),
    };

    exposeApi(api);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exposeApi]);

  // 初始化相機（只做一次）
  useEffect(() => {
    camera.position.set(0, camY, camZ);
    camera.lookAt(0, lookAtY, 0);
    camera.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const root = modelRoot.current;
    if (!root) return;

    // --- 跳躍更新 ---
    if (jumping.current) {
      // 重力
      velY.current += -9.8 * delta;
      posRef.current.y += velY.current * delta;

      // 落地
      if (posRef.current.y <= 0) {
        posRef.current.y = 0;
        velY.current = 0;
        jumping.current = false;
      }
    }

    // 套用位置到模型（舞台座標）
    root.position.copy(posRef.current);

    // 相機永遠看舞台中心（或你要的固定視線高度）
    camera.lookAt(0, lookAtY, 0);
  });

  return null;
}

export default function AvatarStage({
  vrmid   = "C1",
  variant = "sky",
  emotion = "idle",
  action  = "idle",
  previewYaw = 0,

  /** 你之後換成 /vrm/<id>.vrm：把 id 從 page 傳進來即可 */
  vrmId = "avatar",

  /** 相機與視線（先固定，避免 bbox 影響切腳） */
  lookAtY = 0.9,
  camZ = 3.85,
  camY = 1.35,
}) {
  const modelRoot = useRef();

  // 讓外部（或你自己）拿到 API（可選）
  const apiRef = useRef(null);

  // 右上角 UI 顯示與 debug
  const [dbg, setDbg] = useState({ x: 0, y: 0, z: 0 });

  // 把 API 存起來
  const exposeApi = (api) => {
    apiRef.current = api;
  };

  // 每 200ms 把位置丟到 debug（可關）
  useEffect(() => {
    const t = setInterval(() => {
      const p = apiRef.current?.getPosition?.();
      if (!p) return;
      setDbg({ x: p.x, y: p.y, z: p.z });
    }, 200);
    return () => clearInterval(t);
  }, []);

  const camera = useMemo(() => ({ position: [0, camY, camZ], fov: 35 }), [camY, camZ]);

  return (
    <div className="w-full h-full relative">
      {/* 右上控制按鈕 */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        <button
          className="px-3 py-2 rounded-full bg-white/10 text-white text-xs border border-white/15 active:scale-95"
          onClick={() => apiRef.current?.reset?.()}
        >
          置中
        </button>

        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-full bg-white/10 text-white text-xs border border-white/15 active:scale-95"
            onClick={() => {
              const p = apiRef.current?.getPosition?.();
              apiRef.current?.moveTo?.((p?.x ?? 0) - 0.35, p?.z ?? 0);
            }}
          >
            ←
          </button>
          <button
            className="px-3 py-2 rounded-full bg-white/10 text-white text-xs border border-white/15 active:scale-95"
            onClick={() => {
              const p = apiRef.current?.getPosition?.();
              apiRef.current?.moveTo?.((p?.x ?? 0) + 0.35, p?.z ?? 0);
            }}
          >
            →
          </button>
        </div>

        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-full bg-white/10 text-white text-xs border border-white/15 active:scale-95"
            onClick={() => {
              const p = apiRef.current?.getPosition?.();
              apiRef.current?.moveTo?.(p?.x ?? 0, (p?.z ?? 0) - 0.35);
            }}
          >
            前
          </button>
          <button
            className="px-3 py-2 rounded-full bg-white/10 text-white text-xs border border-white/15 active:scale-95"
            onClick={() => {
              const p = apiRef.current?.getPosition?.();
              apiRef.current?.moveTo?.(p?.x ?? 0, (p?.z ?? 0) + 0.35);
            }}
          >
            後
          </button>
        </div>

        <button
          className="px-3 py-2 rounded-full bg-white/10 text-white text-xs border border-white/15 active:scale-95"
          onClick={() => apiRef.current?.jump?.(1.7)}
        >
          跳
        </button>

        {/* 小小 debug：看目前位置 */}
        <div className="px-3 py-2 rounded-2xl bg-black/40 text-white/80 text-[11px] border border-white/10">
          pos: {dbg.x.toFixed(2)}, {dbg.y.toFixed(2)}, {dbg.z.toFixed(2)}
        </div>
      </div>

      <StageErrorBoundary>
        <Canvas
          camera={camera}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          {/* 光（先固定，不搞材質改色，避免紅幕問題） */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 6, 4]} intensity={1.2} />
          <directionalLight position={[-3, 2, -2]} intensity={0.6} />

          <Suspense fallback={null}>
            <group ref={modelRoot}>
              {/* 你之後換成 /vrm/<id>.vrm：在 Avatar3D 把 URL 改成用 vrmId 組 */}
              <Avatar3D
                variant={variant}
                emotion={emotion}
                previewYaw={previewYaw}
                action={action}
                vrmId={vrmId}
              />
            </group>

            <WorldController
              modelRoot={modelRoot}
              lookAtY={lookAtY}
              camZ={camZ}
              camY={camY}
              exposeApi={exposeApi}
            />
          </Suspense>

          {/* 禁用手勢避免誤觸 */}
          <OrbitControls enabled={false} enableZoom={false} enablePan={false} />
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}
