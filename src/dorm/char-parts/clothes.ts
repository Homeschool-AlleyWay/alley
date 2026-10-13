/** Clothing: tops (28 ids), bottoms, socks, shoes, neckwear, wrist items. Shapes are lathes/cylinders hugging the skin body. */
import * as THREE from "three";
import type { AvatarSpec } from "../../hall3d/avatar";
import type { MatKind } from "../types";
import { V, PI, lathe, sphereG, tube, lerp } from "./geo";
import { DIM, cylSeg, torsoR, type Rig } from "./body";
import type { Ctx } from "./face";

interface TopDef { m: MatKind; tex?: string; sl: 0 | 1 | 2; y0: number; puff: number; coll: string; slc?: boolean; flare?: number; open?: boolean; hood?: boolean; zip?: boolean; pocket?: boolean; trim?: boolean; under?: boolean; rough?: number }
const TOPS: Record<string, TopDef> = {
  tee: { m: "cloth", sl: 1, y0: -0.08, puff: 0.012, coll: "crew" }, tank: { m: "cloth", sl: 0, y0: -0.08, puff: 0.01, coll: "tank" }, henley: { m: "cloth", sl: 2, y0: -0.08, puff: 0.012, coll: "henley" },
  flannel: { m: "cloth", tex: "plaid", sl: 2, y0: -0.12, puff: 0.016, coll: "polo" }, sailor: { m: "cloth", tex: "stripes", sl: 1, y0: -0.08, puff: 0.012, coll: "sailor" },
  vneck: { m: "knit", sl: 2, y0: -0.1, puff: 0.018, coll: "v", trim: true }, cableknit: { m: "knit", tex: "cable", sl: 2, y0: -0.1, puff: 0.022, coll: "crew", trim: true }, argyle: { m: "knit", tex: "argyle", sl: 2, y0: -0.1, puff: 0.02, coll: "v", trim: true },
  fairisle: { m: "knit", tex: "fairisle", sl: 2, y0: -0.1, puff: 0.02, coll: "crew", trim: true }, cowl: { m: "knit", sl: 2, y0: -0.1, puff: 0.02, coll: "cowl", trim: true }, chunky: { m: "knit", sl: 2, y0: -0.12, puff: 0.036, coll: "crew", trim: true },
  ziphoodie: { m: "cloth", sl: 2, y0: -0.12, puff: 0.026, coll: "hood", hood: true, zip: true, pocket: true, trim: true }, hoodie: { m: "cloth", sl: 2, y0: -0.12, puff: 0.026, coll: "hood", hood: true, pocket: true, trim: true },
  sweater: { m: "knit", sl: 2, y0: -0.1, puff: 0.02, coll: "crew", trim: true }, varsity: { m: "cloth", sl: 2, y0: -0.12, puff: 0.026, coll: "rib", slc: true, trim: true, zip: true },
  denim: { m: "denim", sl: 2, y0: -0.1, puff: 0.02, coll: "jacket", pocket: true }, puffer: { m: "cloth", sl: 2, y0: -0.16, puff: 0.04, coll: "high", rough: 0.4 },
  raincoat: { m: "plastic", sl: 2, y0: -0.5, puff: 0.03, coll: "hood", hood: true, rough: 0.3, flare: 0.1 }, labcoat: { m: "cloth", sl: 2, y0: -0.5, puff: 0.026, coll: "lapel", open: true, pocket: true, under: true, flare: 0.04 },
  apron: { m: "cloth", sl: 1, y0: -0.08, puff: 0.012, coll: "crew", slc: true }, polo: { m: "cloth", sl: 1, y0: -0.08, puff: 0.012, coll: "polo" }, turtleneck: { m: "knit", sl: 2, y0: -0.08, puff: 0.014, coll: "turtle" },
  cardigan: { m: "knit", sl: 2, y0: -0.2, puff: 0.022, coll: "cardi", open: true, under: true, trim: true }, track: { m: "cloth", sl: 2, y0: -0.1, puff: 0.02, coll: "high", zip: true, trim: true, rough: 0.5 },
  jersey: { m: "cloth", tex: "stripes", sl: 1, y0: -0.14, puff: 0.02, coll: "v", trim: true }, blazer: { m: "cloth", sl: 2, y0: -0.2, puff: 0.022, coll: "lapel", open: true, under: true },
  longsleeve: { m: "cloth", sl: 2, y0: -0.08, puff: 0.012, coll: "crew", trim: true }, buttonup: { m: "cloth", sl: 2, y0: -0.12, puff: 0.014, coll: "polo" }, croptop: { m: "cloth", sl: 1, y0: 0.12, puff: 0.01, coll: "crew" },
  dress: { m: "cloth", sl: 1, y0: -0.52, puff: 0.01, coll: "crew", flare: 0.22, trim: true }, overalls: { m: "denim", sl: 1, y0: -0.08, puff: 0.012, coll: "crew", slc: true }, vest: { m: "cloth", sl: 0, y0: -0.1, puff: 0.02, coll: "v", under: true },
};
export const TOP_IDS = Object.keys(TOPS);

