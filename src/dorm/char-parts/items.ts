/** Attachable parts: hats, glasses, head extras, body extras and the bag. Head parts live in unit-head space (R = 1). */
import * as THREE from "three";
import type { AvatarSpec } from "../../hall3d/avatar";
import { V, PI, sphereG, tube } from "./geo";
import { DIM, torsoR, bwOf, type Rig } from "./body";
import type { Ctx } from "./face";

type Out = THREE.Object3D[];
const mk = (out: Out) => (g: THREE.BufferGeometry, m: THREE.Material, p: THREE.Object3D, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; p.add(o); out.push(o); return o; };
const grp = (out: Out, p: THREE.Object3D, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); out.push(g); return g; };

export function buildHat(c: Ctx, r: Rig, spec: AvatarSpec, hatR: number): Out {
  const out: Out = [], h = spec.hat; if (h === "none" || !h) return out;
  const M = c.mat, col = spec.hatColor, seg = c.lod ? 28 : 14, G = grp(out, r.head), add = mk(out), s = hatR / 1.17;
  G.scale.setScalar(s);
  const cloth = M("cloth", col, { repeat: [3, 2] } as any), dk = spec.hat2 || new THREE.Color(col).offsetHSL(0, 0, -0.14).getStyle(), cl2 = M("cloth", dk, { side: THREE.DoubleSide } as any);
  const brim = (rad: number, a0 = PI, len = PI, m: THREE.Material = cl2) => new THREE.Mesh(new THREE.CircleGeometry(rad, 18, a0, len).rotateX(-PI / 2), m);
  const dome = (rad: number, th: number, m: THREE.Material = cloth) => new THREE.SphereGeometry(rad, seg, c.lod ? 16 : 8, 0, PI * 2, 0, th);
  if (h === "cap" || h === "visor") {
    const T = new THREE.Group(); T.rotation.x = -0.42; T.position.y = 0.04; G.add(T); out.push(T);
    if (h === "cap") { add(dome(1.17, 1.62), cloth, T); add(sphereG(0.07, 0.07, 0.07, 8, 6), M("cloth", dk), T, 0, 1.17, 0); }
    else add(new THREE.CylinderGeometry(1.1, 1.13, 0.34, seg, 1, true).translate(0, 0.02, 0), M("cloth", col, { side: THREE.DoubleSide } as any), T);
    const b = brim(0.62, PI, PI, M("cloth", dk, { side: THREE.DoubleSide, rough: 0.7 } as any)); b.position.set(0, h === "cap" ? 0.02 : 0.0, 1.04); b.rotation.x = 0.28; b.scale.set(1.05, 1.0, 1.0); T.add(b); out.push(b);
  } else if (h === "beanie") {
    const T = new THREE.Group(); T.rotation.x = -0.28; T.position.y = 0.0; G.add(T); out.push(T);
    const km = M("knit", col, { texture: "knit", repeat: [6, 3] } as any); add(dome(1.15, 1.7), km, T); add(new THREE.TorusGeometry(1.14, 0.17, 8, seg).rotateX(PI / 2), M("knit", dk, { texture: "knit", repeat: [8, 1] } as any), T, 0, -0.06, 0).scale.set(1, 1, 1); add(sphereG(0.3, 0.3, 0.3, 12, 8), M("knit", spec.shirt2, { texture: "knit" } as any), T, 0, 1.2, 0);
  } else if (h === "bucket") {
    add(new THREE.CylinderGeometry(1.12, 1.18, 0.55, seg, 1, true).translate(0, 0.5, 0), M("cloth", col, { side: THREE.DoubleSide } as any), G); add(new THREE.CircleGeometry(1.12, seg).rotateX(-PI / 2), cloth, G, 0, 0.78, 0);
    add(new THREE.CylinderGeometry(1.16, 1.62, 0.2, seg, 1, true), M("cloth", dk, { side: THREE.DoubleSide } as any), G, 0, 0.24, 0);
  } else if (h === "sunhat") {
    add(new THREE.CylinderGeometry(1.05, 1.15, 0.55, seg, 1, true).translate(0, 0.55, 0), M("cloth", "#f2dfb0", { texture: "weave", side: THREE.DoubleSide } as any), G); add(new THREE.CircleGeometry(1.05, seg).rotateX(-PI / 2), M("cloth", "#f2dfb0"), G, 0, 0.83, 0);
    add(new THREE.RingGeometry(1.1, 2.05, seg, 1).rotateX(-PI / 2), M("cloth", "#f2dfb0", { side: THREE.DoubleSide } as any), G, 0, 0.28, 0).rotation.x += 0.05; add(new THREE.TorusGeometry(1.12, 0.07, 6, seg).rotateX(PI / 2), cloth, G, 0, 0.42, 0);
  } else if (h === "beret") {
    const T = new THREE.Group(); T.rotation.z = -0.22; T.rotation.x = -0.18; T.position.set(0.05, 0.12, 0); G.add(T); out.push(T);
    add(sphereG(1.28, 0.46, 1.28, seg, 10), cloth, T, 0, 0.82, 0); add(new THREE.CylinderGeometry(1.08, 1.12, 0.12, seg, 1, true), cl2, T, 0, 0.5, 0); add(sphereG(0.06, 0.1, 0.06, 6, 5), cl2, T, 0, 1.28, 0);
  } else if (h === "bandana") {
    const dm = M("cloth", col, { texture: "dots", textureColor2: "#fff6ea", repeat: [3, 3], side: THREE.DoubleSide } as any);
    add(dome(1.14, 1.5), dm, G); add(new THREE.TorusGeometry(1.1, 0.06, 6, seg).rotateX(PI / 2), dm, G, 0, 0.12, 0); add(sphereG(0.17, 0.14, 0.14, 8, 6), dm, G, 0, 0.1, -1.1); for (const sd of [-1, 1]) add(new THREE.ConeGeometry(0.16, 0.5, 6).rotateX(PI), dm, G, sd * 0.14, -0.15, -1.15).rotation.z = sd * 0.35;
  } else if (h === "headband") {
    const T = new THREE.Group(); T.rotation.x = -0.25; G.add(T); out.push(T); add(new THREE.TorusGeometry(1.07, 0.09, 8, seg).rotateX(PI / 2), M("cloth", col), T, 0, 0.62, 0).scale.set(1, 1, 1.0);
  } else if (h === "bow") {
    const bm = M("cloth", col, { rough: 0.5 } as any), B = grp(out, G, 0.55, 1.0, 0.45); B.rotation.set(0.3, 0.3, -0.5);
    for (const sd of [-1, 1]) add(new THREE.ConeGeometry(0.34, 0.6, 8).rotateZ(-sd * PI / 2).translate(sd * 0.28, 0, 0), bm, B); add(sphereG(0.13, 0.13, 0.13, 8, 6), bm, B);
  } else if (h === "flower") {
    const F = grp(out, G, 0.75, 0.75, 0.5); F.rotation.set(0.25, 0.7, 0); for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; add(sphereG(0.18, 0.18, 0.06, 8, 6), M("plastic", col, { rough: 0.6 }), F, Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0); } add(sphereG(0.1, 0.1, 0.07, 8, 6), M("plastic", "#f5c542"), F, 0, 0, 0.03);
  } else if (h === "crown") {
    const gold = M("metal", "#eab94e", { rough: 0.25 }); add(new THREE.CylinderGeometry(0.95, 0.9, 0.28, seg, 1, true), M("metal", "#eab94e", { rough: 0.25, side: THREE.DoubleSide } as any), G, 0, 0.82, 0);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; add(new THREE.ConeGeometry(0.14, 0.4, 5), gold, G, Math.sin(a) * 0.93, 1.12 + 0.1, Math.cos(a) * 0.93); add(sphereG(0.05, 0.05, 0.05, 6, 5), M("plastic", i % 2 ? "#d9564a" : "#4f91c7", { rough: 0.1 }), G, Math.sin(a) * 0.93, 0.82, Math.cos(a) * 0.93 + 0.0).scale.multiplyScalar(1.0); }
  } else if (h === "headphones") {
    const m = M("plastic", col, { rough: 0.35 }); add(new THREE.TorusGeometry(1.2, 0.06, 6, 24, PI).rotateZ(0), m, G, 0, 0.0, 0).rotation.y = 0;
    for (const sd of [-1, 1]) { add(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 16).rotateZ(PI / 2), m, G, sd * 1.2, -0.05, 0.0); add(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 14).rotateZ(PI / 2), M("plastic", "#2b2b33"), G, sd * 1.32, -0.05, 0); }
  } else if (h === "catears") {
    const T = new THREE.Group(); T.rotation.x = -0.15; G.add(T); out.push(T); add(new THREE.TorusGeometry(1.07, 0.07, 6, seg).rotateX(PI / 2), M("plastic", col), T, 0, 0.62, 0);
    for (const sd of [-1, 1]) { const E = grp(out, T, sd * 0.68, 0.98, 0.0); E.rotation.z = -sd * 0.35; add(new THREE.ConeGeometry(0.34, 0.6, 3), M("cloth", col), E, 0, 0.28, 0); add(new THREE.ConeGeometry(0.2, 0.4, 3), M("plastic", "#f6b8c6", { rough: 0.7 }), E, 0, 0.2, 0.08); }
  }
  return out;
}

