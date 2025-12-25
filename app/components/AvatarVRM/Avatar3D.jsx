// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

/**
 * VRM Loader Avatar
 * - 預設載入 /vrm/avatar.vrm
 * - 身體 yaw + 頭部 yaw（頭身分離）
 * - emotion 基礎表情/動作
 *
 * 放模型：public/vrm/avatar.vrm
 */
export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,
  modelUrl = "/vrm/avatar.vrm"
}) {
  const groupRef = useRef(null);
  const vrmRef = useRef(null);
  const headBoneRef = useRef(null);
  const baseHeadRotRef = useRef(new THREE.Euler());
  const didInitRef = useRef(false);

  // 依 variant 給一個「輕微染色」色票（不會整個變色太誇張）
  const tint = useMemo(() => {
    if (variant === "mint") return new THREE.Color("#7CFFD2");
    if (variant === "purple") return new THREE.Color("#D2AAFF");
    return new THREE.Color("#A0DCFF"); // sky
  }, [variant]);

  // 用 GLTFLoader + VRMLoaderPlugin 載入 VRM
  const gltf = useLoader(
    GLTFLoader,
    modelUrl,
    (loader) => {
      loader.register((parser) => new VRMLoaderPlugin(parser));
    }
  );

  useEffect(() => {
    if (!gltf) return;

    const vrm = gltf.userData.vrm;
    if (!vrm) {
      console.warn("[Avatar3D] VRM not found in gltf.userData.vrm");
      return;
    }

    // 清理 VRM（建議）
    VRMUtils.removeUnnecessaryVertices(vrm.scene);
    VRMUtils.removeUnnecessaryJoints(vrm.scene);

    // 降低「看起來很暗」的風險：把材質做一點點提亮 & 染色
    vrm.scene.traverse((obj) => {
      if (!obj.isMesh) return;
      const mat = obj.material;
      if (!mat) return;

      // 有些 VRM 會是 material array
      const mats = Array.isArray(mat) ? mat : [mat];
      mats.forEach((m) => {
        if (!m) return;
        // 只對有 color 的材質做輕微染色
        if (m.color && m.color.isColor) {
          // mix tint 15%
          const c = m.color.clone();
          c.lerp(tint, 0.15);
          m.color.copy(c);
          m.needsUpdate = true;
        }
        // 稍微提亮（避免深色背景全黑）
        if (typeof m.roughness === "number") m.roughness = Math.min(1, m.roughness + 0.05);
        if (typeof m.metalness === "number") m.metalness = Math.max(0, m.metalness - 0.05);
      });
    });

    // 找 head bone（VRM humanoid）
    const humanoid = vrm.humanoid;
    const head = humanoid?.getRawBoneNode("head") || null;

    vrmRef.current = vrm;
    headBoneRef.current = head;

    // 記住 head 初始 rotation（避免每幀覆蓋造成跳動）
    if (head) {
      baseHeadRotRef.current.copy(head.rotation);
    }

    // 第一次載入時，放到 group 下
    if (groupRef.current && vrm.scene.parent !== groupRef.current) {
      groupRef.current.add(vrm.scene);
    }

    didInitRef.current = true;

    return () => {
      // cleanup
      try {
        if (groupRef.current && vrm.scene.parent === groupRef.current) {
          groupRef.current.remove(vrm.scene);
        }
        VRMUtils.deepDispose(vrm.scene);
      } catch {}
      vrmRef.current = null;
      headBoneRef.current = null;
      didInitRef.current = false;
    };
  }, [gltf, tint]);

  // 小工具：安全設定表情（VRM0/VRM1 名稱可能不同）
  const setExpression = (vrm, name, value) => {
    const em = vrm?.expressionManager;
    if (!em) return;
    try {
      em.setValue(name, value);
    } catch {}
  };

  // 每幀更新：VRM update + 情緒動作 + previewYaw
  useFrame((state, delta) => {
    const vrm = vrmRef.current;
    if (!vrm || !didInitRef.current) return;

    // VRM 內部 update（很重要：表情、物理等）
    vrm.update(delta);

    // previewYaw：身體
    // 讓「身體轉得穩」，避免太敏感
    const bodyYaw = previewYaw * 1.0; // radians
    if (groupRef.current) {
      groupRef.current.rotation.y = bodyYaw;
    }

    // 頭身分離：頭部再多轉一點
    const head = headBoneRef.current;
    if (head) {
      const headYaw = previewYaw * 1.8; // radians
      head.rotation.y = baseHeadRotRef.current.y + headYaw;
    }

    // 情緒動作（輕量，不會太吵）
    const t = state.clock.getElapsedTime();

    // reset expressions
    // VRM1 常見：happy, angry, sad, relaxed, surprised
    // VRM0 有時：Joy, Angry, Sorrow, Fun
    const clearAll = () => {
      setExpression(vrm, "happy", 0);
      setExpression(vrm, "angry", 0);
      setExpression(vrm, "sad", 0);
      setExpression(vrm, "relaxed", 0);
      setExpression(vrm, "surprised", 0);

      setExpression(vrm, "Joy", 0);
      setExpression(vrm, "Angry", 0);
      setExpression(vrm, "Sorrow", 0);
      setExpression(vrm, "Fun", 0);
    };

    clearAll();

    // 基本呼吸/漂浮
    const bob =
      emotion === "happy" ? 0.06 :
      emotion === "thinking" ? 0.03 :
      emotion === "sorry" ? 0.018 :
      0.025;

    const speed =
      emotion === "happy" ? 2.6 :
      emotion === "thinking" ? 1.5 :
      1.2;

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * speed) * bob;
    }

    // 表情權重
    if (emotion === "happy") {
      setExpression(vrm, "happy", 0.8);
      setExpression(vrm, "Joy", 0.8);
    } else if (emotion === "thinking") {
      setExpression(vrm, "relaxed", 0.35);
      setExpression(vrm, "Fun", 0.25);
    } else if (emotion === "sad") {
      setExpression(vrm, "sad", 0.65);
      setExpression(vrm, "Sorrow", 0.65);
    } else if (emotion === "sorry") {
      setExpression(vrm, "sad", 0.35);
      setExpression(vrm, "Sorrow", 0.35);
      setExpression(vrm, "relaxed", 0.15);
    }
  });

  // 這個 group 會被 AvatarStage 放在 scene 裡
  return <group ref={groupRef} />;
}