type Out = THREE.Object3D[];
const frontZ = (rr: number, x: number, bw: number) => 0.78 * rr * Math.sqrt(Math.max(0, 1 - Math.pow(x / (bw * rr), 2)));
/** push every vertex of a flat decal onto the (bw-wide, flattened) torso surface */
function fit(g: THREE.BufferGeometry, bw: number, puff: number, back = false) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), rr = torsoR(y) + puff; p.setZ(i, (back ? -1 : 1) * frontZ(rr, x, bw)); } g.computeVertexNormals(); return g; }
function shape(pts: [number, number][]) { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); return s; }
function heartShape(s: number) { const h = new THREE.Shape(); h.moveTo(0, -0.9 * s); h.bezierCurveTo(-1.5 * s, 0.1 * s, -0.6 * s, 1.1 * s, 0, 0.4 * s); h.bezierCurveTo(0.6 * s, 1.1 * s, 1.5 * s, 0.1 * s, 0, -0.9 * s); return h; }
function starShape(r: number) { const pts: [number, number][] = []; for (let i = 0; i < 10; i++) { const a = PI / 2 + (i * PI) / 5, rr = i % 2 ? r * 0.45 : r; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return shape(pts); }

export function buildTop(c: Ctx, r: Rig, spec: AvatarSpec, bw: number, bump = 0): Out {
  const d = TOPS[spec.top] ?? TOPS.tee, out: Out = [], M = c.mat, seg = c.lod ? 24 : 14, k = 1 + (bw - 1) * 0.6;
  const col = spec.shirt, col2 = spec.shirt2, pcol = spec.patColor || col2, tcol = spec.trim || col2, pat = spec.pattern !== "solid" ? spec.pattern : d.tex;
  const mainOpt = (rep: [number, number]) => ({ texture: pat || (d.m === "knit" ? "knit" : d.m === "denim" ? "denim" : undefined), textureColor2: spec.pattern !== "solid" ? pcol : pat === "plaid" || pat === "stripes" || pat === "argyle" || pat === "fairisle" ? col2 : undefined, repeat: rep, rough: d.rough, side: d.open ? THREE.DoubleSide : undefined });
  const main = (rep: [number, number] = [6, 3.5]) => M(d.m, col, mainOpt(rep) as any), trim = M(d.m === "plastic" ? "plastic" : d.m === "knit" ? "knit" : "cloth", tcol, { texture: d.m === "knit" ? "knit" : undefined, repeat: [3, 1] } as any);
  const sleeveMat = (rep: [number, number]) => (d.slc ? M(spec.top === "varsity" ? "leather" : "cloth", col2, { repeat: rep, texture: spec.top === "varsity" ? undefined : spec.pattern !== "solid" ? spec.pattern : undefined, textureColor2: spec.pattern !== "solid" ? pcol : col } as any) : main(rep));
  const add = (g: THREE.BufferGeometry, m: THREE.Material, p: THREE.Object3D, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; p.add(o); out.push(o); return o; };
  const sp = r.spine, P = d.puff + bump, lay = bump > 0;
  // body shell
  const y1 = d.coll === "tank" ? 0.37 : 0.472, prof: [number, number][] = [];
  const bottomY = spec.top === "overalls" ? -0.08 : d.y0;
  for (let y = bottomY; y <= y1 + 0.0001; y += 0.04) { const rr = torsoR(y) + P + (d.flare ?? 0) * Math.max(0, -y) * 1.0 + (spec.top === "puffer" ? 0.012 * Math.sin(((y - bottomY) / 0.09) * PI) : 0); prof.push([rr, y]); }
  if (d.coll === "turtle" || d.coll === "high") for (const [rr, y] of [[0.066, 0.52], [0.066, 0.56]] as [number, number][]) prof.push([rr + (d.coll === "high" ? 0.012 : 0), y]);
  const gap = d.open ? 0.3 : 0, body = lathe(prof, seg, gap, PI * 2 - 2 * gap);
  const under = !lay && (d.under || spec.top === "vest" || spec.top === "apron" || spec.top === "overalls");
  const tor = add(body, spec.top === "overalls" || spec.top === "apron" ? M("cloth", col2, { repeat: [6, 3.5] } as any) : main(), sp); tor.scale.set(bw, 1, DIM.torsoZ);
  if (d.open && under) { const ug = lathe(prof.map(([rr, y]) => [rr - 0.006 - P * 0.5, y] as [number, number]), seg), um = add(ug, M("cloth", col2, { repeat: [6, 3.5] } as any), sp); um.scale.set(bw, 1, DIM.torsoZ); }
  if (spec.top === "vest" && !lay) { /* long-sleeve shirt under the vest */ const ug = lathe(prof.map(([rr, y]) => [rr - 0.008, y] as [number, number]), seg); add(ug, M("cloth", col2, { repeat: [6, 3.5] } as any), sp).scale.set(bw, 1, DIM.torsoZ); }
  // hem / collar trims
  const ring = (rad: number, y: number, tubeR: number, m: THREE.Material, sx = bw, sz = DIM.torsoZ) => { const o = add(new THREE.TorusGeometry(rad, tubeR, 6, seg).rotateX(PI / 2), m, sp, 0, y, 0); o.scale.set(sx, 1, sz); return o; };
  if (d.trim && !d.open) ring(torsoR(bottomY) + P + (d.flare ?? 0) * -bottomY, bottomY, 0.016, trim);
  const nR = torsoR(y1) + P;
  switch (d.coll) {
    case "crew": case "rib": case "henley": case "sailor": ring(nR - 0.004, y1 - 0.002, 0.014, d.coll === "sailor" ? trim : spec.top === "tee" || spec.top === "apron" || spec.top === "overalls" ? M("cloth", col2) : trim); break;
    case "cowl": ring(nR + 0.02, y1 + 0.01, 0.034, main([3, 1]), 1, 1).position.y += 0.01; break;
    case "v": case "polo": case "jacket": case "lapel": case "cardi": {
      const vd = d.coll === "lapel" ? 0.2 : d.coll === "polo" ? 0.1 : d.coll === "cardi" ? 0.2 : 0.14, hw = d.coll === "lapel" ? 0.065 : 0.06;
      if (d.coll === "v") { const sk = M("skin", spec.skin); add(fit(new THREE.ShapeGeometry(shape([[-hw, y1 + 0.003], [hw, y1 + 0.003], [0, y1 - vd]])), bw, P + 0.002), sk, sp); for (const s of [-1, 1]) add(fit(tube([V(s * hw, y1, 0), V(s * hw * 0.5, y1 - vd * 0.5, 0), V(0, y1 - vd, 0)], 0.011, 0.011, 4, 1), bw, P + 0.006), trim, sp); }
      else if (d.coll === "polo" || d.coll === "jacket") { for (const s of [-1, 1]) add(fit(new THREE.ShapeGeometry(shape([[s * 0.01, y1 - 0.05], [s * 0.085, y1 + 0.003], [s * 0.02, y1 + 0.015]])), bw, P + 0.008), trim, sp); if (d.coll === "polo") { add(fit(new THREE.ShapeGeometry(shape([[-0.012, y1 - 0.09], [0.012, y1 - 0.09], [0.012, y1], [-0.012, y1]])), bw, P + 0.004), M("cloth", col2), sp); for (let b = 0; b < 2; b++) add(sphereG(0.007, 0.007, 0.004, 6, 4), M("plastic", "#fff6ea"), sp, 0, y1 - 0.03 - b * 0.04, frontZ(torsoR(y1 - 0.04) + P, 0, bw) + 0.006); } }
      else { const lm = d.coll === "cardi" ? trim : M("cloth", under && spec.top === "blazer" ? col : col, { repeat: [2, 2] } as any); for (const s of [-1, 1]) add(fit(new THREE.ShapeGeometry(shape([[s * 0.015, y1 - vd - 0.03], [s * 0.095, y1 - 0.01], [s * 0.04, y1 + 0.012], [s * 0.0, y1 - vd + 0.02]])), bw, P + 0.007), lm, sp); add(fit(new THREE.ShapeGeometry(shape([[-0.04, y1 + 0.01], [0.04, y1 + 0.01], [0, y1 - vd + 0.02]])), bw, P - 0.002), M("cloth", col2), sp); for (let b = 0; b < 3; b++) add(sphereG(0.01, 0.01, 0.005, 6, 4), M("plastic", spec.top === "cardigan" ? "#fff6ea" : "#2b2b33", { rough: 0.3 }), sp, 0.03, y1 - vd - 0.02 - b * 0.06, frontZ(torsoR(y1 - vd - b * 0.06) + P, 0.03, bw) + 0.006); }
      break; }
    case "turtle": ring(0.07, 0.575, 0.012, trim, 1, 1); break;
    case "high": ring(0.075, 0.572, 0.012, trim, 1, 1); break;
    case "hood": { const hd = add(sphereG(0.125, 0.1, 0.11, 14, 10), main([2, 2]), sp, 0, 0.5, -0.085); void hd; add(new THREE.TorusGeometry(0.075, 0.03, 6, 14).rotateX(PI / 2), main([2, 1]), sp, 0, 0.5, 0).scale.z = 1.0; for (const s of [-1, 1]) add(tube([V(s * 0.045, 0.44, 0.07), V(s * 0.05, 0.34, 0.1), V(s * 0.05, 0.26, 0.11)], 0.007, 0.007, 4, 1), trim, sp); break; }
    case "tank": for (const s of [-1, 1]) add(tube([V(s * 0.085 * bw, 0.35, 0.095), V(s * 0.098 * bw, 0.45, 0.04), V(s * 0.105 * bw, 0.475, -0.04), V(s * 0.09 * bw, 0.4, -0.1)], 0.02, 0.02, 5, 2), main([1, 1]), sp); break;
  }
  if (d.coll === "sailor") { const y = y1; for (const s of [-1, 1]) add(fit(new THREE.ShapeGeometry(shape([[s * 0.02, y - 0.12], [s * 0.1, y + 0.01], [s * 0.04, y + 0.02], [0, y - 0.02]])), bw, P + 0.006), trim, sp); add(sphereG(0.035, 0.02, 0.012, 6, 5), M("cloth", "#d9564a"), sp, 0, y - 0.1, frontZ(torsoR(y - 0.1) + P, 0, bw) + 0.006); }
  if (d.zip) add(fit(tube([V(0, y1 - 0.02, 0), V(0, 0.2, 0), V(0, bottomY, 0)], 0.007, 0.007, 4, 3), bw, P + 0.005), M("metal", "#c8ccd4", { rough: 0.3 }), sp);
  if (d.pocket && !d.open) { const pm = add(fit(new THREE.ShapeGeometry(shape([[-0.075, 0.12], [0.075, 0.12], [0.085, -0.03], [-0.085, -0.03]])), bw, P + 0.004), main([1.5, 1]), sp); void pm; }
  if (d.pocket && d.open) for (const s of [-1, 1]) add(fit(new THREE.ShapeGeometry(shape([[s * 0.04, 0.05], [s * 0.1, 0.05], [s * 0.1, 0.0], [s * 0.04, 0.0]])), bw, P + 0.004), M("cloth", col, { repeat: [1, 1] } as any), sp);
  if (spec.top === "puffer") for (let y = bottomY + 0.07; y < 0.4; y += 0.09) ring(torsoR(y) + P + 0.014, y, 0.009, M("cloth", col, { rough: 0.5 } as any));
  if (spec.top === "denim") for (const s of [-1, 1]) add(fit(new THREE.ShapeGeometry(shape([[s * 0.05, 0.3], [s * 0.115, 0.3], [s * 0.115, 0.23], [s * 0.05, 0.23]])), bw, P + 0.004), trim, sp);
  if (spec.top === "henley") for (let b = 0; b < 3; b++) add(sphereG(0.008, 0.008, 0.004, 6, 4), M("plastic", "#fff6ea"), sp, 0, y1 - 0.03 - b * 0.04, frontZ(torsoR(y1 - 0.04) + P, 0, bw) + 0.006);
  if (spec.top === "flannel") for (let b = 0; b < 4; b++) add(sphereG(0.008, 0.008, 0.004, 6, 4), M("plastic", "#fff6ea"), sp, 0, y1 - 0.04 - b * 0.07, frontZ(torsoR(y1 - 0.04) + P, 0, bw) + 0.006);
  if (spec.top === "track" || spec.top === "jersey") for (const s of [-1, 1]) add(tube([V(s * 0.152 * bw, 0.4, 0), V(s * 0.15 * bw, 0.2, 0), V(s * 0.14 * bw, bottomY, 0)], 0.014, 0.014, 4, 2), trim, sp);
  // apron / overalls front panel
  if (spec.top === "apron") { const ap = [] as [number, number][]; for (let y = 0.3; y >= -0.46; y -= 0.05) ap.push([torsoR(y) + 0.03 + Math.max(0, -y) * 0.1, y]); const a = add(lathe(ap, 14, -0.75, 1.5), M("cloth", col, { repeat: [3, 3], texture: pat, textureColor2: col2 } as any), sp); a.scale.set(bw, 1, DIM.torsoZ); for (const s of [-1, 1]) add(tube([V(s * 0.07 * bw, 0.28, 0.12), V(s * 0.08 * bw, 0.42, 0.08), V(s * 0.06, 0.5, -0.02)], 0.011, 0.011, 4, 2), M("cloth", col), sp); add(tube([V(-0.15 * bw, 0.0, -0.1), V(0, 0.01, -0.145), V(0.15 * bw, 0.0, -0.1)], 0.012, 0.012, 4, 2), M("cloth", col), sp); }
  if (spec.top === "overalls") { const ap = [] as [number, number][]; for (let y = 0.36; y >= 0.0; y -= 0.05) ap.push([torsoR(y) + 0.02, y]); const a = add(lathe(ap, 12, -0.7, 1.4), M("denim", col, { texture: "denim" } as any), sp); a.scale.set(bw, 1, DIM.torsoZ); for (const s of [-1, 1]) add(tube([V(s * 0.08 * bw, 0.34, 0.1), V(s * 0.09 * bw, 0.46, 0.03), V(s * 0.1 * bw, 0.4, -0.1)], 0.016, 0.016, 5, 2), M("denim", col, { texture: "denim" } as any), sp); for (const s of [-1, 1]) add(sphereG(0.014, 0.014, 0.006, 6, 4), M("metal", "#eab94e", { rough: 0.3 }), sp, s * 0.08 * bw, 0.34, frontZ(torsoR(0.34) + 0.02, s * 0.08 * bw, bw) + 0.008); }
  if (spec.top === "labcoat" || spec.top === "raincoat") for (let b = 0; b < 3; b++) add(sphereG(0.01, 0.01, 0.005, 6, 4), M("plastic", spec.top === "raincoat" ? "#fff6ea" : "#9da7aa", { rough: 0.3 }), sp, 0.0, 0.12 - b * 0.14, frontZ(torsoR(0.12 - b * 0.14) + P + (d.flare ?? 0) * Math.max(0, -(0.12 - b * 0.14)), 0, bw) + 0.008);
  // sleeves
  if (d.sl > 0 || spec.top === "overalls") {
    const sl = d.sl || 1, rep: [number, number] = [2.4, 2.4], sm = sleeveMat(rep);
    for (let i = 0; i < 2; i++) {
      const sh = r.shoulder[i], el = r.elbow[i], pf = P * 0.55 + 0.003;
      add(sphereG(0.05 * k + pf, 0.05 * k + pf, 0.05 * k + pf, 12, 8), spec.top === "overalls" ? M("cloth", col2) : sm, sh);
      add(cylSeg((0.05 * k + pf), (0.043 * k + pf) - (sl === 1 ? 0.0 : 0), sl === 1 ? DIM.upper * 0.5 : DIM.upper, 12).translate(0, 0, 0), spec.top === "overalls" ? M("cloth", col2) : sm, sh);
      if (sl === 2) { add(sphereG(0.043 * k + pf, 0.043 * k + pf, 0.043 * k + pf, 10, 8), sm, el); add(cylSeg(0.042 * k + pf, 0.034 * k + pf + (d.trim ? 0.004 : 0), DIM.fore * 0.96, 12), sm, el); if (d.trim || spec.top === "denim" || spec.top === "labcoat") add(new THREE.TorusGeometry(0.036 * k + pf, 0.011, 6, 12).rotateX(PI / 2), trim, el, 0, -DIM.fore * 0.96, 0); }
      else if (sl === 1 && d.trim) add(new THREE.TorusGeometry(0.045 * k + pf, 0.009, 6, 12).rotateX(PI / 2), trim, sh, 0, -DIM.upper * 0.5, 0);
    }
  }
  // emblem
  if (spec.emblem !== "none" || spec.top === "varsity") {
    const em = spec.emblem !== "none" ? spec.emblem : "star", mm = M("cloth", spec.top === "varsity" ? "#fff6ea" : col2 === col ? "#fff6ea" : col2, { rough: 0.8 } as any), gs: THREE.BufferGeometry[] = [];
    let sh: THREE.Shape | null = null;
    if (em === "heart") sh = heartShape(0.032); else if (em === "star") sh = starShape(0.05); else if (em === "bolt") sh = shape([[0.01, 0.05], [-0.03, -0.005], [0, -0.005], [-0.012, -0.05], [0.032, 0.01], [0.003, 0.01]]); else if (em === "paw") { sh = new THREE.Shape(); sh.absarc(0, -0.012, 0.024, 0, PI * 2, false); for (const [x, y] of [[-0.036, 0.018], [-0.013, 0.04], [0.013, 0.04], [0.036, 0.018]]) { const q = new THREE.Path(); void q; } } else if (em === "smile") { sh = new THREE.Shape(); sh.absarc(0, 0, 0.04, 0, PI * 2, false); }
    if (sh) {
      const g = new THREE.ShapeGeometry(sh, 8).translate(spec.top === "varsity" ? 0.07 : 0.0, spec.top === "varsity" ? 0.3 : 0.27, 0); gs.push(fit(g, bw, P + 0.005));
      if (em === "paw") for (const [x, y] of [[-0.036, 0.018], [-0.013, 0.04], [0.013, 0.04], [0.036, 0.018]]) gs.push(fit(new THREE.CircleGeometry(0.011, 8).translate(x, y + 0.27, 0), bw, P + 0.005));
      if (em === "smile") { for (const x of [-0.014, 0.014]) gs.push(fit(new THREE.CircleGeometry(0.006, 6).translate(x, 0.285, 0), bw, P + 0.007)); gs.push(fit(new THREE.TorusGeometry(0.022, 0.004, 4, 8, PI).rotateZ(PI).translate(0, 0.265, 0), bw, P + 0.007)); }
      gs.forEach((g, i) => add(g, i && em === "smile" ? M("plastic", "#4a3b3f") : em === "smile" ? M("plastic", "#eab94e") : mm, sp));
    }
  }
  return out;
}

/** neckwear, scarf, badge */
export function buildNeck(c: Ctx, r: Rig, spec: AvatarSpec, bw: number): Out {
  const out: Out = [], M = c.mat, sp = r.spine, d = TOPS[spec.top] ?? TOPS.tee, od = spec.outer && spec.outer !== "none" ? TOPS[spec.outer] : null, P = od ? od.puff + 0.02 : d.puff;
  const add = (g: THREE.BufferGeometry, m: THREE.Material, p: THREE.Object3D = sp, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; p.add(o); out.push(o); return o; };
  const nk = spec.neckwear, nc = spec.neckColor, fz = (y: number, x = 0) => frontZ(torsoR(y) + P, x, bw);
  if (nk === "tie") { add(fit(new THREE.ShapeGeometry(shape([[-0.02, 0.43], [0.02, 0.43], [0.03, 0.2], [0, 0.14], [-0.03, 0.2]])), bw, P + 0.012), M("cloth", nc, { rough: 0.5 } as any)); add(sphereG(0.026, 0.02, 0.016, 8, 6), M("cloth", nc), sp, 0, 0.44, fz(0.44) + 0.012); }
  else if (nk === "bowtie") { for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.035, 0.07, 6).rotateZ(-s * PI / 2).translate(s * 0.035, 0, 0), M("cloth", nc), sp, 0, 0.45, fz(0.45) + 0.014); add(sphereG(0.016, 0.016, 0.014, 6, 5), M("cloth", nc), sp, 0, 0.45, fz(0.45) + 0.015); }
  else if (nk === "bandana") { const g = new THREE.ConeGeometry(0.1, 0.12, 4, 1, true).rotateY(PI / 4).rotateX(PI); add(g, M("cloth", nc, { texture: "dots", textureColor2: "#fff6ea", repeat: [2, 2], side: THREE.DoubleSide } as any), sp, 0, 0.4, fz(0.4) + 0.025).scale.set(1, 1, 0.5); add(new THREE.TorusGeometry(0.08, 0.014, 6, 14).rotateX(PI / 2), M("cloth", nc), sp, 0, 0.47, 0).scale.set(1, 1, 1); }
  else if (nk === "lanyard") { add(fit(tube([V(-0.06, 0.465, 0), V(-0.03, 0.34, 0), V(0, 0.2, 0)], 0.007, 0.007, 4, 3), bw, P + 0.008), M("cloth", nc), sp); add(fit(tube([V(0.06, 0.465, 0), V(0.03, 0.34, 0), V(0, 0.2, 0)], 0.007, 0.007, 4, 3), bw, P + 0.008), M("cloth", nc), sp); add(fit(new THREE.PlaneGeometry(0.06, 0.08).translate(0, 0.16, 0), bw, P + 0.01), M("paper", "#fffaf2"), sp); }
  else if (nk === "necklace") { add(new THREE.TorusGeometry(0.075, 0.005, 5, 18).rotateX(PI / 2.2), M("metal", nc, { rough: 0.25 }), sp, 0, 0.455, 0.02); add(sphereG(0.014, 0.014, 0.008, 8, 6), M("metal", nc, { rough: 0.25 }), sp, 0, 0.4, fz(0.4) + 0.01); }
  if (spec.scarf) { const sm = M("knit", spec.scarf, { texture: "knit", repeat: [3, 1] } as any); add(new THREE.TorusGeometry(0.085, 0.034, 8, 18).rotateX(PI / 2), sm, sp, 0, 0.47, 0).scale.set(1.05, 1, 1.05); add(new THREE.BoxGeometry(0.07, 0.24, 0.025).translate(0, -0.12, 0), sm, sp, 0.05, 0.46, fz(0.4) + 0.025).rotation.z = 0.05; }
  if (spec.badge) { add(fit(new THREE.CircleGeometry(0.03, 12).translate(-0.085 * bw, 0.28, 0), bw, P + 0.008), M("plastic", spec.badge), sp); add(fit(new THREE.CircleGeometry(0.017, 10).translate(-0.085 * bw, 0.28, 0), bw, P + 0.011), M("plastic", "#fff6ea"), sp); }
  return out;
}

