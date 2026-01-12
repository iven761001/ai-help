import { useState, useEffect, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";
import { MIXAMO_VRM_MAP } from "../utils/avatar-config";

export function useAvatarAnimation(vrm, animationUrl, isPaused) {
  const [mixer, setMixer] = useState(null);
  
  // 1. 儲存 VRM 原始姿勢 (A-Pose)
  const vrmRestQuats = useRef({}); 
  // 2. 儲存 Mixamo 動畫第一幀
  const mixamoInitQuats = useRef({});

  const fbx = useLoader(FBXLoader, animationUrl, (loader) => {
    loader.crossOrigin = "anonymous";
  });

  // 初始化 VRM 姿勢
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
    
    // 重置基準點
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
            
            // A. 捕捉 Mixamo 第一幀
            if (!mixamoInitQuats.current[mixamoBone.name]) {
                mixamoInitQuats.current[mixamoBone.name] = mixamoBone.quaternion.clone();
            }
            const mixamoInitQuat = mixamoInitQuats.current[mixamoBone.name];
            const mixamoCurrentQuat = mixamoBone.quaternion;

            // B. 計算變化量 (Delta)
            const rotationDelta = mixamoInitQuat.clone().invert().multiply(mixamoCurrentQuat);

            // 🌟 關鍵修正：動作反轉！(Invert)
            // 這會把 "往後" 變成 "往前"，"向下" 變成 "向上"
            // 完美解決軸向相反的問題
            rotationDelta.invert();

            // C. 套用到 VRM
            vrmBone.quaternion.copy(vrmRestQuat).multiply(rotationDelta);
          }
        }
      });
    }
  });

  return { mixer, fbx };
}
