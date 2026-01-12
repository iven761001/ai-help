import { useState, useEffect, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";
import { MIXAMO_VRM_MAP } from "../utils/avatar-config";

export function useAvatarAnimation(vrm, animationUrl, isPaused) {
  const [mixer, setMixer] = useState(null);
  
  // 1. 儲存 VRM 原始姿勢 (A-Pose)
  const vrmRestQuats = useRef({}); 
  // 2. 🌟 新增：儲存 Mixamo 動畫第一幀的姿勢 (用來當作歸零基準)
  const mixamoInitQuats = useRef({});

  const fbx = useLoader(FBXLoader, animationUrl, (loader) => {
    loader.crossOrigin = "anonymous";
  });

  // 初始化：捕捉 VRM 的原始 A-Pose
  useEffect(() => {
    if (!vrm) return;
    Object.values(MIXAMO_VRM_MAP).forEach((vrmBoneName) => {
        const vrmBone = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
        if (vrmBone && !vrmRestQuats.current[vrmBoneName]) {
            vrmRestQuats.current[vrmBoneName] = vrmBone.quaternion.clone();
        }
    });
  }, [vrm]);

  // 設定動畫混合器
  useEffect(() => {
    if (!fbx) return;
    const newMixer = new THREE.AnimationMixer(fbx);
    const action = newMixer.clipAction(fbx.animations[0]);
    action.play();
    setMixer(newMixer);
    
    // 🌟 重置 Mixamo 基準點
    // 每次換動畫時，都要清空基準點，重新捕捉第一幀
    mixamoInitQuats.current = {};

    return () => newMixer.stopAllAction(); 
  }, [fbx]);

  useFrame((state, delta) => {
    if (isPaused) return;
    if (mixer) mixer.update(delta);

    if (vrm && fbx) {
      fbx.traverse((mixamoBone) => {
        if (mixamoBone.isBone && MIXAMO_VRM_MAP[mixamoBone.name]) {
          const vrmBoneName = MIXAMO_VRM_MAP[mixamoBone.name];
          const vrmBone = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
          const vrmRestQuat = vrmRestQuats.current[vrmBoneName];
          
          if (vrmBone && vrmRestQuat) {
            
            // A. 捕捉 Mixamo 第一幀 (歸零基準)
            if (!mixamoInitQuats.current[mixamoBone.name]) {
                mixamoInitQuats.current[mixamoBone.name] = mixamoBone.quaternion.clone();
            }
            const mixamoInitQuat = mixamoInitQuats.current[mixamoBone.name];
            const mixamoCurrentQuat = mixamoBone.quaternion;

            // B. 計算「相對變化量 (Delta)」
            // 公式：變化量 = (第一幀的反轉) * 當前幀
            // 這就像是把第一幀強制當作 "0度"，只看之後轉了多少
            const rotationDelta = mixamoInitQuat.clone().invert().multiply(mixamoCurrentQuat);

            // C. 套用到 VRM
            // 公式：VRM最終 = VRM原始A-Pose * 變化量
            // 讓 VRM 在自己原本站好的基礎上，跟著轉動
            vrmBone.quaternion.copy(vrmRestQuat).multiply(rotationDelta);
          }
        }
      });
    }
  });

  return { mixer, fbx };
}
