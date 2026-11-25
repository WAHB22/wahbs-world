# Loop 1: the critic round

Four critics attacked PREVUMO on Tuesday night (their full reports are in `critics/`, every outside fact linked):

* **Course judge:** the GNG 4120 professor and panel grading the final 5 minute talk.
* **Buyers:** a university makerspace manager, a non profit makerspace board member and a library Fab Lab coordinator.
* **Safety engineer:** product certification, industrial gas safety, and current signature analysis.
* **Investor:** a seed investor and an accelerator coach.

The gatekeeper verdict follows. It sorts what to fix before Friday, what to answer in questions and what to admit out loud.

## The verdict in five lines

1. **The pivot story is strong and true.** Electricity sharing, then kitchens and cafés, then makerspaces, each step driven by what owners said. Keep it, on one slide, with the reason for each turn.
2. **The weak point is evidence.** Nothing is built or measured. The PD B3 interview sheets are blank. Every curve is illustrative. The team must say this once, plainly, and turn it into the next step instead of hiding it.
3. **Fabman already sells most of the shared rules.** Its €249 Bridge has an NFC reader, idle shutoff from power readings and a "still there?" re-swipe for long jobs. What nobody else does, as far as the critics found, is the machine specific part: shielding gas and wire on the welder, and exhaust, air, coolant and flame on the laser. The talk leads with that and offers to sit next to Fabman, not to replace it.
4. **The prototype pages had real technical errors.** A judge who welds would catch them: a "gas leak sensor" for argon, which has no smell and does not burn; a current clamp around a whole cord; power cut on a hot printer; a flame alert dismissed from a phone. Fix them on the site before filming.
5. **Do not overclaim.** Make no claim about sponsors, signed pilots, measured savings or "AI that predicts failures". Use no restaurant numbers for makerspaces. Each one is a question the team cannot answer.

## The attacks that matter, ranked

| # | Attack (as it will be asked) | What we do |
| --- | --- | --- |
| 1 | "Nothing is built, the interview sheets are blank, every curve is illustrative. What have you actually tested?" | **Admit**, on the slide and aloud: concept prototypes, nothing measured yet. Then show the test plan with a pass criterion. |
| 2 | "Fabman's Bridge already reads NFC, blocks untrained members and shuts idle machines off. What is left for you?" | **Fix** the competitor row (it was wrong). **Answer:** we add sensors made for each machine; we can work next to Fabman through its open API. |
| 3 | "Who are your customers and sponsors? Name one pilot." | **Admit:** no sponsors and no signed pilot yet. Say what is true: spaces we spoke with were open to a free trial, which is interest, not commitment. Next step: one to three written pilots with a start date and a success measure. |
| 4 | "Argon and CO2 do not burn and have no smell. What does your leak sensor detect, and can your valve stop a leak at the cylinder?" | **Fix:** an oxygen sensor mounted low by the cylinder (alarm at 19.5% oxygen, per CCOHS). The valve protects the hose and welder only; the box reminds the owner to close the cylinder. |
| 5 | "How does a current reading tell a failing welder from a thicker plate?" | **Admit:** it cannot yet. Compare like with like (same settings), watch idle draw and slow drift, and treat every flag as a review until the pilot data says otherwise. |
| 6 | "An uncertified box switching a 240 V welder, even in a free pilot? And you wire into a certified laser's interlock?" | **Fix** the wording: in Ontario approval is needed before any use, not only before sale. **Answer:** the first pilot only watches and switches nothing; the laser uses only an interlock input the maker documents. |
| 7 | "Your market math, please. And your numbers are from restaurants." | **Fix:** drop the $754 restaurant repair figure and the 30 to 40% industrial savings figure. Use verified makerspace counts (Fab Foundation, Nation of Makers, a 2026 Canadian study) and say the bottom up estimate is small, so makerspaces are where we prove it, not where we stop. |
| 8 | "$25 a month for a printer? Obico charges a few dollars." | **Answer:** one flat price does not work. Printers priced near monitoring software; lasers and welders carry the premium, where the box adds interlocks and gas control. All prices are assumptions to validate. |
| 9 | "Five modules and none built. Where do you start?" | **Answer:** plug in modules first (printer and laser, no electrician, 1,858 of 2,032 active Fab Labs list laser cutting), in watch only mode. The welder comes after approval, because it is the most valuable and the hardest. |
| 10 | "What happens when the Wi-Fi drops or the controller freezes?" | **Fix** the overview: trained lists and safety trips live on the box; no power or a frozen controller means everything off and closed; nothing restarts until a fob tap. |
| 11 | "The person who walks away from the laser never taps out." | **Fix:** the box asks for a tap every 15 minutes during a job (Fabman does the same), and pauses if nobody answers. |
| 12 | "Your demo shows PINs and a chem lab, your report says fobs and makerspaces." | **Fix:** film the PD B3 owner app, not the older PD B2 dashboard. |

