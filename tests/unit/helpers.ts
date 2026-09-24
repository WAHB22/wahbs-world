import { Store } from "@/data/store";
import { SyncEngine } from "@/data/sync/engine";
import { ServerCore } from "@/data/sync/serverCore";
import type { Transport } from "@/data/sync/types";

let n = 0;
/** A transport over an in memory server, with a switch to simulate losing the connection. */
export function link(server: ServerCore) {
  const state = { online: true };
  const transport: Transport = {
    name: "test",
    async push(c) {
      if (!state.online) throw new TypeError("network down: fetch failed");
      return structuredClone(server.push(structuredClone(c)));
    },
    async pull(s, l) {
      if (!state.online) throw new TypeError("network down: fetch failed");
      return structuredClone(server.pull(s, l));
    },
  };
  return { transport, state };
}

export async function device(server: ServerCore) {
  const store = await Store.open(`test-${Date.now()}-${n++}`);
  const { transport, state } = link(server);
  const engine = new SyncEngine(store, transport, () => state.online);
  return { store, engine, net: state };
}
