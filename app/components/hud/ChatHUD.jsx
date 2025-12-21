"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  onBackToCreator
}) {
  const scrollerRef = useRef(null);

  // 使用者是否「接近底部」
  const stickToBottomRef = useRef(true);

  // 給 UI 顯示「回到底部」按鈕
  const [showJump, setShowJump] = useState(false);

  const threshold = 90; // 距離底部多少 px 內算「在底部附近」

  const getDistToBottom = () => {
    const el = scrollerRef.current;
    if (!el) return 0;
    return el.scrollHeight - el.scrollTop - el.clientHeight;
  };

  const updateStickState = () => {
    const el = scrollerRef.current;
    if (!el) return;

    const dist = getDistToBottom();
    const nearBottom = dist < threshold;

    stickToBottomRef.current = nearBottom;
    setShowJump(!nearBottom);
  };

  const scrollToBottom = (behavior = "auto") => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // mount 時先同步一次狀態（避免第一次誤判）
  useEffect(() => {
    updateStickState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 新訊息來：只有在「原本在底部附近」才自動滑到底
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    if (!stickToBottomRef.current) return;

    // iOS/Android 有時候 render 後 scrollHeight 還會變
    // 用兩次 rAF 確保高度穩定後再捲到底
    requestAnimationFrame(() => {
      scrollToBottom("auto");
      requestAnimationFrame(() => scrollToBottom("auto"));
    });
  }, [messages.length, sending]);

  // 監聽 scroller 尺寸/內容高度變化（鍵盤、換行、loading bubble 出現）
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      // 如果使用者在底部附近，就維持貼底
      if (!stickToBottomRef.current) return;
      requestAnimationFrame(() => scrollToBottom("auto"));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const canSend = useMemo(() => !!input.trim() && !sending, [input, sending]);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSend) return;

    const text = input.trim();
    setInput("");

    // 使用者送出後：視為「想貼底」
    stickToBottomRef.current = true;
    setShowJump(false);

    await onSend(text);

    // 回傳後也貼底（避免回覆長字換行造成高度再變）
    requestAnimationFrame(() => {
      scrollToBottom("auto");
      requestAnimationFrame(() => scrollToBottom("auto"));
    });
  };

  return (
    <div
      className="
        h-full
        rounded-[28px]
        bg-white/10
        backdrop-blur-xl
        border border-white/15
        shadow-[0_-12px_50px_rgba(56,189,248,0.15)]
        overflow-hidden
        flex flex-col
        relative
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
          style={{ WebkitTapHighlightColor: "transparent" }}
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

      {/* ⬇ 回到底部（只有在使用者離底部時出現） */}
      {showJump && (
        <button
          type="button"
          onClick={() => {
            stickToBottomRef.current = true;
            setShowJump(false);
            scrollToBottom("auto");
          }}
          className="
            absolute right-4 bottom-[72px]
            rounded-full px-3 py-2 text-xs
            bg-white/10 border border-white/15
            text-white/90
            backdrop-blur
            active:scale-95 transition
          "
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          ⬇ 回到底部
        </button>
      )}

      {/* Input */}
      <form onSubmit={submit} className="px-4 pb-4 pt-2 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              // 使用者點到輸入框：若原本在底部附近，就保持貼底（避免鍵盤彈起後看不到最新訊息）
              if (getDistToBottom() < threshold) {
                stickToBottomRef.current = true;
                setShowJump(false);
                requestAnimationFrame(() => scrollToBottom("auto"));
              }
            }}
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