function lensShape(kind: string, w: number, h: number): THREE.Shape {
  const s = new THREE.Shape(), pts: [number, number][] = [], n = 20;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2; let x = Math.cos(a), y = Math.sin(a);
    if (kind === "square" || kind === "half") { const e = 0.35; x = Math.sign(x) * Math.pow(Math.abs(x), e); y = Math.sign(y) * Math.pow(Math.abs(y), e); x *= 1; y *= 0.8; }
    else if (kind === "cat") { x = Math.cos(a) * (1 + 0.15 * Math.max(0, Math.cos(a))); y = Math.sin(a) * 0.82 + Math.max(0, x) * 0.25 * (y > 0 ? 1 : 0.4); }
    pts.push([x * w, y * h]);
  }
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s;
}
export function buildGlasses(c: Ctx, r: Rig, spec: AvatarSpec): Out {
  const out: Out = [], kind = spec.glasses; if (!kind || kind === "none") return out;
  const M = c.mat, add = mk(out), G = grp(out, r.head), fm = M("plastic", spec.glassColor, { rough: 0.35 }), sun = kind === "sun", w = 0.4, h = 0.36;
  for (const sd of [-1, 1]) {
    const sh = lensShape(kind, w, h), hole = lensShape(kind, w * 0.84, h * 0.82);
    if (kind === "half") { /* thin frame on top only */ }
    const fs = new THREE.Shape(sh.getPoints(1)); fs.holes.push(new THREE.Path(hole.getPoints(1).reverse()));
    const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.05, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, -0.025);
    const L = grp(out, G, sd * 0.47, -0.04, 1.02); L.rotation.y = sd * 0.3;
    add(fg, fm, L); add(new THREE.ShapeGeometry(sh, 1), sun ? M("plastic", "#14181c", { rough: 0.1, opacity: 0.88, transparent: true } as any) : M("glass", "#cfe8ff", { opacity: 0.14, rough: 0.02 }), L, 0, 0, 0.0);
    add(tube([V(sd * 0.4, 0.03, 0.0), V(sd * 0.76, 0.0, -0.3), V(sd * 0.98, -0.02, -0.75)], 0.028, 0.025, 4, 2), fm, G, sd * 0.47 - sd * 0.0, -0.04, 1.02).position.set(0, 0, 0);
    G.children[G.children.length - 1].position.set(sd * 0.47 * 0 + sd * 0.0, -0.04, 1.02);
  }
  add(tube([V(-0.14, 0, 0), V(0, 0.06, 0.04), V(0.14, 0, 0)], 0.025, 0.025, 4, 2), fm, G, 0, -0.02, 1.05);
  return out;
}

