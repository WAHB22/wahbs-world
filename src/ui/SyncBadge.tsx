"use client";

import { useWorld } from "@/data/runtime";

const LABEL = {
  idle: "Synced",
  syncing: "Syncing",
  offline: "Offline",
  error: "Sync problem",
  "device-only": "On this device",
} as const;

/** Always visible: whether what he saved has reached the other device yet. */
export function SyncBadge() {
  const { status, store } = useWorld();
  if (!store) return <span className="sync-badge" data-state="loading">Opening</span>;
  const waiting = status.pending > 0 && status.state !== "device-only";
  const text = waiting ? `Saved here, ${status.pending} waiting` : LABEL[status.state];
  return (
    <span className="sync-badge" data-state={waiting ? "waiting" : status.state} role="status" aria-live="polite" title={status.error ?? undefined} data-testid="sync-badge">
      <i aria-hidden="true" />
      {text}
    </span>
  );
}
