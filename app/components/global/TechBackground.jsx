"use client";

export default function TechBackground({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070d] text-slate-50">
      {/* 深色晶片底（微電路紋） */}
      <div className="absolute inset-0 bg-chip opacity-100" />

      {/* 藍色光纖流動層（一直流） */}
      <div className="absolute inset-0 bg-fiber opacity-100" />

      {/* 微粒星光 */}
      <div className="absolute inset-0 bg-stars opacity-70" />

      {/* 內容層 */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
