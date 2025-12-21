return <div className="text-white p-6">HELLO</div>;

// app/page.js
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import TechBackground from "./components/global/TechBackground";
import BindEmailScreen from "./components/screens/BindEmailScreen";
import AvatarStage from "./components/AvatarStage";
import ChatHUD from "./components/ChatHUD";
import CompassCreator from "./components/CompassCreator";

import { loadUser, saveUser } from "./lib/storage";

const Avatar3D = dynamic(() => import("./components/Avatar3D"), { ssr: false });

export default function HomePage() {
  const [phase, setPhase] = useState("loading"); // loading | bindEmail | create | chat
  const [email, setEmail] = useState("");
  const [user, setUser] = useState(null);

  const [draft, setDraft] = useState({
    email: "",
    avatar: "sky",
    color: "sky",
    voice: "warm",
    nickname: ""
  });

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState("idle");

  // ✅ init：保證一定會落在 bindEmail / chat
  useEffect(() => {
    try {
      const saved = loadUser();
      console.log("[init] saved =", saved);

      if (saved?.email && saved?.nickname) {
        setUser(saved);
        setDraft((p) => ({
          ...p,
          email: saved.email,
          nickname: saved.nickname,
          avatar: saved.avatar || "sky",
          color: saved.avatar || "sky",
          voice: saved.voice || "warm"
        }));
        setMessages([
          {
            role: "assistant",
            content: `嗨，我是「${saved.nickname}」。\n\n有任何鍍膜/清潔問題都可以直接問我～`
          }
        ]);
        setPhase("chat");
      } else {
        setPhase("bindEmail");
      }
    } catch (e) {
      console.log("[init] error =", e);
      setPhase("bindEmail");
    }
  }, []);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    const v = (email || "").trim();
    if (!v) return;
    setDraft((p) => ({ ...p, email: v }));
    setPhase("create");
  };

  const handleDoneCreate = () => {
    const profile = {
      email: (draft.email || "").trim(),
      nickname: (draft.nickname || "").trim(),
      avatar: draft.avatar || draft.color || "sky",
      voice: draft.voice || "warm"
    };
    if (!profile.email || !profile.nickname) return;

    setUser(profile);
    saveUser(profile);

    setMessages([
      {
        role: "assistant",
        content: `嗨，我是「${profile.nickname}」。\n\n之後有浴室、廚房、地板、玻璃鍍膜與清潔的問題，都可以直接問我～`
      }
    ]);
    setPhase("chat");
  };

  const onSend = async (text) => {
    if (!user) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);
    setCurrentEmotion("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          nickname: user.nickname,
          email: user.email,
          avatar: user.avatar,
          voice: user.voice
        })
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "我剛剛有點當機，再問我一次可以嗎？" }
      ]);
      setCurrentEmotion(data.emotion || "idle");
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "現在系統有點忙碌，稍後再試一次看看～" }
      ]);
      setCurrentEmotion("idle");
    } finally {
      setSending(false);
    }
  };

  const onBackToCreator = () => {
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

  return (
    <TechBackground>
      {/* ✅ Debug：你如果還是看不到 UI，至少這行一定會出現 */}
      <div className="fixed top-2 left-2 z-[9999] text-[11px] text-white/80">
        phase: {phase}
      </div>

      {phase === "loading" && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-sm text-white/70">載入中…</div>
        </div>
      )}

      {phase === "bindEmail" && (
        <BindEmailScreen email={email} setEmail={setEmail} onSubmit={handleEmailSubmit} />
      )}

      {/* 下面這兩個畫面先放著（你後面要的 create/chat 轉場） */}
      {phase === "create" && (
        <div className="min-h-screen flex flex-col">
          <div className="flex-1 relative">
            <AvatarStage>
              <Avatar3D variant={draft.avatar || draft.color || "sky"} emotion="idle" />
              <div className="absolute bottom-5 left-0 right-0 text-center text-white/85">
                <div className="text-sm font-semibold">
                  {draft.nickname ? `「${draft.nickname}」` : "尚未命名"}
                </div>
                <div className="text-[11px] text-white/60">
                  顏色：{draft.color} ／ 聲線：{draft.voice}
                </div>
              </div>
            </AvatarStage>
          </div>

          {/* 轉輪 HUD */}
          <div className="relative z-20">
            <CompassCreator value={draft} onChange={setDraft} onDone={handleDoneCreate} disabled={false} />
          </div>
        </div>
      )}

      {phase === "chat" && user && (
        <div className="min-h-screen flex flex-col">
          <div className="flex-1 relative">
            <AvatarStage>
              <Avatar3D variant={user.avatar || "sky"} emotion={currentEmotion} />
            </AvatarStage>
          </div>

          <div className="h-[46vh] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            <ChatHUD
              user={user}
              messages={messages}
              sending={sending}
              input={input}
              setInput={setInput}
              onSend={onSend}
              onBackToCreator={onBackToCreator}
            />
          </div>
        </div>
      )}
    </TechBackground>
  );
}
