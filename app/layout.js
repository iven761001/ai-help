// app/layout.js
import "./globals.css";

export const metadata = {
  title: "AI Helper",
  description: "AI helper app"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
