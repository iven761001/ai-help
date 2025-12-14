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
  const [nicknameInput, setNicknameInput] = useState("");

  const [selectedAvatar, setSelectedAvatar] = useState("sky");
  const [selectedVoice, setSelectedVoice] = useState("warm");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentEmotion, setCurrentEmotion] = useState("idle");

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

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setPhase("create");
    setCurrentEmotion("happy");
  };

  const finalizeCreate = (profileDraft) => {
    const nick = (profileDraft?.nickname || nicknameInput || "").trim();
    if (!nick || !email) return;

    const profile = {
      email,
      nickname: nick,
      avatar: profileDraft?.avatar || selectedAvatar,
      voice: profileDraft?.voice || selectedVoice
    };

    setUser(profile);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ai-helper-user", JSON.stringify(profile));
    }

    let voiceHint = "";
    if (profile.voice === "warm") voiceHint = "我會用比較溫暖、親切的口氣跟你說明唷～";
    else if (profile.voice === "calm") voiceHint = "我會盡量講得冷靜、條理分明，讓你一眼就看懂。";
    else voiceHint = "我會用比較活潑、有精神的方式跟你分享保養技巧！";

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
      setCurrentEmotion("sorry");
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

  // ✅ 新創角介面：中間 3D，底部羅盤
  if (phase === "create") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white overflow-hidden">
        {/* 上方標題 */}
        <div className="px-4 pt-6 pb-3 max-w-4xl mx-auto">
          <div className="text-xl font-bold">客製你的專屬 AI 小管家</div>
          <div className="text-sm text-slate-300/80 mt-1">
            下面的高科技羅盤：每一圈都可以獨立左右滑動選擇。
          </div>
        </div>

        {/* 3D 預覽 */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-3xl border border-sky-200/15 bg-slate-950/40 backdrop-blur-xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="p-4 sm:p-6">
              <div className="text-sm text-slate-200/90">
                角色預覽（單指旋轉、二指拖拉）
              </div>
              <div className="mt-3 h-[360px] sm:h-[420px] rounded-2xl bg-slate-900/30 border border-sky-200/10 overflow-hidden flex items-center justify-center">
                <div className="w-full h-full">
                  <Avatar3D variant={selectedAvatar} emotion={"idle"} mode="inline" />
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-300/80">
                目前：{avatarLabel(selectedAvatar)} · {voiceLabel(selectedVoice)} ·{" "}
                {nicknameInput ? nicknameInput : "（名字由下方羅盤選）"}
              </div>
            </div>
          </div>
        </div>

        {/* 底部羅盤（固定） */}
        <CompassCreator
          value={{
            avatar: selectedAvatar,
            voice: selectedVoice,
            nickname: nicknameInput
          }}
          onChange={(v) => {
            if (v.avatar) setSelectedAvatar(v.avatar);
            if (v.voice) setSelectedVoice(v.voice);
            if (typeof v.nickname === "string") setNicknameInput(v.nickname);
          }}
          onConfirm={(v) => finalizeCreate(v)}
        />

        {/* 底部安全空間，避免內容被羅盤遮住 */}
        <div className="h-[340px]" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-slate-500">資料載入中⋯⋯</div>
      </main>
    );
  }

  // 聊天頁
  return (
    <main className="min-h-screen flex items-center justify-center px-2 py-4 bg-slate-50">
      {/* 浮動角色（你目前版本應該是用 mode=floating） */}
      <Avatar3D variant={user.avatar || "sky"} emotion={currentEmotion} mode="floating" />

      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <div className="text-lg font-semibold text-slate-800">{user.nickname}</div>
          <div className="text-xs text-slate-500 mt-1">
            綁定信箱：{user.email} ・語氣：{voiceLabel(user.voice || "warm")}
          </div>
        </div>

        <div className="flex-1 flex flex-col p-4 space-y-2 overflow-y-auto max-h-[70vh]">
          {messages.length === 0 && (
            <div className="text-xs text-slate-400 text-center mt-10 whitespace-pre-wrap">
              跟 {user.nickname} 打聲招呼吧！{"\n"}
              可以問：「浴室玻璃有水垢要怎麼清？」、
              「鍍膜後幾天不能用什麼清潔劑？」
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={classNames("flex", m.role === "user" ? "justify-end" : "justify-start")}
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
            className="bg-sky-500 hover:bg-sky-600 text-white text-sm px-4 py-2 rounded-full disabled:opacity-60"
            disabled={loading}
          >
            發送
          </button>
        </form>
      </div>
    </main>
  );
}

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
