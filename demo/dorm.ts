/** UNIFY Academy: My Dorm page. A 360 degree 3D dorm room: customise the avatar, decorate, read grades and homework, keep a photo collage, and visit a friend. */
import * as THREE from "three";
import { Beam } from "../src/shared/beam";
import { DormCamera, type CamPose } from "../src/dorm/camera";
import { createDorm, defaultDormLayout, sanitizeLayout, type DormApiPlus } from "../src/dorm/room";
import { getStyle } from "../src/dorm/style";
import { createChar3D, type Char3DEx } from "../src/dorm/char3d";
import { DORM_KEY } from "../src/dorm/types";
import type { Anim, DormLayout, HotspotId, Mood, Style, StyleId, StyleRig } from "../src/dorm/types";
import { isPixar } from "../src/shared/look";
import { Social } from "../src/hall3d/social";
import type { AvatarSpec } from "../src/hall3d/avatar";
import { AvatarCreator } from "../src/hall3d/avatarui";
import { DormVisit, type VisitScene } from "../src/dorm/chat";
import { PAGE_CSS } from "../src/dorm/page/css";
import { E, btn, debounce, lsRaw, lsSet } from "../src/dorm/page/dom";
import { Shell } from "../src/dorm/page/sheet";
import { Collage, openCollage } from "../src/dorm/page/collage";
import { EditPanel } from "../src/dorm/page/edit";
import { openGrades } from "../src/dorm/page/grades";
import { openHomework } from "../src/dorm/page/homework";
import { openComputer, unreadMail, inShell } from "../src/dorm/page/computer";
import { openStylePanel, type Gfx, type TimeOpt } from "../src/dorm/page/stylepanel";
import { makeBubble, makeEmote, disposeSprite } from "../src/dorm/page/bubble";

/* ------------------------------------------------------------------ page chrome */
const st = document.createElement("style"); st.textContent = PAGE_CSS; document.head.appendChild(st);
const canvas = document.getElementById("c") as HTMLCanvasElement;
const root = document.getElementById("ui") as HTMLElement;
const qs = new URLSearchParams(location.search);
const toastEl = E("div", "tag", root); toastEl.id = "toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
let toastT = 0;
const toast = (m: string, ms = 3600) => { toastEl.textContent = m; toastEl.classList.add("show"); clearTimeout(toastT); toastT = window.setTimeout(() => toastEl.classList.remove("show"), ms); };

/* ------------------------------------------------------------------ settings */
const STYLE_KEY = "unify.dorm.style", GFX_KEY = "unify.dorm.gfx";
let styleId: StyleId = ((): StyleId => { const q = qs.get("style"); if (q === "pixar" || q === "papercut") { lsSet(STYLE_KEY, q); return q; } const l = lsRaw(STYLE_KEY); return l === "pixar" || l === "papercut" ? l : isPixar() ? "pixar" : "papercut"; })();
let gfx: Gfx = ((): Gfx => { const q = qs.get("gfx") ?? lsRaw(GFX_KEY); return q === "high" || q === "low" ? q : "auto"; })();
const mobile = matchMedia("(pointer:coarse)").matches || Math.min(innerWidth, innerHeight) < 600;
let autoQ: 0 | 1 | 2 = mobile ? 0 : 2, timeOpt: TimeOpt = "auto", labelsOn = true;
const quality = (): 0 | 1 | 2 => (gfx === "high" ? 2 : gfx === "low" ? 0 : autoQ);

/* ------------------------------------------------------------------ renderer, scene, camera */
let renderer: THREE.WebGLRenderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
catch { const card = E("div", "tag", root, "Your device can't show the 3D room right now. You can still use everything from the school page."); card.style.cssText += ";position:absolute;left:12px;top:60px;max-width:90vw"; throw new Error("WebGL unavailable"); }
const scene = new THREE.Scene();
const pBeam = new Beam(scene, Social.profile.avatar.shirt, { size: 0.5, height: 12 });   // light pillar over you
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
const cam = new DormCamera(camera, { maxDist: 26 });
cam.attach(canvas);
if (matchMedia("(prefers-reduced-motion: reduce)").matches) cam.autoRotate(false);

