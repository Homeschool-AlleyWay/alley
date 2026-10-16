/** Papercut film renderer (canvas 2D). Draws a SceneScript (see scenegen.ts) at any time t: layered flat paper pieces with soft stacked drop shadows,
 *  a lit upper-left rim, slightly rough scissor edges, a limited palette, parallax between layers, bobbing / walking / flying actors, slide / page-turn /
 *  fade transitions, a lower-third caption and a paper-grain pass. Everything is procedural; nothing is loaded. The look is fixed (it never follows the
 *  app's Pixar switch). Used by the 3D newsroom screen, the desk preview, the 2D page and the hallway TV. */
import { TR, type Layer, type Scene, type SceneScript } from "./scenegen";

export const FW = 640, FH = 360;
type C = CanvasRenderingContext2D;
export const PAL = { sky: "#A9DDF2", powder: "#8FC9E8", blue: "#4F91C7", deep: "#326C9E", mint: "#A9DCC0", sage: "#88B89A", leaf: "#5E9C72", dleaf: "#3F7655", yellow: "#F8D977", gold: "#EAB94E", coral: "#F28F7E", red: "#E07A66", peach: "#F6B294", pink: "#EAA5B2", lav: "#B8A8DA", dlav: "#8173AE", cream: "#FFF9F0", ivory: "#F7EEDF", oak: "#DDAA68", oakSh: "#9A653D", kraft: "#EADFCB", gray: "#9DA7AA", lgray: "#DDE2E3", char: "#6d5a5f", dark: "#313A3F" };
const SKINS = ["#F6D6BD", "#DFAE87", "#C98D67", "#986047", "#744735"], HAIRS = ["#694A38", "#28292B", "#B5651D", "#9A653D", "#3b2a22"], SHIRTS = [PAL.coral, PAL.blue, PAL.gold, PAL.leaf, PAL.lav];
export const FONT = '"Fredoka","Trebuchet MS",system-ui,-apple-system,"Segoe UI",sans-serif';
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v)), lerp = (a: number, b: number, t: number) => a + (b - a) * t, ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/* ------------------------------------------------------------ colour */
const shCache = new Map<string, string>();
function mixHex(hex: string, to: string, f: number): string {
  const key = hex + to + f; let v = shCache.get(key); if (v) return v;
  const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
  const ch = (s: number) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, f));
  v = `rgb(${ch(16)},${ch(8)},${ch(0)})`; shCache.set(key, v); return v;
}
/** a darker (f<0) or lighter (f>0) tone of the same paper */
export const shade = (hex: string, f: number) => (hex.startsWith("#") ? mixHex(hex, f < 0 ? "#1c1218" : "#ffffff", Math.abs(f)) : hex);
let TINT: { to: string; f: number } | null = null;   // time-of-day cast on every colour of the scene being drawn
const tint = (col: string) => (TINT && col.startsWith("#") ? mixHex(col, TINT.to, TINT.f) : col);

/* ------------------------------------------------------------ paper pieces */
const hsh = (a: number, b: number) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5; };
type Pt = [number, number];
const rough = (pts: Pt[], amt: number): Pt[] => pts.map(([x, y]) => [x + hsh(x * 10, y * 10 + 1) * 2 * amt, y + hsh(x * 10 + 7, y * 10) * 2 * amt]);
const poly = (pts: Pt[]) => (c: C) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
const curve = (pts: Pt[]) => (c: C) => {
  const n = pts.length, mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; c.beginPath(); const m0 = mid(pts[n - 1], pts[0]); c.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], m = mid(p, q); c.quadraticCurveTo(p[0], p[1], m[0], m[1]); } c.closePath();
};
function piece(c: C, path: (c: C) => void, fill: string | CanvasGradient, o: { sh?: number; rim?: boolean } = {}) {
  const sh = o.sh ?? 1, sy = sh < 0 ? -1 : 1, k = Math.abs(sh);
  if (k > 0) { c.save(); c.fillStyle = "rgba(58,38,48,.10)"; c.translate(2.8 * k * (sh < 0 ? 0 : 1), 4.2 * k * sy); path(c); c.fill(); c.translate(-1.4 * k * (sh < 0 ? 0 : 1), -2 * k * sy); c.fillStyle = "rgba(58,38,48,.16)"; path(c); c.fill(); c.restore(); }
  path(c); c.fillStyle = fill; c.fill();
  if (o.rim !== false) { c.save(); path(c); c.clip(); c.translate(0.9, 0.9); path(c); c.lineWidth = 1.8; c.strokeStyle = "rgba(255,255,255,.4)"; c.stroke(); c.restore(); }
  path(c); c.lineWidth = 1; c.lineJoin = "round"; c.strokeStyle = typeof fill === "string" ? shade(fill, -0.24) : "rgba(70,50,60,.4)"; c.stroke();
}
const rectPts = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w / 2, y], [x + w, y], [x + w, y + h / 2], [x + w, y + h], [x + w / 2, y + h], [x, y + h], [x, y + h / 2]];
const R = (c: C, x: number, y: number, w: number, h: number, fill: string, o: { sh?: number; rim?: boolean } = {}) => piece(c, poly(rough(rectPts(x, y, w, h), 0.55)), tint(fill), o);
const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 14): Pt[] => Array.from({ length: n }, (_, i): Pt => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const E = (c: C, cx: number, cy: number, rx: number, ry: number, fill: string, o: { sh?: number; rim?: boolean } = {}) => piece(c, curve(rough(ellPts(cx, cy, rx, ry, rx + ry > 40 ? 18 : 12), 0.05 * (rx + ry) / 2 + 0.2)), tint(fill), o);
const P = (c: C, pts: Pt[], fill: string, o: { sh?: number; rim?: boolean } = {}) => piece(c, poly(rough(pts, 0.6)), tint(fill), o);
const line = (c: C, pts: Pt[], col: string, w: number) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = tint(col); c.lineWidth = w; c.stroke(); };
/** wavy hill / ground band: a polygon with a gently wavy top */
function band(c: C, y: number, amp: number, wl: number, ph: number, fill: string, bottom = FH + 60, sh = -1, x0 = -110, x1 = FW + 110) {
  const pts: Pt[] = []; for (let x = x0; x <= x1; x += 20) pts.push([x, y + Math.sin(x / wl + ph) * amp + Math.sin(x / (wl * 0.43) + ph * 1.7) * amp * 0.35]);
  pts.push([x1, bottom], [x0, bottom]); piece(c, poly(rough(pts, 0.35)), tint(fill), { sh, rim: false });
}
const grad = (c: C, y0: number, y1: number, a: string, b: string) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, tint(a)); g.addColorStop(1, tint(b)); return g; };

/* ------------------------------------------------------------ pieces of scenery */
interface Ctx { t: number; L: Layer; s: number; sd: number }
const HILL = [PAL.sage, PAL.leaf, PAL.mint];
function cloudAt(c: C, x: number, y: number, s: number) { const w = [[-14, 4, 11], [0, -3, 15], [15, 3, 12], [-4, 7, 12], [8, 7, 11]]; piece(c, (c) => { c.beginPath(); for (const [dx, dy, r] of w) { c.moveTo(x + (dx + r) * s, y + dy * s); c.arc(x + dx * s, y + dy * s, r * s, 0, 7); } }, tint("#ffffff"), { sh: 0.8 }); }
function treeAt(c: C, x: number, y: number, s: number, sway: number, col = PAL.leaf) {
  c.save(); c.translate(x, y); c.rotate(sway); R(c, -2.5 * s, -26 * s, 5 * s, 26 * s, PAL.oakSh, { sh: 0.5 }); E(c, -9 * s, -30 * s, 14 * s, 12 * s, shade(col, -0.1)); E(c, 8 * s, -34 * s, 15 * s, 13 * s, col); E(c, 0, -46 * s, 13 * s, 12 * s, shade(col, 0.1)); c.restore();
}
function pineAt(c: C, x: number, y: number, s: number, col: string) { R(c, x - 2 * s, y - 8 * s, 4 * s, 8 * s, PAL.oakSh, { sh: 0.4 }); for (let i = 0; i < 3; i++) P(c, [[x - (16 - i * 3) * s, y - (6 + i * 15) * s], [x, y - (30 + i * 15) * s], [x + (16 - i * 3) * s, y - (6 + i * 15) * s]], i % 2 ? shade(col, 0.06) : col, { sh: 0.6 }); }
function flowerAt(c: C, x: number, y: number, s: number, col: string, sway: number) {
  c.save(); c.translate(x, y); c.rotate(sway); line(c, [[0, 0], [0, -22 * s]], PAL.dleaf, 2 * s); E(c, -5 * s, -9 * s, 5 * s, 2.5 * s, PAL.leaf, { sh: 0.3 });
  for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283; E(c, Math.cos(a) * 5 * s, -24 * s + Math.sin(a) * 5 * s, 3.8 * s, 3.8 * s, col, { sh: 0.3 }); } E(c, 0, -24 * s, 3 * s, 3 * s, PAL.gold, { sh: 0.2 }); c.restore();
}
function buildingAt(c: C, x: number, base: number, w: number, h: number, col: string, win = true, roof = false) {
  R(c, x, base - h, w, h, col, { sh: 0.8 }); if (roof) P(c, [[x - 4, base - h], [x + w / 2, base - h - 14], [x + w + 4, base - h]], PAL.coral, { sh: 0.5 });
  if (win) for (let yy = base - h + 10; yy < base - 18; yy += 18) for (let xx = x + 8; xx < x + w - 10; xx += 16) R(c, xx, yy, 8, 10, "#EAF6FB", { sh: 0, rim: false });
}
function fanPalm(c: C, x: number, y: number, s: number, sway: number) {
  c.save(); c.translate(x, y); c.rotate(sway); piece(c, poly(rough([[-3 * s, 0], [3 * s, 0], [6 * s, -60 * s], [0, -62 * s]], 0.4)), PAL.oakSh, { sh: 0.6 });
  for (let i = 0; i < 6; i++) { const a = -2.9 + i * 0.52; P(c, [[3 * s, -60 * s], [3 * s + Math.cos(a) * 30 * s, -60 * s + Math.sin(a) * 22 * s - 8 * s], [3 * s + Math.cos(a) * 44 * s, -60 * s + Math.sin(a) * 30 * s + 6 * s], [3 * s + Math.cos(a) * 24 * s, -60 * s + Math.sin(a) * 14 * s + 6 * s]], i % 2 ? PAL.leaf : PAL.dleaf, { sh: 0.4 }); }
  c.restore();
}

