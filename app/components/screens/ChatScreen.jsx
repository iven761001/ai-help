"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import useKeyboardInset from "../../hooks/useKeyboardInset";

const Avatar3D = dynamic(() => import("../Avatar3D"), { ssr: false });

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function ChatScreen({
  user,
  messages,
  loading,
  input,
  setInput,
  onSend,
  currentEmotion,
  onBackToCreator
}) {
  const kb = useKeyboardInset();

  // ✅ 讓訊息區「像 ChatGPT」：有條件地自動跟到底
  const listRef = useRef(null);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);

  // 判斷是否「接近底部」：小於這個距離就視為在底部（px）
  const BOTTOM_EPS = 36;

  const scrollToBottom = (behavior = "auto") => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // ✅ 使用者手動捲動時：更新 pinned 狀態
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setIsPinnedToBottom(distanceToBottom < BOTTOM_EPS);
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    // 初始化判定一次
    onScroll();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  // ✅ 新訊息來了：只有在 pinned 時才自動跟到底
  useEffect(() => {
    if (!isPinnedToBottom) return;
    // 用 rAF 避免 DOM 還沒更新 scrollHeight
    requestAnimationFrame(() => scrollToBottom("smooth"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, loading, isPinnedToBottom]);

  // ✅ 鍵盤升起：如果本來 pinned，就把底部跟上去（避免輸入時卡住）
  useEffect(() => {
    if (!isPinnedToBottom) return;
    requestAnimationFrame(() => scrollToBottom("auto"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kb]);

  const showJumpBtn = !isPinnedToBottom;

  return (
    <main className="h-[100dvh] w-full">
      <div className="h-full w-full max-w-4xl mx-auto flex flex-col px-2 py-2">
        {/* ===== ① 模型舞台（固定在上方） ===== */}
        <section className="flex-shrink-0">
          <div className="relative rounded-2xl overflow-hidden glass-card">
            <div className="h-[34dvh] min-h-[240px] max-h-[360px]">
              <Avatar3D
                variant={user?.avatar || "sky"}
                emotion={currentEmotion}
                mode="inline"
              />
            </div>

            <div className="absolute left-3 top-3 z-10">
              <div className="px-3 py-2 rounded-2xl bg-black/25 border border-white/10 backdrop-blur">
                <div className="text-sm font-semibold text-white">
                  {user?.nickname || "AI"}
                </div>
                <div className="text-[11px] text-white/70">
                  語氣：{voiceLabel(user?.voice || "warm")}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onBackToCreator}
              aria-label="回到選角"
              className="absolute right-3 top-3 z-20 h-11 w-11 rounded-full
                         bg-sky-500/90 text-white border border-white/15 shadow-lg
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
          </div>
        </section>

        {/* ===== ② 訊息區（只在這裡滾） ===== */}
        <section className="flex-1 min-h-0 mt-2 rounded-2xl overflow-hidden glass-soft border border-white/10 relative">
          <div
            ref={listRef}
            className="h-full overflow-y-auto px-3 py-3 space-y-2"
          >
            {messages.length === 0 && (
              <div className="text-xs text-white/60 text-center mt-6 whitespace-pre-wrap">
                跟 {user?.nickname} 打聲招呼吧！{"\n"}
                可以問：「浴室玻璃有水垢要怎麼清？」、
                「鍍膜後幾天不能用什麼清潔劑？」
              </div>
            )}

            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cx(
                    "max-w-[84%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-sky-500/90 text-white rounded-br-none"
                      : "bg-white/10 text-white border border-white/10 rounded-bl-none backdrop-blur"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-white/70 text-xs px-3 py-2 rounded-2xl rounded-bl-none border border-white/10 backdrop-blur">
                  {user?.nickname} 思考中⋯⋯
                </div>
              </div>
            )}

            {/* 這個 spacer 讓最後一則訊息不會貼死底 */}
            <div className="h-2" />
          </div>

          {/* ✅ ↓ 回到底部（只有離底部時顯示） */}
          {showJumpBtn && (
            <button
              type="button"
              onClick={() => {
                scrollToBottom("smooth");
                setIsPinnedToBottom(true);
              }}
              className="absolute right-3 bottom-3 z-20
                         rounded-full px-3 py-2 text-xs font-semibold
                         bg-black/35 text-white border border-white/10 backdrop-blur
                         hover:bg-black/45 active:scale-95 transition"
            >
              ↓ 回到底部
            </button>
          )}
        </section>

        {/* ===== ③ InputBar（貼鍵盤上緣） ===== */}
        <section
          className="flex-shrink-0 mt-2"
          style={{
            paddingBottom: `calc(env(safe-area-inset-bottom) + ${kb}px)`
          }}
        >
          <form
            onSubmit={(e) => {
              onSend(e);
              // 送出後：如果你本來就在底部，就保持跟隨到底（ChatGPT 感）
              requestAnimationFrame(() => scrollToBottom("smooth"));
            }}
            className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur px-3 py-3"
          >
            <div className="flex gap-2 items-center">
              <input
                type="text"
                className="flex-1 rounded-full px-4 py-2 text-sm outline-none
                           bg-white/10 text-white border border-white/10
                           placeholder:text-white/45
                           focus:ring-2 focus:ring-sky-400/60"
                placeholder="輸入想問的問題，例如：地板有黃漬，要怎麼清比較安全？"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className="rounded-full px-4 py-2 text-sm font-medium
                           bg-sky-500/90 text-white border border-white/10
                           hover:bg-sky-400/90 active:scale-95 transition
                           disabled:opacity-60"
                disabled={loading}
              >
                發送
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function voiceLabel(id) {
  if (id === "calm") return "冷靜條理";
  if (id === "energetic") return "活潑有精神";
  return "溫暖親切";
}
