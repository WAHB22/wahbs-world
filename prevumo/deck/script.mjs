// Prints the speaker script (every slide's notes) as a branded PDF for rehearsal.
// Usage: node script.mjs <out.pdf>   (run from prevumo/deck, uses the app's Playwright)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const NOTES = require("./notes.js");
const { chromium } = require("../node_modules/@playwright/test");

const TITLES = {
  s1: "1 · Title", s2: "2 · Hook", s3: "3 · The pain", s4: "4 · Customer and value", s5: "5 · How it works",
  s6: "6 · Prototype demo", s7: "7 · Market", s8: "8 · Competition", s9: "9 · Business model", s10: "10 · Progress and validation",
  s11: "11 · Closing", a1: "Appendix · Hardware", a2: "Appendix · Learning, privacy, limits", a3: "Appendix · Validation board", a4: "Appendix · Q&A prep",
};
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const fmt = (t) =>
  esc(t)
    .split("\n")
    .map((l) => {
      if (/^(SPEAKER|APPENDIX)/.test(l)) return `<p class="who">${l}</p>`;
      if (/^(CUE|TRANSITION)/.test(l)) return `<p class="cue">${l}</p>`;
      if (/^\[(0|1):\d\d\]/.test(l)) return `<p class="tc">${l.replace(/^(\[[^\]]+\])/, '<b class="t">$1</b>')}</p>`;
      if (/^\[/.test(l)) return `<p class="note">${l}</p>`;
      return l.trim() ? `<p>${l}</p>` : "";
    })
    .join("");
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 16mm 16mm 18mm; }
body { font: 11.5pt/1.55 Inter, sans-serif; color: #1F3D2B; }
h1 { font: 700 26pt/1.1 "Space Grotesk", sans-serif; margin: 0 0 4pt; letter-spacing: -.01em; }
.lead { color: #5B6B5F; margin: 0 0 18pt; }
section { break-inside: avoid; border-top: 1px solid #E3D6C0; padding: 10pt 0 4pt; }
h2 { font: 700 14pt "Space Grotesk", sans-serif; margin: 0 0 4pt; }
p { margin: 0 0 6pt; }
.who { font: 500 9.5pt "JetBrains Mono", monospace; color: #A63D1F; }
.cue { font: 500 9.5pt "JetBrains Mono", monospace; color: #2F6B45; }
.note { color: #5B6B5F; font-style: italic; }
.t { font: 600 10pt "JetBrains Mono", monospace; color: #E07A2E; margin-right: 6pt; }
</style></head><body>
<h1>PREVUMO · speaker script</h1>
<p class="lead">GNG4120 GA3 · Group 10 · Friday Oct 23, 2026 · 8:00 plus Q&amp;A. About 130 words per minute.</p>
${Object.entries(TITLES).map(([k, t]) => `<section><h2>${t}</h2>${fmt(NOTES[k])}</section>`).join("")}
</body></html>`;

const out = process.argv[2] || "PREVUMO-speaker-script.pdf";
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({ path: out, format: "A4", printBackground: true });
await browser.close();
console.log(`wrote ${out}`);
