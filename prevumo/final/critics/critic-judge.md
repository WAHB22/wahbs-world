# PREVUMO final: the judges' red team

Checked online: HSE EIS45 covers asphyxiation in welding; Fabman Bridge FB-V2 (shop.fabman.io, EUR 249) has NFC, dead man control and idle detection from power; the $754 repair figure is 86 Repairs restaurant data.

## 1. The 12 attacks, most costly first

**1. "Your PD B3 report lists seven hypotheses and ten interview sheets, all blank. Which of H1 to H7 did you test with a makerspace?"**
Why: results and next steps say "[Fill in]". Discovery since Oct 23 is one conversation plus desk research.
Severity 5. FIX (interview before Friday), then ANSWER.
Answer: "One makerspace conversation changed the design: Yukonstruct asked for an NFC fob, so the keypad went. The other features rest on published rules and prices, so H2 to H7 are untested. This week we spoke to [exact count, only what happened]."

**2. "Your only supported finding, equipment left on every night, came from cafés. Then you dropped cafés. What says makerspaces have this problem?"**
Why: your own board. IEEE uOttawa invalidated per machine tracking, yet you now track grams per member.
Severity 5. ANSWER.
Answer: "Yes, that evidence came from cafés, and the cafés were not interested in a device [say who]. For makerspaces we have a director calling equipment one of their biggest tasks, and published laser rules (CMU, VanHack) requiring attendance and exhaust. Whether owners will pay is our next test."

**3. "Fabman Bridge already reads NFC per machine, blocks untrained members, has dead man control and idle detection from power, for EUR 249. What is left for you?"**
Why: that is your shared rules list; your old slide said Fabman only "knows who switched it on".
Severity 5. FIX the competitor slide; ANSWER.
Answer: "Fabman covers access, training lists and idle detection. Our difference is machine specific protection: gas closed outside a session, filament and wire weighed, exhaust, air, coolant and flame checks on the laser. We have not tested whether owners want that instead of Fabman or added to it."

**4. "Have you recorded the current of one real machine? How does a learned band tell a failing welder from a different job?"**
Why: the "simple idea" is electrical analysis and every curve is illustrative. Welder, laser and CNC current all depend on the job.
Severity 5. FIX (one real trace, section 4) and ADMIT.
Answer: "No, every chart is illustrative. Our first test logs a 3D printer's power over a print and the idle after. False alerts are the main risk, which is why the first two weeks only learn."

**5. "In one sentence: access control, safety interlock, material billing or predictive maintenance?"**
Why: you pitch electricity analysis, but the welder's value is a valve and a scale, the laser's four other sensors. Where is the maintenance?
Severity 4. FIX the opening line.
Answer: "A box per machine that lets only trained members run it, stops it when a known hazard appears, and logs who used what. Predicting failures needs data we do not have yet."

**6. "Five modules, about fifteen sensor types, nothing built. Which first, and why?"**
Why: breadth reads as no focus.
Severity 4. FIX: name it in the talk.
Suggested: "The printer module: the most common machine, two spaces already bill per gram, 120 V with no electrician, testable now. Welder and laser need an electrician, a gas fitter and interlock work first."

**7. "Who pays, how much, and has anyone said yes? If makerspaces only take it free, where is the business?"**
Why: $300 plus $25 a month predates modules with contactors, valves, scales and an electrician. "Willingness to pay" is blank on every sheet.
Severity 4. ADMIT.
Answer: "We have no willingness to pay data; the price is a first round assumption and no module is costed. Next: a parts list, and asking each interviewee to choose a paid pilot or none."

**8. "Shielding gas is argon and CO2. No smell, and it will not trip a combustible gas sensor. What does your leak sensor measure?"**
Why: your source EIS45 is about asphyxiation, yet the report says "[Fill in: what we used from it]" and the script asks about "a gas smell". The welder's own solenoid already stops gas between welds.
Severity 4. FIX the part name and report line.
Answer: "The risk is oxygen depletion, which EIS45 covers, so the part is an oxygen depletion monitor; no model chosen or tested. Our valve protects only the hose after the regulator."

