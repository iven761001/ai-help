"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const scrollerRef = useRef(null);
  const endRef = useRef(null);

  // 使用者是否「貼近底部」
  const [stickToBottom, setStickToBottom] = useState(true);

  // 觀察 scroll：使用者上滑就取消 stick
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 80;
      setStickToBottom(nearBottom);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // 新訊息來時：只有 stick 才自動到底
  const msgLen = messages?.length || 0;
  useEffect(() => {
    if (!stickToBottom) return;
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [msgLen, loading, stickToBottom]);

  // Enter 送出
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend?.(e);
    }
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-2 py-3">
      <div className="w-full max-w-4xl flex flex-col gap-3">
        {/* 熊舞台 */}
        <div className="glass-card p-3">
          <div className="flex items-center justify-between">
            <div className="text-white/80 text-sm font-medium">{user.nickname}</div>

            <button
              type="button"
              onClick={onBackToCreator}
              className="h-10 w-10 rounded-full bg-white/10 border border-white/15
                         text-white/90 hover:bg-white/15 active:scale-95 transition
                         flex items-center justify-center"
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

          <div className="mt-2 rounded-2xl glass-soft overflow-hidden">
            <div className="h-[220px] sm:h-[260px]">
              <Avatar3D variant={user.avatar || "sky"} emotion={currentEmotion} mode="inline" />
            </div>
          </div>

          <div className="mt-2 text-[11px] text-white/55 flex items-center justify-between">
            <div className="truncate">綁定信箱：{user.email}</div>
            <div>語氣：{voiceLabel(user.voice || "warm")}</div>
          </div>
        </div>

        {/* Chat 區 */}
        <div
          className="glass-card p-3 flex flex-col"
          style={{
            height: `calc(100dvh - 24px - 280px - var(--kb, 0px))`,
            minHeight: 260
          }}
        >
          {/* 訊息卷軸 */}
          <div ref={scrollerRef} className="flex-1 overflow-y-auto no-scrollbar pr-1">
            {messages.length === 0 && (
              <div className="text-xs text-white/55 text-center mt-8 whitespace-pre-wrap">
                跟 {user.nickname} 打聲招呼吧！{"\n"}
                可以問：「浴室玻璃有水垢要怎麼清？」、
                「鍍膜後幾天不能用什麼清潔劑？」
              </div>
            )}

            <div className="space-y-2">
              {messages.map((m, idx) => (
                <div key={idx} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cx(
                      "max-w-[82%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-sky-500/90 text-white rounded-br-none"
                        : "bg-white/10 text-white/90 border border-white/10 rounded-bl-none"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 text-white/70 text-xs px-3 py-2 rounded-2xl border border-white/10 rounded-bl-none">
                    {user.nickname} 思考中⋯⋯
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          {/* 輸入列：永遠不被鍵盤遮 */}
          <form
            onSubmit={onSend}
            className="mt-3 flex gap-2"
            style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 6px)` }}
          >
            <input
              type="text"
              className="flex-1 rounded-full px-3 py-2 text-sm outline-none
                         border border-white/15 bg-black/20 text-white
                         placeholder:text-white/35 focus:ring-2 focus:ring-sky-400"
              placeholder="輸入想問的問題，例如：地板有黃漬，要怎麼清比較安全？"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
            />
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm font-medium
                         bg-sky-500/90 hover:bg-sky-400 text-white
                         disabled:opacity-60"
              disabled={loading}
            >
              發送
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function voiceLabel(id) {
  if (id === "calm") return "冷靜條理";
  if (id === "energetic") return "活潑有精神";
  return "溫暖親切";
}
