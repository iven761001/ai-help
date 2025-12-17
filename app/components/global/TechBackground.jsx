"use client";

import { useEffect, useRef } from "react";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function TechBackground({ children }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const stateRef = useRef({
    w: 0,
    h: 0,
    dpr: 1,
    t0: 0,
    last: 0,
    reduced: false,
    paused: false,
    // generated
    chips: [],
    traces: [],
    pulses: []
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const mq =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    const setReduced = () => {
      stateRef.current.reduced = !!mq?.matches;
    };
    setReduced();
    mq?.addEventListener?.("change", setReduced);

    const onVis = () => {
      stateRef.current.paused = document.hidden;
      if (!document.hidden) {
        stateRef.current.last = performance.now();
        loop(performance.now());
      }
    };
    document.addEventListener("visibilitychange", onVis);

    const resize = () => {
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2); // cap 2 to keep mobile smooth
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);

      stateRef.current.w = w;
      stateRef.current.h = h;
      stateRef.current.dpr = dpr;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      regen();
      draw(performance.now()); // draw once immediately
    };

    const rand = (a, b) => a + Math.random() * (b - a);

    const regen = () => {
      const s = stateRef.current;
      const w = s.w;
      const h = s.h;

      // chips
      const chipCount = clamp(Math.floor((w * h) / 65000), 10, 20);
      const chips = Array.from({ length: chipCount }, () => {
        const cw = rand(80, 150);
        const ch = rand(55, 110);
        const x = rand(40, w - cw - 40);
        const y = rand(40, h - ch - 40);
        return {
          x,
          y,
          w: cw,
          h: ch,
          r: rand(14, 22),
          // little pins density
          pins: Math.floor(rand(10, 18))
        };
      });

      // traces: poly-lines built from grid-ish steps
      const grid = 28;
      const traceCount = clamp(Math.floor((w * h) / 38000), 22, 46);
      const traces = [];

      const snap = (v) => Math.round(v / grid) * grid;

      for (let i = 0; i < traceCount; i++) {
        const startX = snap(rand(0.08 * w, 0.92 * w));
        const startY = snap(rand(0.10 * h, 0.90 * h));
        const steps = Math.floor(rand(6, 11));

        const pts = [{ x: startX, y: startY }];
        let x = startX;
        let y = startY;

        for (let k = 0; k < steps; k++) {
          const dir = Math.floor(rand(0, 4)); // 0R 1L 2D 3U
          const len = snap(rand(80, 220));

          if (dir === 0) x += len;
          if (dir === 1) x -= len;
          if (dir === 2) y += len;
          if (dir === 3) y -= len;

          x = clamp(x, 20, w - 20);
          y = clamp(y, 20, h - 20);

          pts.push({ x, y });

          // sometimes add a small branch point
          if (Math.random() < 0.18) {
            const bx = clamp(x + snap(rand(-140, 140)), 20, w - 20);
            const by = clamp(y + snap(rand(-140, 140)), 20, h - 20);
            traces.push({
              pts: [{ x, y }, { x: bx, y: by }],
              width: rand(1.0, 1.8),
              glow: rand(0.12, 0.22)
            });
          }
        }

        traces.push({
          pts,
          width: rand(1.1, 2.2),
          glow: rand(0.14, 0.26)
        });
      }

      // pulses: moving dots along trace segments
      const pulses = [];
      const pulseCount = clamp(Math.floor(traces.length * 0.65), 14, 32);
      for (let i = 0; i < pulseCount; i++) {
        const tr = traces[Math.floor(Math.random() * traces.length)];
        pulses.push({
          traceIndex: traces.indexOf(tr),
          seg: 0,
          u: Math.random(), // progress within segment
          speed: rand(0.18, 0.45),
          size: rand(1.4, 2.4),
          bright: rand(0.55, 0.9)
        });
      }

      s.chips = chips;
      s.traces = traces;
      s.pulses = pulses;
    };

    const roundedRect = (c, x, y, w, h, r) => {
      const rr = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(x + rr, y);
      c.arcTo(x + w, y, x + w, y + h, rr);
      c.arcTo(x + w, y + h, x, y + h, rr);
      c.arcTo(x, y + h, x, y, rr);
      c.arcTo(x, y, x + w, y, rr);
      c.closePath();
    };

    const drawGrid = () => {
      const s = stateRef.current;
      const w = s.w;
      const h = s.h;

      // subtle PCB grid
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = "rgba(120,200,255,0.18)";
      ctx.lineWidth = 1;

      const step = 42;
      for (let x = 0; x <= w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawChips = () => {
      const s = stateRef.current;

      for (const chip of s.chips) {
        // chip body
        ctx.save();
        const grad = ctx.createLinearGradient(chip.x, chip.y, chip.x + chip.w, chip.y + chip.h);
        grad.addColorStop(0, "rgba(10,20,35,0.72)");
        grad.addColorStop(1, "rgba(18,35,55,0.78)");

        roundedRect(ctx, chip.x, chip.y, chip.w, chip.h, chip.r);
        ctx.fillStyle = grad;
        ctx.fill();

        // chip border glow
        ctx.strokeStyle = "rgba(120,200,255,0.22)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // pins
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = "rgba(140,220,255,0.55)";
        const p = chip.pins;
        for (let i = 0; i < p; i++) {
          const t = (i + 0.5) / p;
          const px = chip.x + t * chip.w;
          ctx.fillRect(px - 1, chip.y - 4, 2, 3);
          ctx.fillRect(px - 1, chip.y + chip.h + 1, 2, 3);
        }
        for (let i = 0; i < Math.floor(p * 0.7); i++) {
          const t = (i + 0.5) / Math.floor(p * 0.7);
          const py = chip.y + t * chip.h;
          ctx.fillRect(chip.x - 4, py - 1, 3, 2);
          ctx.fillRect(chip.x + chip.w + 1, py - 1, 3, 2);
        }

        ctx.restore();
      }
    };

    const drawTraces = () => {
      const s = stateRef.current;

      // base traces
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const tr of s.traces) {
        ctx.beginPath();
        ctx.moveTo(tr.pts[0].x, tr.pts[0].y);
        for (let i = 1; i < tr.pts.length; i++) {
          ctx.lineTo(tr.pts[i].x, tr.pts[i].y);
        }

        // base line
        ctx.strokeStyle = "rgba(120,210,255,0.18)";
        ctx.lineWidth = tr.width;
        ctx.stroke();

        // glow line
        ctx.strokeStyle = `rgba(90,190,255,${tr.glow})`;
        ctx.lineWidth = tr.width + 1.6;
        ctx.stroke();
      }

      ctx.restore();
    };

    const pointOnTrace = (trace, seg, u) => {
      const a = trace.pts[seg];
      const b = trace.pts[Math.min(seg + 1, trace.pts.length - 1)];
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    };

    const drawPulses = (dt) => {
      const s = stateRef.current;

      ctx.save();
      for (const p of s.pulses) {
        const tr = s.traces[p.traceIndex];
        if (!tr || tr.pts.length < 2) continue;

        // advance
        p.u += p.speed * dt;
        while (p.u >= 1) {
          p.u -= 1;
          p.seg += 1;
          if (p.seg >= tr.pts.length - 1) {
            p.seg = 0;
            p.u = Math.random() * 0.2;
          }
        }

        const pos = pointOnTrace(tr, p.seg, p.u);

        // glow dot
        const r = p.size;
        const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r * 6);
        g.addColorStop(0, `rgba(110,220,255,${0.85 * p.bright})`);
        g.addColorStop(0.35, `rgba(80,190,255,${0.28 * p.bright})`);
        g.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(170,240,255,${0.7 * p.bright})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawVignette = () => {
      const s = stateRef.current;
      const w = s.w;
      const h = s.h;

      ctx.save();
      const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, Math.max(w, h));
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    };

    const drawBase = () => {
      const s = stateRef.current;
      const w = s.w;
      const h = s.h;

      // deep PCB background
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, "#020816");
      bg.addColorStop(0.55, "#040f22");
      bg.addColorStop(1, "#020610");

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // subtle noise speckles
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = "rgba(160,220,255,0.35)";
      const specks = 140;
      for (let i = 0; i < specks; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.restore();
    };

    const draw = (now) => {
      const s = stateRef.current;
      const w = s.w;
      const h = s.h;

      ctx.clearRect(0, 0, w, h);
      drawBase();
      drawGrid();
      drawChips();
      drawTraces();
      drawVignette();

      // pulses only if not reduced-motion
      if (!s.reduced) {
        const dt = Math.min(0.05, Math.max(0.001, (now - s.last) / 1000));
        drawPulses(dt);
      }
    };

    const loop = (now) => {
      if (stateRef.current.paused) return;
      stateRef.current.last = now;
      draw(now);
      rafRef.current = requestAnimationFrame(loop);
    };

    resize();
    stateRef.current.last = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      mq?.removeEventListener?.("change", setReduced);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          pointerEvents: "none"
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
