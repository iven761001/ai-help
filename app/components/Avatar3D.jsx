// app/components/Avatar3D.jsx
"use client";

/**
 * ✅ 方案A-2（熊感版，不用 three）
 * - 頭身分離：頭 + 身體（熊的輪廓會立刻出來）
 * - 口鼻（muzzle）+ 小鼻子 + 眼睛：一秒變熊
 * - 耳朵「長在頭上」：位置往上、稍微往外
 * - 手腳改成更自然的圓短比例
 */
export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0
}) {
  const base =
    variant === "mint"
      ? "rgba(120, 255, 210, 0.72)"
      : variant === "purple"
      ? "rgba(210, 170, 255, 0.72)"
      : "rgba(160, 220, 255, 0.75)";

  // 臉部用更亮一點的顏色（熊比較可愛）
  const faceTint =
    variant === "mint"
      ? "rgba(175, 255, 232, 0.75)"
      : variant === "purple"
      ? "rgba(235, 210, 255, 0.70)"
      : "rgba(210, 240, 255, 0.72)";

  const mood =
    emotion === "thinking"
      ? "思考中…"
      : emotion === "happy"
      ? "開心"
      : emotion === "sad"
      ? "難過"
      : "待機";

  const yawDeg = previewYaw * 34;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="relative"
        style={{
          width: "82%",
          height: "92%",
          transformStyle: "preserve-3d",
          transform: `perspective(900px) rotateY(${yawDeg}deg)`,
          transition: "transform 160ms ease"
        }}
      >
        {/* ===== 身體 ===== */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "56%",
            width: "74%",
            height: "62%",
            transform: "translate(-50%, -50%)",
            borderRadius: "46% / 34%",
            background: base,
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.30)",
            backdropFilter: "blur(2px)"
          }}
        />

        {/* 肚肚高光 */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "60%",
            width: "44%",
            height: "36%",
            transform: "translate(-50%, -50%)",
            borderRadius: 999,
            background:
              "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.40), rgba(255,255,255,0.08) 55%, rgba(255,255,255,0) 72%)",
            opacity: 0.9
          }}
        />

        {/* ===== 頭部（熊感關鍵） ===== */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "26%",
            width: "70%",
            height: "44%",
            transform: "translate(-50%, -50%)",
            borderRadius: "46% / 44%",
            background: base,
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: "0 14px 28px rgba(0,0,0,0.26)"
          }}
        />

        {/* ===== 耳朵（掛在頭上） ===== */}
        <div
          style={{
            position: "absolute",
            width: "22%",
            height: "22%",
            left: "17%",
            top: "7%",
            borderRadius: 999,
            background: base,
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 10px 18px rgba(0,0,0,0.20)"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "22%",
            height: "22%",
            right: "17%",
            top: "7%",
            borderRadius: 999,
            background: base,
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 10px 18px rgba(0,0,0,0.20)"
          }}
        />

        {/* ===== 口鼻（muzzle） ===== */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "34%",
            width: "46%",
            height: "24%",
            transform: "translate(-50%, -50%)",
            borderRadius: "999px",
            background: faceTint,
            border: "1px solid rgba(255,255,255,0.20)",
            boxShadow: "0 10px 18px rgba(0,0,0,0.16)"
          }}
        />

        {/* 鼻子 */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "32.5%",
            width: "10%",
            height: "8%",
            transform: "translate(-50%, -50%)",
            borderRadius: "999px",
            background: "rgba(10, 18, 28, 0.45)"
          }}
        />

        {/* 眼睛（小點點就很像熊） */}
        <div
          style={{
            position: "absolute",
            left: "41%",
            top: "26%",
            width: 7,
            height: 7,
            borderRadius: 999,
            background: "rgba(10, 18, 28, 0.45)"
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "41%",
            top: "26%",
            width: 7,
            height: 7,
            borderRadius: 999,
            background: "rgba(10, 18, 28, 0.45)"
          }}
        />

        {/* 腮紅（很加分） */}
        <div
          style={{
            position: "absolute",
            left: "34%",
            top: "30%",
            width: "12%",
            height: "7%",
            borderRadius: 999,
            background: "rgba(255, 255, 255, 0.18)",
            filter: "blur(0.2px)"
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "34%",
            top: "30%",
            width: "12%",
            height: "7%",
            borderRadius: 999,
            background: "rgba(255, 255, 255, 0.18)",
            filter: "blur(0.2px)"
          }}
        />

        {/* ===== 手（短圓胖才像熊） ===== */}
        <div
          style={{
            position: "absolute",
            width: "16%",
            height: "24%",
            left: "8%",
            top: "54%",
            borderRadius: 999,
            background: base,
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: "0 14px 22px rgba(0,0,0,0.18)"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "16%",
            height: "24%",
            right: "8%",
            top: "54%",
            borderRadius: 999,
            background: base,
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: "0 14px 22px rgba(0,0,0,0.18)"
          }}
        />

        {/* ===== 腳（更像熊掌） ===== */}
        <div
          style={{
            position: "absolute",
            width: "20%",
            height: "12%",
            left: "34%",
            bottom: "6%",
            borderRadius: 999,
            background: base,
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 16px 22px rgba(0,0,0,0.20)"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "20%",
            height: "12%",
            right: "34%",
            bottom: "6%",
            borderRadius: 999,
            background: base,
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 16px 22px rgba(0,0,0,0.20)"
          }}
        />

        {/* mood */}
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
