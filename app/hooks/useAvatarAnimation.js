import { useState, useEffect, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";
import { MIXAMO_VRM_MAP } from "../utils/avatar-config";

export function useAvatarAnimation(vrm, animationUrl, isPaused) {
  const [mixer, setMixer] = useState(null);
  
  // 用來儲存 VRM 原始姿勢 (A-Pose) 的資料庫
  const vrmRestQuats = useRef({}); 
  
  // 1. 載入動畫檔
  const fbx = useLoader(FBXLoader, animationUrl, (loader) => {
    loader.crossOrigin = "anonymous";
  });

  // 2. 初始化：捕捉 VRM 的原始姿勢 (只做一次)
  useEffect(() => {
    if (!vrm) return;
    
    // 遍歷 VRM 骨架，把每一根骨頭原本的角度 (A-Pose) 存起來
    // 這樣我們才知道「家」在哪裡，動作做完要回來這裡
    Object.values(MIXAMO_VRM_MAP).forEach((vrmBoneName) => {
        const vrmBone = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
        if (vrmBone && !vrmRestQuats.current[vrmBoneName]) {
            vrmRestQuats.current[vrmBoneName] = vrmBone.quaternion.clone();
        }
    });
  }, [vrm]);

  // 3. 設定動畫混合器
  useEffect(() => {
    if (!fbx) return;
    const newMixer = new THREE.AnimationMixer(fbx);
    const action = newMixer.clipAction(fbx.animations[0]);
    action.play();
    setMixer(newMixer);
    return () => newMixer.stopAllAction(); 
  }, [fbx]);

  // 4. 每幀運算 (Delta Retargeting 核心)
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
            // A. 取得 Mixamo 目前的旋轉
            // Mixamo 的動畫是基於 T-Pose 的變化
            const mixamoQuat = mixamoBone.quaternion;

            // B. 應用相對旋轉 (The Magic)
            // 公式：VRM最終角度 = VRM原始角度 * Mixamo角度
            // 因為我們不需要再修正 T-Pose/A-Pose 的落差了，
            // 我們直接把 Mixamo 的「動態旋轉量」疊加在 VRM 的「靜態A-Pose」上
            
            // 先重置回 A-Pose
            vrmBone.quaternion.copy(vrmRestQuat);
            
            // 再疊加動畫的角度
            // 這裡我們直接乘上去，對於大多數 Mixamo 動畫來說，
            // 它的旋轉是「相對於父節點」的，所以直接套用通常就能得到正確的動作
            vrmBone.quaternion.multiply(mixamoQuat);
          }
        }
      });
    }
  });

  return { mixer, fbx };
}
