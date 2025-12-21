"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import CompassCreator from "../CompassCreator/CompassCreator";
import useDragRotate from "../../hooks/useDragRotate";

const Avatar3D = dynamic(() => import("../Avatar3D"), { ssr: false });

export default function CreateScreen({ draft, setDraft, onDone }) {
  const { yaw, bind } = useDragRotate({ sensitivity: 0.01 });
  const [hudH, setHudH] = useState(260);

  return (
    <main className="min-h-[100dvh] flex flex-col">
      {/* 上方世界：用 paddingBottom 讓位給 HUD + 鍵盤 */}
      <section
        className="flex-1 flex items-center justify-center px-4 pt-6"
        style={{
          paddingBottom: `calc(${hudH}px + env(safe-area-inset-bottom) + var(--kb, 0px) + 12px)`
        }}
      >
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

            <div className="mt-3 space-y-1 px-2 pb-1 text-center">
              <div className="text-sm font-semibold text-white">
                {draft.nickname ? `「${draft.nickname}」` : "尚未命名"}
              </div>
              <div className="text-xs text-white/70">
                顏色：{avatarLabel(draft.color || draft.avatar)} ／ 聲線：{voiceLabel(draft.voice)}
              </div>
              <div className="text-[11px] text-white/55">下方調整你的角色設定</div>
            </div>
          </div>
        </div>
      </section>

      {/* HUD：固定在底部（CompassCreator 內部是 fixed） */}
      <CompassCreator
        value={draft}
        onChange={setDraft}
        onDone={onDone}
        disabled={false}
        onHeightChange={(h) => setHudH(Math.max(220, Math.round(h || 0)))}
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
