"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

const VRM_URL = "/vrm/avatar.vrm";

/** 套自然待機姿勢（把T-pose放鬆） */
function applyIdlePose(vrm) {
  if (!vrm?.humanoid) return;

  const get = (name) => vrm.humanoid.getNormalizedBoneNode(name);

  // 先確保是 "Rest Pose" 起手式（不同VRM可能原始姿勢不一樣）
  // VRMUtils.rotateVRM0 はモデルの向き調整；這裡不動它，舞台已經處理好置中/縮放。
  // 但我們會先把骨頭 rotation 稍微 reset 到 0，避免疊加奇怪姿勢。
  const resetBone = (bone) => {
    if (!bone) return;
    bone.rotation.set(0, 0, 0);
  };

  const bonesToReset = [
    "hips",
    "spine",
    "chest",
    "upperChest",
    "neck",
    "head",
    "leftShoulder",
    "rightShoulder",
    "leftUpperArm",
    "rightUpperArm",
    "leftLowerArm",
    "rightLowerArm",
    "leftHand",
    "rightHand",
    "leftUpperLeg",
    "rightUpperLeg",
    "leftLowerLeg",
    "rightLowerLeg",
    "leftFoot",
    "rightFoot"
  ];

  for (const b of bonesToReset) resetBone(get(b));

  // --- 進入「自然待機」---
  const spine = get("spine");
  const chest = get("chest") || get("upperChest");
  const neck = get("neck");
  const head = get("head");

  const lShoulder = get("leftShoulder");
  const rShoulder = get("rightShoulder");
  const lUpperArm = get("leftUpperArm");
  const rUpperArm = get("rightUpperArm");
  const lLowerArm = get("leftLowerArm");
  const rLowerArm = get("rightLowerArm");
  const lHand = get("leftHand");
  const rHand = get("rightHand");

  // 身體微調：不要像木板
  if (spine) spine.rotation.x = THREE.MathUtils.degToRad(2);
  if (chest) chest.rotation.x = THREE.MathUtils.degToRad(3);
  if (neck) neck.rotation.x = THREE.MathUtils.degToRad(2);
  if (head) head.rotation.x = THREE.MathUtils.degToRad(-1);

  // 肩膀放鬆（略下沉、略後收）
  if (lShoulder) {
    lShoulder.rotation.z = THREE.MathUtils.degToRad(6);
    lShoulder.rotation.y = THREE.MathUtils.degToRad(4);
  }
  if (rShoulder) {
    rShoulder.rotation.z = THREE.MathUtils.degToRad(-6);
    rShoulder.rotation.y = THREE.MathUtils.degToRad(-4);
  }

  // 上臂：從水平放下來（關鍵）
  if (lUpperArm) {
    lUpperArm.rotation.z = THREE.MathUtils.degToRad(25);  // 放下
    lUpperArm.rotation.x = THREE.MathUtils.degToRad(6);   // 微向前
    lUpperArm.rotation.y = THREE.MathUtils.degToRad(8);   // 微外展
  }
  if (rUpperArm) {
    rUpperArm.rotation.z = THREE.MathUtils.degToRad(-25);
    rUpperArm.rotation.x = THREE.MathUtils.degToRad(6);
    rUpperArm.rotation.y = THREE.MathUtils.degToRad(-8);
  }

  // 前臂：微彎（不要僵直）
  if (lLowerArm) lLowerArm.rotation.z = THREE.MathUtils.degToRad(18);
  if (rLowerArm) rLowerArm.rotation.z = THREE.MathUtils.degToRad(-18);

  // 手腕：微內收、自然垂
  if (lHand) {
    lHand.rotation.z = THREE.MathUtils.degToRad(6);
    lHand.rotation.x = THREE.MathUtils.degToRad(4);
  }
  if (rHand) {
    rHand.rotation.z = THREE.MathUtils.degToRad(-6);
    rHand.rotation.x = THREE.MathUtils.degToRad(4);
  }
}

export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0
}) {
  // 用 ref 記著 vrm（方便 useFrame update）
  const vrmRef = useRef(null);

  // VRM 載入（用 GLTFLoader + VRMLoaderPlugin）
  const gltf = useLoader(
    GLTFLoader,
    VRM_URL,
    (loader) => {
      loader.crossOrigin = "anonymous";
      loader.register((parser) => new VRMLoaderPlugin(parser));
    }
  );

  // 取得 VRM（three-vrm 會掛在 userData.vrm）
  const vrm = useMemo(() => gltf?.userData?.vrm || null, [gltf]);

  useEffect(() => {
    if (!vrm) return;

    // 有些模型會朝向不一致：這行會讓 VRM 正方向一致（通常是面向 +Z 或 -Z 問題）
    // 如果你現在方向已經對，就保留；若方向突然翻轉，再跟我說我幫你調整。
    VRMUtils.rotateVRM0(vrm);

    // 套自然待機姿勢
    applyIdlePose(vrm);

    // 記住
    vrmRef.current = vrm;

    // 清理：離開頁面釋放
    return () => {
      try {
        vrmRef.current = null;
        vrm.scene?.traverse((obj) => {
          if (obj.isMesh) {
            obj.geometry?.dispose?.();
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
            else obj.material?.dispose?.();
          }
        });
      } catch {}
    };
  }, [vrm]);

  // 每幀更新 VRM（必要，否則某些模型表情/骨架不會刷新）
  useFrame((_, delta) => {
    if (vrmRef.current) vrmRef.current.update(delta);
  });

  if (!vrm) return null;

  // 這裡先不做旋轉/情緒，避免干擾；下一步你要 2️⃣ 轉頭跟隨我再加
  return <primitive object={vrm.scene} />;
}
