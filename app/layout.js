import "./globals.css";

export const metadata = {
  title: "AI Helper",
  description: "AI角色互動系統"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
