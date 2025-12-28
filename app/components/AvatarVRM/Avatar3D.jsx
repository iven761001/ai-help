// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * 穩定保底 VRM Loader
 * - 固定載入：/vrm/avatar.vrm
 * - 有 loading / error UI
 * - 不成功也不黑畫面
 *
 * 依賴套件：
 *   three
 *   @react-three/fiber
 *   @react-three/drei
 *   @pixiv/three-vrm
 */
export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,
  url = "/vrm/avatar.vrm"
}) {
  const groupRef = useRef(null);
  const vrmRef = useRef(null);

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [progress, setProgress] = useState(0);
  const [errMsg, setErrMsg] = useState("");

  // 不同主題色（可用來打光/材質微調）
  const tint = useMemo(() => {
    if (variant === "mint") return [0.55, 1.0, 0.82];
    if (variant === "purple") return [0.86, 0.70, 1.0];
    return [0.65, 0.86, 1.0];
  }, [variant]);

  // ---- Load VRM once (or when url changes) ----
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setProgress(0);
      setErrMsg("");

      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const { VRMLoaderPlugin, VRMUtils } = await import("@pixiv/three-vrm");

        if (cancelled) return;

        const loader = new GLTFLoader();

        // VRM plugin
        loader.register((parser) => new VRMLoaderPlugin(parser));

        loader.load(
          url,
          (gltf) => {
            if (cancelled) return;

            // 清理舊的
            if (vrmRef.current?.scene && groupRef.current) {
              groupRef.current.remove(vrmRef.current.scene);
            }
            if (vrmRef.current) {
              try {
                vrmRef.current.dispose();
              } catch {}
              vrmRef.current = null;
            }

            // gltf -> vrm
            const vrm = gltf.userData.vrm;
            if (!vrm) {
              setStatus("error");
              setErrMsg("VRM 解析失敗：gltf.userData.vrm 不存在（檔案可能不是 VRM）");
              return;
            }

            // 建議的優化/修正（很重要：避免奇怪朝向、骨架、材質）
            try {
              VRMUtils.removeUnnecessaryVertices(gltf.scene);
              VRMUtils.removeUnnecessaryJoints(gltf.scene);
            } catch {}

            // 讓材質比較穩、避免透明排序問題造成黑黑的
            vrm.scene.traverse((obj) => {
              if (!obj.isMesh) return;
              obj.frustumCulled = false;
              if (obj.material) {
                // 某些 VRM 材質在 R3F 下可能會出現怪怪的透明/深度問題
                obj.material.depthWrite = true;
                obj.material.depthTest = true;
              }
            });

            // 尺寸/位置調整：把角色放在舞台中心
            vrm.scene.rotation.y = Math.PI; // 正面朝向鏡頭（看模型而定，這個最常見需要）
            vrm.scene.position.set(0, 0, 0);

            // 加入場景
            if (groupRef.current) {
              groupRef.current.add(vrm.scene);
            }

            vrmRef.current = vrm;

            setStatus("ready");
            setProgress(100);

            // 給你 Debug 用：你可以在手機看不到 console 時，至少知道載入成功
            // （若你有開 console，也會看到）
            // eslint-disable-next-line no-console
            console.log("[VRM] loaded:", url, vrm);
          },
          (evt) => {
            if (cancelled) return;
            if (!evt?.total) return;
            const p = Math.round((evt.loaded / evt.total) * 100);
            setProgress(p);
          },
          (err) => {
            if (cancelled) return;
            setStatus("error");
            setErrMsg(err?.message || "VRM 載入失敗（請確認檔案路徑 / 套件安裝 / VRM 格式）");
            // eslint-disable-next-line no-console
            console.error("[VRM] load error:", err);
          }
        );
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setErrMsg(e?.message || "載入器初始化失敗（可能缺少 @pixiv/three-vrm 或 three）");
        // eslint-disable-next-line no-console
        console.error("[VRM] init error:", e);
      }
    }

    load();

    return () => {
      cancelled = true;
      // 卸載清理：避免 hot reload 堆疊
      try {
        if (vrmRef.current?.scene && groupRef.current) {
          groupRef.current.remove(vrmRef.current.scene);
        }
        vrmRef.current?.dispose?.();
      } catch {}
      vrmRef.current = null;
    };
  }, [url]);

  // ---- Animation loop ----
  useFrame((state, delta) => {
    // 讓 VRM 的內部 update 跑起來（很重要）
    if (vrmRef.current) {
      try {
        vrmRef.current.update(delta);
      } catch {}
    }

    // 預覽旋轉：整個角色轉
    if (groupRef.current) {
      groupRef.current.rotation.y = previewYaw || 0;
    }

    // 情緒（保底：先用簡單的上下浮動）
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      const amp = emotion === "thinking" ? 0.03 : emotion === "happy" ? 0.06 : 0.02;
      const spd = emotion === "happy" ? 2.4 : emotion === "thinking" ? 1.6 : 1.0;
      groupRef.current.position.y = Math.sin(t * spd) * amp;
    }
  });

  // ---- UI Overlay (won't cause black screen) ----
  return (
    <group ref={groupRef}>
      {/* 若 VRM 還沒 ready，用簡單幾何體當保底，避免全黑 */}
      {status !== "ready" && (
        <FallbackDude tint={tint} status={status} progress={progress} errMsg={errMsg} />
      )}
    </group>
  );
}

