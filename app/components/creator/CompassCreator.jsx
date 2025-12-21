"use client";

import { useEffect, useMemo, useState } from "react";
import WheelPicker from "../ui/WheelPicker";
import { getProfileList } from "../../lib/elementProfiles";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function CompassCreator({ value, onChange, onDone, disabled }) {
  const variants = useMemo(() => getProfileList(), []);
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

  // 外部同步
  useEffect(() => {
    const nick = value?.nickname || "";
    setCustomName(nick);

    const hit = nameOptions.find((x) => x.id === nick);
    setNameMode(hit ? hit.id : "__custom__");
  }, [value?.nickname, nameOptions]);

  const pickVariant = (id) => onChange?.({ ...value, avatar: id, color: id });
  const pickVoice = (id) => onChange?.({ ...value, voice: id });

  // 右輪（名字）改變
  const pickNameMode = (id) => {
    setNameMode(id);

    if (id === "__custom__") {
      // 切到自訂，但不要立刻覆蓋 nickname（讓 input 決定）
      return;
    }

    // 轉到預設名：input 顯示該名，並寫回 nickname
    setCustomName(id);
    onChange?.({ ...value, nickname: id });
  };

  // 自訂輸入改變：只要有字，就把右輪跳到 __custom__
  const onCustomInput = (txt) => {
    const next = (txt || "").slice(0, 20);
    setCustomName(next);

    // 只要有字，強制切到自訂
    if (next.trim().length > 0 && nameMode !== "__custom__") {
      setNameMode("__custom__");
    }

    onChange?.({ ...value, nickname: next.trim() });
  };

  const canDone =
    !!value?.email &&
    !!(value?.avatar || value?.color) &&
    !!value?.voice &&
    !!(value?.nickname || customName).trim();

  return (
    <div className="pointer-events-none">
      <div className="pointer-events-auto mx-auto w-full max-w-4xl px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="rounded-[28px] border border-white/12 bg-white/6 backdrop-blur-xl shadow-[0_-12px_50px_rgba(56,189,248,0.12)] overflow-hidden glass-card">
          {/* Header：完成 + 自訂 input 放右上 */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">創角設定</div>
                <div className="text-[11px] text-white/70">三個拉條上下拖拉，會吸附到文字正中央</div>
              </div>

              {/* ✅ 自訂 input 移到完成左邊 */}
              <div className="flex items-center gap-2 shrink-0">
                <input
                  value={customName}
                  onChange={(e) => onCustomInput(e.target.value)}
                  placeholder="自訂名字…"
                  disabled={disabled}
                  className="w-[140px] rounded-full border border-white/12 bg-black/20 text-white px-3 py-2 text-sm outline-none placeholder:text-white/35 focus:ring-2 focus:ring-sky-400"
                />

                <button
                  disabled={disabled || !canDone}
                  onClick={() => onDone?.()}
                  className={cx(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    disabled || !canDone
                      ? "bg-white/15 text-white/55"
                      : "bg-sky-500 text-white hover:bg-sky-400"
                  )}
                >
                  完成
                </button>
              </div>
            </div>
          </div>

          {/* 三欄並排 */}
          <div className="px-3 pb-4 grid grid-cols-3 gap-3">
            <WheelPicker
              title="① 外觀/元素"
              subtitle="碳矽鍺錫鉛…"
              items={variants}
              value={value?.avatar || value?.color || "sky"}
              onChange={pickVariant}
              disabled={disabled}
            />

            <WheelPicker
              title="② 個性"
              subtitle="說話風格"
              items={voices}
              value={value?.voice || "warm"}
              onChange={pickVoice}
              disabled={disabled}
            />

            <WheelPicker
              title="③ 名字"
              subtitle="預設或自訂"
              items={nameOptions}
              value={nameMode}
              onChange={pickNameMode}
              disabled={disabled}
            />
          </div>

          {/* 你說「左邊那區文字刪掉」：這裡不再額外顯示自訂區塊，排版不擠 */}
        </div>
      </div>
    </div>
  );
            }
