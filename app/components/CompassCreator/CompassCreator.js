"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * 半圓同心圓羅盤創角 UI
 * Ring1: 顏色/球款
 * Ring2: 個性/聲線
 * Ring3: 暱稱（常用輪 + 自訂輸入）
 */
export default function CompassCreator({
  value,
  onChange,
  onConfirm
}) {
  // value: { avatar, voice, nickname }
  const [draft, setDraft] = useState(value);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState(value?.nickname || "");

  useEffect(() => setDraft(value), [value]);

  const avatarOptions = useMemo(
    () => [
      { id: "sky", label: "天空藍", sub: "穩重專業" },
      { id: "mint", label: "薄荷綠", sub: "清爽潔淨" },
      { id: "purple", label: "紫色", sub: "科技感" }
    ],
    []
  );

  const voiceOptions = useMemo(
    () => [
      { id: "warm", label: "溫暖", sub: "親切陪伴" },
      { id: "calm", label: "冷靜", sub: "條理清楚" },
      { id: "energetic", label: "活潑", sub: "有精神" }
    ],
    []
  );

  const nickOptions = useMemo(
    () => [
      { id: "小護膜", label: "小護膜" },
      { id: "阿膜", label: "阿膜" },
      { id: "浴室管家", label: "浴室管家" },
      { id: "廚房小助手", label: "廚房小助手" },
      { id: "地板保養師", label: "地板保養師" },
      { id: "__custom__", label: "自訂…" }
    ],
    []
  );

  const update = (patch) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange?.(next);
  };

  const handleNickPick = (id) => {
    if (id === "__custom__") {
      setCustomOpen(true);
      setCustomName(draft.nickname || "");
      return;
    }
    update({ nickname: id });
  };

  return (
    <>
      {/* 底部半圓科技羅盤 */}
      <div className="fixed left-0 right-0 bottom-0 z-[60] pointer-events-none">
        {/* 漸層罩 + 發光邊 */}
        <div className="pointer-events-auto mx-auto max-w-4xl">
          <div className="relative">
            {/* 背景 HUD */}
            <div className="mx-3 mb-3 rounded-[28px] border border-sky-200/25 bg-slate-950/70 backdrop-blur-xl shadow-[0_-20px_60px_rgba(0,0,0,0.45)] overflow-hidden">
              {/* 光暈線 */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-sky-400/10 blur-3xl" />
                <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[620px] h-[620px] rounded-full bg-purple-400/10 blur-3xl" />
                <div className="absolute inset-0 border-t border-sky-300/20" />
              </div>

              {/* 上方提示區（小小的） */}
              <div className="relative px-4 pt-3 pb-2 flex items-center justify-between">
                <div className="text-xs text-slate-200/90">
                  <span className="text-sky-300/90 font-semibold">高科技羅盤創角</span>
                  <span className="text-slate-300/70"> ・滑動每一圈左右切換</span>
                </div>
                <button
                  type="button"
                  onClick={() => onConfirm?.(draft)}
                  className="text-xs px-3 py-1.5 rounded-full bg-sky-500/90 hover:bg-sky-500 text-white shadow"
                >
                  完成創角
                </button>
              </div>

              {/* 同心圓區 */}
              <div className="relative px-2 pb-4 pt-1">
                <div className="relative h-[270px] sm:h-[300px]">
                  {/* Ring 1 */}
                  <Ring
                    title="① 顏色"
                    radius={120}
                    thickness={48}
                    items={avatarOptions.map((x) => ({
                      id: x.id,
                      label: x.label,
                      sub: x.sub
                    }))}
                    value={draft.avatar}
                    onValue={(id) => update({ avatar: id })}
                    accent={
                      draft.avatar === "mint"
                        ? "from-emerald-300/60 to-sky-300/60"
                        : draft.avatar === "purple"
                        ? "from-purple-300/60 to-sky-300/60"
                        : "from-sky-300/60 to-cyan-300/60"
                    }
                  />

                  {/* Ring 2 */}
                  <Ring
                    title="② 個性"
                    radius={175}
                    thickness={44}
                    items={voiceOptions.map((x) => ({
                      id: x.id,
                      label: x.label,
                      sub: x.sub
                    }))}
                    value={draft.voice}
                    onValue={(id) => update({ voice: id })}
                    accent="from-sky-300/40 to-purple-300/40"
                  />

                  {/* Ring 3 */}
                  <Ring
                    title="③ 名字"
                    radius={225}
                    thickness={40}
                    items={nickOptions.map((x) => ({
                      id: x.id,
                      label: x.label
                    }))}
                    value={draft.nickname || "小護膜"}
                    // 這圈點到自訂要開輸入
                    onValue={(id) => handleNickPick(id)}
                    accent="from-purple-300/35 to-sky-300/35"
                    labelSelected={(id) =>
                      id === "__custom__" ? "自訂…" : id
                    }
                  />

                  {/* 中央選取顯示 */}
                  <div className="absolute left-1/2 bottom-6 -translate-x-1/2 w-[320px] max-w-[92vw]">
                    <div className="rounded-2xl border border-sky-200/20 bg-slate-900/40 px-4 py-3 text-center">
                      <div className="text-[11px] text-slate-300/80">
                        目前設定
                      </div>
                      <div className="mt-1 text-sm text-white font-semibold">
                        {labelAvatar(draft.avatar)} · {labelVoice(draft.voice)} ·{" "}
                        {draft.nickname || "（請選名字）"}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-300/70">
                        小提醒：一指滑動「旋轉預覽」，二指滑動「拖拉位置」
                      </div>
                    </div>
                  </div>

                  {/* 底部半圓邊框 */}
                  <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[520px] max-w-[120vw] h-[260px] rounded-t-full border-t border-sky-300/25 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 留出底部安全區 */}
            <div className="h-2" />
          </div>
        </div>
      </div>

      {/* 自訂名字 Modal */}
      {customOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 p-3">
          <div className="w-full max-w-md rounded-3xl border border-sky-200/20 bg-slate-950/90 backdrop-blur-xl p-4 shadow-2xl">
            <div className="text-white font-semibold">自訂小管家名字</div>
            <p className="text-xs text-slate-300/80 mt-1">
              例如：小護膜、阿膜、浴室管家
            </p>

            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="mt-3 w-full rounded-2xl border border-sky-200/20 bg-slate-900/60 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-sky-400/60"
              placeholder="輸入名字"
              autoFocus
            />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                className="flex-1 rounded-2xl border border-slate-700/60 bg-slate-900/40 py-3 text-sm text-slate-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const v = (customName || "").trim();
                  if (!v) return;
                  update({ nickname: v });
                  setCustomOpen(false);
                }}
                className="flex-1 rounded-2xl bg-sky-500 py-3 text-sm text-white font-semibold"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** 單圈 Ring（半圓弧上排布項目，左右拖動旋轉，放手吸附） */
