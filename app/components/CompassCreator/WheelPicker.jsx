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
  haptics = true
}) {
  const ref = useRef(null);
  const itemElsRef = useRef([]);
  const selectWinRef = useRef(null);

  const [isInteracting, setIsInteracting] = useState(false);
  const [bounce, setBounce] = useState(false);

  const lastEmitRef = useRef(value);
  const rafRef = useRef(0);
  const settleTimerRef = useRef(null);

  const pad = useMemo(
    () => Math.max(0, Math.floor((height - itemHeight) / 2)),
    [height, itemHeight]
  );

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const vibrate = (ms = 8) => {
    if (!haptics) return;
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch {}
  };

  // ✅ iOS 風格 + 更彎（深色版字色也要改）
  const applyIOSStyles = (scrollTop) => {
    const el = ref.current;
    if (!el) return;

    // --- 讓中央「齒輪紋理」跟著滾動旋轉 ---
    const DEG_PER_STEP = 22;
    const gearAngle = (scrollTop / itemHeight) * DEG_PER_STEP;

    if (selectWinRef.current) {
      selectWinRef.current.style.setProperty("--gearAngle", `${gearAngle}deg`);
      selectWinRef.current.style.setProperty("--gearPulse", isInteracting ? "1" : "0");
    }

    const centerY = scrollTop + height / 2;

    const maxDist = itemHeight * 2.2; // 更彎
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
      const opacity = 0.14 + 0.86 * Math.pow(fade, 1.9);
      const blurPx = (1 - fade) * 1.65;

      const rotateX = nd * ROT;
      const translateZ = Z * fade;

      node.style.opacity = String(opacity);
      node.style.filter = `blur(${blurPx.toFixed(2)}px)`;
      node.style.transform = `perspective(560px) rotateX(${rotateX.toFixed(
        2
      )}deg) translateZ(${translateZ.toFixed(1)}px) scale(${scale.toFixed(3)})`;

      // ✅ 深色底字色：中心亮、外圍淡
      node.style.color =
        fade > 0.84 ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.55)";
      node.style.textShadow = fade > 0.84 ? "0 2px 12px rgba(56,189,248,0.28)" : "none";
      node.style.fontWeight = fade > 0.88 ? "700" : "500";
    }
  };

  // 依 value 對齊滾動位置
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

  const calcNearest = (scrollTop) => {
    const idx = Math.round(scrollTop / itemHeight);
    return clamp(idx, 0, items.length - 1);
  };

  const settle = () => {
    const el = ref.current;
    if (!el) return;

    const nearest = calcNearest(el.scrollTop);
    const next = items[nearest]?.id;

    el.scrollTo({ top: nearest * itemHeight, behavior: "smooth" });

    setBounce(true);
    window.setTimeout(() => setBounce(false), 220);

    if (next && next !== lastEmitRef.current) {
      lastEmitRef.current = next;
      onChange?.(next);
      vibrate(9);
    } else {
      vibrate(5);
    }

    setIsInteracting(false);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      if (disabled) return;

      setIsInteracting(true);

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        applyIOSStyles(el.scrollTop);

        // 即時更新選中
        const nearest = calcNearest(el.scrollTop);
        const next = items[nearest]?.id;
        if (next && next !== value) {
          onChange?.(next);
        }

        if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = window.setTimeout(() => settle(), 120);
      });
    };

    const onPointerDown = () => {
      if (disabled) return;
      setIsInteracting(true);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", onPointerDown, { passive: true });

    requestAnimationFrame(() => applyIOSStyles(el.scrollTop));

    return () => {
      cancelAnimationFrame(rafRef.current);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", onPointerDown);
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, items, itemHeight, onChange, value, height, pad, isInteracting]);

  const snapTo = (idx) => {
    const el = ref.current;
    if (!el) return;

    setIsInteracting(true);
    el.scrollTo({ top: idx * itemHeight, behavior: "smooth" });

    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => settle(), 140);
  };

  return (
    // ✅ 深色晶片玻璃外殼（配合你已經在 globals.css 做的玻璃樣式）
    <div className="glass-wheel rounded-2xl px-3 py-3">
      <div className="px-1">
        <div className="text-xs font-semibold text-white/85">{title}</div>
        <div className="text-[11px] text-white/50">{subtitle}</div>
      </div>

      <div className="mt-2 relative">
        {/* 中央「齒輪視窗」：深色玻璃 + 電路光 */}
        <div
          ref={selectWinRef}
          className={cx(
            "pointer-events-none absolute left-2 right-2 rounded-xl transition",
            bounce ? "wheel-bounce" : ""
          )}
          style={{
            top: pad,
            height: itemHeight,
            overflow: "hidden",
            border: "1px solid rgba(56,189,248,0.35)",
            background: "rgba(2,6,23,0.58)",
            boxShadow:
              "0 0 0 1px rgba(56,189,248,0.12), 0 18px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)"
          }}
        >
          <div className="gear-layer" />
          <div className="gear-teeth" />
          <div className="gear-sheen" />
          <div className="circuit-scan" />
        </div>

        {/* 上下遮罩：深色版 */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-12 bg-gradient-to-b from-slate-950/80 to-transparent rounded-2xl" />
        <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/80 to-transparent rounded-2xl" />

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

          /* === 齒輪視覺（深色晶片版） === */
          .gear-layer {
            position: absolute;
            inset: -28px;
            background:
              radial-gradient(circle at 50% 50%, rgba(56,189,248,0.18), rgba(255,255,255,0) 58%),
              linear-gradient(180deg, rgba(56,189,248,0.08), rgba(2,6,23,0.0)),
              linear-gradient(90deg, rgba(56,189,248,0.07), rgba(2,6,23,0.0));
            transform: rotate(var(--gearAngle, 0deg));
            transform-origin: 50% 50%;
            filter: saturate(1.1);
            opacity: 0.95;
          }

          .gear-teeth {
            position: absolute;
            inset: -36px;
            background:
              repeating-conic-gradient(
                from 0deg,
                rgba(56,189,248,0.0) 0deg,
                rgba(56,189,248,0.0) 10deg,
                rgba(56,189,248,0.22) 11deg,
                rgba(56,189,248,0.0) 12deg
              );
            mask-image: radial-gradient(circle at 50% 50%, transparent 0 36%, #000 52% 100%);
            transform: rotate(calc(var(--gearAngle, 0deg) * 1.12));
            transform-origin: 50% 50%;
            opacity: 0.65;
          }

          .gear-sheen {
            position: absolute;
            inset: -10px;
            background:
              linear-gradient(
                120deg,
                rgba(255,255,255,0) 0%,
                rgba(255,255,255,0.45) 45%,
                rgba(255,255,255,0) 70%
              );
            transform: translateX(-60%) rotate(0deg);
            opacity: calc(0.12 + var(--gearPulse, 0) * 0.26);
            animation: sheenMove 1.2s ease-in-out infinite;
            mix-blend-mode: screen;
          }

          @keyframes sheenMove {
            0% {
              transform: translateX(-70%) rotate(8deg);
            }
            55% {
              transform: translateX(70%) rotate(8deg);
            }
            100% {
              transform: translateX(-70%) rotate(8deg);
            }
          }

          /* 晶片掃描線：讓選取窗有「電路在跑」的感覺 */
          .circuit-scan {
            position: absolute;
            inset: 0;
            background:
              repeating-linear-gradient(
                90deg,
                rgba(56,189,248,0.0) 0px,
                rgba(56,189,248,0.0) 22px,
                rgba(56,189,248,0.10) 23px,
                rgba(56,189,248,0.0) 26px
              ),
              repeating-linear-gradient(
                0deg,
                rgba(56,189,248,0.0) 0px,
                rgba(56,189,248,0.0) 18px,
                rgba(56,189,248,0.08) 19px,
                rgba(56,189,248,0.0) 22px
              );
            opacity: 0.25;
            transform: translateX(-20%);
            animation: scanMove 1.6s linear infinite;
            mix-blend-mode: screen;
          }

          @keyframes scanMove {
            0% {
              transform: translateX(-24%);
            }
            100% {
              transform: translateX(24%);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
