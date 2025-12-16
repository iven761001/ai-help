"use client";

import { useEffect, useMemo, useRef } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

/**
 * 垂直滾輪（置中吸附）
 * - scroll-snap: 每一個 item 置中吸附
 * - top/bottom spacer: 讓第一個/最後一個也能置中
 *
 * 注意：吸附點對齊「文字」的中心，所以每個 item 高度固定 itemHeight
 */
export default function WheelPicker({
  title,
  subtitle,
  items,
  value,
  onChange,
  height = 176,
  itemHeight = 44,
  disabled = false
}) {
  const ref = useRef(null);

  const pad = useMemo(() => Math.max(0, Math.floor((height - itemHeight) / 2)), [height, itemHeight]);

  // 根據 value 把滾輪滾到正確位置
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const idx = Math.max(0, items.findIndex((x) => x.id === value));
    const targetTop = idx * itemHeight;

    // 避免每次 render 都硬跳，只有差距大才對齊
    if (Math.abs(el.scrollTop - targetTop) > 2) {
      el.scrollTop = targetTop;
    }
  }, [value, items, itemHeight]);

  // 監聽 scroll：用「最接近中心」的 index 作為選取
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      if (disabled) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const idx = Math.round(el.scrollTop / itemHeight);
        const safe = Math.max(0, Math.min(items.length - 1, idx));
        const next = items[safe]?.id;
        if (next && next !== value) onChange?.(next);
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [disabled, items, itemHeight, onChange, value]);

  // 點擊某個選項：平滑滾動到置中位置
  const snapTo = (idx) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: idx * itemHeight, behavior: "smooth" });
  };

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-3">
      <div className="px-1">
        <div className="text-xs font-semibold text-slate-700">{title}</div>
        <div className="text-[11px] text-slate-500">{subtitle}</div>
      </div>

      <div className="mt-2 relative">
        {/* 中央選取線（視覺上框住文字） */}
        <div
          className="pointer-events-none absolute left-2 right-2 rounded-xl border border-sky-200 bg-white/50 backdrop-blur"
          style={{
            top: pad,
            height: itemHeight
          }}
        />

        {/* 上下漸層遮罩（更像滾輪） */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-10 bg-gradient-to-b from-sky-50/90 to-transparent rounded-2xl" />
        <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-10 bg-gradient-to-t from-sky-50/90 to-transparent rounded-2xl" />

        <div
          ref={ref}
          className={cx(
            "no-scrollbar overflow-y-auto rounded-2xl",
            disabled ? "opacity-60" : "opacity-100"
          )}
          style={{
            height,
            touchAction: "pan-y",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "y mandatory"
          }}
        >
          {/* top spacer：讓第一個 item 也能置中 */}
          <div style={{ height: pad }} />

          {items.map((it, idx) => {
            const active = it.id === value;
            return (
              <button
                key={it.id}
                type="button"
                disabled={disabled}
                onClick={() => snapTo(idx)}
                className={cx(
                  "w-full text-left px-3 rounded-xl flex items-center",
                  active ? "text-slate-900" : "text-slate-600"
                )}
                style={{
                  height: itemHeight,
                  scrollSnapAlign: "center"
                }}
              >
                <div className={cx("text-sm leading-none", active ? "font-semibold" : "font-medium")}>
                  {it.label}
                </div>
              </button>
            );
          })}

          {/* bottom spacer */}
          <div style={{ height: pad }} />
        </div>
      </div>
    </div>
  );
}