/**
 * 保底模型：就算 VRM 壞掉也會看到東西
 * 這個是 three primitive，不依賴任何外部資源
 */
function FallbackDude({ tint, status, progress, errMsg }) {
  // tint: [r,g,b] 0~1
  const color = `rgb(${Math.floor(tint[0] * 255)} ${Math.floor(tint[1] * 255)} ${Math.floor(
    tint[2] * 255
  )})`;

  return (
    <group position={[0, -0.25, 0]}>
      {/* body */}
      <mesh position={[0, 0.2, 0]}>
        <capsuleGeometry args={[0.42, 0.7, 8, 16]} />
        <meshStandardMaterial color={color} transparent opacity={0.75} metalness={0.0} roughness={0.2} />
      </mesh>

      {/* head */}
      <mesh position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.35, 18, 18]} />
        <meshStandardMaterial color={color} transparent opacity={0.78} metalness={0.0} roughness={0.18} />
      </mesh>

      {/* status label (用 drei Html 會需要 @react-three/drei；你有裝所以可用) */}
      <StatusBillboard status={status} progress={progress} errMsg={errMsg} />
    </group>
  );
}

function StatusBillboard({ status, progress, errMsg }) {
  // 不用 drei Html，避免又引入依賴；直接用簡單平面材質顯示「條紋」當作狀態提示
  // 你要更漂亮我再幫你換 Html
  const text =
    status === "loading" ? `Loading VRM… ${progress}%` : status === "error" ? `VRM Error: ${errMsg}` : "";

  return (
    <group position={[0, 1.55, 0]}>
      <mesh>
        <planeGeometry args={[2.2, 0.45]} />
        <meshBasicMaterial color="black" transparent opacity={0.35} />
      </mesh>

      {/* 用簡單方式顯示文字：三條白線當提示（手機看得到就好） */}
      {status === "loading" && (
        <>
          <mesh position={[-0.7, 0, 0.01]}>
            <planeGeometry args={[0.55, 0.06]} />
            <meshBasicMaterial color="white" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[0.55, 0.06]} />
            <meshBasicMaterial color="white" transparent opacity={0.65} />
          </mesh>
          <mesh position={[0.7, 0, 0.01]}>
            <planeGeometry args={[0.55, 0.06]} />
            <meshBasicMaterial color="white" transparent opacity={0.45} />
          </mesh>
        </>
      )}

      {status === "error" && (
        <>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[1.6, 0.06]} />
            <meshBasicMaterial color="red" transparent opacity={0.85} />
          </mesh>
        </>
      )}

      {/* 你要真的顯示文字我再幫你加 Html（先確保不黑畫面） */}
      {/* text: {text} */}
    </group>
  );
}
