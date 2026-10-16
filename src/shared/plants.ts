/** Tall indoor greenery for every interior: fiddle-leaf ficus, areca palm, bamboo in a planter and wall-hung baskets. Taller than students (design units, ~metres, authored
 *  like AGE_H so the scene scale grows them with the room). Geometry/materials are built once and shared; each plant is two meshes (planter, foliage). */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { leafMat } from "./trees";

export type PlantKind = "ficus" | "palm" | "bamboo" | "hang";
/** total height of each kind in design units (adult = 1.84; hs = 1.68) */
export const PLANT_H: Record<PlantKind, number> = { ficus: 2.0, palm: 2.4, bamboo: 2.5, hang: 2.9 };
const hash = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
type Part = THREE.BufferGeometry;
const paint = (g: Part, col: (y: number, i: number) => THREE.Color) => { const ng = g.index ? g.toNonIndexed() : g, p = ng.getAttribute("position"), a = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const c = col(p.getY(i), i); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } ng.setAttribute("color", new THREE.BufferAttribute(a, 3)); if (!ng.getAttribute("uv")) ng.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(p.count * 2), 2)); ng.computeVertexNormals(); return ng; };
const flat = (hex: string) => { const c = new THREE.Color(hex); return () => c; };
const merge = (a: Part[]) => mergeGeometries(a, false)!;
const pot = (r: number, h: number, hex: string, rim = "#F2E3C6"): Part[] => [paint(new THREE.CylinderGeometry(r, r * 0.72, h, 16).translate(0, h / 2, 0), flat(hex)), paint(new THREE.CylinderGeometry(r * 1.06, r * 1.06, 0.06, 16).translate(0, h, 0), flat(rim)), paint(new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.04, 16).translate(0, h + 0.01, 0), flat("#4a3526"))];
const leaf = (len: number, wid: number, x: number, y: number, z: number, yaw: number, tilt: number, col: THREE.Color): Part => {
  const g = new THREE.SphereGeometry(0.5, 8, 6); g.scale(len, wid * 0.22, wid); g.translate(len / 2, 0, 0); g.rotateZ(tilt); g.rotateY(yaw); g.translate(x, y, z);
  return paint(g, (vy, i) => col.clone().multiplyScalar(0.8 + 0.3 * hash(i, 7) + Math.max(0, vy - y) * 0.15));
};
/** an arching frond: ribbon from the crown outwards and drooping at the tip */
const frond = (L: number, w: number, x: number, y: number, z: number, yaw: number, rise: number, col: THREE.Color): Part => {
  const seg = 6, pos: number[] = [], idx: number[] = [], uv: number[] = [];
  for (let j = 0; j <= seg; j++) { const u = j / seg, ax = u * L, ay = rise * Math.sin(u * 2.0) * L * 0.5 - u * u * L * 0.35, ww = w * Math.pow(Math.sin(Math.PI * Math.min(0.97, 0.08 + u * 0.88)), 0.7); for (const sd of [-1, 1]) { pos.push(ax, ay, sd * ww); uv.push(u, sd * 0.5 + 0.5); } }
  for (let j = 0; j < seg; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.rotateY(yaw); g.translate(x, y, z);
  return paint(g, (vy, i) => col.clone().multiplyScalar(0.78 + 0.34 * Math.min(1, Math.max(0, (vy - y + 0.4) / 1.2)) + 0.1 * hash(i, 3)));
};
const wood = "#7a5234";
function build(kind: PlantKind): { pot: Part; leaves: Part } {
  const P: Part[] = [], L: Part[] = [];
  if (kind === "ficus") {
    P.push(...pot(0.42, 0.62, "#C9825F")); P.push(paint(new THREE.CylinderGeometry(0.04, 0.07, 1.3, 7).translate(0, 0.66 + 0.65, 0), flat(wood)));
    for (let i = 0; i < 16; i++) { const k = i / 16, y = 1.0 + k * 1.0, a = i * 2.4, c = new THREE.Color(["#3F7F4E", "#4E9560", "#2F6B44", "#5BA06A"][i % 4]); L.push(leaf(0.62 - k * 0.14, 0.42, 0, y, 0, a, 0.5 - k * 0.5 + (i % 3) * 0.12, c)); }
    L.push(leaf(0.4, 0.3, 0, 2.0, 0, 0.6, 1.2, new THREE.Color("#6BB07A")));
  } else if (kind === "palm") {
    P.push(...pot(0.5, 0.7, "#B9825A", "#EAD7B8"));
    for (let i = 0; i < 11; i++) { const a = i * 2.4 + 0.3, c = new THREE.Color(["#3E8A50", "#4C9A5C", "#2F7A44"][i % 3]), L0 = 1.5 + (i % 4) * 0.22; P.push(paint(new THREE.CylinderGeometry(0.012, 0.02, 0.5, 4).translate(0, 0.95, 0).rotateZ(0.2).rotateY(a), flat("#6a8a4a"))); L.push(frond(L0, 0.2, Math.sin(a) * 0.04, 0.78 + (i % 3) * 0.28, Math.cos(a) * 0.04, a, 1.9 - (i % 3) * 0.25, c)); }
  } else if (kind === "bamboo") {
    P.push(paint(new THREE.BoxGeometry(0.95, 0.52, 0.95).translate(0, 0.26, 0), flat("#9BA09A")), paint(new THREE.BoxGeometry(1.02, 0.07, 1.02).translate(0, 0.55, 0), flat("#C9CCC4")), paint(new THREE.BoxGeometry(0.86, 0.04, 0.86).translate(0, 0.54, 0), flat("#4a3526")));
    for (let i = 0; i < 10; i++) {
      const a = i * 2.4, rr = 0.1 + (i % 4) * 0.08, x = Math.cos(a) * rr, z = Math.sin(a) * rr, h = 1.75 + hash(i, 4) * 0.75, lean = (hash(i, 5) - 0.5) * 0.1, c = new THREE.Color(i % 3 ? "#7DAE5A" : "#6A9C4E");
      P.push(paint(new THREE.CylinderGeometry(0.028, 0.034, h, 6).translate(0, h / 2 + 0.55, 0).rotateZ(lean).translate(x, 0, z), () => c));
      for (let n = 1; n < 6; n++) P.push(paint(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 6).translate(0, 0.55 + (h * n) / 6, 0).rotateZ(lean).translate(x, 0, z), flat("#56803c")));
      for (let n = 0; n < 3; n++) L.push(leaf(0.5, 0.12, x + lean * h * 0.9, 0.55 + h * (0.62 + n * 0.14), z, a + n * 2.1, -0.35, new THREE.Color("#5E9C48")));
    }
  } else {   // hang: wall bracket at the origin (wall behind, room towards +z), basket hanging from its tip with trailing vines
    const ay = 2.75, bz = 0.5;
    P.push(paint(new THREE.BoxGeometry(0.08, 0.3, 0.06).translate(0, ay, 0.03), flat("#3b3340")), paint(new THREE.CylinderGeometry(0.02, 0.02, bz, 6).rotateX(Math.PI / 2).translate(0, ay + 0.1, bz / 2), flat("#3b3340")));
    for (const sx of [-1, 1]) P.push(paint(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 4).rotateZ(sx * 0.35).translate(sx * 0.07, ay - 0.08, bz), flat("#8a7a60")));
    P.push(paint(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, ay - 0.25, bz), flat("#C9825F")));
    L.push(paint(new THREE.SphereGeometry(0.22, 8, 6).scale(1.1, 0.7, 1.1).translate(0, ay - 0.18, bz), (_, i) => new THREE.Color("#4E9560").multiplyScalar(0.8 + hash(i, 2) * 0.3)));
    for (let i = 0; i < 9; i++) { const a = i * 2.4, len = 0.55 + (i % 4) * 0.24, c = new THREE.Color(["#3F7F4E", "#5BA06A", "#2F6B44"][i % 3]);
      for (let n = 0; n < 6; n++) L.push(leaf(0.16, 0.1, Math.cos(a) * 0.16, ay - 0.3 - (len * n) / 6, bz + Math.sin(a) * 0.16, a, Math.PI / 2 - 0.4 + (n % 2) * 0.5, c)); }
  }
  return { pot: merge(P), leaves: merge(L) };
}
const kit = new Map<PlantKind, { pot: Part; leaves: Part }>();
let potM: THREE.MeshStandardMaterial | null = null;
export function makePlant(kind: PlantKind, seed = 0): THREE.Group {
  let k = kit.get(kind); if (!k) { k = build(kind); kit.set(kind, k); }
  const g = new THREE.Group(), a = new THREE.Mesh(k.pot, potM ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })), b = new THREE.Mesh(k.leaves, leafMat());
  a.castShadow = b.castShadow = true; a.receiveShadow = b.receiveShadow = true; g.add(a, b); if (kind !== "hang") g.rotation.y = seed * 1.7; g.userData.plant = kind; return g;
}
