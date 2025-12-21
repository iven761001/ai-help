"use client";

import dynamic from "next/dynamic";
import CompassCreator from "../creator/CompassCreator";
import useDragRotate from "../../hooks/useDragRotate";

const Avatar3D = dynamic(() => import("../avatar/Avatar3D"), { ssr: false });

export default function CreateScreen({ draft, setDraft, onDone }) {
  const { yaw, bind } = useDragRotate({ sensitivity: 0.01 });

  return (
    <main className="min-h-screen flex flex-col">
      {/* 上：角色舞台 */}
      <section className="flex-1 flex items-center justify-center px-4 pt-6 pb-4">
        <div className="w-full max-w-sm">
          <div className="glass-card rounded-3xl p-3">
            <div className="aspect-square rounded-2xl glass-soft overflow-hidden" {...bind}>
              <Avatar3D variant={draft.avatar || draft.color || "sky"} emotion="idle" previewYaw={yaw} />
            </div>

            <div className="mt-3 space-y-1 px-2 pb-1 text-center">
              <div className="text-sm font-semibold text-white">
                {draft.nickname ? `「${draft.nickname}」` : "尚未命名"}
              </div>
              <div className="text-xs text-white/70">
                外觀：{draft.avatar || "sky"} ／ 聲線：{draft.voice || "warm"}
              </div>
              <div className="text-[11px] text-white/55">下方調整你的角色設定</div>
            </div>
          </div>
        </div>
      </section>

      {/* 下：HUD 面板（不會蓋到熊，因為主體是 flex 分配） */}
      <section className="relative z-20">
        <CompassCreator
          value={draft}
          onChange={(v) => setDraft(v)}
          onDone={onDone}
          disabled={false}
        />
      </section>
    </main>
  );
}
