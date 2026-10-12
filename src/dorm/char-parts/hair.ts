/** Sculpted hair: tapered tube clumps + scalp dome + volume balls, per hairStyle id. Everything is in unit-head space (R = 1, face toward +z). */
import * as THREE from "three";
import type { AvatarSpec } from "../../hall3d/avatar";
import { V, PI, tube, dome, merge, mkRng, hashStr, lerp, sphereG } from "./geo";

export interface HairOut { geo: THREE.BufferGeometry | null; hatR: number }
interface WO { flare?: number; curl?: number; curlF?: number; wave?: number; waveF?: number; leave?: number; grav?: number; sweep?: number; out?: number; r?: number }

function walkPts(th0: number, ph0: number, len: number, n: number, o: WO): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [], leave = o.leave ?? 1.95, arcMax = Math.max(0, leave - th0);
  for (let i = 0; i <= n; i++) {
    const s = (len * i) / n, a = Math.min(s, arcMax), th = th0 + a, ph = ph0 + (o.sweep || 0) * s, fall = s - a;
    const rad = (o.r ?? 1.045) + (o.flare || 0) * s - (i === 0 ? 0.1 : 0);
    let h = Math.sin(th) * rad + fall * (o.out || 0), y = Math.cos(th) * rad - fall * (o.grav ?? 1);
    const sp = Math.sin(ph), cp = Math.cos(ph);
    let x = h * sp, z = h * cp;
    if (o.curl) { const ang = s * (o.curlF || 6), amp = o.curl * Math.min(1, s * 2.5); x += amp * (Math.cos(ang) * cp + Math.sin(ang) * sp); z += amp * (-Math.cos(ang) * sp + Math.sin(ang) * cp); y += amp * Math.sin(ang) * 0.35; }
    if (o.wave) { const w = o.wave * Math.sin(s * (o.waveF || 4)) * Math.min(1, s * 1.5); x += w * cp; z -= w * sp; }
    pts.push(new THREE.Vector3(x, y, z));
  }
  return pts;
}

