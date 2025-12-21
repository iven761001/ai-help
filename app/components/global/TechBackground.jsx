"use client";

import { useEffect, useMemo, useRef } from "react";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function TechBackground({ children }) {
  const canvasRef = useRef(null);

  const cfg = useMemo(
    () => ({
      // 深色玻璃底
      baseA: "#05070c",
      baseB: "#050a16",
      // 電路冷光
      glow: "rgba(90, 200, 255, 0.22)",
      glow2: "rgba(140, 110, 255, 0.12)"
    }),
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let raf = 0;
    let t0 = performance.now();

    const state = {
      w: 0,
      h: 0,
      chips: [],
      traces: []
    };

    const rand = (a, b) => a + Math.random() * (b - a);

    const resize = () => {
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      canvas.width = Math.floor(w * devicePixelRatio);
      canvas.height = Math.floor(h * devicePixelRatio);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      state.w = w;
      state.h = h;

      // chips：像晶片區塊
      const chipCount = clamp(Math.floor((w * h) / 90000), 8, 16);
      state.chips = Array.from({ length: chipCount }, () => {
        const cw = rand(120, 220);
        const ch = rand(80, 160);
        return {
          x: rand(20, w - cw - 20),
          y: rand(30, h - ch - 120),
          w: cw,
          h: ch,
          r: rand(14, 24),
          phase: rand(0, Math.PI * 2)
        };
      });

      // traces：電路線
      const traceCount = clamp(Math.floor((w * h) / 22000), 35, 90);
      state.traces = Array.from({ length: traceCount }, () => {
        const x0 = rand(0, w);
        const y0 = rand(0, h);
        const dir = Math.random() > 0.5 ? "h" : "v";
        const len = rand(80, 260);
        const speed = rand(10, 40);
        return { x0, y0, dir, len, speed, p: rand(0, 1) };
      });
    };

    const roundRect = (x, y, w, h, r) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    };

    const draw = (now) => {
      const w = state.w;
      const h = state.h;
      const dt = (now - t0) / 1000;
      t0 = now;

      // base gradient
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, cfg.baseA);
      g.addColorStop(1, cfg.baseB);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // chips
      for (const c of state.chips) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 1200 + c.phase);
        ctx.save();
        roundRect(c.x, c.y, c.w, c.h, c.r);
        ctx.fillStyle = `rgba(255,255,255,${0.03 + 0.02 * pulse})`;
        ctx.fill();

        ctx.strokeStyle = `rgba(90,200,255,${0.10 + 0.06 * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // inner grid
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        for (let i = 1; i <= 4; i++) {
          const xx = c.x + (c.w * i) / 5;
          ctx.beginPath();
          ctx.moveTo(xx, c.y + 10);
          ctx.lineTo(xx, c.y + c.h - 10);
          ctx.stroke();
        }
        for (let i = 1; i <= 3; i++) {
          const yy = c.y + (c.h * i) / 4;
          ctx.beginPath();
          ctx.moveTo(c.x + 10, yy);
          ctx.lineTo(c.x + c.w - 10, yy);
          ctx.stroke();
        }
        ctx.restore();
      }

      // traces (moving light)
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const tr of state.traces) {
        tr.p += (dt * tr.speed) / 500;
        if (tr.p > 1) tr.p -= 1;

        const x1 = tr.dir === "h" ? tr.x0 + tr.len : tr.x0;
        const y1 = tr.dir === "v" ? tr.y0 + tr.len : tr.y0;

        // faint base trace
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tr.x0, tr.y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        // bright moving head
        const hx = tr.dir === "h" ? tr.x0 + tr.len * tr.p : tr.x0;
        const hy = tr.dir === "v" ? tr.y0 + tr.len * tr.p : tr.y0;

        const rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 18);
        rg.addColorStop(0, cfg.glow);
        rg.addColorStop(0.7, "rgba(90,200,255,0.0)");
        ctx.fillStyle = rg;
        ctx.fillRect(hx - 18, hy - 18, 36, 36);

        ctx.strokeStyle = "rgba(90,200,255,0.26)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tr.x0, tr.y0);
        ctx.lineTo(hx, hy);
        ctx.stroke();
      }

      // subtle purple haze
      const haze = ctx.createRadialGradient(w * 0.7, h * 0.25, 0, w * 0.7, h * 0.25, w * 0.6);
      haze.addColorStop(0, cfg.glow2);
      haze.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [cfg]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 -z-10"
        style={{ display: "block" }}
      />
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
