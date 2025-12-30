//Avatar3D.jsx v004.004
// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

/** 放鬆站姿（避免 T pose 太僵） */
function applyIdlePose(vrm) {
  if (!vrm?.humanoid) return;
  const get = (name) => vrm.humanoid.getNormalizedBoneNode(name);
  const d2r = THREE.MathUtils.degToRad;

  const reset = (b) => b && b.rotation.set(0, 0, 0);

  [
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
  ].forEach((n) => reset(get(n)));

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

  if (spine) spine.rotation.x = d2r(2);
  if (chest) chest.rotation.x = d2r(3);
  if (neck) neck.rotation.x = d2r(2);
  if (head) head.rotation.x = d2r(-1);

  if (lShoulder) {
    lShoulder.rotation.z = d2r(6);
    lShoulder.rotation.y = d2r(4);
  }
  if (rShoulder) {
    rShoulder.rotation.z = d2r(-6);
    rShoulder.rotation.y = d2r(-4);
  }

  if (lUpperArm) {
    lUpperArm.rotation.z = d2r(25);
    lUpperArm.rotation.x = d2r(6);
    lUpperArm.rotation.y = d2r(8);
  }
  if (rUpperArm) {
    rUpperArm.rotation.z = d2r(-25);
    rUpperArm.rotation.x = d2r(6);
    rUpperArm.rotation.y = d2r(-8);
  }

  if (lLowerArm) lLowerArm.rotation.z = d2r(18);
  if (rLowerArm) rLowerArm.rotation.z = d2r(-18);

  if (lHand) {
    lHand.rotation.z = d2r(6);
    lHand.rotation.x = d2r(4);
  }
  if (rHand) {
    rHand.rotation.z = d2r(-6);
    rHand.rotation.x = d2r(4);
  }
}

function normActionName(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "");
}

function pickClipByAction(clips, action) {
  if (!clips?.length) return null;
  const want = normActionName(action);

  const alias = {
    idle: ["idle", "stand", "default"],
    walk: ["walk", "run", "move", "locomotion"],
    wave: ["wave", "hello", "greet"],
    nod: ["nod", "yes", "headnod"],
    angry: ["angry", "mad"],
    smile: ["smile", "happy", "laugh"],
    crouch: ["crouch", "squat", "sitdown"],
  };

  const keys = alias[want] || [want];
  for (const k of keys) {
    const hit = clips.find((c) => normActionName(c.name).includes(k));
    if (hit) return hit;
  }
  return null;
}

function isIdleAction(action) {
  const a = normActionName(action);
  return !a || a === "idle" || a === "stand" || a === "default";
}

