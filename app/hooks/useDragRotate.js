"use client";

import { useRef, useState } from "react";

export default function useDragRotate({ sensitivity = 0.01 } = {}) {
  const [yaw, setYaw] = useState(0);
  const ref = useRef({ down: false, x: 0, yaw: 0 });

  const bind = {
    style: { touchAction: "none" },
    onPointerDown: (e) => {
      ref.current.down = true;
      ref.current.x = e.clientX;
      ref.current.yaw = yaw;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e) => {
      if (!ref.current.down) return;
      const dx = e.clientX - ref.current.x;
      setYaw(ref.current.yaw + dx * sensitivity);
    },
    onPointerUp: () => {
      ref.current.down = false;
    },
    onPointerCancel: () => {
      ref.current.down = false;
    }
  };

  return { yaw, setYaw, bind };
}