/* ---------------------------------------------------------------- extras */
export function buildHeadExtra(c: Ctx, r: Rig, spec: AvatarSpec, hatR: number): Out {
  const out: Out = [], e = spec.extra, add = mk(out), M = c.mat, col = spec.extraColor; if (!e || e === "none") return out;
  if (!["halo", "horns", "bunny", "antlers", "unicorn", "antennae", "tiara", "flowercrown", "sparkles", "mask", "eyepatch"].includes(e)) return out;
  const G = grp(out, r.head); const s = e === "mask" || e === "eyepatch" ? 1 : hatR / 1.17; G.scale.setScalar(s);
  const gold = M("metal", col, { rough: 0.25 }), pm = M("plastic", col, { rough: 0.4 });
  if (e === "halo") { add(new THREE.TorusGeometry(0.62, 0.07, 8, 28).rotateX(PI / 2), M("emissive", col, { emissiveIntensity: 1.6 }), G, 0, 1.75, -0.05); }
  else if (e === "horns") for (const sd of [-1, 1]) { const H = grp(out, G, sd * 0.55, 0.98, 0.35); H.rotation.set(-0.25, 0, -sd * 0.55); add(new THREE.ConeGeometry(0.16, 0.55, 8).translate(0, 0.27, 0), M("plastic", col === "#eab94e" ? "#d6323a" : col, { rough: 0.35 }), H); }
  else if (e === "bunny") for (const sd of [-1, 1]) { const B = grp(out, G, sd * 0.4, 1.0, -0.1); B.rotation.set(0.1, 0, -sd * 0.25); add(sphereG(0.17, 0.62, 0.08, 10, 10).translate(0, 0.58, 0), M("cloth", col, { rough: 0.9, sheen: 1 } as any), B); add(sphereG(0.09, 0.45, 0.04, 8, 8).translate(0, 0.55, 0.06), M("plastic", "#f6b8c6", { rough: 0.8 }), B); }
  else if (e === "antlers") for (const sd of [-1, 1]) { const m = M("wood", "#8a5f3a", { rough: 0.7 }); add(tube([V(sd * 0.45, 0.95, 0), V(sd * 0.6, 1.35, -0.05), V(sd * 0.55, 1.75, -0.1)], 0.07, 0.04, 6, 2, true), m, G); add(tube([V(sd * 0.6, 1.3, -0.05), V(sd * 0.85, 1.45, -0.05), V(sd * 1.0, 1.7, -0.1)], 0.05, 0.03, 5, 2, true), m, G); add(tube([V(sd * 0.58, 1.55, -0.07), V(sd * 0.35, 1.7, -0.1), V(sd * 0.3, 1.95, -0.1)], 0.04, 0.025, 5, 2, true), m, G); }
  else if (e === "unicorn") { const U = grp(out, G, 0, 1.0, 0.55); U.rotation.x = 0.55; add(new THREE.ConeGeometry(0.14, 0.7, 10).translate(0, 0.35, 0), M("plastic", "#fff6ea", { rough: 0.25, clearcoat: 1 } as any), U); for (let i = 0; i < 4; i++) add(new THREE.TorusGeometry(0.115 - i * 0.025, 0.018, 5, 10).rotateX(PI / 2), pm, U, 0, 0.1 + i * 0.15, 0); }
  else if (e === "antennae") for (const sd of [-1, 1]) { add(tube([V(sd * 0.3, 1.0, 0.3), V(sd * 0.45, 1.5, 0.45), V(sd * 0.6, 1.8, 0.7)], 0.03, 0.025, 5, 2), M("plastic", "#2b2b33"), G); add(sphereG(0.13, 0.13, 0.13, 10, 8), pm, G, sd * 0.6, 1.85, 0.72); }
  else if (e === "tiara") { const T = grp(out, G, 0, 0.0, 0); T.rotation.x = -0.35; add(new THREE.TorusGeometry(1.1, 0.03, 5, 28, PI * 0.9).rotateX(PI / 2).rotateY(PI * 0.55), gold, T, 0, 0.72, 0); for (let i = -2; i <= 2; i++) { const a = i * 0.28, hgt = 0.22 - Math.abs(i) * 0.05; add(new THREE.ConeGeometry(0.06, hgt * 2, 4), gold, T, Math.sin(a) * 1.1, 0.78 + hgt, Math.cos(a) * 1.1); add(sphereG(0.04, 0.04, 0.04, 6, 5), M("plastic", "#e8789a", { rough: 0.1 }), T, Math.sin(a) * 1.1, 0.76 + hgt * 2.05, Math.cos(a) * 1.1); } }
  else if (e === "flowercrown") { const T = grp(out, G, 0, 0, 0); T.rotation.x = -0.2; for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2; add(sphereG(0.16, 0.14, 0.12, 8, 6), M("plastic", i % 3 === 0 ? col : i % 3 === 1 ? "#f6b294" : "#fff6ea", { rough: 0.6 }), T, Math.sin(a) * 1.08, 0.66, Math.cos(a) * 1.08); add(sphereG(0.07, 0.07, 0.05, 6, 5), M("plastic", "#f5c542"), T, Math.sin(a) * 1.12, 0.66, Math.cos(a) * 1.12); } add(new THREE.TorusGeometry(1.06, 0.04, 5, 24).rotateX(PI / 2), M("cloth", "#5e9c72"), T, 0, 0.64, 0); }
  else if (e === "sparkles") { const S = grp(out, G, 0, 0, 0); S.userData.spin = 0.6; for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; add(new THREE.OctahedronGeometry(0.1), M("emissive", i % 2 ? col : "#fff6c0", { emissiveIntensity: 1.5 }), S, Math.sin(a) * 1.7, 0.6 + Math.sin(a * 2) * 0.5, Math.cos(a) * 1.7); } }
  else if (e === "mask") { const mm = M("cloth", "#e8f0f4", { rough: 0.9 } as any); const g = new THREE.SphereGeometry(1.03, 20, 10, -0.9, 1.8, 1.65, 0.85); add(g, mm, G, 0, -0.1, 0.0); for (const sd of [-1, 1]) add(tube([V(sd * 0.85, -0.5, 0.55), V(sd * 1.1, -0.15, 0.0), V(sd * 1.0, 0.0, -0.25)], 0.02, 0.02, 4, 2), M("cloth", "#e8f0f4"), G); }
  else if (e === "eyepatch") { add(sphereG(0.38, 0.34, 0.1, 12, 8), M("leather", "#1d1318"), G, -0.47, -0.05, 1.0); add(tube([V(-0.75, 0.0, 0.8), V(-1.03, 0.1, 0.1), V(0, 0.55, -1.03), V(1.03, 0.2, -0.1), V(0.8, 0.12, 0.7)], 0.018, 0.018, 4, 3), M("leather", "#1d1318"), G); }
  return out;
}

