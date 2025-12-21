"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

import BindEmailScreen from "./components/screens/BindEmailScreen";
import CreateScreen from "./components/screens/CreateScreen";
import TechBackground from "./components/global/TechBackground";
import { loadUser, saveUser } from "./lib/storage";

const Avatar3D = dynamic(() => import("./components/Avatar3D"), { ssr: false });

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function HomePage() {
  const [phase, setPhase] = useState("loading"); // loading / bindEmail / create / chat
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");

  // 創角資料
  const [draft, setDraft] = useState({
    email: "",
    avatar: "sky",
    color: "sky",
    voice: "warm",
    nickname: ""
  });

  // 聊天狀態（放 page.js 統一管理）
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState("idle");

  // ✅ 新訊息自動到底（但使用者在看舊訊息不強制拉回）
  const listRef = useRef(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  // init
  useEffect(() => {
    const saved = loadUser();
    if (saved) {
      setUser(saved);
      setPhase("chat");
    } else {
      setPhase("bindEmail");
    }
  }, []);

  // Email 綁定 -> 進創角
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setDraft((p) => ({ ...p, email }));
    setPhase("create");
  };

  // 創角完成 -> 進聊天室
  const handleDoneCreate = () => {
    const profile = {
      email: draft.email,
      nickname: (draft.nickname || "").trim(),
      avatar: draft.avatar || draft.color || "sky",
      voice: draft.voice || "warm"
    };
    if (!profile.nickname || !profile.email) return;

    setUser(profile);
    saveUser(profile);

    const voiceHint =
      profile.voice === "warm"
        ? "我會用比較溫暖、親切的口氣跟你說明唷～"
        : profile.voice === "calm"
        ? "我會盡量講得冷靜、條理分明，讓你一眼就看懂。"
        : "我會用比較活潑、有精神的方式跟你分享保養技巧！";

    setMessages([
      {
        role: "assistant",
        content: `嗨，我是「${profile.nickname}」。\n\n之後有浴室、廚房、地板、玻璃鍍膜與清潔的問題，都可以直接問我～\n\n${voiceHint}`
      }
    ]);

    // ✅ 面板轉場：轉輪往下退、聊天往上升
    setPhase("chat");
  };

  // 聊天送出
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setCurrentEmotion("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          nickname: user.nickname,
          email: user.email,
          avatar: user.avatar,
          voice: user.voice
        })
      });

      const data = await res.json();
      const reply = {
        role: "assistant",
        content: data.reply || "不好意思，我剛剛有點當機，再問我一次可以嗎？"
      };
      setMessages((prev) => [...prev, reply]);
      setCurrentEmotion(data.emotion ? data.emotion : "idle");
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "現在系統好像有點忙碌，稍後再試一次看看～" }
      ]);
      setCurrentEmotion("idle");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 聊天頁回到選角（修好按鈕沒功能）
  const handleBackToCreator = () => {
    if (!user) return;

    setDraft((p) => ({
      ...p,
      email: user.email || p.email,
      nickname: user.nickname || p.nickname,
      voice: user.voice || p.voice,
      avatar: user.avatar || p.avatar,
      color: user.avatar || p.color
    }));

    setPhase("create");
  };

  // ✅ 聊天卷軸：使用者往上看舊訊息就暫停自動捲到底
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onScroll = () => {
      const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 80;
      setStickToBottom(nearBottom);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ✅ 有新訊息時：只有在「貼底」狀態才自動捲到底
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!stickToBottom) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, stickToBottom]);

  // ============ render ============
  if (phase === "loading") {
    return (
      <TechBackground>
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-sm text-white/70">小管家準備中⋯⋯</div>
        </main>
      </TechBackground>
    );
  }

  if (phase === "bindEmail") {
    return (
      <TechBackground>
        <BindEmailScreen email={email} setEmail={setEmail} onSubmit={handleEmailSubmit} />
      </TechBackground>
    );
  }

  // ✅ create/chat 共用一個「上方熊舞台」
  const avatarVariant = useMemo(() => {
    if (phase === "create") return draft.avatar || draft.color || "sky";
    return user?.avatar || "sky";
  }, [phase, draft.avatar, draft.color, user?.avatar]);

  const avatarName = useMemo(() => {
    if (phase === "create") return (draft.nickname || "").trim();
    return (user?.nickname || "").trim();
  }, [phase, draft.nickname, user?.nickname]);

  return (
    <TechBackground>
      <main className="min-h-screen flex flex-col">
        {/* ===== 上方：角色舞台（永遠固定，不會被聊天擠走） ===== */}
        <section className="px-4 pt-5">
          <div className="mx-auto w-full max-w-4xl">
            <div className="glass-card rounded-3xl p-3">
              <div className="aspect-[16/10] rounded-2xl glass-soft overflow-hidden flex items-center justify-center">
                <Avatar3D
                  variant={avatarVariant}
                  emotion={phase === "chat" ? currentEmotion : "idle"}
                  mode="inline"
                />
              </div>

              <div className="mt-3 px-2 pb-1 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {avatarName ? `「${avatarName}」` : "尚未命名"}
                  </div>
                  <div className="text-[11px] text-white/70">
                    {phase === "create" ? "在下方設定角色" : "在下方開始聊天"}
                  </div>
                </div>

                {/* ✅ 聊天頁的回上一頁按鈕（真正有功能） */}
                {phase === "chat" && (
                  <button
                    type="button"
                    onClick={handleBackToCreator}
                    className="shrink-0 rounded-full bg-white/10 border border-white/15 text-white px-4 py-2 text-sm active:scale-95 transition"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    回到選角
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===== 下方：面板區（轉場：選角往下退 / 聊天往上升） ===== */}
        <section className="relative flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <div className="mx-auto w-full max-w-4xl h-full relative">
            {/* Create Panel */}
            <div
              className={cx(
                "absolute inset-0 transition-transform duration-300 ease-out",
                phase === "create" ? "translate-y-0 opacity-100" : "translate-y-[110%] opacity-0 pointer-events-none"
              )}
            >
              <CreateScreen draft={draft} setDraft={setDraft} onDone={handleDoneCreate} />
            </div>

            {/* Chat Panel */}
            <div
              className={cx(
                "absolute inset-0 transition-transform duration-300 ease-out",
                phase === "chat" ? "translate-y-0 opacity-100" : "translate-y-[110%] opacity-0 pointer-events-none"
              )}
            >
              {/* ✅ 聊天區塊：高度永遠只佔下方面板，不會蓋到熊 */}
              <div className="h-full flex flex-col glass-card rounded-3xl overflow-hidden">
                <div
                  ref={listRef}
                  className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {messages.length === 0 && (
                    <div className="text-xs text-white/60 text-center mt-10 whitespace-pre-wrap">
                      跟 {user?.nickname || "小管家"} 打聲招呼吧！{"\n"}
                      可以問：「浴室玻璃有水垢要怎麼清？」、
                      「鍍膜後幾天不能用什麼清潔劑？」
                    </div>
                  )}

                  {messages.map((m, idx) => (
                    <div key={idx} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cx(
                          "max-w-[86%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                          m.role === "user"
                            ? "bg-sky-500/90 text-white rounded-br-none"
                            : "bg-white/10 text-white rounded-bl-none border border-white/10"
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

                {/* ✅ 輸入區固定在面板底部，不被鍵盤/訊息擠掉 */}
                <form onSubmit={handleSend} className="border-t border-white/10 p-3 flex gap-2 bg-black/10">
                  <input
                    type="text"
                    className="flex-1 rounded-full px-3 py-2 text-sm outline-none bg-black/20 text-white placeholder:text-white/40 border border-white/10 focus:ring-2 focus:ring-sky-400"
                    placeholder="輸入想問的問題，例如：地板有黃漬，要怎麼清比較安全？"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="bg-sky-500 hover:bg-sky-400 text-white text-sm px-4 py-2 rounded-full disabled:opacity-60"
                    disabled={loading}
                  >
                    發送
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
    </TechBackground>
  );
                      }
