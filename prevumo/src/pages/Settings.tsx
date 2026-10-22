import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { CalendarDays, Eye, EyeOff, LogOut, Plus, RotateCcw } from "lucide-react";
import { addMachine, addMember, logOut, resetDemo, setNeverAutoOff, toast, updateSettings, useApp } from "../store/store";
import { LEARNING_DAYS, TYPES } from "../sim/catalog";
import type { MachineType } from "../sim/types";
import { Button, Card, Field, SoonBadge, Switch } from "../components/ui";
import { cx, inputCls } from "../components/style";

function Section({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-border py-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="text-[20px] font-semibold">{title}</h2>
        <p className="mt-1 text-[14px] text-muted">{lead}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

const selectCls = cx(inputCls, "appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9");
const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235B6B5F' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

function NumberField({ id, value, onChange, min, max, suffix }: { id: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Math.round(Number(e.target.value));
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className={cx(inputCls, "num h-10 w-20 text-center")}
      />
      <span className="text-[14px] text-muted">{suffix}</span>
    </span>
  );
}

export function Settings() {
  const { locId = "" } = useParams();
  const nav = useNavigate();
  const { world } = useApp();
  const s = world.settings;
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [mName, setMName] = useState("");
  const [mType, setMType] = useState<MachineType>("printer");
  const [mLoc, setMLoc] = useState(locId);
  const [mKw, setMKw] = useState("0.2");
  const [mNever, setMNever] = useState(false);
  const [mTried, setMTried] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const never = new Set(world.machines.filter((m) => m.neverAutoOff).map((m) => m.id));

  const addOk = mName.trim().length > 0 && Number(mKw) > 0 && Number(mKw) < 100;

  return (
    <main className="mx-auto max-w-[1100px] px-4 pt-7 pb-24 sm:px-6 lg:px-8 lg:pt-10">
      <h1 className="text-[30px] font-semibold sm:text-[38px]">Settings</h1>
      <p className="mt-1 mb-8 text-[14.5px] text-muted">Rules apply to every location of uOttawa Engineering.</p>

      <Section title="Auto shut-off rules" lead="Nothing restarts on its own after a shutdown. Machines on the never list are only ever watched.">
        <Card className="divide-y divide-border">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <p className="font-medium">Ask me when a machine is idle</p>
              <p className="text-[13.5px] text-muted">On, but drawing only standby power, or still on after its booking ended.</p>
            </div>
            <label className="flex items-center gap-2 text-[14px]">
              after <NumberField id="idle-prompt" value={s.idlePromptMin} min={5} max={240} suffix="min" onChange={(v) => updateSettings({ ...s, idlePromptMin: v })} />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Switch checked={s.autoOffIdle.enabled} onChange={(v) => updateSettings({ ...s, autoOffIdle: { ...s.autoOffIdle, enabled: v } })} label="Turn off idle machines" />
              <p className="font-medium">Turn off idle machines</p>
            </div>
            <label className={cx("flex items-center gap-2 text-[14px]", !s.autoOffIdle.enabled && "opacity-50")}>
              after{" "}
              <NumberField
                id="idle-off"
                value={s.autoOffIdle.minutes}
                min={10}
                max={480}
                suffix="min idle"
                onChange={(v) => updateSettings({ ...s, autoOffIdle: { ...s.autoOffIdle, minutes: v } })}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Switch checked={s.dailyShutdown.enabled} onChange={(v) => updateSettings({ ...s, dailyShutdown: { ...s.dailyShutdown, enabled: v } })} label="Shut everything down daily" />
              <div>
                <p className="font-medium">Shut everything down daily</p>
                <p className="text-[13.5px] text-muted">The daily report is generated at the same time.</p>
              </div>
            </div>
            <label className={cx("flex items-center gap-2 text-[14px]", !s.dailyShutdown.enabled && "opacity-50")}>
              at
              <input
                type="time"
                value={s.dailyShutdown.time}
                onChange={(e) => e.target.value && updateSettings({ ...s, dailyShutdown: { ...s.dailyShutdown, time: e.target.value } })}
                className={cx(inputCls, "num h-10 w-32")}
              />
            </label>
          </div>
          <div className="px-5 py-4">
            <p className="font-medium">Never auto shut off</p>
            <p className="text-[13.5px] text-muted">Fridges, freezers and anything that must stay on.</p>
            <div className="mt-3 space-y-3">
              {world.locations.map((l) => (
                <div key={l.id}>
                  <p className="mb-1.5 text-xs text-muted">{l.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {world.machines
                      .filter((m) => m.locationId === l.id)
                      .map((m) => {
                        const on = never.has(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              const next = new Set(never);
                              if (on) next.delete(m.id);
                              else next.add(m.id);
                              setNeverAutoOff(next);
                            }}
                            className={cx(
                              "h-8 rounded-full border px-3 text-[13px] transition-colors",
                              on ? "border-ink bg-ink text-white" : "border-border bg-surface hover:border-muted/60",
                            )}
                          >
                            {m.name}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Add machine" lead={`Plug its PREVUMO box into the machine's power line, then add it here. It learns its normal pattern for ${LEARNING_DAYS} days.`}>
        <Card className="p-5">
          <form
            noValidate
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setMTried(true);
              if (!addOk) return;
              const m = addMachine({ name: mName.trim(), type: mType, locationId: mLoc, ratedKw: Number(mKw), neverAutoOff: mNever });
              toast(`${m.name} added. Learning its normal pattern for ${LEARNING_DAYS} days.`);
              setMName("");
              setMTried(false);
            }}
          >
            <Field label="Name" htmlFor="m-name">
              <input id="m-name" value={mName} onChange={(e) => setMName(e.target.value)} placeholder="3D printer 7" className={inputCls} />
              {mTried && !mName.trim() && <p className="text-xs text-rust">Give the machine a name.</p>}
            </Field>
            <Field label="Type" htmlFor="m-type">
              <select
                id="m-type"
                value={mType}
                onChange={(e) => {
                  const t = e.target.value as MachineType;
                  setMType(t);
                  setMNever(TYPES[t].alwaysOn === true);
                }}
                className={selectCls}
                style={{ backgroundImage: CHEVRON }}
              >
                {(Object.keys(TYPES) as MachineType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPES[t].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location" htmlFor="m-loc">
              <select id="m-loc" value={mLoc} onChange={(e) => setMLoc(e.target.value)} className={selectCls} style={{ backgroundImage: CHEVRON }}>
                {world.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Rated power (kW)" htmlFor="m-kw" hint="From the nameplate.">
              <input id="m-kw" type="number" step="0.05" min="0.01" value={mKw} onChange={(e) => setMKw(e.target.value)} className={cx(inputCls, "num")} />
              {mTried && !(Number(mKw) > 0 && Number(mKw) < 100) && <p className="text-xs text-rust">Enter a rated power between 0.01 and 100 kW.</p>}
            </Field>
            <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border px-4 py-3 sm:col-span-2">
              <div>
                <p className="text-[14px] font-medium">Never auto shut off</p>
                <p className="text-[13px] text-muted">Turned on for fridges and freezers by default.</p>
              </div>
              <Switch checked={mNever} onChange={setMNever} label="Never auto shut off" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary">
                <Plus className="size-4" /> Add machine
              </Button>
            </div>
          </form>
        </Card>
      </Section>

      <Section title="Member PINs" lead="Members type their code on the box before the machine powers on. That is how each session gets its name.">
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {world.members.map((m) => {
              const open = shown.has(m.id);
              return (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-idle font-display text-[13px] font-semibold">
                    {m.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium">{m.name}</p>
                    <p className="truncate text-[12.5px] text-muted">{m.email}</p>
                  </div>
                  <span className="num w-14 text-right text-[16px] tracking-[0.18em]" aria-label={open ? `PIN ${m.pin.split("").join(" ")}` : "PIN hidden"}>
                    {open ? m.pin : "••••"}
                  </span>
                  <button
                    type="button"
                    aria-label={open ? `Hide ${m.name}'s PIN` : `Show ${m.name}'s PIN`}
                    onClick={() =>
                      setShown((x) => {
                        const n = new Set(x);
                        if (open) n.delete(m.id);
                        else n.add(m.id);
                        return n;
                      })
                    }
                    className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-idle hover:text-ink"
                  >
                    {open ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <form
            className="flex flex-wrap gap-2 border-t border-border bg-bg/50 px-5 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              const m = addMember(newName.trim(), newEmail.trim());
              toast(`${m.name} added with PIN ${m.pin}`);
              setNewName("");
              setNewEmail("");
            }}
          >
            <input aria-label="New member name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className={cx(inputCls, "h-10 min-w-0 flex-1 basis-40")} />
            <input aria-label="New member email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email (optional)" className={cx(inputCls, "h-10 min-w-0 flex-1 basis-48")} />
            <Button type="submit" disabled={!newName.trim()}>
              <Plus className="size-4" /> Add member
            </Button>
          </form>
        </Card>
      </Section>

      <Section title="Booking integrations" lead="Bring bookings in, so the person who booked is ready on the box.">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { name: "Connect Skedda", text: "Bookings become PINs on the right boxes." },
            { name: "Connect Google Calendar", text: "Calendar holds become assignments." },
          ].map((x) => (
            <Card key={x.name} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-[10px] bg-idle">
                  <CalendarDays className="size-5 text-muted" />
                </span>
                <SoonBadge />
              </div>
              <p className="mt-3 font-medium">{x.name}</p>
              <p className="text-[13.5px] text-muted">{x.text}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Demo data" lead="Puts every location, machine, member and 30 days of history back to the start of the demo.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("Reset the demo data? Everything you changed goes back to the start.")) {
                resetDemo();
                nav("/l/ms1");
              }
            }}
          >
            <RotateCcw className="size-4" /> Reset demo data
          </Button>
          <Button
            onClick={() => {
              logOut();
              nav("/login");
            }}
          >
            <LogOut className="size-4" /> Log out
          </Button>
        </div>
      </Section>
    </main>
  );
}
