/** Test gallery for the 3D dorm character: 12 random avatars in both render styles, orbit camera, animation buttons. */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { randomAvatar, rng, defaultAvatar, OPTIONS, type AvatarSpec } from "../src/hall3d/avatar";
import { STYLES } from "../src/dorm/style";
import { createChar3D } from "../src/dorm/char3d";
import type { Anim, Char3D, Style, StyleId, StyleRig } from "../src/dorm/types";

const AGES = ["k2", "g35", "g68", "hs", "adult", "hs", "g68", "g35", "adult", "k2", "hs", "g68"] as const;
const qs = new URLSearchParams(location.search), mode = qs.get("mode");   // mode=<option key> shows every id of that option on the same base avatar
const base = { ...defaultAvatar(), skin: "#e3ad7f", hair: "#5a3a35", hairStyle: "crop", top: "tee", shirt: "#4f91c7", bottom: "jeans", pants: "#4f5d75", glasses: "none", hat: "none", packStyle: "none", faceShape: "oval", mouthStyle: "smile", eyeShape: "cute", eyeColor: "#4f8a5e", extra: "none", hair2: null as string | null };
const PAGE = Number(qs.get("page") ?? 0);
const specs: AvatarSpec[] = mode ? (OPTIONS as any)[mode].slice(PAGE * 10, PAGE * 10 + 10).map((o: { id: string }, i: number) => ({ ...base, [mode]: o.id, hair2: i % 5 === 3 ? "#ff5fa2" : null, hl: ["streak", "stripes", "frontpiece", "tips", "ombre", "split", "roots", "underlayer", "rainbow"][i % 9] })) : AGES.map((a, i) => randomAvatar(rng(i * 7 + 3), a));
const COLS = mode ? 10 : 4;
interface Pane { id: StyleId; style: Style; canvas: HTMLCanvasElement; renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; rig: StyleRig; chars: Char3D[] }
const wrap = document.getElementById("wrap")!, bar = document.getElementById("bar")!;
const panes: Pane[] = [];
function makePane(id: StyleId): Pane {
  const style = STYLES[id], canvas = document.createElement("canvas"); wrap.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: qs.get("aa") === "0" ? false : id === "papercut", preserveDrawingBuffer: true, powerPreference: "high-performance" });
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100), rig = style.setup(renderer, scene, camera);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), style.mat("floor", id === "pixar" ? "#c9a47c" : "#e6d5b5", { texture: id === "pixar" ? "wood" : undefined, repeat: [4, 3], rough: 0.75, clearcoat: 0 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const chars = specs.map((s, i) => { const c = createChar3D(style, s); c.root.position.set(((i % COLS) - (COLS - 1) / 2) * (mode ? 0.55 : 1.15), 0, mode ? 0 : (Math.floor(i / 4) - 1) * 1.5); scene.add(c.root); return c; });
  return { id, style, canvas, renderer, scene, camera, rig, chars };
}
if (mode) { const mm = mode; for (const p of panes) p.chars.forEach((c, i) => { if (mm === "hairStyle" || mm === "hat" || mm === "glasses" || mm === "faceShape" || mm === "eyeShape" || mm === "mouthStyle" || mm === "brow" || mm === "beard" || mm === "extra") c.play("idle"); void i; }); }
const q0 = Number(qs.get("q") ?? 2) as 0 | 1 | 2;
const want = (qs.get("style") ?? "both");
for (const id of ["papercut", "pixar"] as StyleId[]) if (want === "both" || want === id) panes.push(makePane(id));
let quality = q0;
const target = new THREE.Vector3(0, 0.8, 0);
const controls = new OrbitControls(panes[0].camera, wrap); controls.target.copy(target); if (mode) { const head = ["hairStyle", "hat", "glasses", "faceShape", "eyeShape", "mouthStyle", "brow", "beard", "part", "fringe", "htex", "hl", "mark", "earShape", "noseShape", "earStyle"].includes(mode); const asp = innerWidth / panes.length / innerHeight, dist = 3.0 / (Math.tan(0.2793) * asp) + (head ? 0 : 1.2); target.set(0, head ? 1.55 : 0.85, 0); controls.target.copy(target); panes[0].camera.position.set(0, head ? 1.6 : 0.95, dist * (head ? 0.95 : 1.0));} else panes[0].camera.position.set(0, 3.4, 11.5); controls.update();
function size() { const w = Math.floor(innerWidth / panes.length), h = innerHeight; for (const p of panes) { p.canvas.style.width = w + "px"; p.canvas.style.height = h + "px"; p.rig.resize(w, h, 1); } }
addEventListener("resize", size); size();
function setQ(q: 0 | 1 | 2) { quality = q; for (const p of panes) p.rig.setQuality(q); }
setQ(quality);
let paused = qs.get("manual") === "1", t0 = performance.now();
function sync() { for (let i = 1; i < panes.length; i++) { panes[i].camera.position.copy(panes[0].camera.position); panes[i].camera.quaternion.copy(panes[0].camera.quaternion); } }
function frame(dt: number) { controls.update(); sync(); for (const p of panes) { for (const c of p.chars) c.update(dt); p.rig.render(dt); } }
function loop() { const n = performance.now(), dt = (n - t0) / 1000; t0 = n; if (!paused) frame(dt); requestAnimationFrame(loop); }
loop();

function view(name: string, i = 0) {
  const c = panes[0].chars[i], p = c.root.position; const camera = panes[0].camera; controls.enabled = false;
  const head = c.anchor("head"), h = c.height; for (const q of panes) q.chars.forEach((o, k) => (o.root.visible = name === "gallery" || k === i));
  if (name === "gallery") { camera.position.set(0, 3.4, 11.5); target.set(0, 0.7, 0); }
  else if (name === "face") { target.copy(head); camera.position.set(head.x, head.y + 0.02, head.z + 0.95 * (h / 1.6) + 0.35); }
  else if (name === "face34") { target.copy(head); camera.position.set(head.x + 0.75 * (h / 1.6) + 0.1, head.y + 0.08, head.z + 0.75 * (h / 1.6) + 0.1); }
  else if (name === "back") { target.set(p.x, h * 0.55, p.z); camera.position.set(p.x + 0.4, h * 0.65, p.z - 3.0); }
  else if (name === "front") { target.set(p.x, h * 0.5, p.z); camera.position.set(p.x, h * 0.6, p.z + 3.2); }
  else if (name === "side") { target.set(p.x, h * 0.5, p.z); camera.position.set(p.x + 3.2, h * 0.6, p.z + 0.4); }
  camera.lookAt(target); controls.target.copy(target); controls.enabled = true; controls.update();
}
function playAll(a: Anim, only?: number) { for (const p of panes) p.chars.forEach((c, i) => { if (only === undefined || i === only) c.play(a); }); }
function bench(n = 12) {
  const out: any = {}, px = new Uint8Array(4);
  for (const p of panes) {
    const gl = p.renderer.getContext(), res: any = {};
    for (const q of [0, 1, 2] as const) {
      p.rig.setQuality(q); p.rig.render(0.016); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t = performance.now();
      for (let i = 0; i < n; i++) { for (const c of p.chars) c.update(0.016); p.rig.render(0.016); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } res["q" + q] = +((performance.now() - t) / n).toFixed(1);
    }
    p.rig.setQuality(quality); out[p.id] = res;
  }
  return out;
}
const hud = (label: string, fn: () => void) => { const b = document.createElement("button"); b.textContent = label; b.onclick = fn; bar.appendChild(b); };
for (const a of ["idle", "wave", "sit", "talk", "think", "cheer", "walk", "type"] as Anim[]) hud(a, () => playAll(a));
hud("speak", () => panes.forEach((p) => p.chars.forEach((c) => c.speak(true)))); hud("q0", () => setQ(0)); hud("q1", () => setQ(1)); hud("q2", () => setQ(2));
hud("night", () => panes.forEach((p) => p.rig.setMood({ hour: 22, palette: "night" }))); hud("day", () => panes.forEach((p) => p.rig.setMood({ hour: 14, palette: "sun" })));
(window as any).__charTest = {
  ready: true, specs, panes: panes.map((p) => p.id),
  setStyle(id: string) { /* reload-free toggle: show only one canvas */ for (const p of panes) p.canvas.style.display = id === "both" || id === p.id ? "block" : "none"; },
  cam(px: number, py: number, pz: number, tx: number, ty: number, tz: number) { controls.enabled = false; panes[0].camera.position.set(px, py, pz); target.set(tx, ty, tz); panes[0].camera.lookAt(target); controls.target.copy(target); controls.enabled = true; controls.update(); },
  rot(y: number) { panes.forEach((p) => p.chars.forEach((c) => (c.root.rotation.y = y))); },
  info: () => panes.map((p) => ({ id: p.id, calls: p.renderer.info.render.calls, tris: p.renderer.info.render.triangles, geos: p.renderer.info.memory.geometries, progs: p.renderer.info.programs?.length })),
  meshes: () => panes.map((p) => p.chars.map((c) => { let n = 0; c.root.traverse((o: any) => { if (o.isMesh && o.visible) n++; }); return n; })),
  dbg: panes,
  setQuality: setQ, spec: (i: number) => specs[i], play: playAll, view, bench, pause(v = true) { paused = v; },
  speak(on: boolean, i?: number) { panes.forEach((p) => p.chars.forEach((c, k) => { if (i === undefined || i === k) c.speak(on); })); },
  setSpec(i: number, patch: Partial<AvatarSpec>) { Object.assign(specs[i], patch); panes.forEach((p) => p.chars[i].setSpec(specs[i])); },
  partMeshes: (i: number) => (panes[0].chars[i] as any).partMeshes(), partTris: (i: number) => panes.map((p) => (p.chars[i] as any).partTris()),
  tris: () => panes.map((p) => p.chars.map((c: any) => c.tris())),
  sim(n = 1, dt = 1 / 30) { for (let i = 0; i < n; i++) for (const p of panes) for (const c of p.chars) c.update(dt); },
  step(n = 1, dt = 1 / 30) { for (let i = 0; i < n; i++) frame(dt); },
  stats: () => (window as any).__styleStats,
};
