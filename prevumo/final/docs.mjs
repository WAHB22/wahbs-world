// The rehearsal script and the Q&A sheet as PDFs, in the deck's own palette and faces.
// Usage (from prevumo): node final/docs.mjs   (after the deck is built)
// Writes deliverables/final/PREVUMO-final-script.pdf and PREVUMO-final-QA.pdf.
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const N = require("./notes.cjs");
const out = join(here, "..", "deliverables", "final");
const tmp = join(here, "build", "docs");
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
const fonts = pathToFileURL(join(here, "..", "public", "vendor", "fonts")).href;

// slide thumbnails from the built deck
execFileSync("python3", ["/mnt/skills/public/pptx/scripts/office/soffice.py", "--headless", "--convert-to", "pdf", "--outdir", tmp, join(out, "PREVUMO-final.pptx")], { stdio: "ignore" });
execFileSync("pdftoppm", ["-r", "60", "-png", join(tmp, "PREVUMO-final.pdf"), join(tmp, "t")]);
const thumbs = readdirSync(tmp).filter((f) => /^t-\d+\.png$/.test(f)).sort();
const TITLES = ["PREVUMO (title)", "Where we started", "Every machine fails its own way", "One box, five modules", "One app for the owner", "Every machine has its own electrical signature", "Who it's for, and why they'd pay", "A first market we can count", "What we do next", "Every machine fails its own way (close)"];

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const CSS = `
  @font-face { font-family: "Space Grotesk"; src: url("${fonts}/space-grotesk.woff2") format("woff2"); font-weight: 300 700; }
  @font-face { font-family: "Inter"; src: url("${fonts}/inter.woff2") format("woff2"); font-weight: 100 900; }
  @font-face { font-family: "JetBrains Mono"; src: url("${fonts}/jetbrains-mono.woff2") format("woff2"); font-weight: 100 800; }
  @page { size: Letter; margin: 16mm 16mm 18mm; }
  :root { --bg: #F3EBDD; --surface: #FFFDF8; --border: #E3D6C0; --ink: #1F3D2B; --muted: #5B6B5F; --green: #2F6B45; --gtint: #D6E4D3; --orange: #B4561A; --otint: #F6D2B4; --rust: #A63D1F; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font: 400 10.5pt/1.5 "Inter", sans-serif; color: var(--ink); }
  h1 { font: 700 26pt/1.05 "Space Grotesk", sans-serif; letter-spacing: -0.01em; margin: 0 0 6pt; }
  h2 { font: 700 15pt/1.2 "Space Grotesk", sans-serif; margin: 18pt 0 6pt; break-after: avoid; }
  .lede { color: var(--muted); font-size: 11.5pt; margin: 0 0 14pt; max-width: 150mm; }
  .mono { font-family: "JetBrains Mono", monospace; }
  table { width: 100%; border-collapse: collapse; margin: 4pt 0 10pt; font-size: 9.5pt; }
  th { text-align: left; font: 600 8.5pt/1.2 "JetBrains Mono", monospace; color: var(--muted); padding: 5pt 6pt; border-bottom: 1.5pt solid var(--ink); }
  td { padding: 5pt 6pt; border-bottom: 0.75pt solid var(--border); vertical-align: top; }
  td.t { font-family: "JetBrains Mono", monospace; white-space: nowrap; }
  tr.total td { font-weight: 700; border-bottom: 0; }
  .who { display: inline-block; min-width: 18pt; text-align: center; font: 700 9pt/1.6 "JetBrains Mono", monospace; background: var(--ink); color: var(--bg); border-radius: 9pt; padding: 0 6pt; }
  .slide { display: grid; grid-template-columns: 62mm 1fr; gap: 7mm; padding: 9pt 0 11pt; border-top: 0.75pt solid var(--border); break-inside: avoid; }
  .slide img { width: 62mm; border-radius: 3pt; border: 0.75pt solid var(--border); }
  .slide .meta { font: 500 8.5pt/1.4 "JetBrains Mono", monospace; color: var(--muted); margin: 0 0 4pt; }
  .slide .say { font-size: 11pt; line-height: 1.55; margin: 0; white-space: pre-line; }
  .slide .cue { margin: 6pt 0 0; font: 600 9pt/1.4 "Inter", sans-serif; color: var(--rust); }
  .slide .note { margin: 6pt 0 0; font-size: 9.5pt; color: var(--muted); }
  .box { background: var(--surface); border: 0.75pt solid var(--border); border-radius: 8pt; padding: 9pt 12pt; margin: 8pt 0; }
  .box.warn { background: var(--otint); border-color: var(--otint); }
  ul { margin: 3pt 0 6pt; padding-left: 14pt; } li { margin: 2pt 0; }
  .q { break-inside: avoid; padding: 7pt 0 8pt; border-top: 0.75pt solid var(--border); }
  .q p { margin: 3pt 0; }
  .q .qt { font: 700 11pt/1.35 "Space Grotesk", sans-serif; margin: 0 0 3pt; }
  .show { font: 600 8.5pt/1 "JetBrains Mono", monospace; color: var(--green); margin-left: 6pt; }
  footer { position: fixed; bottom: -11mm; left: 0; right: 0; font: 500 8pt/1 "JetBrains Mono", monospace; color: var(--muted); display: flex; justify-content: space-between; }
`;

