// Wardrobe studio (My Dorm) test: Playwright, software GL.  Run:  npm run build && node tests/wardrobe-dorm.test.mjs
// Env: DORM_PARTS=room,chat,phone (screenshot parts), DORM_DIR=<built site folder> (default: the repo itself), DORM_CHROMIUM=<chrome path>, DORM_SHOTS=<folder for screenshots>,
//      DORM_ONLY=func|chat|shots|shell (run one phase), WS_STYLES=papercut,pixar, DORM_PORT.
// Local mode (window.__PHONE_NET_LOCAL) is used so no Supabase is needed; two pages of ONE browser context share localStorage and act as two students.
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.resolve(process.env.DORM_DIR || ROOT), PORT = Number(process.env.DORM_PORT || 8822), BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = process.env.DORM_SHOTS || "/tmp/claude-0/-home-user-alley/7bbe5bc9-a7dd-5fe8-b104-5a45d54ba7ef/scratchpad/wardrobe-test/";
const ONLY = process.env.DORM_ONLY || "", STYLES = (process.env.WS_STYLES || "papercut,pixar").split(",");
fs.mkdirSync(SHOTS, { recursive: true });
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"); let p = decodeURIComponent(u.pathname); if (p === "/") p = "/index.html";
  if (p.startsWith("/api/")) { res.writeHead(503); return res.end("no api"); }
  const file = path.normalize(path.join(DIR, p));
  try { if (!file.startsWith(DIR + path.sep)) throw 0; const body = await readFile(file); res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }); res.end(body); } catch { res.writeHead(404); res.end("not found"); }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const chromeGuess = (() => { try { const d = "/opt/pw-browsers"; const n = fs.readdirSync(d).filter((x) => x.startsWith("chromium-")).sort()[0]; return n ? `${d}/${n}/chrome-linux/chrome` : undefined; } catch { return undefined; } })();
