// Builds the shareable page from index.html: fonts from Google Fonts and three.js from jsDelivr
// instead of the local node_modules. Usage (from prevumo/welder): node make-artifact.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const THREE = "https://cdn.jsdelivr.net/npm/three@0.186.1";
let html = readFileSync(join(here, "index.html"), "utf8");
const swap = (tag, body) => {
  const re = new RegExp(`<!--${tag}-->[\\s\\S]*?<!--/${tag}-->`);
  if (!re.test(html)) throw new Error(`missing ${tag} block`);
  html = html.replace(re, body);
};
swap("FONTS", `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap">`);
swap("IMPORTMAP", `<script type="importmap">{ "imports": { "three": "${THREE}/build/three.module.js", "three/addons/": "${THREE}/examples/jsm/" } }</script>`);
writeFileSync(join(here, "artifact.html"), html);
console.log("wrote artifact.html", (html.length / 1024).toFixed(1), "KB");
