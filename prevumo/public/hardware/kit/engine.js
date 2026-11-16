// PREVUMO drawing-sheet engine (PD B3). One three.js "drawing sheet" shared by every machine page:
// the box (NFC reader, QR sticker, display), the exploded view, balloons, parts table, steps, charts,
// owner app alerts, session cards and the title block. Each page passes a config to run().
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

export const C = {
  bg: "#F3EBDD", surface: "#FFFDF8", border: "#E3D6C0", ink: "#1F3D2B", inkDeep: "#16301F", inkSoft: "#2C4D39", muted: "#5B6B5F",
  green: "#2F6B45", gtint: "#D6E4D3", orange: "#E07A2E", otint: "#F6D2B4", rust: "#A63D1F", idle: "#EDE4D3", idlemark: "#81897A",
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const outCubic = (k) => 1 - Math.pow(1 - k, 3);
const outBack = (k, s = 1.25) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
const rnd = (i) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const within = (t, spans) => spans.some(([a, b]) => t >= a && t < b);
const spanK = (t, spans, fin = 0.35, fout = 0.3) => clamp(spans.reduce((s, [a, b]) => s + prog(t, a, a + fin) * (1 - prog(t, b, b + fout)), 0));
const seq = (t, list) => { let v = list[0][1]; for (const [a, x] of list) if (t >= a) v = x; return typeof v === "function" ? v(t) : v; };
export const U = { clamp, prog, lerp, ease, outCubic, outBack, rnd, within, spanK, seq };

const TITLE_NOTE = "Concept only, not built or tested. A licensed electrician installs switching parts; gas parts reviewed by a licensed gas fitter; CSA certification needed before sale.";

// The shared timeline: title, explode with box balloons, reassemble, the machine with its off-box parts, then the steps.
export function plan(nBox, nSys, stepDur) {
  const T = { explode: 3.6, bom0: 6.0, bomStep: 1.1 };
  T.assemble = T.bom0 + nBox * T.bomStep + 0.5;
  T.sysIn = T.assemble + 1.5;
  T.sys0 = T.assemble + 2.7;
  T.sysStep = 0.85;
  T.how = T.sys0 + Math.max(1, nSys) * T.sysStep + 1.1;
  T.steps = [T.how + 0.5];
  for (const d of stepDur) T.steps.push(T.steps[T.steps.length - 1] + d);
  T.end = T.steps[T.steps.length - 1] + 0.2;
  T.explode2 = T.end + 0.4;
  T.dur = +(T.explode2 + 5.2).toFixed(2);
  return T;
}

const W = 1920, H = 1080;
const ICON = {
  power: '<svg viewBox="0 0 24 24"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>',
  wrench: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
  flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/><path d="M5.5 4h12l-3 4.5 3 4.5h-12z" fill="currentColor"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 3 2 21h20L12 3z" fill="currentColor"/><path d="M12 10v5M12 18h.01" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor"/></svg>',
};
const BTN = {
  off: (r) => `<div class="btn qd">${ICON.power}Shut down${r}</div>`,
  tech: (r) => `<div class="btn pr">${ICON.wrench}Call technician${r}</div>`,
  ok: (r) => `<div class="btn sec">${ICON.shield}Mark as OK${r}</div>`,
  cancel: (r) => `<div class="btn sec">Cancel${r}</div>`,
  confirm: (r) => `<div class="btn dg">${ICON.power}Shut down${r}</div>`,
  gap: () => `<span style="flex:1"></span>`,
};

export function run(cfg) {
  const FILM = new URLSearchParams(location.search).has("film");
  if (FILM) document.documentElement.classList.add("film");
  const T = cfg.T, DUR = T.dur;
  const $ = (s) => document.querySelector(s);

  // ---------------- page ----------------
  const chapters = [["b-assembled", "Assembled"], ["b-pieces", "In pieces"], ["b-system", cfg.sysTitle], ["b-how", "How it works"], ...(cfg.chapters || []).map((c, i) => [`b-x${i}`, c.label])];
  document.body.insertAdjacentHTML("beforeend", `
<div class="wrap">
  <div id="frame"><div id="stage">
    <canvas id="gl" aria-label="3D drawing of the PREVUMO ${cfg.name.toLowerCase()}. Drag to turn it."></canvas>
    <svg id="lines" viewBox="0 0 1920 1080"></svg>
    <div id="balloons"></div><div id="tags"></div><div id="sheet"></div>
    <header id="head" class="fade"><p id="kick" class="mono"></p><div class="mask"><h1 id="ttl"></h1></div><p id="sub">${cfg.sub}</p></header>
    <aside id="bom" class="fade"><div class="hd"><span>No.</span><span>Part</span></div></aside>
    <ol id="steps" class="fade"></ol>
    <section id="chart" class="card fade"><div class="top"><p class="tt" id="charttt"></p><span class="tag" id="charttag"></span></div><svg id="chartsvg" width="508" height="210" viewBox="0 0 508 210"></svg></section>
    <section id="detail" class="card fade"><p class="dl">Detail A · display on the box</p><div class="scr"><i id="dlight"></i><div class="glass"><p id="d1"></p><p id="d2"></p></div></div></section>
    <div id="cards"></div>
    <p id="applabel" class="fade">Owner app · illustrative</p>
    <section id="alert" class="card fade"><div class="ah"><span class="badge" id="abadge"></span><p class="at" id="atitle"></p><p class="ar" id="areason"></p></div><div class="af" id="afoot"></div></section>
    <footer id="tblock" class="fade">
      <div class="r"><div class="c"><p class="k">Project</p><p class="v">PREVUMO</p></div><div class="c"><p class="k">Drawing</p><p class="v">${cfg.name}</p></div></div>
      <div class="r"><div class="c"><p class="k">Revision</p><p class="v">Concept v0.2 · PD B3</p></div><div class="c"><p class="k">Team</p><p class="v">Group 10 · GNG4120</p></div></div>
      <div class="r"><div class="c"><p class="k">Date</p><p class="v">Nov 2026</p></div><div class="c"><p class="k">Scale</p><p class="v">Not to scale</p></div></div>
      <p class="note">${TITLE_NOTE}</p>
    </footer>
    <p id="concept">Concept drawing · not built or tested · charts, numbers and alerts are illustrative</p>
  </div></div>
  <div id="controls">
    ${chapters.map(([id, l]) => `<button type="button" id="${id}">${l}</button>`).join("")}
    <button type="button" id="b-play" class="play">Play</button>
    <input type="range" id="scrub" min="0" max="${DUR}" step="0.01" value="0" aria-label="Position in the animation">
    <span id="clock"></span>
    <p id="hint">Drag the model to turn it, scroll or pinch to zoom, double click to reset the view. Concept only: not built or tested.</p>
  </div>
  <div id="notes">
    <section><h2>Parts</h2><ol id="n-parts"></ol></section>
    <section><h2>How it works</h2><ol id="n-steps"></ol></section>
    <section><h2>About this prototype</h2><p>${cfg.about} ${TITLE_NOTE} Every chart, number and alert on this page is illustrative, not measured.</p>
      ${cfg.evidence ? `<h2 style="margin-top:22px">Evidence</h2><ol class="ev">${cfg.evidence.map((e) => `<li><span>${e}</span></li>`).join("")}</ol>` : ""}</section>
  </div>
</div>`);

  // ---------------- renderer ----------------
  const canvas = $("#gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(C.bg, 1);
  const RES = new THREE.Vector2(W, H);
  const hullMats = [], lineMats = [], ctxMats = [];
  function setPR(pr) {
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false); RES.set(W * pr, H * pr);
    for (const m of hullMats) m.uniforms.px.value = m.userData.px * pr;
    for (const m of lineMats) { m.resolution.copy(RES); m.linewidth = m.userData.w * pr; }
  }
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.64 * Math.PI));
  const sun = new THREE.DirectionalLight(0xffffff, 0.36 * Math.PI); sun.position.set(-45, 90, 70); scene.add(sun);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
  const GRAD = (() => { const tx = new THREE.DataTexture(new Uint8Array([120, 200, 255]), 3, 1, THREE.RedFormat); tx.minFilter = tx.magFilter = THREE.NearestFilter; tx.needsUpdate = true; return tx; })();
  function hullMaterial(px, color) {
    const m = new THREE.ShaderMaterial({
      uniforms: { px: { value: px }, res: { value: RES }, color: { value: new THREE.Color(color) }, opacity: { value: 1 } },
      vertexShader: `uniform float px; uniform vec2 res;
        void main() { vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(normalMatrix * normal); vec2 d = (projectionMatrix * vec4(n, 0.0)).xy;
          float l = length(d); if (l > 1e-5) d /= l; c.xy += d * px * 2.0 / res * c.w; gl_Position = c; }`,
      fragmentShader: `uniform vec3 color; uniform float opacity;
        void main() { gl_FragColor = vec4(color, opacity);
        #include <colorspace_fragment>
        }`,
      side: THREE.BackSide,
    });
    m.userData.px = px; hullMats.push(m); return m;
  }
  const HULL = { mod: hullMaterial(2.6, C.inkDeep), ctx: hullMaterial(2.2, C.inkDeep) };
  const hullGeo = new WeakMap();
  function addHull(mesh, mat) {
    let g = hullGeo.get(mesh.geometry);
    if (!g) { g = mesh.geometry.clone(); for (const k of Object.keys(g.attributes)) if (k !== "position") g.deleteAttribute(k); g = mergeVertices(g, 1e-3); g.computeVertexNormals(); hullGeo.set(mesh.geometry, g); }
    const h = new THREE.Mesh(g, mat); h.renderOrder = -1; mesh.add(h); return h;
  }
  const toon = (hex, ctx) => { const m = new THREE.MeshToonMaterial({ color: hex, gradientMap: GRAD }); if (ctx) ctxMats.push(m); return m; };
  function mk(geo, hex, o = {}) {
    const m = new THREE.Mesh(geo, o.mat || toon(hex, o.ctx));
    if (o.outline !== false) addHull(m, o.ctx ? HULL.ctx : HULL.mod);
    if (o.p) m.position.set(...o.p);
    if (o.r) m.rotation.set(...o.r);
    return m;
  }
  const RB = (w, h, d, r = 0.4, s = 3) => new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));
  const CYL = (r, h, n = 28) => new THREE.CylinderGeometry(r, r, h, n);
  function canvasTex(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return { c, g: c.getContext("2d"), tx, key: "" }; }
  function texPlane(w, h, tex, ctx) { const m = new THREE.MeshBasicMaterial({ map: tex.tx, transparent: true }); if (ctx) ctxMats.push(m); return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function outletFace(g, cx, cy, s) {
    g.fillStyle = C.ink;
    rr(g, cx - 26 * s, cy - 30 * s, 9 * s, 30 * s, 3 * s); g.fill(); rr(g, cx + 17 * s, cy - 30 * s, 9 * s, 24 * s, 3 * s); g.fill();
    g.beginPath(); g.arc(cx, cy + 22 * s, 9 * s, Math.PI, 0); g.lineTo(cx + 9 * s, cy + 30 * s); g.lineTo(cx - 9 * s, cy + 30 * s); g.closePath(); g.fill();
  }
  const statics = [];   // canvas paints that need the web fonts

  // ======================= the box =======================
  const box = { glands: 1, outlet: false, relay: null, coil: false, ct: false, modes: null, ...cfg.box };
  const mod = new THREE.Group(); mod.position.set(0, 100, 0); scene.add(mod);
  const P = {};
  const layer = (name, ez, order) => { const g = new THREE.Group(); g.userData = { ez, order }; mod.add(g); P[name] = g; return g; };

  const base = layer("base", 0, 6);
  base.add(mk(RB(14, 20, 4.4, 0.6), C.ink, { p: [0, 0, -0.8] }));
  const gx = box.glands === 1 ? [-3.5] : box.glands === 2 ? [-3.5, 3.5] : box.glands === 4 ? [-4.5, -1.5, 1.5, 4.5] : [-3.5, 0, 3.5];
  for (const x of gx) base.add(mk(CYL(0.62, 1.3, 20), C.muted, { p: [x, -10.5, -0.8] }));
  for (const y of [10.9, -10.9]) base.add(mk(RB(5, 1.8, 0.5, 0.2), C.ink, { p: [0, y, -2.75] }));
  if (box.outlet) {
    base.add(mk(RB(0.7, 5.6, 3.6, 0.25), C.surface, { p: [7.1, -4.6, -0.8] }));
    const so = canvasTex(180, 280); so.g.fillStyle = C.surface; so.g.fillRect(0, 0, 180, 280); outletFace(so.g, 90, 130, 2.2); so.tx.needsUpdate = true;
    const f = texPlane(3.2, 5.0, so); f.position.set(7.47, -4.6, -0.8); f.rotation.y = Math.PI / 2; base.add(f);
  }
  const psu = layer("psu", 8, 5);
  psu.add(mk(RB(7.2, 4.2, 2.2, 0.35), C.surface, { p: [0, -5.6, -0.4] }));
  for (const x of [-2.3, 0, 2.3]) psu.add(mk(RB(1.5, 1.1, 0.8, 0.15), C.gtint, { p: [x, -7.1, 1.0] }));
  const board = layer("board", 15, 4);
  board.add(mk(RB(12.4, 18, 0.2, 0.08, 2), C.green, { p: [0, 0, 0.9] }));
  board.add(mk(RB(3.0, 4.0, 0.45, 0.12), C.idle, { p: [2.8, 4.6, 1.25] }));
  board.add(mk(RB(3.0, 1.1, 0.12, 0.05), C.inkSoft, { p: [2.8, 7.25, 1.05], outline: false }));
  for (const [x, y] of [[-3.4, 4.8], [-3.4, 2.4], [0.2, 1.4]]) board.add(mk(RB(1.5, 1.5, 0.35, 0.1), C.inkDeep, { p: [x, y, 1.15], outline: false }));
  if (box.ct) board.add(mk(new THREE.TorusGeometry(1.05, 0.42, 12, 28), C.ink, { p: [3.4, -2.2, 1.45] }));
  if (box.coil) for (const x of [-3.6, -0.9]) board.add(mk(RB(2.1, 1.7, 1.5, 0.2), C.surface, { p: [x, -3.4, 1.75] }));
  for (const x of [-4.6, -1.6, 1.4, 4.4]) board.add(mk(RB(2.2, 1.2, 1.2, 0.15), C.gtint, { p: [x, -7.6, 1.6] }));
  board.add(mk(RB(4.4, 0.7, 0.6, 0.15), C.inkDeep, { p: [0, 8.2, 1.3] }));
  let relay = null;
  if (box.relay) {
    relay = layer("relay", 20.5, 3);
    relay.add(mk(RB(4.2, 3.2, 1.6, 0.3), C.surface, { p: [-2.8, -4.6, 1.8] }));
    const rt = canvasTex(260, 200); const rl = texPlane(3.6, 2.7, rt); rl.position.set(-2.8, -4.6, 2.62); relay.add(rl);
    statics.push(() => { const g = rt.g; g.fillStyle = C.surface; g.fillRect(0, 0, 260, 200); g.fillStyle = C.ink; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "700 60px 'JetBrains Mono'"; g.fillText(box.relay[0], 130, 72, 240); g.font = "500 44px 'JetBrains Mono'"; g.fillStyle = C.muted; g.fillText(box.relay[1], 130, 140, 240); rt.tx.needsUpdate = true; });
  }
  // front cover with the wordmark and the QR sticker beside the reader
  const lay = box.modes ? { pad: [-2.6, -1.0], qr: [3.6, -1.0] } : { pad: [-2.6, -2.2], qr: [3.6, -2.2] };
  const cover = layer("cover", 27, 2);
  cover.add(mk(RB(14, 20, 1.2, 0.6), C.ink, { p: [0, 0, 2.0] }));
  const wordTex = canvasTex(512, 96);
  const word = texPlane(6.4, 1.2, wordTex); word.position.set(0, -8.65, 2.62); cover.add(word);
  statics.push(() => { const g = wordTex.g; g.clearRect(0, 0, 512, 96); g.fillStyle = C.bg; g.font = "700 64px 'Space Grotesk'"; g.textAlign = "center"; g.textBaseline = "middle"; g.letterSpacing = "10px"; g.fillText("PREVUMO", 256, 50); wordTex.tx.needsUpdate = true; });
  const qrTex = canvasTex(360, 450);
  const qr = texPlane(3.5, 4.375, qrTex); qr.position.set(lay.qr[0], lay.qr[1], 2.62); cover.add(qr);
  statics.push(() => {
    const g = qrTex.g; g.clearRect(0, 0, 360, 450); g.fillStyle = C.surface; rr(g, 0, 0, 360, 450, 26); g.fill();
    const n = 21, s = 13, ox = 43, oy = 36; g.fillStyle = C.ink;
    const finder = (fx, fy) => { g.fillRect(ox + fx * s, oy + fy * s, 7 * s, 7 * s); g.fillStyle = C.surface; g.fillRect(ox + (fx + 1) * s, oy + (fy + 1) * s, 5 * s, 5 * s); g.fillStyle = C.ink; g.fillRect(ox + (fx + 2) * s, oy + (fy + 2) * s, 3 * s, 3 * s); };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const inF = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12); if (!inF && rnd(x * 31 + y * 7 + 3) > 0.52) g.fillRect(ox + x * s, oy + y * s, s, s); }
    finder(0, 0); finder(14, 0); finder(0, 14);
    g.font = "700 40px 'JetBrains Mono'"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("MANUAL", 180, 352 + 46); qrTex.tx.needsUpdate = true;
  });
  const screws = layer("screws", 41, 0);
  for (const [x, y] of [[-5.9, 8.9], [5.9, 8.9], [-5.9, -8.9], [5.9, -8.9]]) screws.add(mk(CYL(0.42, 0.5, 16), C.idlemark, { p: [x, y, 2.7], r: [Math.PI / 2, 0, 0] }));
  // display and status light
  const disp = layer("display", 34, 1);
  disp.add(mk(RB(10, 4.8, 0.5, 0.25), C.inkDeep, { p: [0, 4.8, 2.85] }));
  const screenTex = canvasTex(640, 280);
  const screen = texPlane(9.1, 3.98, screenTex); screen.position.set(0, 4.8, 3.11); disp.add(screen);
  const lightMat = new THREE.MeshBasicMaterial({ color: C.idlemark });
  const lightBar = new THREE.Mesh(RB(6, 0.55, 0.35, 0.17), lightMat); lightBar.position.set(0, 8.25, 2.8); addHull(lightBar, HULL.mod); disp.add(lightBar);
  // NFC reader: a round contactless pad (no keypad)
  const reader = layer("reader", 34, 1);
  const pad = new THREE.Group(); pad.position.set(lay.pad[0], lay.pad[1], 0); reader.add(pad);
  pad.add(mk(CYL(2.9, 0.5, 40), C.inkSoft, { p: [0, 0, 2.85], r: [Math.PI / 2, 0, 0] }));
  pad.add(mk(new THREE.TorusGeometry(2.95, 0.16, 8, 48), C.idlemark, { p: [0, 0, 3.1], outline: false }));
  const nfcTex = canvasTex(256, 256);
  const nfc = texPlane(4.4, 4.4, nfcTex); nfc.position.set(0, 0, 3.12); pad.add(nfc);
  const padRingMat = new THREE.MeshBasicMaterial({ color: C.idlemark });
  const padRing = new THREE.Mesh(new THREE.TorusGeometry(2.95, 0.16, 8, 48), padRingMat); padRing.position.z = 3.11; pad.add(padRing);
  statics.push(() => {
    const g = nfcTex.g; g.clearRect(0, 0, 256, 256); g.strokeStyle = C.bg; g.lineCap = "round"; g.lineWidth = 15;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(76, 128, 26 + i * 30, -0.62, 0.62); g.stroke(); }
    nfcTex.tx.needsUpdate = true;
  });
  // optional mode buttons (multimaker)
  const modeBtns = [];
  let modes = null;
  if (box.modes) {
    modes = new THREE.Group(); reader.add(modes);
    box.modes.forEach((lab, i) => {
      const b = mk(CYL(1.15, 0.6, 28), C.bg, { p: [(i - 1) * 3.4, -6.1, 2.95], r: [Math.PI / 2, 0, 0] });
      const lt = canvasTex(140, 140); const lp = texPlane(1.7, 1.7, lt); lp.position.set(0, 0.31, 0); lp.rotation.x = -Math.PI / 2; b.add(lp);
      statics.push(() => { const g = lt.g; g.clearRect(0, 0, 140, 140); g.fillStyle = C.ink; g.font = "700 74px 'JetBrains Mono'"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(lab[0], 70, 76); lt.tx.needsUpdate = true; });
      modes.add(b); modeBtns.push(b);
    });
    const ct = canvasTex(620, 70); const cp = texPlane(10.2, 1.15, ct); cp.position.set(0, -7.62, 2.64); modes.add(cp);
    statics.push(() => { const g = ct.g; g.clearRect(0, 0, 620, 70); g.fillStyle = C.bg; g.font = "500 34px 'JetBrains Mono'"; g.textAlign = "center"; g.textBaseline = "middle"; box.modes.forEach((l, i) => g.fillText(l, 310 + (i - 1) * 206, 36)); ct.tx.needsUpdate = true; });
  }
  // the member's fob
  const fob = new THREE.Group(); mod.add(fob); fob.visible = false;
  const fobMat = toon(C.green);
  fob.add(mk(RB(2.4, 3.4, 0.7, 0.55), null, { mat: fobMat }));
  fob.add(mk(new THREE.TorusGeometry(0.9, 0.18, 8, 24), C.idlemark, { p: [0, 2.5, 0] }));
  // assembly axes while in pieces
  const axisMat = new LineMaterial({ color: C.idlemark, linewidth: 1.6, dashed: true, dashSize: 0.9, gapSize: 0.7, transparent: true, worldUnits: false });
  axisMat.userData.w = 1.6; lineMats.push(axisMat);
  const axes = new THREE.Group(); mod.add(axes);
  for (const [x, y] of [[-5.9, 8.9], [5.9, 8.9], [-5.9, -8.9], [5.9, -8.9]]) { const lg = new LineGeometry(); lg.setPositions([x, y, -1, x, y, 44]); const ln = new Line2(lg, axisMat); ln.computeLineDistances(); axes.add(ln); }

  const BOXPART = {
    reader: { obj: reader, name: "NFC reader", role: "Members tap their fob; trained list per machine.", a: [lay.pad[0], lay.pad[1] - 3.0, 3.2], d: [-60, 125] },
    disp: { obj: disp, name: "Display and status light", role: "Who is on, and what the box is doing.", a: [-1, 8.5, 2.8], d: [-40, -120] },
    modes: { obj: reader, name: "Mode buttons", role: "Pick print, laser or CNC after the tap.", a: [3.4, -7.3, 3.2], d: [70, 115] },
    cover: { obj: cover, name: "Front cover", role: "Sealed, closed with four screws.", a: [0, 10, 2.0], d: [-10, -125] },
    qr: { obj: cover, name: "QR sticker", role: "Opens this machine's manual.", a: [lay.qr[0] + 1.75, lay.qr[1], 2.62], d: [95, 70] },
    board: { obj: board, name: "Controller board", role: "ESP32 with Wi-Fi.", a: [2.8, 6.5, 1.5], d: [10, -125] },
    relay: { obj: relay, name: "Relay", role: "Switches the machine.", a: [-2.8, -6.2, 1.8], d: [-30, 120] },
    psu: { obj: psu, name: "Power supply", role: "Runs the box.", a: [1.5, -7.7, -0.4], d: [10, 125] },
    base: { obj: base, name: "Back housing", role: "Wall mount and cable glands.", a: box.outlet ? [7.5, -4.6, -0.8] : [7, -5, -0.8], d: [80, 110] },
  };

  // ======================= context (the machine) =======================
  const ctx = new THREE.Group(); scene.add(ctx);
  const cm = (geo, hex, o = {}) => mk(geo, hex, { ...o, ctx: true });
  const V = (a) => a.map((p) => new THREE.Vector3(...p));
  const curve = (pts) => new THREE.CatmullRomCurve3(V(pts), false, "catmullrom", 0.4);
  const tube = (c, r, hex, o = {}) => { const m = cm(new THREE.TubeGeometry(c, o.seg || 80, r, 10), hex, o); ctx.add(m); return m; };
  const beadsList = [];
  function beads(n, r, hex, parent = ctx) {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 12, 10), new THREE.MeshBasicMaterial({ color: hex, transparent: true }), n);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; parent.add(m); beadsList.push(m); return m;
  }
  const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function placeBeads(mesh, list) {
    for (let i = 0; i < mesh.count; i++) {
      const b = list[i];
      if (!b || b.s <= 0.001) { mesh.setMatrixAt(i, ZERO); continue; }
      if (b.p) tmpV.copy(b.p); else b.curve.getPointAt(clamp(b.u), tmpV);
      tmpM.makeScale(b.s, b.s, b.s).setPosition(tmpV); mesh.setMatrixAt(i, tmpM);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  function flow(t, spans, speed, n, curves) {
    const list = []; const s = spanK(t, spans);
    if (s <= 0) return list;
    const total = curves.reduce((a, c) => a + c.getLength(), 0);
    for (let i = 0; i < n; i++) {
      let dist = (((t * speed) / total + i / n) % 1) * total;
      for (const c of curves) { const L = c.getLength(); if (dist <= L) { list.push({ curve: c, u: dist / L, s }); break; } dist -= L; }
    }
    return list;
  }
  function wallOutlet(x, y) {
    const w = new THREE.Group(); w.position.set(x, y, -2.75); ctx.add(w);
    w.add(cm(RB(5, 8, 0.5, 0.3), C.surface));
    const tx = canvasTex(200, 320); tx.g.fillStyle = C.surface; tx.g.fillRect(0, 0, 200, 320); outletFace(tx.g, 100, 92, 1.5); outletFace(tx.g, 100, 228, 1.5); tx.tx.needsUpdate = true;
    const f = texPlane(4.6, 7.4, tx, true); f.position.z = 0.27; w.add(f); return w;
  }
  function lcd(w, h, pw, ph) { const t = canvasTex(w, h); const p = texPlane(pw, ph, t, true); return { t, p, set(key, on, warn) { if (t.key === key + on + warn) return; t.key = key + on + warn; const g = t.g; g.fillStyle = warn ? C.otint : on ? C.gtint : C.idle; g.fillRect(0, 0, w, h); g.fillStyle = warn ? C.rust : on ? C.green : C.idlemark; g.font = `700 ${Math.round(h * 0.42)}px 'JetBrains Mono'`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(key, w / 2, h * 0.54, w * 0.9); t.tx.needsUpdate = true; } }; }
  const api = { THREE, C, U, ctx, mod, cm, mk, RB, CYL, toon, canvasTex, texPlane, rr, curve, tube, beads, placeBeads, flow, wallOutlet, lcd, lineMats, ctxMats, LineMaterial, Line2, LineGeometry, statics, P, BOXPART };
  const S = cfg.scene(api) || {};
  api.S = S;

  // ======================= parts, steps, tags =======================
  const PARTS = cfg.parts.map((p, i) => {
    const bp = p.key ? BOXPART[p.key] : {};
    const obj = p.key ? bp.obj : S[p.ref];
    return { n: i + 1, name: p.name || bp.name, role: p.role || bp.role, obj, a: p.a || bp.a, d: p.d || bp.d, sys: !p.key };
  });
  const boxParts = PARTS.filter((p) => !p.sys), sysParts = PARTS.filter((p) => p.sys);
  boxParts.forEach((p, i) => { p.at = T.bom0 + i * T.bomStep; });
  sysParts.forEach((p, i) => { p.at = T.sys0 + i * T.sysStep; });
  const bomEl = $("#bom");
  PARTS.forEach((p) => bomEl.insertAdjacentHTML("beforeend", `<div class="row${p.sys ? " ctx" : ""}"><span class="no">${p.n}</span><div><p class="nm">${p.name}</p><p class="rl">${p.role}</p></div></div>`));
  const stepsEl = $("#steps");
  cfg.steps.forEach(([a, b], i) => stepsEl.insertAdjacentHTML("beforeend", `<li><span class="sn">${i + 1}</span><div><p class="st">${a}</p><p class="sd">${b}</p></div></li>`));
  const balloons = $("#balloons");
  PARTS.forEach((p) => balloons.insertAdjacentHTML("beforeend", `<div class="balloon${p.sys ? " ctx" : ""}">${p.n}</div>`));
  $("#n-parts").innerHTML = PARTS.map((p) => `<li><span class="n">${p.n}</span><div><b>${p.name}</b><span>${p.role}</span></div></li>`).join("");
  $("#n-steps").innerHTML = cfg.steps.map(([a, b], i) => `<li data-i="${i}"><span class="n">${i + 1}</span><div><b>${a}</b><span>${b}</span></div></li>`).join("");
  const TAGS = cfg.tags || [];
  const tagsEl = $("#tags");
  TAGS.forEach((g) => tagsEl.insertAdjacentHTML("beforeend", `<div class="tagx ${g.tone || ""}">${g.icon ? ICON[g.icon] : ""}<span>${g.text}</span></div>`));
  const sheet = $("#sheet");
  for (const [l, t, w, h] of [[0, 120, 14, 2], [0, 860, 14, 2], [1854, 120, 14, 2], [1854, 860, 14, 2], [600, 0, 2, 14], [1266, 0, 2, 14], [600, 1014, 2, 14], [1266, 1014, 2, 14]]) sheet.insertAdjacentHTML("beforeend", `<i style="left:${l}px;top:${t}px;width:${w}px;height:${h}px"></i>`);
  const cardsEl = $("#cards");
  const CARDS = (cfg.cards || []).map((c, i) => { cardsEl.insertAdjacentHTML("beforeend", `<section class="card xcard fade" id="xc${i}" style="top:${c.top || 140}px"></section>`); return { ...c, el: $(`#xc${i}`), key: "" }; });

  // ======================= camera =======================
  const SV = cfg.sysView;
  const CAM = [
    [0, 0, 100, 6, 22, 12, 31, 300, 0],
    [T.explode + 0.3, 0, 100, 6, 30, 13, 31, 300, 0],
    [T.explode + 3.0, 0, 100, 20, 58, 16, 58, -235, 20],
    [T.assemble - 0.2, 0, 100, 20, 68, 19, 58, -235, 20],
    [T.sysIn + 0.6, 4, 99, 6, 42, 15, 76, -235, 40],
    [T.sys0 + 0.3, ...SV.p, 36, 15, SV.h, SV.ox ?? -250, SV.oy ?? 40],
    [T.how - 0.3, ...SV.p, 34, 15, SV.h, SV.ox ?? -250, SV.oy ?? 40],
    ...cfg.cam,
    [T.explode2 + 1.8, 0, 100, 20, 52, 16, 58, -290, 140],
    [DUR, 0, 100, 20, 58, 17, 58, -290, 140],
  ];
  const view = { yaw: 0, pitch: 0, zoom: 1 };
  const D2R = Math.PI / 180;
  function camAt(t) {
    let i = 0; while (i < CAM.length - 2 && t >= CAM[i + 1][0]) i++;
    const a = CAM[i], b = CAM[i + 1], k = ease(prog(t, a[0], b[0]));
    return a.map((v, j) => lerp(v, b[j], k));
  }
  function placeCamera(t) {
    const [, tx, ty, tz, yaw0, pitch0, h0, ox, oy] = camAt(t);
    const yaw = (yaw0 + view.yaw) * D2R, pitch = clamp(pitch0 + view.pitch, -10, 70) * D2R, h = h0 / view.zoom;
    camera.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * 600, ty + Math.sin(pitch) * 600, tz + Math.cos(yaw) * Math.cos(pitch) * 600);
    camera.lookAt(tx, ty, tz);
    const hw = (h / 2) * (W / H), shift = (ox / H) * h, vshift = (oy / H) * h;
    camera.left = -hw - shift; camera.right = hw - shift; camera.top = h / 2 + vshift; camera.bottom = -h / 2 + vshift;
    camera.near = 1; camera.far = 2000; camera.updateProjectionMatrix();
  }
  function toScreen(obj, local) { tmpV.set(...local); obj.localToWorld(tmpV); tmpV.project(camera); return [(tmpV.x + 1) / 2 * W, (1 - tmpV.y) / 2 * H]; }
  api.toScreen = toScreen;

  // ======================= state =======================
  function explodeAmount(t, order) {
    const d = order * 0.2;
    const out = outBack(prog(t, T.explode + d, T.explode + d + 1.5), 1.1);
    const back = ease(prog(t, T.assemble + (6 - order) * 0.16, T.assemble + (6 - order) * 0.16 + 1.4));
    const out2 = outBack(prog(t, T.explode2 + d, T.explode2 + d + 1.5), 1.1);
    return out * (1 - back) + out2;
  }
  const ctxAlpha = (t) => prog(t, T.sysIn, T.sysIn + 1.0) * (1 - prog(t, T.end, T.end + 0.8));
  const stepIndex = (t) => { const n = cfg.steps.length; if (t >= T.steps[n]) return n; let s = -1; for (let i = 0; i < n; i++) if (t >= T.steps[i]) s = i; return s; };
  const LIGHT = { idle: C.idlemark, green: C.green, orange: C.orange, rust: C.rust };
  const displayState = (t) => (t < T.steps[0] || t >= T.end ? ["Tap your fob", `PREVUMO · ${cfg.machine}`] : seq(t, cfg.display));
  function drawScreen(t) {
    const [l1, l2] = displayState(t), key = l1 + "|" + l2;
    if (key === screenTex.key) return; screenTex.key = key;
    const g = screenTex.g; g.fillStyle = C.gtint; g.fillRect(0, 0, 640, 280);
    g.fillStyle = C.ink; g.textBaseline = "alphabetic"; g.textAlign = "left";
    g.font = "700 60px 'JetBrains Mono'"; g.fillText(l1, 34, 112, 572);
    g.font = "500 38px 'JetBrains Mono'"; g.fillStyle = C.muted; g.fillText(l2, 36, 196, 570);
    screenTex.tx.needsUpdate = true;
  }

  // ======================= overlays =======================
  const linesSvg = $("#lines");
  const show = (el, a, dy = 0) => { el.style.opacity = String(a); el.style.transform = `translateY(${(1 - a) * dy}px)`; el.style.visibility = a <= 0.001 ? "hidden" : "visible"; };
  let headKey = "";
  function header(t) {
    const phase = t < T.explode + 0.6 ? "title" : t < T.sysIn ? "pieces" : t < T.how ? "sys" : t < T.end ? "how" : "end";
    const map = { title: [cfg.kicker, cfg.name], pieces: [cfg.name, "In pieces"], sys: [cfg.name, cfg.sysTitle], how: [cfg.name, "How it works"], end: [cfg.kicker, cfg.name] };
    const [kick, ttl] = map[phase], key = kick + ttl;
    const last = Math.max(...[0, T.explode + 0.6, T.sysIn, T.how, T.end].filter((s) => t >= s));
    const k = outCubic(prog(t, last + 0.05, last + 0.65));
    if (key !== headKey) { headKey = key; $("#kick").textContent = kick; $("#ttl").textContent = ttl; }
    $("#ttl").style.fontSize = phase === "title" || phase === "end" ? "92px" : "70px";
    $("#ttl").style.transform = `translateY(${(1 - k) * 105}%)`;
    $("#kick").style.opacity = String(k);
    show($("#sub"), phase === "title" ? outCubic(prog(t, 0.8, 1.6)) * (1 - prog(t, T.explode + 0.2, T.explode + 0.6)) : 0, 18);
  }
  const dpath = (arr) => { let s = "", pen = false; for (const p of arr) { if (!p) { pen = false; continue; } s += `${pen ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`; pen = true; } return s; };
  function drawChart(t, e) {
    const svg = $("#chartsvg"), w = 508, h = 210, x0 = 4, x1 = w - 4, y0 = 176, sc = e.sc || 128;
    const { ta, tb } = e; const X = (tt) => x0 + (tt - ta) / (tb - ta) * (x1 - x0), Y = (v) => y0 - v * sc;
    const end = Math.min(t, tb), stepDt = e.dt || 0.1;
    const pts = [], hot = [], hotPts = [];
    for (let tt = ta; tt <= end + 1e-6; tt += stepDt) {
      const v = e.I(tt); pts.push([X(tt), Y(v)]);
      const out = e.hot ? e.hot(tt, v) : false;
      if (out) { hotPts.push([X(tt), Y(v)]); if (Math.round(tt / stepDt) % 3 === 0) hot.push([X(tt), Y(v)]); } else if (hotPts.length) { hotPts.push([X(tt), Y(v)]); hotPts.push(null); }
    }
    let band = "";
    if (e.band) {
      const top = [], bot = [];
      for (let tt = ta; tt <= tb + 0.001; tt += 0.1) { const b = e.band(tt); if (!b) continue; top.push([X(tt), Y(b[1])]); bot.unshift([X(tt), Y(b[0])]); }
      if (top.length) band = `<path d="${dpath(top)}L${bot.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L")}Z" fill="${C.gtint}"/>`;
      const b0 = e.band(tb);
      if (e.bandText && b0) band += `<text x="${x1 - 8}" y="${Y(b0[0]) + 22}" text-anchor="end" font-family="JetBrains Mono" font-size="16" fill="${C.green}">${e.bandText}</text>`;
    }
    let flags = "";
    for (const f of e.flags || []) {
      const fk = prog(t, f.at, f.at + 0.4); if (fk <= 0) continue;
      const col = f.tone === "warn" ? C.orange : f.tone === "bad" ? C.rust : C.green;
      const fx = X(f.tt), fy = Y(f.y ?? 1.05) - 2;
      flags += `<g opacity="${fk.toFixed(3)}"><line x1="${fx}" y1="${fy}" x2="${fx}" y2="${fy - 26}" stroke="${col}" stroke-width="3" stroke-linecap="round"/><path d="M${fx + 1.5},${fy - 26} L${fx + 20},${fy - 20} L${fx + 1.5},${fy - 14} Z" fill="${col}"/><text x="${fx + (f.left ? -6 : 26)}" y="${fy - 13}" ${f.left ? 'text-anchor="end"' : ""} font-family="JetBrains Mono" font-weight="600" font-size="17" fill="${col}">${f.text}</text></g>`;
    }
    const lineCol = e.lineCol ? e.lineCol(t) : C.green;
    svg.innerHTML = `${band}<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="${C.border}" stroke-width="2"/>
      ${e.guide ? `<line x1="${x0}" y1="${Y(e.guide.v)}" x2="${x1}" y2="${Y(e.guide.v)}" stroke="${C.rust}" stroke-width="2" stroke-dasharray="8 6"/><text x="${x1}" y="${Y(e.guide.v) - 6}" text-anchor="end" font-family="JetBrains Mono" font-size="16" fill="${C.rust}">${e.guide.text}</text>` : ""}
      <path d="${dpath(pts)}" fill="none" stroke="${lineCol}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${dpath(hotPts)}" fill="none" stroke="${C.orange}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${hot.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${C.orange}" stroke="${C.surface}" stroke-width="2"/>`).join("")}
      ${pts.length ? `<circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="7" fill="${lineCol}" stroke="${C.surface}" stroke-width="2.5"/>` : ""}
      ${flags}
      <text x="${x0}" y="${h - 4}" font-family="JetBrains Mono" font-size="17" fill="${C.muted}">illustrative${e.lapse === false ? "" : ", time-lapse"}</text>
      <text x="${x1}" y="${h - 4}" text-anchor="end" font-family="JetBrains Mono" font-size="17" fill="${C.muted}">${e.unit || "one reading a second"}</text>`;
    const title = typeof e.title === "function" ? e.title(t) : e.title;
    if ($("#charttt").textContent !== title) $("#charttt").textContent = title;
    const [txt, tone] = e.tag(t);
    const tag = $("#charttag"), tk = txt + tone;
    if (tag.dataset.k !== tk) {
      tag.dataset.k = tk; tag.className = "tag" + (tone === "warm" ? " warm" : tone === "hot" ? " hot" : "");
      const dot = { ok: C.green, warm: C.green, irr: C.orange, hot: C.orange, off: C.rust, idle: C.idlemark }[tone] || C.green;
      tag.innerHTML = `<i style="background:${dot}"></i>${txt}`;
    }
  }
  let alertKey = "";
  function drawAlert(t, a) {
    let ph = a.phases[0]; for (const p of a.phases) if (t >= p.at) ph = p;
    const idx = a.phases.indexOf(ph), key = a.title + idx;
    if (key !== alertKey) {
      alertKey = key;
      const tone = a.tone || "irr";
      $("#abadge").className = "badge" + (tone === "safety" ? " safety" : tone === "paused" ? " paused" : tone === "info" ? " info" : "");
      $("#abadge").innerHTML = `<i></i>${a.badge}`;
      $("#atitle").textContent = a.title; $("#areason").textContent = ph.reason;
      $("#afoot").innerHTML = ph.logged ? `<span class="logged" style="${ph.loggedOk ? "background:var(--green)" : ""}">${ph.logged}</span>` : (ph.buttons || []).map((b, i) => BTN[b](i === ph.ring ? '<div class="ring"></div>' : "")).join("");
    }
    if (ph.tap != null) {
      const el = $("#afoot").children[ph.ring]; if (el) {
        const k = prog(t, ph.tap, ph.tap + 0.12) - prog(t, ph.tap + 0.16, ph.tap + 0.4); el.style.transform = `scale(${1 - 0.06 * k})`;
        const r = el.querySelector(".ring"); if (r) r.style.opacity = String(prog(t, ph.tap - 0.7, ph.tap - 0.4) * (0.6 + 0.4 * Math.sin(t * 9)));
      }
    }
  }

  // ======================= render one moment =======================
  function render(t) {
    t = clamp(t, 0, DUR);
    placeCamera(t);
    for (const name in P) { const g = P[name]; g.position.z = g.userData.ez * explodeAmount(t, g.userData.order); }
    const ex = explodeAmount(t, 3);
    axisMat.opacity = clamp(ex * 1.4) * 0.9; axes.visible = ex > 0.02;

    // fob taps on the reader
    let fobOn = false;
    for (const f of cfg.fob || []) {
      const a = f.at; if (t < a - 0.7 || t > a + 0.95) continue;
      fobOn = true;
      const kin = outCubic(prog(t, a - 0.7, a)), kout = ease(prog(t, a + 0.35, a + 0.95));
      const k = kin * (1 - kout);
      fob.position.set(lerp(lay.pad[0] + 12, lay.pad[0] + 0.6, k), lerp(lay.pad[1] - 7, lay.pad[1] + 0.6, k), lerp(14, 3.95, k));
      fob.rotation.set(lerp(-0.7, 0, k), lerp(0.9, 0.15, k), lerp(0.5, -0.2, k));
      fobMat.color.set(f.ok ? C.green : C.idlemark);
    }
    fob.visible = fobOn;
    // mode buttons
    modeBtns.forEach((b) => (b.position.z = 2.95));
    for (const p of cfg.press || []) { const k = prog(t, p.at, p.at + 0.08) - prog(t, p.at + 0.14, p.at + 0.3); if (modeBtns[p.btn]) modeBtns[p.btn].position.z -= 0.3 * k; }

    drawScreen(t);
    const lk = cfg.light ? seq(t, cfg.light) : "idle";
    lightMat.color.set(LIGHT[lk] || C.idlemark);
    if (lk === "orange") lightMat.color.lerp(new THREE.Color(C.otint), 0.5 + 0.5 * Math.sin(t * 10));
    // the reader ring flashes on a tap: green when trained, rust when not
    let ringCol = C.idlemark;
    for (const f of cfg.fob || []) if (t >= f.at && t < f.at + 1.2) ringCol = f.ok ? C.green : C.rust;
    padRingMat.color.set(ringCol);

    const ca = ctxAlpha(t);
    ctx.visible = ca > 0.004;
    for (const m of ctxMats) { m.transparent = ca < 0.99 || !!m.map; m.opacity = ca; m.depthWrite = ca > 0.98; }
    for (const m of beadsList) { m.material.opacity = ca; }
    HULL.ctx.uniforms.opacity.value = ca; HULL.ctx.transparent = ca < 0.99;
    for (const m of lineMats) if (m !== axisMat && m.userData.ctx) m.opacity = ca;
    api.ca = ca;
    if (cfg.update) cfg.update(t, api);

    renderer.render(scene, camera);

    // ---- overlays ----
    header(t);
    let svg = "";
    PARTS.forEach((p, i) => {
      const el = balloons.children[i];
      let a;
      if (!p.sys) { const j = boxParts.indexOf(p); a = prog(t, p.at, p.at + 0.35) * (1 - prog(t, T.assemble - 0.2, T.assemble + 0.2)) + prog(t, T.explode2 + 1.6 + j * 0.1, T.explode2 + 1.95 + j * 0.1); }
      else a = prog(t, p.at, p.at + 0.35) * (1 - prog(t, T.how - 0.1, T.how + 0.3));
      a = clamp(a);
      if (a <= 0.001 || !p.obj) { el.style.visibility = "hidden"; return; }
      const [ax, ay] = toScreen(p.obj, p.a), bx = ax + p.d[0], by = ay + p.d[1];
      el.style.visibility = "visible"; el.style.opacity = String(a);
      el.style.left = `${bx}px`; el.style.top = `${by}px`; el.style.transform = `scale(${0.6 + 0.4 * outBack(a, 1.6)})`;
      const dx = ax - bx, dy = ay - by, L = Math.hypot(dx, dy) || 1, col = p.sys ? C.green : C.ink;
      svg += `<g opacity="${a}"><line x1="${bx + dx / L * 26}" y1="${by + dy / L * 26}" x2="${ax}" y2="${ay}" stroke="${col}" stroke-width="2.5"/><circle cx="${ax}" cy="${ay}" r="5.5" fill="${col}"/></g>`;
    });
    TAGS.forEach((g, i) => {
      const el = tagsEl.children[i];
      let a = clamp(prog(t, g.in, g.in + 0.35) * (1 - prog(t, g.out, g.out + 0.3)));
      if (g.ctx !== false) a *= ca > 0.5 ? 1 : 0;
      const obj = typeof g.obj === "string" ? (S[g.obj] || BOXPART[g.obj]?.obj) : g.obj;
      if (a <= 0.001 || !obj) { el.style.visibility = "hidden"; return; }
      const [ax, ay] = toScreen(obj, g.a), bx = ax + g.d[0], by = ay + g.d[1];
      el.style.visibility = "visible"; el.style.opacity = String(a); el.style.left = `${bx}px`; el.style.top = `${by}px`;
      const hw = el.offsetWidth / 2, hh = el.offsetHeight / 2, side = Math.abs(ax - bx) > hw;
      const ex2 = side ? bx + Math.sign(ax - bx) * hw : bx, ey2 = side ? by : by + Math.sign(ay - by) * hh;
      const col = g.tone === "warn" ? C.orange : g.tone === "bad" ? C.rust : C.green;
      svg += `<g opacity="${a}"><line x1="${ex2}" y1="${ey2}" x2="${ax}" y2="${ay}" stroke="${col}" stroke-width="2.5"/><circle cx="${ax}" cy="${ay}" r="5.5" fill="${col}"/></g>`;
    });
    // ripple when the fob taps the reader
    for (const f of cfg.fob || []) {
      if (t < f.at || t > f.at + 1.1) continue;
      const [px, py] = toScreen(pad, [0, 0, 3.2]);
      const col = f.ok ? C.green : C.rust;
      for (let i = 0; i < 3; i++) { const ph = prog(t, f.at + i * 0.18, f.at + i * 0.18 + 0.75); if (ph <= 0 || ph >= 1) continue; svg += `<circle cx="${px}" cy="${py}" r="${(30 + ph * 90).toFixed(1)}" fill="none" stroke="${col}" stroke-width="${(5 - ph * 3).toFixed(1)}" opacity="${(1 - ph).toFixed(3)}"/>`; }
    }
    // Wi-Fi: the box reports to the owner app during sessions
    if (ca > 0.5 && within(t, cfg.sessions || [])) {
      const [wx, wy] = toScreen(mod, [2.8, 10.6, 0]);
      const col = within(t, cfg.alarm || []) ? C.orange : C.green;
      for (let i = 0; i < 3; i++) { const ph = (t + i / 3) % 1, r = 18 + ph * 60; svg += `<path d="M${wx - r * 0.7},${wy - r * 0.45} Q${wx},${wy - r * 1.05} ${wx + r * 0.7},${wy - r * 0.45}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" opacity="${((1 - ph) * 0.9).toFixed(3)}"/>`; }
    }
    if (cfg.overlay) svg += cfg.overlay(t, api) || "";
    linesSvg.innerHTML = svg;

    // parts table
    show(bomEl, prog(t, T.bom0 - 0.4, T.bom0) * (1 - prog(t, T.how - 0.2, T.how + 0.3)));
    [...bomEl.querySelectorAll(".row")].forEach((r, i) => { const k = outCubic(prog(t, PARTS[i].at, PARTS[i].at + 0.45)); r.style.opacity = String(k); r.style.transform = `translateX(${(1 - k) * 24}px)`; });

    // steps
    const si = stepIndex(t);
    show(stepsEl, prog(t, T.how, T.how + 0.5) * (1 - prog(t, T.end, T.end + 0.4)));
    [...stepsEl.children].forEach((li, i) => { li.className = i === si ? "on" : i < si ? "done" : ""; const k = outCubic(prog(t, T.how + 0.1 + i * 0.07, T.how + 0.55 + i * 0.07)); li.style.opacity = String(k); li.style.transform = `translateX(${(1 - k) * -20}px)`; });

    // right column: chart (top), cards, alert (bottom), detail A in whatever slot is free
    const ch = (cfg.charts || []).find((e) => t >= e.in - 0.5 && t < e.out + 0.5);
    const chartA = ch ? prog(t, ch.in - 0.2, ch.in + 0.3) * (1 - prog(t, ch.out, ch.out + 0.4)) : 0;
    show($("#chart"), chartA, 16);
    if (chartA > 0) drawChart(t, ch);
    const al = (cfg.alerts || []).find((a) => t >= a.in - 0.2 && t < a.out + 0.6);
    const alertA = al ? outCubic(prog(t, al.in, al.in + 0.45) * (1 - prog(t, al.out, al.out + 0.4))) : 0;
    show($("#alert"), alertA, 30); show($("#applabel"), alertA);
    if (alertA > 0) { drawAlert(t, al); const lb = al.label || "Owner app · illustrative"; if ($("#applabel").textContent !== lb) $("#applabel").textContent = lb; }
    let topA = chartA, botA = alertA;
    for (const c of CARDS) {
      const a = prog(t, c.in, c.in + 0.4) * (1 - prog(t, c.out, c.out + 0.35));
      show(c.el, a, 16);
      if (a > 0) { const html = c.html(t); if (html !== c.key) { c.key = html; c.el.innerHTML = html; } }
      if ((c.top || 140) < 400) topA = Math.max(topA, a); else botA = Math.max(botA, a);
    }
    const dw = cfg.detail || [[T.steps[0], T.end]];
    const detW = clamp(dw.reduce((s, [a, b]) => s + prog(t, a, a + 0.4) * (1 - prog(t, b - 0.3, b)), 0));
    const detA = detW * (1 - Math.min(1, topA + botA > 1.2 ? 1 : botA * topA * 4));
    const det = $("#detail");
    show(det, detA, 16);
    if (detA > 0) {
      const [l1, l2] = displayState(t);
      if ($("#d1").textContent !== l1) $("#d1").textContent = l1;
      if ($("#d2").textContent !== l2) $("#d2").textContent = l2;
      $("#dlight").style.background = "#" + lightMat.color.getHexString();
      det.style.top = `${lerp(140, 494, clamp(topA))}px`;
      const [cx, cy] = toScreen(disp, [0, 4.8, 3.1]);
      const [ex2, ey2] = toScreen(disp, [5.0, 4.8, 3.1]);
      const r = Math.hypot(ex2 - cx, ey2 - cy) + 14, lx = cx + r * 0.74, ly = cy - r * 0.74;
      linesSvg.insertAdjacentHTML("beforeend", `<g opacity="${detA.toFixed(3)}" fill="none"><circle cx="${cx}" cy="${cy}" r="${r}" stroke="${C.bg}" stroke-width="8"/><circle cx="${cx}" cy="${cy}" r="${r}" stroke="${C.ink}" stroke-width="3" stroke-dasharray="11 7"/><circle cx="${lx + 14}" cy="${ly - 14}" r="19" fill="${C.surface}" stroke="${C.ink}" stroke-width="2.5"/><text x="${lx + 14}" y="${ly - 5}" text-anchor="middle" font-family="JetBrains Mono" font-weight="600" font-size="24" fill="${C.ink}">A</text></g>`);
    }
    show($("#tblock"), outCubic(prog(t, T.explode2 + 1.2, T.explode2 + 1.8)), 24);
    document.querySelectorAll("#n-steps li").forEach((li, i) => li.classList.toggle("hot", i === si));
  }

  // ======================= boot =======================
  const ready = Promise.all(['700 64px "Space Grotesk"', '600 40px "JetBrains Mono"', '700 40px "JetBrains Mono"', '500 30px "Inter"'].map((f) => document.fonts.load(f).catch(() => null)));
  const paint = () => { for (const f of statics) f(); screenTex.key = ""; if (cfg.repaint) cfg.repaint(api); };
  paint();
  window.render = render;
  window.DUR = DUR;
  if (FILM) {
    setPR(2);
    window.READY = ready.then(() => { paint(); render(0); });
    return;
  }
  const frame = $("#frame"), stageEl = $("#stage");
  let t = cfg.start ?? T.assemble - 0.6, playing = false, stopAt = DUR, last = 0;
  const fit = () => { const s = frame.clientWidth / W; stageEl.style.transform = `scale(${s})`; setPR(clamp((window.devicePixelRatio || 1) * s, 0.5, 2)); };
  window.addEventListener("resize", () => { fit(); render(t); });
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const sync = () => { $("#scrub").value = String(t); $("#clock").textContent = `${fmt(t)} / ${fmt(DUR)}`; $("#b-play").textContent = playing ? "Pause" : "Play"; };
  const tick = (now) => { if (playing) { t += Math.min(0.05, (now - last) / 1000); if (t >= stopAt) { t = stopAt; playing = false; } } last = now; render(t); sync(); if (playing) requestAnimationFrame(tick); };
  const play = (from, to) => { t = from; stopAt = to; view.yaw = view.pitch = 0; view.zoom = 1; if (!playing) { playing = true; last = performance.now(); requestAnimationFrame(tick); } };
  const jump = (to, keep) => { playing = false; t = to; if (!keep) { view.yaw = view.pitch = 0; view.zoom = 1; } render(t); sync(); };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  $("#b-assembled").onclick = () => jump(2.6);
  $("#b-pieces").onclick = () => jump(T.assemble - 0.6);
  $("#b-system").onclick = () => jump(T.how - 0.4);
  $("#b-how").onclick = () => (reduce ? jump(T.steps[1] + 1) : play(T.how, T.end));
  (cfg.chapters || []).forEach((c, i) => { $(`#b-x${i}`).onclick = () => (reduce ? jump(c.at[0] + (c.still ?? 1.5)) : play(c.at[0], c.at[1])); });
  $("#b-play").onclick = () => { if (playing) { playing = false; sync(); } else play(t >= DUR - 0.05 ? 0 : t, DUR); };
  $("#scrub").oninput = (e) => jump(+e.target.value, true);
  document.querySelectorAll("#n-steps li").forEach((li) => (li.onclick = () => jump(T.steps[+li.dataset.i] + 0.1)));
  const pts = new Map(); let pinch0 = 0, zoom0 = 1;
  canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = view.zoom; } });
  canvas.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId)) return;
    const [px, py] = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; view.zoom = clamp(zoom0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / (pinch0 || 1), 0.5, 3); }
    else { view.yaw -= (e.clientX - px) * 0.25; view.pitch = clamp(view.pitch + (e.clientY - py) * 0.18, -30, 45); }
    if (!playing) render(t);
  });
  const up = (e) => pts.delete(e.pointerId);
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); view.zoom = clamp(view.zoom * Math.exp(-e.deltaY * 0.0012), 0.5, 3); if (!playing) render(t); }, { passive: false });
  canvas.addEventListener("dblclick", () => { view.yaw = view.pitch = 0; view.zoom = 1; if (!playing) render(t); });
  fit();
  ready.then(() => { paint(); render(t); sync(); });
  render(t); sync();
}
