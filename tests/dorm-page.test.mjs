// My Dorm page test (Playwright, software GL).  Run:  npm run build && node tests/dorm-page.test.mjs
// Env: DORM_PARTS=room,chat,phone (screenshot parts), DORM_DIR=<built site folder> (default: the repo itself), DORM_CHROMIUM=<chrome path>, DORM_SHOTS=<folder for screenshots>,
//      DORM_ONLY=func|chat|shots|shell (run one phase), DORM_STYLES=papercut,pixar, DORM_PORT.
// Local mode (window.__PHONE_NET_LOCAL) is used so no Supabase is needed; two pages of ONE browser context share localStorage and act as two students.
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.resolve(process.env.DORM_DIR || ROOT), PORT = Number(process.env.DORM_PORT || 8821), BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = process.env.DORM_SHOTS || "/tmp/claude-0/-home-user-alley/7bbe5bc9-a7dd-5fe8-b104-5a45d54ba7ef/scratchpad/dormpage/";
const ONLY = process.env.DORM_ONLY || "", STYLES = (process.env.DORM_STYLES || "papercut,pixar").split(",");
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
const tabs = async (page) => page.evaluate(() => [...document.querySelectorAll("#sheet [data-tab]")].filter((b) => b.style.display !== "none").map((b) => b.textContent));
const png = async (page, color = "#e8567c") => page.evaluate(async (c) => { const cv = document.createElement("canvas"); cv.width = 96; cv.height = 72; const g = cv.getContext("2d"); g.fillStyle = c; g.fillRect(0, 0, 96, 72); g.fillStyle = "#fff"; g.fillRect(20, 20, 40, 30); const b = await new Promise((r) => cv.toBlob(r, "image/png")); return Array.from(new Uint8Array(await b.arrayBuffer())); }, color);
const uploadPng = async (page, bytes) => page.evaluate(async (arr) => { const inp = document.querySelector('#sheet input[type=file]'); const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(arr)], "pic.png", { type: "image/png" })); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true })); }, bytes);
const storeGet = (page, k) => page.evaluate((key) => localStorage.getItem(key), k);
const wait = (page, fn, arg, t = 20000) => page.waitForFunction(fn, arg, { timeout: t }).then(() => true).catch(() => false);

