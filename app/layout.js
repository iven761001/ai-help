// app/layout.js
import "./globals.css";

export const metadata = {
  title: "南膜工坊 AI 小管家",
  description: "客製你的專屬 AI 小管家"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
