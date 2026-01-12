// utils/avatar-config.js

import * as THREE from "three";

// 🌟 骨架映射表 (Mixamo -> VRM)
export const MIXAMO_VRM_MAP = {
  // --- 核心軀幹 ---
  // ✅ 解鎖 Hips！讓她可以扭腰擺臀，重心轉移
  mixamorigHips: "hips", 
  mixamorigSpine: "spine",
  mixamorigSpine1: "chest",
  mixamorigSpine2: "upperChest",
  mixamorigNeck: "neck",
  mixamorigHead: "head",
  
  // --- 手臂 ---
  mixamorigLeftShoulder: "leftShoulder",
  mixamorigLeftArm: "leftUpperArm",
  mixamorigLeftForeArm: "leftLowerArm",
  mixamorigLeftHand: "leftHand",
  
  mixamorigRightShoulder: "rightShoulder",
  mixamorigRightArm: "rightUpperArm",
  mixamorigRightForeArm: "rightLowerArm",
  mixamorigRightHand: "rightHand",

  // --- 腿部 (全面解鎖！) ---
  // ✅ 解鎖腿部！讓她隨著揮手動作，膝蓋和腳踝自然彎曲
  mixamorigLeftUpLeg: "leftUpperLeg",
  mixamorigLeftLeg: "leftLowerLeg",
  mixamorigLeftFoot: "leftFoot",
  
  mixamorigRightUpLeg: "rightUpperLeg",
  mixamorigRightLeg: "rightLowerLeg",
  mixamorigRightFoot: "rightFoot",
};

// 🌟 自然姿勢 (初始狀態)
// 這是 Delta 運算的基準點，保持不動
export const NATURAL_POSE_CONFIG = {
  leftUpperArm: [0, 0, 1.3],
  rightUpperArm: [0, 0, -1.3],
  leftLowerArm: [0, 0, 0.1],
  rightLowerArm: [0, 0, -0.1],
};
