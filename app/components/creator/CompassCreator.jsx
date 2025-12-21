"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import WheelPicker from "./WheelPicker";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

/**
 * CompassCreator
 * - 三個 WheelPicker 並排：顏色 / 個性 / 名字
 * - mode="fixed"（預設）：固定在螢幕底部（你原本行為）
 * - mode="embedded"：不 fixed，可嵌入面板（用於 page.js 轉場）
 * - onHeightChange：回報外殼高度（可選）
 */
export default function CompassCreator({
  value,
  onChange,
  onDone,
  disabled,
  onHeightChange,
  mode = "embedded" // ✅ 新增：fixed / embedded
}) {
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

  // 名字選項（含自訂）
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

  const [nameMode, setNameMode] = useState("__custom__");
  const [customName, setCustomName] = useState(value?.nickname || "");

  // ✅ 量高度：抓真正會變高的殼
  const shellRef = useRef(null);

  useEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const emit = () => {
      const h = el.getBoundingClientRect().height || 0;
      onHeightChange?.(h);
    };

    emit();
    const ro = new ResizeObserver(() => requestAnimationFrame(emit));
    ro.observe(el);

    window.addEventListener("resize", emit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", emit);
    };
  }, [onHeightChange]);

  // 同步外部 value（避免回到創角時不同步）
  useEffect(() => {
    const nick = value?.nickname || "";
    setCustomName(nick);

    const hit = nameOptions.find((x) => x.id === nick);
    setNameMode(hit ? hit.id : "__custom__");
  }, [value?.nickname, nameOptions]);

  const pickColor = (id) => onChange?.({ ...value, color: id, avatar: id });
  const pickVoice = (id) => onChange?.({ ...value, voice: id });

  const pickNameMode = (id) => {
    setNameMode(id);
    if (id === "__custom__") return;
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

  // ✅ Wrapper：fixed / embedded
  const Wrapper = ({ children }) => {
    if (mode === "embedded") return <div className="h-full">{children}</div>;

    return (
      <div className="fixed left-0 right-0 bottom-0 z-[60] pointer-events-none">
        {children}
      </div>
    );
  };

  const innerWrapClass =
    mode === "embedded"
      ? "h-full"
      : "pointer-events-auto mx-auto w-full max-w-4xl px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]";

  return (
    <Wrapper>
      <div className={innerWrapClass} style={{ WebkitTapHighlightColor: "transparent" }}>
        {/* 外殼（高度會變：wheel + 自訂輸入出現/消失） */}
        <div
          ref={shellRef}
          className={cx(
            "rounded-[28px] overflow-hidden",
            "border border-sky-200/30 bg-white/10 backdrop-blur-xl",
            "shadow-[0_-12px_50px_rgba(56,189,248,0.15)]"
          )}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">創角設定</div>
                <div className="text-[11px] text-white/70">
                  三個拉條都可以上下拖拉，會自動吸附到文字正中央
                </div>
              </div>

              <button
                disabled={disabled || !canDone}
                onClick={() => {
                  if (nameMode === "__custom__") commitCustomName(customName);
                  onDone?.();
                }}
                className={cx(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
                  disabled || !canDone
                    ? "bg-white/20 text-white/60"
                    : "bg-sky-500 text-white hover:bg-sky-400 active:scale-95"
                )}
              >
                完成
              </button>
            </div>
          </div>

          {/* Wheels */}
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

          {/* Custom name input */}
          {nameMode === "__custom__" && (
            <div className="px-4 pb-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3">
                <div className="text-[11px] text-white/70 mb-2">
                  自訂名字（最多 20 字）
                </div>

                <div className="flex items-center gap-2">
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onBlur={() => commitCustomName(customName)}
                    placeholder="例如：小護膜、阿膜、浴室管家"
                    disabled={disabled}
                    className={cx(
                      "flex-1 rounded-full px-4 py-2 text-sm outline-none",
                      "border border-white/15 bg-black/10 text-white",
                      "placeholder:text-white/40 focus:ring-2 focus:ring-sky-400"
                    )}
                  />
                  <div className="text-[11px] text-white/60 pr-1">
                    {Math.min((customName || "").length, 20)}/20
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
