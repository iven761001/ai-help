"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import TechBackground from "./components/global/TechBackground";
import BindEmailScreen from "./components/screens/BindEmailScreen";
import AvatarStage from "./components/AvatarStage";
import CompassCreator from "./components/CompassCreator";
import ChatHUD from "./components/ChatHUD";

import { loadUser, saveUser } from "./lib/storage";

/**
 * phases:
 * - bind   : 綁定 email
 * - create : 選色/個性/名字（CompassCreator）
 * - chat   : 對話（ChatHUD）
 */
export default function Page() {
  const [phase, setPhase] = useState("bind");

  // 角色資料（email / color/avatar / voice / nickname）
  const [user, setUser] = useState({
    email: "",
    avatar: "sky",
    color: "sky",
    voice: "warm",
    nickname: ""
  });

  // Chat 狀態
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");

  // 轉場動畫用（HUD 互換）
  const [hudMode, setHudMode] = useState("create"); // create | chat
  const [hudAnimating, setHudAnimating] = useState(false);
  const hudModeRef = useRef(hudMode);

  // 初次載入：如果 localStorage 有 user，就直接略過 bind
  useEffect(() => {
    const u = loadUser?.();
    if (u?.email) {
      setUser((prev) => ({ ...prev, ...u }));
      // 如果資料已完整，就直接到 create（或你要直接 chat 也行）
      setPhase("create");
      setHudMode("create");
      hudModeRef.current = "create";
    } else {
      setPhase("bind");
    }
  }, []);

  // user 變動就存起來（避免刷新不見）
  useEffect(() => {
    if (!user?.email) return;
    saveUser?.(user);
  }, [user]);

  // ===== Bind Email =====
  const onBindSubmit = (e) => {
    e?.preventDefault?.();
    const email = (user.email || "").trim();
    if (!email) return;

    // 進入創角
    setPhase("create");
    setHudMode("create");
    hudModeRef.current = "create";
  };

  // ===== Create -> Chat 轉場 =====
  const goToChat = () => {
    if (hudModeRef.current === "chat") {
      setPhase("chat");
      return;
    }
    setHudAnimating(true);

    // 先把 phase 切到 chat（但 HUD 用動畫進場）
    setPhase("chat");

    // 下一幀切 HUD 模式，讓 CSS transition 生效
    requestAnimationFrame(() => {
      setHudMode("chat");
      hudModeRef.current = "chat";
      // 動畫時間要跟下面 class 的 duration 一致
      window.setTimeout(() => setHudAnimating(false), 280);
    });
  };

  const backToCreator = () => {
    if (hudModeRef.current === "create") {
      setPhase("create");
      return;
    }
    setHudAnimating(true);
    setPhase("create");
    requestAnimationFrame(() => {
      setHudMode("create");
      hudModeRef.current = "create";
      window.setTimeout(() => setHudAnimating(false), 280);
    });
  };

  // ===== Chat send =====
  const sendToAPI = async (text) => {
    const payload = {
      user,
      messages: [...messages, { role: "user", content: text }]
    };

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "API error");
    }

    const data = await res.json();
    return data?.reply || "（沒有回覆）";
  };

  const onSend = async (text) => {
    const t = (text || "").trim();
    if (!t || sending) return;

    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: t }]);

    try {
      const reply = await sendToAPI(t);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `（系統錯誤）${e?.message || "請稍後再試"}` }
      ]);
    } finally {
      setSending(false);
    }
  };

  // ===== HUD 高度統一：避免擠到熊 =====
  // 你可以微調這個數字：越大下方越高，上方熊越不會被蓋到
  const HUD_HEIGHT = "clamp(360px, 44vh, 520px)";

  // ===== 畫面 =====
  return (
    <TechBackground>
      {/* 1) bind email 畫面 */}
      {phase === "bind" && (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-xl">
            <BindEmailScreen
              email={user.email}
              setEmail={(v) => setUser((p) => ({ ...p, email: v }))}
              onSubmit={onBindSubmit}
            />
          </div>
        </div>
      )}

      {/* 2) create/chat 共用舞台 + HUD */}
      {phase !== "bind" && (
        <div
          className="min-h-screen w-full mx-auto max-w-4xl px-3"
          style={{
            display: "grid",
            gridTemplateRows: `1fr ${HUD_HEIGHT}`
          }}
        >
          {/* 上方：永遠同一個熊舞台（沉浸感） */}
          <div className="relative flex items-center justify-center pt-6 pb-3">
            <AvatarStage
              user={user}
              // 你之後要讓熊「活蹦亂跳」可以把情緒/狀態從這裡傳進去
              // emotion={...}
              // onTap={...}
            />

            {/* 可選：舞台下方資訊（你要更乾淨也可刪） */}
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <div className="text-white/90 text-sm font-semibold">
                {user.nickname ? `「${user.nickname}」` : "尚未命名"}
              </div>
              <div className="text-white/60 text-[11px]">
                顏色：{labelColor(user.color || user.avatar)} ／ 聲線：
                {labelVoice(user.voice)}
              </div>
            </div>
          </div>

          {/* 下方：HUD 固定高度，不會擠熊 */}
          <div className="relative pb-[calc(env(safe-area-inset-bottom)+10px)]">
            {/* Create HUD */}
            <div
              className={[
                "absolute inset-0 transition-transform duration-300 ease-out",
                hudMode === "create"
                  ? "translate-y-0"
                  : "translate-y-[110%]" // 往下退場
              ].join(" ")}
              style={{ pointerEvents: hudMode === "create" ? "auto" : "none" }}
            >
              <CompassCreator
                value={user}
                onChange={(next) => setUser(next)}
                onDone={goToChat}
                disabled={hudAnimating}
              />
            </div>

            {/* Chat HUD */}
            <div
              className={[
                "absolute inset-0 transition-transform duration-300 ease-out",
                hudMode === "chat"
                  ? "translate-y-0"
                  : "translate-y-[110%]" // 先藏在下面，進場
              ].join(" ")}
              style={{ pointerEvents: hudMode === "chat" ? "auto" : "none" }}
            >
              <ChatHUD
                user={user}
                messages={messages}
                sending={sending}
                input={input}
                setInput={setInput}
                onSend={onSend}
                onBackToCreator={backToCreator}
              />
            </div>
          </div>
        </div>
      )}
    </TechBackground>
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
