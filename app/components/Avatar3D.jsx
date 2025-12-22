// app/components/Avatar3D.jsx
"use client";

/**
 * ✅ 方案A（先消掉方塊感）
 * - 身體比例：偏 1 : 1.3（視覺上更像熊）
 * - 圓角：改成百分比圓角（比固定 px 更圓潤）
 * - 增加小腳掌：減少「正方形」既視感
 * - 旋轉：用 rotateY，像模型在轉
 */
export default function Avatar3D({
  variant = "sky",
  emotion = "idle",
  previewYaw = 0
}) {
  const color =
    variant === "mint"
      ? "rgba(120, 255, 210, 0.72)"
      : variant === "purple"
      ? "rgba(210, 170, 255, 0.72)"
      : "rgba(160, 220, 255, 0.75)";

  const mood =
    emotion === "thinking"
      ? "思考中…"
      : emotion === "happy"
      ? "開心"
      : emotion === "sad"
      ? "難過"
      : "待機";

  // 旋轉角度（讓拖拉更明顯一點）
  const yawDeg = previewYaw * 34;

  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* 舞台（控制整體尺寸） */}
      <div
        className="relative"
        style={{
          width: "78%",
          height: "88%", // ✅ 整體高度提高（避免方塊）
          transformStyle: "preserve-3d",
          transform: `perspective(800px) rotateY(${yawDeg}deg)`,
          transition: "transform 160ms ease"
        }}
      >
        {/* body（改成更「長」的膠囊形） */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "78%",
            height: "92%", // ✅ 身體偏長
            transform: "translate(-50%, -50%)",
            borderRadius: "42% / 36%", // ✅ 甜甜圈式圓角（比 px 更圓）
            background: color,
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.32)",
            backdropFilter: "blur(2px)"
          }}
        />

        {/* belly highlight（讓它更立體、不那麼平） */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "54%",
            width: "46%",
            height: "52%",
            transform: "translate(-50%, -50%)",
            borderRadius: "999px",
            background:
              "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.38), rgba(255,255,255,0.06) 55%, rgba(255,255,255,0) 70%)",
            filter: "blur(0.2px)",
            opacity: 0.9
          }}
        />

        {/* ears（縮小一點，位置往外上） */}
        <div
          style={{
            position: "absolute",
            width: "22%",
            height: "22%",
            left: "16%",
            top: "2%",
            borderRadius: 999,
            background: color,
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 10px 18px rgba(0,0,0,0.22)"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "22%",
            height: "22%",
            right: "16%",
            top: "2%",
            borderRadius: 999,
            background: color,
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 10px 18px rgba(0,0,0,0.22)"
          }}
        />

        {/* arms（稍微往下、變短一點） */}
        <div
          style={{
            position: "absolute",
            width: "18%",
            height: "34%",
            left: "3%",
            top: "34%",
            borderRadius: 999,
            background: color,
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: "0 14px 24px rgba(0,0,0,0.22)"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "18%",
            height: "34%",
            right: "3%",
            top: "34%",
            borderRadius: 999,
            background: color,
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: "0 14px 24px rgba(0,0,0,0.22)"
          }}
        />

        {/* feet（✅ 關鍵：加腳掌，立刻不方） */}
        <div
          style={{
            position: "absolute",
            width: "22%",
            height: "14%",
            left: "30%",
            bottom: "3%",
            borderRadius: "999px",
            background: color,
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 16px 22px rgba(0,0,0,0.22)"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "22%",
            height: "14%",
            right: "30%",
            bottom: "3%",
            borderRadius: "999px",
            background: color,
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 16px 22px rgba(0,0,0,0.22)"
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
