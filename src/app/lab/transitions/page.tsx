"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWorld } from "@/data/runtime";
import { prefersReduced } from "@/motion/TransitionLayer";
import { scheduleSnapshot } from "@/motion/snapshot";
import { runTransition, TRANSITIONS, type TransitionKind } from "@/motion/transitions";
import { Shell } from "@/ui/Shell";

type StageHandle = { play: () => void };

function Stage({ kind, name, line, chosen, onChoose, register }: {
  kind: TransitionKind; name: string; line: string; chosen: boolean; onChoose: () => void; register: (h: StageHandle) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [inWorld, setInWorld] = useState(false);
  const busy = useRef(false);

  function play() {
    const s = stage.current, p = pane.current, t = title.current;
    if (!s || !p || !t || busy.current) return;
    busy.current = true;
    const sr = s.getBoundingClientRect(), pr = p.getBoundingClientRect();
    setInWorld(true);
    const tr = t.getBoundingClientRect();
    const run = runTransition({
      kind, host: s, accent: "ember", name: "Today", reduced: prefersReduced(), source: s.querySelector<HTMLElement>(".lab-landing"),
      bounds: { x: 0, y: 0, w: sr.width, h: sr.height },
      from: { x: pr.left - sr.left, y: pr.top - sr.top, w: pr.width, h: pr.height },
      title: { x: tr.left - sr.left, y: tr.top - sr.top, w: tr.width, h: tr.height },
    });
    void run.finished.then(() => setTimeout(() => {
      setInWorld(false); busy.current = false;
      if (kind === "shatter") scheduleSnapshot(s.querySelector<HTMLElement>(".lab-landing"), 400);
    }, 1100));
  }
  register({ play });
  useEffect(() => { if (kind === "shatter") scheduleSnapshot(stage.current?.querySelector<HTMLElement>(".lab-landing") ?? null, 1000); }, [kind]);

  return (
    <section className="lab-card glass" aria-labelledby={`lab-${kind}`}>
      <div className="lab-stage" ref={stage} data-in-world={inWorld || undefined}>
        <div className="lab-landing" aria-hidden={inWorld}>
          <span className="lab-wahb">WORLD</span>
          <div className="lab-pane glass" ref={pane}><span className="pane-plate"><span className="pane-name" style={{ color: "var(--color-glow)" }}>Today</span><span className="pane-line">2 things need you</span></span></div>
        </div>
        <div className="lab-world" aria-hidden={!inWorld}>
          <h3 ref={title} className="lab-title">Today</h3>
          <p className="soft">The one thing: CHM 2120 Midterm 1</p>
        </div>
      </div>
      <div className="lab-meta">
        <h2 id={`lab-${kind}`} className="pane-title">{name}</h2>
        <p className="soft">{line}</p>
        <div className="row-actions">
          <button className="btn" onClick={play} data-testid={`play-${kind}`}>Play</button>
          <button className={`btn ${chosen ? "btn-blue" : "btn-primary"}`} onClick={onChoose} aria-pressed={chosen} data-testid={`choose-${kind}`}>
            {chosen ? "Chosen" : "Use this one"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function TransitionLab() {
  const { store } = useWorld();
  const settings = useLiveQuery(async () => (store ? (await store.all("settings"))[0] : undefined), [store]);
  const handles = useRef<Record<string, StageHandle>>({});
  const current = (settings?.transition as TransitionKind | undefined) ?? "shatter";

  async function choose(kind: TransitionKind) {
    if (!store) return;
    if (settings) await store.patch("settings", settings.id, { transition: kind });
    else await store.put("settings", { transition: kind });
  }

  return (
    <Shell title="Choose the transition" accent="ember">
      <p className="soft lab-intro">
        Four ways to enter a world from the landing. Play them side by side, then pick one. You can change it any time in Settings, and
        with reduced motion on every one of them becomes a short crossfade.
      </p>
      <div className="row-actions lab-top">
        <button className="btn btn-blue" onClick={() => Object.values(handles.current).forEach((h) => h.play())}>Play all four</button>
        <Link className="btn" href="/">Try it on the real landing</Link>
      </div>
      <div className="lab-grid">
        {TRANSITIONS.map((t) => (
          <Stage key={t.kind} {...t} chosen={current === t.kind} onChoose={() => choose(t.kind)} register={(h) => { handles.current[t.kind] = h; }} />
        ))}
      </div>
    </Shell>
  );
}
