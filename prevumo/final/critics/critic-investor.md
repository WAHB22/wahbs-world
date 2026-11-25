# PREVUMO red team: the investor and accelerator coach

All links accessed 25 November 2026. "(excerpt)" means the figure was read in the official page's search excerpt only, because the research tool hit its daily limit; open the page yourself before it goes on a slide.

## 1. The 12 strongest business attacks, ranked

**1. "How many signed pilots, letters of intent or paying users do you have?"** Severity 5. ADMIT.
Why it hurts: the talk plans to say many spaces "were interested in running it for free", but the PD B3 interview sheets are blank and the report says "Concept only, not built or tested."
Answer: "None signed yet. Ten interviews and 49 emails shaped the design, but interest is not commitment. Next: one to three written pilots with a start date and a success measure."

**2. "Your market looks tiny. Show me the math."** Severity 5. FIX with the slide in section 2.
Why it hurts: at your own price, North American makerspaces add up to about $3M a year, which is too small for a venture fund.
Answer: "Bottom up, about 2,100 spaces in the US and Canada, times about 5 machines, times $300 a year is roughly $3.2M a year. Makerspaces are where we prove the product. The same printers, lasers and welders sit in school shops, college trades programs and small fabrication businesses, and that is where we would grow next."

**3. "Fabman already does this. Why you?"** Severity 5. ANSWER.
Why it hurts: Fabman sells card access, trained lists and per machine control from €10 a month per machine. Its Bridge reads "Busy/Idle status" and can "automatically shut down equipment when the filter fails". Fuse33 in Calgary is on its customer list.
Answer: "Fabman controls who can switch a machine on. We add what it does not list: a gas valve and leak sensor on the welder, grams of filament and wire per member, pausing a failed print over USB, and alerts when a machine's current drifts from its own normal band. Fabman has an open API, so we can sit next to it instead of replacing it."

**4. "$25 a month for a 3D printer? Obico charges $2."** Severity 4. FIX.
Why it hurts: printer monitoring costs $2 to $4 per printer per month (Obico, SimplyPrint), and Bambu gives its farm software away.
Answer: "Agreed: one flat price does not work. Printers should be priced close to that software. The premium belongs on lasers and welders, where the box adds interlocks, gas control and fire sensing. At $0.10 a gram, $25 equals 250 grams of filament a month that gets billed when it would otherwise be missed."

**5. "What does a box cost to build, and what is your margin?"** Severity 4. ADMIT, then FIX.
Why it hurts: the $300 box has no bill of materials behind it; the welder adds a contactor, gas valve and electrician.
Answer: "We have not costed it yet, so we will not quote a margin. Before Friday we will price each module's parts from distributor lists and give the welder's install cost separately."

**6. "How is 'data from free pilots' defensible?"** Severity 4. ADMIT.
Why it hurts: each machine learns its own normal band, so a few pilots give little data that can be pooled, and incumbents with installed devices have more.
Answer: "Today the data is a way to learn, not a moat. Pilot data tunes our defaults and cuts false alarms for each machine type. If we have a defence later, it would come from certified hardware, a tested rule set for each machine type, and owners trusting us to switch machines off."

**7. "Who signs the cheque at a volunteer nonprofit that bundles every cost into membership?"** Severity 4. ANSWER, then ADMIT.
Why it hurts: owners told you they bundle electricity into rent or membership. That is why per user billing died.
Answer: "Material is already charged for: Grey Bruce Makers and the University of Regina bill $0.10 a gram, and Grey Bruce weighs spools by hand. An Ontario director told us equipment is 'one of the biggest tasks we have.' We have not yet asked anyone about a specific price. That is the first question for PD B4."

**8. "Nothing is built. How do you know current predicts failure on hobby machines?"** Severity 4. ADMIT.
Why it hurts: every chart is illustrative. The DOE savings figure comes from facility maintenance programs, not desktop printers.
Answer: "We don't know yet. Next experiment: clamp one printer and one laser for two weeks and show the real curves and false alarm count."

**9. "You cut power to welders and control gas. Who is liable, and what does certification cost?"** Severity 4. ADMIT.
Why it hurts: CSA certification, electrician installs and insurer approval are slow, cost money and hold up sales.
Answer: "The design fails safe: the valve is closed without power, nothing restarts on its own, and a licensed electrician installs the contactor. We have not priced CSA certification or asked an insurer. Until we do, we don't know how long it takes to reach market."

**10. "Machine makers are building this in. Won't you get squeezed?"** Severity 3. ANSWER.
Why it hurts: xTool sells a $169 fire safety set for its own lasers, and Bambu Farm Manager is free.
Answer: "Those tools cover only their own brand. Makerspaces run mixed fleets: old CO2 lasers, welders with no electronics, several printer brands. For a new single brand fleet, the maker's tool may be enough."

**11. "$754 is restaurant data and $600 to $6,000 per member is your guess. Got any makerspace numbers?"** Severity 3. FIX.
Why it hurts: the $754 is 86 Repairs' figure for restaurant emergency calls. Using it here looks like borrowed evidence.
Answer: Replace it with machine and part prices. A Glowforge Pro HD is $7,999, an Epilog Fusion Edge 12 lists at $16,890, a replacement 80 W CO2 tube is $570 (excerpt), a Millermatic 211 PRO is $1,699 (excerpt), and a Prusa CORE One+ starts at $1,299 (excerpt). Drop the member value unless you can show the membership prices it comes from.

