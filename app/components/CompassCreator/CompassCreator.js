"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}
function mod(n, m) {
  return ((n % m) + m) % m;
}
function inDonutBand(px, py, cx0, cy0, radius, band) {
  const dx = px - cx0;
  const dy = py - cy0;
  const d = Math.sqrt(dx * dx + dy * dy);
  return d >= radius - band && d <= radius + band;
}

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
                  每一圈沿圓周旋轉（左右拖拉），互不干擾，放開會吸附到最近選項
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
              {/* ★舞台高度加大，三圈才不會被切掉 */}
              <div ref={stageRef} className="relative h-[380px] sm:h-[420px]">
                {/* 中央準星 */}
                <div className="absolute left-1/2 top-[72%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="h-2 w-2 rounded-full bg-sky-600 shadow-[0_0_0_6px_rgba(2,132,199,0.15)]" />
                </div>

                {/* ★圓心移到更下面：72%（讓弧線完整在羅盤區內） */}
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
                  radius={95}
                  band={26}
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
                  radius={135}
                  band={26}
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
                  radius={178}
                  band={28}
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
                  小技巧：手指放在你要控制的那一圈「弧線附近」拖拉，就只會動那一圈
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
  radius = 135,
  band = 26
}) {
  const n = items.length;
  const step = 360 / n;

  const idx0 = Math.max(0, items.findIndex((x) => x.id === valueId));
  const targetAngle = -idx0 * step;

  const [angle, setAngle] = useState(targetAngle);

  const dragging = useRef(false);
  const startX = useRef(0);
  const startAngle = useRef(0);

  useEffect(() => {
    setAngle(targetAngle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueId]);

  const snapToNearest = (a) => {
    const raw = -a / step;
    const idx = mod(Math.round(raw), n);
    return { idx, snappedAngle: -idx * step };
  };

  // ★命中測試改用「真正的圓心」（舞台寬的中間 + 舞台高的 centerTopPct）
  const shouldHandle = (e) => {
    const st = stageRef?.current;
    if (!st) return true;
    const r = st.getBoundingClientRect();
    const cx0 = r.left + r.width / 2;
    const cy0 = r.top + r.height * (centerTopPct / 100);
    return inDonutBand(e.clientX, e.clientY, cx0, cy0, radius, band);
  };

  const onPointerDown = (e) => {
    if (disabled) return;
    if (!shouldHandle(e)) return;

    dragging.current = true;
    startX.current = e.clientX;
    startAngle.current = angle;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    setAngle(startAngle.current + dx * 0.25);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;

    const { idx, snappedAngle } = snapToNearest(angle);
    setAngle(snappedAngle);

    const chosen = items[idx];
    if (chosen && chosen.id !== valueId) onChangeId?.(chosen.id);
  };

  const stepDeg = step;

  return (
    <div className="absolute inset-0" style={{ zIndex: z }}>
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

      <div
        className="absolute left-1/2 pointer-events-auto"
        style={{
          top: `${centerTopPct}%`,
          transform: "translate(-50%, -50%)"
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="relative overflow-hidden"
          style={{
            width: radius * 2 + 44,
            height: radius + 88,
            touchAction: "pan-x",
            WebkitUserSelect: "none",
            userSelect: "none"
          }}
        >
          <div
            className="absolute left-1/2"
            style={{
              top: radius + 56,
              transform: `translateX(-50%) rotate(${angle}deg)`,
              width: radius * 2,
              height: radius * 2
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow:
                  "0 0 0 1px rgba(2,132,199,0.14), 0 0 26px rgba(2,132,199,0.10)",
                background:
                  "radial-gradient(circle at 50% 50%, rgba(2,132,199,0.05), rgba(2,132,199,0.0) 55%)"
              }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow: `inset 0 0 0 ${Math.max(
                  1,
                  Math.floor(band / 8)
                )}px rgba(2,132,199,0.08)`
              }}
            />

            {items.map((it, i) => {
              const itemAngle = i * stepDeg - 90;
              const isActive = it.id === valueId;

              return (
                <button
                  key={it.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeId?.(it.id)}
                  className={cx(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                    "rounded-full border px-3 py-2 text-[11px] sm:text-xs whitespace-nowrap transition",
                    isActive
                      ? "bg-sky-600 border-sky-600 text-white"
                      : "bg-white/85 border-slate-200 text-slate-700 hover:bg-white"
                  )}
                  style={{
                    transform: `translate(-50%, -50%) rotate(${itemAngle}deg) translateY(-${radius}px) rotate(${-itemAngle}deg)`,
                    boxShadow: isActive
                      ? "0 10px 22px rgba(2,132,199,0.22)"
                      : "0 6px 16px rgba(15,23,42,0.08)"
                  }}
                >
                  {it.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="absolute left-3 bottom-2 pointer-events-none">
          <div className="text-[11px] text-slate-600 font-semibold">{title}</div>
          <div className="text-[10px] text-slate-500">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}
