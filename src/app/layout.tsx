import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

// Geist for all text, Geist Mono for numbers.
const ui = Geist({ variable: "--font-ui", subsets: ["latin"] });
const data = Geist_Mono({ variable: "--font-data", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${siteConfig.name} - Blood pressure & diabetes tracker`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
};

export const viewport: Viewport = { themeColor: "#f8fafc", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${data.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
