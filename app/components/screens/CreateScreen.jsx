"use client";

import dynamic from "next/dynamic";
import CompassCreator from "../CompassCreator/CompassCreator";
import useDragRotate from "../../hooks/useDragRotate";

const Avatar3D = dynamic(() => import("../Avatar3D"), { ssr: false });

// ✅ 統一 HUD 高度（Create / Chat 都用同一個）
const HUD_H = 360;

export default function CreateScreen({ draft, setDraft, onDone }) {
  const { yaw, bind } = useDragRotate({ sensitivity: 0.01 });

  return (
    <main className="min-h-screen flex flex-col">
      {/* ===== 上方：角色世界（高度 = 100vh - HUD_H）===== */}
      <section
        className="flex items-start justify-center px-4"
        style={{
          height: `calc(100vh - ${HUD_H}px)`,
          paddingTop: 18 // ✅ 熊區整體往上（你可再調 12~28）
        }}
      >
        <div className="w-full max-w-sm">
          {/* ✅ 卡片再往上挪一點（更靠上） */}
          <div className="glass-card rounded-3xl p-3 -translate-y-2">
            {/* 熊的預覽舞台（單手拖拉旋轉） */}
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
                顏色：{avatarLabel(draft.color || draft.avatar)} ／ 聲線：
                {voiceLabel(draft.voice)}
              </div>
              <div className="text-[11px] text-slate-400">下方調整你的角色設定</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 下方：HUD（固定高度 = HUD_H）===== */}
      <section
        className="relative z-20"
        style={{
          height: `${HUD_H}px`
        }}
      >
        {/* 這層是 HUD 玻璃底座 */}
        <div
          className="
            h-full
            backdrop-blur-xl
            bg-white/5
            border-t border-white/10
            shadow-[0_-20px_40px_rgba(0,0,0,0.45)]
          "
        >
          {/* ✅ 讓 CompassCreator 充滿 HUD 高度 */}
          <div className="h-full">
            <CompassCreator
              value={draft}
              onChange={setDraft}
              onDone={onDone}
              disabled={false}
              // 注意：你 CompassCreator 裡目前是 fixed bottom
              // 這裡先不靠 onHeightChange 了，直接用 HUD_H 鎖死更穩
            />
          </div>
        </div>
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
