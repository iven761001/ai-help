// app/components/Avatar3D.jsx
"use client";

export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0
}) {
  // 顏色
  const color =
    variant === "mint"
      ? "rgba(120, 255, 210, 0.75)"
      : variant === "purple"
      ? "rgba(210, 170, 255, 0.75)"
      : "rgba(160, 220, 255, 0.78)";

  // 情緒文字（可留著）
  const mood =
    emotion === "thinking"
      ? "思考中…"
      : emotion === "happy"
      ? "開心"
      : emotion === "sad"
      ? "難過"
      : "待機";

  // 旋轉角度（關鍵）
  const bodyYaw = previewYaw * 22; // 身體：穩定
  const headYaw = previewYaw * 55; // 頭部：明顯

  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* 整體舞台 */}
      <div
        className="relative"
        style={{
          width: "78%",
          height: "78%",
          transform: `
            perspective(900px)
            rotateX(6deg)
            rotateY(${bodyYaw}deg)
          `,
          transition: "transform 160ms ease"
        }}
      >
        {/* ===== 身體 ===== */}
        <div
          style={{
            position: "absolute",
            inset: "18% 12% 8% 12%",
            borderRadius: "42%",
            background: color,
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)"
          }}
        />

        {/* 手臂 */}
        <div
          style={{
            position: "absolute",
            width: "20%",
            height: "38%",
            left: "-6%",
            top: "36%",
            borderRadius: 999,
            background: color,
            opacity: 0.9
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "20%",
            height: "38%",
            right: "-6%",
            top: "36%",
            borderRadius: 999,
            background: color,
            opacity: 0.9
          }}
        />

        {/* 腳 */}
        <div
          style={{
            position: "absolute",
            width: "22%",
            height: "14%",
            left: "32%",
            bottom: "0%",
            borderRadius: 999,
            background: color
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "22%",
            height: "14%",
            right: "32%",
            bottom: "0%",
            borderRadius: 999,
            background: color
          }}
        />

        {/* ===== 頭部（獨立旋轉） ===== */}
        <div
          style={{
            position: "absolute",
            top: "0%",
            left: "12%",
            right: "12%",
            height: "42%",
            transform: `rotateY(${headYaw}deg)`,
            transformOrigin: "50% 65%",
            transition: "transform 120ms ease"
          }}
        >
          {/* 頭 */}
          <div
            style={{
              position: "absolute",
              inset: "18% 0 0 0",
              borderRadius: "48%",
              background: color,
              border: "1px solid rgba(255,255,255,0.25)"
            }}
          />

          {/* 耳朵 */}
          <div
            style={{
              position: "absolute",
              width: "28%",
              height: "28%",
              left: "-8%",
              top: "6%",
              borderRadius: 999,
              background: color
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "28%",
              height: "28%",
              right: "-8%",
              top: "6%",
              borderRadius: 999,
              background: color
            }}
          />

          {/* 臉 */}
          <div
            style={{
              position: "absolute",
              left: "22%",
              right: "22%",
              top: "44%",
              height: "34%",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.35)"
            }}
          />

          {/* 眼睛 */}
          <div
            style={{
              position: "absolute",
              width: 6,
              height: 6,
              background: "rgba(0,0,0,0.45)",
              borderRadius: 999,
              left: "40%",
              top: "54%"
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 6,
              height: 6,
              background: "rgba(0,0,0,0.45)",
              borderRadius: 999,
              right: "40%",
              top: "54%"
            }}
          />

          {/* 鼻子 */}
          <div
            style={{
              position: "absolute",
              width: 10,
              height: 8,
              background: "rgba(0,0,0,0.35)",
              borderRadius: "50%",
              left: "50%",
              top: "62%",
              transform: "translateX(-50%)"
            }}
          />
        </div>

        {/* 情緒文字 */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-[-34px] text-[11px] text-white/60"
          style={{ whiteSpace: "nowrap" }}
        >
          {mood}
        </div>
      </div>
    </div>
  );
}
