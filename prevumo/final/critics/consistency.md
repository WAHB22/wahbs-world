# PREVUMO final: consistency audit

Ranked by cost. Site files: `prevumo/public/`. s and a: notes. Q: QA.md.

## Ranked

**1. Pilot interest has nothing on file.**
Slide 6 and s6: "Makerspaces and Fab Labs we spoke with were open to a free pilot." Slide 7: "Customers: interest in a free pilot". FACTS: "no names or emails are on file". Q30 lists every conversation (one makerspace, two shared kitchens, manufacturing, café staff, a student office, then Yukonstruct): no Fab Lab.
Why: the only traction claim; Q3 ("Name one") exposes it.
Fix: if names exist, add them to FACTS and Q30. If not, slide 6 and s6: "Nothing here is measured yet. A free pilot in one makerspace is how we will learn each machine's normal." Slide 7: "Customers: none signed yet."

**2. "Every owner we asked" reads as ten owners.**
Slide 2: "Every owner we asked builds electricity into rent or membership." beside "Behind it: 10 interviews". s2: "Ten interviews and forty nine emails later, owners told us...". Slide 15 and FACTS: three owners.
Fix: slide 2 "All three owners we asked build electricity into rent or membership."; s2 "...later, the three owners we asked told us...".

**3. The approval route breaks its own pass rule.**
Slide 9: "Pilot boxes built from approved parts, or field evaluated by ESA" with "Pass: an approval label on every pilot box"; the same "approved parts" route is on slide 11, a1 and Q8. Approved parts give the box no label of its own. The site footer says "approval (CSA, or an ESA field evaluation)".
Fix, everywhere: "Every pilot box is field evaluated by ESA, or certified, before it is installed; approved parts make that easier."

**4. The market sum uses the price slide 13 rejects.**
Slide 13: "× $300 a year per machine ... ≈ $3M a year" beside "Printers: close to print monitoring software, a few dollars a month". a3 says "a flat price doesn't work for printers", then multiplies by "$300 a year"; so does Q23.
Fix: slide 13 "× $300 a year per machine (the GA3 flat price, an upper bound)" and "≈ $3M a year at most"; a3 and Q23 "at most about $3 million".

**5. The QR site still shows what FACTS dropped.** Slide 10 sends judges there.
* "Nozzles run at 250 °C and more ... (Alveo3D)": printer l.175, enclosed-printer l.203, system l.288. Slide 3: "over 200 °C" (Prusa).
* Grey Bruce Makers "$0.10 a gram ... weighs the spool by hand": welder l.195, printer l.174, enclosed-printer l.202, multimaker l.190, system l.283, owner app l.294. FACTS: "does not go on a slide".
* "HSE EIS45 ... from the team's research" (system l.285): no claim, no link.
Fix: use slide 17's sources (Prusa; University of Regina; Pickering Public Library). Delete HSE EIS45 or give its title and link.

**6. Learning: two weeks on the site, sessions in the deck.**
Slide 14: "Learning should count sessions, not only days"; a4 and Q17 agree. Site: "The first two weeks only record the normal range" (system l.258, owner app l.262, welder l.102, printer l.95, enclosed-printer l.104); "learned in weeks 1 and 2" (welder l.154, printer l.135, enclosed-printer l.152, multimaker l.154); "day 9 of 14" (owner app l.199). "Day 9 of 14" is probably visible in the slide 5 film.
Fix: "Learning mode records the normal range over a set number of sessions per mode"; "learned in its first sessions"; "learning mode · recording only". Re-render the films. On slide 14, "should count" becomes "counts", as in a4.

**7. Bench plan vs slide 9.**
Slide 9: "Bench test: Printer and laser boxes" and "Welder last"; slide 16 tests 2 to 4 use a "MIG welder", "a welding bench" and an "argon release". Slide 9: "Each test has a pass rule written before it starts"; slide 16 has none, and Q33 says "We'll write the false alert limit down before the pilot starts". Q34's "one real printer's power trace ... comes first" is in neither plan.
Fix: rename slide 16's "What it proves" to "Pass rule" and write one per test; mark the welder parts "after the pilot"; add "a real printer's power trace" to test 2.

