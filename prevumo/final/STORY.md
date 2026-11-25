# Loop 2: the 5 minute story

## The one sentence

PREVUMO is a box for each machine type in a makerspace: it lets only trained members run the machine, stops it when that machine's known hazard appears, logs who used what, and learns each machine's normal electricity use.

## The arc (Wahb's order, tightened by the critics)

1. **This is PREVUMO.** Group 10, one line on what it is.
2. **Where we started.** Electricity sharing, then kitchens, cafés and makerspaces, then makerspaces only. One slide, three turns, the owner evidence behind each.
3. **Where we are.**
   * Every machine fails its own way, so each machine type gets its own module.
   * The hardware prototypes, as a film from the site.
   * The software prototype, as a film from the site.
   * The idea underneath: every machine has its own electrical signature.
   * Said aloud: nothing is measured yet.
4. **The next step.** Free pilots that only watch, so real data teaches it what normal looks like. Bench tests, then approval.
5. **Value, customers, sponsors.** Who runs a makerspace, what they get, what already exists (Fabman, printer software) and where we sit next to it. No sponsors yet, and what we ask for.
6. **The market and where we go.** Verified counts of makerspaces and Fab Labs, then the path from Canadian makerspaces to campus shops to small fabrication shops.
7. **The close.** "Every machine fails its own way. PREVUMO gives each one its own guard."

## Slides and word budget

The budget is 5:00 at 130 words a minute, so about 630 spoken words. Five speakers, A to E, give one hand off each. The films play while the speaker talks, with no sound.

| # | Time | Speaker | Title on the slide | What is on it | Words |
| --- | --- | --- | --- | --- | --- |
| 1 | 0:00 | A | PREVUMO | Dark title, heartbeat line, the one line promise, team names | 40 |
| 2 | 0:20 | A | Where we started | Three stops on one line: share electricity, kitchens and cafés and makerspaces, makerspaces only; under each, what an owner told us | 85 |
| 3 | 1:00 | B | Every machine fails its own way | Four machines, two or three real failure modes each; one line: one box, different sensors | 70 |
| 4 | 1:35 | B | Hardware prototypes | Film from /hardware: the welder module in depth, then the other four; the five modules named with their own sensors | 95 |
| 5 | 2:20 | C | Software prototype | Film from /software: owner app (machines, one alert with three choices, members and materials) and the QR manual on a phone | 70 |
| 6 | 2:55 | C | Every machine has its own electrical signature | The heartbeat motif labelled: warm up is normal, on with nobody working, irregular; a strip saying nothing is measured yet and the free pilot plan | 75 |
| 7 | 3:30 | D | Who it's for, and what they get | Customers (university, community, Fab Lab), value (machine, members, materials), next to what exists (Fabman, printer software), sponsors: none yet | 75 |
| 8 | 4:05 | D | Where we go | Verified counts, the expansion path | 55 |
| 9 | 4:30 | E | What we do next | Bench test, four week watch only pilot with a pass rule, approval, welder last | 45 |
| 10 | 4:50 | E | (closing line) | Dark close, the line, Thank you, questions, QR to prevumo.vercel.app | 20 |

## Draft script (superseded: the final words and timings live in `notes.cjs`, loop 8)

**1, A.** Hi, we're Group 10, and this is PREVUMO: a series of preventive boxes for makerspaces, one for each type of machine, so every machine runs safely and lasts longer. Here's where we started, where we are, and where we go next.

**2, A.** We started with a box that measured electricity, so shared spaces could bill each user. We took it to shared kitchens, restaurants, cafés and makerspaces. Ten interviews and forty nine emails later, two things were clear: every owner we asked builds electricity into rent, and cafés weren't interested. Makerspaces were. An Ontario makerspace director told us: "Managing equipment is one of the biggest tasks we have." So we kept one customer.

**3, B.** Inside makerspaces we found the real problem: every machine breaks, and gets misused, in its own way. A welder's shielding gas gets left open. A 3D printer's nozzle stays above two hundred degrees after a failed print. A laser cutter catches fire when someone walks away. So we studied the most common machines one by one, and gave each its own module.

**4, B.** This is the welder module. Every box shares one core: an NFC reader for the member's fob, a display, a QR sticker that opens the machine's manual, and a controller on Wi-Fi. A member who isn't trained on this welder stays locked out. During a session the gas valve opens and a scale weighs the wire used, while an oxygen sensor by the cylinder watches day and night. The other four modules are the same box with their own sensors: spool scales, exhaust and air checks, flame and coolant.

**5, C.** The owner runs it all from one app: every machine, who is on it, and what they used, in grams of filament or wire, or laser minutes. When something looks wrong, there is one alert with three choices: shut it down, call a technician, or mark it OK. Safety events, like low oxygen or a flame, stop the machine first. And members scan the QR code on any box to open its manual on their phone.

**6, C.** Underneath is one simple idea. Every machine draws electricity in its own pattern: a printer warming up, a laser cutting, a machine left on with nobody working. PREVUMO learns each machine's normal range and flags what doesn't fit. To be clear, nothing here is measured yet; every chart is illustrative. Makerspaces and Fab Labs we spoke with were open to trying it for free, and that pilot data is what will teach it a real problem from a false alarm.

**7, D.** Our customer is whoever runs the makerspace: a university, a community space or a Fab Lab. They get three things: machines from a seventeen hundred dollar welder to an eight thousand dollar laser stay protected, members stay safe, and materials are charged fairly, because spaces like the University of Regina already bill ten cents a gram. Tools like Fabman already handle access and idle shutoff; PREVUMO adds the sensors made for each machine, and works beside them. No sponsors yet: we're looking for a first host site.

**8, D.** Our first market is one we can count: more than two thousand active Fab Labs worldwide, twenty nine of them in Canada, and more than two thousand makerspaces and Fab Labs in the US. Almost every Fab Lab lists a laser cutter. We start in Canadian makerspaces, then campus and college shops, then small fabrication shops running the same machines.

**9, E.** Next, we bench test the printer and laser boxes. Then a four week free pilot that only watches, with the owner labelling every alert. If they keep it on after learning, we've earned the right to switch machines off. Approval comes first, and the welder comes last.

**10, E.** Every machine fails its own way. PREVUMO gives each one its own guard. Thank you, we'd love your questions.

Words: 632, about 4:52 at 130 words a minute, leaving a few seconds for the films and the hand offs.

## Numbers

Every number is checked in `FACTS.md`, with its source and the exact words.

## Films (loop 6)

1. **Hardware, about 40 s, on slide 4.**
   * The welder page on prevumo.vercel.app: assembled, in pieces, on the welder, the fob step, then the oxygen step.
   * Then about 4 s on each of the other four modules at their most telling moment: printer warm up, enclosed chamber, multimaker modes, laser exhaust.
2. **Software, about 30 s, on slide 5.** The owner app: machines, an alert with three choices, a member's materials. Then the QR manual on a phone frame.
3. **Optional, about 10 s, on slide 6.** The printer page's current chart with the warm up marked normal.

## Appendix for questions (loop 10)

1. **Safety:** what every output does on power loss, a frozen controller or no Wi-Fi; approval before any use.
2. **What already exists:** Fabman, printer software, energy monitors, and where PREVUMO sits.
3. **Pricing by risk,** with the bottom up market arithmetic, all labelled as assumptions.
4. **Learning and false alerts:** what current can and cannot tell; flags are reviews until validated.
5. **Evidence so far:** what owners told us, and what is still untested.
6. **The bench test plan:** seven tests, each with what it proves.
7. **Sources.**
