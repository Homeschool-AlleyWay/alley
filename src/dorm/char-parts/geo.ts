/** Geometry helpers shared by the 3D character parts: tapered tubes, lathes, domes, merging. */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const PI = Math.PI;
export const lerp = THREE.MathUtils.lerp;
export const clamp = THREE.MathUtils.clamp;

/** seeded rng */
export function mkRng(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hashStr(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/** tapered tube along a smooth curve through pts. Adds attribute aT (0 root .. 1 tip). */
export function tube(pts: THREE.Vector3[], r0: number, r1: number, radial = 6, segsPer = 2, round = false): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal"), segs = Math.max(2, (pts.length - 1) * segsPer), fr = curve.computeFrenetFrames(segs, false);
  const pos: number[] = [], nor: number[] = [], aT: number[] = [], idx: number[] = [], p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; curve.getPointAt(t, p);
    let r = lerp(r0, r1, Math.pow(t, 0.9)); if (round) r *= Math.sqrt(Math.max(0.0001, 1 - Math.pow(Math.max(0, (t - 0.85) / 0.15), 2)));
    for (let j = 0; j <= radial; j++) { const a = (j / radial) * PI * 2, c = Math.cos(a), s = Math.sin(a); n.set(fr.normals[i].x * c + fr.binormals[i].x * s, fr.normals[i].y * c + fr.binormals[i].y * s, fr.normals[i].z * c + fr.binormals[i].z * s); pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r); nor.push(n.x, n.y, n.z); aT.push(t); }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("aT", new THREE.Float32BufferAttribute(aT, 1)); g.setIndex(idx);
  return g;
}

/** a shell that covers part of a unit head: theta from top (0) to thetaMax(phi); phi measured from the front (+z) around y. */
export function dome(tF: number, tS: number, tB: number, thick: number, nPhi = 28, nTh = 10, thMin = 0, aT0 = 0.5): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], aT: number[] = [], idx: number[] = [];
  for (let i = 0; i <= nPhi; i++) {
    const ph = -PI + (i / nPhi) * PI * 2, af = Math.abs(ph), sn = Math.pow(Math.sin(af), 2), tm = af < PI / 2 ? lerp(tF, tS, Math.sin(af)) : lerp(tB, tS, sn); // front..side..back
    for (let j = 0; j <= nTh; j++) {
      const s = j / nTh, th = thMin + s * Math.max(0.01, tm - thMin), r = 1 + thick * (1 - 0.35 * s), x = Math.sin(th) * Math.sin(ph), y = Math.cos(th), z = Math.sin(th) * Math.cos(ph);
      pos.push(x * r, y * r, z * r); nor.push(x, y, z); aT.push(aT0 + s * 0.5);
    }
  }
  for (let i = 0; i < nPhi; i++) for (let j = 0; j < nTh; j++) { const a = i * (nTh + 1) + j, b = a + nTh + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("aT", new THREE.Float32BufferAttribute(aT, 1)); g.setIndex(idx);
  return g;
}

/** lathe with an (r,y) profile; segments around. */
export function lathe(profile: [number, number][], seg = 20, phiStart = 0, phiLen = PI * 2) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg, phiStart, phiLen);
}
export function strip(g: THREE.BufferGeometry, keepUv = false) { g.deleteAttribute("uv"); if (!keepUv) g.deleteAttribute("uv"); return g; }
export const merge = (gs: THREE.BufferGeometry[]) => (gs.length ? mergeGeometries(gs, false) : null);
export function dispose(o: THREE.Object3D) { o.traverse((c: any) => { if (c.geometry && !c.geometry.userData.shared) c.geometry.dispose(); }); }
export const sphereG = (rx: number, ry: number, rz: number, w = 14, h = 10) => new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz);