function Ring({
  title,
  radius,
  thickness,
  items,
  value,
  onValue,
  accent,
  labelSelected
}) {
  const n = items.length;
  const step = Math.PI / (n - 1); // 半圓分佈
  const wrapRef = useRef(null);

  // offset: 讓目前 value 對齊到中心（半圓頂點）
  const initialOffset = useMemo(() => {
    const idx = Math.max(0, items.findIndex((x) => x.id === value));
    return -(idx * step);
  }, [items, value, step]);

  const [offset, setOffset] = useState(initialOffset);
  useEffect(() => setOffset(initialOffset), [initialOffset]);

  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startOffset: 0
  });

  const setByOffset = (nextOffset, snap = false) => {
    // 限制範圍：讓選項不會跑出半圓
    const min = -(n - 1) * step;
    const max = 0;
    let o = nextOffset;
    if (o < min) o = min;
    if (o > max) o = max;

    if (snap) {
      // 吸附到最近的 idx
      const idx = Math.round(-o / step);
      o = -(idx * step);
      const picked = items[idx]?.id;
      if (picked != null) onValue?.(picked);
    }

    setOffset(o);
  };

  const onDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current.dragging = true;
    dragRef.current.startX = getClientX(e);
    dragRef.current.startOffset = offset;
  };

  const onMove = (e) => {
    if (!dragRef.current.dragging) return;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const x = getClientX(e);
    const dx = x - dragRef.current.startX;

    // dx → angle（靈敏度）
    const sensitivity = 1 / 260; // 越小越敏感
    const next = dragRef.current.startOffset + dx * sensitivity;
    setByOffset(next, false);
  };

  const onUp = (e) => {
    if (!dragRef.current.dragging) return;
    e?.preventDefault?.();
    e?.stopPropagation?.();
    dragRef.current.dragging = false;
    setByOffset(offset, true);
  };

  // 目前選取
  const selectedIdx = clamp(Math.round(-offset / step), 0, n - 1);
  const selectedId = items[selectedIdx]?.id;

  return (
    <div className="absolute left-1/2 bottom-8 -translate-x-1/2 pointer-events-auto">
      {/* 外框 */}
      <div
        ref={wrapRef}
        className="relative select-none"
        style={{
          width: radius * 2 + thickness,
          height: radius + thickness
        }}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
        onTouchCancel={onUp}
      >
        {/* Ring 背景 */}
        <div
          className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-t-full border border-sky-200/15 bg-slate-900/20 overflow-hidden"
          style={{
            width: radius * 2 + thickness,
            height: radius + thickness
          }}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-r ${accent} opacity-20`}
          />
        </div>

        {/* Ring 描邊光 */}
        <div
          className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-t-full border-t border-sky-300/25 pointer-events-none"
          style={{
            width: radius * 2 + thickness,
            height: radius + thickness
          }}
        />

        {/* Title */}
        <div className="absolute left-1/2 bottom-[calc(100%-6px)] -translate-x-1/2 text-[11px] text-slate-200/80">
          {title}
        </div>

        {/* items */}
        {items.map((it, i) => {
          const ang = i * step + offset; // 0..pi + offset
          const x = Math.cos(Math.PI - ang) * radius;
          const y = Math.sin(Math.PI - ang) * radius;

          // 越接近頂點（y 大）越亮
          const near = Math.max(0, Math.min(1, (y / radius) * 1.05));
          const isSel = selectedId === it.id;

          return (
            <div
              key={it.id}
              className="absolute left-1/2 bottom-0 -translate-x-1/2 -translate-y-1/2"
              style={{
                transform: `translate(${x}px, ${-y}px)`
              }}
            >
              <div
                className={[
                  "px-3 py-2 rounded-full border transition",
                  isSel
                    ? "bg-sky-500/90 border-sky-300/60 text-white shadow-[0_0_24px_rgba(56,189,248,0.35)]"
                    : "bg-slate-950/50 border-sky-200/15 text-slate-200/85"
                ].join(" ")}
                style={{
                  opacity: 0.55 + near * 0.45,
                  transform: `scale(${0.92 + near * 0.16})`
                }}
                onClick={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  // 點選：直接吸附到該項
                  const nextOffset = -(i * step);
                  setByOffset(nextOffset, true);
                }}
              >
                <div className="text-[11px] font-semibold leading-none">
                  {labelSelected ? labelSelected(it.id) : it.label}
                </div>
                {it.sub && (
                  <div className="mt-1 text-[10px] text-slate-200/70 leading-none">
                    {it.sub}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getClientX(e) {
  if (e?.touches?.[0]) return e.touches[0].clientX;
  if (e?.changedTouches?.[0]) return e.changedTouches[0].clientX;
  return e.clientX ?? 0;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function labelAvatar(id) {
  if (id === "mint") return "薄荷綠";
  if (id === "purple") return "紫色";
  return "天空藍";
}
function labelVoice(id) {
  if (id === "calm") return "冷靜條理";
  if (id === "energetic") return "活潑有精神";
  return "溫暖親切";
}
