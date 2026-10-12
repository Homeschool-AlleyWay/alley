/** Look preview: the SAME dorm and avatar rendered side by side in the paper-cut and Pixar-inspired styles, one shared orbit camera. */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { randomAvatar, rng, type AvatarSpec } from "../src/hall3d/avatar";
import { createDorm, defaultDormLayout, type DormApiPlus } from "../src/dorm/room";
import { getStyle } from "../src/dorm/style";
import { createChar3D, type Char3DEx } from "../src/dorm/char3d";
import type { Anim, StyleId, StyleRig } from "../src/dorm/types";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const qs = new URLSearchParams(location.search);
const mobile = matchMedia("(pointer:coarse)").matches || Math.min(innerWidth, innerHeight) < 600;
const PR = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
let quality: 0 | 1 | 2 = ((): 0 | 1 | 2 => { const q = qs.get("q"); return q === "0" || q === "1" || q === "2" ? (Number(q) as 0 | 1 | 2) : mobile ? 1 : 2; })();
let hour = Number(qs.get("hour") ?? 14), tags = qs.get("tags") !== "0";

/* ---- eight preset students: ages and skin tones spread out */
const PRESETS: { name: string; age: "k2" | "g35" | "g68" | "hs" | "adult"; seed: number; skin: string }[] = [
  { name: "Maya, 7", age: "k2", seed: 11, skin: "#fbdcc4" }, { name: "Kofi, 9", age: "g35", seed: 23, skin: "#4a2e24" },
  { name: "Lena, 12", age: "g68", seed: 35, skin: "#f5cfa8" }, { name: "Arjun, 15", age: "hs", seed: 48, skin: "#a86f4f" },
  { name: "Sofia, 16", age: "hs", seed: 52, skin: "#e3ad7f" }, { name: "Jamal, 13", age: "g68", seed: 67, skin: "#5e3a2b" },
  { name: "Mr. Chen", age: "adult", seed: 78, skin: "#f0c29b" }, { name: "Ms. Grace", age: "adult", seed: 85, skin: "#7a4a36" },
];
const specOf = (i: number): AvatarSpec => { const p = PRESETS[i]; return { ...randomAvatar(rng(p.seed), p.age), name: p.name, skin: p.skin, hat: "none" }; };
let who = Math.min(7, Math.max(0, Number(qs.get("who") ?? 4))), pose: Anim = "idle";
const POSES: Anim[] = ["idle", "wave", "sit", "type", "cheer"];

/* ---- one camera, two worlds */
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
const stage = $("stage");
const controls = new OrbitControls(camera, stage);
controls.enableDamping = true; controls.dampingFactor = 0.1; controls.enablePan = false; controls.minDistance = 1.2; controls.maxDistance = 14; controls.maxPolarAngle = 1.52;
const HOME = { t: new THREE.Vector3(0.1, 0.95, -0.3), p: new THREE.Vector3(-1.0, 2.75, 6.3) };
function home() { const q = live()[0], a = q && q.w ? q.w / q.h : innerWidth / Math.max(1, innerHeight), k = a < 0.8 ? 1.5 : 1.15; camera.position.copy(HOME.t).add(HOME.p.clone().sub(HOME.t).multiplyScalar(k)); controls.target.copy(HOME.t); controls.update(); }

interface Pane { id: StyleId; el: HTMLElement; canvas: HTMLCanvasElement; renderer: THREE.WebGLRenderer; rig: StyleRig; api: DormApiPlus; char: Char3DEx; scene: THREE.Scene; w: number; h: number; acc: number; ms: number; n: number; fpsT: number; fps: number }
const panes: Partial<Record<StyleId, Pane>> = {};
const IDS: StyleId[] = ["papercut", "pixar"];

