// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

/** 套自然待機姿勢（把T-pose放鬆） */
function applyIdlePose(vrm) {
  if (!vrm?.humanoid) return;
  const get = (name) => vrm.humanoid.getNormalizedBoneNode(name);

  const resetBone = (bone) => {
    if (!bone) return;
    bone.rotation.set(0, 0, 0);
    bone.position.set(0, 0, 0);
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

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function setExpression(vrm, name, value) {
  const v = clamp01(value);
  try {
    // VRM1
    if (vrm?.expressionManager?.setValue) {
      vrm.expressionManager.setValue(name, v);
      return true;
    }
    // VRM0
    if (vrm?.blendShapeProxy?.setValue) {
      vrm.blendShapeProxy.setValue(name, v);
      return true;
    }
  } catch {}
  return false;
}

function damp(current, target, lambda, dt) {
  // exponential smoothing
  const t = 1 - Math.exp(-lambda * dt);
  return current + (target - current) * t;
}

export default function Avatar3D({
  vrmId = "C1",          // ✅ 之後輪盤就改這個
  variant = "sky",       // 先保留（未來可做材質/燈光色調）
  emotion = "idle",      // 先保留（你要做情緒映射也可以）
  action = "idle",       // ✅ wave / walk / nod / angry / smile / crouch
  previewYaw = 0         // 你拖曳旋轉用
}) {
  const vrmRef = useRef(null);

  // ✅ 存 base rotation，避免每幀累積誤差
  const baseRotRef = useRef(null);

  // ✅ 動作平滑（避免切動作瞬間抽搐）
  const actionBlendRef = useRef({
    wave: 0,
    walk: 0,
    nod: 0,
    angry: 0,
    smile: 0,
    crouch: 0
  });

  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);

  const gltf = useLoader(
    GLTFLoader,
    url,
    (loader) => {
      loader.crossOrigin = "anonymous";
      loader.register((parser) => new VRMLoaderPlugin(parser));
    }
  );

  const vrm = useMemo(() => gltf?.userData?.vrm || null, [gltf]);

  useEffect(() => {
    if (!vrm) return;

    // ✅ 統一方向（別每次載不同模型就亂轉）
    VRMUtils.rotateVRM0(vrm);

    // ✅ 自然站姿
    applyIdlePose(vrm);

    // ✅ 記住
    vrmRef.current = vrm;

    // ✅ 把目前站姿當 base
    const get = (name) => vrm.humanoid?.getNormalizedBoneNode(name);
    const snap = (bone) => (bone ? bone.rotation.clone() : null);

    baseRotRef.current = {
      hips: snap(get("hips")),
      spine: snap(get("spine")),
      chest: snap(get("chest")),
      upperChest: snap(get("upperChest")),
      neck: snap(get("neck")),
      head: snap(get("head")),
      lShoulder: snap(get("leftShoulder")),
      rShoulder: snap(get("rightShoulder")),
      lUpperArm: snap(get("leftUpperArm")),
      rUpperArm: snap(get("rightUpperArm")),
      lLowerArm: snap(get("leftLowerArm")),
      rLowerArm: snap(get("rightLowerArm")),
      lUpperLeg: snap(get("leftUpperLeg")),
      rUpperLeg: snap(get("rightUpperLeg")),
      lLowerLeg: snap(get("leftLowerLeg")),
      rLowerLeg: snap(get("rightLowerLeg")),
      lFoot: snap(get("leftFoot")),
      rFoot: snap(get("rightFoot"))
    };

    // 初始把表情清掉
    setExpression(vrm, "happy", 0);
    setExpression(vrm, "angry", 0);
    setExpression(vrm, "joy", 0);    // 有些 VRM 用 joy
    setExpression(vrm, "smile", 0);  // 有些 VRM 用 smile

    return () => {
      // 不做 heavy dispose（useLoader 有 cache），避免切換時亂炸
      vrmRef.current = null;
      baseRotRef.current = null;
    };
  }, [vrm]);

  useFrame((state, delta) => {
    const v = vrmRef.current;
    const base = baseRotRef.current;
    if (!v || !base) return;

    v.update(delta);

    const get = (name) => v.humanoid?.getNormalizedBoneNode(name);

    const hips = get("hips");
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

    const lUpperLeg = get("leftUpperLeg");
    const rUpperLeg = get("rightUpperLeg");
    const lLowerLeg = get("leftLowerLeg");
    const rLowerLeg = get("rightLowerLeg");

    // ---- 時間 ----
    const t = state.clock.getElapsedTime();

    // ---- 基礎 idle（永遠存在）----
    const breath = Math.sin(t * 1.6) * 0.02;
    const sway = Math.sin(t * 0.9) * 0.015;
    const bob = Math.sin(t * 1.2) * 0.008;

    // ---- action blend（平滑切換）----
    const target = {
      wave: action === "wave" ? 1 : 0,
      walk: action === "walk" ? 1 : 0,
      nod: action === "nod" ? 1 : 0,
      angry: action === "angry" ? 1 : 0,
      smile: action === "smile" ? 1 : 0,
      crouch: action === "crouch" ? 1 : 0
    };

    const blend = actionBlendRef.current;
    blend.wave = damp(blend.wave, target.wave, 10, delta);
    blend.walk = damp(blend.walk, target.walk, 10, delta);
    blend.nod = damp(blend.nod, target.nod, 10, delta);
    blend.angry = damp(blend.angry, target.angry, 10, delta);
    blend.smile = damp(blend.smile, target.smile, 10, delta);
    blend.crouch = damp(blend.crouch, target.crouch, 10, delta);

    // ---- 先回到 base，再疊加 ----
    if (hips && base.hips) {
      hips.rotation.copy(base.hips);
      hips.rotation.y += sway * 0.4;

      // ✅ crouch 會壓低 hips
      const crouchDrop = blend.crouch * 0.12;
      hips.position.y = bob - crouchDrop;
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

      // ✅ previewYaw：轉頭跟隨（小幅、很自然）
      const yaw = THREE.MathUtils.clamp(previewYaw, -1.2, 1.2);
      head.rotation.y += yaw * 0.25;

      // ✅ nod 動作
      if (blend.nod > 0.001) {
        const nodWave = Math.sin(t * 3.2) * 0.18 * blend.nod; // 點頭幅度
        head.rotation.x += nodWave;
      }

      // ✅ angry 會稍微低頭+瞪人感
      if (blend.angry > 0.001) {
        head.rotation.x += 0.08 * blend.angry;
        head.rotation.y += Math.sin(t * 1.6) * 0.03 * blend.angry;
      }
    }

    // ---- 手臂跟著呼吸 ----
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
    if (lLowerArm && base.lLowerArm) lLowerArm.rotation.copy(base.lLowerArm);
    if (rLowerArm && base.rLowerArm) rLowerArm.rotation.copy(base.rLowerArm);

    // ---- wave：右手揮手 ----
    if (blend.wave > 0.001) {
      const w = blend.wave;
      if (rUpperArm) {
        // 抬手
        rUpperArm.rotation.x += (-0.9) * w;
        rUpperArm.rotation.z += (-0.35) * w;
      }
      if (rLowerArm) {
        // 前臂揮動
        const flap = Math.sin(t * 8.0) * 0.55 * w;
        rLowerArm.rotation.z += flap;
      }
      if (rShoulder) {
        rShoulder.rotation.x += (-0.15) * w;
      }
    }

    // ---- walk：原地踏步 ----
    if (blend.walk > 0.001) {
      const w = blend.walk;
      const step = Math.sin(t * 5.0);
      const step2 = Math.sin(t * 5.0 + Math.PI);

      // 腿
      if (lUpperLeg) lUpperLeg.rotation.x += (0.45 * step) * w;
      if (rUpperLeg) rUpperLeg.rotation.x += (0.45 * step2) * w;

      if (lLowerLeg) lLowerLeg.rotation.x += Math.max(0, -0.55 * step) * w;
      if (rLowerLeg) rLowerLeg.rotation.x += Math.max(0, -0.55 * step2) * w;

      // 手臂反向擺（更像走路）
      if (lUpperArm) lUpperArm.rotation.x += (-0.22 * step2) * w;
      if (rUpperArm) rUpperArm.rotation.x += (-0.22 * step) * w;

      // 身體微上下
      if (hips) hips.position.y += (Math.sin(t * 10.0) * 0.01) * w;
    }

    // ---- crouch：蹲下（壓低 hips + 腿彎）----
    if (blend.crouch > 0.001) {
      const c = blend.crouch;
      if (lUpperLeg) lUpperLeg.rotation.x += 0.55 * c;
      if (rUpperLeg) rUpperLeg.rotation.x += 0.55 * c;
      if (lLowerLeg) lLowerLeg.rotation.x += -0.75 * c;
      if (rLowerLeg) rLowerLeg.rotation.x += -0.75 * c;

      // 上半身略前傾，才像蹲
      if (spine) spine.rotation.x += 0.12 * c;
      if (chest) chest.rotation.x += 0.08 * c;
    }

    // ---- 表情：smile / angry ----
    // 這裡用多個常見 key 去嘗試，哪個有吃到就會有效
    // smile：happy / joy / smile
    if (blend.smile > 0.001) {
      const s = blend.smile;
      setExpression(v, "happy", s);
      setExpression(v, "joy", s);
      setExpression(v, "smile", s);
      // angry 清掉
      setExpression(v, "angry", 0);
    } else if (blend.angry > 0.001) {
      const a = blend.angry;
      setExpression(v, "angry", a);
      // smile 清掉
      setExpression(v, "happy", 0);
      setExpression(v, "joy", 0);
      setExpression(v, "smile", 0);
    } else {
      // idle 清表情（避免殘留）
      setExpression(v, "happy", 0);
      setExpression(v, "joy", 0);
      setExpression(v, "smile", 0);
      setExpression(v, "angry", 0);
    }
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
}
