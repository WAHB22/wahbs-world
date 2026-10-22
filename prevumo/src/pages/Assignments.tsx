import { CalendarClock, Plus } from "lucide-react";
import { openOverlay, removeAssignment, toast, useApp } from "../store/store";
import { assignmentState, frameText } from "../sim/attribution";
import { Button, Card } from "../components/ui";
import { cx } from "../components/style";

const STATE = {
  active: { label: "Active now", cls: "bg-green-tint text-ink" },
  scheduled: { label: "Scheduled", cls: "bg-idle text-ink" },
  ended: { label: "Ended", cls: "bg-idle text-ink" },
  removed: { label: "Removed", cls: "bg-idle text-ink" },
} as const;

export function Assignments() {
  const { world, now } = useApp();
  const list = world.assignments
    .filter((a) => a.removedAt === undefined)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <main className="mx-auto max-w-[1100px] px-4 pt-7 pb-24 sm:px-6 lg:px-8 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[640px]">
          <h1 className="text-[30px] font-semibold sm:text-[38px]">Assignments</h1>
          <p className="mt-1 text-[15px] text-muted">
            Give a person or a company machines for a time frame. Sessions on those machines in that time count for them. A PIN typed on the box always wins.
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => openOverlay({ type: "assign" })}>
          <Plus className="size-4" /> New assignment
        </Button>
      </div>

      <div className="mt-7 grid gap-3">
        {list.length === 0 && (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border px-6 py-10 text-center text-[14px] text-muted">
            <p className="font-display text-[18px] font-semibold text-ink">No assignments yet</p>
            <p className="mt-1">Assign a person or company to machines for a time frame, so sessions without a PIN still get a name.</p>
          </div>
        )}
        {list.map((a) => {
          const st = STATE[assignmentState(a, now)];
          const machines = world.machines.filter((m) => a.machineIds.includes(m.id));
          return (
            <Card key={a.id} rail={st.label === "Active now" ? "normal" : "off"} className="toast-in">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-idle text-ink">
                  <CalendarClock className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1 basis-[260px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[17px] font-semibold">{a.name}</h2>
                    <span className={cx("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium", st.cls)}>{st.label}</span>
                  </div>
                  <p className="text-[13px] text-muted">{a.email || "No email"}</p>
                  <p className="num mt-1 text-[13px] text-ink">{frameText(a.frame)}</p>
                </div>
                <div className="flex min-w-0 flex-1 basis-[220px] flex-wrap gap-1.5">
                  {machines.map((m) => (
                    <span key={m.id} className="inline-flex h-7 items-center rounded-full border border-border bg-bg/60 px-2.5 text-[13px]">
                      {m.name}
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={() => openOverlay({ type: "assign", assignmentId: a.id })}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="quietDanger"
                    onClick={() => {
                      removeAssignment(a.id);
                      toast(`${a.name} removed. Past sessions keep their attribution.`);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
