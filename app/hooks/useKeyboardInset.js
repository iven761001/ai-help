"use client";

import { useEffect, useState } from "react";

/**
 * 回傳「鍵盤把視窗吃掉多少高度(px)」
 * - iOS Safari / Android Chrome 都適用
 * - 沒鍵盤時回 0
 */
export default function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // 視窗可視高度變小 => 通常代表鍵盤出現
      const heightDiff = window.innerHeight - vv.height;

      // 有些瀏覽器會有小抖動，做個下限
      const next = Math.max(0, Math.round(heightDiff));
      setInset(next);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return inset;
}
