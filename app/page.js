// app/page.js
"use client";

import { useEffect, useMemo, useState } from "react";

import TechBackground from "./components/global/TechBackground";
import BindEmailScreen from "./components/screens/BindEmailScreen";

import AvatarStage from "./components/AvatarStage";
import CompassCreator from "./components/CompassCreator";
import ChatHUD from "./components/ChatHUD";

import { loadUser, saveUser } from "./lib/storage";

export default function Page() {
  const [phase, setPhase] = useState("loading"); // loading | bindEmail | create | chat
  const [hudH, setHudH] = useState(320);

  const [email, setEmail] = useState("");

  const [draft, setDraft] = useState({
    email: "",
    avatar: "sky",
    color: "sky",
    voice: "warm",
    nickname: ""
  });

  const [user, setUser] = useState(null);

  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [emotion, setEmotion] = useState("idle");

  // init
  useEffect(() => {
  try {
    const saved = loadUser();
    console.log("[init] saved:", saved);

    if (saved?.email && saved?.nickname) {
      setUser(saved);
      setPhase("chat");
      setMessages([
        { role: "assistant", content: `嗨，我是「${saved.nickname}」。\n\n有問題都可以直接問我～` }
      ]);
    } else {
      setPhase("bindEmail");
    }
  } catch (e) {
    console.log("[init] error:", e);
    setPhase("bindEmail");
  }
}, []);
    
  // Email -> create
  const submitEmail = (e) => {
    e.preventDefault();
    const e1 = (email || "").trim();
    if (!e1) return;
    setDraft((p) => ({ ...p, email: e1 }));
    setPhase("create");
  };

  // Create done -> chat
  const doneCreate = () => {
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

  // chat send
  const sendChat = async (text) => {
    if (!user) return;

    const userMsg = { role: "user", content: text };
    setMessages((p) => [...p, userMsg]);
    setSending(true);
    setEmotion("thinking");

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
      setMessages((p) => [
        ...p,
        { role: "assistant", content: data.reply || "不好意思，我剛剛有點當機，再問我一次可以嗎？" }
      ]);
      setEmotion(data.emotion || "idle");
    } catch (err) {
      console.error(err);
      setMessages((p) => [
        ...p,
        { role: "assistant", content: "現在系統好像有點忙碌，稍後再試一次看看～" }
      ]);
      setEmotion("idle");
    } finally {
      setSending(false);
    }
  };

  // back to creator
  const backToCreator = () => {
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

  // HUD height (讓舞台自動讓位)
  const onHudHeight = (h) => {
    const safe = Math.max(260, Math.min(520, Math.floor(h || 0)));
    setHudH(safe);
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--hudH", `${safe}px`);
    }
  };

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

  // bind email
  if (phase === "bindEmail") {
    return (
      <TechBackground>
        <BindEmailScreen email={email} setEmail={setEmail} onSubmit={submitEmail} />
      </TechBackground>
    );
  }

  // create + chat（同一舞台，下面換 HUD）
  const mode = phase === "chat" ? "chat" : "create";
  const stageVariant = useMemo(() => {
    if (mode === "chat") return user?.avatar || "sky";
    return draft?.avatar || draft?.color || "sky";
  }, [mode, user?.avatar, draft?.avatar, draft?.color]);

  return (
    <TechBackground>
      <main className="min-h-screen relative overflow-hidden">
        {/* 舞台：底部用 paddingBottom 讓位給 HUD 高度 */}
        <div
          className="absolute inset-0"
          style={{
            paddingBottom: `calc(${hudH}px + env(safe-area-inset-bottom))`
          }}
        >
          <AvatarStage
            mode={mode}
            draft={draft}
            user={user}
            emotion={sending ? "thinking" : emotion}
            variant={stageVariant}
            onHudHeight={onHudHeight}
          />
        </div>

        {/* HUD：固定在底部，轉場換內容 */}
        <div
          className="absolute left-0 right-0 bottom-0"
          style={{
            paddingBottom: "env(safe-area-inset-bottom)"
          }}
        >
          {phase === "create" && (
            <div
              style={{
                transform: "translateY(0px)",
                transition: "transform 260ms ease"
              }}
            >
              <CompassCreator
                value={draft}
                onChange={setDraft}
                onDone={doneCreate}
                disabled={false}
                onHeightChange={onHudHeight}
              />
            </div>
          )}

          {phase === "chat" && (
            <div className="mx-auto w-full max-w-4xl px-3 pb-[12px]">
              <div
                className="h-[calc(var(--hudH,320px))]"
                style={{
                  height: `${hudH}px`
                }}
              >
                <ChatHUD
                  user={user}
                  messages={messages}
                  sending={sending}
                  input={input}
                  setInput={setInput}
                  onSend={sendChat}
                  onBackToCreator={backToCreator}
                  onHeightChange={onHudHeight}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </TechBackground>
  );
    }
