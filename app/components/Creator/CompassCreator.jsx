"use client";

import { useState, useEffect } from "react";

const OPTIONS = {
  model: [
    { id: "C1", label: "碳1·C1", desc: "標準原型機" },
    { id: "C2", label: "碳2·C2", desc: "高機動型" },
  ],
  color: [
    { id: "blue", label: "天空藍", value: "#3b82f6" },
    { id: "purple", label: "霓虹紫", value: "#a855f7" },
  ],
  type: [
    { id: "warm", label: "溫暖", desc: "總是充滿活力" },
    { id: "cool", label: "冷靜", desc: "理性分析數據" },
  ]
};

export default function CompassCreator({ onChange }) {
  const [config, setConfig] = useState({
    model: "C1",
    color: "blue",
    personality: "warm"
  });

  // 當設定改變時，通知父層 (Page.js)
  useEffect(() => {
    if(onChange) onChange(config);
  }, [config, onChange]);

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full pb-8 px-6 grid grid-cols-3 gap-2">
      
      {/* 1. 模型選擇 */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] text-blue-500 font-bold border-l-2 border-blue-500 pl-2">MODEL</div>
        {OPTIONS.model.map(opt => (
          <button
            key={opt.id}
            onClick={() => updateConfig("model", opt.id)}
            className={`
              relative p-2 rounded-lg border text-xs transition-all duration-300
              ${config.model === opt.id 
                ? "bg-blue-900/40 border-cyan-400 text-white shadow-[0_0_10px_rgba(34,211,238,0.3)]" 
                : "bg-gray-900/50 border-gray-700 text-gray-500 hover:border-gray-500"}
            `}
          >
             {opt.label}
          </button>
        ))}
      </div>

      {/* 2. 顏色選擇 */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] text-blue-500 font-bold border-l-2 border-blue-500 pl-2">COLOR</div>
        {OPTIONS.color.map(opt => (
          <button
            key={opt.id}
            onClick={() => updateConfig("color", opt.id)}
            className={`
              relative p-2 rounded-lg border text-xs transition-all duration-300
              ${config.color === opt.id 
                ? "bg-blue-900/40 border-cyan-400 text-white shadow-[0_0_10px_rgba(34,211,238,0.3)]" 
                : "bg-gray-900/50 border-gray-700 text-gray-500 hover:border-gray-500"}
            `}
          >
             {opt.label}
          </button>
        ))}
      </div>

      {/* 3. 個性選擇 */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] text-blue-500 font-bold border-l-2 border-blue-500 pl-2">TYPE</div>
        {OPTIONS.type.map(opt => (
          <button
            key={opt.id}
            onClick={() => updateConfig("personality", opt.id)}
            className={`
              relative p-2 rounded-lg border text-xs transition-all duration-300
              ${config.personality === opt.id 
                ? "bg-blue-900/40 border-cyan-400 text-white shadow-[0_0_10px_rgba(34,211,238,0.3)]" 
                : "bg-gray-900/50 border-gray-700 text-gray-500 hover:border-gray-500"}
            `}
          >
             {opt.label}
          </button>
        ))}
      </div>

    </div>
  );
}
