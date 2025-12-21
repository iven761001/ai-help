// app/components/screens/BindEmailScreen.jsx
"use client";

export default function BindEmailScreen({ email, setEmail, onSubmit }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-card rounded-[28px] p-5">
        <h1 className="text-xl font-bold text-white text-center">
          南膜工坊 AI 小管家
        </h1>

        <p className="text-sm text-white/70 text-center mt-2">
          先綁定你的 Email，接下來會幫你客製專屬的小管家角色。
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <div className="text-sm font-semibold text-white mb-2">你的 Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="
                w-full rounded-2xl px-4 py-3
                bg-black/20 text-white
                border border-white/15
                outline-none
                placeholder:text-white/35
                focus:ring-2 focus:ring-sky-400
              "
              inputMode="email"
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            className="
              w-full rounded-2xl py-3
              bg-sky-500 hover:bg-sky-400
              text-white font-semibold
              active:scale-[0.99] transition
            "
          >
            下一步：塑造我的 AI 角色
          </button>

          <div className="text-xs text-white/55 text-center">
            之後再掃同一個 QR Code，系統會記得你的角色設定。
          </div>
        </form>
      </div>
    </main>
  );
}
