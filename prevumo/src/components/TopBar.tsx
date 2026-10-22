import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { Bell, Check, ChevronDown, CircleHelp, Menu, X } from "lucide-react";
import { useApp } from "../store/store";
import { isInUse, openIrregular } from "../sim/insights";
import { fmtDate, fmtTime, pad } from "../lib/time";
import type { AppEvent } from "../sim/types";
import { Wordmark } from "./visuals";
import { cx } from "./style";

const NAV = [
  { to: "", label: "Home", end: true },
  { to: "assignments", label: "Assignments" },
  { to: "reports", label: "Reports" },
  { to: "settings", label: "Settings" },
];

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function LocationSwitcher({ locId }: { locId: string }) {
  const { world } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const nav = useNavigate();
  const current = world.locations.find((l) => l.id === locId);
  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 min-w-0 items-center gap-1.5 rounded-[8px] border border-border bg-surface/70 px-2.5 text-sm font-medium text-ink transition-colors hover:bg-idle"
      >
        <span className="truncate">{current?.name ?? "Locations"}</span>
        <ChevronDown className={cx("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Switch location"
          className="drop-in origin-top-left absolute top-11 left-0 z-40 w-72 rounded-[12px] border border-border bg-surface p-1.5 shadow-[0_14px_40px_rgb(31_61_43/0.16)]"
        >
          {world.locations.map((l) => {
            const machines = world.machines.filter((m) => m.locationId === l.id);
            const inUse = machines.filter(isInUse).length;
            return (
              <button
                key={l.id}
                type="button"
                role="option"
                aria-selected={l.id === locId}
                onClick={() => {
                  setOpen(false);
                  nav(`/l/${l.id}`);
                }}
                className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left transition-colors hover:bg-bg"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{l.name}</span>
                  <span className="block text-xs text-muted">
                    {machines.length} machines · {inUse ? `${inUse} in use` : "all idle"}
                  </span>
                </span>
                {l.id === locId && <Check className="size-4 text-green" />}
              </button>
            );
          })}
          <Link to="/locations" onClick={() => setOpen(false)} className="mt-1 block rounded-[8px] border-t border-border px-3 pt-2.5 pb-2 text-[13px] text-muted hover:text-ink">
            All locations
          </Link>
        </div>
      )}
    </div>
  );
}

/** The bell turns rust only while a decision is waiting; plain unread items show in ink. */
export function BellLink({ locId }: { locId?: string }) {
  const { world, now } = useApp();
  const open = openIrregular(world);
  const unread = world.events.filter((e) => !e.read).length;
  const newest = open.reduce<AppEvent | undefined>((a, e) => (!a || e.at > a.at ? e : a), undefined);
  const count = open.length || unread;
  return (
    <Link
      to={`/l/${locId ?? world.locations[0].id}/notifications`}
      aria-label={open.length ? `Notifications, ${open.length} waiting for a decision` : unread ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-idle"
    >
      <Bell key={newest?.id} className={cx("size-[19px]", newest && now - newest.at < 6000 && "bell-ring")} />
      {count > 0 && (
        <span
          key={count}
          className={cx(
            "toast-in num absolute top-1 right-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-medium text-white",
            open.length ? "bg-rust" : "bg-ink",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function TopBar({ locId }: { locId?: string }) {
  const { now } = useApp();
  const [menu, setMenu] = useState(false);
  const ref = useDismiss(menu, () => setMenu(false));
  return (
    <div className="border-b border-border bg-bg/92 backdrop-blur-md">
      <div ref={ref} className="relative mx-auto flex h-16 max-w-[1320px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link to="/locations" aria-label="PREVUMO, all locations" className="mr-1 shrink-0 rounded-[8px]">
          <Wordmark />
        </Link>
        {locId && (
          <>
            <span aria-hidden className="mx-1 hidden h-5 w-px bg-border sm:block" />
            <div className="hidden min-w-0 sm:block">
              <LocationSwitcher locId={locId} />
            </div>
            <p className="ml-2 hidden items-baseline gap-2 text-[13px] text-muted lg:flex">
              {fmtDate(now)}
              <span className="num text-[14px] text-ink">
                {fmtTime(now)}:{pad(new Date(now).getSeconds())}
              </span>
            </p>
          </>
        )}
        <div className="flex-1" />
        {locId && (
          <nav aria-label="Main" className="hidden items-center gap-0.5 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.label}
                to={`/l/${locId}${n.to ? `/${n.to}` : ""}`}
                end={n.end}
                className={({ isActive }) =>
                  cx(
                    "relative rounded-[8px] px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "text-ink after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded after:bg-green" : "text-muted hover:text-ink",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
        {locId && (
          <Link
            to={`/l/${locId}/settings#help`}
            aria-label="Help and support"
            title="Help and support"
            className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-idle"
          >
            <CircleHelp className="size-[19px]" />
          </Link>
        )}
        <BellLink locId={locId} />
        {locId && (
          <button
            type="button"
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-idle md:hidden"
          >
            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        )}
        {menu && locId && (
          <div className="drop-in origin-top-right absolute inset-x-3 top-[60px] z-40 rounded-[14px] border border-border bg-surface p-2 shadow-[0_14px_40px_rgb(31_61_43/0.16)] md:hidden">
            <div className="border-b border-border px-1 pb-2 sm:hidden">
              <LocationSwitcher locId={locId} />
            </div>
            <nav aria-label="Main" className="grid pt-1">
              {NAV.map((n) => (
                <NavLink
                  key={n.label}
                  to={`/l/${locId}${n.to ? `/${n.to}` : ""}`}
                  end={n.end}
                  onClick={() => setMenu(false)}
                  className={({ isActive }) => cx("rounded-[8px] px-3 py-3 text-[15px] font-medium", isActive ? "bg-green-tint text-ink" : "text-ink hover:bg-idle")}
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
