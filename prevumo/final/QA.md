# PREVUMO final: questions we expect, and our answers

Built from the four critics in loop 1 (`critics/`). Each answer is honest and invents nothing. Say the short answer first; add the longer one only if they push. "Show" names the appendix slide to jump to: A1 is slide 11, A2 slide 12, and so on to A7, slide 17.

## Who takes which question

* **A (the story):** the pivot, the interviews, which spaces were interested.
* **B (the hardware):** sensors, gas, the laser, fail safe, certification.
* **C (the software and the idea):** alerts, learning, false alarms, privacy.
* **D (the business):** customers, price, competitors, market.
* **E (what's next):** the bench test, the pilot, approval, timeline.
* **The rule:** if it isn't your area, pass it with one sentence ("B will take that"). Never guess a number. "We don't know yet; that's what the pilot measures" is a good answer.

## The ten likeliest, in one line each

* **"What have you tested?"** Nothing is built or measured yet; the interviews tested the problem, and the pilot tests the device. (A5)
* **"Why not Fabman?"** Fabman does access and idle shutoff; we add sensors made for each machine, and can sit next to it. (A2)
* **"Which spaces want a free pilot?"** Names only if we have them; otherwise interest, not commitment, and written pilots are the next step.
* **"Is a free pilot legal?"** Approval comes before any use in Ontario, so every pilot box is field evaluated by ESA, or certified, before it is installed, and it only watches. We haven't asked ESA yet. (A1)
* **"What does the welder sensor detect?"** Oxygen: argon and CO2 have no smell and sink, so it is mounted low, with an alarm at 19.5%.
* **"What if the power or Wi-Fi goes?"** Everything goes off and closed; safety stops live on the box; nothing restarts on its own. (A1)
* **"Can current tell a failing welder from a thicker plate?"** Not yet; anything beyond on, off and idle is a review, never a shutdown, until the pilot proves it. (A4)
* **"How much does it cost?"** Not validated; printers near software prices, the premium on lasers and welders. (A3)
* **"Isn't the market small?"** Yes, at first: at most about US$3M a year in US makerspaces, as an estimate; campus and fabrication shops come next. (A3)
* **"Do you have sponsors?"** No. We're looking for a first host site and help with certification.

## Evidence and progress

**1. "What have you actually tested?"** Show: A5.
* **Short:** Nothing is built or measured yet. The prototypes are interactive drawings and a clickable app with demo data. What we tested is the problem: ten interviews and forty nine emails in GA3, and conversations that changed the design.
* **Longer:**
  * Three owners told us they build electricity into rent, so billing went.
  * Cafés weren't interested, so we kept makerspaces.
  * Yukonstruct asked for an NFC fob instead of a code, so the keypad went.
  * The next step is a bench test, then a four week pilot that only watches.

**2. "Your PD B3 interview sheets are blank. Which of your seven hypotheses did you test?"**
* **Short:** Only the fob one has a real answer, from Yukonstruct. The others rest on published rules and prices, and they are what the pilot and the next interviews test.
* **Don't:** claim interviews that did not happen.

**3. "Which makerspaces want to run it for free? Name one."**
* **Short:** Use the real names and emails if the team has them.
* **If not:** "We heard interest, not a commitment. Turning that into one to three written pilots, each with a start date and a success measure, is our next step."
* **Don't:** say "many" without names.

**4. "Your only supported finding, equipment left on at night, came from cafés, and you dropped cafés."**
* **Short:** Yes, that came from cafés. For makerspaces we have a director calling equipment one of their biggest tasks, and published laser rules that require ventilation and attendance. Whether owners will pay is the next test.

## Competition

**5. "Fabman already does this. Why you?"** Show: A2.
* **Short:** Fabman is good at access: card readers, trained lists, billing, and its Bridge switches idle machines off from the power reading. As far as we found, it doesn't watch a welder's gas and wire, or a laser's airflow, coolant and flame. Fabman has an open API, so we'd sit next to it: their card, our machine sensors.
* **Numbers if asked:** Fabman is €49 to €199 a month plus €10 to €14 per machine; the Bridge is €249.

**6. "Printer software like Obico already catches failed prints for a few dollars."**
* **Short:** Agreed. For printers we should be priced close to that and read what the printer already reports. Our value is on the machines software can't see: welders and lasers.

**7. "Machine makers are building safety in (laser fire kits, farm software)."**
* **Short:** Those cover only their own brand. Makerspaces run mixed fleets: old CO2 lasers, welders with no electronics, several printer brands. For a new single brand fleet the maker's tool may be enough.

## Safety, certification, liability

**8. "Can an uncertified box switch a 240 V welder, even in a free pilot? And slide 9 puts approval before the pilot: is a watch only box exempt?"** Show: A1.
* **Short:** No, and no. In Ontario a product must be approved before it is used, not only before it is sold (ESA), and watching does not exempt it. So every pilot box is field evaluated by ESA, or certified, before it is installed; approved parts make that easier. The pilot boxes switch nothing. Anything that switches comes later, installed by a licensed electrician.
* **Honest limit:** we haven't asked ESA yet; that is part of step 2 on slide 9. Our PD B3 report said "before sale"; ESA says before use, so we changed it.

**9. "Argon and CO2 don't burn and have no smell. What does your sensor detect?"**
* **Short:** Oxygen. Argon and CO2 push the oxygen out and sink, so the sensor is an oxygen monitor mounted low by the cylinder, with an alarm at 19.5% (CCOHS).
* **Longer:**
  * The welder's own solenoid already stops gas between trigger pulls. Our valve only adds protection for the hose when nobody is signed in. It can't stop a leak at the cylinder or the regulator, which is why the oxygen sensor and "close the cylinder valve" in the manual matter more.
  * No sensor model is chosen or tested yet.

**10. "What happens if the power goes, the controller freezes, or the Wi-Fi drops?"** Show: A1.
* **Short:** No power or a frozen controller means everything off and closed: contactor open, valve closed, laser enable open. Trained lists and safety stops live on the box, so they work with no Wi-Fi. Nothing restarts on its own.
* **Honest limit:** a design requirement, not tested.

**11. "You wire into a certified laser's interlock. Doesn't that void the warranty, or make you its manufacturer?"**
* **Short:** We would only use an interlock input the laser's maker documents, with their written approval. Until then the laser module only watches and alerts.

**12. "Who is liable if your box kills a 14 hour print or stops a weld?"**
* **Short:** Outside a safety event the box acts only on rules the owner sets: the idle time, the laser's 15 minute tap, and a print pause when two signals agree. Every action is logged with its reason. Safety stops are reset at the machine.
* **If they ask "safety device or monitor?":** until it is certified and tested, nobody should rely on it. The welder's own controls, the cylinder valve, the laser's interlocks and the space's rules stay in charge. Whether our stops need safety rated parts, and the liability terms, need certification work and a lawyer; we haven't done that yet.

**13. "Cutting power to a hot printer stops its cooling fan."**
* **Short:** Right, so for a printer left heating it doesn't. The box turns the heaters off over the printer link, lets the fans cool the nozzle, and cuts power only once it is cool. An overheating enclosure is different: that is a fire risk, so power is cut first.

**14. "The person who walks away from the laser never taps out."**
* **Short:** So during a job the box asks for a tap every fifteen minutes. A tap out, or a missed tap, pauses the job. Fabman does the same with its dead man control.

## The technology

**15. "How does current tell a failing welder from a thicker plate?"** Show: A4.
* **Short:** Today it can't, and we say so. A thicker plate needs more current. So we compare like with like at the same settings, and anything beyond on, off and idle is a review for the owner, never an automatic shutdown, until pilot data shows it works.

**16. "What's your false alarm rate?"**
* **Short:** Unknown; we have no data. It is the pilot's main number: false alerts per machine per month, with the owner labelling each alert.
* **Illustration if they push:** at 1% false per session, 10 machines and 5 sessions a day give one false alert every two days. That is why the first weeks only learn.

**17. "Two weeks of learning on a welder used three times a week is six sessions."**
* **Short:** Good point. Today the design learns over two weeks; the next version should count sessions and hours per mode, not days, and a technician check at install sets a known good start. Learning never switches off a safety stop.

**18. "A spaghetti print keeps pulling filament, so your scale misses it."**
* **Short:** True. The scale catches clogs, run outs and tangles, not spaghetti; cameras catch that. So we pause only when two signals agree, and we would read what the printer already reports.

**19. "Which printers accept a pause over USB?"**
* **Short:** Not tested. It depends on the model and its firmware. Some printers need their network mode switched on for outside control. Testing two models is in the bench plan.

**20. "How does the multimaker box lock only the laser?"**
* **Short:** It can't lock one tool. The member picks the mode, and in laser mode the box powers the machine only while the exhaust fan draws current. Detecting which head is fitted is untested.

## Business

**21. "Who pays, and how much?"** Show: A3.
* **Short:** Whoever runs the space. The price isn't validated. Our first round assumption was a US$300 box and US$25 per machine per month, but a flat price doesn't work for printers. Printers should be priced near monitoring software; the premium belongs on lasers and welders.

**22. "Why would a non profit makerspace pay at all, if it bundles everything into membership?"**
* **Short:** They already charge for material by the gram: the University of Regina charges $1.00 for 10 g. Protection of a US$1,700 welder or a US$8,000 laser is the other half. We have not yet asked anyone about a specific price; that is the first question for the next round.

**23. "Your market looks tiny."** Show: A3.
* **Short:** It is small at first: about 2,000 US makerspaces and Fab Labs, times about five machines, times US$300 a year, is at most about US$3 million a year, as an estimate; the flat price is an upper bound. The US is the only verified count; Canada has 29 active Fab Labs. Makerspaces are where we prove it. Campus and college shops and small fabrication shops run the same machines, and that is where we'd grow.

**24. "What does a box cost to build? What's your margin?"**
* **Short:** We haven't costed it yet, so we won't quote a margin. What drives the cost is clear: a printer box is a controller, a fob reader, a display and a scale; the welder adds a contactor, a gas valve and an oxygen sensor, installed by an electrician. So the printer box should sit near software prices and the welder box is the expensive one. Pricing each module's parts list at one distributor comes before the pilot.

**25. "Is 'data from free pilots' a moat?"**
* **Short:** Not by itself. Pilot data tunes our defaults and cuts false alarms per machine type. If we have a defence later, it would come from certified hardware, a tested rule set per machine type, and owners trusting us to switch machines off.

**26. "Do you have sponsors?"**
* **Short:** No sponsors yet. We're looking for a first host site and help with certification.

## Privacy

**27. "A library can't send which patron used which machine to your cloud."**
* **Short:** Fair: libraries treat that as confidential. An anonymous mode would log the machine and its use but no person, keep the data on site, and keep it only for a short time. Not built yet.

## If something goes wrong on the day

* **A film doesn't start:** click it once. If PowerPoint shows no video at all, open prevumo.vercel.app/hardware or /software in a browser and keep talking.
* **The Wi-Fi is down:** the films are inside the deck, so nothing needs the internet. Only the QR on the last slide does.

## From the panel rehearsal (loop 10)

**28. "I scanned your QR. The dashboard said uOttawa Engineering. Is uOttawa a customer?"**
* **Short:** No. That was a demo account name in our earlier PD B2 dashboard. It now says "Demo account" and is marked as an earlier version; the current design is the owner app.

**29. "Your app says Priya was at the welder when the oxygen dropped. What warns her in the room?"**
* **Short:** Today, the display and the light on the box, and the owner's phone. That isn't enough for the person in the room.
* **Next:** a loud local alarm, and backup power so the oxygen sensor keeps watching when the welder's line is off. Neither is designed yet.

**30. "Of your ten interviews, how many were makerspaces? Did anyone tell you about an actual leak or fire?"**
* **Short:** The ten covered a makerspace, two shared kitchens, manufacturing, café staff and a university student office; later came Yukonstruct.
* **On incidents:** the hazards on slide 3 come from published safety rules (CMU and MIT for lasers, CCOHS for gas, Prusa for nozzle heat), not from incidents owners reported to us. The pilot's alert log will show how often they happen.

**31. "People get hurt on table saws and lathes. Why welders and printers? And can't a member just plug the printer into the wall?"**
* **Short:** We chose machines whose hazard shows up in a sensor or the power draw, and where spaces already bill material. A box can't see a hand near a blade. We have no injury data by machine type, and we should get it.
* **On the bypass:** yes, a printer can be bypassed. The welder's contactor and the laser's interlock are wired in by an electrician.

**32. "In a Fabman space, why does every box have its own fob reader?"**
* **Short:** Fair point: there it would duplicate theirs. That version of the box should take the member from Fabman's open API instead. We haven't designed it yet.

**33. "What pilot result would make you stop?"**
* **Short:** If the owner switches it off or ignores the alerts, or no owner will name a price, we stop or change course. We'll write the false alert limit down before the pilot starts.

**34. "What physically exists? Did you power on a single sensor?"**
* **Short:** Nothing is built or powered yet. What we engineered is the design: where each sensor goes, how every output fails safe, and tests with pass rules written first. The cheapest test of the core idea is one real printer's power trace, and it comes first.

**35. "What changed since PD B3?"** Show: A5.
* **Short:** Four things, each from a source or a critic. The gas leak sensor became an oxygen sensor, because an argon or CO2 leak has no smell (CCOHS). "Certified before sale" became "approved before any use", because that is what ESA says. A failed print now needs two signals to agree, and the printer cools down before it is switched off. The exhaust clamp became an airflow switch in the duct, because a fan can run with the duct blocked.

## From the gatekeeper (loop 14)

**36. "A US$20 smart plug logs power and switches off idle machines. Why you?"** Show: A2.
* **Short:** For on, off and idle, a smart plug is close, and it is our first bench test. It can't see oxygen, airflow, coolant, a flame, grams of material or who is on the machine, and it can't carry a 240 V welder.

**37. "Why drop kitchens and restaurants?"**
* **Short:** We never tested monitoring with kitchens; in our interviews, owners bundle electricity into rent and cafés weren't interested, while makerspaces showed the most pull. One customer, done well, before a second.

**38. "You say machines last longer. How?"**
* **Short:** By catching the misuse that wears them out: a laser run with no coolant or exhaust, a nozzle left hot, hours on with nobody working. That is an aim; we have no data yet, and the pilot's log is where it starts.

**39. "How is each machine's normal band set?"** Show: A4.
* **Short:** Per machine and per mode: the range of current seen while learning, plus a margin the pilot tunes. No method is chosen or tested yet; anything outside the band is a review for the owner, never a shutdown.

**40. "Why is the welder your star if it comes last?"**
* **Short:** Its hazard is invisible and nobody watches it today: a leak has no smell. It is also the hardest to install, with an electrician and a gas fitter, so it comes after the printer and laser boxes prove the idea.
