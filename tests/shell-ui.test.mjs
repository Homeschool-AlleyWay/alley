// Shell layout test (Playwright, software GL):  npm run build && node tests/shell-ui.test.mjs
// Checks: side menu groups, Views pull-down (hallway + classroom, camera really changes), phone icon at the right, no top button bar,
// 5 s idle auto-hide, and no overlapping shell controls on a 390px phone, in both looks (papercut from the source tree, Pixar from dist-pixar).
// Pixar look: run against the Pixar build (SHELL_DIR=dist-pixar SHELL_LOOKS=pixar); the source tree is the papercut look.
// Env: SHELL_DIR (built site, default the repo), SHELL_PORT (8872), SHELL_CHROMIUM, SHELL_SHOTS (screenshot folder), SHELL_LOOKS=papercut,pixar
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.resolve(process.env.SHELL_DIR || ROOT), PORT = Number(process.env.SHELL_PORT || 8872), BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = process.env.SHELL_SHOTS || "";
const LOOKS = (process.env.SHELL_LOOKS || "papercut").split(",");
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".css": "text/css" };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"); let p = decodeURIComponent(u.pathname); if (p === "/") p = "/index.html";
  if (p.startsWith("/api/")) { res.writeHead(503); return res.end("no api"); }
  const file = path.normalize(path.join(DIR, p));
  try { if (!file.startsWith(DIR + path.sep)) throw 0; const body = await readFile(file); res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }); res.end(body); } catch { res.writeHead(404); res.end("nf"); }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const chromeGuess = (() => { try { const d = "/opt/pw-browsers"; const n = fs.readdirSync(d).filter((x) => x.startsWith("chromium-")).sort()[0]; return n ? `${d}/${n}/chrome-linux/chrome` : undefined; } catch { return undefined; } })();
