// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMUtils } from "@pixiv/three-vrm";

const VRM_URL = "/vrm/avatar.vrm";

// ✅ 想強制更新 VRM（避免快取拿舊檔）就改這個字串：
// 例如改成 "v2"、"2025-12-28-1" 然後重新部署
const VRM_VERSION = "v1";

export default function Avatar3D({ variant = "sky", emotion = "idle", previewYaw = 0 }) {
  const groupRef = useRef();
  const [vrm, setVrm] = useState(null);
  const [error, setError] = useState("");

  const tint = useMemo(() => {
    if (variant === "mint") return new THREE.Color(0x8dffd7);
    if (variant === "purple") return new THREE.Color(0xd3b2ff);
    return new THREE.Color(0xa0dcff);
  }, [variant]);

  // ====== 讀 VRM ======
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setError("");
        setVrm(null);

        const url = `${VRM_URL}?v=${encodeURIComponent(VRM_VERSION)}`;

        const loader = new GLTFLoader();
        loader.crossOrigin = "anonymous";

        const gltf = await new Promise((resolve, reject) => {
          loader.load(url, resolve, undefined, reject);
        });

        if (!mounted) return;

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        const vrmParsed = await VRM.from(gltf);
        if (!mounted) return;

        // ⚠️ 先不要強制 rotation.y = Math.PI
        // 因為有些 VRM 本來就對了，硬翻會出現「像消失/背面/位置怪」
        // vrmParsed.scene.rotation.y = Math.PI;

        vrmParsed.scene.traverse((o) => {
          if (o.isMesh) o.frustumCulled = false;
        });

        setVrm(vrmParsed);
      } catch (e) {
        console.error("[Avatar3D] VRM load error:", e);
        setError(e?.message || "VRM load failed");
      }
    }

    load();

    return () => {
      mounted = false;
      // 釋放（可選）
      try {
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== 自動置中 + 自動縮放（全身入鏡）=====
  useEffect(() => {
    if (!vrm || !groupRef.current) return;

    const box = new THREE.Box3().setFromObject(vrm.scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // ✅ 想更大就調這個（1.65~1.9 都合理）
    const targetHeight = 1.75;
    const scale = targetHeight / Math.max(size.y, 0.0001);

    groupRef.current.position.set(0, 0, 0);
    groupRef.current.rotation.set(0, 0, 0);
    groupRef.current.scale.set(scale, scale, scale);

    // 置中
    vrm.scene.position.set(-center.x, -center.y, -center.z);

    // 腳底貼地
    const bottomY = center.y - size.y / 2;
    vrm.scene.position.y += bottomY;

    // 微調：讓角色在舞台中間略偏下
    groupRef.current.position.y = -0.08;
  }, [vrm]);

  // ====== 頭/眼跟隨 ======
  useFrame((_, delta) => {
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

  // ====== 錯誤提示：不紅牆、不擋畫面，但看得到有錯 ======
  if (error) {
    return (
      <group>
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshStandardMaterial color={"#ff6b6b"} />
        </mesh>
      </group>
    );
  }

  if (!vrm) return null;

  return (
    <group ref={groupRef}>
      <primitive object={vrm.scene} />
      <directionalLight position={[1.5, 2.2, 2.0]} intensity={0.15} color={tint} />
    </group>
  );
}
