//ChatHUD.jsx v1.000
// app/components/HUD/ChatHUD.jsx
"use client";

import { useEffect, useMemo, useRef } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function ChatHUD({
  user,
  messages,
  sending,
  input,
  setInput,
  onSend,
  onBackToCreator,
  onHeightChange
}) {
  const scrollerRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const shellRef = useRef(null);

  // 回報高度給外層（page.js 用來讓舞台自動讓位）
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

  const updateStickState = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const threshold = 90;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = dist < threshold;
  };

  // 新訊息：只有在使用者停在底部附近才自動滑到底
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (!stickToBottomRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const canSend = useMemo(() => !!input.trim() && !sending, [input, sending]);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    const text = input;
    setInput("");
    await onSend(text);
    stickToBottomRef.current = true;
  };

  return (
    <div
      ref={shellRef}
      className="
        h-full
        rounded-[28px]
        bg-white/10
        backdrop-blur-xl
        border border-white/15
        shadow-[0_-12px_50px_rgba(56,189,248,0.15)]
        overflow-hidden
        flex flex-col
      "
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {user?.nickname || "你的 AI 小管家"}
          </div>
          <div className="text-[11px] text-white/70 truncate">
            綁定信箱：{user?.email || ""}
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToCreator}
          className="
            shrink-0 h-10 w-10 rounded-full
            bg-white/10 border border-white/15
            text-white flex items-center justify-center
            active:scale-95 transition
          "
          aria-label="回到選角"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollerRef}
        onScroll={updateStickState}
        className="px-4 pb-3 overflow-y-auto no-scrollbar flex-1"
        style={{ overscrollBehavior: "contain" }}
      >
        {messages.length === 0 && (
          <div className="text-xs text-white/60 text-center mt-8 whitespace-pre-wrap">
            跟 {user?.nickname} 打聲招呼吧！{"\n"}
            可以問：「浴室玻璃有水垢要怎麼清？」、
            「鍍膜後幾天不能用什麼清潔劑？」
          </div>
        )}

        <div className="space-y-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cx(
                  "max-w-[86%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-sky-500 text-white rounded-br-none"
                    : "bg-white/12 text-white rounded-bl-none border border-white/10"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/10 text-white/70 text-xs px-3 py-2 rounded-2xl rounded-bl-none border border-white/10">
                {user?.nickname} 思考中⋯⋯
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={submit} className="px-4 pb-4 pt-2 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="輸入想問的問題，例如：地板有黃漬，要怎麼清比較安全？"
            disabled={sending}
            className="
              flex-1 rounded-full
              border border-white/15
              bg-black/20 text-white
              px-4 py-2 text-sm outline-none
              placeholder:text-white/40
              focus:ring-2 focus:ring-sky-400
            "
          />
          <button
            type="submit"
            disabled={!canSend}
            className={cx(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              canSend ? "bg-sky-500 text-white hover:bg-sky-400" : "bg-white/15 text-white/50"
            )}
          >
            發送
          </button>
        </div>
      </form>
    </div>
  );
}
