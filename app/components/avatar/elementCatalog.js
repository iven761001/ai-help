
// app/components/avatar/elementCatalog.js

export const ELEMENTS = {
  C: { id: "carbon", label: "碳", base: "carbon", tone: "dark", model: "/models/carbon_bear.glb" },
  Si:{ id: "silicon",label: "矽", base: "silicon", tone: "cool", model: "/models/silicon_bear.glb" },
  Ge:{ id: "germanium",label: "鍺", base: "germanium", tone: "glass", model: "/models/ge_bear.glb" },
  Sn:{ id: "tin",  label: "錫", base: "tin", tone: "metal", model: "/models/tin_bear.glb" },
  Pb:{ id: "lead", label: "鉛", base: "lead", tone: "heavy", model: "/models/lead_bear.glb" }
};

// 你現在用的 sky/mint/purple 也可以映射成元素
export function mapVariantToElement(variant) {
  if (variant === "mint") return "Si";
  if (variant === "purple") return "Ge";
  return "C";
}
