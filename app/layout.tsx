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
  description: "乐境 MeloVista 提供中英文界面、三首内置钢琴曲、通用本地 MIDI 导入与无缝环境声，在四个动态场景中自动演奏、自由跟弹。",
  openGraph: {
    title: "乐境 MeloVista · Immersive Piano",
    description: "A bilingual immersive piano room with four living scenes, three built-in pieces, soft ambience and local MIDI play-along.",
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
