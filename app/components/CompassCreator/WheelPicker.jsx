"use client";

import { useEffect, useMemo, useRef } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

/**
 * iOS Picker 風格垂直滾輪（置中吸附）
 * - scroll-snap: 每一個 item 置中吸附
 * - 中央項：更大、更清楚
 * - 上下項：縮小、淡化、微模糊 + 3D 弧度（rotateX）
 *
 * 重點：我們用 rAF 在 scroll 時「直接改每個 item 的 style」，不靠 re-render，滑起來很順
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
  const itemElsRef = useRef([]);

  const pad = useMemo(
    () => Math.max(0, Math.floor((height - itemHeight) / 2)),
    [height, itemHeight]
  );

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // ✅ 套用 iOS picker 的「3D 弧度 / 模糊 / 透明度 / 縮放」
  const applyIOSStyles = (scrollTop) => {
    const el = ref.current;
    if (!el) return;

    const centerY = scrollTop + height / 2;
    const maxDist = itemHeight * 2.2; // 影響範圍：越大越「平」，越小越「捲」

    for (let i = 0; i < itemElsRef.current.length; i++) {
      const node = itemElsRef.current[i];
      if (!node) continue;

      // 每個 item 的中心點位置（含 top spacer）
      const itemCenter = pad + i * itemHeight + itemHeight / 2;
      const dist = itemCenter - centerY; // + 往下，- 往上
      const nd = clamp(dist / maxDist, -1, 1); // normalize -1..1
      const ad = Math.abs(nd);

      // 0(中心) -> 1(遠離中心)
      const fade = clamp(1 - ad, 0, 1);

      // 視覺：中心最大，越遠越小
      const scale = 0.86 + 0.18 * fade; // 0.86~1.04
      const opacity = 0.18 + 0.82 * Math.pow(fade, 1.8); // 遠的很淡
      const blurPx = (1 - fade) * 1.6; // 遠的微模糊
      const rotateX = nd * 42; // iOS 捲輪弧度感
      const translateZ = 56 * fade; // 讓中心更「浮」出來

      node.style.opacity = String(opacity);
      node.style.filter = `blur(${blurPx.toFixed(2)}px)`;
      node.style.transform = `perspective(500px) rotateX(${rotateX.toFixed(
        2
      )}deg) translateZ(${translateZ.toFixed(1)}px) scale(${scale.toFixed(3)})`;

      // 中央那個字更黑更清楚
      node.style.color = fade > 0.82 ? "rgb(15 23 42)" : "rgb(71 85 105)";
      node.style.fontWeight = fade > 0.86 ? "700" : "500";
    }
  };

  // ✅ 依 value 把滾輪移到正確位置（置中吸附）
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const idx = Math.max(0, items.findIndex((x) => x.id === value));
    const targetTop = idx * itemHeight;

    // 避免一直跳，差距大才更新
    if (Math.abs(el.scrollTop - targetTop) > 2) {
      el.scrollTop = targetTop;
    }

    // 同步一次 iOS 視覺
    applyIOSStyles(el.scrollTop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, items, itemHeight]);

  // ✅ scroll：更新選中 & 視覺（rAF）
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      if (disabled) return;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const st = el.scrollTop;

        // iOS 視覺效果
        applyIOSStyles(st);

        // 取「最接近中心」的 idx
        const idx = Math.round(st / itemHeight);
        const safe = clamp(idx, 0, items.length - 1);
        const next = items[safe]?.id;

        if (next && next !== value) onChange?.(next);
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    // 初始套一次
    requestAnimationFrame(() => applyIOSStyles(el.scrollTop));

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, items, itemHeight, onChange, value, height, pad]);

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
        {/* 中央選取框（像 iOS 的選取窗） */}
        <div
          className="pointer-events-none absolute left-2 right-2 rounded-xl border border-sky-200 bg-white/85 shadow-sm"
          style={{
            top: pad,
            height: itemHeight
          }}
        />

        {/* 上下漸層（更像 iOS 滾輪遮罩） */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-12 bg-gradient-to-b from-sky-50/95 to-transparent rounded-2xl" />
        <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-12 bg-gradient-to-t from-sky-50/95 to-transparent rounded-2xl" />

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
                  "w-full text-left px-3 rounded-xl flex items-center transition",
                  // 先給基本文字大小，真正 iOS 立體效果會由 applyIOSStyles 直接覆蓋 transform/opacity
                  active ? "text-slate-900" : "text-slate-600"
                )}
                style={{
                  height: itemHeight,
                  scrollSnapAlign: "center",
                  // iOS 那種「有深度」的感覺
                  transformStyle: "preserve-3d",
                  willChange: "transform, filter, opacity"
                }}
                ref={(el) => {
                  itemElsRef.current[idx] = el;
                }}
              >
                <div className="text-sm leading-none">{it.label}</div>
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