/* ------------------------------------------------------------------ world (rebuilt when the look changes) */
let style: Style, rig: StyleRig, api: DormApiPlus, me: Actor, other: Actor | null = null;
let myLayout: DormLayout = ((): DormLayout => { try { const s = lsRaw(DORM_KEY); return s ? sanitizeLayout(JSON.parse(s)) : defaultDormLayout(); } catch { return defaultDormLayout(); } })();
let vis: { at: "me" | "them"; dorm: DormLayout | null; their: AvatarSpec; name: string; away: boolean; sig: string } | null = null;
const labelsWanted = () => labelsOn && !vis;
const inTheirDorm = () => !!vis && vis.at === "them";
const hourNow = () => { if (timeOpt === "day") return 13; if (timeOpt === "night") return 22; const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
const mood = (): Mood => ({ hour: hourNow() });
const mySpec = (): AvatarSpec => ({ ...Social.profile.avatar, name: Social.profile.name || Social.profile.avatar.name });

/** simulated time in seconds: advances with the frames we step, so bubbles and gestures behave the same when the page is paused for screenshots */
let simT = 0;
const lerpAngle = (a: number, b: number, k: number) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };
class Actor {
  target = new THREE.Vector3(); rot = 0; anim: Anim = "idle"; tmp: { a: Anim; until: number } | null = null; talkUntil = 0; walking = false; look: THREE.Vector3 | null = null;
  constructor(public char: Char3DEx) { scene.add(char.root); }
  place(p: THREE.Vector3, rot: number, anim: Anim, snap = false) { this.target.copy(p); this.rot = rot; this.anim = anim; if (snap) { this.char.root.position.copy(p); this.char.root.rotation.y = rot; this.walking = false; this.char.play(anim); } }
  wave(secs = 2.2) { this.tmp = { a: "wave", until: simT + secs }; }
  talk(secs: number) { this.talkUntil = simT + secs; this.char.speak(true); }
  update(dt: number) {
    const now = simT, r = this.char.root, dx = this.target.x - r.position.x, dz = this.target.z - r.position.z, d = Math.hypot(dx, dz);
    if (d > 0.04) {
      const sp = Math.min(d, 1.5 * dt); r.position.x += (dx / d) * sp; r.position.z += (dz / d) * sp; r.rotation.y = lerpAngle(r.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-dt * 10)); this.char.play("walk"); this.walking = true;
    } else {
      this.walking = false; r.position.x = this.target.x; r.position.z = this.target.z; r.rotation.y = lerpAngle(r.rotation.y, this.rot, 1 - Math.exp(-dt * 8));
      const a = this.tmp && now < this.tmp.until ? this.tmp.a : now < this.talkUntil ? "talk" : this.anim; this.char.play(a);
    }
    if (this.talkUntil && now >= this.talkUntil) { this.talkUntil = 0; this.char.speak(false); }
    this.char.lookAt(this.look);
    this.char.update(dt);
  }
  dispose() { this.char.dispose(); }
}

function buildWorld() {
  style = getStyle(styleId);
  rig = style.setup(renderer, scene, camera); rig.setQuality(quality()); sizeRig(); rig.setMood(mood());
  api = createDorm(style, inTheirDorm() ? (vis!.dorm ? sanitizeLayout(vis!.dorm) : defaultDormLayout()) : myLayout); scene.add(api.group); api.setMood(mood()); api.setLabels(labelsWanted());
  api.onChange(() => { if (!inTheirDorm()) { myLayout = JSON.parse(JSON.stringify(api.layout)); api.saveLocal(); } edit.syncHistory(); });
  api.onSelect(() => edit.sync());
  me = new Actor(createChar3D(style, mySpec()));
  other = null; if (vis) other = new Actor(createChar3D(style, vis.their));
  collage.push(); updateSpots(true);
  if (edit.isOpen) api.setEditing(true);
}
function teardownWorld() {
  for (const b of bubbles) disposeSprite(b.sp); bubbles.length = 0;
  me.dispose(); other?.dispose(); other = null; api.dispose(); rig.dispose();
}
function swapStyle(id: StyleId) {
  if (id === styleId) return; const keep = JSON.parse(JSON.stringify(api.layout)) as DormLayout; if (!inTheirDorm()) myLayout = keep;
  teardownWorld(); styleId = id; lsSet(STYLE_KEY, id); buildWorld(); syncStyleChip(); toast(id === "pixar" ? "Movie look on 🎬" : "Paper cut look on ✂️");
  if (shell.openId === "edit" || shell.openId === "style") shell.open(shell.openId);
}

