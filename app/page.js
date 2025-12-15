"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import CompassCreator from "./components/CompassCreator/CompassCreator";

const Avatar3D = dynamic(() => import("./components/Avatar3D"), { ssr: false });

function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function HomePage() {
  const [phase, setPhase] = useState("loading"); // loading / bindEmail / create / chat
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentEmotion, setCurrentEmotion] = useState("idle");

  // 創角資料（交給羅盤）
  const [draft, setDraft] = useState({
    email: "",
    avatar: "sky",
    color: "sky",
    voice: "warm",
    nickname: ""
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("ai-helper-user");
    if (saved) {
      const parsed = JSON.parse(saved);
      setUser(parsed);
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

  const handleDoneCreate = () => {
    const profile = {
      email: draft.email,
      nickname: (draft.nickname || "").trim(),
      avatar: draft.avatar || draft.color || "sky",
      voice: draft.voice || "warm"
    };
    if (!profile.nickname || !profile.email) return;

    setUser(profile);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ai-helper-user", JSON.stringify(profile));
    }

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

    setPhase("chat");
  };

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

      if (data.emotion) setCurrentEmotion(data.emotion);
      else setCurrentEmotion("idle");
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

  if (phase === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-slate-500">小管家準備中⋯⋯</div>
      </main>
    );
  }

  // 綁定 Email
  if (phase === "bindEmail") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h1 className="text-2xl font-bold text-slate-800 text-center">
            南膜工坊 AI 小管家
          </h1>
          <p className="text-sm text-slate-500 text-center">
            先綁定你的 Email，接下來會幫你客製專屬的小管家角色。
          </p>

          <form onSubmit={handleEmailSubmit} className="space-y-4 mt-4">
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

            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 rounded-lg text-sm"
            >
              下一步：塑造我的 AI 角色
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center">
            之後再掃同一個 QR Code，系統會記得你的角色設定。
          </p>
        </div>
      </main>
    );
  }

  // 創角：上方預覽 + 底部固定羅盤
  if (phase === "create") {
    return (
      <main className="min-h-screen bg-slate-50">
        {/* 上方：角色預覽區（留底部空間給羅盤） */}
        <div className="px-4 pt-6 pb-40 max-w-4xl mx-auto">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 text-center">
            客製你的專屬 AI 小管家
          </h1>
          <p className="text-xs md:text-sm text-slate-500 text-center mt-2">
            用底部「高科技羅盤」依序選顏色、個性、名字。
          </p>

          <div className="mt-6 flex items-center justify-center">
            <div className="w-full max-w-sm">
              <div className="rounded-3xl bg-white shadow-lg border border-sky-100 p-3">
                <div className="aspect-square rounded-2xl bg-sky-50 flex items-center justify-center overflow-hidden">
                  <Avatar3D variant={draft.avatar || draft.color || "sky"} emotion="idle" />
                </div>

                <div className="mt-3 space-y-1 px-2 pb-1">
                  <div className="text-sm font-semibold text-slate-800">
                    預覽：{draft.nickname ? `「${draft.nickname}」` : "尚未命名"}
                  </div>
                  <div className="text-xs text-slate-500">
                    顏色：{avatarLabel(draft.color || draft.avatar)}／聲線：{voiceLabel(draft.voice)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    完成後會自動進入對話模式
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部羅盤（固定） */}
        <CompassCreator
          value={draft}
          onChange={(v) => setDraft(v)}
          onDone={handleDoneCreate}
          disabled={false}
        />
      </main>
    );
  }

  // 聊天室
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-slate-500">資料載入中⋯⋯</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-2 py-4 bg-slate-50">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg flex flex-col md:flex-row overflow-hidden">
        <div className="md:w-1/3 bg-sky-50 p-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-sky-100">
          <div className="w-full mb-3 flex items-center justify-center">
            <Avatar3D variant={user.avatar || "sky"} emotion={currentEmotion} />
          </div>

          <h2 className="text-lg font-semibold text-slate-800">{user.nickname}</h2>
          <p className="text-xs text-slate-500 text-center mt-1 px-4">
            你的專屬鍍膜＆清潔顧問，有關浴室、廚房、地板保養都可以問我。
          </p>
          <p className="mt-2 text-[11px] text-slate-400 text-center break-all">
            綁定信箱：{user.email}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 text-center">
            語氣設定：{voiceLabel(user.voice || "warm")}
          </p>
        </div>

        <div className="md:w-2/3 flex flex-col">
          <div className="flex-1 flex flex-col p-4 space-y-2 overflow-y-auto max-h-[70vh]">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={classNames("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={classNames(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-sky-600 text-white rounded-br-none"
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

          <form onSubmit={handleSend} className="border-t border-slate-200 p-3 flex gap-2">
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

function avatarLabel(id) {
  if (id === "mint") return "薄荷綠";
  if (id === "purple") return "紫色";
  return "天空藍";
}

function voiceLabel(id) {
  if (id === "calm") return "冷靜條理";
  if (id === "energetic") return "活潑有精神";
  return "溫暖親切";
}
