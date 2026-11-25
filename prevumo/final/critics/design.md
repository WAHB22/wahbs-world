# PREVUMO final deck: design critique

Judged at 100 px per inch on the renders, projected from 8 to 10 m, about 30 seconds per slide. The family match with the first deck is strong (same masters, faces, palette, footer, heartbeat line, dark title and close), so none of the fixes below change the system. They fix the slides where the deck slips into a template look, hides what the speaker is saying, or cannot be read from the back. Positions are in inches on the 13.333 x 7.5 slide; line numbers refer to `prevumo/final/build.cjs`.

1. **Slide 7: four competing zones, three eyebrow labels, no focal point.**
   * **What is wrong:** an icon list, a floating white card, a table and a partner bar sit side by side with equal weight, which is about 95 words for a 35 second slot. Each column opens with a grey mono eyebrow ("Customers", "What they get", "Next to what exists"), and the middle column is the only boxed one. This is the most "AI template" slide in the talk. The table also wraps badly: "idle / shutoff" and "works beside / them" leave one word on the last line.
   * **Why it matters:** it is the value slide judges care most about, and from the back nobody can tell where to look first while D speaks.
   * **Fix:**
     * Delete the eyebrows at lines 337, 346 and 352, the icon list and its circles (lines 338 to 343), the line "Whoever runs the space pays." (line 344) and the Value card (line 345).
     * Under the title, add one subtitle as in deck 1 slide 3: x 0.75, y 1.45, w 11.8, h 0.45, 17 pt, muted, text "Whoever runs the space pays: university and community makerspaces, Fab Labs and libraries." It measures 10.65 in, so it fits on one line.
     * Make the three benefits the bold move, with no card: x 0.75, w 7.3, rows at y 2.2, 3.15 and 4.1. Each heading is Space Grotesk 22 pt bold, h 0.42; each detail is 16 pt muted, at y + 0.45, h 0.38.
     * Move the table to y 2.2, keeping x 8.75 and w 3.8. Change the Fabman cell to "Access and idle shutoff", which is the speaker's exact phrase, and the PREVUMO cell to "Sensors made for each machine, next to them". Both then wrap cleanly.
     * Leave the partner bar at y 5.25 unchanged.

2. **Slide 10: the QR and the URL are too small for the slide that stays up through all of Q&A.**
   * **What is wrong:** the QR is 1.55 in. On a 2.5 m wide screen that is about 0.29 m, which phones scan from about 3 m only. The URL and "Every prototype, live" are 12 pt.
   * **Why it matters:** the notes say to leave this slide up during questions, and the link to every prototype is the only call to action in the deck.
   * **Fix:**
     * Move the heartbeat image from y 2.7 to y 2.25 (line 419), the same height as slide 1, so the two dark slides bookend. Its band then ends at about y 3.9.
     * QR: x 10.28, y 4.3, w 2.3, h 2.3.
     * URL: x 8.5, y 6.7, w 4.08, h 0.4, JetBrains Mono 18 pt, right aligned.
     * "Every prototype, live": x 6.9, y 4.3, w 3.2, h 0.4, 16 pt, right aligned.
     * "Thank you. Questions?" stays where it is.

3. **Slide 3: stray part numbers in the drawings, uneven crops, and 12 equal bullets.**
   * **What is wrong:**
     * The drawings still carry the circled part numbers 8 to 12 from the live pages' parts table. There is no table here, so they read as unfinished.
     * The crops do not match. The welder floats small on the left of its frame. The 3D printer and multimaker tables are cut off at the right edge. The laser's exhaust duct runs into the top edge.
     * Twelve bullets at 13 pt have the same weight, but B names only three risks: welder gas, printer nozzle and laser fire.
   * **Why it matters:** this is the audience's first look at the product, and the four drawings are the slide.
   * **Fix:**
     * Re-render `assets/machine-welder.png`, `-printer`, `-laser` and `-multimaker` from the live pages with the numbered part tags hidden. Keep 1200 x 980, centre each machine and leave at least 60 px clear on every side.
     * Move the images from y 1.45 to y 1.55 (line 263), the content top used on every other slide.
     * In the bullets map (line 265), set the first bullet to bold ink and the other two to muted: `bold: j === 0, color: j === 0 ? HEX.ink : HEX.muted`.
     * Reorder the printer bullets to "Nozzle left hot, over 200 °C", "A failed print runs for hours", "Filament billed by the gram". The first bullet is then always the one B says aloud, and the longest bold line (2.47 in plus the indent) fits the 2.8 in column.

