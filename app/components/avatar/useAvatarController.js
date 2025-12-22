
// app/components/avatar/useAvatarController.js
"use client";

import { useMemo } from "react";

export default function useAvatarController({ previewYaw = 0, emotion = "idle" }) {
  // 之後有骨架：這裡會改成 mixer + actions
  const api = useMemo(() => {
    return {
      // 給 Stage/Avatar 用的旋轉參數
      yaw: previewYaw,
      emotion,
      // 之後可以擴充：
      play: (name) => {},
      lookAt: (x, y) => {}
    };
  }, [previewYaw, emotion]);

  return api;
}
