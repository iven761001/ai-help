// app/components/AvatarStage.jsx
"use client";

import dynamic from "next/dynamic";
import useDragRotate from "../hooks/useDragRotate";

// 你現在 Avatar3D 是純 React 畫圖，不需要 dynamic 也行
// 但保留 dynamic 可避免你之後換 three.js 時 SSR 出事
const Avatar3D = dynamic(() => import("./Avatar3D"), { ssr: false });

export default function AvatarStage({
  user,
  emotion = "idle",
  className = "",
  disableDrag = false
}) {
  const { yaw, bind } = useDragRotate({ sensitivity: 0.01 });

  const variant = user?.avatar || user?.color || "sky";
  const nickname = user?.nickname || "尚未命名";

  return (
    <div className={className}>
      {/* 舞台卡 */}
      <div className="glass-card rounded-3xl p-3">
        {/* ✅ 熊舞台：一定要 relative + overflow-hidden */}
        <div className="relative aspect-square rounded-2xl glass-soft overflow-hidden">
          {/* 熊本體 */}
          <div className="absolute inset-0">
            <Avatar3D variant={variant} emotion={emotion} previewYaw={yaw} />
          </div>

          {/* ✅ 手勢捕捉層：確保拖拉事件一定吃得到 */}
          {!disableDrag && (
            <div
              className="absolute inset-0 z-10"
              style={{
                touchAction: "none", // ✅ 關鍵：不讓瀏覽器把拖拉當成捲動
                WebkitUserSelect: "none",
                userSelect: "none"
              }}
              {...bind}
            />
          )}
        </div>

        {/* 文字區 */}
        <div className="mt-3 space-y-1 px-2 pb-1 text-center">
          <div className="text-sm font-semibold text-white">{nickname}</div>
          <div className="text-xs text-white/70">
            顏色：{labelColor(user?.color || user?.avatar)} ／ 聲線：
            {labelVoice(user?.voice)}
          </div>
        </div>
      </div>
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
