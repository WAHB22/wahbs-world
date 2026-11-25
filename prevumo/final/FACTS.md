# Loop 4: every number, checked

Checked on 24 and 25 November 2026 (Ottawa time) by reading the source itself, not a summary. Firecrawl was out of credits, so pages were read directly or through web search, and the Fab Lab counts were computed from the Fab Foundation's own data.

## Used on slides (verified)

| Claim on the slide | Source | What the source says |
| --- | --- | --- |
| 2,032 active Fab Labs worldwide, 29 in Canada, 182 in the US | Fab Foundation, fablabs.io lab list: https://api.fablabs.io/0/labs.json | 2,900 labs listed; 2,032 have `activity_status: active`; of those, country CA: 29, US: 182 (our count of the official data) |
| 1,858 of those 2,032 list laser cutting (2,009 list 3D printing) | same file | `capabilities` contains `laser` for 1,858 active labs, `three_d_printing` for 2,009 |
| More than 2,000 makerspaces and Fab Labs in the US | Nation of Makers: https://www.nationofmakers.us/working-groups | "there are more than 2,000 makerspaces and Fab Labs in communities, schools, libraries and museums" |
| Makerspaces bill filament by the gram, about $0.10 | University of Regina Library: https://uregina.libanswers.com/Policies/faq/207817; Pickering Public Library: https://pickeringlibrary.ca/wp-content/uploads/sites/76/2024/12/Maker-Space-Pricing_December-2024.pdf | Regina: "10 grams of filament costs $1.00", charged to the patron's PaperCut account. Pickering: "3D Printing $0.10 per gram" |
| A MIG welder from about $1,700 (US) | Cyberweld, Millermatic 211 PRO: https://store.cyberweld.com/products/millermatic-211-pro-mig-welder-907839 | "Cyberweld Price $1,699.00" |
| A laser cutter about $8,000 (US) | Glowforge shop, Pro HD: https://shop.glowforge.com/products/glowforge-pro-hd | "Regular price $7,999.00" |
| Lasers: ventilation on before use, and always attended | CMU EHS laser cutter guideline v.11: https://www.cmu.edu/ehs/Guidelines/ehs-guideline-laser-cutter-safety-v.11.pdf | "Ventilation controls must be turned on prior to laser cutter operation"; the cutter "will be always attended when operating" |
| Lasers: never left alone | MIT EHS laser cutter guidance: https://ehs.mit.edu/wp-content/uploads/MITEHS_Laser_Cutter_Guidance.pdf | "Never leave an operating laser cutter unattended." |
| The 15 minute tap | our own design choice, not a published rule | say so if asked |
| A CO2 laser tube wears out with heat | FLUX (laser maker), "Extend CO2 laser tube lifespan": https://flux3dp.com/extend-co2-laser-tube-lifespan/ | "Why Temperature Is the #1 Lifespan Killer"; "When the tube runs hot, you need more power to get the same cut, accelerating wear." |
| A printer nozzle runs at over 200 °C | Prusa Knowledge Base, PLA: https://help.prusa3d.com/article/pla_2062; PETG: https://help.prusa3d.com/article/petg_2059 | PLA "215 °C for the first layer, 210 °C for other layers"; PETG "240 °C for the other layers" |
| Argon and CO2 shielding gases are simple asphyxiants; low oxygen is 19.5% or less | CCOHS, welding gases: https://www.ccohs.ca/oshanswers/safety_haz/welding/welding-types-of-compressed-gases.html; CCOHS, simple asphyxiants: https://www.ccohs.ca/oshanswers/chemicals/howto/asphyxiants.html | Argon shielding gas: "Simple asphyxiants, Category 1 … May displace oxygen and cause rapid suffocation"; "Low oxygen levels (19.5 percent or less) can cause symptoms such as rapid breathing …" |
| Fabman: €49 to €199 a month plus €10 to €14 per machine; the Bridge is €249 with an NFC reader, dead man control and idle detection | Fabman pricing: https://fabman.io/pricing; Fabman shop: https://shop.fabman.io/products/fabman-bridge-v2 | "Basic € 49 / month … € 14 / mo. per integrated equipment"; "Plus € 199 / month … € 10 / mo."; Bridge "Regular price €249.00 … integrated dead man control system prevents unattended operation … busy/idle detection based on the power consumption" |
| Printer monitoring software costs a few dollars a printer | Obico: https://www.obico.io/blog/is-obico-free-pricing-guide/ | Free for 1 printer; "AI Premium plan at $6.99/month (billed annually) … Additional printers are $2/month each" |
| In Ontario, approval comes before any use | ESA, recognized approval marks: https://esasafe.com/electrical-products/recognized-certification-marks/ | "Before an electrical product or piece of electrical equipment is used, sold, displayed or advertised for sale in Ontario, it must be approved by an accredited certification or evaluation agency." |
| The number of Fab Labs has doubled about every two years; more than 2,500 today in 125 countries | MIT Global, "How MIT's fab labs scaled around the world": https://global.mit.edu/news-stories/how-mits-fab-labs-scaled-around-the-world/ | Gershenfeld: "the number of fab labs was doubling roughly every two years"; "more than 2,500 centers across 125 countries" (the fablabs.io list shows 2,032 marked active, which is the number on our slides) |
| Fabman has an open API, so PREVUMO can connect to it | Fabman for education: https://www.fabman.io/education; API: https://github.com/FabmanHQ/fabman-api | "Fabman's full functionality and data are available through our open JSON API" |
| Funding: uOttawa Startup Garage | Startup Garage circuits: https://startupgarage.ca/support | RevUp Circuit ends with an Exhibition Day "to win cash prizes"; the Exploration Circuit offers "grant funding, mentorship, workspace"; "All participating companies must be incorporated and either pre-revenue or within their first 12 months of sales" |
| Funding: NRC IRAP | NRC: https://nrc.canada.ca/en/support-technology-innovation/financial-support-technology-innovation | the business must "be incorporated, for-profit, and operating in Canada" |
| Funding: Futurpreneur | Futurpreneur Startup Program: https://futurpreneur.ca/en/offering/core-startup/ | "A flexible, equity-free loan up to $75,000"; "between 18 and 39 years old" |

