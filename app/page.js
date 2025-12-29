// app/page.js
"use client";

import { useEffect, useMemo, useState } from "react";

import TechBackground from "./components/global/TechBackground";
import AvatarStage from "./components/AvatarVRM/AvatarStage";
import CompassCreator from "./components/Creator/CompassCreator";
import ChatHUD from "./components/HUD/ChatHUD";

import useDragRotate from "./hooks/useDragRotate";
import { loadUser, saveUser, clearUser } from "./lib/storage";

export default function Page() {
  // ===== 基本狀態 =====
  const [booted, setBooted] = useState(false);
  const [step, setStep] = useState("bind"); // bind → create → chat

  // ===== 使用者 =====
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");

  // ===== 角色草稿 =====
  const [draft, setDraft] = useState({
    email: "",
    vrmId: "C1",
    color: "sky",
    avatar: "sky",
    voice: "warm",
    nickname: ""
  });

  // ===== Chat =====
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // ===== 拖曳旋轉 =====
  const { yaw, bind } = useDragRotate({ sensitivity: 0.01 });

  // ===== 初始化 =====
  useEffect(() => {
    const u = loadUser();
    if (u?.email) {
      setUser(u);
      setDraft((d) => ({ ...d, ...u, vrmId: u.vrmId || d.vrmId || "C1" }));
      setEmail(u.email);
      setStep(u.nickname ? "chat" : "create");
    } else {
      setStep("bind");
    }
    setBooted(true);
  }, []);

  // ===== 舞台角色（create / chat 用）=====
  const stageProfile = useMemo(() => {
    const base = user?.email ? { ...draft, ...user } : draft;
    return {
      email: base.email || "",
      vrmId: base.vrmId || "C1",
      color: base.color || base.avatar || "sky",
      avatar: base.avatar || base.color || "sky",
      voice: base.voice || "warm",
      nickname: base.nickname || ""
    };
  }, [user, draft]);

  const stageEmotion = sending ? "thinking" : "idle";

  // ===== 綁定信箱 =====
  const submitEmail = (e) => {
    e.preventDefault();
    const mail = (email || "").trim();
    if (!mail) return;

    const next = {
      email: mail,
      vrmId: "C1",
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

  // ===== 完成選角 =====
  const onDoneCreator = () => {
    const profile = {
      ...user,
      ...draft,
      email: user?.email || draft.email,
      vrmId: draft.vrmId || user?.vrmId || "C1",
      color: draft.color || draft.avatar || "sky",
      avatar: draft.avatar || draft.color || "sky"
    };
    setUser(profile);
    saveUser(profile);
    setStep("chat");
  };

  const onBackToCreator = () => setStep("create");

  // ===== Chat 送出 =====
  const onSend = async (text) => {
    const t = (text || "").trim();
    if (!t) return;

    setSending(true);
    setMessages((p) => [...p, { role: "user", content: t }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: stageProfile,
          messages: [...messages, { role: "user", content: t }]
        })
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      setMessages((p) => [
        ...p,
        { role: "assistant", content: data.reply || "我有收到 👍" }
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: "連線失敗，請再試一次 🙏" }
      ]);
    } finally {
      setSending(false);
    }
  };

  const hardReset = () => {
    clearUser();
    setUser(null);
    setDraft({
      email: "",
      vrmId: "C1",
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
      {/* 背景 */}
      <div className="absolute inset-0 -z-10">
        <TechBackground />
      </div>

      {/* ===== 上半部 Avatar 舞台 ===== */}
      <section className="w-full px-4 pt-6">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
            <div
              className="aspect-square w-full"
              {...(step !== "bind" ? bind : {})}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* bind 時不載入 3D（避免 client-side exception 影響第一頁） */}
              {step === "bind" ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-white/60 text-sm">角色舞台準備中…</div>
                </div>
              ) : (
                <AvatarStage
                  key={stageProfile.vrmId} 
                  vrmId={stageProfile.vrmId || "C1"}
                  variant={stageProfile.color}
                  emotion={stageEmotion}
                  previewYaw={yaw}
                />
              )}
            </div>

            <div className="px-4 pt-3 pb-4 text-center">
              <div className="text-sm font-semibold text-white">
                {stageProfile.nickname ? `「${stageProfile.nickname}」` : "尚未命名"}
              </div>
              <div className="text-[11px] text-white/70 mt-1">
                模型：{stageProfile.vrmId || "C1"} ／ 顏色：{stageProfile.color} ／ 聲線：{stageProfile.voice}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 下半部 面板 ===== */}
      <section className="w-full px-4 pb-6 mt-4">
        <div className="mx-auto w-full max-w-md">
          <div className="h-[44dvh] min-h-[360px]">
            {step === "bind" && (
              <div className="h-full rounded-[28px] bg-white/10 backdrop-blur-xl p-4 flex flex-col border border-white/15">
                <div className="text-white font-semibold mb-2">綁定信箱</div>

                <form onSubmit={submitEmail} className="flex flex-col gap-3 flex-1">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="rounded-2xl px-4 py-3 bg-black/20 text-white outline-none border border-white/15 placeholder:text-white/40"
                  />

                  <button
                    type="submit"
                    className="rounded-full py-3 bg-sky-500 text-white font-medium"
                  >
                    下一步
                  </button>

                  <button
                    type="button"
                    onClick={hardReset}
                    className="text-xs text-white/50 underline underline-offset-4"
                  >
                    Debug：清除重來
                  </button>
                </form>
              </div>
            )}

            {step === "create" && (
              <CompassCreator
                value={{ ...draft, email: user?.email || draft.email }}
                onChange={setDraft}
                onDone={onDoneCreator}
                disabled={false}
              />
            )}

            {step === "chat" && (
              <ChatHUD
                user={stageProfile}
                messages={messages}
                sending={sending}
                input={input}
                setInput={setInput}
                onSend={onSend}
                onBackToCreator={onBackToCreator}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
