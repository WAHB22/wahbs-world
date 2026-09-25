"use client";

import { ImageSquare, X } from "@phosphor-icons/react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { dayLabel, localDay } from "@/data/dates";
import { addPhoto, deletePhotoFile, photoUrl, uploadPending } from "@/data/media";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import type { Store } from "@/data/store";
import { playSound } from "@/living/sound";
import { EditSheet, type FieldSpec } from "@/ui/kit/EditSheet";
import { removeWithUndo, toast } from "@/ui/kit/toast";
import { Shell } from "@/ui/Shell";

const KINDS = ["spontaneous", "good_day", "hard_day", "place", "meal", "outing", "people", "mistake"] as const;
const KIND_LABEL: Record<string, string> = { spontaneous: "A moment", good_day: "A good day", hard_day: "A hard day", place: "A place", meal: "A meal", outing: "An outing", people: "People", mistake: "A mistake, and the lesson" };

function spec(known: string[]): FieldSpec[] {
  return [
    { name: "title", label: "What happened", type: "text", required: true },
    { name: "occurred_on", label: "Day", type: "date", required: true },
    { name: "kind", label: "Kind", type: "select", required: true, options: KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] })) },
    { name: "place", label: "Where", type: "text" },
    { name: "people", label: "Who was there (names, separated by commas)", type: "list", hint: known.length ? `Names you have used: ${known.slice(0, 14).join(", ")}` : undefined },
    { name: "body", label: "Remember it", type: "textarea" },
  ];
}

/** Every name typed in a moment is kept: first time seen, and how often it comes up. */
async function rememberNames(store: Store, names: string[], before: string[], day: string) {
  const people = await store.all("people");
  const had = new Set(before.map((n) => n.toLowerCase()));
  for (const raw of names) {
    const name = raw.trim();
    if (!name || had.has(name.toLowerCase())) continue;
    const p = people.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (p) await store.patch("people", p.id, { times_mentioned: p.times_mentioned + 1, first_seen_on: day < p.first_seen_on ? day : p.first_seen_on });
    else await store.put("people", { name, first_seen_on: day, times_mentioned: 1 });
  }
}

function useLife() {
  const { store } = useWorld();
  return useLiveQuery(async () => {
    if (!store) return undefined;
    const today = localDay();
    const [memories, people, photos] = await Promise.all([store.all("memories"), store.all("people"), store.all("photos")]);
    const sorted = memories.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || b.created_at.localeCompare(a.created_at));
    const months = new Map<string, Row<"memories">[]>();
    for (const m of sorted) months.set(m.occurred_on.slice(0, 7), [...(months.get(m.occurred_on.slice(0, 7)) ?? []), m]);
    return {
      today, months: [...months.entries()], memories: sorted, people: people.sort((a, b) => b.times_mentioned - a.times_mentioned || a.name.localeCompare(b.name)),
      photosOf: (id: string) => photos.filter((p) => p.memory_id === id), photoCount: photos.length,
      thisMonth: memories.filter((m) => m.occurred_on.startsWith(today.slice(0, 7))).length,
    };
  }, [store]);
}

