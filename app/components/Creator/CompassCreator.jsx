
// app/components/CompassCreator.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WheelPicker from "./WheelPicker";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function CompassCreator({
  value,
  onChange,
  onDone,
  disabled,
  onHeightChange
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

  const shellRef = useRef(null);

  // 量高度回報 page.js
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

  const [nameMode, setNameMode] = useState("__custom__");
  const [customName, setCustomName] = useState(value?.nickname || "");

  // 初始同步（回到創角時）
  useEffect(() => {
    const nick = value?.nickname || "";
    setCustomName(nick);

    const hit = nameOptions.find((x) => x.id === nick);
    setNameMode(hit ? hit.id : "__custom__");
  }, [value?.nickname, nameOptions]);

  const pickColor = (id) => onChange?.({ ...value, color: id, avatar: id });
  const pickVoice = (id) => onChange?.({ ...value, voice: id });

  // ✅ 名字轉輪變動：若不是 custom，就把輸入框同步成該名字
  const pickNameMode = (id) => {
    setNameMode(id);

    if (id === "__custom__") {
      // 留在輸入框自訂
      onChange?.({ ...value, nickname: customName });
      return;
    }

    setCustomName(id);
    onChange?.({ ...value, nickname: id });
  };

  // ✅ 輸入框：有字就自動把轉輪跳到 custom，並寫入 nickname
  const onTypeCustom = (txt) => {
    const n = (txt || "").slice(0, 20);
    setCustomName(n);

    const trimmed = n.trim();
    if (trimmed.length > 0 && nameMode !== "__custom__") {
      setNameMode("__custom__");
    }
    onChange?.({ ...value, nickname: trimmed });
  };

  const commitCustom = () => {
    const n = (customName || "").trim().slice(0, 20);
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
      >
        <div
          ref={shellRef}
          className="
            rounded-[28px]
            bg-white/10
            backdrop-blur-xl
            border border-white/15
            shadow-[0_-12px_50px_rgba(56,189,248,0.15)]
            overflow-hidden
          "
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

              <div className="flex items-center gap-2 shrink-0">
                {/* ✅ 自訂輸入移到完成左邊（原本那段文字刪掉） */}
                <div className="hidden sm:block">
                  <input
                    value={customName}
                    onChange={(e) => onTypeCustom(e.target.value)}
                    onBlur={commitCustom}
                    placeholder="自訂名字（最多 20 字）"
                    disabled={disabled}
                    className="
                      w-[220px] rounded-full
                      border border-white/15
                      bg-black/15 text-white
                      px-4 py-2 text-sm outline-none
                      placeholder:text-white/40
                      focus:ring-2 focus:ring-sky-400
                    "
                  />
                </div>

                <button
                  disabled={disabled || !canDone}
                  onClick={() => {
                    commitCustom();
                    onDone?.();
                  }}
                  className={cx(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    disabled || !canDone
                      ? "bg-white/15 text-white/50"
                      : "bg-sky-500 text-white hover:bg-sky-400"
                  )}
                >
                  完成
                </button>
              </div>
            </div>

            {/* 手機版：輸入框放下面一行（避免太擠） */}
            <div className="sm:hidden mt-3">
              <input
                value={customName}
                onChange={(e) => onTypeCustom(e.target.value)}
                onBlur={commitCustom}
                placeholder="自訂名字（最多 20 字）"
                disabled={disabled}
                className="
                  w-full rounded-2xl
                  border border-white/15
                  bg-black/15 text-white
                  px-4 py-3 text-sm outline-none
                  placeholder:text-white/40
                  focus:ring-2 focus:ring-sky-400
                "
              />
              <div className="text-[11px] text-white/55 mt-1 text-right">
                {Math.min((customName || "").length, 20)}/20
              </div>
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
        </div>
      </div>
    </div>
  );
}
