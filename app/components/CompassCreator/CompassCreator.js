"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

/**
 * 羅盤版「三圈同心圓」創角盤
 * - 固定底部、圓形底座（羅盤感）
 * - 三圈獨立左右滑（互不干擾）
 * - 中央顯示目前選擇（更像在「校準羅盤」）
 */
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

  const [localName, setLocalName] = useState(value?.nickname || "");
  useEffect(() => setLocalName(value?.nickname || ""), [value?.nickname]);

  // 拖拉=滾動（橫向滑動用）
  function useDragScroll() {
    const ref = useRef(null);
    const state = useRef({ down: false, x: 0, left: 0 });

    useEffect(() => {
      const el = ref.current;
      if (!el) return;

      const onDown = (e) => {
        if (disabled) return;
        state.current.down = true;
        state.current.x = e.clientX;
        state.current.left = el.scrollLeft;
        el.setPointerCapture?.(e.pointerId);
      };
      const onMove = (e) => {
        if (!state.current.down) return;
        const dx = e.clientX - state.current.x;
        el.scrollLeft = state.current.left - dx;
      };
      const onUp = () => (state.current.down = false);

      el.addEventListener("pointerdown", onDown, { passive: true });
      el.addEventListener("pointermove", onMove, { passive: true });
      el.addEventListener("pointerup", onUp, { passive: true });
      el.addEventListener("pointercancel", onUp, { passive: true });
      el.addEventListener("pointerleave", onUp, { passive: true });

      return () => {
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
        el.removeEventListener("pointerleave", onUp);
      };
    }, [disabled]);

    return ref;
  }

  const ring1Ref = useDragScroll();
  const ring2Ref = useDragScroll();
  const ring3Ref = useDragScroll();

  const currentColor = value?.color || value?.avatar || "sky";
  const currentVoice = value?.voice || "warm";

  const canDone =
    !!value?.email && !!currentColor && !!currentVoice && !!localName.trim();

  const pickColor = (id) => onChange?.({ ...value, color: id, avatar: id });
  const pickVoice = (id) => onChange?.({ ...value, voice: id });
  const commitName = (name) => onChange?.({ ...value, nickname: name });

  // 小標籤
  const colorLabel =
    currentColor === "mint"
      ? "薄荷綠"
      : currentColor === "purple"
      ? "紫色"
      : "天空藍";
  const voiceLabel =
    currentVoice === "calm"
      ? "冷靜條理"
      : currentVoice === "energetic"
      ? "活潑有精神"
      : "溫暖親切";

  return (
    <div className="fixed left-0 right-0 bottom-0 z-[60] pointer-events-none">
      <div
        className="pointer-events-auto mx-auto w-full max-w-4xl px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {/* 羅盤底座 */}
        <div className="relative overflow-hidden rounded-[32px] border border-sky-200/60 bg-white/65 backdrop-blur shadow-[0_-18px_70px_rgba(2,132,199,0.22)]">
          {/* 上方小標題 */}
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800">
                高科技羅盤 · 創角設定
              </div>
              <div className="text-[11px] text-slate-500">
                三圈同心圓，各自左右滑動選擇
              </div>
            </div>

            <button
              disabled={disabled || !canDone}
              onClick={() => {
                commitName(localName.trim());
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

          {/* 圓形羅盤區 */}
          <div className="relative px-4 pb-4 pt-2">
            <div className="relative mx-auto aspect-square w-full max-w-[460px]">
              {/* 羅盤背景 */}
              <div className="absolute inset-0 rounded-full border border-sky-100 bg-gradient-to-b from-sky-50/80 to-white/40" />

              {/* 科技格線/光暈 */}
              <div
                className="absolute inset-0 rounded-full opacity-70"
                style={{
                  background:
                    "radial-gradient(circle at 50% 40%, rgba(14,165,233,0.18), transparent 55%), radial-gradient(circle at 20% 80%, rgba(34,211,238,0.14), transparent 45%), radial-gradient(circle at 80% 75%, rgba(99,102,241,0.12), transparent 45%)"
                }}
              />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "repeating-radial-gradient(circle at 50% 50%, rgba(148,163,184,0.22) 0 1px, transparent 1px 18px)"
                }}
              />

              {/* 指針/準星 */}
              <div className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/60" />
              <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500 shadow-[0_0_18px_rgba(14,165,233,0.65)]" />
              <div className="absolute left-1/2 top-[10px] -translate-x-1/2 text-[10px] tracking-widest text-slate-400">
                N
              </div>

              {/* 中央狀態顯示 */}
              <div className="absolute left-1/2 top-1/2 w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-sky-100 bg-white/70 px-3 py-2 text-center backdrop-blur">
                <div className="text-[11px] text-slate-500">
                  已選：{colorLabel} · {voiceLabel}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-800 line-clamp-1">
                  {localName.trim() ? `暱稱：${localName.trim()}` : "請輸入暱稱"}
                </div>
              </div>

              {/* 三圈弧形滑軌（用「圓環外觀 + 內部水平滑動」做出羅盤感） */}
              <ArcRing
                label="① 顏色"
                hint="核心色（也會套用到冷光線條）"
                scrollRef={ring1Ref}
                radiusClass="inset-[8%]"
                disabled={disabled}
              >
                {colors.map((c) => (
                  <ArcChip
                    key={c.id}
                    active={currentColor === c.id}
                    label={c.label}
                    onClick={() => pickColor(c.id)}
                    disabled={disabled}
                  />
                ))}
              </ArcRing>

              <ArcRing
                label="② 個性"
                hint="說話風格（聲線）"
                scrollRef={ring2Ref}
                radiusClass="inset-[18%]"
                disabled={disabled}
              >
                {voices.map((v) => (
                  <ArcChip
                    key={v.id}
                    active={currentVoice === v.id}
                    label={v.label}
                    onClick={() => pickVoice(v.id)}
                    disabled={disabled}
                  />
                ))}
              </ArcRing>

              <ArcRing
                label="③ 名字"
                hint="輸入後就能開始聊天"
                scrollRef={ring3Ref}
                radiusClass="inset-[28%]"
                disabled={disabled}
              >
                <div className="min-w-[340px] flex items-center gap-2 px-2">
                  <input
                    value={localName}
                    onChange={(e) => {
                      const v = e.target.value.slice(0, 20);
                      setLocalName(v);
                    }}
                    onBlur={() => commitName(localName.trim())}
                    placeholder="例如：小護膜、阿膜、浴室管家"
                    disabled={disabled}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <div className="text-[11px] text-slate-400 pr-2">
                    {localName.length}/20
                  </div>
                </div>
              </ArcRing>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArcRing({ label, hint, children, scrollRef, radiusClass, disabled }) {
  return (
    <div className={cx("absolute rounded-full", radiusClass)}>
      {/* 圓環外觀 */}
      <div className="absolute inset-0 rounded-full border border-sky-200/60 bg-white/10" />
      <div
        className="absolute inset-0 rounded-full opacity-70"
        style={{
          background:
            "conic-gradient(from 180deg, rgba(14,165,233,0.08), rgba(99,102,241,0.06), rgba(34,211,238,0.08))"
        }}
      />

      {/* 上方標籤 */}
      <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full border border-sky-100 bg-white/75 px-3 py-1 text-[11px] text-slate-600 backdrop-blur">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="mx-2 text-slate-300">|</span>
        <span className="text-slate-500">{hint}</span>
      </div>

      {/* 弧形「窗口」：只露出下半圈，做出羅盤弧形滑軌的感覺 */}
      <div className="absolute left-1/2 bottom-2 w-[92%] -translate-x-1/2">
        <div className="relative overflow-hidden rounded-full border border-sky-100 bg-white/55 backdrop-blur">
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-3"
            style={{
              touchAction: "pan-x",
              WebkitOverflowScrolling: "touch",
              pointerEvents: disabled ? "none" : "auto"
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArcChip({ active, label, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "shrink-0 rounded-full border px-4 py-2 text-xs md:text-sm transition",
        active
          ? "bg-sky-600 border-sky-600 text-white shadow-[0_0_18px_rgba(14,165,233,0.35)]"
          : "bg-white/85 border-slate-200 text-slate-700 hover:bg-white"
      )}
    >
      {label}
    </button>
  );
}
