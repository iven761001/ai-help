"use client";

import dynamic from "next/dynamic";
import CompassCreator from "../CompassCreator"; // ✅ 修正
import useDragRotate from "../../hooks/useDragRotate";

const Avatar3D = dynamic(() => import("../Avatar3D"), { ssr: false });

export default function CreateScreen({ draft, setDraft, onDone }) {
  const { yaw, bind } = useDragRotate({ sensitivity: 0.01 });

  return (
    <main className="min-h-screen flex flex-col">
      {/* 上方：模型世界 */}
      <section className="flex-1 flex items-center justify-center px-4 pt-6">
        <div className="w-full max-w-sm">
          <div className="glass-card rounded-3xl p-3">
            <div
              className="aspect-square rounded-2xl glass-soft flex items-center justify-center overflow-hidden"
              {...bind}
            >
              <Avatar3D
                variant={draft.avatar || draft.color || "sky"}
                emotion="idle"
                previewYaw={yaw}
              />
            </div>

            <div className="mt-3 text-center space-y-1">
              <div className="text-sm font-semibold text-white">
                {draft.nickname || "尚未命名"}
              </div>
              <div className="text-xs text-white/70">
                顏色：{draft.color} ／ 聲線：{draft.voice}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 下方：HUD */}
      <section className="relative z-20">
        <CompassCreator
          value={draft}
          onChange={setDraft}
          onDone={onDone}
          disabled={false}
        />
      </section>
    </main>
  );
}
