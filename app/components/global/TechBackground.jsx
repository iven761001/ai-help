// app/components/global/TechBackground.jsx
"use client";

import { useEffect, useRef } from "react";

export default function TechBackground({ children }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    const state = { w: 0, h: 0, t: 0, nodes: [], lines: [] };
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      state.w = w;
      state.h = h;

      const nodeCount = clamp(Math.floor((w * h) / 28000), 18, 36);
      state.nodes = Array.from({ length: nodeCount }, () => ({
        x: rand(0.08 * w, 0.92 * w),
        y: rand(0.12 * h, 0.88 * h),
        r: rand(1.2, 2.6),
        a: rand(0.12, 0.6),
        s: rand(0.002, 0.006)
      }));

      const lineCount = clamp(Math.floor((w * h) / 22000), 24, 54);
      state.lines = Array.from({ length: lineCount }, () => {
        const horizontal = Math.random() > 0.48;
        const x1 = rand(-0.1 * w, 1.1 * w);
        const y1 = rand(-0.1 * h, 1.1 * h);
        const len = rand(120, 420);
        const x2 = horizontal ? x1 + (Math.random() > 0.5 ? len : -len) : x1;
        const y2 = horizontal ? y1 : y1 + (Math.random() > 0.5 ? len : -len);

        return {
          x1, y1, x2, y2,
          w: rand(1, 2),
          a: rand(0.05, 0.22),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.006, 0.012)
        };
      });
    };

    const drawGrid = () => {
      const { w, h } = state;
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "rgba(80, 160, 220, 0.25)";
      ctx.lineWidth = 1;

      const step = 54;
      for (let x = 0; x <= w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    };

    const draw = () => {
      const { w, h } = state;
      state.t += 1;

      ctx.clearRect(0, 0, w, h);

      const g = ctx.createRadialGradient(
        w * 0.55, h * 0.25, 40,
        w * 0.5, h * 0.55, Math.max(w, h)
      );
      g.addColorStop(0, "rgba(10, 20, 35, 1)");
      g.addColorStop(0.35, "rgba(6, 14, 28, 1)");
      g.addColorStop(1, "rgba(0, 0, 0, 1)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      drawGrid();

      for (const ln of state.lines) {
        const pulse = (Math.sin(ln.phase + state.t * ln.speed) + 1) / 2;

        ctx.save();
        ctx.globalAlpha = ln.a;
        ctx.strokeStyle = "rgba(130, 200, 255, 1)";
        ctx.lineWidth = ln.w;
        ctx.beginPath();
        ctx.moveTo(ln.x1, ln.y1);
        ctx.lineTo(ln.x2, ln.y2);
        ctx.stroke();

        ctx.globalAlpha = 0.22 + 0.35 * pulse;
        ctx.fillStyle = "rgba(120, 220, 255, 1)";
        const px = ln.x1 + (ln.x2 - ln.x1) * pulse;
        const py = ln.y1 + (ln.y2 - ln.y1) * pulse;
        ctx.beginPath();
        ctx.arc(px, py, 1.6 + 1.8 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (const n of state.nodes) {
        const tw = (Math.sin(state.t * n.s * 60) + 1) / 2;
        ctx.save();
        ctx.globalAlpha = n.a + tw * 0.35;
        ctx.fillStyle = "rgba(170, 240, 255, 1)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + tw * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0">
      {/* 背景 Canvas（永遠在最底層、也不吃點擊） */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ pointerEvents: "none" }}
      />

      {/* 內容（永遠在最上層） */}
      <div className="absolute inset-0 z-10">{children}</div>
    </div>
  );
}
