/** Test entry for the dorm room, furniture editor and 360 camera (uses the stub render style). */
import * as THREE from "three";
import { DormCamera } from "../src/dorm/camera";
import { createDorm } from "../src/dorm/room";
import { stubStyle } from "../src/dorm/stubstyle";
import * as photos from "../src/dorm/photos";
import type { HotspotId } from "../src/dorm/types";

const canvas = document.getElementById("c") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
const rig = stubStyle.setup(renderer, scene, camera);
const api = createDorm(stubStyle);
scene.add(api.group);
const cam = new DormCamera(camera);

const fit = () => { const w = innerWidth, h = innerHeight; rig.resize(w, h, Math.min(devicePixelRatio || 1, 2)); };
addEventListener("resize", fit); fit();

/* ---- pointer logic: drag selected furniture in edit mode, tap to pick, hover to highlight */
let dragging = false; const ndc = { x: 0, y: 0 };
canvas.addEventListener("pointerdown", (e) => {
  if (!api.editing || e.target !== canvas) return;
  cam.toNdc(e, ndc); const r = api.pick(ndc.x, ndc.y, camera);
  if (r?.placed && api.selected && r.placed.uid === api.selected.uid) { dragging = true; canvas.setPointerCapture(e.pointerId); }
});
canvas.addEventListener("pointermove", (e) => {
  cam.toNdc(e, ndc);
  if (dragging) api.dragSelected(ndc.x, ndc.y, camera); else if (e.buttons === 0) api.hover(ndc.x, ndc.y, camera);
});
const endDrag = () => { if (dragging) { dragging = false; api.endDrag(); } };
canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
cam.ignore = () => dragging;
cam.attach(canvas);

function focus(id: HotspotId | null) {
  api.setFocus(id);
  if (!id) { cam.reset(); return; }
  const h = api.hotspots.find((x) => x.id === id); if (h) cam.focusOn(h.focus);
}
cam.onTap((e) => {
  cam.toNdc(e, ndc); const r = api.pick(ndc.x, ndc.y, camera);
  if (api.editing) { api.select(r?.placed?.uid ?? null); return; }
  if (r?.hotspot) focus(r.hotspot.id);
});

/* ---- controls */
const $ = (id: string) => document.getElementById(id) as HTMLElement;
const bar = $("bar");
const btn = (label: string, fn: () => void, id?: string) => { const b = document.createElement("button"); b.textContent = label; if (id) b.id = id; b.onclick = fn; bar.appendChild(b); return b; };
for (const h of api.hotspots) btn(h.label, () => focus(h.id), "f-" + h.id);
btn("Reset", () => focus(null), "reset");
btn("Top", () => cam.focusOn({ pos: new THREE.Vector3(0.01, 9, 0.01), target: new THREE.Vector3(0, 0.5, 0) }, 0.2), "top");
btn("Spin", () => cam.autoRotate(!cam.autoRotating), "spin");
btn("Edit", () => { api.setEditing(!api.editing); $("edit").classList.toggle("on", api.editing); }, "edit");
const sel = document.createElement("select"); sel.id = "catsel";
for (const d of api.catalog()) { const o = document.createElement("option"); o.value = d.id; o.textContent = `${d.cat}: ${d.name}`; sel.appendChild(o); } bar.appendChild(sel);
btn("Add", () => { api.add(sel.value); }, "add");
btn("<", () => api.moveSelected(-0.25, 0), "mL"); btn(">", () => api.moveSelected(0.25, 0), "mR"); btn("^", () => api.moveSelected(0, -0.25), "mU"); btn("v", () => api.moveSelected(0, 0.25), "mD");
btn("Rotate", () => api.rotateSelected(1), "rot");
btn("Recolor", () => { const p = api.selected; if (!p) return; const d = api.def(p.def)!; api.recolorSelected(d.colors[(d.colors.indexOf(p.color) + 1) % d.colors.length]); }, "recolor");
btn("Delete", () => api.deleteSelected(), "del");
btn("Undo", () => api.undo(), "undo"); btn("Redo", () => api.redo(), "redo");
btn("Photos", () => api.setPhotos(samplePhotos(9)), "photos");
const file = document.createElement("input"); file.type = "file"; file.accept = "image/*"; file.multiple = true; file.id = "file"; file.style.display = "none"; bar.appendChild(file);
async function refreshPhotos() { api.setPhotos(await photos.urls()); }
file.onchange = async () => { for (const f of Array.from(file.files ?? [])) { const r = await photos.addPhoto(f); if (!r.ok) alert(r.error); } await refreshPhotos(); };
btn("Add photo", () => file.click(), "addphoto");
refreshPhotos();
btn("Day", () => setHour(13), "day"); btn("Night", () => setHour(22), "night"); btn("Dusk", () => setHour(18.5), "dusk");
function setHour(h: number) { rig.setMood({ hour: h }); api.setMood({ hour: h }); }

function samplePhotos(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const c = document.createElement("canvas"); c.width = 640; c.height = 480; const g = c.getContext("2d")!;
    const gr = g.createLinearGradient(0, 0, 640, 480); gr.addColorStop(0, `hsl(${i * 40},80%,60%)`); gr.addColorStop(1, `hsl(${i * 40 + 60},80%,45%)`); g.fillStyle = gr; g.fillRect(0, 0, 640, 480);
    g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.arc(320, 200, 90, 0, 7); g.fill(); g.fillRect(180, 300, 280, 120); g.fillStyle = "#222"; g.font = "bold 64px sans-serif"; g.textAlign = "center"; g.fillText("#" + (i + 1), 320, 225);
    const url = c.toDataURL("image/jpeg", 0.8); out.push(url);
  }
  return out;
}

/* ---- loop */
let last = performance.now(); const v = new THREE.Vector3();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  cam.update(dt); api.setCameraPosition(camera.position); api.update(dt); rig.render(dt);
  requestAnimationFrame(frame);
}
if (!location.search.includes("manual")) requestAnimationFrame(frame);
setHour(13);
(window as any).__dormTest = {
  ready: true, api, camera: cam, renderer, THREE,
  info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }),
  screenOf(x: number, y: number, z: number) { v.set(x, y, z).project(camera); const r = canvas.getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height }; },
  setHour, focus, samplePhotos, photos, refreshPhotos,
  step(dt = 0.016) { cam.update(dt); api.setCameraPosition(camera.position); api.update(dt); rig.render(dt); },
};
