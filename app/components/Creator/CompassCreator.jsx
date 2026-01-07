"use client";

import { useState, useEffect, useRef } from "react";

// 選項資料
const OPTIONS = {
  model: [
    { id: "avatar_01", label: "AVATAR-01", desc: "標準原型機" },
    { id: "avatar_02", label: "AVATAR-02", desc: "高機動型" },
    { id: "avatar_03", label: "LOCKED", desc: "開發中..." }, // 預留展示用
  ],
  color: [
    { id: "blue", label: "CYAN", value: "#3b82f6" },
    { id: "purple", label: "NEON", value: "#a855f7" },
    { id: "orange", label: "SOLAR", value: "#f97316" },
  ],
  type: [
    { id: "warm", label: "WARM", desc: "熱情活力" },
    { id: "cool", label: "COOL", desc: "冷靜分析" },
    { id: "dark", label: "DARK", desc: "神祕莫測" },
  ]
};

// 輪盤子元件
function ReelSection({ title, options, selectedId, onSelect }) {
  const scrollRef = useRef(null);

  // 點擊時自動滑動到該項目
  const handleItemClick = (id, index) => {
    onSelect(id);
    if (scrollRef.current) {
      const itemWidth = 100; // 每個項目的概略寬度
      const gap = 12;
      const containerWidth = scrollRef.current.clientWidth;
      // 計算置中位置
      const scrollPos = (index * (itemWidth + gap)) - (containerWidth / 2) + (itemWidth / 2);
      scrollRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* 標題與裝飾線 */}
      <div className="flex items-center gap-2 px-2">
        <div className="w-1 h-3 bg-cyan-500 rounded-full shadow-[0_0_8px_#22d3ee]"></div>
        <span className="text-[10px] font-bold text-cyan-400 tracking-widest">{title}</span>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-cyan-900/50 to-transparent"></div>
      </div>

      {/* 滑動容器 */}
      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-[40%] pb-4 snap-x snap-mandatory no-scrollbar"
      >
        {options.map((opt, index) => {
          const isSelected = selectedId === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleItemClick(opt.id, index)}
              className={`
                snap-center shrink-0 w-24 h-16 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-1
                ${isSelected 
                  ? "bg-cyan-900/40 border-cyan-400 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] scale-110 z-10" 
                  : "bg-gray-900/40 border-gray-800 text-gray-600 scale-90 grayscale opacity-60"}
              `}
            >
              <span className="text-xs font-bold tracking-wider">{opt.label}</span>
              {opt.desc && <span className="text-[8px] opacity-70">{opt.desc}</span>}
              {opt.value && (
                <div 
                  className="w-3 h-3 rounded-full mt-1 border border-white/20" 
                  style={{ backgroundColor: opt.value, boxShadow: isSelected ? `0 0 8px ${opt.value}` : 'none' }} 
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CompassCreator({ onChange }) {
  const [config, setConfig] = useState({
    model: "avatar_01",
    color: "blue",
    personality: "warm"
  });

  // 當設定改變時，通知父層
  useEffect(() => {
    if(onChange) onChange(config);
  }, [config, onChange]);

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full pb-safe-bottom">
      {/* 這裡使用三個滑動輪盤 */}
      <ReelSection 
        title="NEURAL MODEL" 
        options={OPTIONS.model} 
        selectedId={config.model} 
        onSelect={(val) => updateConfig("model", val)} 
      />
      
      <ReelSection 
        title="INTERFACE COLOR" 
        options={OPTIONS.color} 
        selectedId={config.color} 
        onSelect={(val) => updateConfig("color", val)} 
      />
      
      <ReelSection 
        title="PERSONALITY TYPE" 
        options={OPTIONS.type} 
        selectedId={config.personality} 
        onSelect={(val) => updateConfig("personality", val)} 
      />
    </div>
  );
}
