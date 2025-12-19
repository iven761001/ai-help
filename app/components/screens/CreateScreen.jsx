"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import CompassCreator from "../CompassCreator/CompassCreator";
import useDragRotate from "../../hooks/useDragRotate";

const Avatar3D = dynamic(() => import("../Avatar3D"), { ssr: false });

export default function CreateScreen({ draft, setDraft, onDone }) {
  const { yaw, bind } = useDragRotate({ sensitivity: 0.01 });

  // ✅ 底部 HUD 高度（由 CompassCreator 回報）
  const [dockH, setDockH] = useState(320);

  return (
    <main className="min-h-screen flex flex-col">
      {/* ===== 上方：角色世界（自動讓位給底部 HUD） ===== */}
      <section
        className="flex-1 flex items-center justify-center px-4 pt-6"
        style={{
          // ✅ 讓位：HUD 高度 + safe-area + 一點空隙
          paddingBottom: `calc(${dockH}px + env(safe-area-inset-bottom) + 16px)`
        }}
      >
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
                顏色：{avatarLabel(draft.color || draft.avatar)} ／ 聲線：
                {voiceLabel(draft.voice)}
              </div>
              <div className="text-[11px] text-slate-400">
                下方調整你的角色設定
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 底部 HUD（注意：CompassCreator 本身是 fixed，放哪裡都會固定在底部） ===== */}
      <CompassCreator
        value={draft}
        onChange={setDraft}
        onDone={onDone}
        disabled={false}
        onHeightChange={(h) => {
          // ✅ 小保護：避免 0 或太小導致模型又被蓋
          const safe = Math.max(240, Math.ceil(h || 0));
          setDockH(safe);
        }}
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
