// Renders the 3D printer module animation frame by frame in Chromium and encodes it.
// Usage (from prevumo/printer):
//   node record.mjs --stills 5,16.4,30        stills into build/stills
//   node record.mjs [--workers 4]             full film into ../deliverables
//   node record.mjs --from 17 --to 20         redo that stretch of frames, then re-encode
// The page draws any moment with window.render(t), so every frame lands on an exact time.
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const FPS = 30;
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";
const build = join(here, "build");
mkdirSync(build, { recursive: true });

// index.html is written as page content (the artifact host adds the document shell), so wrap it here
const film = join(here, ".film.html");
writeFileSync(film, `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body>${readFileSync(join(here, "index.html"), "utf8")}</body></html>`);
// module scripts need http, so serve the repo root locally (three comes from the root node_modules)
const root = join(here, "..", "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg" };
const server = createServer((req, res) => {
  const path = normalize(join(root, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!path.startsWith(root) || !existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/prevumo/printer/.film.html?film=1`;

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(url);
  await page.waitForFunction(() => window.READY);
  await page.evaluate(() => window.READY);
  return { page, errors };
}

const browser = await chromium.launch({ executablePath: exe, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  if (opt("--stills")) {
    const dir = join(build, "stills");
    mkdirSync(dir, { recursive: true });
    const { page, errors } = await open(browser);
    for (const s of opt("--stills").split(",").map(Number)) {
      await page.evaluate((t) => window.render(t), s);
      await page.screenshot({ path: join(dir, `w${s.toFixed(1).padStart(5, "0")}.png`) });
    }
    console.log("stills in", dir, errors.length ? errors : "");
  } else {
    const { page: p0 } = await open(browser);
    const dur = await p0.evaluate(() => window.DUR);
    await p0.close();
    const total = Math.round(dur * FPS);
    const workers = +(opt("--workers") || 4);
    const frames = join(build, "frames");
    // --from and --to (seconds) redo only that stretch of the existing frames, then re-encode
    const first = opt("--from") ? Math.floor(+opt("--from") * FPS) : 0;
    const last = opt("--to") ? Math.min(total - 1, Math.ceil(+opt("--to") * FPS)) : total - 1;
    if (!opt("--from") && !opt("--to")) rmSync(frames, { recursive: true, force: true });
    mkdirSync(frames, { recursive: true });
    const t0 = Date.now();
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const { page, errors } = await open(browser);
      for (let i = first + w; i <= last; i += workers) {
        await page.evaluate((t) => window.render(t), i / FPS);
        await page.screenshot({ path: join(frames, `f${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 94 });
        if (w === 0 && i % 300 === 0) console.log(`frame ${i}/${total} ${((Date.now() - t0) / 1000) | 0}s`);
      }
      if (errors.length) console.log(`worker ${w} errors:`, errors);
    }));
    const out = join(here, "..", "deliverables", "prevumo-printer-module.mp4");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "f%05d.jpg"),
      "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS), "-movflags", "+faststart", out]);
    console.log(`wrote ${out} (${total} frames) in ${((Date.now() - t0) / 1000) | 0}s`);
  }
} finally {
  await browser.close();
  server.close();
}