/* ------------------------------------------------------------------ where everybody stands */
const aspect = () => innerWidth / Math.max(1, innerHeight);
function updateSpots(snap = false) {
  const sp = api.spots, id = shell.openId, sit = id === "computer" && !vis;
  if (vis) {
    const mineOwner = vis.at === "me";
    me.place(mineOwner ? sp.owner : sp.guest, mineOwner ? sp.ownerRot : sp.guestRot, "idle", snap);
    other?.place(mineOwner ? sp.guest : sp.owner, mineOwner ? sp.guestRot : sp.ownerRot, "idle", snap);
    return;
  }
  if (sit) me.place(sp.desk, sp.deskRot, "type", snap);
  else if (id === "grades" || id === "homework" || id === "collage") me.place(ASIDE, presentYaw, "idle", snap);   // step out of the camera's way
  else {
    let rot = sp.ownerRot;
    if (id === "wardrobe" || id === "mirror") rot = presentYaw; else if (id === "backpack") rot = presentYaw + Math.PI;
    me.place(sp.owner, rot, "idle", snap);
  }
}
const presentYaw = -0.5, ASIDE = new THREE.Vector3(0.3, 0, 1.1);

/* ------------------------------------------------------------------ camera poses */
const orbit = (t: THREE.Vector3, yaw: number, pitch: number, dist: number): CamPose => ({ target: t.clone(), pos: new THREE.Vector3(t.x + dist * Math.cos(pitch) * Math.sin(yaw), t.y + dist * Math.sin(pitch), t.z + dist * Math.cos(pitch) * Math.cos(yaw)) });
/** fraction of the screen the 3D view can use while a panel is open (phones: the sheet covers the bottom) */
const availH = () => (matchMedia("(max-width:700px)").matches && shell.openId ? Math.max(0.4, 1 - (Math.min(0.54 * innerHeight, 520) + 74) / innerHeight) : 1);
function posePanel(id: string | null, tab = ""): CamPose | null {
  const sp = api.spots, h = me.char.height, f = 1 / availH(), P = sp.owner;
  const full = (yaw: number) => orbit(new THREE.Vector3(P.x, h * 0.5, P.z), yaw, 0.14, Math.max(2.9, h * 2.25) * f * (aspect() < 0.8 ? 1.2 : 1));
  const head = () => orbit(new THREE.Vector3(P.x, h * 0.88, P.z), presentYaw, 0.08, 1.6 * f * (aspect() < 0.8 ? 1.3 : 1));
  switch (id) {
    case "wardrobe": return full(presentYaw);
    case "mirror": return /Face|Hair|Facial/.test(tab) ? head() : tab === "Accessories" ? orbit(new THREE.Vector3(P.x, h * 0.82, P.z), presentYaw, 0.1, 2.0 * f) : full(presentYaw);
    case "backpack": return orbit(new THREE.Vector3(P.x, h * 0.55, P.z), presentYaw + 0.5, 0.12, Math.max(2.6, h * 2.0) * f);
    case "computer": return { pos: new THREE.Vector3(-1.95, 1.35, -0.1), target: new THREE.Vector3(-1.3, 0.95, -1.95) };
    case "grades": return { pos: new THREE.Vector3(-1.35, 1.4, -0.95), target: new THREE.Vector3(-0.8, 0.78, -2.0) };
    case "homework": return { pos: new THREE.Vector3(-1.25, 1.4, -0.95), target: new THREE.Vector3(-0.6, 0.78, -2.0) };
    case "collage": return { pos: new THREE.Vector3(0.7, 1.35, -0.2), target: new THREE.Vector3(0.85, 1.1, -2.3) };
    case "edit": { const t = new THREE.Vector3(0, 0.2, 0), k = Math.max(aspect() < 0.8 ? 1.5 : 1, f ** 0.8); return { pos: t.clone().add(new THREE.Vector3(0.2, 6.2, 5.3).multiplyScalar(k)), target: t }; }
  }
  return id ? homePose() : null;
}
/** the home view: the whole room; pulled back more on tall (phone) screens */
function homeBase(): CamPose {
  const a = aspect(), k = a < 0.8 ? 1.7 : a < 1.1 ? 1.3 : 1, t = new THREE.Vector3(0.1, 0.95, -0.3), p = new THREE.Vector3(-1.0, 2.75, 6.3);
  return { target: t, pos: t.clone().add(p.sub(t).multiplyScalar(k)) };
}
/** the home view, pulled back a little more when a panel covers part of the screen so the whole room stays visible */
function homePose(): CamPose {
  const c = shell.coverage(), k = Math.min(1.5, Math.max(1, 1 / Math.max(0.4, 1 - c.x / innerWidth), 1 / Math.max(0.4, 1 - c.y / innerHeight)) ** 0.85), b = homeBase();
  return { target: b.target, pos: b.target.clone().add(b.pos.clone().sub(b.target).multiplyScalar(k)) };
}
function posePair(): CamPose { const a = me.char.root.position, b = other?.char.root.position ?? a, t = new THREE.Vector3((a.x + b.x) / 2, 1.0, (a.z + b.z) / 2); return orbit(t, -0.2, 0.2, 3.5 * (aspect() < 0.8 ? 1.4 : 1)); }
const FOCUS_ID: Record<string, HotspotId> = { wardrobe: "wardrobe", computer: "computer", grades: "folder", homework: "binder", collage: "collage", mirror: "mirror", backpack: "backpack" };
const HS_PANEL: Partial<Record<HotspotId, string>> = { wardrobe: "wardrobe", computer: "computer", desk: "computer", folder: "grades", binder: "homework", collage: "collage", mirror: "mirror", backpack: "backpack" };