class HB {
  gs: THREE.BufferGeometry[] = []; sid = 0; r: () => number;
  constructor(public lod: number, seed: number) { this.r = mkRng(seed); }
  get rad() { return this.lod ? 7 : 5; }
  n(k: number) { return this.lod ? k : Math.max(3, Math.round(k * 0.55)); }
  fin(g: THREE.BufferGeometry, aT = 0.5) {
    g.deleteAttribute("uv"); const c = g.attributes.position.count;
    if (!g.attributes.aT) g.setAttribute("aT", new THREE.Float32BufferAttribute(new Float32Array(c).fill(aT), 1));
    g.setAttribute("aS", new THREE.Float32BufferAttribute(new Float32Array(c).fill(this.sid), 1)); if (!g.index) throw new Error("hair geo needs index"); this.gs.push(g);
  }
  strand(pts: THREE.Vector3[], r0 = 0.13, r1 = 0.04) { this.sid++; this.fin(tube(pts, r0, r1, this.rad, this.lod ? 2 : 1, true)); }
  walk(th0: number, ph0: number, len: number, o: WO = {}, r0 = 0.13, r1 = 0.04) {
    const af = Math.abs(((ph0 + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI);   // keep hair off the face: near the front it stops above the brows
    if (af < 1.35) { const lim = af < 0.95 ? 1.12 + 0.3 * (af / 0.95) : lerp(1.42, 1.95, (af - 0.95) / 0.4); const lv = Math.min(o.leave ?? 1.95, lim); o = { ...o, leave: lv }; if (af < 0.95) len = Math.min(len, Math.max(0.25, lv - th0)); }
    this.strand(walkPts(th0, ph0, len, this.lod ? 9 : 6, o), r0, r1);
  }
  fan(n: number, ta: number, tb: number, pa: number, pb: number, len: number, o: WO = {}, r0 = 0.13, r1 = 0.04) {
    n = this.n(n); for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 0.5, r = this.r; this.walk(lerp(ta, tb, r()), lerp(pa, pb, u) + (r() - 0.5) * 0.12, len * (0.9 + r() * 0.2), o, r0, r1); }
  }
  /** a ribbon of hair between azimuths pa..pb (follows walk paths) so long hair reads as a mass, not just strands */
  sheet(th0: number, pa: number, pb: number, len: number, o: WO, cols = 8, inset = 0.0) {
    const n = this.lod ? 9 : 6, pos: number[] = [], nor: number[] = [], aT: number[] = [], idx: number[] = [];
    for (let i = 0; i <= cols; i++) { const ph = pa + ((pb - pa) * i) / cols, pts = walkPts(th0, ph, len, n, { ...o, r: (o.r ?? 1.045) - inset }); pts.forEach((p, j) => { pos.push(p.x, p.y, p.z); nor.push(Math.sin(ph), 0, Math.cos(ph)); aT.push(j / n); }); }
    for (let i = 0; i < cols; i++) for (let j = 0; j < n; j++) { const a = i * (n + 1) + j, b = a + n + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("aT", new THREE.Float32BufferAttribute(aT, 1)); g.setIndex(idx); this.sid++; this.fin(g);
  }
  /** strands over the top at lateral position x0 */
  arch(x0: number, tFrom: number, tTo: number, lift: number, r0 = 0.12, r1 = 0.05, tail = 0) {
    const n = this.lod ? 9 : 6, ry = Math.sqrt(Math.max(0.05, 1 - x0 * x0)) * 1.05, pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) { const u = i / n, t = lerp(tFrom, tTo, u), k = 1 + lift * Math.sin(PI * Math.min(1, u * 1.15)); pts.push(new THREE.Vector3(x0 * 1.05 * (u > 0.8 ? 1 + tail : 1), ry * Math.cos(t) * k - (u > 0.9 ? tail * 3 : 0), ry * Math.sin(t) * k)); }
    this.strand(pts, r0, r1);
  }
  ball(x: number, y: number, z: number, rx: number, ry = rx, rz = rx, aT = 0.55) { this.sid++; this.fin(sphereG(rx, ry, rz, this.lod ? 14 : 9, this.lod ? 10 : 6).translate(x, y, z), aT); }
  dome(tF: number, tS: number, tB: number, thick: number, thMin = 0, aT = 0.5) { this.sid++; this.fin(dome(tF, tS, tB, thick, this.lod ? 32 : 18, this.lod ? 12 : 7, thMin, aT)); }
  tie(x: number, y: number, z: number, r = 0.2, rotX = 0, rotY = 0) { this.sid += 100; const g = new THREE.TorusGeometry(r, r * 0.35, 6, 12); g.rotateX(rotX); g.rotateY(rotY); g.translate(x, y, z); this.fin(g, 2); }
  tail(x: number, y: number, z: number, dir: THREE.Vector3, len: number, n = 6, spread = 0.14, curl = 0.3, thick = 0.14) {
    n = this.n(n);
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) - 0.5 : 0, pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 5; k++) { const s = k / 5, d = dir.clone().multiplyScalar(len * s); pts.push(new THREE.Vector3(x + u * spread * (0.4 + s) * 2 + d.x + Math.sin(s * 5 + u * 6) * curl * 0.15 * s, y + d.y - s * s * len * 0.35, z + d.z + Math.cos(s * 4 + u * 5) * curl * 0.12 * s)); }
      this.strand(pts, thick, 0.035);
    }
  }
}

type Rec = (h: HB, c: HC) => void;
interface HC { fringe: string; part: string; hat: boolean; up: number }
const side = (c: HC) => (c.part === "right" ? -1 : 1);

