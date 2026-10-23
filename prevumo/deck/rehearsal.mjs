// One page rehearsal sheet: each speaker's slides, start time, first sentence and hand-off line, read from notes.js.
// Usage: node rehearsal.mjs <out.pdf>   (run from prevumo/deck, uses the app's Playwright)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const NOTES = require("./notes.js");
const { chromium } = require("../node_modules/@playwright/test");

const PARTS = [
  { who: "A", slides: "1 to 4", keys: ["s1", "s2", "s3", "s4"], topics: "Title, hook, pain, customer and value" },
  { who: "B", slides: "5 and 6", keys: ["s5", "s6"], topics: "How it works, prototype video" },
  { who: "C", slides: "7 and 8", keys: ["s7", "s8"], topics: "Market, competition" },
  { who: "D", slides: "9", keys: ["s9"], topics: "Business model, Plan A to Plan B" },
  { who: "E", slides: "10 and 11", keys: ["s10", "s11"], topics: "Progress and validation, closing" },
];
const time = (k) => NOTES[k].match(/(\d:\d\d) to (\d:\d\d)/);
const spoken = (k) => NOTES[k].split("\n").filter((l) => l.trim() && !/^(SPEAKER|Speakers|CUE|TRANSITION|[A-E]:|\[)/.test(l));
const handoff = (k) => {
  const t = NOTES[k].match(/TRANSITION \((.)\): (.+)\n(.): (.+)/);
  return t ? `“${t[2]}” ${t[3]} answers: “${t[4]}”` : "“Thank you. We'd love your questions.” Q&A starts at 8:00.";
};
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const rows = PARTS.map((p) => {
  const first = p.keys[0];
  const last = p.keys[p.keys.length - 1];
  const start = time(first)[1];
  const end = time(last)[2];
  const opener = spoken(first)[0].split(/(?<=[.!?])\s/)[0];
  return `<tr><td class="who">${p.who}<span>[name]</span></td><td>${p.slides}<div class="t">${esc(p.topics)}</div></td><td class="num">${start} to ${end}</td><td>“${esc(opener)}”</td><td>${esc(handoff(last))}</td></tr>`;
}).join("");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4 landscape; margin: 12mm 14mm; }
body { font: 10.5pt/1.45 Inter, sans-serif; color: #1F3D2B; }
h1 { font: 700 22pt/1.1 "Space Grotesk", sans-serif; margin: 0 0 2pt; letter-spacing: -.01em; }
.lead { color: #5B6B5F; margin: 0 0 12pt; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-weight: 600; color: #5B6B5F; font-size: 9.5pt; border-bottom: 1.5px solid #1F3D2B; padding: 5pt 6pt; }
td { vertical-align: top; border-bottom: 1px solid #E3D6C0; padding: 7pt 6pt; }
.who { font: 700 18pt/1 "Space Grotesk", sans-serif; width: 56pt; }
.who span { display: block; font: 400 9pt Inter, sans-serif; color: #5B6B5F; margin-top: 4pt; }
.t { color: #5B6B5F; font-size: 9.5pt; }
.num { font-family: "JetBrains Mono", monospace; white-space: nowrap; }
.foot { margin-top: 12pt; color: #5B6B5F; font-size: 9.5pt; }
.foot b { color: #1F3D2B; }
</style></head><body>
<h1>PREVUMO pitch: rehearsal sheet</h1>
<p class="lead">GNG4120 GA3, Group 10, Oct 23, 2026. Eight minutes for slides 1 to 11, at about 130 words a minute. The full word for word script is in each slide's speaker notes.</p>
<table><thead><tr><th>Speaker</th><th>Slides</th><th>Time</th><th>First sentence</th><th>Hand-off line</th></tr></thead><tbody>${rows}</tbody></table>
<p class="foot"><b>Slide 6:</b> click the video to start it (67 s, no sound) and narrate on the cues in brackets. <b>Clicker:</b> each speaker clicks to the next slide on the last words of their part. <b>Q&amp;A:</b> slides 12 to 16 are the appendix, with full answers in the notes of slide 15.</p>
</body></html>`;

const out = process.argv[2] || "rehearsal.pdf";
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({ path: out, format: "A4", landscape: true, printBackground: true });
await browser.close();
console.log(`wrote ${out}`);
