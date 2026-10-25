import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Pixelify_Sans } from "next/font/google";
import { SettingsEffect } from "@/store/gameStore";
import { OfflineBanner } from "@/components/OfflineBanner";
import "./globals.css";

const pixel = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
});

const readable = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "MathQuest",
  description: "Your quest. Your knowledge. Your world.",
  icons: { icon: "/favicon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#0b1226",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pixel.variable} ${readable.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <SettingsEffect />
        <OfflineBanner />
        {children}
        <noscript><div className="noscript-banner">MathQuest needs JavaScript to run lessons and battles. Your saved progress stays in this browser.</div></noscript>
      </body>
    </html>
  );
}
