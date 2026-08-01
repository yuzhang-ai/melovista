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
  title: "琴窗 MeloVista · 沉浸式六音区钢琴",
  description: "琴窗 MeloVista 是一间可以选择风景、载入本地窗景并自由演奏的沉浸式浏览器琴房。",
  openGraph: {
    title: "琴窗 MeloVista · Immersive Piano",
    description: "An immersive browser piano where every player can choose a view or open a private local window of their own.",
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
