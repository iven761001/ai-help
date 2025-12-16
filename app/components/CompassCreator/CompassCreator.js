"use client";

import { useMemo, useState, useEffect } from "react";
import WheelPicker from "./WheelPicker";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function CompassCreator({ value, onChange, onDone, disabled }) {
  const colors = useMemo(
    () => [
      { id: "sky", label: "天空藍 · 穩重專業" },
      { id: "mint", label: "薄荷綠 · 清爽潔淨" },
      { id: "purple", label: "紫色 · 科技感" }
    ],
    []
  );

  const voices = useMemo(
    () => [
      { id: "warm", label: "溫暖親切" },
      { id: "calm", label: "冷靜條理" },
      { id: "energetic", label: "活潑有精神" }
    ],
    []
  );

  // 名字滾輪：給一批常用名 + 自訂
  const nameOptions = useMemo(
    () => [
      { id: "小護膜", label: "小護膜" },
      { id: "阿膜", label: "阿膜" },
      { id: "浴室管家", label: "浴室管家" },
      { id: "廚房管家", label: "廚房管家" },
      { id: "玻璃小幫手", label: "玻璃小幫手" },
      { id: "地板管家", label: "地板管家" },
      { id: "__custom__", label: "自訂名字…" }
    ],
    []
  );

  const [nameMode, setNameMode] = useState("__custom__"); // 目前滾輪選到哪個
  const [customName, setCustomName] = useState(value?.nickname || "");

  // 同步外部 value（避免回到創角時不同步）
  useEffect(() => {
    const nick = value?.nickname || "";
    setCustomName(nick);

    // 如果 nickname 剛好是預設名，就把滾輪對到那個；否則對到 custom
    const hit = nameOptions.find((x) => x.id === nick);
    setNameMode(hit ? hit.id : "__custom__");
  }, [value?.nickname, nameOptions]);

  const pickColor = (id) => onChange?.({ ...value, color: id, avatar: id });
  const pickVoice = (id) => onChange?.({ ...value, voice: id });

  const pickNameMode = (id) => {
    setNameMode(id);
    if (id === "__custom__") {
      // 不動 nickname，讓使用者自己輸入
      return;
    }
    setCustomName(id);
    onChange?.({ ...value, nickname: id });
  };

  const commitCustomName = (name) => {
    const n = (name || "").trim().slice(0, 20);
    setCustomName(n);
    onChange?.({ ...value, nickname: n });
  };

  const canDone =
    !!value?.email &&
    !!(value?.color || value?.avatar) &&
    !!value?.voice &&
    !!(value?.nickname || customName).trim();

  return (
    <div className="fixed left-0 right-0 bottom-0 z-[60] pointer-events-none">
      <div
        className="pointer-events-auto mx-auto w-full max-w-4xl px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {/* 外殼 */}
        <div className="rounded-[28px] border border-sky-200/60 bg-white/75 backdrop-blur shadow-[0_-10px_40px_rgba(2,132,199,0.15)] overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">
                  創角設定
                </div>
                <div className="text-[11px] text-slate-500">
                  三個拉條都可以上下拖拉，會自動吸附到文字正中央
                </div>
              </div>

              <button
                disabled={disabled || !canDone}
                onClick={() => {
                  // 最終把自訂名也寫回
                  if (nameMode === "__custom__") commitCustomName(customName);
                  onDone?.();
                }}
                className={cx(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
                  disabled || !canDone
                    ? "bg-slate-200 text-slate-500"
                    : "bg-sky-600 text-white hover:bg-sky-700"
                )}
              >
                完成
              </button>
            </div>
          </div>

          {/* 三欄並排 */}
          <div className="px-3 pb-4 grid grid-cols-3 gap-3">
            <WheelPicker
              title="① 顏色"
              subtitle="選核心色"
              items={colors}
              value={value?.color || value?.avatar || "sky"}
              onChange={pickColor}
              disabled={disabled}
            />

            <WheelPicker
              title="② 個性"
              subtitle="選說話風格"
              items={voices}
              value={value?.voice || "warm"}
              onChange={pickVoice}
              disabled={disabled}
            />

            <WheelPicker
              title="③ 名字"
              subtitle="選一個或自訂"
              items={nameOptions}
              value={nameMode}
              onChange={pickNameMode}
              disabled={disabled}
            />
          </div>

          {/* 自訂名字輸入（只在選到自訂時出現） */}
          {nameMode === "__custom__" && (
            <div className="px-4 pb-4">
              <div className="rounded-2xl border border-sky-100 bg-white/70 px-3 py-3">
                <div className="text-[11px] text-slate-500 mb-2">
                  自訂名字（最多 20 字）
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onBlur={() => commitCustomName(customName)}
                    placeholder="例如：小護膜、阿膜、浴室管家"
                    disabled={disabled}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <div className="text-[11px] text-slate-400 pr-1">
                    {Math.min((customName || "").length, 20)}/20
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
