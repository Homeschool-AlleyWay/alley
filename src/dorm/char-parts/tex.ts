/** Procedural canvas textures (cloth patterns, knit, denim, wood...) + height->normal conversion. Cached per style via TexCache. */
import * as THREE from "three";
import { paintPattern } from "../../hall3d/patterns";

const S = 256;
function cv(): [HTMLCanvasElement, CanvasRenderingContext2D] { const c = document.createElement("canvas"); c.width = c.height = S; return [c, c.getContext("2d")!]; }
type CC = string | number | THREE.Color;
const col = (c: CC) => "#" + new THREE.Color(c as any).getHexString();
function shade(c: string, a: number) { const k = new THREE.Color(c); k.offsetHSL(0, 0, a); return "#" + k.getHexString(); }
function noise(g: CanvasRenderingContext2D, amt: number) { const d = g.getImageData(0, 0, S, S), p = d.data; let s = 1234567; for (let i = 0; i < p.length; i += 4) { s = (s * 1664525 + 1013904223) >>> 0; const n = ((s >>> 24) / 255 - 0.5) * amt; p[i] += n; p[i + 1] += n; p[i + 2] += n; } g.putImageData(d, 0, 0); }
function heart(g: CanvasRenderingContext2D, x: number, y: number, r: number) { g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.4); g.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.5, y - r * 0.1, x, y + r * 0.9); g.fill(); }
function star(g: CanvasRenderingContext2D, x: number, y: number, r: number) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }

/** draws the colour layer of a pattern (tileable). c1 = base, c2 = accent */
export function patternCanvas(kind: string, c1s: CC, c2s: CC): HTMLCanvasElement {
  const c1 = col(c1s), c2 = col(c2s), [c, g] = cv();
  g.fillStyle = c1; g.fillRect(0, 0, S, S);
  switch (kind) {
    case "stripes": g.fillStyle = c2; for (let i = 0; i < 8; i += 2) g.fillRect(0, i * 32 + 6, S, 20); break;
    case "dots": g.fillStyle = c2; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.arc(x * 64 + (y % 2 ? 32 : 0) + 16, y * 64 + 32, 11, 0, 7); g.fill(); } break;
    case "plaid": g.globalAlpha = 0.55; g.fillStyle = c2; for (let i = 0; i < 2; i++) { g.fillRect(i * 128 + 20, 0, 36, S); g.fillRect(0, i * 128 + 20, S, 36); } g.globalAlpha = 0.9; g.fillStyle = shade(c1, -0.25); for (let i = 0; i < 2; i++) { g.fillRect(i * 128 + 60, 0, 6, S); g.fillRect(0, i * 128 + 60, S, 6); } g.globalAlpha = 1; break;
    case "hearts": g.fillStyle = c2; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) heart(g, x * 64 + (y % 2 ? 32 : 0) + 16, y * 64 + 32, 15); break;
    case "stars": g.fillStyle = c2; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) star(g, x * 64 + (y % 2 ? 32 : 0) + 16, y * 64 + 32, 17); break;
    case "argyle": g.fillStyle = c2; for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const cx = x * 128 + 64, cy = y * 128 + 64; g.beginPath(); g.moveTo(cx, cy - 56); g.lineTo(cx + 56, cy); g.lineTo(cx, cy + 56); g.lineTo(cx - 56, cy); g.closePath(); g.fill(); } g.strokeStyle = shade(c1, 0.18); g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(S, S); g.moveTo(S, 0); g.lineTo(0, S); g.stroke(); break;
    case "fairisle": g.fillStyle = c2; for (let r = 0; r < 4; r++) { if (r % 2 === 0) for (let x = 0; x < 8; x++) { const cx = x * 32 + 16, cy = r * 64 + 32; g.beginPath(); g.moveTo(cx, cy - 14); g.lineTo(cx + 12, cy); g.lineTo(cx, cy + 14); g.lineTo(cx - 12, cy); g.closePath(); g.fill(); } else g.fillRect(0, r * 64 + 22, S, 6), g.fillRect(0, r * 64 + 38, S, 6); } break;
    case "checks": case "gradient": case "camo": case "floral": paintPattern(g, S, kind, c1, c2); break;
    case "knit": case "cable": g.strokeStyle = shade(c1, -0.12); g.lineWidth = 3; for (let x = 0; x < S; x += 16) for (let y = 0; y < S; y += 16) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y + 12); g.lineTo(x + 16, y); g.stroke(); } g.strokeStyle = shade(c1, 0.1); g.lineWidth = 2; for (let x = 0; x < S; x += 16) for (let y = 0; y < S; y += 16) { g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x + 8, y + 14); g.lineTo(x + 16, y + 2); g.stroke(); } if (kind === "cable") { g.strokeStyle = shade(c1, -0.2); g.lineWidth = 5; for (let x = 32; x < S; x += 64) { g.beginPath(); for (let y = 0; y <= S; y += 8) g.lineTo(x + Math.sin((y / 64) * Math.PI * 2) * 9, y); g.stroke(); g.beginPath(); for (let y = 0; y <= S; y += 8) g.lineTo(x - Math.sin((y / 64) * Math.PI * 2) * 9, y); g.stroke(); } } break;
    case "denim": g.strokeStyle = shade(c1, 0.07); g.lineWidth = 2; for (let i = -S; i < S * 2; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.stroke(); } noise(g, 26); break;
    case "wood": for (let p = 0; p < 4; p++) { g.fillStyle = shade(c1, (p % 2 ? -0.03 : 0.02)); g.fillRect(0, p * 64, S, 64); g.fillStyle = shade(c1, -0.25); g.fillRect(0, p * 64, S, 2); } g.strokeStyle = shade(c1, -0.07); g.lineWidth = 1; for (let i = 0; i < 70; i++) { const y = (i * 37) % S, x0 = (i * 91) % S; g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + 40, y + 2, x0 + 80, y - 2, x0 + 150, y + 1); g.stroke(); } break;
    case "tile": g.fillStyle = c2; g.fillRect(0, 0, S, 4); g.fillRect(0, 0, 4, S); g.fillRect(0, 126, S, 4); g.fillRect(126, 0, 4, S); noise(g, 10); break;
    case "carpet": noise(g, 40); break;
    case "plaster": noise(g, 12); break;
    default: g.strokeStyle = shade(c1, -0.06); g.lineWidth = 1; for (let i = 0; i < S; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); } noise(g, 10);
  }
  return c;
}