const KIND: Record<string, (c: C, x: Ctx) => void> = {
  sky(c, { L }) { const g = c.createLinearGradient(0, -20, 0, FH); const p = SKY[curPal] ?? SKY.day; g.addColorStop(0, p[0]); g.addColorStop(1, p[1]); c.fillStyle = g; c.fillRect(-120, -80, FW + 240, FH + 200); void L; },
  stars(c, { t, sd }) { for (let i = 0; i < 46; i++) { const x = (hsh(sd, i) + 0.5) * (FW + 160) - 80, y = (hsh(sd + 9, i) + 0.5) * 230, r = 1 + ((i * 7) % 3) * 0.6 + Math.sin(t * 2 + i) * 0.4; c.fillStyle = i % 5 ? "#FFF9F0" : PAL.yellow; c.beginPath(); c.arc(x, y, Math.max(0.6, r), 0, 7); c.fill(); } },
  moon(c, { L }) { piece(c, curve(rough(ellPts(L.x, L.y, 24, 24, 16), 0.5)), PAL.cream, { sh: 0.8 }); c.save(); c.beginPath(); c.arc(L.x, L.y, 24, 0, 7); c.clip(); E(c, L.x + 10, L.y - 4, 20, 20, "#2f3a68", { sh: 0, rim: false }); c.restore(); },
  sun(c, { L, t }) { const p = 1 + Math.sin(t * 1.4) * 0.04; c.save(); c.translate(L.x, L.y); c.rotate(t * 0.12); for (let i = 0; i < 12; i++) { c.save(); c.rotate((i / 12) * 6.283); P(c, [[-7, -34 * p], [0, -54 * p], [7, -34 * p]], i % 2 ? PAL.yellow : PAL.gold, { sh: 0.4 }); c.restore(); } c.restore(); E(c, L.x, L.y, 30 * p, 30 * p, PAL.yellow, { sh: 0.8 }); E(c, L.x - 7, L.y - 7, 12, 10, "#FFF3C4", { sh: 0, rim: false }); },
  cloud(c, { L, t }) { const x = ((L.x + t * (6 + L.d * 14) + 120) % (FW + 240)) - 120; cloudAt(c, x, L.y, L.s * 1.2); },
  hill(c, { L, sd }) { band(c, L.y, 14 + (sd % 7), 90 + (sd % 60), sd % 6, HILL[L.c ?? 0], FH + 60, -1); },
  tree(c, { L, t }) { treeAt(c, L.x, L.y, L.s, Math.sin(t * 1.1 + L.x) * 0.03); },
  pine(c, { L }) { pineAt(c, L.x, L.y, L.s, [PAL.dleaf, PAL.leaf, "#4B8A63"][L.c ?? 0]); },
  flower(c, { L, t }) { flowerAt(c, L.x, L.y, L.s, [PAL.coral, PAL.yellow, PAL.lav, PAL.pink][L.c ?? 0], Math.sin(t * 1.6 + L.x) * 0.08); },
  sunflower(c, { L, t }) { c.save(); c.translate(L.x, L.y); c.rotate(Math.sin(t * 1.2 + L.x) * 0.03); const s = L.s; line(c, [[0, 0], [0, -64 * s]], PAL.dleaf, 3.5 * s); E(c, -10 * s, -26 * s, 10 * s, 4 * s, PAL.leaf, { sh: 0.3 }); E(c, 10 * s, -38 * s, 10 * s, 4 * s, PAL.leaf, { sh: 0.3 }); for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; E(c, Math.cos(a) * 14 * s, -68 * s + Math.sin(a) * 14 * s, 6 * s, 3.6 * s, PAL.yellow, { sh: 0.3, rim: false }); } E(c, 0, -68 * s, 9 * s, 9 * s, PAL.oakSh, { sh: 0.5 }); c.restore(); },
  bldg(c, { L, sd }) { const w = 52 + (sd % 30), h = (L.v === "far" ? 60 : 96) + (sd % 70); buildingAt(c, L.x, L.y + (L.v === "far" ? 60 : 30), w, h, [PAL.powder, PAL.lav, PAL.peach, PAL.sky, PAL.mint][L.c ?? 0], true, (sd % 3) === 0); },
  road(c) { band(c, 300, 0, 100, 0, "#7d878b", FH + 60, -1); for (let x = -20; x < FW + 40; x += 70) R(c, x, 322, 36, 5, PAL.cream, { sh: 0, rim: false }); },
  school(c, { L, t }) { const x = L.x, y = L.y, s = L.s; R(c, x - 110 * s, y - 100 * s, 220 * s, 100 * s, PAL.peach, { sh: 0.9 }); P(c, [[x - 122 * s, y - 100 * s], [x, y - 150 * s], [x + 122 * s, y - 100 * s]], PAL.coral, { sh: 0.7 }); R(c, x - 16 * s, y - 52 * s, 32 * s, 52 * s, PAL.oakSh, { sh: 0.5 }); E(c, x, y - 118 * s, 11 * s, 11 * s, PAL.cream, { sh: 0.4 }); line(c, [[x, y - 118 * s], [x, y - 124 * s]], PAL.char, 1.4); line(c, [[x, y - 118 * s], [x + 5 * s, y - 117 * s]], PAL.char, 1.4); for (const dx of [-88, -58, 34, 64]) R(c, x + dx * s, y - 80 * s, 24 * s, 30 * s, PAL.sky, { sh: 0.2 }); line(c, [[x + 130 * s, y], [x + 130 * s, y - 120 * s]], PAL.char, 2); const wv = Math.sin(t * 3) * 3; P(c, [[x + 130 * s, y - 118 * s], [x + 156 * s, y - 112 * s + wv], [x + 130 * s, y - 100 * s]], PAL.red, { sh: 0.4 }); },
  grass(c, { L }) { band(c, L.y, 3, 40, 1, PAL.leaf, FH + 60, -1); },
  sea(c, { L, t }) { band(c, L.y, 3, 50, t * 0.6, PAL.powder, FH + 60, -1); band(c, L.y + 22, 4, 38, -t * 0.8, PAL.blue, FH + 60, -1); },
  sand(c, { L }) { band(c, L.y, 5, 120, 2, "#F2D9A6", FH + 60, -1); },
  palm(c, { L, t }) { fanPalm(c, L.x, L.y, L.s, Math.sin(t * 1.1 + L.x) * 0.025); },
  water(c) { c.fillStyle = grad(c, 0, FH, "#6fb9d8", "#2f6f9e"); c.fillRect(-120, -80, FW + 240, FH + 200); },
  rays(c, { L, t }) { for (let i = 0; i < 4; i++) { const x = L.x - 200 + i * 130 + Math.sin(t * 0.5 + i) * 14; c.fillStyle = "rgba(255,255,255,.10)"; c.beginPath(); c.moveTo(x, -10); c.lineTo(x + 50, -10); c.lineTo(x + 130, FH); c.lineTo(x + 20, FH); c.closePath(); c.fill(); } },
  weed(c, { L, t }) { const s = L.s; for (let j = 0; j < 3; j++) { const col = [PAL.leaf, PAL.dleaf, PAL.sage][((L.c ?? 0) + j) % 3], pts: Pt[] = []; for (let k = 0; k <= 8; k++) pts.push([L.x + j * 10 - 10 + Math.sin(t * 1.4 + k * 0.6 + j) * (k * 1.8) * s, L.y - k * 12 * s]); line(c, pts, col, 5 * s); } },
  bubble(c, { L, t }) { const y = ((L.y - t * 18 * L.s) % 260 + 260) % 260 + 60; c.beginPath(); c.arc(L.x + Math.sin(t + L.x) * 6, y, 4 * L.s + 2, 0, 7); c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1.4; c.stroke(); },
  sandbed(c, { L }) { band(c, L.y, 5, 110, 1, "#E9CF9E", FH + 60, -1); },
  riverband(c, { L, t }) { const pts: Pt[] = []; for (let x = -110; x <= FW + 110; x += 20) pts.push([x, L.y + Math.sin(x / 120 + 1) * 10]); const pts2: Pt[] = []; for (let x = FW + 110; x >= -110; x -= 20) pts2.push([x, L.y + 70 + Math.sin(x / 100) * 12]); piece(c, poly(rough([...pts, ...pts2], 0.4)), tint(PAL.powder), { sh: -1, rim: false }); for (let i = 0; i < 6; i++) { const x = ((i * 130 + t * 20) % (FW + 120)) - 60; line(c, [[x, L.y + 30 + (i % 3) * 14], [x + 28, L.y + 30 + (i % 3) * 14]], "#ffffff", 2); } },
  reed(c, { L, t }) { for (let j = 0; j < 4; j++) { const x = L.x + j * 9, sw = Math.sin(t * 1.3 + j + L.x) * 4; line(c, [[x, L.y], [x + sw, L.y - 50 - j * 6]], PAL.dleaf, 3); E(c, x + sw, L.y - 54 - j * 6, 3, 9, PAL.oakSh, { sh: 0.3, rim: false }); } },
  peak(c, { L }) { const s = L.s, col = [PAL.lav, PAL.dlav, PAL.sage][L.c ?? 0]; P(c, [[L.x - 130 * s, L.y], [L.x, L.y - 150 * s], [L.x + 130 * s, L.y]], col, { sh: 1 }); P(c, [[L.x - 28 * s, L.y - 116 * s], [L.x, L.y - 150 * s], [L.x + 28 * s, L.y - 116 * s], [L.x + 12 * s, L.y - 124 * s], [L.x, L.y - 112 * s], [L.x - 10 * s, L.y - 124 * s]], PAL.cream, { sh: 0.3 }); },
  orb(c, { L, t }) { const col = [PAL.lav, PAL.peach, PAL.powder][L.c ?? 0], r = 22 * L.s, y = L.y + Math.sin(t * 0.5 + L.x) * 5; E(c, L.x, y, r, r, col, { sh: 0.8 }); E(c, L.x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.3, shade(col, 0.2), { sh: 0, rim: false }); if (L.c === 0) { piece(c, curve(ellPts(L.x, y, r * 1.7, r * 0.4, 16)), tint(PAL.gold), { sh: 0.3, rim: false }); E(c, L.x, y, r * 0.95, r * 0.95, col, { sh: 0, rim: false }); } },
  moonground(c) { band(c, 312, 6, 80, 0, "#c8c4d6", FH + 60, -1); E(c, 120, 336, 26, 8, "#aaa6bd", { sh: 0, rim: false }); E(c, 380, 342, 34, 9, "#aaa6bd", { sh: 0, rim: false }); },
  wall(c, { L }) { const col = ["#F7EEDF", "#FBE9D0", "#E3F0F4", "#EADDF0", "#F2E3C6"][L.c ?? 0]; c.fillStyle = tint(col); c.fillRect(-120, -80, FW + 240, FH + 200); for (let x = -100; x < FW + 100; x += 36) { c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(x, 0, 14, 292); } R(c, -110, 276, FW + 220, 18, shade(col, -0.08), { sh: 0.5 }); },
  window(c, { L }) { const s = L.s, w = 130 * s, h = 110 * s; R(c, L.x - 7, L.y - 7, w + 14, h + 14, PAL.cream, { sh: 0.8 }); const g = c.createLinearGradient(0, L.y, 0, L.y + h); g.addColorStop(0, "#A9DDF2"); g.addColorStop(1, "#E9F7FC"); piece(c, poly(rectPts(L.x, L.y, w, h)), g, { sh: 0, rim: false }); cloudAt(c, L.x + w * 0.3, L.y + h * 0.3, 0.55 * s); buildingAt(c, L.x + 6, L.y + h, 26 * s, 40 * s, PAL.lav, false); buildingAt(c, L.x + 40 * s, L.y + h, 30 * s, 56 * s, PAL.powder, false); R(c, L.x + w / 2 - 2, L.y, 4, h, PAL.cream, { sh: 0.2, rim: false }); R(c, L.x, L.y + h / 2 - 2, w, 4, PAL.cream, { sh: 0.2, rim: false }); },
  shelf(c, { L }) { R(c, L.x, L.y + 30, 150, 6, PAL.oakSh, { sh: 0.8 }); const cs = [PAL.coral, PAL.blue, PAL.yellow, PAL.leaf, PAL.lav]; for (let i = 0; i < 6; i++) R(c, L.x + 6 + i * 22, L.y + 4 + (i % 2) * 5, 16, 26 - (i % 2) * 5, cs[i % 5], { sh: 0.4 }); },
  floor(c, { L }) { c.fillStyle = tint("#DDAA68"); c.fillRect(-120, L.y, FW + 240, 160); c.fillStyle = "rgba(154,101,61,.35)"; for (let x = -100; x < FW + 100; x += 60) c.fillRect(x, L.y, 2, 160); c.fillStyle = "rgba(255,255,255,.3)"; c.fillRect(-120, L.y, FW + 240, 3); },
  bench(c, { L }) { const s = L.s; R(c, L.x, L.y - 26 * s, 340 * s, 10 * s, PAL.oak, { sh: 0.9 }); R(c, L.x + 14 * s, L.y - 16 * s, 8 * s, 26 * s, PAL.oakSh, { sh: 0.4 }); R(c, L.x + 318 * s, L.y - 16 * s, 8 * s, 26 * s, PAL.oakSh, { sh: 0.4 }); P(c, [[L.x + 40 * s, L.y - 26 * s], [L.x + 52 * s, L.y - 26 * s], [L.x + 60 * s, L.y - 48 * s], [L.x + 32 * s, L.y - 48 * s]], PAL.sky, { sh: 0.4 }); E(c, L.x + 46 * s, L.y - 54 * s, 13 * s, 8 * s, PAL.mint, { sh: 0.3 }); P(c, [[L.x + 90 * s, L.y - 26 * s], [L.x + 104 * s, L.y - 26 * s], [L.x + 110 * s, L.y - 52 * s], [L.x + 84 * s, L.y - 52 * s]], PAL.pink, { sh: 0.4 }); },
  stands(c, { L, t }) { for (let r = 0; r < 3; r++) { R(c, -110, L.y - 40 + r * 14, FW + 220, 14, [PAL.lav, PAL.dlav, PAL.lav][r], { sh: 0.5 }); for (let x = -90 + (r % 2) * 14; x < FW + 100; x += 28) { E(c, x, L.y - 46 + r * 14 + Math.sin(t * 4 + x) * (r === 1 ? 1.5 : 0.6), 5, 5, SKINS[(x / 28 + r) & 3 ? 1 : 3], { sh: 0.1, rim: false }); } } },
  fieldgrass(c, { L }) { band(c, L.y, 2, 80, 0, PAL.leaf, FH + 60, -1); for (let x = -80; x < FW + 100; x += 90) { c.fillStyle = "rgba(255,255,255,.10)"; c.fillRect(x, L.y, 45, 120); } },
  goal(c, { L }) { line(c, [[L.x, L.y], [L.x, L.y - 70], [L.x + 70, L.y - 70], [L.x + 70, L.y]], PAL.cream, 4); for (let i = 1; i < 6; i++) line(c, [[L.x + i * 12, L.y - 70], [L.x + i * 12, L.y]], "rgba(255,255,255,.55)", 1); },
  lines(c, { L }) { R(c, -110, L.y + 12, FW + 220, 3, PAL.cream, { sh: 0, rim: false }); },
  curtain(c, { t }) { for (const sd of [0, 1]) { const x0 = sd ? FW - 120 : -20; c.save(); const pts: Pt[] = [[x0, -20], [x0 + 140, -20], [x0 + 110 + Math.sin(t * 0.8) * 3, 280], [x0 + 20, 280]]; piece(c, poly(pts), tint(PAL.red), { sh: 1 }); for (let i = 1; i < 5; i++) line(c, [[x0 + i * 26, -10], [x0 + i * 22 + 8, 280]], shade(PAL.red, -0.18), 3); c.restore(); } P(c, [[-120, -20], [FW + 120, -20], [FW + 120, 44], [-120, 44]], PAL.coral, { sh: 1 }); for (let x = -100; x < FW + 100; x += 40) P(c, [[x, 44], [x + 40, 44], [x + 20, 62]], PAL.red, { sh: 0.5 }); },
  spot(c, { L, t }) { const x = L.x + Math.sin(t * 0.8) * 90; c.fillStyle = "rgba(255,244,196,.26)"; c.beginPath(); c.moveTo(x - 6, 40); c.lineTo(x + 6, 40); c.lineTo(x + 90, 300); c.lineTo(x - 90, 300); c.closePath(); c.fill(); },
  boards(c, { L }) { c.fillStyle = tint("#C98B4D"); c.fillRect(-120, L.y, FW + 240, 160); c.fillStyle = "rgba(90,50,30,.35)"; for (let y = L.y + 14; y < FH; y += 20) c.fillRect(-120, y, FW + 240, 2); c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(-120, L.y, FW + 240, 3); },
  frame(c, { L }) { R(c, L.x - 6, L.y - 6, 112, 92, PAL.oak, { sh: 0.9 }); const cols = [[PAL.sky, PAL.leaf], [PAL.peach, PAL.lav], [PAL.mint, PAL.blue]][L.c ?? 0]; R(c, L.x, L.y, 100, 80, cols[0], { sh: 0, rim: false }); E(c, L.x + 30, L.y + 28, 14, 14, PAL.yellow, { sh: 0.3 }); P(c, [[L.x, L.y + 80], [L.x + 40, L.y + 46], [L.x + 70, L.y + 66], [L.x + 100, L.y + 40], [L.x + 100, L.y + 80]], cols[1], { sh: 0.3 }); },
  plinth(c, { L }) { R(c, L.x - 28, L.y - 70, 56, 70, PAL.lgray, { sh: 0.9 }); R(c, L.x - 34, L.y - 78, 68, 10, PAL.cream, { sh: 0.6 }); },
  fence(c, { L }) { R(c, -110, L.y - 22, FW + 220, 5, PAL.cream, { sh: 0.5 }); R(c, -110, L.y - 8, FW + 220, 5, PAL.cream, { sh: 0.5 }); for (let x = -100; x < FW + 100; x += 26) P(c, [[x, L.y + 8], [x, L.y - 36], [x + 7, L.y - 42], [x + 14, L.y - 36], [x + 14, L.y + 8]], PAL.cream, { sh: 0.7 }); },
  barn(c, { L }) { const x = L.x, y = L.y, s = L.s; R(c, x - 70 * s, y - 80 * s, 140 * s, 80 * s, PAL.red, { sh: 0.9 }); P(c, [[x - 80 * s, y - 80 * s], [x - 50 * s, y - 120 * s], [x + 50 * s, y - 120 * s], [x + 80 * s, y - 80 * s]], shade(PAL.red, -0.15), { sh: 0.6 }); R(c, x - 22 * s, y - 50 * s, 44 * s, 50 * s, PAL.cream, { sh: 0.4 }); line(c, [[x - 22 * s, y - 50 * s], [x + 22 * s, y], [x, y - 50 * s], [x - 22 * s, y]], PAL.red, 2); },
  desk(c, { L }) { const s = L.s; R(c, L.x, L.y - 34 * s, 210 * s, 12 * s, PAL.oak, { sh: 1 }); R(c, L.x + 10 * s, L.y - 22 * s, 10 * s, 40 * s, PAL.oakSh, { sh: 0.4 }); R(c, L.x + 190 * s, L.y - 22 * s, 10 * s, 40 * s, PAL.oakSh, { sh: 0.4 }); R(c, L.x + 70 * s, L.y - 76 * s, 70 * s, 42 * s, PAL.dark, { sh: 0.8 }); R(c, L.x + 75 * s, L.y - 71 * s, 60 * s, 32 * s, PAL.sky, { sh: 0, rim: false }); R(c, L.x + 98 * s, L.y - 34 * s, 14 * s, 4 * s, PAL.gray, { sh: 0.3 }); },
  plant(c, { L, t }) { const s = L.s; R(c, L.x - 14 * s, L.y - 26 * s, 28 * s, 26 * s, PAL.coral, { sh: 0.8 }); for (let i = -2; i <= 2; i++) { c.save(); c.translate(L.x + i * 6 * s, L.y - 26 * s); c.rotate(i * 0.3 + Math.sin(t * 1.4 + i) * 0.04); E(c, 0, -22 * s, 5 * s, 20 * s, i % 2 ? PAL.leaf : PAL.dleaf, { sh: 0.4 }); c.restore(); } },
  columns(c) { for (const x of [60, 180, 460, 580]) { R(c, x - 20, 0, 40, 292, PAL.cream, { sh: 1 }); for (let i = 0; i < 3; i++) line(c, [[x - 8 + i * 8, 10], [x - 8 + i * 8, 286]], shade(PAL.cream, -0.1), 2); R(c, x - 26, 0, 52, 14, PAL.ivory, { sh: 0.6 }); R(c, x - 26, 278, 52, 14, PAL.ivory, { sh: 0.6 }); } },
  flag(c, { L, t }) { line(c, [[L.x, L.y], [L.x, L.y + 150]], PAL.char, 3); const w = Math.sin(t * 3) * 4; for (let i = 0; i < 4; i++) P(c, [[L.x + 2, L.y + i * 12], [L.x + 62, L.y + i * 12 + w], [L.x + 62, L.y + i * 12 + 12 + w], [L.x + 2, L.y + i * 12 + 12]], i % 2 ? PAL.cream : PAL.red, { sh: i ? 0 : 0.5, rim: false }); R(c, L.x + 2, L.y, 26, 26, PAL.deep, { sh: 0.2, rim: false }); },
  podium(c, { L }) { P(c, [[L.x - 36, L.y], [L.x + 36, L.y], [L.x + 28, L.y - 62], [L.x - 28, L.y - 62]], PAL.oak, { sh: 1 }); R(c, L.x - 4, L.y - 78, 6, 16, PAL.dark, { sh: 0.4 }); E(c, L.x - 1, L.y - 80, 4, 4, PAL.dark, { sh: 0.2, rim: false }); },
  rug(c, { L }) { E(c, L.x, L.y, 170, 22, PAL.lav, { sh: 0.6, rim: false }); E(c, L.x, L.y, 150, 17, PAL.pink, { sh: 0, rim: false }); },
  fg(c, { L, t }) { if (L.c === 1) { c.fillStyle = "rgba(90,60,50,.10)"; c.fillRect(-120, L.y - 8, FW + 240, 60); return; } band(c, L.y, 3, 30, 0.5, PAL.dleaf, FH + 60, -1); for (let x = -90; x < FW + 100; x += 38) { c.save(); c.translate(x, L.y + 1); c.rotate(Math.sin(t * 1.5 + x) * 0.05); P(c, [[-5, 2], [0, -16 - (x & 7)], [5, 2]], PAL.leaf, { sh: 0.2, rim: false }); c.restore(); } },
  butterflyfx(c, { L, t }) { const x = ((L.x + t * 22) % (FW + 100)) - 30, y = L.y + Math.sin(t * 2.2) * 24, f = Math.abs(Math.sin(t * 14)); c.save(); c.translate(x, y); for (const sd of [-1, 1]) E(c, sd * 6, -2, 7 * (0.35 + 0.65 * f), 5, sd < 0 ? PAL.coral : PAL.peach, { sh: 0.3 }); R(c, -1, -5, 2, 10, PAL.char, { sh: 0, rim: false }); c.restore(); },
};
const SKY: Record<string, [string, string]> = { day: ["#A9DDF2", "#EAF7FC"], dusk: ["#8173AE", "#F6B294"], night: ["#27325f", "#5b64a0"], room: ["#F7EEDF", "#F7EEDF"] };
let curPal = "day";