export default function Life() {
  const { store } = useWorld();
  const data = useLife();
  const [editing, setEditing] = useState<Partial<Row<"memories">> | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [person, setPerson] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Row<"photos"> | null>(null);
  useEffect(() => { if (store) void uploadPending(store); }, [store]);

  const monthName = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  const months = (data?.months ?? []).map(([m, list]) => [m, list.filter((x) => !person || x.people.some((p) => p.toLowerCase() === person.toLowerCase()))] as const).filter(([, list]) => list.length);

  async function save(v: Record<string, unknown>) {
    if (!store || !editing) return;
    const values = { ...editing, ...v } as Row<"memories">;
    const names = [...new Map((values.people ?? []).map((n) => [n.toLowerCase(), n.trim()])).values()].filter(Boolean);
    const m = await store.put("memories", { ...values, people: names } as never);
    await rememberNames(store, names, editing.people ?? [], m.occurred_on);
    for (const f of files) await addPhoto(store, f, m.id);
    setFiles([]);
    if (!editing.id) playSound("check");
    toast(editing.id ? "Moment saved." : "Moment kept.");
  }

  return (
    <Shell title="Life" world="life" lede={data ? `${data.memories.length} moments kept, ${data.people.length} ${data.people.length === 1 ? "person" : "people"} in them.` : undefined}
      actions={<button className="btn btn-primary" data-testid="add-moment" onClick={() => { setFiles([]); setEditing({ occurred_on: localDay(), kind: "spontaneous", people: [] }); }}>Keep a moment</button>}>
      <section className="hero-figures" aria-label="Life at a glance">
        <div className="figure-block figure-main">
          <span className="figure-label">This month</span>
          <span className="figure-xl">{data?.thisMonth ?? 0}</span>
          <span className="figure-note">{data?.thisMonth === 1 ? "moment" : "moments"} kept</span>
        </div>
        <div className="figure-block">
          <span className="figure-label">Photos</span>
          <span className="figure-lg">{data?.photoCount ?? 0}</span>
          <span className="figure-note">Compressed on this device and kept private</span>
        </div>
      </section>

      <div className="world-grid two" style={{ marginTop: 14 }}>
        <section className="panel" aria-labelledby="tl-h">
          <div className="section-head">
            <h2 id="tl-h" className="panel-title">{person ? `With ${person}` : "Timeline"}</h2>
            {person && <button className="btn btn-small btn-ghost" onClick={() => setPerson(null)}><X size={14} aria-hidden="true" /> Everyone</button>}
          </div>
          {months.map(([m, list]) => (
            <div key={m} className="month-block">
              <h3 className="group-name">{monthName(m)}</h3>
              <ol className="timeline" data-testid="timeline">
                {list.map((x) => (
                  <li key={x.id}>
                    <button className="linkless memory" onClick={() => { setFiles([]); setEditing(x); }}>
                      <span className="timeline-date">{dayLabel(x.occurred_on, data!.today)}{x.place ? `, ${x.place}` : ""}</span>
                      <span className="memory-title">{x.title}</span>
                      {x.body && <span className="memory-body">{x.body}</span>}
                      <span className="card-meta"><span className="chip">{KIND_LABEL[x.kind]}</span>{x.people.map((p) => <span key={p} className="chip">{p}</span>)}</span>
                    </button>
                    <Photos photos={data!.photosOf(x.id)} onOpen={setViewing} />
                  </li>
                ))}
              </ol>
            </div>
          ))}
          {data && !months.length && <p className="empty">{person ? "No moments with this name yet." : "Keep a moment: a good meal, a hard day, who was there. A photo if you like."}</p>}
        </section>

        <section className="panel" aria-labelledby="pp-h">
          <h2 id="pp-h" className="panel-title">People</h2>
          <p className="hint" style={{ marginBottom: 10 }}>Every name you type is kept here. Tap one to see your moments with them.</p>
          <ul className="list" data-testid="people">
            {(data?.people ?? []).map((p) => (
              <li key={p.id}><button className="row-btn" aria-pressed={person === p.name} onClick={() => setPerson(person === p.name ? null : p.name)}>
                <span className="row-main">{p.name}</span>
                <span className="row-sub">First seen {dayLabel(p.first_seen_on, data!.today)}</span>
                <span className="row-side">{p.times_mentioned}</span>
              </button></li>
            ))}
            {data && !data.people.length && <li className="empty">No names yet.</li>}
          </ul>
        </section>
      </div>

      {editing && store && data && (
        <EditSheet title={editing.id ? "Edit moment" : "Keep a moment"} spec={spec(data.people.map((p) => p.name))} row={editing as Record<string, unknown>}
          onSave={save}
          onDelete={editing.id ? async () => { for (const p of data.photosOf(editing.id!)) await store.remove("photos", p.id); await removeWithUndo(store as never, "memories", editing.id!, editing.title ?? "Moment"); } : undefined}
          onClose={() => setEditing(null)}
          extra={
            <div className="field wide photo-pick">
              <label htmlFor="photos">Photos</label>
              <input id="photos" type="file" accept="image/*" multiple onChange={(e) => setFiles([...(e.target.files ?? [])])} data-testid="photo-input" />
              {files.length > 0 && <p className="hint">{files.length} {files.length === 1 ? "photo" : "photos"} will be compressed and kept on this device.</p>}
            </div>
          } />
      )}
      {viewing && <Viewer photo={viewing} onClose={() => setViewing(null)} onDelete={async () => { if (!store) return; await store.remove("photos", viewing.id); await deletePhotoFile(viewing.id); setViewing(null); toast("Photo removed."); }} />}
    </Shell>
  );
}

function Photos({ photos, onOpen }: { photos: Row<"photos">[]; onOpen: (p: Row<"photos">) => void }) {
  if (!photos.length) return null;
  return <div className="thumbs">{photos.map((p) => <Thumb key={p.id} photo={p} onOpen={onOpen} />)}</div>;
}

function Thumb({ photo, onOpen }: { photo: Row<"photos">; onOpen: (p: Row<"photos">) => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { void photoUrl(photo.id, photo.storage_path, "thumb").then(setSrc); }, [photo.id, photo.storage_path]);
  return (
    <button className="thumb" onClick={() => onOpen(photo)} aria-label="Open photo" style={{ aspectRatio: photo.width && photo.height ? `${photo.width} / ${photo.height}` : "4 / 3" }}>
      {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : <ImageSquare size={24} aria-hidden="true" />}
    </button>
  );
}

function Viewer({ photo, onClose, onDelete }: { photo: Row<"photos">; onClose: () => void; onDelete: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { void photoUrl(photo.id, photo.storage_path, "full").then(setSrc); }, [photo.id, photo.storage_path]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <>
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div className="viewer" role="dialog" aria-label="Photo">
        {src ? <img src={src} alt="" /> : <p className="soft">This photo is on another device.</p>}
        <div className="row-actions"><button className="btn" onClick={onClose} autoFocus>Close</button><button className="btn btn-ghost btn-danger" onClick={onDelete}>Remove photo</button></div>
      </div>
    </>
  );
}
