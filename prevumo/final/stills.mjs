// Clean drawings of each module on its machine for the deck (no part numbers, no table, no titles).
// Usage (from prevumo, after npm run build): node final/stills.mjs
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "..", "dist");
const out = join(here, "assets");
const tmp = join(here, "build", "stills");
mkdirSync(tmp, { recursive: true });
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg" };
const server = createServer((req, res) => {
  let p = normalize(join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!p.startsWith(dist) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

// page, moment on the machine (after its parts are introduced, before "how it works")
const SHOTS = [["welder", "welder", 21.5], ["printer", "printer", 20.3], ["enclosed", "enclosed-printer", 21.2], ["multimaker", "multimaker", 21.4], ["laser", "laser-cutter", 22.0]];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  for (const [name, slug, t] of SHOTS) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
    await page.goto(`${base}/hardware/${slug}/?film=1`);
    await page.waitForFunction(() => window.READY, null, { timeout: 60000 });
    await page.evaluate(() => window.READY);
    await page.addStyleTag({ content: "#lines, #balloons, #tags, #bom, #sheet, #concept, #kick, #stage h1 { display: none !important; }" });
    await page.evaluate((tt) => window.render(tt), t);
    const raw = join(tmp, `${name}.png`);
    await page.locator("#frame").screenshot({ path: raw });
    await page.close();
    // inside the drawing sheet, trim to the drawing, then centre it on a 1200 x 980 canvas with a margin
    execFileSync("convert", [raw, "-crop", "1300x900+140+150", "+repage", "-fuzz", "4%", "-trim", "+repage",
      "-resize", "1080x860>", "-background", "#F3EBDD", "-gravity", "center", "-extent", "1200x980", join(out, `machine-${name}.png`)]);
    console.log("wrote", `machine-${name}.png`);
  }
} finally {
  await browser.close();
  server.close();
}
