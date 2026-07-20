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

const deploymentHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  process.env.VERCEL_URL ??
  "melovista.vercel.app";
const deploymentUrl = deploymentHost.startsWith("http")
  ? deploymentHost
  : `https://${deploymentHost}`;

export const metadata: Metadata = {
  metadataBase: new URL(deploymentUrl),
  title: "乐境 MeloVista · 沉浸式六音区钢琴",
  description: "乐境 MeloVista 提供中英文界面、四首内置钢琴曲、本地 MIDI 文件夹曲库与鼠标触控钢琴，在四个动态场景中自动演奏、自由跟弹。",
  openGraph: {
    title: "乐境 MeloVista · Immersive Piano",
    description: "A bilingual immersive piano room with four living scenes, a private local MIDI folder library, soft ambience and touch performance.",
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