/* ------------------------------------------------------------------ the avatar editor, embedded in panels */
const creatorHost = E("div", "", null); const creator = new AvatarCreator(creatorHost, { embedded: true });
creator.onChange = (spec) => { me.char.setSpec({ ...spec }); pBeam.setColor(spec.shirt); };   // live: the creator fires this the frame after every edit (saving is debounced inside it)
creator.onTab = (t) => { const p = posePanel(shell.openId, t); if (p && (shell.openId === "mirror" || shell.openId === "backpack" || shell.openId === "wardrobe")) cam.focusOn(p); };
const avatarPanel = (id: string, icon: string, label: string, tabs: string[], first: string, title?: string) => shell.register({
  id, icon, label, title, fill: true,
  open(body) { body.appendChild(creator.root); creator.reload(); creator.setTabs(tabs); creator.showTab(first); return () => { creator.root.remove(); }; },
});

/* ------------------------------------------------------------------ panels */
const shell = new Shell(root);
const collage = new Collage((urls) => api.setPhotos(inTheirDorm() ? [] : urls), () => (inTheirDorm() ? myLayout : api.layout), () => { if (!inTheirDorm()) api.saveLocal(); });
const edit = new EditPanel({ api: () => api, camYaw: () => cam.yaw, toast });
const bubbles: { sp: THREE.Sprite; who: "me" | "them"; born: number; ttl: number; kind: "say" | "emote" | "away" }[] = [];

