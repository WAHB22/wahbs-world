import Link from "next/link";
import { SyncBadge } from "@/ui/SyncBadge";
import { AuthGate } from "@/ui/AuthGate";

// Phase 1 landing: the worlds as a menu. The glass landing replaces this in Phase 2.
const WORLDS = [
  { name: "Today", accent: "ember", href: "/today", note: "The pass: what needs you now, and one tap check ins." },
  { name: "School", accent: "coolant", phase: 3, note: "Courses, deadlines and the new term flow." },
  { name: "Work", accent: "flame", phase: 3, note: "Shifts as tickets, hours and pay." },
  { name: "Money", accent: "lagoon", phase: 3, note: "The jar, the bill, recurring bills." },
  { name: "Projects", accent: "signal", phase: 4, note: "Blueprints, tasks and dependencies." },
  { name: "Career", accent: "sky", phase: 4, note: "Experience to evidence to opportunity." },
  { name: "Knowledge", accent: "frost", phase: 4, note: "A constellation of what you learn." },
  { name: "Training", accent: "signal", phase: 4, note: "Sessions, and showing up." },
  { name: "Life", accent: "glow", phase: 4, note: "Moments worth keeping." },
];

export default function Landing() {
  return (
    <AuthGate>
      <div className="shell">
        <header className="topbar">
          <span className="brand">WAHB'S WORLD</span>
          <SyncBadge />
        </header>
        <main className="page landing">
          <h1 className="wahb" aria-label="WAHB">WAHB</h1>
          <nav aria-label="Worlds" className="menu">
            {WORLDS.map((w) =>
              w.href ? (
                <Link key={w.name} href={w.href} className="dish live" style={{ "--acc": `var(--color-${w.accent})` } as React.CSSProperties}>
                  <span className="dish-name">{w.name}</span>
                  <span className="dish-note">{w.note}</span>
                </Link>
              ) : (
                <div key={w.name} className="dish" style={{ "--acc": `var(--color-${w.accent})` } as React.CSSProperties}>
                  <span className="dish-name">{w.name}</span>
                  <span className="dish-note">{w.note}</span>
                  <span className="dish-soon">Opens in phase {w.phase}</span>
                </div>
              ),
            )}
          </nav>
          <div className="landing-actions">
            <Link href="/today" className="btn btn-primary">Enter Today</Link>
            <Link href="/settings" className="btn">Settings</Link>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