export function buildBodyExtra(c: Ctx, r: Rig, spec: AvatarSpec, bw: number): Out {
  const out: Out = [], e = spec.extra, add = mk(out), M = c.mat, col = spec.extraColor, sp = r.spine; if (!e || e === "none") return out;
  const fz = (y: number) => 0.78 * (torsoR(y) + 0.03);
  if (e === "angelwings" || e === "butterfly") {
    for (const sd of [-1, 1]) {
      const W = grp(out, sp, sd * 0.06, 0.32, -0.16); W.rotation.set(0.15, sd * 0.5, sd * 0.25);
      if (e === "angelwings") for (let i = 0; i < 5; i++) add(sphereG(0.07, 0.34 - i * 0.04, 0.025, 8, 6).translate(sd * (0.08 + i * 0.11), 0.2 + i * 0.03 - i * i * 0.01, 0), M("cloth", "#fffaf0", { rough: 0.6 } as any), W).rotation.z = -sd * (0.55 + i * 0.12);
      else { add(sphereG(0.3, 0.28, 0.015, 14, 8), M("plastic", col, { rough: 0.5 }), W, sd * 0.3, 0.14, 0).rotation.z = sd * 0.5; add(sphereG(0.2, 0.2, 0.015, 12, 8), M("plastic", "#e8789a", { rough: 0.5 }), W, sd * 0.2, -0.16, 0).rotation.z = -sd * 0.4; }
    }
  } else if (e === "cape") { add(new THREE.CylinderGeometry(0.17 * bw, 0.33, 0.95, 20, 3, true, PI - 1.15, 2.3), M("cloth", col, { side: THREE.DoubleSide, rough: 0.8 } as any), sp, 0, -0.0, -0.01); add(new THREE.TorusGeometry(0.075, 0.025, 6, 14).rotateX(PI / 2), M("cloth", col), sp, 0, 0.47, 0); }
  else if (e === "foxtail") { const t = tube([V(0, -0.02, -0.12), V(0, -0.1, -0.32), V(0, 0.0, -0.5), V(0, 0.2, -0.55)], 0.07, 0.11, 8, 3); add(t, M("cloth", "#e07a3a", { sheen: 1 } as any), r.pelvis); add(sphereG(0.095, 0.1, 0.14, 10, 8), M("cloth", "#fffaf0"), r.pelvis, 0, 0.22, -0.56); }
  else if (e === "sash") { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 12; i++) { const a = -0.8 + (i / 12) * PI * 1.35, y = 0.4 - (i / 12) * 0.5; pts.push(V(Math.sin(a + 0.4) * (torsoR(y) + 0.028) * bw, y, Math.cos(a + 0.4) * (torsoR(y) + 0.028) * 0.78)); } add(tube(pts.slice(0, 8), 0.028, 0.028, 6, 2), M("cloth", col, { rough: 0.5 } as any), sp); }
  else if (e === "medal") { add(tube([V(-0.06, 0.46, 0.01), V(-0.03, 0.34, fz(0.34)), V(0, 0.25, fz(0.25))], 0.012, 0.012, 4, 2), M("cloth", "#d9564a"), sp); add(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 16).rotateX(PI / 2), M("metal", col, { rough: 0.2 }), sp, 0, 0.22, fz(0.22) + 0.01); }
  else if (e === "stethoscope") { add(tube([V(-0.06, 0.46, 0.0), V(-0.075, 0.38, fz(0.38)), V(-0.02, 0.25, fz(0.25)), V(0.03, 0.3, fz(0.3)), V(0.075, 0.38, fz(0.38)), V(0.06, 0.46, 0.0)], 0.011, 0.011, 4, 3), M("plastic", "#2b2b33"), sp); add(new THREE.CylinderGeometry(0.03, 0.03, 0.014, 14).rotateX(PI / 2), M("metal", "#c8ccd4", { rough: 0.2 }), sp, -0.02, 0.24, fz(0.24) + 0.01); }
  else if (e === "toolbelt") { add(new THREE.TorusGeometry(torsoR(0.0) + 0.02, 0.022, 6, 22).rotateX(PI / 2), M("leather", "#6a4a2f"), sp, 0, 0.0, 0).scale.set(bw, 1, 0.78); for (const [x, z, h] of [[0.12, 0.08, 0.12], [-0.12, 0.08, 0.1], [0.0, -0.12, 0.1]]) add(new THREE.BoxGeometry(0.06, h, 0.04), M("leather", "#8a5f3a"), sp, x * bw, -0.05, z); add(new THREE.BoxGeometry(0.014, 0.1, 0.014), M("metal", "#c8ccd4"), sp, 0.12 * bw, 0.04, 0.08); }
  else if (e === "bird") { const B = grp(out, r.shoulder[1], -0.01, 0.07, 0.01); add(sphereG(0.06, 0.055, 0.075, 10, 8), M("plastic", col === "#eab94e" ? "#4f91c7" : col, { rough: 0.6 }), B); add(sphereG(0.04, 0.04, 0.04, 8, 6), M("plastic", col === "#eab94e" ? "#4f91c7" : col, { rough: 0.6 }), B, 0, 0.06, 0.05); add(new THREE.ConeGeometry(0.015, 0.04, 5).rotateX(PI / 2), M("plastic", "#f0a23a"), B, 0, 0.06, 0.1); add(sphereG(0.008, 0.008, 0.008, 5, 4), M("plastic", "#111"), B, -0.025, 0.075, 0.08); add(sphereG(0.008, 0.008, 0.008, 5, 4), M("plastic", "#111"), B, 0.025, 0.075, 0.08); add(sphereG(0.012, 0.012, 0.06, 6, 5), M("plastic", "#3b6a9a"), B, 0, 0.0, -0.1); }
  return out;
}

