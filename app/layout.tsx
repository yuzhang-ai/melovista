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
  title: "海岸午后 · 三八度沉浸式钢琴",
  description: "在阳光海景琴房中使用电脑键盘演奏三八度真实采样音色。",
  openGraph: {
    title: "海岸午后 · 三八度沉浸式钢琴",
    description: "阳光、海风与真实采样钢琴，一间可以安静停留和演奏的虚拟琴房。",
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
