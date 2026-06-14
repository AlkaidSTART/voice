import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "语音绘图助手",
  description: "通过语音输入创建图像",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