/* ---------------------------------------------------------------- bag */
export function buildPack(c: Ctx, r: Rig, spec: AvatarSpec, bw: number): { group: THREE.Group; out: Out } {
  const out: Out = [], g = new THREE.Group(), M = c.mat, ps = spec.packStyle, col = spec.pack;
  r.spine.add(g); out.push(g);
  if (ps === "none" || !ps) return { group: g, out };
  const add = mk(out), body = M("cloth", col, { repeat: [2, 2], rough: 0.8 } as any), dk = M("cloth", spec.pack2 || new THREE.Color(col).offsetHSL(0, 0, -0.14).getStyle(), { repeat: [1, 1] } as any), strap = M("cloth", spec.pack2 || new THREE.Color(col).offsetHSL(0, 0, -0.1).getStyle(), { rough: 0.7 } as any), zip = M("metal", "#c8ccd4", { rough: 0.3 });
    const round = (geo: THREE.BoxGeometry, rad: number) => { const p = geo.attributes.position, hw = geo.parameters.width / 2 - rad, hh = geo.parameters.height / 2 - rad, hd = geo.parameters.depth / 2 - rad; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), cx = THREE.MathUtils.clamp(x, -hw, hw), cy = THREE.MathUtils.clamp(y, -hh, hh), cz = THREE.MathUtils.clamp(z, -hd, hd), dx = x - cx, dy = y - cy, dz = z - cz, l = Math.hypot(dx, dy, dz) || 1; p.setXYZ(i, cx + (dx / l) * rad, cy + (dy / l) * rad, cz + (dz / l) * rad); } geo.computeVertexNormals(); return geo; };
  if (ps === "pack" || ps === "mini") {
    const s = ps === "mini" ? 0.62 : 1, y = ps === "mini" ? 0.14 : 0.24, zc = -0.2 + (ps === "mini" ? 0.03 : 0);
    const b = add(round(new THREE.BoxGeometry(0.29 * s, 0.38 * s, 0.14 * s, c.lod ? 6 : 3, c.lod ? 6 : 3, c.lod ? 4 : 2), 0.045 * s), body, g, 0, y, zc); void b;
    add(round(new THREE.BoxGeometry(0.21 * s, 0.17 * s, 0.06, 4, 4, 2), 0.03), dk, g, 0, y - 0.08 * s, zc - 0.095 * s);                   // front pocket (visible from behind)
    add(new THREE.BoxGeometry(0.17 * s, 0.01, 0.012), zip, g, 0, y + 0.0, zc - 0.126 * s);
    add(new THREE.TorusGeometry(0.035, 0.01, 5, 10, PI).rotateZ(0), strap, g, 0, y + 0.19 * s, zc);
    for (const sd of [-1, 1]) add(tube([V(sd * 0.085 * bw, y + 0.17 * s, zc + 0.06), V(sd * 0.095 * bw, 0.47, -0.045), V(sd * 0.1 * bw, 0.42, 0.075), V(sd * 0.12 * bw, 0.3, 0.1), V(sd * 0.16 * bw, 0.16, 0.0), V(sd * 0.11 * bw, y - 0.17 * s, zc + 0.05)], 0.018, 0.018, 5, 3), strap, g);
  } else {
    // messenger: bag on the left hip, strap across the chest from the right shoulder
    add(round(new THREE.BoxGeometry(0.3, 0.22, 0.1, 6, 4, 3), 0.03), body, g, 0.2 * bw, -0.04, 0.0); add(round(new THREE.BoxGeometry(0.31, 0.1, 0.105, 4, 2, 2), 0.02), dk, g, 0.2 * bw, 0.03, 0.0);
    add(sphereG(0.014, 0.014, 0.008, 6, 4), M("metal", "#eab94e", { rough: 0.3 }), g, 0.2 * bw, 0.0, 0.055);
    const pts: THREE.Vector3[] = [V(-0.1 * bw, 0.46, 0.0), V(-0.12 * bw, 0.38, 0.1), V(0.0, 0.2, 0.125), V(0.12 * bw, 0.04, 0.12), V(0.22 * bw, 0.07, 0.06), V(0.22 * bw, 0.06, -0.06), V(0.0, 0.25, -0.13), V(-0.1 * bw, 0.4, -0.08), V(-0.1 * bw, 0.46, 0.0)];
    add(tube(pts, 0.017, 0.017, 5, 3), strap, g);
  }
  return { group: g, out };
}
export { bwOf, DIM };
