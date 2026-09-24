import { describe, expect, it } from "vitest";
import { resolveSeed, seedIfNeeded } from "@/data/seed/apply";
import { ServerCore } from "@/data/sync/serverCore";
import { safeParseRow } from "@/data/schema";
import { device } from "./helpers";

describe("seed data", () => {
  it("every seed row passes its schema and every link points at a seed row", async () => {
    const rows = await resolveSeed();
    const ids = new Set(rows.map((r) => r.row.id));
    for (const { table, row } of rows) {
      const v = safeParseRow(table, row);
      expect(v.success, `${table} ${JSON.stringify(v.error?.issues)}`).toBe(true);
      for (const [k, val] of Object.entries(row)) {
        if (k === "id" || k === "user_id" || k === "device_id") continue;
        if (k.endsWith("_id") && val) expect(ids.has(val as string), `${table}.${k}`).toBe(true);
      }
    }
    expect(rows.filter((r) => r.table === "courses")).toHaveLength(6);
    expect(rows.filter((r) => r.table === "assessments").length).toBeGreaterThan(35);
  });

  it("two devices seeding offline merge into one copy", async () => {
    const server = new ServerCore();
    const a = await device(server);
    const b = await device(server);
    expect(await seedIfNeeded(a.store)).toBe(true);
    expect(await seedIfNeeded(a.store)).toBe(false);
    await seedIfNeeded(b.store);
    await a.engine.sync();
    await b.engine.sync();
    await a.engine.sync();
    expect(server.count("courses")).toBe(6);
    expect(await b.store.all("courses")).toHaveLength(6);
    expect(server.history).toHaveLength(0);
  });

  it("an edit made on top of the seed wins", async () => {
    const server = new ServerCore();
    const a = await device(server);
    const b = await device(server);
    await seedIfNeeded(a.store);
    const course = (await a.store.all("courses")).find((c) => c.code === "CHG 3337")!;
    await a.store.patch("courses", course.id, { professor: "Changed" });
    await a.engine.sync();
    await seedIfNeeded(b.store);
    await b.engine.sync();
    expect((await b.store.get("courses", course.id))!.professor).toBe("Changed");
  });
});
