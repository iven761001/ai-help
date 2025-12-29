"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import WheelPicker from "./WheelPicker";

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
  // ✅ 兩個 VRM 模型（輪盤切換寫回 vrmId）
  const avatars = useMemo(
    () => [
      { id: "C1", label: "碳1 · C1" },
      { id: "C2", label: "碳2 · C2" }
    ],
    []
  );

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

  const [nameMode, setNameMode] = useState("__custom__");
  const [customName, setCustomName] = useState(value?.nickname || "");

  // ✅ 量高度（外層要閃避鍵盤/配置可以用）
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

  const pickAvatar = (id) => onChange?.({ ...value, vrmId: id });
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
    !!(value?.vrmId || "C1") &&
    !!(value?.color || value?.avatar) &&
    !!value?.voice &&
    !!(value?.nickname || customName).trim();

  // ✅ panels：現在 4 個輪盤（>=4 會變左右滑 carousel）
  const panels = useMemo(
    () => [
      {
        key: "avatar",
        node: (
          <WheelPicker
            title="① 角色"
            subtitle="選 VRM 模型"
            items={avatars}
            value={value?.vrmId || "C1"}
            onChange={pickAvatar}
            disabled={disabled}
          />
        )
      },
      {
        key: "color",
        node: (
          <WheelPicker
            title="② 顏色"
            subtitle="選核心色"
            items={colors}
            value={value?.color || value?.avatar || "sky"}
            onChange={pickColor}
            disabled={disabled}
          />
        )
      },
      {
        key: "voice",
        node: (
          <WheelPicker
            title="③ 個性"
            subtitle="選說話風格"
            items={voices}
            value={value?.voice || "warm"}
            onChange={pickVoice}
            disabled={disabled}
          />
        )
      },
      {
        key: "name",
        node: (
          <WheelPicker
            title="④ 名字"
            subtitle="選一個或自訂"
            items={nameOptions}
            value={nameMode}
            onChange={pickNameMode}
            disabled={disabled}
          />
        )
      }
    ],
    [avatars, colors, voices, nameOptions, value, nameMode, disabled]
  );

  const showCarousel = panels.length > 3;
  const perView = showCarousel ? 3 : panels.length;

  const trackRef = useRef(null);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(panels.length / perView));

  const scrollToPage = (p) => {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(pageCount - 1, p));
    const w = el.clientWidth || 1;
    el.scrollTo({ left: next * w, behavior: "smooth" });
    setPage(next);
  };

  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const p = Math.round(el.scrollLeft / w);
    if (p !== page) setPage(p);
  };

  useEffect(() => {
    const handler = () => scrollToPage(page);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div
      ref={shellRef}
      className="h-full rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-xl shadow-[0_-12px_50px_rgba(56,189,248,0.15)] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">創角設定</div>
            <div className="text-[11px] text-white/70">
              輪盤可上下拖拉，會自動吸附到文字正中央
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
      </div>

      {/* Wheels */}
      <div className="px-3 pb-3 flex-1">
        {!showCarousel ? (
          <div className="grid grid-cols-3 gap-3">
            {panels.map((p) => (
              <div key={p.key}>{p.node}</div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                onClick={() => scrollToPage(page - 1)}
                disabled={page === 0}
                className={cx(
                  "h-8 w-8 rounded-full border border-white/15 bg-white/10 text-white/80 flex items-center justify-center transition active:scale-95",
                  page === 0 ? "opacity-40" : "opacity-100"
                )}
                aria-label="上一組輪盤"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: pageCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToPage(i)}
                    className={cx(
                      "h-2.5 w-2.5 rounded-full transition",
                      i === page ? "bg-sky-400" : "bg-white/20"
                    )}
                    aria-label={`第 ${i + 1} 組輪盤`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => scrollToPage(page + 1)}
                disabled={page === pageCount - 1}
                className={cx(
                  "h-8 w-8 rounded-full border border-white/15 bg-white/10 text-white/80 flex items-center justify-center transition active:scale-95",
                  page === pageCount - 1 ? "opacity-40" : "opacity-100"
                )}
                aria-label="下一組輪盤"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div
              ref={trackRef}
              onScroll={onTrackScroll}
              className="no-scrollbar overflow-x-auto snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="flex" style={{ width: `${pageCount * 100}%` }}>
                {Array.from({ length: pageCount }).map((_, pageIdx) => {
                  const start = pageIdx * perView;
                  const slice = panels.slice(start, start + perView);
                  return (
                    <div
                      key={pageIdx}
                      className="snap-start shrink-0"
                      style={{ width: `${100 / pageCount}%` }}
                    >
                      <div className="grid grid-cols-3 gap-3">
                        {slice.map((p) => (
                          <div key={p.key}>{p.node}</div>
                        ))}
                        {slice.length < 3 &&
                          Array.from({ length: 3 - slice.length }).map((__, k) => (
                            <div key={`pad-${k}`} className="opacity-0 pointer-events-none">
                              <div className="h-[176px]" />
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Custom name input */}
      {nameMode === "__custom__" && (
        <div className="px-4 pb-4 shrink-0">
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
  );
}
