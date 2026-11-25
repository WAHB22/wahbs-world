# PREVUMO final: the panel's questions

P professor, I industry engineer (runs a makerspace), S startup coach, C classmate. Questions written cold; verdicts added after QA.md, the appendix, FACTS.md and CRITIQUE.md.

## The 15 questions, in order

**1. P: "Before anything else: what physically exists? Did you build or power on a single box, sensor or circuit this term?"**
Probing: engineering beyond drawings, in an engineering design final.
WEAK. QA 1 says "nothing is built" and stops. Next: "You never plugged a printer into a power meter?" Better: "Nothing is built or powered. We engineered the design: sensor placement, fail safe rules, and tests with pass rules written first. The cheapest test of our core idea is one real printer power trace; that's our first step." Better still, take that trace before Friday.

**2. I: "MIG welders already have a gas solenoid that opens only on the trigger. Where's your valve, and which leak does it stop that theirs doesn't?"**
Probing: do they understand the machine they guard.
WEAK. QA 9 never mentions the welder's own solenoid, and claims "the box reminds the owner", which no page shows. Better: "Right, the welder's solenoid already stops flow between trigger pulls. Ours only adds protection for the hose when nobody is signed in. It can't stop a leak at the cylinder or regulator, so the oxygen sensor and 'close the cylinder valve' in the manual matter more."

**3. I: "Your app says 'Priya Nair was on' when the oxygen dropped. She's the one at risk. What warns her in the room, and what watches the oxygen when the box has no power?"**
Probing: safety for the person at the machine.
MISSING. The welder's twelve parts include no sounder, and the box "runs from the welder's line", so "watched day and night" needs that circuit live. Honest: "Today it's the display, the light and the owner's phone. That isn't enough for the person in the room. A loud local alarm and backup power for the oxygen sensor belong in the design; neither is designed yet."

**4. P: "Current rises on thicker plate. How do you tell a failing welder from someone welding thicker steel?"**
Probing: their own detection method.
GOOD. QA 15 and slide 14: "Today it can't"; same settings only; a review, never a shutdown.

**5. I: "A CO2 laser cutting plywood flares on most cuts. How does your flame sensor tell a flare from a fire?"**
Probing: false alarms on a module they pilot first.
WEAK. The pieces exist but aren't rehearsed. Say: "Only a flame that lasts pauses it, and we don't know the right duration yet. Bench test 6 runs the sensor over twenty normal cuts and counts false trips. Until then the laser box only watches."

**6. P: "Ten interviews, forty nine emails. How many of the ten were makerspaces, how many emails got replies, and did any owner tell you a leak or laser fire actually happened?"**
Probing: do slide 3's problems come from customers or the team.
WEAK. FACTS gives no split. "Every owner we asked" (slide 2) is three owners, one a makerspace. Slide 3's sources prove hazards, not incidents. Count before Friday. If no owner described an incident: "The hazards come from published rules; the pilot's alert log shows how often they happen."

**7. S: "Slide 6 says makerspaces and Fab Labs were open to a free pilot. Name one. Can I email them tomorrow?"**
Probing: traction under one follow up.
WEAK and dangerous. QA 3 depends on names; FACTS says none are on file. Get name, date and channel in writing before Friday. If you can't, drop the plural from slide 6 and say: "Interest in conversation, nothing written, no name we can give you today."

**8. P: "Slide 9 puts the pilot at step 2 and approval at step 3, but the same slide says approval comes before any use, and your appendix says 'pilots included'. Which is it?"**
Probing: an on screen contradiction; ESA.
WEAK. QA 8 and slide 11 say the pilot "switches nothing", but ESA's rule covers any electrical product in use, and a powered box with a clamp in a 240 V enclosure is in use. Honest: "Watching doesn't exempt it. Either the pilot uses parts that already carry approval, or it waits for a field evaluation." Unless ESA has answered in writing, add "we haven't asked ESA yet", and fix the slide order.

**9. I: "If someone is hurt while your box is installed, who's liable? An ESP32 on Wi-Fi isn't a safety rated controller. Safety device or monitor?"**
Probing: liability and functional safety.
WEAK. QA 12 ("written by lawyers") dodges. Better: "Until it's certified and tested, nobody should rely on it: the welder's controls, the cylinder valve, the laser's interlocks and the space's rules stay in charge. Our stops fail safe on power loss and a watchdog, but we haven't assessed whether they need safety rated parts. That and liability need certification and a lawyer; we haven't done that work."

**10. S: "What does a welder box cost, what do you charge, how many before one of you gets paid? And your first market is Canada, but your only Canadian number is 29 Fab Labs."**
Probing: unit economics; size of the first market.
WEAK. QA 24 says "not costed". Slide 13 uses $300 per machine a year while saying printers, most machines, cost a few dollars a month, so $3M is generous by their own logic, and the Canadian makerspace count was dropped. Better: "No cost yet, so no break even. Our $3M is generous, since most machines are printers priced near software. For Canada we have 29 active Fab Labs and no verified makerspace count."

**11. S: "Fabman has readers, trained lists, billing, idle shutoff and an open API. Why pay two vendors? And if it's 'their card, our sensors', why does every box have its own NFC reader?"**
Probing: competition; slide 4 against slide 7.
WEAK. QA 5 handles the first half; nothing covers the duplicate reader. Add: "Fair: in a Fabman space our reader duplicates theirs; the box should take the member from Fabman's API. We haven't designed that version."

