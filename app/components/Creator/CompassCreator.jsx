// app/components/Creator/CompassCreator.jsx
"use client";

import { useState, useEffect } from "react";
import WheelPicker from "./WheelPicker";

// 🌟 【核心設定檔】未來要新增轉輪，只要改這裡就好！
// 這種寫法方便之後接後端 API，或是隨時調整選項
const WHEEL_CONFIG = [
  {
    id: "model",
    title: "角色",
    subtitle: "VRM MODEL",
    options: [
      { id: "C1", label: "碳1 · C1" },
      { id: "C2", label: "碳2 · C2" },
  //    { id: "C3", label: "碳3 · C3" }, // 預留
    ]
  },
  {
    id: "color",
    title: "顏色",
    subtitle: "THEME COLOR",
    options: [
      { id: "sky", label: "天空藍 · 穩" },
      { id: "mint", label: "薄荷綠 · 清" },
      { id: "rose", label: "玫瑰粉 · 柔" },
      { id: "gold", label: "香檳金 · 奢" },
    ]
  },
  {
    id: "personality",
    title: "個性",
    subtitle: "PERSONALITY",
    options: [
      { id: "warm", label: "溫暖親切" },
      { id: "cool", label: "冷靜條理" },
      { id: "energetic", label: "活潑有精神" },
      { id: "lazy", label: "慵懶隨性" },
    ]
  },
  {
    id: "voice",
    title: "聲音",
    subtitle: "VOICE ACTOR",
    options: [
      { id: "v1", label: "少女音 · A" },
      { id: "v2", label: "御姐音 · B" },
      { id: "v3", label: "機械音 · C" },
    ]
  },
  {
    id: "bg",
    title: "背景",
    subtitle: "SCENE",
    options: [
      { id: "lab", label: "科技實驗室" },
      { id: "home", label: "居家客廳" },
      { id: "space", label: "外太空" },
    ]
  }
];

export default function CompassCreator({ onChange }) {
  // 1. 動態產生初始狀態
  // 這樣不管設定檔有幾個轉輪，狀態都會自動對應好
  const [selections, setSelections] = useState(() => {
    const init = {};
    WHEEL_CONFIG.forEach((config) => {
      // 預設選第一個選項
      if (config.options.length > 0) {
        init[config.id] = config.options[0].id;
      }
    });
    return init;
  });

  // 2. 處理變更邏輯
  const handleWheelChange = (configId, newValue) => {
    setSelections((prev) => {
      const next = { ...prev, [configId]: newValue };
      // 這裡可以用 debounce 優化，但在手機上直接觸發通常手感比較好
      if (onChange) onChange(next);
      return next;
    });
  };

  // 初始化時觸發一次 onChange，確保上層拿到預設值
  useEffect(() => {
    if (onChange) onChange(selections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full flex flex-col items-center animate-fadeIn">
      
      {/* 裝飾線：上方光暈 */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4" />

      {/* 🌟 橫向滑動容器 (Horizontal Scroll Container)
        - snap-x snap-mandatory: 強制滑動時「卡」在元素中間
        - scrollbar-hide: 隱藏捲軸 (需配合 CSS 或 tailwind plugin)
        - overflow-x-auto: 允許橫向滑動
      */}
      <div 
        className="w-full flex overflow-x-auto snap-x snap-mandatory px-4 pb-4 gap-3 no-scrollbar"
        style={{
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none'
        }}
      >
        {WHEEL_CONFIG.map((config) => (
          // 每個項目的容器
          // min-w-[31%] : 讓畫面剛好塞下 3 個 (稍微留一點 gap 縫隙)
          // snap-center : 滑動停止時，讓這個元素置中
          <div 
            key={config.id} 
            className="min-w-[31%] max-w-[31%] flex-shrink-0 snap-center flex flex-col"
          >
            <WheelPicker
              title={config.title}
              subtitle={config.subtitle}
              items={config.options}
              value={selections[config.id]}
              onChange={(val) => handleWheelChange(config.id, val)}
              height={180}     // 稍微調高一點點，讓視覺更寬鬆
              itemHeight={44}  // 配合你的 WheelPicker 設計
              haptics={true}   // 開啟震動回饋
            />
          </div>
        ))}

        {/* 墊腳石 (Spacer)
           因為 snap-center 機制，滑到最後一個時，右邊需要一點空間才能讓最後一個項目置中
        */}
        <div className="min-w-[33%] flex-shrink-0" />
      </div>

      {/* 底部指示器：提示使用者可以滑動 */}
      <div className="flex items-center justify-center gap-1 mt-1 opacity-40">
        <div className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      
      <div className="text-[10px] text-white/30 tracking-widest mt-1">
        SWIPE FOR MORE SETTINGS
      </div>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-4" />
    </div>
  );
}
