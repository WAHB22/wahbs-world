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
* **"Is a free pilot legal?"** Approval comes before any use in Ontario, so the first pilot only watches and switches nothing. (A1)
* **"What does the welder sensor detect?"** Oxygen: argon and CO2 have no smell and sink, so it is mounted low, with an alarm at 19.5%.
* **"What if the power or Wi-Fi goes?"** Everything goes off and closed; safety stops live on the box; nothing restarts on its own. (A1)
* **"Can current tell a failing welder from a thicker plate?"** Not yet; anything beyond on, off and idle is a review, never a shutdown, until the pilot proves it. (A4)
* **"How much does it cost?"** Not validated; printers near software prices, the premium on lasers and welders. (A3)
* **"Isn't the market small?"** Yes, at first: about $3M a year in US makerspaces, as an estimate; campus and fabrication shops come next. (A3)
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

**8. "Can an uncertified box switch a 240 V welder, even in a free pilot?"** Show: A1.
* **Short:** No. In Ontario a product must be approved before it is used, not only before it is sold (ESA). So the first pilot only watches and switches nothing. Anything that switches comes after CSA approval or an ESA field evaluation, installed by a licensed electrician.

**9. "Argon and CO2 don't burn and have no smell. What does your sensor detect?"**
* **Short:** Oxygen. Argon and CO2 push the oxygen out and sink, so the sensor is an oxygen monitor mounted low by the cylinder, with an alarm at 19.5% (CCOHS).
* **Longer:**
  * Our valve protects only the hose and the welder; the cylinder is still closed by hand, and the box reminds the owner.
  * No sensor model is chosen or tested yet.

**10. "What happens if the power goes, the controller freezes, or the Wi-Fi drops?"** Show: A1.
* **Short:** No power or a frozen controller means everything off and closed: contactor open, valve closed, laser enable open. Trained lists and safety stops live on the box, so they work with no Wi-Fi. Nothing restarts on its own.
* **Honest limit:** a design requirement, not tested.

**11. "You wire into a certified laser's interlock. Doesn't that void the warranty, or make you its manufacturer?"**
* **Short:** We would only use an interlock input the laser's maker documents, with their written approval. Until then the laser module only watches and alerts.

**12. "Who is liable if your box kills a 14 hour print or stops a weld?"**
* **Short:** Outside a safety event the box never acts on its own: the owner sets the rules, and every action is logged with its reason. Safety stops are reset at the machine. Liability terms come with certification and are written by lawyers, not by us.

**13. "Cutting power to a hot printer stops its cooling fan."**
* **Short:** Right, so it doesn't. The box turns the heaters off over the printer link, lets the fans cool the nozzle, and cuts power only once it is cool.

**14. "The person who walks away from the laser never taps out."**
* **Short:** So during a job the box asks for a tap every fifteen minutes. A tap out, or a missed tap, pauses the job. Fabman does the same with its dead man control.

## The technology

**15. "How does current tell a failing welder from a thicker plate?"** Show: A4.
* **Short:** Today it can't, and we say so. A thicker plate needs more current. So we compare like with like at the same settings, and anything beyond on, off and idle is a review for the owner, never an automatic shutdown, until pilot data shows it works.

**16. "What's your false alarm rate?"**
* **Short:** Unknown; we have no data. It is the pilot's main number: false alerts per machine per month, with the owner labelling each alert.
* **Illustration if they push:** at 1% false per session, 10 machines and 5 sessions a day give one false alert every two days. That is why the first weeks only learn.

**17. "Two weeks of learning on a welder used three times a week is six sessions."**
* **Short:** Good point. Learning should count sessions and hours per mode, not days, and a technician check at install sets a known good start. Learning never switches off a safety stop.

**18. "A spaghetti print keeps pulling filament, so your scale misses it."**
* **Short:** True. The scale catches clogs, run outs and tangles, not spaghetti; cameras catch that. So we pause only when two signals agree, and we would read what the printer already reports.

**19. "Which printers accept a pause over USB?"**
* **Short:** Not tested. It depends on the model and its firmware. Some printers need their network mode switched on for outside control. Testing two models is in the bench plan.

**20. "How does the multimaker box lock only the laser?"**
* **Short:** It can't lock one tool. The member picks the mode, and in laser mode the box powers the machine only while the exhaust fan draws current. Detecting which head is fitted is untested.

## Business

**21. "Who pays, and how much?"** Show: A3.
* **Short:** Whoever runs the space. The price isn't validated. Our first round assumption was a $300 box and $25 per machine per month, but a flat price doesn't work for printers. Printers should be priced near monitoring software; the premium belongs on lasers and welders.

**22. "Why would a non profit makerspace pay at all, if it bundles everything into membership?"**
* **Short:** They already charge for material by the gram: the University of Regina charges $1.00 for 10 g. Protection of a $1,700 welder or an $8,000 laser is the other half. We have not yet asked anyone about a specific price; that is the first question for the next round.

**23. "Your market looks tiny."** Show: A3.
* **Short:** It is small at first: about 2,000 US makerspaces and Fab Labs, times about five machines, times $300 a year, is about $3 million a year, as an estimate. Makerspaces are where we prove it. Campus and college shops and small fabrication shops run the same machines, and that is where we'd grow.

**24. "What does a box cost to build? What's your margin?"**
* **Short:** We haven't costed it yet, so we won't quote a margin. A parts list per module, with the welder's install cost separate, is part of the next round.

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