/* ================================================================== functional */
async function functional() {
  console.log("--- functional (papercut)");
  const ctx = await newCtx(); const page = await openDorm(ctx, "func");
  ok("a canvas appears", (await page.locator("canvas").count()) === 1);
  ok("a 3D character is on screen", await page.evaluate(() => !!window.__dorm.me && window.__dorm.me.tris() > 500));
  const dock = ["wardrobe", "mirror", "backpack", "computer", "grades", "homework", "collage", "edit", "visit", "style"];
  for (const id of dock) {
    await page.click(`#dk-${id}`); await page.waitForTimeout(150);
    const shown = await page.evaluate(() => { const s = document.getElementById("sheet"); return s.classList.contains("show") && !!s.getAttribute("aria-label") && s.querySelector("#sbody").children.length > 0; });
    const pressed = await page.getAttribute(`#dk-${id}`, "aria-pressed");
    ok(`dock "${id}" opens its panel`, shown && pressed === "true");
    await page.keyboard.press("Escape"); await page.waitForTimeout(100);
    const closed = await page.evaluate((i) => !document.getElementById("sheet").classList.contains("show") && document.activeElement && document.activeElement.id === "dk-" + i, id);
    ok(`Esc closes "${id}" and returns focus to its button`, closed);
  }
  const small = await page.evaluate(() => [...document.querySelectorAll("#dock button")].filter((b) => b.getBoundingClientRect().height < 44 || b.getBoundingClientRect().width < 44).map((b) => b.id));
  ok("dock targets are at least 44px", small.length === 0, small.join());

  // wardrobe panel offers Wardrobe / Closet / Outfit; mirror offers its six; backpack has its own tab
  await page.click("#dk-wardrobe"); ok("wardrobe tabs", JSON.stringify((await tabs(page)).sort()) === JSON.stringify(["Closet", "Outfit", "Wardrobe"]), JSON.stringify(await tabs(page)));
  ok("wardrobe opens the doors (focus)", await page.evaluate(() => window.__dorm.shell.openId === "wardrobe"));
  await page.click("#dk-mirror"); ok("mirror tabs", JSON.stringify(await tabs(page)) === JSON.stringify(["Body", "Face", "Hair", "Facial hair", "Accessories", "You"]), JSON.stringify(await tabs(page)));
  await page.click("#dk-backpack"); ok("backpack has Backpack + Accessories", (await tabs(page)).includes("Backpack") && (await tabs(page)).includes("Accessories"));

  // embedded edits persist and rebuild the 3D character
  await page.click("#dk-mirror"); await page.click('#sheet [data-tab="Hair"]');
  const before = await page.evaluate(() => JSON.stringify(window.__dorm.me.partTris()));
  await page.click('#sheet .uav-chip:text-is("Mohawk")');
  ok("hair edit saved to unify.social.v1", await wait(page, () => { try { return JSON.parse(localStorage.getItem("unify.social.v1")).profile.avatar.hairStyle === "mohawk"; } catch { return false; } }));
  await page.waitForTimeout(500);
  ok("the 3D character was rebuilt", await page.evaluate((b) => JSON.stringify(window.__dorm.me.partTris()) !== b, before));
  ok("hasAvatar is set", await page.evaluate(() => JSON.parse(localStorage.getItem("unify.social.v1")).profile.hasAvatar === true));
  await page.click("#dk-backpack"); await page.click('#sheet .uav-chip:text-is("Mini pack")');
  ok("bag style edit saved", await wait(page, () => JSON.parse(localStorage.getItem("unify.social.v1")).profile.avatar.packStyle === "mini"));
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  ok("Esc closes the avatar editor even after tapping a chip", await page.evaluate(() => !document.getElementById("sheet").classList.contains("show")));

  // grades
  await page.click("#dk-grades"); await page.waitForTimeout(1200);
  ok("grades: folder opens to a 6-class report card", await page.evaluate(() => document.querySelector(".folder.open") && document.querySelectorAll(".rep-tab tr").length === 7));
  await page.keyboard.press("Escape");

  // homework: shape + persistence
  await page.evaluate(() => localStorage.setItem("flip.homework", JSON.stringify([{ id: 1.5, s: "math", text: "Fractions p.4", due: Date.now() + 864e5, done: false, doneAt: 0 }, { id: 2.5, s: "ela", text: "Read chapter 2", due: Date.now() + 2 * 864e5, done: false, doneAt: 0 }])));
  await page.click("#dk-homework"); await page.waitForTimeout(200);
  ok("homework lists the phone's items", (await page.locator(".hw-item").count()) === 2);
  await page.locator(".hw-chk").first().click();
  const hw1 = JSON.parse(await storeGet(page, "flip.homework"));
  ok("homework tick persists in flip.homework", hw1.find((h) => h.id === 1.5).done === true && hw1.find((h) => h.id === 1.5).doneAt > 0);
  await page.fill('#sheet input[type=text]', "Science poster"); await page.selectOption("#sheet select", "science"); await page.click('#sheet button:text-is("Due tomorrow")');
  const hw2 = JSON.parse(await storeGet(page, "flip.homework")), added = hw2.find((h) => h.text === "Science poster");
  ok("manual homework keeps the phone's format", !!added && added.s === "science" && typeof added.id === "number" && typeof added.due === "number" && added.done === false && added.doneAt === 0 && Object.keys(added).sort().join() === "doneAt,done,due,id,s,text".split(",").sort().join());
  await page.keyboard.press("Escape");

  // collage: upload, snapshot, caption, frame, delete, message refresh
  await page.click("#dk-collage"); await page.waitForTimeout(300);
  ok("collage says photos stay on this device", (await page.textContent("#sheet")).includes("Photos stay on this device"));
  await uploadPng(page, await png(page));
  ok("collage upload works", await wait(page, () => document.querySelectorAll(".th").length === 1));
  await page.click('#sheet button:has-text("Snapshot this room")');
  ok("snapshot adds a picture", await wait(page, () => document.querySelectorAll(".th").length === 2));
  await page.locator('.th input[type=text]').first().fill("Me at school"); await page.locator('.th input[type=text]').first().blur();
  await page.waitForTimeout(300);
  const dbCount = await page.evaluate(() => new Promise((res) => { const q = indexedDB.open("unify-dorm-photos", 1); q.onsuccess = () => { const r = q.result.transaction("photos").objectStore("photos").getAll(); r.onsuccess = () => res(r.result.map((x) => [x.kind, x.caption])); }; }));
  ok("pictures stored in IndexedDB (kind + caption)", dbCount.length === 2 && dbCount.some((x) => x[1] === "Me at school"), JSON.stringify(dbCount));
  ok("frame uses up to 12, shows a count", (await page.textContent("#sheet")).includes("In the frame: 2 of 12"));
  await page.locator('.th .pin').first().click(); await page.waitForTimeout(200);
  ok("pin takes a picture out of the frame", (await page.textContent("#sheet")).includes("In the frame: 1 of 12"));
  await page.evaluate(() => new Promise((res) => { const q = indexedDB.open("unify-dorm-photos", 1); q.onsuccess = () => { const t = q.result.transaction("photos", "readwrite"); t.objectStore("photos").put({ id: "shell1", at: Date.now() + 5, kind: "screenshot", blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }), caption: "" }); t.oncomplete = () => res(); }; }));
  await page.evaluate(() => window.postMessage({ type: "dorm:photos-changed" }, "*"));
  ok("dorm:photos-changed refreshes the collage", await wait(page, () => document.querySelectorAll(".th").length === 3));
  await page.locator('.th button:has-text("Delete")').first().click(); await page.locator('.th button:has-text("Really delete")').click();
  ok("delete removes a picture", await wait(page, () => document.querySelectorAll(".th").length === 2));
  await page.keyboard.press("Escape");

  // edit room
  await page.click("#dk-edit"); await page.waitForTimeout(300);
  const n0 = await page.evaluate(() => window.__dorm.api.layout.items.length);
  await page.click('#sheet button[aria-label="Add Floor cushion"]'); await page.waitForTimeout(300);
  const n1 = await page.evaluate(() => window.__dorm.api.layout.items.length);
  ok("edit room: add furniture", n1 === n0 + 1, `${n0} -> ${n1}`);
  const rot0 = await page.evaluate(() => window.__dorm.api.selected && window.__dorm.api.selected.rot);
  await page.click('#sheet button[aria-label="Turn right"]'); await page.waitForTimeout(200);
  const rot1 = await page.evaluate(() => window.__dorm.api.selected && window.__dorm.api.selected.rot);
  ok("edit room: rotate", rot0 !== null && rot1 !== rot0, `${rot0} -> ${rot1}`);
  await page.click('#sheet button[aria-label="Delete"]'); await page.waitForTimeout(200);
  ok("edit room: delete", (await page.evaluate(() => window.__dorm.api.layout.items.length)) === n0);
  await page.click('#sheet button[aria-label="Undo"]'); await page.waitForTimeout(300);
  ok("edit room: undo brings it back", (await page.evaluate(() => window.__dorm.api.layout.items.length)) === n1);
  const mainDel = await page.evaluate(() => { const a = window.__dorm.api; a.select("d_desk"); return a.selected && a.def(a.selected.def).core; });
  ok("core items are protected", mainDel === true);
  await page.evaluate(() => window.__dorm.api.deleteSelected()); ok("core item cannot be deleted", await page.evaluate(() => window.__dorm.api.layout.items.some((i) => i.uid === "d_desk")));
  await page.click('#sheet button:has-text("Stripes")'); await page.waitForTimeout(500);
  ok("theme editor changes the wall", await page.evaluate(() => window.__dorm.api.layout.theme.wall.endsWith("|stripes")));
  await page.fill('#sheet input[type=search]', "plant"); await page.waitForTimeout(100);
  ok("catalogue search filters", (await page.locator(".cat-it").count()) >= 1 && (await page.locator(".cat-it").count()) < 8);
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  const saved = JSON.parse(await storeGet(page, "unify.dorm.v1"));
  ok("room autosaved to unify.dorm.v1", !!saved && saved.items.length === n1, JSON.stringify(saved && saved.items.length));
  ok("edit mode off after closing", await page.evaluate(() => !window.__dorm.api.editing));

  // style toggle keeps the layout and avatar
  const itemsBefore = await page.evaluate(() => window.__dorm.api.layout.items.length), hBefore = await page.evaluate(() => window.__dorm.me.height);
  await page.click("#styleQuick"); await page.waitForTimeout(600); await settle(page, 10);
  ok("style toggle -> pixar", (await page.evaluate(() => window.__dorm.style)) === "pixar" && (await storeGet(page, "unify.dorm.style")) === "pixar");
  ok("style toggle keeps layout + avatar", (await page.evaluate(() => window.__dorm.api.layout.items.length)) === itemsBefore && (await page.evaluate(() => window.__dorm.me.height)) === hBefore);
  ok("canvas survives the toggle", (await page.locator("canvas").count()) === 1);
  await page.click("#styleQuick"); await page.waitForTimeout(300);
  ok("style toggle -> papercut", (await page.evaluate(() => window.__dorm.style)) === "papercut");

  // tap -> hotspot opens panel; tap avatar waves; auto-rotate is off; reset view
  const pt = await page.evaluate(() => { const d = window.__dorm, h = d.api.hotspots.find((x) => x.id === "wardrobe"), v = new d.THREE.Vector3().copy(h.focus.target).multiplyScalar(1.3).project(d.camera); const r = d.renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height }; });
  await page.evaluate(() => { window.__dorm.cam.reset(0); window.__dorm.step(5); });
  const pt2 = await page.evaluate(() => { const d = window.__dorm, h = d.api.hotspots.find((x) => x.id === "computer"), v = new d.THREE.Vector3().copy(h.focus.target).multiplyScalar(1.3).project(d.camera); const r = d.renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height }; });
  void pt; await page.mouse.click(pt2.x, pt2.y); await page.waitForTimeout(500);
  ok("tapping the computer on the desk opens the Computer panel", (await page.evaluate(() => window.__dorm.shell.openId)) === "computer");
  ok("computer lists apps (standalone: links to index.html)", (await page.locator('#sheet a.app[href="index.html"]').count()) >= 4);
  await page.keyboard.press("Escape");
  ok("auto-rotate is off by default", await page.evaluate(() => window.__dorm.cam.autoRotating === false));
  await page.click("#dk-style"); await page.click('#sheet button:has-text("Slowly spin")'); ok("auto-rotate toggle", await page.evaluate(() => window.__dorm.cam.autoRotating === true)); await page.keyboard.press("Escape");
  await page.evaluate(() => { window.__dorm.cam.orbitBy(1.2, 0.3); }); await page.click("#dk-reset"); await settle(page, 40);
  ok("reset view returns the camera", await page.evaluate(() => Math.abs(window.__dorm.camera.position.y - 2.75 * 1.3) < 0.45 && Math.abs(window.__dorm.camera.position.z - 6.3 * 1.3) < 0.65));
  // keys do not scroll the page behind
  const sc = await page.evaluate(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true })); return [document.scrollingElement.scrollTop, getComputedStyle(document.body).overflow]; });
  ok("page behind never scrolls", sc[0] === 0 && sc[1] === "hidden");
  // no third-party hosts were requested
  ok("no external requests", external.length === 0, external.slice(0, 3).join());
  await ctx.close();
}