function make(id: StyleId): Pane | null {
  const el = $("pane-" + id); el.querySelector("canvas")?.remove();
  const canvas = document.createElement("canvas"); el.prepend(canvas);
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); } catch { canvas.remove(); return null; }
  if (!renderer.getContext()) { canvas.remove(); return null; }
  const style = getStyle(id), scene = new THREE.Scene(), rig = style.setup(renderer, scene, camera);
  if (id === "pixar") rig.setQuality(quality);
  const api = createDorm(style, defaultDormLayout()); scene.add(api.group); api.setLabels(tags);
  const char = createChar3D(style, specOf(who)); scene.add(char.root);
  const p: Pane = { id, el, canvas, renderer, rig, api, char, scene, w: 0, h: 0, acc: 0, ms: 0, n: 0, fpsT: performance.now(), fps: 0 };
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lostContext(id); });
  rig.setMood({ hour }); api.setMood({ hour });
  panes[id] = p; place(p); fit(p); return p;
}
function drop(id: StyleId) {
  const p = panes[id]; if (!p) return; delete panes[id];
  p.char.dispose(); p.api.dispose(); p.rig.dispose(); p.renderer.dispose(); p.renderer.forceContextLoss(); p.canvas.remove();
}
const live = () => IDS.map((i) => panes[i]).filter(Boolean) as Pane[];

/* ---- single-canvas fallback (also ?style=papercut|pixar) */
let single: StyleId | null = qs.get("style") === "pixar" || qs.get("style") === "papercut" ? (qs.get("style") as StyleId) : null;
const kid = $("kid");
function layoutMode() {
  for (const id of IDS) $("pane-" + id).style.display = single && single !== id ? "none" : "";
  kid.style.display = single ? "inline-block" : "none"; $("swap").style.display = single ? "none" : "";
  kid.textContent = "Show: " + (single === "pixar" ? "paper cut" : "Pixar-inspired");
  $("qual").parentElement!.style.display = single === "papercut" ? "none" : "";
  requestAnimationFrame(() => live().forEach(fit));
}
function lostContext(id: StyleId) {
  const other = IDS.find((x) => x !== id)!; const keep = panes[other] ? other : id;
  drop(id); single = keep; layoutMode();
  const n = $("note-" + keep); n.style.display = "block"; n.textContent = "The second 3D view could not start on this device, so you are seeing one look at a time. Use the toggle below.";
}
kid.onclick = () => {
  if (!single) return; const to: StyleId = single === "pixar" ? "papercut" : "pixar";
  drop(single); single = to; const p = make(to); if (!p) { single = null; return; }
  layoutMode(); active = to;
};

/* ---- placement of the avatar for the chosen pose */
function place(p: Pane) {
  const sp = p.api.spots, seated = pose === "sit" || pose === "type";
  p.char.root.position.copy(seated ? sp.desk : sp.owner); p.char.root.rotation.y = seated ? sp.deskRot : sp.ownerRot; p.char.play(pose);
}
function fit(p: Pane) {
  const w = Math.max(2, Math.floor(p.el.clientWidth)), h = Math.max(2, Math.floor(p.el.clientHeight));
  if (w === p.w && h === p.h) return; p.w = w; p.h = h; p.rig.resize(w, h, PR);
}
new ResizeObserver(() => live().forEach(fit)).observe(stage);