function fringe(h: HB, kind: string, c: HC, short = 1.0) {
  const sg = side(c);
  if (kind === "straight") h.fan(10, 0.32, 0.5, -0.85, 0.85, 0.8 * short, { leave: 1.12, flare: 0.04, grav: 0.2 }, 0.13, 0.03);
  else if (kind === "side") h.fan(9, 0.1, 0.35, 0.0 * sg, 0.2 * sg, 1.2 * short, { leave: 1.16, sweep: -0.55 * sg, flare: 0.05 }, 0.14, 0.03);
  else if (kind === "curtain") { h.fan(5, 0.15, 0.4, 0.05, 0.9, 1.2 * short, { leave: 1.3, sweep: 0.75, flare: 0.05 }, 0.12, 0.03); h.fan(5, 0.15, 0.4, -0.9, -0.05, 1.2 * short, { leave: 1.3, sweep: -0.75, flare: 0.05 }, 0.12, 0.03); }
  else if (kind === "wispy") h.fan(6, 0.35, 0.55, -0.6, 0.6, 0.7 * short, { leave: 1.1, flare: 0.1, grav: 0.2 }, 0.06, 0.015);
}
const cap = (h: HB, thick = 0.07, tF = 1.0, tS = 1.62, tB = 2.3) => { h.dome(tF, tS, tB, thick); h.fan(14, 0.12, 0.75, -PI, PI, 1.1, { leave: 1.9, r: 1.115, flare: 0.02 }, 0.13, 0.05); };
const stubble = (h: HB, tF = 1.0, tS = 1.65, tB = 2.3) => h.dome(tF, tS, tB, 0.02, 0, 0.1);
const topBall = (h: HB, c: HC, ...a: [number, number, number, number, number?, number?]) => { if (!c.hat) h.ball(...a); };
const longBack = (h: HB, len: number, o: WO, n = 16) => { h.sheet(1.2, 1.15, PI, len * 0.94, o, 6, 0.02); h.sheet(1.2, -PI, -1.15, len * 0.94, o, 6, 0.02); h.fan(n, 0.9, 1.5, 1.05, PI - 0.1, len, o); h.fan(n, 0.9, 1.5, -PI + 0.1, -1.05, len, o); };

