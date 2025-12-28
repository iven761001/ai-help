// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

/**
 * ✅ 穩定版 VRM Avatar3D（避免 build/prerender 爆掉）
 * - VRM 放置：public/vrm/avatar.vrm
 * - 讀取網址：/vrm/avatar.vrm
 * - 比例/站位自動修正
 * - 頭身分離旋轉（previewYaw）
 */

const VRM_URL = "/vrm/avatar.vrm";

export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0
}) {
  const { camera } = useThree();

  // ✅ 用 useLoader + GLTFLoader 註冊 VRM plugin（不要用 useGLTF.setLoaderExtensions）
  const gltf = useLoader(
    GLTFLoader,
    VRM_URL,
    (loader) => {
      loader.register((parser) => new VRMLoaderPlugin(parser));
      // 這個 crossOrigin 對某些環境比較穩
      loader.crossOrigin = "anonymous";
    }
  );

  const rootRef = useRef(null);
  const headRef = useRef(null);
  const vrmSceneRef = useRef(null);
  const vrmRef = useRef(null);

  const [error, setError] = useState("");

  // 顏色（可先留著，後續你要做材質換色再加強）
  const tint = useMemo(() => {
    if (variant === "mint") return new THREE.Color(0x7fffd4);
    if (variant === "purple") return new THREE.Color(0xd6b0ff);
    return new THREE.Color(0xa0dcff);
  }, [variant]);

  // 頭身分離旋轉（弧度）
  const bodyYaw = previewYaw * 0.55; // 身體比較小
  const headYaw = previewYaw * 1.1;  // 頭比較大

  useEffect(() => {
    setError("");

    try {
      if (!gltf) return;

      // ✅ VRM 會被 plugin 放到 gltf.userData.vrm
      const vrm = gltf.userData?.vrm;
      if (!vrm) {
        setError("VRM 載入失敗：gltf.userData.vrm 不存在（可能不是 VRM 或 plugin 未生效）");
        return;
      }

      // ✅ 清理/修正（常見比例怪、頭怪、法線怪的安全處理）
      VRMUtils.removeUnnecessaryVertices(vrm.scene);
      VRMUtils.removeUnnecessaryJoints(vrm.scene);
      VRMUtils.rotateVRM0(vrm);

      // 陰影/裁切穩定
      vrm.scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.frustumCulled = false;
        }
      });

      // ✅ 比例/站位修正（核心）
      // 先給一個保守縮放
      vrm.scene.scale.set(1.05, 1.05, 1.05);

      // 用 bounding box 把「腳底」貼近舞台地面（配合你 ContactShadows 的 y）
      const box = new THREE.Box3().setFromObject(vrm.scene);
      const size = new THREE.Vector3();
      box.getSize(size);

      // 讓模型不要離鏡頭太近/太遠（保底）
      vrm.scene.position.set(0, 0, 0);

      if (size.y > 0.1) {
        // 目標：腳底接近 -1.05（你 AvatarStage 的 ContactShadows 位置）
        const bottomY = box.min.y;
        const desiredBottom = -1.05;
        const offsetY = desiredBottom - bottomY;
        vrm.scene.position.y += offsetY;
      } else {
        // fallback
        vrm.scene.position.y = -1.05;
      }

      // ✅ 超輕微 tint（避免整隻變色）
      vrm.scene.traverse((o) => {
        if (o.isMesh && o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            if (m && m.color) {
              m.color = m.color.clone().lerp(tint, 0.06);
            }
          }
        }
      });

      // ✅ 抓 head bone（用於頭部旋轉/微看鏡頭）
      const head =
        vrm.humanoid?.getBoneNode?.("head") ||
        vrm.humanoid?.getRawBoneNode?.("head") ||
        null;

      headRef.current = head;
      vrmRef.current = vrm;
      vrmSceneRef.current = vrm.scene;
    } catch (e) {
      console.error("[Avatar3D] setup failed:", e);
      setError(String(e?.message || e));
    }
  }, [gltf, tint]);

  useFrame((_, delta) => {
    const vrm = vrmRef.current;
    if (!vrm) return;

    // VRM update（彈簧骨等）
    vrm.update(delta);

    // 身體旋轉（整體）
    if (rootRef.current) rootRef.current.rotation.y = bodyYaw;

    // 頭部旋轉（獨立）
    const head = headRef.current;
    if (head) {
      // 先加上拖曳的頭 yaw（太大會怪，先保守）
      head.rotation.y = headYaw * 0.35;

      // 很輕的看鏡頭（避免頭僵硬，但不會「歪到奇怪」）
      const headPos = new THREE.Vector3();
      head.getWorldPosition(headPos);

      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);

      const dir = camPos.sub(headPos).normalize();
      dir.y *= 0.10; // 降低抬頭感

      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        dir
      );

      head.quaternion.slerp(q, 0.02);
    }
  });

  // ✅ 錯誤保底：不黑屏
  if (error) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[1.4, 1.4, 0.2]} />
          <meshStandardMaterial transparent opacity={0.12} />
        </mesh>
      </group>
    );
  }

  // 還沒就緒也不要黑（顯示一個透明 placeholder）
  if (!vrmSceneRef.current) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[1.4, 1.4, 0.2]} />
          <meshStandardMaterial transparent opacity={0.08} />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={rootRef}>
      <primitive object={vrmSceneRef.current} />
    </group>
  );
}
