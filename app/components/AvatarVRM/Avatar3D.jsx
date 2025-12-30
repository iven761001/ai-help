//Avatar3D.jsx v002.000
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

  const resetBone = (bone) => bone && bone.rotation.set(0, 0, 0);

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
  bonesToReset.forEach((b) => resetBone(get(b)));

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

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function setExpression(vrm, key, value) {
  try {
    const em = vrm?.expressionManager;
    if (!em) return false;
    if (!em.getExpression?.(key) && key !== "blink") return false;
    em.setValue(key, clamp01(value));
    em.update();
    return true;
  } catch {
    return false;
  }
}

/** 簡單的平滑混合 */
function damp(current, target, lambda, dt) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

export default function Avatar3D({
  vrmId = "C1",
  variant = "sky",
  emotion = "idle",
  action = "idle", // ✅ 新增：idle | wave | walk | nod | angry | smile | crouch
  previewYaw = 0,
  onReady, // ✅ 新增：讓 Stage 在「模型真正 ready」時做 framing
}) {
  const vrmRef = useRef(null);

  // ✅ 存「基準姿勢」：避免每幀累積誤差
  const baseRef = useRef({
    ready: false,
    rot: {},
    posY: 0,
    // 動作混合強度（0~1），讓切換不會硬切
    actionW: 0,
    actionName: "idle",
  });

  // ✅ 依 vrmId 切換載入不同 VRM
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

    // 方向統一
    VRMUtils.rotateVRM0(vrm);

    // 放鬆站姿
    applyIdlePose(vrm);

    vrmRef.current = vrm;

    // 記住 base（自然站姿）
    const get = (name) => vrm.humanoid?.getNormalizedBoneNode(name);
    const snap = (bone) => (bone ? bone.rotation.clone() : null);

    baseRef.current.ready = true;
    baseRef.current.actionW = 0;
    baseRef.current.actionName = "idle";
    baseRef.current.posY = 0;
    baseRef.current.rot = {
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
      lHand: snap(get("leftHand")),
      rHand: snap(get("rightHand")),
      lUpperLeg: snap(get("leftUpperLeg")),
      rUpperLeg: snap(get("rightUpperLeg")),
      lLowerLeg: snap(get("leftLowerLeg")),
      rLowerLeg: snap(get("rightLowerLeg")),
    };

    // 通知舞台：模型 ready，可 reframe
    onReady?.();

    return () => {
      try {
        vrmRef.current = null;
        baseRef.current.ready = false;

        vrm.scene?.traverse((obj) => {
          if (obj.isMesh) {
            obj.geometry?.dispose?.();
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
            else obj.material?.dispose?.();
          }
        });
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vrmId, vrm]); // vrmId 變化一定重建 base

  useFrame((state, dt) => {
    const v = vrmRef.current;
    if (!v || !baseRef.current.ready) return;

    v.update(dt);

    const humanoid = v.humanoid;
    const get = (name) => humanoid?.getNormalizedBoneNode(name);

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
    const lHand = get("leftHand");
    const rHand = get("rightHand");

    const lUpperLeg = get("leftUpperLeg");
    const rUpperLeg = get("rightUpperLeg");
    const lLowerLeg = get("leftLowerLeg");
    const rLowerLeg = get("rightLowerLeg");

    const base = baseRef.current.rot;
    const t = state.clock.getElapsedTime();

    // ===== 1) 先回到 base（避免累積）=====
    if (hips && base.hips) {
      hips.rotation.copy(base.hips);
      hips.position.y = baseRef.current.posY;
    }
    if (spine && base.spine) spine.rotation.copy(base.spine);
    if (chest) {
      const b = base.chest || base.upperChest;
      if (b) chest.rotation.copy(b);
    }
    if (neck && base.neck) neck.rotation.copy(base.neck);
    if (head && base.head) head.rotation.copy(base.head);

    if (lShoulder && base.lShoulder) lShoulder.rotation.copy(base.lShoulder);
    if (rShoulder && base.rShoulder) rShoulder.rotation.copy(base.rShoulder);
    if (lUpperArm && base.lUpperArm) lUpperArm.rotation.copy(base.lUpperArm);
    if (rUpperArm && base.rUpperArm) rUpperArm.rotation.copy(base.rUpperArm);
    if (lLowerArm && base.lLowerArm) lLowerArm.rotation.copy(base.lLowerArm);
    if (rLowerArm && base.rLowerArm) rLowerArm.rotation.copy(base.rLowerArm);
    if (lHand && base.lHand) lHand.rotation.copy(base.lHand);
    if (rHand && base.rHand) rHand.rotation.copy(base.rHand);

    if (lUpperLeg && base.lUpperLeg) lUpperLeg.rotation.copy(base.lUpperLeg);
    if (rUpperLeg && base.rUpperLeg) rUpperLeg.rotation.copy(base.rUpperLeg);
    if (lLowerLeg && base.lLowerLeg) lLowerLeg.rotation.copy(base.lLowerLeg);
    if (rLowerLeg && base.rLowerLeg) rLowerLeg.rotation.copy(base.rLowerLeg);

    // ===== 2) previewYaw（身體小、頭大）=====
    const bodyYaw = previewYaw * 0.25;
    const headYaw = previewYaw * 0.75;
    if (hips) hips.rotation.y += bodyYaw * 0.25;
    if (spine) spine.rotation.y += bodyYaw * 0.55;
    if (chest) chest.rotation.y += bodyYaw * 0.35;
    if (neck) neck.rotation.y += headYaw * 0.35;
    if (head) head.rotation.y += headYaw;

    // ===== 3) 通用 idle 呼吸（永遠都存在，但很小）=====
    const breath = Math.sin(t * 1.6) * 0.02;
    const sway = Math.sin(t * 0.9) * 0.015;
    const bob = Math.sin(t * 1.2) * 0.008;

    if (hips) hips.position.y += bob;
    if (spine) {
      spine.rotation.x += breath * 0.7;
      spine.rotation.y += sway * 0.35;
    }
    if (chest) {
      chest.rotation.x += breath;
      chest.rotation.y += sway * 0.35;
    }
    if (neck) neck.rotation.y += sway * 0.2;
    if (head) {
      head.rotation.y += sway * 0.25;
      head.rotation.x += Math.sin(t * 1.1) * 0.01;
    }

    // ===== 4) 動作混合（actionW 平滑）=====
    const targetAction = action || "idle";
    if (baseRef.current.actionName !== targetAction) {
      baseRef.current.actionName = targetAction;
      // 立刻把權重拉回 0 再淡入（比較不突兀）
      baseRef.current.actionW = 0;
    }
    baseRef.current.actionW = damp(baseRef.current.actionW, targetAction === "idle" ? 0 : 1, 12, dt);
    const w = clamp01(baseRef.current.actionW);

    // ===== 5) 表情（跟 emotion/action 都可以混）=====
    // emotion 優先：happy/sad/angry/neutral...（你後面會用 chat 控）
    // action 補強：smile/angry
    if (emotion === "angry" || targetAction === "angry") {
      setExpression(v, "angry", 0.85);
      setExpression(v, "happy", 0.0);
    } else if (emotion === "happy" || targetAction === "smile") {
      setExpression(v, "happy", 0.9);
      setExpression(v, "angry", 0.0);
    } else {
      // 不強制清掉全部，避免你之後做更細的表情混合
      setExpression(v, "happy", 0.0);
      setExpression(v, "angry", 0.0);
    }

    // ===== 6) 動作本體（用 w 混入）=====
    if (targetAction === "nod") {
      // 點頭：頭部 pitch
      const nod = Math.sin(t * 3.2) * THREE.MathUtils.degToRad(8);
      if (head) head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, head.rotation.x + nod, w);
    }

    if (targetAction === "wave") {
      // 揮手：右手舉起 + 前臂左右擺
      const raise = THREE.MathUtils.degToRad(55);
      const wave = Math.sin(t * 6.2) * THREE.MathUtils.degToRad(28);

      if (rUpperArm) {
        const tx = rUpperArm.rotation.x + THREE.MathUtils.degToRad(10);
        const tz = rUpperArm.rotation.z - raise;
        rUpperArm.rotation.x = THREE.MathUtils.lerp(rUpperArm.rotation.x, tx, w);
        rUpperArm.rotation.z = THREE.MathUtils.lerp(rUpperArm.rotation.z, tz, w);
      }
      if (rLowerArm) {
        const tz = rLowerArm.rotation.z - wave;
        rLowerArm.rotation.z = THREE.MathUtils.lerp(rLowerArm.rotation.z, tz, w);
      }
      if (rHand) {
        const tz = rHand.rotation.z - wave * 0.6;
        rHand.rotation.z = THREE.MathUtils.lerp(rHand.rotation.z, tz, w);
      }
    }

    if (targetAction === "walk") {
      // 走路：髖部前後擺 + 腿擺（很簡化，但看起來會動）
      const step = Math.sin(t * 3.6);
      const hipBob = Math.abs(step) * 0.02;

      if (hips) hips.position.y += THREE.MathUtils.lerp(0, hipBob, w);

      const legSwing = THREE.MathUtils.degToRad(22) * step;
      const kneeBend = THREE.MathUtils.degToRad(18) * Math.max(0, -step);

      if (lUpperLeg) lUpperLeg.rotation.x = THREE.MathUtils.lerp(lUpperLeg.rotation.x, lUpperLeg.rotation.x + legSwing, w);
      if (rUpperLeg) rUpperLeg.rotation.x = THREE.MathUtils.lerp(rUpperLeg.rotation.x, rUpperLeg.rotation.x - legSwing, w);

      if (lLowerLeg) lLowerLeg.rotation.x = THREE.MathUtils.lerp(lLowerLeg.rotation.x, lLowerLeg.rotation.x + kneeBend, w);
      if (rLowerLeg) rLowerLeg.rotation.x = THREE.MathUtils.lerp(rLowerLeg.rotation.x, rLowerLeg.rotation.x + THREE.MathUtils.degToRad(18) * Math.max(0, step), w);

      // 手也跟著擺一點
      const armSwing = THREE.MathUtils.degToRad(14) * step;
      if (lUpperArm) lUpperArm.rotation.x = THREE.MathUtils.lerp(lUpperArm.rotation.x, lUpperArm.rotation.x - armSwing, w * 0.7);
      if (rUpperArm) rUpperArm.rotation.x = THREE.MathUtils.lerp(rUpperArm.rotation.x, rUpperArm.rotation.x + armSwing, w * 0.7);
    }

    if (targetAction === "crouch") {
      // 蹲下：hips 내려 + 大腿/小腿彎曲
      const down = 0.22; // 越大蹲越低
      if (hips) hips.position.y = THREE.MathUtils.lerp(hips.position.y, hips.position.y - down, w);

      const hipBend = THREE.MathUtils.degToRad(35);
      const kneeBend = THREE.MathUtils.degToRad(55);

      if (lUpperLeg) lUpperLeg.rotation.x = THREE.MathUtils.lerp(lUpperLeg.rotation.x, lUpperLeg.rotation.x - hipBend, w);
      if (rUpperLeg) rUpperLeg.rotation.x = THREE.MathUtils.lerp(rUpperLeg.rotation.x, rUpperLeg.rotation.x - hipBend, w);
      if (lLowerLeg) lLowerLeg.rotation.x = THREE.MathUtils.lerp(lLowerLeg.rotation.x, lLowerLeg.rotation.x + kneeBend, w);
      if (rLowerLeg) rLowerLeg.rotation.x = THREE.MathUtils.lerp(rLowerLeg.rotation.x, rLowerLeg.rotation.x + kneeBend, w);

      if (spine) spine.rotation.x = THREE.MathUtils.lerp(spine.rotation.x, spine.rotation.x + THREE.MathUtils.degToRad(8), w);
      if (head) head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, head.rotation.x + THREE.MathUtils.degToRad(6), w);
    }

    if (targetAction === "angry") {
      // 生氣：身體小抖 + 肩縮
      const jit = Math.sin(t * 18) * THREE.MathUtils.degToRad(1.2);
      if (spine) spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, spine.rotation.y + jit, w);
      if (lShoulder) lShoulder.rotation.x = THREE.MathUtils.lerp(lShoulder.rotation.x, lShoulder.rotation.x + THREE.MathUtils.degToRad(-6), w);
      if (rShoulder) rShoulder.rotation.x = THREE.MathUtils.lerp(rShoulder.rotation.x, rShoulder.rotation.x + THREE.MathUtils.degToRad(-6), w);
    }

    if (targetAction === "smile") {
      // 笑：除了表情外，頭微微左右晃
      const sway2 = Math.sin(t * 2.1) * THREE.MathUtils.degToRad(3);
      if (head) head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, head.rotation.y + sway2, w);
    }
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
  }
