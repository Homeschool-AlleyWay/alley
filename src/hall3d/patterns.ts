/** Shared cloth-pattern ids and a tileable canvas painter for the newer patterns (used by the 2D rig as a CanvasPattern and by the 3D char as a texture). No three.js here. */
export const PATTERNS = ["solid", "stripes", "dots", "plaid", "checks", "gradient", "camo", "floral", "hearts", "stars"] as const;
const mix = (a: string, b: string, k: number) => { const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), x = p(a), y = p(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
const hex = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? c : "#888888");
/** paints kind into a size x size tile; base = fabric colour, pc = pattern colour. Returns false when kind is not one of the painter's patterns */
export function paintPattern(g: CanvasRenderingContext2D, S: number, kind: string, base: string, pc: string): boolean {
  base = hex(base); pc = hex(pc); const u = S / 8;
  if (kind === "stripes") { g.fillStyle = pc; for (let i = 0; i < 4; i++) g.fillRect(0, i * 2 * u + u * 0.3, S, u); return true; }
  if (kind === "dots") { g.fillStyle = pc; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.arc(x * 2 * u + (y % 2 ? u : 0) + u * 0.5, y * 2 * u + u, u * 0.42, 0, 7); g.fill(); } return true; }
  if (kind === "plaid") { g.globalAlpha = 0.6; g.fillStyle = pc; for (let i = 0; i < 2; i++) { g.fillRect(i * S / 2 + u * 0.4, 0, u * 1.2, S); g.fillRect(0, i * S / 2 + u * 0.4, S, u * 1.2); } g.globalAlpha = 1; return true; }
  if (kind === "hearts" || kind === "stars") { g.fillStyle = pc; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const cx = x * 2 * u + (y % 2 ? u : 0) + u * 0.5, cy = y * 2 * u + u, r = u * 0.5; g.beginPath(); if (kind === "stars") { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); } else { g.moveTo(cx, cy + r * 0.9); g.bezierCurveTo(cx - r * 1.5, cy - r * 0.1, cx - r * 0.6, cy - r * 1.1, cx, cy - r * 0.4); g.bezierCurveTo(cx + r * 0.6, cy - r * 1.1, cx + r * 1.5, cy - r * 0.1, cx, cy + r * 0.9); } g.fill(); } return true; }
  if (kind === "checks") { g.fillStyle = pc; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2 === 0) g.fillRect(x * u, y * u, u, u); return true; }
  if (kind === "gradient") { const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, base); gr.addColorStop(1, pc); g.fillStyle = gr; g.fillRect(0, 0, S, S); return true; }
  if (kind === "camo") { const cols = [mix(base, "#000000", 0.25), pc, mix(base, pc, 0.5)]; let s = 7; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 26; i++) { g.fillStyle = cols[i % 3]; const x = r() * S, y = r() * S, rx = u * (0.8 + r() * 1.3), ry = u * (0.5 + r() * 0.9); for (const dx of [0, S, -S]) for (const dy of [0, S, -S]) { g.beginPath(); g.ellipse(x + dx, y + dy, rx, ry, r() * 3, 0, 7); g.fill(); } } return true; }
  if (kind === "floral") { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const cx = x * S / 2 + S / 4 + (y ? S / 8 : -S / 8), cy = y * S / 2 + S / 4; g.fillStyle = mix(base, "#3f8a4f", 0.55); g.beginPath(); g.ellipse(cx + u * 1.5, cy + u * 1.1, u * 0.45, u * 0.2, 0.6, 0, 7); g.fill(); g.fillStyle = pc; for (let p = 0; p < 5; p++) { const a = p * 1.2566; g.beginPath(); g.ellipse(cx + Math.cos(a) * u * 0.7, cy + Math.sin(a) * u * 0.7, u * 0.5, u * 0.32, a, 0, 7); g.fill(); } g.fillStyle = "#f5c542"; g.beginPath(); g.arc(cx, cy, u * 0.3, 0, 7); g.fill(); } return true; }
  return false;
}
const cache = new Map<string, CanvasPattern>();
/** a CanvasPattern for the 2D rig (cells ~ 3 world units wide at scale k) */
export function pattern2D(c: CanvasRenderingContext2D, kind: string, base: string, pc: string, units = 11): CanvasPattern | null {
  const key = `${kind}|${base}|${pc}`; let p = cache.get(key); if (p) return p;
  const S = 96, cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d")!; g.fillStyle = hex(base); g.fillRect(0, 0, S, S);
  if (!paintPattern(g, S, kind, base, pc)) return null;
  p = c.createPattern(cv, "repeat")!; p.setTransform(new DOMMatrix().scale(units / S)); if (cache.size > 80) cache.clear(); cache.set(key, p); return p;
}
