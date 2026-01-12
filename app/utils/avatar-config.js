// utils/avatar-config.js

// 🌟 骨架映射表 (Mixamo -> VRM)
// 通用版：我們解鎖所有骨頭，讓動作完全釋放
export const MIXAMO_VRM_MAP = {
  // 核心
  mixamorigHips: "hips", 
  mixamorigSpine: "spine",
  mixamorigSpine1: "chest",
  mixamorigSpine2: "upperChest",
  mixamorigNeck: "neck",
  mixamorigHead: "head",
  
  // 手臂
  mixamorigLeftShoulder: "leftShoulder",
  mixamorigLeftArm: "leftUpperArm",
  mixamorigLeftForeArm: "leftLowerArm",
  mixamorigLeftHand: "leftHand",
  
  mixamorigRightShoulder: "rightShoulder",
  mixamorigRightArm: "rightUpperArm",
  mixamorigRightForeArm: "rightLowerArm",
  mixamorigRightHand: "rightHand",

  // 腿部 (如果妳的揮手動作包含走動，可以把下面解開)
  // 如果只是站著揮手，建議還是註解掉，站得比較穩
  // mixamorigLeftUpLeg: "leftUpperLeg",
  // mixamorigLeftLeg: "leftLowerLeg",
  // mixamorigLeftFoot: "leftFoot",
  // mixamorigRightUpLeg: "rightUpperLeg",
  // mixamorigRightLeg: "rightLowerLeg",
  // mixamorigRightFoot: "rightFoot",
};

// 🌟 自然姿勢 (初始狀態)
// 當沒有動畫時，或是動畫運算前的基準點
export const NATURAL_POSE_CONFIG = {
  leftUpperArm: [0, 0, 1.3],  // A-Pose (手放下)
  rightUpperArm: [0, 0, -1.3],
  leftLowerArm: [0, 0, 0.1],
  rightLowerArm: [0, 0, -0.1],
};
