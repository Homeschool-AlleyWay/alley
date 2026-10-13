/** Shared render polish for the 3D scenes: device caps (phones), cool rim light, baked-feeling ambient occlusion decals, procedural wood / fabric textures and a vignette overlay. */
import * as THREE from "three";

export const smallScreen = () => { try { return Math.min(innerWidth, innerHeight) < 700 || /Mobi|Android/i.test(navigator.userAgent); } catch { return false; } };
/** pixel ratio cap: 2 on desktop, 1.5 on phones */
export const dprCap = () => Math.min(devicePixelRatio || 1, smallScreen() ? 1.5 : 2);
/** shadow map edge: 1024 on small screens */
export const shadowSize = (max = 2048) => (smallScreen() ? Math.min(1024, max) : max);

/** soft screen-edge darkening (a cheap CSS overlay, no post pass) */
export function vignette(host: HTMLElement, strength = 0.26) {
  const d = document.createElement("div"); d.setAttribute("aria-hidden", "true");
  d.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:1;background:radial-gradient(ellipse at 50% 46%,rgba(0,0,0,0) 58%,rgba(40,20,28,${strength}) 100%)`;
  try { if (getComputedStyle(host).position === "static") host.style.position = "relative"; } catch { /* none */ }
  host.appendChild(d); return d;
}

/** a cool, shadowless back light so edges separate from the warm key (warm / cool contrast) */
export function rimLight(scene: THREE.Scene, intensity = 0.45, pos: [number, number, number] = [10, 8, -14], color = "#b8d0ff") {
  const l = new THREE.DirectionalLight(color, intensity); l.position.set(...pos); scene.add(l); return l;
}

let aoTex: THREE.CanvasTexture | null = null;
function aoGradient() {
  if (aoTex) return aoTex; const c = document.createElement("canvas"); c.width = 4; c.height = 64; const g = c.getContext("2d")!, gr = g.createLinearGradient(0, 64, 0, 0);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,.45)"); gr.addColorStop(0.65, "rgba(255,255,255,.12)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
  aoTex = new THREE.CanvasTexture(c); aoTex.colorSpace = THREE.SRGBColorSpace; return aoTex;
}
export interface AoRect { x0: number; z0: number; x1: number; z1: number }
/** soft dark gradient strips on the floor where it meets walls / furniture: ONE merged mesh, one draw call. inward = strips inside the rect (room walls), else outside it (blocks, furniture). */
export function aoStrips(parent: THREE.Object3D, rects: AoRect[], o: { y?: number; width?: number; opacity?: number; inward?: boolean; color?: string } = {}) {
  const y = o.y ?? 0.03, w = o.width ?? 1.0, s = o.inward ? -1 : 1, pos: number[] = [], uv: number[] = [], idx: number[] = []; let n = 0;
  const quad = (ax: number, az: number, bx: number, bz: number, nx: number, nz: number) => {
    pos.push(ax, y, az, bx, y, bz, bx + nx * w, y, bz + nz * w, ax + nx * w, y, az + nz * w); uv.push(0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1);
    const flip = (bx - ax) * nz - (bz - az) * nx > 0; idx.push(...(flip ? [n, n + 2, n + 1, n, n + 3, n + 2] : [n, n + 1, n + 2, n, n + 2, n + 3])); n += 4;
  };
  for (const r of rects) { quad(r.x0, r.z0, r.x1, r.z0, 0, -s); quad(r.x0, r.z1, r.x1, r.z1, 0, s); quad(r.x0, r.z0, r.x0, r.z1, -s, 0); quad(r.x1, r.z0, r.x1, r.z1, s, 0); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: aoGradient(), color: o.color ?? "#2a1810", transparent: true, opacity: o.opacity ?? 0.34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.renderOrder = 1; m.frustumCulled = false; parent.add(m); return m;
}

const noiseCv = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, rep = 1) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 4; return t; };
/** wood grain colour map (long fibres along x) */
export function woodGrainTex(base = "#8a5a34", dark = "#5a3720", rep = 1) {
  return noiseCv(256, 128, (c) => {
    c.fillStyle = base; c.fillRect(0, 0, 256, 128); c.lineCap = "round";
    for (let i = 0; i < 70; i++) { const y = Math.random() * 128; c.strokeStyle = dark; c.globalAlpha = 0.05 + Math.random() * 0.12; c.lineWidth = 0.5 + Math.random() * 2; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(80, y + (Math.random() - 0.5) * 10, 170, y + (Math.random() - 0.5) * 10, 256, y + (Math.random() - 0.5) * 6); c.stroke(); }
    c.globalAlpha = 0.14; c.fillStyle = dark; for (let k = 0; k < 2; k++) { c.beginPath(); c.ellipse(40 + Math.random() * 170, 20 + Math.random() * 90, 10, 4, 0, 0, 7); c.fill(); } c.globalAlpha = 1;
  }, rep);
}
/** grayscale speckle for bumpMap: reads as woven fabric / felt */
export function fabricBumpTex(rep = 1) {
  return noiseCv(64, 64, (c) => { c.fillStyle = "#808080"; c.fillRect(0, 0, 64, 64); for (let i = 0; i < 900; i++) { const v = 90 + Math.random() * 90 | 0; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(Math.random() * 64, Math.random() * 64, 1.5, 1.5); } for (let i = 0; i < 64; i += 4) { c.fillStyle = "rgba(255,255,255,.09)"; c.fillRect(i, 0, 1, 64); c.fillRect(0, i, 64, 1); } }, rep);
}
