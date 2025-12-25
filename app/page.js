// app/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import TechBackground from "./components/global/TechBackground";

import AvatarStage from "./components/AvatarVRM/AvatarStage";

import CompassCreator from "./components/Creator/CompassCreator";
import ChatHUD from "./components/HUD/ChatHUD";

import useDragRotate from "./hooks/useDragRotate";

import { loadUser, saveUser, clearUser } from "./lib/storage";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function Page() {
  // ====== 使用者資料（localStorage） ======
  const [user, setUser] = useState(null);
  const [booted, setBooted] = useState(false);

  // ====== 流程狀態：bind(信箱) -> create(選角) -> chat(聊天) ======
  const [step, setStep] = useState("bind");

  // ====== 綁定信箱 ======
  const [email, setEmail] = useState("");

  // ====== 角色草稿（選角面板） ======
  const [draft, setDraft] = useState({
    email: "",
    color: "sky",
    avatar: "sky",
    voice: "warm",
    nickname: ""
  });

  // ====== Chat 狀態 ======
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // ====== 拖曳旋轉（舞台統一使用） ======
  const { yaw, bind } = useDragRotate({ sensitivity: 0.01 });

  // ====== 初始載入 user ======
  useEffect(() => {
    const u = loadUser();
    if (u?.email) {
      setUser(u);
      setDraft((d) => ({ ...d, ...u })); // 讓草稿沿用
      setStep(u?.nickname ? "chat" : "create");
      setEmail(u.email);
    } else {
      setStep("bind");
    }
    setBooted(true);
  }, []);

  // ====== 舞台顯示的「當下角色」 ======
  const stageProfile = useMemo(() => {
    const base = user?.email ? { ...draft, ...user } : draft;
    return {
      email: base.email || "",
      color: base.color || base.avatar || "sky",
      avatar: base.avatar || base.color || "sky",
      voice: base.voice || "warm",
      nickname: base.nickname || ""
    };
  }, [user, draft]);

  // ====== 舞台情緒（示範：送出/思考時） ======
  const stageEmotion = useMemo(() => {
    if (sending) return "thinking";
    return "idle";
  }, [sending]);

  // ====== 綁定信箱：送出 ======
  const submitEmail = (e) => {
    e.preventDefault();
    const mail = (email || "").trim();
    if (!mail) return;

    const next = {
      email: mail,
      color: "sky",
      avatar: "sky",
      voice: "warm",
      nickname: ""
    };
    setUser(next);
    setDraft(next);
    saveUser(next);
    setStep("create");
  };

  // ====== 選角完成 ======
  const onDoneCreator = () => {
    const profile = {
      ...user,
      ...draft,
      email: user?.email || draft.email,
      color: draft.color || draft.avatar || "sky",
      avatar: draft.avatar || draft.color || "sky"
    };
    setUser(profile);
    saveUser(profile);
    setStep("chat");
  };

  // ====== 回到選角（聊天頁左上返回） ======
  const onBackToCreator = () => {
    setStep("create");
  };

  // ====== Chat：送出訊息（你之後要接 API） ======
  const onSend = async (text) => {
    const t = (text || "").trim();
    if (!t) return;

    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: t }]);

    try {
      // 你有 app/api/chat/route.js 的話，這裡就能直接打
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: stageProfile,
          messages: [...messages, { role: "user", content: t }]
        })
      });

      if (!res.ok) throw new Error("API Error");
      const data = await res.json();

      const reply =
        data?.reply ||
        data?.message ||
        "我有收到！你要不要再多描述一下情境（材質/位置/有沒有鍍膜）？";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "我這邊連線好像卡住了😅 你再送一次看看，或等一下我。"
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  // ====== 退出重來（可用在 debug） ======
  const hardReset = () => {
    clearUser();
    setUser(null);
    setDraft({
      email: "",
      color: "sky",
      avatar: "sky",
      voice: "warm",
      nickname: ""
    });
    setMessages([]);
    setInput("");
    setEmail("");
    setStep("bind");
  };

  if (!booted) return null;

  return (
    <main className="min-h-[100dvh] w-full relative overflow-hidden">
      {/* 背景（全透明科技感） */}
      <div className="absolute inset-0 -z-10">
        <TechBackground />
      </div>

      {/* ===== 上半部：永遠固定的 Avatar 舞台（不會被聊天擠上去） ===== */}
      <section className="w-full px-4 pt-6">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.55)] overflow-hidden">
            const dragBind = typeof bind === "function" ? bind() : bind; // ✅ 兼容兩種 hook 寫法