4. **Slide 8: the numbers fight each other, and the title repeats slide 9's job.**
   * **What is wrong:**
     * "2,032" and "2,000+" sit side by side in the same 60 pt face. The third column, "of those Fab Labs", points back over the middle column to the first.
     * The first number is green while the first market is Canada.
     * Column 1 wraps as "worldwide, 29 / of them in Canada", which cuts the 29 off from what it counts.
     * "Where we go" is a label, and the next slide is the actual "what we do next".
   * **Why it matters:** judges check market slides closely, and the speaker says "Almost every Fab Lab lists a laser cutter", which the slide shows only as a raw count.
   * **Fix:**
     * Title: "A first market we can count", the speaker's own words.
     * All three numbers in C.text1 (line 378), so the green "Canadian makerspaces" pill is the only accent.
     * Column 3: big "9 in 10" (3.5 in at 60 pt, fits w 3.7), with the label "Fab Labs list a laser cutter (1,858 of 2,032)". 1,858 of 2,032 is 91%.
     * Column 1 label: "active Fab Labs worldwide, 29 of them in Canada", with a no-break space after 29.

5. **Slide 9: a template row of four cards with loud numbers, and the pass rules too small.**
   * **What is wrong:**
     * The 30 pt coloured numbers 1 to 4 are the loudest thing in each card, louder than the step names. This is the decorative numbering Wahb rejects.
     * The "Pass:" lines carry the slide's point, but they are 12 pt bold. The orange one on the dark card is 3.97:1, which fails 4.5:1 at that size.
     * "Free pilot, watch only" wraps to two lines, so the other three cards keep a 0.75 in empty gap under their titles.
     * The appendix calls the same step "Watch only pilot".
   * **Why it matters:** the pass rule is what makes this plan credible, and it is the smallest text on the slide.
   * **Fix:**
     * Numbers (line 404): 14 pt mono at y 1.85, h 0.3, in C.text2, and in HEX.greenTint on the dark card. This matches deck 1 slide 5.
     * Titles (line 405): y 2.25. Rename step 2 to "Watch only pilot" (2.21 in at 20 pt, fits w 2.3). Its body becomes "Free, four weeks in a makerspace. The box switches nothing; the owner labels every alert."
     * Body (line 406): y 2.8, h 1.15.
     * Pass lines (line 407): y 4.05, h 0.75, 14 pt bold. At 14 pt bold the orange counts as large text and passes at 3:1.
     * Cards: h 3.45 (y 1.6 to 5.05). Arrows at y 3.24.
     * Closing sentence: y 5.35, 16 pt.

6. **Slide 2: the same eyebrow three times, and the spoken evidence hidden in a footnote.**
   * **What is wrong:**
     * Every card opens with the grey mono "What owners told us", which is the eyebrow pattern Wahb rejects.
     * The tags "1 · PD A", "2 · GA3" and "3 · PD B3, now" add decorative numbers and middle dot meta strings on top of a path that already shows the order.
     * A says "Ten interviews and forty nine emails", but those numbers appear only in the 10 pt grey source line.
     * Column 1 ends on an orphan, "it.".
     * The path nodes drift against the columns: their centres sit 0.30, 0.23 and 0.16 in to the right of the text edges.
   * **Fix:**
     * Delete line 244 (the eyebrows).
     * Tags: "PD A", "GA3" and "PD B3, now", at 13 pt. The last one in HEX.rust (5.4:1) instead of orangeText (4.1:1 at 12 pt fails).
     * Column 1 text: "A box that measures each user's electricity, so the space can bill it." Two lines, 3.1 in.
     * Cards: y 4.15, h 1.7. Evidence text at y 4.35, attribution at y 5.05 in 12 pt (3.15 in, fits), outcome at y 5.45.
     * New line at x 0.75, y 6.05, w 11.8, h 0.35, 15 pt ink: "Behind it: 10 interviews and 49 outreach emails (GA3, Oct 2026)." Then `source(s, "6 competitors studied in GA3. Quotes anonymized.")` at the default y 6.55.
     * In `pathSvg()`, set `xs = [28, 842, 1661]` and start the grey line at x1 28, so each node's left edge sits on its column's text edge.

