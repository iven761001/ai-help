//Avatar3D.jsx v003.000
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

  // 找不到就回傳第一個（至少會動）
  return clips[0];
}

export default function Avatar3D({
  vrmId = "C1",
  variant = "sky",
  emotion = "idle",
  action = "idle",
  previewYaw = 0,
  onReady,
  /** ✅ 重點：把動畫位移吃掉，變成「原地動作」 */
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

  // ✅ 用來「吃掉 root motion」：鎖 hips 的基準 position
  const hipsBasePosRef = useRef(null);

  // ✅ 呼吸/輕微動作基準（不跟動畫打架）
  const tRef = useRef(0);

  useEffect(() => {
    if (!vrm) return;

    VRMUtils.rotateVRM0(vrm);
    applyIdlePose(vrm);

    vrmRef.current = vrm;

    // AnimationMixer：掛在 vrm.scene
    const mixer = new THREE.AnimationMixer(vrm.scene);
    mixerRef.current = mixer;

    // 重置 hipsBase（換模型就重抓）
    hipsBasePosRef.current = null;

    // 先播放一次（避免空白）
    const clips = gltf?.animations || [];
    const clip = pickClipByAction(clips, action);
    if (clip) {
      const a = mixer.clipAction(clip);
      a.reset().fadeIn(0.12).play();
      currentActionRef.current = a;
    }

    onReady?.();

    return () => {
      try {
        currentActionRef.current = null;
        hipsBasePosRef.current = null;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vrm, gltf, action]);

  // action 變更：crossfade
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

    // ✅ 換動作時也重抓一次 hips base（避免 crouch/walk 一開始就把 base 設錯）
    hipsBasePosRef.current = null;
  }, [action, gltf]);

  useFrame((state, delta) => {
    const v = vrmRef.current;
    if (!v) return;

    const mixer = mixerRef.current;
    if (mixer) mixer.update(delta);

    // VRM 必須 update
    v.update(delta);

    // ===== A) 把 root motion 吃掉（重點）=====
    if (inPlace && v.humanoid) {
      const hips = v.humanoid.getNormalizedBoneNode("hips");
      if (hips) {
        if (!hipsBasePosRef.current) {
          hipsBasePosRef.current = hips.position.clone();
        }
        // 把 animation 帶的位移全部吃掉（x/y/z 都鎖回去）
        hips.position.copy(hipsBasePosRef.current);
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

    // ===== C) 很輕的活著感（不動 root，只動上半身 rotation）=====
    tRef.current += delta;
    const t = tRef.current;

    if (v.humanoid) {
      const chest = v.humanoid.getNormalizedBoneNode("chest") || v.humanoid.getNormalizedBoneNode("upperChest");
      const head = v.humanoid.getNormalizedBoneNode("head");
      const breath = Math.sin(t * 1.6) * 0.012;

      if (chest) chest.rotation.x += breath;
      if (head) head.rotation.x += Math.sin(t * 1.1) * 0.006;
    }
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
}
