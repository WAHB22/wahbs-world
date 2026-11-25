// Copies every prototype page into public/ so the Vercel site hosts them itself, split in two parts:
//   /software/owner-app/, /software/manual/                         software prototype (the dashboard is the React app)
//   /hardware/system/, /hardware/welder/, ... /hardware/laser-cutter/  hardware prototypes
// three.js and the fonts are copied into public/vendor, so the pages load nothing from other sites.
// Usage (from prevumo): node kit/site.mjs   (then npm run build; commit public/ so Vercel can serve it)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const kit = dirname(fileURLToPath(import.meta.url));
const app = join(kit, "..");
const pub = join(app, "public");
const three = join(app, "..", "node_modules", "three");
const fonts = join(app, "node_modules", "@fontsource-variable");

// source folder, part, slug, title, description
const PAGES = [
  ["app", "software", "owner-app", "Owner app", "PREVUMO owner app concept: machines, alerts, members, resources and manuals, with demo data."],
  ["manual", "software", "manual", "QR machine manual", "PREVUMO QR machine manual: what a member sees after scanning the sticker on a box."],
  ["overview", "hardware", "system", "System overview", "PREVUMO system overview: modules on each machine, Wi-Fi, the PREVUMO cloud and the owner app."],
  ["welder", "hardware", "welder", "Welder module", "PREVUMO welder module: NFC fob, QR manual, gas valve, oxygen sensor and wire scale."],
  ["printer", "hardware", "printer", "3D printer module", "PREVUMO 3D printer module: spool scale, failed print pause and a cool down before power off."],
  ["enclosed", "hardware", "enclosed-printer", "Enclosed printer module", "PREVUMO enclosed printer module: the printer box plus a chamber temperature sensor."],
  ["multimaker", "hardware", "multimaker", "Multimaker module", "PREVUMO multimaker module: print, laser or CNC picked on the box, each with its own resource."],
  ["laser", "hardware", "laser-cutter", "Laser cutter module", "PREVUMO laser cutter module: exhaust airflow and air interlocks, flame and missed tap pause, coolant stop."],
];
// the Claude links the pages used before, and where each page lives now
const MOVED = {
  KAUbvfq3DmXSjazq2fNP8Q: "/hardware/welder/", T8ZbrGETfFSC93hxXRPbfV: "/hardware/printer/", "75rKRdjDcEjJiDaA1jvsZ4": "/hardware/enclosed-printer/",
  C52M2y6pjY9HUNtT7dSVgp: "/hardware/multimaker/", "5e6JmpAoJxPuM4aq2bjoHg": "/hardware/laser-cutter/", RAf322imEcX6BZJNPqsnQb: "/hardware/system/",
  H3puTqjPPLrXovR8i2b6jk: "/software/manual/", "4h4W69hJd84m2PPxQsAU6n": "/software/owner-app/",
};

const copy = (from, to) => { mkdirSync(dirname(to), { recursive: true }); copyFileSync(from, to); };
for (const d of ["software", "hardware", "vendor"]) rmSync(join(pub, d), { recursive: true, force: true });

// vendor files: three.js r186 and only the addons the engine imports, plus the three web fonts
copy(join(three, "build", "three.module.js"), join(pub, "vendor/three/build/three.module.js"));
copy(join(three, "build", "three.core.js"), join(pub, "vendor/three/build/three.core.js"));
copy(join(three, "LICENSE"), join(pub, "vendor/three/LICENSE"));
for (const f of ["geometries/RoundedBoxGeometry.js", "utils/BufferGeometryUtils.js", "lines/Line2.js", "lines/LineSegments2.js", "lines/LineGeometry.js", "lines/LineSegmentsGeometry.js", "lines/LineMaterial.js"])
  copy(join(three, "examples/jsm", f), join(pub, "vendor/three/examples/jsm", f));
const FONT_FILES = { "Space Grotesk": ["space-grotesk", "300 700"], Inter: ["inter", "100 900"], "JetBrains Mono": ["jetbrains-mono", "100 800"] };
for (const [, [dir]] of Object.entries(FONT_FILES)) copy(join(fonts, dir, "files", `${dir}-latin-wght-normal.woff2`), join(pub, `vendor/fonts/${dir}.woff2`));
copy(join(kit, "engine.js"), join(pub, "hardware/kit/engine.js"));
copy(join(kit, "engine.css"), join(pub, "hardware/kit/engine.css"));

