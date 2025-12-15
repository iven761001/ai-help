"use client";

export default function BindEmailScreen({ email, setEmail, onSubmit }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h1 className="text-2xl font-bold text-slate-800 text-center">
          南膜工坊 AI 小管家
        </h1>
        <p className="text-sm text-slate-500 text-center">
          先綁定你的 Email，接下來會幫你客製專屬的小管家角色。
        </p>

        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              你的 Email
            </label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 rounded-lg text-sm"
          >
            下一步：塑造我的 AI 角色
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center">
          之後再掃同一個 QR Code，系統會記得你的角色設定。
        </p>
      </div>
    </main>
  );
}