## The team's own evidence (from GA3 and PD B3, not checkable online)

* **GA3 discovery:** 10 interviews, 49 outreach emails and 6 competitors reverse engineered (GA3 deck, Oct 21 to 23, 2026).
* **Electricity billing:** "Every owner we asked builds electricity into rent or membership." Three owners were asked: an Ontario makerspace and two shared kitchens, in Manitoba and Toronto.
* **Quote:** "Managing equipment is one of the biggest tasks we have." (Ontario makerspace executive director, anonymized.)
* **Quote:** "I pay all the electricity and build that price into my monthly rent. Simple, easy, fair." (Manitoba shared kitchen owner.)
* **Cafés:** cafés were not interested, so the team left them (PD B3 report, section 1).
* **Yukonstruct:** "we wouldn't want it to be a personal code, we would want it to be an NFC fob." (Oct 27. The contact is not named anywhere public: decision 3 in DECISIONS.md.)
* **Free pilots:** makerspaces and Fab Labs open to a free pilot. Wahb's account; no names or emails are on file in the repo, so the deck calls it interest, and the team must be ready to name them.

## The team's own evidence, round 2 and 3 (PD B4 and PD B5, Nov 2026, not checkable online)

* **PD B4:** the concept went to more than a dozen makerspaces and Fab Labs in Canada, the US and Europe; 8 written replies and 2 owner interviews. MakerLabs accepted a free 30 day pilot; NIHERST would pilot once a working prototype exists; both interviewed owners would consider a 30 day trial after a safety review. Maintenance records came up unprompted (InterAccess, NIHERST). Cloud control was challenged (Edinburgh Hacklab, Harbour Bench). Both interviewed owners had found a regulator left open; Edinburgh warned that a leak sensor on a TIG welder would false alarm.
* **PD B5 (10 interviews):** an extraction failure, about $700 and two days lost (a site manager); a clogged laser filter, most of a weekend lost (a program manager); a board approves anything over about $500 and expects $200 to $300 per machine for hardware (a director); a $1,800 spindle repair took four days to approve, one avoided repair a year is worth about $1,500 (a director); a monthly fee counts as a service contract (a lab); an electrician needs CSA certification and never bypasses the e-stop, $150 to $250 for 120 V and $400 to $800 for 240 V; a gas fitter calls a solenoid valve routine at $150 to $300 a welder and prefers an idle flow check on TIG; a repair technician lost four days and $450 to a laser pump; a treasurer wants a monthly report of repairs avoided, and the insurer's written yes.
* **On slides:** names of people are withheld; MakerLabs, NIHERST and the other spaces are named only in the Q&A, so the team can answer "name one".

