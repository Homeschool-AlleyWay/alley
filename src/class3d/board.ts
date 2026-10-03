/** A whiteboard whose text is written out progressively (the teacher "writes" it). Rendered to a CanvasTexture. */
import * as THREE from "three";
import { HAND, wrap } from "./tex";
export interface BoardItem { text: string; color: string; kind: "bullet" | "example" | "note" }
const MARK = ["#2a5fa8", "#c4463c", "#2f7a52", "#7a4fa8", "#b46a1a"];
export class Board {
  cv = document.createElement("canvas"); ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; W = 1024; H = 640;
  title = ""; items: BoardItem[] = []; shown = 0; private target = 0; private speed = 26; private resolve: (() => void) | null = null; private dirty = true;
  constructor(public label = "") { this.cv.width = this.W; this.cv.height = this.H; this.ctx = this.cv.getContext("2d")!; this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8; this.redraw(); }
  get total() { return this.title.length + this.items.reduce((n, i) => n + i.text.length, 0); }
  get done() { return this.shown >= this.total; }
  clear() { this.title = ""; this.items = []; this.shown = 0; this.target = 0; this.dirty = true; this.resolve?.(); this.resolve = null; }
  set(title: string, items: { text: string; kind?: BoardItem["kind"] }[]) { this.clear(); this.title = title; this.items = items.map((x, i) => ({ text: x.text, kind: x.kind ?? "bullet", color: MARK[i % MARK.length] })); this.dirty = true; }
  /** reveal everything over time; resolves when finished */
  write(charsPerSec = 26): Promise<void> { this.speed = charsPerSec; this.target = this.total; return new Promise((r) => { this.resolve = r; if (this.done) r(); }); }
  showAll() { this.shown = this.total; this.target = this.total; this.dirty = true; this.resolve?.(); this.resolve = null; }
  update(dt: number) {
    if (this.shown < this.target) { this.shown = Math.min(this.target, this.shown + this.speed * dt); this.dirty = true; if (this.shown >= this.target) { this.resolve?.(); this.resolve = null; } }
    if (this.dirty) { this.redraw(); this.dirty = false; }
  }
  /** where the marker tip is (0..1 across, 0..1 down) so the teacher's hand can follow */
  tip = { x: 0.1, y: 0.2 };
  private redraw() {
    const c = this.ctx, W = this.W, H = this.H; const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#FDFDFA"); g.addColorStop(1, "#EEF0EA"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = "rgba(120,130,125,.18)"; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0, 60 + i * 130); c.lineTo(W, 62 + i * 130); c.stroke(); }
    c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(0, 0, W, 14);
    let left = Math.floor(this.shown), x0 = 46, y = 74; c.textBaseline = "alphabetic"; this.tip = { x: 0.06, y: 0.1 };
    if (this.title) { c.font = `800 52px ${HAND}`; c.fillStyle = "#1d3f78"; const t = this.title.slice(0, left); c.fillText(t, x0, y); const wdt = c.measureText(this.title).width; c.strokeStyle = "#EAB94E"; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y + 12); c.lineTo(x0 + Math.min(wdt, c.measureText(t).width + 8), y + 12); c.stroke(); this.tip = { x: (x0 + c.measureText(t).width) / W, y: (y - 14) / H }; left -= this.title.length; y += 66; }
    let size = 40, lines: string[][] = []; const avail = H - y - 40;
    for (; size >= 24; size -= 2) { c.font = `700 ${size}px ${HAND}`; lines = this.items.map((it) => wrap(c, it.text, W - 140)); const h = lines.reduce((n, l) => n + l.length * (size * 1.22) + size * 0.5, 0); if (h <= avail) break; }
    c.font = `700 ${size}px ${HAND}`;
    this.items.forEach((it, i) => {
      if (left <= 0) return; const ls = lines[i], shownChars = Math.min(left, it.text.length);
      c.beginPath(); c.arc(x0 + 12, y - size * 0.28, size * 0.2, 0, 7); c.fillStyle = it.kind === "example" ? "#c4463c" : it.color; c.fill();
      let consumed = 0; ls.forEach((l, k) => { const part = l.slice(0, Math.max(0, shownChars - consumed)); const lx = x0 + 38, ly = y + k * size * 1.22; if (part) { c.fillStyle = it.kind === "example" ? "#a8332a" : it.color; c.fillText(part, lx, ly); this.tip = { x: (lx + c.measureText(part).width) / W, y: (ly - size * 0.3) / H }; } consumed += l.length + 1; });
      y += ls.length * size * 1.22 + size * 0.5; left -= it.text.length;
    });
    // tray + frame
    c.fillStyle = "#C9B28A"; c.fillRect(0, H - 22, W, 22); c.fillStyle = "rgba(255,255,255,.4)"; c.fillRect(0, H - 22, W, 4); c.strokeStyle = "#9DA7AA"; c.lineWidth = 14; c.strokeRect(0, 0, W, H);
    this.tex.needsUpdate = true;
  }
}
