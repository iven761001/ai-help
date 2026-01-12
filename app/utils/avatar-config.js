// utils/avatar-config.js

export const MIXAMO_VRM_MAP = {
  // ❌ 再次封鎖 Hips！它的座標系差異太大，不適合直接轉移
  // mixamorigHips: "hips", 

  // ✅ 上半身繼續使用 Mixamo 動畫
  mixamorigSpine: "spine",
  mixamorigSpine1: "chest",
  mixamorigSpine2: "upperChest",
  mixamorigNeck: "neck",
  mixamorigHead: "head",
  
  mixamorigLeftShoulder: "leftShoulder",
  mixamorigLeftArm: "leftUpperArm",
  mixamorigLeftForeArm: "leftLowerArm",
  mixamorigLeftHand: "leftHand",
  
  mixamorigRightShoulder: "rightShoulder",
  mixamorigRightArm: "rightUpperArm",
  mixamorigRightForeArm: "rightLowerArm",
  mixamorigRightHand: "rightHand",

  // ❌ 腿部也建議封鎖，改用程式控制重心
  // mixamorigLeftUpLeg: "leftUpperLeg",
  // mixamorigLeftLeg: "leftLowerLeg",
  // mixamorigLeftFoot: "leftFoot",
  // mixamorigRightUpLeg: "rightUpperLeg",
  // mixamorigRightLeg: "rightLowerLeg",
  // mixamorigRightFoot: "rightFoot",
};

export const NATURAL_POSE_CONFIG = {
  leftUpperArm: [0, 0, 1.3],
  rightUpperArm: [0, 0, -1.3],
  leftLowerArm: [0, 0, 0.1],
  rightLowerArm: [0, 0, -0.1],
};
