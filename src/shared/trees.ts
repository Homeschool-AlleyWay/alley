/** Detailed paper-style trees shared by every scene: layered foliage clumps with colour variation, tapered trunks with a procedural bark texture, branches, root flare,
 *  a soft shadow blob and a gentle wind sway. Four species (round oak, conifer, birch, palm). Geometry and materials are built once and shared; forests are instanced. */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { isPixar } from "./look";

export type Species = "oak" | "pine" | "birch" | "palm";
export interface TreeSpot { x: number; z: number; s: number; sp: Species; rot: number; tint: number }
/** trunk footprint radius (design units at s = 1), used for collision */
export const TREE_TRUNK_R: Record<Species, number> = { oak: 0.36, pine: 0.3, birch: 0.24, palm: 0.26 };
const sway = { time: { value: 0 } };
/** call once per frame with elapsed seconds */
export const tickTrees = (t: number) => { sway.time.value = t; };
const hash = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };

/* ---------------------------------------------------------------- procedural bark textures */
const cvTex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, rx = 1, ry = 1) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d")!); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t; };
function barkCanvas(sp: Species) {
  return (c: CanvasRenderingContext2D) => {
    const base = { oak: "#7a5234", pine: "#5b3d2b", birch: "#efe9dd", palm: "#a98a5c" }[sp]; c.fillStyle = base; c.fillRect(0, 0, 128, 256);
    if (sp === "birch") { c.fillStyle = "rgba(40,36,34,.8)"; for (let i = 0; i < 26; i++) { const x = hash(i, 1) * 128, y = hash(i, 2) * 256, w = 8 + hash(i, 3) * 26; c.fillRect(x, y, w, 3 + hash(i, 4) * 4); } c.fillStyle = "rgba(200,190,170,.5)"; for (let i = 0; i < 18; i++) c.fillRect(hash(i, 5) * 128, hash(i, 6) * 256, 2, 14 + hash(i, 7) * 18); return; }
    if (sp === "palm") { for (let y = 0; y < 256; y += 18) { c.fillStyle = "rgba(60,40,20,.55)"; c.fillRect(0, y, 128, 3); c.fillStyle = "rgba(255,235,190,.18)"; c.fillRect(0, y + 3, 128, 4); } return; }
    for (let i = 0; i < 70; i++) { const x = hash(i, 8) * 128, w = 2 + hash(i, 9) * 5, y = hash(i, 10) * 256, h = 40 + hash(i, 11) * 120; c.fillStyle = hash(i, 12) > 0.45 ? "rgba(30,18,10,.38)" : "rgba(255,225,180,.16)"; c.fillRect(x, y, w, h); c.fillRect(x - 128, y, w, h); }
    c.fillStyle = "rgba(20,12,8,.5)"; for (let i = 0; i < 8; i++) { c.beginPath(); c.ellipse(hash(i, 13) * 128, hash(i, 14) * 256, 3, 7, 0, 0, 7); c.fill(); }
  };
}
const barkMats = new Map<Species, THREE.MeshStandardMaterial>();
function barkMat(sp: Species) { let m = barkMats.get(sp); if (!m) { m = new THREE.MeshStandardMaterial({ map: cvTex(128, 256, barkCanvas(sp), 1, 2), roughness: 1, flatShading: !isPixar() }); barkMats.set(sp, m); } return m; }

