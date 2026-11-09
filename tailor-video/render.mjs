// Renders scenes/index.html frame by frame in Chromium and builds the final MP4 with the voice-over.
// Usage (from tailor-video): node render.mjs [--stills 5,20,40] [--workers 4]
// The page draws any moment with window.render(t), so every frame lands at an exact time.
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const FPS = 30;
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";
const page_url = pathToFileURL(join(here, "scenes", "index.html")).href;
const build = join(here, "build");
mkdirSync(build, { recursive: true });

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(page_url);
  await page.evaluate(() => document.fonts.ready);
  return { page, errors };
}

const browser = await chromium.launch({ executablePath: exe });
if (opt("--stills")) {
  const dir = join(build, "stills");
  mkdirSync(dir, { recursive: true });
  const { page, errors } = await open(browser);
  for (const s of opt("--stills").split(",").map(Number)) {
    await page.evaluate((t) => window.render(t), s);
    await page.screenshot({ path: join(dir, `t${s.toFixed(1).padStart(6, "0")}.png`) });
  }
  console.log("stills in", dir, errors.length ? errors : "");
} else {
  const { page: p0 } = await open(browser);
  const end = await p0.evaluate(() => window.END);
  await p0.close();
  const total = Math.round(end * FPS);
  const workers = +(opt("--workers") || 4);
  const frames = join(build, "frames");
  mkdirSync(frames, { recursive: true });
  const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const { page, errors } = await open(browser);
    for (let i = w; i < total; i += workers) {
      await page.evaluate((t) => window.render(t), i / FPS);
      await page.screenshot({ path: join(frames, `f${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 93 });
      if (w === 0 && i % 600 === 0) console.log(`frame ${i}/${total} ${(Date.now() - t0) / 1000 | 0}s`);
    }
    if (errors.length) console.log(`worker ${w} errors:`, errors);
  }));
  const video = join(build, "video.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "f%05d.jpg"), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS), video]);
  mkdirSync(join(here, "out"), { recursive: true });
  const out = join(here, "out", "Team 10 - Tailor Brands Artificial Intelligence-Driven Branding.mp4");
  // the voice is copied as is; the picture runs 2 s past it so the references stay up
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", video, "-i", join(here, "audio", "voice_edited_tailor_brands.m4a"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-movflags", "+faststart", out]);
  console.log(`wrote ${out} (${total} frames) in ${(Date.now() - t0) / 1000 | 0}s`);
}
await browser.close();
