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
  title: "四景 · 三八度沉浸式钢琴",
  description: "在海岸、森林、雨夜与星空四个沉浸场景中，用电脑键盘演奏三八度真实采样音色。",
  openGraph: {
    title: "四景 · 三八度沉浸式钢琴",
    description: "海岸、森林、雨夜与星空，四间可以安静停留和演奏的虚拟琴房。",
    images: ["/scenes/coast-afternoon-v1.webp"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
