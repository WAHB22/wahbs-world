import { describe, expect, it } from "vitest";
import { ServerCore } from "@/data/sync/serverCore";
import { Store } from "@/data/store";
import { device } from "./helpers";

const checkin = (kind: "gym_done" | "task_done") => ({
  kind,
  occurred_at: new Date().toISOString(),
  local_day: "2026-09-24",
  payload: {},
});

describe("saving on the device", () => {
  it("stores the row and its outbox entry together", async () => {
    const server = new ServerCore();
    const { store } = await device(server);
    const row = await store.put("checkins", checkin("gym_done"));
    expect(await store.get("checkins", row.id)).toMatchObject({ kind: "gym_done", rev: null });
    expect(await store.pendingCount()).toBe(1);
  });

  it("survives closing and reopening the database (a reload)", async () => {
    const name = `reload-${Date.now()}`;
    const a = await Store.open(name);
    const row = await a.put("checkins", checkin("task_done"));
    a.close();
    const b = await Store.open(name);
    expect(await b.get("checkins", row.id)).toBeTruthy();
    expect(await b.pendingCount()).toBe(1);
    expect(b.deviceId).toBe(a.deviceId);
  });

  it("rejects rows that break the schema, and saves nothing", async () => {
    const { store } = await device(new ServerCore());
    await expect(store.put("checkins", { kind: "nope" } as never)).rejects.toThrow();
    expect(await store.pendingCount()).toBe(0);
  });
});

describe("sync between two devices", () => {
  it("a check in made offline on the phone reaches the laptop after reconnecting", async () => {
    const server = new ServerCore();
    const phone = await device(server);
    const laptop = await device(server);
    phone.net.online = false;
    const row = await phone.store.put("checkins", checkin("gym_done"));
    await phone.engine.sync();
    expect(phone.engine.status.state).toBe("offline");
    expect(phone.engine.status.pending).toBe(1);

    phone.net.online = true;
    await phone.engine.sync();
    expect(phone.engine.status).toMatchObject({ state: "idle", pending: 0 });
    expect((await phone.store.get("checkins", row.id))!.rev).toBeGreaterThan(0);

    await laptop.engine.sync();
    expect(await laptop.store.get("checkins", row.id)).toMatchObject({ kind: "gym_done" });
  });

  it("deletes travel as tombstones", async () => {
    const server = new ServerCore();
    const a = await device(server);
    const b = await device(server);
    const row = await a.store.put("tasks", { title: "Quiz 2 review" });
    await a.engine.sync();
    await b.engine.sync();
    await b.store.remove("tasks", row.id);
    await b.engine.sync();
    await a.engine.sync();
    expect(await a.store.all("tasks")).toHaveLength(0);
    expect((await a.store.get("tasks", row.id))!.deleted_at).not.toBeNull();
  });

  it("the later edit wins a conflict and the other version is kept in history", async () => {
    const server = new ServerCore();
    const a = await device(server);
    const b = await device(server);
    const row = await a.store.put("tasks", { title: "Original" });
    await a.engine.sync();
    await b.engine.sync();
    a.net.online = false;
    b.net.online = false;
    await a.store.patch("tasks", row.id, { title: "Edited on the phone" });
    await new Promise((r) => setTimeout(r, 5));
    await b.store.patch("tasks", row.id, { title: "Edited on the laptop" });
    a.net.online = b.net.online = true;
    await a.engine.sync();
    await b.engine.sync();
    await a.engine.sync();
    expect((await a.store.get("tasks", row.id))!.title).toBe("Edited on the laptop");
    expect((await b.store.get("tasks", row.id))!.title).toBe("Edited on the laptop");
    expect(server.history.map((h) => h.row.title)).toContain("Edited on the phone");
  });

  it("an older edit arriving late does not overwrite a newer one", async () => {
    const server = new ServerCore();
    const a = await device(server);
    const b = await device(server);
    const row = await a.store.put("tasks", { title: "v1" });
    a.net.online = false;
    await a.engine.sync();
    await b.engine.sync(); // b has nothing yet
    await a.store.patch("tasks", row.id, { title: "v2" });
    a.net.online = true;
    await a.engine.sync();
    await b.engine.sync();
    expect((await b.store.get("tasks", row.id))!.title).toBe("v2");
    expect(server.count("tasks")).toBe(1);
  });

  it("drains a large offline backlog in batches", async () => {
    const server = new ServerCore();
    const a = await device(server);
    const b = await device(server);
    a.net.online = false;
    for (let i = 0; i < 450; i++) await a.store.put("checkins", checkin("task_done"));
    a.net.online = true;
    await a.engine.sync();
    await b.engine.sync();
    expect(server.count("checkins")).toBe(450);
    expect(await b.store.all("checkins")).toHaveLength(450);
    expect(await a.store.pendingCount()).toBe(0);
  });
});