/* ================================================================== two students chatting in a dorm */
async function chat() {
  console.log("--- private chat in a dorm (two tabs)");
  const ctx = await newCtx(); const A = await openDorm(ctx, "chatA"), B = await openDorm(ctx, "chatB");
  await A.evaluate(() => PhoneNet.join({ name: "Alex", handle: "alexa" })); await B.evaluate(() => PhoneNet.join({ name: "Blake", handle: "blakeb" }));
  const idB = await B.evaluate(() => PhoneNet.meId()), idA = await A.evaluate(() => PhoneNet.meId());
  ok("two different students", !!idA && !!idB && idA !== idB);
  // A visits B's dorm: their layout and avatar come from the classmate showcase
  const theirLayout = { v: 1, theme: { wall: "#E8567C|dots", floor: "#8A5A3A|wood", trim: "#FFFFFF", rug: "#4F91C7", window: "day" }, items: [] };
  await A.evaluate(([id, lay]) => { window.__classmates = [{ key: id, name: "Blake", json: JSON.stringify({ dorm: lay, avatar: { hairStyle: "afro", hair: "#2b2b33", skin: "#8d5a3e", top: "hoodie", shirt: "#4f91c7" } }) }]; }, [idB, theirLayout]);
  await A.click("#dk-visit"); await A.waitForTimeout(500);
  const listText = await A.textContent("#sheet");
  ok("visit lists nobody yet and shows the handle box", listText.includes("Start a chat with a handle"));
  await A.fill('#sheet input[type=text]', "blakeb"); await A.click('#sheet button:text-is("Find")');
  ok("handle search asks whose dorm", await wait(A, () => document.querySelector("#sheet").textContent.includes("Whose dorm?")));
  const myLayoutBefore = await storeGet(A, "unify.dorm.v1");
  await A.click('#sheet button:has-text("Blake\'s dorm")');
  ok("chat bar appears with the parents banner", await wait(A, () => document.getElementById("visit").classList.contains("show") && document.getElementById("visit").textContent.includes("Parents can see this chat")));
  ok("guest dorm layout comes from the showcase", await A.evaluate(() => window.__dorm.api.layout.theme.wall === "#E8567C|dots"));
  ok("two avatars on stage", await A.evaluate(() => !!window.__dorm.me && !!window.__dorm.other && window.__dorm.other.tris() > 500));
  ok("their showcase avatar is used", await A.evaluate(() => { const v = window.__dorm.vis(); return v && v.their.hairStyle === "afro" && v.their.skin === "#8d5a3e" && v.name === "Blake"; }));
  ok("friend shows as away", (await A.textContent("#visit")).includes("away"));
  ok("room presence is the dorm's room", (await A.evaluate(() => PhoneNet.presence.room())).startsWith("dorm-"));
  // B joins the same dorm (A's? no: B picks "Theirs" = Alex's dorm, the same presence room)
  await B.click("#dk-visit");
  ok("B sees Alex in the friend list", await wait(B, () => document.querySelector("#sheet").textContent.includes("Alex")));
  await B.click('#sheet button[aria-label="Visit Alex"]'); await B.waitForTimeout(300);
  ok("whose dorm? asked", (await B.textContent("#sheet")).includes("Whose dorm?"));
  await B.click('#sheet button:has-text("Mine")');   // Blake's own dorm: the same room A is visiting
  ok("B is visiting", await wait(B, () => document.getElementById("visit").classList.contains("show")));
  const roomA = await A.evaluate(() => PhoneNet.presence.room()), roomB = await B.evaluate(() => PhoneNet.presence.room());
  ok("both are in one presence room", roomA === roomB && roomA.startsWith("dorm-"), `${roomA} vs ${roomB}`);
  ok("A sees B is here (live presence)", await wait(A, () => document.getElementById("visit").textContent.includes("is here with you"), null, 30000));
  // messages: A -> B and B -> A through the normal private thread
  await A.fill("#visit input[type=text]", "hello from Alex"); await A.press("#visit input[type=text]", "Enter");
  ok("B receives A's message in the chat log", await wait(B, () => document.getElementById("vlog").textContent.includes("hello from Alex"), null, 30000));
  ok("B shows a speech bubble above A's avatar", await B.evaluate(() => window.__dorm.bubbles().some((b) => b.kind === "say" && b.who === "them")));
  ok("A shows a speech bubble above their own avatar", await A.evaluate(() => window.__dorm.bubbles().some((b) => b.kind === "say" && b.who === "me")));
  await B.fill("#visit input[type=text]", "hi Alex, nice room!"); await B.press("#visit input[type=text]", "Enter");
  ok("A receives B's reply", await wait(A, () => document.getElementById("vlog").textContent.includes("nice room"), null, 30000));
  const net = JSON.parse(await storeGet(A, "unify.net.local")), allMsgs = Object.values(net.msgs).flat().map((m) => m.text);
  ok("messages live in the normal private thread (parents see them)", allMsgs.includes("hello from Alex") && allMsgs.includes("hi Alex, nice room!"));
  // safety filter
  await A.fill("#visit input[type=text]", "call me 555 123 4567 89"); await A.press("#visit input[type=text]", "Enter");
  ok("personal details are hidden and explained", await wait(A, () => /phone number/i.test(document.getElementById("visit").textContent)));
  await A.fill("#visit input[type=text]", "you are a bitch"); await A.press("#visit input[type=text]", "Enter");
  ok("unkind messages are blocked with a friendly note", await wait(A, () => /kind and school-friendly/i.test(document.getElementById("visit").textContent)));
  const net2 = JSON.parse(await storeGet(A, "unify.net.local")), all2 = Object.values(net2.msgs).flat().map((m) => m.text);
  ok("blocked message never reached the thread", !all2.some((t) => /bitch/i.test(t)));
  // emote
  await A.click('#visit button[aria-label="Wave"]');
  ok("emote shows above my avatar", await A.evaluate(() => window.__dorm.bubbles().some((b) => b.kind === "emote" && b.who === "me")));
  ok("B sees A's emote", await wait(B, () => window.__dorm.bubbles().some((b) => b.kind === "emote" && b.who === "them"), null, 20000));
  await shot(A, "chat-guest-dorm-" + (process.env.__STYLE || "papercut") + "-test");
  // leave restores my room
  await A.click('#visit button:has-text("Leave")'); await A.waitForTimeout(500);
  ok("leaving hides the chat and restores my dorm", await A.evaluate(() => !document.getElementById("visit").classList.contains("show") && window.__dorm.api.layout.theme.wall !== "#E8567C|dots" && !window.__dorm.other));
  ok("leaving does not overwrite my saved dorm", (await storeGet(A, "unify.dorm.v1")) === myLayoutBefore || JSON.parse((await storeGet(A, "unify.dorm.v1")) || "{}").theme?.wall !== "#E8567C|dots");
  ok("room is back to 'dorm'", (await A.evaluate(() => PhoneNet.presence.room())) === "dorm");
  // deep link
  const C = await ctx.newPage(); watch(C, "chatC");
  await C.goto(`${BASE}/dorm.html?style=papercut&gfx=low&visit=alexa&at=them`, { waitUntil: "domcontentloaded" });
  await C.waitForFunction("window.__dorm&&window.__dorm.ready", null, { timeout: 150000 });
  await C.evaluate(() => PhoneNet.join({ name: "Casey", handle: "caseyc" })).catch(() => {});
  ok("?visit=<handle>&at=them deep link starts a visit (or explains)", await wait(C, () => document.getElementById("visit").classList.contains("show") || document.getElementById("toast").classList.contains("show") || document.getElementById("sheet").classList.contains("show"), null, 30000));
  await ctx.close();
}

