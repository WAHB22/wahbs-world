import { z } from "zod";
import { safeParseRow, TABLES, isTable, type AnyRow, type TableName } from "./schema";
import type { Store } from "./store";

export const EXPORT_SCHEMA = 1;

export type ExportFile = {
  app: "wahbs-world";
  schema: number;
  exported_at: string;
  device_id: string;
  tables: Partial<Record<TableName, AnyRow[]>>;
};

/** Every row of every table, tombstones included, so an import can reproduce deletes. */
export async function exportAll(store: Store): Promise<ExportFile> {
  const out: ExportFile = { app: "wahbs-world", schema: EXPORT_SCHEMA, exported_at: new Date().toISOString(), device_id: store.deviceId, tables: {} };
  for (const t of TABLES) {
    const rows = (await store.db.table(t).toArray()) as AnyRow[];
    if (rows.length) out.tables[t] = rows;
  }
  return out;
}

export function exportFileName(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `wahbs-world-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

const fileShape = z.object({
  app: z.literal("wahbs-world"),
  schema: z.number().int(),
  exported_at: z.string(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

export type ImportPreview = {
  ok: boolean;
  problems: string[];
  counts: { table: TableName; total: number; new: number; newer: number; same: number; older: number; invalid: number }[];
};

type Parsed = { table: TableName; rows: AnyRow[]; invalid: number }[];

function parse(json: unknown): { parsed: Parsed; problems: string[] } {
  const problems: string[] = [];
  const f = fileShape.safeParse(json);
  if (!f.success) return { parsed: [], problems: ["This is not a WAHB'S WORLD export file."] };
  if (f.data.schema > EXPORT_SCHEMA) problems.push(`The file comes from a newer version (schema ${f.data.schema}). Update the app first.`);
  const parsed: Parsed = [];
  for (const [name, rows] of Object.entries(f.data.tables)) {
    if (!isTable(name)) {
      problems.push(`Unknown table "${name}" was skipped.`);
      continue;
    }
    const good: AnyRow[] = [];
    let invalid = 0;
    for (const r of rows) {
      const v = safeParseRow(name, r);
      if (v.success) good.push(v.data as AnyRow);
      else invalid++;
    }
    if (invalid) problems.push(`${invalid} rows in ${name} did not pass validation and will be skipped.`);
    parsed.push({ table: name, rows: good, invalid });
  }
  return { parsed, problems };
}

/** What an import would do, without changing anything. */
export async function previewImport(store: Store, json: unknown): Promise<ImportPreview> {
  const { parsed, problems } = parse(json);
  const counts: ImportPreview["counts"] = [];
  for (const { table, rows, invalid } of parsed) {
    const c = { table, total: rows.length + invalid, new: 0, newer: 0, same: 0, older: 0, invalid };
    for (const r of rows) {
      const local = (await store.db.table(table).get(r.id)) as AnyRow | undefined;
      if (!local) c.new++;
      else if (r.hlc > local.hlc) c.newer++;
      else if (r.hlc === local.hlc) c.same++;
      else c.older++;
    }
    counts.push(c);
  }
  const fatal = problems.some((p) => p.startsWith("This is not") || p.includes("newer version"));
  return { ok: !fatal, problems, counts };
}

/** Merge by id with the hybrid clock rule. Never wipes anything; imported changes are queued for sync. */
export async function importAll(store: Store, json: unknown): Promise<{ applied: number; skipped: number }> {
  const preview = await previewImport(store, json);
  if (!preview.ok) throw new Error(preview.problems.join(" "));
  const { parsed } = parse(json);
  let applied = 0, skipped = 0;
  for (const { table, rows } of parsed) {
    for (const r of rows) {
      const outcome = await store.applyRemote(table, { ...r, rev: null }, { queue: true });
      if (outcome === "applied") applied++;
      else skipped++;
    }
  }
  return { applied, skipped };
}
