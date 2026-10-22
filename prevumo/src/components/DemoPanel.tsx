import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { FastForward, FlaskConical, Play, RotateCcw, TriangleAlert, Moon } from "lucide-react";
import {
  demoFastForward,
  demoIdle,
  demoIrregular,
  demoStartSession,
  resetDemo,
  setDemoOpen,
  setHideDemoButton,
  toast,
  useApp,
} from "../store/store";
import { isAlwaysOn } from "../sim/seed";
import type { AnomalyKind, Machine } from "../sim/types";
import { CloseButton } from "./Dialog";
import { Button, Switch } from "./ui";

const selectCls =
  "h-10 w-full min-w-0 rounded-[8px] border border-border bg-surface px-2.5 text-[14px] text-ink outline-none focus:border-green";

function MachineSelect({ id, value, onChange, machines, empty }: { id: string; value: string; onChange: (v: string) => void; machines: Machine[]; empty: string }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectCls} disabled={!machines.length}>
      {!machines.length && <option value="">{empty}</option>}
      {machines.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}

function pickDefault(list: Machine[], current: string, preferred: string): string {
  if (list.some((m) => m.id === current)) return current;
  return list.find((m) => m.id === preferred)?.id ?? list[0]?.id ?? "";
}

/** Hidden controls for recording the demo: open with the small button or Shift+D. */
export function DemoPanel({ locId }: { locId?: string }) {
  const { world, demoOpen } = useApp();
  const nav = useNavigate();
  const [startId, setStartId] = useState("");
  const [member, setMember] = useState("");
  const [irrId, setIrrId] = useState("");
  const [kind, setKind] = useState<AnomalyKind>("spike");
  const [idleId, setIdleId] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setDemoOpen(!demoOpen);
      }
      if (e.key === "Escape" && demoOpen) setDemoOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [demoOpen]);

  const here = (m: Machine) => !locId || m.locationId === locId;
  const local = world.machines.filter(here);
  const off = local.filter((m) => m.power === "off" && !isAlwaysOn(m));
  const running = local.filter((m) => m.power === "on");
  const runningSessions = running.filter((m) => !isAlwaysOn(m));
  const sId = pickDefault(off, startId, "ms1-laser");
  const iId = pickDefault(running, irrId, "ms1-welder-2");
  const dId = pickDefault(runningSessions, idleId, "ms1-printer-4");

  return (
    <>
      {!world.hideDemoButton && !demoOpen && (
        <button
          type="button"
          data-demo-button
          onClick={() => setDemoOpen(true)}
          className="no-print fixed bottom-3 left-3 z-40 inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 text-xs font-medium text-muted shadow-[0_2px_8px_rgb(31_61_43/0.08)] backdrop-blur transition-colors hover:text-ink"
        >
          <FlaskConical className="size-3.5" /> Demo
        </button>
      )}
      {demoOpen && (
        <aside
          aria-label="Demo controls"
          className="toast-in no-print fixed bottom-3 left-3 z-[60] max-h-[calc(100dvh-24px)] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-[14px] border border-ink/15 bg-surface shadow-[0_20px_60px_rgb(31_61_43/0.25)]"
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <FlaskConical className="size-4 text-muted" />
            <h2 className="flex-1 text-[15px] font-semibold">Demo controls</h2>
            <kbd className="num rounded border border-border bg-bg px-1.5 py-0.5 text-[11px] text-muted">Shift D</kbd>
            <CloseButton onClick={() => setDemoOpen(false)} />
          </div>
          <div className="space-y-4 px-4 py-4 text-[13px]">
            <section className="space-y-2">
              <label htmlFor="demo-start" className="flex items-center gap-1.5 font-medium">
                <Play className="size-3.5" /> Start a session
              </label>
              <MachineSelect id="demo-start" value={sId} onChange={setStartId} machines={off} empty="Every machine is running" />
              <select aria-label="Who starts it" value={member} onChange={(e) => setMember(e.target.value)} className={selectCls}>
                <option value="">No PIN (assignment or Unassigned)</option>
                {world.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="primary"
                className="w-full"
                disabled={!sId}
                onClick={() => {
                  demoStartSession(sId, member || undefined);
                  setDemoOpen(false);
                }}
              >
                Start session
              </Button>
            </section>

            <section className="space-y-2 border-t border-border pt-4">
              <label htmlFor="demo-irr" className="flex items-center gap-1.5 font-medium">
                <TriangleAlert className="size-3.5" /> Trigger an irregularity
              </label>
              <div className="grid grid-cols-[1fr_110px] gap-2">
                <MachineSelect id="demo-irr" value={iId} onChange={setIrrId} machines={running} empty="Nothing running" />
                <select aria-label="Kind of irregularity" value={kind} onChange={(e) => setKind(e.target.value as AnomalyKind)} className={selectCls}>
                  <option value="spike">Spike</option>
                  <option value="sag">Sag</option>
                  <option value="erratic">Erratic</option>
                </select>
              </div>
              <Button
                size="sm"
                variant="danger"
                className="w-full"
                disabled={!iId}
                onClick={() => {
                  demoIrregular(iId, kind);
                  setDemoOpen(false);
                }}
              >
                Trigger irregularity
              </Button>
            </section>

            <section className="space-y-2 border-t border-border pt-4">
              <label htmlFor="demo-idle" className="flex items-center gap-1.5 font-medium">
                <Moon className="size-3.5" /> Trigger idle
              </label>
              <MachineSelect id="demo-idle" value={dId} onChange={setIdleId} machines={runningSessions} empty="Nothing running" />
              <Button
                size="sm"
                className="w-full"
                disabled={!dId}
                onClick={() => {
                  demoIdle(dId);
                  setDemoOpen(false);
                }}
              >
                Trigger idle ({world.settings.idlePromptMin + 15} min of standby)
              </Button>
            </section>

            <section className="space-y-2 border-t border-border pt-4">
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  setDemoOpen(false);
                  if (!demoFastForward()) toast("Today is already closed. The daily report is ready.");
                  nav(`/l/${locId ?? world.locations[0].id}/reports`);
                }}
              >
                <FastForward className="size-4" /> Fast forward to end of day
              </Button>
              <Button
                size="sm"
                variant="quietDanger"
                className="w-full"
                onClick={() => {
                  resetDemo();
                  nav("/l/ms1");
                }}
              >
                <RotateCcw className="size-4" /> Reset demo
              </Button>
            </section>

            <label className="flex items-center justify-between gap-3 border-t border-border pt-4 text-muted">
              Hide the Demo button (Shift D still works)
              <Switch checked={world.hideDemoButton} onChange={setHideDemoButton} label="Hide the Demo button" />
            </label>
          </div>
        </aside>
      )}
    </>
  );
}
