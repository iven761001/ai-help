"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/** 垂直滾輪（放開吸附）— 精簡版 */
function SnapWheel({
  title,
  items,
  valueId,
  onChangeId,
  disabled,
  itemHeight = 40,
  height = 160
}) {
  const wrapRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const rafRef = useRef(null);
  const snapTimer = useRef(null);

  const idxFromId = (id) => Math.max(0, items.findIndex((x) => x.id === id));

  useEffect(() => {
    const idx = idxFromId(valueId);
    setActiveIndex(idx);
    const el = wrapRef.current;
    if (!el) return;
    el.scrollTo({ top: idx * itemHeight, behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueId]);

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
    el.scrollTo({ top: idx * itemHeight, behavior: "smooth" });

    const chosen = items[idx];
    if (chosen && chosen.id !== valueId) onChangeId?.(chosen.id);
  };

  const onScroll = () => {
    if (disabled) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateActiveFromScroll);

    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => snapToNearest(), 120);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (snapTimer.current) clearTimeout(snapTimer.current);
    };
  }, []);

  // padding 讓「選中線」在正中間
  const pad = itemHeight * 2;
  const wheelHeight = height;

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-2 py-2">
      <div className="px-1">
        <div className="text-[11px] font-semibold text-slate-700">{title}</div>
      </div>

      <div className="relative mt-2">
        {/* 選中線 */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-xl border border-sky-200 bg-white/75 shadow-[0_6px_18px_rgba(2,132,199,0.12)]"
          style={{ height: itemHeight }}
        />

        <div
          ref={wrapRef}
          onScroll={onScroll}
          className={cx("overflow-y-auto no-scrollbar rounded-xl", disabled ? "opacity-60" : "")}
          style={{
            height: wheelHeight,
            paddingTop: pad,
            paddingBottom: pad,
            WebkitOverflowScrolling: "touch"
          }}
        >
          {items.map((it, i) => {
            const active = i === activeIndex;
            return (
              <div
                key={it.id}
                className={cx("flex items-center justify-center")}
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
                    "w-full px-1 text-center transition",
                    active ? "text-slate-900 font-semibold" : "text-slate-500 font-normal",
                    "text-xs sm:text-sm"
                  )}
                >
                  {it.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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

  useEffect(() => setLocalName(value?.nickname || ""), [value?.nickname]);

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

  const canDone =
    !!value?.email &&
    !!(value?.color || value?.avatar) &&
    !!value?.voice &&
    !!localName.trim();

  return (
    <div className="fixed left-0 right-0 bottom-0 z-[60] pointer-events-none">
      <div className="pointer-events-auto mx-auto w-full max-w-4xl px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]">
        <div className="rounded-[26px] border border-sky-200/60 bg-white/75 backdrop-blur shadow-[0_-10px_40px_rgba(2,132,199,0.15)] overflow-hidden">
          {/* 精簡標題列 */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">創角設定</div>
                <div className="text-[11px] text-slate-500">上下滑動，放開自動吸附</div>
              </div>

              <button
                disabled={disabled || !canDone}
                onClick={() => onDone?.()}
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

          {/* 三欄並排滾軸 */}
          <div className="px-3 pb-3">
            <div className="grid grid-cols-3 gap-2">
              <SnapWheel
                title="① 顏色"
                items={colors}
                valueId={value?.color || value?.avatar || "sky"}
                onChangeId={pickColor}
                disabled={disabled}
                itemHeight={40}
                height={160}
              />
              <SnapWheel
                title="② 個性"
                items={voices}
                valueId={value?.voice || "warm"}
                onChangeId={pickVoice}
                disabled={disabled}
                itemHeight={40}
                height={160}
              />
              <SnapWheel
                title="③ 名字"
                items={namePresets}
                valueId={namePick}
                onChangeId={onPickPresetName}
                disabled={disabled}
                itemHeight={40}
                height={160}
              />
            </div>

            {/* 自訂名稱（在三欄下方，避免擠爆） */}
            <div className="mt-2 rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-2">
              <div className="flex items-center gap-2">
                <input
                  value={localName}
                  onChange={(e) => {
                    const v = e.target.value.slice(0, 20);
                    setLocalName(v);
                    if (namePick !== "zd") setNamePick("zd");
                    onChange?.({ ...value, nickname: v });
                  }}
                  placeholder="自訂名稱（最多 20 字）"
                  disabled={disabled}
                  className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
                <div className="text-[11px] text-slate-400">{Math.min(localName.length, 20)}/20</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
