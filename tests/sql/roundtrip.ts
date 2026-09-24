/**
 * Two modes. `emit`: print a sync_push payload with one sample row per table.
 * `check`: read the sync_pull result from stdin and validate every row with the app schemas,
 * proving that dates, times, arrays and json come back in a shape the app accepts.
 */
import { readFileSync } from "node:fs";
import { parseRow, safeParseRow, TABLES, isTable } from "../../src/data/schema";
import { sampleRows } from "../unit/samples";

const mode = process.argv[2];
if (mode === "emit") {
  let i = 0;
  const changes = sampleRows().map(([table, row]) => {
    i++;
    const id = `aaaaaaaa-0000-4000-8000-${String(i).padStart(12, "0")}`;
    const stamp = "2026-09-24T12:00:00.000Z";
    return { table, row: parseRow(table, { ...row, id, created_at: stamp, updated_at: stamp, hlc: `0001790000000:${String(i).padStart(6, "0")}:t`, device_id: "t" }) };
  });
  process.stdout.write(JSON.stringify(changes));
} else {
  const res = JSON.parse(readFileSync(0, "utf8"));
  const seen = new Set<string>();
  let bad = 0;
  for (const { table, row } of res.changes) {
    if (!isTable(table)) throw new Error(`unknown table ${table}`);
    const v = safeParseRow(table, row);
    if (!v.success) {
      bad++;
      console.error(table, JSON.stringify(v.error.issues));
    }
    seen.add(table);
  }
  const missing = TABLES.filter((t) => !seen.has(t));
  if (missing.length) console.error("missing tables:", missing.join(", "));
  if (bad || missing.length) process.exit(1);
  console.log(`round trip ok: ${res.changes.length} rows across ${seen.size} tables`);
}
