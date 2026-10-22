// Records the owner app being used, frame by frame from Chromium's screencast, then encodes an MP4.
// Usage: node video/record.mjs <demo|flags> <outDir> [baseUrl]
//   demo   about 70 s, the full scripted demo path, for the deck (speaker narrates live)
//   flags  exactly 20 s, the main components flagged with callouts, no sound
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [mode = "demo", out = "video/out", base = "http://localhost:5181"] = process.argv.slice(2);
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const frameDir = join(out, `frames-${mode}`);
mkdirSync(frameDir, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1.2,
  timezoneId: "America/Toronto",
  locale: "en-CA",
});
const page = await context.newPage();
// A weekday afternoon in Ottawa, so the floor is busy and the Beta Inc. window is open.
await page.clock.install({ time: new Date("2026-10-22T14:18:00-04:00") });

// A drawn cursor and click ripple (headless screenshots have no pointer), plus hidden demo controls.
await page.addInitScript(() => {
  const css = `
    #__cur { position: fixed; inset: 0; margin: 0; padding: 0; border: 0; background: transparent; pointer-events: none; overflow: visible; width: 100vw; height: 100vh; }
    #__cur svg { position: absolute; width: 26px; height: 26px; transform: translate(-3px, -2px); filter: drop-shadow(0 2px 3px rgb(31 61 43 / .35)); transition: transform 120ms; }
    #__cur .ripple { position: absolute; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%; border: 2px solid #E07A2E; animation: __rip 520ms cubic-bezier(.22,1,.36,1) forwards; }
    @keyframes __rip { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }
    #__cur .flag { position: absolute; border: 2.5px solid #E07A2E; border-radius: 16px; box-shadow: 0 0 0 9999px rgb(31 61 43 / .18); animation: __in 320ms cubic-bezier(.22,1,.36,1) both; }
    #__cur .flag.green { border-color: #2F6B45; }
    #__cur .label { position: absolute; background: #1F3D2B; color: #F3EBDD; font: 600 21px/1.25 "Space Grotesk Variable", sans-serif; letter-spacing: -.01em; padding: 12px 18px; border-radius: 12px; max-width: 460px; box-shadow: 0 12px 30px rgb(31 61 43 / .3); animation: __in 320ms 80ms cubic-bezier(.22,1,.36,1) both; }
    #__cur .label small { display: block; font: 500 14px/1.35 "Inter Variable", sans-serif; color: #D6E4D3; margin-top: 3px; letter-spacing: 0; }
    @keyframes __in { from { opacity: 0; transform: translateY(6px) scale(.98) } to { opacity: 1; transform: none } }
    aside[aria-label="Demo controls"], [data-demo-button] { opacity: 0 !important; }
  `;
  const boot = () => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.append(style);
    const layer = document.createElement("div");
    layer.id = "__cur";
    layer.setAttribute("popover", "manual");
    layer.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 2.5 19.5 13l-7 1.4L8.7 21 4 2.5Z" fill="#1F3D2B" stroke="#FFFDF8" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    document.body.append(layer);
    layer.showPopover();
    const arrow = layer.querySelector("svg");
    let x = -40, y = -40;
    let top = null;
    const raise = (force) => {
      const open = [...document.querySelectorAll("dialog[open]")].at(-1) ?? null;
      if (force || open !== top) {
        layer.hidePopover();
        layer.showPopover();
        top = open;
      }
    };
    window.__raise = raise;
    document.addEventListener("mousemove", (e) => {
      x = e.clientX; y = e.clientY;
      arrow.style.left = `${x}px`; arrow.style.top = `${y}px`;
      raise();
    }, true);
    document.addEventListener("mousedown", () => {
      raise(true);
      const r = document.createElement("span");
      r.className = "ripple";
      r.style.left = `${x}px`; r.style.top = `${y}px`;
      layer.append(r);
      setTimeout(() => r.remove(), 600);
      arrow.style.transform = "translate(-3px, -2px) scale(.88)";
      setTimeout(() => (arrow.style.transform = "translate(-3px, -2px)"), 140);
    }, true);
    window.__flag = (sel, text, sub, opts = {}) => {
      raise(true);
      const el = typeof sel === "string" ? document.querySelector(sel) : sel;
      if (!el) return false;
      const b = el.getBoundingClientRect();
      const pad = opts.pad ?? 8;
      const f = document.createElement("div");
      f.className = `flag${opts.green ? " green" : ""}`;
      Object.assign(f.style, { left: `${b.left - pad}px`, top: `${b.top - pad}px`, width: `${b.width + pad * 2}px`, height: `${b.height + pad * 2}px` });
      const l = document.createElement("div");
      l.className = "label";
      l.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ""}`;
      layer.append(f, l);
      const lb = l.getBoundingClientRect();
      if (opts.side === "left") {
        Object.assign(l.style, { left: `${Math.max(16, b.left - pad - lb.width - 18)}px`, top: `${b.top + (b.height - lb.height) / 2}px` });
        return true;
      }
      const below = opts.side === "below" || (opts.side !== "above" && b.top - lb.height - 24 < 8);
      let left = opts.align === "right" ? b.right - lb.width : b.left;
      left = Math.max(16, Math.min(window.innerWidth - lb.width - 16, left));
      const top = below ? b.bottom + pad + 14 : b.top - pad - lb.height - 14;
      Object.assign(l.style, { left: `${left}px`, top: `${Math.max(12, Math.min(window.innerHeight - lb.height - 12, top))}px` });
      return true;
    };
    window.__unflag = () => layer.querySelectorAll(".flag, .label").forEach((n) => n.remove());
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
});

const cdp = await context.newCDPSession(page);
const frames = [];
let recording = false;
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  if (recording) frames.push({ t: metadata.timestamp, data });
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});

const wait = (ms) => page.waitForTimeout(ms);
let mx = 800, my = 450;
async function moveTo(target, opts = {}) {
  const isPoint = typeof target === "object" && "x" in target;
  if (!isPoint) {
    await target.scrollIntoViewIfNeeded();
    await wait(120);
  }
  const box = isPoint ? target : await target.boundingBox();
  const tx = box.width ? box.x + box.width * (opts.fx ?? 0.5) : box.x;
  const ty = box.height ? box.y + box.height * (opts.fy ?? 0.5) : box.y;
  const steps = opts.steps ?? 26;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    await page.mouse.move(mx + (tx - mx) * e, my + (ty - my) * e);
  }
  mx = tx; my = ty;
}
async function click(target, opts = {}) {
  await moveTo(target, opts);
  await wait(opts.pause ?? 140);
  await page.mouse.down();
  await wait(70);
  await page.mouse.up();
}
const demo = async (name) => {
  await page.keyboard.press("Shift+D");
  await page.getByRole("button", { name }).click();
};
const flag = (sel, text, sub, opts) => page.evaluate(([s, t, u, o]) => window.__flag(s, t, u, o), [sel, text, sub ?? "", opts ?? {}]);
const unflag = () => page.evaluate(() => window.__unflag());

// Start from a clean demo, signed out.
await page.goto(`${base}/login`);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForLoadState("networkidle");
await wait(600);
await page.mouse.move(mx, my);

await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
recording = true;
const started = Date.now();
const mark = (label) => console.log(`${((Date.now() - started) / 1000).toFixed(1)}s ${label}`);

if (mode === "demo") {
  mark("login");
  await wait(2600);
  await click(page.getByRole("button", { name: "Log in" }));
  await page.waitForURL("**/locations");
  mark("locations");
  await wait(2200);
  await click(page.getByRole("link", { name: /Makerspace 1/ }).first(), { fy: 0.3 });
  await page.waitForURL("**/l/ms1");
  mark("home");
  await moveTo({ x: 700, y: 520 }, { steps: 30 });
  await wait(4200);
  await demo("Trigger irregularity");
  mark("irregularity triggered");
  await moveTo({ x: 330, y: 420 }, { steps: 30 });
  await page.getByRole("region", { name: "Alerts" }).getByRole("button", { name: "Review" }).waitFor();
  mark("banner");
  await wait(3200);
  await click(page.getByRole("region", { name: "Alerts" }).getByRole("button", { name: "Review" }));
  mark("alert modal");
  await wait(1200);
  const chart = page.getByRole("dialog", { name: /looks irregular/ }).locator(".recharts-wrapper");
  const cb = await chart.boundingBox();
  await moveTo({ x: cb.x + cb.width * 0.55, y: cb.y + cb.height * 0.6 }, { steps: 30 });
  await wait(1400);
  await moveTo({ x: cb.x + cb.width * 0.985, y: cb.y + cb.height * 0.35 }, { steps: 30 });
  await wait(1800);
  await click(page.getByRole("dialog", { name: /looks irregular/ }).getByRole("button", { name: "Call technician" }));
  mark("technician panel");
  await wait(2600);
  await click(page.getByRole("button", { name: "Send request" }));
  mark("request sent");
  await wait(3000);
  await click(page.getByRole("button", { name: "Done" }));
  await wait(1500);
  await demo(/Trigger idle/);
  mark("idle triggered");
  const prompt = page.getByRole("alertdialog");
  await prompt.waitFor();
  await moveTo(prompt, { fx: 0.4, fy: 0.3, steps: 30 });
  await wait(2600);
  await click(prompt.getByRole("button", { name: "Shut down" }));
  mark("shutdown");
  await wait(4200);
  await click(page.getByRole("switch", { name: "Show all machines" }));
  await wait(1300);
  await click(page.getByRole("link", { name: /^Laser cutter Off/ }).first(), { fy: 0.4 });
  mark("laser detail");
  await wait(1600);
  await click(page.getByRole("button", { name: "Assign user" }).first());
  mark("assign");
  await wait(700);
  const name = page.getByLabel("Name or company");
  await click(name);
  await name.pressSequentially("Beta Inc.", { delay: 85 });
  await wait(400);
  await click(page.getByRole("button", { name: "This afternoon" }));
  await wait(900);
  await click(page.getByRole("button", { name: "Save assignment" }));
  await wait(2000);
  await demo(/Fast forward/);
  await page.waitForURL("**/reports");
  mark("daily report");
  await moveTo({ x: 820, y: 300 }, { steps: 24 });
  await wait(3000);
  await page.mouse.wheel(0, 420);
  await wait(2200);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await wait(900);
  await page.evaluate(() => (window.print = () => {}));
  await click(page.getByRole("button", { name: "Export PDF" }));
  await page.emulateMedia({ media: "print" });
  mark("print preview");
  await wait(3400);
} else {
  // 20 s: the main components, flagged. The irregularity starts just before the first frame.
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: /Makerspace 1/ }).first().click();
  await page.waitForURL("**/l/ms1");
  await wait(1200);
  await demo("Trigger irregularity");
  const review = page.getByRole("region", { name: "Alerts" }).getByRole("button", { name: "Review" });
  await review.waitFor();
  await wait(700);
  frames.length = 0;
  const t0 = Date.now();
  const at = async (s) => {
    const d = t0 + s * 1000 - Date.now();
    if (d > 0) await wait(d);
  };
  mark("flags start");
  const fast = { steps: 12, pause: 90 };
  await flag("section[aria-labelledby=in-use] .grid", "Every machine in use, live", "Who, how long, and its power every second", { pad: 10, side: "below" });
  await moveTo({ x: 560, y: 560 }, { steps: 18 });
  await at(2.0);
  await unflag();
  await flag("[aria-label=Alerts]", "Irregular draw caught in seconds", "Before the machine breaks, not after", { pad: 0, side: "below" });
  await moveTo(review, { steps: 30 });
  await at(3.9);
  await unflag();
  await click(review, fast);
  await wait(420);
  await flag("dialog[open] .recharts-wrapper", "Live draw against its learned normal range", "Orange dots: the irregular points", { pad: 6, side: "above" });
  await at(6.6);
  await unflag();
  const call = page.getByRole("dialog", { name: /looks irregular/ }).getByRole("button", { name: "Call technician" });
  await flag("dialog[open] div.mt-5.flex", "Owner decides in one tap", "Shut down, call a technician, or mark OK", { pad: 4, side: "above" });
  await moveTo(call, { steps: 24 });
  await at(8.2);
  await unflag();
  await click(call, fast);
  await wait(450);
  await click(page.getByRole("button", { name: "Send request" }), fast);
  await wait(250);
  await flag("dialog[open] .toast-in", "Technician request sent", "Machine history attached automatically", { pad: 6, side: "left", green: true });
  await at(11.3);
  await unflag();
  await click(page.getByRole("button", { name: "Done" }), fast);
  await demo(/Trigger idle/);
  const prompt = page.getByRole("alertdialog");
  await prompt.waitFor();
  await wait(250);
  await flag("[role=alertdialog]", "Idle for 45 min: shut it down remotely", "It stops, it's logged, it never restarts on its own", { pad: 6, side: "above", align: "right" });
  await moveTo(prompt.getByRole("button", { name: "Shut down" }), { steps: 26 });
  await at(14.9);
  await unflag();
  await click(prompt.getByRole("button", { name: "Shut down" }), fast);
  await at(16.8);
  await demo(/Fast forward/);
  await page.waitForURL("**/reports");
  await wait(200);
  await flag("main .grid.gap-6", "Daily report, automatically", "Usage and energy per machine and per member", { pad: 8, side: "above" });
  await at(20.6);
}

recording = false;
await cdp.send("Page.stopScreencast");
mark("done");
await browser.close();

// Constant 30 fps from the variable-rate screencast, encoded for quality.
const list = [];
frames.forEach((f, i) => {
  const file = `f${String(i).padStart(5, "0")}.jpg`;
  writeFileSync(join(frameDir, file), Buffer.from(f.data, "base64"));
  const next = frames[i + 1]?.t ?? f.t + 0.5;
  list.push(`file '${file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
});
list.push(`file 'f${String(frames.length - 1).padStart(5, "0")}.jpg'`);
writeFileSync(join(frameDir, "list.txt"), list.join("\n"));
const master = join(out, mode === "demo" ? "prevumo-demo-70s.mp4" : "prevumo-flags-20s.mp4");
const trim = mode === "flags" ? ["-t", "20"] : [];
const pad = mode === "flags" ? "tpad=stop_mode=clone:stop_duration=2," : "";
execFileSync(FFMPEG, [
  "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(frameDir, "list.txt"),
  ...trim, "-vf", `${pad}fps=30,scale=1920:1080:flags=lanczos,format=yuv420p`, "-an",
  "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-movflags", "+faststart", master,
]);
console.log(`wrote ${master} from ${frames.length} frames`);
