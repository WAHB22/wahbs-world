"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SYNC_MODE } from "./config";
import { seedIfNeeded } from "./seed/apply";
import { Store } from "./store";
import { SyncEngine, type SyncStatus } from "./sync/engine";
import { HttpMemoryTransport, SupabaseTransport } from "./sync/transports";
import { supabase } from "./supabase";

type Auth = { state: "loading" } | { state: "signed-out" } | { state: "signed-in"; email: string | null } | { state: "not-needed" };

type World = {
  store: Store | null;
  engine: SyncEngine | null;
  status: SyncStatus;
  auth: Auth;
  persisted: boolean | null;
  error: string | null;
};

const initial: World = {
  store: null,
  engine: null,
  status: { state: "idle", pending: 0, lastSyncedAt: null, error: null },
  auth: { state: "loading" },
  persisted: null,
  error: null,
};

const Ctx = createContext<World>(initial);
export const useWorld = () => useContext(Ctx);

let storePromise: Promise<Store> | null = null;
/** One database connection per tab, shared across renders and strict mode double effects. */
export function openStore() {
  return (storePromise ??= Store.open("wahbs-world").then(async (s) => {
    await seedIfNeeded(s);
    return s;
  }));
}

function authFrom(session: Session | null): Auth {
  return session ? { state: "signed-in", email: session.user.email ?? null } : { state: "signed-out" };
}

export function WorldProvider({ children }: { children: ReactNode }) {
  const [world, setWorld] = useState<World>(initial);

  useEffect(() => {
    let engine: SyncEngine | null = null;
    let unsubStatus = () => {};
    let unsubAuth = () => {};
    let cancelled = false;

    const startEngine = (store: Store, withServer: boolean) => {
      engine?.stop();
      unsubStatus();
      const transport = !withServer ? null : SYNC_MODE === "memory" ? new HttpMemoryTransport() : new SupabaseTransport(supabase());
      engine = new SyncEngine(store, transport);
      unsubStatus = engine.subscribe((status) => !cancelled && setWorld((w) => ({ ...w, status })));
      engine.start();
      setWorld((w) => ({ ...w, engine }));
    };

    (async () => {
      try {
        const store = await openStore();
        if (cancelled) return;
        // Ask the browser not to evict this site's storage (important on iPhone).
        const persisted = navigator.storage?.persist ? await navigator.storage.persist().catch(() => false) : false;
        setWorld((w) => ({ ...w, store, persisted }));

        if (SYNC_MODE === "supabase") {
          const sb = supabase();
          const { data } = await sb.auth.getSession();
          setWorld((w) => ({ ...w, auth: authFrom(data.session) }));
          startEngine(store, !!data.session);
          const sub = sb.auth.onAuthStateChange((_event, session) => {
            setWorld((w) => ({ ...w, auth: authFrom(session) }));
            if (_event === "SIGNED_IN" || _event === "SIGNED_OUT") startEngine(store, !!session);
          });
          unsubAuth = () => sub.data.subscription.unsubscribe();
        } else {
          setWorld((w) => ({ ...w, auth: { state: "not-needed" } }));
          startEngine(store, SYNC_MODE === "memory");
        }
      } catch (e) {
        setWorld((w) => ({ ...w, error: e instanceof Error ? e.message : String(e) }));
      }
    })();

    return () => {
      cancelled = true;
      engine?.stop();
      unsubStatus();
      unsubAuth();
    };
  }, []);

  return <Ctx.Provider value={world}>{children}</Ctx.Provider>;
}
