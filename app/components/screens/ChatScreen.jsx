"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
  const [bottomInset, setBottomInset] = useState(0);
  const [composerH, setComposerH] = useState(0);

  const composerRef = useRef(null);
  const listRef = useRef(null);

  // ✅ 鍵盤 / 視窗變化：visualViewport 計算底部遮擋
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const inset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop)
      );
      setBottomInset(inset);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // ✅ 量輸入列高度（含 padding/border）
  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const emit = () => {
      const h = Math.round(el.getBoundingClientRect().height || 0);
      setComposerH(h);
    };

    emit();
    const ro = new ResizeObserver(() => requestAnimationFrame(emit));
    ro.observe(el);

    window.addEventListener("resize", emit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", emit);
    };
  }, []);

  // ✅ 自動滾到底（鍵盤彈出 / 新訊息 / loading）
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // 用 rAF 等 layout 更新完再滾
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages.length, loading, bottomInset, composerH]);

  const listPadBottom = Math.max(0, composerH + bottomInset + 16);

  return (
    <main className="min-h-screen flex items-center justify-center px-2 py-4">
      <div className="w-full max-w-4xl rounded-2xl shadow-lg flex flex-col md:flex-row overflow-hidden relative glass-card">
        {/* 左側角色 */}
        <div className="md:w-1/3 glass-soft p-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10">
          <div className="w-full mb-3 flex items-center justify-center">
            <Avatar3D variant={user.avatar || "sky"} emotion={currentEmotion} />
          </div>

          <h2 className="text-lg font-semibold text-white">{user.nickname}</h2>
          <p className="text-xs text-white/70 text-center mt-1 px-4">
            你的專屬鍍膜＆清潔顧問，有關浴室、廚房、地板保養都可以問我。
          </p>
          <p className="mt-2 text-[11px] text-white/60 text-center break-all">
            綁定信箱：{user.email}
          </p>
          <p className="mt-1 text-[11px] text-white/60 text-center">
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

          {/* 訊息列表：底部永遠讓位給 composer + 鍵盤 */}
          <div
            ref={listRef}
            className="flex-1 flex flex-col p-4 space-y-2 overflow-y-auto"
            style={{ paddingBottom: listPadBottom }}
          >
            {messages.length === 0 && (
              <div className="text-xs text-white/60 text-center mt-10 whitespace-pre-wrap">
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
                      : "bg-white/10 text-white rounded-bl-none border border-white/10"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 border border-white/10 text-white/80 text-xs px-3 py-2 rounded-2xl rounded-bl-none">
                  {user.nickname} 思考中⋯⋯
                </div>
              </div>
            )}
          </div>

          {/* 輸入列：fixed 在底部 + 鍵盤推上來 */}
          <div
            ref={composerRef}
            className="fixed left-0 right-0 z-[120] md:static md:z-auto"
            style={{
              bottom: 0,
              transform: bottomInset ? `translateY(-${bottomInset}px)` : undefined,
              willChange: "transform"
            }}
          >
            <form
              onSubmit={onSend}
              className="border-t border-white/10 bg-black/30 backdrop-blur-xl p-3 flex gap-2 md:rounded-none"
            >
              <input
                type="text"
                className="flex-1 rounded-full border border-white/15 bg-black/20 text-white px-4 py-2 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-sky-400"
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

          {/* ✅ 讓 md:static 時不要被 fixed composer 影響 */}
          <div className="md:hidden" style={{ height: composerH }} />
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
