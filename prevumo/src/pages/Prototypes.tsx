import { useEffect, type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight, Cpu, MonitorSmartphone } from "lucide-react";
import { Wordmark } from "../components/visuals";

type Part = "software" | "hardware";
type Item = { href: string; app?: boolean; title: string; tag: string; img: string; text: string; note?: string };

/** Everything the team built, split in two: what the owner and members use, and the boxes on the machines. */
const PARTS: Record<Part, { title: string; lede: string; icon: ReactNode; items: Item[] }> = {
  software: {
    title: "Software prototype",
    lede: "What the owner and the members use: the owner dashboard and app, and the QR manual a member opens on their phone.",
    icon: <MonitorSmartphone className="size-5" aria-hidden />,
    items: [
      {
        href: "/dashboard",
        app: true,
        title: "Owner dashboard",
        tag: "Live simulation",
        img: "/shots/dashboard.jpg",
        text: "The clickable dashboard from the pitch. A simulation plays the boxes: live charts, alerts, idle shutdowns, assignments and a daily report.",
        note: "Earlier version: members sign in with a PIN. The PD B3 boxes use an NFC fob.",
      },
      {
        href: "/software/owner-app/",
        title: "Owner app",
        tag: "PD B3 concept · demo data",
        img: "/shots/owner-app.jpg",
        text: "Machines, alerts with three buttons, members, resources and the QR manuals, on a computer or a phone.",
      },
      {
        href: "/software/manual/",
        title: "QR machine manual",
        tag: "Phone first",
        img: "/shots/manual.jpg",
        text: "What a member sees after scanning the sticker on a box: checks, start, shut down and a red emergency section.",
      },
    ],
  },
  hardware: {
    title: "Hardware prototypes",
    lede: "One box per machine type, drawn as interactive 3D sheets: assembled, in pieces with a parts table, on the machine, and how it works.",
    icon: <Cpu className="size-5" aria-hidden />,
    items: [
      {
        href: "/hardware/system/",
        title: "System overview",
        tag: "Start here",
        img: "/shots/system.jpg",
        text: "How the boxes connect to the PREVUMO cloud and the owner app, what each module watches, and one session in five steps.",
      },
      { href: "/hardware/welder/", title: "Welder module", tag: "Interactive 3D drawing", img: "/shots/welder.jpg", text: "NFC fob, gas valve, gas leak sensor and wire scale on a MIG welder." },
      { href: "/hardware/printer/", title: "3D printer module", tag: "Interactive 3D drawing", img: "/shots/printer.jpg", text: "Spool scale, failed print pause and a heating timeout. The warm-up is flagged as normal." },
      { href: "/hardware/enclosed-printer/", title: "Enclosed printer module", tag: "Interactive 3D drawing", img: "/shots/enclosed-printer.jpg", text: "The printer box on an enclosed printer, plus a chamber temperature sensor." },
      { href: "/hardware/multimaker/", title: "Multimaker module", tag: "Interactive 3D drawing", img: "/shots/multimaker.jpg", text: "Print, laser or CNC picked on the box after the fob tap; each mode tracks its own resource." },
      { href: "/hardware/laser-cutter/", title: "Laser cutter module", tag: "Interactive 3D drawing", img: "/shots/laser-cutter.jpg", text: "Exhaust and air interlocks, a pause on flame or when the operator taps out, and a coolant stop." },
    ],
  },
};
const ORDER: Part[] = ["software", "hardware"];

