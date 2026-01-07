"use client";

import { useState, useEffect, useRef } from "react";

// 選項資料
const OPTIONS = {
  model: [
    { id: "avatar_01", label: "C1·原型" },
    { id: "avatar_02", label: "C2·機動" },
    { id: "avatar_03", label: "C3·重裝" }, // 測試用
    { id: "avatar_04", label: "C4·特務" }, // 測試用
  ],
  color: [
    { id: "blue", label: "天空藍", color: "#3b82f6" },
    { id: "purple", label: "霓虹紫", color: "#a855f7" },
    { id: "orange", label: "太陽橘", color: "#f97316" },
    { id: "cyan", label: "駭客青", color: "#22d3ee" },
  ],
  type: [
    { id: "warm", label: "熱情" },
    { id: "cool", label: "冷靜" },
    { id: "dark", label: "腹黑" },
    { id: "shy", label: "害羞" },
  ]
};

// --- 單一滾輪組件 ---
function WheelColumn({ title, options, selectedId, onSelect }) {
  const scrollRef = useRef(null);
  const itemHeight = 48; // 每個選項的高度 (px)

  // 1. 初始化：自動捲動到目前選中的項目
  useEffect(() => {
    if (scrollRef.current) {
      const index = options.findIndex(opt => opt.id === selectedId);
      if (index !== -1) {
        scrollRef.current.scrollTop = index * itemHeight;
      }
    }
  }, []); // 只在掛載時執行一次，避免循環捲動

  // 2. 監聽捲動：計算目前停在哪一個選項
  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    // 計算目前最接近中心的索引 (四捨五入)
    const index = Math.round(scrollTop / itemHeight);
    
    // 如果索引有效且改變了，就觸發選擇
    if (index >= 0 && index < options.length) {
      const newId = options[index].id;
      if (newId !== selectedId) {
        onSelect(newId);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 min-w-[100px] flex-1 snap-center">
      {/* 標題 */}
      <div className="text-[10px] font-bold text-cyan-500 tracking-widest uppercase mb-1">
        {title}
      </div>

      {/* 滾輪容器 */}
      <div className="relative h-36 w-full max-w-[120px] bg-gray-900/50 rounded-xl border border-gray-700/50 backdrop-blur-md overflow-hidden shadow-inner group">
        
        {/* 選中框 (Highlight Box) - 絕對定位在中間 */}
        <div className="absolute top-1/2 left-0 w-full h-12 -translate-y-1/2 border-y-2 border-cyan-400 bg-cyan-400/10 pointer-events-none z-10 shadow-[0_0_15px_rgba(34,211,238,0.2)]"></div>

        {/* 捲動區域 */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-auto snap-y snap-mandatory no-scrollbar py-12" // py-12 讓第一個和最後一個能捲到中間
        >
          {options.map((opt) => {
            const isSelected = selectedId === opt.id;
            return (
              <div 
                key={opt.id}
                onClick={() => {
                  // 點擊也可直接選取
                  onSelect(opt.id);
                  const idx = options.findIndex(o => o.id === opt.id);
                  if(scrollRef.current) scrollRef.current.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
                }}
                className={`
                  h-12 w-full flex items-center justify-center snap-center transition-all duration-300 cursor-pointer
                  ${isSelected ? "text-white scale-110 font-bold" : "text-gray-600 scale-90 opacity-50"}
                `}
              >
                {/* 如果有顏色屬性，顯示小圓點 */}
                {opt.color && (
                  <span className="w-2 h-2 rounded-full mr-2 shadow-[0_0_5px_currentColor]" style={{ backgroundColor: opt.color }} />
                )}
                <span className="text-sm">{opt.label}</span>
              </div>
            );
          })}
        </div>

        {/* 上下遮罩漸層 (讓滾動更有立體感) */}
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-20"></div>
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-20"></div>
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
    <div className="w-full pb-safe-bottom px-4">
      
      {/* 外層容器：
         1. flex-row: 讓滾輪由左到右並排
         2. overflow-x-auto: 如果超過畫面寬度，可以左右滑動
      */}
      <div className="flex flex-row gap-2 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 items-start justify-start md:justify-center">
        
        {/* 1. 模型滾輪 */}
        <WheelColumn 
          title="MODEL" 
          options={OPTIONS.model} 
          selectedId={config.model} 
          onSelect={(val) => updateConfig("model", val)} 
        />
        
        {/* 2. 顏色滾輪 */}
        <WheelColumn 
          title="COLOR" 
          options={OPTIONS.color} 
          selectedId={config.color} 
          onSelect={(val) => updateConfig("color", val)} 
        />
        
        {/* 3. 個性滾輪 */}
        <WheelColumn 
          title="TYPE" 
          options={OPTIONS.type} 
          selectedId={config.personality} 
          onSelect={(val) => updateConfig("personality", val)} 
        />
        
        {/* 4. 預留擴充 (這裡示範如果有第4個，會自動長在右邊) */}
        {/* <WheelColumn 
          title="VOICE" 
          options={[{id:'v1', label:'甜美'}, {id:'v2', label:'成熟'}]} 
          selectedId={'v1'} 
          onSelect={()=>{}} 
        /> 
        */}

      </div>
    </div>
  );
}
