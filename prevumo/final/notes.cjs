// Speaker notes for the final presentation, word for word. Times are computed from the words at 120 a minute,
// plus 2 s for each hand off and click, so the plan adds up to under 5:00. The films play by themselves.
const WPM = 120;
const SLIDES = [
  { key: "s1", who: "A", say: `Hi, we're Group 10. This is PREVUMO: preventive boxes for makerspaces, one for each common machine, so every machine runs safely and lasts longer. Here's where we started, and where we're going.`,
    cue: `click on "where we're going".` },
  { key: "s2", who: "A", say: `We started with a box that measured electricity, so shared spaces could bill each user. Kitchens and cafés said no: the owners we asked build electricity into rent. Makerspaces said yes: "Managing equipment is one of the biggest tasks we have." Thirty conversations later, makerspaces are our only customer.`,
    handoff: `A: B, why does it matter?` },
  { key: "s3", who: "B", say: `Every machine breaks, and gets misused, in its own way: a welder's gas left open, a printer nozzle left hot, a laser left alone. And it costs: owners told us about an extraction failure, seven hundred dollars and two days lost, and a spindle repair, eighteen hundred dollars and four days. So each machine gets its own module.`,
    cue: `click on "its own module". The film starts by itself.` },
  { key: "s4", who: "B", film: "The film (about 30 s, no sound) plays by itself; the words follow it: pieces, locked out, power and gas, oxygen, then the other modules.", say: `Every box has a fob reader, a display, a QR sticker and Wi-Fi. An untrained member stays locked out. A trained one gets power and gas, and a scale weighs the wire. If oxygen drops by the cylinder, the valve shuts first. [pause] The printers, the multimaker and the laser get the same box, with their own sensors.`,
    handoff: `B: C, and the owner?` },
  { key: "s5", who: "C", film: "The film (about 28 s, no sound) plays by itself; the words follow it: machines, alerts, members, the manual on a phone.", say: `The owner runs it all from one app. When something looks wrong, there's one alert. A safety event, like low oxygen, has already stopped the machine; anything else gets three choices: shut down, call a technician, or mark OK. Every member's grams and minutes are logged, and the QR on each box opens its manual.`,
    cue: `click on "opens its manual".` },
  { key: "s6", who: "C", say: `Underneath is one idea: every machine draws current in its own pattern, warming up, cutting, or idle. PREVUMO learns each machine's normal and flags what doesn't fit. Nothing is measured yet; the pilot is how it learns.`,
    cue: `click on "how it learns".` },
  { key: "s7", who: "C", say: `Owners told us what they need: maintenance records and alerts, a fob that checks training at the machine, and material tracked per member. And what they prefer: proof first. One makerspace accepted a free thirty day pilot; three more would try one after a safety review. Their boards want a monthly report of repairs avoided.`,
    note: `If asked which spaces: MakerLabs accepted a free 30 day pilot (PD B4); Ironwood, Maple Junction and NIHERST would try one after a safety review (PD B4 and B5). Nothing is signed or paid.`,
    handoff: `C: D, how big is this?` },
  { key: "s8", who: "D", say: `Our market: two thousand and thirty two active Fab Labs, doubling roughly every two years, and about three thousand three hundred makerspaces worldwide. Our plan targets twenty three US makerspaces in three years: five percent of the four hundred and sixty in Make's directory.`,
    cue: `click on "fabrication shops".` },
  { key: "s9", who: "D", say: `Each space buys a pack of four modules: five hundred and seventy five dollars to install, seventy three fifty a month for two years, and forty dollars a month for the app. A pack costs us about eighteen hundred dollars and earns thirty seven hundred over three years: a fifty two percent margin, paid back in month eleven.`,
    note: `All prices are US dollars from GA5, and no owner has agreed to them yet. If asked: $575 covers an electrician and a gas fitter (about $565 per pack); two of three boards we asked prefer a one time purchase, so we will test one.`,
    handoff: `D: E, how do we pay for it?` },
  { key: "s10", who: "E", say: `We lose money for two years and profit in year three, so we need about twenty three thousand dollars: Startup Garage, then NRC IRAP and a Futurpreneur loan once we incorporate. The limits: the price is untested, boards prefer one time purchases, and certification costs about eight thousand. Next: build and bench test one module, then the pilot.`,
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

  a3: `APPENDIX, for questions. The numbers behind the plan (GA5 Financial Snapshot, US dollars).

Price, for a pack of 4 modules (one space): $575 installation, then $73.50 a month for 24 months for the modules ($441 each), plus $40 a month for the service, after a free 30 day pilot. Year 1: $1,937 per pack; three years: $3,779.
Cost per pack: parts $1,160 (welder module about $297, the others about $290, priced from Adafruit, SparkFun, Digi-Key, RobotShop and U.S. Solid) + installation $565 (an electrician and a gas fitter) + shipping $13 + warranty $58 = $1,796. Margin over three years about 52%; payback in month 11.
One time: certification about $8,000 (a real quote is still needed) and incorporation $235. Fixed yearly: insurance $1,080, hosting $240, domain $20, bookkeeping $864.
Plan: 6, 8 and 9 packs in years 1 to 3, 23 spaces, 5% of the 460 US makerspaces in Make's directory. Year 1 loss $19,589, year 2 loss $1,902, year 3 profit $4,968. Lowest cash about minus $23,300: that is the funding need. Low case: still a loss in year 3 ($594). High case: $10,159 in year 3.
Limits to say plainly: no salaries for three years (sweat equity), the price is untested, and parts and labour are paid at installation while customers pay over 24 months.`,

  a4: `APPENDIX, for questions. Learning and false alerts.

"How does it tell a failing welder from a thicker plate?" Today it can't, and we say so. A thicker plate needs more current, so we only compare like with like: same settings, entered or read from the machine. What current tells reliably: on or off, idle draw with nobody working, and a warm up shape. Anything else is a review for the owner, never an automatic shutdown, until pilot data shows it works.
Today the design learns over its first two weeks; the next version should count sessions and hours per mode, not just days, and a technician check at install sets a known good start. Learning never switches off a safety trip.
The pilot metric: false alerts per machine per month, with the owner labelling each one.`,

  a5: `APPENDIX, for questions. Evidence so far, and what is still untested.

Three rounds, about thirty conversations: GA3 (10 interviews, 49 emails), PD B4 (8 written replies and 2 interviews with owners) and PD B5 (10 interviews: two site managers, three decision makers, a treasurer, an electrician, a gas fitter, a repair technician and a Tool Champion).
What changed the design: owners bundle electricity into rent (billing dropped); cafés weren't interested (makerspaces only); Yukonstruct asked for an NFC fob (keypad dropped); maintenance records came up unprompted (service alerts first); both owners interviewed had found a regulator left open (the fob timed valve); a gas fitter and Edinburgh Hacklab warned that a leak sensor on a TIG welder would give false alarms (an idle flow check instead); cloud control was challenged (a local server study); installation costs about $565 a pack (the fee went from $300 to $575).
Untested: whether owners will pay this price, the false alert rate, and every safety function on real hardware.`,

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
