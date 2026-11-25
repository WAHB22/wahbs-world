// Speaker notes for the final presentation, word for word. Times are computed from the words at 120 a minute,
// plus 2 s for each hand off and click, so the plan adds up to under 5:00. The films play by themselves.
const WPM = 120;
const SLIDES = [
  { key: "s1", who: "A", say: `Hi, we're Group 10. This is PREVUMO: preventive boxes for makerspaces, one for each common machine, so every machine runs safely and lasts longer. Here's where we started, and where we're going.`,
    cue: `click on "where we're going".` },
  { key: "s2", who: "A", say: `We started with a box that measured electricity, so shared spaces could bill each user. Ten interviews and forty nine emails later, kitchens and cafés said no: the three owners we asked build electricity into rent. But a makerspace director told us: "Managing equipment is one of the biggest tasks we have." So we kept one customer.`,
    handoff: `A: B, why does it matter?` },
  { key: "s3", who: "B", say: `Safety rules show the real problem: every machine breaks, and gets misused, in its own way. A welder's gas left open. A printer nozzle above two hundred degrees after a failed print. A laser fire when someone walks away. So each common machine gets its own module.`,
    cue: `click on "its own module". The film starts by itself.` },
  { key: "s4", who: "B", film: "The film (about 30 s, no sound) plays by itself; the words follow it: pieces, locked out, power and gas, oxygen, then the other modules.", say: `Every box has a fob reader, a display, a QR sticker and Wi-Fi. An untrained member stays locked out. A trained one gets power and gas, and a scale weighs the wire. If oxygen drops by the cylinder, the valve shuts first. [pause] The printers, the multimaker and the laser get the same box, with their own sensors.`,
    handoff: `B: C, and the owner?` },
  { key: "s5", who: "C", film: "The film (about 28 s, no sound) plays by itself; the words follow it: machines, alerts, members, the manual on a phone.", say: `The owner runs it all from one app. When something looks wrong, there's one alert. A safety event, like low oxygen, has already stopped the machine; anything else gets three choices: shut down, call a technician, or mark OK. Every member's grams and minutes are logged, and the QR on each box opens its manual.`,
    cue: `click on "opens its manual".` },
  { key: "s6", who: "C", say: `Underneath is one idea: every machine draws current in its own pattern, warming up, cutting, or idle. PREVUMO learns each machine's normal and flags what doesn't fit. Nothing is measured yet; the pilot is how it learns.`,
    cue: `click on "how it learns".` },
  { key: "s7", who: "C", say: `Our customer runs the space: a university, community makerspace, Fab Lab or library. They told us what they need: one place to manage equipment, an NFC fob instead of a code, and material billed by the gram. All three are built in. And they were open to a free pilot.`,
    note: `If asked which spaces: name them only if the team has their names and emails. Otherwise: "Interest so far, nothing signed. Turning that into one to three written pilots is our next step."`,
    handoff: `C: D, how big is this?` },
  { key: "s8", who: "D", say: `Our market: two thousand and thirty two active Fab Labs, twenty nine in Canada, and over two thousand makerspaces and Fab Labs in the US. Nine in ten list a laser cutter, and Fab Labs have doubled roughly every two years. We start in Canadian makerspaces, then campus and fabrication shops.`,
    cue: `click on "fabrication shops".` },
  { key: "s9", who: "D", say: `Two revenue streams: a box per machine, sold once, and a monthly fee per machine for the app and alerts. Price follows risk: printers near what print monitoring software costs, the premium on lasers and welders. We start with a free pilot, convert it to paid, and connect to Fabman's open API rather than compete. First guess: a three hundred dollar box plus twenty five dollars a month, six hundred dollars a machine in year one.`,
    note: `Say "first guess" clearly: the prices are GA3 assumptions, not validated. If asked about margin: we have not costed the parts yet (Q24).`,
    handoff: `D: E, how do we pay for it?` },
  { key: "s10", who: "E", say: `Funding: uOttawa's Startup Garage for prizes and grants, then NRC IRAP and a Futurpreneur loan once we incorporate. Our limits: no revenue yet, every pilot box needs approval before use, and welders need an electrician and a gas fitter. So next: bench tests, approval, a watch only pilot, and the welder last.`,
    cue: `click on "the welder last".` },
  { key: "s11", who: "E", say: `Every machine fails its own way. [pause] PREVUMO gives each one its own guard. [pause] Thank you, we'd love your questions.`,
    note: `The QR opens prevumo.vercel.app: every prototype, online; the summary video is at prevumo.vercel.app/video. Leave this slide up during questions; jump to an appendix slide only when a question needs one.` },
];
const words = (t) => t.replace(/\[pause\]/g, "").split(/\s+/).filter(Boolean).length;
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
let t = 0;
const out = {};
for (const sl of SLIDES) {
  const w = words(sl.say), d = (w / WPM) * 60 + (sl.handoff || sl.cue ? 2 : 0);
  sl.words = w; sl.from = t; sl.to = t + d; t += d;
  out[sl.key] = [
    `${sl.who} · ${clock(sl.from)} to ${clock(sl.to)} · ${w} words${sl.film ? ` · ${sl.film}` : ""}`,
    sl.key === "s1" ? "Speakers: A, B, C, D, E. Write the names in at the first rehearsal." : null,
    "",
    sl.say.replace(/ ?\[pause\] ?/g, "\n[pause]\n"),
    sl.note ? `\n${sl.note}` : null,
    sl.handoff ? `\nHAND OFF (${sl.handoff.split(":")[0]}):${sl.handoff.slice(sl.handoff.indexOf(":") + 1)}\nCUE: the next speaker clicks.` : null,
    sl.cue ? `\nCUE: ${sl.cue}` : null,
  ].filter((x) => x !== null).join("\n");
}
module.exports = {
  SLIDES, TOTAL: t,
  ...out,
  a1: `APPENDIX, for questions. Safety and fail safe.

Short answer: no power or a frozen controller means everything off and closed, and nothing restarts on its own.
Fuller: every output is wired so that losing power opens it: the contactor opens, the gas valve closes, the laser's enable line opens, the printer relay opens. A hardware watchdog drops every output if the firmware stops answering. Trained lists and safety trips live on the box, so they work with no Wi-Fi; sessions and alerts queue until it is back. Safety stops (low oxygen, a lasting flame, no exhaust, no coolant, an overheating enclosure) are reset at the machine, never from a phone.
Approval: in Ontario a product must be approved before it is used, not only before it is sold (ESA). So every pilot box is field evaluated by ESA, or certified, before it is installed; approved parts make that easier. The first pilot only watches and switches nothing, and a licensed electrician installs anything that does.
Honest limit: none of this is built or tested yet; the bench test plan is the next slide in the appendix.`,

  a2: `APPENDIX, for questions. What already exists.

"Why not Fabman?" Fabman is good at access: card readers, trained lists, booking, billing, and its Bridge can switch an idle machine off from its power reading, for €249 plus €49 to €199 a month and €10 to €14 per machine. It does not watch a welder's gas or wire, or a laser's airflow, coolant and flame, as far as we found. Fabman has an open API, so PREVUMO can sit next to it: their card, our machine sensors.
"Why not printer software?" Obico and similar tools catch failed prints with a camera for free up to a few dollars a printer. For printers we should be priced close to that, and read what the printer already reports. Our value is the machines software can't see: welders and lasers.
Say "as far as we found": we have not tested every product.`,

  a3: `APPENDIX, for questions. Pricing and the market, as assumptions.

Pricing is not validated. Our first round assumption was a US$300 box and US$25 per machine per month; the critics were right that a flat price doesn't work for printers, which software monitors for a few dollars. So: printers near software prices, the premium on lasers and welders, where the box adds interlocks, gas control and fire sensing.
Market arithmetic, as an estimate: about 2,000 US makerspaces and Fab Labs, times about 5 monitored machines, times US$300 a year (the flat price, so an upper bound), is at most about US$3 million a year. The US is the only verified count; Canada has 29 active Fab Labs. That is small, which is why makerspaces are where we prove it, not where we stop: campus and college shops and small fabrication shops run the same machines.`,

  a4: `APPENDIX, for questions. Learning and false alerts.

"How does it tell a failing welder from a thicker plate?" Today it can't, and we say so. A thicker plate needs more current, so we only compare like with like: same settings, entered or read from the machine. What current tells reliably: on or off, idle draw with nobody working, and a warm up shape. Anything else is a review for the owner, never an automatic shutdown, until pilot data shows it works.
Today the design learns over its first two weeks; the next version should count sessions and hours per mode, not just days, and a technician check at install sets a known good start. Learning never switches off a safety trip.
The pilot metric: false alerts per machine per month, with the owner labelling each one.`,

  a5: `APPENDIX, for questions. Evidence so far, and what is still untested.

What changed the design: owners bundle electricity into rent (billing dropped); cafés weren't interested (makerspaces only); Yukonstruct asked for an NFC fob instead of a code (keypad dropped); spaces bill material by the gram (scales); CMU and MIT laser rules require ventilation and attendance (the airflow interlock; the 15 minute tap is our own design choice); an argon or CO2 leak has no smell (CCOHS), so the gas sensor became an oxygen sensor.
Untested: whether owners will pay, the false alert rate, and every safety function on real hardware. Our PD B3 interview sheets are still to be filled in; say that plainly if asked.`,

  a6: `APPENDIX, for questions. The bench test plan, each test with its pass rule, written before it starts.

1 Fail safe: cut power and halt the firmware 50 times per box. Pass: every output safe, 50 times out of 50.
2 Current: a real printer's power trace, and the box against a true RMS meter, with Wi-Fi on. Pass: within 5% of the meter.
3 Printers: pause command, scale noise, a staged detachment and a clog, on two models. Pass: pauses on every staged failure, none in 10 good prints.
4 Laser, watch only: duct open and blocked, pump off, the flame sensor over 20 normal cuts. Pass: every blocked duct caught, no false trip in 20 cuts.
5 Watch only pilot: four weeks, the owner labels every alert. Pass: the owner keeps it on, and false alerts stay under the limit set first.
6 Welding noise, later: a day beside a welding bench. Pass: no resets, no fob misreads.
7 Gas, later: the oxygen sensor on a controlled argon release in a closed test box, with a gas fitter. Pass: the alarm at 19.5% oxygen, every time.
The targets are ours; say so if asked. The welder tests come after the pilot, as slide 10 says.`,

  a7: `APPENDIX. Sources for every number in the deck, with the exact words, are in FACTS.md in the project folder. Prices for PREVUMO are assumptions to validate.`,
};
