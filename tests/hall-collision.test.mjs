// Headless check: the player slides along a wall and cannot walk through a classmate; doors must open before anybody passes.
// Run after `npm run build`:  SMOKE_CHROMIUM=/path/to/chrome SMOKE_PORT=8860 node tests/hall-collision.test.mjs   (software GL: the page takes ~2 minutes to start)
import http from "node:http"; import path from "node:path"; import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
const PORT = Number(process.env.SMOKE_PORT || 8860), DIR = path.resolve(process.env.SMOKE_DIR || ".");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".css": "text/css" };
const server = http.createServer(async (req, res) => { const u = new URL(req.url, "http://x"); let p = decodeURIComponent(u.pathname); if (p === "/") p = "/index.html"; if (p.startsWith("/api/")) { res.writeHead(503); return res.end(); }
  try { const body = await readFile(path.join(DIR, path.normalize(p))); res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); res.end(body); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: process.env.SMOKE_CHROMIUM || undefined, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 420, height: 240 } });
await ctx.route(/^(?!http:\/\/127\.0\.0\.1)/, (r) => (/^(data|blob):/.test(r.request().url()) ? r.continue() : r.abort()));
await ctx.addInitScript(() => { try { const k = "unify.social.v1", s = JSON.parse(localStorage.getItem(k) || "null") || { v: 1, mem: {}, profile: { name: "Tester", avatar: {}, facts: {}, stats: { talks: 0, quizRight: 0, quizTotal: 0, hands: 0 }, created: Date.now(), hasAvatar: true } }; s.profile.hasAvatar = true; localStorage.setItem(k, JSON.stringify(s)); } catch { /* none */ } });
const page = await ctx.newPage(); let bad = 0; const t = (n, c, v = "") => { console.log((c ? "PASS  " : "FAIL  ") + n + (v ? "  " + v : "")); if (!c) bad++; };
await page.goto(`http://127.0.0.1:${PORT}/hallway3d.html?nobus`, { waitUntil: "commit" }); await page.waitForFunction(() => window.__hall, null, { timeout: 420000 });
// 1. drive into the west wall for a few seconds (hold A): the player's circle never crosses the wall face (x = -W/2 + 0.45 + radius)
const wall = await page.evaluate(async () => {
  const h = window.__hall; h.inputLocked = false; h.cine = null; h.nav = null; h.yaw = 0; h.player.pos.set(-25, 0, -9); let minX = 1e9; const t0 = performance.now(); h.keys.a = true;
  await new Promise((res) => { const f = () => { minX = Math.min(minX, h.player.pos.x); (performance.now() - t0 > 9000) ? res() : requestAnimationFrame(f); }; f(); }); h.keys.a = false; return { minX, x: h.player.pos.x, moved: h.player.pos.x < -25 };
});
t("player walks toward the wall", wall.moved, wall.x.toFixed(2)); t("player stops at the wall (x >= -27.2)", wall.minX >= -27.25, "min x " + wall.minX.toFixed(3));
// 2. walk straight into a standing classmate: never closer than the two body radii (0.6), and never through them
const npc = await page.evaluate(async () => {
  const h = window.__hall, s = h.students[0]; h.clearPass?.(s); s.pending = null; s.path = []; s.hidden = false; s.sprite.visible = true; s.blob.visible = true; s.fade = 1; s.mat.opacity = 1; s.ghost = false; s.moving = false; s.pass = null;
  h.player.pos.set(2, 0, -2); s.pos.set(2, 0, -4.2); h.yaw = 0; let minD = 1e9, crossed = false; const t0 = performance.now(); h.keys.w = true;
  await new Promise((res) => { const f = () => { const d = Math.hypot(h.player.pos.x - s.pos.x, h.player.pos.z - s.pos.z); minD = Math.min(minD, d); if (h.player.pos.z < s.pos.z - 0.1 && Math.abs(h.player.pos.x - s.pos.x) < 0.3) crossed = true; (performance.now() - t0 > 9000) ? res() : requestAnimationFrame(f); }; f(); }); h.keys.w = false; return { minD, crossed };
});
t("player never overlaps the classmate (min distance >= 0.55)", npc.minD >= 0.55, "min " + npc.minD.toFixed(3)); t("player does not pass straight through the classmate", !npc.crossed);
// 3. a closed door is not passable: a student at a class door waits until it is >= 70% open
const door = await page.evaluate(async () => {
  const h = window.__hall, d = h.door("math"), s = h.students[1]; s.hidden = false; s.sprite.visible = true; s.fade = 1; s.mat.opacity = 1; s.pending = null; h.clearPass(s); s.pos.copy(d.approach); s.path = [];
  s.pass = { door: d, via: [d.thr.clone(), d.inside.clone()], stage: 0, hide: true, ghost: true }; let openAtGo = -1, closedFirst = d.st.open < 0.7; const t0 = performance.now();
  await new Promise((res) => { const f = () => { if (s.pass && s.pass.stage === 1 && openAtGo < 0) openAtGo = d.st.open; (s.hidden || performance.now() - t0 > 90000) ? res() : requestAnimationFrame(f); }; f(); }); return { openAtGo, closedFirst, hidden: s.hidden };
});
t("door was closed when the student arrived", door.closedFirst); t("student only walked in once the door was >= 70% open", door.openAtGo >= 0.7, door.openAtGo.toFixed(2)); t("student went through the door", door.hidden);
// 4. walls: students sent to a room / out of a room take the DOOR waypoints and never stand inside a wall rect (sampled every frame)
const walls = await page.evaluate(async () => {
  const h = window.__hall, W = 56, H = 44, bad = [], rects = h.statics.shapes.filter((r) => r.rect && r.x1 - r.x0 > 3 && r.z1 - r.z0 > 3);   // the subject blocks
  const inWall = (x, z) => rects.some((r) => x > r.x0 + 0.12 && x < r.x1 - 0.12 && z > r.z0 + 0.12 && z < r.z1 - 0.12);
  const d = h.door("science"), s = h.students[2], u = h.students[3]; for (const q of [s, u]) { h.clearPass(q); q.pending = null; q.path = []; q.hidden = false; q.sprite.visible = true; q.fade = 1; q.mat.opacity = 1; q.ghost = false; }
  s.pos.set(0, 0, 5); h.speed = 4; s.pending = { delay: 0, dest: { x: Math.floor(d.approach.x + 28), y: Math.floor(d.approach.z + 22) }, hide: true, mode: "enter", door: d };
  u.hidden = true; u.sprite.visible = false; u.pending = { delay: 0, dest: { x: 28, y: 18 }, hide: false, mode: "exit", door: h.door("math") }; let usedDoor = false, uOut = false; const t0 = performance.now();
  await new Promise((res) => { const f = () => { for (const q of [s, u]) if (!q.hidden && !q.ghost && inWall(q.pos.x, q.pos.z)) bad.push([q.pos.x.toFixed(2), q.pos.z.toFixed(2)]); if (s.pass && s.pass.stage === 1) usedDoor = true; if (!u.hidden && Math.abs(u.pos.x - h.door("math").x) < 1.2) uOut = true; (performance.now() - t0 > 60000 || (s.hidden && !u.pass && !u.hidden && u.path.length === 0)) ? res() : requestAnimationFrame(f); }; f(); });
  return { bad: bad.length, sample: bad.slice(0, 3), usedDoor, sHidden: s.hidden, uOut };
});
t("student walking to a class never stands inside a wall", walls.bad === 0, JSON.stringify(walls.sample)); t("student reached the room through the door waypoint and went in", walls.usedDoor && walls.sHidden); t("student leaving a room came out through the door line", walls.uOut);
await browser.close(); server.close(); process.exit(bad ? 1 : 0);
