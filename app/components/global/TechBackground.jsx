"use client";

import { useEffect, useRef } from "react";

export default function TechBackground({ children }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // 鍵盤高度（給 Chat 用）
    const applyKB = () => {
      try {
        const vv = window.visualViewport;
        const kb = vv ? Math.max(0, window.innerHeight - vv.height) : 0;
        root.style.setProperty("--kb", `${kb}px`);
      } catch {
        root.style.setProperty("--kb", "0px");
      }
    };

    applyKB();
    window.addEventListener("resize", applyKB);
    window.visualViewport?.addEventListener("resize", applyKB);
    window.visualViewport?.addEventListener("scroll", applyKB);

    return () => {
      window.removeEventListener("resize", applyKB);
      window.visualViewport?.removeEventListener("resize", applyKB);
      window.visualViewport?.removeEventListener("scroll", applyKB);
    };
  }, []);

  return (
    <div ref={ref} className="tech-bg-root">
      <div className="tech-bg-canvas" aria-hidden="true">
        <div className="chip-grid" />
        <div className="chip-traces" />
        <div className="chip-glowflow" />
        <div className="vignette" />
      </div>

      <div className="tech-bg-content">{children}</div>
    </div>
  );
}
