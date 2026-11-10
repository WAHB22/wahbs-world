// Builds the PD B3 Word report from the published PREVUMO pages.
// Usage (from prevumo/report): node build.cjs   then   python3 finish.py
// Facts come only from the PREVUMO brief and the report prompt. Interview fields stay blank.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType,
  BorderStyle, LineRuleType, ImageRun, Footer, PageNumber, TableOfContents, PageBreak, ExternalHyperlink, LevelFormat, VerticalAlign, HeightRule,
} = require("docx");

const HERE = __dirname;
const IMG = (f) => fs.readFileSync(path.join(HERE, "img", f));
const PAGES = JSON.parse(fs.readFileSync(path.join(HERE, "pages.json"), "utf8"));
const FONT = "Times New Roman";
const W = 9406;                 // text width in DXA: Letter 12240 minus two 2.5 cm margins (1417 each)
const GREY = "E7E7E7";
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

const URL = {
  welder: "https://claude.ai/artifact/KAUbvfq3DmXSjazq2fNP8Q",
  printer: "https://claude.ai/artifact/T8ZbrGETfFSC93hxXRPbfV",
  enclosed: "https://claude.ai/artifact/75rKRdjDcEjJiDaA1jvsZ4",
  multimaker: "https://claude.ai/artifact/C52M2y6pjY9HUNtT7dSVgp",
  laser: "https://claude.ai/artifact/5e6JmpAoJxPuM4aq2bjoHg",
  overview: "https://claude.ai/artifact/RAf322imEcX6BZJNPqsnQb",
  manual: "https://claude.ai/artifact/H3puTqjPPLrXovR8i2b6jk",
  app: "https://claude.ai/artifact/4h4W69hJd84m2PPxQsAU6n",
};
const PAGE_LIST = [
  ["1", "Welder module", URL.welder, "Box beside a MIG welder: NFC fob, gas valve, gas leak sensor, wire scale."],
  ["2", "3D printer module", URL.printer, "Box for an FDM printer: spool scale, printer link, failed print pause, heating timeout."],
  ["3", "Enclosed printer module", URL.enclosed, "The printer box on an enclosed printer, plus a chamber temperature sensor."],
  ["4", "Multimaker module", URL.multimaker, "Box for a 3-in-1 machine: mode buttons for print, laser and CNC."],
  ["5", "Laser cutter module", URL.laser, "Box beside a CO2 laser: exhaust, air, flame and coolant checks, laser minutes."],
  ["6", "System overview", URL.overview, "Diagram of the whole system, the risks table, the session in five steps."],
  ["7", "QR machine manual", URL.manual, "Phone-first manual for Welder 2, 3D printer 4 and Laser 1."],
  ["8", "Owner app", URL.app, "Machines, alerts, members, resources and manuals, with demo data."],
];