/* ------------------------------------------------------------ actors (feet at 0,0, about 62 units tall before scale) */
interface Mot { la: number; dx: number; dy: number; rot: number; sc: number; arm: number; leg: number; flip: boolean; ph: number }
function motion(a: string | undefined, t: number, sd: number): Mot {
  const m: Mot = { la: 0, dx: 0, dy: 0, rot: 0, sc: 1, arm: 0, leg: 0, flip: false, ph: t * 4 + sd % 7 };
  switch (a) {
    case "walk": { const v = Math.cos(t * 0.9 + sd % 5); m.dx = Math.sin(t * 0.9 + sd % 5) * 38; m.dy = -Math.abs(Math.sin(t * 6)) * 3; m.leg = Math.sin(t * 6); m.arm = Math.sin(t * 6) * 0.5; m.la = -m.arm; m.flip = v < 0; break; }
    case "fly": { const v = Math.cos(t * 0.7 + sd % 5); m.dx = Math.sin(t * 0.7 + sd % 5) * 70; m.dy = -34 + Math.sin(t * 1.6) * 12; m.rot = -0.08 + Math.sin(t * 1.6) * 0.06; m.flip = v < 0; break; }
    case "jump": m.dy = -Math.abs(Math.sin(t * 3.2 + (sd % 7) * 0.5)) * 24; m.arm = -1.9; m.la = 1.9; m.leg = Math.sin(t * 6.4) * 0.3; break;
    case "grow": m.sc = 0.78 + 0.22 * (Math.sin(t * 0.8 - 1) * 0.5 + 0.5); m.dy = Math.sin(t * 1.8) * 1.5; break;
    case "float": m.dx = Math.sin(t * 0.7 + sd % 5) * 20; m.dy = Math.sin(t * 1.5 + sd % 7) * 7; m.rot = Math.sin(t * 1.5) * 0.04; m.flip = Math.cos(t * 0.7 + sd % 5) < 0; break;
    case "spin": m.dx = Math.sin(t * 0.8 + sd % 5) * 46; m.flip = Math.cos(t * 0.8 + sd % 5) < 0; m.ph = t * 7; m.dy = Math.sin(t * 7) * 1; m.leg = Math.sin(t * 7); break;
    case "wave": m.dy = Math.sin(t * 2 + sd % 7) * 1.6; m.arm = -2.4 + Math.sin(t * 7) * 0.5; break;
    case "work": m.dy = Math.sin(t * 6 + sd % 5) * 1.4; m.arm = -0.9 + Math.sin(t * 9) * 0.45; m.la = 0.5 + Math.sin(t * 9 + 2) * 0.3; break;
    default: m.dy = Math.sin(t * 2.2 + sd % 7) * 2.6;
  }
  return m;
}
function person(c: C, x: Ctx, kind: "kid" | "adult" | "scientist", m: Mot) {
  const ci = x.L.c ?? 0, skin = SKINS[(x.sd >> 3) % 5], hair = HAIRS[(x.sd >> 5) % 5], shirt = kind === "scientist" ? PAL.cream : SHIRTS[ci % 5], pants = kind === "kid" ? PAL.deep : PAL.char, k = kind === "kid" ? 0.82 : 1;
  c.save(); c.scale(k, k); E(c, 2, 1, 20, 4, "#3a2630", { sh: 0, rim: false }); c.globalAlpha = 1;
  const sw = m.leg * 5; for (const sd of [-1, 1]) { R(c, sd * 5 - 3.5 + sw * sd, -22, 7, 20, pants, { sh: 0.4 }); R(c, sd * 5 - 4.5 + sw * sd, -3.4, 10, 4.4, PAL.dark, { sh: 0.2, rim: false }); }
  const body = (cc: C) => { cc.beginPath(); cc.moveTo(-11, -22); cc.lineTo(-12, -46); cc.quadraticCurveTo(0, -50, 12, -46); cc.lineTo(11, -22); cc.closePath(); };
  const arm = (side: number, ang: number) => { c.save(); c.translate(side * 11.5, -44); c.rotate(side * 0.15 + ang); R(c, -2.8, -1, 5.6, 20, shirt, { sh: 0.4 }); E(c, 0, 20.5, 3.2, 3.2, skin, { sh: 0.2, rim: false }); c.restore(); };
  arm(-1, m.la); piece(c, body, tint(shirt), { sh: 0.6 }); if (kind === "scientist") { P(c, [[-4, -46], [0, -36], [4, -46]], PAL.pink, { sh: 0, rim: false }); } else if (kind === "adult") { P(c, [[-4, -46], [0, -38], [4, -46]], PAL.cream, { sh: 0, rim: false }); } else R(c, -9, -33, 18, 3, shade(shirt, -0.12), { sh: 0, rim: false });
  arm(1, m.arm);
  R(c, -2.5, -52, 5, 6, skin, { sh: 0.2, rim: false });
  E(c, 0, -60, 10.5, 10.8, skin, { sh: 0.7 }); piece(c, curve(rough([[-11, -60], [-9, -69], [0, -73], [9, -69], [11, -60], [8, -63], [0, -66], [-8, -63]], 0.3)), tint(hair), { sh: 0.3 });
  if (kind === "adult" && (x.sd & 1)) E(c, -10, -52, 4, 8, hair, { sh: 0.2, rim: false });
  const bl = Math.sin(x.t * 1.1 + x.sd) > 0.985; c.fillStyle = PAL.dark; if (!bl) { c.beginPath(); c.arc(-3.6, -60, 1.3, 0, 7); c.arc(3.6, -60, 1.3, 0, 7); c.fill(); }
  c.strokeStyle = PAL.dark; c.lineWidth = 0.9; c.beginPath(); c.arc(0, -57, 3.2, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); c.fillStyle = "rgba(242,143,126,.45)"; c.beginPath(); c.arc(-6.5, -56.5, 1.8, 0, 7); c.arc(6.5, -56.5, 1.8, 0, 7); c.fill();
  if (kind === "scientist") { c.strokeStyle = PAL.dark; c.lineWidth = 0.9; c.beginPath(); c.arc(-3.6, -60, 3, 0, 7); c.arc(3.6, -60, 3, 0, 7); c.moveTo(-0.6, -60); c.lineTo(0.6, -60); c.stroke(); }
  c.restore();
}
function dog(c: C, m: Mot, cat = false) { const col = cat ? PAL.peach : PAL.oak, w = Math.sin(m.ph * 1.5); E(c, 2, 1, 22, 4, "#3a2630", { sh: 0, rim: false }); for (const dx of [-14, -6, 8, 16]) R(c, dx - 2, -14, 5, 14 + (dx > 0 ? m.leg * 2 : -m.leg * 2), shade(col, -0.1), { sh: 0.3 }); E(c, 0, -22, 22, 12, col, { sh: 0.7 }); c.save(); c.translate(-20, -20); c.rotate(cat ? -0.9 + w * 0.1 : -0.5 + w * 0.5); R(c, -2, -14, 4, 16, col, { sh: 0.3 }); c.restore(); E(c, 20, -32, 10, 9, col, { sh: 0.6 }); P(c, [[14, -38], [17, -48], [21, -38]], shade(col, -0.15), { sh: 0.2 }); P(c, [[22, -38], [26, -47], [28, -37]], shade(col, -0.15), { sh: 0.2 }); c.fillStyle = PAL.dark; c.beginPath(); c.arc(22, -33, 1.3, 0, 7); c.arc(27, -32, 2, 0, 7); c.fill(); if (!cat) E(c, 25, -27, 4, 2.4, PAL.pink, { sh: 0, rim: false }); }
function bird(c: C, m: Mot, col: string) { const f = Math.sin(m.ph * 3.2); E(c, 0, -18, 15, 9, col, { sh: 0.6 }); E(c, 13, -23, 7, 6.5, col, { sh: 0.4 }); P(c, [[19, -23], [26, -21], [19, -19]], PAL.gold, { sh: 0.1, rim: false }); c.fillStyle = PAL.dark; c.beginPath(); c.arc(15, -24, 1.2, 0, 7); c.fill(); c.save(); c.translate(-2, -22); c.rotate(-0.4 + f * 0.9); E(c, -6, -9, 7, 14, shade(col, -0.12), { sh: 0.3 }); c.restore(); P(c, [[-14, -18], [-26, -22], [-24, -12]], shade(col, -0.1), { sh: 0.2 }); }
function fishAt(c: C, m: Mot, col: string, s = 1) { const f = Math.sin(m.ph * 2) * 0.2; E(c, 0, -20 * s, 20 * s, 11 * s, col, { sh: 0.6 }); c.save(); c.translate(-18 * s, -20 * s); c.rotate(f); P(c, [[0, 0], [-14 * s, -9 * s], [-14 * s, 9 * s]], shade(col, -0.1), { sh: 0.3 }); c.restore(); c.fillStyle = PAL.dark; c.beginPath(); c.arc(11 * s, -23 * s, 1.6 * s, 0, 7); c.fill(); }
const ACTOR: Record<string, (c: C, x: Ctx, m: Mot) => void> = {
  kid: (c, x, m) => person(c, x, "kid", m), adult: (c, x, m) => person(c, x, "adult", m), scientist: (c, x, m) => person(c, x, "scientist", m),
  dog: (c, _x, m) => dog(c, m), cat: (c, _x, m) => dog(c, m, true), bird: (c, _x, m) => bird(c, m, PAL.blue), fish: (c, _x, m) => fishAt(c, m, PAL.coral),
  whale(c, _x, m) { const t = Math.sin(m.ph * 0.4); E(c, 0, -30, 60, 26, PAL.deep, { sh: 0.8 }); E(c, 10, -20, 46, 14, PAL.cream, { sh: 0, rim: false }); c.save(); c.translate(-54, -34); c.rotate(-0.4 + t * 0.2); P(c, [[0, 0], [-26, -22], [-14, 4], [-28, 22]], PAL.deep, { sh: 0.5 }); c.restore(); c.fillStyle = PAL.dark; c.beginPath(); c.arc(38, -36, 2, 0, 7); c.fill(); for (let i = 0; i < 3; i++) line(c, [[24, -56 - i * 6], [24 + (i - 1) * 8, -66 - i * 8]], "rgba(255,255,255,.8)", 2.5); },
  turtle(c, _x, m) { E(c, 2, 1, 26, 4, "#3a2630", { sh: 0, rim: false }); for (const dx of [-14, 12]) R(c, dx, -9, 8, 9 + m.leg * 2, PAL.sage, { sh: 0.3 }); E(c, 0, -17, 26, 17, PAL.leaf, { sh: 0.8 }); for (const [dx, dy] of [[-10, -20], [4, -22], [-2, -12], [12, -14]]) E(c, dx, dy, 6, 5, PAL.dleaf, { sh: 0, rim: false }); E(c, 28, -16, 8, 6.5, PAL.sage, { sh: 0.4 }); c.fillStyle = PAL.dark; c.beginPath(); c.arc(31, -18, 1.2, 0, 7); c.fill(); },
  bee(c, _x, m) { const f = Math.abs(Math.sin(m.ph * 5)); c.save(); c.translate(0, -26 + Math.sin(m.ph * 1.2) * 4); for (const sd of [-1, 1]) E(c, sd * 5, -8, 8, 4 + f * 6, "rgba(220,240,250,.9)", { sh: 0.2 }); E(c, 0, 0, 13, 9, PAL.yellow, { sh: 0.6 }); for (const dx of [-4, 2, 8]) R(c, dx - 1.5, -8, 3, 16, PAL.dark, { sh: 0, rim: false }); E(c, 13, -1, 5, 5, PAL.dark, { sh: 0.2, rim: false }); c.restore(); },
  butterfly(c, _x, m) { const f = 0.35 + 0.65 * Math.abs(Math.sin(m.ph * 2.4)); c.save(); c.translate(0, -28 + Math.sin(m.ph) * 4); for (const sd of [-1, 1]) { E(c, sd * 11 * f, -6, 11 * f, 12, PAL.coral, { sh: 0.5 }); E(c, sd * 8 * f, 8, 8 * f, 9, PAL.gold, { sh: 0.3 }); E(c, sd * 11 * f, -6, 4 * f, 4, PAL.cream, { sh: 0, rim: false }); } R(c, -1.8, -12, 3.6, 28, PAL.char, { sh: 0.2, rim: false }); c.restore(); },
  robot(c, x, m) { E(c, 2, 1, 22, 4, "#3a2630", { sh: 0, rim: false }); for (const sd of [-1, 1]) R(c, sd * 8 - 3, -16, 6, 16, PAL.gray, { sh: 0.3 }); R(c, -17, -46, 34, 30, PAL.blue, { sh: 0.8 }); R(c, -9, -40, 18, 12, PAL.sky, { sh: 0, rim: false }); const bl = Math.sin(m.ph * 2) > 0; E(c, -3, -35, 2, 2, bl ? PAL.coral : PAL.yellow, { sh: 0, rim: false }); E(c, 4, -35, 2, 2, PAL.dark, { sh: 0, rim: false }); c.save(); c.translate(17, -42); c.rotate(0.3 + m.arm * 0.4); R(c, -2.5, 0, 5, 20, PAL.gray, { sh: 0.3 }); R(c, -5, 18, 10, 6, PAL.gold, { sh: 0.2 }); c.restore(); R(c, -20, -42, 5, 18, PAL.gray, { sh: 0.3 }); R(c, -13, -62, 26, 17, PAL.lgray, { sh: 0.7 }); E(c, -5, -54, 3.2, 3.2, PAL.dark, { sh: 0, rim: false }); E(c, 5, -54, 3.2, 3.2, PAL.dark, { sh: 0, rim: false }); line(c, [[0, -62], [0, -70]], PAL.char, 1.6); E(c, 0, -71, 3, 3, Math.sin(x.t * 6) > 0 ? PAL.coral : PAL.yellow, { sh: 0.2, rim: false }); },
  rocket(c, x, m) { const fl = 8 + Math.sin(x.t * 22) * 4; P(c, [[-7, -4], [0, -4 - fl - 12], [7, -4]], PAL.gold, { sh: 0, rim: false }); P(c, [[-4, -4], [0, -4 - fl - 2], [4, -4]], PAL.coral, { sh: 0, rim: false }); P(c, [[-18, -8], [-8, -34], [-8, -8]], PAL.coral, { sh: 0.4 }); P(c, [[18, -8], [8, -34], [8, -8]], PAL.coral, { sh: 0.4 }); piece(c, curve(rough([[-10, -6], [-11, -40], [-6, -62], [0, -74], [6, -62], [11, -40], [10, -6]], 0.3)), tint(PAL.cream), { sh: 0.8 }); E(c, 0, -46, 5.5, 5.5, PAL.sky, { sh: 0.2 }); P(c, [[-6, -62], [0, -76], [6, -62]], PAL.red, { sh: 0.2, rim: false }); void m; },
  planet(c, x, m) { const r = 24; E(c, 0, -28, r, r, PAL.lav, { sh: 0.8 }); piece(c, curve(rough(ellPts(0, -28, 40, 8, 18), 0.3)), tint(PAL.gold), { sh: 0.2, rim: false }); E(c, -8, -36, 12, 8, shade(PAL.lav, 0.2), { sh: 0, rim: false }); void x; void m; },
  ball(c, _x, m) { c.save(); c.translate(0, -16); c.rotate(m.ph * 0.8); E(c, 0, 0, 16, 16, PAL.cream, { sh: 0.7 }); for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283; P(c, [[Math.cos(a) * 5, Math.sin(a) * 5], [Math.cos(a - 0.4) * 11, Math.sin(a - 0.4) * 11], [Math.cos(a + 0.4) * 11, Math.sin(a + 0.4) * 11]], PAL.dark, { sh: 0, rim: false }); } c.restore(); },
  book(c, _x, m) { c.save(); c.translate(0, -18 + Math.sin(m.ph * 0.8) * 2); const f = 0.7 + 0.3 * Math.sin(m.ph * 1.2); P(c, [[0, 0], [-34 * f, -6], [-34 * f, -34], [0, -28]], PAL.red, { sh: 0.7 }); P(c, [[0, 0], [34 * f, -6], [34 * f, -34], [0, -28]], PAL.coral, { sh: 0.7 }); for (let i = 0; i < 3; i++) { line(c, [[-6, -8 - i * 6], [-26 * f, -12 - i * 6]], PAL.cream, 1.6); line(c, [[6, -8 - i * 6], [26 * f, -12 - i * 6]], PAL.cream, 1.6); } c.restore(); },
  bike(c, _x, m) { for (const dx of [-24, 24]) { c.save(); c.translate(dx, -17); c.rotate(m.ph * 0.9); c.beginPath(); c.arc(0, 0, 16, 0, 7); c.strokeStyle = PAL.dark; c.lineWidth = 3; c.stroke(); for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(i * 1.047) * 15, Math.sin(i * 1.047) * 15); c.lineWidth = 0.8; c.stroke(); } c.restore(); } line(c, [[-24, -17], [-4, -38], [14, -38], [24, -17], [-4, -17], [-24, -17]], PAL.red, 3.5); line(c, [[-4, -17], [-8, -42]], PAL.red, 3); R(c, -14, -46, 14, 4, PAL.dark, { sh: 0.2, rim: false }); line(c, [[14, -38], [18, -52], [26, -52]], PAL.gray, 3); E(c, -4, -58, 8, 6, PAL.yellow, { sh: 0.3 }); },
  boat(c, _x, m) { const r = Math.sin(m.ph * 0.5) * 0.04; c.save(); c.rotate(r); P(c, [[-44, -14], [44, -14], [32, 4], [-32, 4]], PAL.red, { sh: 0.8 }); line(c, [[0, -14], [0, -78]], PAL.oakSh, 3); P(c, [[2, -76], [38, -24], [2, -24]], PAL.cream, { sh: 0.6 }); P(c, [[-2, -66], [-28, -24], [-2, -24]], PAL.sky, { sh: 0.5 }); c.restore(); },
  bus(c, _x, m) { R(c, -50, -50, 100, 38, PAL.gold, { sh: 0.9 }); for (let i = 0; i < 4; i++) R(c, -44 + i * 22, -45, 16, 14, PAL.sky, { sh: 0, rim: false }); R(c, -50, -24, 100, 5, PAL.dark, { sh: 0, rim: false }); for (const dx of [-30, 30]) { c.save(); c.translate(dx, -10); c.rotate(m.ph); E(c, 0, 0, 10, 10, PAL.dark, { sh: 0.5 }); E(c, 0, 0, 4, 4, PAL.lgray, { sh: 0, rim: false }); c.restore(); } },
  tree: (c, x, m) => treeAt(c, 0, 0, 1.3 * m.sc, Math.sin(x.t) * 0.02, PAL.leaf),
  flower: (c, x, m) => flowerAt(c, 0, 0, 2.1 * m.sc, [PAL.coral, PAL.yellow, PAL.lav][x.L.c ?? 0], Math.sin(x.t * 1.5) * 0.06),
  coins(c, _x, m) { for (let i = 0; i < 4; i++) { const w = 20 + (i === 3 ? Math.abs(Math.cos(m.ph * 0.7)) * 0 : 0); E(c, i % 2 ? 6 : -6, -6 - i * 7, w, 6.5, i === 3 ? PAL.yellow : PAL.gold, { sh: 0.5 }); } c.fillStyle = PAL.oakSh; c.font = `800 11px ${FONT}`; c.textAlign = "center"; c.fillText("$", -6, -4); },
  laptop(c, _x, m) { P(c, [[-24, -4], [24, -4], [30, 0], [-30, 0]], PAL.gray, { sh: 0.6 }); R(c, -22, -40, 44, 36, PAL.dark, { sh: 0.8 }); R(c, -19, -37, 38, 30, PAL.sky, { sh: 0, rim: false }); for (let i = 0; i < 4; i++) R(c, -15, -33 + i * 6, 14 + ((i * 7 + Math.floor(m.ph)) % 16), 3, i % 2 ? PAL.coral : PAL.blue, { sh: 0, rim: false }); },
  lightbulb(c, x) { const g = 0.5 + 0.5 * Math.sin(x.t * 2.4); c.fillStyle = `rgba(248,217,119,${0.12 + g * 0.16})`; c.beginPath(); c.arc(0, -40, 40 + g * 6, 0, 7); c.fill(); E(c, 0, -42, 17, 18, PAL.yellow, { sh: 0.7 }); R(c, -8, -26, 16, 10, PAL.gray, { sh: 0.3 }); line(c, [[-4, -36], [0, -44], [4, -36]], PAL.gold, 1.6); for (let i = 0; i < 6; i++) { const a = -2.6 + i * 0.42; line(c, [[Math.cos(a) * 26, -42 + Math.sin(a) * 26], [Math.cos(a) * 34, -42 + Math.sin(a) * 34]], PAL.gold, 2); } },
  trophy(c, x) { R(c, -12, -6, 24, 6, PAL.oakSh, { sh: 0.4 }); R(c, -3, -20, 6, 14, PAL.gold, { sh: 0.3 }); P(c, [[-18, -62], [18, -62], [12, -26], [-12, -26]], PAL.gold, { sh: 0.8 }); line(c, [[-18, -56], [-28, -50], [-14, -38]], PAL.gold, 3); line(c, [[18, -56], [28, -50], [14, -38]], PAL.gold, 3); P(c, [[0, -54], [3, -46], [11, -46], [5, -41], [7, -33], [0, -38], [-7, -33], [-5, -41], [-11, -46], [-3, -46]], PAL.cream, { sh: 0, rim: false }); void x; },
  easel(c, _x, m) { line(c, [[-22, 0], [-6, -62]], PAL.oakSh, 4); line(c, [[22, 0], [6, -62]], PAL.oakSh, 4); line(c, [[0, 0], [0, -56]], PAL.oakSh, 3); R(c, -26, -76, 52, 40, PAL.cream, { sh: 0.8 }); E(c, -8, -62, 9, 9, PAL.yellow, { sh: 0.2 }); P(c, [[-26, -36], [-4, -52], [10, -42], [26, -56], [26, -36]], PAL.leaf, { sh: 0.2 }); const b = Math.sin(m.ph * 1.6); line(c, [[34, -50 + b * 4], [20, -64 + b * 4]], PAL.oakSh, 3); E(c, 19, -65 + b * 4, 3, 3, PAL.coral, { sh: 0, rim: false }); },
  music(c, x, m) { R(c, -14, -34, 28, 34, PAL.red, { sh: 0.8 }); E(c, 0, -34, 14, 5, PAL.cream, { sh: 0, rim: false }); line(c, [[-12, -20], [12, -20]], PAL.cream, 1.2); line(c, [[-12, -12], [12, -12]], PAL.cream, 1.2); for (let i = 0; i < 3; i++) { const p = (x.t * 0.6 + i / 3) % 1; c.globalAlpha = 1 - p; c.fillStyle = tint(PAL.dlav); c.font = `800 ${16 + i * 3}px ${FONT}`; c.textAlign = "center"; c.fillText(["♪", "♫", "♪"][i], -20 + i * 22 + Math.sin(p * 6) * 4, -46 - p * 42); c.globalAlpha = 1; } void m; },
  microscope(c, _x, m) { R(c, -18, -6, 36, 6, PAL.gray, { sh: 0.6 }); line(c, [[8, -6], [8, -44], [-6, -52]], PAL.dleaf, 6); c.save(); c.translate(-8, -54); c.rotate(0.5); R(c, -4, -2, 8, 30, PAL.deep, { sh: 0.5 }); c.restore(); R(c, -14, -22, 20, 4, PAL.lgray, { sh: 0.3 }); E(c, -4, -30 - Math.sin(m.ph) * 0.8, 3, 2, PAL.gold, { sh: 0, rim: false }); },
  telescope(c, _x, m) { line(c, [[0, 0], [-16, -34]], PAL.oakSh, 3); line(c, [[0, 0], [16, -34]], PAL.oakSh, 3); line(c, [[0, 0], [0, -34]], PAL.oakSh, 3); c.save(); c.translate(0, -38); c.rotate(-0.7 + Math.sin(m.ph * 0.3) * 0.05); R(c, -8, -50, 16, 52, PAL.blue, { sh: 0.8 }); R(c, -10, -56, 20, 8, PAL.gold, { sh: 0.4 }); R(c, -6, -2, 12, 10, PAL.deep, { sh: 0.3 }); c.restore(); },
  gradcap(c, x, m) { E(c, 0, -22, 18, 11, PAL.dark, { sh: 0.7 }); P(c, [[-34, -28], [0, -42], [34, -28], [0, -14]], "#3b4750", { sh: 0.8 }); line(c, [[0, -28], [24, -22], [26, -8]], PAL.gold, 2); E(c, 26, -6, 3.4, 5, PAL.gold, { sh: 0.2, rim: false }); void x; void m; },
  trafficlight(c, x, m) { R(c, -3, -66, 6, 66, PAL.char, { sh: 0.5 }); R(c, -13, -102, 26, 46, PAL.dark, { sh: 0.8 }); const ph = Math.floor((x.t * 0.6 + m.ph * 0) % 3); [[PAL.red, 0], [PAL.gold, 1], [PAL.leaf, 2]].forEach(([col, i]) => E(c, 0, -92 + (i as number) * 15, 5, 5, ph === i ? (col as string) : shade(col as string, -0.45), { sh: 0, rim: false })); },
  kite(c, x, m) { const sw = Math.sin(x.t * 1.5); c.save(); c.translate(0, -72 + sw * 6); c.rotate(sw * 0.1); P(c, [[0, -26], [18, 0], [0, 26], [-18, 0]], PAL.coral, { sh: 0.7 }); P(c, [[0, -26], [18, 0], [0, 0]], PAL.yellow, { sh: 0, rim: false }); line(c, [[0, -26], [0, 26]], PAL.dark, 1); line(c, [[0, 26], [-12 + sw * 6, 46], [8 - sw * 6, 62], [-6, 80]], PAL.lav, 2); c.restore(); line(c, [[0, -46 + sw * 6], [-30, 0]], PAL.char, 1); void m; },
  dino(c, _x, m) { const t = Math.sin(m.ph * 0.4); E(c, 4, 1, 52, 5, "#3a2630", { sh: 0, rim: false }); P(c, [[-52, -22], [-30, -34], [-30, -14]], PAL.leaf, { sh: 0.4 }); E(c, -2, -32, 36, 20, PAL.leaf, { sh: 0.8 }); for (const dx of [-14, 12]) R(c, dx - 4, -22, 10, 22 + (dx > 0 ? m.leg * 2 : -m.leg * 2), PAL.dleaf, { sh: 0.3 }); piece(c, curve(rough([[24, -42], [36, -80 + t * 2], [50, -86], [62, -80], [60, -72], [44, -72], [34, -44]], 0.4)), tint(PAL.leaf), { sh: 0.6 }); c.fillStyle = PAL.dark; c.beginPath(); c.arc(54, -80, 1.6, 0, 7); c.fill(); for (let i = 0; i < 5; i++) P(c, [[-20 + i * 11, -48 + Math.abs(i - 2) * 2], [-15 + i * 11, -58 + Math.abs(i - 2) * 2], [-10 + i * 11, -48 + Math.abs(i - 2) * 2]], PAL.gold, { sh: 0.2, rim: false }); },
};
KIND.actor = (c, x) => {
  const L = x.L, m = motion(L.a, x.t, x.sd), f = ACTOR[L.v ?? "kid"] ?? ACTOR.kid;
  c.save(); c.translate(L.x + m.dx, L.y + m.dy); c.rotate(m.rot); const s = L.s * m.sc; c.scale(m.flip ? -s : s, s);
  f(c, { ...x, L }, m); c.restore();
};

