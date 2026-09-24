"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { CONFIG_ERROR } from "@/data/config";
import { useWorld } from "@/data/runtime";

/** Private: in production nothing renders until he is signed in. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { auth, error } = useWorld();
  const router = useRouter();
  useEffect(() => {
    if (auth.state === "signed-out") router.replace("/login");
  }, [auth.state, router]);
  if (CONFIG_ERROR) return <p className="page soft" role="alert">Setup problem: {CONFIG_ERROR}</p>;
  if (error) return <p className="page soft" role="alert">The local database could not open: {error}</p>;
  if (auth.state === "loading" || auth.state === "signed-out") return <div className="page soft" aria-busy="true">Opening your world</div>;
  return <>{children}</>;
}