export function buildWrist(c: Ctx, r: Rig, spec: AvatarSpec): Out {
  const out: Out = []; if (spec.wrist === "none" || !(spec.age === "g68" || spec.age === "hs" || spec.age === "adult")) return out;
  const M = c.mat, col = spec.wristColor, el = r.wrist[0], add = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); el.add(o); out.push(o); return o; };
  const y = -0.012;
  if (spec.wrist === "bracelet") add(new THREE.TorusGeometry(0.04, 0.007, 6, 14).rotateX(PI / 2), M("metal", col, { rough: 0.25 }), 0, y, 0);
  else if (spec.wrist === "watch") { add(new THREE.TorusGeometry(0.04, 0.009, 6, 14).rotateX(PI / 2), M("leather", "#4a3b3f"), 0, y, 0); add(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 14).translate(0, 0, 0), M("metal", col, { rough: 0.25 }), 0.0, y, 0.04).rotation.x = PI / 2; add(new THREE.CircleGeometry(0.02, 14), M("glass", "#202830", { opacity: 0.95 }), 0, y, 0.047); }
  else if (spec.wrist === "beads") for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2; add(sphereG(0.009, 0.009, 0.009, 6, 5), M("plastic", i % 2 ? col : "#fff6ea"), Math.cos(a) * 0.04, y, Math.sin(a) * 0.04); }
  else add(new THREE.CylinderGeometry(0.042, 0.042, 0.032, 14, 1, true), M("cloth", col, { side: THREE.DoubleSide } as any), 0, y, 0);
  return out;
}

