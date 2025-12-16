"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function WheelPicker({
  title,
  subtitle,
  items,
  value,
  onChange,
  height = 176,
  itemHeight = 44,
  disabled = false,
  haptics = true // ✅ 可關閉震動：<WheelPicker haptics={false} />
}) {
  const ref = useRef(null);
  const itemElsRef = useRef([]);

  const [isInteracting, setIsInteracting] = useState(false);
  const [bounce, setBounce] = useState(false);

  const lastEmitRef = useRef(value);
  const rafRef = useRef(0);
  const settleTimerRef = useRef(null);
  const interactTimerRef = useRef(null);

  const pad = useMemo(
    () => Math.max(0, Math.floor((height - itemHeight) / 2)),
    [height, itemHeight]
  );

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // ✅ 小震動（支援才做）
  const vibrate = (ms = 8) => {
    if (!haptics) return;
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch {}
  };

  // ✅ iOS picker 的「3D 弧度 / 模糊 / 透明度 / 縮放」
  // 你要更彎：maxDist 更小、rotateX 更大、translateZ 更大
  const applyIOSStyles = (scrollTop) => {
    const el = ref.current;
    if (!el) return;

    const centerY = scrollTop + height / 2;

    // 🔥 更彎一點（你剛剛指定的）
    const maxDist = itemHeight * 2.2;
    const ROT = 42;
    const Z = 56;

    for (let i = 0; i < itemElsRef.current.length; i++) {
      const node = itemElsRef.current[i];
      if (!node) continue;

      const itemCenter = pad + i * itemHeight + itemHeight / 2;
      const dist = itemCenter - centerY;
      const nd = clamp(dist / maxDist, -1, 1);
      const ad = Math.abs(nd);

      const fade = clamp(1 - ad, 0, 1);

      const scale = 0.86 + 0.18 * fade;
      const opacity = 0.16 + 0.84 * Math.pow(fade, 1.9);
      const blurPx = (1 - fade) * 1.5;

      const rotateX = nd * ROT;
      const translateZ = Z * fade;

      node.style.opacity = String(opacity);
      node.style.filter = `blur(${blurPx.toFixed(2)}px)`;
      node.style.transform = `perspective(520px) rotateX(${rotateX.toFixed(
        2
      )}deg) translateZ(${translateZ.toFixed(1)}px) scale(${scale.toFixed(3)})`;

      // 中央更黑、更「對焦」
      node.style.color = fade > 0.82 ? "rgb(15 23 42)" : "rgb(71 85 105)";
      node.style.fontWeight = fade > 0.86 ? "700" : "500";
    }
  };

  // ✅ 把滾輪滾到 value 對應位置
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const idx = Math.max(0, items.findIndex((x) => x.id === value));
    const targetTop = idx * itemHeight;

    if (Math.abs(el.scrollTop - targetTop) > 2) {
      el.scrollTop = targetTop;
    }

    applyIOSStyles(el.scrollTop);
    lastEmitRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, items, itemHeight]);

  // ✅ 計算「目前最接近中心」的 index
  const calcNearest = (scrollTop) => {
    const idx = Math.round(scrollTop / itemHeight);
    return clamp(idx, 0, items.length - 1);
  };

  // ✅ 滑動結束：吸附到最近、回彈、震動
  const settle = () => {
    const el = ref.current;
    if (!el) return;

    const nearest = calcNearest(el.scrollTop);
    const next = items[nearest]?.id;

    // 平滑吸附到正確位置（確保停下來一定正中）
    el.scrollTo({ top: nearest * itemHeight, behavior: "smooth" });

    // 觸發回彈（中央選取窗）
    setBounce(true);
    window.setTimeout(() => setBounce(false), 220);

    // 震動 + 送出值
    if (next && next !== lastEmitRef.current) {
      lastEmitRef.current = next;
      onChange?.(next);
      vibrate(9);
    } else {
      // 即使沒換值，也給一個很輕的「落點感」
      vibrate(5);
    }

    setIsInteracting(false);
  };

  // ✅ scroll handler（rAF + debounce settle）
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const markInteracting = () => {
      if (disabled) return;
      setIsInteracting(true);

      // 互動保持亮起：停止後再熄
      if (interactTimerRef.current) window.clearTimeout(interactTimerRef.current);
      interactTimerRef.current = window.setTimeout(() => {
        // 交給 settle() 來關閉 isInteracting
      }, 999999);
    };

    const scheduleSettle = () => {
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => {
        settle();
      }, 120); // Apple 感：放手後很快就「落點」
    };

    const onScroll = () => {
      if (disabled) return;

      markInteracting();

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        applyIOSStyles(el.scrollTop);

        // 先即時更新選中（讓中央字重/清晰即時變化）
        const nearest = calcNearest(el.scrollTop);
        const next = items[nearest]?.id;
        if (next && next !== value) {
          onChange?.(next);
        }

        scheduleSettle();
      });
    };

    // 觸控/滑鼠開始：先亮起
    const onPointerDown = () => {
      if (disabled) return;
      setIsInteracting(true);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", onPointerDown, { passive: true });

    // 初始套一次
    requestAnimationFrame(() => applyIOSStyles(el.scrollTop));

    return () => {
      cancelAnimationFrame(rafRef.current);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", onPointerDown);

      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
      if (interactTimerRef.current) window.clearTimeout(interactTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, items, itemHeight, onChange, value, height, pad]);

  // 點擊某個選項：平滑滾動到置中位置
  const snapTo = (idx) => {
    const el = ref.current;
    if (!el) return;
    setIsInteracting(true);
    el.scrollTo({ top: idx * itemHeight, behavior: "smooth" });

    // 點擊也給 Apple 那種「落點感」
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => settle(), 140);
  };

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-3">
      <div className="px-1">
        <div className="text-xs font-semibold text-slate-700">{title}</div>
        <div className="text-[11px] text-slate-500">{subtitle}</div>
      </div>

      <div className="mt-2 relative">
        {/* 中央選取窗：互動時更亮 + 落點回彈 */}
        <div
          className={cx(
            "pointer-events-none absolute left-2 right-2 rounded-xl border shadow-sm transition",
            isInteracting
              ? "border-sky-300 bg-white/92 shadow-[0_0_0_1px_rgba(14,165,233,0.18),0_10px_25px_rgba(2,132,199,0.18)]"
              : "border-sky-200 bg-white/85 shadow-sm",
            bounce ? "wheel-bounce" : ""
          )}
          style={{
            top: pad,
            height: itemHeight
          }}
        />

        {/* 上下遮罩：更像 iOS */}
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
          <div style={{ height: pad }} />

          {items.map((it, idx) => (
            <button
              key={it.id}
              type="button"
              disabled={disabled}
              onClick={() => snapTo(idx)}
              className="w-full text-left px-3 rounded-xl flex items-center"
              style={{
                height: itemHeight,
                scrollSnapAlign: "center",
                transformStyle: "preserve-3d",
                willChange: "transform, filter, opacity"
              }}
              ref={(el) => {
                itemElsRef.current[idx] = el;
              }}
            >
              <div className="text-sm leading-none">{it.label}</div>
            </button>
          ))}

          <div style={{ height: pad }} />
        </div>

        {/* ✅ 這段是回彈動畫（只作用在選取窗） */}
        <style jsx>{`
          .wheel-bounce {
            animation: wheelBounce 220ms cubic-bezier(0.2, 0.9, 0.2, 1);
          }
          @keyframes wheelBounce {
            0% {
              transform: scale(1);
            }
            55% {
              transform: scale(1.04);
            }
            100% {
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
