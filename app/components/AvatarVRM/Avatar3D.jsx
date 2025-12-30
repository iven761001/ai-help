//Avatar3D.jsx v001.001
// app/components/AvatarVRM/Avatar3D.jsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

function applyIdlePose(vrm) {
  if (!vrm?.humanoid) return;
  const get = (name) => vrm.humanoid.getNormalizedBoneNode(name);
  const resetBone = (bone) => bone && bone.rotation.set(0, 0, 0);

  [
    "hips","spine","chest","upperChest","neck","head",
    "leftShoulder","rightShoulder",
    "leftUpperArm","rightUpperArm",
    "leftLowerArm","rightLowerArm",
    "leftHand","rightHand",
    "leftUpperLeg","rightUpperLeg",
    "leftLowerLeg","rightLowerLeg",
    "leftFoot","rightFoot"
  ].forEach((b) => resetBone(get(b)));

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

  if (spine) spine.rotation.x = THREE.MathUtils.degToRad(2);
  if (chest) chest.rotation.x = THREE.MathUtils.degToRad(3);
  if (neck) neck.rotation.x = THREE.MathUtils.degToRad(2);
  if (head) head.rotation.x = THREE.MathUtils.degToRad(-1);

  if (lShoulder) {
    lShoulder.rotation.z = THREE.MathUtils.degToRad(6);
    lShoulder.rotation.y = THREE.MathUtils.degToRad(4);
  }
  if (rShoulder) {
    rShoulder.rotation.z = THREE.MathUtils.degToRad(-6);
    rShoulder.rotation.y = THREE.MathUtils.degToRad(-4);
  }

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

  if (lLowerArm) lLowerArm.rotation.z = THREE.MathUtils.degToRad(18);
  if (rLowerArm) rLowerArm.rotation.z = THREE.MathUtils.degToRad(-18);

  if (lHand) {
    lHand.rotation.z = THREE.MathUtils.degToRad(6);
    lHand.rotation.x = THREE.MathUtils.degToRad(4);
  }
  if (rHand) {
    rHand.rotation.z = THREE.MathUtils.degToRad(-6);
    rHand.rotation.x = THREE.MathUtils.degToRad(4);
  }
}

export default function Avatar3D({
  vrmId = "C1",
  variant = "sky",
  emotion = "idle",
  previewYaw = 0,
  onReady // ✅ 新增：模型 ready 時通知 Stage
}) {
  const vrmRef = useRef(null);

  // ✅ /vrm/<id>.vrm
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
    // vrmId 切換時，先清掉 ref，避免舊模型多跑一幀
    vrmRef.current = null;

    if (!vrm) return;

    VRMUtils.rotateVRM0(vrm);
    applyIdlePose(vrm);

    vrmRef.current = vrm;

    // ✅ 通知 Stage：可以開始做 bbox + reframe
    onReady?.({ vrmId });

    return () => {
      try {
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
  }, [vrm, vrmId]);

  useFrame((_, delta) => {
    const v = vrmRef.current;
    if (!v) return;
    v.update(delta);
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
}
