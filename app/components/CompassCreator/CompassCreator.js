"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import WheelPicker from "./WheelPicker";
import { elementProfiles } from "../../lib/elementProfiles";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function CompassCreator({
  value,
  onChange,
  onDone,
  disabled,
  onHeightChange
}) {
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

  const nameOptions = useMemo(
    () => [
      { id: "小護膜", label: "小護膜" },
      { id: "阿膜", label: "阿膜" },
      { id: "浴室管家", label: "浴室管家" },
      { id: "廚房管家", label: "廚房管家" },
      { id: "玻璃小幫手", label: "玻璃小幫手" },
      { id: "地板管家", label: "地板管家" },
      { id: "__custom__", label: "自訂名字…" }
    ],
    []
  );

  const elementItems = useMemo(() => Object.values(elementProfiles), []);

  const [nameMode, setNameMode] = useState("__custom__");
  const [customName, setCustomName] = useState(value?.nickname || "");

  const shellRef = useRef(null);

  useEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const emit = () => {
      const h = el.getBoundingClientRect().height || 0;
      onHeightChange?.(h);
    };

    emit();
    const ro = new ResizeObserver(() => requestAnimationFrame(emit));
    ro.observe(el);

    window.addEventListener("resize", emit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", emit);
    };
  }, [onHeightChange]);

  useEffect(() => {
    const nick = value?.nickname || "";
    setCustomName(nick);
    const hit = nameOptions.find((x) => x.id === nick);
    setNameMode(hit ? hit.id : "__custom__");
  }, [value?.nickname, nameOptions]);

  const pickElement = (id) => onChange?.({ ...value, element: id });

  const pickColor = (id) => onChange?.({ ...value, color: id, avatar: id });
  const pickVoice = (id) => onChange?.({ ...value, voice: id });

  const pickNameMode = (id) => {
    setNameMode(id);
    if (id === "__custom__") return;
    setCustomName(id);
    onChange?.({ ...value, nickname: id });
  };

  const commitCustomName = (name) => {
    const n = (name || "").trim().slice(0, 20);
    setCustomName(n);
    onChange?.({ ...value, nickname: n });
  };

  const canDone =
    !!value?.email &&
    !!(value?.color || value?.avatar) &&
    !!value?.voice &&
    !!(value?.nickname || customName).trim();

  const elementValue = value?.element || "carbon";

  return (
    <div className="fixed left-0 right-0 bottom-0 z-[60] pointer-events-none">
      <div
        className="pointer-events-auto mx-auto w-full max-w-4xl px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <div
          ref={shellRef}
          className="rounded-[28px] border border-sky-200/30 bg-white/10 backdrop-blur-xl shadow-[0_-12px_50px_rgba(56,189,248,0.15)] overflow-hidden"
        >
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">創角設定</div>
                <div className="text-[11px] text-white/70">
                  元素決定「動作手感」，下方三個 wheel 再決定外觀與個性
                </div>
              </div>

              <button
                disabled={disabled || !canDone}
                onClick={() => {
                  if (nameMode === "__custom__") commitCustomName(customName);
                  onDone?.();
                }}
                className={cx(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
                  disabled || !canDone
                    ? "bg-white/20 text-white/60"
                    : "bg-sky-500 text-white hover:bg-sky-400"
                )}
              >
                完成
              </button>
            </div>

            {/* ✅ 元素列 */}
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {elementItems.map((el) => {
                const active = el.id === elementValue;
                return (
                  <button
                    key={el.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => pickElement(el.id)}
                    className={cx(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs border transition",
                      active
                        ? "bg-sky-500/90 border-sky-300 text-white"
                        : "bg-white/5 border-white/15 text-white/80 hover:bg-white/10"
                    )}
                  >
                    {el.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-3 pb-4 grid grid-cols-3 gap-3">
            <WheelPicker
              title="① 顏色"
              subtitle="選核心色"
              items={colors}
              value={value?.color || value?.avatar || "sky"}
              onChange={pickColor}
              disabled={disabled}
            />

            <WheelPicker
              title="② 個性"
              subtitle="選說話風格"
              items={voices}
              value={value?.voice || "warm"}
              onChange={pickVoice}
              disabled={disabled}
            />

            <WheelPicker
              title="③ 名字"
              subtitle="選一個或自訂"
              items={nameOptions}
              value={nameMode}
              onChange={pickNameMode}
              disabled={disabled}
            />
          </div>

          {nameMode === "__custom__" && (
            <div className="px-4 pb-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3">
                <div className="text-[11px] text-white/70 mb-2">
                  自訂名字（最多 20 字）
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onBlur={() => commitCustomName(customName)}
                    placeholder="例如：小護膜、阿膜、浴室管家"
                    disabled={disabled}
                    className="flex-1 rounded-full border border-white/15 bg-black/10 text-white px-4 py-2 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-sky-400"
                  />
                  <div className="text-[11px] text-white/60 pr-1">
                    {Math.min((customName || "").length, 20)}/20
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
