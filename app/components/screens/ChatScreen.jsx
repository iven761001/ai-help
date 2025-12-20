"use client";

import dynamic from "next/dynamic";

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
  return (
    // ✅ 100svh：行動裝置鍵盤最穩（比 min-h-screen 更適合）
    <main className="h-[100svh] flex flex-col px-2 py-3">
      {/* ✅ 外框卡片（沉浸感 + 不會被鍵盤搞爛） */}
      <div className="w-full max-w-4xl mx-auto flex-1 rounded-2xl overflow-hidden relative">
        {/* ===== ① 安全舞台：模型永遠在、只會「縮」不會「跳/卡」 ===== */}
        <section
          className={cx(
            "relative flex-shrink-0",
            // 你可以調整這兩個比例，決定模型舞台佔畫面多少
            "min-h-[34svh] max-h-[52svh]"
          )}
        >
          {/* 舞台底板（玻璃感，避免深色背景時外框太硬） */}
          <div className="absolute inset-0 glass-soft" />

          {/* 模型 */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* ✅ 這裡用 inline 模式（嵌入舞台）讓它不受鍵盤影響 */}
            <div className="w-full h-full">
              <Avatar3D
                variant={user?.avatar || "sky"}
                emotion={currentEmotion}
                mode="inline"
              />
            </div>
          </div>

          {/* 左上角：角色資訊（可留可刪） */}
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

          {/* ✅ 回到選角按鈕：固定在舞台右上，不跟鍵盤打架 */}
          <button
            type="button"
            onClick={onBackToCreator}
            aria-label="回到選角"
            className="absolute right-3 top-3 z-20 h-11 w-11 rounded-full
                       bg-sky-500/90 text-white border border-white/15
                       shadow-lg active:scale-95 transition
                       flex items-center justify-center"
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
        </section>

        {/* ===== ② 聊天區：允許被鍵盤擠壓、可以 scroll ===== */}
        <section className="flex-1 flex flex-col">
          {/* 訊息列表 */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
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

          {/* ===== ③ InputBar：不要自己算鍵盤高度（這樣最不會卡） ===== */}
          <form
            onSubmit={onSend}
            className="shrink-0 px-3 py-3 border-t border-white/10 bg-black/15 backdrop-blur"
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

            {/* ✅ iPhone 底部安全區 */}
            <div className="h-[calc(env(safe-area-inset-bottom))]" />
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
