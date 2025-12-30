//Avatar3D.jsx v004.002
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

  // 身體微調
  if (spine) spine.rotation.x = d2r(2);
  if (chest) chest.rotation.x = d2r(3);
  if (neck) neck.rotation.x = d2r(2);
  if (head) head.rotation.x = d2r(-1);

  // 肩放鬆（下沉 + 微後收）
  if (lShoulder) {
    lShoulder.rotation.z = d2r(6);
    lShoulder.rotation.y = d2r(4);
  }
  if (rShoulder) {
    rShoulder.rotation.z = d2r(-6);
    rShoulder.rotation.y = d2r(-4);
  }

  // 手臂從 T pose 放下來
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
  return clips[0];
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

  // ✅ 吃 root motion：鎖 hips 基準 position（只在播 clip 時才用）
  const hipsBasePosRef = useRef(null);

  // ✅ Idle 程序式：存一份 basePose（每幀從這裡回復，完全不漂移）
  const basePoseRef = useRef(null);

  // Idle 時間
  const idleTRef = useRef(0);

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
    };
  };

  const restoreBasePose = (v, base) => {
    if (!v?.humanoid || !base) return;
    const get = (name) => v.humanoid.getNormalizedBoneNode(name);
    const put = (bone, q) => bone && q && bone.quaternion.copy(q);

    put(get("spine"), base.spine);
    // chest 優先用 chest 的快照，沒有就 upperChest
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
  };

  useEffect(() => {
    if (!vrm) return;

    VRMUtils.rotateVRM0(vrm);
    applyIdlePose(vrm);

    vrmRef.current = vrm;

    // ✅ 存一份「放鬆站姿」當 base（Idle 程序式用）
    basePoseRef.current = captureBasePose(vrm);

    // ✅ 預設：如果不是 idle，才開 mixer 播動畫
    stopMixer();

    if (!isIdleAction(action)) {
      const mixer = new THREE.AnimationMixer(vrm.scene);
      mixerRef.current = mixer;
      hipsBasePosRef.current = null;

      const clips = gltf?.animations || [];
      const clip = pickClipByAction(clips, action);
      if (clip) {
        const a = mixer.clipAction(clip);
        a.reset().fadeIn(0.12).play();
        currentActionRef.current = a;
      }
    }

    idleTRef.current = 0;
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

  // action 變更：Idle <-> 非 Idle 切換 + 非 Idle crossfade
  useEffect(() => {
    const v = vrmRef.current;
    if (!v) return;

    // Idle：關 mixer（避免 clip 自己動）
    if (isIdleAction(action)) {
      stopMixer();
      hipsBasePosRef.current = null;
      idleTRef.current = 0;
      // 重新抓 base（有些模型載入後骨架晚一點才穩）
      basePoseRef.current = captureBasePose(v) || basePoseRef.current;
      return;
    }

    // 非 Idle：確保 mixer 存在
    if (!mixerRef.current) {
      mixerRef.current = new THREE.AnimationMixer(v.scene);
      currentActionRef.current = null;
    }

    const mixer = mixerRef.current;
    const clips = gltf?.animations || [];
    const nextClip = pickClipByAction(clips, action);
    if (!nextClip) return;

    const next = mixer.clipAction(nextClip);
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
  }, [action, gltf]);

  useFrame((state, delta) => {
    const v = vrmRef.current;
    if (!v) return;

    const mixer = mixerRef.current;
    const idleMode = isIdleAction(action);

    if (!idleMode && mixer) mixer.update(delta);

    // VRM 必須 update（表情/物理）
    v.update(delta);

    // ===== 1) 非 Idle：吃掉 root motion（避免往下沉 / 往前漂）=====
    if (!idleMode && inPlace && v.humanoid) {
      const hips = v.humanoid.getNormalizedBoneNode("hips");
      if (hips) {
        if (!hipsBasePosRef.current) hipsBasePosRef.current = hips.position.clone();
        hips.position.copy(hipsBasePosRef.current);
      }
    }

    // ===== 2) Idle：程序式站姿（每幀回到 base，再加小動作）=====
    if (idleMode && v.humanoid) {
      const base = basePoseRef.current;
      if (base) restoreBasePose(v, base);

      idleTRef.current += delta;
      const t = idleTRef.current;

      const spine = v.humanoid.getNormalizedBoneNode("spine");
      const chest = v.humanoid.getNormalizedBoneNode("chest") || v.humanoid.getNormalizedBoneNode("upperChest");
      const neck = v.humanoid.getNormalizedBoneNode("neck");
      const head = v.humanoid.getNormalizedBoneNode("head");
      const lShoulder = v.humanoid.getNormalizedBoneNode("leftShoulder");
      const rShoulder = v.humanoid.getNormalizedBoneNode("rightShoulder");
      const lUpperArm = v.humanoid.getNormalizedBoneNode("leftUpperArm");
      const rUpperArm = v.humanoid.getNormalizedBoneNode("rightUpperArm");

      // 非常小：像呼吸/重心微移（不會像搖頭娃娃）
      const breath = Math.sin(t * 1.45) * 0.018;
      const sway = Math.sin(t * 0.85) * 0.012;

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
        head.rotation.y += sway * 0.35;
        head.rotation.x += Math.sin(t * 1.05) * 0.01; // 微微點頭感（很小）
      }

      // 肩與手臂跟著呼吸一點點（更像活的）
      if (lShoulder) lShoulder.rotation.x += breath * 0.18;
      if (rShoulder) rShoulder.rotation.x += breath * 0.18;
      if (lUpperArm) lUpperArm.rotation.x += breath * 0.14;
      if (rUpperArm) rUpperArm.rotation.x += breath * 0.14;
    }

    // ===== 3) 預覽 yaw：只做「上半身」微量，不扭壞整套動作 =====
    if (v.humanoid) {
      const spine = v.humanoid.getNormalizedBoneNode("spine");
      const neck = v.humanoid.getNormalizedBoneNode("neck");
      const head = v.humanoid.getNormalizedBoneNode("head");

      const bodyYaw = previewYaw * 0.22;
      const headYaw = previewYaw * 0.60;

      if (spine) spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, bodyYaw, 0.18);
      if (neck) neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, headYaw * 0.35, 0.22);
      if (head) head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, headYaw, 0.25);
    }
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
}