const RECIPES: Record<string, Rec> = {
  bald: () => {},
  buzz: (h) => h.dome(1.0, 1.65, 2.3, 0.035, 0, 0.3),
  fade: (h) => { stubble(h); h.dome(1.0, 1.0, 1.15, 0.1, 0, 0.45); },
  crop: (h, c) => { cap(h, 0.08); fringe(h, c.fringe === "none" ? "straight" : c.fringe, c, 0.8); h.fan(8, 0.2, 0.9, -PI, PI, 0.5, { leave: 1.3, flare: 0.1 }); },
  flattop: (h, c) => { stubble(h); h.dome(1.0, 1.35, 1.7, 0.08); if (!c.hat) { h.sid++; h.fin(new THREE.CylinderGeometry(0.93, 1.0, 0.28, h.lod ? 18 : 10).translate(0, 0.86, 0), 0.7); } },
  undercut: (h, c) => { stubble(h); h.dome(0.9, 1.0, 1.1, 0.08); if (!c.hat) { h.ball(0, 0.85, 0.15, 0.88, 0.4, 0.95); for (let i = -2; i <= 2; i++) h.arch(i * 0.25, 1.15, -0.7, 0.28, 0.13, 0.05); } },
  sidecut: (h, c) => { stubble(h); h.dome(0.95, 1.1, 1.3, 0.08); const s = side(c); h.ball(0.2 * s, 0.82, 0.2, 0.85, 0.42, 0.9); for (let i = 0; i < 6; i++) h.walk(0.2 + i * 0.05, 0.1 * s, 1.4, { leave: 1.55, sweep: -0.5 * s, flare: 0.08, out: 0.1 }, 0.14, 0.04); },
  mohawk: (h, c) => { stubble(h); if (c.hat) return; for (let i = 0; i < 9; i++) { const t = lerp(1.15, -1.5, i / 8), b = V(0, Math.cos(t) * 1.04, Math.sin(t) * 1.04); h.strand([b, V(0, b.y + 0.3, b.z + 0.1), V(0, b.y + 0.62 + (i % 2) * 0.08, b.z + 0.06 - (t < -0.5 ? 0.3 : 0))], 0.14, 0.04); } },
  quiff: (h, c) => { cap(h, 0.07); topBall(h, c, 0, 0.95, 0.5, 0.72, 0.42, 0.62); if (!c.hat) for (let i = -2; i <= 2; i++) h.arch(i * 0.22, 1.3, -0.6, 0.45, 0.13, 0.05); },
  pompadour: (h, c) => { stubble(h); cap(h, 0.08, 0.9); topBall(h, c, 0, 1.0, 0.45, 0.82, 0.58, 0.75); if (!c.hat) for (let i = -3; i <= 3; i++) h.arch(i * 0.2, 1.2, -0.9, 0.6, 0.14, 0.05); },
  slick: (h) => { cap(h, 0.09, 0.8, 1.65, 2.3); for (let i = -4; i <= 4; i++) h.arch(i * 0.21, 0.85, -1.7, 0.12, 0.11, 0.05); },
  spiky: (h, c) => { cap(h, 0.07); if (c.hat) return; const r = h.r; for (let i = 0; i < h.n(14); i++) { const th = lerp(0.1, 1.3, r()), ph = r() * PI * 2, d = V(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)), b = d.clone().multiplyScalar(1.02), up = V(0, 0.35, 0), l = 0.55 + r() * 0.3; h.strand([b, b.clone().addScaledVector(d, l * 0.5).add(up.clone().multiplyScalar(0.5)), b.clone().addScaledVector(d, l).add(up)], 0.2, 0.02); } },
  messy: (h, c) => { cap(h, 0.07); fringe(h, c.fringe === "none" ? "wispy" : c.fringe, c); const r = h.r; for (let i = 0; i < h.n(20); i++) { const th = lerp(0.2, 1.4, r()), ph = r() * PI * 2, d = V(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)), b = d.clone().multiplyScalar(1.03), t = V(r() - 0.5, r() * 0.3, r() - 0.5).multiplyScalar(0.8), l = 0.45 + r() * 0.4; h.strand([b, b.clone().addScaledVector(d, l * 0.5).add(t.clone().multiplyScalar(0.5)), b.clone().addScaledVector(d, l * 0.9).add(t).add(V(0, -0.1, 0))], 0.12, 0.03); } },
  shag: (h, c) => { cap(h, 0.07); fringe(h, c.fringe === "none" ? "curtain" : c.fringe, c, 0.9); h.fan(26, 0.5, 1.4, -PI, PI, 1.35, { leave: 1.75, flare: 0.14, grav: 0.55, out: 0.15 }); },
  mullet: (h, c) => { cap(h, 0.08); fringe(h, c.fringe === "none" ? "wispy" : c.fringe, c); h.fan(10, 0.4, 1.4, -2.9, 2.9, 0.8, { flare: 0.12, leave: 1.6 }); h.fan(14, 1.3, 1.7, 2.3, 4.0, 2.5, { leave: 1.9, out: 0.05 }, 0.16, 0.05); },
  bowl: (h, c) => { h.dome(1.38, 1.85, 2.3, 0.1); fringe(h, "straight", c, 1.2); },
  curtains: (h, c) => { cap(h, 0.07); fringe(h, "curtain", c); h.fan(8, 0.6, 1.5, 1.2, 2.6, 1.3, { leave: 1.7, flare: 0.1 }); h.fan(8, 0.6, 1.5, -2.6, -1.2, 1.3, { leave: 1.7, flare: 0.1 }); },
  sidebang: (h, c) => { cap(h, 0.08); fringe(h, "side", c); h.fan(10, 0.8, 1.5, 1.0, 2.7, 1.1, { leave: 1.7 }); h.fan(10, 0.8, 1.5, -2.7, -1.0, 1.1, { leave: 1.7 }); },
  pixie: (h, c) => { cap(h, 0.09); fringe(h, c.fringe === "none" ? "side" : c.fringe, c, 0.9); h.fan(10, 0.5, 1.2, -PI, PI, 0.7, { leave: 1.55, flare: 0.1 }); },
  bob: (h, c) => { cap(h, 0.08); fringe(h, c.fringe, c); h.sheet(1.2, 0.8, PI, 1.85, { leave: 1.6, out: -0.02, flare: 0.04 }, 6, 0.02); h.sheet(1.2, -PI, -0.8, 1.85, { leave: 1.6, out: -0.02, flare: 0.04 }, 6, 0.02); h.fan(10, 0.7, 1.5, 0.9, PI - 0.05, 1.9, { leave: 1.6, grav: 1, out: -0.02, flare: 0.04 }, 0.17, 0.08); h.fan(10, 0.7, 1.5, -PI + 0.05, -0.9, 1.9, { leave: 1.6, out: -0.02, flare: 0.04 }, 0.17, 0.08); },
  long: (h, c) => { cap(h, 0.07); fringe(h, c.fringe, c); longBack(h, 3.1, { leave: 1.85, out: 0.22, flare: 0.04 }, 16); h.fan(3, 1.0, 1.3, 1.32, 1.4, 2.3, { leave: 1.45, out: 0.55, grav: 0.9 }, 0.15, 0.06); h.fan(3, 1.0, 1.3, -1.4, -1.32, 2.3, { leave: 1.45, out: 0.55, grav: 0.9 }, 0.15, 0.06); },
  wavy: (h, c) => { cap(h, 0.08); fringe(h, c.fringe, c); longBack(h, 3.0, { leave: 1.85, out: 0.28, flare: 0.1, wave: 0.14, waveF: 5.5 }, 18); h.fan(3, 1.0, 1.3, 1.32, 1.4, 2.2, { leave: 1.45, out: 0.6, wave: 0.12, waveF: 5.5 }, 0.15, 0.06); h.fan(3, 1.0, 1.3, -1.4, -1.32, 2.2, { leave: 1.45, out: 0.6, wave: 0.12, waveF: 5.5 }, 0.15, 0.06); },
  curly: (h, c) => { cap(h, 0.1); if (c.hat) return; const r = h.r; for (let i = 0; i < h.n(22); i++) { const th = lerp(0.3, 1.75, r()), ph = r() * PI * 2; if (th > 1.2 && Math.abs(ph) < 0.9 && ph > -0.9) continue; h.ball(Math.sin(th) * Math.sin(ph) * 1.18, Math.cos(th) * 1.18 + 0.1, Math.sin(th) * Math.cos(ph) * 1.1 - 0.05, 0.36 + r() * 0.12, 0.36, 0.36); } },
  afro: (h, c) => { h.dome(1.15, 1.7, 2.3, 0.1); if (c.hat) return; const r = h.r; h.ball(0, 0.7, -0.6, 1.5, 1.38, 1.45); for (let i = 0; i < h.n(26); i++) { const th = lerp(0.2, 2.1, r()), ph = r() * PI * 2, d = V(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)); if (d.z > 0.5 && d.y < 0.55) continue; h.ball(d.x * 1.45, d.y * 1.35 + 0.7, d.z * 1.4 - 0.6, 0.5, 0.5, 0.5); } },
  bantuknots: (h, c) => { cap(h, 0.05); const r = h.r; for (let i = 0; i < h.n(11); i++) { const th = lerp(0.2, 1.3, (i % 4) / 3), ph = (i / 11) * PI * 2 + 0.3, d = V(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)); if (c.hat) break; h.ball(d.x * 1.15, d.y * 1.15, d.z * 1.15, 0.27, 0.27, 0.27); h.sid++; h.fin(new THREE.TorusGeometry(0.17, 0.08, 5, 9).rotateX(PI / 2).translate(0, 0.14, 0).applyMatrix4(new THREE.Matrix4().lookAt(V(), d, V(0, 1, 0.001)).setPosition(d.x * 1.15, d.y * 1.15, d.z * 1.15)), 0.5); void r; } },
  hime: (h, c) => { cap(h, 0.07); fringe(h, "straight", c); longBack(h, 3.0, { leave: 1.85, out: 0.2, flare: 0.03 }, 14); h.fan(3, 1.0, 1.2, 1.15, 1.25, 2.5, { leave: 1.4, out: 0.4, grav: 0.9 }, 0.17, 0.05); h.fan(3, 1.0, 1.2, -1.25, -1.15, 2.5, { leave: 1.4, out: 0.4, grav: 0.9 }, 0.17, 0.05); },
  pony: (h, c) => { cap(h, 0.05, 1.0, 1.6, 2.25); fringe(h, c.fringe, c); h.fan(10, 1.0, 1.5, 1.2, PI, 1.0, { leave: 1.5 }); h.fan(10, 1.0, 1.5, -PI, -1.2, 1.0, { leave: 1.5 }); h.tie(0, 0.35, -1.12, 0.15, 0, PI / 2); h.tail(0, 0.3, -1.15, V(0, -0.6, -0.2).normalize(), 2.4, 7, 0.28, 0.4); },
  highpony: (h, c) => { cap(h, 0.05, 1.0, 1.6, 2.25); fringe(h, c.fringe, c); h.tie(0, 0.85, -0.78, 0.15, 0.6, 0); const o = h.n(7); for (let i = 0; i < o; i++) { const u = o > 1 ? i / (o - 1) - 0.5 : 0; h.strand([V(u * 0.4, 0.75, -0.8), V(u * 0.5, 1.05, -1.0), V(u * 0.9, 0.9, -1.45), V(u * 1.2, 0.1, -1.7), V(u * 1.1, -1.2, -1.55)], 0.14, 0.035); } },
  pigtails: (h, c) => { cap(h, 0.05, 1.0, 1.6, 2.25); fringe(h, c.fringe, c); for (const s of [-1, 1]) { h.tie(s * 1.1, 0.3, -0.3, 0.14, 0, PI / 2); h.tail(s * 1.1, 0.25, -0.3, V(s * 0.25, -1, -0.1).normalize(), 2.0, 6, 0.26, 0.5, 0.16); } },
  twinbuns: (h, c) => { cap(h, 0.05); fringe(h, c.fringe, c); if (c.hat) return; for (const s of [-1, 1]) { h.ball(s * 0.72, 1.1, -0.15, 0.46, 0.4, 0.46); h.tie(s * 0.72, 0.8, -0.1, 0.3, PI / 2.4, 0); } },
  bun: (h, c) => { cap(h, 0.05, 1.0, 1.6, 2.25); fringe(h, c.fringe, c); const y = c.hat ? 0.35 : 0.98; h.ball(0, y, -0.85, 0.58, 0.52, 0.55); h.tie(0, y - 0.28, -0.8, 0.38, PI / 2.5, 0); },
  topknot: (h, c) => { cap(h, 0.05); fringe(h, c.fringe, c); if (c.hat) return; h.ball(0, 1.34, -0.1, 0.36, 0.34, 0.36); h.tie(0, 1.1, -0.08, 0.28, PI / 2, 0); },
  halfup: (h, c) => { cap(h, 0.07); fringe(h, c.fringe, c); longBack(h, 3.0, { leave: 1.85, out: 0.25, flare: 0.07, wave: 0.05, waveF: 4 }, 16); h.fan(2, 1.0, 1.3, 1.35, 1.42, 2.3, { leave: 1.45, out: 0.55 }, 0.15, 0.06); h.fan(2, 1.0, 1.3, -1.42, -1.35, 2.3, { leave: 1.45, out: 0.55 }, 0.15, 0.06); if (!c.hat) { h.tie(0, 0.8, -0.78, 0.15, 0.5, 0); h.ball(0, 1.0, -0.88, 0.3, 0.28, 0.3); } },
  braids: (h, c) => { cap(h, 0.06, 1.0, 1.6, 2.25); fringe(h, c.fringe, c); for (const s of [-1, 1]) for (let k = 0; k < (h.lod ? 11 : 8); k++) { const u = k / (h.lod ? 10 : 7); h.sid += 1; const g = sphereG(0.2, 0.25, 0.2, h.lod ? 10 : 7, 6).rotateZ((k % 2 ? 1 : -1) * 0.5).translate(s * (1.0 + u * 0.12 + (k % 2) * 0.03), 0.2 - u * 2.5, -0.5 - u * 0.25 - 0.1 * Math.sin(u * 3)); h.fin(g, 0.3 + u * 0.6); } },
  cornrows: (h, c) => { h.dome(1.0, 1.65, 2.3, 0.025, 0, 0.1); for (let i = -4; i <= 4; i++) { const x0 = i * 0.2; h.arch(x0, 1.15, -2.0, 0.05, 0.075, 0.07, i * 0.02); } void c; },
  locs: (h, c) => { cap(h, 0.07); fringe(h, c.fringe === "none" ? "wispy" : c.fringe, c); h.fan(26, 0.6, 1.5, -PI, PI, 2.8, { leave: 1.7, out: 0.18, flare: 0.1, wave: 0.03, waveF: 9, r: 1.07 }, 0.11, 0.075); },
  balding: (h) => { h.dome(2.0, 1.5, 2.0, 0.08, 1.1, 0.35); h.walk(0.3, 0.2, 1.0, { leave: 1.1, sweep: 0.2 }, 0.03, 0.01); h.walk(0.35, -0.3, 1.0, { leave: 1.1 }, 0.03, 0.01); },
  receding: (h, c) => { h.dome(0.5, 1.6, 2.3, 0.08); h.dome(0.5, 0.5, 0.5, 0.1); void c; },
};

