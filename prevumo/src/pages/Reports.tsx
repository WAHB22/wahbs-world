import { useState } from "react";
import { Navigate, useParams } from "react-router";
import { FileDown, Printer } from "lucide-react";
import { useApp } from "../store/store";
import { buildReport, rangeFor, type RangeKind } from "../sim/reports";
import { TYPES } from "../sim/catalog";
import { SOURCE } from "../sim/attribution";
import { addDays, DAY, dayKey, fmtTime, fmtDate } from "../lib/time";
import { download, toCsv } from "../lib/csv";
import { Button, Card, Segmented } from "../components/ui";
import { cx, inputCls } from "../components/style";
import { Wordmark } from "../components/visuals";

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <span aria-hidden className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-idle sm:inline-block">
      <span className="block h-full rounded-full bg-green" style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
    </span>
  );
}

export function Reports() {
  const { locId = "" } = useParams();
  const { world, now } = useApp();
  const [kind, setKind] = useState<RangeKind>("today");
  const [custom, setCustom] = useState({ from: dayKey(addDays(now, -7)), to: dayKey(now) });
  const loc = world.locations.find((l) => l.id === locId);
  const range = rangeFor(kind, now, custom);
  const report = buildReport(world, locId, range, now);
  // The same span just before, so every total has a baseline.
  const span = kind === "today" ? DAY : kind === "week" ? 7 * DAY : range.to - range.from;
  const prev = buildReport(world, locId, { ...range, from: range.from - span, to: range.to - span }, now);
  const vs = kind === "today" ? "yesterday" : kind === "week" ? "last week" : "the period before";
  if (!loc) return <Navigate to="/locations" replace />;

  const closedAt = world.closedDays[dayKey(now)];
  const isDaily = kind === "today";
  const title = isDaily ? "Daily report" : kind === "week" ? "Weekly report" : kind === "month" ? "Monthly report" : "Report";
  const maxKwh = Math.max(...report.machines.map((r) => r.kwh), 0);

  const exportCsv = () => {
    const csv = toCsv([
      { title: `PREVUMO ${title}, ${loc.name}, ${range.label}`, header: [], rows: [] },
      {
        title: "Per machine",
        header: ["Machine", "Type", "Hours", "kWh", "Sessions", "Irregularities"],
        rows: report.machines.map((r) => [r.machine.name, TYPES[r.machine.type].label, r.alwaysOn ? "always on" : r.hours.toFixed(2), r.kwh.toFixed(2), r.sessions, r.irregular]),
      },
      {
        title: "Per member",
        header: ["User", "Attributed by", "Machines used", "Hours", "kWh"],
        rows: report.members.map((p) => [p.label, p.kind === "pin" ? "PIN" : p.kind === "assigned" ? "Assignment" : "None", p.machines.join("; "), p.hours.toFixed(2), p.kwh.toFixed(2)]),
      },
    ]);
    download(`prevumo-${loc.id}-${kind}-${dayKey(now)}.csv`, csv);
  };

  return (
    <main className="mx-auto max-w-[1320px] px-4 pt-7 pb-24 sm:px-6 lg:px-8 lg:pt-10 print:max-w-none print:p-0">
      <div className="print-only mb-6">
        <Wordmark />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[30px] font-semibold sm:text-[38px]">{title}</h1>
          <p className="mt-1 text-[15px] text-muted">
            {loc.name} · <span className="tnum">{range.label}</span>
          </p>
          {isDaily && (
            <p className={cx("mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px]", closedAt ? "bg-green-tint" : "bg-idle")}>
              <span aria-hidden className={cx("size-1.5 rounded-full", closedAt ? "bg-green" : "live-blink bg-orange")} />
              {closedAt ? (
                <>
                  Generated automatically at <span className="num">{fmtTime(closedAt)}</span>, end of day
                </>
              ) : (
                <>
                  Live. Generated automatically at <span className="num">{world.settings.dailyShutdown.time}</span>, end of day
                </>
              )}
            </p>
          )}
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <Segmented
            label="Report range"
            value={kind}
            onChange={setKind}
            options={[
              { value: "today", label: "Today" },
              { value: "week", label: "This week" },
              { value: "month", label: "This month" },
              { value: "custom", label: "Custom" },
            ]}
          />
          <Button onClick={() => window.print()}>
            <Printer className="size-4" /> Export PDF
          </Button>
          <Button onClick={exportCsv}>
            <FileDown className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      {kind === "custom" && (
        <div className="no-print mt-4 flex flex-wrap items-end gap-3">
          <label className="text-[13px] font-medium">
            From
            <input type="date" value={custom.from} max={dayKey(now)} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className={cx(inputCls, "mt-1 w-44")} />
          </label>
          <label className="text-[13px] font-medium">
            To
            <input type="date" value={custom.to} max={dayKey(now)} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className={cx(inputCls, "mt-1 w-44")} />
          </label>
        </div>
      )}

      <Card className="print-plain mt-6 grid grid-cols-2 divide-border md:grid-cols-4 md:divide-x">
        {[
          { label: "Machine hours", value: report.hours.toFixed(1), prev: prev.hours.toFixed(1), unit: "h" },
          { label: "Energy", value: report.kwh.toFixed(1), prev: prev.kwh.toFixed(1), unit: "kWh" },
          { label: "Irregularities", value: String(report.irregular), prev: String(prev.irregular), unit: "", tone: report.irregular ? "text-rust" : "" },
          { label: "Idle shut-offs", value: String(report.idleOffs), prev: String(prev.idleOffs), unit: "" },
        ].map((t, i) => (
          <div key={t.label} className={cx("px-5 py-4 sm:px-6 sm:py-5", i < 2 && "border-b border-border md:border-b-0", i % 2 === 1 && "border-l border-border md:border-l-0")}>
            <p className="text-[13px] text-muted">{t.label}</p>
            <p className={cx("num mt-1 text-[30px] leading-none sm:text-[36px]", t.tone)}>
              {t.value}
              {t.unit && <span className="ml-1 text-[14px] text-muted">{t.unit}</span>}
            </p>
            <p className="mt-2 text-[13px] text-muted">
              <span className="tnum text-ink">
                {t.prev}
                {t.unit && ` ${t.unit}`}
              </span>{" "}
              {vs}
            </p>
          </div>
        ))}
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card className="print-plain overflow-hidden">
          <h2 className="px-5 pt-5 pb-3 text-[17px] font-semibold">Per machine</h2>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[560px] text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="px-5 py-2 font-medium">Machine</th>
                  <th className="px-3 py-2 text-right font-medium">Hours</th>
                  <th className="px-3 py-2 font-medium">kWh</th>
                  <th className="px-3 py-2 text-right font-medium">Sessions</th>
                  <th className="px-5 py-2 text-right font-medium">Irregularities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.machines.map((r) => (
                  <tr key={r.machine.id}>
                    <td className="px-5 py-2.5">
                      <span className="font-medium">{r.machine.name}</span>
                      {!r.machine.name.toLowerCase().startsWith(TYPES[r.machine.type].label.toLowerCase()) && (
                        <span className="ml-1.5 text-[12px] text-muted">{TYPES[r.machine.type].label}</span>
                      )}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right">{r.alwaysOn ? <span className="text-muted">always on</span> : r.hours.toFixed(1)}</td>
                    <td className="tnum px-3 py-2.5">
                      <span className="inline-flex items-center gap-2.5">
                        <span className="w-12 text-right">{r.kwh.toFixed(1)}</span>
                        <Bar value={r.kwh} max={maxKwh} />
                      </span>
                    </td>
                    <td className="tnum px-3 py-2.5 text-right">{r.alwaysOn ? "" : r.sessions}</td>
                    <td className="tnum px-5 py-2.5 text-right">
                      {r.irregular ? <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-tint px-2">{r.irregular}</span> : <span className="text-muted">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="print-plain overflow-hidden">
          <h2 className="px-5 pt-5 pb-3 text-[17px] font-semibold">Per member</h2>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[480px] text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="px-5 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Machines used</th>
                  <th className="px-3 py-2 text-right font-medium">Hours</th>
                  <th className="px-5 py-2 text-right font-medium">kWh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.members.map((p) => (
                  <tr key={p.key} className={p.kind === "unassigned" ? "bg-bg/50" : undefined}>
                    <td className="px-5 py-2.5">
                      <span className={p.kind === "unassigned" ? "text-muted" : "font-medium"}>{p.label}</span>
                      {p.kind !== "unassigned" && <span className="ml-1.5 text-[12px] text-muted">{SOURCE[p.kind]}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted">
                      {p.machines.length ? (p.machines.length > 2 ? `${p.machines.slice(0, 2).join(", ")} +${p.machines.length - 2}` : p.machines.join(", ")) : "None"}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right">{p.hours.toFixed(1)}</td>
                    <td className="tnum px-5 py-2.5 text-right">{p.kwh.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <p className="mt-4 text-[13px] text-muted">
        Fridges and freezers are always on, so they count toward energy only. Sessions are attributed by PIN first, then by manual assignment, otherwise Unassigned.
      </p>
      <p className="print-only mt-6 text-[11px] text-muted">
        Printed {fmtDate(now)} {fmtTime(now)} · PREVUMO owner dashboard demo · uOttawa Engineering
      </p>
    </main>
  );
}
