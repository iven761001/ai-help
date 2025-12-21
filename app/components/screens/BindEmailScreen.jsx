// app/components/screens/BindEmailScreen.jsx
"use client";

export default function BindEmailScreen({ email, setEmail, onSubmit }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div
        className="
          w-full max-w-md
          rounded-[28px]
          bg-white/10 backdrop-blur-xl
          border border-white/15
          shadow-[0_20px_80px_rgba(0,0,0,0.45)]
          p-5
          text-white
        "
      >
        <h1 className="text-xl font-bold text-center">南膜工坊 AI 小管家</h1>
        <p className="text-xs text-white/70 text-center mt-2 leading-relaxed">
          先綁定你的 Email，接下來會幫你客製專屬的小管家角色。
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <div className="text-sm font-semibold mb-2">你的 Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="
                w-full rounded-2xl
                bg-black/20 text-white
                border border-white/15
                px-4 py-3 text-sm outline-none
                placeholder:text-white/40
                focus:ring-2 focus:ring-sky-400
              "
            />
          </div>

          <button
            type="submit"
            className="
              w-full rounded-2xl
              bg-sky-500 hover:bg-sky-400
              text-white font-semibold
              py-3 text-sm
              active:scale-[0.99]
              transition
            "
          >
            下一步：塑造我的 AI 角色
          </button>

          <div className="text-[11px] text-white/55 text-center">
            之後再掃同一個 QR Code，系統會記得你的角色設定。
          </div>
        </form>
      </div>
    </main>
  );
}
