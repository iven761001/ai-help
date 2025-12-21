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
  haptics = true,
  tone = "dark" // "dark" | "light"
}) {
  const ref = useRef(null);
  const itemElsRef = useRef([]);
  const selectWinRef = useRef(null);

  const [isInteracting, setIsInteracting] = useState(false);
  const [bounce, setBounce] = useState(false);

  const lastEmitRef = useRef(value);
  const rafRef = useRef(0);
  const settleTimerRef = useRef(null);

  const pad = useMemo(() => Math.max(0, Math.floor((height - itemHeight) / 2)), [height, itemHeight]);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const vibrate = (ms = 8) => {
    if (!haptics) return;
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
    } catch {}
  };

  const applyIOSStyles = (scrollTop) => {
    const el = ref.current;
    if (!el) return;

    const DEG_PER_STEP = 22;
    const gearAngle = (scrollTop / itemHeight) * DEG_PER_STEP;

    if (selectWinRef.current) {
      selectWinRef.current.style.setProperty("--gearAngle", `${gearAngle}deg`);
      selectWinRef.current.style.setProperty("--gearPulse", isInteracting ? "1" : "0");
    }

    const centerY = scrollTop + height / 2;

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
      const opacity = 0.12 + 0.88 * Math.pow(fade, 1.9);
      const blurPx = (1 - fade) * 1.6;

      const rotateX = nd * ROT;
      const translateZ = Z * fade;

      node.style.opacity = String(opacity);
      node.style.filter = `blur(${blurPx.toFixed(2)}px)`;
      node.style.transform = `perspective(520px) rotateX(${rotateX.toFixed(
        2
      )}deg) translateZ(${translateZ.toFixed(1)}px) scale(${scale.toFixed(3)})`;

      // 深色：選中更亮
      if (tone === "dark") {
        node.style.color = fade > 0.82 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)";
      } else {
        node.style.color = fade > 0.82 ? "rgb(15 23 42)" : "rgb(71 85 105)";
      }
      node.style.fontWeight = fade > 0.86 ? "700" : "500";
    }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const idx = Math.max(0, items.findIndex((x) => x.id === value));
    const targetTop = idx * itemHeight;

    if (Math.abs(el.scrollTop - targetTop) > 2) el.scrollTop = targetTop;

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

        const nearest = calcNearest(el.scrollTop);
        const next = items[nearest]?.id;
        if (next && next !== value) onChange?.(next);

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
  }, [disabled, items, itemHeight, onChange, value, height, pad, isInteracting, tone]);

  const snapTo = (idx) => {
    const el = ref.current;
    if (!el) return;

    setIsInteracting(true);
    el.scrollTo({ top: idx * itemHeight, behavior: "smooth" });

    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => settle(), 140);
  };

  const shellCls =
    tone === "dark"
      ? "rounded-2xl border border-white/10 bg-black/14 px-3 py-3"
      : "rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-3";

  const titleCls = tone === "dark" ? "text-white/80" : "text-slate-700";
  const subCls = tone === "dark" ? "text-white/55" : "text-slate-500";

  const topFade =
    tone === "dark"
      ? "from-black/55 to-transparent"
      : "from-sky-50/95 to-transparent";
  const bottomFade =
    tone === "dark"
      ? "from-black/55 to-transparent"
      : "from-sky-50/95 to-transparent";

  const winBase =
    tone === "dark"
      ? "border-white/15 bg-white/10"
      : "border-sky-200 bg-white/85";

  return (
    <div className={shellCls}>
      <div className="px-1">
        <div className={cx("text-xs font-semibold", titleCls)}>{title}</div>
        <div className={cx("text-[11px]", subCls)}>{subtitle}</div>
      </div>

      <div className="mt-2 relative">
        <div
          ref={selectWinRef}
          className={cx(
            "pointer-events-none absolute left-2 right-2 rounded-xl border transition overflow-hidden",
            winBase,
            isInteracting
              ? "shadow-[0_0_0_1px_rgba(56,189,248,0.16),0_10px_25px_rgba(56,189,248,0.12)]"
              : "shadow-sm",
            bounce ? "wheel-bounce" : ""
          )}
          style={{ top: pad, height: itemHeight }}
        >
          <div className="gear-layer" />
          <div className="gear-teeth" />
          <div className="gear-sheen" />
        </div>

        <div className={cx("pointer-events-none absolute left-0 right-0 top-0 h-12 bg-gradient-to-b rounded-2xl", topFade)} />
        <div className={cx("pointer-events-none absolute left-0 right-0 bottom-0 h-12 bg-gradient-to-t rounded-2xl", bottomFade)} />

        <div
          ref={ref}
          className={cx("no-scrollbar overflow-y-auto rounded-2xl", disabled ? "opacity-60" : "opacity-100")}
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
            0% { transform: scale(1); }
            55% { transform: scale(1.04); }
            100% { transform: scale(1); }
          }

          .gear-layer {
            position: absolute;
            inset: -28px;
            background:
              radial-gradient(circle at 50% 50%, rgba(56,189,248,0.18), rgba(0,0,0,0) 58%),
              linear-gradient(180deg, rgba(56,189,248,0.10), rgba(255,255,255,0.02)),
              linear-gradient(90deg, rgba(56,189,248,0.06), rgba(255,255,255,0.01));
            transform: rotate(var(--gearAngle, 0deg));
            transform-origin: 50% 50%;
            filter: saturate(1.05);
          }

          .gear-teeth {
            position: absolute;
            inset: -36px;
            background:
              repeating-conic-gradient(
                from 0deg,
                rgba(56,189,248,0.0) 0deg,
                rgba(56,189,248,0.0) 10deg,
                rgba(56,189,248,0.18) 11deg,
                rgba(56,189,248,0.0) 12deg
              );
            mask-image: radial-gradient(circle at 50% 50%, transparent 0 36%, #000 52% 100%);
            transform: rotate(calc(var(--gearAngle, 0deg) * 1.1));
            transform-origin: 50% 50%;
            opacity: 0.75;
          }

          .gear-sheen {
            position: absolute;
            inset: -10px;
            background:
              linear-gradient(
                120deg,
                rgba(255,255,255,0) 0%,
                rgba(255,255,255,0.55) 45%,
                rgba(255,255,255,0) 70%
              );
            transform: translateX(-60%) rotate(0deg);
            opacity: calc(0.12 + var(--gearPulse, 0) * 0.28);
            animation: sheenMove 1.2s ease-in-out infinite;
            mix-blend-mode: screen;
          }

          @keyframes sheenMove {
            0% { transform: translateX(-70%) rotate(8deg); }
            55% { transform: translateX(70%) rotate(8deg); }
            100% { transform: translateX(-70%) rotate(8deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
