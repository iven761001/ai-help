// app/hooks/useDragRotate.js
"use client";

import { useMemo, useRef, useState } from "react";

/**
 * 回傳：
 * - yaw: radians（弧度）
 * - bind: props 物件（可直接 {...bind}）
 *
 * 特色：
 * - 手機/桌機都可用（pointer events）
 * - 不會被頁面滑動吃掉（搭配 touchAction: "none"）
 * - 會 setPointerCapture，手指移出也能續轉
 */
export default function useDragRotate({ sensitivity = 0.01 } = {}) {
  const [yaw, setYaw] = useState(0);

  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  const bind = useMemo(() => {
    const onPointerDown = (e) => {
      draggingRef.current = true;
      lastXRef.current = e.clientX ?? 0;

      // 讓後續 move 都能吃到
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {}

      e.preventDefault?.();
      e.stopPropagation?.();
    };

    const onPointerMove = (e) => {
      if (!draggingRef.current) return;

      const x = e.clientX ?? 0;
      const dx = x - lastXRef.current;
      lastXRef.current = x;

      setYaw((prev) => prev + dx * sensitivity);

      e.preventDefault?.();
      e.stopPropagation?.();
    };

    const end = (e) => {
      draggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {}
      e.preventDefault?.();
      e.stopPropagation?.();
    };

    return {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      // 防止 iOS/Android 長按選取、拖圖
      onContextMenu: (e) => e.preventDefault?.()
    };
  }, [sensitivity]);

  return { yaw, bind };
}
