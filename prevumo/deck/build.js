// PREVUMO pitch deck (GNG4120 GA3). Builds a 16:9 .pptx with speaker notes on every slide.
// Usage: node build.js [--url https://your-live-app] [--out PREVUMO-pitch.pptx]
// Without --url the QR codes are left as a marked [LIVE APP URL] slot.
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const QRCode = require("qrcode");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const Pi = require("react-icons/pi");
const NOTES = require("./notes");

const SKILL = process.env.PPTX_SKILL || "";
const { applyTheme } = require(path.join(SKILL, "scripts/apply_theme.js"));

const args = process.argv.slice(2);
const arg = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const URL_LIVE = arg("--url");
const OUT = arg("--out") || path.join(__dirname, "PREVUMO-pitch.pptx");
const VIDEO = path.join(__dirname, "../deliverables/prevumo-demo-70s.mp4");

const HEX = {
  bg: "F3EBDD", surface: "FFFDF8", border: "E3D6C0", ink: "1F3D2B", muted: "5B6B5F",
  green: "2F6B45", greenTint: "D6E4D3", orange: "E07A2E", orangeTint: "F6D2B4", rust: "A63D1F", idle: "EDE4D3",
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

/* ---------- drawn assets ---------- */

function rnd(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** The motif: a flat current curve inside its normal band, with one orange spike where the irregularity happens. */
function heartbeat({ w, h, line, band, spikeAt = 0.62, stroke = 6, flatAfter = false, dead }) {
  const y0 = h * 0.62;
  const amp = h * 0.035;
  const pts = [];
  for (let x = 0; x <= w; x += 8) pts.push([x, y0 + (rnd(x) - 0.5) * amp]);
  const sx = w * spikeAt;
  const spike = [
    [sx - 30, y0], [sx - 12, y0 - h * 0.08], [sx, y0 + h * 0.06], [sx + 16, y0 - h * 0.5], [sx + 34, y0 + h * 0.2],
    [sx + 52, y0 - h * 0.32], [sx + 70, y0 + h * 0.08], [sx + 86, y0],
  ];
  const before = pts.filter(([x]) => x < sx - 30);
  const after = pts.filter(([x]) => x > sx + 86);
  const d = (arr) => arr.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const flatY = h * 0.9;
  const afterPath = flatAfter ? `M${sx + 86},${y0} L${sx + 120},${flatY} L${w},${flatY}` : d([[sx + 86, y0], ...after]);
  const dots = [spike[3], spike[4], spike[5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${stroke * 1.6}" fill="#${HEX.orange}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${band ? `<rect x="0" y="${y0 - h * 0.1}" width="${flatAfter ? sx : w}" height="${h * 0.2}" rx="${h * 0.04}" fill="${band}"/>` : ""}
    <path d="${d(before)}" fill="none" stroke="${line}" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d(spike)}" fill="none" stroke="#${HEX.orange}" stroke-width="${stroke * 1.15}" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    <path d="${afterPath}" fill="none" stroke="${flatAfter ? dead : line}" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

function deviceSvg() {
  const keys = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) keys.push(`<circle cx="${118 + c * 62}" cy="${208 + r * 52}" r="19" fill="#${HEX.bg}" opacity=".92"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="520" viewBox="0 0 480 520">
    <path d="M240 470 C 240 500, 300 505, 330 505 L 470 505" fill="none" stroke="#${HEX.ink}" stroke-width="12" stroke-linecap="round"/>
    <rect x="62" y="40" width="300" height="430" rx="34" fill="#${HEX.ink}"/>
    <rect x="96" y="74" width="232" height="90" rx="14" fill="#${HEX.greenTint}"/>
    <text x="118" y="132" font-family="JetBrains Mono" font-size="34" fill="#${HEX.ink}">PIN ••••</text>
    ${keys.join("")}
    <circle cx="335" cy="64" r="9" fill="#${HEX.orange}"/>
  </svg>`;
}

function bandChartSvg() {
  const w = 520, h = 300;
  const pts = [];
  for (let x = 20; x <= 500; x += 10) pts.push(`${x === 20 ? "M" : "L"}${x},${150 + (rnd(x + 3) - 0.5) * 34 + Math.sin(x / 40) * 10}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect x="20" y="96" width="480" height="108" rx="12" fill="#${HEX.greenTint}"/>
    <path d="${pts.join("")}" fill="none" stroke="#${HEX.green}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="20" y1="262" x2="500" y2="262" stroke="#${HEX.border}" stroke-width="4"/>
  </svg>`;
}

async function png(svg, width) {
  const buf = await sharp(Buffer.from(svg)).resize({ width }).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

async function icon(Comp, color, size = 256) {
  const svg = renderToStaticMarkup(React.createElement(Comp, { size, color: `#${color}` }));
  return png(svg, size);
}

async function qr(url, dark) {
  const buf = await QRCode.toBuffer(url, {
    margin: 1, width: 600, errorCorrectionLevel: "M",
    color: { dark: `#${dark ? HEX.bg : HEX.ink}`, light: `#${dark ? HEX.ink : HEX.surface}` },
  });
  return "image/png;base64," + buf.toString("base64");
}

/**
 * pptxgenjs embeds the video but adds no animation, so it would only play when clicked directly.
 * This adds PowerPoint's standard "In click sequence" timing: the next click or clicker press starts it.
 */
async function playVideoOnClick(file, slideNo) {
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const part = `ppt/slides/slide${slideNo}.xml`;
  let xml = await zip.file(part).async("string");
  const spid = xml.match(/<p:cNvPr id="(\d+)" name="Owner app demo[^"]*">/)[1];
  const timing =
    `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>` +
    `<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>` +
    `<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>` +
    `<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
    `<p:par><p:cTn id="5" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="clickEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
    `<p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="6" dur="67000" fill="hold"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cBhvr></p:cmd>` +
    `</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>` +
    `</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>` +
    `<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>` +
    `<p:video><p:cMediaNode vol="80000"><p:cTn id="7" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst></p:cTn>` +
    `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cMediaNode></p:video>` +
    `</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`;
  xml = xml.replace("</p:clrMapOvr></p:sld>", `</p:clrMapOvr>${timing}</p:sld>`);
  zip.file(part, xml);
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

const DEMO_SLIDE = 6;

/* ---------- deck ---------- */

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
  pres.title = "PREVUMO pitch, GNG4120 Group 10";
  pres.author = "Group 10";
  pres.company = "Group 10";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;
  const W = 13.333;

  const A = {
    curveDark: await png(heartbeat({ w: 3000, h: 520, line: `#${HEX.greenTint}`, band: "rgba(214,228,211,0.10)", stroke: 7 }), 3000),
    curveLight: await png(heartbeat({ w: 3000, h: 150, line: `#${HEX.green}`, band: `#${HEX.greenTint}`, stroke: 4, spikeAt: 0.78 }), 3000),
    curveHook: await png(heartbeat({ w: 3000, h: 420, line: `#${HEX.green}`, band: `#${HEX.greenTint}`, stroke: 7, spikeAt: 0.55, flatAfter: true, dead: `#${HEX.rust}` }), 3000),
    device: await png(deviceSvg(), 480),
    band: await png(bandChartSvg(), 520),
    wrench: await icon(Pi.PiWrenchBold, HEX.rust),
    userMinus: await icon(Pi.PiUserMinusBold, HEX.rust),
    eyeSlash: await icon(Pi.PiEyeSlashBold, HEX.rust),
    gear: await icon(Pi.PiGearSixBold, HEX.ink),
    flask: await icon(Pi.PiFlaskBold, HEX.ink),
    pot: await icon(Pi.PiCookingPotBold, HEX.ink),
    cloud: await icon(Pi.PiCloudArrowUpBold, HEX.ink),
    wifi: await icon(Pi.PiWifiHighBold, HEX.ink),
    bell: await icon(Pi.PiBellRingingBold, HEX.surface),
    shield: await icon(Pi.PiShieldCheckBold, HEX.green),
    arrow: await icon(Pi.PiArrowRightBold, HEX.muted),
    quote: await icon(Pi.PiQuotesFill, HEX.orange),
    poster: "image/jpeg;base64," + fs.readFileSync(path.join(__dirname, "assets/poster.jpg")).toString("base64"),
  };
  A.qrLight = URL_LIVE ? await qr(URL_LIVE, false) : null;
  A.qrDark = URL_LIVE ? await qr(URL_LIVE, true) : null;

  /* Layouts: dark (title, closing), light content with title, light statement. */
  pres.defineSlideMaster({
    title: "PREVUMO Dark",
    background: { color: HEX.ink },
    objects: [],
  });
  pres.defineSlideMaster({
    title: "PREVUMO Content",
    background: { color: HEX.bg },
    margin: [0.5, 0.75, 0.6, 0.75],
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.75, y: 0.5, w: 11.8, h: 0.9, fontFace: HEAD, fontSize: 36, bold: true, color: C.text1, valign: "top", align: "left", margin: 0 }, text: "" } },
      { text: { text: "PREVUMO", options: { x: 0.75, y: 6.95, w: 2.5, h: 0.3, fontFace: HEAD, fontSize: 10, bold: true, charSpacing: 3, color: C.text2, margin: 0 } } },
    ],
    slideNumber: { x: 12.1, y: 6.95, w: 0.5, h: 0.3, fontFace: MONO, fontSize: 10, color: HEX.muted, align: "right" },
  });
  pres.defineSlideMaster({
    title: "PREVUMO Statement",
    background: { color: HEX.bg },
    objects: [
      { text: { text: "PREVUMO", options: { x: 0.75, y: 6.95, w: 2.5, h: 0.3, fontFace: HEAD, fontSize: 10, bold: true, charSpacing: 3, color: C.text2, margin: 0 } } },
    ],
    slideNumber: { x: 12.1, y: 6.95, w: 0.5, h: 0.3, fontFace: MONO, fontSize: 10, color: HEX.muted, align: "right" },
  });

  const text = (slide, t, o) => slide.addText(t, { isTextBox: true, margin: 0, ...o });
  const card = (slide, o) =>
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { rectRadius: 0.12, fill: { color: C.background1 }, line: { color: HEX.border, width: 0.75 }, ...o });
  const source = (slide, t, y = 6.55) => text(slide, t, { x: 0.75, y, w: 11.8, h: 0.3, fontSize: 10, color: C.text2, objectName: "Source" });
  const qrSlot = (slide, o, dark) => {
    const img = dark ? A.qrDark : A.qrLight;
    if (img) return slide.addImage({ data: img, ...o, objectName: "QR live app" });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      ...o, rectRadius: 0.08, fill: { color: dark ? HEX.ink : HEX.surface }, line: { color: dark ? HEX.bg : HEX.muted, width: 1.25, dashType: "dash" }, objectName: "QR slot",
    });
    text(slide, "QR\n[LIVE APP URL]", { ...o, align: "center", valign: "middle", fontFace: MONO, fontSize: 10, color: dark ? HEX.bg : HEX.muted });
  };
  const notes = (slide, key) => slide.addNotes(NOTES[key]);

  /* 1. Title */
  pres.addSection({ title: "Pitch" });
  let s = pres.addSlide({ masterName: "PREVUMO Dark", sectionTitle: "Pitch" });
  s.addImage({ data: A.curveDark, x: 0, y: 2.25, w: W, h: W * (520 / 3000), objectName: "Heartbeat motif" });
  text(s, "PREVUMO", { x: 0.75, y: 0.75, w: 11, h: 1.5, fontFace: HEAD, fontSize: 88, bold: true, charSpacing: 6, color: HEX.bg });
  text(s, "Know what happened to your machine, and when it's about to fail.", {
    x: 0.75, y: 4.95, w: 9.6, h: 0.9, fontFace: HEAD, fontSize: 26, color: HEX.bg,
  });
  text(s, "PREVentive Usage MOnitor", { x: 0.75, y: 2.05, w: 6, h: 0.4, fontFace: MONO, fontSize: 13, color: HEX.orange });
  text(s, "Jana Mghabghab · Tobi Adebayo · Mohamed Wahb Berguia · Daksh Prabhulal Dholu · Akhil Matta", {
    x: 0.75, y: 6.55, w: 9.5, h: 0.35, fontSize: 12, color: HEX.greenTint,
  });
  text(s, "GNG4120 · Group 10 · Oct 23, 2026", { x: 9.3, y: 6.55, w: 3.3, h: 0.35, fontFace: MONO, fontSize: 11, color: HEX.greenTint, align: "right" });
  notes(s, "s1");

  /* 2. Hook */
  s = pres.addSlide({ masterName: "PREVUMO Statement", sectionTitle: "Pitch" });
  text(s, [
    { text: "A ", options: {} },
    { text: "$3,000", options: { fontFace: MONO } },
    { text: " welder dies on a Tuesday.", options: { breakLine: true } },
    { text: "Nobody saw it coming.", options: { color: HEX.rust } },
  ], { x: 0.75, y: 1.0, w: 11.8, h: 2.3, fontFace: HEAD, fontSize: 52, bold: true, color: C.text1, valign: "top", paraSpaceAfter: 4 });
  s.addImage({ data: A.curveHook, x: 0.75, y: 3.55, w: 11.8, h: 11.8 * (420 / 3000), objectName: "Curve that flatlines" });
  text(s, "The owner knows who booked it. Not what happened to it.", { x: 0.75, y: 5.6, w: 11, h: 0.6, fontSize: 24, color: C.text2 });
  notes(s, "s2");

  /* 3. Pain */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Pitch" });
  s.addText("Machines break, and nobody sees it coming", { placeholder: "title" });
  text(s, "More makerspaces, labs and shared kitchens now rent out expensive electric equipment.", { x: 0.75, y: 1.45, w: 11.8, h: 0.45, fontSize: 17, color: C.text2 });
  const pains = [
    { img: A.wrench, big: "$754", label: "Average emergency repair call", sub: "“Hundreds if not thousands of dollars” per breakdown, a makerspace director told us" },
    { img: A.userMinus, big: "$600 to $6,000", label: "What each lost member is worth", sub: "When machines keep breaking, members cancel" },
    { img: A.eyeSlash, big: "No history", label: "No sensor sees the warning signs", sub: "Booking tools only work “when people actually use the software”" },
  ];
  pains.forEach((p, i) => {
    const x = 0.75 + i * 4.0;
    card(s, { x, y: 2.2, w: 3.75, h: 3.95, objectName: `Pain ${i + 1}` });
    s.addImage({ data: p.img, x: x + 0.35, y: 2.5, w: 0.5, h: 0.5 });
    text(s, p.big, { x: x + 0.35, y: 3.2, w: 3.2, h: 0.9, fontFace: MONO, fontSize: p.big.length > 10 ? 26 : 44, color: C.text1, valign: "middle", fit: "shrink" });
    text(s, p.label, { x: x + 0.35, y: 4.2, w: 3.1, h: 0.7, fontFace: HEAD, fontSize: 18, bold: true, color: C.text1, valign: "top" });
    text(s, p.sub, { x: x + 0.35, y: 4.95, w: 3.1, h: 1.0, fontSize: 13, color: C.text2, valign: "top" });
  });
  source(s, "Sources: makerspace director interview (Group 10, 2026); emergency repair call average, 86 Repairs 2024, via Envigilance.");
  notes(s, "s3");

  /* 4. Customer and value */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Pitch" });
  s.addText("Who we serve, and what we promise", { placeholder: "title" });
  text(s, "Owners and managers of shared spaces with costly electric equipment", { x: 0.75, y: 1.75, w: 5.2, h: 1.0, fontFace: HEAD, fontSize: 20, bold: true, color: C.text1, valign: "top" });
  [
    { img: A.gear, t: "Makerspaces" },
    { img: A.flask, t: "University labs" },
    { img: A.pot, t: "Shared kitchens" },
  ].forEach((c, i) => {
    const y = 3.0 + i * 0.95;
    s.addShape(pres.shapes.OVAL, { x: 0.75, y, w: 0.7, h: 0.7, fill: { color: C.background1 }, line: { color: HEX.border, width: 0.75 } });
    s.addImage({ data: c.img, x: 0.9, y: y + 0.15, w: 0.4, h: 0.4 });
    text(s, c.t, { x: 1.65, y, w: 3.8, h: 0.7, fontSize: 18, color: C.text1, valign: "middle" });
  });
  text(s, "One owner can run several locations.", { x: 0.75, y: 5.95, w: 5, h: 0.4, fontSize: 14, color: C.text2 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.35, y: 1.75, w: 6.2, h: 4.6, rectRadius: 0.14, fill: { color: HEX.ink }, line: { color: HEX.ink }, objectName: "Value proposition" });
  text(s, "Value proposition", { x: 6.85, y: 2.15, w: 5.2, h: 0.35, fontFace: MONO, fontSize: 12, color: HEX.orange });
  text(s, [
    { text: "Catch failures before they happen,", options: { breakLine: true } },
    { text: "know who used each machine and how much,", options: { breakLine: true } },
    { text: "and shut it down safely from anywhere." },
  ], { x: 6.85, y: 2.7, w: 5.3, h: 3.3, fontFace: HEAD, fontSize: 28, bold: true, color: HEX.bg, valign: "top", paraSpaceAfter: 10 });
  notes(s, "s4");

  /* 5. How it works */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Pitch" });
  s.addText("How it works", { placeholder: "title" });
  const steps = [
    { t: "Box on the machine", d: "Keypad, current sensor, relay. ESP32 with Wi‑Fi." },
    { t: "Wi‑Fi to the cloud", d: "Every second of current, per session." },
    { t: "Learns its curve", d: "Each machine gets its own normal range." },
    { t: "Owner decides", d: "Alert, then one tap." },
  ];
  steps.forEach((st, i) => {
    const x = 0.75 + i * 3.05;
    card(s, { x, y: 1.6, w: 2.8, h: 3.85, objectName: `Step ${i + 1}` });
    text(s, String(i + 1), { x: x + 0.3, y: 1.85, w: 0.5, h: 0.4, fontFace: MONO, fontSize: 14, color: C.text2 });
    if (i === 0) s.addImage({ data: A.device, x: x + 0.78, y: 2.2, w: 1.25, h: 1.25 * (520 / 480) });
    if (i === 1) {
      s.addImage({ data: A.wifi, x: x + 0.55, y: 2.55, w: 0.75, h: 0.75 });
      s.addImage({ data: A.cloud, x: x + 1.45, y: 2.45, w: 0.95, h: 0.95 });
    }
    if (i === 2) s.addImage({ data: A.band, x: x + 0.3, y: 2.45, w: 2.2, h: 2.2 * (300 / 520) });
    if (i === 3) {
      s.addShape(pres.shapes.OVAL, { x: x + 1.05, y: 2.2, w: 0.7, h: 0.7, fill: { color: HEX.rust }, line: { color: HEX.rust } });
      s.addImage({ data: A.bell, x: x + 1.2, y: 2.35, w: 0.4, h: 0.4 });
      [["Shut down", HEX.rust, HEX.surface], ["Call technician", HEX.green, HEX.surface], ["Mark OK", HEX.idle, HEX.ink]].forEach(([label, fill, color], j) => {
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.3, y: 3.1 + j * 0.42, w: 2.2, h: 0.34, rectRadius: 0.08, fill: { color: fill }, line: { color: fill } });
        text(s, label, { x: x + 0.3, y: 3.1 + j * 0.42, w: 2.2, h: 0.34, fontSize: 12, bold: true, color, align: "center", valign: "middle" });
      });
    }
    text(s, st.t, { x: x + 0.3, y: 4.45, w: 2.3, h: 0.45, fontFace: HEAD, fontSize: 17, bold: true, color: C.text1, valign: "top" });
    if (st.d) text(s, st.d, { x: x + 0.3, y: 4.85, w: 2.3, h: 0.55, fontSize: 12, color: C.text2, valign: "top" });
    if (i < 3) s.addImage({ data: A.arrow, x: x + 2.84, y: 3.35, w: 0.18, h: 0.18 });
  });
  s.addImage({ data: A.shield, x: 0.75, y: 5.85, w: 0.42, h: 0.42 });
  text(s, "Safety: no auto restart after a shutdown, and fridges are never cut.", { x: 1.3, y: 5.82, w: 10, h: 0.48, fontSize: 17, color: C.text1, valign: "middle" });
  notes(s, "s5");

  /* 6. Prototype demo */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Pitch" });
  s.addText("The owner app, live", { placeholder: "title" });
  const vw = 8.7, vh = vw * 9 / 16;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 1.5, w: vw + 0.1, h: vh + 0.1, rectRadius: 0.1, fill: { color: HEX.ink }, line: { color: HEX.ink }, objectName: "Video frame" });
  s.addMedia({ type: "video", path: VIDEO, x: 0.75, y: 1.55, w: vw, h: vh, cover: A.poster, objectName: "Owner app demo, 67 s, no audio" });
  text(s, "Owner side prototype. Simulated boxes, real flow. Click to play.", { x: 0.75, y: 6.55, w: 8, h: 0.3, fontSize: 11, color: C.text2 });
  text(s, "In the video", { x: 10.25, y: 1.55, w: 2.35, h: 0.45, fontFace: HEAD, fontSize: 20, bold: true, color: C.text1 });
  text(s, "Login, alert, technician, idle shutdown, assign, daily report.", { x: 10.25, y: 2.15, w: 2.35, h: 1.2, fontSize: 13, color: C.text2, valign: "top" });
  notes(s, "s6");

  /* 7. Market */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Pitch" });
  s.addText("A market that runs on electric equipment", { placeholder: "title" });
  const stats = [
    { big: "31", t: "shared-use commercial kitchens in Ontario", src: "poidata.io, Aug 2025" },
    { big: "30 to 40%", t: "saved by predictive maintenance versus fixing after breakdown", src: "U.S. DOE, O&M Best Practices Guide" },
    { big: "5 to 7×", t: "more energy per sq ft in restaurants than other commercial buildings", src: "ENERGY STAR" },
  ];
  stats.forEach((st, i) => {
    const x = 0.75 + i * 4.0;
    text(s, st.big, { x, y: 1.7, w: 3.7, h: 1.2, fontFace: MONO, fontSize: st.big.length > 4 ? 46 : 64, color: i === 1 ? HEX.green : C.text1, valign: "bottom" });
    text(s, st.t, { x, y: 3.0, w: 3.5, h: 0.9, fontSize: 16, color: C.text1, valign: "top" });
    text(s, st.src, { x, y: 3.95, w: 3.5, h: 0.3, fontSize: 10, color: C.text2 });
  });
  s.addImage({ data: A.curveLight, x: 0.75, y: 4.45, w: 11.8, h: 11.8 * (150 / 3000), objectName: "Heartbeat divider" });
  text(s, "Expansion path", { x: 0.75, y: 5.25, w: 3, h: 0.35, fontFace: MONO, fontSize: 12, color: C.text2 });
  ["One makerspace", "University networks with several labs", "Shared kitchens"].forEach((t, i) => {
    const x = 0.75 + i * 4.0;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 5.65, w: 3.6, h: 0.65, rectRadius: 0.3, fill: { color: i === 0 ? HEX.green : C.background1 }, line: { color: i === 0 ? HEX.green : HEX.border, width: 0.75 } });
    text(s, t, { x: x + 0.25, y: 5.65, w: 3.1, h: 0.65, fontSize: 15, bold: i === 0, color: i === 0 ? HEX.surface : C.text1, valign: "middle" });
    if (i < 2) s.addImage({ data: A.arrow, x: x + 3.66, y: 5.88, w: 0.2, h: 0.2 });
  });
  notes(s, "s7");

  /* 8. Competition */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Pitch" });
  s.addText("What each one knows", { placeholder: "title" });
  const head = (t) => ({ text: t, options: { bold: true, color: HEX.muted, fontSize: 12, fill: { color: HEX.bg } } });
  const rows = [
    ["Skedda", "Booking", "US$249+ /mo", "Who booked"],
    ["Fabman", "Machine access", "€49 to €199 /mo + €10 to €14 per machine", "Who switched it on"],
    ["Emporia", "Energy monitor", "~US$200", "How much energy"],
    ["MachineMetrics", "Factory monitoring", "~US$1,400+ hardware per kit", "Machine health, for factories only"],
  ];
  const cell = (t, o = {}) => ({ text: t, options: { fontSize: 14, color: HEX.ink, ...o } });
  const table = [
    [head("Product"), head("Category"), head("Price"), head("What it knows")],
    ...rows.map((r) => [cell(r[0], { bold: true, fontFace: HEAD }), cell(r[1], { color: HEX.muted }), cell(r[2], { fontFace: MONO, fontSize: 12 }), cell(r[3])]),
    [
      cell("PREVUMO", { bold: true, fontFace: HEAD, color: HEX.surface, fill: { color: HEX.ink } }),
      cell("Shared spaces", { color: HEX.greenTint, fill: { color: HEX.ink } }),
      cell("Assumption, slide 9", { fontFace: MONO, fontSize: 12, color: HEX.greenTint, fill: { color: HEX.ink } }),
      cell("Who used it + how much + machine health + remote shutdown", { bold: true, color: HEX.surface, fill: { color: HEX.ink } }),
    ],
  ];
  s.addTable(table, {
    x: 0.75, y: 1.6, w: 11.8, colW: [2.2, 2.1, 3.4, 4.1], rowH: [0.45, 0.62, 0.62, 0.62, 0.62, 0.72],
    fontFace: "Inter", fill: { color: HEX.surface }, border: { type: "solid", pt: 0.75, color: HEX.border }, margin: [0.08, 0.15, 0.08, 0.15], valign: "middle",
    objectName: "Positioning table",
  });
  text(s, "Skedda could be a partner, not just a competitor: a booking becomes a PIN on our box.", { x: 0.75, y: 5.6, w: 11.8, h: 0.5, fontSize: 17, color: C.text1 });
  source(s, "Prices from each company's public pricing, gathered in our competitor research.");
  notes(s, "s8");

  /* 9. Business model */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Pitch" });
  s.addText("From billing to predictive maintenance", { placeholder: "title" });
  const BLOCKS = [
    // [label, col, row, colspan, rowspan] on a 5 x 3 canvas grid
    ["Partners", 0, 0, 1, 2], ["Activities", 1, 0, 1, 1], ["Resources", 1, 1, 1, 1], ["Value", 2, 0, 1, 2],
    ["Relations", 3, 0, 1, 1], ["Channels", 3, 1, 1, 1], ["Segments", 4, 0, 1, 2], ["Costs", 0, 2, 2.5, 1], ["Revenue", 2.5, 2, 2.5, 1],
  ];
  // Each block: plain words, with the parts that are new in Plan B in bold.
  const PLAN_A = {
    Partners: "Component suppliers, electricians", Activities: "Box + app, billing reports", Resources: "Usage data per user",
    Value: "Bill each user for energy", Relations: "Self-service app", Channels: "Website, outreach",
    Segments: "Coworking, makerspaces, kitchens, labs", Costs: "Box, install, hosting", Revenue: "~$150 box + ~$10/machine/mo",
  };
  const PLAN_B = {
    Partners: [["Suppliers, "], ["technician network", 1], [", booking platforms"]],
    Activities: [["Box + app, "], ["AI curve learning, alerts", 1]],
    Resources: [["Anomaly model, irregularity history", 1]],
    Value: [["Warn before failure", 1], [", remote shutdown, idle shut-off"]],
    Relations: [["App + "], ["alert follow-up", 1]],
    Channels: [["Website, outreach, "], ["partner referrals", 1]],
    Segments: [["Makerspaces, labs", 1], [" first, then kitchens"]],
    Costs: [["Box, install, hosting + "], ["AI development", 1]],
    Revenue: [["~$300 box + ~$25/machine/mo + referral"]],
  };
  const canvas = (x0, y0, w, h, title, sub, changed, dim, content) => {
    text(s, title, { x: x0, y: y0, w, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: dim ? HEX.muted : HEX.ink });
    text(s, sub, { x: x0, y: y0 + 0.4, w, h: 0.35, fontSize: 13, color: HEX.muted });
    const gx = x0, gy = y0 + 0.9, cw = w / 5, ch = (h - 0.9) / 3;
    BLOCKS.forEach(([label, c, r, cs, rs]) => {
      const hot = changed.includes(label);
      s.addShape(pres.shapes.RECTANGLE, {
        x: gx + c * cw, y: gy + r * ch, w: cs * cw, h: rs * ch,
        fill: { color: hot ? HEX.orangeTint : dim ? HEX.idle : HEX.surface }, line: { color: hot ? HEX.orange : HEX.border, width: hot ? 1.5 : 0.75 },
      });
      text(s, label, { x: gx + c * cw + 0.06, y: gy + r * ch + 0.07, w: cs * cw - 0.12, h: 0.22, fontSize: 10, bold: hot, color: hot ? HEX.ink : HEX.muted, valign: "top" });
      const body = content[label];
      const runs = typeof body === "string" ? [{ text: body, options: {} }] : body.map(([t, b]) => ({ text: t, options: { bold: !!b } }));
      text(s, runs, { x: gx + c * cw + 0.05, y: gy + r * ch + 0.3, w: cs * cw - 0.1, h: rs * ch - 0.34, fontSize: 8.5, color: dim ? HEX.muted : HEX.ink, valign: "top", objectName: `${title} ${label}` });
    });
  };
  canvas(0.75, 1.55, 4.75, 3.55, "Plan A (PD A)", "Usage tracker and billing", [], true, PLAN_A);
  canvas(5.7, 1.55, 4.75, 3.55, "Plan B (now)", "Safety and predictive maintenance", ["Value", "Activities", "Resources", "Partners", "Segments", "Revenue"], false, PLAN_B);
  text(s, "Orange = changed", { x: 5.7, y: 5.15, w: 4.75, h: 0.3, fontSize: 11, color: HEX.muted });
  card(s, { x: 10.7, y: 1.55, w: 1.9, h: 4.85, objectName: "Revenue" });
  text(s, "Revenue (assumptions)", { x: 10.85, y: 1.7, w: 1.65, h: 0.55, fontSize: 11, color: HEX.muted, valign: "top" });
  text(s, [{ text: "$300", options: { fontFace: MONO, fontSize: 26, breakLine: true } }, { text: "box per machine, one time", options: { fontSize: 11, color: HEX.muted } }], { x: 10.85, y: 2.2, w: 1.65, h: 0.95, color: HEX.ink, valign: "top" });
  text(s, [{ text: "$25", options: { fontFace: MONO, fontSize: 26, breakLine: true } }, { text: "per machine per month", options: { fontSize: 11, color: HEX.muted } }], { x: 10.85, y: 3.15, w: 1.65, h: 0.95, color: HEX.ink, valign: "top" });
  text(s, "+ possible referral fee on technician jobs", { x: 10.85, y: 4.1, w: 1.65, h: 0.6, fontSize: 11, color: HEX.ink, valign: "top" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 10.8, y: 4.8, w: 1.7, h: 1.5, rectRadius: 0.08, fill: { color: HEX.greenTint }, line: { color: HEX.greenTint }, objectName: "Expected revenue" });
  text(s, [
    { text: "Per machine, year 1", options: { fontSize: 10, bold: true, breakLine: true } },
    { text: "$300 box + $300 subscription", options: { fontSize: 10, breakLine: true } },
    { text: "= $600 revenue", options: { fontFace: MONO, fontSize: 15, bold: true, breakLine: true } },
    { text: "Assumptions to validate", options: { fontSize: 9, color: HEX.muted } },
  ], { x: 10.9, y: 4.9, w: 1.5, h: 1.3, color: HEX.ink, valign: "top", paraSpaceAfter: 2 });
  text(s, [
    { text: "Why it changed: ", options: { bold: true } },
    { text: "Every owner we asked bundles electricity into rent or membership, so per-user billing isn't the pain. Breakdowns and equipment left on are." },
  ], { x: 0.75, y: 5.6, w: 9.6, h: 0.75, fontSize: 14, color: C.text1, valign: "top" });
  notes(s, "s9");

  /* 10. Progress and validation */
  s = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Pitch" });
  s.addText("What we've tested so far", { placeholder: "title" });
  [["6", "competitors reverse engineered"], ["2", "business model canvases"], ["49", "outreach emails, Canada, US, Europe"], ["10", "interviews"]].forEach(([n, t], i) => {
    const x = 0.75 + i * 2.25;
    text(s, n, { x, y: 1.45, w: 2.1, h: 0.75, fontFace: MONO, fontSize: 40, color: HEX.ink, valign: "bottom" });
    text(s, t, { x, y: 2.25, w: 2.0, h: 0.45, fontSize: 12, color: HEX.muted, valign: "top" });
    if (n === "49") text(s, "replies still coming in", { x, y: 2.68, w: 2.0, h: 0.25, fontSize: 11, italic: true, color: HEX.ink, valign: "top" });
  });
  card(s, { x: 9.85, y: 1.45, w: 2.75, h: 1.45, objectName: "Pivot" });
  text(s, [{ text: "The pivot", options: { fontFace: MONO, fontSize: 11, color: HEX.orange, breakLine: true } }, { text: "Billing → predictive maintenance", options: { fontFace: HEAD, fontSize: 16, bold: true } }], {
    x: 10.05, y: 1.6, w: 2.4, h: 1.2, color: HEX.ink, valign: "top",
  });
  s.addImage({ data: A.quote, x: 0.75, y: 3.1, w: 0.38, h: 0.38 });
  text(s, "“Managing equipment is one of the biggest tasks we have.”", { x: 1.25, y: 3.05, w: 5.4, h: 0.62, fontFace: HEAD, fontSize: 18, bold: true, color: HEX.ink, valign: "top" });
  text(s, "Executive Director, Ontario makerspace", { x: 1.25, y: 3.68, w: 5.4, h: 0.25, fontSize: 11, color: HEX.muted });
  s.addImage({ data: A.quote, x: 0.75, y: 4.1, w: 0.38, h: 0.38 });
  text(s, "“I pay all the electricity and build that price into my monthly rent. Simple, easy, fair.”", { x: 1.25, y: 4.05, w: 5.4, h: 0.55, fontFace: HEAD, fontSize: 15, bold: true, color: HEX.ink, valign: "top" });
  text(s, "Owner, Manitoba shared kitchen", { x: 1.25, y: 4.62, w: 5.4, h: 0.25, fontSize: 11, color: HEX.muted });
  const vb = [
    [head("Assumption"), head("Method"), head("Result")],
    [cell("Owners bill electricity per user", { fontSize: 11 }), cell("Interviews", { fontSize: 11 }), cell("Invalidated", { fontSize: 11, bold: true, color: HEX.surface, fill: { color: HEX.rust } })],
    [cell("Owners want warning before failures", { fontSize: 11 }), cell("Interviews", { fontSize: 11 }), cell("Partly supported", { fontSize: 11, bold: true, fill: { color: HEX.orangeTint } })],
    [cell("Staff switch equipment off at closing", { fontSize: 11 }), cell("Café interviews", { fontSize: 11 }), cell("Invalidated: control must sit with the owner", { fontSize: 11, bold: true, color: HEX.surface, fill: { color: HEX.rust } })],
  ];
  s.addTable(vb, { x: 7.0, y: 3.05, w: 5.6, colW: [2.35, 1.3, 1.95], rowH: [0.36, 0.5, 0.5, 0.5], fontFace: "Inter", fill: { color: HEX.surface }, border: { type: "solid", pt: 0.75, color: HEX.border }, margin: [0.05, 0.1, 0.05, 0.1], valign: "middle", objectName: "Validation board" });
  text(s, "Every owner we asked builds electricity into rent or membership, so the headline moved from billing to predictive maintenance. And café staff forget equipment on, so we added scheduled shutdowns.", {
    x: 0.75, y: 5.45, w: 11.8, h: 0.8, fontSize: 15, color: C.text1, valign: "top",
  });
  text(s, "Full validation board in the appendix.", { x: 7.0, y: 5.0, w: 5.6, h: 0.3, fontSize: 11, color: HEX.muted });
  notes(s, "s10");

  /* 11. Closing */
  s = pres.addSlide({ masterName: "PREVUMO Dark", sectionTitle: "Pitch" });
  s.addImage({ data: A.curveDark, x: 0, y: 2.7, w: W, h: W * (520 / 3000), objectName: "Heartbeat motif" });
  text(s, [
    { text: "Skedda tells you who booked it.", options: { color: HEX.greenTint, breakLine: true } },
    { text: "PREVUMO tells you who used it, and when it's about to fail.", options: { color: HEX.bg } },
  ], { x: 0.75, y: 0.8, w: 11.2, h: 2.4, fontFace: HEAD, fontSize: 38, bold: true, valign: "top", paraSpaceAfter: 8 });
  text(s, "Thank you. Questions?", { x: 0.75, y: 5.95, w: 7, h: 0.7, fontFace: HEAD, fontSize: 30, bold: true, color: HEX.orange });
  notes(s, "s11");

  /* Appendix */
  pres.addSection({ title: "Appendix (Q&A)" });
  const appx = (title, key) => {
    const sl = pres.addSlide({ masterName: "PREVUMO Content", sectionTitle: "Appendix (Q&A)" });
    sl.addText(title, { placeholder: "title" });
    text(sl, "Appendix · for Q&A", { x: 2.0, y: 6.95, w: 3, h: 0.3, fontFace: MONO, fontSize: 10, color: HEX.muted });
    notes(sl, key);
    return sl;
  };

  s = appx("Remote shutdown hardware", "a1");
  [
    ["Up to 15 A at 120 V", "A certified relay inside the box switches the machine directly."],
    ["240 V or 3-phase", "The box drives a contactor, installed by a licensed electrician."],
    ["Before we sell", "CSA certification of the box is required."],
  ].forEach(([h, d], i) => {
    const x = 0.75 + i * 4.0;
    card(s, { x, y: 1.7, w: 3.75, h: 3.2 });
    text(s, h, { x: x + 0.35, y: 2.0, w: 3.1, h: 0.9, fontFace: HEAD, fontSize: 24, bold: true, color: HEX.ink, valign: "top" });
    text(s, d, { x: x + 0.35, y: 3.0, w: 3.1, h: 1.5, fontSize: 16, color: HEX.muted, valign: "top" });
  });
  s.addImage({ data: A.shield, x: 0.75, y: 5.4, w: 0.42, h: 0.42 });
  text(s, "After any shutdown the machine stays off until someone starts it again. Fridges and freezers are never cut.", { x: 1.3, y: 5.35, w: 11, h: 0.55, fontSize: 15, color: HEX.ink, valign: "middle" });

  s = appx("Learning, privacy and limits", "a2");
  [
    ["About 7 days", "to learn a new machine's normal current pattern. Alerts switch on after that."],
    ["Owner only", "Usage data belongs to the owner's account. Members don't see each other's sessions."],
    ["Electric only", "Gas equipment is invisible to electricity data."],
  ].forEach(([h, d], i) => {
    const x = 0.75 + i * 4.0;
    text(s, h, { x, y: 1.8, w: 3.7, h: 0.9, fontFace: i === 0 ? MONO : HEAD, fontSize: 30, bold: i !== 0, color: HEX.ink, valign: "bottom" });
    text(s, d, { x, y: 2.85, w: 3.5, h: 1.4, fontSize: 16, color: HEX.muted, valign: "top" });
  });
  s.addImage({ data: A.curveLight, x: 0.75, y: 4.7, w: 11.8, h: 11.8 * (150 / 3000), objectName: "Heartbeat divider" });

  s = appx("Validation board", "a3");
  const full = [
    [head("Customer"), head("Problem"), head("Core assumption"), head("Method"), head("Success criterion"), head("Result after this week")],
    [cell("Makerspace and kitchen owners", { fontSize: 10.5 }), cell("Energy cost per user is invisible", { fontSize: 10.5 }), cell("Owners want to bill electricity per user", { fontSize: 10.5 }), cell("Interviews: 3 owners, Magna, IEEE", { fontSize: 10.5 }), cell("Owners charge members for energy", { fontSize: 10.5 }), cell("Invalidated: 3 of 3 owners bundle it into rent or fees", { fontSize: 10.5, bold: true, color: HEX.surface, fill: { color: HEX.rust } })],
    [cell("Makerspace, manufacturing, café", { fontSize: 10.5 }), cell("Breakdowns cost money and time", { fontSize: 10.5 }), cell("Breakdowns are a costly, frequent pain", { fontSize: 10.5 }), cell("Interviews", { fontSize: 10.5 }), cell("6 of 10 describe a costly breakdown", { fontSize: 10.5 }), cell("Partly supported: makerspace and Magna give costs, 3 café staff; 6 of 10 not met yet", { fontSize: 10.5, bold: true, fill: { color: HEX.orangeTint } })],
    [cell("Makerspace and lab managers", { fontSize: 10.5 }), cell("Failures come without warning", { fontSize: 10.5 }), cell("Owners want warning before a failure", { fontSize: 10.5 }), cell("Interviews", { fontSize: 10.5 }), cell("Failures are noticed too late", { fontSize: 10.5 }), cell("Partly supported: café staff notice only once it stops", { fontSize: 10.5, bold: true, fill: { color: HEX.orangeTint } })],
    [cell("Cafés and kitchens", { fontSize: 10.5 }), cell("Equipment left on after closing", { fontSize: 10.5 }), cell("Owners need idle and scheduled shutdown", { fontSize: 10.5 }), cell("Café interviews, manager field notes", { fontSize: 10.5 }), cell("Equipment found on after closing", { fontSize: 10.5 }), cell("Supported, new: something left on almost every night", { fontSize: 10.5, bold: true, fill: { color: HEX.greenTint } })],
    [cell("Café staff", { fontSize: 10.5 }), cell("Nobody owns switching off", { fontSize: 10.5 }), cell("Staff switch equipment off at closing", { fontSize: 10.5 }), cell("Café interviews", { fontSize: 10.5 }), cell("Staff switch off reliably", { fontSize: 10.5 }), cell("Invalidated: control must sit with the owner", { fontSize: 10.5, bold: true, color: HEX.surface, fill: { color: HEX.rust } })],
    [cell("University student spaces", { fontSize: 10.5 }), cell("Who used which machine", { fontSize: 10.5 }), cell("Open-access spaces need per-machine tracking", { fontSize: 10.5 }), cell("IEEE uOttawa interview", { fontSize: 10.5 }), cell("They track use per machine", { fontSize: 10.5 }), cell("Invalidated: RFID sign-in only, free equipment not tracked", { fontSize: 10.5, bold: true, color: HEX.surface, fill: { color: HEX.rust } })],
  ];
  s.addTable(full, { x: 0.75, y: 1.55, w: 11.8, colW: [1.85, 1.95, 2.25, 1.75, 1.85, 2.15], rowH: [0.4, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72], fontFace: "Inter", fill: { color: HEX.surface }, border: { type: "solid", pt: 0.75, color: HEX.border }, margin: [0.05, 0.08, 0.05, 0.08], valign: "middle", objectName: "Full validation board" });

  s = appx("Q&A prep", "a4");
  const qa = [
    ["Why not a smart plug?", "No PIN, no per member history, no learned normal curve, and most can't carry a welder."],
    ["Heavy 240 V equipment?", "The box drives a contactor installed by a licensed electrician."],
    ["Liability for a shutdown?", "The owner decides, every shutdown is logged, nothing restarts on its own."],
    ["How does it know normal?", "About 7 days of the machine's own current, then it flags sustained changes."],
    ["Can a non-profit pay $25?", "One avoided emergency call ($754) covers about 2.5 machine-years. Price still to validate."],
    ["Versus Fabman?", "Fabman knows who switched it on. We add machine health, idle and technicians."],
    ["What did interviews change?", "Every owner we asked bundles electricity into rent, so we dropped per-user billing as the headline and made predictive maintenance the core."],
  ];
  qa.forEach(([q, a], i) => {
    const col = i < 4 ? 0 : 1;
    const row = i < 4 ? i : i - 4;
    const x = 0.75 + col * 6.0, y = 1.55 + row * 1.2;
    text(s, q, { x, y, w: 5.6, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, color: HEX.ink });
    text(s, a, { x, y: y + 0.4, w: 5.6, h: 0.7, fontSize: 13, color: HEX.muted, valign: "top" });
  });
  text(s, "Full answers in the speaker notes.", { x: 6.75, y: 5.3, w: 5.6, h: 0.3, fontSize: 11, color: HEX.muted });

  s = appx("Sources", "a5");
  const src = [
    "Group 10 interviews, Oct 21 to 23, 2026 (makerspace, two shared kitchens, manufacturing, café staff, university student office). Quotes anonymized.",
    "Emergency repair call average, $754: 86 Repairs, 2024, via Envigilance.",
    "31 shared-use commercial kitchens in Ontario: poidata.io, August 2025.",
    "Predictive maintenance saves about 30 to 40% versus reactive maintenance: U.S. Department of Energy, Operations & Maintenance Best Practices Guide.",
    "Restaurants use 5 to 7 times more energy per square foot than other commercial buildings: ENERGY STAR.",
    "Competitor prices: Skedda, Fabman, Emporia and MachineMetrics public pricing, from our competitor research.",
    "Prices for PREVUMO ($300 box, $25 per machine per month) are assumptions to validate.",
  ];
  text(s, src.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < src.length - 1 } })), {
    x: 0.75, y: 1.6, w: 11.8, h: 4.8, fontSize: 14, color: HEX.ink, valign: "top", paraSpaceAfter: 10,
  });

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  await playVideoOnClick(OUT, DEMO_SLIDE);
  console.log(`wrote ${OUT}${URL_LIVE ? ` with QR for ${URL_LIVE}` : ""}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
