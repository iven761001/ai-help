import "./globals.css";

export const metadata = {
  title: "南膜工坊 AI 小管家",
  description: "專屬你的鍍膜與清潔 AI 助理"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body className="bg-slate-100 min-h-screen">{children}</body>
    </html>
  );
}
