// app/components/AvatarStage.jsx
"use client";

import dynamic from "next/dynamic";

const Avatar3D = dynamic(() => import("./Avatar3D"), { ssr: false });

export default function AvatarStage({
  mode, // "create" | "chat"
  draft,
  user,
  emotion = "idle",
  onHudHeight
}) {
  const name = mode === "chat" ? user?.nickname : draft?.nickname;
  const variant = mode === "chat" ? user?.avatar : (draft?.avatar || draft?.color);

  return (
    <div className="relative w-full h-full">
      {/* 舞台（永遠佔滿，底部由 page.js 用 paddingBottom 讓位） */}
      <div className="absolute inset-0 flex items-center justify-center px-4 pt-6">
        <div className="w-full max-w-sm">
          <div className="glass-card rounded-[28px] p-3">
            <div className="aspect-square rounded-2xl glass-soft overflow-hidden">
              <Avatar3D variant={variant || "sky"} emotion={emotion} />
            </div>

            <div className="mt-3 text-center">
              <div className="text-sm font-semibold text-white">
                {name ? `「${name}」` : "尚未命名"}
              </div>

              <div className="text-xs text-white/70 mt-1">
                {mode === "chat"
                  ? `顏色：${labelColor(user?.avatar)} ／ 聲線：${labelVoice(user?.voice)}`
                  : `顏色：${labelColor(draft?.color || draft?.avatar)} ／ 聲線：${labelVoice(draft?.voice)}`
                }
              </div>

              <div className="text-[11px] text-white/55 mt-1">
                {mode === "chat" ? "聊天中也會持續互動（下一步可加骨架動畫）" : "下方調整你的角色設定"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 這個只是保留接口，實際高度由 HUD 元件透過 onHeightChange 回報給 page.js */}
      <div className="hidden" data-onHudHeight={onHudHeight ? "1" : "0"} />
    </div>
  );
}

function labelColor(id) {
  if (id === "mint") return "薄荷綠";
  if (id === "purple") return "紫色";
  return "天空藍";
}

function labelVoice(id) {
  if (id === "calm") return "冷靜條理";
  if (id === "energetic") return "活潑有精神";
  return "溫暖親切";
}
