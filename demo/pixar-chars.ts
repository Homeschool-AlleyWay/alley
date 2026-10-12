/** Look preview: 12 students in the paper-cut and Pixar-inspired styles, orbit camera, close-up face and pose buttons. */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { randomAvatar, rng, SKIN_TONES, type AvatarSpec } from "../src/hall3d/avatar";
import { getStyle } from "../src/dorm/style";
import { createChar3D } from "../src/dorm/char3d";
import type { Anim, Char3D, StyleId, StyleRig } from "../src/dorm/types";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const qs = new URLSearchParams(location.search);
const mobile = matchMedia("(pointer:coarse)").matches || Math.min(innerWidth, innerHeight) < 600;
const PR = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
const quality: 0 | 1 | 2 = ((): 0 | 1 | 2 => { const q = qs.get("q"); return q === "0" || q === "1" || q === "2" ? (Number(q) as 0 | 1 | 2) : mobile ? 1 : 2; })();

const AGES = ["k2", "g35", "g68", "hs", "adult", "hs", "g68", "g35", "adult", "k2", "hs", "g68"] as const;
const SKIN_IDX = [0, 5, 10, 3, 8, 1, 6, 11, 2, 9, 4, 7];            // pale to deep, mixed
const specs: AvatarSpec[] = AGES.map((a, i) => ({ ...randomAvatar(rng(i * 7 + 3), a), skin: SKIN_TONES[SKIN_IDX[i]], hat: i % 5 === 4 ? "cap" : "none", name: `Student ${i + 1}` }));
const COLS = 4, GAP = 1.15, ROWGAP = 1.5;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const wrap = $("wrap");
const controls = new OrbitControls(camera, wrap);
controls.enableDamping = true; controls.dampingFactor = 0.1; controls.enablePan = false; controls.minDistance = 0.7; controls.maxDistance = 22; controls.maxPolarAngle = 1.55;

interface Pane { id: StyleId; el: HTMLElement; canvas: HTMLCanvasElement; renderer: THREE.WebGLRenderer; rig: StyleRig; chars: Char3D[]; w: number; h: number; acc: number; ms: number; n: number; fpsT: number }
const panes: Partial<Record<StyleId, Pane>> = {}, IDS: StyleId[] = ["papercut", "pixar"];
let single: StyleId | null = qs.get("style") === "pixar" || qs.get("style") === "papercut" ? (qs.get("style") as StyleId) : null;
let pose: Anim = "idle", sel = 0, mode: "gallery" | "face" | "body" = "gallery", active: StyleId = "pixar";

function make(id: StyleId): Pane | null {
  const el = $("pane-" + id); el.querySelector("canvas")?.remove(); const canvas = document.createElement("canvas"); el.prepend(canvas);
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); } catch { canvas.remove(); return null; }
  if (!renderer.getContext()) { canvas.remove(); return null; }
  const style = getStyle(id), scene = new THREE.Scene(), rig = style.setup(renderer, scene, camera);
  if (id === "pixar") rig.setQuality(quality);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), style.mat("floor", id === "pixar" ? "#c9a47c" : "#e6d5b5", { texture: id === "pixar" ? "wood" : undefined, repeat: [14, 9], rough: 0.75, clearcoat: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const chars = specs.map((s, i) => { const c = createChar3D(style, s); c.root.position.set(((i % COLS) - (COLS - 1) / 2) * GAP, 0, (Math.floor(i / COLS) - 1) * ROWGAP); c.play(pose); scene.add(c.root); return c; });
  rig.setMood({ hour: 14, palette: "sun" });
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lost(id); });
  const p: Pane = { id, el, canvas, renderer, rig, chars, w: 0, h: 0, acc: 0, ms: 0, n: 0, fpsT: performance.now() };
  panes[id] = p; fit(p); applyView(); return p;
}
function drop(id: StyleId) { const p = panes[id]; if (!p) return; delete panes[id]; p.chars.forEach((c) => c.dispose()); p.rig.dispose(); p.renderer.dispose(); p.renderer.forceContextLoss(); p.canvas.remove(); }
const live = () => IDS.map((i) => panes[i]).filter(Boolean) as Pane[];
function fit(p: Pane) { const w = Math.max(2, Math.floor(p.el.clientWidth)), h = Math.max(2, Math.floor(p.el.clientHeight)); if (w === p.w && h === p.h) return; p.w = w; p.h = h; p.rig.resize(w, h, PR); }
new ResizeObserver(() => { live().forEach(fit); if (mode === "gallery" && !userMoved) applyView(); }).observe(wrap);

const kid = $("kid");
function layoutMode() {
  for (const id of IDS) $("pane-" + id).style.display = single && single !== id ? "none" : "";
  kid.style.display = single ? "inline-block" : "none"; kid.textContent = "Show: " + (single === "pixar" ? "paper cut" : "Pixar-inspired");
  requestAnimationFrame(() => live().forEach(fit));
}
function lost(id: StyleId) { const keep = IDS.find((x) => x !== id)!; drop(id); single = panes[keep] ? keep : id; layoutMode(); }
kid.onclick = () => { if (!single) return; const to: StyleId = single === "pixar" ? "papercut" : "pixar"; drop(single); single = to; make(to); layoutMode(); active = to; };

