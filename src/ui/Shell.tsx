"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SyncBadge } from "./SyncBadge";
import { AuthGate } from "./AuthGate";

/** Every world page: a visible way back, the title, and the save state. */
export function Shell({ title, accent, children, back = true }: { title: string; accent?: string; children: ReactNode; back?: boolean }) {
  return (
    <AuthGate>
      <div className="shell" style={accent ? ({ "--accent": `var(--color-${accent})`, "--accent-rgb": `var(--rgb-${accent})` } as React.CSSProperties) : undefined}>
        <header className="topbar">
          {back ? (
            <Link href="/" className="back" aria-label="Back to the world">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>The world</span>
            </Link>
          ) : (
            <span className="brand">WAHB'S WORLD</span>
          )}
          <SyncBadge />
        </header>
        <main className="page">
          <h1 className="world-title">{title}</h1>
          {children}
        </main>
      </div>
    </AuthGate>
  );
}
