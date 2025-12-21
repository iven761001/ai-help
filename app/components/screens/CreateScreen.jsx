"use client";

import CompassCreator from "../CompassCreator/CompassCreator";

export default function CreateScreen({ draft, setDraft, onDone }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 上方留空：熊在 page.js 的世界層 */}
      <div className="flex-1" />

      {/* 下方 HUD：創角面板 */}
      <div
        className="
          relative
          z-20
          backdrop-blur-xl
          bg-white/5
          border-t border-white/10
          shadow-[0_-20px_40px_rgba(0,0,0,0.45)]
        "
      >
        <CompassCreator value={draft} onChange={setDraft} onDone={onDone} disabled={false} />
      </div>
    </div>
  );
}
