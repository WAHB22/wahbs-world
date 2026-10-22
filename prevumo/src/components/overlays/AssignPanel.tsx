import { useState } from "react";
import { useParams } from "react-router";
import { Info } from "lucide-react";
import { closeOverlay, removeAssignment, saveAssignment, toast, useApp } from "../../store/store";
import { frameText } from "../../sim/attribution";
import { addDays, dayKey, dayName, fmtTime } from "../../lib/time";
import type { Assignment, Frame } from "../../sim/types";
import { CloseButton, Dialog } from "../Dialog";
import { Button, Field, Segmented } from "../ui";
import { cx, inputCls } from "../style";

interface Draft {
  name: string;
  email: string;
  machineIds: string[];
  mode: "schedule" | "always";
  from: string;
  to: string;
  days: number[];
  start: string;
  end: string;
}

const WEEK = [1, 2, 3, 4, 5, 6, 0];

function initial(now: number, a?: Assignment, machineIds?: string[]): Draft {
  const today = dayKey(now);
  if (a) {
    const f = a.frame;
    return {
      name: a.name,
      email: a.email,
      machineIds: a.machineIds,
      mode: f.kind,
      from: f.kind === "schedule" ? f.from : today,
      to: f.kind === "schedule" ? f.to : dayKey(addDays(now, 30)),
      days: f.kind === "schedule" ? f.days : [1, 2, 3, 4, 5],
      start: f.kind === "schedule" ? f.start : "09:00",
      end: f.kind === "schedule" ? f.end : "17:00",
    };
  }
  return {
    name: "",
    email: "",
    machineIds: machineIds ?? [],
    mode: "schedule",
    from: today,
    to: today,
    days: [new Date(now).getDay()],
    start: "13:00",
    end: "17:00",
  };
}