/** foliage material: vertex colours (baked variation) times the per-instance tint, with a soft wind sway driven by height */
let leafM: THREE.MeshStandardMaterial | null = null;
export function leafMat() {
  if (leafM) return leafM;
  const m = leafM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: !isPixar(), side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = sway.time;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;").replace("#include <begin_vertex>", `#include <begin_vertex>
      vec3 ip = modelMatrix[3].xyz;
      #ifdef USE_INSTANCING
      ip += instanceMatrix[3].xyz;
      #endif
      float ph = ip.x * 0.37 + ip.z * 0.53, k = max(0.0, position.y) * 0.016;
      transformed.x += sin(uTime * 1.4 + ph + position.y * 0.6) * k;
      transformed.z += cos(uTime * 1.1 + ph * 1.3 + position.y * 0.5) * k * 0.8;`);
  };
  m.customProgramCacheKey = () => "treeSway";
  return m;
}

/* ---------------------------------------------------------------- geometry kit */
type Part = THREE.BufferGeometry;
const finish = (g: Part, col: (x: number, y: number, z: number, i: number) => THREE.Color) => {
  const ng = g.index ? g.toNonIndexed() : g; const p = ng.getAttribute("position"), a = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const c = col(p.getX(i), p.getY(i), p.getZ(i), i); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  ng.setAttribute("color", new THREE.BufferAttribute(a, 3)); if (!ng.getAttribute("uv")) ng.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
  ng.deleteAttribute("tangent" as never); return ng;
};
const white = new THREE.Color(1, 1, 1);
/** a lumpy foliage ball: displaced icosphere, darker underneath, lighter on top, speckled */
function clump(r: number, x: number, y: number, z: number, hex: string, seed: number, sy = 0.85): Part {
  const g = new THREE.IcosahedronGeometry(r, 1), p = g.getAttribute("position"); const base = new THREE.Color(hex);
  for (let i = 0; i < p.count; i++) { const k = 0.9 + hash(Math.round(p.getX(i) * 40) + seed, Math.round(p.getZ(i) * 40 + p.getY(i) * 17)) * 0.22; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * sy, p.getZ(i) * k); }
  g.translate(x, y, z); g.computeVertexNormals();
  return finish(g, (vx, vy, vz) => { const up = Math.max(-1, Math.min(1, (vy - y) / r)), sp = hash(Math.round(vx * 30) + seed, Math.round(vz * 30)); return base.clone().multiplyScalar(0.78 + up * 0.22 + sp * 0.14).offsetHSL((sp - 0.5) * 0.03, 0, 0); });
}
const cyl = (rt: number, rb: number, h: number, x: number, y: number, z: number, rx = 0, rz = 0, seg = 8): Part => { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 2); g.translate(0, h / 2, 0); g.rotateX(rx); g.rotateZ(rz); g.translate(x, y, z); return finish(g, () => white); };
const cone = (r: number, h: number, x: number, y: number, z: number, hex: string, seed: number, seg = 9): Part => { const g = new THREE.ConeGeometry(r, h, seg, 1); g.translate(x, y + h / 2, z); const b = new THREE.Color(hex); return finish(g, (vx, vy, vz) => { const t = (vy - y) / h; return b.clone().multiplyScalar(0.7 + t * 0.4 + hash(Math.round(vx * 20) + seed, Math.round(vz * 20)) * 0.12); }); };
/** root flare: a few low tilted roots plus a widened base */
const roots = (r: number, n = 5): Part[] => { const out: Part[] = [cyl(r * 1.15, r * 1.6, 0.22, 0, 0, 0, 0, 0, 9)]; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.4, g = new THREE.ConeGeometry(r * 0.5, r * 3.2, 5); g.rotateZ(Math.PI / 2 - 0.15); g.translate(r * 1.6, 0.05, 0); g.rotateY(a); out.push(finish(g, () => white)); } return out; };
const branch = (x: number, y: number, z: number, len: number, yaw: number, lift: number, r: number): Part => { const g = new THREE.CylinderGeometry(r * 0.5, r, len, 5); g.translate(0, len / 2, 0); g.rotateZ(-lift); g.rotateY(yaw); g.translate(x, y, z); return finish(g, () => white); };
const merge = (parts: Part[]) => mergeGeometries(parts, false)!;

const GREENS = ["#5E9C72", "#88B89A", "#3F7655", "#6DB085"], BIRCH_G = ["#A9C77A", "#8DB665", "#C4D688"], PINE_G = ["#2F6B4C", "#3F7655", "#285A44"];
function buildOak(): { trunk: Part; leaves: Part; h: number; r: number } {
  const t: Part[] = [cyl(0.1, 0.17, 1.55, 0, 0.1, 0, 0, 0, 9), ...roots(0.17)];
  for (let i = 0; i < 4; i++) t.push(branch(0, 1.0 + i * 0.12, 0, 0.8, i * 1.7 + 0.3, 0.8 + (i % 2) * 0.25, 0.05));
  const l: Part[] = [clump(0.92, 0, 2.15, 0, GREENS[0], 1)];
  for (let i = 0; i < 5; i++) { const a = i * 1.257 + 0.4; l.push(clump(0.55 + (i % 2) * 0.1, Math.cos(a) * 0.82, 1.78 + (i % 3) * 0.28, Math.sin(a) * 0.82, GREENS[(i + 1) % 4], 3 + i)); }
  l.push(clump(0.62, 0.12, 2.82, -0.05, GREENS[3], 9), clump(0.34, -0.55, 2.55, 0.5, GREENS[1], 11));
  return { trunk: merge(t), leaves: merge(l), h: 3.4, r: 1.5 };
}
function buildPine(): { trunk: Part; leaves: Part; h: number; r: number } {
  const t: Part[] = [cyl(0.06, 0.15, 1.5, 0, 0, 0, 0, 0, 7), ...roots(0.15, 4)], l: Part[] = [];
  for (let i = 0; i < 5; i++) l.push(cone(1.2 - i * 0.2, 1.05 - i * 0.04, 0, 0.7 + i * 0.68, 0, PINE_G[i % 3], 20 + i, 10));
  return { trunk: merge(t), leaves: merge(l), h: 4.4, r: 1.25 };
}
function buildBirch(): { trunk: Part; leaves: Part; h: number; r: number } {
  const t: Part[] = [cyl(0.07, 0.12, 2.5, 0, 0.08, 0, 0.03, 0.02, 8), ...roots(0.12, 4)];
  for (let i = 0; i < 5; i++) t.push(branch(0, 1.5 + i * 0.25, 0, 0.7, i * 1.3, 0.9, 0.035));
  const l: Part[] = [clump(0.55, 0, 3.0, 0, BIRCH_G[0], 31, 1.25), clump(0.46, 0.38, 2.45, 0.1, BIRCH_G[1], 32, 1.15), clump(0.44, -0.34, 2.3, -0.2, BIRCH_G[2], 33, 1.15), clump(0.38, 0.1, 3.6, 0.1, BIRCH_G[1], 34, 1.2), clump(0.34, -0.2, 2.9, 0.38, BIRCH_G[0], 35)];
  return { trunk: merge(t), leaves: merge(l), h: 4.0, r: 0.95 };
}
function buildPalm(): { trunk: Part; leaves: Part; h: number; r: number } {
  const t: Part[] = [...roots(0.13, 4)], N = 7; let px = 0, py = 0.1;
  for (let i = 0; i < N; i++) { const k = i / N, nx = px + 0.07 * (1 + k), g = cyl(0.1 - k * 0.025, 0.115 - k * 0.025, 0.5, px, py, 0, 0, -0.14); t.push(g); px = nx - 0.0; py += 0.49; }
  const l: Part[] = [], top = new THREE.Vector3(px, py, 0);
  for (let f = 0; f < 9; f++) {                                              // arching fronds: a bent ribbon with a pointed tip
    const yaw = (f / 9) * Math.PI * 2, L = 1.7 + (f % 3) * 0.2, seg = 7, pos: number[] = [], idx: number[] = [], col: number[] = [], uv: number[] = [];
    for (let j = 0; j <= seg; j++) { const u = j / seg, ar = u * L, ay = 0.55 * Math.sin(u * 2.2) * L * 0.5 - u * u * 0.9, w = 0.3 * Math.pow(Math.sin(Math.PI * Math.min(0.98, u * 0.92 + 0.06)), 0.8);
      for (const sd of [-1, 1]) { const c = new THREE.Color(f % 2 ? "#4C9A5C" : "#3E8A50").multiplyScalar(0.8 + u * 0.3); pos.push(ar, ay + Math.abs(sd) * 0, sd * w); col.push(c.r, c.g, c.b); uv.push(u, sd * 0.5 + 0.5); } }
    for (let j = 0; j < seg; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.rotateY(yaw); g.rotateZ(0); g.translate(top.x, top.y, top.z); const ng = g.toNonIndexed(); ng.computeVertexNormals(); l.push(ng);
  }
  l.push(clump(0.16, top.x, top.y + 0.05, 0, "#B07A3A", 41), clump(0.1, top.x + 0.14, top.y - 0.08, 0.06, "#8A5A2A", 42));
  return { trunk: merge(t), leaves: merge(l), h: py + 0.9, r: 1.8 };
}
const BUILD: Record<Species, () => { trunk: Part; leaves: Part; h: number; r: number }> = { oak: buildOak, pine: buildPine, birch: buildBirch, palm: buildPalm };
const kit = new Map<Species, { trunk: Part; leaves: Part; h: number; r: number }>();
export const treeKit = (sp: Species) => { let k = kit.get(sp); if (!k) { k = BUILD[sp](); kit.set(sp, k); } return k; };

/* ---------------------------------------------------------------- soft shadow blob (one shared texture/geometry) */
let blobT: THREE.CanvasTexture | null = null, blobG: THREE.PlaneGeometry | null = null;
const blob = () => { if (!blobT) { blobT = cvTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, "rgba(30,25,20,.55)"); g.addColorStop(0.6, "rgba(30,25,20,.22)"); g.addColorStop(1, "rgba(30,25,20,0)"); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }); blobG = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); } return { t: blobT!, g: blobG! }; };
let blobM: THREE.MeshBasicMaterial | null = null;
const blobMat = () => blobM ??= new THREE.MeshBasicMaterial({ map: blob().t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });

const tintOf = (t: number) => new THREE.Color(0.86 + 0.16 * t, 0.92 + 0.12 * hash(t * 77, 1), 0.78 + 0.26 * hash(t * 31, 2));

/** an instanced forest: one trunk mesh, one foliage mesh and one shadow-blob mesh per species used */
export function buildForest(spots: TreeSpot[], opts: { y?: number; shadows?: boolean } = {}): THREE.Group {
  const G = new THREE.Group(), y0 = opts.y ?? 0, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const by = new Map<Species, TreeSpot[]>(); for (const s of spots) { const a = by.get(s.sp); if (a) a.push(s); else by.set(s.sp, [s]); }
  for (const [sp, list] of by) {
    const k = treeKit(sp), n = list.length, tr = new THREE.InstancedMesh(k.trunk, barkMat(sp), n), lv = new THREE.InstancedMesh(k.leaves, leafMat(), n), sh = new THREE.InstancedMesh(blob().g, blobMat(), n);
    list.forEach((s, i) => {
      q.setFromEuler(e.set(0, s.rot, 0)); m4.compose(v.set(s.x, y0, s.z), q, sc.set(s.s, s.s * (0.92 + 0.16 * hash(i, 5)), s.s)); tr.setMatrixAt(i, m4); lv.setMatrixAt(i, m4); lv.setColorAt(i, tintOf(s.tint));
      m4.compose(v.set(s.x, y0 + 0.02, s.z), q.identity(), sc.set(k.r * 2.1 * s.s, 1, k.r * 2.1 * s.s)); sh.setMatrixAt(i, m4);
    });
    tr.castShadow = lv.castShadow = opts.shadows ?? true; tr.receiveShadow = lv.receiveShadow = true; sh.raycast = () => {}; sh.renderOrder = 1; tr.frustumCulled = lv.frustumCulled = sh.frustumCulled = false;
    G.add(tr, lv, sh);
  }
  return G;
}
/** one tree for a pot or planter, sharing the same geometry and materials */
export function singleTree(sp: Species, s = 1, seed = 0): THREE.Group {
  const g = new THREE.Group(), k = treeKit(sp), tr = new THREE.Mesh(k.trunk, barkMat(sp)), lv = new THREE.Mesh(k.leaves, leafMat());
  tr.castShadow = lv.castShadow = true; tr.receiveShadow = lv.receiveShadow = true; g.add(tr, lv); g.scale.setScalar(s); g.rotation.y = seed * 2.1; return g;
}
export const treeHeight = (sp: Species) => treeKit(sp).h;
