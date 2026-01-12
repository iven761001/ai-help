// utils/avatar-config.js
export const MIXAMO_VRM_MAP = {
  // ✅ Hips 全開！這次不會折疊了
  mixamorigHips: "hips", 
  
  // 上半身
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

  // ✅ 腿部全開！讓她跟著揮手動作踏步
  mixamorigLeftUpLeg: "leftUpperLeg",
  mixamorigLeftLeg: "leftLowerLeg",
  mixamorigLeftFoot: "leftFoot",
  mixamorigRightUpLeg: "rightUpperLeg",
  mixamorigRightLeg: "rightLowerLeg",
  mixamorigRightFoot: "rightFoot",
};

export const NATURAL_POSE_CONFIG = {
  leftUpperArm: [0, 0, 1.3],
  rightUpperArm: [0, 0, -1.3],
  leftLowerArm: [0, 0, 0.1],
  rightLowerArm: [0, 0, -0.1],
};
