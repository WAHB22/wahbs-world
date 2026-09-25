import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import "@/styles/app.css";
import { WorldProvider } from "@/data/runtime";
import { MotionPreference } from "@/ui/MotionPreference";
import { TransitionLayer } from "@/motion/TransitionLayer";
import { UpdateReload } from "@/ui/UpdateReload";
import { Toaster } from "@/ui/kit/toast";

export const metadata: Metadata = {
  title: "WAHB'S WORLD",
  description: "Wahb's world: school, work, money, projects, career, knowledge, training and life in one place.",
  applicationName: "WAHB'S WORLD",
  appleWebApp: { capable: true, title: "WAHB", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#1A46C4",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/Anybody-normal-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/AtkinsonHyperlegibleNext-normal-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <div className="sky" aria-hidden="true"><i /><i /><i /><i /></div>
        <WorldProvider>
          <MotionPreference />
          <UpdateReload />
          {children}
          <TransitionLayer />
          <Toaster />
        </WorldProvider>
      </body>
    </html>
  );
}
