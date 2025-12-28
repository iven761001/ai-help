// app/components/AvatarVRM/Avatar3D.jsx
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
    "rightFoot",
  ];
  for (const b of bonesToReset) resetBone(get(b));

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
    lUpperArm.rotation.z = THREE.MathUtils.degToRad(25);
    lUpperArm.rotation.x = THREE.MathUtils.degToRad(6);
    lUpperArm.rotation.y = THREE.MathUtils.degToRad(8);
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

export default function Avatar3D({ variant = "sky", emotion = "idle", previewYaw = 0 }) {
  const vrmRef = useRef(null);

  // ✅ 外層容器：用來做「置中/縮放/整體位移」
  const rootRef = useRef();

  // ✅ 存「基準姿勢」：避免每幀累積誤差
  const baseRotRef = useRef({
    hips: null,
    spine: null,
    chest: null,
    upperChest: null,
    neck: null,
    head: null,
    lUpperArm: null,
    rUpperArm: null,
    lLowerArm: null,
    rLowerArm: null,
    lShoulder: null,
    rShoulder: null,
  });

  const gltf = useLoader(
    GLTFLoader,
    VRM_URL,
    (loader) => {
      loader.crossOrigin = "anonymous";
      loader.register((parser) => new VRMLoaderPlugin(parser));
    }
  );

  const vrm = useMemo(() => gltf?.userData?.vrm || null, [gltf]);

  // ✅ 你要調整大小/位置就改這兩個
  const fit = useMemo(() => {
    // 角色看起來更大：1.85 ~ 2.05
    // 更小：1.60 ~ 1.75
    const targetHeight = 1.90;

    // 往下：-0.08 ~ -0.18
    // 往上：-0.02 ~ 0.06
    const yOffset = -0.08;

    return { targetHeight, yOffset };
  }, []);

  useEffect(() => {
    if (!vrm || !rootRef.current) return;

    // ✅ 方向統一
    VRMUtils.rotateVRM0(vrm);

    // ✅ 避免手機偶發裁切/瞬間消失
    vrm.scene.traverse((o) => {
      if (o.isMesh) o.frustumCulled = false;
    });

    // ✅ 先套自然站姿
    applyIdlePose(vrm);

    // ✅ 自動置中 + 腳底貼地
    // 1) 取得初始 bbox（在套完 idle pose 後算才準）
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // 2) 把模型中心移到原點
    vrm.scene.position.set(-center.x, -center.y, -center.z);

    // 3) 再算一次 bbox，把腳底貼到 y=0
    const box2 = new THREE.Box3().setFromObject(vrm.scene);
    const bottomY = box2.min.y;
    vrm.scene.position.y -= bottomY;

    // ✅ 自動縮放到固定高度
    const modelH = Math.max(size.y, 0.0001);
    const s = fit.targetHeight / modelH;
    rootRef.current.scale.setScalar(s);

    // ✅ 整體微調到舞台中間
    rootRef.current.position.set(0, fit.yOffset, 0);

    // ✅ 記住 VRM
    vrmRef.current = vrm;

    // ✅ 把「自然站姿」當作 base（呼吸/晃動都在 base 上加減）
    const get = (name) => vrm.humanoid?.getNormalizedBoneNode(name);
    const snap = (bone) => (bone ? bone.rotation.clone() : null);

    baseRotRef.current = {
      hips: snap(get("hips")),
      spine: snap(get("spine")),
      chest: snap(get("chest")),
      upperChest: snap(get("upperChest")),
      neck: snap(get("neck")),
      head: snap(get("head")),
      lUpperArm: snap(get("leftUpperArm")),
      rUpperArm: snap(get("rightUpperArm")),
      lLowerArm: snap(get("leftLowerArm")),
      rLowerArm: snap(get("rightLowerArm")),
      lShoulder: snap(get("leftShoulder")),
      rShoulder: snap(get("rightShoulder")),
    };

    // ⚠️ 這裡先不要 dispose（useLoader 會快取，dispose 容易讓下一次消失）
    return () => {
      vrmRef.current = null;
    };
  }, [vrm, fit.targetHeight, fit.yOffset]);

  useFrame((state, delta) => {
    const v = vrmRef.current;
    if (!v) return;

    v.update(delta);

    // --- 取骨頭 ---
    const get = (name) => v.humanoid?.getNormalizedBoneNode(name);
    const hips = get("hips");
    const spine = get("spine");
    const chest = get("chest") || get("upperChest");
    const neck = get("neck");
    const head = get("head");
    const lUpperArm = get("leftUpperArm");
    const rUpperArm = get("rightUpperArm");
    const lShoulder = get("leftShoulder");
    const rShoulder = get("rightShoulder");

    // --- 基準姿勢 ---
    const base = baseRotRef.current;

    // --- 時間 ---
    const t = state.clock.getElapsedTime();

    // ✅ 呼吸/晃動（保持小，不抖）
    const breath = Math.sin(t * 1.6) * 0.02;
    const sway = Math.sin(t * 0.9) * 0.015;
    const bob = Math.sin(t * 1.2) * 0.008;

    // ✅ rotation 設回 base 再加（避免累積）
    if (hips && base.hips) {
      hips.rotation.copy(base.hips);
      hips.rotation.y += sway * 0.4;
      hips.position.y = bob;
    }
    if (spine && base.spine) {
      spine.rotation.copy(base.spine);
      spine.rotation.x += breath * 0.7;
      spine.rotation.y += sway * 0.6;
    }
    if (chest) {
      const b = base.chest || base.upperChest;
      if (b) {
        chest.rotation.copy(b);
        chest.rotation.x += breath;
        chest.rotation.y += sway * 0.6;
      }
    }
    if (neck && base.neck) {
      neck.rotation.copy(base.neck);
      neck.rotation.y += sway * 0.35;
    }
    if (head && base.head) {
      head.rotation.copy(base.head);
      head.rotation.y += sway * 0.35;
      head.rotation.x += Math.sin(t * 1.1) * 0.01;
    }

    // ✅ 手臂跟著一點點
    if (lShoulder && base.lShoulder) {
      lShoulder.rotation.copy(base.lShoulder);
      lShoulder.rotation.x += breath * 0.25;
    }
    if (rShoulder && base.rShoulder) {
      rShoulder.rotation.copy(base.rShoulder);
      rShoulder.rotation.x += breath * 0.25;
    }
    if (lUpperArm && base.lUpperArm) {
      lUpperArm.rotation.copy(base.lUpperArm);
      lUpperArm.rotation.x += breath * 0.2;
    }
    if (rUpperArm && base.rUpperArm) {
      rUpperArm.rotation.copy(base.rUpperArm);
      rUpperArm.rotation.x += breath * 0.2;
    }
  });

  if (!vrm) return null;

  // ✅ 用 rootRef 包起來，位置/縮放都改這層，不直接動 vrm.scene（比較穩）
  return (
    <group ref={rootRef}>
      <primitive object={vrm.scene} />
    </group>
  );
            }