**12. "Five modules and none built. Where do you focus?"** Severity 3. FIX.
Why it hurts: five products at once signals no focus; hard wired modules become a services business.
Answer: "We start with the plug in modules, laser and printer, because they need no electrician and almost every lab has them: 1,858 of 2,032 active Fab Labs list laser cutting. The welder comes after certification."

## 2. Verified market slide

| Number | Source |
|---|---|
| 2,032 active Fab Labs worldwide: 29 in Canada, 182 in the US, 51 in Mexico (2,900 listed in total) | Fab Foundation's fablabs.io API, our count of `activity_status: active`, https://api.fablabs.io/0/labs.json |
| 854 active hackerspaces listed: 31 in Canada, 233 in the US | hackerspaces.org wiki, our count of "hackerspace status: active", https://wiki.hackerspaces.org/List_of_active_Hacker_Spaces |
| "Across the U.S., there are more than 2,000 makerspaces and Fab Labs in communities, schools, libraries and museums" | Nation of Makers, https://www.nationofmakers.us/working-groups |
| 138 makerspaces in Canada's 79 largest municipalities ("vision statements of 138 makerspaces in these cities") | Vinodrai, City, Culture and Society 45 (2026), https://www.sciencedirect.com/science/article/pii/S1877916626000044 |

**Estimate (team assumptions: 5 monitored machines per space, $300 per machine per year, plus a $300 box):**
* Canada beachhead: 138 × 5 = 690 machines × $300 = **about $207,000 a year**, plus $207,000 of boxes once.
* US and Canada: (2,000 + 138) × 5 = 10,690 machines × $300 = **about $3.2M a year**.
* Do not add the lists; they overlap (Grey Bruce Makers and Vancouver Hack Space are on fablabs.io).

**Where we go:** Canadian community makerspaces, then university, college and school shops, then small fabrication shops running the same machines.

Context only, not "our market": predictive maintenance was USD 12.14B in 2025 (MarketsandMarkets, excerpt) or USD 13.65B (Fortune Business Insights, excerpt), mostly industrial. No credible makerspace equipment market figure exists that I found; a LinkedIn claim of USD 1.8B is not credible.

## 3. Verified competitor table

| Product | What it knows or does | Price |
|---|---|---|
| Fabman | Card access, trained lists, booking, billing; Bridge reads busy or idle, interlocks an exhaust filter | Basic €49/mo plus €14/mo per integrated machine; Plus €199 plus €10; Bridge €249. https://fabman.io/pricing, https://shop.fabman.io/products/fabman-bridge-v2 |
| SimplyPrint | Printer fleet, AI failure detection, filament weight, "Maintenance dashboard"; Education plan "for schools, universities, libraries, makerspaces" | Education from $40/mo ($480 a year, 2 printers); Print Farm $39.99/mo for 10 printers. https://simplyprint.io/pricing |
| Obico | AI failed print detection, remote control | Free for 1 printer; $6.99/mo billed annually, plus $2/mo per extra printer. https://app.obico.io/ent_pub/pricing/ |
| Bambu Farm Manager | Local control of a Bambu fleet | "Everything in the current version ... is and will remain free to use." https://blog.bambulab.com/bambu-lab-introduces-local-fleet-control-with-bambu-farm-manager/ |
| Skedda | Who booked which space | Plus "Starting at $249/mo, Priced per space, Billed annually". https://www.skedda.com/pricing |
| Emporia Vue 3 | Circuit level energy use; does not know who used the machine | $199.99 (excerpt). https://shop.emporiaenergy.com/products/emporia-vue-3 |

What nobody in this table does, as far as we found: gas shutoff with leak sensing, grams per member, and alerts from each machine's learned current band, all across mixed brands. Say "as far as we found."

## 4. Talking about customers and sponsors honestly

Avoid "customers", "sponsors", "partners" and "pilots" unless something is signed. Wording that is true and still strong:

* "We have spoken with makerspace operators across Canada. Yukonstruct changed our design: they asked for an NFC fob, not a code, so we switched."
* "[N] of the spaces we spoke with said they would be open to testing a free version." Use the real count from your notes or emails, or leave the line out.
* "That is interest, not commitment. Our next step is to turn it into one to three written pilots, each with a start date, the machines covered, and what success looks like."
* "No sponsors yet. We are looking for a first host site and certification help."

## 5. Pricing and business model in two sentences

PREVUMO sells a box per machine plus a monthly fee per machine, priced by risk. Printers are priced close to the $2 to $4 that monitoring software charges, and lasers and welders cost more, because the box adds interlocks, gas control and fire sensing on machines worth $1,700 to $17,000. Each free pilot runs for a fixed period against a written success measure and then becomes a paid plan.

Still to validate: willingness to pay at each tier, the cost of parts and the margin, the welder install cost, CSA certification cost and time, the false alarm rate on real machines, and whether free pilots convert to paid.
