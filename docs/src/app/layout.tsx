import { Provider } from "@/components/provider";
import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: {
    default: "Twinkle Video 文档",
    template: "%s | Twinkle Video 文档",
  },
  description:
    "Twinkle Video - AI创意工作台官方文档，提供图片、视频、音频、短剧等多种AI生成能力的完整指南。",
  keywords: [
    "Twinkle Video",
    "AI创意",
    "图片生成",
    "视频生成",
    "短剧制作",
    "AI工作台",
    "文档",
  ],
  authors: [{ name: "Twinkle Video Team" }],
  creator: "Twinkle Video Team",
  publisher: "Twinkle Video",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://docs.vozeb.pro",
  ),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/logo.jpg",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    title: "Twinkle Video 文档",
    description: "Twinkle Video - AI创意工作台官方文档",
    siteName: "Twinkle Video 文档",
    images: ["/logo.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Twinkle Video 文档",
    description: "Twinkle Video - AI创意工作台官方文档",
    images: ["/logo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
