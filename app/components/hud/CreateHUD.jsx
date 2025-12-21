"use client";

import CompassCreator from "../CompassCreator/CompassCreator";

export default function CreateHUD({ draft, setDraft, onDone }) {
  return (
    <div
      className="
        h-full
        rounded-[28px]
        bg-white/10
        backdrop-blur-xl
        border border-white/15
        shadow-[0_-12px_50px_rgba(56,189,248,0.15)]
        overflow-hidden
      "
    >
      {/* ✅ 固定 HUD 高度下，創角內容用內部捲動 */}
      <div className="h-full overflow-y-auto no-scrollbar">
        <CompassCreator value={draft} onChange={setDraft} onDone={onDone} disabled={false} />
      </div>
    </div>
  );
}
