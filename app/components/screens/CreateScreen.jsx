"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import CompassCreator from "../CompassCreator/CompassCreator";
import useDragRotate from "../../hooks/useDragRotate";

const Avatar3D = dynamic(() => import("../Avatar3D"), { ssr: false });

export default function CreateScreen({ draft, setDraft, onDone }) {
  const { yaw, bind } = useDragRotate({ sensitivity: 0.01 });

  const [hudH, setHudH] = useState(0); // HUD 真實高度（含 safe-area）
  const [bottomInset, setBottomInset] = useState(0); // 鍵盤/視窗縮放造成的底部遮擋

  // ✅ 鍵盤/視窗變化：用 visualViewport 算出底部被吃掉多少
  useEffect(() => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // innerHeight - visualViewport.height - offsetTop = 底部被遮擋
      const inset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop)
      );
      setBottomInset(inset);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // ✅ 世界區要永遠讓位：HUD 高度 + 鍵盤 inset + 一點間距
  const worldPadBottom = Math.max(0, hudH + bottomInset + 18);

  return (
    <main className="min-h-screen relative">
      {/* ===== 上方：角色世界（會自動讓位） ===== */}
      <section
        className="min-h-screen flex items-center justify-center px-4 pt-6"
        style={{ paddingBottom: worldPadBottom }}
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

      {/* ===== 下方：HUD（固定在底部，鍵盤出現會上移） ===== */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[80]"
        style={{
          transform: bottomInset ? `translateY(-${bottomInset}px)` : undefined,
          willChange: "transform"
        }}
      >
        <CompassCreator
          value={draft}
          onChange={setDraft}
          onDone={onDone}
          disabled={false}
          onHeightChange={setHudH}
        />
      </div>
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
