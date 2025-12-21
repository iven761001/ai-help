export const ELEMENT_PROFILES = {
  // 你原本的三色（先保留，方便過渡）
  sky: {
    id: "sky",
    label: "天空藍 · 穩重專業",
    style: "circuit",
    glassColor: "#7fdcff",
    glowColor: "#65d9ff",
    motion: { bob: 0.05, wobble: 0.06, pulse: 0.02, speed: 1.3 },
    material: { transmission: 0.92, roughness: 0.08, ior: 1.48 }
  },
  mint: {
    id: "mint",
    label: "薄荷綠 · 清爽潔淨",
    style: "circuit",
    glassColor: "#6fffd6",
    glowColor: "#4fffd2",
    motion: { bob: 0.05, wobble: 0.06, pulse: 0.02, speed: 1.35 },
    material: { transmission: 0.92, roughness: 0.08, ior: 1.48 }
  },
  purple: {
    id: "purple",
    label: "紫色 · 科技感",
    style: "circuit",
    glassColor: "#d3a8ff",
    glowColor: "#b26bff",
    motion: { bob: 0.05, wobble: 0.06, pulse: 0.02, speed: 1.25 },
    material: { transmission: 0.92, roughness: 0.08, ior: 1.48 }
  },

  // ✅ 五元素第一批（你要的：碳/矽/鍺/錫/鉛）
  carbon: {
    id: "carbon",
    label: "碳 C · 晶格/石墨",
    style: "lattice",
    glassColor: "#5a5f6a",
    glowColor: "#7bd3ff",
    motion: { bob: 0.03, wobble: 0.04, pulse: 0.015, speed: 1.0 },
    material: { transmission: 0.55, roughness: 0.25, ior: 1.35 }
  },
  silicon: {
    id: "silicon",
    label: "矽 Si · 晶片/電路",
    style: "chip",
    glassColor: "#8fe8ff",
    glowColor: "#58c7ff",
    motion: { bob: 0.05, wobble: 0.07, pulse: 0.02, speed: 1.4 },
    material: { transmission: 0.90, roughness: 0.10, ior: 1.52 }
  },
  germanium: {
    id: "germanium",
    label: "鍺 Ge · 折射/稜鏡",
    style: "prism",
    glassColor: "#b8d6ff",
    glowColor: "#9bd3ff",
    motion: { bob: 0.045, wobble: 0.06, pulse: 0.02, speed: 1.25 },
    material: { transmission: 0.95, roughness: 0.06, ior: 1.60 }
  },
  tin: {
    id: "tin",
    label: "錫 Sn · 液態金屬",
    style: "liquid",
    glassColor: "#b9c6d6",
    glowColor: "#86f3ff",
    motion: { bob: 0.055, wobble: 0.09, pulse: 0.03, speed: 1.55 },
    material: { transmission: 0.70, roughness: 0.12, ior: 1.40 }
  },
  lead: {
    id: "lead",
    label: "鉛 Pb · 厚重霧面",
    style: "haze",
    glassColor: "#6b7280",
    glowColor: "#7aa7ff",
    motion: { bob: 0.02, wobble: 0.03, pulse: 0.01, speed: 0.85 },
    material: { transmission: 0.35, roughness: 0.35, ior: 1.30 }
  }
};

export function getProfile(id) {
  return ELEMENT_PROFILES[id] || ELEMENT_PROFILES.sky;
}

export function getProfileList() {
  return Object.values(ELEMENT_PROFILES).map((p) => ({
    id: p.id,
    label: p.label
  }));
}
