"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

import TechBackground from "./components/global/TechBackground";
import BindEmailScreen from "./components/screens/BindEmailScreen";

import CreateHUD from "./components/hud/CreateHUD";
import ChatHUD from "./components/hud/ChatHUD";

import useDragRotate from "./hooks/useDragRotate";
import { loadUser, saveUser } from "./lib/storage";

const Avatar3D = dynamic(() => import("./components/Avatar3D"), { ssr: false });

export default function HomePage() {
  const [phase, setPhase] = useState("loading"); // loading / bindEmail / create / chat

  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");

  // 創角資料（CreateHUD/CompassCreator 用）
  const [draft, setDraft] = useState({
    email: "",
    avatar: "sky",
    color: "sky",
    voice: "warm",
    nickname: ""
  });

  // 聊天
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState("idle");

  // ===== 世界層：創角單手拖拉旋轉（只在 create 啟用） =====
  const { yaw, bind, resetYaw } = useDragRotate({ sensitivity: 0.01 });

  // ===== HUD 量高度：世界層自動讓位，永遠不會蓋到熊 =====
  const hudRef = useRef(null);
  const [hudH, setHudH] = useState(320); // 先給個預設，避免初次閃動

  useEffect(() => {
    const el = hudRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const emit = () => {
      const h = el.getBoundingClientRect().height || 0;
      if (h > 0) setHudH(h);
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

  // ===== init =====
  useEffect(() => {
    const saved = loadUser();
    if (saved) {
      setUser(saved);
      setPhase("chat");
      // 同步 draft，之後回去創角會帶到目前設定
      setDraft((p) => ({
        ...p,
        email: saved.email || p.email,
        nickname: saved.nickname || p.nickname,
        voice: saved.voice || p.voice,
        avatar: saved.avatar || p.avatar,
        color: saved.avatar || p.color
      }));
    } else {
      setPhase("bindEmail");
    }
  }, []);

  // Email -> create
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setDraft((p) => ({ ...p, email }));
    resetYaw?.();
    setPhase("create");
  };

  // create done -> chat
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

    setCurrentEmotion("idle");
    setPhase("chat");
  };

  // chat -> create（保留沉浸：熊不變，只換 HUD）
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
    resetYaw?.();
    setPhase("create");
  };

  // 發送聊天
  const handleSend = async (text) => {
    if (!text.trim() || !user) return;
    const content = text.trim();

    const userMessage = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);
    setCurrentEmotion("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
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
      setSending(false);
    }
  };

  // ===== 世界層要顯示哪個熊 =====
  const variant = useMemo(() => {
    if (phase === "chat") return user?.avatar || "sky";
    return draft.avatar || draft.color || "sky";
  }, [phase, user?.avatar, draft.avatar, draft.color]);

  const emotion = useMemo(() => {
    if (phase === "chat") return currentEmotion || "idle";
    return "idle";
  }, [phase, currentEmotion]);

  const allowRotate = phase === "create";

  // ===== render =====
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

  return (
    <TechBackground>
      {/* ===== 最外層：世界 + HUD ===== */}
      <div className="min-h-screen w-full relative">
        {/* ===== 世界層（熊只 render 這一次） ===== */}
        <section
          className="w-full flex items-center justify-center px-4 pt-6"
          style={{
            // 讓位給 HUD：永遠不會被蓋到
            paddingBottom: `calc(${hudH}px + env(safe-area-inset-bottom))`
          }}
        >
          <div className="w-full max-w-sm">
            <div
              className="glass-card rounded-3xl p-3"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <div
                className="aspect-square rounded-2xl glass-soft flex items-center justify-center overflow-hidden"
                {...(allowRotate ? bind : {})}
              >
                <Avatar3D
                  variant={variant}
                  emotion={emotion}
                  previewYaw={allowRotate ? yaw : 0}
                />
              </div>

              {/* 世界層文字（可依你喜好再調） */}
              <div className="mt-3 space-y-1 px-2 pb-1 text-center">
                <div className="text-sm font-semibold text-white">
                  {phase === "create"
                    ? draft.nickname
                      ? `「${draft.nickname}」`
                      : "尚未命名"
                    : user?.nickname || ""}
                </div>
                {phase === "create" ? (
                  <div className="text-xs text-white/70">
                    顏色：{avatarLabel(draft.color || draft.avatar)} ／ 聲線：
                    {voiceLabel(draft.voice)}
                  </div>
                ) : (
                  <div className="text-xs text-white/70">
                    你的專屬鍍膜＆清潔顧問（可直接問問題）
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===== HUD 層（量高度用） ===== */}
        <section
          ref={hudRef}
          className="fixed left-0 right-0 bottom-0 z-[80]"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)"
          }}
        >
          <div className="mx-auto w-full max-w-4xl px-3">
            {phase === "create" ? (
              <CreateHUD draft={draft} setDraft={setDraft} onDone={handleDoneCreate} />
            ) : (
              <ChatHUD
                user={user}
                messages={messages}
                sending={sending}
                input={input}
                setInput={setInput}
                onSend={handleSend}
                onBackToCreator={handleBackToCreator}
              />
            )}
          </div>
        </section>
      </div>
    </TechBackground>
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
