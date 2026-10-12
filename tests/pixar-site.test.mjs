// Look-preview site test (Playwright, software GL).  Run:  node tests/pixar-site.test.mjs
// Builds the site into SCRATCH/pixarsite, serves it, loads every page (no pageerror / console.error, no request to any host but the local server),
// orbits the compare camera and checks both canvases changed, and saves screenshots to SHOTS.  Env: PIXAR_SHOTS, PIXAR_PORT, PIXAR_SKIP_BUILD=1, PIXAR_Q (pixar quality, default 1).
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRATCH = "/tmp/claude-0/-home-user-alley/7bbe5bc9-a7dd-5fe8-b104-5a45d54ba7ef/scratchpad";
const DIR = path.join(SCRATCH, "pixarsite"), SHOTS = process.env.PIXAR_SHOTS || path.join(SCRATCH, "pixarshots"), PORT = Number(process.env.PIXAR_PORT || 8833), BASE = `http://127.0.0.1:${PORT}`;
const Q = process.env.PIXAR_Q ?? "1";
fs.mkdirSync(SHOTS, { recursive: true });
if (!process.env.PIXAR_SKIP_BUILD) { execFileSync("npm", ["run", "build", "--silent"], { cwd: ROOT, stdio: "inherit" }); }
execFileSync("python3", [path.join(ROOT, "tools/build_pixar_site.py"), DIR], { cwd: ROOT, stdio: "inherit" });

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".txt": "text/plain" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p === "/") p = "/index.html";
  const f = path.normalize(path.join(DIR, p));
  try { if (!f.startsWith(DIR + path.sep)) throw 0; const b = fs.readFileSync(f); res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); } catch { res.writeHead(404); res.end("nf"); }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const chrome = (() => { const d = "/opt/pw-browsers"; const n = fs.readdirSync(d).filter((x) => x.startsWith("chromium-")).sort()[0]; return `${d}/${n}/chrome-linux/chrome`; })();
const browser = await chromium.launch({ executablePath: chrome, args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--no-sandbox"] });

let failed = 0; const problems = [], external = [];
const ok = (name, cond, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}${!cond && extra ? "  -> " + extra : ""}`); if (!cond) failed++; };
const NOISE = [/favicon/i, /GPU stall|GL Driver Message|swiftshader|WebGL: INVALID|Automatic fallback/i];
async function open(url, vp = { width: 1280, height: 800 }, opts = {}) {
  const ctx = await browser.newContext({ viewport: vp, ...opts });
  if (url.startsWith("/dorm")) await ctx.addInitScript("{const D=Date,t0=new D(2026,9,12,13,0,0).getTime(),p0=performance.now();window.Date=class extends D{constructor(...a){a.length?super(...a):super(t0+performance.now()-p0)}static now(){return t0+performance.now()-p0}}}");   // the dorm follows the real clock: pin it to 13:00 so the screenshot is a day scene
  const page = await ctx.newPage();
  page.on("request", (r) => { if (!/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(r.url())) external.push(r.url()); });
  page.on("pageerror", (e) => problems.push(`${url} pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !NOISE.some((r) => r.test(m.text()))) problems.push(`${url} console.error: ${m.text().slice(0, 200)}`); });
  await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 90000 });
  return { page, ctx };
}
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name + ".png"), timeout: 120000 });
const canvasPng = (page, id) => page.locator(`#pane-${id} canvas`).screenshot({ timeout: 60000 }).then((b) => b.toString("base64"));
const settleCmp = async (page, n = 30) => { await page.evaluate((k) => { window.__cmp.pause(true); window.__cmp.step(k, 0.05); }, n); await page.waitForTimeout(300); };