## GA5 Financial Snapshot (team's model, US dollars, sources listed in GA5)

* **Price, pack of 4:** $575 installation + $73.50 a month for 24 months ($441 a module) + $40 a month per space, after a free 30 day pilot. Year 1 $1,937; three years $3,779.
* **Cost:** welder module about $297 (sourced parts $221.66, checked: Adafruit ESP32-S3-DevKitC $17.50, Digi-Key DPE25BL contactor $55.68); others about $290; parts per pack $1,160; installation $565; shipping $13; warranty $58; total $1,796. Margin about 52%; payback month 11.
* **One time:** certification about $8,000; incorporation $235. **Yearly:** $2,204 fixed.
* **Plan:** 6, 8 and 9 packs (23 spaces, 5% of 460 US makerspaces); year 1 $19,589 loss, year 2 $1,902 loss, year 3 $4,968 profit; lowest cash about $23,308; low case year 3 loss $594; high case year 3 profit $10,159.
* **Market base:** Make, "How many makerspaces?" (https://makethings.make.co/p/many-makerspaces): "The directory lists 716 makerspaces, 460 of which are in the US"; "you could estimate 3300 such spaces worldwide" (read with Firecrawl, Nov 25, 2026).

## Dropped (cannot be verified for makerspaces, or could not be read)

* **$754 average emergency repair call:** 86 Repairs restaurant data.
* **"Predictive maintenance saves 30 to 40%":** U.S. DOE, about industrial facility programs.
* **$600 to $6,000 per member:** a team estimate with no source.
* **31 shared kitchens in Ontario, and "restaurants use 5 to 7 times more energy":** kitchens are out of scope now.
* **138 makerspaces in Canada's 79 largest municipalities:** Vinodrai, Nader and Casey, City, Culture and Society (2026), doi:10.1016/j.ccs.2026.100691. The article exists, but its text could not be read (the publisher refuses automated reads), so the number stays out.
* **Epilog Fusion Edge 12 at $16,890:** no official price found.
* **Grey Bruce Makers at $0.10 a gram, weighing spools by hand:** no public page found. It was in the PD B3 brief, so it can be said aloud as a team finding, but it does not go on a slide.
* **Active hackerspace counts (hackerspaces.org):** the wiki refused the automated read.

## Changes this made to the script

* **Slide 3:** "a 3D printer sits at two hundred and fifty degrees" becomes "a 3D printer's nozzle stays above two hundred degrees".
* **Slide 7:**
  * "machines worth seventeen hundred to seventeen thousand dollars" becomes "from a seventeen hundred dollar welder to an eight thousand dollar laser".
  * "spaces already bill ten cents a gram and weigh spools by hand" becomes "spaces like the University of Regina already bill ten cents a gram".
* **Slide 8:** the 138 Canadian makerspaces are out; it uses 2,032 active Fab Labs (29 in Canada), more than 2,000 makerspaces and Fab Labs in the US, and 1,858 Fab Labs with a laser cutter.