/* ------------------------------------------------------------ scene, transitions, caption */
const sortedCache = new WeakMap<Scene, Layer[]>();
const FOCUS = 0.9, SHIFT = 46;   // the whole set sits SHIFT higher so the actors stand above the lower-third
function drawScene(c: C, sc: Scene, local: number) {
  const u = clamp(local / sc.dur, 0, 1), pan = sc.pan * (u - 0.5) * 2, zoom = 1 + 0.05 * u;
  let ls = sortedCache.get(sc); if (!ls) { ls = sc.L.map((l, i) => [l, i] as const).sort((a, b) => a[0].d - b[0].d || a[1] - b[1]).map((a) => a[0]); sortedCache.set(sc, ls); }
  curPal = sc.pal; TINT = sc.pal === "night" ? { to: "#2b3a78", f: 0.42 } : sc.pal === "dusk" ? { to: "#F28F7E", f: 0.16 } : null;
  c.save(); c.translate(FW / 2, FH / 2); c.scale(zoom, zoom); c.translate(-FW / 2, -FH / 2 - SHIFT);
  for (const L of ls) { c.save(); c.translate(pan * (L.d - FOCUS) * 30, 0); const f = KIND[L.k]; if (f) f(c, { t: local, L, s: L.s, sd: L.sd }); c.restore(); }
  c.restore(); TINT = null;
}
function caption(c: C, sc: Scene, idx: number, local: number, aud: string) {
  const w = 0.5 + 0.5 * ease(clamp(local / 0.55, 0, 1)), slide = (1 - ease(clamp(local / 0.55, 0, 1))) * -420;
  c.save(); c.translate(slide, 0); c.font = `600 19px ${FONT}`; c.textBaseline = "alphabetic"; c.textAlign = "left";
  const title = idx === 0, text = title ? sc.cap : sc.cap, size = title ? 27 : 19; c.font = `${title ? 700 : 600} ${size}px ${FONT}`;
  const maxW = FW - 92, words = text.split(" "), lines: string[] = []; let cur = ""; for (const wd of words) { const t = cur ? cur + " " + wd : wd; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t; } if (cur) lines.push(cur);
  const shown = title ? lines : lines, lh = size + 6, h = shown.length * lh + 22, y0 = FH - 20 - h;
  piece(c, poly(rough(rectPts(26, y0, FW - 52, h), 0.6)), PAL.cream, { sh: 1.2 });
  piece(c, poly(rough([[26, y0 - 14], [26 + (aud === "hs" ? 244 : 172), y0 - 14], [26 + (aud === "hs" ? 238 : 166), y0 + 4], [26, y0 + 4]], 0.4)), aud === "hs" ? PAL.dlav : PAL.coral, { sh: 0.6 });
  c.fillStyle = PAL.cream; c.font = `700 11px ${FONT}`; c.fillText(aud === "hs" ? "FIELD REPORT  ·  HIGH SCHOOL" : "FIELD REPORT", 38, y0 - 1.5);
  c.fillStyle = PAL.dark; c.font = `${title ? 700 : 600} ${size}px ${FONT}`;
  const chars = Math.floor(text.length * clamp((local - 0.3) / Math.max(1.2, sc.dur * 0.5), 0, 1)); let used = 0;
  shown.forEach((ln, i) => { const part = title ? ln : ln.slice(0, Math.max(0, chars - used)); used += ln.length + 1; c.fillText(part, 40, y0 + 14 + size * 0.78 + i * lh - 4); });
  void w; c.restore();
}
function bug(c: C, aud: string) {
  piece(c, poly(rough([[FW - 150, 14], [FW - 14, 14], [FW - 14, 44], [FW - 150, 44]], 0.4)), PAL.blue, { sh: 0.9 });
  piece(c, curve(ellPts(FW - 132, 29, 12, 12, 12)), PAL.cream, { sh: 0.4 });
  c.fillStyle = PAL.deep; c.font = `800 15px ${FONT}`; c.textAlign = "center"; c.fillText("U", FW - 132, 34); c.fillStyle = PAL.cream; c.font = `700 14px ${FONT}`; c.textAlign = "left"; c.fillText("UNIFY News", FW - 113, 34);
  if (aud === "hs") { piece(c, poly(rough([[14, 14], [132, 14], [132, 38], [14, 38]], 0.4)), PAL.dlav, { sh: 0.9 }); c.fillStyle = PAL.cream; c.font = `700 13px ${FONT}`; c.fillText("High school", 26, 31); }
}
let grainTile: HTMLCanvasElement | null = null; const grainPat = new WeakMap<C, CanvasPattern | null>();
function grain(c: C) {
  let p = grainPat.get(c);
  if (p === undefined) {
    try {
      if (!grainTile) { grainTile = document.createElement("canvas"); grainTile.width = grainTile.height = 128; const g = grainTile.getContext("2d")!, d = g.createImageData(128, 128); for (let i = 0; i < d.data.length; i += 4) { const v = 232 + hsh(i, 3) * 40; d.data[i] = v; d.data[i + 1] = v * 0.97; d.data[i + 2] = v * 0.92; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); g.lineCap = "round"; for (let k = 0; k < 90; k++) { g.strokeStyle = `rgba(255,250,240,${0.1 + Math.abs(hsh(k, 5)) * 0.3})`; g.lineWidth = 0.7; const px = (hsh(k, 1) + 0.5) * 128, py = (hsh(k, 2) + 0.5) * 128, a = hsh(k, 4) * 12; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * 7, py + Math.sin(a) * 7); g.stroke(); } }
      p = c.createPattern(grainTile, "repeat");
    } catch { p = null; }
    grainPat.set(c, p);
  }
  if (!p) return; c.save(); c.globalCompositeOperation = "multiply"; c.globalAlpha = 0.55; c.fillStyle = p; c.fillRect(0, 0, FW, FH); c.restore();
}

