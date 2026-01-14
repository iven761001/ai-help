"use client";
import { useState, useEffect } from "react";

export default function BootScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return old + Math.random() * 15;
      });
    }, 150);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black font-mono z-50 absolute inset-0">
      <div className="w-64">
        <h1 className="text-blue-400 text-xs tracking-[0.3em] mb-2 animate-pulse">SYSTEM INITIALIZING...</h1>
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] transition-all duration-200 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-[10px] text-gray-500 mt-2 h-4 overflow-hidden">
          {progress < 100 ? `LOADING MODULE: 0x${Math.floor(progress * 1234).toString(16)}` : "COMPLETE"}
        </div>
      </div>
    </div>
  );
}