/** height-ish canvas for a normal map */
export function heightCanvas(kind: string): HTMLCanvasElement {
  const [c, g] = cv(); g.fillStyle = "#808080"; g.fillRect(0, 0, S, S);
  if (kind === "knit" || kind === "cable" || kind === "argyle" || kind === "fairisle") { g.strokeStyle = "#fff"; g.lineWidth = 4; for (let x = 0; x < S; x += 16) for (let y = 0; y < S; y += 16) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y + 12); g.lineTo(x + 16, y); g.stroke(); } if (kind === "cable") { g.lineWidth = 8; for (let x = 32; x < S; x += 64) { g.beginPath(); for (let y = 0; y <= S; y += 8) g.lineTo(x + Math.sin((y / 64) * Math.PI * 2) * 9, y); g.stroke(); } } }
  else if (kind === "denim") { g.strokeStyle = "#cfcfcf"; g.lineWidth = 2; for (let i = -S; i < S * 2; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.stroke(); } noise(g, 30); }
  else if (kind === "wood") { g.fillStyle = "#555"; for (let p = 0; p < 4; p++) g.fillRect(0, p * 64, S, 2); noise(g, 18); }
  else if (kind === "tile") { g.fillStyle = "#333"; g.fillRect(0, 0, S, 4); g.fillRect(0, 0, 4, S); g.fillRect(0, 126, S, 4); g.fillRect(126, 0, 4, S); }
  else if (kind === "carpet" || kind === "plaster") noise(g, kind === "carpet" ? 70 : 30);
  else { g.strokeStyle = "#e0e0e0"; g.lineWidth = 2; for (let i = 0; i < S; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); } noise(g, 22); }
  return c;
}
export function normalFromHeight(h: HTMLCanvasElement, strength = 2): HTMLCanvasElement {
  const [c, g] = cv(), src = h.getContext("2d")!.getImageData(0, 0, S, S).data, out = g.createImageData(S, S), o = out.data;
  const H = (x: number, y: number) => src[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4; o[i] = (-dx / l * 0.5 + 0.5) * 255; o[i + 1] = (dy / l * 0.5 + 0.5) * 255; o[i + 2] = (1 / l * 0.5 + 0.5) * 255; o[i + 3] = 255; }
  g.putImageData(out, 0, 0); return c;
}

export class TexCache {
  private m = new Map<string, THREE.Texture>();
  get(key: string, make: () => HTMLCanvasElement, srgb = true): THREE.Texture {
    let t = this.m.get(key); if (t) return t;
    t = new THREE.CanvasTexture(make()); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; this.m.set(key, t); return t;
  }
  pattern(kind: string, c1: CC, c2: CC) { return this.get(`p|${kind}|${col(c1)}|${col(c2)}`, () => patternCanvas(kind, c1, c2)); }
  normal(kind: string, strength = 2) { return this.get(`n|${kind}|${strength}`, () => normalFromHeight(heightCanvas(kind), strength), false); }
  dispose() { this.m.forEach((t) => t.dispose()); this.m.clear(); }
}
export const NORMAL_KINDS = new Set(["knit", "cable", "argyle", "fairisle", "denim", "wood", "tile", "carpet", "plaster", "stripes", "plaid", "dots", "hearts", "stars"]);
