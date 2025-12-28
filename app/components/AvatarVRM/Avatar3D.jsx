// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  VRM,
  VRMUtils,
  VRMLoaderPlugin,
  VRMHumanBoneName,
} from "@pixiv/three-vrm";

/**
 * ✅ 穩定版（A + B 同時）
 * A = 自然站姿（把 T-pose 放下來，一次性初始化）
 * B = 頭身分離旋轉（每幀依 previewYaw 疊上去）
 *
 * 依你目前專案：AvatarStage 會傳進來 previewYaw
 * - 這裡把 previewYaw 當作「弧度」處理（useDragRotate 通常就是累加小數）
 */
export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,
  url = "/vrm/avatar.vrm",
}) {
  const groupRef = useRef();
  const vrmRef = useRef(/** @type {VRM|null} */ (null));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  // 顏色（你現在先用不到也沒關係，保留給未來換衣/材質）
  const tint = useMemo(() => {
    if (variant === "mint") return new THREE.Color("#8FFFE0");
    if (variant === "purple") return new THREE.Color("#C9A7FF");
    return new THREE.Color("#9FD7FF");
  }, [variant]);

  // ---------- A：一次性初始化（自然站姿 / 比例 / 腳貼地） ----------
  useEffect(() => {
    let disposed = false;

    async function load() {
      setError("");
      setReady(false);
      vrmRef.current = null;

      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      try {
        const gltf = await loader.loadAsync(url);

        if (disposed) return;

        // VRM instance
        /** @type {VRM} */
        const vrm = gltf.userData.vrm;

        // 清理 + 最佳化（重要：避免一些 VRM 物件/骨架造成怪問題）
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        // 有些 VRM0 需要轉成 VRM1 方向（保守做法：有就轉，沒有就略過）
        // rotateVRM0 只對 VRM0 有效；VRM1 不影響
        try {
          VRMUtils.rotateVRM0(vrm);
        } catch {}

        // 加到 group
        const root = groupRef.current;
        if (!root) return;

        // 清空舊的
        root.clear();
        root.add(vrm.scene);

        // 防止被 frustum cull 掉（手機上偶發“消失”的保險）
        vrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        // ------- 自動縮放 & 置中 & 腳貼地（你現在要的穩定定位核心） -------
        // 以模型高度縮放到 targetHeight（可依你舞台微調）
        const targetHeight = 1.55; // 你畫面目前看起來 OK 的比例，可微調 1.45~1.7
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        // 避免除以 0
        const currentHeight = Math.max(size.y, 0.0001);
        const s = targetHeight / currentHeight;

        vrm.scene.scale.setScalar(s);

        // 重新算一次縮放後 bbox
        const box2 = new THREE.Box3().setFromObject(vrm.scene);
        const center = new THREE.Vector3();
        const size2 = new THREE.Vector3();
        box2.getCenter(center);
        box2.getSize(size2);

        // 讓模型「水平置中」
        vrm.scene.position.x -= center.x;
        vrm.scene.position.z -= center.z;

        // 腳貼地：把底部 y 對齊 0
        const minY = box2.min.y;
        vrm.scene.position.y -= minY;

        // ------- A：自然站姿（把 T-pose 放下來）-------
        // 只做「小幅、穩」的手臂/肩調整：避免模型飛走
        applyRelaxPose(vrm);

        // 頭身分離要用到骨頭節點，先抓一次（存在 vrmRef 裡）
        vrmRef.current = vrm;
        setReady(true);
      } catch (e) {
        console.error("[Avatar3D] VRM load error:", e);
        setError(e?.message || "VRM load failed");
        setReady(false);
      }
    }

    load();

    return () => {
      disposed = true;
    };
  }, [url]);

  // ---------- B：頭身分離旋轉（每幀疊上去） ----------
  useFrame((_, delta) => {
    const vrm = vrmRef.current;
    if (!vrm) return;

    // 更新 VRM（彈簧骨、表情等）
    vrm.update(delta);

    // 你要 VTuber 可愛版：頭轉很明顯，但要 clamp 避免扭斷
    const yaw = clamp(previewYaw, -0.9, 0.9);

    // 分離權重（VTuber 版）
    const headTarget = yaw * 1.25; // 頭：明顯
    const chestTarget = yaw * 0.35; // 胸：跟一點點
    const spineTarget = yaw * 0.15; // 脊椎：更少

    const head = getBone(vrm, VRMHumanBoneName.Head);
    const neck = getBone(vrm, VRMHumanBoneName.Neck);
    const chest = getBone(vrm, VRMHumanBoneName.Chest);
    const spine = getBone(vrm, VRMHumanBoneName.Spine);

    // 用 lerp 讓旋轉更滑順、比較不抖
    const k = 1 - Math.pow(0.001, delta); // 近似「隨 FPS 自適應」
    if (head) head.rotation.y = lerp(head.rotation.y, headTarget, k);
    if (neck) neck.rotation.y = lerp(neck.rotation.y, headTarget * 0.55, k);

    if (chest) chest.rotation.y = lerp(chest.rotation.y, chestTarget, k);
    if (spine) spine.rotation.y = lerp(spine.rotation.y, spineTarget, k);
  });

  // 如果 VRM 還沒好，先不渲染（讓舞台保持乾淨）
  if (error) {
    // 讓 AvatarStage 的 ErrorBoundary 處理也行，但這裡給你一個最小 fallback
    return (
      <group>
        {/* 你手機看到的「圓柱」通常是我之前的 fallback 幾何；這裡乾脆不顯示 */}
      </group>
    );
  }

  return <group ref={groupRef} />;
}

/* ---------------- helpers ---------------- */

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getBone(vrm, name) {
  try {
    return vrm?.humanoid?.getNormalizedBoneNode(name) || null;
  } catch {
    return null;
  }
}

/**
 * A：自然站姿（一次性）
 * - 把手臂從水平放下來
 * - 讓肩稍微內收、手肘微彎（更像“站好”）
 * - 不碰 hips/root，避免你又「飛上去」
 */
function applyRelaxPose(vrm) {
  const lUpperArm = getBone(vrm, VRMHumanBoneName.LeftUpperArm);
  const rUpperArm = getBone(vrm, VRMHumanBoneName.RightUpperArm);
  const lLowerArm = getBone(vrm, VRMHumanBoneName.LeftLowerArm);
  const rLowerArm = getBone(vrm, VRMHumanBoneName.RightLowerArm);
  const lShoulder = getBone(vrm, VRMHumanBoneName.LeftShoulder);
  const rShoulder = getBone(vrm, VRMHumanBoneName.RightShoulder);

  // 手臂往下收：X 軸是抬手/放手最常用方向（依模型不同可能略有差）
  // 這個值是「保守安全」：如果你覺得還太 T，可以把 0.85 改 1.05
  if (lUpperArm) lUpperArm.rotation.z = -0.85;
  if (rUpperArm) rUpperArm.rotation.z = 0.85;

  // 肩膀稍微內收（更自然）
  if (lShoulder) lShoulder.rotation.y = 0.15;
  if (rShoulder) rShoulder.rotation.y = -0.15;

  // 手肘微彎（不要僵硬）
  if (lLowerArm) lLowerArm.rotation.z = -0.15;
  if (rLowerArm) rLowerArm.rotation.z = 0.15;
}
