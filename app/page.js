"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import BindEmailScreen from "./components/screens/BindEmailScreen";
import CreateScreen from "./components/screens/CreateScreen";
import ChatScreen from "./components/screens/ChatScreen";

import TechBackground from "./components/global/TechBackground";
import { loadUser, saveUser } from "./lib/storage";
import useDragRotate from "./hooks/useDragRotate";

// ✅ Avatar 永遠常駐在 page.js（世界層）
const Avatar3D = dynamic(() => import("./components/Avatar3D"), { ssr: false });

export default function HomePage() {
  const [phase, setPhase] = useState("loading"); // loading / bindEmail / create / chat
  const [user, setUser] = useState(null);

  // bind email
  const [email, setEmail] = useState("");

  // create draft
  const [draft, setDraft] = useState({
    email: "",
    avatar: "sky",
    color: "sky",
    voice: "warm",
    nickname: ""
  });

  // chat
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState("idle");

  // ✅ 只有在創角時需要「單指旋轉預覽」
  const { yaw, bind } = useDragRotate({ sensitivity: 0.01 });

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

  // 從聊天室回到選角（帶回目前設定）
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

  // ✅ 世界層要顯示哪一隻熊？
  const stageVariant = useMemo(() => {
    if (phase === "create") return draft.avatar || draft.color || "sky";
    if (phase === "chat") return user?.avatar || "sky";
    return "sky";
  }, [phase, draft.avatar, draft.color, user?.avatar]);

  // ✅ 世界層要用哪個情緒？
  const stageEmotion = useMemo(() => {
    if (phase === "chat") return currentEmotion || "idle";
    return "idle";
  }, [phase, currentEmotion]);

  // ✅ 世界層是否可旋轉（只有創角）
  const stageYaw = phase === "create" ? yaw : 0;
  const stageBind = phase === "create" ? bind : {};

  // loading
  if (phase === "loading") {
    return (
      <TechBackground>
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-sm text-white/70">小管家準備中⋯⋯</div>
        </main>
      </TechBackground>
    );
  }

  // bindEmail（這頁不顯示熊也可以；你想顯示也行）
  if (phase === "bindEmail") {
    return (
      <TechBackground>
        <BindEmailScreen email={email} setEmail={setEmail} onSubmit={handleEmailSubmit} />
      </TechBackground>
    );
  }

  // ✅ create / chat：進入「同一個世界」模式
  return (
    <TechBackground>
      <main className="min-h-screen relative overflow-hidden">
        {/* ===== 世界層：永遠常駐的熊（沉浸感核心） ===== */}
        <div className="absolute inset-0 z-0 flex items-center justify-center px-4 pt-6 pb-44">
          {/* pb-44：預留底部 HUD 空間，避免被蓋住 */}
          <div
            className="w-full max-w-sm aspect-square rounded-3xl glass-soft overflow-hidden"
            {...stageBind}
          >
            <Avatar3D
              variant={stageVariant}
              emotion={stageEmotion}
              previewYaw={stageYaw}
            />
          </div>
        </div>

        {/* ===== HUD 層：只換 UI，不換世界 ===== */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {phase === "create" && (
            <div className="pointer-events-auto h-full">
              <CreateScreen draft={draft} setDraft={setDraft} onDone={handleDoneCreate} />
            </div>
          )}

          {phase === "chat" && (
            <div className="pointer-events-auto h-full">
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
            </div>
          )}
        </div>
      </main>
    </TechBackground>
  );
}
