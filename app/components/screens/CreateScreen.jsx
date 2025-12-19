"use client";

import dynamic from "next/dynamic";
import CompassCreator from "../CompassCreator/CompassCreator";
import useDragRotate from "../../hooks/useDragRotate";

const Avatar3D = dynamic(() => import("../Avatar3D"), { ssr: false });

export default function CreateScreen({ draft, setDraft, onDone }) {
  const { yaw, bind } = useDragRotate({ sensitivity: 0.01 });

  return (
    <main className="min-h-screen">
      {/* 上方：角色預覽區（留底部空間給羅盤） */}
      <div className="px-4 pt-6 pb-40 max-w-4xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 text-center">
          客製你的專屬 AI 小管家
        </h1>
        <p className="text-xs md:text-sm text-slate-500 text-center mt-2">
          用底部介面依序選顏色、個性、名字。
        </p>

        <div className="mt-6 flex items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="rounded-3xl p-3 glass-card">
              {/* 單手拖拉旋轉（預覽熊） */}
              <div className="aspect-square rounded-2xl glass-soft flex items-center justify-center overflow-hidden" {...bind}>
                <Avatar3D
                  variant={draft.avatar || draft.color || "sky"}
                  emotion="idle"
                  previewYaw={yaw}
                />
              </div>

              <div className="mt-3 space-y-1 px-2 pb-1">
                <div className="text-sm font-semibold text-slate-800">
                  預覽：{draft.nickname ? `「${draft.nickname}」` : "尚未命名"}
                </div>
                <div className="text-xs text-slate-500">
                  顏色：{avatarLabel(draft.color || draft.avatar)}／聲線：
                  {voiceLabel(draft.voice)}
                </div>
                <div className="text-[11px] text-slate-400">
                  完成後會自動進入對話模式
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部創角控制 */}
      <CompassCreator
        value={draft}
        onChange={(v) => setDraft(v)}
        onDone={onDone}
        disabled={false}
      />
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
