import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import { MessagingProvider } from "@/components/MessagingProvider";
import "./globals.css";
import "./duducare.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Duducare | Your farm companion",
    template: "%s | Duducare",
  },
  description:
    "Crop health, planting advice, farm chat and observations. An agricultural demo with local simulated evidence.",
  applicationName: "Duducare",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Duducare" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#17462f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider><MessagingProvider>{children}</MessagingProvider></LanguageProvider>
      </body>
    </html>
  );
}
