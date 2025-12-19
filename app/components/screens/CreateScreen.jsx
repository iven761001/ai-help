"use client";

import dynamic from "next/dynamic";
import CompassCreator from "../CompassCreator/CompassCreator";
import useDragRotate from "../../hooks/useDragRotate";

const Avatar3D = dynamic(() => import("../Avatar3D"), { ssr: false });

export default function CreateScreen({ draft, setDraft, onDone }) {
  const { yaw, bind } = useDragRotate({ sensitivity: 0.01 });

  return (
    <main className="min-h-screen flex flex-col">
      {/* ===== 上方：角色世界（會自動讓位） ===== */}
      <section className="flex-1 flex items-center justify-center px-4 pt-6">
        <div className="w-full max-w-sm">
          <div className="glass-card rounded-3xl p-3">
            {/* 熊的預覽舞台 */}
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

            <div className="mt-3 space-y-1 px-2 pb-1 text-center">
              <div className="text-sm font-semibold text-slate-100">
                {draft.nickname ? `「${draft.nickname}」` : "尚未命名"}
              </div>
              <div className="text-xs text-slate-300">
                顏色：{avatarLabel(draft.color || draft.avatar)} ／
                聲線：{voiceLabel(draft.voice)}
              </div>
              <div className="text-[11px] text-slate-400">
                下方調整你的角色設定
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 下方：角色控制面板（HUD） ===== */}
      <section
        className="
          relative
          z-20
          backdrop-blur-xl
          bg-white/5
          border-t border-white/10
          shadow-[0_-20px_40px_rgba(0,0,0,0.45)]
        "
      >
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

function avatarLabel(id) {
  if (id === "mint") return "薄荷綠";
  if (id === "purple") return "紫色";
  return "天空藍";
}

function voiceLabel(id) {
  if (id === "calm") return "冷靜條理";
  if (id === "energetic") return "活潑有精神";
  return "溫暖親切";
}