...
<div
  className="aspect-square w-full overflow-hidden"
  {...dragBind}
  style={{
    WebkitTapHighlightColor: "transparent",
    touchAction: "none", // ✅ 手機一定要，否則拖曳常被瀏覽器吃掉
    userSelect: "none"
  }}
>
              <AvatarStage
                profile={stageProfile}
                emotion={stageEmotion}
                previewYaw={yaw}
              />
            </div>

            {/* 舞台下方資訊（共用，讓選角->聊天有延伸感） */}
            <div className="px-4 pt-3 pb-4 text-center">
              <div className="text-sm font-semibold text-white">
                {stageProfile.nickname ? `「${stageProfile.nickname}」` : "尚未命名"}
              </div>
              <div className="text-[11px] text-white/70 mt-1">
                顏色：{labelColor(stageProfile.color)} ／ 聲線：{labelVoice(stageProfile.voice)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 下半部：面板區（固定高度，不蓋到熊） ===== */}
      <section className="w-full px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] mt-4">
        <div className="mx-auto w-full max-w-md">
          {/* 這個容器固定高度，聊天再多也只在裡面捲，不會把熊推走 */}
          <div className="h-[44dvh] min-h-[360px]">
            {/* Step: Bind Email */}
            {step === "bind" && (
              <div
                className="
                  h-full
                  rounded-[28px]
                  border border-white/15
                  bg-white/10
                  backdrop-blur-xl
                  shadow-[0_-12px_50px_rgba(56,189,248,0.15)]
                  overflow-hidden
                  flex flex-col
                "
              >
                <div className="px-4 pt-4 pb-3">
                  <div className="text-sm font-semibold text-white">綁定信箱</div>
                  <div className="text-[11px] text-white/70 mt-1">
                    綁定後會記住你的角色設定（存在你的手機瀏覽器）
                  </div>
                </div>

                <form onSubmit={submitEmail} className="px-4 pb-4 flex-1 flex flex-col gap-3">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="例如：you@gmail.com"
                    className="
                      w-full rounded-2xl
                      border border-white/15 bg-black/20
                      text-white px-4 py-3 text-sm outline-none
                      placeholder:text-white/40 focus:ring-2 focus:ring-sky-400
                    "
                  />

                  <button
                    type="submit"
                    className="
                      rounded-full px-4 py-3 text-sm font-medium
                      bg-sky-500 text-white hover:bg-sky-400 transition
                      active:scale-[0.99]
                    "
                  >
                    下一步
                  </button>

                  <button
                    type="button"
                    onClick={hardReset}
                    className="text-[11px] text-white/50 underline underline-offset-4 mt-1"
                  >
                    （Debug）清除綁定重來
                  </button>
                </form>
              </div>
            )}

            {/* Step: Creator */}
            {step === "create" && (
              <div className="h-full">
                <CompassCreator
                  value={{ ...draft, email: user?.email || draft.email }}
                  onChange={(v) => setDraft(v)}
                  onDone={onDoneCreator}
                  disabled={false}
                />
              </div>
            )}

            {/* Step: Chat */}
            {step === "chat" && (
              <div className="h-full">
                <ChatHUD
                  user={stageProfile}
                  messages={messages}
                  sending={sending}
                  input={input}
                  setInput={setInput}
                  onSend={onSend}
                  onBackToCreator={onBackToCreator}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function labelColor(id) {
  if (id === "mint") return "薄荷綠";
  if (id === "purple") return "紫色";
  return "天空藍";
}

function labelVoice(id) {
  if (id === "calm") return "冷靜條理";
  if (id === "energetic") return "活潑有精神";
  return "溫暖親切";
}
