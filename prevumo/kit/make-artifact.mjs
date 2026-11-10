// Builds the shareable page for one machine from <dir>/index.html: the engine CSS and JS are inlined,
// fonts come from Google Fonts and three.js from jsDelivr instead of the local node_modules.
// Usage (from prevumo): node kit/make-artifact.mjs welder
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const kit = dirname(fileURLToPath(import.meta.url));
const dir = join(kit, "..", process.argv[2] || "");
const THREE = "https://cdn.jsdelivr.net/npm/three@0.186.1";
let html = readFileSync(join(dir, "index.html"), "utf8");
const swap = (tag, body) => {
  const re = new RegExp(`<!--${tag}-->[\\s\\S]*?<!--/${tag}-->`);
  if (!re.test(html)) throw new Error(`missing ${tag} block`);
  html = html.replace(re, () => body);
};
swap("FONTS", `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap">`);
swap("IMPORTMAP", `<script type="importmap">{ "imports": { "three": "${THREE}/build/three.module.js", "three/addons/": "${THREE}/examples/jsm/" } }</script>`);
if (html.includes('href="../kit/engine.css"')) {
  const css = readFileSync(join(kit, "engine.css"), "utf8");
  html = html.replace(/<link rel="stylesheet" href="\.\.\/kit\/engine\.css">/, () => `<style>\n${css}</style>`);
}
// the page module imports the engine: inline it, and wrap the page code in a block so its names never clash
const imp = /import\s*\{[^}]*\}\s*from\s*"\.\.\/kit\/engine\.js";\n?/;
if (imp.test(html)) {
  const engine = readFileSync(join(kit, "engine.js"), "utf8").replace(/^export /gm, "");
  html = html.replace(/(<script type="module">)([\s\S]*?)(<\/script>)/, (m, a, body, c) => {
    if (!imp.test(body)) return m;
    return `${a}\n${engine}\n{\n${body.replace(imp, "")}\n}\n${c}`;
  });
}
if (/\.\.\/(kit|node_modules)\//.test(html)) throw new Error("a local path is left in the artifact");
writeFileSync(join(dir, "artifact.html"), html);
console.log(`wrote ${process.argv[2]}/artifact.html`, (html.length / 1024).toFixed(1), "KB");
