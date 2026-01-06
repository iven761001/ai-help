// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

/** 放鬆站姿（比 v004.005 更不 T-pose） */
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
    "leftEye", // 確保眼睛也重置
    "rightEye",
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

  // 身體微微挺胸、頭微收
  if (spine) spine.rotation.x = d2r(2);
  if (chest) chest.rotation.x = d2r(4);
  if (neck) neck.rotation.x = d2r(2);
  if (head) head.rotation.x = d2r(-2);

  // 肩膀下沉一點（不會那麼「張」）
  if (lShoulder) {
    lShoulder.rotation.z = d2r(4);
    lShoulder.rotation.y = d2r(3);
  }
  if (rShoulder) {
    rShoulder.rotation.z = d2r(-4);
    rShoulder.rotation.y = d2r(-3);
  }

  // 手臂不要抬太開：把上臂外展角度降低
  if (lUpperArm) {
    lUpperArm.rotation.z = d2r(14);
    lUpperArm.rotation.x = d2r(6);
    lUpperArm.rotation.y = d2r(6);
  }
  if (rUpperArm) {
    rUpperArm.rotation.z = d2r(-14);
    rUpperArm.rotation.x = d2r(6);
    rUpperArm.rotation.y = d2r(-6);
  }

  if (lLowerArm) lLowerArm.rotation.z = d2r(10);
  if (rLowerArm) rLowerArm.rotation.z = d2r(-10);

  if (lHand) {
    lHand.rotation.z = d2r(3);
    lHand.rotation.x = d2r(3);
  }
  if (rHand) {
    rHand.rotation.z = d2r(-3);
    rHand.rotation.x = d2r(3);
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

  // 吃 root motion（播 clip 才用）
  const hipsBasePosRef = useRef(null);

  // 程序式動作的 base pose
  const basePoseRef = useRef(null);

  // 程序式模式（idle / wave / walk / ...）
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
    const snap = (b) => (b ? b.quaternion.clone() : null);

    return {
      hips: snap(get("hips")),
      spine: snap(get("spine")),
      chest: snap(get("chest") || get("upperChest")),
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
      lFoot: snap(get("leftFoot")),
      rFoot: snap(get("rightFoot")),
    };
  };

  const restoreBasePose = (v, base) => {
    if (!v?.humanoid || !base) return;
    const get = (name) => v.humanoid.getNormalizedBoneNode(name);
    const put = (bone, q) => bone && q && bone.quaternion.copy(q);

    put(get("hips"), base.hips);
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

    // blink 先不歸零，交給 useFrame 控制
    const keys = ["happy", "angry", "sad", "relaxed", "neutral", "aa", "A"];
    keys.forEach((k) => {
      try {
        if (em.getExpression?.(k)) em.setValue(k, 0);
      } catch {}
    });

    if (mode === "smile") {
      if (em.getExpression?.("happy")) em.setValue("happy", 0.9);
    } else if (mode === "angry") {
      if (em.getExpression?.("angry")) em.setValue("angry", 0.85);
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

    // 開場先 idle
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

    // --- 新增：自動眨眼邏輯 ---
    const blinkTimer = state.clock.elapsedTime;
    // 創造一個週期波，每隔幾秒出現一個尖峰
    const blinkTrigger = Math.sin(blinkTimer * 1.5); // 調整 1.5 可改變眨眼頻率
    // 透過 math計算，只取波峰部分，並限制在 0~1 之間
    const blinkVal = THREE.MathUtils.clamp(blinkTrigger * 6 - 5, 0, 1);
    
    if (v.expressionManager) {
        // 如果目前不是生氣或大笑這種極端表情，就疊加眨眼
        // 這裡直接設定數值
        v.expressionManager.setValue('blink', blinkVal);
        v.expressionManager.update();
    }
    // -------------------------

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

      const hips = v.humanoid.getNormalizedBoneNode("hips");
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
      const lFoot = v.humanoid.getNormalizedBoneNode("leftFoot");
      const rFoot = v.humanoid.getNormalizedBoneNode("rightFoot");
      
      // --- 新增：眼球微動 (生物感) ---
      const lEye = v.humanoid.getNormalizedBoneNode("leftEye");
      const rEye = v.humanoid.getNormalizedBoneNode("rightEye");
      if(lEye && rEye) {
          // 產生非常微小的隨機飄動
          const eyeSwayX = Math.sin(t * 0.4) * 0.04;
          const eyeSwayY = Math.cos(t * 0.25) * 0.03;
          
          // 如果有 previewYaw (轉動視角)，眼睛可以比頭轉得更多一點 (Lead the turn)
          const lookBias = previewYaw * 0.5;

          lEye.rotation.y = eyeSwayX + lookBias;
          lEye.rotation.x = eyeSwayY;
          rEye.rotation.y = eyeSwayX + lookBias;
          rEye.rotation.x = eyeSwayY;
      }
      // -----------------------------

      const breath = Math.sin(t * 1.45) * 0.016;
      const sway = Math.sin(t * 0.85) * 0.010;

      if (spine) {
        spine.rotation.x += breath * 0.55;
        spine.rotation.y += sway * 0.55;
      }
      if (chest) {
        chest.rotation.x += breath * 0.9;
        chest.rotation.y += sway * 0.6;
      }
      if (neck) neck.rotation.y += sway * 0.25;
      if (head) {
        head.rotation.y += sway * 0.35;
        head.rotation.x += Math.sin(t * 1.05) * 0.008;
      }

      if (proc === "wave") {
        if (rUpperArm) {
          rUpperArm.rotation.z += d2r(-55);
          rUpperArm.rotation.x += d2r(18);
        }
        if (rLowerArm) rLowerArm.rotation.z += d2r(-18);
        const w = Math.sin(t * 6.5);
        if (rHand) rHand.rotation.y += w * d2r(25);
        if (rLowerArm) rLowerArm.rotation.y += w * d2r(12);
      } else if (proc === "nod") {
        const n = Math.sin(t * 3.2);
        if (head) head.rotation.x += n * d2r(10);
        if (neck) neck.rotation.x += n * d2r(6);
      } else if (proc === "walk") {
        const speed = 4.6;
        const step = Math.sin(t * speed);
        const step2 = Math.sin(t * speed + Math.PI);

        const lift = Math.max(0, -step);
        const lift2 = Math.max(0, -step2);

        if (hips) {
          hips.rotation.y += step * d2r(3.5);
          hips.rotation.z += step * d2r(2.2);
          hips.rotation.x += Math.abs(step) * d2r(1.4);
        }

        if (lUpperLeg) lUpperLeg.rotation.x += step * d2r(26);
        if (rUpperLeg) rUpperLeg.rotation.x += step2 * d2r(26);

        if (lLowerLeg) lLowerLeg.rotation.x += lift * d2r(22);
        if (rLowerLeg) rLowerLeg.rotation.x += lift2 * d2r(22);

        if (lFoot) lFoot.rotation.x += (lift * d2r(10)) + (Math.max(0, step) * d2r(-6));
        if (rFoot) rFoot.rotation.x += (lift2 * d2r(10)) + (Math.max(0, step2) * d2r(-6));

        if (lUpperArm) lUpperArm.rotation.x += step2 * d2r(18);
        if (rUpperArm) rUpperArm.rotation.x += step * d2r(18);
        if (lLowerArm) lLowerArm.rotation.x += Math.max(0, step2) * d2r(6);
        if (rLowerArm) rLowerArm.rotation.x += Math.max(0, step) * d2r(6);

        if (chest) chest.rotation.y += -step * d2r(3.0);
        if (spine) spine.rotation.y += -step * d2r(1.6);
      } else if (proc === "crouch") {
        const k = 0.85;
        if (lUpperLeg) lUpperLeg.rotation.x += d2r(-35) * k;
        if (rUpperLeg) rUpperLeg.rotation.x += d2r(-35) * k;
        if (lLowerLeg) lLowerLeg.rotation.x += d2r(55) * k;
        if (rLowerLeg) rLowerLeg.rotation.x += d2r(55) * k;
        if (spine) spine.rotation.x += d2r(10) * k;
        if (chest) chest.rotation.x += d2r(8) * k;
      } else if (proc === "angry") {
        if (chest) chest.rotation.x += d2r(6);
        if (head) head.rotation.x += d2r(-3);
        if (lShoulder) lShoulder.rotation.z += d2r(6);
        if (rShoulder) rShoulder.rotation.z += d2r(-6);
      } else if (proc === "smile") {
        const s = Math.sin(t * 1.6);
        if (head) head.rotation.x += s * d2r(3);
        if (chest) chest.rotation.x += d2r(-2);
      }
    }

    // 預覽 yaw
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
