// components/Creator/WheelPicker.jsx
"use client";

// 單個選項的設計
function WheelItem({ label, isActive, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-center justify-center cursor-pointer transition-all duration-300
        h-10 w-24 rounded-sm
        ${isActive 
          ? "scale-110 z-10" 
          : "scale-90 opacity-40 hover:opacity-70"
        }
      `}
    >
      {/* 🌟 科技感邊框背景 */}
      <div className={`
        absolute inset-0 border-2 skew-x-[-10deg] transition-all duration-300
        ${isActive 
           ? "border-cyan-400 bg-cyan-900/30 shadow-[0_0_15px_rgba(34,211,238,0.5)]" 
           : "border-gray-700 bg-gray-900/50"
        }
      `}></div>

      {/* 裝飾線條 (角落亮點) */}
      {isActive && (
        <>
          <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-cyan-200"></div>
          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-cyan-200"></div>
        </>
      )}

      {/* 文字內容 */}
      <span className={`
        relative z-20 text-xs font-bold tracking-wider uppercase skew-x-[-10deg]
        ${isActive ? "text-cyan-100" : "text-gray-400"}
      `}>
        {label}
      </span>
    </div>
  );
}

// 內部組件
export default function WheelPicker({ label, options, value, onChange }) {
  return (
    <div className="flex flex-col items-center mx-1 w-full">
      {/* 標題 */}
      <div className="flex items-center gap-2 mb-3">
         <div className="w-1 h-3 bg-cyan-500/50"></div>
         <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-bold opacity-80 shadow-black drop-shadow-md">
           {label}
         </span>
         <div className="w-full h-px bg-gradient-to-r from-cyan-500/30 to-transparent"></div>
      </div>
      
      {/* 轉輪視窗 */}
      <div className="relative w-full h-32 flex flex-col items-center justify-center">
        {/* 這裡簡單處理：只顯示選中的、上一個、下一個，或是用捲動容器 */}
        <div 
          className="w-full h-full overflow-y-auto snap-y snap-mandatory py-[40px] no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {options.map((opt) => (
            <div key={opt.id || opt.value} className="snap-center flex justify-center py-1">
              <WheelItem 
                label={opt.label} 
                isActive={(opt.id || opt.value) === value} 
                onClick={() => onChange(opt.id || opt.value)}
              />
            </div>
          ))}
        </div>

        {/* 上下漸層遮罩 (讓滾動看起來有深度) */}
        <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
}
