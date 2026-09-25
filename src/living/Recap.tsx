"use client";

import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { dayLabel, localDay } from "@/data/dates";
import { photoUrl } from "@/data/media";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { money } from "@/ui/format";
import { Shell } from "@/ui/Shell";
import { useSummary } from "./summary";

/**
 * The weekly recap and the monthly chapter: what got done, the hours, the money, showing up, the
 * moments. A title and a note are yours to write; a month can take one of its photos as its cover.
 */
export function Recap({ kind, from, to, title, prev, next, isCurrent }: {
  kind: "week" | "month"; from: string; to: string; title: string; prev: string; next: string | null; isCurrent: boolean;
}) {
  const { store } = useWorld();
  const s = useSummary(kind, from, to);
  const today = localDay();
  const [name, setName] = useState(""), [note, setNote] = useState("");
  // Follow what is saved, but never overwrite a field while it is being typed in.
  useEffect(() => {
    const typing = typeof document !== "undefined" ? document.activeElement?.id : undefined;
    if (typing !== "ch-title") setName(s?.chapter?.title ?? "");
    if (typing !== "ch-note") setNote(s?.chapter?.note ?? "");
  }, [s?.chapter?.id, s?.chapter?.title, s?.chapter?.note, from]);

  // Saves run one after another and carry the row id, so two quick edits never make two chapters.
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const saved = useRef<{ from: string; id?: string }>({ from });
  if (saved.current.from !== from) saved.current = { from };
  function keep(fields: Partial<Row<"chapters">>) {
    if (!store) return;
    chain.current = chain.current.then(async () => {
      const id = s?.chapter?.id ?? saved.current.id;
      const base = (id ? await store.get("chapters", id) : undefined) ?? { period_kind: kind, period_start: from };
      const row = await store.put("chapters", { ...base, ...(id ? { id } : {}), title: name || null, note: note || null, ...fields } as never);
      if (saved.current.from === from) saved.current.id = row.id;
    });
  }

  const noun = kind === "week" ? "week" : "month";
  const long = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
  const cover = s?.photos.find((p) => p.id === s.chapter?.cover_photo_id) ?? (kind === "month" ? s?.photos[0] : undefined);
  return (
    <Shell title={title} lede={`${kind === "week" ? "The weekly recap" : "The monthly chapter"}, ${long(from)} to ${long(to)}${isCurrent ? ", so far" : ""}.`}
      actions={<><Link className="btn" href={prev} aria-label={`Previous ${noun}`}><ArrowLeft size={16} aria-hidden="true" /> Earlier</Link>{next && <Link className="btn" href={next} aria-label={`Next ${noun}`}>Later <ArrowRight size={16} aria-hidden="true" /></Link>}</>}>
      {kind === "month" && cover && <Cover photo={cover} />}
      <section className="panel chapter-title" aria-label="Title and note">
        <div className="field"><label htmlFor="ch-title">Call this {noun}</label><input id="ch-title" value={name} placeholder={kind === "week" ? "The week the midterm went well" : "The month it all started"} onChange={(e) => setName(e.target.value)} onBlur={() => name !== (s?.chapter?.title ?? "") && keep({ title: name || null })} data-testid="chapter-title" /></div>
        <div className="field"><label htmlFor="ch-note">A note to your future self</label><textarea id="ch-note" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (s?.chapter?.note ?? "") && keep({ note: note || null })} /></div>
      </section>

      <section className="hero-figures recap-figures" aria-label="In numbers">
        <div className="figure-block figure-main"><span className="figure-label">Got done</span><span className="figure-xl">{s?.done.length ?? 0}</span><span className="figure-note">deadlines and tasks</span></div>
        <div className="figure-block"><span className="figure-label">Worked</span><span className="figure-lg">{Math.round((s?.hours ?? 0) * 10) / 10} h</span><span className="figure-note">{s?.pay != null ? `about ${money(s.pay)} earned` : "Add your wage in Work to see pay"}</span></div>
        <div className="figure-block"><span className="figure-label">Spent</span><span className="figure-lg">{money(s?.spent ?? 0)}</span><span className="figure-note">{s?.income ? `${money(s.income)} came in` : "Nothing came in"}</span></div>
        <div className="figure-block"><span className="figure-label">Showed up</span><span className="figure-lg">{s?.sessions ?? 0}</span><span className="figure-note">{s?.sessions === 1 ? "training session" : "training sessions"}, {Math.round((s?.projectMinutes ?? 0) / 6) / 10} h on projects</span></div>
      </section>

      <div className="world-grid two" style={{ marginTop: 14 }}>
        <section className="panel" aria-labelledby="done-h">
          <h2 id="done-h" className="panel-title">What got done</h2>
          <ul className="list">{(s?.done ?? []).map((d) => <li key={d.id} className="plain-row"><span>{d.label}</span><span className="mono hint">{dayLabel(d.on, today)}</span></li>)}</ul>
          {s && !s.done.length && <p className="empty">Nothing marked done in this {noun}.</p>}
          {s && s.categories.length > 0 && (
            <>
              <h2 className="panel-title" style={{ marginTop: 24 }}>Where the money went</h2>
              <ul className="list">{s.categories.map((c) => <li key={c.name} className="plain-row"><span>{c.name}</span><span className="mono">{money(c.cents)}</span></li>)}</ul>
            </>
          )}
        </section>
        <section className="panel" aria-labelledby="mom-h">
          <h2 id="mom-h" className="panel-title">Moments</h2>
          <ol className="timeline">{(s?.memories ?? []).map((m) => <li key={m.id}><span className="timeline-date">{dayLabel(m.occurred_on, today)}</span><span className="memory-title">{m.title}</span>{m.people.length > 0 && <span className="hint">With {m.people.join(", ")}</span>}</li>)}</ol>
          {s && !s.memories.length && <p className="empty">No moments kept. <Link href="/life">Keep one in Life.</Link></p>}
          {s && s.learned.length > 0 && (
            <>
              <h2 className="panel-title" style={{ marginTop: 24 }}>What you learned</h2>
              <ul className="list">{s.learned.map((k) => <li key={k.id} className="plain-row"><span>{k.topic}</span></li>)}</ul>
            </>
          )}
          {kind === "month" && s && s.photos.length > 1 && (
            <>
              <h2 className="panel-title" style={{ marginTop: 24 }}>Choose the cover</h2>
              <div className="thumbs">{s.photos.map((p) => <CoverPick key={p.id} photo={p} on={p.id === cover?.id} onPick={() => keep({ cover_photo_id: p.id })} />)}</div>
            </>
          )}
        </section>
      </div>
    </Shell>
  );
}

function Cover({ photo }: { photo: Row<"photos"> }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { void photoUrl(photo.id, photo.storage_path, "full").then(setSrc); }, [photo.id, photo.storage_path]);
  return src ? <div className="cover"><img src={src} alt="" /></div> : null;
}

function CoverPick({ photo, on, onPick }: { photo: Row<"photos">; on: boolean; onPick: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { void photoUrl(photo.id, photo.storage_path, "thumb").then(setSrc); }, [photo.id, photo.storage_path]);
  return <button className="thumb" aria-pressed={on} aria-label="Use as cover" onClick={onPick}>{src && <img src={src} alt="" />}</button>;
}