/* ---- UI */
function mkBtn(host: HTMLElement, label: string, fn: () => void) { const b = document.createElement("button"); b.textContent = label; b.onclick = fn; host.appendChild(b); return b; }
const charBtns = PRESETS.map((p, i) => mkBtn($("chars"), p.name, () => { who = i; for (const q of live()) q.char.setSpec(specOf(i)); mark(); }));
const poseBtns = POSES.map((a) => mkBtn($("poses"), a, () => { pose = a; live().forEach(place); mark(); }));
function mark() { charBtns.forEach((b, i) => b.classList.toggle("on", i === who)); poseBtns.forEach((b, i) => b.classList.toggle("on", POSES[i] === pose)); }
mark();
const fmtH = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${h % 1 ? String(Math.round((h % 1) * 60)).padStart(2, "0") : "00"}`;
const hourEl = $<HTMLInputElement>("hour"); hourEl.value = String(hour); $("hourv").textContent = fmtH(hour);
hourEl.oninput = () => { hour = Number(hourEl.value); $("hourv").textContent = fmtH(hour); for (const p of live()) { p.rig.setMood({ hour }); p.api.setMood({ hour }); } };
const qEl = $<HTMLSelectElement>("qual"); qEl.value = String(quality);
qEl.onchange = () => { quality = Number(qEl.value) as 0 | 1 | 2; panes.pixar?.rig.setQuality(quality); };
$("swap").onclick = () => { const s = $("pane-pixar").style.order === "-1"; $("pane-pixar").style.order = s ? "" : "-1"; };
const tagsBtn = $("tags"); tagsBtn.classList.toggle("on", tags);
tagsBtn.onclick = () => { tags = !tags; tagsBtn.classList.toggle("on", tags); live().forEach((p) => p.api.setLabels(tags)); };

/* ---- loop: the side you are touching renders every frame, the other one less often; nothing renders when the tab is hidden */
let active: StyleId = "pixar", frameNo = 0, last = performance.now(), moveUntil = 0, paused = false;
for (const id of IDS) { const e = $("pane-" + id); e.addEventListener("pointerenter", () => (active = id)); e.addEventListener("pointerdown", () => (active = id)); }
const prevPos = new THREE.Vector3().copy(camera.position);
function renderPane(p: Pane, now: number) {
  const dt = Math.min(0.1, p.acc); p.acc = 0;
  const a = p.w / p.h; if (Math.abs(camera.aspect - a) > 1e-4) { camera.aspect = a; camera.updateProjectionMatrix(); }
  p.char.lookAt(pose === "sit" || pose === "type" ? null : camera.position);
  p.char.update(dt); p.api.setCameraPosition(camera.position); p.api.update(dt);
  const t0 = performance.now(); p.rig.render(dt); const ms = performance.now() - t0;
  p.ms += (ms - p.ms) * 0.15; p.n++;
  if (now - p.fpsT >= 1000) { p.fps = (p.n * 1000) / (now - p.fpsT); p.n = 0; p.fpsT = now; $("fps-" + p.id).textContent = `${p.fps.toFixed(0)} fps · ${p.ms.toFixed(1)} ms`; }
}
function step(dt: number, now: number, force = false) {
  controls.update();
  if (camera.position.distanceToSquared(prevPos) > 1e-8) { moveUntil = now + 400; prevPos.copy(camera.position); }
  frameNo++;
  for (const p of live()) {
    p.acc += dt;
    const every = p.id === active || force ? 1 : now < moveUntil ? 2 : 4;
    if (frameNo % every === 0) renderPane(p, now);
  }
}
function frame(now: number) {
  requestAnimationFrame(frame); if (paused || document.hidden) { last = now; return; }
  const dt = Math.min(0.1, (now - last) / 1000); last = now; step(dt, now);
}

/* ---- boot */
for (const id of IDS) { if ((single && single !== id) || panes[id]) continue; if (!make(id)) { if (single) break; const other = IDS.find((x) => x !== id)!; single = other; if (!panes[other]) make(other); layoutMode(); const n = $("note-" + other); n.style.display = "block"; n.textContent = "Your device could only start one 3D view, so you see one look at a time. Use the toggle below."; } }
layoutMode(); live().forEach(fit); home();
requestAnimationFrame(frame);
(window as any).__cmp = {
  ready: true, camera, controls, panes: () => Object.keys(panes), single: () => single, quality: () => quality,
  pause(v = true) { paused = v; }, step(n = 1, dt = 0.05) { for (let i = 0; i < n; i++) step(dt, performance.now(), true); },
  setWho(i: number) { charBtns[i].click(); }, setPose(a: Anim) { poseBtns[POSES.indexOf(a)].click(); }, setHour(h: number) { hourEl.value = String(h); hourEl.oninput!(new Event("input")); }, forceLoss(id: StyleId) { lostContext(id); },
  stats: () => live().map((p) => ({ id: p.id, fps: p.fps, ms: p.ms })), home,
};
