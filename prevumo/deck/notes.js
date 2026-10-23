// Speaker notes, word for word, at about 130 words per minute. Speakers A to E; names are [FILL IN].
const SPEAKERS = "Speakers: A = [FILL IN], B = [FILL IN], C = [FILL IN], D = [FILL IN], E = [FILL IN].";

module.exports = {
  s1: `SPEAKER A · 0:00 to 0:20 (20 s, about 45 words)
${SPEAKERS}

Picture the welder in your school's makerspace. Expensive. Shared. Booked every single day.
Everyone knows who reserved it. Nobody knows what is happening inside it.
That gap is why we built PREVUMO, the preventive usage monitor. Let me show you what that gap costs.

CUE: click on "what that gap costs".`,

  s2: `SPEAKER A · 0:20 to 0:45 (25 s, about 50 words)

A three thousand dollar welder dies on a Tuesday.
[pause]
Nobody saw it coming.
[pause]
The owner can open the booking software and see exactly who booked it that morning. But not what happened to it, and not whether it had been showing warning signs for weeks.

CUE: click on "warning signs for weeks".`,

  s3: `SPEAKER A · 0:45 to 1:45 (60 s, about 130 words)

More and more makerspaces, university labs and shared kitchens now rent out expensive electric equipment. We wrote to forty nine of the people who run them. Here's what the first answers, and the industry data, tell us.
First, repairs. A makerspace director told us a breakdown costs "hundreds if not thousands of dollars." Industry data puts the average emergency repair call at seven hundred and fifty four dollars.
Second, lost customers. When machines keep breaking, members cancel, and each member is worth six hundred to six thousand dollars to that space.
Third, the blind spot. Booking tools only work, in his words, "when people actually use the software." And no sensor is watching the machine itself. So when it fails, there is no history to learn from.

CUE: click on "no history to learn from".`,

  s4: `SPEAKER A, then hand off to B · 1:45 to 2:15 (30 s, about 65 words)

So our customer is the owner or manager of a shared space with costly electric equipment: makerspaces, labs and shared kitchens. Often one owner runs several locations.
Our promise to them fits in one sentence: catch failures before they happen, know who used each machine and how much, and shut it down safely from anywhere.

TRANSITION (A): B, so how do we actually see inside the machine?
B: Let me show you.

CUE: B clicks on "Let me show you".`,

  s5: `SPEAKER B · 2:15 to 3:00 (45 s, about 98 words)

It starts with a small box on each machine's power line: a keypad, a current sensor and a relay, run by an ESP32 with Wi-Fi.
A member types their PIN, and only then does the machine power on. While they work, the box measures the current every second and sends it to the PREVUMO cloud.
Over its first week, the app learns that machine's normal curve. When the curve breaks pattern, the owner gets an alert and chooses: shut it down, call a technician, or mark it OK.
And two safety rules: nothing restarts on its own after a shutdown, and fridges are never cut.

CUE: click on "fridges are never cut".`,

  s6: `SPEAKER B · 3:00 to 4:15 (75 s). The video is 67 s with no sound. Click the video to start it, then narrate on the cues in brackets (video time).

Before you click: "Here is the owner app. Everything you'll see works today."
[CLICK THE VIDEO]
[0:00] The owner logs in. uOttawa Engineering has three locations.
[0:06] Three machines are running: one started with a PIN, one unassigned, one booked to a capstone team. Below, the whole day on one timeline.
[0:11] Now Welder 2 starts drawing more than twice its normal current.
[0:15] Within seconds, this banner.
[0:19] Review shows the live curve against this welder's normal range, in green. Orange dots are the irregular points. Third time this month, 74 days since its last service.
[0:26] The owner calls a technician. The best match is preselected, and the machine's history goes with the request.
[0:35] Meanwhile, a 3D printer has been idle for 45 minutes, still drawing power. One tap shuts it down, for good.
[0:46] The owner gives Beta Inc. the laser cutter for this afternoon.
[0:56] And at the end of the day, the report builds itself, per machine and per member, ready to export.
[1:05] That's the loop: warning, decision, record.

TRANSITION (B): C, who else is going to want this?
C: Let's talk about the market.

CUE: C clicks on "the market".`,

  s7: `SPEAKER C · 4:15 to 5:00 (45 s, about 98 words)

Let's size our first markets.
In Ontario alone, there are thirty one shared-use commercial kitchens, each one full of ovens, mixers and fridges that run all day. And kitchens matter, because restaurants use five to seven times more energy per square foot than other commercial buildings. Idle equipment there is expensive.
The method itself is proven. The U.S. Department of Energy reports that predictive maintenance saves about thirty to forty percent compared with fixing machines after they break.
Our path: start with one makerspace, grow into university networks with several labs, then move into shared kitchens.

[FILL IN: add a sourced makerspace count here if the team finds one; otherwise leave it out.]

CUE: click on "shared kitchens".`,

  s8: `SPEAKER C, then hand off to D · 5:00 to 5:45 (45 s, about 98 words)

So who's already out there? Every competitor knows one piece of the story.
Skedda, from about two hundred and fifty US dollars a month, knows who booked.
Fabman knows who switched the machine on.
Emporia, around two hundred dollars, knows how much energy.
MachineMetrics knows machine health, but it's built for factories, with hardware from about fourteen hundred dollars a kit.
PREVUMO puts who used it, how much, machine health and remote shutdown together, built for shared spaces.
And Skedda can be a partner: a Skedda booking becomes a PIN on our box.

TRANSITION (C): D, so how does this make money?
D: Here's our model.

CUE: D clicks on "our model".`,

  s9: `SPEAKER D · 5:45 to 6:45 (60 s, about 125 words)

Our business model changed, and the interviews are why.
Plan A, on the left, billed each member for the electricity they use. Then three owners told us how they charge for it: an Ontario makerspace and two shared kitchens, in Manitoba and Toronto. All three build electricity into membership or rent. Per user billing isn't their pain. Breakdowns and equipment left on are.
So Plan B is safety and predictive maintenance. The orange blocks changed: the value, the AI behind it, a technician network, makerspaces and labs first, and the revenue.
For one machine in year one: a three hundred dollar box plus three hundred dollars of subscription, six hundred dollars of revenue. These prices are still assumptions to validate.

TRANSITION (D): E, what have we learned so far?
E: More than we expected.

CUE: E clicks on "more than we expected".`,

  s10: `SPEAKER E · 6:45 to 7:40 (55 s, about 115 words)

Here's where we are. We reverse engineered six competitors, from Skedda and Fabman to MachineMetrics. We built two business model canvases and sent forty nine emails to kitchens and makerspaces in Canada, the US and Europe. We're still waiting on replies to some of them. And we ran ten interviews.
An Ontario makerspace director told us: "Managing equipment is one of the biggest tasks we have."
A Manitoba kitchen owner told us: "I pay all the electricity and build that price into my monthly rent. Simple, easy, fair."
So per user billing is invalidated. Warning before failures is partly supported. And café staff forget equipment on, so we added scheduled shutdowns, controlled by the owner.

CUE: click on "controlled by the owner".`,

  s11: `SPEAKER E · 7:40 to 8:00 (20 s, about 40 words)

Skedda tells you who booked it.
[pause]
PREVUMO tells you who used it, and when it's about to fail.
[pause]
Thank you. We'd love your questions.`,

  a1: `APPENDIX, for Q&A only. Remote shutdown hardware.

The box's own relay is certified for up to 15 A at 120 V, which covers 3D printers, laser cutters and most bench tools. For 240 V or 3-phase machines like large welders and ovens, the box drives a contactor, installed by a licensed electrician. Before we sell, the box needs CSA certification. Safety rules in software: nothing restarts on its own after a shutdown, and fridges and freezers are never cut.`,

  a2: `APPENDIX, for Q&A only. Learning, privacy, limits.

The AI needs about 7 days of normal use to learn a new machine's current pattern, so alerts switch on after that. Data is private to the owner's account. And electricity data can't see gas equipment, so gas ranges and burners are outside what PREVUMO can watch.`,

  a3: `APPENDIX, for Q&A only. Full validation board.

Six assumptions, tested through ten interviews (nine people plus a café manager's field notes) and forty nine outreach emails, with replies still coming in.
Invalidated: owners billing electricity per user, staff switching equipment off at closing, and per machine tracking in open access spaces.
Partly supported: breakdowns are costly, and owners want warning before a failure. Our six of ten criterion for costly breakdowns is not met yet.
Supported, and new: equipment is left on after closing, so idle and scheduled shutdowns matter.`,

  a4: `APPENDIX, Q&A prep. Short answers, then the fuller version.

1. "Why wouldn't owners just use a smart plug?"
A smart plug knows energy and can switch off. It doesn't know who used the machine, because there's no PIN. It doesn't learn the machine's normal pattern, so it can't warn you before a failure. And most plugs are for small 120 V loads, not a welder or an oven.

2. "What about heavy 240 V equipment?"
Our relay is certified up to 15 A at 120 V. For 240 V or 3-phase machines, the box drives a contactor installed by a licensed electrician, and we'd need CSA certification before selling.

3. "Who's liable if a remote shutdown ruins a job?"
The owner makes the call, or sets the rule. Every shutdown is logged with who decided and why, nothing restarts on its own, and fridges are never cut. Before we sell, our terms would set out responsibility, reviewed by a lawyer. [FILL IN if the team has a better answer.]

4. "How does the AI know what normal is?"
It watches each machine for about 7 days of normal use and learns its own current pattern, including duty cycles like an oven's heater. Then it flags sustained changes, a spike, a sag or erratic swings, not one noisy reading. We plan to use the owner's "mark as OK" decisions as feedback.

5. "Why would a not-for-profit makerspace pay $25 per machine?"
That's about $300 per machine per year. One avoided emergency repair call averages $754, and one member kept is worth $600 to $6,000. They could also put only their two or three most expensive machines on it. The price is still an assumption we're testing.

6. "How is this different from Fabman?"
Fabman controls access and knows who switched a machine on. PREVUMO also learns each machine's normal current, flags irregularities before a breakdown, detects idle machines and connects the owner to a technician with the machine's history.

7. "What did the interviews change?"
Every owner we asked bundles electricity into rent or membership, so we dropped per user billing as the headline and made predictive maintenance the core. Café staff also told us equipment gets left on at closing, so we added scheduled shutdowns that the owner controls.`,

  a5: `APPENDIX. Sources for every number in the deck. Prices for PREVUMO are assumptions to validate.`,
};