## Fixes to the prototype pages (loop 3, before any filming)

1. **Welder:**
   * The gas leak sensor becomes an oxygen sensor, mounted low by the cylinder.
   * The safety step says "Oxygen low? Valve shuts". The QR manual says "low oxygen alarm or hissing at the cylinder", never "gas smell".
   * The current sensor sits on one supply conductor inside the electrician's enclosure. A clamp around a whole cord reads near zero.
2. **Printers:**
   * When a printer is left heating, the box turns the heaters off through the printer link and lets the fans keep cooling. It cuts power only once the nozzle has cooled.
   * A failed print pauses only when two signals agree: the time is far past the estimate, and the spool stops losing weight.
3. **Laser:**
   * The exhaust check reads the fan's own power through the box, not a clamp around a cord.
   * A tap is required every 15 minutes during a job.
   * A flame stop is cleared at the machine, never with "Mark as OK" from a phone.
4. **Owner app:** gas is shown as "valve open minutes", not as gas used. Safety alerts have no remote "Mark as OK".
5. **Overview and shared rules:**
   * "Approval before any use, pilots included."
   * "No power or a frozen controller: everything off and closed."
   * "Learning never switches off a safety trip."

## Claims we will not make on Friday

* Sponsors, partners, customers or signed pilots: there are none.
* "Saves 30 to 40%" or "$754 per repair": those come from industry and restaurants, not makerspaces.
* "Our AI predicts failures", "works today", "live", "certified", "never left alone".
* "Fabman only knows who switched the machine on."
* Any market size without a link.

## What changes in the talk

* **One sentence that is true:** "PREVUMO is a box for each machine type in a makerspace: it lets only trained members run the machine, stops it when that machine's known hazard appears, logs who used what, and learns each machine's normal electricity use."
* **The pivot in one slide:** three turns, each with the owner evidence that caused it.
* **"Every machine fails its own way":** the welder in depth (the most original module), the other four as "same box, different sensors".
* **The software in one beat:** one alert, three choices; safety events stop first, then ask.
* **"Nothing is measured yet" said aloud,** followed straight away by how the free pilots fix that: watch only, four weeks, count the false alerts.
* **Value, customers and partners on one slide.** Who buys, what they get, what exists already (Fabman, printer software) and where we sit next to it. Sponsors: none yet, and what we are asking for.
* **Market with verified counts, then the path:** Canadian makerspaces, then campus and college shops, then small fabrication shops.
* **The close:** "Every machine fails its own way. PREVUMO gives each one its own guard."

## Things the team could still do before Friday (optional, not needed for the deck)

The judge's list. Wahb said the study cannot go further, so the deck does not depend on any of these:
* Two or three short calls with makerspace staff, reported with exact counts.
* One real power trace from a 3D printer, taken with an energy monitoring smart plug.
* Five people trying the owner app on two tasks.
