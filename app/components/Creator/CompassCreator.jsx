"use client";
import React, { useState, useRef, useEffect } from "react";

// --------------------------------------------------------
// 🛠️ 單個輪盤元件 (樣式大升級)
// --------------------------------------------------------
const Reel = ({ title, options, onChange, delayIndex = 0 }) => {
  const scrollRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleScroll = () => {
    if (scrollRef.current) {
      const itemHeight = 48; 
      const scrollTop = scrollRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      if (index !== selectedIndex && index >= 0 && index < options.length) {
        setSelectedIndex(index);
        onChange(options[index]);
      }
    }
  };

  // 增加一個入場動畫延遲，讓輪盤依序出現
  const animationDelay = `${delayIndex * 100}ms`;

  return (
    <div className="flex flex-col items-center gap-2 min-w-[100px] snap-center animate-fadeInUp" style={{ animationDelay }}>
      {/* 標題增加科技感裝飾 */}
      <div className="relative">
        <div className="text-[8px] text-cyan-300/70 font-mono tracking-[0.2em] uppercase border-b border-cyan-500/30 pb-1 mb-1 relative z-10">
          {title}
        </div>
        <div className="absolute -bottom-1 left-0 w-2 h-[1px] bg-cyan-500"></div>
      </div>

      {/* 輪盤容器 - 增加科技感背景和邊框 */}
      <div className="relative h-36 w-24 overflow-hidden rounded-lg bg-[#0a0a12]/80 backdrop-blur-md border border-cyan-500/30 shadow-[inset_0_0_20px_rgba(0,255,255,0.1)] group hover:border-cyan-400/60 transition-colors">
        
        {/* 背景裝飾網格 */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 255, 0.05) 25%, rgba(0, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.05) 75%, rgba(0, 255, 255, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 255, 0.05) 25%, rgba(0, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.05) 75%, rgba(0, 255, 255, 0.05) 76%, transparent 77%, transparent)', backgroundSize: '20px 20px' }}>
        </div>

        {/* 中間選取框的發光效果 */}
        <div className="absolute top-1/2 left-0 w-full h-12 -translate-y-1/2 z-10 pointer-events-none border-y-2 border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
             <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400/80"></div>
             <div className="absolute top-0 right-0 w-1 h-full bg-cyan-400/80"></div>
        </div>

        {/* 滾動區域 */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative z-20 w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide py-[calc(50%-24px)]" 
          style={{ scrollBehavior: 'smooth' }}
        >
          {options.map((opt, i) => {
            const distance = Math.abs(selectedIndex - i);
            const isSelected = distance === 0;
            const isLocked = opt.value === 'locked';
            return (
              <div 
                key={opt.label + i}
                className={`h-12 flex items-center justify-center snap-center transition-all duration-300 ${isSelected ? 'scale-110' : 'scale-90 opacity-40 blur-[1px]'}`}
              >
                <span className={`font-mono text-[10px] tracking-wider whitespace-nowrap ${isSelected ? 'font-bold text-cyan-50 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]' : (isLocked ? 'text-gray-600' : 'text-cyan-700')}`}>
                  {isLocked ? '🔒 ' + opt.label : opt.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --------------------------------------------------------
// 🚀 主介面：現在有 9 個輪盤
// --------------------------------------------------------
export default function CompassCreator({ onChange }) {
  const [config, setConfig] = useState({});

  // 🌟 擴充到 9 個輪盤的資料
  const reelStructure = [
    // 第一區：核心
    { id: "model", title: "CORE MODEL", options: [{ label: "Avatar-C", value: "model_c" }, { label: "Avatar-Si", value: "model_si" }, { label: "Locked", value: "locked" }] },
    { id: "os", title: "OPERATING SYS", options: [{ label: "NeuralOS v1", value: "v1" }, { label: "NeuralOS v2", value: "v2" }, { label: "Locked", value: "locked" }] },
    { id: "cpu", title: "PROCESSOR", options: [{ label: "Quantum-X", value: "q-x" }, { label: "Optical-Z", value: "o-z" }] },
    
    // 第二區：人格與外觀
    { id: "personality", title: "PERSONALITY", options: [{ label: "溫暖 WARM", value: "warm" }, { label: "冷靜 COOL", value: "cool" }] },
    { id: "voice", title: "VOICE PACK", options: [{ label: "Type-A (F)", value: "vf" }, { label: "Type-B (M)", value: "vm" }] },
    { id: "color", title: "THEME COLOR", options: [{ label: "科技藍", value: "cyan" }, { label: "以及紫", value: "purple" }, { label: "警告橘", value: "orange" }] },

    // 第三區：擴充模組
    { id: "mod1", title: "MODULE [A]", options: [{ label: "語言包", value: "lang" }, { label: "戰術分析", value: "tactical" }, { label: "未安裝", value: "none" }] },
    { id: "mod2", title: "MODULE [B]", options: [{ label: "情感引擎", value: "emotion" }, { label: "未安裝", value: "none" }] },
    { id: "mod3", title: "MODULE [C]", options: [{ label: "加密通訊", value: "crypto" }, { label: "未安裝", value: "none" }] },
  ];

  const handleReelChange = (id, option) => {
    const newConfig = { ...config, [id]: option.value };
    setConfig(newConfig);
    onChange(newConfig);
  };

  return (
    // 使用 grid 佈局來排列 9 個輪盤 (3x3 雖然可能太擠，我們先用 flex wrap 讓它自動換行)
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-6 px-4 py-6 mask-gradient-sides overflow-x-auto scrollbar-hide snap-x">
      {reelStructure.map((reel, index) => (
        <Reel 
          key={reel.id} 
          title={reel.title} 
          options={reel.options}
          delayIndex={index} // 傳入索引以製造階梯式動畫
          onChange={(opt) => handleReelChange(reel.id, opt)}
        />
      ))}
      {/* 底部裝飾線 */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent mt-4"></div>
    </div>
  );
}