const FONT_CSS = `<style>\n${Object.entries(FONT_FILES).map(([fam, [dir, w]]) => `  @font-face { font-family: "${fam}"; src: url("/vendor/fonts/${dir}.woff2") format("woff2"); font-weight: ${w}; font-display: swap; }`).join("\n")}\n</style>`;
const IMPORTMAP = `<script type="importmap">{ "imports": { "three": "/vendor/three/build/three.module.js", "three/addons/": "/vendor/three/examples/jsm/" } }</script>`;

const nav = (part, title) => `<nav class="pv-site" aria-label="PREVUMO prototypes">
  <a class="pv-home" href="/"><span class="pv-mark" aria-hidden="true"></span>PREVUMO <span class="pv-sub">prototypes</span></a>
  <span class="pv-parts">
    <a href="/software"${part === "software" ? ' aria-current="true"' : ""}>Software prototype</a>
    <a href="/hardware"${part === "hardware" ? ' aria-current="true"' : ""}>Hardware prototypes</a>
  </span>
  <span class="pv-here">${title}</span>
</nav>
<style>
  .pv-site { position: relative; z-index: 20; display: flex; align-items: center; gap: 6px 18px; flex-wrap: wrap; min-height: 54px; padding: 8px max(16px, env(safe-area-inset-right, 0px)) 8px max(16px, env(safe-area-inset-left, 0px)); background: #FFFDF8; border-bottom: 1.5px solid #E3D6C0; font: 500 14px/1.2 "Inter", ui-sans-serif, system-ui, sans-serif; color: #1F3D2B; }
  .pv-site a { color: #1F3D2B; text-decoration: none; border-radius: 8px; }
  .pv-site a:focus-visible { outline: 3px solid #2F6B45; outline-offset: 2px; }
  .pv-home { display: inline-flex; align-items: center; gap: 8px; font: 700 15px/1 "Space Grotesk", "Inter", sans-serif; letter-spacing: 0.08em; }
  .pv-sub { font: 500 13px/1 "JetBrains Mono", ui-monospace, monospace; letter-spacing: 0; color: #5B6B5F; }
  .pv-mark { width: 16px; height: 21px; border-radius: 4px; background: #1F3D2B; display: inline-block; }
  .pv-parts { display: inline-flex; gap: 4px; padding: 3px; border-radius: 11px; background: #EDE4D3; }
  .pv-parts a { display: inline-flex; align-items: center; min-height: 34px; padding: 0 12px; }
  .pv-parts a[aria-current] { background: #1F3D2B; color: #F3EBDD; }
  .pv-here { margin-left: auto; font: 500 13px/1.2 "JetBrains Mono", ui-monospace, monospace; color: #5B6B5F; }
  @media (max-width: 640px) { .pv-here { display: none; } .pv-parts a { padding: 0 9px; font-size: 13px; } }
</style>`;

for (const [src, part, slug, title, desc] of PAGES) {
  let html = readFileSync(join(app, src, "index.html"), "utf8");
  const swap = (tag, body) => {
    const re = new RegExp(`<!--${tag}-->[\\s\\S]*?<!--/${tag}-->`);
    if (!re.test(html)) return false;
    html = html.replace(re, () => body); return true;
  };
  if (!swap("FONTS", FONT_CSS)) throw new Error(`${src}: no FONTS block`);
  swap("IMPORTMAP", IMPORTMAP);
  html = html.replace(/<title>[\s\S]*?<\/title>\n?/, "").replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/, "");
  html = html.replaceAll('href="../kit/engine.css"', 'href="/hardware/kit/engine.css"').replaceAll('from "../kit/engine.js"', 'from "/hardware/kit/engine.js"');
  html = html.replace(/href="https:\/\/claude\.ai\/artifact\/([A-Za-z0-9]+)"(?: target="_blank" rel="noopener")?/g, (m, id) => {
    if (!MOVED[id]) throw new Error(`${src}: unknown link ${id}`); return `href="${MOVED[id]}"`;
  });
  html = html.replace(/"https:\/\/claude\.ai\/artifact\/([A-Za-z0-9]+)"/g, (m, id) => {
    if (!MOVED[id]) throw new Error(`${src}: unknown link ${id}`); return `"${MOVED[id]}"`;
  });
  if (/claude\.ai|node_modules|\.\.\/kit\//.test(html)) throw new Error(`${src}: an outside or local path is left`);
  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#F3EBDD">
<meta name="description" content="${desc}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<title>${title} · PREVUMO ${part === "software" ? "software prototype" : "hardware prototypes"}</title>
</head>
<body>
${nav(part, title)}
${html}
</body>
</html>
`;
  const out = join(pub, part, slug, "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page);
  console.log(`/${part}/${slug}/`, (page.length / 1024).toFixed(1), "KB");
}

