"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}
function angleDegFromPoint(px, py, cx0, cy0) {
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
 * 浮動版「標準羅盤」：
 * - 整個面板可拖拉（拖標題列）
 * - 三圈各自沿同一圓心轉動（甜甜圈帶狀命中才啟動該圈）
 * - 文字朝向圓心（vertical-rl + rotate(a-90)）
 */
export default function CompassCreator({ value, onChange, onDone, disabled }) {
  const colors = useMemo(
    () => [
      { id: "sky", label: "天空藍" },
      { id: "mint", label: "薄荷綠" },
      { id: "purple", label: "紫色" }
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
    <FloatingPanel disabled={disabled}>
      <div className="w-[min(520px,92vw)] rounded-[28px] border border-sky-200/60 bg-white/75 backdrop-blur overflow-hidden shadow-[0_-10px_40px_rgba(2,132,199,0.15)]">
        {/* 可拖拉的標題列（拖這裡移動整個羅盤） */}
        <div className="px-4 pt-4 pb-3 cursor-grab active:cursor-grabbing select-none">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800">
                高科技羅盤 · 創角設定
              </div>
              <div className="text-[11px] text-slate-500">
                每圈沿圓周旋轉（手指放在該圈弧線附近拖拉），文字朝向圓心
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

        <div className="px-3 pb-4">
          <div className="relative w-full rounded-2xl border border-sky-100 bg-sky-50/60 overflow-hidden">
            <div className="relative h-[360px]">
              {/* 圓心準星 */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="h-2 w-2 rounded-full bg-sky-600 shadow-[0_0_0_7px_rgba(2,132,199,0.14)]" />
              </div>

              {/* 三圈：半徑拉開、同心圓 */}
              <WheelRing
                z={30}
                title="① 顏色"
                items={colors}
                valueId={value?.color || value?.avatar || "sky"}
                onChangeId={pickColor}
                disabled={disabled}
                radius={88}
                band={24}
              />
              <WheelRing
                z={20}
                title="② 個性"
                items={voices}
                valueId={value?.voice || "warm"}
                onChangeId={pickVoice}
                disabled={disabled}
                radius={132}
                band={26}
              />
              <WheelRing
                z={10}
                title="③ 名字"
                items={namePresets}
                valueId={namePick}
                onChangeId={onPickPresetName}
                disabled={disabled}
                radius={178}
                band={28}
              />
            </div>

            {/* 名字輸入 */}
            <div className="px-4 pb-4 -mt-1">
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
                小技巧：手指放在「要控制的那一圈弧線附近」拖拉，就只會動那一圈
              </div>
            </div>
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

/** 浮動面板：拖「標題列」移動，不會干擾圈的旋轉 */
function FloatingPanel({ children, disabled }) {
  const panelRef = useRef(null);
  const drag = useRef({ on: false, x: 0, y: 0, ox: 0, oy: 0 });

  // 初始放右下偏上（比較不擋內容）
  const [pos, setPos] = useState({ x: 0, y: 0, ready: false });

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setPos({
      x: Math.round(w - 40),
      y: Math.round(h - 520),
      ready: true
    });
  }, []);

  const clampToViewport = (x, y) => {
    const el = panelRef.current;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const bw = el?.offsetWidth || 360;
    const bh = el?.offsetHeight || 420;

    const nx = clamp(x, 12, w - bw - 12);
    const ny = clamp(y, 12, h - bh - 12);
    return { x: nx, y: ny };
  };

  const onDown = (e) => {
    if (disabled) return;
    // 只允許從「標題列」開始拖（避免你在轉圈時拖到整個面板）
    // 標題列有 cursor-grab，我們用最近的那層判斷
    const header = e.target?.closest?.(".cursor-grab");
    if (!header) return;

    drag.current.on = true;
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
    drag.current.ox = pos.x;
    drag.current.oy = pos.y;

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
  };

  const onMove = (e) => {
    if (!drag.current.on) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    const next = clampToViewport(drag.current.ox + dx, drag.current.oy + dy);
    setPos({ ...next, ready: true });
  };

  const onUp = () => {
    drag.current.on = false;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  };

  return (
    <div
      className="fixed left-0 top-0 z-[80] pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    >
      <div
        ref={panelRef}
        className="pointer-events-auto"
        onPointerDown={onDown}
        style={{
          position: "absolute",
          transform: pos.ready
            ? `translate(${pos.x}px, ${pos.y}px) translate(-100%, 0)`
            : "translate(-9999px,-9999px)"
        }}
      >
        {children}
      </div>
    </div>
  );
}

function WheelRing({ z, title, items, valueId, onChangeId, disabled, radius, band }) {
  const n = items.length;

  // 標準羅盤：均勻灑滿 360 度（像你提供的那張）
  const step = n <= 1 ? 0 : 360 / n;

  // 讓目前選中的那個「吸附到正上方」(270° 是上方？我們用 270=上方的感覺)
  // 注意：angleDegFromPoint 0 在右、90 在下、180 在左、270 在上
  const anchorAngle = 270;

  const currentIdx = Math.max(0, items.findIndex((x) => x.id === valueId));
  const baseAngleForIdx = (i) => i * step;

  const targetOffset = anchorAngle - baseAngleForIdx(currentIdx);
  const [offset, setOffset] = useState(targetOffset);

  useEffect(() => {
    setOffset(targetOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueId]);

  const stageRef = useRef(null);

  const drag = useRef({
    on: false,
    startAngle: 0,
    startOffset: 0,
    cx: 0,
    cy: 0
  });

  const computeCenter = () => {
    const st = stageRef.current;
    if (!st) return null;
    const r = st.getBoundingClientRect();
    return { cx0: r.left + r.width / 2, cy0: r.top + r.height / 2 };
  };

  const onPointerDown = (e) => {
    if (disabled) return;

    const c = computeCenter();
    if (!c) return;

    // 只有點到該圈 band 才啟動該圈（避免三圈重疊搶手勢）
    if (!inDonutBand(e.clientX, e.clientY, c.cx0, c.cy0, radius, band)) return;

    drag.current.on = true;
    drag.current.cx = c.cx0;
    drag.current.cy = c.cy0;
    drag.current.startOffset = offset;
    drag.current.startAngle = angleDegFromPoint(e.clientX, e.clientY, c.cx0, c.cy0);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
  };

  const onPointerMove = (e) => {
    if (!drag.current.on) return;

    const now = angleDegFromPoint(e.clientX, e.clientY, drag.current.cx, drag.current.cy);

    let d = now - drag.current.startAngle;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;

    setOffset(drag.current.startOffset + d);
  };

  const snapToNearest = (off) => {
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < n; i++) {
      const a = baseAngleForIdx(i) + off;
      let d = a - anchorAngle;
      d = ((d + 540) % 360) - 180;
      const ad = Math.abs(d);
      if (ad < bestDist) {
        bestDist = ad;
        bestIdx = i;
      }
    }

    const snappedOffset = anchorAngle - baseAngleForIdx(bestIdx);
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

  return (
    <div className="absolute inset-0" style={{ zIndex: z }}>
      {/* 這個 ring 的互動舞台 */}
      <div
        ref={stageRef}
        className="absolute inset-0"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
      />

      {/* 圓環裝飾 */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: radius * 2,
          height: radius * 2,
          borderRadius: 9999,
          boxShadow: "0 0 0 1px rgba(2,132,199,0.14), 0 0 28px rgba(2,132,199,0.10)",
          background:
            "radial-gradient(circle at 50% 50%, rgba(2,132,199,0.06), rgba(2,132,199,0.0) 60%)"
        }}
      />

      {/* 標題（不擋手指） */}
      <div className="absolute left-4 top-4 pointer-events-none">
        <div className="text-[11px] text-slate-700 font-semibold">{title}</div>
      </div>

      {/* items：沿圓周排，文字朝向圓心 */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: radius * 2,
          height: radius * 2,
          transform: `translate(-50%, -50%) rotate(${offset}deg)`,
          pointerEvents: "none"
        }}
      >
        {items.map((it, i) => {
          const a = baseAngleForIdx(i); // 0~360
          const isActive = it.id === valueId;

          return (
            <button
              key={it.id}
              type="button"
              disabled={disabled}
              onClick={() => onChangeId?.(it.id)}
              className={cx(
                "rounded-2xl border px-2 py-2 text-[11px] transition",
                isActive
                  ? "bg-sky-600 border-sky-600 text-white"
                  : "bg-white/85 border-slate-200 text-slate-700 hover:bg-white"
              )}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) rotate(${a}deg) translateY(-${radius}px) rotate(${-a}deg)`,
                pointerEvents: "auto",
                boxShadow: isActive
                  ? "0 10px 22px rgba(2,132,199,0.22)"
                  : "0 6px 16px rgba(15,23,42,0.08)"
              }}
            >
              {/* 文字朝向圓心：用 vertical-rl + rotate(a-90) */}
              <span
                style={{
                  display: "inline-block",
                  writingMode: "vertical-rl",
                  textOrientation: "upright",
                  transform: `rotate(${a - 90}deg)`,
                  transformOrigin: "center"
                }}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