avatarPanel("wardrobe", "👗", "Wardrobe", ["Wardrobe", "Outfit", "Closet"], "Wardrobe", "Wardrobe: what will you wear?");
avatarPanel("mirror", "🪞", "Mirror", ["Body", "Face", "Hair", "Facial hair", "Accessories", "You"], "Body", "Mirror: how do you look?");
avatarPanel("backpack", "🎒", "Backpack", ["Backpack", "Accessories"], "Backpack", "Backpack");
shell.register({ id: "computer", icon: "💻", label: "Computer", title: "Computer", open: (b) => openComputer(b) });
shell.register({ id: "grades", icon: "📁", label: "Grades", title: "Grades folder", open: (b) => openGrades(b) });
shell.register({ id: "homework", icon: "📓", label: "Homework", title: "Homework binder", open: (b) => openHomework(b) });
shell.register({ id: "collage", icon: "🖼️", label: "Collage", title: "Collage", open: (b) => openCollage(b, collage, snapshot) });
shell.register({ id: "edit", icon: "🛋️", label: "Edit room", title: "Edit your room", open: (b) => { if (vis) { setTimeout(() => shell.close(), 0); toast("Leave your visit to decorate your room."); return; } return edit.open(b); } });
const visitBar = E("div", "", root); visitBar.id = "visit";
const visitScene: VisitScene = {
  mySpec,
  begin(o) { vis = { at: o.at, dorm: o.dorm, their: o.their, name: o.theirName, away: true, sig: JSON.stringify(o.their) }; if (!inTheirDorm()) myLayout = JSON.parse(JSON.stringify(api.layout)); shell.close(); applyVisit(); },
  end() { vis = null; applyVisit(); },
  setTheirSpec(s) { if (!vis) return; const sig = JSON.stringify(s); if (sig === vis.sig) return; vis.sig = sig; vis.their = s; other?.char.setSpec(s); },
  setAway(a) { if (!vis) return; vis.away = a; syncAway(); },
  say: (who, text) => say(who, text),
  emote: (who, emoji) => showEmote(who, emoji),
};
const visit = new DormVisit(visitScene, visitBar);
visit.toast = toast;
shell.register({ id: "visit", icon: "💬", label: "Visit", title: "Visit a friend", open: (b) => visit.openPicker(b) });
shell.register({ id: "style", icon: "🎨", label: "Style", title: "Style", open: (b) => openStylePanel(b, {
  style: () => styleId, setStyle: swapStyle, gfx: () => gfx, setGfx(g) { gfx = g; lsSet(GFX_KEY, g); rig.setQuality(quality()); sizeRig(); }, gfxNow: () => ["Low", "Medium", "High"][quality()] + (gfx === "auto" ? " (auto)" : ""),
  spin: () => cam.autoRotating, setSpin: (b) => cam.autoRotate(b), time: () => timeOpt, setTime(t) { timeOpt = t; applyMood(); }, labels: () => labelsOn, setLabels(b) { labelsOn = b; api.setLabels(labelsWanted()); },
}) });
shell.addDock({ id: "reset", icon: "⟲", label: "Reset view", onClick: () => { shell.close(); cam.reset(); if (vis) cam.focusOn(posePair()); } }).setAttribute("aria-label", "Reset view");
const exitBtn = shell.addDock({ id: "exit", icon: "←", label: "School", cls: "back", onClick: exitDorm }); exitBtn.setAttribute("aria-label", "Back to school");

function exitDorm() {
  if (visit.visiting) visit.leave(); visit.home(false);
  if (inShell()) window.parent.postMessage({ type: "dorm:exit" }, "*"); else location.href = "index.html";
}

shell.onChange = (id) => {
  api.setFocus(id ? FOCUS_ID[id] ?? null : null);
  updateSpots();
  const p = id ? posePanel(id, id === "mirror" ? "Body" : "") : null;
  if (vis) cam.focusOn(posePair()); else if (p) cam.focusOn(p); else if (!id) cam.reset();
  me.look = null;
};

