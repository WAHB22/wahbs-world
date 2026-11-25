// PREVUMO final presentation (GNG 4120, Group 10). Same design as the first deck (deck/build.js):
// the Field notes palette, Space Grotesk, Inter, JetBrains Mono, and the heartbeat line as the motif.
// Usage (from prevumo/final): PPTX_SKILL=<pptx skill dir> NODE_PATH=../deck/node_modules node build.cjs
// Films: media/hardware.mp4 and media/software.mp4 (made by film.mjs); without them the slides show the posters.
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const QRCode = require("qrcode");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const Pi = require("react-icons/pi");
const NOTES = require("./notes.cjs");

const SKILL = process.env.PPTX_SKILL || "/mnt/skills/public/pptx";
const { applyTheme } = require(path.join(SKILL, "scripts/apply_theme.js"));

const HERE = __dirname;
const OUT_DIR = path.join(HERE, "..", "deliverables", "final");
fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : path.join(OUT_DIR, "PREVUMO-final.pptx");
const URL_LIVE = "https://prevumo.vercel.app";
const MEDIA = path.join(HERE, "media");
const ASSETS = path.join(HERE, "assets");
const FILMS = {
  hardware: { file: path.join(MEDIA, "hardware.mp4"), poster: path.join(MEDIA, "hardware.jpg"), fallback: path.join(HERE, "..", "deliverables", "pd-b3", "1-welder.png") },
  software: { file: path.join(MEDIA, "software.mp4"), poster: path.join(MEDIA, "software.jpg"), fallback: path.join(ASSETS, "owner-app-169.png") },
};

const HEX = {
  bg: "F3EBDD", surface: "FFFDF8", border: "E3D6C0", ink: "1F3D2B", muted: "5B6B5F",
  green: "2F6B45", greenTint: "D6E4D3", orange: "E07A2E", orangeText: "B4561A", orangeTint: "F6D2B4", rust: "A63D1F", idle: "EDE4D3",
};
const THEME = {
  name: "PREVUMO Field notes",
  headFontFace: "Space Grotesk",
  bodyFontFace: "Inter",
  colors: {
    dk1: HEX.ink, lt1: HEX.surface, dk2: HEX.muted, lt2: HEX.bg,
    accent1: HEX.green, accent2: HEX.orange, accent3: HEX.rust, accent4: HEX.greenTint, accent5: HEX.orangeTint, accent6: HEX.idle,
    hlink: HEX.green, folHlink: HEX.muted,
  },
};
const MONO = "JetBrains Mono";
const HEAD = "Space Grotesk";

/* ---------- drawn assets (the motif is the first deck's heartbeat line) ---------- */

