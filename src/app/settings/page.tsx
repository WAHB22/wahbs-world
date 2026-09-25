"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { exportAll, exportFileName, importAll, previewImport, type ImportPreview } from "@/data/backup";
import { SYNC_MODE } from "@/data/config";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { supabase } from "@/data/supabase";
import { playSound } from "@/living/sound";
import { TRANSITIONS } from "@/motion/transitions";
import { PasscodeSettings } from "@/privacy/PasscodeSettings";
import { InstallApp } from "@/ui/InstallApp";
import { Shell } from "@/ui/Shell";

type Settings = Row<"settings">;

function Choice<K extends keyof Settings>({ label, field, value, options, onChange }: {
  label: string; field: K; value: Settings[K]; options: [Settings[K], string][]; onChange: (field: K, v: Settings[K]) => void;
}) {
  // Answer the tap at once; the saved value follows a moment later.
  const [picked, setPicked] = useState(value);
  useEffect(() => setPicked(value), [value]);
  return (
    <fieldset className="choice">
      <legend>{label}</legend>
      <div className="seg">
        {options.map(([v, text]) => (
          <label key={String(v)} className="tappable">
            <input type="radio" name={String(field)} checked={picked === v} onChange={() => { setPicked(v); onChange(field, v); }} />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function SettingsPage() {
  const { store, engine, status, auth, persisted } = useWorld();
  const settings = useLiveQuery(async () => (store ? (await store.all("settings"))[0] : undefined), [store]);
  const lastExport = useLiveQuery(async () => (store ? await store.getMeta<string>("lastExport") : undefined), [store]);
  const [preview, setPreview] = useState<{ file: unknown; result: ImportPreview; name: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function change<K extends keyof Settings>(field: K, v: Settings[K]) {
    if (!store) return;
    if (settings) await store.patch("settings", settings.id, { [field]: v } as Partial<Settings>);
    else await store.put("settings", { [field]: v });
  }

  async function doExport() {
    if (!store) return;
    const data = await exportAll(store);
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: exportFileName() });
    a.click();
    URL.revokeObjectURL(a.href);
    await store.setMeta("lastExport", new Date().toISOString());
    setMessage(`Exported ${Object.values(data.tables).reduce((n, r) => n + (r?.length ?? 0), 0)} rows.`);
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !store) return;
    try {
      const file = JSON.parse(await f.text());
      setPreview({ file, result: await previewImport(store, file), name: f.name });
    } catch {
      setMessage("That file is not valid JSON.");
    }
  }

  async function confirmImport() {
    if (!store || !preview) return;
    const res = await importAll(store, preview.file);
    setPreview(null);
    setMessage(`Imported ${res.applied} rows. ${res.skipped} were already up to date.`);
    void engine?.sync();
  }

  const s = settings;
  return (
    <Shell title="Settings" lede="How the world looks, sounds and keeps your data.">
      <div className="settings-grid">
        <section className="panel" aria-labelledby="motion-h">
          <h2 id="motion-h" className="panel-title">Look and motion</h2>
          {s && (
            <>
              <Choice label="Theme" field="theme" value={s.theme} onChange={change}
                options={[["system", "Follow the device"], ["light", "Light"], ["dark", "Dark"]]} />
              <Choice label="Movement" field="motion" value={s.motion} onChange={change}
                options={[["system", "Follow the device"], ["full", "Full"], ["reduced", "Reduced"]]} />
              <Choice label="Entering a world" field="transition" value={s.transition === "morph" ? "morph" : "liquid"} onChange={change}
                options={TRANSITIONS.map((t) => [t.kind, t.name])} />
              <p className="hint">{(TRANSITIONS.find((t) => t.kind === (s.transition === "morph" ? "morph" : "liquid")) ?? TRANSITIONS[0]).line}</p>
              <Choice label="Pace never goes above" field="intensity_cap" value={s.intensity_cap} onChange={change}
                options={[["calm", "Calm"], ["opening", "Opening"], ["service", "Service"], ["rush", "Rush"]]} />
              <p className="hint">The day&apos;s pace comes from the time and what is due. It sets how lively the chrome and the highlights are.</p>
            </>
          )}
        </section>

        <section className="panel" aria-labelledby="sound-h">
          <h2 id="sound-h" className="panel-title">Sound</h2>
          {s && (
            <>
              <Choice label="Profile" field="sound_profile" value={s.sound_profile} onChange={change}
                options={[["off", "Off"], ["subtle", "Subtle"], ["full", "Full"]]} />
              <div className="field">
                <label htmlFor="vol">Volume</label>
                <input id="vol" type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => change("volume", Number(e.target.value))} />
              </div>
              <div className="row-actions"><button className="btn btn-small" disabled={s.sound_profile === "off"} onClick={() => playSound("enter")}>Play a sample</button></div>
              <p className="hint">Off until you choose. Sounds only answer something you did: entering a world, a check in, marking something done.</p>
            </>
          )}
        </section>

        <section className="panel" aria-labelledby="lock-h">
          <h2 id="lock-h" className="panel-title">Privacy</h2>
          <PasscodeSettings />
          {auth.state === "signed-in" && (
            <div className="row-actions" style={{ marginTop: 16 }}><button className="btn" onClick={() => supabase().auth.signOut()}>Sign this device out of sync</button></div>
          )}
        </section>

        <section className="panel" aria-labelledby="data-h">
          <h2 id="data-h" className="panel-title">Data</h2>
          <dl className="facts">
            <dt>Sync</dt>
            <dd data-testid="sync-detail">
              {SYNC_MODE === "device" ? "Saved on this device. Syncing between your devices comes back with the privacy update; until then, Export and Import move your data." : status.state === "idle" ? "Everything is synced." : status.state === "offline" ? "Offline. Changes are saved here and wait." : status.state === "error" ? `Problem: ${status.error}` : status.state === "syncing" ? "Syncing now." : "Not connected."}
            </dd>
            <dt>Waiting to sync</dt>
            <dd>{status.pending}</dd>
            <dt>Last synced</dt>
            <dd>{status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString("en-CA") : "Not yet"}</dd>
            <dt>Storage protected</dt>
            <dd>{persisted == null ? "Checking" : persisted ? "Yes, the browser will keep it" : "Not granted yet. Installing to the home screen helps."}</dd>
            <dt>Last export</dt>
            <dd>{lastExport ? new Date(lastExport).toLocaleString("en-CA") : "Never"}</dd>
          </dl>
          <div className="row-actions">
            <button className="btn btn-primary" onClick={doExport} data-testid="export">Export a backup</button>
            <button className="btn" onClick={() => fileInput.current?.click()} data-testid="import">Import a backup</button>
            <button className="btn" onClick={() => engine?.sync()} disabled={SYNC_MODE === "device"}>Sync now</button>
            <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={pick} data-testid="import-file" />
          </div>
          {preview && (
            <div className="import-preview" role="dialog" aria-label="Import preview">
              <p><strong>{preview.name}</strong></p>
              {preview.result.problems.map((p) => <p key={p} className="warn">{p}</p>)}
              <table>
                <thead><tr><th>Table</th><th>New</th><th>Newer</th><th>Same</th><th>Older (kept)</th></tr></thead>
                <tbody>
                  {preview.result.counts.map((c) => (
                    <tr key={c.table}><td>{c.table.replace(/_/g, " ")}</td><td>{c.new}</td><td>{c.newer}</td><td>{c.same}</td><td>{c.older}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="hint">Import never deletes anything. Rows that are newer on this device are kept.</p>
              <div className="row-actions">
                <button className="btn btn-primary" onClick={confirmImport} disabled={!preview.result.ok} data-testid="import-confirm">Import</button>
                <button className="btn" onClick={() => setPreview(null)}>Cancel</button>
              </div>
            </div>
          )}
          {message && <p className="hint" role="status">{message}</p>}
        </section>

        <section className="panel" aria-labelledby="app-h">
          <h2 id="app-h" className="panel-title">The app</h2>
          <InstallApp />
          <p className="hint">{SYNC_MODE === "memory" ? "Test build: no sign in needed." : SYNC_MODE === "device" ? "Sync between your devices is off in this build; Export and Import move your data." : "Signed in for sync."}</p>
        </section>
      </div>
    </Shell>
  );
}
