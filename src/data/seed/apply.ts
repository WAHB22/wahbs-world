import { SEED_HLC } from "../hlc";
import { uuidFromName } from "../ids";
import type { AnyRow } from "../schema";
import type { Store } from "../store";
import { fall2026, type SeedRow } from "./fall2026";

export const SEED_VERSION = "fall2026:v2";

/** Turn keyed seed rows into full rows with stable ids, resolving `ref:` links. */
export async function resolveSeed(rows: SeedRow[] = fall2026()): Promise<{ table: SeedRow["table"]; row: AnyRow }[]> {
  const ids = new Map<string, string>();
  const idFor = async (key: string) => {
    let v = ids.get(key);
    if (!v) ids.set(key, (v = await uuidFromName(key)));
    return v;
  };
  const resolve = async (v: unknown): Promise<unknown> => {
    if (typeof v === "string" && v.startsWith("ref:")) return idFor(v.slice(4));
    if (Array.isArray(v)) return Promise.all(v.map(resolve));
    return v;
  };
  const stamp = "2026-09-24T12:00:00.000Z";
  const out: { table: SeedRow["table"]; row: AnyRow }[] = [];
  for (const { table, key, row } of rows) {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) fields[k] = await resolve(v);
    out.push({
      table,
      row: { ...fields, id: await idFor(key), created_at: stamp, updated_at: stamp, hlc: SEED_HLC, device_id: "seed", deleted_at: null, rev: null, user_id: null } as AnyRow,
    });
  }
  return out;
}

/** Write the seed once per device. Any real edit beats a seed row, and both devices produce identical rows. */
export async function seedIfNeeded(store: Store): Promise<boolean> {
  if ((await store.getMeta<string>("seed")) === SEED_VERSION) return false;
  for (const { table, row } of await resolveSeed()) await store.applyRemote(table, row, { queue: true });
  await store.setMeta("seed", SEED_VERSION);
  return true;
}