function rnd(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function heartbeat({ w, h, line, band, spikeAt = 0.62, stroke = 6 }) {
  const y0 = h * 0.62, amp = h * 0.035;
  const pts = [];
  for (let x = 0; x <= w; x += 8) pts.push([x, y0 + (rnd(x) - 0.5) * amp]);
  const sx = w * spikeAt;
  const spike = [[sx - 30, y0], [sx - 12, y0 - h * 0.08], [sx, y0 + h * 0.06], [sx + 16, y0 - h * 0.5], [sx + 34, y0 + h * 0.2], [sx + 52, y0 - h * 0.32], [sx + 70, y0 + h * 0.08], [sx + 86, y0]];
  const d = (arr) => arr.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const dots = [spike[3], spike[4], spike[5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${stroke * 1.6}" fill="#${HEX.orange}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${band ? `<rect x="0" y="${y0 - h * 0.1}" width="${w}" height="${h * 0.2}" rx="${h * 0.04}" fill="${band}"/>` : ""}
    <path d="${d(pts.filter(([x]) => x < sx - 30))}" fill="none" stroke="${line}" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d(spike)}" fill="none" stroke="#${HEX.orange}" stroke-width="${stroke * 1.15}" stroke-linejoin="round" stroke-linecap="round"/>${dots}
    <path d="${d([[sx + 86, y0], ...pts.filter(([x]) => x > sx + 86)])}" fill="none" stroke="${line}" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

/** One machine's day on one line: warm up (normal), steady work inside its band, on with nobody working (idle), then a break out of its band (irregular). */
function signatureSvg() {
  const w = 2400, h = 700, top = 150, bot = 600;
  const Y = (v) => bot - v * (bot - top);
  const seg = [];
  const pt = (x, v) => seg.push([x, Y(v)]);
  for (let x = 0; x <= 120; x += 10) pt(x, 0.02);
  for (let x = 130; x <= 380; x += 10) { const k = (x - 130) / 250; pt(x, 0.86 - 0.32 * k + (rnd(x) - 0.5) * 0.04); }
  for (let x = 390; x <= 1060; x += 10) pt(x, 0.5 + (rnd(x + 7) - 0.5) * 0.07 + Math.sin(x / 36) * 0.025);
  for (let x = 1070; x <= 1110; x += 10) pt(x, 0.5 - ((x - 1060) / 50) * 0.42);
  for (let x = 1120; x <= 1620; x += 10) pt(x, 0.08 + (rnd(x + 3) - 0.5) * 0.015);
  for (let x = 1630; x <= 1690; x += 10) pt(x, 0.08 + ((x - 1620) / 70) * 0.42);
  for (let x = 1700; x <= 1890; x += 10) pt(x, 0.5 + (rnd(x + 1) - 0.5) * 0.07);
  const hot = [];
  for (let x = 1900; x <= 2240; x += 10) hot.push([x, Y(0.5 + 0.34 * Math.min(1, (x - 1900) / 60) + (rnd(x + 9) - 0.5) * 0.18)]);
  const d = (a) => a.map(([x, y], i) => `${i ? "L" : "M"}${x},${y.toFixed(1)}`).join("");
  const band = (x0, x1) => `<rect x="${x0}" y="${Y(0.62)}" width="${x1 - x0}" height="${Y(0.38) - Y(0.62)}" rx="14" fill="#${HEX.greenTint}"/>`;
  const dots = hot.filter((_, i) => i % 4 === 2).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#${HEX.orange}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${band(380, 1070)}${band(1690, 2400)}
    <rect x="130" y="${Y(0.95)}" width="250" height="${Y(0.45) - Y(0.95)}" rx="14" fill="none" stroke="#${HEX.green}" stroke-width="5" stroke-dasharray="16 12"/>
    <line x1="0" y1="${bot + 40}" x2="${w}" y2="${bot + 40}" stroke="#${HEX.border}" stroke-width="5"/>
    <path d="${d(seg.slice(0, seg.findIndex(([x]) => x >= 1120)))}" fill="none" stroke="#${HEX.green}" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d(seg.slice(seg.findIndex(([x]) => x >= 1110), seg.findIndex(([x]) => x >= 1630)))}" fill="none" stroke="#${HEX.muted}" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d(seg.slice(seg.findIndex(([x]) => x >= 1620)))}" fill="none" stroke="#${HEX.green}" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d([seg[seg.length - 1], ...hot])}" fill="none" stroke="#${HEX.orange}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>${dots}
  </svg>`;
}

/** The pivot path: three stops on one line, the last one lit. */
function pathSvg() {
  const w = 2400, h = 120, y = 60, xs = [34, 847, 1660];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <line x1="34" y1="${y}" x2="1660" y2="${y}" stroke="#${HEX.border}" stroke-width="8"/>
    <line x1="1660" y1="${y}" x2="2340" y2="${y}" stroke="#${HEX.green}" stroke-width="8"/>
    ${xs.slice(0, 2).map((x) => `<circle cx="${x}" cy="${y}" r="24" fill="#${HEX.surface}" stroke="#${HEX.muted}" stroke-width="8"/><line x1="${x - 12}" y1="${y - 12}" x2="${x + 12}" y2="${y + 12}" stroke="#${HEX.muted}" stroke-width="7" stroke-linecap="round"/><line x1="${x + 12}" y1="${y - 12}" x2="${x - 12}" y2="${y + 12}" stroke="#${HEX.muted}" stroke-width="7" stroke-linecap="round"/>`).join("")}
    <circle cx="${xs[2]}" cy="${y}" r="34" fill="#${HEX.orange}"/><circle cx="${xs[2]}" cy="${y}" r="13" fill="#${HEX.surface}"/>
  </svg>`;
}

async function png(svg, width) {
  const buf = await sharp(Buffer.from(svg)).resize({ width }).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}
async function icon(Comp, color, size = 256) {
  return png(renderToStaticMarkup(React.createElement(Comp, { size, color: `#${color}` })), size);
}
const file64 = (f, type = "image/png") => `${type};base64,` + fs.readFileSync(f).toString("base64");
async function qr(url, dark) {
  const buf = await QRCode.toBuffer(url, { margin: 1, width: 600, errorCorrectionLevel: "M", color: { dark: `#${dark ? HEX.bg : HEX.ink}`, light: `#${dark ? HEX.ink : HEX.surface}` } });
  return "image/png;base64," + buf.toString("base64");
}

/**
 * pptxgenjs embeds a video with no animation, so PowerPoint would only play it on a click on the video itself.
 * This adds PowerPoint's own "Start: Automatically" timing, so each film plays as soon as its slide appears.
 */
async function autoplayFilms(file) {
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  let n = 0;
  for (const part of slides) {
    let xml = await zip.file(part).async("string");
    const m = xml.match(/<p:cNvPr id="(\d+)" name="([^"]*film, no sound)"/);
    if (!m) continue;
    const spid = m[1];
    const which = /Hardware/.test(m[2]) ? "hardware" : "software";
    const ms = Math.round((FILMS[which].seconds || 60) * 1000);
    const timing =
      `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>` +
      `<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>` +
      `<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>` +
      `<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
      `<p:par><p:cTn id="5" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="afterEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
      `<p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="6" dur="${ms}" fill="hold"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cBhvr></p:cmd>` +
      `</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>` +
      `</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>` +
      `<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>` +
      `<p:video><p:cMediaNode vol="80000"><p:cTn id="7" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst></p:cTn>` +
      `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cMediaNode></p:video>` +
      `</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`;
    xml = xml.replace("</p:clrMapOvr></p:sld>", `</p:clrMapOvr>${timing}</p:sld>`);
    zip.file(part, xml);
    n++;
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  return n;
}

/* ---------- deck ---------- */

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
  pres.title = "PREVUMO final presentation, GNG 4120 Group 10";
  pres.author = "Group 10";
  pres.company = "Group 10";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;
  const W = 13.333;

  const A = {
    curveDark: await png(heartbeat({ w: 3000, h: 520, line: `#${HEX.greenTint}`, band: "rgba(214,228,211,0.10)", stroke: 7 }), 3000),
    curveLight: await png(heartbeat({ w: 3000, h: 150, line: `#${HEX.green}`, band: `#${HEX.greenTint}`, stroke: 4, spikeAt: 0.78 }), 3000),
    signature: await png(signatureSvg(), 2400),
    path: await png(pathSvg(), 2400),
    arrow: await icon(Pi.PiArrowRightBold, HEX.muted),
    quote: await icon(Pi.PiQuotesFill, HEX.orange),
    shield: await icon(Pi.PiShieldCheckBold, HEX.green),
    shieldRust: await icon(Pi.PiShieldCheckBold, HEX.rust),
    cap: await icon(Pi.PiGraduationCapBold, HEX.ink),
    users: await icon(Pi.PiUsersThreeBold, HEX.ink),
    books: await icon(Pi.PiBooksBold, HEX.ink),
    wrench: await icon(Pi.PiWrenchBold, HEX.green),
    coins: await icon(Pi.PiCoinsBold, HEX.green),
    handshake: await icon(Pi.PiHandshakeBold, HEX.ink),
    machines: Object.fromEntries(["welder", "printer", "laser", "multimaker", "enclosed"].map((m) => [m, file64(path.join(ASSETS, `machine-${m}.png`))])),
    qrLight: await qr(URL_LIVE, false),
  };
  for (const f of Object.values(FILMS)) {
    f.posterData = fs.existsSync(f.poster) ? file64(f.poster, "image/jpeg") : file64(f.fallback);
    if (fs.existsSync(f.file)) f.seconds = +require("child_process").execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f.file]).toString().trim();
  }

  /* Layouts, as in the first deck: dark (title, close), light content with a title, light appendix. */
  pres.defineSlideMaster({ title: "PREVUMO Dark", background: { color: HEX.ink }, objects: [] });
  const footer = (extra) => [
    { text: { text: "PREVUMO", options: { x: 0.75, y: 6.95, w: 2.5, h: 0.3, fontFace: HEAD, fontSize: 10, bold: true, charSpacing: 3, color: C.text2, margin: 0 } } },
    ...(extra ? [{ text: { text: extra, options: { x: 2.0, y: 6.95, w: 4, h: 0.3, fontFace: MONO, fontSize: 10, color: C.text2, margin: 0 } } }] : []),
  ];
  const titlePh = { placeholder: { options: { name: "title", type: "title", x: 0.75, y: 0.5, w: 11.8, h: 0.9, fontFace: HEAD, fontSize: 36, bold: true, color: C.text1, valign: "top", align: "left", margin: 0 }, text: "" } };
  const slideNumber = { x: 12.1, y: 6.95, w: 0.5, h: 0.3, fontFace: MONO, fontSize: 10, color: HEX.muted, align: "right" };
  pres.defineSlideMaster({ title: "PREVUMO Content", background: { color: HEX.bg }, margin: [0.5, 0.75, 0.6, 0.75], objects: [titlePh, ...footer()], slideNumber });
  pres.defineSlideMaster({ title: "PREVUMO Appendix", background: { color: HEX.bg }, margin: [0.5, 0.75, 0.6, 0.75], objects: [titlePh, ...footer("Appendix · for questions")], slideNumber });

  const text = (slide, t, o) => slide.addText(t, { isTextBox: true, margin: 0, ...o });
  const card = (slide, o) => slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { rectRadius: 0.12, fill: { color: C.background1 }, line: { color: HEX.border, width: 0.75 }, ...o });
  const pill = (slide, o) => slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { rectRadius: 0.3, ...o });
  const source = (slide, t, y = 6.55) => text(slide, t, { x: 0.75, y, w: 11.8, h: 0.3, fontSize: 10, color: C.text2, objectName: "Source" });
  const notes = (slide, key) => slide.addNotes(NOTES[key]);
  const film = (slide, which, o, name) => {
    const f = FILMS[which];
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: o.x - 0.05, y: o.y - 0.05, w: o.w + 0.1, h: o.h + 0.1, rectRadius: 0.1, fill: { color: HEX.ink }, line: { color: HEX.ink }, objectName: `${name} frame` });
    if (fs.existsSync(f.file)) slide.addMedia({ type: "video", path: f.file, ...o, cover: f.posterData, objectName: name });
    else slide.addImage({ data: f.posterData, ...o, sizing: { type: "cover", w: o.w, h: o.h }, objectName: `${name} poster` });
  };

  /* 1. Title */
  pres.addSection({ title: "Talk" });
  let s = pres.addSlide({ masterName: "PREVUMO Dark", sectionTitle: "Talk" });
  s.addImage({ data: A.curveDark, x: 0, y: 2.25, w: W, h: W * (520 / 3000), objectName: "Heartbeat motif" });
  text(s, "PREVUMO", { x: 0.75, y: 0.75, w: 11, h: 1.5, fontFace: HEAD, fontSize: 88, bold: true, charSpacing: 6, color: HEX.bg });
  text(s, "PREVentive Usage MOnitor", { x: 0.75, y: 2.0, w: 6, h: 0.45, fontFace: MONO, fontSize: 16, bold: true, color: HEX.orange });
  text(s, "A preventive box for every machine in a makerspace.", { x: 0.75, y: 4.95, w: 10.5, h: 0.9, fontFace: HEAD, fontSize: 28, color: HEX.bg });
  text(s, "Jana Mghabghab · Tobi Adebayo · Mohamed Wahb Berguia · Daksh Prabhulal Dholu · Akhil Matta", { x: 0.75, y: 6.55, w: 9.0, h: 0.35, fontSize: 12, color: HEX.greenTint });
  text(s, "GNG 4120 · Group 10 · Nov 27, 2026", { x: 9.3, y: 6.55, w: 3.3, h: 0.35, fontFace: MONO, fontSize: 11, color: HEX.greenTint, align: "right" });
  notes(s, "s1");

  /* 2. Where we started */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  s.addText("Where we started", { placeholder: "title" });
  s.addImage({ data: A.path, x: 0.75, y: 1.55, w: 11.8, h: 11.8 * (120 / 2400), objectName: "Pivot path" });
  const stops = [
    { tag: "PD A", t: "Share electricity", d: "A box that measures each user's electricity, so the space can bill it.", ev: "All three owners we asked build electricity into rent or membership.", out: "Billing dropped" },
    { tag: "GA3", t: "Any shared space", d: "Shared kitchens, restaurants, cafés and makerspaces with costly equipment.", ev: "Cafés leave equipment on at closing, but were not interested in a device.", out: "Cafés dropped" },
    { tag: "PD B3, now", t: "Makerspaces only", d: "One box per machine type, made for how each one fails.", ev: "“Managing equipment is one of the biggest tasks we have.”", who: "Ontario makerspace director", out: "Our customer" },
  ];
  stops.forEach((st, i) => {
    const x = 0.75 + i * 4.0, last = i === 2;
    text(s, st.tag, { x, y: 2.35, w: 3.6, h: 0.3, fontFace: MONO, fontSize: 13, color: last ? HEX.rust : C.text2 });
    text(s, st.t, { x, y: 2.7, w: 3.6, h: 0.5, fontFace: HEAD, fontSize: 24, bold: true, color: C.text1 });
    text(s, st.d, { x, y: 3.25, w: 3.5, h: 0.75, fontSize: 14, color: C.text2, valign: "top" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 4.15, w: 3.7, h: 1.7, rectRadius: 0.12, fill: { color: last ? HEX.ink : HEX.surface }, line: { color: last ? HEX.ink : HEX.border, width: 0.75 }, objectName: `Evidence ${i + 1}` });
    text(s, st.ev, { x: x + 0.25, y: 4.35, w: 3.25, h: 0.75, fontFace: last ? HEAD : undefined, fontSize: last ? 15 : 14, bold: last, color: last ? HEX.surface : C.text1, valign: "top" });
    if (st.who) text(s, st.who, { x: x + 0.25, y: 5.08, w: 3.3, h: 0.3, fontSize: 13, color: HEX.greenTint });
    text(s, st.out, { x: x + 0.25, y: 5.45, w: 3.25, h: 0.3, fontFace: HEAD, fontSize: 14, bold: true, color: last ? HEX.orange : HEX.rust });
  });
  text(s, "Behind it: 10 interviews and 49 outreach emails (GA3, Oct 2026).", { x: 0.75, y: 6.05, w: 11.8, h: 0.35, fontSize: 15, color: C.text1 });
  source(s, "6 competitors studied in GA3. Owner quotes anonymized.");
  notes(s, "s2");

  /* 3. Every machine fails its own way */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  s.addText("Every machine fails its own way", { placeholder: "title" });
  const machines = [
    { m: "welder", t: "Welder", f: ["Shielding gas left open", "A leak has no smell and sinks", "Wire weighed by hand, if at all"] },
    { m: "printer", t: "3D printers", f: ["Nozzle left hot, over 200 °C", "Prints fail unwatched", "Filament billed by the gram"] },
    { m: "laser", t: "Laser cutter", f: ["Fire when left alone", "Runs with no exhaust or air", "Coolant stops, tube is ruined"] },
    { m: "multimaker", t: "Multimaker", f: ["Print, laser and CNC in one", "Three machines, three risks", "The box must know the mode"] },
  ];
  machines.forEach((mc, i) => {
    const x = 0.75 + i * 3.0, iw = 2.8, ih = iw * (980 / 1200);
    s.addImage({ data: A.machines[mc.m], x, y: 1.55, w: iw, h: ih, objectName: `${mc.t} drawing` });
    text(s, mc.t, { x, y: 1.55 + ih + 0.04, w: iw, h: 0.42, fontFace: HEAD, fontSize: 20, bold: true, color: C.text1 });
    text(s, mc.f.map((f, j) => ({ text: f, options: { bullet: { code: "25CF", indent: 16 }, bold: j === 0, color: j === 0 ? HEX.ink : HEX.muted, breakLine: j < mc.f.length - 1 } })), {
      x, y: 1.55 + ih + 0.48, w: iw, h: 1.05, fontSize: 13, color: C.text1, valign: "top", paraSpaceAfter: 3, objectName: `${mc.t} risks`,
    });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 5.75, w: 11.8, h: 0.62, rectRadius: 0.1, fill: { color: HEX.ink }, line: { color: HEX.ink }, objectName: "Conclusion band" });
  text(s, [{ text: "So each machine type gets its own module: ", options: { bold: true } }, { text: "one box, its own sensors." }], {
    x: 1.0, y: 5.75, w: 11.3, h: 0.62, fontFace: HEAD, fontSize: 18, color: HEX.surface, valign: "middle",
  });
  source(s, "Drawings from our hardware prototypes (concept, not built). Prusa: PLA nozzle 210 to 215 °C; CCOHS: argon and CO2 are simple asphyxiants; U of Regina: $1.00 per 10 g.");
  notes(s, "s3");

  /* 4. Hardware prototypes */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  s.addText("One box, five modules", { placeholder: "title" });
  const vw = 8.2, vh = vw * 9 / 16;
  film(s, "hardware", { x: 0.75, y: 1.55, w: vw, h: vh }, "Hardware film, no sound");
  source(s, "Hardware prototypes, from prevumo.vercel.app/hardware. Interactive 3D drawings: a concept, not built or tested.");
  text(s, "Every box: an NFC fob reader, a display, a QR sticker and a Wi-Fi controller.", { x: 9.35, y: 1.55, w: 3.3, h: 0.75, fontSize: 14, color: C.text1, valign: "top" });
  [["Welder", "gas valve, oxygen sensor, wire scale"], ["3D printer", "spool scale, printer link"], ["Enclosed printer", "plus a chamber sensor"], ["Multimaker", "mode buttons, exhaust switch"], ["Laser cutter", "exhaust airflow, air assist, coolant, flame"]].forEach(([t, d], i) => {
    const y = 2.55 + i * 0.72;
    s.addShape(pres.shapes.LINE, { x: 9.35, y: y - 0.06, w: 3.25, h: 0, line: { color: HEX.border, width: 0.75 } });
    text(s, t, { x: 9.35, y, w: 3.25, h: 0.3, fontFace: HEAD, fontSize: 15, bold: true, color: C.text1 });
    text(s, d, { x: 9.35, y: y + 0.3, w: 3.35, h: 0.32, fontSize: 13, color: C.text2 });
  });
  notes(s, "s4");

  /* 5. Software prototype */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  s.addText("One app for the owner", { placeholder: "title" });
  film(s, "software", { x: 0.75, y: 1.55, w: vw, h: vh }, "Software film, no sound");
  source(s, "Software prototype, from prevumo.vercel.app/software. Demo data: nothing here is measured.");
  text(s, [
    { text: "Every machine, who is on it", options: { bullet: { code: "25CF", indent: 16 }, breakLine: true } },
    { text: "Grams and minutes per member", options: { bullet: { code: "25CF", indent: 16 }, breakLine: true } },
    { text: "The QR manual on a phone", options: { bullet: { code: "25CF", indent: 16 } } },
  ], { x: 9.35, y: 1.55, w: 3.3, h: 1.0, fontSize: 14, color: C.text1, valign: "top", paraSpaceAfter: 3 });
  s.addShape(pres.shapes.LINE, { x: 9.35, y: 2.7, w: 3.25, h: 0, line: { color: HEX.border, width: 0.75 } });
  text(s, "One alert, three choices", { x: 9.35, y: 2.85, w: 3.3, h: 0.45, fontFace: HEAD, fontSize: 20, bold: true, color: C.text1 });
  [["Shut down", HEX.surface, HEX.rust, HEX.rust], ["Call technician", HEX.green, HEX.surface, HEX.green], ["Mark as OK", HEX.surface, HEX.ink, HEX.muted]].forEach(([label, fill, color, line], j) => {
    pill(s, { x: 9.35, y: 3.4 + j * 0.52, w: 2.6, h: 0.4, rectRadius: 0.2, fill: { color: fill }, line: { color: line, width: 1.25 } });
    text(s, label, { x: 9.35, y: 3.4 + j * 0.52, w: 2.6, h: 0.4, fontSize: 14, bold: true, color, align: "center", valign: "middle" });
  });
  s.addImage({ data: A.shieldRust, x: 9.35, y: 5.1, w: 0.36, h: 0.36 });
  text(s, "Safety events stop the machine first, and are reset at the machine.", { x: 9.85, y: 5.05, w: 2.8, h: 0.8, fontSize: 14, color: C.text1, valign: "top" });
  notes(s, "s5");

  /* 6. The idea underneath */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  s.addText("Every machine has its own electrical signature", { placeholder: "title" });
  const gx = 0.75, gy = 1.75, gw = 11.8, gh = gw * (700 / 2400);
  s.addImage({ data: A.signature, x: gx, y: gy, w: gw, h: gh, objectName: "One machine's day, illustrative" });
  const lab = (x, t, d, color) => {
    text(s, t, { x, y: gy - 0.22, w: 3.0, h: 0.34, fontFace: HEAD, fontSize: 16, bold: true, color });
    text(s, d, { x, y: gy + 0.12, w: 3.0, h: 0.32, fontSize: 14, color: C.text2 });
  };
  lab(gx + 0.62, "Warm up: normal", "known, so no alert", HEX.green);
  lab(gx + 3.4, "Working", "inside its own band", HEX.green);
  lab(gx + 5.55, "On, nobody working", "idle: shut off after a set time", HEX.muted);
  lab(gx + 9.1, "Out of its band", "one alert, the owner decides", HEX.orangeText);
  text(s, "One machine's day, illustrative", { x: gx, y: gy + gh + 0.02, w: 6, h: 0.32, fontFace: MONO, fontSize: 13, color: C.text2 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 5.6, w: 11.8, h: 0.95, rectRadius: 0.12, fill: { color: HEX.orangeTint }, line: { color: HEX.orangeTint }, objectName: "Honesty band" });
  text(s, [
    { text: "Nothing here is measured yet. ", options: { bold: true, fontFace: HEAD } },
    { text: "Makerspaces and Fab Labs we spoke with were open to a free pilot. That real data is what will teach each machine's normal, and tell a real problem from a false alarm." },
  ], { x: 1.05, y: 5.6, w: 11.2, h: 0.95, fontSize: 15, color: HEX.ink, valign: "middle" });
  notes(s, "s6");

  /* 7. Value, customers, partners */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  s.addText("Who it's for, and why they'd pay", { placeholder: "title" });
  text(s, "Whoever runs the space pays: university and community makerspaces, Fab Labs and libraries.", { x: 0.75, y: 1.45, w: 11.8, h: 0.45, fontSize: 17, color: C.text2 });
  [[A.wrench, "Machines protected", "From a US$1,700 welder to a US$8,000 laser."], [A.shield, "Members kept safe", "Low oxygen, flame or overheating stop it first."], [A.coins, "Materials billed fairly", "Spaces already bill about $0.10 a gram."]].forEach(([img, t, d], i) => {
    const y = 2.2 + i * 0.95;
    s.addImage({ data: img, x: 0.75, y: y + 0.04, w: 0.42, h: 0.42 });
    text(s, t, { x: 1.4, y, w: 6.6, h: 0.45, fontFace: HEAD, fontSize: 24, bold: true, color: C.text1 });
    text(s, d, { x: 1.4, y: y + 0.46, w: 6.6, h: 0.38, fontSize: 16, color: C.text2 });
  });
  const cellT = (t, o = {}) => ({ text: t, options: { fontSize: 14, color: HEX.ink, valign: "middle", ...o } });
  s.addTable([
    [cellT("Fabman", { bold: true, fontFace: HEAD }), cellT("Access and idle shutoff")],
    [cellT("Printer software", { bold: true, fontFace: HEAD }), cellT("Failed prints, by camera")],
    [cellT("PREVUMO", { bold: true, fontFace: HEAD, color: HEX.surface, fill: { color: HEX.ink } }), cellT("Sensors made for each machine, next to them", { color: HEX.surface, bold: true, fill: { color: HEX.ink } })],
  ], { x: 8.6, y: 2.2, w: 3.95, colW: [1.45, 2.5], rowH: [0.8, 0.8, 0.95], fontFace: "Inter", fill: { color: HEX.surface }, border: { type: "solid", pt: 0.75, color: HEX.border }, margin: [0.06, 0.12, 0.06, 0.12], objectName: "Alternatives" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 5.25, w: 11.8, h: 1.0, rectRadius: 0.12, fill: { color: C.background1 }, line: { color: HEX.border, width: 0.75 }, objectName: "Partners" });
  s.addImage({ data: A.handshake, x: 1.0, y: 5.5, w: 0.48, h: 0.48 });
  text(s, [
    { text: "Sponsors: none yet. ", options: { bold: true, fontFace: HEAD } },
    { text: "Customers: interest in a free pilot, nothing signed. ", options: { bold: true, fontFace: HEAD } },
    { text: "We are looking for a first host site and help with certification." },
  ], { x: 1.7, y: 5.25, w: 10.6, h: 1.0, fontSize: 15, color: C.text1, valign: "middle" });
  source(s, "Prices: Cyberweld (Millermatic 211 PRO, $1,699); Glowforge (Pro HD, $7,999); U of Regina ($1.00 per 10 g). Fabman pricing and Obico, Nov 2026.");
  notes(s, "s7");

  /* 8. Market and where we go */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  s.addText("A market we can count", { placeholder: "title" });
  [
    { big: "2,032", t: "active Fab Labs worldwide, 29 of them in Canada", src: "Fab Foundation, fablabs.io" },
    { big: "2,000+", t: "makerspaces and Fab Labs in the US", src: "Nation of Makers" },
    { big: "9 in 10", t: "Fab Labs list a laser cutter (1,858 of 2,032)", src: "Fab Foundation, fablabs.io" },
  ].forEach((st, i) => {
    const x = 0.75 + i * 4.0;
    text(s, st.big, { x, y: 1.6, w: 3.7, h: 1.2, fontFace: MONO, fontSize: 60, color: C.text1, valign: "bottom" });
    text(s, st.t, { x, y: 2.95, w: 3.5, h: 0.75, fontSize: 17, color: C.text1, valign: "top" });
    text(s, st.src, { x, y: 3.75, w: 3.5, h: 0.3, fontSize: 11, color: C.text2 });
  });
  s.addImage({ data: A.curveLight, x: 0.75, y: 4.3, w: 11.8, h: 11.8 * (150 / 3000), objectName: "Heartbeat divider" });
  text(s, "Expansion path", { x: 0.75, y: 5.1, w: 3, h: 0.35, fontFace: MONO, fontSize: 12, color: C.text2 });
  ["Canadian makerspaces", "Campus and college shops", "Small fabrication shops"].forEach((t, i) => {
    const x = 0.75 + i * 4.0;
    pill(s, { x, y: 5.5, w: 3.6, h: 0.68, fill: { color: i === 0 ? HEX.green : C.background1 }, line: { color: i === 0 ? HEX.green : HEX.border, width: 0.75 } });
    text(s, t, { x: x + 0.28, y: 5.5, w: 3.1, h: 0.68, fontSize: 16, bold: i === 0, color: i === 0 ? HEX.surface : C.text1, valign: "middle" });
    if (i < 2) s.addImage({ data: A.arrow, x: x + 3.66, y: 5.74, w: 0.2, h: 0.2 });
  });
  source(s, "fablabs.io lab list, active labs counted Nov 25, 2026. Nation of Makers: “more than 2,000 makerspaces and Fab Labs” in the US.");
  notes(s, "s8");

  /* 9. Next steps */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  s.addText("What we do next", { placeholder: "title" });
  [
    { t: "Bench test", d: "Printer and laser boxes: power cut 50 times, current checked against a meter.", pass: "Pass: every output goes safe on power loss." },
    { t: "Approval", d: "Every pilot box field evaluated by ESA, or certified, before it is installed. In Ontario this comes before any use.", pass: "Pass: an approval label on every pilot box." },
    { t: "Watch only pilot", d: "Free, four weeks in a makerspace. The box switches nothing; the owner labels every alert.", pass: "Pass: the owner keeps it on. Stop if it is ignored." },
    { t: "Welder last", d: "The most valuable module, and the hardest: an electrician and a gas fitter.", pass: "After a pilot that passes." },
  ].forEach((st, i) => {
    const x = 0.75 + i * 3.0, dark = i === 2;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.6, w: 2.8, h: 3.45, rectRadius: 0.12, fill: { color: dark ? HEX.ink : HEX.surface }, line: { color: dark ? HEX.ink : HEX.border, width: 0.75 }, objectName: `Step ${i + 1}` });
    text(s, String(i + 1), { x: x + 0.3, y: 1.85, w: 0.6, h: 0.3, fontFace: MONO, fontSize: 14, color: dark ? HEX.greenTint : C.text2 });
    text(s, st.t, { x: x + 0.3, y: 2.25, w: 2.35, h: 0.45, fontFace: HEAD, fontSize: 20, bold: true, color: dark ? HEX.surface : C.text1, valign: "top" });
    text(s, st.d, { x: x + 0.3, y: 2.8, w: 2.25, h: 1.15, fontSize: 14, color: dark ? HEX.greenTint : C.text2, valign: "top" });
    text(s, st.pass, { x: x + 0.3, y: 4.1, w: 2.3, h: 0.75, fontSize: 14, bold: true, color: dark ? HEX.orange : C.text1, valign: "top" });
    if (i < 3) s.addImage({ data: A.arrow, x: x + 2.84, y: 3.24, w: 0.18, h: 0.18 });
  });
  text(s, "Each test has a pass rule written before it starts, so the results can say no.", { x: 0.75, y: 5.35, w: 11.8, h: 0.4, fontSize: 16, color: C.text1 });
  source(s, "ESA: a product must be approved before it is used, sold, displayed or advertised in Ontario.");
  notes(s, "s9");

  /* 10. Close */
  s = pres.addSlide({ masterName: "PREVUMO Dark", sectionTitle: "Talk" });
  text(s, [{ text: "Every machine fails its own way.", options: { breakLine: true } }, { text: "PREVUMO gives each one its own guard." }], {
    x: 0.75, y: 0.75, w: 11.8, h: 1.9, fontFace: HEAD, fontSize: 36, bold: true, color: HEX.bg, valign: "top",
  });
  s.addImage({ data: A.curveDark, x: 0, y: 2.25, w: W, h: W * (520 / 3000), objectName: "Heartbeat motif" });
  text(s, "Thank you. Questions?", { x: 0.75, y: 5.55, w: 8, h: 0.7, fontFace: HEAD, fontSize: 30, bold: true, color: HEX.orange });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 10.18, y: 4.2, w: 2.5, h: 2.5, rectRadius: 0.12, fill: { color: HEX.surface }, line: { color: HEX.surface }, objectName: "QR pad" });
  s.addImage({ data: A.qrLight, x: 10.33, y: 4.35, w: 2.2, h: 2.2, objectName: "QR prevumo.vercel.app" });
  text(s, "prevumo.vercel.app", { x: 4.9, y: 6.78, w: 5.1, h: 0.4, fontFace: MONO, fontSize: 18, color: HEX.greenTint, align: "right" });
  text(s, "Every prototype, online", { x: 6.7, y: 6.3, w: 3.3, h: 0.4, fontSize: 16, color: HEX.greenTint, align: "right" });
  notes(s, "s10");

  /* ---------- appendix, for questions ---------- */
  pres.addSection({ title: "Appendix" });
  const appx = (title, key) => { const sl = pres.addSlide({ masterName: "PREVUMO Appendix", sectionTitle: "Appendix" }); sl.addText(title, { placeholder: "title" }); notes(sl, key); return sl; };
  const head = (t) => ({ text: t, options: { bold: true, color: HEX.muted, fontSize: 12, fill: { color: HEX.bg } } });
  const cell = (t, o = {}) => ({ text: t, options: { fontSize: 13, color: HEX.ink, valign: "middle", ...o } });
  const tableOpts = (o) => ({ x: 0.75, y: 1.55, w: 11.8, fontFace: "Inter", fill: { color: HEX.surface }, border: { type: "solid", pt: 0.75, color: HEX.border }, margin: [0.06, 0.15, 0.06, 0.15], ...o });

  s = appx("Safety: what happens when something fails", "a1");
  s.addTable([
    [head("When"), head("What the box does")],
    [cell("It loses power", { bold: true }), cell("Everything opens or closes to safe: contactor open, gas valve closed, laser enable open, relay open.")],
    [cell("The controller freezes", { bold: true }), cell("A hardware watchdog drops every output when the firmware stops answering.")],
    [cell("Wi-Fi is down", { bold: true }), cell("Trained lists and safety stops live on the box. Sessions and alerts queue until it is back.")],
    [cell("After any stop", { bold: true }), cell("Nothing restarts on its own. It waits for a trained member's fob.")],
    [cell("A safety event", { bold: true }), cell("Low oxygen, a lasting flame, no exhaust, no coolant or an overheating enclosure: the machine stops first, and it is reset at the machine, never from a phone.")],
  ], tableOpts({ colW: [3.0, 8.8], rowH: [0.42, 0.62, 0.62, 0.62, 0.62, 0.72], objectName: "Fail safe table" }));
  text(s, "Approval before any use, pilots included: every pilot box is field evaluated by ESA, or certified, before it is installed, and it watches and switches nothing. A licensed electrician installs anything that switches; a gas fitter reviews gas parts.", { x: 0.75, y: 5.5, w: 11.8, h: 0.7, fontSize: 15, color: C.text1, valign: "top" });
  source(s, "ESA Recognized Approval Marks. Design requirements for a concept: none of this is built or tested yet.");

  s = appx("What already exists, and where we sit", "a2");
  s.addTable([
    [head("Product"), head("What it does"), head("Price")],
    [cell("Fabman", { bold: true, fontFace: HEAD }), cell("Card access, trained lists, booking and billing; its Bridge has dead man control and idle detection from power"), cell("€49 to €199 a month + €10 to €14 per machine; Bridge €249", { fontFace: MONO, fontSize: 11 })],
    [cell("Obico", { bold: true, fontFace: HEAD }), cell("Camera AI that pauses failed 3D prints"), cell("Free for 1 printer; $6.99 a month + $2 per extra printer", { fontFace: MONO, fontSize: 11 })],
    [cell("PREVUMO", { bold: true, fontFace: HEAD, color: HEX.surface, fill: { color: HEX.ink } }), cell("Sensors made for each machine: welder gas and wire, laser airflow, coolant and flame, filament by the gram; one alert format", { color: HEX.surface, fill: { color: HEX.ink } }), cell("Assumption, next slide", { fontFace: MONO, fontSize: 11, color: HEX.greenTint, fill: { color: HEX.ink } })],
  ], tableOpts({ colW: [2.0, 6.3, 3.5], rowH: [0.42, 0.85, 0.7, 0.85], objectName: "Alternatives table" }));
  text(s, "Fabman has an open API: their card reader, our machine sensors. As far as we found, nobody watches a welder's gas and wire, or a laser's airflow, coolant and flame, per member.", { x: 0.75, y: 4.7, w: 11.8, h: 0.8, fontSize: 15, color: C.text1, valign: "top" });
  source(s, "fabman.io/pricing and shop.fabman.io; obico.io pricing guide; accessed Nov 25, 2026.");

  s = appx("Pricing and market, as assumptions", "a3");
  card(s, { x: 0.75, y: 1.55, w: 5.7, h: 3.05, objectName: "Pricing" });
  text(s, "Pricing, by risk (to validate)", { x: 1.05, y: 1.75, w: 5.2, h: 0.35, fontFace: MONO, fontSize: 12, color: C.text2 });
  text(s, [
    { text: "Printers: ", options: { bold: true } }, { text: "close to print monitoring software, a few dollars a month.", options: { breakLine: true } },
    { text: "Lasers and welders: ", options: { bold: true } }, { text: "the premium, where the box adds interlocks, gas control and fire sensing.", options: { breakLine: true } },
    { text: "First round assumption (GA3): ", options: { bold: true } }, { text: "a US$300 box and US$25 per machine per month." },
  ], { x: 1.05, y: 2.2, w: 5.15, h: 2.3, fontSize: 15, color: C.text1, valign: "top", paraSpaceAfter: 10 });
  card(s, { x: 6.85, y: 1.55, w: 5.7, h: 3.05, objectName: "Market arithmetic" });
  text(s, "Bottom up, as an estimate", { x: 7.15, y: 1.75, w: 5.2, h: 0.35, fontFace: MONO, fontSize: 12, color: C.text2 });
  text(s, [
    { text: "2,000", options: { fontFace: MONO, bold: true } }, { text: " US makerspaces and Fab Labs", options: { breakLine: true } },
    { text: "× 5", options: { fontFace: MONO, bold: true } }, { text: " monitored machines each", options: { breakLine: true } },
    { text: "× US$300", options: { fontFace: MONO, bold: true } }, { text: " a year per machine", options: { breakLine: true } },
    { text: "≈ US$3M a year at most", options: { fontFace: MONO, bold: true, color: HEX.green } },
  ], { x: 7.15, y: 2.2, w: 5.15, h: 2.0, fontSize: 17, color: C.text1, valign: "top", paraSpaceAfter: 6 });
  text(s, "Small: makerspaces are where we prove it, then campus and fabrication shops. Only the US count is verified; Canada has 29 active Fab Labs.", { x: 7.15, y: 3.7, w: 5.15, h: 0.8, fontSize: 13, color: C.text2, valign: "top" });
  source(s, "Machines per space and price are team assumptions. US count: Nation of Makers.");

  s = appx("Learning and false alerts", "a4");
  const two = [
    { t: "What current can tell", items: ["On or off, and for how long", "Idle draw with nobody working", "A warm up shape it already knows"], color: HEX.green },
    { t: "What it cannot tell yet", items: ["A failing welder from a thicker plate", "A spaghetti print that keeps extruding", "Slow wear, until a pilot shows it"], color: HEX.rust },
  ];
  two.forEach((c, i) => {
    const x = 0.75 + i * 6.1;
    card(s, { x, y: 1.55, w: 5.7, h: 2.4, objectName: c.t });
    text(s, c.t, { x: x + 0.3, y: 1.75, w: 5.1, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: c.color });
    text(s, c.items.map((it, j) => ({ text: it, options: { bullet: { code: "25CF", indent: 20 }, breakLine: j < c.items.length - 1 } })), { x: x + 0.3, y: 2.2, w: 5.1, h: 1.65, fontSize: 15, color: C.text1, valign: "top", paraSpaceAfter: 6 });
  });
  text(s, "So anything beyond on, off and idle is a review for the owner, never an automatic shutdown, until pilot data shows it works. Learning runs two weeks today; the next version should count sessions, not only days. It never switches off a safety stop. The pilot metric: false alerts per machine per month, each one labelled by the owner.", { x: 0.75, y: 4.2, w: 11.8, h: 1.2, fontSize: 16, color: C.text1, valign: "top" });

  s = appx("Evidence so far, and what is untested", "a5");
  s.addTable([
    [head("What we learned"), head("Source"), head("What changed")],
    [cell("Owners build electricity into rent or membership"), cell("3 owners: a makerspace, two shared kitchens", { color: HEX.muted }), cell("Per user billing dropped", { bold: true })],
    [cell("Cafés were not interested in a device"), cell("Café interviews, GA3", { color: HEX.muted }), cell("Makerspaces only", { bold: true })],
    [cell("“We would want it to be an NFC fob”"), cell("Yukonstruct, Oct 27", { color: HEX.muted }), cell("Keypad replaced by an NFC fob", { bold: true })],
    [cell("Filament is billed by the gram"), cell("U of Regina, Pickering Library", { color: HEX.muted }), cell("Spool scales", { bold: true })],
    [cell("An argon or CO2 leak has no smell"), cell("CCOHS", { color: HEX.muted }), cell("Oxygen sensor, not a gas sensor", { bold: true })],
    [cell("Lasers need ventilation on and someone present"), cell("CMU and MIT laser guidelines", { color: HEX.muted }), cell("Airflow interlock; a 15 minute tap (our choice)", { bold: true })],
  ], tableOpts({ colW: [4.6, 3.6, 3.6], rowH: [0.42, 0.52, 0.52, 0.52, 0.52, 0.52, 0.52], objectName: "Evidence table" }));
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 5.45, w: 11.8, h: 0.85, rectRadius: 0.12, fill: { color: HEX.orangeTint }, line: { color: HEX.orangeTint } });
  text(s, [{ text: "Untested: ", options: { bold: true, fontFace: HEAD } }, { text: "whether owners will pay, the false alert rate, and every safety function on real hardware." }], { x: 1.05, y: 5.45, w: 11.2, h: 0.85, fontSize: 15, color: HEX.ink, valign: "middle" });

  s = appx("Bench test plan", "a6");
  s.addTable([
    [head("Test"), head("How"), head("Pass rule (a target, set before the test)")],
    [cell("1  Fail safe", { bold: true }), cell("Cut power and halt the firmware 50 times per box"), cell("Every output safe, 50 times out of 50")],
    [cell("2  Current", { bold: true }), cell("A real printer's power trace; the box against a true RMS meter, with Wi-Fi on"), cell("Within 5% of the meter")],
    [cell("3  Printers", { bold: true }), cell("Pause command, scale noise, a staged detachment and clog, two models"), cell("Pauses on every staged failure, none in 10 good prints")],
    [cell("4  Laser, watch only", { bold: true }), cell("Duct open and blocked, pump off, flame sensor over 20 normal cuts"), cell("Every blocked duct caught; no false trip in 20 cuts")],
    [cell("5  Watch only pilot", { bold: true }), cell("Four weeks; the owner labels every alert"), cell("Owner keeps it on; false alerts under the limit set first")],
    [cell("6  Welding noise (later)", { bold: true }), cell("A day beside a welding bench"), cell("No resets, no fob misreads")],
    [cell("7  Gas (later)", { bold: true }), cell("Oxygen sensor, controlled argon release in a closed box, with a gas fitter"), cell("Alarm at 19.5% oxygen, every time")],
  ], tableOpts({ colW: [2.6, 5.3, 3.9], rowH: [0.42, 0.56, 0.56, 0.56, 0.56, 0.56, 0.56, 0.56], objectName: "Bench test table" }));
  text(s, "The welder tests come after the pilot, as slide 9 says. The targets are ours, written down so the results can say no.", { x: 0.75, y: 6.0, w: 11.8, h: 0.4, fontSize: 14, color: C.text1 });

  s = appx("Sources", "a7");
  const src = [
    "Fab Foundation, fablabs.io lab list (api.fablabs.io): 2,032 active labs, 29 in Canada, 1,858 with laser cutting; counted Nov 25, 2026.",
    "Nation of Makers, working groups page: “more than 2,000 makerspaces and Fab Labs” in the US.",
    "University of Regina Library, 3D printing policy: “10 grams of filament costs $1.00”. Pickering Public Library: “3D Printing $0.10 per gram”.",
    "Cyberweld, Millermatic 211 PRO: $1,699. Glowforge shop, Pro HD: $7,999.",
    "Prusa Knowledge Base: PLA nozzle 210 to 215 °C, PETG 240 °C.",
    "CCOHS: argon and CO2 shielding gases are simple asphyxiants; low oxygen is 19.5% or less.",
    "Fabman pricing and Fabman Bridge FB-V2 (€249). Obico pricing guide.",
    "CMU EHS laser cutter guideline v.11 (ventilation on before operation; always attended). MIT EHS: never leave an operating laser cutter unattended.",
    "ESA, Recognized Approval Marks: approval before a product is used, sold, displayed or advertised in Ontario.",
    "Group 10 interviews and outreach, Oct 2026 (GA3), and Yukonstruct, Oct 27. Owner quotes anonymized. PREVUMO prices are assumptions to validate.",
  ];
  text(s, src.map((t, i) => ({ text: t, options: { bullet: { code: "25CF", indent: 20 }, breakLine: i < src.length - 1 } })), { x: 0.75, y: 1.55, w: 11.8, h: 5.0, fontSize: 13, color: HEX.ink, valign: "top", paraSpaceAfter: 7 });

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  const auto = await autoplayFilms(OUT);
  // folder entries in the zip can stop cloud services (OneDrive, Google Drive) from opening the deck
  try { require("child_process").execFileSync("zip", ["-dq", OUT, "*/"]); } catch { /* none to remove */ }
  console.log(`wrote ${OUT}, ${auto} film(s) set to play automatically`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