const dyed = new THREE.Color();
function colorize(g: THREE.BufferGeometry, spec: AvatarSpec) {
  const tieColor = new THREE.Color(spec.clip || spec.hatColor || "#d9564a");
  const base = new THREE.Color(spec.hair), h2 = spec.hair2 ? new THREE.Color(spec.hair2) : null, hl = spec.hl;
  const p = g.attributes.position, aT = g.attributes.aT, aS = g.attributes.aS, n = p.count, col = new Float32Array(n * 3), c = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 }; base.getHSL(hsl);
  for (let i = 0; i < n; i++) {
    const t = aT.getX(i), sid = aS.getX(i), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let useB = 0;
    if (h2) {
      // highlights are thin and blended: they start soft near the root and never reach full strength, so no strand reads as a solid tusk
      const SS = THREE.MathUtils.smoothstep, tip = SS(t, 0.12, 0.8), pick = (n: number, m: number) => ((sid % m) === n ? 1 : (sid % m) === (n + 1) % m ? 0.28 : 0);
      if (hl === "streak") useB = pick(3, 7) * tip * 0.8; else if (hl === "stripes") useB = pick(0, 4) * tip * 0.75; else if (hl === "frontpiece") useB = SS(z, 0.2, 0.5) * (1 - SS(Math.abs(x), 0.25, 0.6)) * SS(y, 0.2, 0.5) * 0.8 * (0.4 + 0.6 * tip);
      else if (hl === "tips") useB = SS(t, 0.5, 1.0) * 0.8; else if (hl === "ombre") useB = SS(-y, -0.2, 2.0);
      else if (hl === "split") useB = SS(x, -0.12, 0.12), useB *= 0.9; else if (hl === "roots") useB = 1 - SS(t, 0.15, 0.5);
      else if (hl === "underlayer") useB = SS(-y, 0, 0.3) * (1 - SS(z, 0.1, 0.4));
    }
    if (h2 && hl === "rainbow") dyed.setHSL(((sid * 0.071 + y * 0.12) % 1 + 1) % 1, 0.7, 0.58); else dyed.copy(base).lerp(h2 ?? base, useB);
    c.copy(dyed); const dk = 0.78 + 0.22 * Math.min(1, t * 1.4) + (t > 0.75 ? 0.05 : 0) + ((sid * 37) % 11) * 0.016 - 0.08; if (t >= 1.9) c.set(tieColor); else c.multiplyScalar(dk);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.deleteAttribute("aT"); g.deleteAttribute("aS");
}

const BIG = new Set(["afro", "curly", "bantuknots", "twinbuns", "pompadour", "quiff", "flattop"]);
const COVER = new Set(["cap", "beanie", "bucket", "sunhat", "beret", "bandana"]);
export function buildHair(spec: AvatarSpec, lod: number): HairOut {
  const rec = RECIPES[spec.hairStyle] ?? RECIPES.crop, h = new HB(lod, hashStr(spec.hairStyle + spec.hair));
  const c: HC = { fringe: spec.fringe || "none", part: spec.part || "none", hat: COVER.has(spec.hat), up: 0 };
  rec(h, c);
  if (spec.clip && !c.hat) { h.sid += 100; h.fin(new THREE.BoxGeometry(0.34, 0.07, 0.07).rotateZ(-0.5).translate(0.55, 0.95, 0.5), 2); }
  const geo = merge(h.gs); h.gs.forEach((g) => g.dispose());
  if (geo) colorize(geo, spec);
  return { geo, hatR: BIG.has(spec.hairStyle) ? (spec.hairStyle === "afro" ? 1.9 : 1.45) : 1.17 };
}
