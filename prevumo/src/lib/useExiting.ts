import { useEffect, useState } from "react";

/**
 * Keeps removed items rendered for `ms` with `leaving: true`, so lists can animate out
 * instead of snapping. Items that appear after the first render start with `entering: true` for two frames.
 */
export function useExiting<T>(items: T[], key: (t: T) => string, ms = 360) {
  const sig = items.map(key).join("|");
  const [prev, setPrev] = useState({ sig, items });
  const [leaving, setLeaving] = useState<T[]>([]);
  const [entered, setEntered] = useState(() => new Set(sig ? sig.split("|") : []));

  if (sig !== prev.sig) {
    const ids = new Set(items.map(key));
    const gone = prev.items.filter((p) => !ids.has(key(p)));
    setLeaving((l) => [...l.filter((x) => !ids.has(key(x))), ...gone]);
    setPrev({ sig, items });
  }

  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setEntered(new Set(sig ? sig.split("|") : [])));
    });
    const t = window.setTimeout(() => setLeaving([]), ms);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [sig, ms]);

  return [
    ...items.map((item) => ({ item, leaving: false, entering: !entered.has(key(item)) })),
    ...leaving.map((item) => ({ item, leaving: true, entering: false })),
  ];
}
