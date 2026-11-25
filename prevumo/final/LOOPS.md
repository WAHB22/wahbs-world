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
| 4 | Fact checker | Every number on a slide, with a working link (Firecrawl is out of credits, so web search and page reads) |
| 5 | Deck builder (pptx skill, the first deck's design) | Build v1 of the deck |
| 6 | Film crew (Playwright on prevumo.vercel.app) | Record the site videos: hardware modules, owner app, QR manual |
| 7 | Deck builder | Put the videos in, render the PDF, contact sheet |
| 8 | Design critic | Hierarchy, type, one bold move per slide |
| 9 | Speech writer | Speaker notes and script, timing at 130 words per minute |
| 10 | Q&A coach | Hard questions, answers, appendix slides |
| 11 | Hostile panel rehearsal | Ask the deck the critics' questions; patch the gaps |
| 12 | Projection check | Contrast, size from the back of a room, no dashes |
| 13 | Video editor and consistency auditor | Durations, file sizes, share copies; same numbers everywhere |
| 14 | Gatekeeper | Refuses until no weak point is left |
| 15 | Three decisions | The three calls made without asking, applied |
| 16 | Finalizer | Final build, checks, delivery, commit |

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
