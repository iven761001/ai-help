"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import WheelPicker from "./WheelPicker";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function CompassCreator({
  value,
  onChange,
  onDone,
  disabled
}) {
  const colors = useMemo(
    () => [
      { id: "sky", label: "天空藍 · 穩重專業" },
      { id: "mint", label: "薄荷綠 · 清爽潔淨" },
      { id: "purple", label: "紫色 · 科技感" }
    ],
    []
  );

  const voices = useMemo(
    () => [
      { id: "warm", label: "溫暖親切" },
      { id: "calm", label: "冷靜條理" },
      { id: "energetic", label: "活潑有精神" }
    ],
    []
  );

  const nameOptions = useMemo(
    () => [
      { id: "小護膜", label: "小護膜" },
      { id: "阿膜", label: "阿膜" },
      { id: "浴室管家", label: "浴室管家" },
      { id: "廚房管家", label: "廚房管家" },
      { id: "玻璃小幫手", label: "玻璃小幫手" },
      { id: "地板管家", label: "地板管家" },
      { id: "__custom__", label: "自訂名字…" }
    ],
    []
  );

  const [nameMode, setNameMode] = useState("__custom__");
  const [customName, setCustomName] = useState(value?.nickname || "");

  // 防止：外部 value 同步進來時，觸發「輸入 -> 強制跳 custom」的副作用
  const syncingFromOutsideRef = useRef(false);

  // 外部 value 同步（回到創角、或從 chat 返回）
  useEffect(() => {
    syncingFromOutsideRef.current = true;

    const nick = (value?.nickname || "").trim();
    const hit = nameOptions.find((x) => x.id === nick);

    setCustomName(nick);
    setNameMode(hit ? hit.id : "__custom__");

    // 下一個 microtask 再放行
    Promise.resolve().then(() => {
      syncingFromOutsideRef.current = false;
    });
  }, [value?.nickname, nameOptions]);

  const pickColor = (id) => onChange?.({ ...value, color: id, avatar: id });
  const pickVoice = (id) => onChange?.({ ...value, voice: id });

  // ✅ 名字轉輪：只要轉到非 custom，就把輸入框改成該名字
  // ✅ 轉到 custom：保留輸入框目前內容
  const pickNameMode = (id) => {
    setNameMode(id);

    if (id === "__custom__") {
      // 不強改 nickname，讓使用者用上方輸入框輸入
      // 但如果目前 nickname 是空、且輸入框有值，我們就把它寫回去
      const n = (customName || "").trim();
      if (n && n !== (value?.nickname || "")) {
        onChange?.({ ...value, nickname: n });
      }
      return;
    }

    // 轉到預設選項：輸入框直接顯示該名字
    setCustomName(id);
    onChange?.({ ...value, nickname: id });
  };

  // ✅ 輸入框：只要有文字輸入 -> 名字轉輪自動跳到「自訂名字…」
  // ✅ 並即時同步 nickname
  const handleCustomInput = (raw) => {
    const next = (raw || "").slice(0, 20);

    setCustomName(next);

    // 如果是外部同步造成的 setCustomName，不要觸發跳轉
    if (syncingFromOutsideRef.current) return;

    const trimmed = next.trim();

    // 只要有輸入（非空白）就切到 custom
    if (trimmed.length > 0 && nameMode !== "__custom__") {
      setNameMode("__custom__");
    }

    // 同步 nickname（允許清空）
    onChange?.({ ...value, nickname: trimmed });
  };

  const canDone =
    !!value?.email &&
    !!(value?.color || value?.avatar) &&
    !!value?.voice &&
    !!(value?.nickname || customName).trim();

  return (
    <div className="w-full">
      {/* ✅ 外殼（跟你現在的透明 HUD 一致） */}
      <div className="rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-xl shadow-[0_-12px_50px_rgba(56,189,248,0.15)] overflow-hidden">
        {/* ✅ Header：左邊放「創角設定」，中間放自訂輸入，右邊放完成 */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <div className="text-sm font-semibold text-white">創角設定</div>
              {/* ✅ 原本那段長說明刪掉，避免擠 */}
            </div>

            {/* ✅ 自訂名字輸入（搬上來） */}
            <div className="min-w-0 flex-1">
              <input
                value={customName}
                onChange={(e) => handleCustomInput(e.target.value)}
                placeholder="自訂名字（最多 20 字）"
                disabled={disabled}
                className="
                  w-full rounded-full
                  border border-white/15
                  bg-black/15 text-white
                  px-4 py-2 text-sm outline-none
                  placeholder:text-white/40
                  focus:ring-2 focus:ring-sky-400
                "
              />
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <div className="text-[11px] text-white/60">
                {Math.min((customName || "").length, 20)}/20
              </div>

              <button
                disabled={disabled || !canDone}
                onClick={() => onDone?.()}
                className={cx(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  disabled || !canDone
                    ? "bg-white/15 text-white/50"
                    : "bg-sky-500 text-white hover:bg-sky-400"
                )}
              >
                完成
              </button>
            </div>
          </div>
        </div>

        {/* 三欄 wheel */}
        <div className="px-3 pb-4 grid grid-cols-3 gap-3">
          <WheelPicker
            title="① 顏色"
            subtitle="選核心色"
            items={colors}
            value={value?.color || value?.avatar || "sky"}
            onChange={pickColor}
            disabled={disabled}
          />

          <WheelPicker
            title="② 個性"
            subtitle="選說話風格"
            items={voices}
            value={value?.voice || "warm"}
            onChange={pickVoice}
            disabled={disabled}
          />

          <WheelPicker
            title="③ 名字"
            subtitle="選一個或自訂"
            items={nameOptions}
            value={nameMode}
            onChange={pickNameMode}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
              }
