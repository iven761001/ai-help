// app/components/Avatar3D.jsx
"use client";

/**
 * 這是一個「保底可跑」版本（不依賴 three）
 * 如果你已經有自己的 Three.js Avatar3D，留你的也可以。
 */
export default function Avatar3D({ variant = "sky", emotion = "idle", previewYaw = 0 }) {
  const color =
    variant === "mint" ? "rgba(120, 255, 210, 0.75)" :
    variant === "purple" ? "rgba(210, 170, 255, 0.75)" :
    "rgba(160, 220, 255, 0.78)";

  const mood =
    emotion === "thinking" ? "思考中…" :
    emotion === "happy" ? "開心" :
    emotion === "sad" ? "難過" :
    "待機";

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="relative"
        style={{
          width: "78%",
          height: "78%",
          transform: `rotate(${previewYaw * 20}deg)`,
          transition: "transform 180ms ease"
        }}
      >
        {/* body */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 28,
            background: color,
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            backdropFilter: "blur(2px)"
          }}
        />
        {/* ears */}
        <div
          style={{
            position: "absolute",
            width: "26%",
            height: "26%",
            left: "10%",
            top: "-6%",
            borderRadius: 999,
            background: color,
            border: "1px solid rgba(255,255,255,0.18)"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "26%",
            height: "26%",
            right: "10%",
            top: "-6%",
            borderRadius: 999,
            background: color,
            border: "1px solid rgba(255,255,255,0.18)"
          }}
        />
        {/* arms */}
        <div
          style={{
            position: "absolute",
            width: "20%",
            height: "38%",
            left: "-8%",
            top: "22%",
            borderRadius: 999,
            background: color,
            border: "1px solid rgba(255,255,255,0.16)"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "20%",
            height: "38%",
            right: "-8%",
            top: "22%",
            borderRadius: 999,
            background: color,
            border: "1px solid rgba(255,255,255,0.16)"
          }}
        />

        {/* face label */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-[-34px] text-[11px] text-white/65"
          style={{ whiteSpace: "nowrap" }}
        >
          {mood}
        </div>
      </div>
    </div>
  );
}
