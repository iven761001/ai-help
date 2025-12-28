// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

/**
 * ✅ 穩定版 VRM Loader（R3F）
 * - 讀取：/public/vrm/avatar.vrm → URL: "/vrm/avatar.vrm"
 * - 必須放在 <Canvas> 裡使用（你 AvatarStage 已經是 Canvas）
 */
export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,
  url = "/vrm/avatar.vrm"
}) {
  const groupRef = useRef();

  // 用 GLTFLoader + VRMLoaderPlugin 載入 VRM
  const gltf = useLoader(
    GLTFLoader,
    url,
    (loader) => {
      loader.crossOrigin = "anonymous";
      loader.register((parser) => new VRMLoaderPlugin(parser));
    }
  );

  // 取得 VRM 物件
  const vrm = useMemo(() => {
    // VRMLoaderPlugin 會把 vrm 放在 gltf.userData.vrm
    return gltf?.userData?.vrm || null;
  }, [gltf]);

  // 一些 VRM 清理（可提升效能/避免怪異材質）
  useEffect(() => {
    if (!vrm) return;

    // 這兩個清理在很多模型上都安全
    try {
      VRMUtils.removeUnnecessaryVertices(vrm.scene);
      VRMUtils.removeUnnecessaryJoints(vrm.scene);
    } catch {}

    // 讓模型更「看起來像 3D」：啟用陰影
    vrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;

        // 有些 VRM 材質需要設定一下，避免過暗或全黑
        if (obj.material) {
          obj.material.side = THREE.FrontSide;
          obj.material.transparent = true;
        }
      }
    });

    // 初始位置/縮放（依模型不同可微調）
    vrm.scene.position.set(0, -1.0, 0);
    vrm.scene.scale.set(1.0, 1.0, 1.0);
  }, [vrm]);

  // 顏色 variant：簡單用環境光色偏（不破壞模型材質）
  const tint = useMemo(() => {
    if (variant === "mint") return new THREE.Color(0.70, 1.0, 0.88);
    if (variant === "purple") return new THREE.Color(0.92, 0.80, 1.0);
    return new THREE.Color(0.78, 0.90, 1.0); // sky
  }, [variant]);

  // 每幀更新：vrm.update + 頭身分離旋轉 + 待機呼吸
  useFrame((state, delta) => {
    if (!vrm) return;

    // VRM 必須 update 才會動（骨架/表情/物理）
    vrm.update(delta);

    const t = state.clock.getElapsedTime();

    // ✅ 頭身分離旋轉（你要的）
    // previewYaw 你那邊 useDragRotate 會給一個連續值
    const bodyYaw = previewYaw * 0.35; // 身體：小
    const headYaw = previewYaw * 0.85; // 頭：大

    // 身體：整體 group 微轉（不會太晃）
    if (groupRef.current) {
      groupRef.current.rotation.y = bodyYaw;

      // 待機呼吸（情緒不同速度不同）
      const speed = emotion === "thinking" ? 1.6 : 1.0;
      groupRef.current.position.y = Math.sin(t * speed) * 0.03;
    }

    // 頭部：抓 humanoid 的 head bone 轉
    const humanoid = vrm.humanoid;
    const head = humanoid?.getBoneNode?.("head");
    if (head) {
      head.rotation.y = headYaw;
      head.rotation.x = Math.sin(t * 0.8) * 0.03; // 微微點頭
    }

    // 簡單用光色偏，做出「跟著選色」的氛圍感（不改模型材質）
    //（注意：這不是三燈光，而是非常輕量的色偏）
    // 你要更強烈也可以再加一盞 light 在 AvatarStage。
  });

  // 如果 VRM 還沒載入，回傳 null（你 AvatarStage 已用 Suspense fallback）
  if (!vrm) return null;

  return (
    <group ref={groupRef}>
      {/* 給一點點色偏環境光，讓不同 variant 有感 */}
      <ambientLight intensity={0.15} color={tint} />
      <primitive object={vrm.scene} />
    </group>
  );
}
