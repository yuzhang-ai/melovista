import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "四景 · 六音区沉浸式钢琴",
  description: "在沧海、山湖、雨夜与暮光四个动态沉浸场景中，用电脑键盘演奏覆盖 C1 到 B6 的真实采样音色。",
  openGraph: {
    title: "四景 · 六音区沉浸式钢琴",
    description: "沧海、山湖、雨夜与暮光，覆盖 C1 到 B6 的动态沉浸式虚拟琴房。",
    images: ["/scenes/coast-video-poster.jpg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