/* ------------------------------------------------------------ bottoms, socks, shoes */
export function buildBottom(c: Ctx, r: Rig, spec: AvatarSpec, bw: number): Out {
  const out: Out = [], M = c.mat, k = 1 + (bw - 1) * 0.6, top = spec.top, seg = c.lod ? 22 : 12;
  if (top === "dress") return out;
  const over = top === "overalls", id = over ? "pants" : spec.bottom, col = over ? spec.shirt : spec.pants;
  const skirtIds = ["skirt", "pleated", "tutu", "kilt", "minikirt"], pp = !over && spec.pantsPattern && spec.pantsPattern !== "solid" ? spec.pantsPattern : "", kind: MatKind = id === "jeans" || over ? "denim" : "cloth", m = M(kind, col, { texture: pp || (id === "jeans" || over ? "denim" : id === "kilt" ? "plaid" : undefined), textureColor2: pp ? spec.pantsPatColor || spec.shirt2 : id === "kilt" ? spec.shirt2 : undefined, repeat: [3, 3], rough: id === "leggings" || id === "bike" ? 0.55 : undefined, side: skirtIds.includes(id) ? THREE.DoubleSide : undefined } as any);
  const add = (g: THREE.BufferGeometry, mm: THREE.Material, p: THREE.Object3D, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, mm); o.position.set(x, y, z); o.castShadow = true; p.add(o); out.push(o); return o; };
  const skirt = skirtIds.includes(id);
  const waist = [] as [number, number][];
  if (!skirt) {
    // the waist stops just above the top's hem and sits inside it, then widens to enclose the thighs: nothing near-coincides with the tee or the leg tops, so no flaps or zig-zags show
    const yTop = THREE.MathUtils.clamp((TOPS[top]?.y0 ?? -0.08) + 0.06, -0.12, 0.04), T = id === "leggings" || id === "bike" ? 0.158 : 0.168, rw = (y: number) => torsoR(y) + 0.003 + Math.max(0, T - torsoR(y) - 0.003) * THREE.MathUtils.smoothstep(-y, 0.08, 0.1) - 0.01 * THREE.MathUtils.smoothstep(-y, 0.11, 0.15);
    for (let y = -0.15; y <= yTop + 1e-4; y += 0.04) waist.push([rw(y), y]);
    if (waist[waist.length - 1][1] < yTop - 0.005) waist.push([rw(yTop), yTop]);
    add(lathe(waist, seg), m, r.pelvis).scale.set(bw, 1, DIM.torsoZ); if (spec.pantsTrim && waist.length) add(new THREE.TorusGeometry(waist[waist.length - 1][0] + 0.002, 0.009, 6, seg).rotateX(PI / 2), M("cloth", spec.pantsTrim), r.pelvis, 0, waist[waist.length - 1][1], 0).scale.set(bw, 1, DIM.torsoZ); }
  if (skirt) {
    const hem = id === "tutu" ? -0.14 : id === "minikirt" ? -0.17 : id === "skirt" ? -0.3 : id === "kilt" ? -0.32 : -0.34, fl = id === "skirt" || id === "minikirt" ? 0.17 : id === "tutu" ? 0.0 : id === "kilt" ? 0.12 : 0.16;
    if (id === "tutu") { for (let j = 0; j < 3; j++) { const pr: [number, number][] = [[torsoR(0.02) + 0.012, 0.04 - j * 0.015], [0.2 + j * 0.035, -0.07 - j * 0.04], [0.26 + j * 0.04, -0.13 - j * 0.05]]; add(lathe(pr, 20), M("cloth", j % 2 ? spec.pants : new THREE.Color(spec.pants).offsetHSL(0, 0, 0.1).getStyle(), { side: THREE.DoubleSide, rough: 0.7 } as any), r.pelvis).scale.set(bw, 1, 0.95); } add(lathe([[torsoR(0.02) + 0.016, 0.05], [torsoR(0.02) + 0.016, -0.02]], seg), M("cloth", spec.shirt2), r.pelvis).scale.set(bw, 1, DIM.torsoZ); }
    else {
      const pr: [number, number][] = []; for (let y = hem; y <= 0.04 + 1e-4; y += 0.04) pr.push([torsoR(y) + 0.012 + fl * Math.pow(Math.max(0, 0.04 - y) / (0.04 - hem), 1.0), y]);
      const g = lathe(pr, id === "skirt" || id === "minikirt" ? seg : 36);
      if (id === "pleated" || id === "kilt") { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(x, z), t = THREE.MathUtils.clamp((0.04 - y) / (0.04 - hem), 0, 1), f = 1 + 0.07 * Math.cos(a * 12) * t; p.setX(i, x * f); p.setZ(i, z * f); } g.computeVertexNormals(); }
      add(g, m, r.pelvis).scale.set(bw, 1, 0.9);
      if (spec.pantsTrim) { const rr0 = pr[0][0]; add(new THREE.TorusGeometry(rr0, 0.01, 6, 28).rotateX(PI / 2), M("cloth", spec.pantsTrim), r.pelvis, 0, hem, 0).scale.set(bw, 1, 0.9); }
      if (id === "kilt") add(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 8).rotateX(PI / 2), M("metal", "#c8ccd4"), r.pelvis, 0.05, 0.0, 0.14);
    }
    return out;
  }
  const full = !["shorts", "capri", "bike"].includes(id), thL = id === "shorts" ? 0.3 : id === "bike" ? 0.27 : DIM.thigh, shL = id === "capri" ? 0.23 : full ? DIM.shin * 0.97 : 0;
  const pt = id === "flares" ? 0.012 : id === "cargo" ? 0.024 : id === "joggers" ? 0.018 : id === "leggings" || id === "bike" ? 0.004 : id === "shorts" ? 0.018 : 0.011;
  const flare = id === "flares" ? 0.03 : id === "pants" || id === "jeans" ? 0.006 : 0;
  for (let i = 0; i < 2; i++) {
    const hp = r.hip[i], kn = r.knee[i];
    add(sphereG(0.06 * k + pt, 0.06 * k + pt, 0.06 * k + pt, 12, 8), m, hp, 0, -0.07, 0);
    add(cylSeg(0.07 * k + pt, 0.062 * k + pt, thL - 0.07, 12).translate(0, -0.07, 0), m, hp);   // starts below the tee hem: a full-length thigh tube pokes out through the tee at the sides, and swings out through it when walking
    if (thL >= DIM.thigh - 0.01 || shL > 0) add(sphereG(0.068 * k + pt, 0.068 * k + pt, 0.068 * k + pt, 12, 8), m, kn);
    if (shL > 0) { add(cylSeg(0.058 * k + pt, 0.04 * k + pt + flare, shL, 12), m, kn); if (id === "joggers" || id === "capri" || id === "shorts") add(new THREE.TorusGeometry((id === "shorts" ? 0.07 : 0.047) * k + pt, 0.012, 6, 12).rotateX(PI / 2), m, id === "shorts" ? hp : kn, 0, id === "shorts" ? -thL : -shL, 0); }
    else if (id === "shorts" || id === "bike") add(new THREE.TorusGeometry(0.066 * k + pt, 0.008, 6, 12).rotateX(PI / 2), m, hp, 0, -thL, 0);
    if (id === "cargo") add(new THREE.BoxGeometry(0.02, 0.1, 0.1).translate(0, 0, 0), m, hp, (i === 0 ? 1 : -1) * (0.075 * k + pt + 0.01), -0.2, 0);
  }
  if (spec.pantsTrim) { const tm = M("cloth", spec.pantsTrim, { rough: 0.8 } as any); for (let i = 0; i < 2; i++) if (shL > 0) add(new THREE.TorusGeometry((0.05 + flare * 0.6) * k + pt, 0.009, 6, 12).rotateX(PI / 2), tm, r.knee[i], 0, -shL, 0); }
  return out;
}

