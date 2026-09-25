"use client";

import { useEffect } from "react";

/** When a new version of the app takes over, reload once so the page on screen is the new one too. */
export function UpdateReload() {
  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw || !sw.controller) return; // first visit: nothing old to replace
    let done = false;
    const onChange = () => {
      if (done) return;
      done = true;
      window.location.reload();
    };
    sw.addEventListener("controllerchange", onChange);
    void sw.getRegistration().then((r) => r?.update());
    return () => sw.removeEventListener("controllerchange", onChange);
  }, []);
  return null;
}
