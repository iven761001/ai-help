// components/Creator/CompassCreator.jsx
"use client";

import { useState, useEffect } from "react";
import WheelPicker from "./WheelPicker";

// 轉輪設定檔 (保持妳原本的設定，這裡只是範例)
const WHEEL_CONFIG = [
  {
    id: "model", title: "MODEL", 
    options: [ { id: "C1", label: "碳1·C1" }, { id: "C2", label: "碳2·C2" }, { id: "C3", label: "碳3·C3" } ]
  },
  {
    id: "color", title: "COLOR", 
    options: [ { id: "sky", label: "天空藍" }, { id: "mint", label: "薄荷綠" }, { id: "rose", label: "玫瑰粉" }, { id: "gold", label: "香檳金" } ]
  },
  {
    id: "personality", title: "TYPE", 
    options: [ { id: "warm", label: "溫暖" }, { id: "cool", label: "冷靜" }, { id: "energetic", label: "活潑" } ]
  },
  // 可以依需求增加更多
];

export default function CompassCreator({ onChange }) {
  const [selections, setSelections] = useState(() => {
    const init = {};
    WHEEL_CONFIG.forEach((config) => {
      if (config.options.length > 0) init[config.id] = config.options[0].id;
    });
    return init;
  });

  const handleWheelChange = (configId, newValue) => {
    setSelections((prev) => {
      const next = { ...prev, [configId]: newValue };
      if (onChange) onChange(next);
      return next;
    });
  };

  useEffect(() => { if (onChange) onChange(selections); }, []);

  return (
    <div className="flex flex-col items-center w-full animate-fadeIn pb-6">
      
      {/* 頂部裝飾線 (HUD感) */}
      <div className="w-full flex items-center justify-between px-4 mb-2 opacity-50">
         <div className="h-px w-1/3 bg-gradient-to-r from-transparent to-cyan-500"></div>
         <div className="text-[9px] text-cyan-500 font-mono tracking-widest">SYSTEM CONFIG</div>
         <div className="h-px w-1/3 bg-gradient-to-l from-transparent to-cyan-500"></div>
      </div>

      {/* 橫向滑動容器 */}
      <div 
        className="w-full flex overflow-x-auto snap-x snap-mandatory px-4 gap-2 no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {WHEEL_CONFIG.map((config) => (
          <div 
            key={config.id} 
            className="min-w-[33%] max-w-[33%] flex-shrink-0 snap-center flex flex-col items-center"
          >
            <WheelPicker
              label={config.title}
              options={config.options}
              value={selections[config.id]}
              onChange={(val) => handleWheelChange(config.id, val)}
            />
          </div>
        ))}
        {/* 墊腳石，讓最後一個能滑到中間 */}
        <div className="min-w-[33%] flex-shrink-0" />
      </div>
      
      {/* 底部指示器 */}
      <div className="mt-2 flex gap-1">
        <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse"></div>
        <div className="w-1 h-1 bg-cyan-500/50 rounded-full"></div>
        <div className="w-1 h-1 bg-cyan-500/30 rounded-full"></div>
      </div>
    </div>
  );
}
