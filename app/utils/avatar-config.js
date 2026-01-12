import * as THREE from "three";

// 🌟 骨架映射表 (全開！)
export const MIXAMO_VRM_MAP = {
  mixamorigHips: "hips", 
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
  mixamorigLeftUpLeg: "leftUpperLeg",
  mixamorigLeftLeg: "leftLowerLeg",
  mixamorigLeftFoot: "leftFoot",
  mixamorigRightUpLeg: "rightUpperLeg",
  mixamorigRightLeg: "rightLowerLeg",
  mixamorigRightFoot: "rightFoot",
};

// 🌟 軸向校正 (Axis Correction) - 這是解決揮手怪異的關鍵！
// 用來修正 T-Pose 與 A-Pose 的旋轉軸差異
const leftArmCorrection = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 1.0)); // 左手抬起約 60度
const rightArmCorrection = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -1.0)); // 右手抬起約 60度

export const AXIS_CORRECTION = {
  leftUpperArm: leftArmCorrection,
  rightUpperArm: rightArmCorrection,
  // 前臂通常也需要跟著修正
  leftLowerArm: leftArmCorrection,
  rightLowerArm: rightArmCorrection,
};

// 自然姿勢 (沒動畫時的預設值)
export const NATURAL_POSE_CONFIG = {
  leftUpperArm: [0, 0, 1.3],
  rightUpperArm: [0, 0, -1.3],
  leftLowerArm: [0, 0, 0.1],
  rightLowerArm: [0, 0, -0.1],
};
