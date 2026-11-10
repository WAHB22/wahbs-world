// Reads the parts list and steps from each module page, so the report lists exactly what the pages show.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const path = normalize(join(root, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!path.startsWith(root) || !existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" }); res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const out = {};
for (const d of ["welder", "printer", "enclosed", "multimaker", "laser"]) {
  writeFileSync(join(here, "..", d, ".film.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body>${readFileSync(join(here, "..", d, "index.html"), "utf8")}</body></html>`);
  const p = await b.newPage();
  await p.goto(`http://127.0.0.1:${server.address().port}/prevumo/${d}/.film.html?film=1`);
  await p.waitForFunction(() => window.READY);
  out[d] = await p.evaluate(() => ({
    parts: [...document.querySelectorAll("#n-parts li")].map((li) => [li.querySelector(".n").textContent, li.querySelector("b").textContent, li.querySelector("span:not(.n)").textContent]),
    steps: [...document.querySelectorAll("#n-steps li")].map((li) => [li.querySelector("b").textContent, li.querySelector("span:not(.n)").textContent]),
    sys: [...document.querySelectorAll("#bom .row")].map((r) => r.classList.contains("ctx")),
    dur: window.DUR,
  }));
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(here, "pages.json"), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k, v.parts.length, "parts", v.steps.length, "steps", v.dur, "s");
