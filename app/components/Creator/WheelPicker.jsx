// components/Creator/WheelPicker.jsx
"use client";

import { useEffect, useRef, useState } from "react";

// 單個選項的「外觀」組件 (Cyberpunk 卡片)
function WheelItem({ label, isActive }) {
  return (
    <div className={`
        relative flex items-center justify-center transition-all duration-300
        h-10 w-24 rounded-sm
        ${isActive ? "brightness-125" : "brightness-75"}
      `}>
      {/* 科技感邊框背景 */}
      <div className={`
        absolute inset-0 border-2 skew-x-[-10deg] transition-all duration-300
        ${isActive 
           ? "border-cyan-400 bg-cyan-900/40 shadow-[0_0_15px_rgba(34,211,238,0.6)]" 
           : "border-gray-700 bg-gray-900/50"
        }
      `}></div>

      {/* 裝飾線條 */}
      {isActive && (
        <>
          <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-cyan-200 shadow-white drop-shadow-sm"></div>
          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-cyan-200 shadow-white drop-shadow-sm"></div>
        </>
      )}

      {/* 文字 */}
      <span className={`
        relative z-20 text-xs font-bold tracking-wider uppercase skew-x-[-10deg]
        ${isActive ? "text-cyan-50 text-shadow-glow" : "text-gray-400"}
      `}>
        {label}
      </span>
      
      <style jsx>{`
        .text-shadow-glow { text-shadow: 0 0 5px rgba(34,211,238,0.8); }
      `}</style>
    </div>
  );
}

export default function WheelPicker({ label, options, value, onChange }) {
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const itemHeight = 48; // 每個項目含 margin 的高度

  // 滾動處理：計算 3D 變形
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const containerCenter = containerRef.current.clientHeight / 2;

    itemRefs.current.forEach((el, index) => {
      if (!el) return;
      
      // 計算每個項目距離「視窗中心」有多遠
      const itemCenter = el.offsetTop + el.clientHeight / 2;
      const dist = itemCenter - (scrollTop + containerCenter);
      
      // 正規化距離 (-1 ~ 1 之間，超過就代表很遠)
      const normalizedDist = dist / (containerRef.current.clientHeight * 0.6);
      
      // 3D 參數計算
      // 越靠近中心 (normalizedDist -> 0)，rotateX -> 0, scale -> 1.1, blur -> 0
      const rotateX = normalizedDist * -45; // 上面往後仰，下面往後仰
      const scale = Math.max(0.8, 1.1 - Math.abs(normalizedDist) * 0.4); 
      const opacity = Math.max(0.2, 1 - Math.abs(normalizedDist) * 1.2);
      const blur = Math.abs(normalizedDist) * 4; // 越遠越模糊
      const zIndex = Math.round(100 - Math.abs(normalizedDist) * 100);

      // 套用樣式
      el.style.transform = `perspective(500px) rotateX(${rotateX}deg) scale(${scale})`;
      el.style.opacity = opacity;
      el.style.filter = `blur(${blur}px)`;
      el.style.zIndex = zIndex;
    });

    // 簡單的選取判定 (找出最靠近中心的)
    const activeIndex = Math.round(scrollTop / itemHeight);
    const activeItem = options[activeIndex];
    if (activeItem && activeItem.value !== value && activeItem.id !== value) {
       // 為了效能，這裡可以不用即時 set state，用 debounce 更好，
       // 但為了反應快，我們先直接呼叫 onChange
       // 注意：為了避免無限迴圈，上層組件不要一直 re-render WheelPicker
       onChange(activeItem.id || activeItem.value);
    }
  };

  // 當 value 從外部改變時 (例如初始化)，自動捲動到該位置
  useEffect(() => {
    const idx = options.findIndex(o => (o.id || o.value) === value);
    if (idx !== -1 && containerRef.current) {
      containerRef.current.scrollTo({
        top: idx * itemHeight,
        behavior: "smooth"
      });
    }
  }, [value]); // 注意：這裡不要依賴 options，避免無限迴圈

  return (
    <div className="flex flex-col items-center mx-1 w-full">
      {/* 標題 */}
      <div className="flex items-center gap-2 mb-2 opacity-80">
         <div className="w-1 h-2 bg-cyan-500"></div>
         <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-bold">
           {label}
         </span>
      </div>
      
      {/* 滾動視窗 */}
      <div className="relative w-full h-40">
        
        {/* 選取框線 (Highlight Zone) - 放在正中間 */}
        <div className="absolute top-1/2 left-0 w-full h-12 -mt-6 border-y border-cyan-500/30 bg-cyan-500/5 z-0 pointer-events-none"></div>

        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-auto snap-y snap-mandatory no-scrollbar py-[56px]" // py 讓第一個和最後一個能置中
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {options.map((opt, i) => (
            <div
              key={opt.id || opt.value}
              ref={el => itemRefs.current[i] = el}
              onClick={() => {
                 // 點擊時平滑捲動到該項目
                 containerRef.current.scrollTo({ top: i * itemHeight, behavior: 'smooth' });
                 onChange(opt.id || opt.value);
              }}
              className="snap-center flex justify-center items-center h-[48px] w-full cursor-pointer transition-transform will-change-transform"
            >
              <WheelItem 
                label={opt.label} 
                isActive={(opt.id || opt.value) === value} 
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
