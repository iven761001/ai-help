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
    <main className="min-h-screen flex items-center justify-center px-2 py-4">
      <div
        className={cx(
          "w-full max-w-4xl rounded-2xl flex flex-col md:flex-row overflow-hidden glass-card",
          "border border-sky-200/40 bg-white/75 backdrop-blur"
        )}
      >
        {/* 左側角色 */}
        <div className="md:w-1/3 glass-soft p-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10">
          <div className="w-full mb-3 flex items-center justify-center">
            <Avatar3D variant={user.avatar || "sky"} emotion={currentEmotion} />
          </div>

          <h2 className="text-lg font-semibold text-slate-800">{user.nickname}</h2>
          <p className="text-xs text-slate-600 text-center mt-1 px-4">
            你的專屬鍍膜＆清潔顧問，有關浴室、廚房、地板保養都可以問我。
          </p>
          <p className="mt-2 text-[11px] text-slate-500 text-center break-all">
            綁定信箱：{user.email}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 text-center">
            語氣設定：{voiceLabel(user.voice || "warm")}
          </p>
        </div>

        {/* 右側聊天 */}
        <div className="md:w-2/3 flex flex-col relative">
          {/* 回到選角按鈕 */}
          <button
            type="button"
            onClick={onBackToCreator}
            aria-label="回到選角"
            className="fixed z-[200] right-4 bottom-[calc(env(safe-area-inset-bottom)+92px)]
                       h-12 w-12 rounded-full bg-sky-600 text-white shadow-lg
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

          <div className="flex-1 flex flex-col p-4 space-y-2 overflow-y-auto max-h-[70vh]">
            {messages.length === 0 && (
              <div className="text-xs text-slate-500 text-center mt-10 whitespace-pre-wrap">
                跟 {user.nickname} 打聲招呼吧！{"\n"}
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
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-sky-600 text-white rounded-br-none"
                      : "bg-white/70 backdrop-blur text-slate-800 rounded-bl-none border border-slate-200/50"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/70 backdrop-blur text-slate-600 text-xs px-3 py-2 rounded-2xl rounded-bl-none border border-slate-200/50">
                  {user.nickname} 思考中⋯⋯
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={onSend}
            className="border-t border-slate-200/60 bg-white/55 backdrop-blur p-3 flex gap-2"
          >
            <input
              type="text"
              className="flex-1 border border-slate-200/70 bg-white/70 backdrop-blur rounded-full px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="輸入想問的問題，例如：地板有黃漬，要怎麼清比較安全？"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700 text-white text-sm px-4 py-2 rounded-full disabled:opacity-60"
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