**9. "Your laser pauses when the operator taps out. Whoever walks away does not tap out. How do you catch that?"**
Why: the page says "never left alone"; the design catches only rule followers.
Severity 4. FIX the wording; ADMIT.
Answer: "We don't. That needs a presence sensor or hold to run button, not designed, so the claim is now 'pauses when the operator taps out'."

**10. "Your uncertified box cuts power to a hot printer and switches a 240 V welder. Who is liable when it fails? And does cutting power at 250 °C stop the hotend fan?"**
Why: no fault analysis. Cutting power to a hot printer stops the heat break fan and can clog it. Firmware already has thermal runaway protection.
Severity 4. ADMIT; FIX the printer sequence.
Answer: "Concept only: an electrician installs switching parts, CSA comes before sale, no failure analysis yet. Safer printer order: pause and cool through the printer link, then cut power. Safety rules must run without Wi-Fi; a requirement, not tested."

**11. "How big is your market now? Your numbers are from restaurants."**
Why: $754, 31 Ontario kitchens and "5 to 7x energy" are restaurant data; the makerspace count was a [FILL IN].
Severity 3. FIX.
Answer: "We have no sourced count of makerspaces with welders or lasers yet [give one only with a link]. The repair cost came from restaurants, so we dropped it."

**12. "Your demo shows PINs, a chem lab with fridges and 7 day learning. Your report says fobs, makerspaces only, two weeks. Which is it?"**
Why: /software is PD B2. Reads as copy and paste.
Severity 3. FIX: show the PD B3 owner app; one learning period.
Answer: "The dashboard is our previous round. Today it is fobs, makerspaces only, two weeks of learning, and gas has its own sensor."

## 2. How this 5 minute talk fails

1. **Too much content.** Five modules, app, manual, history, market in 300 s. Fix: one module in depth (60 s); the other four as one strip, "same box, different sensors".
2. **The pivot becomes a travelogue.** Five segments, no why. Fix: one slide, three rows: what we believed, who told us otherwise (quote or count), what we changed. 30 s.
3. **Simulated looks measured.** Ticking charts and "Spiked to 2.3x" read as data. Fix: "illustrative" on every screen; say once aloud "nothing here is measured yet".
4. **No evidence slide.** Discovery is graded. Fix: H1 to H7 with honest status (one source, untested, invalidated) and counts.
5. **Nine beats, weak ending.** Fix: four beats: problem and pivot (1:00), product and one module (1:45), evidence and limits (1:15), next test with date and pass criterion (1:00). Keep a recorded fallback for classroom Wi-Fi.

## 3. Claims not to make on Friday

* "Many makerspaces and Fab Labs want to run it for free." Nothing records it. Only with a named space, person and email, and then "X offered to try it", not "many".
* Sponsors or partners. None exist.
* "Every machine lasts longer", "secure", "saves 30 to 40%" (DOE figure is industrial).
* "$754 average repair" for makerspaces.
* "Our AI detects failures before they happen", "works today", "live".
* "Never left alone", "certified", "safety device".
* "Interviews validated" anything beyond the fob.
* "Fabman only knows who switched it on."
* Any market size without a link.

## 4. What a top grade has, and what fits in 3 days

A top grade has tested hypotheses with counts, user tested prototypes, one real measurement, a costed first module and a next step written as a test. Doable by Friday:
1. **Interviews:** 3 to 5 calls or visits with uOttawa and Ottawa area makerspace staff, PD B3 script and pages. Report exact numbers, even two.
2. **One real trace:** with staff permission, an off the shelf energy monitoring smart plug on one 3D printer for a print and the idle after. Plot it beside the illustrative curve, labelled "one printer, one print".
3. **Usability test:** five people, owner app, two tasks (answer an alert; find a member's grams). Report completion.
4. **Parts list** for the chosen module from distributor prices with links; compare with $300.
5. **Fixes:** gas sensor type, tap out wording, printer cool down order, Fabman row, PD B2 demo, learning period, every "[Fill in]" in the report.
6. **Next step as a test:** for example, one printer module at one makerspace for four weeks; pass if the owner keeps it on after learning mode. A target, not a result.