/* ------------------------------------------------------------------ top bar + hint */
const top = E("div", "", root); top.id = "top";
E("span", "tag", top, "🏠 My Dorm");
const styleChip = E("button", "tag", top); styleChip.type = "button"; styleChip.id = "styleQuick";
function syncStyleChip() { styleChip.textContent = styleId === "pixar" ? "🎬 Movie look" : "✂️ Paper cut"; styleChip.setAttribute("aria-label", `Look: ${styleId === "pixar" ? "Movie" : "Paper cut"}. Tap to switch.`); }
styleChip.onclick = () => swapStyle(styleId === "pixar" ? "papercut" : "pixar"); 
const hint = E("div", "", root); hint.id = "hint"; E("span", "tag", hint, "Drag to look around · tap the wardrobe, desk, folder, binder or mirror");
setTimeout(() => hint.remove(), 14000);

/* ------------------------------------------------------------------ speech bubbles + emotes */
function actorOf(who: "me" | "them") { return who === "me" ? me : other; }
function addSprite(who: "me" | "them", sp: THREE.Sprite, kind: "say" | "emote" | "away", ttl: number) {
  for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; if (b.who === who && (b.kind === kind || (kind === "say" && b.kind === "away"))) { if (kind !== "away" || b.kind === "away") { disposeSprite(b.sp); bubbles.splice(i, 1); } } }
  scene.add(sp); bubbles.push({ sp, who, born: simT, ttl, kind });
}
function say(who: "me" | "them", text: string) {
  const a = actorOf(who); if (!a) return; const ttl = Math.min(9, 4 + text.length * 0.05);
  addSprite(who, makeBubble(text, who), "say", ttl); a.talk(Math.min(ttl - 0.5, 1.2 + text.length * 0.07));
}
function showEmote(who: "me" | "them", emoji: string) {
  const a = actorOf(who); if (!a) return; addSprite(who, makeEmote(emoji), "emote", 3);
  if (emoji === "👋") a.wave(2.2); else if (emoji === "👏" || emoji === "⭐" || emoji === "😂") a.tmp = { a: "cheer", until: simT + 1.6 }; 
}
function syncAway() {
  for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].kind === "away") { disposeSprite(bubbles[i].sp); bubbles.splice(i, 1); }
  if (vis?.away && other) addSprite("them", makeBubble("💤 away", "away"), "away", 1e9);
}
const tv = new THREE.Vector3();
function updateBubbles() {
  const now = simT;
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i], a = actorOf(b.who); if (!a || now - b.born > b.ttl) { disposeSprite(b.sp); bubbles.splice(i, 1); continue; }
    const hd = a.char.anchor("head"); const d = camera.position.distanceTo(hd), w = 0.62 * THREE.MathUtils.clamp(d * 0.3, 0.55, 1.7), k = b.kind;
    const age = now - b.born, rise = k === "emote" ? Math.min(0.35, age * 0.2) : 0;
    b.sp.position.set(hd.x + (k === "emote" ? 0.28 : 0), hd.y + 0.3 * (a.char.height / 1.6) + 0.1 + rise, hd.z);
    b.sp.scale.set(w, w * (b.sp.userData.aspect as number), 1); if (k !== "away") b.sp.material.opacity = Math.min(1, (b.ttl - age) * 2);
    tv.copy(b.sp.position); 
  }
}

/* ------------------------------------------------------------------ visits: swap rooms and add the second avatar */
let savedPhotos = false;
function applyVisit() {
  other?.dispose(); other = null;
  if (vis) {
    const want = inTheirDorm() ? (vis.dorm ? sanitizeLayout(vis.dorm) : defaultDormLayout()) : myLayout;
    api.setLayout(want); api.setLabels(false); if (inTheirDorm()) { api.setPhotos([]); savedPhotos = true; }
    other = new Actor(createChar3D(style, vis.their));
    updateSpots(true); syncAway(); cam.focusOn(posePair());
  } else {
    for (const b of bubbles) disposeSprite(b.sp); bubbles.length = 0;
    api.setLayout(myLayout); api.setLabels(labelsWanted()); if (savedPhotos) { savedPhotos = false; collage.push(); }
    updateSpots(); cam.reset();
  }
}

