"use client";

export default function BindEmailScreen({ email, setEmail, onSubmit }) {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-card p-6 space-y-4">
        <h1 className="text-2xl font-bold text-white text-center">南膜工坊 AI 小管家</h1>
        <p className="text-sm text-white/70 text-center">
          先綁定你的 Email，接下來會幫你客製專屬的小管家角色。
        </p>

        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">你的 Email</label>
            <input
              type="email"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none
                         border border-white/15 bg-black/20 text-white
                         placeholder:text-white/35 focus:ring-2 focus:ring-sky-400"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl py-2 text-sm font-medium
                       bg-sky-500/90 hover:bg-sky-400 text-white
                       shadow-[0_10px_30px_rgba(56,189,248,0.18)]"
          >
            下一步：塑造我的 AI 角色
          </button>
        </form>

        <p className="text-xs text-white/50 text-center">
          之後再掃同一個 QR Code，系統會記得你的角色設定。
        </p>
      </div>
    </main>
  );
}
