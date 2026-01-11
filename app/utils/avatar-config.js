// utils/avatar-config.js

// 🌟 骨架映射表 (Mixamo -> VRM)
// 未來如果有其他動作來源 (如 ReadyPlayerMe)，可以再新增一組 map
export const MIXAMO_VRM_MAP = {
  // mixamorigHips: "hips", // 封鎖 Hips 以保持穩定
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
};

// 🌟 自然 A-Pose 修正數據
// 統一定義在這裡，以後要微調姿勢只要改這裡
export const NATURAL_POSE_CONFIG = {
  leftUpperArm: [0, 0, 1.3],
  rightUpperArm: [0, 0, -1.3],
  leftLowerArm: [0, 0, 0.1],
  rightLowerArm: [0, 0, -0.1],
};

// 🌟 骨架轉譯權重 (Retargeting Weights)
// 定義哪些部位要完全跟隨動畫，哪些要保留原樣
export function getBoneWeight(boneName) {
  if (!boneName) return 0;
  
  // 手臂：降低權重，避免 T-Pose 拉扯
  if (boneName.includes('Arm') || boneName.includes('Hand') || boneName.includes('Shoulder')) {
      return 0.3;
  }
  // 脊椎/頭：完全跟隨，呼吸感才明顯
  return 1.0;
}
