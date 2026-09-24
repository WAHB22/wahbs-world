import { describe, expect, it } from "vitest";
import { exportAll, importAll, previewImport } from "@/data/backup";
import { ServerCore } from "@/data/sync/serverCore";
import { TABLES } from "@/data/schema";
import { device } from "./helpers";
import { sampleRows } from "./samples";

describe("export and import", () => {
  it("round trips every table, tombstones included", async () => {
    const a = await device(new ServerCore());
    for (const [table, row] of sampleRows()) await a.store.put(table, row);
    const gone = await a.store.put("tasks", { title: "deleted later" });
    await a.store.remove("tasks", gone.id);
    const file = JSON.parse(JSON.stringify(await exportAll(a.store)));
    expect(Object.keys(file.tables).sort()).toEqual([...TABLES].sort());

    const b = await device(new ServerCore());
    const preview = await previewImport(b.store, file);
    expect(preview.ok).toBe(true);
    expect(preview.counts.every((c) => c.invalid === 0)).toBe(true);
    const res = await importAll(b.store, file);
    expect(res.skipped).toBe(0);
    for (const t of TABLES) {
      const left = await a.store.db.table(t).toArray();
      const right = await b.store.db.table(t).toArray();
      expect(right.map((r) => ({ ...r, rev: null })).sort((x, y) => x.id.localeCompare(y.id))).toEqual(
        left.map((r) => ({ ...r, rev: null })).sort((x, y) => x.id.localeCompare(y.id)),
      );
    }
    expect((await b.store.get("tasks", gone.id))!.deleted_at).not.toBeNull();
    expect(await b.store.pendingCount()).toBeGreaterThan(0);
  });

  it("never overwrites newer local data and never wipes", async () => {
    const a = await device(new ServerCore());
    const row = await a.store.put("tasks", { title: "old" });
    const file = JSON.parse(JSON.stringify(await exportAll(a.store)));
    await a.store.patch("tasks", row.id, { title: "newer" });
    await a.store.put("tasks", { title: "only here" });
    const preview = await previewImport(a.store, file);
    expect(preview.counts.find((c) => c.table === "tasks")).toMatchObject({ older: 1, new: 0 });
    await importAll(a.store, file);
    expect((await a.store.get("tasks", row.id))!.title).toBe("newer");
    expect(await a.store.all("tasks")).toHaveLength(2);
  });

  it("refuses files that are not exports and reports bad rows", async () => {
    const a = await device(new ServerCore());
    expect((await previewImport(a.store, { hello: 1 })).ok).toBe(false);
    const p = await previewImport(a.store, { app: "wahbs-world", schema: 1, exported_at: "x", tables: { tasks: [{ id: "nope" }], mystery: [] } });
    expect(p.problems.join(" ")).toMatch(/1 rows in tasks/);
    expect(p.problems.join(" ")).toMatch(/Unknown table "mystery"/);
  });
});
