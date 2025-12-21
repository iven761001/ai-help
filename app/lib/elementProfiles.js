// app/lib/elementProfiles.js

export const ELEMENTS = ["carbon", "silicon", "germanium", "tin", "lead"];

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/**
 * ElementProfile：用參數控制「靈活程度」
 * - motionElasticity：彈性（越高越Q彈）
 * - motionWeight：重量（越高越沉）
 * - idleActivity：閒置動作頻率（越高越愛動）
 * - glowIntensity：內部冷光強度
 * - responseSpeed：反應速度
 */
export const elementProfiles = {
  carbon: {
    id: "carbon",
    label: "C 碳",
    motionElasticity: 0.9,
    motionWeight: 0.4,
    idleActivity: 0.8,
    glowIntensity: 0.6,
    responseSpeed: 0.7
  },
  silicon: {
    id: "silicon",
    label: "Si 矽",
    motionElasticity: 0.55,
    motionWeight: 0.55,
    idleActivity: 0.55,
    glowIntensity: 0.9,
    responseSpeed: 0.85
  },
  germanium: {
    id: "germanium",
    label: "Ge 鍺",
    motionElasticity: 0.65,
    motionWeight: 0.5,
    idleActivity: 0.6,
    glowIntensity: 0.75,
    responseSpeed: 0.75
  },
  tin: {
    id: "tin",
    label: "Sn 錫",
    motionElasticity: 0.6,
    motionWeight: 0.7,
    idleActivity: 0.45,
    glowIntensity: 0.55,
    responseSpeed: 0.6
  },
  lead: {
    id: "lead",
    label: "Pb 鉛",
    motionElasticity: 0.35,
    motionWeight: 0.9,
    idleActivity: 0.3,
    glowIntensity: 0.45,
    responseSpeed: 0.5
  }
};

/**
 * 把「情緒狀態」轉成「動畫參數」
 * emotion 可沿用你原本：idle / thinking / happy / sorry
 * sorry 會映射成 error
 */
export function stateToAnimParams(emotion, profile) {
  const p = profile || elementProfiles.carbon;
  const state = emotion === "sorry" ? "error" : emotion;

  // base: 由元素決定
  let bobAmp = 0.02 + 0.05 * p.idleActivity;
  let bobSpeed = 0.9 + 1.0 * p.responseSpeed;
  let wobble = 0.03 + 0.08 * p.motionElasticity;
  let pulse = 0.01 + 0.05 * p.glowIntensity;
  let lineOpacity = 0.45 + 0.45 * p.glowIntensity;

  // state: 由情緒決定
  if (state === "happy") {
    bobAmp *= 1.8;
    bobSpeed *= 1.6;
    wobble *= 1.8;
    pulse *= 1.6;
    lineOpacity = clamp(lineOpacity + 0.18, 0, 1);
  } else if (state === "thinking") {
    bobAmp *= 1.25;
    bobSpeed *= 1.15;
    wobble *= 1.2;
    pulse *= 1.1;
  } else if (state === "error") {
    bobAmp *= 0.8;
    bobSpeed *= 0.9;
    wobble *= 0.8;
    pulse *= 0.75;
    lineOpacity = clamp(lineOpacity - 0.15, 0, 1);
  }

  // weight: 越重越慢沉
  const weightK = clamp(1.15 - p.motionWeight * 0.35, 0.75, 1.15);
  bobSpeed *= weightK;

  return { bobAmp, bobSpeed, wobble, pulse, lineOpacity };
}
