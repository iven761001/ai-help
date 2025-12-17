"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * TechBackground (方案A v1)
 * - 深色科技底（暗藍漸層 + vignette）
 * - 多條「曲線電路」路徑
 * - 光點沿路徑流動（不是整張背景在跑）
 * - 節點閃爍（微亮點）
 * - pointer-events: none，不影響操作
 */
export default function TechBackground({ children }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const stateRef = useRef({
    dpr: 1,
    w: 0,
    h: 0,
    t0: 0,
    paths: [],
    movers: [],
    nodes: []
  });

  // 顏色（可依你喜好調）
  const palette = useMemo(
    () => ({
      bg0: "#050b18",
      bg1: "#071733",
      trace: "rgba(20,140,255,0.22)",      // 電路線基礎亮度
      trace2: "rgba(110,210,255,0.18)",    // 第二層線
      glow: "rgba(120,220,255,0.85)",      // 光點高光
      glowSoft: "rgba(80,180,255,0.35)",   // 光點外暈
      node: "rgba(255,255,255,0.65)"
    }),
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const s = stateRef.current;

    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

    // 建立曲線路徑（cubic bezier）
    const makePath = (w, h) => {
      // 起點 / 終點 以「四周」產生，避免同方向斜線感
      const side = Math.floor(Math.random() * 4);
      const side2 = (side + 1 + Math.floor(Math.random() * 3)) % 4;

      const pickEdgePoint = (which) => {
        if (which === 0) return { x: rand(-w * 0.1, w * 1.1), y: rand(-h * 0.05, h * 0.05) }; // top
        if (which === 1) return { x: rand(w * 0.95, w * 1.05), y: rand(-h * 0.1, h * 1.1) }; // right
        if (which === 2) return { x: rand(-w * 0.1, w * 1.1), y: rand(h * 0.95, h * 1.05) }; // bottom
        return { x: rand(-w * 0.05, w * 0.05), y: rand(-h * 0.1, h * 1.1) }; // left
      };

      const p0 = pickEdgePoint(side);
      const p3 = pickEdgePoint(side2);

      // 控制點：往畫面中央偏，形成「彎折資料流」
      const cx = w * 0.5;
      const cy = h * 0.5;

      const pull = rand(0.18, 0.42); // 拉向中心的程度
      const p1 = {
        x: p0.x + (cx - p0.x) * pull + rand(-w * 0.12, w * 0.12),
        y: p0.y + (cy - p0.y) * pull + rand(-h * 0.12, h * 0.12)
      };
      const p2 = {
        x: p3.x + (cx - p3.x) * pull + rand(-w * 0.12, w * 0.12),
        y: p3.y + (cy - p3.y) * pull + rand(-h * 0.12, h * 0.12)
      };

      // 取樣點（讓光點沿著 polyline 走）
      const samples = [];
      const steps = 90 + Math.floor(Math.random() * 70);

      let len = 0;
      let prev = null;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = cubicBezier(p0, p1, p2, p3, t);
        if (prev) len += dist(prev, pt);
        samples.push({ x: pt.x, y: pt.y, s: len });
        prev = pt;
      }

      // 正規化 arc length
      const total = samples[samples.length - 1].s || 1;
      for (const it of samples) it.u = it.s / total;

      return {
        p0, p1, p2, p3,
        samples,
        total,
        width: rand(1.0, 2.2),
        alpha: rand(0.10, 0.25),
        alpha2: rand(0.08, 0.18)
      };
    };

    const regen = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const w = window.innerWidth || 390;
      const h = window.innerHeight || 800;

      s.dpr = dpr;
      s.w = w;
      s.h = h;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      // paths 數量：手機不要太多，穩 FPS
      const pathCount = clamp(Math.floor((w * h) / 90000), 8, 14);
      s.paths = Array.from({ length: pathCount }, () => makePath(w, h));

      // movers：每條路徑 1~2 顆流光
      s.movers = [];
      s.paths.forEach((p) => {
        const n = Math.random() < 0.45 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          s.movers.push({
            path: p,
            u: Math.random(),
            speed: rand(0.025, 0.06), // 每秒走多少比例
            r: rand(2.6,4.2),
            phase: rand(0, Math.PI * 2)
          });
        }
      });

      // nodes：節點閃爍
      const nodeCount = clamp(Math.floor((w * h) / 28000), 18, 36);
      s.nodes = Array.from({ length: nodeCount }, () => ({
        x: rand(0.08 * w, 0.92 * w),
        y: rand(0.12 * h, 0.88 * h),
        r: rand(1.4, 2.4),
        tw: rand(0.7, 1.6),
        t: rand(0, 10)
      }));
    };

    const draw = (ts) => {
      if (!s.t0) s.t0 = ts;
      const t = (ts - s.t0) / 1000;

      const dpr = s.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 背景底（深藍漸層）
      ctx.clearRect(0, 0, s.w, s.h);
      const g = ctx.createLinearGradient(0, 0, 0, s.h);
      g.addColorStop(0, palette.bg1);
      g.addColorStop(1, palette.bg0);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s.w, s.h);

      // vignette（四周壓暗）
      ctx.save();
      const vg = ctx.createRadialGradient(
        s.w * 0.5, s.h * 0.45, Math.min(s.w, s.h) * 0.15,
        s.w * 0.5, s.h * 0.55, Math.max(s.w, s.h) * 0.75
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, s.w, s.h);
      ctx.restore();

      // 先畫電路線（兩層）
      for (const p of s.paths) {
        // layer 1
        ctx.beginPath();
        ctx.moveTo(p.p0.x, p.p0.y);
        ctx.bezierCurveTo(p.p1.x, p.p1.y, p.p2.x, p.p2.y, p.p3.x, p.p3.y);
        ctx.lineWidth = p.width * 1.8;        // 原本太細
        ctx.strokeStyle = "rgba(80,170,255,0.28)";
        ctx.stroke();

        // layer 2（微偏移，做出複線感）
        ctx.beginPath();
        ctx.moveTo(p.p0.x + 0.6, p.p0.y - 0.4);
        ctx.bezierCurveTo(
          p.p1.x + 0.6, p.p1.y - 0.4,
          p.p2.x + 0.6, p.p2.y - 0.4,
          p.p3.x + 0.6, p.p3.y - 0.4
        );
        ctx.lineWidth = Math.max(1.2, p.width * 1.4);
        ctx.strokeStyle = "rgba(120,210,255,0.22)";
        ctx.stroke();
      }

      // 節點閃爍
      for (const n of s.nodes) {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((t + n.t) * n.tw));
        ctx.fillStyle = `rgba(255,255,255,${0.08 + tw * 0.18})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + tw * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 流光：沿路徑流動（用 samples 找最近點）
      for (const m of s.movers) {
        const p = m.path;
        const u = (m.u + t * m.speed) % 1;
        const pt = sampleAt(p.samples, u);

        // 外暈
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const rr = m.r * 1.6;
        const rg = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, rr * 6.5);
        rg.addColorStop(0, palette.glowSoft);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, rr * 6.5, 0, Math.PI * 2);
        ctx.fill();

        // 核心亮點
        ctx.fillStyle = palette.glow;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    // init & loop
    regen();
    rafRef.current = requestAnimationFrame(draw);

    // resize
    const onResize = () => regen();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [palette]);

  return (
    <div className="relative min-h-screen">
      {/* 背景 Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* 讓前景更好讀：非常淡的霧面遮罩（可調透明度） */}
      <div className="fixed inset-0 -z-10 pointer-events-none bg-black/5" />

      {/* 前景內容 */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ===== helpers ===== */

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function cubicBezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x:
      uuu * p0.x +
      3 * uu * t * p1.x +
      3 * u * tt * p2.x +
      ttt * p3.x,
    y:
      uuu * p0.y +
      3 * uu * t * p1.y +
      3 * u * tt * p2.y +
      ttt * p3.y
  };
}

function sampleAt(samples, u) {
  // samples 裡有 it.u (0..1)，用二分找
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].u < u) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const a = samples[i - 1];
  const b = samples[i];
  const span = (b.u - a.u) || 1e-6;
  const k = (u - a.u) / span;
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k
  };
}

function withAlpha(rgba, alpha) {
  // rgba 可能已含 alpha，這裡只做「乘上」的概念最簡化：
  // 直接回傳原 rgba（你想更精準再做 parser）
  // v1 先保持穩定就好
  return rgba.replace(/rgba\(([^)]+)\)/, (m, inner) => {
    const parts = inner.split(",").map((x) => x.trim());
    const r = parts[0] ?? "0";
    const g = parts[1] ?? "0";
    const b = parts[2] ?? "0";
    const a0 = parts[3] != null ? Number(parts[3]) : 1;
    const a = Math.max(0, Math.min(1, a0 * alpha));
    return `rgba(${r},${g},${b},${a})`;
  });
      }
