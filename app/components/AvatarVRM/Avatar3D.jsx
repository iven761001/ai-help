// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMUtils } from "@pixiv/three-vrm";

const VRM_URL = "/vrm/avatar.vrm";

/**
 * 穩定策略：
 * 1) 只在 client 載入
 * 2) 載入失敗不炸整頁（回傳 null）
 * 3) 以 model 的 bounding box 自動置中 + 自動縮放到舞台
 * 4) 轉頭：head bone 旋轉
 * 5) 眼睛：VRM lookAt applier
 */
export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,
}) {
  const groupRef = useRef();
  const [vrm, setVrm] = useState(null);
  const [error, setError] = useState("");

  // 你要的「角色顏色」目前先保留（未來可做燈光/濾鏡或材質）
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
        const loader = new GLTFLoader();

        // VRM 需要這個來移除不必要座標系/最佳化
        loader.crossOrigin = "anonymous";

        const gltf = await new Promise((resolve, reject) => {
          loader.load(
            VRM_URL,
            (g) => resolve(g),
            undefined,
            (e) => reject(e)
          );
        });

        if (!mounted) return;

        // VRMUtils：清理 joints 等，避免效能/怪問題
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        const vrmParsed = await VRM.from(gltf);

        if (!mounted) return;

        // 一些 VRM 會面向 -Z 或比例怪：確保方向一致
        vrmParsed.scene.rotation.y = Math.PI; // 常見 VRM 面向相反，這行能讓角色面向鏡頭（若你覺得反了就註解）
        vrmParsed.scene.traverse((o) => {
          if (o.isMesh) {
            o.frustumCulled = false; // 手機/裁切問題避免瞬間消失
          }
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
              if (Array.isArray(o.material)) {
                o.material.forEach((m) => m?.dispose?.());
              } else {
                o.material?.dispose?.();
              }
            }
          });
        }
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== 自動置中 + 自動縮放（關鍵：全身在舞台中間，不會忽大忽小）=====
  useEffect(() => {
    if (!vrm || !groupRef.current) return;

    // 取得模型包圍盒
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // 目標：讓整體高度在舞台中「看起來滿版但不爆」：
    // 你可以調 targetHeight 來放大/縮小
    const targetHeight = 1.65; // ✅ 想更大：1.8~2.0，想更小：1.4~1.6
    const scale = targetHeight / Math.max(size.y, 0.0001);

    // 先清掉群組 transform
    groupRef.current.position.set(0, 0, 0);
    groupRef.current.rotation.set(0, 0, 0);
    groupRef.current.scale.set(scale, scale, scale);

    // 置中：把模型 center 拉回原點
    // 注意：這裡是把 vrm.scene 往反方向移
    vrm.scene.position.set(-center.x, -center.y, -center.z);

    // 再把腳底放到地面附近（避免飄）
    // box 的 bottom 是 center.y - size.y/2
    const bottomY = center.y - size.y / 2;
    vrm.scene.position.y += bottomY;

    // 最後微調：讓角色「在舞台中間略偏下」比較好看
    // ✅ 想更往下：-0.05 ~ -0.15
    // ✅ 想更往上：0.02 ~ 0.08
    groupRef.current.position.y = -0.08;

    // 若你覺得角色離鏡頭太遠/太近，優先調 AvatarStage 相機 position.z
  }, [vrm]);

  // ====== 轉頭/眼睛跟隨（你剛剛選 1 的功能）=====
  useFrame((state, delta) => {
    if (!vrm || !groupRef.current) return;

    // VRM update（必須）
    vrm.update(delta);

    // previewYaw（你外面拖曳）通常是 -1 ~ 1（或更大）
    const yaw = THREE.MathUtils.clamp(previewYaw, -1.2, 1.2);

    // 1) 頭部骨架（小幅）
    const head = vrm.humanoid?.getBoneNode("head");
    if (head) {
      const target = THREE.MathUtils.clamp(yaw * 0.35, -0.55, 0.55);
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, target, 0.18);
    }

    // 2) 眼睛 LookAt（大幅）
    if (vrm.lookAt?.applier) {
      // applyYawPitch：yaw, pitch（弧度）
      // yaw 建議比頭大，讓眼神更明顯
      const eyeYaw = THREE.MathUtils.clamp(yaw * 0.8, -0.9, 0.9);
      vrm.lookAt.applier.applyYawPitch(eyeYaw, 0);
    }

    // 3) 身體可選：輕微跟著（很小就好，不然會像轉整隻）
    const spine = vrm.humanoid?.getBoneNode("spine");
    if (spine) {
      const target = THREE.MathUtils.clamp(yaw * 0.08, -0.15, 0.15);
      spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, target, 0.08);
    }
  });

  // ====== 若讀不到 VRM：不炸，回傳一個小提示（你也可以改成 return null）=====
  if (error) {
    return (
      <group>
        {/* 用幾何體提示（不影響其他 UI） */}
        <mesh>
          <boxGeometry args={[0.6, 0.3, 0.2]} />
          <meshStandardMaterial color={"#ff6b6b"} />
        </mesh>
      </group>
    );
  }

  if (!vrm) return null;

  return (
    <group ref={groupRef}>
      {/* 這裡直接掛 VRM */}
      <primitive object={vrm.scene} />

      {/* 可選：用一盞淡淡的補光，讓臉更亮（不影響你原本舞台燈） */}
      <directionalLight
        position={[1.5, 2.2, 2.0]}
        intensity={0.15}
        color={tint}
      />
    </group>
  );
}
