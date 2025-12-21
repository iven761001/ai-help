"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

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
  const listRef = useRef(null);
  const stickToBottomRef = useRef(true);

  // 判斷使用者是否在底部
  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const threshold = 24;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  // 新訊息時：只有在「本來就在底部」才自動捲
  useEffect(() => {
    if (!listRef.current) return;
    if (stickToBottomRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  return (
    <main className="min-h-screen flex flex-col">
      {/* ===== 上方：角色世界（延續） ===== */}
      <section className="flex-1 flex items-center justify-center px-4 pt-6">
        <div className="w-full max-w-sm">
          <div className="glass-card rounded-3xl p-3">
            <div className="aspect-square rounded-2xl glass-soft flex items-center justify-center overflow-hidden">
              <Avatar3D
                variant={user.avatar || "sky"}
                element={user.element || "carbon"}   // ✅ 元素
                emotion={currentEmotion}
              />
            </div>

            <div className="mt-3 text-center">
              <div className="text-sm font-semibold text-slate-100">
                {user.nickname}
              </div>
              <div className="text-[11px] text-slate-400">
                你的專屬 AI 小管家
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 中段：聊天卷軸 ===== */}
      <section
        ref={listRef}
        onScroll={onScroll}
        className="
          flex-1 overflow-y-auto px-4 space-y-2
          pb-28
        "
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={cx(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cx(
                "max-w-[78%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-sky-500/90 text-white rounded-br-none"
                  : "bg-white/10 text-slate-100 rounded-bl-none backdrop-blur"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-xs text-slate-400">
            {user.nickname} 思考中⋯⋯
          </div>
        )}
      </section>

      {/* ===== 底部：輸入 HUD ===== */}
      <form
        onSubmit={onSend}
        className="
          fixed left-0 right-0 bottom-0 z-30
          px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]
        "
      >
        <div
          className="
            mx-auto max-w-4xl
            rounded-full
            bg-white/10 backdrop-blur-xl
            border border-white/15
            flex gap-2 p-2
          "
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="輸入想問的問題…"
            disabled={loading}
            className="
              flex-1 bg-transparent text-white
              px-3 py-2 text-sm outline-none
              placeholder:text-white/40
            "
          />
          <button
            type="submit"
            disabled={loading}
            className="
              shrink-0 rounded-full px-4 py-2
              bg-sky-500 text-white text-sm
              disabled:opacity-50
            "
          >
            發送
          </button>
        </div>
      </form>

      {/* ===== 回到選角 ===== */}
      <button
        onClick={onBackToCreator}
        className="
          fixed right-4 bottom-28 z-40
          h-12 w-12 rounded-full
          bg-sky-500 text-white
          flex items-center justify-center
          shadow-lg active:scale-95
        "
        aria-label="回到選角"
      >
        ←
      </button>
    </main>
  );
}