// ---------------- small builders ----------------
const runs = (parts, base = {}) => (Array.isArray(parts) ? parts : [parts]).map((p) => (typeof p === "string" ? new TextRun({ text: p, font: FONT, ...base }) : p.link ? new ExternalHyperlink({ link: p.link, children: [new TextRun({ text: p.text || p.link, font: FONT, style: "Hyperlink", size: p.size, ...base })] }) : new TextRun({ font: FONT, ...base, ...p })));
const P = (parts, o = {}) => new Paragraph({ children: runs(parts, o.run), spacing: { after: 120, ...(o.spacing || {}) }, alignment: o.align, keepNext: o.keepNext, keepLines: o.keepLines, pageBreakBefore: o.pageBreakBefore, numbering: o.numbering, indent: o.indent });
const H1 = (t, o = {}) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: FONT })], pageBreakBefore: o.pageBreakBefore });
const H2 = (t, o = {}) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT })], pageBreakBefore: o.pageBreakBefore });
const LABEL = (t, o = {}) => new Paragraph({ children: [new TextRun({ text: t, font: FONT, bold: true })], spacing: { before: 160, after: 80 }, keepNext: true, pageBreakBefore: o.pageBreakBefore });
const FILL = "[Fill in]";
const bullet = (parts) => P(parts, { numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 } });
let listN = 0;
const numbered = (items) => { const inst = ++listN; return items.map((parts) => P(parts, { numbering: { reference: "numbers", level: 0, instance: inst }, spacing: { after: 60 } })); };
function cell(content, width, o = {}) {
  const paras = (Array.isArray(content) && content.length && content[0] instanceof Paragraph) ? content : [new Paragraph({ children: runs(content === "" ? [""] : content, o.run), spacing: { after: 0 } })];
  return new TableCell({ children: paras, width: { size: width, type: WidthType.DXA }, borders: BORDERS, margins: { top: 80, bottom: 80, left: 110, right: 110 }, shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined, verticalAlign: o.vAlign || VerticalAlign.TOP });
}
function table(widths, header, rows, o = {}) {
  const tr = [];
  if (header) tr.push(new TableRow({ tableHeader: true, cantSplit: true, children: header.map((h, i) => cell([{ text: h, bold: true }], widths[i], { fill: "D9D9D9", run: o.run })) }));
  rows.forEach((r, ri) => tr.push(new TableRow({ cantSplit: true, height: o.heights ? { value: o.heights[ri], rule: HeightRule.ATLEAST } : undefined, children: r.map((c, i) => cell(c, widths[i], { fill: (o.fillCols && o.fillCols.includes(i)) ? GREY : undefined, run: o.run })) })));
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: tr });
}
function figure(file, wpx, hpx, caption) {
  return [
    new Paragraph({ children: [new ImageRun({ type: "png", data: IMG(file), transformation: { width: wpx, height: hpx }, altText: { title: caption, description: caption, name: file } })], alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60, line: 240, lineRule: LineRuleType.AUTO } }),
    new Paragraph({ children: [new TextRun({ text: caption, font: FONT, italics: true, size: 22 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  ];
}
let fig = 0;
const F = (file, wpx, hpx, text) => figure(file, wpx, hpx, `Figure ${++fig}. ${text}`);
const spacer = () => new Paragraph({ children: [], spacing: { after: 0 } });

// ---------------- content ----------------
const body = [];
const add = (...xs) => xs.flat().forEach((x) => body.push(x));

// cover (its own section, no page number)
const cover = [
  new Paragraph({ children: [], spacing: { before: 2200 } }),
  new Paragraph({ children: [new TextRun({ text: "PREVUMO", font: FONT, bold: true, size: 64 })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
  new Paragraph({ children: [new TextRun({ text: "Preventive maintenance for makerspaces", font: FONT, size: 32 })], alignment: AlignmentType.CENTER, spacing: { after: 600 } }),
  new Paragraph({ children: [new TextRun({ text: "PD B3: Customer discovery and prototype", font: FONT, bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
  new Paragraph({ children: [new TextRun({ text: "GNG 4120", font: FONT, size: 26 })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
  new Paragraph({ children: [new TextRun({ text: "Group 10", font: FONT, size: 26 })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
  new Paragraph({ children: [new TextRun({ text: "Professor Oday Aswad", font: FONT, size: 26 })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
  new Paragraph({ children: [new TextRun({ text: "November 2026", font: FONT, size: 26 })], alignment: AlignmentType.CENTER, spacing: { after: 600 } }),
  new Paragraph({ children: [new TextRun({ text: "Team members", font: FONT, bold: true, size: 24 })], spacing: { after: 100 }, keepNext: true }),
  table([700, 4353, 4353], ["No.", "Name", "Role"], [1, 2, 3, 4, 5].map((n) => [String(n), "", ""]), { fillCols: [1, 2], heights: [1, 2, 3, 4, 5].map(() => 480) }),
];

// table of contents
const toc = [
  new Paragraph({ children: [new TextRun({ text: "Table of contents", font: FONT, bold: true, size: 32 })], spacing: { after: 240 } }),
  new TableOfContents("Table of contents", { hyperlink: true, headingStyleRange: "1-2" }),
];

// 1. Summary
add(H1("1. Summary", { pageBreakBefore: true }));
add(P("PREVUMO is one module per machine type that protects the machine's health and the resources it uses: shielding gas and wire on a welder, filament on a 3D printer, tube time on a laser cutter. A member starts a session by tapping an NFC fob on the module. The owner sees every machine, alert and session in one owner app, and every machine carries a QR code that opens its manual."));
add(P("What changed since PD B2: we left the café and restaurant tracker, because cafés were not interested. PREVUMO now focuses on makerspaces only, with preventive maintenance per machine and per energy source, including gas leaks on the welder."));
add(P("This round we built eight prototype pages: five module drawings (welder, 3D printer, enclosed printer, multimaker, laser cutter), a system overview, a QR machine manual and an owner app. This report describes them, sets out seven hypotheses, and gives the interview plan and blank interview records for the team."));
add(P([{ text: "Concept only, not built or tested.", bold: true }, " Every chart, number and alert shown in the prototype is illustrative, not measured."]));

// 2. Problem and customer
add(H1("2. Problem and customer"));
add(P([{ text: "Segment. ", bold: true }, "Makerspaces and shared workshops with costly machines used by many members."]));
add(P("Problems we target, by machine:", { keepNext: true }));
add(bullet([{ text: "Welder: ", bold: true }, "gas left open, gas leak, excessive wire, untrained user, abnormal load."]));
add(bullet([{ text: "FDM printer: ", bold: true }, "heater stuck on, left heating, failed print, heavy filament use."]));
add(bullet([{ text: "Laser: ", bold: true }, "fire unattended, no exhaust, no air assist, tube overheating."]));

// 3. Evidence
add(H1("3. What we learned before this round (evidence)", { pageBreakBefore: true }));
add(P("These are the only sources used in this round. Each one changed something in the prototype.", { keepNext: true }));
add(table([2300, 3900, 3206], ["Source", "What it says", "What we changed"], [
  [[{ text: "Yukonstruct", bold: true }, " (Rick Yorgason, Oct 27)"], "“we wouldn't want it to be a personal code, we would want it to be an NFC fob.”", "Keypad replaced by an NFC fob reader on every module."],
  [[{ text: "Grey Bruce Makers", bold: true }], "Bills $0.10 per gram, and removes and weighs the spool by hand.", "Wire counter on the welder and spool scale on the printers."],
  [[{ text: "University of Regina", bold: true }], "Charges $0.10 per gram.", "Spool scale on the printers."],
  [[{ text: "Alveo3D", bold: true }], "Nozzles reach 250 °C and up; check prints every 30 minutes.", "Heating timeout on the printers."],
  [[{ text: "CMU EHS laser guideline", bold: true }], "Ventilation must be on before operation; keep cutters always attended.", "Exhaust interlock; pause when the operator taps out."],
  [[{ text: "VanHack", bold: true }], "A “zero tolerance” rule for leaving the laser.", "Pause when the operator taps out."],
  [[{ text: "HSE EIS45", bold: true }], "Listed as a source in the brief.", "[Fill in: what we used from it]"],
]));

// 4. Prototype
add(H1("4. The prototype (this round)", { pageBreakBefore: true }));
add(P("The prototype is a set of eight interactive web pages. Each module page is a drawing sheet: the module assembled, in pieces with a numbered parts table, on its machine, and then the steps of how it works as an animation. The names in the steps (Amira, Priya, Jonah and Lucas) are demo members on the pages, not real people. Every page is labelled as a concept, and every chart, number and alert on it is illustrative."));

add(H2("4.1 System overview"));
add(P("What each module watches, as on the System overview page:", { keepNext: true }));
add(table([1700, 3700, 1806, 2200], ["Machine", "Risks watched", "Resource tracked", "Automatic action"], [
  [[{ text: "Welder", bold: true }], "gas left open, gas leak, excessive wire, untrained user, abnormal load", "gas, wire", "valve closes, machine locks"],
  [[{ text: "FDM printer", bold: true }], "heater stuck on, left heating, failed print, heavy filament use", "filament, electricity", "power cut, pause"],
  [[{ text: "Laser", bold: true }], "fire unattended, no exhaust, no air assist, tube overheating", "tube minutes", "laser paused or locked"],
], { run: { size: 22 } }));
add(F("6-overview-diagram.png", 360, 254, "System overview page: modules on each machine report over Wi-Fi to the PREVUMO cloud and the owner app; a member's phone scans the QR sticker to open the manual. Illustrative."));
add(P("One session takes five steps on every module:", { keepNext: true, spacing: { before: 120 } }));
add(numbered([
  [{ text: "Tap fob. ", bold: true }, "The box checks that machine's trained list."],
  [{ text: "On. ", bold: true }, "Power, gas or the laser's enable line switches on for this member."],
  [{ text: "Watch. ", bold: true }, "Current, sensors and resources are read against the learned normal range."],
  [{ text: "Alert or act. ", bold: true }, "Safety events stop the machine first, then alert the owner; anything else asks the owner to choose."],
  [{ text: "Off and log. ", bold: true }, "Tap out or idle timeout; who, how long and what was used go to the member's record."],
]));
add(P(["Page: ", { link: URL.overview }], { spacing: { before: 120 } }));

const MODULES = [
  ["4.2 Welder module", "welder", "1-welder.png", "Welder module page at the gas leak step: the leak sensor trips, the valve closes and the owner app shows a safety alert.",
    "A box on the wall beside a MIG welder. It unlocks with a member's fob, opens the shielding gas only during a session, weighs the wire used, and closes the gas valve when the leak sensor trips.",
    [[{ text: "NFC fob: ", bold: true }, "Yukonstruct (Rick Yorgason, Oct 27)."], [{ text: "Wire scale: ", bold: true }, "Grey Bruce Makers bills $0.10 per gram and removes and weighs the spool by hand."], [{ text: "Gas valve and leak sensor: ", bold: true }, "HSE EIS45 [Fill in: what we used from it]."]]],
  ["4.3 3D printer module", "printer", "2-printer.png", "3D printer module page at the failed print step: the spool stops losing weight, the job pauses and the member is alerted.",
    "A box on the wall that an FDM printer plugs into. It powers the printer only for trained members, weighs the filament used, pauses a failed print over a USB link, and cuts power when the printer is left heating. The current spike during warm-up is normal and raises no alert.",
    [[{ text: "NFC fob: ", bold: true }, "Yukonstruct (Rick Yorgason, Oct 27)."], [{ text: "Spool scale: ", bold: true }, "University of Regina and Grey Bruce Makers charge $0.10 per gram."], [{ text: "Heating timeout and failed print pause: ", bold: true }, "Alveo3D, nozzles reach 250 °C and up and prints should be checked every 30 minutes."]]],
  ["4.4 Enclosed printer module", "enclosed", "3-enclosed-printer.png", "Enclosed printer module page at the chamber step: the air inside passes the owner's limit, power is cut and the owner is alerted.",
    "The 3D printer box on an enclosed printer, with one more sensor for the air temperature inside the enclosure. If the chamber passes the owner's limit, the box cuts power first and then alerts the owner.",
    [[{ text: "NFC fob, spool scale, heating timeout: ", bold: true }, "as for the 3D printer module (Yukonstruct, University of Regina, Grey Bruce Makers, Alveo3D)."], [{ text: "Chamber sensor: ", bold: true }, "no source yet. [Fill in: evidence or interview finding]"]]],
  ["4.5 Multimaker module", "multimaker", "4-multimaker.png", "Multimaker module page at the CNC step: the current keeps climbing during the cut and the owner gets one alert.",
    "One box for a 3-in-1 machine. After the fob tap the member picks print, laser or CNC on the box. Print mode weighs filament, laser mode stays locked until the exhaust fan draws current and logs laser minutes, and CNC mode logs spindle minutes.",
    [[{ text: "NFC fob: ", bold: true }, "Yukonstruct (Rick Yorgason, Oct 27)."], [{ text: "Exhaust interlock in laser mode: ", bold: true }, "CMU EHS laser guideline, ventilation must be on before operation."], [{ text: "Spool scale in print mode: ", bold: true }, "University of Regina and Grey Bruce Makers."], [{ text: "Spindle minutes: ", bold: true }, "no source yet. [Fill in]"]]],
  ["4.6 Laser cutter module", "laser", "5-laser-cutter.png", "Laser cutter module page at the flame step: the flame sensor pauses the laser and the owner gets a safety alert.",
    "A box beside a CO2 laser with its exhaust fan, chiller and air assist. An interlock relay on the laser's enable line lets it fire only when every check passes.",
    [[{ text: "Exhaust interlock: ", bold: true }, "CMU EHS laser guideline, ventilation must be on before operation."], [{ text: "Pause when the operator taps out: ", bold: true }, "CMU EHS (keep cutters always attended) and VanHack (“zero tolerance” rule for leaving the laser)."], [{ text: "NFC fob: ", bold: true }, "Yukonstruct (Rick Yorgason, Oct 27)."], [{ text: "Air assist and coolant limits: ", bold: true }, "no source yet. [Fill in]"]]],
];
for (const [title, key, img, cap, intro, evidence] of MODULES) {
  const pg = PAGES[key];
  add(H2(title, { pageBreakBefore: true }));
  add(P(intro));
  add(F(img, key === "laser" ? 440 : 500, key === "laser" ? 248 : 281, `${cap} Charts, numbers and alerts are illustrative.`));
  add(LABEL("Parts (Where: in the box, or on the machine)"));
  add(table([560, 2500, 1050, 5296], ["No.", "Part", "Where", "Role"], pg.parts.map(([n, name, role], i) => [n, [{ text: name, bold: true }], pg.sys[i] ? "Machine" : "Box", role]), { run: { size: 22 } }));
  add(LABEL("Behaviour"));
  add(numbered(pg.steps.map(([a, b]) => [{ text: a + " ", bold: true }, b])));
  add(LABEL("Evidence"));
  evidence.forEach((e) => add(bullet(e)));
  add(P(["Page: ", { link: URL[key] }], { spacing: { before: 120 } }));
}

add(H2("4.7 QR machine manual", { pageBreakBefore: true }));
add(F("7-qr-manual-phone.png", 200, 433, "QR machine manual on a phone (Welder 2). Draft text for a prototype."));
add(P("A member scans the QR sticker beside the reader on the box and the manual for that machine opens on their phone. They see:", { keepNext: true }));
add(bullet("a banner: “Draft manual for a prototype. Each makerspace's Tool Champion reviews and approves it.”"));
add(bullet("a switcher with large buttons for Welder 2, 3D printer 4 and Laser 1;"));
add(bullet("a short note on what the PREVUMO box does on that machine, and a “Last checked by: Tool Champion” line;"));
add(bullet("a large red section, “If something goes wrong”, with short and conservative emergency steps;"));
add(bullet("Before you start (checks), Start (numbered) and Shut down (numbered)."));
add(P("The page works without a connection once it has opened. The review date shown on the page is a demo date."));
add(P(["Page: ", { link: URL.manual }]));

add(H2("4.8 Owner app", { pageBreakBefore: true }));
add(P([{ text: "Demo data, illustrative. ", bold: true }, "The owner app shows four machines (Welder 2, 3D printer 4, Laser 1, Multimaker 1) with their status (idle, in use, alert, learning mode), who is on and a live mini chart. Alerts use one format with three buttons, and pressing one logs the decision. Members shows sessions, minutes and resources per member, with a “flagged for review” badge. Resources shows monthly totals, and Manuals lists the QR manuals with their review dates."]));
add(F("8-owner-app.png", 620, 388, "Owner app, Machines. Demo data, illustrative."));
add(F("8b-app-alerts.png", 620, 388, "Owner app, Alerts, with the three buttons and the confirmation for Shut down. Demo data, illustrative."));
add(F("8c-app-members.png", 620, 388, "Owner app, Members, with the “flagged for review” badge. Demo data, illustrative."));
add(P(["Page: ", { link: URL.app }]));

add(H2("4.9 Shared rules"));
add(P("The same rules apply on every module:", { keepNext: true }));
add(bullet([{ text: "NFC fob and trained list. ", bold: true }, "A member taps a fob; the display shows “Tap your fob”, then “Checking fob”, then “Hi” and their name. A fob that is not on that machine's trained list sees “Not trained on this machine” and the machine stays locked."]));
add(bullet([{ text: "QR beside the reader. ", bold: true }, "A printed sticker on the front cover opens that machine's manual."]));
add(bullet([{ text: "Two-week learning mode. ", bold: true }, "The first two weeks only record the normal range, with no automatic shutdown."]));
add(bullet([{ text: "One alert format. ", bold: true }, "Shut down, Call technician or Mark as OK. Safety events (gas leak, fire, no exhaust) stop the machine first, then alert."]));
add(bullet([{ text: "Idle timeout. ", bold: true }, "If nothing happens for the time the owner sets, everything switches off."]));
add(bullet([{ text: "Resources logged per session. ", bold: true }, "Each session logs who, how long and the resource used, and adds it to the member's record."]));

add(H2("4.10 Safety and limits"));
add(P([{ text: "Concept only, not built or tested. ", bold: true }, "A licensed electrician installs switching parts; gas parts reviewed by a licensed gas fitter; CSA certification needed before sale."]));
add(P("Every chart, number and alert in the prototype pages is illustrative, not measured. The pages show how the system would behave; they are not test results."));

// 5. Hypotheses
add(H1("5. Hypotheses to test in the interviews", { pageBreakBefore: true }));
add(table([620, 2860, 3060, 2866], ["No.", "Hypothesis", "How we test it", "What would prove it wrong"], [
  ["H1", "Makerspace owners prefer an NFC fob to a personal code to unlock machines.", "Ask how members unlock machines today, then show the fob step on the Welder page and ask how it would fit their space.", "Owners say a code, key or sign-in sheet works better, or they would not issue fobs."],
  ["H2", "Owners want material used (grams of wire or filament, laser minutes) tracked per member automatically.", "Ask how they track and bill material today, then show the wire scale and the Members tab of the owner app.", "They do not track or bill material per member, or weighing by hand is good enough for them."],
  ["H3", "An automatic gas valve shut-off and leak alert on the welder is worth paying for.", "Ask how gas is handled when the welder is idle and about past leaks, then show the gas leak step and ask what it would be worth to them.", "They report no gas problems, already have a shut-off, or would not pay for it."],
  ["H4", "A heating timeout that cuts power on idle printers solves a real problem.", "Ask what happens when a print ends or fails with nobody there, then show the heating timeout step.", "Printers are always attended or switched off by staff, and they report no incidents."],
  ["H5", "A laser that stays locked until the exhaust runs, and pauses when the operator leaves, matches their safety rules.", "Ask for their laser rules, then compare them with the steps on the Laser page.", "Their rules differ, or they see the lock and the pause as getting in the way."],
  ["H6", "A QR manual on each machine would be used by members and kept up to date by a Tool Champion.", "Ask where members find instructions now and who updates them, then show the QR manual on a phone.", "Members would not scan it, or nobody would take charge of keeping it current."],
  ["H7", "A two-week learning mode before any automatic shutdown makes owners trust the system.", "Ask how they would want a new system to behave in its first weeks, then show the learning mode note.", "They want shutdown from day one, or the learning period does not change their trust."],
], { run: { size: 22 } }));

// 6. Interview plan
const SCRIPT = [
  ["H1, access to machines", ["How do members unlock machines today?", "How do you know a member is trained on a machine before they use it?", "Tell me about a time access to a machine caused a problem."]],
  ["H2, materials", ["How do you track material used?", "How do you charge members for wire, filament or laser time today?", "What takes the most time in that process?"]],
  ["H3, welding gas", ["What happens to the shielding gas when the welder is not in use?", "Tell me about the last time gas was left open or a leak was suspected.", "What do you do today when someone notices a gas smell?"]],
  ["H4, printers left heating", ["What happens when a print ends or fails and nobody is at the printer?", "Tell me about the last time a machine was left on or misused."]],
  ["H5, laser safety", ["What are your rules for running the laser?", "How do you make sure the exhaust and air assist are on before a job?", "What happens when someone walks away from the laser while it runs?"]],
  ["H6, manuals", ["Where do members find instructions for a machine today?", "Who keeps those instructions up to date, and how often?"]],
  ["H7, trust in automatic actions", ["How would you want a new monitoring system to behave in its first weeks?", "What would make you trust, or not trust, a system that can switch a machine off?"]],
  ["Closing", ["What would stop you from installing this?", "Who else should we talk to?"]],
];
add(H1("6. Interview plan", { pageBreakBefore: true }));
add(P("We will interview makerspace owners, managers, Tool Champions and members, in person, by video or by phone. Each interview takes about 30 to 45 minutes. We ask about how things work today first, and only then show the prototype pages that match their machines, so the pages do not steer the answers."));
add(table([3300, 6106], null, [["Number of interviews planned", FILL], ["Dates", FILL], ["Organizations contacted", FILL]], { fillCols: [1] }));
add(LABEL("Interview script"));
add(P("Open, neutral questions, grouped by hypothesis. Follow up with “Tell me more” or “What happened next?”."));
for (const [g, qs] of SCRIPT) { add(P([{ text: g, bold: true }], { keepNext: true, spacing: { before: 120, after: 60 } })); add(numbered(qs)); }

// 7. Interview records
const SHEET = [
  ["Interview number", 480], ["Interviewer (team member)", 480], ["Date", 480], ["Method (in person / video / phone)", 480], ["Organization", 480],
  ["Interviewee name and role (or “anonymous”)", 560], ["Machines they have", 700], ["How they handle access today", 950], ["How they track materials today", 950],
  ["Safety incidents or close calls they mentioned", 1050], ["Reaction to the prototype pages shown (which pages)", 1050], ["Hypotheses supported (H1 to H7)", 480],
  ["Hypotheses contradicted (H1 to H7)", 480], ["Best quote (exact words)", 900], ["Willingness to pay or pilot", 700], ["Follow-up or next step", 650],
];
add(H1("7. Interview records"));
add(P([{ text: "Fill in one sheet per interview. Copy a sheet if you do more than 10.", bold: true }]));
add(P("Every grey cell is for the team to fill in. Write exact words in the quote row, and leave a row empty rather than guess."));
for (let i = 1; i <= 10; i++) {
  add(new Paragraph({ children: [new TextRun({ text: `Interview sheet ${i}`, font: FONT, bold: true, size: 28 })], pageBreakBefore: true, keepNext: true, spacing: { after: 160 } }));
  add(table([3300, 6106], null, SHEET.map(([k]) => [[{ text: k, bold: true }], ""]), { fillCols: [1], heights: SHEET.map(([, h]) => h) }));
}

// 8. Results
add(H1("8. Results", { pageBreakBefore: true }));
add(P("To be completed after the interviews.", { run: { italics: true } }));
add(LABEL("Hypothesis scorecard"));
add(table([1150, 1400, 1600, 1100, 1450, 2706], ["Hypothesis", "Supported", "Contradicted", "Unclear", "Number of interviews", "Key evidence"],
  ["H1", "H2", "H3", "H4", "H5", "H6", "H7"].map((h) => [[{ text: h, bold: true }], "", "", "", "", ""]), { fillCols: [1, 2, 3, 4, 5], heights: [1, 2, 3, 4, 5, 6, 7].map(() => 620), run: { size: 22 } }));
add(LABEL("What we will change for PD B4"));
add(table([700, 8706], null, [1, 2, 3, 4, 5].map((n) => [String(n) + ".", ""]), { fillCols: [1], heights: [1, 2, 3, 4, 5].map(() => 560) }));
add(LABEL("Surprises and new questions"));
add(table([700, 8706], null, [1, 2, 3].map((n) => [String(n) + ".", ""]), { fillCols: [1], heights: [1, 2, 3].map(() => 560) }));

// 9. Next steps
add(H1("9. Next steps (PD B4 validation)"));
add(table([700, 8706], null, [1, 2, 3].map((n) => [String(n) + ".", FILL]), { fillCols: [1], heights: [1, 2, 3].map(() => 560) }));

// 10. References
add(H1("10. References", { pageBreakBefore: true }));
add(P("Sources from section 3, as cited in the PREVUMO brief. Links and access dates are to be completed by the team.", { run: { italics: true } }));
const REFS = [
  "Alveo3D. Guidance on nozzle temperatures (250 °C and up) and checking prints every 30 minutes. [Fill in: link and date accessed]",
  "CMU EHS. Laser cutter guideline: ventilation on before operation, cutters always attended. [Fill in: link and date accessed]",
  "Grey Bruce Makers. Material billing at $0.10 per gram; spools removed and weighed by hand. [Fill in: link or contact and date]",
  "HSE. EIS45. [Fill in: title, link and date accessed]",
  "University of Regina. 3D printing charge of $0.10 per gram. [Fill in: link and date accessed]",
  "VanHack. “Zero tolerance” rule for leaving the laser. [Fill in: link and date accessed]",
  "Yorgason, R. (Yukonstruct). Conversation with Group 10, October 27. Personal communication.",
];
REFS.forEach((r, i) => add(P(`[${i + 1}] ${r}`, { indent: { left: 567, hanging: 567 } })));
add(LABEL("Prototype pages (Group 10, PD B3, interactive web pages)"));
PAGE_LIST.forEach(([n, name, u], i) => add(P([`[${REFS.length + i + 1}] PREVUMO, page ${n}: ${name}. `, { link: u }], { indent: { left: 567, hanging: 567 } })));

// Appendix A
add(H1("Appendix A. Prototype pages", { pageBreakBefore: true }));
add(table([820, 2100, 3080, 3406], ["Page", "Name", "Description", "URL"], PAGE_LIST.map(([n, name, u, d]) => [n, [{ text: name, bold: true }], d, [{ link: u, size: 20 }]])));
add(P("Every chart, number and alert on these pages is illustrative. Concept only, not built or tested.", { spacing: { before: 120 } }));

// Appendix B: the script on one page
add(H1("Appendix B. Interview script", { pageBreakBefore: true }));
add(P("Ask about today first. Show the prototype pages only after the questions for that topic. Do not suggest answers.", { spacing: { after: 80 } }));
let q = 0;
for (const [g, qs] of SCRIPT) {
  add(new Paragraph({ children: [new TextRun({ text: g, font: FONT, bold: true })], keepNext: true, spacing: { before: 80, after: 20 } }));
  qs.forEach((x) => add(new Paragraph({ children: [new TextRun({ text: `${++q}. ${x}`, font: FONT })], indent: { left: 360 }, spacing: { after: 10, line: 252, lineRule: LineRuleType.AUTO } })));
}

// ---------------- document ----------------
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ font: FONT, size: 24, children: ["PREVUMO PD B3, Group 10    Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES] })] })] });
const page = { size: { width: 12240, height: 15840 }, margin: { top: 1417, bottom: 1417, left: 1417, right: 1417, footer: 600 } };
const doc = new Document({
  creator: "PREVUMO Group 10",
  title: "PREVUMO PD B3 Group 10",
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 24 }, paragraph: { spacing: { line: 276, lineRule: LineRuleType.AUTO } } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 32, bold: true, color: "000000" }, paragraph: { spacing: { before: 360, after: 160, line: 276, lineRule: LineRuleType.AUTO }, keepNext: true, keepLines: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 32, bold: true, color: "000000" }, paragraph: { spacing: { before: 280, after: 120, line: 276, lineRule: LineRuleType.AUTO }, keepNext: true, keepLines: true, outlineLevel: 1 } },
    ],
    characterStyles: [{ id: "Hyperlink", name: "Hyperlink", basedOn: "DefaultParagraphFont", run: { color: "1F4E79", underline: {} } }],
  },
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 340 } }, run: { font: FONT } } }] },
    { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 400 } }, run: { font: FONT } } }] },
  ] },
  sections: [
    { properties: { page, titlePage: true }, footers: { default: footer, first: new Footer({ children: [new Paragraph({ children: [] })] }) }, children: [...cover, new Paragraph({ children: [new PageBreak()] }), ...toc, ...body] },
  ],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(path.join(HERE, "build", "draft.docx"), buf); console.log("wrote build/draft.docx", (buf.length / 1024).toFixed(0), "KB"); });