/* ---------- the script ---------- */
const rows = N.SLIDES.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(TITLES[i])}</td><td><span class="who">${s.who}</span></td><td class="t">${clock(s.from)} to ${clock(s.to)}</td><td class="t">${s.words}</td></tr>`).join("");
const speakers = ["A", "B", "C", "D", "E"].map((w) => {
  const mine = N.SLIDES.filter((s) => s.who === w);
  const secs = mine.reduce((a, s) => a + (s.to - s.from), 0);
  return `<tr><td><span class="who">${w}</span></td><td>Slides ${mine.map((s) => N.SLIDES.indexOf(s) + 1).join(" and ")}</td><td class="t">${clock(secs)}</td><td>__________________________</td></tr>`;
}).join("");
const slides = N.SLIDES.map((s, i) => {
  const say = esc(s.say).replace(/ \[pause\] /g, "\n[pause]\n");
  return `<section class="slide"><img src="${pathToFileURL(join(tmp, thumbs[i])).href}" alt="Slide ${i + 1}">
    <div><p class="meta"><span class="who">${s.who}</span>&nbsp; Slide ${i + 1} · ${clock(s.from)} to ${clock(s.to)} · ${s.words} words${s.film ? ` · ${esc(s.film)}` : ""}</p>
    <p class="say">${say}</p>
    ${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}
    ${s.handoff ? `<p class="cue">Hand off: ${esc(s.handoff.slice(s.handoff.indexOf(":") + 1).trim())} The next speaker clicks.</p>` : ""}
    ${s.cue ? `<p class="cue">${esc(s.cue[0].toUpperCase() + s.cue.slice(1))}</p>` : ""}</div></section>`;
}).join("");
const script = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>PREVUMO final: speaker script</title><style>${CSS}</style></head><body>
<h1>Speaker script</h1>
<p class="lede">Five minutes, five speakers, ten slides. Every word below is in the deck's speaker notes too. Times are at 130 words a minute plus a beat for each hand off: ${clock(N.TOTAL)} in all, so about 15 seconds to spare.</p>
<h2>Run sheet</h2>
<table><thead><tr><th>#</th><th>Slide</th><th>Who</th><th>Time</th><th>Words</th></tr></thead><tbody>${rows}
<tr class="total"><td></td><td>Total</td><td></td><td class="t">${clock(N.TOTAL)}</td><td class="t">${N.SLIDES.reduce((a, s) => a + s.words, 0)}</td></tr></tbody></table>
<h2>Who says what</h2>
<table><thead><tr><th>Speaker</th><th>Slides</th><th>Time</th><th>Name</th></tr></thead><tbody>${speakers}</tbody></table>
<div class="box"><b>The films play by themselves</b> on slides 4 and 5 as soon as the slide appears, with no sound. Keep talking over them; they can run a few seconds past your words. If a film does not start, click it once. Nothing in the deck needs the internet; only the QR on the last slide does.</div>
<div class="box warn"><b>Say once, plainly:</b> nothing is measured yet; every chart and number in the prototypes is illustrative (slide 6). <b>Do not say:</b> sponsors, signed pilots, "saves 30 to 40%", "AI predicts failures", "certified", or "many makerspaces" without names.</div>
<div class="box"><b>Rehearse twice with a timer.</b> If you pass 4:50, cut a clause rather than speed up. Stand so the screen is never blocked; the speaker of the next slide holds the clicker.</div>
<h2>Slide by slide</h2>
${slides}
</body></html>`;

/* ---------- the Q&A sheet, from QA.md ---------- */
const md = readFileSync(join(here, "QA.md"), "utf8");
const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<span class=\"mono\">$1</span>");
let html = "", inList = false, inQ = false;
const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
const closeQ = () => { closeList(); if (inQ) { html += "</div>"; inQ = false; } };
for (const line of md.split("\n")) {
  if (line.startsWith("# ")) { html += `<h1>${inline(line.slice(2))}</h1>`; continue; }
  if (line.startsWith("## ")) { closeQ(); html += `<h2>${inline(line.slice(3))}</h2>`; continue; }
  const q = line.match(/^\*\*(\d+)\. (.+?)\*\*(?: Show: (A\d)\.)?\s*$/);
  if (q) { closeQ(); html += `<div class="q"><p class="qt">${q[1]}. ${inline(q[2])}${q[3] ? `<span class="show">show ${q[3]}, slide ${10 + Number(q[3].slice(1))}</span>` : ""}</p>`; inQ = true; continue; }
  const b = line.match(/^(\s*)\* (.+)$/);
  if (b) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inline(b[2])}</li>`; continue; }
  if (!line.trim()) { closeList(); continue; }
  closeList();
  html += `<p${inQ ? "" : ' class="lede"'}>${inline(line)}</p>`;
}
closeQ();
const qa = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>PREVUMO final: questions and answers</title><style>${CSS}</style></head><body>
${html}</body></html>`;

writeFileSync(join(tmp, "script.html"), script);
writeFileSync(join(tmp, "qa.html"), qa);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
try {
  for (const [name, file] of [["PREVUMO-final-script.pdf", "script.html"], ["PREVUMO-final-QA.pdf", "qa.html"]]) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(join(tmp, file)).href);
    await page.evaluate(() => document.fonts.ready);
    const label = name.includes("QA") ? "questions and answers" : "speaker script";
    await page.pdf({
      path: join(out, name), format: "Letter", printBackground: true, margin: { top: "16mm", bottom: "18mm", left: "16mm", right: "16mm" },
      displayHeaderFooter: true, headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;padding:0 16mm;display:flex;justify-content:space-between;font:8px monospace;color:#5B6B5F"><span>PREVUMO · GNG 4120 Group 10 · final presentation · ${label}</span><span><span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
    });
    console.log("wrote", name);
    await page.close();
  }
} finally {
  await browser.close();
}
