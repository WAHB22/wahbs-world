import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import "@/styles/app.css";
import { WorldProvider } from "@/data/runtime";
import { TransitionLayer } from "@/motion/TransitionLayer";
import { LivingSystem } from "@/living/LivingSystem";
import { Lock } from "@/privacy/Lock";
import { MotionPreference } from "@/ui/MotionPreference";
import { Toaster } from "@/ui/kit/toast";
import { UpdateReload } from "@/ui/UpdateReload";

export const metadata: Metadata = {
  title: { default: "Wahb's World", template: "%s, Wahb's World" },
  description: "School, work, money, projects, career, knowledge, training and life in one place.",
  applicationName: "Wahb's World",
  appleWebApp: { capable: true, title: "World", statusBarStyle: "default" },
  robots: { index: false, follow: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F4F4F6" }, { media: "(prefers-color-scheme: dark)", color: "#0B0B0D" }],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>
        <WorldProvider>
          <MotionPreference />
          <LivingSystem />
          <UpdateReload />
          <Lock>
            {children}
          </Lock>
          <TransitionLayer />
          <Toaster />
        </WorldProvider>
      </body>
    </html>
  );
}
