"use client";

import { useMemo, useRef, useState } from "react";

export default function useDragRotate({ sensitivity = 0.01 } = {}) {
  const [yaw, setYaw] = useState(0);
  const downRef = useRef(false);
  const lastXRef = useRef(0);

  const bind = useMemo(() => {
    const onPointerDown = (e) => {
      downRef.current = true;
      lastXRef.current = e.clientX;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!downRef.current) return;
      const dx = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      setYaw((v) => v + dx * sensitivity);
    };
    const onPointerUp = () => {
      downRef.current = false;
    };

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
  }, [sensitivity]);

  return { yaw, setYaw, bind };
}