/* ------------------------------------------------------------------ pointer: pick, hover, drag, look */
const ndc = { x: 0, y: 0 }, ray = new THREE.Raycaster(), v2 = new THREE.Vector2(); let dragging = false, lastMove = 0, hoverAt = 0;
canvas.addEventListener("pointerdown", (e) => {
  if (!api.editing || e.target !== canvas) return;
  cam.toNdc(e, ndc); const r = api.pick(ndc.x, ndc.y, camera);
  if (r?.placed && api.selected && r.placed.uid === api.selected.uid) { dragging = true; canvas.setPointerCapture(e.pointerId); }
});
canvas.addEventListener("pointermove", (e) => {
  cam.toNdc(e, ndc); lastMove = performance.now();
  if (dragging) { api.dragSelected(ndc.x, ndc.y, camera); return; }
  if (e.buttons === 0 && e.pointerType === "mouse" && performance.now() - hoverAt > 50) { hoverAt = performance.now(); const r = api.hover(ndc.x, ndc.y, camera); canvas.style.cursor = r?.hotspot || (api.editing && r?.placed) ? "pointer" : (hitAvatar() ? "pointer" : "grab"); }
});
const endDrag = () => { if (dragging) { dragging = false; api.endDrag(); } };
canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
cam.ignore = () => dragging;
function hitAvatar(): Actor | null {
  v2.set(ndc.x, ndc.y); ray.setFromCamera(v2, camera);
  for (const a of [me, other]) { if (!a) continue; const h = ray.intersectObject(a.char.root, true).find((x) => !(x.object as THREE.Sprite).isSprite); if (h) return a; }
  return null;
}
cam.onTap((e) => {
  cam.toNdc(e, ndc);
  if (api.editing) { const r = api.pick(ndc.x, ndc.y, camera); api.select(r?.placed?.uid ?? null); return; }
  const a = hitAvatar(); if (a) { a.wave(); return; }
  const r = api.pick(ndc.x, ndc.y, camera), h = r?.hotspot; if (!h) return;
  const panel = HS_PANEL[h.id];
  if (panel) { if (shell.openId !== panel) shell.open(panel); else cam.focusOn(h.focus); return; }
  api.setFocus(h.id); cam.focusOn(h.focus); toast(h.id === "bed" ? "🛏️ Your loft bed. Desk and computer are right underneath." : "🪟 The window shows the real time of day.");
});
addEventListener("keydown", (e) => {
  if (!api.editing || /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName ?? "")) return;
  if (e.key === "Delete" || e.key === "Backspace") { api.deleteSelected(); edit.sync(); e.preventDefault(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.shiftKey ? api.redo() : api.undo(); edit.sync(); e.preventDefault(); }
});

/* ------------------------------------------------------------------ collage snapshot */
async function snapshot(): Promise<Blob | null> {
  try {
    api.setLabels(false); api.update(0); camera.clearViewOffset(); appliedShift = [NaN, NaN]; rig.render(0);
    const b = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.9)); api.setLabels(labelsWanted()); return b;
  } catch { api.setLabels(labelsWanted()); return null; }
}

