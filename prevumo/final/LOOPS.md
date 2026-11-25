# PREVUMO final presentation: loop log

Final presentation: Friday, 5 minutes, GNG 4120 Group 10. Ready by 10 a.m. Wednesday (Ottawa time).
Sixteen loops of about 30 minutes. Each loop picks one lead (an agent or a lens) and one aspect, records what it found and what changed, and the next loop builds on it.

Deliverables land in `prevumo/deliverables/final/`; sources and build scripts live in `prevumo/final/`.

## Plan (each loop may change the plan for the loops after it)

| Loop | Lead | Aspect |
| --- | --- | --- |
| 1 | Four critics: course judge, makerspace buyers, safety engineer, investor | Destroy the project; decide what to fix and what to answer |
| 2 | Story editor | The 5 minute arc, the slide list, the word budget per slide |
| 3 | Safety engineer | Fix the technical errors on the prototype pages, regenerate and redeploy the site |
| 4 | Fact checker | Every number on a slide, with a working link |
| 5 | Deck builder (pptx skill, the first deck's design) | Build v1 of the deck |
| 6 | Film crew (Playwright on the site) | Record the films and put them in the deck |
| 7 | Design critic | A fresh look at every slide; apply the fixes |
| 8 | Speech writer | Speaker notes as data, timing, the script PDF |
| 9 | Q&A coach | Who answers what, the ten likeliest, the Q&A PDF |
| 10 | Hostile panel rehearsal | Questions asked cold; patch the gaps in the site, the deck and the answers |
| 11 | Projection check | Sizes, contrast, dashes, a washed out projector |
| 12 | Video editor | Films against the words, share copies, the deck PDF |
| 13 | Consistency auditor | The same claims and numbers in the deck, notes, Q&A, site and report |
| 14 | Gatekeeper | Refuses until no weak point is left |
| 15 | Three decisions | The three calls made without asking, applied and written down |
| 16 | Finalizer | Final build, checks, delivery, commit (done) |

(The table was redrawn in loop 12 to match what ran: loops 3 to 6 started early, so the films merged into one loop and the design critic got its own.)

## Log

### Loop 1 (Tue 20:00): four critics
* **Lead:** four agents in parallel. Course judge, makerspace buyers (university, non profit, library Fab Lab), safety engineer, investor. Reports are in `critics/`, synthesis in `CRITIQUE.md`.
* **Found:**
  * Fabman's Bridge already covers the fob, the trained list and idle shutoff, and the old competitor row understated it.
  * The welder "gas leak sensor" is wrong for argon and CO2; it should be an oxygen sensor.
  * Other technical errors on the pages: a clamp around a whole cord, power cut on a hot printer, a flame alert dismissed from a phone.
  * Restaurant and industrial numbers had been used for makerspaces.
  * Nothing is measured and no pilot is signed.
* **Decided:**
  * The deck stays a PowerPoint in the first deck's design, not a Claude link.
  * Lead with what is machine specific (welder, laser) and sit next to Fabman.
  * Fix the page errors before filming (loop 3).
  * Say "nothing is measured yet" once, aloud, and turn it into the pilot plan.
  * No sponsors, signed pilots or savings claims.
* **Note:** Firecrawl's free daily limit ran out during the research; the investor marked seven figures as read from excerpts only, to recheck in loop 4.

### Loop 2 (Tue 20:45): story editor
* **Lead:** the story editor lens, working in the main session from the critique and Wahb's order (started, where we are, next step, value and customers and sponsors, market, where we go).
* **Made:** `STORY.md`.
  * The one sentence.
  * The arc.
  * Ten slides with time, speaker and words.
  * A draft script of 633 words (4:52 at 130 words a minute).
  * The numbers to verify.
  * The three films.
  * Seven appendix slides for questions.
* **Decided:**
  * One slide for the pivot.
  * The welder in depth on the hardware slide, the other four as the same box with their own sensors.
  * "Nothing is measured yet" said on slide 6, followed by the free pilot plan.
  * Sponsors stated as "none yet".
  * Pricing kept out of the 5 minutes, in the appendix.

### Loop 3 (Tue 20:50, started early because loop 2 finished in minutes): safety engineer
* **Lead:** the safety engineer's list from `CRITIQUE.md`, applied in the main session to the page sources, then the site regenerated and redeployed.
* **Changed on prevumo.vercel.app:**
  * **Welder:**
    * The gas leak sensor is now an oxygen sensor, mounted low by the cylinder, with the escaping gas drawn sinking towards it.
    * The chart shows oxygen falling under "alarm: 19.5% oxygen".
    * The current clamp sits on one supply wire inside the electrician's enclosure.
  * **Printers:** a failed print pauses only when two signals agree. A printer left heating has its heaters turned off over the printer link and cools before the relay cuts power.
  * **Laser:**
    * An airflow switch in the exhaust duct.
    * Coolant flow and temperature.
    * A tap every 15 minutes during a job.
    * A lasting flame pauses the laser, and the stop is reset at the machine.
    * Only a documented interlock input is used.
  * **Multimaker:** an inline current switch on the fan cord.
  * **Owner app, QR manual, overview:**
    * Safety stops show "Call technician" and "Reset at the machine only", never a remote Mark as OK.
    * Gas is shown as valve open minutes.
    * "Low oxygen alarm, or hissing at the cylinder" replaces "gas smell".
    * A fail safe rule.
    * Approval is needed before any use, pilots included.
* **Checked:**
  * Stills of every changed step looked at.
  * All 11 site pages load at 1440 and 390 px with no errors.
  * The dashboard login works.
  * No dashes.
  * Page screenshots in `deliverables/pd-b3/` and the site's card images regenerated.
* **Not changed:** the PD B3 Word report still has the old wording (it was already handed in); the deck and Q&A use the new wording.

### Loop 4 (Tue 21:15): fact checker
* **Lead:** the fact checker. Every number in the story was checked against its own source, read directly with curl or found through web search, plus the Fab Foundation's lab data counted from the official file. `FACTS.md` lists each claim, its link and the exact words.
* **Verified:**
  * 2,032 active Fab Labs worldwide (29 Canada, 182 US); 1,858 list laser cutting.
  * More than 2,000 US makerspaces and Fab Labs (Nation of Makers).
  * $0.10 a gram (University of Regina, Pickering Library).
  * Machine prices: $1,699 Millermatic 211 PRO, $7,999 Glowforge Pro HD.
  * Prusa nozzle temperatures.
  * CCOHS on argon and 19.5% oxygen.
  * Fabman prices and Bridge features.
  * Obico prices.
  * ESA: approval before any use in Ontario.
* **Dropped:**
  * $754, 30 to 40%, $600 to $6,000, and the restaurant and kitchen numbers.
  * 138 Canadian makerspaces: the article could not be read.
  * The Epilog price.
  * Grey Bruce on a slide.
  * Hackerspace counts.
* **Script:** three lines changed (nozzle temperature, machine prices and per gram billing, the market counts); 632 words.

### Loop 5 (Tue 21:20, started early): deck builder
* **Lead:** the deck builder, with the pptx skill and the first deck's design code (`deck/build.js`): the same palette, faces, layouts, footer and heartbeat line.
* **Made:**
  * `build.cjs` and `notes.cjs`.
  * `deliverables/final/PREVUMO-final.pptx`, version 1: ten slides for the five minutes plus seven appendix slides for questions.
  * Word for word speaker notes on every slide, with speakers A to E, hand offs and cues.
  * New drawings: the pivot path, one machine's day as an electrical signature, and crops of the five module drawings rendered from the live pages.
* **Checked:** `validate.py` passes; rendered through LibreOffice and looked at every slide. Fixed:
  * the slide 3 band that wrapped;
  * the slide 6 caption under the honesty band;
  * the slide 2 attribution spacing.
* **Open:** the two films are posters for now (loop 6 records them from the site). The deck file is committed at the end, to keep binary versions out of the history.

### Loop 6 (Tue 21:27, started early): film crew
* **Lead:** the film crew. `film.mjs` records from the site (dist, the same files as prevumo.vercel.app); the hardware film opens on the live site itself.
* **Hardware film,** `media/hardware.mp4`, 41.9 s, 1920x1080, no sound:
  * 2.6 s on the live /hardware page;
  * the welder module drawn frame by frame at exact times: in pieces, the fob step, power and gas with the wire scale, the low oxygen step;
  * about 4 s each on the printer warm up, the enclosed chamber, the multimaker laser mode and the laser flame stop.
* **Software film,** `media/software.mp4`, 37.1 s:
  * the owner app driven with a drawn cursor at 1.5x scale: machines, the low oxygen alert answered with Call technician, the printer alert shut down, a member's sessions, resources;
  * then the QR manual on a phone, scrolling to what to do if something goes wrong.
* **Fixed on the way:**
  * the hub cards and page descriptions still said "gas leak sensor"; corrected and redeployed (commit 3e29777);
  * the screencast dropped still frames at the end of a view; the last frame is now held until the run ends.
* **Deck:**
  * both films are embedded and set to play automatically when their slide appears, using PowerPoint's own timing;
  * the posters are the low oxygen alert and the machines view;
  * zip folder entries are removed so cloud drives open the file;
  * 10 MB, `validate.py` passes.

### Loop 7 (Tue 21:46): design critic
* **Lead:** a design critic agent, which looked at the rendered slides fresh against the first deck and Wahb's dislikes. Its report is `critics/design.md`; all 12 findings applied:
  1. **Slide 7:** rebuilt around the three benefits as the one bold move, with one subtitle and the table phrased as the speaker says it; no eyebrows.
  2. **Slide 10:** QR 2.3 in (was 1.55), URL 18 pt; the heartbeat line now sits at the same height as on the title slide.
  3. **Slide 3:**
     * drawings re-rendered clean, with no part numbers, leader lines or tables (`stills.mjs`), and centred;
     * the spoken risk is the bold first bullet.
  4. **Slide 8:**
     * titled "A first market we can count";
     * "9 in 10 Fab Labs list a laser cutter";
     * all numbers in ink.
  5. **Slide 9:**
     * small step numbers;
     * pass rules at 14 pt;
     * "Watch only pilot" named the same as in the appendix.
  6. **Slide 2:**
     * eyebrows and numbered tags gone;
     * "10 interviews and 49 outreach emails" at 15 pt;
     * path nodes on the column edges.
  7. **Slide 5:** titled "One app for the owner"; the side column follows the speech; "Mark as OK" is visible on a projector; the film no longer shows a cut off note.
  8. **Slide 4:** titled "One box, five modules"; the module lines are 13 pt.
  9. **Slide 6:** chart sublabels at 14 pt.
  10. No-break spaces keep numbers with their units.
  11. Every source line is at the same place and size.
  12. Appendix cards are sized to their content.
* **Checked:** `validate.py` passes; every slide rendered and looked at again.

### Loop 8 (Tue 22:05): speech writer
* **Lead:** the speech writer lens, in the main session.
* **Notes:** `notes.cjs` is now data. Each slide has its speaker, words, cue and hand off, and the times are computed at 130 words a minute plus 2 s for each hand off or click, so the header on every note is right by construction.
* **Timing:**
  * Cut from 4:55 to 4:42 (563 words): shorter lines on slides 2, 3, 4, 5, 6 and 7, and nothing that is only on the slide is repeated aloud.
  * Speakers: A 0:54, B 1:04, C 1:07, D 1:06, E 0:32.
* **New files:**
  * `deliverables/final/PREVUMO-final-script.pdf` (4 pages): a run sheet, who says what with blanks for the names, the rules (films play by themselves; say "nothing is measured yet" once; what not to say), and every slide's words beside its thumbnail.
  * `deliverables/final/PREVUMO-final-QA.pdf` (5 pages), from `QA.md`.
  * Both are made by `docs.mjs` in the deck's palette and faces.

### Loop 9 (Tue 22:16): Q&A coach
* **Lead:** the Q&A coach lens, in the main session, working from the four critics' questions.
* **`QA.md` and its PDF now open with:**
  * who takes which question: A the story, B the hardware, C the software and the idea, D the business, E what's next, with the rule to pass a question in one sentence and never guess a number;
  * the ten likeliest questions with a one line answer and the appendix slide to show.
* Every "Show" reference now names its slide number (A1 is slide 11, up to A7, slide 17).
* `PREVUMO-final-QA.pdf` is 6 pages.
* **Next (loop 10):** a hostile panel agent that has not seen our answers asks its questions; the gaps it finds get patched.

### Loop 10 (Tue 22:17): hostile panel rehearsal
* **Lead:** a panel agent (professor, makerspace engineer, startup coach) watched the talk cold, asked 15 questions, then checked them against our answers. The result was 2 good, 10 weak and 3 missing. Its report is `critics/panel.md`.
* **Fixed on the site** (the QR on the last slide opens it):
  * The old PD B2 dashboard said "uOttawa Engineering, 26 machines with a PREVUMO box" and had a chem lab. It is now a "Demo account", carries a banner saying it is an earlier version, and has moved to the end of the software part as "Owner dashboard, earlier version".
  * The home page footer said approval comes "before sale"; it now says before any use, pilots included.
  * The owner app said "Monday, live"; it now says demo data, and the software film was re-recorded.
* **Fixed in the deck:**
  * Slide 9 put the pilot before approval; approval now comes before the pilot.
  * The QR on slide 10 is dark on light (it decodes to https://prevumo.vercel.app), and "live" is now "online".
  * "3D printers" on slide 3; "Prints fail unwatched" replaces a claim the box can't keep.
  * US$ on prices.
  * "A market we can count".
  * "Owner quotes anonymized".
  * The appendix states pilot approval and learning plainly.
* **Fixed in the words:**
  * B's and C's lines now follow their films shot by shot.
  * The talk is 549 words: 4:31 at 130 a minute, about 4:50 at 120.
  * The opening states the aim ("our aim: every machine runs safely and lasts longer") rather than a result.
* **Q&A:**
  * Seven new answers: the dashboard, the person at the welder, the interview split, saws and lathes, a second fob reader in a Fabman space, what would make us stop, what physically exists.
  * Four answers strengthened: pilot approval, the welder's own solenoid, safety device or monitor, the enclosure exception.
* **Left for Wahb:**
  * The names of the spaces open to a free pilot.
  * Whether the Yukonstruct contact agreed to be named on the public site (the PD B3 pages quote him by name).

### Loop 11 (Tue 22:46): projection check
* **Lead:** the projection check, in the main session: a script read every text run in the deck, computed the colour contrast of every pair in use, and simulated a washed out projector seen from the back of the room.
* **Sizes:** on slides 1 to 10, everything under 13 pt is a source line or a caption. Raised:
  * "One machine's day, illustrative" to 13 pt, since it carries the honesty;
  * the slide 2 attribution to 13 pt, shortened to "Ontario makerspace director";
  * the title slide's "PREVentive Usage MOnitor" to 16 pt bold. Orange on ink is 3.97:1, which passes only as large text.
* **Contrast:** ink on bg 10.1:1, muted on bg 4.8:1, rust on surface 6.2:1, green on bg 5.4:1. Orange on ink (3.97:1) is used only at 14 pt bold or larger.
* **Dashes:** none in any slide's text or notes.
* **Washout test:** lifted blacks, 75% saturation, at a third of the resolution; titles, benefits, numbers and the honesty band all still read.

### Loop 12 (Tue 23:16): video editor
* **Lead:** the video editor lens, in the main session.
* **Films against the words:**
  * Cut times detected with ffmpeg. The software film is now Machines 0 s, Alerts 6 s (the safety alert answered at 9.4 s), Members 17.8 s, Resources 22.3 s, the phone manual 24.5 s, 35.9 s in all. The alerts got 1.6 s more, since C spends about 14 s on them.
  * The hardware film is built shot by shot to B's lines: pieces 2.6 s, locked out 8.6 s, power and gas 13.1 s, oxygen 19.5 s, the other modules from 25.9 s.
* **Files:** both films are H.264 High, 1920x1080, 30 fps, yuv420p, faststart, with no sound, so they play in PowerPoint on Windows and Mac.
* **Share copies in `deliverables/final/`:**
  * `PREVUMO-final.pdf`: the deck, 17 pages, every font embedded, the films shown as their posters;
  * `PREVUMO-final-film-hardware.mp4` (7.2 MB) and `-software.mp4` (1.5 MB), as a fallback if the presenting computer has no PowerPoint.
* **Script PDF:**
  * present from PowerPoint;
  * do not convert to Google Slides, which drops the films;
  * the PDF and film fallback;
  * install the fonts.

### Loop 13 (Tue 23:46): consistency auditor
* **Lead:** a consistency auditor agent read the deck, the notes, QA.md, FACTS.md, the site and the PD B3 report side by side, and ranked 16 drifts by cost (`critics/consistency.md`).
* **Fixed in the deck and the notes:**
  * slide 2 says all three owners we asked, not every owner;
  * the approval route is one sentence everywhere: every pilot box is field evaluated by ESA, or certified, before it is installed;
  * the market sum is "at most", in US dollars, and says only the US count is verified (Canada has 29 Fab Labs);
  * learning says two weeks today, sessions in the next version; slow drift moved to what current can't tell yet;
  * the bench test table has a pass rule per test, a real printer's power trace in test 2, and the welder tests marked later;
  * one safety stop list everywhere: low oxygen, a lasting flame, no exhaust, no coolant, an overheating enclosure;
  * slide 15 adds the oxygen sensor change and names the laser sources (CMU EHS v.11 and MIT EHS, both read on their official pages); the 15 minute tap is marked as our own choice;
  * the spoken lines now use the slides' words (list, online) and the pilot's false alert limit.
* **Fixed on the site:** the dropped facts (Alveo3D's 250 °C, the Grey Bruce price, HSE EIS45) are gone or labelled as the team's research; Prusa, the University of Regina and Pickering are quoted; GNG 4120 is spelled one way; the owner app's date matches its logs.
* **Q&A:** Q8 says the PD B3 report's "before sale" became "before use"; Q12 lists the rules the box acts on; Q35 covers what changed since PD B3.
* **Films:** the hardware film is tightened to fit B's 34 seconds (intro 2 s, faster pieces), and both films re-recorded with the new site text.
* **Kept:** the free pilot interest stays, as the team's own claim, flagged in the notes (decision for loop 15).

### Loop 14 (Wed 05:50; the session sat idle about 3.5 hours after two worker restarts): gatekeeper
* **Before it:** checked that the loop 13 site deploy went live (the owner app's Tuesday, Nov 10; CMU EHS and Prusa on the overview; no Alveo3D or GNG4120). Checked inside the pptx: both films embedded (35.3 s and 35.9 s) with autoplay timing, notes on all 17 slides; the slide 10 QR decodes to https://prevumo.vercel.app.
* **Lead:** a gatekeeper agent read every slide image, the script, the Q&A, FACTS and the earlier critiques, and refused with 11 weak points (`critics/gatekeeper.md`).
* **Fixed:**
  * slide 1 says "each common machine in a makerspace", on two balanced lines; s1 says "each common type of machine";
  * slide 2's stops read "First idea (PD A)", "Then (GA3)", "Now (PD B3)";
  * slide 3: "Coolant fails, tube wears out", backed by FLUX, a laser maker ("Why Temperature Is the #1 Lifespan Killer", added to FACTS and slide 17); the source line now names CMU and MIT for lasers;
  * slide 4: the laser line fits on one line;
  * slide 6: a "Current" axis and the caption "Current over one machine's day, illustrative";
  * slide 7: titled "Who it's for, and what they get", and "CA$0.10 a gram";
  * slide 9: the welder is "the biggest hazard, and the hardest to install";
  * timing is now planned at 120 words a minute, a nervous pace: 537 words, 4:47 in all;
  * the script PDF tells the team how to embed the fonts in PowerPoint on a locked podium computer, and to present the PDF if anything reflows;
  * Q24 says what drives the cost without inventing a number; Q36 to Q40 answer the smart plug, kitchens, machine life, the normal band and the welder.
* **Left for loop 15:** the free pilot claim (point 1) is the team's own; it is a decision, not a fix.

### Loop 15 (Wed 06:23): the three decisions
* **Lead:** the main session, deciding without asking, as Wahb asked. Written up in `DECISIONS.md`.
* **1. Keep the free pilot interest, worded exactly:** "open to a free pilot" and "nothing signed"; names only if the team has them.
* **2. Tell the truth on stage:** nothing built or measured yet, approval before a watch only pilot, the welder last, PREVUMO next to Fabman.
* **3. Name organizations, not people, anywhere public:** the site credits the fob quote to "Yukonstruct (Oct 27)", as the deck's "owner quotes anonymized" promises. The submitted PD B3 report is left as it was.
* **Applied:** the site regenerated and rebuilt without the name; FACTS, the loop log and the panel notes no longer name him either. The script PDF has a "before Friday" box with the four things only the team can do: speaker names, pilot space names, Yukonstruct's consent to be named on slides 15 and 17, and a check of fonts and films on the presenting computer.

### Loop 16 (Wed 06:54): finalizer
* **Deploy:** the loop 15 site (no person named, the fob quote credited to "Yukonstruct (Oct 27)") deployed to prevumo.vercel.app from commit 201abdc and checked live.
* **Final checks:**
  * `PREVUMO-final.pptx`: passes the Office validator; 17 slides, notes on every slide; both films embedded and set to play by themselves;
  * `PREVUMO-final.pdf` (17 pages), `PREVUMO-final-script.pdf` (5 pages) and `PREVUMO-final-QA.pdf` (8 pages): every font embedded; no em dash, en dash or spaced hyphen;
  * the two films: H.264, 1920x1080, yuv420p, 35.3 s and 35.9 s, identical to the copies inside the deck;
  * the slide 10 QR decodes to https://prevumo.vercel.app.
* **Delivered:** the six files in `prevumo/deliverables/final/`, sent to Wahb. Scheduling stops here.
* **Open, for the team before Friday:** speaker names; the names of the spaces open to a free pilot, if any; Yukonstruct's consent to be named on slides 15 and 17; the PD B3 report still has its old wording ("certified before sale", the gas leak sensor, Alveo3D, Grey Bruce) and names the Yukonstruct contact, which is fine in a submitted report but differs from the deck.
