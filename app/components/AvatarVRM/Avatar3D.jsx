//Avatar3D.jsx v004.000
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
  return clips[0];
}

export default function Avatar3D({
  vrmId = "C1",
  variant = "sky",
  emotion = "idle",
  action = "idle",
  previewYaw = 0,
  onReady,
  /**
   * ✅ 原地動作：只吃掉水平位移（X/Z）
   * - 保留 Y：蹲下/走路上下起伏才自然
   */
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

  // ✅ 吃掉 root motion：鎖 hips 的「水平」基準
  const hipsBasePosRef = useRef(null);

  // ✅ 呼吸/活著感：存基準 rotation（避免 += 累積）
  const baseRotRef = useRef({
    chest: null,
    upperChest: null,
    head: null,
  });

  const tRef = useRef(0);

  // ===== ① 模型載入/初始化（只跟 vrm/url 走）=====
  useEffect(() => {
    if (!vrm) return;

    VRMUtils.rotateVRM0(vrm);
    applyIdlePose(vrm);

    vrmRef.current = vrm;

    // mixer
    const mixer = new THREE.AnimationMixer(vrm.scene);
    mixerRef.current = mixer;

    // reset bases
    hipsBasePosRef.current = null;

    const get = (name) => vrm.humanoid?.getNormalizedBoneNode(name);
    const chest = get("chest");
    const upperChest = get("upperChest");
    const head = get("head");

    baseRotRef.current = {
      chest: chest ? chest.rotation.clone() : null,
      upperChest: upperChest ? upperChest.rotation.clone() : null,
      head: head ? head.rotation.clone() : null,
    };

    tRef.current = 0;

    onReady?.();

    return () => {
      try {
        currentActionRef.current = null;
        hipsBasePosRef.current = null;
        baseRotRef.current = { chest: null, upperChest: null, head: null };

        mixer.stopAllAction();
        mixer.uncacheRoot(vrm.scene);

        mixerRef.current = null;
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
  }, [vrm, url, onReady]);

  // ===== ② action 變更：只做 crossfade（不要重建 mixer）=====
  useEffect(() => {
    const v = vrmRef.current;
    const mixer = mixerRef.current;
    if (!v || !mixer) return;

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

    // ✅ 換動作重抓水平基準（避免一開始就被偏移）
    hipsBasePosRef.current = null;
  }, [action, gltf]);

  useFrame((state, delta) => {
    const v = vrmRef.current;
    if (!v) return;

    const mixer = mixerRef.current;
    if (mixer) mixer.update(delta);

    v.update(delta);

    // ===== A) 原地動作：只吃掉 hips 的 X/Z =====
    if (inPlace && v.humanoid) {
      const hips = v.humanoid.getNormalizedBoneNode("hips");
      if (hips) {
        if (!hipsBasePosRef.current) {
          hipsBasePosRef.current = hips.position.clone();
        }
        hips.position.x = hipsBasePosRef.current.x;
        hips.position.z = hipsBasePosRef.current.z;
        // ✅ 不鎖 y（蹲下/上下起伏才自然）
      }
    }

    // ===== B) 預覽 yaw（頭大、身小）=====
    if (v.humanoid) {
      const spine = v.humanoid.getNormalizedBoneNode("spine");
      const neck = v.humanoid.getNormalizedBoneNode("neck");
      const head = v.humanoid.getNormalizedBoneNode("head");

      const bodyYaw = previewYaw * 0.25;
      const headYaw = previewYaw * 0.75;

      if (spine) spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, bodyYaw, 0.18);
      if (neck) neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, headYaw * 0.35, 0.22);
      if (head) head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, headYaw, 0.25);
    }

    // ===== C) 活著感：用 base + offset（避免 += 累積）=====
    tRef.current += delta;
    const t = tRef.current;

    if (v.humanoid) {
      const chest = v.humanoid.getNormalizedBoneNode("chest");
      const upperChest = v.humanoid.getNormalizedBoneNode("upperChest");
      const head = v.humanoid.getNormalizedBoneNode("head");

      const base = baseRotRef.current;

      // 呼吸幅度（很小）
      const breath = Math.sin(t * 1.6) * 0.012;
      const nod = Math.sin(t * 1.1) * 0.006;

      // 胸口：chest 有就用 chest，沒有就用 upperChest
      if (chest && base.chest) {
        chest.rotation.copy(base.chest);
        chest.rotation.x += breath;
      } else if (upperChest && base.upperChest) {
        upperChest.rotation.copy(base.upperChest);
        upperChest.rotation.x += breath;
      }

      if (head && base.head) {
        head.rotation.copy(base.head);
        head.rotation.x += nod;
      }
    }
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
}
