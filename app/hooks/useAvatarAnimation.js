import { useState, useEffect } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";
import { MIXAMO_VRM_MAP, getBoneWeight, POSE_OFFSETS } from "../utils/avatar-config";

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
    // 播放第一個動畫片段
    const action = newMixer.clipAction(fbx.animations[0]);
    action.play();
    setMixer(newMixer);
    return () => newMixer.stopAllAction(); 
  }, [fbx]);

  // 3. 每幀運算 (核心引擎)
  useFrame((state, delta) => {
    if (isPaused) return;

    if (mixer) mixer.update(delta);

    if (vrm && fbx) {
      fbx.traverse((mixamoBone) => {
        // 檢查這個 Mixamo 骨頭是否在我們的映射表中
        if (mixamoBone.isBone && MIXAMO_VRM_MAP[mixamoBone.name]) {
          const vrmBoneName = MIXAMO_VRM_MAP[mixamoBone.name];
          const vrmBone = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
          
          if (vrmBone) {
            // A. 計算目標旋轉 (Target Rotation)
            const targetQuaternion = mixamoBone.quaternion.clone();

            // 🌟 B. 套用姿勢補償 (Apply Pose Offset)
            // 如果這個部位有設定補償 (例如手臂)，就把它疊加上去
            if (POSE_OFFSETS[vrmBoneName]) {
                targetQuaternion.multiply(POSE_OFFSETS[vrmBoneName]);
            }

            // C. 取得權重
            const weight = getBoneWeight(vrmBoneName);

            // D. 執行轉譯 (Slerp)
            // 這裡我們用 slerp 來平滑過渡
            vrmBone.quaternion.slerp(targetQuaternion, weight);
          }
        }
      });
    }
  });

  return { mixer, fbx };
}