/* ================================================================== screenshots in both styles */
async function shots(style) {
  console.log(`--- screenshots (${style})`);
  const ctx = await newCtx(); const page = await openDorm(ctx, "shots-" + style, `style=${style}&gfx=high`);
  const S = (n) => `${style}-${n}`;
  await page.evaluate(() => window.__dorm.pause(true));   // software GL: render only when we step, so screenshots are never starved
  await page.evaluate(() => { localStorage.setItem("flip.homework", JSON.stringify([{ id: 11.1, s: "math", text: "Fractions worksheet, page 4", due: Date.now() + 864e5, done: false, doneAt: 0 }, { id: 12.2, s: "ela", text: "Read chapter 2 of Charlotte's Web", due: Date.now() + 2 * 864e5, done: false, doneAt: 0 }, { id: 13.3, s: "science", text: "Plant diary: day 3", due: Date.now() - 3600e3, done: true, doneAt: Date.now() - 7200e3 }])); localStorage.setItem("unify.progress.v1", JSON.stringify({ done: { math: ["x"], science: ["y"] }, scores: { math: [4, 5], science: [3, 5] } })); });
  await settle(page, 30); await page.screenshot({ timeout: 120000, path: path.join(SHOTS, S("01-default-room") + ".png") });
  await page.click("#dk-wardrobe"); await settle(page, 60); await page.screenshot({ timeout: 120000, path: path.join(SHOTS, S("02-wardrobe") + ".png") });
  await page.click("#dk-backpack"); await settle(page, 60); await page.screenshot({ timeout: 120000, path: path.join(SHOTS, S("03-backpack-from-behind") + ".png") });
  await page.click("#dk-mirror"); await page.click('#sheet [data-tab="Face"]'); await settle(page, 60); await page.screenshot({ timeout: 120000, path: path.join(SHOTS, S("03b-mirror-face") + ".png") });
  await page.click("#dk-computer"); await settle(page, 120); await page.screenshot({ timeout: 120000, path: path.join(SHOTS, S("04-computer") + ".png") });
  await page.click("#dk-grades"); await settle(page, 80); await page.waitForTimeout(1200); await page.screenshot({ timeout: 120000, path: path.join(SHOTS, S("05-grades-folder") + ".png") });
  await page.click("#dk-homework"); await settle(page, 60); await page.screenshot({ timeout: 120000, path: path.join(SHOTS, S("06-homework-binder") + ".png") });
  await page.click("#dk-collage"); await settle(page, 20);
  for (const c of ["#e8567c", "#4f91c7", "#3fb68b", "#f2b138", "#8d6bd4"]) await uploadPng(page, await png(page, c)).then(() => page.waitForTimeout(500));
  await page.click('#sheet button:has-text("Snapshot this room")'); await page.waitForTimeout(800); await settle(page, 60); await page.screenshot({ timeout: 120000, path: path.join(SHOTS, S("07-collage") + ".png") });
  await page.click("#dk-edit"); await settle(page, 60); await page.click('#sheet button[aria-label="Add Floor cushion"]'); await settle(page, 20); await page.screenshot({ timeout: 120000, path: path.join(SHOTS, S("08-edit-room") + ".png") });
  await page.keyboard.press("Escape");
  await ctx.close();
}
async function shotsChat(style) {
  const ctx = await newCtx(); const A = await openDorm(ctx, "shotsA-" + style, `style=${style}&gfx=high`), B = await openDorm(ctx, "shotsB-" + style, `style=${style}&gfx=low`);
  await A.evaluate(() => window.__dorm.pause(true));   // software GL: the high-quality page only renders when we step it
  await A.evaluate(() => PhoneNet.join({ name: "Alex", handle: "alexa" })); await B.evaluate(() => PhoneNet.join({ name: "Blake", handle: "blakeb" }));
  const idB = await B.evaluate(() => PhoneNet.meId());
  const lay = { v: 1, theme: { wall: "#B8A8DA|stripes", floor: "#E8C99A|wood", trim: "#FFFFFF", rug: "#3FB68B", window: "day" }, items: [] };
  await A.evaluate(([id, l]) => { window.__classmates = [{ key: id, name: "Blake", json: JSON.stringify({ dorm: l, avatar: { hairStyle: "afro", hair: "#2b2b33", skin: "#8d5a3e", top: "varsity", shirt: "#d9564a", glasses: "none", packStyle: "messenger" } }) }]; }, [idB, lay]);
  await A.click("#dk-visit"); await A.fill('#sheet input[type=text]', "blakeb"); await A.click('#sheet button:text-is("Find")'); await A.waitForSelector('#sheet button:has-text("Blake\'s dorm")'); await A.click('#sheet button:has-text("Blake\'s dorm")');
  await B.click("#dk-visit"); await B.waitForSelector('#sheet button[aria-label="Visit Alex"]', { timeout: 30000 }); await B.click('#sheet button[aria-label="Visit Alex"]'); await B.click('#sheet button:has-text("Mine")');
  await wait(A, () => document.getElementById("visit").textContent.includes("is here with you"), null, 40000);
  await A.fill("#visit input[type=text]", "Love your room! Is that a new rug?"); await A.press("#visit input[type=text]", "Enter");
  await wait(B, () => document.getElementById("vlog").textContent.includes("new rug"), null, 30000);
  await B.fill("#visit input[type=text]", "Thanks! Come see the wardrobe"); await B.press("#visit input[type=text]", "Enter");
  await wait(A, () => document.getElementById("vlog").textContent.includes("wardrobe"), null, 30000);
  await A.evaluate(() => { window.__dorm.pause(true); window.__dorm.step(30, 0.05); });   // the page clock only advances when stepped, so bubbles are still up
  await A.screenshot({ path: path.join(SHOTS, `${style}-09-chat-two-avatars-guest-dorm.png`), timeout: 120000 });
  await ctx.close();
}
async function phoneWidth(style) {
  const ctx = await newCtx({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const page = await openDorm(ctx, "phone-" + style, `style=${style}`);
  await page.evaluate(() => window.__dorm.pause(true)); await settle(page, 30); await page.screenshot({ path: path.join(SHOTS, `${style}-10-phone-default.png`), timeout: 120000 });
  const small = await page.evaluate(() => [...document.querySelectorAll("#dock button")].filter((b) => b.getBoundingClientRect().height < 44 || b.getBoundingClientRect().width < 44).map((b) => b.id));
  ok(`phone (${style}): dock targets >= 44px`, small.length === 0, small.join());
  await page.click("#dk-wardrobe"); await settle(page, 60); await page.screenshot({ timeout: 120000, path: path.join(SHOTS, `${style}-11-phone-wardrobe.png`) });
  const fits = await page.evaluate(() => { const s = document.getElementById("sheet").getBoundingClientRect(); return s.left >= 0 && s.right <= innerWidth + 1 && s.bottom <= innerHeight; });
  ok(`phone (${style}): bottom sheet fits the screen`, fits);
  await page.click("#dk-edit"); await settle(page, 60); await page.screenshot({ timeout: 120000, path: path.join(SHOTS, `${style}-12-phone-edit.png`) });
  await ctx.close();
}

/* ================================================================== shell integration (index.html) */
async function shell() {
  console.log("--- school shell: My Dorm view, open-app messages, screenshot button");
  const stub = `navigator.mediaDevices=navigator.mediaDevices||{};navigator.mediaDevices.getDisplayMedia=async function(){if(window.__denyShot){const e=new Error('denied');e.name='NotAllowedError';throw e;}const c=document.createElement('canvas');c.width=1600;c.height=900;const g=c.getContext('2d');g.fillStyle='#4f91c7';g.fillRect(0,0,1600,900);setInterval(()=>{g.fillStyle='#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');g.fillRect(0,0,50,50);},50);return c.captureStream(20);};`;
  const ctx = await newCtx({}, stub + `try{if(!localStorage.getItem('unify.social.v1'))localStorage.setItem('unify.social.v1',JSON.stringify({v:1,mem:{},profile:{name:'Tester',hasAvatar:true}}));localStorage.setItem('unify.family.v1',JSON.stringify({mode:'guest'}));localStorage.setItem('unify.ui.always','1');}catch(e){}`); const page = await ctx.newPage(); watch(page, "shell");   // guest mode with an avatar already made: no sign-in sheet or first-run avatar screen in the way
  await page.goto(`${BASE}/index.html`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.waitForSelector("#tDorm", { state: "attached", timeout: 240000 });
  // destinations live in the slide-in side menu (auto-hides after 5 s): open it before each click on one of them
  const menu = async (sel) => { if ((await page.getAttribute("#menuTab", "aria-expanded")) !== "true") await page.dispatchEvent("#menuTab", "click"); await page.dispatchEvent(sel, "click"); };
  ok("shell has the My Dorm and screenshot buttons", (await page.locator("#tDorm").count()) === 1 && (await page.locator("#tShot").count()) === 1);
  ok("dorm iframe is lazy (no src yet)", (await page.getAttribute("#fDorm", "src")) === null);
  await menu("#tDorm");
  ok("My Dorm view opens dorm.html", (await page.getAttribute("#fDorm", "src")) === "dorm.html" && (await page.evaluate(() => document.getElementById("fDorm").classList.contains("on"))));
  const fr = page.frameLocator("#fDorm");
  await fr.locator("#dk-computer").waitFor({ timeout: 150000 });
  await fr.locator("#dk-computer").click(); await fr.locator('#sheet .app:has-text("Mail")').click();
  ok("computer Mail asks the shell to open Mail", await wait(page, () => document.getElementById("fMail").classList.contains("on"), null, 15000));
  await menu("#tDorm"); if ((await fr.locator('#dk-computer[aria-pressed="true"]').count()) === 0) await fr.locator("#dk-computer").click(); await fr.locator('#sheet .app:has-text("News")').click();
  ok("computer News opens the Newsroom view", await wait(page, () => document.getElementById("fNews").classList.contains("on"), null, 15000));
  await menu("#tDorm"); await fr.locator("#dk-exit").click();
  ok("Back to school returns to the hallway", await wait(page, () => document.getElementById("fHall").classList.contains("on"), null, 15000));
  // screenshot button: refused, then allowed
  await page.evaluate(() => (window.__denyShot = true)); await menu("#tShot");
  ok("cancelled screenshot gives a friendly note", await wait(page, () => /no picture taken/i.test(document.getElementById("shotToast").textContent), null, 10000));
  await page.evaluate(() => (window.__denyShot = false)); await menu("#tShot");
  ok("screenshot saved with the shared IndexedDB schema", await wait(page, () => /Saved to your dorm collage/.test(document.getElementById("shotToast").textContent), null, 90000));
  const rec = await page.evaluate(() => new Promise((res) => { const q = indexedDB.open("unify-dorm-photos", 1); q.onsuccess = () => { const r = q.result.transaction("photos").objectStore("photos").getAll(); r.onsuccess = () => res(r.result.map((x) => ({ kind: x.kind, type: x.blob.type, size: x.blob.size, id: typeof x.id, at: typeof x.at, cap: x.caption }))); }; }));
  ok("record is {kind:'screenshot', jpeg blob}", rec.length >= 1 && rec[0].kind === "screenshot" && rec[0].type === "image/jpeg" && rec[0].size > 500 && rec[0].id === "string" && rec[0].at === "number" && rec[0].cap === "", JSON.stringify(rec));
  await menu("#tDorm"); await fr.locator("#dk-collage").click();
  ok("the dorm collage shows the school screenshot", await wait(page, () => { const f = document.getElementById("fDorm").contentDocument; return f && f.querySelectorAll(".th img").length >= 1; }, null, 30000));
  await ctx.close();
}

try {
  if (!ONLY || ONLY === "func") await functional();
  if (!ONLY || ONLY === "chat") await chat();
  if (!ONLY || ONLY === "shots") { const parts = (process.env.DORM_PARTS || "room,chat,phone").split(","); for (const s of STYLES) { process.env.__STYLE = s; if (parts.includes("room")) await shots(s); if (parts.includes("chat")) await shotsChat(s); if (parts.includes("phone")) await phoneWidth(s); } }
  if (!ONLY || ONLY === "shell") await shell();
} catch (e) { failed++; console.log("FAIL  test crashed: " + (e && e.stack || e)); }
const real = problems.filter((p) => !/swiftshader/i.test(p));
ok("no pageerror / console.error anywhere", real.length === 0, real.slice(0, 6).join(" | "));
await browser.close(); server.close();
console.log(failed ? `\n${failed} check(s) FAILED` : "\nALL DORM PAGE CHECKS PASSED");
process.exit(failed ? 1 : 0);
