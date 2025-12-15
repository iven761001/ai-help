"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

/**
 * 穩定版「三圈羅盤」
 * - 每一圈是獨立水平滑動（可拖拉）
 * - 不會跟整頁的上下滑互相打架
 * - 固定在螢幕底部（safe-area）
 */
export default function CompassCreator({
  value,
  onChange,
  onDone,
  disabled
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

  const [localName, setLocalName] = useState(value?.nickname || "");

  // 同步外部 value
  useEffect(() => {
    setLocalName(value?.nickname || "");
  }, [value?.nickname]);

  // 小工具：做「拖拉=滾動」的橫向滑動（手機很好用）
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

      const onUp = () => {
        state.current.down = false;
      };

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

  const canDone =
    !!value?.email &&
    !!(value?.color || value?.avatar) &&
    !!(value?.voice) &&
    !!localName.trim();

  const pickColor = (id) => {
    onChange?.({ ...value, color: id, avatar: id }); // 兼容你原本用 avatar 的欄位
  };
  const pickVoice = (id) => {
    onChange?.({ ...value, voice: id });
  };
  const commitName = (name) => {
    onChange?.({ ...value, nickname: name });
  };

  return (
    <div className="fixed left-0 right-0 bottom-0 z-[60] pointer-events-none">
      <div
        className="pointer-events-auto mx-auto w-full max-w-4xl px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {/* 外殼：科技感底座 */}
        <div className="rounded-[28px] border border-sky-200/60 bg-white/75 backdrop-blur shadow-[0_-10px_40px_rgba(2,132,199,0.15)] overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">
                  高科技羅盤 · 創角設定
                </div>
                <div className="text-[11px] text-slate-500">
                  每一圈都可以左右滑動選擇，互不干擾
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
          </div>

          {/* 3 圈：看起來像同心圓，實作上是三條「圈環滑軌」 */}
          <div className="px-3 pb-4 space-y-3">
            {/* Ring 1 - 顏色 */}
            <Ring
              title="① 顏色"
              subtitle="選核心色（也會套用到冷光線條）"
              scrollRef={ring1Ref}
            >
              {colors.map((c) => (
                <Chip
                  key={c.id}
                  active={(value?.color || value?.avatar) === c.id}
                  onClick={() => pickColor(c.id)}
                  disabled={disabled}
                  label={c.label}
                />
              ))}
            </Ring>

            {/* Ring 2 - 個性/聲線 */}
            <Ring
              title="② 個性"
              subtitle="選說話風格（聲線）"
              scrollRef={ring2Ref}
            >
              {voices.map((v) => (
                <Chip
                  key={v.id}
                  active={value?.voice === v.id}
                  onClick={() => pickVoice(v.id)}
                  disabled={disabled}
                  label={v.label}
                />
              ))}
            </Ring>

            {/* Ring 3 - 名字 */}
            <Ring
              title="③ 名字"
              subtitle="輸入暱稱後就可以開始聊天"
              scrollRef={ring3Ref}
            >
              <div className="min-w-[320px] flex items-center gap-2 px-1">
                <input
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  onBlur={() => commitName(localName.trim())}
                  placeholder="例如：小護膜、阿膜、浴室管家"
                  disabled={disabled}
                  className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
                <div className="text-[11px] text-slate-400 pr-2">
                  {Math.min(localName.length, 20)}/20
                </div>
              </div>
            </Ring>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ring({ title, subtitle, children, scrollRef }) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-700">{title}</div>
          <div className="text-[11px] text-slate-500">{subtitle}</div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mt-2 flex gap-2 overflow-x-auto no-scrollbar py-1"
        style={{
          touchAction: "pan-x", // 讓手機水平滑更順
          WebkitOverflowScrolling: "touch"
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Chip({ active, label, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "shrink-0 rounded-full border px-4 py-2 text-xs md:text-sm transition",
        active
          ? "bg-sky-600 border-sky-600 text-white"
          : "bg-white/80 border-slate-200 text-slate-700 hover:bg-white"
      )}
    >
      {label}
    </button>
  );
}
