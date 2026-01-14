export default function SystemExtracting() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="absolute inset-4 border-4 border-t-cyan-400 rounded-full animate-spin-reverse opacity-70"></div>
      </div>
      <h2 className="text-xl font-bold text-white tracking-widest animate-pulse">AI 系統啟動提取中...</h2>
      <p className="text-blue-400 text-xs mt-2 font-mono">DOWNLOADING NEURAL MODEL...</p>
    </div>
  );
}
