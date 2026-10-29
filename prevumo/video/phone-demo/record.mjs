// Records the vertical phone demo frame by frame in Chromium, then encodes a 1080x1920, 30 fps MP4 with no audio.
// Usage (from prevumo): node video/phone-demo/record.mjs <out.mp4> [framesDir] [--frames 0,10,18]
// Each frame is rendered at an exact time with window.render(t), so the video is exactly 20.00 s (600 frames).
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const out = resolve(args[0] || "prevumo-demo.mp4");
const framesDir = resolve(args[1] && !args[1].startsWith("--") ? args[1] : join(dirname(out), "frames-phone-demo"));
const only = args.includes("--frames") ? args[args.indexOf("--frames") + 1].split(",").map(Number) : null;
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FPS = 30, SECONDS = 20;

mkdirSync(framesDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(pathToFileURL(join(here, "index.html")).href);
await page.evaluate(() => document.fonts.ready);

if (only) {
  for (const s of only) {
    await page.evaluate((t) => window.render(t), s);
    await page.screenshot({ path: join(framesDir, `still-${String(s).padStart(2, "0")}s.png`) });
  }
} else {
  const total = FPS * SECONDS;
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.render(t), i / FPS);
    await page.screenshot({ path: join(framesDir, `f${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 95 });
  }
  execFileSync(FFMPEG, [
    "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(framesDir, "f%04d.jpg"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS), "-an", "-movflags", "+faststart", out,
  ]);
  console.log(`wrote ${out} from ${total} frames`);
}
await browser.close();
if (errors.length) console.log("page errors:", errors);
