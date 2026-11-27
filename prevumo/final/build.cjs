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
const URL_VIDEO = "https://prevumo.vercel.app/video";
const NO_FILMS = process.argv.includes("--no-films");
const MEDIA = path.join(HERE, "media");
const ASSETS = path.join(HERE, "assets");
const FILMS = {
  // the -ppt copies are H.264 High at level 4.0 with a silent AAC track, the format PowerPoint plays everywhere
  hardware: { file: path.join(MEDIA, "hardware-ppt.mp4"), poster: path.join(MEDIA, "hardware-poster.png"), fallback: path.join(HERE, "..", "deliverables", "pd-b3", "1-welder.png") },
  software: { file: path.join(MEDIA, "software-ppt.mp4"), poster: path.join(MEDIA, "software-poster.png"), fallback: path.join(ASSETS, "owner-app-169.png") },
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
    box: await icon(Pi.PiPackageBold, HEX.green),
    plug: await icon(Pi.PiPlugsConnectedBold, HEX.green),
    bank: await icon(Pi.PiPiggyBankBold, HEX.green),
    warn: await icon(Pi.PiWarningCircleBold, HEX.rust),
    trend: await icon(Pi.PiTrendUpBold, HEX.ink),
    machines: Object.fromEntries(["welder", "printer", "laser", "multimaker", "enclosed"].map((m) => [m, file64(path.join(ASSETS, `machine-${m}.png`))])),
    qrLight: await qr(URL_LIVE, false),
  };
  for (const f of Object.values(FILMS)) {
    f.posterData = fs.existsSync(f.poster) ? file64(f.poster, "image/png") : file64(f.fallback);
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
    if (fs.existsSync(f.file) && !NO_FILMS) slide.addMedia({ type: "video", path: f.file, ...o, cover: f.posterData, objectName: name });
    else slide.addImage({ data: f.posterData, ...o, sizing: { type: "cover", w: o.w, h: o.h }, objectName: `${name} poster` });
  };

  /* The scorecard criterion each talk slide answers, small, above the title. */
  const crit = (slide, t) => text(slide, t, { x: 0.75, y: 0.16, w: 8, h: 0.3, fontFace: MONO, fontSize: 12, color: HEX.orangeText, objectName: "Scorecard criterion" });

  /* 1. Title */
  pres.addSection({ title: "Talk" });
  let s = pres.addSlide({ masterName: "PREVUMO Dark", sectionTitle: "Talk" });
  s.addImage({ data: A.curveDark, x: 0, y: 2.25, w: W, h: W * (520 / 3000), objectName: "Heartbeat motif" });
  text(s, "PREVUMO", { x: 0.75, y: 0.75, w: 11, h: 1.5, fontFace: HEAD, fontSize: 88, bold: true, charSpacing: 6, color: HEX.bg });
  text(s, "PREVentive Usage MOnitor", { x: 0.75, y: 2.0, w: 6, h: 0.45, fontFace: MONO, fontSize: 16, bold: true, color: HEX.orange });
  text(s, "A preventive box for each common\nmachine in a makerspace.", { x: 0.75, y: 4.75, w: 10.5, h: 0.9, fontFace: HEAD, fontSize: 28, color: HEX.bg });
  text(s, [{ text: "Summary video  ", options: { color: HEX.greenTint } }, { text: URL_VIDEO.replace("https://", ""), options: { color: HEX.orange, bold: true } }], { x: 0.75, y: 5.85, w: 8, h: 0.4, fontFace: MONO, fontSize: 15 });
  text(s, "Jana Mghabghab · Tobi Adebayo · Mohamed Wahb Berguia · Daksh Prabhulal Dholu · Akhil Matta", { x: 0.75, y: 6.55, w: 9.0, h: 0.35, fontSize: 12, color: HEX.greenTint });
  text(s, "GNG 4120 · Group 10 · Nov 27, 2026", { x: 9.3, y: 6.55, w: 3.3, h: 0.35, fontFace: MONO, fontSize: 11, color: HEX.greenTint, align: "right" });
  notes(s, "s1");

  /* 2. Where we started */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  crit(s, "Problem validation");
  s.addText("Where we started", { placeholder: "title" });
  s.addImage({ data: A.path, x: 0.75, y: 1.55, w: 11.8, h: 11.8 * (120 / 2400), objectName: "Pivot path" });
  const stops = [
    { tag: "First idea (PD A)", t: "Share electricity", d: "A box that measures each user's electricity, so the space can bill it.", ev: "All three owners we asked build electricity into rent or membership.", out: "Billing dropped" },
    { tag: "Then (GA3)", t: "Any shared space", d: "Shared kitchens, restaurants, cafés and makerspaces with costly equipment.", ev: "Cafés leave equipment on at closing, but were not interested in a device.", out: "Cafés dropped" },
    { tag: "Now (PD B3)", t: "Makerspaces only", d: "One box per machine type, made for how each one fails.", ev: "“Managing equipment is one of the biggest tasks we have.”", who: "Ontario makerspace director", out: "Our customer" },
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
  text(s, "Behind it: about 30 conversations in three rounds (GA3, PD B4, PD B5) and 49 outreach emails.", { x: 0.75, y: 6.05, w: 11.8, h: 0.35, fontSize: 15, color: C.text1 });
  source(s, "6 competitors studied in GA3. Owner quotes anonymized.");
  notes(s, "s2");

  /* 3. Every machine fails its own way */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  crit(s, "Problem validation");
  s.addText("Every machine fails its own way", { placeholder: "title" });
  const machines = [
    { m: "welder", t: "Welder", f: ["Shielding gas left open", "A leak has no smell and sinks", "Wire weighed by hand, if at all"] },
    { m: "printer", t: "3D printers", f: ["Nozzle left hot, over 200 °C", "Prints fail unwatched", "Filament billed by the gram"] },
    { m: "laser", t: "Laser cutter", f: ["Fire when left alone", "Runs with no exhaust or air", "Coolant fails, tube wears out"] },
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
  text(s, [{ text: "What it cost owners: ", options: { bold: true } }, { text: "an extraction failure, $700 and two days; a CNC spindle, $1,800 and four days; a laser pump, $450 and four days." }], {
    x: 1.0, y: 5.75, w: 11.3, h: 0.62, fontFace: HEAD, fontSize: 15, color: HEX.surface, valign: "middle",
  });
  source(s, "Prusa: PLA nozzle 210 to 215 °C. CCOHS: argon, CO2. U of Regina: $1.00 per 10 g. CMU, MIT EHS: lasers attended. FLUX: heat wears tubes. Costs: PD B5 interviews.");
  notes(s, "s3");

  /* 4. Hardware prototypes: how the solution answers each problem */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  crit(s, "Solution validation");
  s.addText("One box, five modules", { placeholder: "title" });
  const vw = 8.2, vh = vw * 9 / 16;
  film(s, "hardware", { x: 0.75, y: 1.55, w: vw, h: vh }, "Hardware film, no sound");
  source(s, "Hardware prototypes, from prevumo.vercel.app/hardware. Interactive 3D drawings: a concept, not built or tested.");
  text(s, "Problem, and what the box does", { x: 9.35, y: 1.5, w: 3.3, h: 0.35, fontFace: MONO, fontSize: 12, color: C.text2 });
  [["Gas left open", "valve opens only in a session"], ["A leak with no smell", "oxygen sensor shuts the valve"], ["Nozzle left hot", "cool down, then power off"], ["Laser fire or no exhaust", "flame sensor, airflow interlock"], ["Material never counted", "scales log grams per member"]].forEach(([t, d], i) => {
    const y = 1.98 + i * 0.8;
    s.addShape(pres.shapes.LINE, { x: 9.35, y: y - 0.06, w: 3.25, h: 0, line: { color: HEX.border, width: 0.75 } });
    text(s, t, { x: 9.35, y, w: 3.3, h: 0.3, fontFace: HEAD, fontSize: 15, bold: true, color: C.text1 });
    text(s, d, { x: 9.35, y: y + 0.3, w: 3.35, h: 0.32, fontSize: 13, color: HEX.green });
  });
  notes(s, "s4");

  /* 5. Software prototype */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  crit(s, "Solution validation");
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
  crit(s, "Solution validation");
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
  text(s, "Current over one machine's day, illustrative", { x: gx, y: gy + gh + 0.02, w: 7, h: 0.32, fontFace: MONO, fontSize: 13, color: C.text2 });
  text(s, "Current", { x: 0.05, y: gy + gh * (375 / 700) - 0.15, w: 1.1, h: 0.3, fontFace: MONO, fontSize: 12, color: C.text2, align: "center", rotate: 270 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 5.6, w: 11.8, h: 0.95, rectRadius: 0.12, fill: { color: HEX.orangeTint }, line: { color: HEX.orangeTint }, objectName: "Honesty band" });
  text(s, [
    { text: "Nothing here is measured yet. ", options: { bold: true, fontFace: HEAD } },
    { text: "A four week pilot that only watches is how each machine's normal gets learned, and how a real problem is told from a false alarm." },
  ], { x: 1.05, y: 5.6, w: 11.2, h: 0.95, fontSize: 15, color: HEX.ink, valign: "middle" });
  notes(s, "s6");

  /* 7. Customer validation */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  crit(s, "Customer validation");
  s.addText("What our customers told us", { placeholder: "title" });
  text(s, "The buyer is whoever runs the space: an owner, a director or a manager, often with a board.", { x: 0.75, y: 1.38, w: 11.8, h: 0.4, fontSize: 16, color: C.text2 });
  const cv = (t, o = {}) => ({ text: t, options: { fontSize: 13, color: HEX.ink, valign: "middle", ...o } });
  const cvh = (t) => ({ text: t, options: { fontSize: 12, bold: true, color: HEX.muted, fill: { color: HEX.bg }, valign: "middle" } });
  s.addTable([
    [cvh("What they need"), cvh("Who told us"), cvh("So PREVUMO")],
    [cv("Maintenance records and alerts", { bold: true, fontFace: HEAD }), cv("Raised unprompted by two spaces; a treasurer wants alerts tied to repairs avoided", { color: HEX.muted }), cv("Service alerts and a maintenance log", { bold: true, color: HEX.green })],
    [cv("A training check at the machine", { bold: true, fontFace: HEAD }), cv("Two site managers; Yukonstruct: “we would want it to be an NFC fob”", { color: HEX.muted }), cv("A fob and a trained list on every box", { bold: true, color: HEX.green })],
    [cv("Material tracked per member", { bold: true, fontFace: HEAD }), cv("Spaces weigh wire and filament by hand, then bill it", { color: HEX.muted }), cv("Spool and wire scales, grams per member", { bold: true, color: HEX.green })],
    [cv("Nothing that bypasses safety", { bold: true, fontFace: HEAD }), cv("An electrician: CSA certified, never bypass the e-stop. A gas fitter: on TIG, an idle flow check, not a leak sensor", { color: HEX.muted }), cv("Safety stops first; the e-stop stays; the gas check revised", { bold: true, color: HEX.green })],
    [cv("Proof before paying", { bold: true, fontFace: HEAD }), cv("1 space accepted a free 30 day pilot; 3 more would after a safety review", { color: HEX.muted }), cv("A free 30 day pilot on one machine", { bold: true, color: HEX.green })],
  ], { x: 0.75, y: 1.9, w: 11.8, colW: [3.0, 5.6, 3.2], rowH: [0.38, 0.62, 0.62, 0.55, 0.72, 0.62], fontFace: "Inter", fill: { color: HEX.surface }, border: { type: "solid", pt: 0.75, color: HEX.border }, margin: [0.05, 0.14, 0.05, 0.14], objectName: "Customer needs" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 5.65, w: 11.8, h: 0.78, rectRadius: 0.12, fill: { color: HEX.orangeTint }, line: { color: HEX.orangeTint }, objectName: "Preferences" });
  text(s, [
    { text: "Their preferences: ", options: { bold: true, fontFace: HEAD } },
    { text: "2 of 3 boards would rather approve one purchase than a monthly fee, and a device that cuts power needs the insurer's written yes. Sponsors: none yet." },
  ], { x: 1.05, y: 5.65, w: 11.2, h: 0.78, fontSize: 14, color: HEX.ink, valign: "middle" });
  source(s, "PD B4 (8 replies, 2 owner interviews) and PD B5 (10 interviews), Nov 2026; Yukonstruct, Oct 27. Interview names withheld on the slide.");
  notes(s, "s7");

  /* 8. Market validation */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  crit(s, "Market validation");
  s.addText("A market we can count, and it's growing", { placeholder: "title" });
  [
    { big: "2,032", t: "active Fab Labs worldwide, 29 of them in Canada", src: "Fab Foundation, fablabs.io" },
    { big: "3,300", t: "makerspaces worldwide, a rough estimate", src: "Make, makerspace directory" },
    { big: "9 in 10", t: "Fab Labs list a laser cutter (1,858 of 2,032)", src: "Fab Foundation, fablabs.io" },
  ].forEach((st, i) => {
    const x = 0.75 + i * 4.0;
    text(s, st.big, { x, y: 1.5, w: 3.7, h: 1.1, fontFace: MONO, fontSize: 56, color: C.text1, valign: "bottom" });
    text(s, st.t, { x, y: 2.72, w: 3.6, h: 0.7, fontSize: 17, color: C.text1, valign: "top" });
    text(s, st.src, { x, y: 3.45, w: 3.5, h: 0.3, fontSize: 11, color: C.text2 });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 3.95, w: 11.8, h: 0.75, rectRadius: 0.12, fill: { color: HEX.greenTint }, line: { color: HEX.greenTint }, objectName: "Trend band" });
  s.addImage({ data: A.trend, x: 1.0, y: 4.11, w: 0.44, h: 0.44 });
  text(s, [{ text: "Trend: ", options: { bold: true, fontFace: HEAD } }, { text: "the number of Fab Labs has doubled roughly every two years; more than 2,500 today, in 125 countries." }], { x: 1.65, y: 3.95, w: 10.7, h: 0.75, fontSize: 16, color: HEX.ink, valign: "middle" });
  text(s, [{ text: "Our plan: ", options: { bold: true, fontFace: HEAD } }, { text: "23 US makerspaces in three years (6, 8, then 9), 5% of the 460 in Make's directory." }], { x: 0.75, y: 4.88, w: 11.8, h: 0.4, fontSize: 16, color: C.text1 });
  ["Community makerspaces", "Institutional Fab Labs", "Campus and fabrication shops"].forEach((t, i) => {
    const x = 0.75 + i * 4.0;
    pill(s, { x, y: 5.45, w: 3.6, h: 0.68, fill: { color: i === 0 ? HEX.green : C.background1 }, line: { color: i === 0 ? HEX.green : HEX.border, width: 0.75 } });
    text(s, t, { x: x + 0.28, y: 5.45, w: 3.2, h: 0.68, fontSize: 16, bold: i === 0, color: i === 0 ? HEX.surface : C.text1, valign: "middle" });
    if (i < 2) s.addImage({ data: A.arrow, x: x + 3.66, y: 5.69, w: 0.2, h: 0.2 });
  });
  source(s, "fablabs.io, active labs counted Nov 25, 2026. Make: “The directory lists 716 makerspaces, 460 of which are in the US”. Trend: Gershenfeld, MIT Global. Plan: GA5.");
  notes(s, "s8");

  /* 9. Business model */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  crit(s, "Business model");
  s.addText("How PREVUMO makes money", { placeholder: "title" });
  card(s, { x: 0.75, y: 1.5, w: 4.3, h: 3.65, objectName: "Price" });
  s.addImage({ data: A.box, x: 1.03, y: 1.72, w: 0.42, h: 0.42 });
  text(s, "One pack of 4 modules", { x: 1.6, y: 1.7, w: 3.3, h: 0.46, fontFace: HEAD, fontSize: 19, bold: true, color: C.text1, valign: "middle" });
  [["Installation", "$575 once", "an electrician and a gas fitter"], ["Modules", "$73.50 a month", "for 24 months: $441 each"], ["Service", "$40 a month", "app, alerts, logs, manuals"], ["First", "free 30 day pilot", "on one machine"]].forEach(([k, v, d], j) => {
    const y = 2.35 + j * 0.68;
    s.addShape(pres.shapes.LINE, { x: 1.03, y: y - 0.05, w: 3.75, h: 0, line: { color: HEX.border, width: 0.75 } });
    text(s, k, { x: 1.03, y, w: 1.3, h: 0.3, fontSize: 13, color: C.text2 });
    text(s, v, { x: 2.3, y, w: 2.6, h: 0.3, fontFace: MONO, fontSize: 15, bold: true, color: HEX.green });
    text(s, d, { x: 2.3, y: y + 0.29, w: 2.6, h: 0.3, fontSize: 12, color: C.text2 });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.25, y: 1.5, w: 3.6, h: 3.65, rectRadius: 0.12, fill: { color: HEX.ink }, line: { color: HEX.ink }, objectName: "Per pack" });
  text(s, "Per pack, over three years", { x: 5.53, y: 1.72, w: 3.1, h: 0.4, fontFace: MONO, fontSize: 12, color: HEX.greenTint });
  [["$3,779", "revenue"], ["$1,796", "cost to us"], ["52%", "margin"], ["month 11", "payback"]].forEach(([v, d], j) => {
    const y = 2.2 + j * 0.72;
    text(s, v, { x: 5.53, y, w: 1.9, h: 0.5, fontFace: MONO, fontSize: 24, bold: true, color: j === 2 ? HEX.orange : HEX.surface, valign: "middle" });
    text(s, d, { x: 7.45, y, w: 1.3, h: 0.5, fontSize: 14, color: HEX.greenTint, valign: "middle" });
  });
  card(s, { x: 9.05, y: 1.5, w: 3.5, h: 3.65, objectName: "Path" });
  s.addImage({ data: A.plug, x: 9.33, y: 1.72, w: 0.42, h: 0.42 });
  text(s, "Path to revenue", { x: 9.9, y: 1.7, w: 2.6, h: 0.46, fontFace: HEAD, fontSize: 19, bold: true, color: C.text1, valign: "middle" });
  [["Pilot, then paid", "a free month on one machine, then the pack"], ["Reach", "direct outreach, referrals, LinkedIn and Google ads"], ["Partners", "electricians, gas fitters, a testing lab, booking software"]].forEach(([h, d], j) => {
    const y = 2.35 + j * 0.92;
    text(s, h, { x: 9.33, y, w: 3.05, h: 0.3, fontFace: HEAD, fontSize: 15, bold: true, color: HEX.green });
    text(s, d, { x: 9.33, y: y + 0.3, w: 3.05, h: 0.55, fontSize: 13, color: C.text1, valign: "top" });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 5.35, w: 11.8, h: 0.85, rectRadius: 0.12, fill: { color: HEX.orangeTint }, line: { color: HEX.orangeTint }, objectName: "Untested" });
  text(s, [
    { text: "Untested: ", options: { bold: true, fontFace: HEAD } },
    { text: "no owner has agreed to this price yet. 2 of 3 boards prefer one purchase to a monthly fee, so a one time option is the next price we test." },
  ], { x: 1.05, y: 5.35, w: 11.2, h: 0.85, fontSize: 15, color: HEX.ink, valign: "middle" });
  source(s, "GA5 Financial Snapshot, in US dollars: parts from Adafruit, SparkFun, Digi-Key, RobotShop, U.S. Solid; labour from Green Building Canada and Job Bank. PD B5 price interviews.");
  notes(s, "s9");

  /* 10. Financial considerations, then next steps */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Talk" });
  crit(s, "Financial considerations");
  s.addText("Funding, limits and next steps", { placeholder: "title" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 1.5, w: 3.7, h: 3.6, rectRadius: 0.12, fill: { color: HEX.ink }, line: { color: HEX.ink }, objectName: "Funding need" });
  text(s, "$23,300", { x: 1.03, y: 1.7, w: 3.2, h: 0.75, fontFace: MONO, fontSize: 38, bold: true, color: HEX.orange, valign: "middle" });
  text(s, "funding need: our lowest point of cash", { x: 1.03, y: 2.45, w: 3.2, h: 0.35, fontSize: 13, color: HEX.greenTint });
  [["Year 1", "−$19,589", HEX.orange], ["Year 2", "−$1,902", HEX.orange], ["Year 3", "+$4,968", HEX.greenTint]].forEach(([y, v, c], j) => {
    const yy = 3.0 + j * 0.6;
    s.addShape(pres.shapes.LINE, { x: 1.03, y: yy - 0.04, w: 3.15, h: 0, line: { color: HEX.green, width: 0.75 } });
    text(s, y, { x: 1.03, y: yy, w: 1.2, h: 0.45, fontSize: 14, color: HEX.greenTint, valign: "middle" });
    text(s, v, { x: 2.2, y: yy, w: 2.0, h: 0.45, fontFace: MONO, fontSize: 18, bold: true, color: c, align: "right", valign: "middle" });
  });
  const fcol = (x, w, icon, t, rows, accent) => {
    s.addImage({ data: icon, x, y: 1.5, w: 0.38, h: 0.38 });
    text(s, t, { x: x + 0.5, y: 1.46, w: w - 0.5, h: 0.45, fontFace: HEAD, fontSize: 19, bold: true, color: C.text1, valign: "middle" });
    rows.forEach(([h, d], j) => {
      const y = 2.1 + j * 0.74;
      s.addShape(pres.shapes.LINE, { x, y: y - 0.06, w, h: 0, line: { color: HEX.border, width: 0.75 } });
      text(s, h, { x, y, w, h: 0.3, fontFace: HEAD, fontSize: 14, bold: true, color: accent });
      text(s, d, { x, y: y + 0.29, w, h: 0.36, fontSize: 12.5, color: C.text1, valign: "top" });
    });
  };
  fcol(4.75, 3.75, A.bank, "Funding avenues", [
    ["uOttawa Startup Garage", "RevUp cash prizes; Exploration Circuit grants"],
    ["NRC IRAP", "for incorporated, for profit companies"],
    ["Futurpreneur", "a loan up to $75,000, ages 18 to 39"],
    ["Pilot hosts", "space and data, in place of cash"],
  ], HEX.green);
  fcol(8.8, 3.75, A.warn, "Limits", [
    ["Price untested", "boards prefer one purchase to a monthly fee"],
    ["Certification", "about $8,000, 29% of the first year's costs"],
    ["Cash timing", "we pay for parts and labour up front"],
    ["No salaries", "for three years: the plan understates cost"],
  ], HEX.rust);
  ["Build one module", "Bench test", "Safety review", "30 day pilot"].forEach((t, i) => {
    const x = 0.75 + i * 3.0, dark = i === 3;
    pill(s, { x, y: 5.35, w: 2.7, h: 0.62, fill: { color: dark ? HEX.ink : C.background1 }, line: { color: dark ? HEX.ink : HEX.border, width: 0.75 }, objectName: `Next step ${i + 1}` });
    text(s, `${i + 1}  ${t}`, { x: x + 0.25, y: 5.35, w: 2.4, h: 0.62, fontSize: 15, bold: true, color: dark ? HEX.surface : C.text1, valign: "middle" });
    if (i < 3) s.addImage({ data: A.arrow, x: x + 2.76, y: 5.57, w: 0.18, h: 0.18 });
  });
  source(s, "GA5 Financial Snapshot (base case, USD). Startup Garage circuits; NRC IRAP eligibility; Futurpreneur Startup Program. Bench test pass rules: slide 17.");
  notes(s, "s10");

  /* 11. Close */
  s = pres.addSlide({ masterName: "PREVUMO Dark", sectionTitle: "Talk" });
  text(s, [{ text: "Every machine fails its own way.", options: { breakLine: true } }, { text: "PREVUMO gives each one its own guard." }], {
    x: 0.75, y: 0.75, w: 11.8, h: 1.9, fontFace: HEAD, fontSize: 36, bold: true, color: HEX.bg, valign: "top",
  });
  s.addImage({ data: A.curveDark, x: 0, y: 2.25, w: W, h: W * (520 / 3000), objectName: "Heartbeat motif" });
  text(s, "Thank you. Questions?", { x: 0.75, y: 5.35, w: 8, h: 0.7, fontFace: HEAD, fontSize: 30, bold: true, color: HEX.orange });
  text(s, [{ text: "Summary video  ", options: { color: HEX.greenTint } }, { text: URL_VIDEO.replace("https://", ""), options: { color: HEX.bg, bold: true } }], { x: 0.75, y: 6.15, w: 7, h: 0.4, fontFace: MONO, fontSize: 15 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 10.18, y: 4.2, w: 2.5, h: 2.5, rectRadius: 0.12, fill: { color: HEX.surface }, line: { color: HEX.surface }, objectName: "QR pad" });
  s.addImage({ data: A.qrLight, x: 10.33, y: 4.35, w: 2.2, h: 2.2, objectName: "QR prevumo.vercel.app" });
  text(s, "prevumo.vercel.app", { x: 4.9, y: 6.78, w: 5.1, h: 0.4, fontFace: MONO, fontSize: 18, color: HEX.greenTint, align: "right" });
  text(s, "Every prototype, online", { x: 6.7, y: 6.3, w: 3.3, h: 0.4, fontSize: 16, color: HEX.greenTint, align: "right" });
  notes(s, "s11");

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
    [cell("PREVUMO", { bold: true, fontFace: HEAD, color: HEX.surface, fill: { color: HEX.ink } }), cell("Sensors made for each machine: welder gas and wire, laser airflow, coolant and flame, filament by the gram; one alert format", { color: HEX.surface, fill: { color: HEX.ink } }), cell("Pack of 4: $575 + $73.50 a month for 24 months + $40 a month (GA5, untested)", { fontFace: MONO, fontSize: 11, color: HEX.greenTint, fill: { color: HEX.ink } })],
  ], tableOpts({ colW: [2.0, 6.3, 3.5], rowH: [0.42, 0.85, 0.7, 0.85], objectName: "Alternatives table" }));
  text(s, "Fabman has an open API: their card reader, our machine sensors. As far as we found, nobody watches a welder's gas and wire, or a laser's airflow, coolant and flame, per member.", { x: 0.75, y: 4.7, w: 11.8, h: 0.8, fontSize: 15, color: C.text1, valign: "top" });
  source(s, "fabman.io/pricing and shop.fabman.io; obico.io pricing guide; accessed Nov 25, 2026.");

  s = appx("The numbers behind the plan (GA5)", "a3");
  s.addTable([
    [head("Cost per pack of 4"), head("USD")],
    [cell("Parts: 4 modules (welder about $297, others about $290)"), cell("$1,160", { fontFace: MONO, bold: true })],
    [cell("Installation: an electrician and a gas fitter"), cell("$565", { fontFace: MONO, bold: true })],
    [cell("Shipping and warranty"), cell("$71", { fontFace: MONO, bold: true })],
    [cell("Total cost per pack", { bold: true }), cell("$1,796", { fontFace: MONO, bold: true, color: HEX.green })],
    [cell("One time: certification $8,000 + incorporation $235"), cell("$8,235", { fontFace: MONO, bold: true })],
    [cell("Yearly: insurance, hosting, domain, bookkeeping"), cell("$2,204", { fontFace: MONO, bold: true })],
  ], tableOpts({ w: 5.9, colW: [4.6, 1.3], rowH: [0.42, 0.55, 0.55, 0.5, 0.5, 0.55, 0.55], objectName: "Cost table" }));
  s.addTable([
    [head("Plan, base case"), head("Year 1"), head("Year 2"), head("Year 3")],
    [cell("Packs installed"), cell("6", { fontFace: MONO, fontSize: 12 }), cell("8", { fontFace: MONO, fontSize: 12 }), cell("9", { fontFace: MONO, fontSize: 12 })],
    [cell("Revenue"), cell("$8,444", { fontFace: MONO, fontSize: 12 }), cell("", { fontFace: MONO, fontSize: 12 }), cell("$27,252", { fontFace: MONO, fontSize: 12 })],
    [cell("Profit", { bold: true }), cell("−$19,589", { fontFace: MONO, fontSize: 12, bold: true, color: HEX.rust }), cell("−$1,902", { fontFace: MONO, fontSize: 12, bold: true, color: HEX.rust }), cell("+$4,968", { fontFace: MONO, fontSize: 12, bold: true, color: HEX.green })],
    [cell("Low case, year 3"), cell(""), cell(""), cell("−$594", { fontFace: MONO, fontSize: 12, color: HEX.rust })],
    [cell("High case, year 3"), cell(""), cell(""), cell("+$10,159", { fontFace: MONO, fontSize: 12, color: HEX.green })],
  ], tableOpts({ x: 6.95, w: 5.6, colW: [1.85, 1.25, 1.25, 1.25], rowH: [0.42, 0.5, 0.5, 0.5, 0.5, 0.5], objectName: "Plan table" }));
  text(s, "Lowest cash about −$23,300 (the funding need); cumulative cash is recovered around month 46. No salaries for three years: a stated limit.", { x: 6.95, y: 4.95, w: 5.6, h: 0.75, fontSize: 13, color: C.text1, valign: "top" });
  source(s, "GA5 Financial Snapshot, USD; Year 2 revenue is in the GA5 spreadsheet, sheet 6. Market: 460 US makerspaces (Make). All prices are proposals, untested with owners.");

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
  const cell12 = (t, o = {}) => cell(t, { fontSize: 12, ...o });
  s.addTable([
    [head("What we learned"), head("Source"), head("What changed")],
    [cell12("Owners build electricity into rent or membership"), cell12("3 owners, GA3", { color: HEX.muted }), cell12("Per user billing dropped", { bold: true })],
    [cell12("Cafés were not interested in a device"), cell12("Café interviews, GA3", { color: HEX.muted }), cell12("Makerspaces only", { bold: true })],
    [cell12("“We would want it to be an NFC fob”"), cell12("Yukonstruct, Oct 27", { color: HEX.muted }), cell12("Keypad replaced by an NFC fob", { bold: true })],
    [cell12("Maintenance records came up unprompted"), cell12("Two spaces, PD B4", { color: HEX.muted }), cell12("Service alerts and a log first", { bold: true })],
    [cell12("A regulator left open, found by 2 of 2 owners"), cell12("Owner interviews, PD B4", { color: HEX.muted }), cell12("Gas valve timed to the session", { bold: true })],
    [cell12("A leak sensor on a TIG welder would false alarm"), cell12("A gas fitter; Edinburgh Hacklab", { color: HEX.muted }), cell12("Idle flow check; O2 sensor for leaks", { bold: true })],
    [cell12("Cloud control was challenged"), cell12("Two spaces, PD B4", { color: HEX.muted }), cell12("Local server, offline study", { bold: true })],
    [cell12("Installation costs about $565 a pack"), cell12("Trade rates, GA5", { color: HEX.muted }), cell12("Installation fee $300 to $575", { bold: true })],
  ], tableOpts({ colW: [4.6, 3.6, 3.6], rowH: [0.38, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42], fontSize: 12, objectName: "Evidence table" }));
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 5.45, w: 11.8, h: 0.85, rectRadius: 0.12, fill: { color: HEX.orangeTint }, line: { color: HEX.orangeTint } });
  text(s, [{ text: "Untested: ", options: { bold: true, fontFace: HEAD } }, { text: "whether owners will pay this price, the false alert rate, and every safety function on real hardware." }], { x: 1.05, y: 5.45, w: 11.2, h: 0.85, fontSize: 15, color: HEX.ink, valign: "middle" });

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
  text(s, "The welder tests come after the pilot, as slide 10 says. The targets are ours, written down so the results can say no.", { x: 0.75, y: 6.0, w: 11.8, h: 0.4, fontSize: 14, color: C.text1 });

  s = appx("Sources", "a7");
  const src = [
    "Fab Foundation, fablabs.io lab list (api.fablabs.io): 2,032 active labs, 29 in Canada, 1,858 with laser cutting; counted Nov 25, 2026.",
    "Make, “How many makerspaces?”: “The directory lists 716 makerspaces, 460 of which are in the US”; about 3,300 worldwide, a rough estimate. Nation of Makers: “more than 2,000 makerspaces and Fab Labs” in the US.",
    "University of Regina Library, 3D printing policy: “10 grams of filament costs $1.00”. Pickering Public Library: “3D Printing $0.10 per gram”.",
    "Prusa Knowledge Base: PLA nozzle 210 to 215 °C, PETG 240 °C.",
    "CCOHS: argon and CO2 shielding gases are simple asphyxiants; low oxygen is 19.5% or less.",
    "Fabman pricing and Fabman Bridge FB-V2 (€249). Obico pricing guide.",
    "CMU EHS laser cutter guideline v.11 (ventilation on before operation; always attended). MIT EHS: never leave an operating laser cutter unattended. FLUX: temperature is the first thing that shortens a CO2 tube's life.",
    "ESA, Recognized Approval Marks: approval before a product is used, sold, displayed or advertised in Ontario.",
    "MIT Global, “How MIT's fab labs scaled around the world”: doubling roughly every two years; more than 2,500 in 125 countries. Fabman: open JSON API.",
    "Funding: Startup Garage circuits (startupgarage.ca/support); NRC IRAP eligibility; Futurpreneur Startup Program (a loan up to $75,000, ages 18 to 39).",
    "GA5 Financial Snapshot (parts from Adafruit, SparkFun, Digi-Key, RobotShop, U.S. Solid; labour from Green Building Canada and Job Bank; certification from Predictable Designs).",
    "Group 10 interviews: GA3 (Oct 2026), Yukonstruct (Oct 27), PD B4 and PD B5 (Nov 2026). Quotes anonymized on slides. PREVUMO prices are proposals, untested with owners.",
  ];
  text(s, src.map((t, i) => ({ text: t, options: { bullet: { code: "25CF", indent: 20 }, breakLine: i < src.length - 1 } })), { x: 0.75, y: 1.55, w: 11.8, h: 5.0, fontSize: 13, color: HEX.ink, valign: "top", paraSpaceAfter: 7 });

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  // sanitize.py: unique shape ids, real PNG posters, valid content types, autoplay timing, a conventional zip
  console.log(require("child_process").execFileSync("python3", [path.join(HERE, "sanitize.py"), OUT]).toString().trim());
  console.log(`wrote ${OUT}${NO_FILMS ? " (no films: posters only)" : ""}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
