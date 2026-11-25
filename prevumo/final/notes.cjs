// Speaker notes for the final presentation, word for word, at about 130 words a minute (5:00 in all).
// Five speakers, A to E, one hand off each. The films play by themselves; nobody talks over a title card.
const WHO = "Speakers: A, B, C, D, E. Write the names in at the first rehearsal.";

module.exports = {
  s1: `A · 0:00 to 0:15 · about 35 words
${WHO}

Hi, we're Group 10, and this is PREVUMO: a series of preventive boxes for makerspaces, one for each type of machine, so every machine runs safely and lasts longer. Here's where we started, where we are, and where we go next.

CUE: click on "where we started".`,

  s2: `A · 0:15 to 0:50 · about 70 words

We started with a box that measured electricity, so shared spaces could bill each user. We took it to shared kitchens, restaurants, cafés and makerspaces. Ten interviews and forty nine emails later, two things were clear: every owner we asked builds electricity into rent, and cafés weren't interested. Makerspaces were. An Ontario makerspace director told us: "Managing equipment is one of the biggest tasks we have." So we kept one customer.

HAND OFF (A): B, what did we find inside the makerspace?
CUE: B clicks.`,

  s3: `B · 0:50 to 1:20 · about 60 words

Inside makerspaces we found the real problem: every machine breaks, and gets misused, in its own way. A welder's shielding gas gets left open. A 3D printer's nozzle stays above two hundred degrees after a failed print. A laser cutter catches fire when someone walks away. So we studied the most common machines one by one, and gave each its own module.

CUE: click on "its own module". The film starts by itself.`,

  s4: `B · 1:20 to 2:05 · about 85 words. The film plays by itself, no sound.

This is the welder module. Every box shares one core: an NFC reader for the member's fob, a display, a QR sticker that opens the machine's manual, and a controller on Wi-Fi. A member who isn't trained on this welder stays locked out. During a session the gas valve opens and a scale weighs the wire used, while an oxygen sensor by the cylinder watches day and night. The other four modules are the same box with their own sensors: spool scales, exhaust and air checks, flame and coolant.

HAND OFF (B): C, and the owner?
CUE: C clicks.`,

  s5: `C · 2:05 to 2:40 · about 70 words. The film plays by itself, no sound.

The owner runs it all from one app: every machine, who is on it, and what they used, in grams of filament or wire, or laser minutes. When something looks wrong, there is one alert with three choices: shut it down, call a technician, or mark it OK. Safety events, like low oxygen or a flame, stop the machine first. And members scan the QR code on any box to open its manual on their phone.

CUE: click on "on their phone".`,

  s6: `C · 2:40 to 3:15 · about 75 words

Underneath is one simple idea. Every machine draws electricity in its own pattern: a printer warming up, a laser cutting, a machine left on with nobody working. PREVUMO learns each machine's normal range and flags what doesn't fit. To be clear, nothing here is measured yet; every chart is illustrative. Makerspaces and Fab Labs we spoke with were open to trying it for free, and that pilot data is what will teach it a real problem from a false alarm.

If asked which spaces: name them only if the team has their names and emails. Otherwise: "Interest so far, nothing signed. Turning that into one to three written pilots is our next step."

HAND OFF (C): D, so who pays for this?
CUE: D clicks.`,

  s7: `D · 3:15 to 3:50 · about 75 words

Our customer is whoever runs the makerspace: a university, a community space or a Fab Lab. They get three things: machines from a seventeen hundred dollar welder to an eight thousand dollar laser stay protected, members stay safe, and materials are charged fairly, because spaces like the University of Regina already bill ten cents a gram. Tools like Fabman already handle access and idle shutoff; PREVUMO adds the sensors made for each machine, and works beside them. No sponsors yet: we're looking for a first host site.

CUE: click on "first host site".`,

  s8: `D · 3:50 to 4:15 · about 55 words

Our first market is one we can count: more than two thousand active Fab Labs worldwide, twenty nine of them in Canada, and more than two thousand makerspaces and Fab Labs in the US. Almost every Fab Lab lists a laser cutter. We start in Canadian makerspaces, then campus and college shops, then small fabrication shops running the same machines.

HAND OFF (D): E, what happens next?
CUE: E clicks.`,

  s9: `E · 4:15 to 4:40 · about 45 words

Next, we bench test the printer and laser boxes. Then a four week free pilot that only watches, with the owner labelling every alert. If they keep it on after learning, we've earned the right to switch machines off. Approval comes first, and the welder comes last.

CUE: click on "the welder comes last".`,

  s10: `E · 4:40 to 4:50 · about 20 words

Every machine fails its own way.
[pause]
PREVUMO gives each one its own guard.
[pause]
Thank you, we'd love your questions.

The QR opens prevumo.vercel.app: every prototype, live. Leave this slide up during questions; jump to the appendix slides only when a question needs one.`,

  a1: `APPENDIX, for questions. Safety and fail safe.

Short answer: no power or a frozen controller means everything off and closed, and nothing restarts on its own.
Fuller: every output is wired so that losing power opens it: the contactor opens, the gas valve closes, the laser's enable line opens, the printer relay opens. A hardware watchdog drops every output if the firmware stops answering. Trained lists and safety trips live on the box, so they work with no Wi-Fi; sessions and alerts queue until it is back. Safety stops (low oxygen, a lasting flame, no exhaust, no coolant) are reset at the machine, never from a phone.
Approval: in Ontario a product must be approved before it is used, not only before it is sold (ESA). So the first pilot only watches and switches nothing, and a licensed electrician installs anything that does.
Honest limit: none of this is built or tested yet; the bench test plan is the next slide in the appendix.`,

  a2: `APPENDIX, for questions. What already exists.

"Why not Fabman?" Fabman is good at access: card readers, trained lists, booking, billing, and its Bridge can switch an idle machine off from its power reading, for €249 plus €49 to €199 a month and €10 to €14 per machine. It does not watch a welder's gas or wire, or a laser's airflow, coolant and flame, as far as we found. Fabman has an open API, so PREVUMO can sit next to it: their card, our machine sensors.
"Why not printer software?" Obico and similar tools catch failed prints with a camera for free up to a few dollars a printer. For printers we should be priced close to that, and read what the printer already reports. Our value is the machines software can't see: welders and lasers.
Say "as far as we found": we have not tested every product.`,

  a3: `APPENDIX, for questions. Pricing and the market, as assumptions.

Pricing is not validated. Our first round assumption was a $300 box and $25 per machine per month; the critics were right that a flat price doesn't work for printers, which software monitors for a few dollars. So: printers near software prices, the premium on lasers and welders, where the box adds interlocks, gas control and fire sensing.
Market arithmetic, as an estimate: about 2,000 US makerspaces and Fab Labs, times about 5 monitored machines, times $300 a year, is about $3 million a year. That is small, which is why makerspaces are where we prove it, not where we stop: campus and college shops and small fabrication shops run the same machines.`,

  a4: `APPENDIX, for questions. Learning and false alerts.

"How does it tell a failing welder from a thicker plate?" Today it can't, and we say so. A thicker plate needs more current, so we only compare like with like: same settings, entered or read from the machine. What current tells reliably: on or off, idle draw with nobody working, and a warm up shape. Anything else is a review for the owner, never an automatic shutdown, until pilot data shows it works.
Learning counts sessions and hours per mode, not just days, and a technician check at install sets a known good start. Learning never switches off a safety trip.
The pilot metric: false alerts per machine per month, with the owner labelling each one.`,

  a5: `APPENDIX, for questions. Evidence so far, and what is still untested.

What changed the design: owners bundle electricity into rent (billing dropped); cafés weren't interested (makerspaces only); Yukonstruct asked for an NFC fob instead of a code (keypad dropped); spaces bill material by the gram (scales); laser rules require ventilation and attendance (interlocks, the 15 minute tap).
Untested: whether owners will pay, the false alert rate, and every safety function on real hardware. Our PD B3 interview sheets are still to be filled in; say that plainly if asked.`,

  a6: `APPENDIX, for questions. The bench test plan, each test with what it proves.

1 Fail safe: cut power and halt the firmware 50 times per box; every output goes safe and stays off.
2 Current accuracy: the box against a true RMS meter on a printer, a fan and a MIG welder, with Wi-Fi on.
3 Welding noise: a day beside a welding bench, counting resets and fob misreads.
4 Gas: the oxygen sensor on a controlled argon release in a closed test box, with a gas fitter.
5 Printers: pause command, scale noise, a staged detachment and a clog, on two models.
6 Laser, watch only: duct open and blocked, pump off, the flame sensor over 20 normal cuts.
7 Watch only pilot: four weeks, the owner labels every alert; false alerts per machine per month.`,

  a7: `APPENDIX. Sources for every number in the deck, with the exact words, are in FACTS.md in the project folder. Prices for PREVUMO are assumptions to validate.`,
};