7. **Slide 5: the third choice disappears, the column runs against the speech, and there is another eyebrow.**
   * **What is wrong:**
     * The "Mark as OK" pill is filled and outlined in idle EDE4D3 on the F3EBDD background (1.07:1). On a projector "three choices" shows two pills and some floating text.
     * C opens with "every machine, who is on it, and what they used", but that sits last, under a grey "Also in the film" eyebrow.
     * The film's sidebar note is cut mid sentence ("Nothing here is measured, and") for the whole 37 seconds.
   * **Fix:**
     * Title: "The owner app, live", deck 1's title for this slide.
     * Delete line 305 (the eyebrow). Move the three bullets to the top: x 9.35, y 1.55, w 3.3, h 0.95. Divider at y 2.62. "One alert, three choices" at y 2.78. Pills at y 3.3 + j × 0.52.
     * Shield icon at y 5.02; its text at y 4.97.
     * "Mark as OK" pill: fill HEX.surface, line HEX.muted 1 pt.
     * In `film.mjs`, record the app at a viewport tall enough to show the whole sidebar note, or hide that note, since the slide's source line already says "nothing here is measured".

8. **Slide 4: three headings compete, and the slide title is a label.**
   * **What is wrong:** the slide title "Hardware prototypes", the film's own "Welder module / How it works" and the side heading "One box, five modules" all claim to be the title. The side heading is the actual message. The module detail lines are 12 pt.
   * **Fix:**
     * Title: "One box, five modules".
     * Delete line 282 (the side heading). Move the core line (line 283) to y 1.55.
     * Module rows at `y = 2.45 + i * 0.72`. Detail lines at 13 pt, w 3.3: "gas valve, oxygen sensor, wire scale" is 3.21 in. The last row ends at y 5.92, above the film's bottom edge at 6.21.

9. **Slide 6: the logic of the chart is in 12 pt grey.**
   * **What is wrong:** "idle: shut off after a set time" and "one alert, the owner decides" are the two rules C explains. They are 12 pt muted under 15 pt labels.
   * **Fix:** in `lab()` (line 320), set the sublabels to 14 pt. The longest is 2.6 in and the box is 2.9 in, so nothing new wraps. Nothing else on this slide needs to change; it is the best slide in the deck.

10. **Slides 2, 7, 8, 9, 11, 12, 13, 16 and 17: wraps that strand a word or split a number from its unit.**
    * **What is wrong:** slide 9 has "a gas / fitter" and "against a / meter.". Slide 13 has "$25 / per machine per month". Slide 12 has "€10 to €14 / per machine". Slide 17 has "$0.10 per / gram". Slide 11 has "relay / open.". Slide 16 has "Wi-Fi / on". Slide 8 is covered in item 4, slide 7 in item 1 and slide 2 in item 6.
    * **Fix:** use no-break spaces (` `):
      * slide 9: "gas fitter" and "a meter.";
      * slide 13: "$25 per machine per month";
      * slide 12: "€10 to €14 per machine";
      * slide 17: "$0.10 per gram";
      * slide 11: "relay open.";
      * slide 16: "with Wi-Fi on".

11. **Slides 2 to 5: source lines jump between positions and sizes.**
    * **What is wrong:** the source lines sit at y 6.35 on slide 2, 6.5 on slide 3, 6.35 at 11 pt on slides 4 and 5, and 6.55 at 10 pt on slides 7 to 9. Clicking through, the bottom line visibly hops.
    * **Fix:**
      * Slide 2: per item 6.
      * Slide 3: call `source()` with the default y (6.55) instead of 6.5.
      * Slides 4 and 5: replace the two `text(...)` calls (lines 281 and 296) with `source(s, "...")`, which gives 10 pt at y 6.55.

12. **Appendix slides 13, 14 and 17: half empty cards and mixed bullets.**
    * **What is wrong:**
      * The cards on 13 and 14 are 3.9 in and 3.0 in tall, but their content ends about 1 in higher, so they look unfinished when a question brings them up.
      * On 14 the bullet dots touch the text at 15 pt.
      * Slide 17 uses the default small bullet while every other list uses the ● bullet.
    * **Fix:**
      * Slide 13: cards h 2.95. Move "Small: ..." to y 3.75, h 0.55.
      * Slide 14: cards h 2.3. Move the paragraph to y 4.15. Bullet indent 14 changes to 20.
      * Slide 17: `bullet: { code: "25CF", indent: 20 }`.
