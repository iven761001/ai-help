"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function mod(n, m) {
  return ((n % m) + m) % m;
}
function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}
function angleDegFromPoint(px, py, cx0, cy0) {
  // 0° 在右邊，90° 在下方，180° 在左邊，270° 在上方
  const rad = Math.atan2(py - cy0, px - cx0);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}
function inDonutBand(px, py, cx0, cy0, radius, band) {
  const d = dist(px, py, cx0, cy0);
  return d >= radius - band && d <= radius + band;
}

/**
 * 真·同心圓羅盤（穩定版）
 * - 三圈獨立沿圓周旋轉（用 atan2 算角度，手感像真的在轉盤）
 * - 拖拉中不吸附；放開才吸附到最近選項
 * - 不用 pointerleave 結束拖拉（避免你「拉一下就被吸回去」）
 */
export default function CompassCreator({ value, onChange, onDone, disabled }) {
  const colors = useMemo(
    () => [
      { id: "sky", label: "天空藍 · 穩重專業" },
      { id: "mint", label: "薄荷綠 · 清爽潔淨" },
      { id: "purple", label: "紫色 · 科技感" }
    ],
    []
  );

  const voices = useMemo(
    () => [
      { id: "warm", label: "溫暖親切" },
      { id: "calm", label: "冷靜條理" },
      { id: "energetic", label: "活潑有精神" }
    ],
    []
  );

  const namePresets = useMemo(
    () => [
      { id: "nm", label: "小護膜" },
      { id: "am", label: "阿膜" },
      { id: "bs", label: "浴室管家" },
      { id: "kf", label: "廚房管家" },
      { id: "gl", label: "玻璃小幫手" },
      { id: "zd", label: "自訂" }
    ],
    []
  );

  const stageRef = useRef(null);

  const [localName, setLocalName] = useState(value?.nickname || "");
  const [namePick, setNamePick] = useState("zd");

  useEffect(() => {
    setLocalName(value?.nickname || "");
  }, [value?.nickname]);

  useEffect(() => {
    const hit = namePresets.find((p) => p.label === (value?.nickname || ""));
    setNamePick(hit ? hit.id : "zd");
  }, [value?.nickname, namePresets]);

  const pickColor = (id) => onChange?.({ ...value, color: id, avatar: id });
  const pickVoice = (id) => onChange?.({ ...value, voice: id });
  const commitName = (name) => onChange?.({ ...value, nickname: name });

  const onPickPresetName = (presetId) => {
    setNamePick(presetId);
    const p = namePresets.find((x) => x.id === presetId);
    if (!p) return;
    if (p.id === "zd") return;
    setLocalName(p.label);
    commitName(p.label);
  };

  const canDone =
    !!value?.email &&
    !!(value?.color || value?.avatar) &&
    !!value?.voice &&
    !!localName.trim();

  return (
    <div className="fixed left-0 right-0 bottom-0 z-[60] pointer-events-none">
      <div
        className="pointer-events-auto mx-auto w-full max-w-4xl px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <div className="rounded-[28px] border border-sky-200/60 bg-white/75 backdrop-blur overflow-hidden shadow-[0_-10px_40px_rgba(2,132,199,0.15)]">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">
                  高科技羅盤 · 創角設定
                </div>
                <div className="text-[11px] text-slate-500">
                  三圈沿圓周旋轉（左右拖拉），互不干擾，放開才會吸附到最近選項
                </div>
              </div>

              <button
                disabled={disabled || !canDone}
                onClick={() => {
                  commitName(localName.trim());
                  onDone?.();
                }}
                className={cx(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
                  disabled || !canDone
                    ? "bg-slate-200 text-slate-500"
                    : "bg-sky-600 text-white hover:bg-sky-700"
                )}
              >
                完成
              </button>
            </div>
          </div>

          <div className="relative px-3 pb-4">
            <div className="relative w-full rounded-2xl border border-sky-100 bg-sky-50/60 overflow-hidden">
              {/* 舞台：高度夠、且圓心放在舞台底部附近，三圈都能完整看得到 */}
              <div ref={stageRef} className="relative h-[360px] sm:h-[420px]">
                {/* 中央準星 */}
                <div className="absolute left-1/2 top-[72%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="h-2 w-2 rounded-full bg-sky-600 shadow-[0_0_0_6px_rgba(2,132,199,0.15)]" />
                </div>

                {/* 三圈：半徑拉開，不會擠在一起 */}
                <WheelRing
                  stageRef={stageRef}
                  z={30}
                  title="① 顏色"
                  subtitle="選核心色（也會套用到冷光線條）"
                  items={colors}
                  valueId={value?.color || value?.avatar || "sky"}
                  onChangeId={pickColor}
                  disabled={disabled}
                  centerTopPct={72}
                  radius={92}
                  band={26}
                  arcStart={210}
                  arcEnd={330}
                />

                <WheelRing
                  stageRef={stageRef}
                  z={20}
                  title="② 個性"
                  subtitle="選說話風格（聲線）"
                  items={voices}
                  valueId={value?.voice || "warm"}
                  onChangeId={pickVoice}
                  disabled={disabled}
                  centerTopPct={72}
                  radius={140}
                  band={26}
                  arcStart={210}
                  arcEnd={330}
                />

                <WheelRing
                  stageRef={stageRef}
                  z={10}
                  title="③ 名字"
                  subtitle="選預設或自訂"
                  items={namePresets}
                  valueId={namePick}
                  onChangeId={onPickPresetName}
                  disabled={disabled}
                  centerTopPct={72}
                  radius={190}
                  band={28}
                  arcStart={210}
                  arcEnd={330}
                />

                <div className="absolute left-4 top-4 right-4 pointer-events-none space-y-1">
                  <div className="text-[11px] text-slate-500">
                    ① 顏色　② 個性　③ 名字（各圈都能獨立拖拉）
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4 -mt-2">
                <div className="flex items-center gap-2">
                  <input
                    value={localName}
                    onChange={(e) => {
                      const v = e.target.value.slice(0, 20);
                      setLocalName(v);
                      if (namePick !== "zd") setNamePick("zd");
                    }}
                    onBlur={() => commitName(localName.trim())}
                    placeholder="例如：小護膜、阿膜、浴室管家"
                    disabled={disabled}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <div className="text-[11px] text-slate-400 pr-1">
                    {Math.min(localName.length, 20)}/20
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  小技巧：把手指放在你要控制的那一圈「弧線附近」拖拉，就只會動那一圈
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WheelRing({
  stageRef,
  z = 10,
  title,
  subtitle,
  items,
  valueId,
  onChangeId,
  disabled,
  centerTopPct = 72,
  radius = 140,
  band = 26,
  arcStart = 210,
  arcEnd = 330
}) {
  const n = items.length;

  // 把 items 均勻分配在 arcStart ~ arcEnd
  const span = arcEnd - arcStart;
  const step = n <= 1 ? 0 : span / (n - 1);

  // 目前「被選到的項目」應該對準準星（準星在 270°：下方）
  const currentIdx = Math.max(0, items.findIndex((x) => x.id === valueId));
  const baseAngleForIdx = (i) => arcStart + i * step;

  // offset 代表整圈旋轉量（度數），用來讓 currentIdx 對準 270°
  const targetOffset = 270 - baseAngleForIdx(currentIdx);

  const [offset, setOffset] = useState(targetOffset);

  useEffect(() => {
    setOffset(targetOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueId]);

  const drag = useRef({
    on: false,
    startAngle: 0,
    startOffset: 0,
    cx: 0,
    cy: 0
  });

  const computeCenter = () => {
    const st = stageRef?.current;
    if (!st) return null;
    const r = st.getBoundingClientRect();
    const cx0 = r.left + r.width / 2;
    const cy0 = r.top + r.height * (centerTopPct / 100);
    return { cx0, cy0 };
  };

  const onPointerDown = (e) => {
    if (disabled) return;

    const c = computeCenter();
    if (!c) return;

    // 只允許在「那一圈的帶狀範圍」開始拖拉（避免三圈搶事件）
    if (!inDonutBand(e.clientX, e.clientY, c.cx0, c.cy0, radius, band)) return;

    drag.current.on = true;
    drag.current.cx = c.cx0;
    drag.current.cy = c.cy0;
    drag.current.startOffset = offset;
    drag.current.startAngle = angleDegFromPoint(
      e.clientX,
      e.clientY,
      c.cx0,
      c.cy0
    );

    // 用 window 監聽 move/up，避免「拖一下就被吸回去」
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
  };

  const onPointerMove = (e) => {
    if (!drag.current.on) return;

    const now = angleDegFromPoint(
      e.clientX,
      e.clientY,
      drag.current.cx,
      drag.current.cy
    );

    // 角度差要處理跨 0/360
    let d = now - drag.current.startAngle;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;

    setOffset(drag.current.startOffset + d);
  };

  const snapToNearest = (off) => {
    // 目標：找到哪個 idx 讓 (baseAngle(idx) + off) 最接近 270°
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < n; i++) {
      const a = baseAngleForIdx(i) + off;
      // 距離以最小角差衡量
      let d = a - 270;
      d = ((d + 540) % 360) - 180;
      const ad = Math.abs(d);
      if (ad < bestDist) {
        bestDist = ad;
        bestIdx = i;
      }
    }

    const snappedOffset = 270 - baseAngleForIdx(bestIdx);
    return { bestIdx, snappedOffset };
  };

  const onPointerUp = () => {
    if (!drag.current.on) return;
    drag.current.on = false;

    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);

    const { bestIdx, snappedOffset } = snapToNearest(offset);
    setOffset(snappedOffset);

    const chosen = items[bestIdx];
    if (chosen && chosen.id !== valueId) onChangeId?.(chosen.id);
  };

  // 畫弧線（裝飾用）
  const arcStyle = {
    width: radius * 2,
    height: radius * 2,
    borderRadius: "9999px",
    boxShadow:
      "0 0 0 1px rgba(2,132,199,0.14), 0 0 26px rgba(2,132,199,0.10)",
    background:
      "radial-gradient(circle at 50% 50%, rgba(2,132,199,0.06), rgba(2,132,199,0.0) 55%)"
  };

  const chipClassBase =
    "rounded-full border px-3 py-2 text-[11px] sm:text-xs whitespace-nowrap transition";

  return (
    <div className="absolute inset-0" style={{ zIndex: z }}>
      {/* 準星指示線 */}
      <div className="absolute left-1/2 top-[14px] -translate-x-1/2 pointer-events-none">
        <div
          style={{
            width: 2,
            height: 34,
            background:
              "linear-gradient(to bottom, rgba(2,132,199,0.0), rgba(2,132,199,0.55), rgba(2,132,199,0.0))",
            filter: "drop-shadow(0 0 10px rgba(2,132,199,0.25))"
          }}
        />
      </div>

      {/* 互動層：整個舞台都能接 pointerdown，但只有命中該圈 band 才會啟動 */}
      <div
        className="absolute inset-0"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
      />

      {/* 圓心定位 */}
      <div
        className="absolute left-1/2"
        style={{
          top: `${centerTopPct}%`,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none"
        }}
      >
        {/* 畫圓（但只露出下半部，像羅盤） */}
        <div
          className="relative"
          style={{
            width: radius * 2,
            height: radius + 70,
            overflow: "hidden"
          }}
        >
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              transform: "translate(-50%, -50%)",
              ...arcStyle
            }}
          />

          {/* 放置 chips：沿弧線排列 */}
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: radius * 2,
              height: radius * 2,
              transform: `translate(-50%, -50%) rotate(${offset}deg)`
            }}
          >
            {items.map((it, i) => {
              const a = baseAngleForIdx(i); // 這是未旋轉前的位置
              const isActive = it.id === valueId;

              return (
                <button
                  key={it.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeId?.(it.id)}
                  className={cx(
                    chipClassBase,
                    isActive
                      ? "bg-sky-600 border-sky-600 text-white"
                      : "bg-white/85 border-slate-200 text-slate-700 hover:bg-white"
                  )}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: `translate(-50%, -50%) rotate(${a}deg) translateY(-${radius}px) rotate(${-a}deg)`,
                    boxShadow: isActive
                      ? "0 10px 22px rgba(2,132,199,0.22)"
                      : "0 6px 16px rgba(15,23,42,0.08)",
                    pointerEvents: "auto"
                  }}
                >
                  {it.label}
                </button>
              );
            })}
          </div>

          {/* 圈的標題（放旁邊不擋操作） */}
          <div className="absolute left-3 top-2 pointer-events-none">
            <div className="text-[11px] text-slate-700 font-semibold">
              {title}
            </div>
            <div className="text-[10px] text-slate-500">{subtitle}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