export function buildSocks(c: Ctx, r: Rig, spec: AvatarSpec, bw: number): Out {
  const out: Out = []; if (spec.socks === "none" || !spec.socks) return out; void bw;
  const k = 1 + (bw - 1) * 0.6, tall = spec.socks === "tall" || spec.socks === "striped" || spec.socks === "tights", L = tall ? DIM.shin * 0.78 : 0.12, top = DIM.shin - L;
  const rr = (f: number) => lerp(0.058, 0.04, f) * k + 0.006, g = () => cylSeg(rr(top / DIM.shin), rr(1), L, 12).translate(0, -top, 0);
  const m = c.mat("cloth", spec.sockColor, { texture: spec.socks === "striped" ? "stripes" : undefined, textureColor2: "#fff6ea", repeat: [2, 3] } as any);
  for (let i = 0; i < 2; i++) { const o = new THREE.Mesh(g(), m); r.knee[i].add(o); out.push(o); }
  if (spec.socks === "tights") for (let i = 0; i < 2; i++) { const th = new THREE.Mesh(cylSeg(0.07 * k + 0.004, 0.062 * k + 0.004, DIM.thigh - 0.07, 12).translate(0, -0.07, 0), m), kn = new THREE.Mesh(sphereG(0.066 * k + 0.003, 0.066 * k + 0.003, 0.066 * k + 0.003, 10, 8), m); r.hip[i].add(th); r.knee[i].add(kn); out.push(th, kn); }
  return out;
}

