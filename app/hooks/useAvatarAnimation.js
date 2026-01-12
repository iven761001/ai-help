import { useState, useEffect, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";
import { MIXAMO_VRM_MAP, AXIS_CORRECTION } from "../utils/avatar-config";

export function useAvatarAnimation(vrm, animationUrl, isPaused) {
  const [mixer, setMixer] = useState(null);
  
  const vrmRestQuats = useRef({}); 
  const mixamoInitQuats = useRef({});

  const fbx = useLoader(FBXLoader, animationUrl, (loader) => {
    loader.crossOrigin = "anonymous";
  });

  useEffect(() => {
    if (!vrm) return;
    Object.values(MIXAMO_VRM_MAP).forEach((vrmBoneName) => {
        const vrmBone = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
        if (vrmBone && !vrmRestQuats.current[vrmBoneName]) {
            vrmRestQuats.current[vrmBoneName] = vrmBone.quaternion.clone();
        }
    });
  }, [vrm]);

  useEffect(() => {
    if (!fbx) return;
    const newMixer = new THREE.AnimationMixer(fbx);
    const action = newMixer.clipAction(fbx.animations[0]);
    action.play();
    setMixer(newMixer);
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
            
            // 1. 捕捉基準點
            if (!mixamoInitQuats.current[mixamoBone.name]) {
                mixamoInitQuats.current[mixamoBone.name] = mixamoBone.quaternion.clone();
            }
            const initQ = mixamoInitQuats.current[mixamoBone.name];
            const currentQ = mixamoBone.quaternion;

            // 2. 計算原始變化量 (Delta)
            // 移除了 .invert()，恢復正常的旋轉方向
            const delta = initQ.clone().invert().multiply(currentQ);

            // 3. 🌟 軸向校正運算 (The Fix)
            // 如果這個骨頭需要校正 (例如手臂)，我們進行「基底變換」
            // 公式：CorrectedDelta = Correction * Delta * Correction_Inverse
            // 這會把旋轉軸 "轉" 到正確的方向
            const correction = AXIS_CORRECTION[vrmBoneName];
            if (correction) {
                const correctionInv = correction.clone().invert();
                // 數學魔法：把 Delta 包在校正參數中間
                const correctedDelta = correction.clone().multiply(delta).multiply(correctionInv);
                delta.copy(correctedDelta);
            }

            // 4. 套用
            vrmBone.quaternion.copy(vrmRestQuat).multiply(delta);
          }
        }
      });
    }
  });

  return { mixer, fbx };
}
