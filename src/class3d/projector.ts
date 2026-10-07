/** The classroom projector screen: idle card, clip title card, live picture slides and reenactment videos, drawn into one canvas texture. */
import * as THREE from "three";
import { drawVideo, drawTitleCard, videoLength, type VideoDef } from "./reenact";
import { PIC_BY_ID } from "./pics";
export type ProjMode = "idle" | "title" | "pic" | "video";
export class Projector {
  cv = document.createElement("canvas"); ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; mode: ProjMode = "idle"; t = 0; video?: VideoDef; picId = ""; label = { subject: "", lesson: "" }; onEnd: (() => void) | null = null; paused = false; ended = false; private frame = 0;
  constructor() { this.cv.width = 1280; this.cv.height = 720; this.ctx = this.cv.getContext("2d")!; this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8; this.tex.generateMipmaps = false; this.tex.minFilter = THREE.LinearFilter; }
  idle(subject = this.label.subject, lesson = this.label.lesson) { this.label = { subject, lesson }; this.mode = "idle"; this.t = 0; this.onEnd = null; this.video = undefined; }
  title(v: VideoDef) { this.mode = "title"; this.video = v; this.t = 0; this.onEnd = null; }
  pic(id: string) { this.mode = "pic"; this.picId = id; this.t = 0; this.onEnd = null; }
  play(v: VideoDef, onEnd?: () => void) { this.mode = "video"; this.video = v; this.t = 0; this.ended = false; this.onEnd = onEnd ?? null; }
  get length() { return this.video ? videoLength(this.video) : 0; }
  get playing() { return this.mode === "video" && !this.ended; }
  update(dt: number) {
    if (!this.paused) this.t += dt; const c = this.ctx, w = 1280, h = 720;
    if (this.mode === "video" && this.video) { drawVideo(c, w, h, this.video, Math.min(this.t, this.length - 0.001)); if (!this.ended && this.t >= this.length) { this.ended = true; const f = this.onEnd; this.onEnd = null; f?.(); } }
    else if (this.mode === "title" && this.video) drawTitleCard(c, w, h, this.video, this.t);
    else if (this.mode === "pic") { const p = PIC_BY_ID[this.picId]; c.save(); c.scale(2, 2); if (p) p.draw(c, this.t); c.restore(); }
    else this.drawIdle(c, w, h);
    this.frame++; this.tex.needsUpdate = true;
  }
  private drawIdle(c: CanvasRenderingContext2D, w: number, h: number) {
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#26406b"); g.addColorStop(1, "#4F91C7"); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { c.fillStyle = "rgba(255,255,255,.06)"; c.beginPath(); c.arc((i * 211 + this.t * 14) % (w + 160) - 80, (i * 97) % h, 40 + (i % 5) * 22, 0, 7); c.fill(); }
    c.textAlign = "center"; c.fillStyle = "#fff"; c.font = "900 84px system-ui,sans-serif"; c.fillText("UNIFY ACADEMY", w / 2, h / 2 - 20); c.fillStyle = "#F8D977"; c.font = "700 40px system-ui,sans-serif"; c.fillText(this.label.lesson || "Class is about to begin", w / 2, h / 2 + 50);
    c.fillStyle = "rgba(255,255,255,.7)"; c.font = "600 26px system-ui,sans-serif"; c.fillText((this.label.subject === "careers" ? "CarryingCareers" : this.label.subject).toUpperCase(), w / 2, h / 2 + 100);
  }
}
