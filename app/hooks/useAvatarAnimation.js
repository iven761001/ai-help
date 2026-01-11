// hooks/useAvatarAnimation.js
import { useState, useEffect } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";
import { MIXAMO_VRM_MAP, getBoneWeight } from "../utils/avatar-config";

export function useAvatarAnimation(vrm, animationUrl, isPaused) {
  const [mixer, setMixer] = useState(null);
  
  // 1. 載入動畫檔
  const fbx = useLoader(FBXLoader, animationUrl, (loader) => {
    loader.crossOrigin = "anonymous";
  });

  // 2. 初始化混合器
  useEffect(() => {
    if (!fbx) return;
    const newMixer = new THREE.AnimationMixer(fbx);
    const action = newMixer.clipAction(fbx.animations[0]);
    action.play();
    setMixer(newMixer);
    return () => newMixer.stopAllAction(); // 清理機制
  }, [fbx]);

  // 3. 每幀運算 (Retargeting 核心)
  useFrame((state, delta) => {
    // 如果暫停 (例如正在滑行)，就不更新動畫
    if (isPaused) return;

    if (mixer) mixer.update(delta);

    if (vrm && fbx) {
      fbx.traverse((mixamoBone) => {
        if (mixamoBone.isBone && MIXAMO_VRM_MAP[mixamoBone.name]) {
          const vrmBoneName = MIXAMO_VRM_MAP[mixamoBone.name];
          const vrmBone = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
          
          if (vrmBone) {
            const weight = getBoneWeight(vrmBoneName);
            // 核心數學：球面插值
            vrmBone.quaternion.slerp(mixamoBone.quaternion, weight);
          }
        }
      });
    }
  });

  return { mixer, fbx }; // 回傳控制權(如果有需要)
}