/* ------------------------------------------------------------------ size, mood, loop */
function sizeRig() { const w = innerWidth, h = innerHeight; camera.fov = w / h < 0.8 ? 50 : 45; rig.resize(w, h, Math.min(devicePixelRatio || 1, quality() >= 1 ? 2 : 1.5)); appliedShift = [NaN, NaN]; cam.setHome(homeBase()); }
addEventListener("resize", sizeRig);
function applyMood() { const m = mood(); rig.setMood(m); api.setMood(m); }
setInterval(applyMood, 60000);
let appliedShift: [number, number] = [0, 0]; const shift = { x: 0, y: 0 };
let last = performance.now(), frames = 0, slow = 0;
let paused = false;
function frame(now: number) {
  requestAnimationFrame(frame); if (paused) { last = now; return; }
  const dt = Math.min(0.1, (now - last) / 1000); last = now; step(dt);
  // automatic quality: after warm-up, measure ~60 frames; too slow means one step down
  if (gfx === "auto" && autoQ > 0 && ++frames > 40 && dt > 0) { slow += dt > 0.045 ? 1 : 0; if (frames > 100) { if (slow > 35) { autoQ = (autoQ - 1) as 0 | 1; rig.setQuality(autoQ); sizeRig(); } frames = 30; slow = 0; } }
}
function step(dt: number) {
  simT += dt;
  cam.update(dt); api.setCameraPosition(camera.position); api.update(dt);
  // look at the pointer lightly while idle
  const idle = !(shell.openId === "computer") && !vis;
  if (idle) { v2.set(ndc.x, ndc.y); ray.setFromCamera(v2, camera); const d = camera.position.distanceTo(me.char.root.position); me.look = performance.now() - lastMove < 6000 ? tv.copy(ray.ray.direction).multiplyScalar(d).add(camera.position).clone() : camera.position; }
  else if (vis && other) { me.look = other.char.anchor("head"); other.look = me.char.anchor("head"); }
  me.update(dt); other?.update(dt); updateBubbles(); pBeam.update(simT, camera, me.char.root.position);
  // keep the avatar visible beside the open panel
  const c = shell.coverage(); shift.x += (c.x / 2 - shift.x) * Math.min(1, dt * 8); shift.y += (c.y / 2 - shift.y) * Math.min(1, dt * 8);
  if (Math.abs(shift.x - appliedShift[0]) > 0.4 || Math.abs(shift.y - appliedShift[1]) > 0.4 || Number.isNaN(appliedShift[0])) {
    if (Math.abs(shift.x) < 0.5 && Math.abs(shift.y) < 0.5) { camera.clearViewOffset(); appliedShift = [0, 0]; } else { camera.setViewOffset(innerWidth, innerHeight, shift.x, shift.y, innerWidth, innerHeight); appliedShift = [shift.x, shift.y]; }
  }
  rig.render(dt);
}

/* ------------------------------------------------------------------ boot */
buildWorld(); syncStyleChip(); cam.setPose(homeBase());
const dockBadge = (n: number) => shell.badge("computer", n);
const pollMail = () => unreadMail().then(dockBadge); setTimeout(pollMail, 2500); setInterval(pollMail, 60000);
collage.refresh();
if (!lsRaw("unify.social.v1") || !Social.profile.hasAvatar) toast("Make it yours! Tap the 🪞 Mirror to create your avatar.", 6000);
// the school shell tells us when the dorm is on screen (presence room) and when screenshots were added
addEventListener("message", (e) => {
  const m = e.data; if (!m || typeof m !== "object") return;
  if (m.type === "dorm:photos-changed") collage.refresh();
  else if (m.type === "dorm:visible") visit.home(!!m.on);
});
addEventListener("storage", debounce((e: StorageEvent) => {
  if (e.key === "unify.social.v1") { me.char.setSpec(mySpec()); pBeam.setColor(mySpec().shirt); creator.reload(); }
  else if (e.key === DORM_KEY && !api.editing && !vis) { try { const s = lsRaw(DORM_KEY); if (s) { myLayout = sanitizeLayout(JSON.parse(s)); api.setLayout(myLayout); } } catch { /* ignore */ } }
}, 120));
visit.init().then(() => {
  visit.home(true);
  const h = qs.get("visit"); if (h) visit.visit(h, qs.get("at") === "them" ? "them" : "me").then((err) => { if (err) { toast(err, 6000); shell.open("visit"); } });
});
addEventListener("pagehide", () => { if (visit.visiting) visit.leave(); });
requestAnimationFrame(frame);
(window as any).__dorm = {
  ready: true, shell, creator, cam, camera, renderer, visit, collage, THREE,
  get api() { return api; }, get me() { return me.char; }, get other() { return other?.char ?? null; }, get style() { return styleId; }, get quality() { return quality(); },
  pause(v = true) { paused = v; }, vis: () => vis, bubbles: () => bubbles.map((b) => ({ who: b.who, kind: b.kind })), actors: () => ({ me, other }),
  step(n = 1, dt = 0.05) { for (let i = 0; i < n; i++) step(dt); }, swapStyle, openPanel: (id: string) => shell.open(id), setGfx(g: Gfx) { gfx = g; rig.setQuality(quality()); sizeRig(); },
};