export default function Avatar3D({
  vrmId = "C1",
  variant = "sky",
  emotion = "idle",
  action = "idle",
  previewYaw = 0,
  onReady,
  inPlace = true,
}) {
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

  const vrmRef = useRef(null);
  const mixerRef = useRef(null);
  const currentActionRef = useRef(null);

  // ✅ 吃 root motion（只在播 clip 時才用）
  const hipsBasePosRef = useRef(null);

  // ✅ Idle/程序式動作：存 base pose（每幀回復，完全不漂移）
  const basePoseRef = useRef(null);

  // ✅ 目前是否在跑「程序式」動作（沒有 clip 時）
  const proceduralRef = useRef("idle");

  const tRef = useRef(0);

  const stopMixer = () => {
    const mixer = mixerRef.current;
    const v = vrmRef.current;
    if (!mixer || !v) return;
    try {
      mixer.stopAllAction();
      mixer.uncacheRoot(v.scene);
    } catch {}
    mixerRef.current = null;
    currentActionRef.current = null;
    hipsBasePosRef.current = null;
  };

  const captureBasePose = (v) => {
    if (!v?.humanoid) return null;
    const get = (name) => v.humanoid.getNormalizedBoneNode(name);
    const snapRot = (b) => (b ? b.quaternion.clone() : null);

    return {
      spine: snapRot(get("spine")),
      chest: snapRot(get("chest") || get("upperChest")),
      upperChest: snapRot(get("upperChest")),
      neck: snapRot(get("neck")),
      head: snapRot(get("head")),
      lShoulder: snapRot(get("leftShoulder")),
      rShoulder: snapRot(get("rightShoulder")),
      lUpperArm: snapRot(get("leftUpperArm")),
      rUpperArm: snapRot(get("rightUpperArm")),
      lLowerArm: snapRot(get("leftLowerArm")),
      rLowerArm: snapRot(get("rightLowerArm")),
      lHand: snapRot(get("leftHand")),
      rHand: snapRot(get("rightHand")),
      lUpperLeg: snapRot(get("leftUpperLeg")),
      rUpperLeg: snapRot(get("rightUpperLeg")),
      lLowerLeg: snapRot(get("leftLowerLeg")),
      rLowerLeg: snapRot(get("rightLowerLeg")),
      lFoot: snapRot(get("leftFoot")),
      rFoot: snapRot(get("rightFoot")),
    };
  };

  const restoreBasePose = (v, base) => {
    if (!v?.humanoid || !base) return;
    const get = (name) => v.humanoid.getNormalizedBoneNode(name);
    const put = (bone, q) => bone && q && bone.quaternion.copy(q);

    put(get("spine"), base.spine);
    put(get("chest") || get("upperChest"), base.chest || base.upperChest);
    put(get("upperChest"), base.upperChest);
    put(get("neck"), base.neck);
    put(get("head"), base.head);

    put(get("leftShoulder"), base.lShoulder);
    put(get("rightShoulder"), base.rShoulder);
    put(get("leftUpperArm"), base.lUpperArm);
    put(get("rightUpperArm"), base.rUpperArm);
    put(get("leftLowerArm"), base.lLowerArm);
    put(get("rightLowerArm"), base.rLowerArm);
    put(get("leftHand"), base.lHand);
    put(get("rightHand"), base.rHand);

    put(get("leftUpperLeg"), base.lUpperLeg);
    put(get("rightUpperLeg"), base.rUpperLeg);
    put(get("leftLowerLeg"), base.lLowerLeg);
    put(get("rightLowerLeg"), base.rLowerLeg);
    put(get("leftFoot"), base.lFoot);
    put(get("rightFoot"), base.rFoot);
  };

  const setFace = (v, mode) => {
    const em = v?.expressionManager;
    if (!em) return;

    const keys = ["happy", "angry", "sad", "relaxed", "neutral", "blink", "aa", "A"];
    keys.forEach((k) => {
      try {
        if (em.getExpression?.(k)) em.setValue(k, 0);
      } catch {}
    });

    if (mode === "smile") {
      if (em.getExpression?.("happy")) em.setValue("happy", 0.75);
      if (em.getExpression?.("relaxed")) em.setValue("relaxed", 0.2);
    } else if (mode === "angry") {
      if (em.getExpression?.("angry")) em.setValue("angry", 0.75);
    } else {
      if (em.getExpression?.("neutral")) em.setValue("neutral", 0.6);
    }

    em.update?.();
  };

  useEffect(() => {
    if (!vrm) return;

    VRMUtils.rotateVRM0(vrm);
    applyIdlePose(vrm);

    vrmRef.current = vrm;
    basePoseRef.current = captureBasePose(vrm);

    // 開場先當 idle（程序式）
    stopMixer();
    proceduralRef.current = "idle";
    tRef.current = 0;

    onReady?.();

    return () => {
      try {
        stopMixer();
        basePoseRef.current = null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vrm, gltf, vrmId]);

  useEffect(() => {
    const v = vrmRef.current;
    if (!v) return;

    const idleMode = isIdleAction(action);
    const clips = gltf?.animations || [];

    if (idleMode) {
      stopMixer();
      proceduralRef.current = "idle";
      tRef.current = 0;
      basePoseRef.current = captureBasePose(v) || basePoseRef.current;
      setFace(v, "idle");
      return;
    }

    const clip = pickClipByAction(clips, action);

    if (clip) {
      if (!mixerRef.current) mixerRef.current = new THREE.AnimationMixer(v.scene);
      const mixer = mixerRef.current;

      const next = mixer.clipAction(clip);
      next.reset().play();

      const prev = currentActionRef.current;
      if (prev && prev !== next) {
        prev.fadeOut(0.12);
        next.fadeIn(0.12);
      } else {
        next.fadeIn(0.12);
      }

      currentActionRef.current = next;
      hipsBasePosRef.current = null;
      proceduralRef.current = "idle";
      tRef.current = 0;
      setFace(v, "idle");
      return;
    }

    stopMixer();
    proceduralRef.current = normActionName(action);
    tRef.current = 0;

    if (proceduralRef.current === "smile") setFace(v, "smile");
    else if (proceduralRef.current === "angry") setFace(v, "angry");
    else setFace(v, "idle");
  }, [action, gltf]);

  useFrame((state, delta) => {
    const v = vrmRef.current;
    if (!v) return;

    const mixer = mixerRef.current;
    const idleMode = isIdleAction(action);

    if (!idleMode && mixer) mixer.update(delta);
    v.update(delta);

    if (!idleMode && mixer && inPlace && v.humanoid) {
      const hips = v.humanoid.getNormalizedBoneNode("hips");
      if (hips) {
        if (!hipsBasePosRef.current) hipsBasePosRef.current = hips.position.clone();
        hips.position.copy(hipsBasePosRef.current);
      }
    }

    const proc = proceduralRef.current || "idle";
    const base = basePoseRef.current;

    if (v.humanoid && base) {
      restoreBasePose(v, base);

      tRef.current += delta;
      const t = tRef.current;
      const d2r = THREE.MathUtils.degToRad;

      const spine = v.humanoid.getNormalizedBoneNode("spine");
      const chest = v.humanoid.getNormalizedBoneNode("chest") || v.humanoid.getNormalizedBoneNode("upperChest");
      const neck = v.humanoid.getNormalizedBoneNode("neck");
      const head = v.humanoid.getNormalizedBoneNode("head");

      const lShoulder = v.humanoid.getNormalizedBoneNode("leftShoulder");
      const rShoulder = v.humanoid.getNormalizedBoneNode("rightShoulder");
      const lUpperArm = v.humanoid.getNormalizedBoneNode("leftUpperArm");
      const rUpperArm = v.humanoid.getNormalizedBoneNode("rightUpperArm");
      const lLowerArm = v.humanoid.getNormalizedBoneNode("leftLowerArm");
      const rLowerArm = v.humanoid.getNormalizedBoneNode("rightLowerArm");
      const lHand = v.humanoid.getNormalizedBoneNode("leftHand");
      const rHand = v.humanoid.getNormalizedBoneNode("rightHand");

      const lUpperLeg = v.humanoid.getNormalizedBoneNode("leftUpperLeg");
      const rUpperLeg = v.humanoid.getNormalizedBoneNode("rightUpperLeg");
      const lLowerLeg = v.humanoid.getNormalizedBoneNode("leftLowerLeg");
      const rLowerLeg = v.humanoid.getNormalizedBoneNode("rightLowerLeg");

      // ✅ 市售感：呼吸/重心更小、更慢
      const breath = Math.sin(t * 1.15) * 0.012;
      const sway = Math.sin(t * 0.65) * 0.008;

      if (spine) {
        spine.rotation.x += breath * 0.55;
        spine.rotation.y += sway * 0.55;
      }
      if (chest) {
        chest.rotation.x += breath * 0.85;
        chest.rotation.y += sway * 0.55;
      }
      if (neck) neck.rotation.y += sway * 0.25;
      if (head) {
        head.rotation.y += sway * 0.25;
        head.rotation.x += Math.sin(t * 0.9) * 0.008;
      }

      // ===== 動作分支（全部降幅 + 降速）=====
      if (proc === "wave") {
        // ✅ 揮手：比較像「打招呼」不是「狂揮」
        const w = Math.sin(t * 4.2); // 降速
        if (rUpperArm) {
          rUpperArm.rotation.z += d2r(-45); // 原本 -65
          rUpperArm.rotation.x += d2r(10);
        }
        if (rLowerArm) rLowerArm.rotation.z += d2r(-18);
        if (rHand) rHand.rotation.y += w * d2r(14); // 原本 25
        if (rLowerArm) rLowerArm.rotation.y += w * d2r(6); // 原本 12
      } else if (proc === "nod") {
        // ✅ 點頭：小幅度
        const n = Math.sin(t * 2.4);
        if (head) head.rotation.x += n * d2r(6); // 原本 10
        if (neck) neck.rotation.x += n * d2r(3.5); // 原本 6
      } else if (proc === "walk") {
        // ✅ 原地走：像展示動作，不像跑步
        const speed = 3.0;
        const step = Math.sin(t * speed);
        const step2 = Math.sin(t * speed + Math.PI);

        const legSwing = d2r(14);  // 原本 22
        const kneeBend = d2r(10);  // 原本 18
        const armSwing = d2r(7);   // 原本 12

        if (lUpperLeg) lUpperLeg.rotation.x += step * legSwing;
        if (rUpperLeg) rUpperLeg.rotation.x += step2 * legSwing;

        if (lLowerLeg) lLowerLeg.rotation.x += Math.max(0, -step) * kneeBend;
        if (rLowerLeg) rLowerLeg.rotation.x += Math.max(0, -step2) * kneeBend;

        if (lUpperArm) lUpperArm.rotation.x += step2 * armSwing;
        if (rUpperArm) rUpperArm.rotation.x += step * armSwing;

        if (chest) chest.rotation.y += step * d2r(1.2); // 原本 2
      } else if (proc === "crouch") {
        // ✅ 蹲下：別蹲太深（更像選角展示）
        const k = 0.62; // 原本 0.85
        if (lUpperLeg) lUpperLeg.rotation.x += d2r(-26) * k;
        if (rUpperLeg) rUpperLeg.rotation.x += d2r(-26) * k;
        if (lLowerLeg) lLowerLeg.rotation.x += d2r(40) * k;
        if (rLowerLeg) rLowerLeg.rotation.x += d2r(40) * k;
        if (spine) spine.rotation.x += d2r(7) * k;
        if (chest) chest.rotation.x += d2r(6) * k;
      } else if (proc === "angry") {
        // ✅ 生氣：姿勢微壓迫，不要太戲
        if (chest) chest.rotation.x += d2r(3.5); // 原本 6
        if (head) head.rotation.x += d2r(-2);   // 原本 -3
        if (lShoulder) lShoulder.rotation.z += d2r(4.5);
        if (rShoulder) rShoulder.rotation.z += d2r(-4.5);
      } else if (proc === "smile") {
        // ✅ 微笑：像「友善點頭」很輕
        const s = Math.sin(t * 1.2);
        if (head) head.rotation.x += s * d2r(2.2); // 原本 3
        if (chest) chest.rotation.x += d2r(-1.2); // 原本 -2
      }
    }

    // ===== 預覽 yaw：上半身微量，不扭壞動作 =====
    if (v.humanoid) {
      const spine = v.humanoid.getNormalizedBoneNode("spine");
      const neck = v.humanoid.getNormalizedBoneNode("neck");
      const head = v.humanoid.getNormalizedBoneNode("head");

      const bodyYaw = previewYaw * 0.22;
      const headYaw = previewYaw * 0.6;

      if (spine) spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, bodyYaw, 0.18);
      if (neck) neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, headYaw * 0.35, 0.22);
      if (head) head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, headYaw, 0.25);
    }
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
        }
