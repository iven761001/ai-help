// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

/** 放鬆站姿設定 */
function applyIdlePose(vrm) {
  if (!vrm?.humanoid) return;
  const get = (name) => vrm.humanoid.getNormalizedBoneNode(name);
  const d2r = THREE.MathUtils.degToRad;
  const reset = (b) => b && b.rotation.set(0, 0, 0);

  [
    "hips", "spine", "chest", "upperChest", "neck", "head",
    "leftShoulder", "rightShoulder",
    "leftUpperArm", "rightUpperArm", "leftLowerArm", "rightLowerArm",
    "leftHand", "rightHand",
    "leftUpperLeg", "rightUpperLeg", "leftLowerLeg", "rightLowerLeg",
    "leftFoot", "rightFoot", "leftEye", "rightEye",
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
  if (chest) chest.rotation.x = d2r(4);
  if (neck) neck.rotation.x = d2r(2);
  if (head) head.rotation.x = d2r(-2);

  if (lShoulder) { lShoulder.rotation.z = d2r(4); lShoulder.rotation.y = d2r(3); }
  if (rShoulder) { rShoulder.rotation.z = d2r(-4); rShoulder.rotation.y = d2r(-3); }

  if (lUpperArm) { lUpperArm.rotation.z = d2r(14); lUpperArm.rotation.x = d2r(6); lUpperArm.rotation.y = d2r(6); }
  if (rUpperArm) { rUpperArm.rotation.z = d2r(-14); rUpperArm.rotation.x = d2r(6); rUpperArm.rotation.y = d2r(-6); }

  if (lLowerArm) lLowerArm.rotation.z = d2r(10);
  if (rLowerArm) rLowerArm.rotation.z = d2r(-10);

  if (lHand) { lHand.rotation.z = d2r(3); lHand.rotation.x = d2r(3); }
  if (rHand) { rHand.rotation.z = d2r(-3); rHand.rotation.x = d2r(3); }
}

function normActionName(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
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
  // 構建模型路徑
  const url = useMemo(() => `/vrm/${vrmId}.vrm`, [vrmId]);

  // 載入 VRM
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
  const hipsBasePosRef = useRef(null);
  const basePoseRef = useRef(null);
  const proceduralRef = useRef("idle");
  const tRef = useRef(0);

  // 停止動畫混合器
  const stopMixer = () => {
    const mixer = mixerRef.current;
    if (!mixer) return;
    try {
      mixer.stopAllAction();
      if (vrmRef.current) mixer.uncacheRoot(vrmRef.current.scene);
    } catch (e) {
      console.warn("Mixer stop error", e);
    }
    mixerRef.current = null;
    currentActionRef.current = null;
    hipsBasePosRef.current = null;
  };

  // 抓取基礎姿勢
  const captureBasePose = (v) => {
    if (!v?.humanoid) return null;
    const get = (name) => v.humanoid.getNormalizedBoneNode(name);
    const snap = (b) => (b ? b.quaternion.clone() : null);

    // 簡化寫法，抓取所有重要骨骼
    const bones = [
      "hips", "spine", "chest", "upperChest", "neck", "head",
      "leftShoulder", "rightShoulder", "leftUpperArm", "rightUpperArm",
      "leftLowerArm", "rightLowerArm", "leftHand", "rightHand",
      "leftUpperLeg", "rightUpperLeg", "leftLowerLeg", "rightLowerLeg",
      "leftFoot", "rightFoot"
    ];
    
    const pose = {};
    bones.forEach(b => { pose[b] = snap(get(b)); });
    return pose;
  };

  // 還原基礎姿勢
  const restoreBasePose = (v, base) => {
    if (!v?.humanoid || !base) return;
    const get = (name) => v.humanoid.getNormalizedBoneNode(name);
    const put = (name, q) => {
      const bone = get(name);
      if (bone && q) bone.quaternion.copy(q);
    };

    Object.keys(base).forEach(key => put(key, base[key]));
  };

  // 表情控制
  const setFace = (v, mode) => {
    const em = v?.expressionManager;
    if (!em) return;

    // 這些表情歸零，但 blink 不歸零 (交給 useFrame)
    ["happy", "angry", "sad", "relaxed", "neutral", "aa", "A"].forEach((k) => {
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

  // 1. 初始化 VRM
  useEffect(() => {
    if (!vrm) return;

    VRMUtils.rotateVRM0(vrm);
    applyIdlePose(vrm);

    vrmRef.current = vrm;
    basePoseRef.current = captureBasePose(vrm);

    stopMixer();
    proceduralRef.current = "idle";
    tRef.current = 0;

    onReady?.();

    // 🌟 關鍵修正：移除這裡的 dispose 邏輯
    // 我們不應該手動銷毀 gltf 的材質，因為 useLoader 會快取它
    // 如果手動銷毀，下次切換回來時就會拿到壞掉的模型 -> 導致黑畫面
    return () => {
      stopMixer();
      vrmRef.current = null;
      // 不要執行 vrm.scene.traverse(dispose) !!!
    };
  }, [vrm, gltf, vrmId]); // 依賴 vrmId 確保切換時重新執行

  // 2. 動作/表情 切換邏輯
  useEffect(() => {
    const v = vrmRef.current;
    if (!v) return;

    const idleMode = isIdleAction(action);
    const clips = gltf?.animations || [];

    if (idleMode) {
      stopMixer();
      proceduralRef.current = "idle";
      tRef.current = 0;
      // 如果有抓過 base pose 就用，沒有就重抓
      if (!basePoseRef.current) basePoseRef.current = captureBasePose(v);
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
  }, [action, gltf]); // 監聽動作變化

  // 3. 每一幀的動畫迴圈
  useFrame((state, delta) => {
    const v = vrmRef.current;
    if (!v) return;

    // --- A. 自動眨眼 (Safe Blink) ---
    if (v.expressionManager) {
      const blinkTimer = state.clock.elapsedTime;
      const blinkTrigger = Math.sin(blinkTimer * 1.5);
      const blinkVal = THREE.MathUtils.clamp(blinkTrigger * 6 - 5, 0, 1);
      v.expressionManager.setValue('blink', blinkVal);
      v.expressionManager.update();
    }

    // --- B. 動作混合器 update ---
    const mixer = mixerRef.current;
    const idleMode = isIdleAction(action);
    if (!idleMode && mixer) mixer.update(delta);
    
    // 必須更新 VRM 物理 (頭髮/裙子)
    v.update(delta);

    // --- C. 程序式動畫 (呼吸 / 走路 / 揮手) ---
    const proc = proceduralRef.current || "idle";
    const base = basePoseRef.current;

    // 只有在 humanoid 準備好且有 base pose 時才執行
    if (v.humanoid && base) {
      restoreBasePose(v, base); // 每一幀還原，避免誤差累積

      tRef.current += delta;
      const t = tRef.current;
      const d2r = THREE.MathUtils.degToRad;

      // 取得骨骼節點 (Helper function)
      const getBone = (n) => v.humanoid.getNormalizedBoneNode(n);
      
      const spine = getBone("spine");
      const chest = getBone("chest") || getBone("upperChest");
      const head = getBone("head");
      const neck = getBone("neck");

      // 眼球微動
      const lEye = getBone("
