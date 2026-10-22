import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtTime } from "../lib/time";
import type { Sample } from "../sim/types";

export type Unit = "kw" | "a";

interface Point {
  t: number;
  v: number;
  band: [number, number];
  irr: number | null;
}

function niceMax(v: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => n <= s) ?? 10;
  return step * p;
}

/** Ten minutes of live draw over the shaded normal band, irregular points marked in orange. */
export function LiveChart({
  samples,
  unit,
  volts,
  showBand,
  height = 280,
  stroke = "var(--color-green)",
  since,
}: {
  /** When an open irregularity started (ms): shades the stretch since then. */
  since?: number;
  samples: Sample[];
  unit: Unit;
  volts: number;
  showBand: boolean;
  height?: number;
  stroke?: string;
}) {
  const k = unit === "kw" ? 1 : 1000 / volts;
  const data: Point[] = samples.map((s) => ({
    t: s.t,
    v: s.kw * k,
    band: [s.lo * k, s.hi * k],
    irr: s.out ? s.kw * k : null,
  }));
  const top = niceMax(Math.max(0.01, ...data.map((d) => Math.max(d.v, showBand ? d.band[1] : 0))) * 1.12);
  const first = data[0]?.t ?? 0;
  const last = data[data.length - 1]?.t ?? 0;
  const ticks: number[] = [];
  for (let t = Math.ceil(first / 120) * 120; t <= last; t += 120) ticks.push(t);
  const label = unit === "kw" ? "kW" : "A";

  return (
    <div style={{ height }} className="w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="t"
            type="number"
            domain={[first, last]}
            ticks={ticks}
            tickFormatter={(t: number) => fmtTime(t * 1000)}
            tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
            allowDataOverflow
          />
          <YAxis
            domain={[0, top]}
            width={44}
            tickCount={5}
            tickFormatter={(v: number) => (top < 1 ? v.toFixed(2) : top < 10 ? v.toFixed(1) : v.toFixed(0))}
            tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            isAnimationActive={false}
            cursor={{ stroke: "var(--color-ink)", strokeOpacity: 0.25 }}
            content={({ active, payload }) => {
              const p = active && payload?.[0] ? (payload[0].payload as Point) : null;
              if (!p) return null;
              return (
                <div className="rounded-[10px] border border-border bg-surface px-3 py-2 text-xs shadow-[0_6px_20px_rgb(31_61_43/0.12)]">
                  <div className="num text-muted">{fmtTime(p.t * 1000)}:{String(p.t % 60).padStart(2, "0")}</div>
                  <div className="num mt-0.5 text-[13px] text-ink">
                    {p.v.toFixed(unit === "kw" ? 2 : 1)} {label}
                  </div>
                  {showBand && (
                    <div className="num text-muted">
                      normal {p.band[0].toFixed(unit === "kw" ? 2 : 1)} to {p.band[1].toFixed(unit === "kw" ? 2 : 1)}
                    </div>
                  )}
                  {p.irr !== null && <div className="mt-1 font-medium text-rust">Outside the normal range</div>}
                </div>
              );
            }}
          />
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 4" />
          {since !== undefined && (
            <ReferenceArea x1={Math.max(first, since / 1000)} x2={last} fill="var(--color-orange-tint)" fillOpacity={0.45} ifOverflow="hidden" />
          )}
          {since !== undefined && <ReferenceLine x={Math.max(first, since / 1000)} stroke="var(--color-rust)" strokeDasharray="3 3" ifOverflow="hidden" />}
          {showBand && (
            <Area
              dataKey="band"
              type="stepAfter"
              stroke="none"
              fill="var(--color-green-tint)"
              fillOpacity={0.9}
              isAnimationActive={false}
              activeDot={false}
            />
          )}
          <Line dataKey="v" type="linear" stroke={stroke} strokeWidth={1.25} dot={false} isAnimationActive={false} activeDot={{ r: 3.5, fill: stroke, stroke: "var(--color-surface)" }} />
          <Line
            dataKey="irr"
            stroke="var(--color-orange)"
            strokeWidth={2.4}
            connectNulls={false}
            isAnimationActive={false}
            activeDot={false}
            dot={{ r: 3, fill: "var(--color-orange)", stroke: "var(--color-rust)", strokeWidth: 1 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({ showBand, stroke = "var(--color-green)" }: { showBand: boolean; stroke?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-0.5 w-4 rounded" style={{ background: stroke }} /> Live draw
      </span>
      {showBand && (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-4 rounded-sm bg-green-tint" /> Normal range for this machine
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-2 rounded-full border border-rust bg-orange" /> Irregular point
      </span>
    </div>
  );
}
