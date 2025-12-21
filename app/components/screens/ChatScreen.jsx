"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

const Avatar3D = dynamic(() => import("../avatar/Avatar3D"), { ssr: false });

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
  const [atBottom, setAtBottom] = useState(true);

  const bottomThreshold = 40;

  const onScrollList = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < bottomThreshold;
    setAtBottom(nearBottom);
  };

  // ✅ 新訊息來時：只有在使用者本來就接近底部，才自動滑到底
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!atBottom) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, atBottom]);

  const helperText = useMemo(() => {
    return `跟 ${user.nickname} 打聲招呼吧！
可以問：「浴室玻璃水垢怎麼清？」、「鍍膜後幾天不能用什麼清潔劑？」`;
  }, [user.nickname]);

  return (
    <main className="min-h-screen flex flex-col">
      {/* 上：模型舞台（沉浸式） */}
      <header className="px-4 pt-5 pb-3">
        <div className="mx-auto w-full max-w-4xl glass-card rounded-3xl p-3 relative">
          <button
            type="button"
            onClick={onBackToCreator}
            className="absolute right-3 top-3 h-11 w-11 rounded-full bg-white/10 border border-white/10 text-white/90 backdrop-blur active:scale-95 transition flex items-center justify-center"
            aria-label="回到選角"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <div className="md:col-span-1">
              <div className="aspect-square rounded-2xl glass-soft overflow-hidden">
                <Avatar3D variant={user.avatar || "sky"} emotion={currentEmotion} />
              </div>
            </div>

            <div className="md:col-span-2 px-2">
              <div className="text-lg font-semibold text-white">{user.nickname}</div>
              <div className="text-xs text-white/70 mt-1">
                綁定信箱：{user.email}
              </div>
              <div className="text-xs text-white/60 mt-1">
                語氣：{voiceLabel(user.voice || "warm")}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 中：訊息區（永遠在模型卡片下方，不往上蓋模型） */}
      <section className="flex-1 px-4 pb-3">
        <div className="mx-auto w-full max-w-4xl glass-card rounded-3xl overflow-hidden flex flex-col">
          <div
            ref={listRef}
            onScroll={onScrollList}
            className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {messages.length === 0 && (
              <div className="text-xs text-white/55 text-center mt-6 whitespace-pre-wrap">
                {helperText}
              </div>
            )}

            {messages.map((m, idx) => (
              <div key={idx} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cx(
                    "max-w-[86%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-sky-500/85 text-white rounded-br-none"
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
                  {user.nickname} 思考中⋯⋯
                </div>
              </div>
            )}
          </div>

          {/* 下：輸入區（固定在卡片底部，不會被訊息擠走） */}
          <form
            onSubmit={onSend}
            className="border-t border-white/10 p-3 flex gap-2 bg-black/10 backdrop-blur"
          >
            <input
              type="text"
              className="flex-1 rounded-full border border-white/12 bg-black/20 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="輸入想問的問題，例如：地板黃漬怎麼清比較安全？"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="rounded-full bg-sky-500 hover:bg-sky-400 text-white text-sm px-5 py-3 disabled:opacity-60 transition"
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

function voiceLabel(id) {
  if (id === "calm") return "冷靜條理";
  if (id === "energetic") return "活潑有精神";
  return "溫暖親切";
}
