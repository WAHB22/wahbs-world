"""Builds scenes/captions.js: what was actually said (names and terms corrected), timed with Whisper's word timestamps."""
import difflib, json, re

SPOKEN = """Hi, my name is Mohamed Wahb Berguia, I'm a student in Group 10, and my case study today is Tailor Brands: AI-Driven Branding, by Jill Avery at Harvard Business School.
In 2014, three founders, Yali Saar, Nadav Shatz and Tom Lahat, launched Tailor Brands at TechCrunch's startup competition.
The market had a huge gap: a brand from an agency cost between $1,000 and $50,000, and the company said only 10% of the market was well served.
Their value proposition was simple: a professional logo in five minutes, at up to one-tenth of the cost, designed by AI instead of templates.
Their key activity was an algorithm called Ash, which learned from every choice and every edit users made.
Their customers were small businesses and first-time founders, and by 2018 they served more than 5 million businesses.
But they hit a problem: a logo is a one-time purchase, and many competitors already sold logos for a one-time fee, or gave them away.
So in 2017, they switched to a subscription, and in 2018 they added around 10 new tools to become an automated branding agency.
With $15.5 million from their Series B round, they built social media posts, Facebook ads, a weekly content planner, brand analytics and an online brand book, all generated from your logo.
To grow, they gave away 5,000 free logos to nonprofits, paid influencers, and rewarded customers for referring friends.
But reviews were still split: a reviewer built a full brand in under 10 minutes, while an award-winning designer scored the logos 12 out of 30.
Then a bigger problem appeared.
In Saar's own words: "Even after founders had the logo, their businesses were not up and running."
So they shifted again, into registering businesses and handling their compliance.
Today, logos bring in only about 10% of their revenue.
Our key learning is that Tailor Brands grew by doing two things.
It let people try before they paid, and it let every user's actions teach the product.
Our project, PREVUMO, has already followed a similar path.
We started with tracking electricity per user.
Customers told us billing wasn't their problem, so we shifted to preventive maintenance.
Then makerspaces told us they need more than electricity, like gas control on welders, so we're now designing a module for each machine.
And like Tailor Brands, we'll keep shifting after launch if the evidence tells us to.
The case helps us solve two specific problems.
First, nobody wants to commit to $300 plus 25 a month.
The supervisors we interviewed couldn't approve purchases and wanted to test on one machine first.
Tailor Brands let you design your logo for free and pay only if you were happy.
So we'd offer our welder module free for 30 days to a makerspace, and they pay only if they keep it.
Second, false alarms.
Two supervisors told us that if alerts are wrong, staff stop paying attention.
Tailor Brands' AI treated every user's edit as a lesson.
We'll do the same: every time an owner taps "Mark OK", that machine's normal range gets updated.
And for the first two weeks, the box only records data and never shuts anything down.
So by the time PREVUMO acts, it knows the machine.
Thank you for watching.
My references are on the screen."""

norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
t = json.load(open("transcript.json"))
hw = [(norm(w["w"]), w["s"], w["e"]) for s in t for w in s["words"]]
hw = [x for x in hw if x[0]]
sw = SPOKEN.split()
sm = difflib.SequenceMatcher(a=[norm(w) for w in sw], b=[x[0] for x in hw], autojunk=False)
times = [None] * len(sw)
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        times[a + k] = (hw[b + k][1], hw[b + k][2])
# fill gaps by interpolating between known neighbours
known = [i for i, v in enumerate(times) if v]
for i in range(len(sw)):
    if times[i]: continue
    p = max([k for k in known if k < i], default=None); q = min([k for k in known if k > i], default=None)
    ps = times[p][1] if p is not None else 0.0
    qs = times[q][0] if q is not None else ps + 0.4
    span = (q if q is not None else len(sw)) - (p if p is not None else -1)
    f = (i - (p if p is not None else -1)) / span
    s = ps + (qs - ps) * f
    times[i] = (s, s + 0.2)

# chunk: break at sentence ends, or at commas/colons past 38 chars, never over 84 chars
chunks, cur, start = [], [], None
for i, w in enumerate(sw):
    if not cur: start = times[i][0]
    cur.append(w)
    text = " ".join(cur)
    end_sentence = w.endswith((".", "?", "!", '."'))
    soft = w.endswith((",", ":")) and len(text) > 38
    nxt = sw[i + 1] if i + 1 < len(sw) else ""
    # rest of this sentence after the next word, so a sentence never ends on a one-word caption
    rest = ""
    for w2 in sw[i + 1:]:
        rest += " " + w2
        if w2.endswith((".", "?", "!", '."')): break
    too_long = len(text) + 1 + len(nxt) > 84 and len(rest) > 14
    if end_sentence or soft or too_long or i == len(sw) - 1:
        chunks.append({"a": round(start, 2), "b": round(times[i][1], 2), "text": text})
        cur = []
# hold each caption until the next one starts (or 0.8 s after its last word)
for j, c in enumerate(chunks):
    nxt = chunks[j + 1]["a"] if j + 1 < len(chunks) else c["b"] + 1.5
    c["b"] = round(min(nxt, c["b"] + 0.8) if nxt - c["b"] > 0.8 else nxt, 2)
open("scenes/captions.js", "w").write("window.CAPTIONS = " + json.dumps(chunks, indent=0) + ";\n")
matched = sum(n for _, _, n in sm.get_matching_blocks())
print(f"{len(chunks)} captions, {matched}/{len(sw)} words matched to Whisper timings")
for c in chunks[:6] + chunks[-4:]: print(c)
