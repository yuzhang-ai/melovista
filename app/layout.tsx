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
  title: "乐境 MeloVista · 沉浸式六音区钢琴",
  description: "乐境 MeloVista 提供中英文界面，在沧海、山湖、雨夜与暮光四个动态场景中演奏覆盖 C1 到 B6 的真实采样音色。",
  openGraph: {
    title: "乐境 MeloVista · Immersive Piano",
    description: "A bilingual immersive piano room with four living scenes and six visible octaves.",
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
