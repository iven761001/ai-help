"use client";

import { useEffect, useState } from "react";

import BindEmailScreen from "./components/screens/BindEmailScreen";
import CreateScreen from "./components/screens/CreateScreen";
import ChatScreen from "./components/screens/ChatScreen";
import TechBackground from "./components/global/TechBackground";
import { loadUser, saveUser } from "./lib/storage";

export default function HomePage() {
  const [phase, setPhase] = useState("loading"); // loading / bindEmail / create / chat
  const [user, setUser] = useState(null);

  // 綁定 email
  const [email, setEmail] = useState("");

  // 創角資料（交給 CreateScreen / CompassCreator）
  const [draft, setDraft] = useState({
    email: "",
    element: "carbon", // ✅ 元素：carbon / silicon / germanium / tin / lead
    avatar: "sky",
    color: "sky",
    voice: "warm",
    nickname: ""
  });

  // 聊天
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState("idle");

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
      voice: draft.voice || "warm",
      element: draft.element || "carbon" // ✅ 新增
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
          voice: user.voice,
          element: user.element || "carbon" // ✅ 新增
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

  // 從聊天室回到選角（帶回目前設定）
  const handleBackToCreator = () => {
    if (!user) return;

    setDraft((p) => ({
      ...p,
      email: user.email || p.email,
      nickname: user.nickname || p.nickname,
      voice: user.voice || p.voice,
      avatar: user.avatar || p.avatar,
      color: user.avatar || p.color,
      element: user.element || p.element || "carbon" // ✅ 新增
    }));

    setPhase("create");
  };

  // ========== RENDER ==========

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

  if (phase === "create") {
    return (
      <TechBackground>
        <CreateScreen draft={draft} setDraft={setDraft} onDone={handleDoneCreate} />
      </TechBackground>
    );
  }

  // chat
  if (!user) {
    return (
      <TechBackground>
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-sm text-white/70">資料載入中⋯⋯</div>
        </main>
      </TechBackground>
    );
  }

  return (
    <TechBackground>
      <ChatScreen
        user={user}
        messages={messages}
        loading={loading}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        currentEmotion={currentEmotion}
        onBackToCreator={handleBackToCreator}
      />
    </TechBackground>
  );
}
