"use client";

import dynamic from "next/dynamic";
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
  const kb = useKeyboardInset(); // ✅ 鍵盤高度(px)

  return (
    // ✅ 用 100dvh（動態視窗高度）比 100vh 穩
    <main className="h-[100dvh] w-full">
      <div className="h-full w-full max-w-4xl mx-auto flex flex-col px-2 py-2">
        {/* ===== ① 模型舞台（固定在上方，不被訊息遮） ===== */}
        <section className="flex-shrink-0">
          <div className="relative rounded-2xl overflow-hidden glass-card">
            {/* 舞台高度：你可調整這裡 */}
            <div className="h-[34dvh] min-h-[240px] max-h-[360px]">
              <Avatar3D
                variant={user?.avatar || "sky"}
                emotion={currentEmotion}
                mode="inline"
              />
            </div>

            {/* 左上資訊 */}
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

            {/* 回到選角 */}
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

        {/* ===== ② 訊息區（永遠在舞台下方滾動） ===== */}
        {/* ✅ min-h-0 是關鍵：讓 overflow 容器真的能滾，不會被撐爆 */}
        <section className="flex-1 min-h-0 mt-2 rounded-2xl overflow-hidden glass-soft border border-white/10">
          <MessageList messages={messages} user={user} loading={loading} />
        </section>

        {/* ===== ③ InputBar（永遠貼鍵盤上緣） ===== */}
        {/* ✅ 用 kb 把整條 input 推上來，避免被鍵盤蓋住 */}
        <section
          className="flex-shrink-0 mt-2"
          style={{
            paddingBottom: `calc(env(safe-area-inset-bottom) + ${kb}px)`
          }}
        >
          <form
            onSubmit={onSend}
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

function MessageList({ messages, user, loading }) {
  return (
    <div className="h-full overflow-y-auto px-3 py-3 space-y-2">
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
    </div>
  );
}

function voiceLabel(id) {
  if (id === "calm") return "冷靜條理";
  if (id === "energetic") return "活潑有精神";
  return "溫暖親切";
        }
