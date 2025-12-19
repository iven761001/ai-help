"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import CompassCreator from "../CompassCreator/CompassCreator";
import useDragRotate from "../../hooks/useDragRotate";

const Avatar3D = dynamic(() => import("../Avatar3D"), { ssr: false });

export default function CreateScreen({ draft, setDraft, onDone }) {
  const { yaw, bind } = useDragRotate({ sensitivity: 0.01 });

  // ✅ 底部面板高度（動態）
  const [bottomPad, setBottomPad] = useState(380); // 預設保底，避免首幀跳動

  useEffect(() => {
    if (typeof window === "undefined") return;

    const panel = document.querySelector("[data-creator-panel]");
    if (!panel) return;

    const updatePadding = () => {
      const rect = panel.getBoundingClientRect();
      // 多留一點呼吸空間，避免太貼
      setBottomPad(Math.ceil(rect.height + 16));
    };

    updatePadding();

    // 監聽高度變化（自訂名字出現 / wheel 高度改變）
    const ro = new ResizeObserver(updatePadding);
    ro.observe(panel);

    window.addEventListener("resize", updatePadding);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updatePadding);
    };
  }, []);

  return (
    <main
      className="min-h-screen"
      style={{
        // ✅ 關鍵：自動避開底部 CompassCreator
        paddingBottom: `calc(${bottomPad}px + env(safe-area-inset-bottom))`
      }}
    >
      {/* 上方：角色預覽 */}
      <div className="px-4 pt-6 max-w-4xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-slate-100 text-center">
          客製你的專屬 AI 小管家
        </h1>
        <p className="text-xs md:text-sm text-slate-400 text-center mt-2">
          用底部介面依序選顏色、個性、名字。
        </p>

        <div className="mt-6 flex items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="rounded-3xl p-3 glass-card">
              {/* 熊熊預覽 */}
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

              <div className="mt-3 space-y-1 px-2 pb-1">
                <div className="text-sm font-semibold text-slate-100">
                  預覽：{draft.nickname ? `「${draft.nickname}」` : "尚未命名"}
                </div>
                <div className="text-xs text-slate-400">
                  顏色：{avatarLabel(draft.color || draft.avatar)}／聲線：
                  {voiceLabel(draft.voice)}
                </div>
                <div className="text-[11px] text-slate-500">
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
