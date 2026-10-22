import { memo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtTime } from "../lib/time";
import type { Sample } from "../sim/types";

export type Unit = "kw" | "a";

interface Point {
  t: number;
  v: number;
  band: [number, number];
  irr: number | null;
  out: boolean;
  mark: boolean;
}

function niceMax(v: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => n <= s) ?? 10;
  return step * p;
}

/** Ten minutes of live draw over the shaded normal band, irregular points marked in orange. */
export const LiveChart = memo(function LiveChart({
  samples,
  unit,
  volts,
  showBand,
  height = 280,
  stroke = "var(--color-green)",
  since,
  rated,
}: {
  /** Nameplate rating in kW, drawn as a labelled line while an overload is open. */
  rated?: number;
  /** When an open irregularity started (ms): shades the stretch since then. */
  since?: number;
  samples: Sample[];
  unit: Unit;
  volts: number;
  showBand: boolean;
  height?: number | string;
  stroke?: string;
}) {
  const k = unit === "kw" ? 1 : 1000 / volts;
  // Dots on the first reading of each irregular stretch and then every few seconds, so a long stretch reads as a line, not a pile.
  const gap = Math.max(1, Math.ceil(samples.length / 48));
  const data: Point[] = samples.map((s, i) => ({
    t: s.t,
    v: s.kw * k,
    band: [s.lo * k, s.hi * k],
    irr: s.out || samples[i - 1]?.out || samples[i + 1]?.out ? s.kw * k : null,
    out: s.out,
    mark: s.out && (!samples[i - 1]?.out || s.t % gap === 0),
  }));
  const peakV = Math.max(0, (rated ?? 0) * k, ...data.map((d) => Math.max(d.v, showBand ? d.band[1] : 0)));
  // Off draws about 0: keep a readable scale instead of 0.00, 0.01, 0.01 on the axis.
  const top = peakV < 0.05 ? (unit === "kw" ? 2 : 8) : niceMax(peakV * 1.12);
  const peak = data.reduce<Point | null>((b, d) => (d.out && (!b || d.v > b.v) ? d : b), null);
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
            padding={{ left: 0, right: 14 }}
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
                  {p.out && <div className="mt-1 font-medium text-rust">Outside the normal range</div>}
                </div>
              );
            }}
          />
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 4" />
          {since !== undefined && (
            <ReferenceArea x1={Math.max(first, since / 1000)} x2={last} fill="var(--color-orange-tint)" fillOpacity={0.45} ifOverflow="hidden" />
          )}
          {since !== undefined && (
            <ReferenceLine
              x={Math.max(first, since / 1000)}
              stroke="var(--color-rust)"
              strokeDasharray="3 3"
              ifOverflow="hidden"
              label={{
                value: `Irregular since ${fmtTime(since)}`,
                position: since / 1000 - first < 150 ? "insideTopLeft" : "insideTopRight",
                offset: 8,
                fill: "var(--color-rust)",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
          )}
          {rated !== undefined && (
            <ReferenceLine
              y={rated * k}
              stroke="var(--color-rust)"
              strokeDasharray="6 4"
              strokeOpacity={0.7}
              label={{ value: `Rated ${(rated * k).toFixed(unit === "kw" ? 2 : 1)} ${label}`, position: "insideBottomLeft", offset: 6, fill: "var(--color-ink)", fontSize: 11 }}
            />
          )}
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
            strokeWidth={2.6}
            strokeLinecap="round"
            connectNulls={false}
            isAnimationActive={false}
            activeDot={false}
            dot={(d: { cx?: number; cy?: number; index?: number; payload?: Point }) =>
              d.payload?.mark && d.cx != null && d.cy != null ? (
                <circle key={d.index} cx={d.cx} cy={d.cy} r={3} fill="var(--color-orange)" stroke="var(--color-rust)" strokeWidth={1} />
              ) : (
                <g key={d.index} />
              )
            }
          />
          {peak && <ReferenceDot x={peak.t} y={peak.v} r={4.5} fill="var(--color-orange)" stroke="var(--color-rust)" strokeWidth={1.5} ifOverflow="hidden" />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});
