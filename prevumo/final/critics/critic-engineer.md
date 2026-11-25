# Red team: safety engineer, gas specialist, current signature data scientist

Brackets point to sources at the end, all opened or returned by search on 25 Nov 2026.

## 1. Twelve attacks, ranked

**1. Which gas does the leak sensor detect, and does the valve stop the leak? (Severity 5, FIX)**
Attack: "Argon and CO2 do not burn, so a combustible gas sensor sees nothing. And a leak at the cylinder or regulator is upstream of your solenoid."
Why: CCOHS lists both as non flammable, odourless simple asphyxiants and says to check oxygen with a monitor [1][2]. MIG welders already have a gas solenoid [3].
Answer: "The right sensor is an oxygen depletion monitor, mounted low near the cylinder, alarming at 19.5% oxygen [2]. Our valve only protects the hose and welder, so we will test a regulator inlet pressure sensor that shows a cylinder left open."

**2. Power loss or a frozen ESP32 (5, FIX)**
Attack: "What if the firmware hangs with the relay pin high? Who stops a flame then?"
Why: A hung processor leaves the machine on and unwatched while the app shows the last good reading.
Answer: "No power means safe: contactor open, valve closed, laser enable open, relay open. We will add an external watchdog that drops every output if the firmware heartbeat stops, and put hard limits on hardware trips. After a reboot, outputs stay off until a fob tap."

**3. Modifying a certified laser (5, FIX)**
Attack: "A relay in a certified laser's enable line modifies it. Who recertifies it, who covers the warranty, and does opening the line pause the job or just cut the beam while the head moves?"
Why: A business that modifies a certified laser's performance is treated as its manufacturer and must recertify it [4].
Answer: "We will only use an interlock input the maker documents, with written approval. Until then the laser module monitors and alerts only, and we stop saying 'pause' until we have tested it."

**4. Is a free pilot legal? (5, FIX)**
Attack: "You say certification is needed before sale. Can an uncertified box switch a 240 V welder in a free pilot?"
Why: In Ontario a product must be approved before it is used, sold, displayed or advertised [5].
Answer: "Approval is needed before use. Pilot units will use certified parts in a certified enclosure, each field evaluated, wired by a licensed electrician with the supply tap fused."

**5. Laser sensors measure the wrong thing (4, FIX)**
Attack: "Fan current does not prove air moves: the duct can be off. A return hose thermometer misses a stopped pump. Flare ups are routine, so your flame sensor pauses every acrylic cut."
Why: A tube run without circulating water breaks immediately [6]. Air assist only reduces flare ups [7].
Answer: "We will sense the real quantity: a duct airflow switch, a coolant flow switch with temperature as backup, and a flame rule needing a sustained signal, tuned on real cuts."

**6. Current alone cannot tell a failing welder from a thicker job (4, ADMIT)**
Attack: "1/4 inch plate needs about twice the current of 1/8 inch. How do you know it is the machine?"
Why: Miller's rule is one amp per 0.001 inch [8]. In one current channel, a job change looks like a fault.
Answer: "It cannot. We will compare like with like: same settings, entered or read from the machine, watching slow drift and idle draw, which does not depend on the job. Until validated these are review flags, never shutdowns."

**7. Measuring MIG current at all (4, FIX)**
Attack: "Inrush, an arc that starts and stops, distorted inverter current, welding noise. Where does the clamp go, and does the ESP32 read it with Wi-Fi on?"
Why: A clamp must enclose one conductor; around a cord the fields cancel [9]. ESP32 ADC2 is unusable once Wi-Fi starts, and the ADC is noise sensitive [10].
Answer: "One conductor inside the electrician's enclosure, read by ADC1 or a metering chip as true RMS. We skip the seconds after switch on and use arc on time as the main feature, then test beside a running welder."

**8. Printers: USB, power cuts, the weight rule (4, FIX)**
Attack: "Which printers accept a USB pause? Cutting power to a hot printer stops its hot end fan. A print that lets go keeps extruding, so the spool keeps losing weight."
Why: These are the printer module's main claims, and none has touched a printer.
Answer: "Untested. We will test pause on each pilot model through the link it supports, and cut power only once the nozzle is cool. The weight rule catches clogs, run outs and tangles, not spaghetti."

**9. Offline (4, ANSWER)**
Attack: "Wi-Fi drops at 9 pm. Can members unlock? Do safety stops work?"
Why: Cloud dependence would lock everyone out or leave a flagged machine running.
Answer: "Trained lists, limits and safety trips live on each box. Sessions and alerts queue until the link returns. Without a remote decision, the box applies the owner's preset default."