**8. Q12 says the box never acts on its own.**
Q12: "Outside a safety event the box never acts on its own". But slide 6 has "idle: shut off after a set time", and on the site the printer "pauses it" and the laser pauses on a missed tap.
Fix: "Outside a safety event the box acts only on rules the owner sets: the idle time, the laser's 15 minute tap, and a print pause when two signals agree. Every action is logged with its reason."

**9. Laser hazards and rules have no verified source.**
Slide 15: "Published laser safety rules | Airflow interlock, 15 minute tap"; slide 3: "Fire when left alone", "Coolant stops, tube is ruined"; Q4 and Q30 rely on "published safety rules". FACTS and slide 17 list no laser source. The 15 minutes is a design value, not a rule.
Fix: verify CMU EHS on its official page and add it to FACTS and slide 17; slide 15 "Airflow interlock; a tap every 15 minutes (our design choice)". If it can't be verified, drop the row.

**10. Wire: "never counted" vs "weighed by hand".**
Slide 3: "Wire used, never counted". The site (welder l.195, system l.283) says Grey Bruce "removes and weighs the spool by hand". Slide 15 backs "Spool and wire scales" with U of Regina and Pickering, which are both about 3D printing.
Fix: slide 3 "Wire weighed by hand, if at all"; slide 15 "Filament is billed by the gram".

**11. Slide 14 claims more than a4 does.**
Left: "Slow drift at the same settings"; right: "Anything, before real data from a pilot". a4 lists only "on or off, idle draw with nobody working, and a warm up shape".
Fix: title the left column "What current should tell" and move "Slow drift" to the right.

**12. Spoken lines that overstate the slide.**
* s3 "Inside makerspaces we found the real problem" vs Q30 "the hazards on slide 3 come from published safety rules". Fix: "Looking at makerspace machines and their safety rules, we found...".
* s9 "If they keep it on, we've earned the right to switch machines off" vs slide 14 "until pilot data shows it works". Fix: add "and false alerts stay under the limit we wrote down first".
* s8 says "have a laser cutter" where the slide says "list", and s10 says "live" where the slide says "online". Use the slide's words.

**13. Film timing.** s4's slot "1:19 to 1:52" (33 s) holds a 42 s film, and s5's "1:52 to 2:27" (35 s) holds a 37 s film. The talk runs about 4:42, not 4:31. Fix: cut the films to fit, or shift every later cue by 11 s.

**14. The safety stop list drifts.** Slide 7 says "Gas, fire and heat"; slide 11 and a1 say "low oxygen, a lasting flame, no exhaust or no coolant"; the system overview says "Low oxygen, fire or no exhaust". The enclosed printer's "chamber too hot" stop is missing from slide 11. Fix: use one list everywhere, with the chamber stop included.

**15. Oxygen sensor "Watched day and night"** (welder l.96), but Q29 says backup power is "not designed yet". Fix: "Watched whenever the box has power."

**16. Small drifts.**
* Slide 8 starts with "Canadian makerspaces", but slide 13 sizes only "2,000 US makerspaces". In a3 and Q23, add: "The US is the only verified count; Canada has 29 active Fab Labs."
* The site says "GNG4120" (system l.181 and l.295, manual l.112, `hardware/kit/engine.js` l.89, which is every module's title block); the deck, hub and report say "GNG 4120".
* Slide 7 says "US$1,700", but slide 13's "$300", "$25" and "$3M" have no currency, and Q22 drops "US". Name it.
* Slide 15's column "What we heard" holds published pages. Rename it "What we learned".
* In the owner app, the header says "Monday" but today's events are logged "Nov 10" (a Tuesday), and Amira's coolant stop is today in Alerts but "Nov 9" in Members.

## Only in the old report (low priority)

* 4.2 has a "Gas leak sensor ... by the regulator" and asks about "a gas smell"; the final design uses an oxygen sensor because "A leak has no smell". Add that change to slide 15.
* 4.10 says "CSA certification needed before sale". Add to Q8: "Our PD B3 report said before sale; ESA says before use, so we changed it."
* 4.9 and H7: "Two-week learning mode" (see item 6). 4.3 pauses a failed print on one signal and cuts power with no cool down; 4.6 has an "Exhaust clamp". Q13, Q18 and the site now say otherwise.
* It cites Grey Bruce and Alveo3D's 250 °C, links claude.ai pages, and leaves the team table blank.
