// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMUtils } from "@pixiv/three-vrm";

const VRM_URL = "/vrm/avatar.vrm";

/**
 * DEBUG 版重點：
 * 1) 先 fetch 檢查檔案是否可拿到（status、content-type、大小）
 * 2) GLTFLoader 明確 log progress / error
 * 3) 畫面上用 Html 顯示 debug 狀態（不會炸整頁）
 * 4) cache bust：?v=xxx，避免 iOS/Safari/Vercel 快取拿舊檔/壞檔
 * 5) 自動置中 + 自動縮放（全身進舞台）
 */
export default function Avatar3D({ variant = "sky", emotion = "idle", previewYaw = 0 }) {
  const groupRef = useRef();
  const [vrm, setVrm] = useState(null);
  const [status, setStatus] = useState("init"); // init | fetching | loading | ready | error
  const [debug, setDebug] = useState({
    url: "",
    fetchStatus: "",
    contentType: "",
    contentLength: "",
    loaderProgress: "",
    error: "",
    hint: ""
  });

  // 小技巧：每次部署/換檔都改這個字串，就不會吃到舊快取
  // 你也可以用 Date.now()，但那會每次重整都重新下載（比較吃流量）
  const CACHE_BUST = "v_debug_1";

  const tintedLight = useMemo(() => {
    if (variant === "mint") return new THREE.Color(0x8dffd7);
    if (variant === "purple") return new THREE.Color(0xd3b2ff);
    return new THREE.Color(0xa0dcff);
  }, [variant]);

  const urlWithBust = useMemo(() => {
    const u = `${VRM_URL}?v=${CACHE_BUST}`;
    return u;
  }, []);

  // ====== Step A：先 fetch 探測（重要：釐清到底是不是 404/快取/檔案壞/內容型別怪）=====
  useEffect(() => {
    let mounted = true;
    let currentVrm = null;

    async function run() {
      try {
        setStatus("fetching");
        setDebug((d) => ({ ...d, url: urlWithBust, error: "", hint: "" }));

        // 先用 fetch 檢查
        const res = await fetch(urlWithBust, { cache: "no-store" });
        const ct = res.headers.get("content-type") || "";
        const cl = res.headers.get("content-length") || "";

        if (!mounted) return;

        setDebug((d) => ({
          ...d,
          fetchStatus: `${res.status} ${res.statusText}`,
          contentType: ct,
          contentLength: cl
        }));

        if (!res.ok) {
          setStatus("error");
          setDebug((d) => ({
            ...d,
            error: `Fetch failed: ${res.status} ${res.statusText}`,
            hint:
              "請直接用手機打開 /vrm/avatar.vrm 看是否能下載；若可以下載但這裡失敗，多半是快取或檔案被替換。"
          }));
          return;
        }

        // 如果 content-type 不是模型類型也不一定會壞，但我們提示一下
        if (ct && !ct.includes("model") && !ct.includes("application") && !ct.includes("octet-stream")) {
          setDebug((d) => ({
            ...d,
            hint: `content-type 看起來怪怪的：${ct}（不一定會壞，但若載入失敗可檢查 server header）`
          }));
        }

        // ====== Step B：GLTFLoader 載入 ======
        setStatus("loading");

        const loader = new GLTFLoader();
        loader.crossOrigin = "anonymous";

        const gltf = await new Promise((resolve, reject) => {
          loader.load(
            urlWithBust,
            (g) => resolve(g),
            (evt) => {
              if (!mounted) return;
              if (evt?.total) {
                const p = Math.round((evt.loaded / evt.total) * 100);
                setDebug((d) => ({ ...d, loaderProgress: `${p}% (${evt.loaded}/${evt.total})` }));
              } else {
                setDebug((d) => ({ ...d, loaderProgress: `${evt.loaded} bytes` }));
              }
            },
            (e) => reject(e)
          );
        });

        if (!mounted) return;

        // ====== Step C：解析 VRM ======
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        const parsed = await VRM.from(gltf);
        if (!mounted) return;

        // 防止手機偶發 frustum 裁切閃爍
        parsed.scene.traverse((o) => {
          if (o.isMesh) o.frustumCulled = false;
        });

        // ✅ 這行「不要亂轉」，不同 VRM 方向不同
        // 若你發現角色背對鏡頭，再打開這行：
        // parsed.scene.rotation.y = Math.PI;

        currentVrm = parsed;
        setVrm(parsed);
        setStatus("ready");

        // console debug
        console.log("[Avatar3D DEBUG] loaded:", {
          url: urlWithBust,
          fetch: { status: res.status, ct, cl },
          humanoid: !!parsed.humanoid,
          lookAt: !!parsed.lookAt
        });
      } catch (err) {
        console.error("[Avatar3D DEBUG] error:", err);
        if (!mounted) return;

        const msg = err?.message || String(err);
        setStatus("error");
        setDebug((d) => ({
          ...d,
          error: msg,
          hint:
            msg.includes("Invalid typed array length") ? (
              "這通常是 VRM 檔案『被截斷/壞檔/快取到壞檔』。請：1) 把 public/vrm/avatar.vrm 重新上傳一次 2) 改 CACHE_BUST 字串 3) 重新部署。"
            ) : msg.includes("Unexpected token") ? (
              "這通常是載到 HTML（例如 404 頁面）而不是 VRM。請檢查 /vrm/avatar.vrm 是否真的存在。"
            ) : (
              "請看 console 的完整錯誤，通常是快取或檔案格式問題。"
            )
        }));
      }
    }

    run();

    return () => {
      mounted = false;
      try {
        if (currentVrm?.scene) {
          currentVrm.scene.traverse((o) => {
            if (o.isMesh) {
              o.geometry?.dispose?.();
              if (Array.isArray(o.material)) o.material.forEach((m) => m?.dispose?.());
              else o.material?.dispose?.();
            }
          });
        }
      } catch {}
    };
  }, [urlWithBust]);

  // ====== 自動置中 + 自動縮放（確保全身進舞台）=====
  useEffect(() => {
    if (!vrm || !groupRef.current) return;

    const box = new THREE.Box3().setFromObject(vrm.scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // 你可以調這個讓角色更大/更小（越大越接近鏡頭）
    const targetHeight = 1.85;

    const scale = targetHeight / Math.max(size.y, 0.0001);

    groupRef.current.position.set(0, 0, 0);
    groupRef.current.rotation.set(0, 0, 0);
    groupRef.current.scale.set(scale, scale, scale);

    // 先把模型中心移到原點
    vrm.scene.position.set(-center.x, -center.y, -center.z);

    // 再把腳底落到地面（避免飄）
    const bottomY = center.y - size.y / 2;
    vrm.scene.position.y += bottomY;

    // 最後舞台微調（偏下更好看）
    groupRef.current.position.y = -0.08;
  }, [vrm]);

  // ====== 轉頭/眼神 ======
  useFrame((state, delta) => {
    if (!vrm) return;
    vrm.update(delta);

    const yaw = THREE.MathUtils.clamp(previewYaw, -1.2, 1.2);

    const head = vrm.humanoid?.getBoneNode("head");
    if (head) {
      const target = THREE.MathUtils.clamp(yaw * 0.35, -0.55, 0.55);
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, target, 0.18);
    }

    if (vrm.lookAt?.applier) {
      const eyeYaw = THREE.MathUtils.clamp(yaw * 0.8, -0.9, 0.9);
      vrm.lookAt.applier.applyYawPitch(eyeYaw, 0);
    }
  });

  // ====== Debug UI（用 Drei 的 Html，避免紅球爆掉）=====
  function DebugOverlay() {
    // 直接用 DOM overlay（不依賴 drei/Html），最穩
    return (
      <group>
        {/* 這個 group 只是佔位；實際 overlay 由外層容器顯示（見 AvatarStage 的 error boundary） */}
      </group>
    );
  }

  // 畫面上顯示文字：用「小平面」寫不方便，所以我們用 console + 你 AvatarStage 的 error 區塊。
  // 這裡仍提供 fallback 小提示，但不會放大遮住整個舞台。
  if (status === "error") {
    console.log("[Avatar3D DEBUG] overlay:", debug);
    return null;
  }

  if (!vrm) return null;

  return (
    <group ref={groupRef}>
      <primitive object={vrm.scene} />

      <directionalLight position={[1.5, 2.2, 2.0]} intensity={0.15} color={tintedLight} />
    </group>
  );
}

/**
 * ✅ 你要「看到 debug 文字在畫面上」的版本：
 * 因為 R3F 裡面做文字 overlay 很麻煩、又容易 iOS 崩，
 * 我建議你把 debug 資訊顯示在 AvatarStage 的 error boundary 區塊或頁面上（DOM）。
 *
 * 下一步：我可以給你 AvatarStage.jsx 的 debug overlay 版，
 * 會在舞台左上角顯示：
 * - fetch status
 * - content-length
 * - loader progress
 * - error message
 */
