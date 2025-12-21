"use client";

export default function TechBackground({ children }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* 背景層：永遠在最底，不吃點擊 */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {/* 你現在那張「晶片電路感」背景用 CSS 畫 */}
        <div className="absolute inset-0 opacity-100" style={{ background: "#050A12" }} />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(56,189,248,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.08) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            backgroundPosition: "center"
          }}
        />

        {/* Circuit lines（淡淡的長線） */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(147,197,253,0.12), rgba(147,197,253,0) 60%), linear-gradient(180deg, rgba(147,197,253,0.10), rgba(147,197,253,0) 60%)",
            backgroundSize: "220px 220px"
          }}
        />

        {/* Dots */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(56,189,248,0.55) 0 2px, transparent 3px), radial-gradient(circle at 65% 20%, rgba(56,189,248,0.45) 0 2px, transparent 3px), radial-gradient(circle at 80% 70%, rgba(56,189,248,0.50) 0 2px, transparent 3px), radial-gradient(circle at 35% 80%, rgba(56,189,248,0.40) 0 2px, transparent 3px)",
            filter: "blur(0px)",
            opacity: 0.8
          }}
        />

        {/* vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)"
          }}
        />
      </div>

      {/* 內容層：永遠在背景上面 */}
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