const browser = await chromium.launch({ executablePath: process.env.DORM_CHROMIUM || chromeGuess, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"] });

let failed = 0; const problems = [];
const ok = (name, cond, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}${!cond && extra ? "  -> " + extra : ""}`); if (!cond) failed++; };
const NOISE = [/favicon/i, /net::ERR_(BLOCKED|NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|CONNECTION|TUNNEL|CERT|FAILED)/i, /fonts\.(googleapis|gstatic)/i, /status of 404/i, /status of 503/i, /GPU stall|GL Driver Message|swiftshader/i];
async function newCtx(opts = {}, init = "") {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts });
  await ctx.addInitScript("window.__PHONE_NET_LOCAL=true;" + init);
  await ctx.route(/^(?!http:\/\/127\.0\.0\.1)/, (r) => (/^(data|blob):/.test(r.request().url()) ? r.continue() : r.abort()));   // only our own site: the page must not call anywhere else
  return ctx;
}
const external = [];
function watch(page, tag) {
  if (tag !== "shell") page.on("request", (r) => { if (!/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(r.url())) external.push(r.url()); });
  page.on("pageerror", (e) => problems.push(`${tag} pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !NOISE.some((r) => r.test(m.text()))) problems.push(`${tag} console.error: ${m.text().slice(0, 200)}`); });
}
async function openDorm(ctx, tag, q = "style=papercut&gfx=low") {
  const page = await ctx.newPage(); watch(page, tag);
  await page.goto(`${BASE}/dorm.html?${q}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("canvas", { timeout: 150000, state: "attached" });
  await page.waitForFunction("window.__dorm&&window.__dorm.ready", null, { timeout: 150000 });
  await page.waitForFunction("window.__dorm.visit.ready||window.__dorm.visit.notReady", null, { timeout: 30000 }).catch(() => {});
  return page;
}
const settle = async (page, n = 40) => { await page.evaluate((k) => window.__dorm.step(k, 0.05), n); await page.waitForTimeout(400); };
const shot = async (page, name) => { await settle(page); await page.screenshot({ path: path.join(SHOTS, name + ".png"), timeout: 120000 }); };
const storeGet = (page, k) => page.evaluate((key) => localStorage.getItem(key), k);
const wait = (page, fn, arg, t = 20000) => page.waitForFunction(fn, arg, { timeout: t }).then(() => true).catch(() => false);
const spec = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__dorm.studio.spec)));
const adv = (page, n = 10, dt = 0.1) => page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) window.__dorm.studio.stage.update(dt); }, [n, dt]);

async function run(style) {
  console.log(`--- wardrobe studio (${style})`);
  const ctx = await newCtx(); const page = await openDorm(ctx, "ws-" + style, `style=${style}&gfx=low`);
  await page.click("#dk-studio"); await page.waitForSelector(".ws.show", { timeout: 30000 });
  ok("studio opens and the dorm loop pauses", await page.evaluate(() => window.__dorm.studio.isOpen && !!window.__dorm.studio.stage));
  const lay = await page.evaluate(() => { const l = document.getElementById("ws-left").getBoundingClientRect(), s = document.getElementById("ws-stage").getBoundingClientRect(); return { lr: l.right, sl: s.left, sw: s.width, sh: s.height, lw: l.width }; });
  ok("desktop layout: options on the left, stage on the right", lay.lr <= lay.sl + 1 && lay.sw > lay.lw && lay.sh > 300, JSON.stringify(lay));
  ok("the stage has an open wardrobe with 3 true mirrors (Reflector)", await page.evaluate(() => { let n = 0; window.__dorm.studio.stage.scene.traverse((o) => { if (o.isReflector) n++; }); return n === 3; }));
  await settle0(page); await page.screenshot({ path: path.join(SHOTS, `${style}-1-initial.png`), timeout: 120000 });
  const y0 = await page.evaluate(() => window.__dorm.studio.stage.yaw); await adv(page, 20, 0.1);
  const y1 = await page.evaluate(() => window.__dorm.studio.stage.yaw);
  ok("avatar spins slowly by itself (~13s per turn)", y1 - y0 > 0.5 && y1 - y0 < 1.5, `${y0} -> ${y1}`);
  await adv(page, 60, 0.1); await page.screenshot({ path: path.join(SHOTS, `${style}-2-mirror-spun.png`), timeout: 120000 });

  // pick a region from the chips, change its colour
  await page.click('[data-region="hair"]'); const before = (await spec(page)).hair;
  await page.locator("#ws-left .ws-sw").nth(12).click(); const after = (await spec(page)).hair;
  ok("picking Hair and a colour changes spec.hair", before !== after, `${before} -> ${after}`);
  ok("the selected region is highlighted in 3D", await page.evaluate(() => { let n = 0; window.__dorm.studio.stage.char.root.traverse((o) => { if (o.userData.overlay) n++; }); return n > 0; }));
  await page.screenshot({ path: path.join(SHOTS, `${style}-3-region.png`), timeout: 120000 });
  // tapping the avatar picks its section
  const pt = await page.evaluate(() => { const st = window.__dorm.studio.stage, b = document.getElementById("ws-stage").getBoundingClientRect(); st.yaw = 0; st.setDragging(true); st.update(0); st.setDragging(false); const v = st.char.anchor("legs").clone().project(st.camera); return { x: b.left + ((v.x + 1) / 2) * b.width, y: b.top + ((1 - v.y) / 2) * b.height }; });
  await page.evaluate(() => { window.__dorm.studio.stage.setDragging(true); }); await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(300);
  ok("tapping the avatar selects the section under the finger", await page.evaluate(() => ["bottom", "shoes", "top", "skin", "backpack"].includes(window.__dorm.studio.region) && window.__dorm.studio.region !== "hair"), await page.evaluate(() => window.__dorm.studio.region));

  for (const [n, tab] of [["5-jewelry", "Jewelry"], ["6-shoes", "Shoes"], ["7-weather", "Weather"], ["8-bag", "Bag"]]) { await page.click(`[data-tab="${tab}"]`); if (tab === "Weather") await page.click('[data-weather="sunny"]'); await adv(page, 3); await page.waitForTimeout(800); await page.screenshot({ path: path.join(SHOTS, `${style}-${n}.png`), timeout: 120000 }); }
  ok("weather preset sets a coordinated outfit", await page.evaluate(() => { const s = window.__dorm.studio.spec; return s.outer === "none" && s.shoeStyle === "sandal" && s.hat === "sunhat"; }));
  await page.click('[data-tab="Bag"]'); await page.locator("#ws-left .ws-chip", { hasText: "Roll-top" }).click(); ok("bag design swap", (await spec(page)).packStyle === "rolltop");


  // width slider
  await page.click('[data-region="top"]'); await page.click('[data-tab="Sections"]');
  await page.evaluate(() => { const r = [...document.querySelectorAll("#ws-left input[type=range]")][0]; r.value = "1.2"; r.dispatchEvent(new Event("input", { bubbles: true })); });
  ok("width slider sets spec.regions.top.w", Math.abs(((await spec(page)).regions?.top?.w ?? 0) - 1.2) < 0.001);
  await page.evaluate(() => { const r = [...document.querySelectorAll("#ws-left input[type=range]")][1]; r.value = "2"; r.dispatchEvent(new Event("input", { bubbles: true })); });
  ok("length slider is clamped to the limits", ((await spec(page)).regions?.top?.l ?? 0) <= 1.25);

  // paint stroke on the 3D model
  await page.click('[data-tab="Paint"]'); await page.click("#ws-brush"); await page.locator("#ws-left .ws-sw").nth(5).click();
  const tp = await page.evaluate(() => { const st = window.__dorm.studio.stage, b = document.getElementById("ws-stage").getBoundingClientRect(); st.yaw = 0; st.char.root.rotation.y = 0; st.camera.updateMatrixWorld(); const v = st.char.anchor("torso").clone().project(st.camera); return { x: b.left + ((v.x + 1) / 2) * b.width, y: b.top + ((1 - v.y) / 2) * b.height }; });
  await page.evaluate(() => { window.__dorm.studio.stage.setDragging(true); window.__dorm.studio.stage.update(0); });
  await page.mouse.move(tp.x - 25, tp.y); await page.mouse.down(); for (let i = 0; i <= 10; i++) await page.mouse.move(tp.x - 25 + i * 5, tp.y + (i % 3) * 3); await page.mouse.up();
  const paint = (await spec(page)).regions?.top?.paint || "";
  ok("a brush stroke on the avatar stores spec.regions.top.paint (small data URL)", paint.startsWith("data:image/") && paint.length < 40000, `len ${paint.length}`);
  await page.click("#ws-undo"); ok("undo removes the stroke", !((await spec(page)).regions?.top?.paint));
  await page.click("#ws-redo"); ok("redo brings it back", ((await spec(page)).regions?.top?.paint || "").startsWith("data:image/"));
  await page.screenshot({ path: path.join(SHOTS, `${style}-4-paint.png`), timeout: 120000 });
  // save, reload, still there
  await page.click("#ws-save"); await page.waitForFunction("!window.__dorm.studio.isOpen", null, { timeout: 15000 });
  const saved = JSON.parse(await storeGet(page, "unify.social.v1")).profile.avatar;
  ok("Save writes the shared profile (regions w + paint, weather outfit)", Math.abs((saved.regions?.top?.w ?? 0) - 1.2) < 0.001 && (saved.regions?.top?.paint || "").startsWith("data:image/") && saved.hat === "sunhat" && saved.packStyle === "rolltop");
  ok("the dorm 3D character shows the saved look", await page.evaluate(() => window.__dorm.me.tris() > 500));
  await page.close(); const page2 = await ctx.newPage(); watch(page2, "ws2-" + style); await page2.goto(`${BASE}/dorm.html?style=${style}&gfx=low&wardrobe=1`, { waitUntil: "domcontentloaded" });
  await page2.waitForFunction("window.__dorm&&window.__dorm.ready&&window.__dorm.studio.isOpen", null, { timeout: 150000 });
  ok("after reload the studio opens (?wardrobe=1) with the saved values", await page2.evaluate(() => { const s = window.__dorm.studio.spec; return Math.abs((s.regions?.top?.w ?? 0) - 1.2) < 0.001 && !!s.regions.top.paint && s.packStyle === "rolltop"; }));
  // cancel discards
  await page2.click('[data-tab="Weather"]'); await page2.click('[data-weather="snow"]'); await page2.click("#ws-cancel");
  ok("Cancel closes the studio and keeps the saved look", await page2.evaluate(() => !window.__dorm.studio.isOpen && window.__dorm.studio.stage === null && JSON.parse(localStorage.getItem("unify.social.v1")).profile.avatar.hat === "sunhat"));
  await page2.close(); await ctx.close();
}
async function phone() {
  console.log("--- wardrobe studio (phone)");
  const ctx = await newCtx({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const page = await openDorm(ctx, "ws-phone", "style=papercut&gfx=low&wardrobe=1");
  await page.waitForSelector(".ws.show"); await adv(page, 10);
  const lay = await page.evaluate(() => { const l = document.getElementById("ws-left").getBoundingClientRect(), s = document.getElementById("ws-stage").getBoundingClientRect(); return { sb: s.bottom, lt: l.top, sh: s.height, vh: innerHeight }; });
  ok("phone layout: stage on top (~half), choices below", lay.sb <= lay.lt + 1 && lay.sh > lay.vh * 0.3 && lay.sh < lay.vh * 0.6, JSON.stringify(lay));
  await page.waitForTimeout(800); await page.screenshot({ path: path.join(SHOTS, "phone-1-initial.png"), timeout: 120000 });
  await page.click('[data-tab="Paint"]'); await page.click('[data-region="top"]'); await page.waitForTimeout(500); await page.screenshot({ path: path.join(SHOTS, "phone-2-paint.png"), timeout: 120000 });
  await ctx.close();
}
const settle0 = async (page) => { await adv(page, 12); await page.waitForTimeout(1200); };
try {
  for (const s of STYLES) await run(s);
  await phone();
} catch (e) { failed++; console.log("FAIL  test crashed: " + (e && e.stack || e)); }
const real = problems.filter((p) => !/swiftshader/i.test(p));
ok("no pageerror / console.error anywhere", real.length === 0, real.slice(0, 6).join(" | "));
await browser.close(); server.close();
console.log(failed ? `\n${failed} check(s) FAILED` : "\nALL WARDROBE STUDIO CHECKS PASSED");
process.exit(failed ? 1 : 0);