export function AssignPanel({ assignmentId, machineIds, open }: { assignmentId?: string; machineIds?: string[]; open: boolean }) {
  const { world, now } = useApp();
  const { locId } = useParams();
  const editing = world.assignments.find((a) => a.id === assignmentId);
  const [d, setD] = useState<Draft>(() => initial(now, editing, machineIds));
  const [tried, setTried] = useState(false);
  const [lastKey, setLastKey] = useState<string | undefined>(undefined);
  const key = open ? `${assignmentId ?? "new"}:${machineIds?.join()}` : undefined;
  if (key && key !== lastKey) {
    setLastKey(key);
    setD(initial(now, editing, machineIds));
    setTried(false);
  }
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  const known = [...new Map([...world.assignments.map((a) => [a.name, a.email] as const), ...world.members.map((m) => [m.name, m.email] as const)]).entries()];
  const errors = {
    name: !d.name.trim() ? "Add a name or a company." : undefined,
    email: d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) ? "This email doesn't look right." : undefined,
    machines: d.machineIds.length === 0 ? "Pick at least one machine." : undefined,
    frame:
      d.mode === "schedule"
        ? d.days.length === 0
          ? "Pick at least one day."
          : d.end <= d.start
            ? "The end time must be after the start time."
            : d.to < d.from
              ? "The last day must be on or after the first day."
              : undefined
        : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);

  const frame: Frame =
    d.mode === "always" ? { kind: "always" } : { kind: "schedule", from: d.from, to: d.to, days: d.days, start: d.start, end: d.end };

  const homeLoc = world.machines.find((m) => m.id === d.machineIds[0])?.locationId ?? locId ?? world.locations[0].id;
  const machinesByLoc = [...world.locations]
    .sort((a, b) => Number(b.id === homeLoc) - Number(a.id === homeLoc))
    .map((l) => ({ l, ms: world.machines.filter((m) => m.locationId === l.id) }));
  const chips = (ms: typeof world.machines) => (
    <div className="flex flex-wrap gap-1.5">
      {ms.map((m) => {
        const on = d.machineIds.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={on}
            onClick={() => set({ machineIds: on ? d.machineIds.filter((x) => x !== m.id) : [...d.machineIds, m.id] })}
            className={cx(
              "h-8 rounded-full border px-3 text-[13px] transition-colors duration-150",
              on ? "border-green bg-green text-white" : "border-border bg-surface text-ink hover:border-muted/60",
            )}
          >
            {m.name}
          </button>
        );
      })}
    </div>
  );

  const submit = () => {
    setTried(true);
    if (!valid) return;
    saveAssignment({ id: editing?.id, name: d.name.trim(), email: d.email.trim(), machineIds: d.machineIds, frame });
    const names = world.machines.filter((m) => d.machineIds.includes(m.id)).map((m) => m.name);
    toast(`${d.name.trim()} assigned to ${names.join(", ")} · ${frameText(frame)}`);
    closeOverlay();
  };

  return (
    <Dialog open={open} onClose={closeOverlay} label={editing ? "Edit assignment" : "Assign a user"} kind="drawer">
      <div className="flex items-start gap-3 border-b border-border px-5 pt-5 pb-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-semibold">{editing ? "Edit assignment" : "Assign a user"}</h2>
          <p className="mt-0.5 text-[14px] text-muted">Sessions on these machines in this time frame count for them.</p>
        </div>
        <CloseButton onClick={closeOverlay} />
      </div>

      <form
        noValidate
        className="flex flex-1 flex-col gap-5 px-5 py-5 sm:px-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Name or company" htmlFor="as-name">
          <input
            id="as-name"
            maxLength={80}
            list="as-known"
            autoComplete="off"
            value={d.name}
            onChange={(e) => {
              const name = e.target.value;
              const match = known.find(([n]) => n.toLowerCase() === name.trim().toLowerCase());
              set({ name, email: match && !d.email ? match[1] : d.email });
            }}
            placeholder="Beta Inc."
            className={inputCls}
            aria-invalid={tried && !!errors.name}
          />
          <datalist id="as-known">
            {known.map(([n]) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          {tried && errors.name && <p className="text-xs text-rust">{errors.name}</p>}
        </Field>

        <Field label="Email" htmlFor="as-email" hint="Optional. Used for their usage summary.">
          <input id="as-email" type="email" maxLength={254} value={d.email} onChange={(e) => set({ email: e.target.value })} placeholder="shop@beta-inc.example" className={inputCls} />
          {tried && errors.email && <p className="text-xs text-rust">{errors.email}</p>}
        </Field>

        <fieldset>
          <legend className="text-[13px] font-medium">Machines</legend>
          <div className="mt-2 space-y-3">
            <div>
              <p className="mb-1.5 text-xs text-muted">{machinesByLoc[0].l.name}</p>
              {chips(machinesByLoc[0].ms)}
            </div>
            <details className="group">
              <summary className="cursor-pointer list-none text-[13px] text-muted hover:text-ink">
                <span className="group-open:hidden">Show machines in other locations</span>
                <span className="hidden group-open:inline">Other locations</span>
              </summary>
              <div className="mt-2 space-y-3">
                {machinesByLoc.slice(1).map(({ l, ms }) => (
                  <div key={l.id}>
                    <p className="mb-1.5 text-xs text-muted">{l.name}</p>
                    {chips(ms)}
                  </div>
                ))}
              </div>
            </details>
          </div>
          {tried && errors.machines && <p className="mt-1.5 text-xs text-rust">{errors.machines}</p>}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-[13px] font-medium">Time frame</legend>
          <Segmented
            label="Time frame"
            value={d.mode}
            onChange={(mode) => set({ mode })}
            options={[
              { value: "schedule", label: "Dates and hours" },
              { value: "always", label: "Until I remove it" },
            ]}
          />
          {d.mode === "schedule" ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "This afternoon", patch: { from: dayKey(now), to: dayKey(now), days: [new Date(now).getDay()], start: "13:00", end: "17:00" } },
                  {
                    label: "Rest of today",
                    patch: { from: dayKey(now), to: dayKey(now), days: [new Date(now).getDay()], start: fmtTime(Math.ceil(now / 900_000) * 900_000), end: "22:00" },
                  },
                  { label: "Weekdays this month", patch: { from: dayKey(now), to: dayKey(addDays(now, 30)), days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" } },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => set(p.patch)}
                    className="h-8 rounded-full border border-dashed border-muted/50 px-3 text-[13px] text-ink transition-colors hover:border-green hover:bg-green-tint/50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From" htmlFor="as-from">
                  <input id="as-from" type="date" value={d.from} onChange={(e) => set({ from: e.target.value })} className={inputCls} />
                </Field>
                <Field label="To" htmlFor="as-to">
                  <input id="as-to" type="date" value={d.to} onChange={(e) => set({ to: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-medium">Days</p>
                <div className="flex gap-1.5">
                  {WEEK.map((wd) => {
                    const on = d.days.includes(wd);
                    return (
                      <button
                        key={wd}
                        type="button"
                        aria-pressed={on}
                        aria-label={dayName(wd)}
                        onClick={() => set({ days: on ? d.days.filter((x) => x !== wd) : [...d.days, wd] })}
                        className={cx(
                          "h-9 flex-1 rounded-[8px] border text-[13px] font-medium transition-colors",
                          on ? "border-green bg-green text-white" : "border-border bg-surface text-muted hover:text-ink",
                        )}
                      >
                        {dayName(wd).slice(0, 2)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start" htmlFor="as-start">
                  <input id="as-start" type="time" step={900} value={d.start} onChange={(e) => set({ start: e.target.value })} className={cx(inputCls, "num")} />
                </Field>
                <Field label="End" htmlFor="as-end">
                  <input id="as-end" type="time" step={900} value={d.end} onChange={(e) => set({ end: e.target.value })} className={cx(inputCls, "num")} />
                </Field>
              </div>
              {tried && errors.frame && <p className="text-xs text-rust">{errors.frame}</p>}
            </>
          ) : (
            <p className="text-[14px] text-muted">Every session on these machines without a PIN counts for them until you remove this.</p>
          )}
        </fieldset>

        <p className="flex gap-2 rounded-[10px] bg-bg/70 px-3 py-2.5 text-[13px] text-ink">
          <Info className="mt-0.5 size-4 shrink-0 text-muted" />
          <span>
            Summary: <span className="font-medium">{frameText(frame)}</span>. A PIN typed on the box always overrides this.
          </span>
        </p>

        <div className="flex-1" />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" size="lg" className="flex-1">
            {editing ? "Save changes" : "Save assignment"}
          </Button>
          {editing && (
            <Button
              variant="quietDanger"
              size="lg"
              onClick={() => {
                removeAssignment(editing.id);
                toast(`${editing.name} removed. Past sessions keep their attribution.`);
                closeOverlay();
              }}
            >
              Remove
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