try {
  /* ---- landing: three cards, banner, robots */
  { const { page, ctx } = await open("/index.html");
    ok("landing has three cards", (await page.locator("a.card").count()) === 3);
    ok("landing has the preview banner", (await page.locator("#lookbanner").innerText()).includes("Look preview only. Nothing here is saved to any account."));
    ok("landing is noindex", (await page.locator('meta[name=robots]').getAttribute("content")) === "noindex,nofollow");
    await shot(page, "index"); await ctx.close(); }

  /* ---- compare */
  for (const [label, vp] of [["desktop", { width: 1280, height: 800 }], ["phone", { width: 390, height: 780 }]]) {
    const { page, ctx } = await open(`/compare.html?q=${Q}`, vp, label === "phone" ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {});
    await page.waitForFunction("window.__cmp&&window.__cmp.ready", null, { timeout: 150000 });
    ok(`compare (${label}) has two live canvases`, (await page.evaluate(() => window.__cmp.panes().length)) === 2);
    await settleCmp(page);
    const b0 = [await canvasPng(page, "papercut"), await canvasPng(page, "pixar")];
    if (label === "desktop") {
      const box = await page.locator("#pane-papercut").boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2 + 30, { steps: 8 }); await page.mouse.up();
      await settleCmp(page, 20);
      const b1 = [await canvasPng(page, "papercut"), await canvasPng(page, "pixar")];
      ok("orbiting one canvas changes BOTH canvases", b0[0] !== b1[0] && b0[1] !== b1[1]);
      await page.evaluate(() => window.__cmp.home()); await settleCmp(page, 10);
      await page.click("#poses button:nth-child(2)"); await page.click("#chars button:nth-child(2)"); await settleCmp(page, 10);
      ok("pose and character buttons work", (await page.locator("#poses button.on").innerText()) === "wave" && (await page.locator("#chars button.on").count()) === 1);
      await page.click("#swap"); ok("swap sides flips order", (await page.locator("#pane-pixar").evaluate((e) => e.style.order)) === "-1"); await page.click("#swap");
      await page.fill("#hour", "21"); await page.dispatchEvent("#hour", "input"); await settleCmp(page, 30);
      await shot(page, "compare-night"); await page.evaluate(() => window.__cmp.setHour(14)); await page.evaluate(() => window.__cmp.setWho(4)); await page.evaluate(() => window.__cmp.setPose("idle")); await settleCmp(page, 40);
      ok("fps readout fills in", /fps/.test(await page.locator("#fps-pixar").innerText()) && /fps/.test(await page.locator("#fps-papercut").innerText()));
    }
    await shot(page, `compare-${label}`); await ctx.close();
  }
  /* ---- compare: fallback to a single canvas */
  { const { page, ctx } = await open(`/compare.html?q=${Q}&style=pixar`); await page.waitForFunction("window.__cmp&&window.__cmp.ready", null, { timeout: 150000 });
    ok("single mode shows one canvas and a toggle", (await page.evaluate(() => window.__cmp.panes().join())) === "pixar" && (await page.locator("#kid").isVisible()));
    await page.click("#kid"); await page.waitForTimeout(500);
    ok("toggle switches to paper cut", (await page.evaluate(() => window.__cmp.panes().join())) === "papercut"); await ctx.close(); }
  { const { page, ctx } = await open(`/compare.html?q=${Q}`); await page.waitForFunction("window.__cmp&&window.__cmp.ready", null, { timeout: 150000 });
    await page.evaluate(() => window.__cmp.forceLoss("papercut")); await page.waitForTimeout(300);
    ok("context loss degrades to one canvas", (await page.evaluate(() => window.__cmp.panes().join())) === "pixar" && (await page.locator("#kid").isVisible())); await ctx.close(); }

  /* ---- characters */
  { const { page, ctx } = await open(`/characters.html?q=${Q}`, { width: 1400, height: 800 }); await page.waitForFunction("window.__chars&&window.__chars.ready", null, { timeout: 150000 });
    ok("gallery has 12 characters and two canvases", (await page.evaluate(() => window.__chars.specs.length)) === 12 && (await page.locator("canvas").count()) === 2);
    await page.evaluate(() => { window.__chars.pause(true); window.__chars.step(40, 0.05); }); await page.waitForTimeout(400); await shot(page, "characters");
    await page.evaluate(() => { window.__chars.select(4); window.__chars.setMode("face"); window.__chars.step(30, 0.05); }); await page.waitForTimeout(400); await shot(page, "characters-face");
    await page.evaluate(() => { window.__chars.select(1); window.__chars.setMode("face"); window.__chars.step(30, 0.05); }); await page.waitForTimeout(400); await shot(page, "characters-face-dark");
    await page.evaluate(() => { window.__chars.setMode("gallery"); window.__chars.play("wave"); window.__chars.step(30, 0.05); }); await page.waitForTimeout(400); await shot(page, "characters-wave");
    await ctx.close(); }

  /* ---- dorm (Pixar by default) */
  { const { page, ctx } = await open(`/dorm.html?gfx=${Q === "0" ? "low" : "high"}`); await page.waitForFunction("window.__dorm&&window.__dorm.ready", null, { timeout: 150000 });
    ok("dorm starts in the Pixar look", (await page.evaluate(() => window.__dorm.style)) === "pixar");
    await page.evaluate(() => { window.__dorm.pause(true); window.__dorm.step(40, 0.05); }); await page.waitForTimeout(500); await shot(page, "dorm-pixar");
    await ctx.close(); }
  { const { page, ctx } = await open(`/dorm.html?style=papercut&gfx=low`); await page.waitForFunction("window.__dorm&&window.__dorm.ready", null, { timeout: 150000 });
    ok("?style=papercut still works", (await page.evaluate(() => window.__dorm.style)) === "papercut");
    await page.evaluate(() => { window.__dorm.pause(true); window.__dorm.step(40, 0.05); }); await page.waitForTimeout(500); await shot(page, "dorm-papercut"); await ctx.close(); }
} finally { await browser.close(); server.close(); }
ok("no page errors or console errors", problems.length === 0, problems.slice(0, 6).join(" | "));
ok("no request left the local server", external.length === 0, external.slice(0, 5).join(" "));
console.log(failed ? `${failed} FAILED` : "ALL PASSED"); process.exit(failed ? 1 : 0);
