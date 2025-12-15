"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/** 垂直滾輪（放開吸附） */
function SnapWheel({
  title,
  subtitle,
  items,
  valueId,
  onChangeId,
  disabled,
  itemHeight = 44
}) {
  const wrapRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const rafRef = useRef(null);
  const snapTimer = useRef(null);

  const idxFromId = (id) => Math.max(0, items.findIndex((x) => x.id === id));

  // 初始化/外部變更時，把滾輪滾到對應項
  useEffect(() => {
    const idx = idxFromId(valueId);
    setActiveIndex(idx);
    const el = wrapRef.current;
    if (!el) return;
    const top = idx * itemHeight;
    el.scrollTo({ top, behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueId]);

  // 依滾動位置算最近 index（即時高亮用）
  const updateActiveFromScroll = () => {
    const el = wrapRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / itemHeight);
    setActiveIndex(clamp(idx, 0, items.length - 1));
  };

  const snapToNearest = () => {
    const el = wrapRef.current;
    if (!el) return;
    const idx = clamp(Math.round(el.scrollTop / itemHeight), 0, items.length - 1);
    const top = idx * itemHeight;
    el.scrollTo({ top, behavior: "smooth" });

    const chosen = items[idx];
    if (chosen && chosen.id !== valueId) onChangeId?.(chosen.id);
  };

  const onScroll = () => {
    if (disabled) return;

    // 用 rAF 降低頻繁 setState 的卡頓
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateActiveFromScroll);

    // 放開後吸附：scroll 停下來 120ms 就吸
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      snapToNearest();
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (snapTimer.current) clearTimeout(snapTimer.current);
    };
  }, []);

  // 上下 padding 做出「中間選中線」效果
  const pad = itemHeight * 2;

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-700">{title}</div>
          <div className="text-[11px] text-slate-500">{subtitle}</div>
        </div>
      </div>

      <div className="relative mt-2">
        {/* 選中線 */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[44px] rounded-xl border border-sky-200 bg-white/70 shadow-[0_6px_20px_rgba(2,132,199,0.12)]"
          style={{ height: itemHeight }}
        />

        <div
          ref={wrapRef}
          onScroll={onScroll}
          className={cx(
            "h-[220px] overflow-y-auto no-scrollbar rounded-xl",
            disabled ? "opacity-60" : ""
          )}
          style={{
            paddingTop: pad,
            paddingBottom: pad,
            scrollBehavior: "auto",
            WebkitOverflowScrolling: "touch"
          }}
        >
          {items.map((it, i) => {
            const active = i === activeIndex;
            return (
              <div
                key={it.id}
                className={cx(
                  "flex items-center justify-center",
                  active ? "text-slate-900" : "text-slate-500"
                )}
                style={{ height: itemHeight }}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const el = wrapRef.current;
                    if (!el) return;
                    el.scrollTo({ top: i * itemHeight, behavior: "smooth" });
                    onChangeId?.(it.id);
                  }}
                  className={cx(
                    "w-full text-center text-sm transition px-2",
                    active ? "font-semibold" : "font-normal"
                  )}
                >
                  {it.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 text-[11px] text-slate-400 px-1">
        小技巧：上下滑動，放開就會自動吸附到最近選項
      </div>
    </div>
  );
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

  const onPickPresetName = (presetId) => {
    setNamePick(presetId);
    const p = namePresets.find((x) => x.id === presetId);
    if (!p) return;
    if (p.id === "zd") return;
    setLocalName(p.label);
    onChange?.({ ...value, nickname: p.label });
  };

  const commitName = (name) => onChange?.({ ...value, nickname: name });

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
        <div className="rounded-[28px] border border-sky-200/60 bg-white/75 backdrop-blur shadow-[0_-10px_40px_rgba(2,132,199,0.15)] overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">
                  客製你的專屬 AI 小管家
                </div>
                <div className="text-[11px] text-slate-500">
                  改成上下滾動選單，放開自動吸附到最近選項
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

          <div className="px-3 pb-4 space-y-3">
            <SnapWheel
              title="① 顏色"
              subtitle="選核心色（也會套用到冷光線條）"
              items={colors}
              valueId={value?.color || value?.avatar || "sky"}
              onChangeId={pickColor}
              disabled={disabled}
            />

            <SnapWheel
              title="② 個性"
              subtitle="選說話風格（聲線）"
              items={voices}
              valueId={value?.voice || "warm"}
              onChangeId={pickVoice}
              disabled={disabled}
            />

            <SnapWheel
              title="③ 名字"
              subtitle="先選預設名，或選「自訂」後手動輸入"
              items={namePresets}
              valueId={namePick}
              onChangeId={onPickPresetName}
              disabled={disabled}
            />

            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-3">
              <div className="text-xs font-semibold text-slate-700 px-1">
                自訂名稱
              </div>
              <div className="text-[11px] text-slate-500 px-1">
                手動輸入會自動切換到「自訂」
              </div>

              <div className="mt-2 flex items-center gap-2 px-1">
                <input
                  value={localName}
                  onChange={(e) => {
                    const v = e.target.value.slice(0, 20);
                    setLocalName(v);
                    if (namePick !== "zd") setNamePick("zd");
                    onChange?.({ ...value, nickname: v });
                  }}
                  onBlur={() => commitName(localName.trim())}
                  placeholder="例如：小護膜、阿膜、浴室管家"
                  disabled={disabled}
                  className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
                <div className="text-[11px] text-slate-400 pr-2">
                  {Math.min(localName.length, 20)}/20
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