/** total running time (scenes overlap by TR while a transition plays) */
export const filmDuration = (s: SceneScript) => Math.max(1, s.scenes.reduce((n, x) => n + x.dur, 0) - TR * (s.scenes.length - 1));
/** which scene is on at time t, and how far into its transition to the next scene */
export function sceneAt(s: SceneScript, t: number): { i: number; local: number; next: number; p: number } {
  const total = filmDuration(s); t = clamp(t, 0, total - 1e-3); let start = 0;
  for (let i = 0; i < s.scenes.length; i++) {
    const d = s.scenes[i].dur, last = i === s.scenes.length - 1, end = start + d;
    if (t < end || last) { const local = t - start, tin = end - TR; return { i, local, next: !last && t >= tin ? i + 1 : -1, p: !last && t >= tin ? clamp((t - tin) / TR, 0, 1) : 0 }; }
    start = end - TR;
  }
  return { i: 0, local: 0, next: -1, p: 0 };
}
export interface FilmOpts { caption?: boolean; bug?: boolean; grain?: boolean }
/** draw the film at time t into c, scaled to w x h (the sheet is 640x360) */
export function drawFilm(c: C, w: number, h: number, s: SceneScript, t: number, o: FilmOpts = {}) {
  const st = sceneAt(s, t), cur = s.scenes[st.i], aud = s.audience;
  c.save(); c.scale(w / FW, h / FH); c.beginPath(); c.rect(0, 0, FW, FH); c.clip(); c.fillStyle = PAL.kraft; c.fillRect(0, 0, FW, FH);
  if (st.next < 0) drawScene(c, cur, st.local);
  else {
    const nx = s.scenes[st.next], p = ease(st.p), tr = cur.tr;
    if (tr === "slide") { c.save(); c.translate(-p * FW, 0); drawScene(c, cur, st.local); c.restore(); c.save(); c.translate((1 - p) * FW, 0); c.shadowColor = "rgba(40,24,32,.5)"; c.shadowBlur = 18; c.fillStyle = PAL.kraft; c.fillRect(-4, 0, 4, FH); c.shadowBlur = 0; drawScene(c, nx, st.local - (cur.dur - TR) < 0 ? 0 : st.p * TR); c.restore(); }
    else if (tr === "page") { drawScene(c, nx, st.p * TR); const ex = FW * (1 - p); c.save(); c.beginPath(); c.rect(0, 0, ex, FH); c.clip(); c.transform(1 - p, 0, 0, 1, 0, 0); drawScene(c, cur, st.local); const g = c.createLinearGradient(0, 0, FW, 0); g.addColorStop(0.6, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(30,20,28,${0.3 * p})`); c.fillStyle = g; c.fillRect(0, 0, FW, FH); c.restore(); const sg = c.createLinearGradient(ex, 0, ex + 34, 0); sg.addColorStop(0, `rgba(30,20,28,${0.4 * (1 - p)})`); sg.addColorStop(1, "rgba(30,20,28,0)"); c.fillStyle = sg; c.fillRect(ex, 0, 34, FH); c.fillStyle = "rgba(255,249,240,.85)"; c.fillRect(ex - 1.5, 0, 1.5, FH); }
    else { drawScene(c, cur, st.local); c.globalAlpha = p; drawScene(c, nx, st.p * TR); c.globalAlpha = 1; }
  }
  const ci = st.next >= 0 && st.p > 0.5 ? st.next : st.i, cs = s.scenes[ci], cl = ci === st.i ? st.local : st.p * TR;
  if (o.caption !== false) caption(c, cs, ci, cl, aud);
  if (o.bug !== false) bug(c, aud);
  if (o.grain !== false) grain(c);
  const total = filmDuration(s); if (t > total - 0.5) { c.fillStyle = `rgba(234,223,203,${clamp((t - (total - 0.5)) / 0.5, 0, 1) * 0.9})`; c.fillRect(0, 0, FW, FH); }
  c.restore();
}
export { piece, poly, curve, rough, rectPts, ellPts, R, E, P, line, band, hsh, clamp, lerp, ease };
