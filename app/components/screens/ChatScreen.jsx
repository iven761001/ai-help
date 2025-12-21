"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

// ✅ 跟 CreateScreen 完全同高度
const HUD_H = 360;

export default function ChatScreen({
  user,
  messages,
  loading,
  input,
  setInput,
  onSend,
  currentEmotion, // 可留著
  onBackToCreator
}) {
  const listRef = useRef(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const showJump = useMemo(() => !isAtBottom && messages.length > 0, [isAtBottom, messages.length]);

  const scrollToBottom = (behavior = "smooth") => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // 判斷使用者是否在底部
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const threshold = 80;
        const atBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) <= threshold;
        setIsAtBottom(atBottom);
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  // 新訊息來：只有在底部才滑到底
  useEffect(() => {
    if (isAtBottom) requestAnimationFrame(() => scrollToBottom("smooth"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // thinking bubble：同樣遵守規則
  useEffect(() => {
    if (loading && isAtBottom) requestAnimationFrame(() => scrollToBottom("smooth"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <main className="min-h-screen flex flex-col">
      {/* 上方留空：熊在 page.js 的世界層 */}
      <div style={{ height: `calc(100vh - ${HUD_H}px)` }} />

      {/* ===== 下方聊天 HUD（固定高度）===== */}
      <section
        className="relative z-20"
        style={{
          height: `${HUD_H}px`
        }}
      >
        <div
          className="
            h-full
            backdrop-blur-xl bg-white/5
            border-t border-white/10
            shadow-[0_-20px_40px_rgba(0,0,0,0.45)]
            flex flex-col
          "
        >
          {/* 回到選角按鈕（貼在 HUD 上緣） */}
          <button
            type="button"
            onClick={onBackToCreator}
            aria-label="回到選角"
            className="absolute z-[200] right-4 -top-16
                       h-12 w-12 rounded-full bg-sky-500 text-white shadow-lg
                       active:scale-95 transition flex items-center justify-center"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* 訊息區（在 HUD 內滾動） */}
          <div className="relative flex-1 px-4 pt-4 pb-2 overflow-hidden">
            <div
              ref={listRef}
              className="h-full overflow-y-auto pr-1"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {messages.length === 0 && (
                <div className="text-xs text-white/60 text-center mt-6 whitespace-pre-wrap">
                  跟 {user?.nickname || "小管家"} 打聲招呼吧！{"\n"}
                  可以問：「浴室玻璃有水垢要怎麼清？」、
                  「鍍膜後幾天不能用什麼清潔劑？」
                </div>
              )}

              <div className="space-y-2 pb-2">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cx(
                        "max-w-[82%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                        m.role === "user"
                          ? "bg-sky-500 text-white rounded-br-none"
                          : "bg-white/10 text-white/90 rounded-bl-none border border-white/10"
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-white/70 text-xs px-3 py-2 rounded-2xl rounded-bl-none border border-white/10">
                      {user?.nickname || "小管家"} 思考中⋯⋯
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 回到底部 */}
            {showJump && (
              <button
                type="button"
                onClick={() => scrollToBottom("smooth")}
                className="
                  absolute right-3 bottom-3
                  rounded-full px-3 py-2 text-xs
                  bg-sky-500/90 text-white
                  shadow-lg border border-white/10
                  active:scale-95 transition
                "
              >
                ⬇︎ 新訊息
              </button>
            )}
          </div>

          {/* 輸入列（固定在 HUD 底部） */}
          <form
            onSubmit={(e) => {
              onSend?.(e);
              requestAnimationFrame(() => {
                if (isAtBottom) scrollToBottom("smooth");
              });
            }}
            className="px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-2 flex gap-2"
          >
            <input
              type="text"
              className="
                flex-1 rounded-full px-4 py-3 text-sm outline-none
                bg-black/20 text-white placeholder:text-white/40
                border border-white/15 focus:ring-2 focus:ring-sky-400
              "
              placeholder="輸入想問的問題，例如：地板有黃漬，要怎麼清比較安全？"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="bg-sky-500 hover:bg-sky-400 text-white text-sm px-5 py-3 rounded-full disabled:opacity-60"
              disabled={loading}
            >
              發送
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
