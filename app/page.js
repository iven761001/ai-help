"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Avatar3D = dynamic(() => import("./components/Avatar3D"), {
  ssr: false
});

function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function HomePage() {
  const [phase, setPhase] = useState("loading"); // loading / bindEmail / create / chat
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");

  // 創角用狀態
  const [selectedAvatar, setSelectedAvatar] = useState("sky");
  const [selectedVoice, setSelectedVoice] = useState("warm"); // warm / calm / energetic

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 讀取 localStorage：如果有紀錄，就直接進聊天室
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

  // 送出 Email → 進入創角畫面
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setPhase("create");
  };

  // 創角完成：選球＋聲線＋暱稱 → 建立 user → 進聊天室
  const handleCreateCharacter = (e) => {
    e.preventDefault();
    if (!nicknameInput || !email) return;

    const profile = {
      email,
      nickname: nicknameInput,
      avatar: selectedAvatar,
      voice: selectedVoice
    };

    setUser(profile);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ai-helper-user", JSON.stringify(profile));
    }

    // 給一段開場白
    let voiceHint = "";
    if (selectedVoice === "warm") {
      voiceHint = "我會用比較溫暖、親切的口氣跟你說明唷～";
    } else if (selectedVoice === "calm") {
      voiceHint = "我會盡量講得冷靜、條理分明，讓你一眼就看懂。";
    } else if (selectedVoice === "energetic") {
      voiceHint = "我會用比較活潑、有精神的方式跟你分享保養技巧！";
    }

    setMessages([
      {
        role: "assistant",
        content: `嗨，我是「${nicknameInput}」，你剛剛幫我選的是 ${avatarLabel(
          selectedAvatar
        )} 搭配 ${voiceLabel(selectedVoice)} 聲線。\n\n之後有浴室、廚房、地板、玻璃鍍膜與清潔的問題，都可以直接問我～\n\n${voiceHint}`
      }
    ]);

    setPhase("chat");
  };

  // 傳訊息給後端 /api/chat
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
          email: user.email,
          avatar: user.avatar,
          voice: user.voice
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

  // 一開始還在讀 localStorage 的過程
  if (phase === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-slate-500">小管家準備中⋯⋯</div>
      </main>
    );
  }

  // Phase 1：只綁定 Email
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
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 rounded-lg text-sm"
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

  // Phase 2：創角畫面（選球 + 選聲線 + 暱稱）
  if (phase === "create") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-6">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 text-center">
            客製你的專屬 AI 小管家
          </h1>
          <p className="text-xs md:text-sm text-slate-500 text-center">
            先幫小管家選一顆你喜歡的「核心球」和說話的聲線，再幫它取個名字。
          </p>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* 左邊：3D 預覽 */}
            <div className="flex flex-col items-center">
              <div className="w-full max-w-xs">
                <Avatar3D variant={selectedAvatar} />
              </div>
              <p className="mt-2 text-xs text-slate-400 text-center">
                你目前選擇的是：{avatarLabel(selectedAvatar)}
              </p>
            </div>

            {/* 右邊：選項 + 暱稱 */}
            <form
              className="space-y-5 flex flex-col justify-between"
              onSubmit={handleCreateCharacter}
            >
              {/* 選球款式 */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  ① 選擇小管家的核心球
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "sky", label: "天空藍 · 穩重專業" },
                    { id: "mint", label: "薄荷綠 · 清爽潔淨" },
                    { id: "purple", label: "紫色 · 科技感" }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedAvatar(opt.id)}
                      className={classNames(
                        "px-3 py-2 rounded-full text-xs md:text-sm border transition",
                        selectedAvatar === opt.id
                          ? "bg-sky-500 border-sky-500 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 選聲線 */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  ② 選擇說話風格（聲線）
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "warm", label: "溫暖親切" },
                    { id: "calm", label: "冷靜條理" },
                    { id: "energetic", label: "活潑有精神" }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedVoice(opt.id)}
                      className={classNames(
                        "px-3 py-2 rounded-full text-xs md:text-sm border transition",
                        selectedVoice === opt.id
                          ? "bg-sky-500 border-sky-500 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 暱稱 */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  ③ 幫小管家取一個名字
                </p>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="例如：小護膜、阿膜、浴室管家"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 rounded-lg text-sm"
                >
                  完成創角，開始對話
                </button>
                <p className="text-[11px] text-slate-400">
                  ※ 之後再回來，系統會記住你的球款、聲線與暱稱。
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // Phase 3：聊天室（已經有 user）
  if (!user) {
    // 理論上不會到這，但保險
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-slate-500">資料載入中⋯⋯</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-2 py-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg flex flex-col md:flex-row overflow-hidden">
        {/* 左側：AI 角色區 */}
        <div className="md:w-1/3 bg-sky-50 p-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-sky-100">
          <div className="w-full mb-3 flex items-center justify-center">
            <Avatar3D variant={user.avatar || "sky"} />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">
            {user.nickname}
          </h2>
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

        {/* 右側：聊天區 */}
        <div className="md:w-2/3 flex flex-col">
          <div className="flex-1 flex flex-col p-4 space-y-2 overflow-y-auto max-h-[70vh]">
            {messages.length === 0 && (
              <div className="text-xs text-slate-400 text-center mt-10 whitespace-pre-wrap">
                跟 {user.nickname} 打聲招呼吧！{"\n"}
                可以問：「浴室玻璃有水垢要怎麼清？」、
                「鍍膜後幾天不能用什麼清潔劑？」{"\n"}
                或拍照實際問你的狀況（之後也可以擴充這個功能）。
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

// 小工具：顯示中文標籤
function avatarLabel(id) {
  if (id === "mint") return "薄荷綠核心球";
  if (id === "purple") return "紫色核心球";
  return "天空藍核心球";
}

function voiceLabel(id) {
  if (id === "calm") return "冷靜條理";
  if (id === "energetic") return "活潑有精神";
  return "溫暖親切";
}
