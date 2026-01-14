"use client";
import CompassCreator from "../Creator/CompassCreator";

export default function CreatorHUD({ isApproaching, onConfigChange, onFinish }) {
  return (
    <div className={`absolute inset-0 z-10 flex flex-col justify-end pointer-events-none transition-all duration-700 ${isApproaching ? "opacity-0 translate-y-20" : "opacity-100"}`}>
      <div className="absolute top-24 w-full text-center pointer-events-none">
         <span className="bg-blue-500/10 text-blue-300 text-[10px] px-3 py-1 rounded-full border border-blue-500/20 backdrop-blur animate-pulse">⚠️ 實體化數據不足，僅顯示全像投影</span>
      </div>
      <div className="w-full px-6 mb-2 flex justify-between items-end pointer-events-auto z-20 relative top-4">
         <div>
            <h2 className="text-xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">角色設定</h2>
            <p className="text-[10px] text-cyan-400 tracking-widest font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">SYSTEM CONSOLE</p>
         </div>
         <button onClick={onFinish} className="group bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-full font-bold shadow-[0_0_15px_rgba(37,99,235,0.5)] active:scale-95 flex items-center gap-2 cursor-pointer border border-blue-400/30">
           <span className="text-sm">完成</span><span className="group-hover:translate-x-1 transition-transform">➜</span>
         </button>
      </div>
      <div className="w-full pointer-events-auto relative">
         <div className="absolute inset-0 bg-gradient-to-t from-[#02020a] via-[#0a0a1a]/90 to-transparent border-t border-cyan-500/30 shadow-[0_-10px_30px_rgba(0,255,255,0.1)] backdrop-blur-xl clip-path-console-top"></div>
         <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
         <div className="relative z-10 pt-6 pb-safe-bottom">
            <CompassCreator onChange={onConfigChange} />
         </div>
      </div>
    </div>
  );
}
