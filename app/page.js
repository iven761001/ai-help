"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

const Avatar3D = dynamic(() => import("./components/Avatar3D"), {
  ssr: false
});

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 載入 localStorage 的使用者資料
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("ai-helper-user");
    if (saved) {
      setUser(JSON.parse(saved));
    }
  }, []);

  const handleRegister = (e) => {
    e.preventDefault();
    if (!email || !nickname) return;

    const profile = { email, nickname };
    setUser(profile);

    if (typeof window !== "undefined") {
      window.localStorage.setItem("ai-helper-user", JSON.stringify(profile));
    }

    setMessages([
      {
        role: "assistant",
        content: `嗨，我是「${nickname}」，你的專屬鍍膜＆清潔小管家，有任何浴室、廚房、地板保養問題都可以問我喔！`
      }
    ]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage = {
      role: "user",
      content: input.trim()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          nickname: user.nickname,
          email: user.email
        })
      });

      const data = await res.json();
      const reply = {
        role: "assistant",
        content:
          data.reply || "不好意思，我剛剛有點當機，再問我一次可以嗎？"
      };

      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "現在系統好像有點忙碌，稍後再試一次看看～"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 還沒綁定 email / 暱稱 → 顯示初始畫面
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h1 className="text-2xl font-bold text-slate-800 text-center">
            南膜工坊 AI 小管家
          </h1>
          <p className="text-sm text-slate-500 text-center">
            建立你的專屬 AI 角色，之後有鍍膜、清潔問題，
            掃 QR Code 回來問它就可以。
          </p>
          <form onSubmit={handleRegister} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                你的 Email
              </label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                幫你的 AI 取個暱稱
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="例如：小護膜、阿膜、浴室管家"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 rounded-lg text-sm"
            >
              建立我的 AI 小管家
            </button>
          </form>
          <p className="text-xs text-slate-400 text-center">
            之後再掃一次同一個 QR Code，輸入同一個 Email，
            或同一台裝置打開，都會回到你的 AI。
          </p>
        </div>
      </main>
    );
  }

  // 已有 user → 顯示聊天畫面
  return (
    <main className="min-h-screen flex items-center justify-center px-2 py-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg flex flex-col md:flex-row overflow-hidden">
        {/* 左側：AI 角色區 */}
        <div className="md:w-1/3 bg-sky-50 p-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-sky-100">
          <div className="w-full mb-3 flex items-center justify-center">
  <Avatar3D />
</div>
          <h2 className="text-lg font-semibold text-slate-800">
            {user.nickname}
          </h2>
          <p className="text-xs text-slate-500 text-center mt-1 px-4">
            你的專屬鍍膜＆清潔顧問，有關浴室、廚房、地板保養都可以問我。
          </p>
          <p className="mt-3 text-[11px] text-slate-400 text-center break-all">
            綁定信箱：{user.email}
          </p>
        </div>

        {/* 右側：聊天區 */}
        <div className="md:w-2/3 flex flex-col">
          <div className="flex-1 flex flex-col p-4 space-y-2 overflow-y-auto max-h-[70vh]">
            {messages.length === 0 && (
              <div className="text-xs text-slate-400 text-center mt-10">
                跟 {user.nickname} 打聲招呼吧，{"\n"}
                可以問：「浴室玻璃有水垢要怎麼清？」、
                「鍍膜後幾天不能用什麼清潔劑？」
              </div>
            )}

            {messages.map((m, idx) => (
              <div
                key={idx}
                className={classNames(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={classNames(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-sky-500 text-white rounded-br-none"
                      : "bg-slate-100 text-slate-800 rounded-bl-none"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-500 text-xs px-3 py-2 rounded-2xl rounded-bl-none">
                  {user.nickname} 思考中⋯⋯
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="border-t border-slate-200 p-3 flex gap-2"
          >
            <input
              type="text"
              className="flex-1 border rounded-full px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="輸入想問的問題，例如：地板有黃漬，要怎麼清比較安全？"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="bg-sky-500 hover:bg-sky-600 text-white text-sm px-4 py-2 rounded-full disabled:opacity-60"
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