/* ---- views */
let userMoved = false;
const ref = () => live()[0]?.chars ?? [];
function applyView() {
  const cs = ref(); if (!cs.length) return;
  const a = (live()[0].w || 600) / Math.max(1, live()[0].h || 600), tanH = Math.tan(THREE.MathUtils.degToRad(16));
  for (const p of live()) p.chars.forEach((c, i) => (c.root.visible = mode === "gallery" || i === sel));
  const c = cs[sel], P = c.root.position, h = c.height, t = new THREE.Vector3();
  if (mode === "gallery") { t.set(0, 0.55, 0.2); const d = Math.max(8.5, 3.0 / (tanH * a)); camera.position.set(0, d * 0.5, d * 0.9); }
  else if (mode === "face") { t.copy(c.anchor("head")); const d = Math.max(0.95 * (h / 1.6) + 0.3, 0.42 / (tanH * a)); camera.position.set(t.x + d * 0.3, t.y + 0.05, t.z + d); }
  else { t.set(P.x, h * 0.5, P.z); const d = Math.max(3.2, (h * 0.62) / tanH, 0.9 / (tanH * a)); camera.position.set(P.x + 0.5, h * 0.62, P.z + d); }
  controls.target.copy(t); camera.lookAt(t); controls.update(); userMoved = false;
}

/* ---- UI */
const selEl = $<HTMLSelectElement>("sel");
specs.forEach((s, i) => { const o = document.createElement("option"); o.value = String(i); o.textContent = `${i + 1}. ${s.name} (${s.age})`; selEl.appendChild(o); });
selEl.onchange = () => { sel = Number(selEl.value); applyView(); };
const setMode = (m: typeof mode) => { mode = m; $("vg").classList.toggle("on", m === "gallery"); $("vf").classList.toggle("on", m === "face"); $("vb").classList.toggle("on", m === "body"); applyView(); };
$("vg").onclick = () => setMode("gallery"); $("vf").onclick = () => setMode("face"); $("vb").onclick = () => setMode("body");
const POSES: Anim[] = ["idle", "wave", "talk", "think", "cheer", "walk", "sit", "type"];
const poseBtns = POSES.map((a) => { const b = document.createElement("button"); b.textContent = a; b.onclick = () => { pose = a; for (const p of live()) p.chars.forEach((c) => c.play(a)); mark(); }; $("poses").appendChild(b); return b; });
const mark = () => poseBtns.forEach((b, i) => b.classList.toggle("on", POSES[i] === pose)); mark();
controls.addEventListener("start", () => (userMoved = true));
// tap a student to pick them
const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(); let down: { x: number; y: number } | null = null;
wrap.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; const id = IDS.find((i) => panes[i]?.el.contains(e.target as Node)); if (id) active = id; });
wrap.addEventListener("pointerup", (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || mode !== "gallery") return; down = null;
  const cv = e.target as HTMLCanvasElement; if (!cv.getBoundingClientRect) return; const r = cv.getBoundingClientRect();
  v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, camera);
  const cs = ref(); for (let i = 0; i < cs.length; i++) if (ray.intersectObject(cs[i].root, true)[0]) { sel = i; selEl.value = String(i); break; }
});

/* ---- loop (active side every frame, the other less often, nothing while hidden) */
let frameNo = 0, last = performance.now(), paused = false, moveUntil = 0; const prev = new THREE.Vector3().copy(camera.position);
function renderPane(p: Pane, now: number) {
  const dt = Math.min(0.1, p.acc); p.acc = 0; const a = p.w / p.h; if (Math.abs(camera.aspect - a) > 1e-4) { camera.aspect = a; camera.updateProjectionMatrix(); }
  for (const c of p.chars) if (c.root.visible) c.update(dt);
  const t0 = performance.now(); p.rig.render(dt); p.ms += (performance.now() - t0 - p.ms) * 0.15; p.n++;
  if (now - p.fpsT >= 1000) { $("fps-" + p.id).textContent = `${((p.n * 1000) / (now - p.fpsT)).toFixed(0)} fps · ${p.ms.toFixed(1)} ms`; p.n = 0; p.fpsT = now; }
}
function step(dt: number, now: number, force = false) {
  controls.update(); if (camera.position.distanceToSquared(prev) > 1e-8) { moveUntil = now + 400; prev.copy(camera.position); }
  frameNo++; for (const p of live()) { p.acc += dt; const every = p.id === active || force ? 1 : now < moveUntil ? 2 : 4; if (frameNo % every === 0) renderPane(p, now); }
}
function frame(now: number) { requestAnimationFrame(frame); if (paused || document.hidden) { last = now; return; } const dt = Math.min(0.1, (now - last) / 1000); last = now; step(dt, now); }

for (const id of IDS) { if ((single && single !== id) || panes[id]) continue; if (!make(id)) { if (single) break; single = IDS.find((x) => x !== id)!; if (!panes[single]) make(single); } }
layoutMode(); live().forEach(fit); applyView(); requestAnimationFrame(frame);
(window as any).__chars = {
  ready: true, camera, controls, specs, panes: () => Object.keys(panes), single: () => single, quality, setMode, select(i: number) { sel = i; selEl.value = String(i); applyView(); },
  chars: () => live().map((p) => p.chars),
  setSpec(i: number, patch: Partial<AvatarSpec>) { Object.assign(specs[i], patch); for (const p of live()) p.chars[i].setSpec(specs[i]); },
  play(a: Anim) { poseBtns[POSES.indexOf(a)].click(); }, pause(v = true) { paused = v; }, step(n = 1, dt = 0.05) { for (let i = 0; i < n; i++) step(dt, performance.now(), true); }, forceLoss(id: StyleId) { lost(id); },
};
