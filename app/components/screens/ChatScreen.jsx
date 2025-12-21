"use client";

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
  currentEmotion, // 目前不在 HUD 用，但先保留
  onBackToCreator
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 上方留空：熊在 page.js 的世界層 */}
      <div className="flex-1" />

      {/* 下方 HUD：聊天面板（像 GPT 介面那樣穩定） */}
      <div
        className="
          relative z-20
          backdrop-blur-xl bg-white/5
          border-t border-white/10
          shadow-[0_-20px_40px_rgba(0,0,0,0.45)]
        "
      >
        {/* 回到選角按鈕 */}
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

        {/* 訊息區 */}
        <div className="px-4 pt-4 pb-3 max-h-[42vh] overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-xs text-white/60 text-center mt-6 whitespace-pre-wrap">
              跟 {user?.nickname || "小管家"} 打聲招呼吧！{"\n"}
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

        {/* 輸入列（鍵盤上來也比較穩） */}
        <form onSubmit={onSend} className="px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-2 flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-full px-4 py-3 text-sm outline-none
                       bg-black/20 text-white placeholder:text-white/40
                       border border-white/15 focus:ring-2 focus:ring-sky-400"
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
    </div>
  );
}
