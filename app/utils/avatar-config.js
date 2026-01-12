import * as THREE from "three";

// 🌟 骨架映射表 (Mixamo -> VRM)
export const MIXAMO_VRM_MAP = {
  // --- 核心軀幹 (呼吸與重心的關鍵) ---
  // 這次我們解鎖 Hips，但在 Logic 層會鎖定它的位移，只取旋轉
  mixamorigHips: "hips", 
  mixamorigSpine: "spine",
  mixamorigSpine1: "chest",
  mixamorigSpine2: "upperChest",
  mixamorigNeck: "neck",
  mixamorigHead: "head",
  
  // --- 手臂 (需要補償) ---
  mixamorigLeftShoulder: "leftShoulder",
  mixamorigLeftArm: "leftUpperArm",
  mixamorigLeftForeArm: "leftLowerArm",
  mixamorigLeftHand: "leftHand",
  
  mixamorigRightShoulder: "rightShoulder",
  mixamorigRightArm: "rightUpperArm",
  mixamorigRightForeArm: "rightLowerArm",
  mixamorigRightHand: "rightHand",

  // --- 腿部 (建議封鎖) ---
  // 待機動作通常不需要腿動，鎖住比較穩，不會滑步
  // mixamorigLeftUpLeg: "leftUpperLeg",
  // mixamorigLeftLeg: "leftLowerLeg",
  // mixamorigLeftFoot: "leftFoot",
  // mixamorigRightUpLeg: "rightUpperLeg",
  // mixamorigRightLeg: "rightLowerLeg",
  // mixamorigRightFoot: "rightFoot",
};

// 🌟 姿勢補償 (Pose Offsets) - 這是解決「有點狀態」的關鍵！
// Mixamo 是 T-Pose (手平舉)，VRM 是 A-Pose (手下垂)
// 我們需要把手臂 "往上抬" 一點，抵銷這個落差
export const POSE_OFFSETS = {
  leftUpperArm: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.5)),  // 左臂 Z 軸修正
  rightUpperArm: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.5)), // 右臂 Z 軸修正
  // 如果手掌方向怪怪的，也可以在這裡加 leftHand, rightHand 的修正
};

// 🌟 骨架轉譯權重 (Retargeting Weights)
export function getBoneWeight(boneName) {
  if (!boneName) return 0;
  
  // 屁股：大幅降低權重，避免過度扭動變成大法師
  if (boneName === 'hips') return 0.4;

  // 手臂：因為有補償了，權重可以稍微高一點，讓動作明顯一點
  if (boneName.includes('Arm') || boneName.includes('Hand')) return 0.6;
  
  // 脊椎/頭：完全跟隨，呼吸感才明顯
  return 1.0;
}

// 自然 A-Pose 初始設定 (沒動畫時的預設值)
export const NATURAL_POSE_CONFIG = {
  leftUpperArm: [0, 0, 1.3],
  rightUpperArm: [0, 0, -1.3],
  leftLowerArm: [0, 0, 0.1],
  rightLowerArm: [0, 0, -0.1],
};