export function buildShoes(c: Ctx, r: Rig, spec: AvatarSpec): Out {
  const out: Out = [], M = c.mat, st = spec.shoeStyle, col = spec.shoes, lod = c.lod;
  const dark = new THREE.Color(col).offsetHSL(0, 0, -0.18).getStyle();
  for (let i = 0; i < 2; i++) {
    const a = r.ankle[i], s = i === 0 ? 1 : -1;
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; a.add(o); out.push(o); return o; };
    const kind: MatKind = st === "rainboot" ? "plastic" : st === "loafer" || st === "boot" ? "leather" : "cloth";
    const up = M(kind, col, { rough: st === "rainboot" ? 0.25 : undefined } as any), sole = M("plastic", spec.shoes2 ? spec.shoes2 : st === "sneaker" || st === "hightop" || st === "skate" ? "#f4efe6" : st === "loafer" || st === "boot" ? "#3a2a30" : st === "rainboot" ? dark : "#cfc6b8", { rough: 0.7 });
    const w = lod ? 14 : 9;
    if (st === "slipper") { add(sphereG(0.06, 0.05, 0.13, w, 8), up, 0, -0.03, 0.05); add(sphereG(0.056, 0.03, 0.13, w, 6), M("cloth", "#fff6ea"), 0, -0.06, 0.05); continue; }
    if (st === "sandal") { add(sphereG(0.055, 0.016, 0.135, w, 6), sole, 0, -0.062, 0.05); add(new THREE.BoxGeometry(0.1, 0.012, 0.03), up, 0, -0.04, 0.03); add(new THREE.BoxGeometry(0.1, 0.012, 0.03), up, 0, -0.045, 0.09); add(new THREE.BoxGeometry(0.02, 0.05, 0.02), up, 0, -0.03, 0.01); const sk = M("skin", spec.skin); add(sphereG(0.05, 0.026, 0.07, w, 6), sk, 0, -0.04, 0.1); add(sphereG(0.05, 0.03, 0.06, w, 6), sk, 0, -0.025, 0); continue; }
    const thick = st === "skate" ? 0.032 : 0.024, ry = st === "loafer" ? 0.04 : 0.048;
    add(sphereG(0.052 + (st === "skate" ? 0.006 : 0), ry, 0.125, w, 8), up, 0, -0.03, 0.045);
    add(sphereG(0.057, thick, 0.138, w, 6), sole, 0, -0.058 + (st === "skate" ? 0.0 : 0), 0.05);
    if (st === "sneaker" || st === "hightop" || st === "skate") { add(sphereG(0.046, 0.03, 0.05, 10, 6), M("cloth", "#fff6ea"), 0, -0.045, 0.125); for (let l = 0; l < 3; l++) add(new THREE.BoxGeometry(0.06, 0.006, 0.008), M("plastic", "#fff6ea"), 0, 0.0 + 0, 0.04 + l * 0.032).rotation.x = 0.35; }
    if (st === "hightop") add(new THREE.CylinderGeometry(0.052, 0.056, 0.1, 12, 1), up, 0, 0.02, -0.005);
    if (st === "boot") add(new THREE.CylinderGeometry(0.058, 0.064, 0.15, 12, 1), up, 0, 0.04, -0.005);
    if (st === "rainboot") { add(new THREE.CylinderGeometry(0.052, 0.062, 0.3, 12, 1), up, 0, 0.12, -0.003); add(new THREE.TorusGeometry(0.06, 0.01, 6, 12).rotateX(PI / 2), up, 0, 0.27, -0.003); }
    if (st === "loafer") add(new THREE.BoxGeometry(0.07, 0.01, 0.025), M("leather", dark), 0, -0.012, 0.075);
    void s;
  }
  return out;
}
