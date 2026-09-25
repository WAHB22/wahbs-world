"use client";

import { ArrowLeft, GearSix } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { WorldSlug } from "@/worlds/registry";
import { AuthGate } from "./AuthGate";
import { SyncBadge } from "./SyncBadge";
import { WorldMark } from "./WorldIcon";

/**
 * Every page inside the app: a slim bar (the way back to the menu, the save state, Settings),
 * then the world's header: its chrome object, its name, one line about where things stand.
 */
export function Shell({ title, world, lede, actions, children, back = { href: "/", label: "Menu" } }: {
  title: string;
  world?: WorldSlug;
  lede?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  back?: { href: string; label: string } | null;
}) {
  return (
    <AuthGate>
      <div className="shell">
        <header className="nav">
          {back ? (
            <Link href={back.href} className="nav-back" aria-label={back.href === "/" ? "Back to the menu" : `Back to ${back.label}`}>
              <ArrowLeft size={18} weight="bold" aria-hidden="true" />
              <span>{back.label}</span>
            </Link>
          ) : <span className="nav-brand">Wahb&apos;s World</span>}
          <div className="nav-right">
            <SyncBadge />
            <Link href="/settings" className="btn btn-ghost icon-btn" aria-label="Settings"><GearSix size={20} aria-hidden="true" /></Link>
          </div>
        </header>
        <main className="page">
          <header className="world-head">
            {world && <WorldMark slug={world} size={64} />}
            <div className="world-head-text">
              <h1 className="world-title">{title}</h1>
              {lede && <p className="world-lede">{lede}</p>}
            </div>
            {actions && <div className="world-actions">{actions}</div>}
          </header>
          {children}
        </main>
      </div>
    </AuthGate>
  );
}