**10. False positives (4, ANSWER)**
Attack: "What is your false alert rate? Owners will tap Mark as OK on everything, including the real one."
Why: Failures are rare, so most alerts are false. Illustration: 10 machines, 5 sessions a day, 1% false per session is one false alert every two days.
Answer: "Unknown; we have no data. The pilot metric is false alerts per machine per month against a target set with owners, and each Mark as OK tunes thresholds."

**11. Two week learning (3, FIX)**
Attack: "Two weeks on a welder used three times a week is six sessions. A worn machine teaches you broken as normal."
Answer: "Learning will count sessions and hours per mode, not days. A technician check at install sets a known good start. Learning mode never disables safety trips."

**12. Multimaker (3, ADMIT)**
Attack: "One relay powers the whole 3-in-1. How do you lock only the laser? What stops a member pressing Print, then fitting the laser head?"
Answer: "Mode is declared by the member, and the box powers all or nothing. In laser mode it powers the machine only while the exhaust draws current. Detecting the fitted head is untested."

## 2. Errors to correct before Friday

1. Laser parts: "Current clamp on the exhaust fan's cord." Reads near zero [9]. Say: "Current sensor inside the box; the exhaust fan plugs into it."
2. Welder parts: "Clips around one supply wire. Nothing is cut." Say: "Sensor on one supply conductor inside the electrician's enclosure." [9]
3. QR manual "Gas smell or leak alarm" and interview question 9 "a gas smell". Argon and CO2 have no smell [2]. Say: "Leak alarm or hissing at the cylinder."
4. Report 4.10 and overview: "CSA certification needed before sale." Say: "Approval is needed before any use, including pilots." [5]
5. Owner app: "valve open time" shown as shielding gas used. Gas flows only while the trigger is pulled [3]. Label it "valve open minutes".
6. Owner app and laser page: a flame alert closed with "Mark as OK" and "The job can resume." Safety alerts need a reset at the machine; no remote Mark as OK [7].
7. Printer pages: "or a finished job still hot: the relay cuts power." Say: "once the nozzle has cooled".
8. Report: "HSE EIS45 [Fill in: what we used from it]". The gas features cite a source nobody has read. Fill it in or cite CCOHS [1][2].

## 3. Next steps: bench test plan

1. **Fail safe:** cut power and halt firmware 50 times per box, meter every output. Proves outputs go safe and stay off.
2. **Current accuracy:** box against a true RMS meter on a printer, fan and MIG welder, Wi-Fi on. Proves the error band.
3. **Welding noise:** a day beside a welding bench, counting resets and fob misreads. Proves the box survives.
4. **Gas:** oxygen sensor on a controlled argon release in a closed test box, with a gas fitter. Proves it sees the real gas.
5. **Printers:** two models, pause command, scale noise, staged detachment and clog. Proves what each rule catches.
6. **Laser, monitor only:** duct open and blocked, pump off, flame sensor over 20 normal cuts. Proves trip rates.
7. **Monitor only pilot:** four weeks, owner labels every alert. Proves false alerts per machine per month.

## 4. One bulletproof sentence

"PREVUMO is a design, not yet a built or tested device: a box that would power a machine only for a trained member, log who used it and how much, switch it off when idle, and alert the owner when its readings leave the range learned on that machine; every safety function will be bench proven before anyone relies on it."

## Sources

[1] CCOHS, Welding gases. https://www.ccohs.ca/oshanswers/safety_haz/welding/welding-types-of-compressed-gases.html
[2] CCOHS, Simple asphyxiants. https://www.ccohs.ca/oshanswers/chemicals/howto/asphyxiants.html
[3] Miller Millermatic 252 manual. https://www.tsdistributors.com/pdfs/Miller%20Millermatic%20252%20MIG%20welder%20owner's%20manual.pdf and Lincoln POWER MIG solenoid guide. https://blog.weldsupportparts.com/2026/05/20/lincoln-power-mig-gas-solenoid-troubleshooting/
[4] 21 CFR 1040.10(i). https://www.ecfr.gov/current/title-21/section-1040.10
[5] ESA, Approval marks. https://esasafe.com/electrical-products/recognized-certification-marks/
[6] EFR, CO2 tube manual. https://efr-laser.com/wp-content/uploads/2023/09/CO2-Laser-Tube-User-Manual%EF%BC%88E-Series%EF%BC%89.pdf
[7] Epilog, Fire hazards. https://support.epiloglaser.com/laser-machine/fusion-pro/usage-and-operation/faq/reducing-fire-hazards-with-your-laser/
[8] Miller, MIG parameters. https://www.millerwelds.com/en-US/resources/knowledge-hub/mig-welding/how-to/mig-welding-setting-the-correct-parameters
[9] Fluke, Current clamps. https://www.fluke.com/en-us/learn/blog/clamps/using-accessory-current-clamps-with-fluke-dmms
[10] Espressif, ADC guide. https://docs.espressif.com/projects/esp-idf/en/release-v3.0/api-reference/peripherals/adc.html
