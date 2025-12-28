// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMUtils } from "@pixiv/three-vrm";

const VRM_URL = "/vrm/avatar.vrm";

export default function Avatar3D({ variant = "sky", emotion = "idle", previewYaw = 0 }) {
  const groupRef = useRef();
  const vrmRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const tint = useMemo(() => {
    if (variant === "mint") return new THREE.Color(0x8dffd7);
    if (variant === "purple") return new THREE.Color(0xd3b2ff);
    return new THREE.Color(0xa0dcff);
  }, [variant]);

  // ====== 讀 VRM（加 cache-bust，最重要）=====
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setError("");
        setReady(false);

        // ✅ 避免 Vercel/手機快取：強制拿最新檔
        const url = `${VRM_URL}?v=${Date.now()}`;

        const loader = new GLTFLoader();
        loader.crossOrigin = "anonymous";

        const gltf = await new Promise((resolve, reject) => {
          loader.load(url, resolve, undefined, reject);
        });

        if (!mounted) return;

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        const vrm = await VRM.from(gltf);

        if (!mounted) return;

        // 面向鏡頭（若你覺得反了就把這行註解）
        vrm.scene.rotation.y = Math.PI;

        vrm.scene.traverse((o) => {
          if (o.isMesh) o.frustumCulled = false;
        });

        vrmRef.current = vrm;

        // ✅ 置中 + 縮放（全身入鏡）
        fitToStage(vrm, groupRef);

        setReady(true);
      } catch (e) {
        console.error("[Avatar3D] VRM load error:", e);
        setError(e?.message || "VRM load failed");
        setReady(false);
      }
    }

    load();

    return () => {
      mounted = false;
      // ✅ 正確釋放：用 ref，不要用 state（避免抓到舊值）
      try {
        const vrm = vrmRef.current;
        if (vrm?.scene) {
          vrm.scene.traverse((o) => {
            if (o.isMesh) {
              o.geometry?.dispose?.();
              if (Array.isArray(o.material)) o.material.forEach((m) => m?.dispose?.());
              else o.material?.dispose?.();
            }
          });
        }
      } catch {}
      vrmRef.current = null;
    };
  }, []);

  // ====== 每幀更新 + 跟隨（頭/眼/脊椎）=====
  useFrame((_, delta) => {
    const vrm = vrmRef.current;
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

    const spine = vrm.humanoid?.getBoneNode("spine");
    if (spine) {
      const target = THREE.MathUtils.clamp(yaw * 0.08, -0.15, 0.15);
      spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, target, 0.08);
    }
  });

  // ✅ 讀取失敗：不要紅牆、不要擋舞台（讓 AvatarStage 的 error boundary 顯示也行）
  if (error) {
    // 你也可以直接 return null;（最乾淨）
    return (
      <group>
        {/* 幾乎看不到的透明點：不影響畫面，但你還是能從 console 看到錯誤 */}
        <mesh>
          <sphereGeometry args={[0.001, 8, 8]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </group>
    );
  }

  if (!ready) return null;

  return (
    <group ref={groupRef}>
      <primitive object={vrmRef.current.scene} />
      <directionalLight position={[1.5, 2.2, 2.0]} intensity={0.15} color={tint} />
    </group>
  );
}

// ====== 自動置中 + 自動縮放（全身在舞台中）=====
function fitToStage(vrm, groupRef) {
  if (!vrm?.scene || !groupRef?.current) return;

  const box = new THREE.Box3().setFromObject(vrm.scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // ✅ 你要「不小隻」：調這個最直覺
  // 1.65：全身入鏡偏滿
  // 1.85：更大、更貼近（手可能會快碰邊）
  const targetHeight = 1.75;
  const scale = targetHeight / Math.max(size.y, 0.0001);

  groupRef.current.position.set(0, 0, 0);
  groupRef.current.rotation.set(0, 0, 0);
  groupRef.current.scale.set(scale, scale, scale);

  // 把中心移回原點
  vrm.scene.position.set(-center.x, -center.y, -center.z);

  // 腳底貼近地面
  const bottomY = center.y - size.y / 2;
  vrm.scene.position.y += bottomY;

  // 微調：讓角色落在舞台中間略偏下（比較符合卡片構圖）
  groupRef.current.position.y = -0.08;
}
