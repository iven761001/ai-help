"use client";

export default function BindEmailScreen({ email, setEmail, onSubmit }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-4">
        <h1 className="text-2xl font-bold text-white text-center">南膜工坊 AI 小管家</h1>
        <p className="text-sm text-white/70 text-center">
          先綁定 Email，接下來會幫你客製專屬角色。
        </p>

        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-white/85 mb-1">你的 Email</label>
            <input
              type="email"
              className="w-full rounded-2xl border border-white/12 bg-black/20 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-medium py-3 text-sm transition"
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
