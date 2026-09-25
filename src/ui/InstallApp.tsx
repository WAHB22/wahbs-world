"use client";

import { useEffect, useState } from "react";

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Offers installing to the home screen where the browser allows it, and says how on iPhone. */
export function InstallApp() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent));
    const on = (e: Event) => { e.preventDefault(); setPrompt(e as Prompt); };
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);
  if (installed) return <p className="soft">Installed on this device. It opens full screen and works offline.</p>;
  if (prompt) return <div className="row-actions"><button className="btn btn-primary" onClick={async () => { await prompt.prompt(); setPrompt(null); }}>Install the app</button></div>;
  return <p className="soft">{ios ? "To install on iPhone: Share, then Add to Home Screen. It then opens full screen and works offline." : "Your browser can install this as an app from its menu. It then works offline."}</p>;
}
