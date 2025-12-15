"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

/**
 * 圓周羅盤（3圈）
 * - 每一圈：沿圓周旋轉（手指左右拖拉）
 * - 放開：吸附到最近項目（snapping）
 * - 固定在底部 safe-area
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

  const [localName, setLocalName] = useState(value?.nickname || "");
  const [namePick, setNamePick] = useState("zd"); // 預設自訂

  useEffect(() => {
    setLocalName(value?.nickname || "");
  }, [value?.nickname]);

  // 初始化 namePick：如果 nickname 剛好等於 preset，就選起來
  useEffect(() => {
    const hit = namePresets.find((p) => p.label === (value?.nickname || ""));
    setNamePick(hit ? hit.id : "zd");
  }, [value?.nickname, namePresets]);

  const canDone =
    !!value?.email &&
    !!(value?.color || value?.avatar) &&
    !!value?.voice &&
    !!localName.trim();

  const pickColor = (id) => {
    onChange?.({ ...value, color: id, avatar: id }); // 兼容原本 avatar 欄位
  };
  const pickVoice = (id) => {
    onChange?.({ ...value, voice: id });
  };
  const commitName = (name) => {
    onChange?.({ ...value, nickname: name });
  };

  const onPickPresetName = (presetId) => {
    setNamePick(presetId);
    const p = namePresets.find((x) => x.id === presetId);
    if (!p) return;

    if (p.id === "zd") {
      // 自訂：不強制改名字
      return;
    }
    setLocalName(p.label);
    commitName(p.label);
  };

  return (
    <div className="fixed left-0 right-0 bottom-0 z-[60] pointer-events-none">
      <div
        className="pointer-events-auto mx-auto w-full max-w-4xl px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <div className="rounded-[28px] border border-sky-200/60 bg-white/75 backdrop-blur overflow-hidden shadow-[0_-10px_40px_rgba(2,132,199,0.15)]">
          {/* Header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">
                  高科技羅盤 · 創角設定
                </div>
                <div className="text-[11px] text-slate-500">
                  每一圈沿圓周旋轉（左右拖拉），放開會自動吸附到最近選項
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

          {/* 羅盤舞台：只露出上半部圈環，像底部儀表 */}
          <div className="relative px-3 pb-4">
            <div className="relative w-full rounded-2xl border border-sky-100 bg-sky-50/60 overflow-hidden">
              {/* 舞台高度（可調） */}
              <div className="relative h-[280px] sm:h-[310px]">
                {/* 中央提示點（準星） */}
                <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2">
                  <div className="h-2 w-2 rounded-full bg-sky-600 shadow-[0_0_0_6px_rgba(2,132,199,0.15)]" />
                </div>

                {/* Ring 1 */}
                <WheelRing
                  title="① 顏色"
                  subtitle="選核心色（也會套用到冷光線條）"
                  items={colors}
                  valueId={value?.color || value?.avatar || "sky"}
                  onChangeId={pickColor}
                  disabled={disabled}
                  radius={130}
                  topPct={56}
                />

                {/* Ring 2 */}
                <WheelRing
                  title="② 個性"
                  subtitle="選說話風格（聲線）"
                  items={voices}
                  valueId={value?.voice || "warm"}
                  onChangeId={pickVoice}
                  disabled={disabled}
                  radius={165}
                  topPct={56}
                />

                {/* Ring 3（名字圈：預設名字沿圓周選） */}
                <WheelRing
                  title="③ 名字"
                  subtitle="選預設或自訂"
                  items={namePresets}
                  valueId={namePick}
                  onChangeId={onPickPresetName}
                  disabled={disabled}
                  radius={205}
                  topPct={56}
                />
              </div>

              {/* 底部：名字輸入（保留自訂能力） */}
              <div className="px-4 pb-4 -mt-2">
                <div className="flex items-center gap-2">
                  <input
                    value={localName}
                    onChange={(e) => {
                      const v = e.target.value.slice(0, 20);
                      setLocalName(v);
                      // 使用者開始打字就視為自訂
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
                  小技巧：拖拉圈環把想要的項目轉到準星附近，就會自動選中
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * WheelRing：圓周旋轉圈
 * - 以「左右拖拉」改變角度
 * - 放開自動吸附（snap）到最近項目
 * - 項目分佈在圓周上，顯示時靠上半圈最清楚（底部儀表感）
 */
function WheelRing({
  title,
  subtitle,
  items,
  valueId,
  onChangeId,
  disabled,
  radius = 160,
  topPct = 56
}) {
  const n = items.length;
  const step = 360 / n; // 每個項目角度間距
  const centerIndex = Math.max(
    0,
    items.findIndex((x) => x.id === valueId)
  );

  // 角度規則：讓「目前選中」靠近準星（上方/正中）
  // 我們定義：index 0 在 -90deg（正上方），所以選中 index 應對應 angle = -index*step
  const targetAngle = -centerIndex * step;

  const [angle, setAngle] = useState(targetAngle);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startAngle = useRef(0);

  // 外部 value 變化時，同步角度（避免跳動，做個柔和過渡）
  useEffect(() => {
    setAngle(targetAngle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueId]);

  const snapToNearest = (a) => {
    // 反推最接近的 index：a ≈ -index*step
    const raw = -a / step;
    const idx = mod(Math.round(raw), n);
    const snappedAngle = -idx * step;
    return { idx, snappedAngle };
  };

  const onPointerDown = (e) => {
    if (disabled) return;
    dragging.current = true;
    startX.current = e.clientX;
    startAngle.current = angle;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    // dx 轉成角度：越大越靈敏（可調）
    const dx = e.clientX - startX.current;
    const next = startAngle.current + dx * 0.25; // ★靈敏度
    setAngle(next);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const { idx, snappedAngle } = snapToNearest(angle);
    setAngle(snappedAngle);

    const chosen = items[idx];
    if (chosen && chosen.id !== valueId) {
      onChangeId?.(chosen.id);
    }
  };

  // 只露出上半圈：用 overflow hidden + 位移來做「儀表盤」
  const centerTop = `${topPct}%`;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 標題（固定在上方） */}
      <div className="absolute left-4 top-4 pointer-events-none">
        <div className="text-xs font-semibold text-slate-700">{title}</div>
        <div className="text-[11px] text-slate-500">{subtitle}</div>
      </div>

      {/* 圈環容器（可拖拉） */}
      <div
        className="absolute left-1/2 pointer-events-auto"
        style={{ top: centerTop, transform: "translate(-50%, -50%)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* 露出區：只顯示上半 */}
        <div
          className="relative overflow-hidden"
          style={{
            width: radius * 2 + 40,
            height: radius + 60,
            touchAction: "pan-x",
            WebkitUserSelect: "none",
            userSelect: "none"
          }}
        >
          {/* 圈本體 */}
          <div
            className="absolute left-1/2"
            style={{
              top: radius + 40, // 往下放，讓只露出上半圈
              transform: `translateX(-50%) rotate(${angle}deg)`,
              width: radius * 2,
              height: radius * 2
            }}
          >
            {/* 圈環光暈 */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow: "0 0 0 1px rgba(2,132,199,0.18), 0 0 30px rgba(2,132,199,0.12)",
                background:
                  "radial-gradient(circle at 50% 50%, rgba(2,132,199,0.06), rgba(2,132,199,0.0) 55%)"
              }}
            />

            {/* 項目分佈在圓周 */}
            {items.map((it, i) => {
              const itemAngle = i * step - 90; // 讓 i=0 在正上方
              const isActive = it.id === valueId;

              return (
                <button
                  key={it.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeId?.(it.id)}
                  className={cx(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                    "rounded-full border px-3 py-2 text-[11px] sm:text-xs whitespace-nowrap",
                    "transition",
                    isActive
                      ? "bg-sky-600 border-sky-600 text-white"
                      : "bg-white/85 border-slate-200 text-slate-700 hover:bg-white"
                  )}
                  style={{
                    transform: `translate(-50%, -50%) rotate(${itemAngle}deg) translateY(-${radius}px) rotate(${-itemAngle}deg)`,
                    // 讓項目面向正面（第二個 rotate 轉回來）
                    boxShadow: isActive
                      ? "0 10px 25px rgba(2,132,199,0.25)"
                      : "0 6px 18px rgba(15,23,42,0.08)"
                  }}
                >
                  {it.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 準星高亮線（指向準星方向） */}
        <div
          className="absolute left-1/2 top-[8px] -translate-x-1/2"
          style={{
            width: 2,
            height: 34,
            background:
              "linear-gradient(to bottom, rgba(2,132,199,0.0), rgba(2,132,199,0.75), rgba(2,132,199,0.0))",
            filter: "drop-shadow(0 0 10px rgba(2,132,199,0.4))",
            pointerEvents: "none"
          }}
        />
      </div>
    </div>
  );
}
