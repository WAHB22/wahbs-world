// Films for the final deck, recorded from the PREVUMO site (prevumo.vercel.app, served here from dist/).
// Usage (from prevumo): npm run build && node final/film.mjs <hardware|software|all>
//   hardware  about 42 s: the live /hardware page, then the welder module and the other four, frame exact
//   software  about 32 s: the owner app driven with a cursor, then the QR manual on a phone
// Writes final/media/<name>.mp4 (1920x1080, H.264, no sound) and <name>.jpg (the poster).
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "..", "dist");
const media = join(here, "media");
const work = join(here, "build");
mkdirSync(media, { recursive: true });
const FPS = 30;
const EXE = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";
const GL = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const which = process.argv[2] || "all";

/* ---------- a small server for dist/, with the site's rewrites ---------- */
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".mp4": "video/mp4" };
const PHONE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
  @font-face { font-family: "Space Grotesk"; src: url("/vendor/fonts/space-grotesk.woff2") format("woff2"); font-weight: 300 700; }
  @font-face { font-family: "Inter"; src: url("/vendor/fonts/inter.woff2") format("woff2"); font-weight: 100 900; }
  @font-face { font-family: "JetBrains Mono"; src: url("/vendor/fonts/jetbrains-mono.woff2") format("woff2"); font-weight: 100 800; }
  html, body { margin: 0; width: 1920px; height: 1080px; background: #F3EBDD; overflow: hidden; }
  .copy { position: absolute; left: 190px; top: 330px; width: 760px; color: #1F3D2B; }
  .kick { font: 500 26px/1 "JetBrains Mono", monospace; color: #B4561A; }
  h1 { margin: 22px 0 0; font: 700 76px/1.02 "Space Grotesk", sans-serif; letter-spacing: -0.02em; }
  p { margin: 28px 0 0; font: 400 30px/1.4 "Inter", sans-serif; color: #5B6B5F; max-width: 640px; }
  .phone { position: absolute; left: 1130px; top: 60px; width: 420px; height: 900px; border-radius: 58px; background: #1F3D2B; padding: 16px; box-sizing: border-box; box-shadow: 0 30px 60px rgb(31 61 43 / 0.25); }
  .screen { width: 388px; height: 868px; border-radius: 44px; overflow: hidden; background: #FFFDF8; }
  iframe { border: 0; width: 390px; height: 868px; display: block; }
</style></head><body>
  <div class="copy"><div class="kick">QR sticker on every box</div><h1>Scan it, and the machine's manual opens</h1><p>Checks, start, shut down, and what to do if something goes wrong.</p></div>
  <div class="phone"><div class="screen"><iframe id="m" src="/software/manual/#welder-2" title="QR manual"></iframe></div></div>
</body></html>`;
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/film/phone.html") { res.writeHead(200, { "content-type": TYPES[".html"] }); res.end(PHONE); return; }
  let p = normalize(join(dist, decodeURIComponent(url.pathname)));
  if (!p.startsWith(dist)) { res.writeHead(403); res.end(); return; }
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)) p = join(dist, "index.html");
  res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const encode = (pattern, out, extra = []) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...extra, "-framerate", String(FPS), "-i", pattern,
  "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(FPS), "-movflags", "+faststart", out]);
const poster = (mp4, at, jpg) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(at), "-i", mp4, "-frames:v", "1", "-q:v", "3", jpg]);
const dur = (mp4) => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]).toString().trim();

/* ---------- hardware: the live hub page, then each module drawn at exact times ---------- */
async function hardware() {
  const dir = join(work, "hardware");
  const introOnly = process.argv.includes("--intro-only");
  if (!introOnly) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  // 1. the hub page on the live site, with a slow push in (falls back to the local copy if the network refuses)
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const live = await chromium.launch({ executablePath: EXE, proxy });
  const lp = await live.newPage({ viewport: { width: 1920, height: 1080 } });
  let hubFrom = "https://prevumo.vercel.app/hardware";
  try { await lp.goto(hubFrom, { waitUntil: "networkidle", timeout: 30000 }); }
  catch { hubFrom = `${BASE}/hardware`; await lp.goto(hubFrom, { waitUntil: "networkidle" }); }
  await lp.evaluate(() => document.fonts.ready);
  await lp.waitForTimeout(800);
  await lp.screenshot({ path: join(dir, "hub.png") });
  await live.close();
  console.log("hub from", hubFrom);
  const INTRO = Math.round(2.6 * FPS);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-i", join(dir, "hub.png"), "-vf",
    `scale=3840:2160,zoompan=z='1+0.06*on/${INTRO}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/3':d=${INTRO}:s=1920x1080:fps=${FPS}`,
    "-frames:v", String(INTRO), "-q:v", "2", join(dir, "f%05d.jpg")]);

  // 2. each module page renders any moment with window.render(t); speed > 1 plays a stretch faster
  const SEG = [
    ["welder", 3.0, 12.0, 1.5], ["welder", 22.75, 28.35, 1.25], ["welder", 28.35, 37.95, 1.5], ["welder", 54.75, 62.75, 1.25],
    ["printer", 29.9, 34.5, 1.15], ["enclosed", 50.5, 55.5, 1.25], ["multimaker", 43.0, 47.5, 1.1], ["laser", 40.4, 45.4, 1.25],
  ];
  const PAGE = { welder: "welder", printer: "printer", enclosed: "enclosed-printer", multimaker: "multimaker", laser: "laser-cutter" };
  const jobs = [];
  let n = INTRO;
  for (const [m, t0, t1, sp] of SEG) {
    const k = Math.round(((t1 - t0) / sp) * FPS);
    for (let i = 0; i < k; i++) jobs.push({ m, t: t0 + (i * sp) / FPS, idx: n + i });
    n += k;
  }
  const browser = await chromium.launch({ executablePath: EXE, args: GL });
  if (introOnly) jobs.length = 0;
  const WORKERS = 4;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 1 });
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    let cur = null;
    for (let j = w; j < jobs.length; j += WORKERS) {
      const job = jobs[j];
      if (cur !== job.m) {
        await page.goto(`${BASE}/hardware/${PAGE[job.m]}/?film=1`);
        await page.waitForFunction(() => window.READY, null, { timeout: 60000 });
        await page.evaluate(() => window.READY);
        cur = job.m;
      }
      await page.evaluate((t) => window.render(t), job.t);
      await page.locator("#frame").screenshot({ path: join(dir, `f${String(job.idx).padStart(5, "0")}.jpg`), type: "jpeg", quality: 94 });
      if (w === 0 && j % 200 === 0) console.log(`frame ${j}/${jobs.length} ${((Date.now() - t0) / 1000) | 0}s`);
    }
    if (errs.length) console.log("worker", w, errs.slice(0, 3));
    await page.close();
  }));
  await browser.close();
  const out = join(media, "hardware.mp4");
  encode(join(dir, "f%05d.jpg"), out);
  poster(out, 3.4, join(media, "hardware.jpg"));
  console.log(`hardware.mp4 ${dur(out).toFixed(2)} s, ${n} frames`);
}

/* ---------- software: the owner app with a drawn cursor, then the QR manual on a phone ---------- */
const CURSOR = () => {
  const boot = () => {
    const css = `#__cur{position:fixed;inset:0;pointer-events:none;z-index:2147483647}
      #__cur svg{position:absolute;width:30px;height:30px;transform:translate(-3px,-2px);filter:drop-shadow(0 2px 3px rgb(31 61 43 / .35));transition:transform 120ms}
      #__cur .ripple{position:absolute;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;border:3px solid #E07A2E;animation:__rip 520ms cubic-bezier(.22,1,.36,1) forwards}
      @keyframes __rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}`;
    const st = document.createElement("style"); st.textContent = css; document.head.append(st);
    const layer = document.createElement("div"); layer.id = "__cur";
    layer.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 2.5 19.5 13l-7 1.4L8.7 21 4 2.5Z" fill="#1F3D2B" stroke="#FFFDF8" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    document.body.append(layer);
    const arrow = layer.querySelector("svg"); let x = -40, y = -40;
    document.addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; arrow.style.left = `${x}px`; arrow.style.top = `${y}px`; }, true);
    document.addEventListener("mousedown", () => {
      const r = document.createElement("span"); r.className = "ripple"; r.style.left = `${x}px`; r.style.top = `${y}px`; layer.append(r); setTimeout(() => r.remove(), 600);
      arrow.style.transform = "translate(-3px,-2px) scale(.88)"; setTimeout(() => (arrow.style.transform = "translate(-3px,-2px)"), 140);
    }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
};

async function screencast(page, run) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    frames.push({ t: metadata.timestamp, data });
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await run();
  // a still page sends no new frames, so the last frame is held until the moment the run ended
  frames.end = Date.now() / 1000;
  await cdp.send("Page.stopScreencast");
  return frames;
}

function framesToMp4(frames, name) {
  const dir = join(work, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const list = [];
  frames.forEach((f, i) => {
    const file = `f${String(i).padStart(5, "0")}.jpg`;
    writeFileSync(join(dir, file), Buffer.from(f.data, "base64"));
    const tail = frames.end && frames.end - f.t > 0 && frames.end - f.t < 15 ? frames.end : f.t + 0.5;
    const next = frames[i + 1]?.t ?? tail;
    list.push(`file '${file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  list.push(`file 'f${String(frames.length - 1).padStart(5, "0")}.jpg'`);
  writeFileSync(join(dir, "list.txt"), list.join("\n"));
  const out = join(work, `${name}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"),
    "-vf", `fps=${FPS},scale=1920:1080:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-movflags", "+faststart", out]);
  return out;
}

async function software() {
  const browser = await chromium.launch({ executablePath: EXE });
  // the owner app at 1280 x 720 CSS pixels drawn at 1.5x, so it fills 1920 x 1080 and reads on a projector
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, timezoneId: "America/Toronto", locale: "en-CA" });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  const wait = (ms) => page.waitForTimeout(ms);
  let mx = 640, my = 470;
  const moveTo = async (loc, o = {}) => {
    const b = await loc.boundingBox();
    const tx = b.x + b.width * (o.fx ?? 0.5), ty = b.y + b.height * (o.fy ?? 0.5), steps = o.steps ?? 24;
    for (let i = 1; i <= steps; i++) { const k = i / steps, e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; await page.mouse.move(mx + (tx - mx) * e, my + (ty - my) * e); }
    mx = tx; my = ty;
  };
  const click = async (loc, o = {}) => { await moveTo(loc, o); await wait(160); await page.mouse.down(); await wait(70); await page.mouse.up(); };

  await page.goto(`${BASE}/software/owner-app/`);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await wait(900);
  await page.mouse.move(mx, my);
  const appFrames = await screencast(page, async () => {
    await wait(2200);
    await moveTo(page.locator("article, .card").filter({ hasText: "Welder 2" }).first(), { fy: 0.35, steps: 34 });
    await wait(2600);
    await click(page.locator('.tab[data-v="alerts"]'));
    await wait(2400);
    await click(page.locator('[data-do="welder-leak"][data-d="Call technician"]'));
    await wait(2000);
    await click(page.locator('[data-ask="printer-irr"]'));
    await wait(1100);
    await click(page.locator('[data-do="printer-irr"][data-d="Shut down"]'));
    await wait(2200);
    await click(page.locator('.tab[data-v="members"]'));
    await wait(1500);
    await click(page.locator("details summary").first());
    await wait(3000);
    await click(page.locator('.tab[data-v="resources"]'));
    await wait(1200);
    await page.mouse.move(mx + 40, my + 30);
    await wait(2400);
  });
  const appMp4 = framesToMp4(appFrames, "software-app");

  // the QR manual on a phone: scroll down to what to do if something goes wrong
  const pctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const phone = await pctx.newPage();
  await phone.goto(`${BASE}/film/phone.html`);
  await phone.waitForTimeout(1500);
  await phone.evaluate(() => document.fonts.ready);
  const phoneFrames = await screencast(phone, async () => {
    await phone.waitForTimeout(2600);
    const max = await phone.evaluate(() => { const d = document.getElementById("m").contentDocument; const el = d.querySelector(".danger"); return el ? el.getBoundingClientRect().top + d.defaultView.scrollY - 140 : 1400; });
    const steps = 170;
    for (let i = 1; i <= steps; i++) {
      const k = i / steps, e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      await phone.evaluate((y) => document.getElementById("m").contentWindow.scrollTo(0, y), Math.round(max * e));
      await phone.waitForTimeout(30);
    }
    await phone.waitForTimeout(3200);
  });
  const phoneMp4 = framesToMp4(phoneFrames, "software-phone");
  await browser.close();

  const out = join(media, "software.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", appMp4, "-i", phoneMp4, "-filter_complex",
    "[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]", "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-r", String(FPS), "-movflags", "+faststart", out]);
  poster(out, 1.0, join(media, "software.jpg"));
  console.log(`software.mp4 ${dur(out).toFixed(2)} s (app ${dur(appMp4).toFixed(1)} s, phone ${dur(phoneMp4).toFixed(1)} s)`);
}

try {
  if (which === "hardware" || which === "all") await hardware();
  if (which === "software" || which === "all") await software();
} finally {
  server.close();
}
