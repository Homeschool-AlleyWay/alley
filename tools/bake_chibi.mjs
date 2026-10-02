// Renders every sheet in tools/char_manifest.json with the chibi rig (headless Chromium) into a cache dir; bake_chibi.py finishes them.
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(import.meta.url); let pw;
for (const p of ["playwright", "/opt/node22/lib/node_modules/playwright"]) { try { pw = require(p); break; } catch {} }
if (!pw) throw new Error("playwright not found (npm i -g playwright)");
const [, , bundle, manifest, outDir] = process.argv;
const sheets = JSON.parse(fs.readFileSync(manifest, "utf8")).sheets;
const browser = await pw.chromium.launch(); const page = await browser.newPage();
await page.setContent("<body></body>"); await page.addScriptTag({ path: bundle });
let n = 0;
for (const s of sheets) {
  const url = await page.evaluate((spec) => window.bakeSheet(spec), s);
  const f = path.join(outDir, s.file); fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, Buffer.from(url.split(",")[1], "base64")); n++;
}
await browser.close(); console.log(`baked ${n} sheets`);