**12. I: "In my shop people get hurt on the table saw and the lathe. Why welders and printers? And what stops a member plugging the printer into the wall?"**
Probing: was the problem chosen from evidence; can it be bypassed.
MISSING. Honest: "We chose machines whose hazard shows in a sensor or the power draw, where spaces already bill material. A box can't see a hand near a blade. We have no injury data by machine type and should get it. Yes, the printer can be bypassed; the welder contactor and laser interlock are wired in by an electrician."

**13. P: "Your film makes the welder the hero; slide 9 says it comes last. Why lead with it?"**
Probing: does the story match the plan.
GOOD. CRITIQUE 9 and QA 6: plug in boxes first; the welder after approval, the most valuable and hardest. Lead with the laser, not the printer.

**14. C: "I scanned your QR. The 'Live simulation' says 'uOttawa Engineering, 26 machines with a PREVUMO box', has a chem lab with a fume hood and a sample freezer, and says 'keypad'. Is uOttawa a customer?"**
Probing: do they know their own public site.
MISSING. CRITIQUE row 12 caught this page; the fix went into the film only, and /dashboard is still the first software link on the home page. Fix it before Friday. If not: "That's our old PD B2 dashboard, from before makerspaces only and fobs. uOttawa isn't a customer; those are demo labels. It should have come down."

**15. S: "What pilot result would make you stop?"**
Probing: is "so the results can say no" real.
WEAK. The pass rule is "the owner keeps it on"; no false alert limit exists (QA 16: "unknown"). Better: "If the owner switches it off or ignores it, or no owner will name a price, we stop or change course. We'll write the false alert limit down before the pilot starts."

Tally: 2 GOOD, 10 WEAK, 3 MISSING.

## What would embarrass the team

1. **The live site the QR opens.** /dashboard ("Live simulation") says "uOttawa Engineering, 26 machines with a PREVUMO box", lists "Chem Lab B" (fume hood, centrifuge, sample freezer, "watched live, one reading per second"), says "keypad, current sensor and relay", and promises it "tells you when it's about to fail". The home page footer says certification is "needed before sale"; other pages say "before any use".
2. **Slide 9 contradicts itself**: pilot at step 2, approval at step 3, footer "approval comes before any use".
3. **"Quotes anonymized"** (slides 2 and 17), yet slides 15 and 17 name Yukonstruct, and the public site quotes "Rick Yorgason, Oct 27" and cites Grey Bruce Makers, which FACTS keeps off slides. Confirm he agreed to be named.
4. **"Live"**, which CRITIQUE banned: slide 10 "Every prototype, live"; "Monday, live" on the slide 5 poster.
5. **Four or five?** Slide 3 shows four machines; slide 4 says "five modules"; B says "the other four". Say "the enclosed printer is the printer box plus a chamber sensor".
6. **"Lasts longer"** in sentence one has no evidence; its only support (DOE 30 to 40%) was dropped. Cut it.
7. **A problem the box can't catch.** Slide 3: "A failed print runs for hours". Slide 14: the box can't tell "a spaghetti print that keeps extruding", the usual failed print that runs for hours.
8. **Films against answers.** The enclosed printer film shows "Chamber too hot: power off" first; QA 13 says the box never cuts power to a hot printer. Slide 5 shows learning "day 9 of 14"; slide 14 says learning "counts sessions, not days".
9. **Market slide.** "A first market we can count" never counts Canadian makerspaces. D says "more than two thousand" twice in one breath for different things; someone will ask if the US has as many as the world. $1,700 and $8,000 are US prices without "US".
10. **Small slips.** Slide 4 "airflow, air" reads like a typo. The bench plan tests a MIG welder while slide 9 says printer and laser first. The $8,000 laser is a Glowforge: check it has a documented interlock input.
11. **Hardware film against B's words** (130 a minute): "stays locked out" lands at 14 to 19 s while Amira is already unlocked and welding; low oxygen plays at 22 to 25 s while B is on the wire scale, and "oxygen sensor" lands on the printer. The laser (38 to 42 s) is cut when C clicks. Rewrite: "Every box shares one core: a fob reader, a display, a QR sticker and a Wi-Fi controller. An untrained member stays locked out. A trained one gets power and gas, and a scale weighs the wire. If oxygen by the cylinder drops, the valve shuts first. The other four modules are the same box with their own sensors."
12. **Software film against C's words.** Film: Machines 0 to 6 s, Alerts 6 to 16, Members 16 to 22, Resources 22 to 26, manual 26 to 37. C says "grams or minutes" over Alerts and "Safety events stop the machine first" over the Members table. Reorder: machines; the alert and its three choices; safety stops first; grams and minutes; the QR manual.
13. **Timing.** 573 words: 4:42 at 130 a minute, 5:05 at 120, 5:17 at 115, before the pauses and any wait for the 42 s film. Cut about 40 words.
14. **Words that trip.** "Fab Lab" and "Fabman" back to back on slide 7: say "Fabman, the access control company". Agree how to say PREVUMO.
15. **The QR is light on dark.** A standard decoder failed on it as shown and read it at once inverted. Test three phones or make it dark on light.
