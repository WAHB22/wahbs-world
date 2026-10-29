// Records the PREVUMO phone demo frame by frame in Chromium, then encodes it with ffmpeg (no audio).
// Usage (from prevumo):
//   node video/phone-demo/record.mjs <out.mp4|out.gif> [--layout wide] [--timeline loop] [--frames 0,10,18] [--dir framesDir]
//   --layout wide     1920x1080 for a computer screen (default: 1080x1920 vertical)
//   --timeline loop   the 6 s seamless loop for the email (default: the 20 s film)
//   --frames a,b,c    only save stills at those seconds
// Each frame is rendered at an exact time with window.render(t), so the length is exact (20.00 s is 600 frames at 30 fps).
// A .gif output is 800 px wide at 15 fps with one shared palette and no grain, to stay small enough for an email.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const out = resolve(args[0] || "prevumo-demo.mp4");
const gif = out.endsWith(".gif");
const layout = opt("--layout") || "tall";
const timeline = opt("--timeline") || "full";
const framesDir = resolve(opt("--dir") || join(dirname(out), `frames-${layout}-${timeline}`));
const only = opt("--frames") ? opt("--frames").split(",").map(Number) : null;
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FPS = gif ? 15 : 30;

mkdirSync(framesDir, { recursive: true });
const query = new URLSearchParams({ layout, timeline, ...(gif ? { grain: "0" } : {}) });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const [w, h] = layout === "wide" ? [1920, 1080] : [1080, 1920];
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`${pathToFileURL(join(here, "index.html")).href}?${query}`);
await page.evaluate(() => document.fonts.ready);
const seconds = await page.evaluate(() => window.DURATION);

if (only) {
  for (const s of only) {
    await page.evaluate((t) => window.render(t), s);
    await page.screenshot({ path: join(framesDir, `still-${String(s).padStart(4, "0")}s.png`) });
  }
  console.log(`wrote ${only.length} stills to ${framesDir}`);
} else {
  const total = Math.round(FPS * seconds);
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.render(t), i / FPS);
    await page.screenshot({ path: join(framesDir, `f${String(i).padStart(4, "0")}.png`) });
  }
  const input = ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(framesDir, "f%04d.png")];
  if (gif) {
    const scale = "scale=800:-1:flags=lanczos";
    execFileSync(FFMPEG, [...input, "-vf", `${scale},palettegen=max_colors=128:stats_mode=full`, join(framesDir, "palette.png")]);
    execFileSync(FFMPEG, [...input, "-i", join(framesDir, "palette.png"), "-lavfi", `${scale}[v];[v][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`, "-loop", "0", out]);
  } else {
    execFileSync(FFMPEG, [...input, "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS), "-an", "-movflags", "+faststart", out]);
  }
  console.log(`wrote ${out} from ${total} frames`);
}
await browser.close();
if (errors.length) console.log("page errors:", errors);
