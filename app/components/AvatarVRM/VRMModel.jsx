// app/components/AvatarVRM/VRMModel.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

export default function VRMModel({ url, emotion = "idle", previewYaw = 0 }) {
  const [vrm, setVrm] = useState(null);
  const groupRef = useRef();

  // --- 假嘴型（之後你可以把它換成：TTS 音量 / WebAudio 分析值） ---
  const mouthOpen = useRef(0);

  // 載入 VRM
  useEffect(() => {
    let disposed = false;

    (async () => {
      const loader = new THREE.GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      const gltf = await loader.loadAsync(url);
      if (disposed) return;

      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.removeUnnecessaryJoints(gltf.scene);

      const _vrm = gltf.userData.vrm; // VRM instance
      if (!_vrm) throw new Error("VRM load failed: gltf.userData.vrm is empty");

      // 畫面方向（VRM 常見是 Z- forward）
      _vrm.scene.rotation.y = Math.PI; // 讓角色面向鏡頭（若你的模型方向已正確可移除）

      setVrm(_vrm);
    })().catch((e) => {
      console.error("[VRM] load error:", e);
    });

    return () => {
      disposed = true;
      setVrm(null);
    };
  }, [url]);

  // 每次 emotion 變化，設表情
  useEffect(() => {
    if (!vrm?.expressionManager) return;

    const em = vrm.expressionManager;

    // 全清（避免疊太多）
    const all = ["happy", "sad", "angry", "relaxed", "neutral"];
    all.forEach((k) => em.setValue(k, 0));

    // 你可以依你的情緒 mapping 調整
    if (emotion === "happy") em.setValue("happy", 0.9);
    else if (emotion === "sad") em.setValue("sad", 0.8);
    else if (emotion === "angry") em.setValue("angry", 0.75);
    else em.setValue("neutral", 0.6);

    em.update();
  }, [emotion, vrm]);

  // blink 計時
  const blinkT = useRef(0);
  const blinkState = useRef(0);

  useFrame(({ clock }, dt) => {
    if (!vrm) return;

    const t = clock.getElapsedTime();

    // --- 1) VRM 更新（必要） ---
    vrm.update(dt);

    // --- 2) 頭身分離旋轉（你的需求） ---
    // 身體小幅、頭部大幅
    const bodyYaw = previewYaw * 0.25;
    const headYaw = previewYaw * 0.75;

    const humanoid = vrm.humanoid;
    const head = humanoid?.getRawBoneNode("head");
    const neck = humanoid?.getRawBoneNode("neck");
    const spine = humanoid?.getRawBoneNode("spine") || humanoid?.getRawBoneNode("chest");

    if (spine) spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, bodyYaw, 0.18);
    if (neck) neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, headYaw * 0.35, 0.22);
    if (head) head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, headYaw, 0.25);

    // --- 3) idle 呼吸/擺動（讓它更像活的） ---
    const hips = humanoid?.getRawBoneNode("hips");
    if (hips) {
      hips.position.y = Math.sin(t * 1.2) * 0.01;
      hips.rotation.z = Math.sin(t * 0.8) * 0.02;
    }

    // --- 4) 眨眼（VRM 表情 blink）---
    // 每 3~5 秒眨一次，眨眼過程 0.12s 左右
    blinkT.current += dt;
    const nextBlinkInterval = 3.0 + (Math.sin(t * 0.17) * 0.8 + 0.8); // ~3~4.6

    if (blinkT.current > nextBlinkInterval && blinkState.current === 0) {
      blinkState.current = 1;
      blinkT.current = 0;
    }

    if (vrm.expressionManager) {
      if (blinkState.current === 1) {
        // closing
        const v = Math.min(1, (blinkT.current / 0.06));
        vrm.expressionManager.setValue("blink", v);
        if (v >= 1) {
          blinkState.current = 2;
          blinkT.current = 0;
        }
      } else if (blinkState.current === 2) {
        // opening
        const v = Math.max(0, 1 - (blinkT.current / 0.08));
        vrm.expressionManager.setValue("blink", v);
        if (v <= 0) {
          blinkState.current = 0;
          blinkT.current = 0;
        }
      } else {
        vrm.expressionManager.setValue("blink", 0);
      }
    }

    // --- 5) 嘴型（先用假值示範） ---
    // 你等下只要把 mouthOpen.current 改成「音量」就會自然說話
    // 這裡做一點點呼吸式動作
    mouthOpen.current = 0.12 + 0.08 * Math.sin(t * 2.2);

    if (vrm.expressionManager) {
      // VRM 1.0 常用 "aa"、有些模型是 "A"
      const aaKey = vrm.expressionManager.getExpression("aa") ? "aa" : "A";
      vrm.expressionManager.setValue(aaKey, THREE.MathUtils.clamp(mouthOpen.current, 0, 1));
      vrm.expressionManager.update();
    }
  });

  if (!vrm) return null;

  return (
    <group ref={groupRef} position={[0, -1.05, 0]}>
      <primitive object={vrm.scene} />
    </group>
  );
}


