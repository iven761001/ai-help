// components/Creator/CompassCreator.jsx
"use client";
import { useState, useEffect, useRef } from "react";
import WheelPicker from "./WheelPicker";

// 🌟 這裡就是「設定檔」！
// 未來如果要有第 5 個、第 6 個轉輪，直接在下面繼續複製貼上大括號 {...} 即可
const CATEGORIES = [
  {
    id: "personality",
    label: "個性",
    options: [
      { value: "enthusiastic", label: "熱情" },
      { value: "calm", label: "冷靜" },
      { value: "humorous", label: "幽默" },
      { value: "strict", label: "嚴格" },
      { value: "gentle", label: "溫柔" },
    ]
  },
  {
    id: "voice",
    label: "聲音",
    options: [
      { value: "cute", label: "可愛" },
      { value: "mature", label: "成熟" },
      { value: "robot", label: "機械" },
      { value: "energetic", label: "活力" },
    ]
  },
  {
    id: "role",
    label: "角色",
    options: [
      { value: "partner", label: "夥伴" },
      { value: "mentor", label: "導師" },
      { value: "assistant", label: "助理" },
      { value: "pet", label: "寵物" },
    ]
  },
  // 這是新加入的第 4 個轉輪，測試滑動效果用
  {
    id: "outfit",
    label: "服裝",
    options: [
      { value: "casual", label: "便服" },
      { value: "uniform", label: "制服" },
      { value: "cyber", label: "賽博" },
      { value: "formal", label: "禮服" },
    ]
  },
  // 妳甚至可以加第 5 個...
  /*
  {
    id: "background",
    label: "背景",
    options: [ ... ]
  }
  */
];

export default function CompassCreator({ onChange }) {
  // 自動產生預設值：把上面每個類別的第一個選項當作預設值
  const initialSelections = {};
  CATEGORIES.forEach(cat => {
    initialSelections[cat.id] = cat.options[0].value;
  });

  const [selections, setSelections] = useState(initialSelections);

  // 當轉輪改變時
  const handleChange = (key, value) => {
    const newSelections = { ...selections, [key]: value };
    setSelections(newSelections);
    
    // 通知上層組件
    if (onChange) {
      onChange(newSelections);
    }
  };

  // 初始化通知
  useEffect(() => {
    if (onChange) onChange(selections);
  }, []);

  return (
    <div className="flex flex-col items-center w-full animate-fadeIn">
      
      {/* 裝飾線條 */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mb-4" />

      {/* 🌟 橫向滑動容器 (Scroll Container) 
         - overflow-x-auto: 允許橫向捲動
         - snap-x: 設定滑動要「卡住」對齊
         - scrollbar-hide: 隱藏醜醜的捲軸 (需在 global.css 或這裡用 style 隱藏)
      */}
      <div 
        className="w-full flex overflow-x-auto snap-x snap-mandatory pb-4 px-4 gap-0 scroll-smooth"
        style={{
          // 隱藏捲軸的標準語法
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none' 
        }}
      >
        {CATEGORIES.map((category) => (
          // 🌟 每個轉輪的容器
          // min-w-[33%] 代表每個轉輪佔視窗寬度的 1/3，所以畫面會剛好塞三個
          // snap-center 代表滑動停止時，這個元素會自動置中
          <div 
            key={category.id} 
            className="min-w-[33%] flex justify-center snap-center shrink-0"
          >
            <WheelPicker 
              label={category.label} 
              options={category.options} 
              value={selections[category.id]} 
              onChange={(v) => handleChange(category.id, v)} 
            />
          </div>
        ))}

        {/* 墊腳石 (Spacer)
           因為 snap-center 的關係，最後一個項目很難滑到最中間
           加一個空的 div 在最後面，可以讓最後一個轉輪順利滑到中間
        */}
        <div className="min-w-[33%] shrink-0" /> 
      </div>

      {/* 底部滑動提示 (Visual Indicator) - 告訴使用者可以左右滑 */}
      <div className="flex items-center gap-1 mt-2 opacity-50">
        <div className="w-1 h-1 rounded-full bg-blue-400"></div>
        <div className="w-1 h-1 rounded-full bg-blue-400"></div>
        <span className="text-[10px] text-blue-300 tracking-wider">SWIPE &gt;&gt;&gt;</span>
      </div>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mt-4" />
    </div>
  );
}
