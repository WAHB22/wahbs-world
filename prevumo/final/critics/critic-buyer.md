# PREVUMO red team: the buyers in the room

Personas: (U) university makerspace manager, (N) volunteer board member of a non profit makerspace, (L) public library Fab Lab coordinator.

## 1. Twelve objections, ranked

**1. (U) "Fabman already does most of this, and your slide says it only knows who switched the machine on."** Severity 5. FIX.
The Fabman Bridge (€249) has an NFC reader, a power monitor and a dead man control ([shop](https://shop.fabman.io/products/fabman-bridge-v2)). It turns idle machines off ([help](https://help.fabman.io/article/22-idle-busy)), asks members to swipe again during long jobs ([help](https://help.fabman.io/article/37-fabman-bridge)), and has exhaust filter and enclosure inputs ([help](https://help.fabman.io/article/21-bridge-hardware-settings)). Anyone who knows Fabman will see the slide as wrong.
Answer: "Fabman covers access and idle shutoff well. We add sensors made for each machine: wire and filament weighed per member, a welder gas check around the clock, coolant and flame checks on the laser. We could run as an add on to Fabman through its open API."

**2. (All) "Which makerspaces said they'd pilot it? Name one."** Severity 5. ADMIT.
All PD B3 interview sheets are blank and no pilot offer is written down. Say "many wanted to run it for free" and the first question is "who?"
Answer: Say it only if you can name the people and show the emails. If you can't: "We haven't signed a pilot yet. Getting one is our next step."

**3. (U) "I can't plug an uncertified box into university equipment."** Severity 5. ADMIT, then FIX.
Ontario O. Reg. 438/07: "No person shall use, advertise, display, sell" an electrical product unless it is approved ([law](https://www.ontario.ca/laws/regulation/070438)). That covers a free pilot too.
Answer: "The first pilot would only watch. It uses clamp sensors and scales, runs on a certified adapter, and switches nothing. The relay, contactor and valve come later, after certification or an ESA field evaluation."

**4. (U) "You've measured nothing. How do you know current data catches any failure?"** Severity 4. ADMIT.
Every chart in the demo is simulated. "Learned normal band" is only an idea until a machine has been logged.
Answer: "We don't know yet. That's what the pilot is for. We'll log real machines for a term and count every alert, the true ones and the false ones."

**5. (N) "Who fixes it when your group graduates?"** Severity 4. ANSWER.
A volunteer space can't afford hardware that nobody supports.
Answer: "In the pilot the boxes are free and come out in minutes. We'll publish the wiring and firmware so you're never stuck with a dead box." Promise only what the team will actually do.

**6. (U) "My MIG already has a gas solenoid. Which gas does your leak sensor even detect?"** Severity 4. FIX.
A welder's own solenoid "is usually closed when powered down" ([WeldingWeb](https://www.weldingweb.com/threads/mig-gas-stays-on-when-trigger-is-released.721795/)). A valve downstream of the regulator can't stop a leak at the cylinder or the regulator. The HSE source the team cites, EIS45, is about asphyxiation: argon "will form dense, low-lying layers", and spaces should be "tested for oxygen concentration" ([HSE EIS45](https://www.hse.gov.uk/pubns/eis45.pdf)).
Fix: use an oxygen depletion sensor mounted low, add a reminder to close the cylinder at end of day, and say clearly where the valve sits. Fill in the EIS45 row in the report.

**7. (U) "A spaghetti print keeps pulling filament, so your weight check misses the most common failure."** Severity 4. FIX.
Bambu printers already detect spaghetti on board ([Bambu wiki](https://wiki.bambulab.com/en/knowledge-sharing/Spaghetti_detection)). Third party control needs LAN mode with Developer Mode switched on ([Bambu wiki](https://wiki.bambulab.com/en/software/third-party-integration)), so a "USB link" won't work on every printer.
Answer: "Weight catches clogs and runouts. Cameras catch spaghetti. We'd read what the printer already reports, and keep the scale for billing."

**8. (U, L) "Tap out pause only catches honest people. The one who walks away never taps out."** Severity 4. FIX.
Fix: ask the member to tap again during the job (Fabman does this) or add a presence sensor at the laser. Even Trotec says its lasers "must not operate unattended despite the integrated temperature sensors" ([manual](https://www.troteclaser.com/static/pdf/speedy-360/8069-speedy-360-operating-manual-EN_01.pdf)).

**9. (U, N) "$25 a machine a month for 20 printers is $6,000 a year."** Severity 4. ANSWER.
That's the team's own price, and it costs more than Fabman's €10 to €14 per integrated machine ([pricing](https://fabman.io/pricing)). The $754 repair call figure comes from commercial repair data, not from makerspaces.
Answer: "The price isn't validated. Start with the two or three machines where a failure is dangerous or expensive, the welder and the laser, not every printer."

**10. (U) "Another trained list, new fobs, and I already bill through 3DPrinterOS."** Severity 3. FIX.
3DPrinterOS already charges per gram, refunds failed prints, and bills through PaperCut, Stripe or CBORD ([3DPrinterOS](https://www.3dprinteros.com/)).
Fix: read existing campus cards and import the trained list instead of keeping a second one.

**11. (U) "Who pays when your box kills a 14 hour print or stops a weld halfway?"** Severity 3. ANSWER.
Answer: "Outside a safety event, the box never acts on its own. The owner sets the rules, and every action is logged with its reason. Liability terms come with certification, and lawyers write them, not us."

**12. (L) "I can't send which patron used which machine to your cloud."** Severity 3, a deal breaker for a library. FIX.
The ALA counts "records about using library resources, services, programs, or facilities" as confidential ([ALA](https://www.ala.org/advocacy/intfreedom/librarybill/interpretations/privacy)).
Fix: an anonymous mode that logs the machine and its use but no person, with data kept on site and a short retention period.

## 2. What already exists

* Fabman: €49 to €199 a month plus €10 to €14 per integrated machine ([pricing](https://fabman.io/pricing)). Bridge €249, with access, power monitoring, idle shutoff, dead man control and interlock inputs.
* 3DPrinterOS: print queue, AI failure detection and per gram billing. Premium is $19 a month for 2 printers ([site](https://www.3dprinteros.com/)).
* Obico: camera AI that pauses failed prints. Free for 1 printer, AI Premium about $6.99 a month billed yearly ([pricing](https://www.obico.io/blog/is-obico-free-pricing-guide/)).
* OctoPrint Autoprint: turns the printer off after a print, "with the option to wait for a proper cool down" ([plugin](https://plugins.octoprint.org/plugins/autoprint/)). Spoolman: open source filament tracking ([GitHub](https://github.com/Donkie/Spoolman)).
* Bucknell Portal Box: open source access control and use tracking ([site](http://portalbox.blogs.bucknell.edu/)).
* Ruida laser controllers already have a water protection input ([manual](https://www.ruidacontroller.com/wp-content/uploads/2021/10/RDC6432G-control-system-user-manual-V1.1.pdf)).

**The one thing nobody else does:** the welder module. None of these weighs wire per member, watches shielding gas around the clock when nobody is there, and ties both to the fob. Everything else PREVUMO offers exists already, mostly cheaper. Lead with the welder and the laser, and say that honestly.

## 3. What gets a yes to a free pilot next term

* **(U) University manager.** A watch only box on one welder and one laser, signed off by EHS and IT, using campus cards. First: a bench prototype logging a real machine, a one page table of what the box does when it loses power or Wi-Fi, and an install that voids no warranty.
* **(N) Non profit board member.** Zero cost, one volunteer installs it in under an hour, removable, open documentation. The hook is grams billed accurately instead of spools weighed by hand. First: the scale checked against a kitchen scale, and a plain statement for their insurer.
* **(L) Library coordinator.** Anonymous mode, no camera, data kept on site, staff override. First: a privacy statement their board can approve, and proof that machines left on at closing get caught.

## 4. Daily friction and what the design must do

* **Forgotten or lost fob.** Accept campus and library cards, and give staff a logged override. Fabman also lets members switch on with a phone ([help](https://help.fabman.io/article/52-members-equipment-switch-on-phone)).
* **Buddy tapping.** One trained fob unlocks the machine for an untrained friend. Show the name on the display, ask for taps again during long jobs, and flag repeat patterns for review.
* **Lockouts at 9 pm with no staff.** "Nothing restarts on its own" leaves the machine dead until morning. Safety stops need someone on site; an idle shutoff clears with the next trained tap; the owner clears the rest from the app with a reason.
* **False alarms.** Learning during an exam rush learns the wrong normal. Bundle repeat alerts, send only safety alerts at night, and show the owner the false alarm rate.
* **A print paused wrongly.** Vase mode and tiny parts barely move the scale. Pause only when two signals agree, tell the member first, let them resume at the box, and never cut power to a hot nozzle.
* **Gas valve closing mid weld.** Fitting and grinding look like idle time. Count idle from the last arc, never close while current flows or during post flow, and beep with a countdown that a tap extends. Only the oxygen sensor can close it on its own.
* **Wi-Fi or cloud down.** Keep the trained list and every interlock on the box; buffer logs. A rebooting box must not cut a running print.
* **Workarounds.** Members plug straight into the wall or jumper the enable line. Flag busy machines with no sessions; seal the box.
