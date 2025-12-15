import "./globals.css";

export const metadata = {
  title: "南膜工坊 AI 小管家",
  description: "AI 鍍膜與清潔顧問"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