const browser = await chromium.launch({ executablePath: process.env.SHELL_CHROMIUM || chromeGuess, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"] });

let failed = 0;
const ok = (name, cond, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}${!cond && extra ? "  -> " + extra : ""}`); if (!cond) failed++; };
const until = async (fn, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch {} await new Promise((r) => setTimeout(r, 200)); } return false; };

async function open(look, viewport) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 600 });
  await ctx.route(/^(?!http:\/\/127\.0\.0\.1)/, (r) => r.abort());
  ctx.setDefaultTimeout(300000);
  await ctx.addInitScript("try{localStorage.setItem('unify.social.v1',JSON.stringify({v:1,mem:{},profile:{name:'Tester',hasAvatar:true}}));localStorage.setItem('unify.family.v1',JSON.stringify({mode:'guest'}))}catch(e){}");   // skip the first-run avatar creator
  const page = await ctx.newPage();
  await page.goto(`${BASE}/index.html`, { waitUntil: "domcontentloaded", timeout: 400000 });
  return { ctx, page };
}
const shot = (page, name) => SHOTS ? page.screenshot({ path: path.join(SHOTS, name + ".png"), timeout: 120000 }).catch(() => {}) : null;
const hall = (page) => page.frames().find((f) => /hallway3d\.html/.test(f.url()));
const openMenu = async (page) => { if ((await page.getAttribute("#menuTab", "aria-expanded")) !== "true") await page.dispatchEvent("#menuTab", "click"); };
const rect = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }, sel);
const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

for (const look of LOOKS) {
  console.log(`--- ${look} look, desktop 1280x800`);
  let { ctx, page } = await open(look, { width: 1280, height: 800 });
  ok(`${look}: Views pull-down shows in the hallway`, await until(() => page.isVisible("#viewsBtn"), 300000));
  ok(`${look}: no old top button bar (#bar gone)`, (await page.locator("#bar").count()) === 0);
  const topBtns = await page.evaluate(() => [...document.querySelectorAll("body > button, body button")].filter((b) => { const r = b.getBoundingClientRect(); return r.width && r.top < 70 && getComputedStyle(b).visibility !== "hidden" && r.right > 0 && r.left < innerWidth; }).map((b) => b.id));
  ok(`${look}: only the Views button sits at the top`, topBtns.join() === "viewsBtn", topBtns.join());
  const hf = hall(page);
  const hidden = await hf.evaluate(() => [...document.querySelectorAll(".hud button,.menu")].every((e) => getComputedStyle(e).display === "none"));
  ok(`${look}: hallway's own top buttons are hidden`, hidden);
  // side menu groups
  await openMenu(page);
  ok(`${look}: side menu has Go / Me / Tools groups`, await until(async () => (await page.locator("#sideMenu .grp:visible").allTextContents()).join() === "Go,Me,Tools"), 10000);
  await page.waitForTimeout(600); await shot(page, `${look}-desktop-menu-open`);
  const inMenu = await page.evaluate(() => ["tHall", "tNews", "tMail", "tDorm", "tStage", "tTrip", "tOpen", "tBeam", "tShot", "tHelp", "leave", "back"].every((i) => document.getElementById(i).closest("#sideMenu")));
  ok(`${look}: destinations, camera button, Leave and Back live in the side menu`, inMenu);
  ok(`${look}: scene buttons (hallway "My locker") mirrored into Me`, (await page.locator("#sideMenu .sec#secMe button", { hasText: "My locker" }).count()) === 1);
  ok(`${look}: phone is not in the menu list`, (await page.locator("#sideMenu #tPhone").count()) === 0);
  // views, mouse
  await page.click("#viewsBtn");
  ok(`${look}: Views opens a listbox with 3 options`, (await page.getAttribute("#viewsBtn", "aria-expanded")) === "true" && (await page.locator("#viewsList [role=option]").count()) === 3);
  await shot(page, `${look}-desktop-views-open`);
  await page.click('#viewsList [role=option]:has-text("Overview")');
  ok(`${look}: choosing Overview switches the hallway camera`, await until(async () => /Overview/.test(await hf.textContent("#bView"))) && /Overview/.test(await page.textContent("#viewsCur")));
  // views, keyboard
  await page.focus("#viewsBtn"); await page.keyboard.press("ArrowDown");
  ok(`${look}: ArrowDown opens the list`, (await page.getAttribute("#viewsBtn", "aria-expanded")) === "true");
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
  ok(`${look}: arrow + Enter picks First person`, await until(async () => /First person/.test(await hf.textContent("#bView"))));
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("Escape");
  ok(`${look}: Escape closes the list`, (await page.getAttribute("#viewsBtn", "aria-expanded")) === "false" && !(await page.isVisible("#viewsList")));
  const tall = await page.evaluate(() => { const b = document.getElementById("viewsBtn").getBoundingClientRect(); return b.height >= 44; });
  ok(`${look}: Views button is a 44px target`, tall);
  // phone icon at the right
  const pr = await rect(page, "#tPhone"), vh = 800;
  ok(`${look}: phone icon is a round icon at the right edge, vertically centred`, pr.r > 1280 - 24 && Math.abs((pr.t + pr.b) / 2 - vh / 2) < 40 && Math.abs((pr.r - pr.l) - (pr.b - pr.t)) < 1, JSON.stringify(pr));
  ok(`${look}: phone icon has an accessible Phone label`, (await page.getAttribute("#tPhone", "aria-label")) === "Phone");
  await shot(page, `${look}-desktop-phone-icon`);
  await page.click("#tPhone");
  ok(`${look}: phone icon opens the phone app`, await until(() => page.evaluate(() => document.getElementById("phoneWrap").classList.contains("show"))) && /phone\.html/.test(await page.getAttribute("#fPhone", "src")));
  await ctx.close();

  // classroom scene with Views
  ({ ctx, page } = await open(look, { width: 1280, height: 800 }));
  await page.waitForSelector("#fHall", { state: "attached", timeout: 400000 });
  await page.evaluate(() => window.__academy.enter("math", "A", []));
  page.on("pageerror", (e) => console.log("   pageerror:", String(e).slice(0, 160)));
  ok(`${look}: classroom lists camera views`, await until(async () => (await page.isVisible("#viewsBtn")) && (await page.locator("#viewsList [role=option]").count()) >= 8, 300000), JSON.stringify(await page.evaluate(() => ({ btn: !!document.getElementById("viewsBtn") && getComputedStyle(document.getElementById("viewsBtn")).display, n: document.querySelectorAll("#viewsList [role=option]").length, scene: document.querySelector("iframe.on, iframe.show")?.src || [...document.querySelectorAll("iframe")].filter((f) => f.offsetWidth > 100).map((f) => f.src) }))));
  await page.click("#viewsBtn"); await shot(page, `${look}-desktop-classroom-views`);
  await page.click('#viewsList [role=option]:has-text("Whole room")');
  const cf = page.frames().find((f) => /classroom3d\.html/.test(f.url()));
  ok(`${look}: choosing Whole room moves the classroom camera`, await until(async () => (await cf.evaluate(() => window.__room.mode)) === "wide"));
  await page.click("#viewsBtn"); await page.click('#viewsList [role=option]:has-text("Follow teacher")');
  ok(`${look}: choosing Follow teacher moves the classroom camera`, await until(async () => (await cf.evaluate(() => window.__room.mode)) === "follow"));
  await openMenu(page);
  ok(`${look}: class buttons (Raise hand) are in the side menu Tools`, (await page.locator("#secTools button", { hasText: "Raise hand" }).count()) === 1);
  ok(`${look}: Leave class is in the side menu`, await page.isVisible("#leave"));
  await ctx.close();

  // auto-hide
  console.log(`--- ${look}: side menu auto-hide`);
  ({ ctx, page } = await open(look, { width: 1280, height: 800 }));
  await page.waitForSelector("#menuTab");
  await page.click("#menuTab");
  ok(`${look}: menu opens from the edge tab`, (await page.getAttribute("#menuTab", "aria-expanded")) === "true");
  await page.mouse.move(700, 400);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());   // a keyboard-focused item keeps the menu open on purpose
  ok(`${look}: menu closes by itself after ~5 s idle`, await until(async () => (await page.getAttribute("#menuTab", "aria-expanded")) === "false", 20000));
  await ctx.close();

  // phone layout
  console.log(`--- ${look}, phone 390x780`);
  ({ ctx, page } = await open(look, { width: 390, height: 780 }));
  await until(() => page.isVisible("#viewsBtn"), 300000);
  const R = { tab: await rect(page, "#menuTab"), views: await rect(page, "#viewsBtn"), phone: await rect(page, "#tPhone") };
  ok(`${look}: phone layout - menu tab, Views and phone icon do not overlap`, !hit(R.tab, R.views) && !hit(R.tab, R.phone) && !hit(R.views, R.phone), JSON.stringify(R));
  ok(`${look}: phone layout - all inside the screen`, Object.values(R).every((r) => r.l >= 0 && r.r <= 390 && r.t >= 0 && r.b <= 780), JSON.stringify(R));
  ok(`${look}: phone layout - Views is centred and the icon is at the right`, Math.abs((R.views.l + R.views.r) / 2 - 195) < 4 && R.phone.r > 390 - 24);
  await shot(page, `${look}-phone-views-closed`);
  await page.click("#viewsBtn"); await shot(page, `${look}-phone-views-open`);
  const L = await rect(page, "#viewsList");
  ok(`${look}: phone layout - Views list fits the screen`, L.l >= 0 && L.r <= 390 && L.b <= 780, JSON.stringify(L));
  await page.keyboard.press("Escape");
  await openMenu(page); await until(async () => (await rect(page, "#sideMenu")).l >= -1, 20000); // slide-in is slow while the 3D iframes hog a software-GL machine
  const M = await rect(page, "#sideMenu"), mt = await rect(page, "#menuTab"); // measure before the (slow) screenshot so the 5 s auto-hide cannot fire first
  await shot(page, `${look}-phone-menu-open`);
  ok(`${look}: phone layout - open menu fits and its tab sits beside it`, M.l >= -1 && M.r <= 390 * 0.8 + 1 && mt.l >= M.r - 2 && !hit(mt, R.phone), JSON.stringify({ M, mt }));
  await ctx.close();
}
await browser.close(); server.close();
console.log(failed ? `\n${failed} check(s) FAILED` : "\nALL SHELL UI CHECKS PASSED");
process.exit(failed ? 1 : 0);
