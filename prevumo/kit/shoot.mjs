// Screenshots of a static page (overview, manual, app) at desktop and phone widths.
// Usage (from prevumo): node kit/shoot.mjs overview [--hash welder-2] [--click "#tab-alerts"] [--full]
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const kit = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
const here = join(kit, "..", name);
const args = process.argv.slice(3);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const out = join(here, "build", "shots");
mkdirSync(out, { recursive: true });
writeFileSync(join(here, ".page.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${readFileSync(join(here, "index.html"), "utf8")}</body></html>`);
const root = join(kit, "..", "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png" };
const server = createServer((req, res) => {
  const path = normalize(join(root, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!path.startsWith(root) || !existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" }); res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/prevumo/${name}/.page.html${opt("--hash") ? "#" + opt("--hash") : ""}`;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const tag = opt("--tag") || "";
try {
  for (const [label, vp] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: +(opt("--dpr") || 1) });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    if (opt("--click")) for (const sel of opt("--click").split(",")) { await page.click(sel); await page.waitForTimeout(300); }
    await page.waitForTimeout(600);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.screenshot({ path: join(out, `${label}${tag}.png`), fullPage: args.includes("--full") });
    console.log(label, "scrollWidth", sw, "viewport", vp.width, errors.filter((e) => !e.includes("404")).length ? errors : "");
    await page.close();
  }
} finally { await browser.close(); server.close(); }