function ItemLink({ item, className, children }: { item: Item; className: string; children: ReactNode }) {
  // the dashboard is this React app; every other page is a static page, so it gets a full page load
  return item.app ? (
    <Link to={item.href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={item.href} className={className}>
      {children}
    </a>
  );
}

function PartTabs({ part }: { part?: Part }) {
  return (
    <nav aria-label="Prototype parts" className="inline-flex gap-1 rounded-[11px] bg-idle p-1">
      {ORDER.map((p) => (
        <Link
          key={p}
          to={`/${p}`}
          aria-current={part === p ? "page" : undefined}
          className="inline-flex h-9 items-center rounded-[8px] px-3 text-[13px] font-medium text-ink transition-colors duration-150 hover:bg-surface aria-[current=page]:bg-ink aria-[current=page]:text-bg sm:px-4 sm:text-sm"
        >
          {PARTS[p].title}
        </Link>
      ))}
    </nav>
  );
}

function Card({ item }: { item: Item }) {
  return (
    <ItemLink item={item} className="group flex flex-col overflow-hidden rounded-[16px] border border-border bg-surface transition-[border-color,translate] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-ink">
      <img src={item.img} alt="" width={960} height={540} loading="lazy" className="aspect-video w-full border-b border-border bg-bg object-cover" />
      <div className="flex flex-1 flex-col p-5">
        <p className="num text-[12px] text-muted">{item.tag}</p>
        <h3 className="mt-1.5 text-[20px] font-semibold">{item.title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.text}</p>
        {item.note && <p className="mt-3 rounded-[8px] bg-orange-tint px-3 py-2 text-[13px] leading-snug text-ink">{item.note}</p>}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-green">
          Open {item.title.toLowerCase().startsWith("qr") ? "the manual" : "it"}
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </ItemLink>
  );
}

function PartPanel({ part }: { part: Part }) {
  const p = PARTS[part];
  return (
    <section aria-labelledby={`h-${part}`} className="flex flex-col rounded-[20px] border border-border bg-surface p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-green-tint text-ink">{p.icon}</span>
        <div>
          <p className="num text-[12px] text-muted">Part {ORDER.indexOf(part) + 1} of 2 · {p.items.length} prototypes</p>
          <h2 id={`h-${part}`} className="text-[24px] font-semibold">{p.title}</h2>
        </div>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{p.lede}</p>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {p.items.map((item) => (
          <li key={item.href}>
            <ItemLink item={item} className="group flex items-center gap-4 py-3">
              <img src={item.img} alt="" width={960} height={540} loading="lazy" className="hidden aspect-video w-24 shrink-0 rounded-[8px] border border-border object-cover sm:block" />
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold">{item.title}</span>
                <span className="num block text-[12px] text-muted">{item.tag}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-green transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </ItemLink>
          </li>
        ))}
      </ul>
      <Link to={`/${part}`} className="mt-5 inline-flex h-10 items-center justify-center gap-2 self-start rounded-[8px] bg-ink px-4 text-sm font-medium text-bg">
        See the {part} part
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

export function Prototypes({ part }: { part?: Part }) {
  const focus = part ? PARTS[part] : null;
  const other = part ? ORDER.find((p) => p !== part)! : null;
  useEffect(() => {
    document.title = focus ? `${focus.title} · PREVUMO` : "PREVUMO prototypes";
  }, [focus]);
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-bg/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" aria-label="PREVUMO prototypes, home" className="rounded-[8px]">
            <Wordmark />
          </Link>
          <PartTabs part={part} />
          <p className="num ml-auto hidden text-[12px] text-muted md:block">GNG 4120 · Group 10 · PD B3</p>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-4 pt-10 pb-16 sm:px-6 lg:px-8">
        {!focus ? (
          <>
            <p className="num text-[13px] text-green">GNG 4120 · Group 10 · PD B3</p>
            <h1 className="mt-2 max-w-[20ch] text-[36px] leading-[1.05] font-semibold text-balance sm:text-[52px]">PREVUMO prototypes</h1>
            <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-muted sm:text-[19px]">
              Preventive maintenance for makerspaces: one box per machine type that protects the machine and the resources it uses, an owner app, and a QR manual on every machine. The work is in two parts.
            </p>
            <p className="mt-5 inline-flex items-start gap-2.5 rounded-[14px] bg-orange-tint px-4 py-2.5 text-[14px] leading-snug font-medium">
              <span className="mt-[6px] size-2 shrink-0 rounded-full bg-orange" aria-hidden />
              Concept prototypes: the hardware is not built or tested, and every chart, number and alert is illustrative.
            </p>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              {ORDER.map((p) => (
                <PartPanel key={p} part={p} />
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="num text-[13px] text-green">Part {ORDER.indexOf(part!) + 1} of 2</p>
            <h1 className="mt-2 flex items-center gap-3 text-[34px] leading-[1.05] font-semibold sm:text-[46px]">{focus.title}</h1>
            <p className="mt-3 max-w-[62ch] text-[17px] leading-relaxed text-muted">{focus.lede}</p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {focus.items.map((item) => (
                <Card key={item.href} item={item} />
              ))}
            </div>
            <Link to={`/${other}`} className="mt-10 inline-flex h-11 items-center gap-2 rounded-[8px] border border-border bg-surface px-4 text-sm font-medium">
              Next: {PARTS[other!].title}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </>
        )}
        <p className="mt-14 max-w-[70ch] border-t border-border pt-5 text-[13px] leading-relaxed text-muted">
          PREVUMO, GNG 4120 Group 10. Concept only, not built or tested. A licensed electrician installs switching parts; gas parts reviewed by a licensed gas fitter; CSA certification needed before sale.
        </p>
      </main>
    </div>
  );
}
