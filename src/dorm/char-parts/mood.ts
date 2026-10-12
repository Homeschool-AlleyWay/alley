/** Time-of-day + palette -> lighting targets shared by both styles, with a ~1.5s lerp. */
import * as THREE from "three";
import type { Mood } from "../types";

export interface MoodState { skyTop: THREE.Color; skyBot: THREE.Color; key: THREE.Color; keyI: number; hemiSky: THREE.Color; hemiGnd: THREE.Color; hemiI: number; exposure: number; night: number; lamp: number; sun: THREE.Vector3; fog: number }
export const newMoodState = (): MoodState => ({ skyTop: new THREE.Color(), skyBot: new THREE.Color(), key: new THREE.Color(), keyI: 1, hemiSky: new THREE.Color(), hemiGnd: new THREE.Color(), hemiI: 0.5, exposure: 1, night: 0, lamp: 0, sun: new THREE.Vector3(0.4, 0.8, 0.5), fog: 0.02 });

const TINT: Record<string, string> = { sun: "#ffd27a", sky: "#7fc4ff", mint: "#9fe3c4", berry: "#e0679a", sunset: "#ff9a6b", ocean: "#4fb3d9", forest: "#5aa06a", night: "#4a5cb0", candy: "#ff9fd0", paper: "#eadfcb" };
const C = (h: string) => new THREE.Color(h);
const tmp = new THREE.Color();
const lerpC = (a: THREE.Color, b: THREE.Color, t: number, out: THREE.Color) => out.copy(a).lerp(b, t);

export function moodTarget(m: Mood, o: MoodState): MoodState {
  const h = ((m.hour % 24) + 24) % 24, el = Math.sin(((h - 6) / 13) * Math.PI);     // sun elevation -1..1 (up 6..19)
  const day = THREE.MathUtils.smoothstep(el, -0.05, 0.35), warm = THREE.MathUtils.clamp(1 - el * 1.6, 0, 1) * (el > -0.3 ? 1 : 0);
  const night = 1 - THREE.MathUtils.smoothstep(el, -0.25, 0.1);
  const tint = C(TINT[m.palette || "sun"] || TINT.sun), isNight = m.palette === "night";
  const nt = Math.max(night, isNight ? 0.85 : 0);
  // sky
  const dayTop = C("#6fb6f2"), dayBot = C("#cfe6f7"), dawnBot = C("#ffc6a0"), nightTop = C("#0e1633"), nightBot = C("#26305a");
  lerpC(dayBot, dawnBot, warm * 0.8, o.skyBot); lerpC(o.skyBot, nightBot, nt, o.skyBot); o.skyBot.lerp(tint, 0.18 * (1 - nt));
  lerpC(dayTop, C("#9a9ad0"), warm * 0.5, o.skyTop); lerpC(o.skyTop, nightTop, nt, o.skyTop); o.skyTop.lerp(tint, 0.14 * (1 - nt));
  // key light
  tmp.set("#fff1d8"); lerpC(tmp, C("#ffb070"), warm * 0.8, o.key); lerpC(o.key, C("#8fa6e6"), nt, o.key); o.key.lerp(tint, 0.12);
  o.keyI = 0.35 + 2.1 * Math.max(0, day) * (1 - 0.3 * warm) ; o.keyI = THREE.MathUtils.lerp(o.keyI, 0.55, nt);
  lerpC(C("#cfe3ff"), C("#2c3a78"), nt, o.hemiSky); o.hemiSky.lerp(tint, 0.15);
  lerpC(C("#d9b894"), C("#1c1830"), nt, o.hemiGnd);
  o.hemiI = THREE.MathUtils.lerp(0.65, 0.35, nt);
  o.exposure = THREE.MathUtils.lerp(1.0, 0.8, nt) * (isNight ? 0.9 : 1);
  o.night = nt; o.lamp = THREE.MathUtils.clamp(nt * 1.2 + warm * 0.2, 0, 1);
  const a = ((h - 6) / 13) * Math.PI;
  if (el > 0.05) o.sun.set(-Math.cos(a) * 0.9, Math.max(0.35, Math.sin(a)), 0.55); else o.sun.set(0.5, 0.7, 0.6);     // moon sits high at night
  o.sun.normalize();
  o.fog = 0.015 + 0.01 * nt;
  return o;
}
export function lerpMood(c: MoodState, t: MoodState, k: number) {
  c.skyTop.lerp(t.skyTop, k); c.skyBot.lerp(t.skyBot, k); c.key.lerp(t.key, k); c.hemiSky.lerp(t.hemiSky, k); c.hemiGnd.lerp(t.hemiGnd, k);
  c.keyI += (t.keyI - c.keyI) * k; c.hemiI += (t.hemiI - c.hemiI) * k; c.exposure += (t.exposure - c.exposure) * k; c.night += (t.night - c.night) * k; c.lamp += (t.lamp - c.lamp) * k; c.fog += (t.fog - c.fog) * k;
  c.sun.lerp(t.sun, k).normalize();
}
/** tiny vertical-gradient background texture */
export class Sky {
  cvs = document.createElement("canvas"); tex: THREE.CanvasTexture;
  constructor() { this.cvs.width = 4; this.cvs.height = 64; this.tex = new THREE.CanvasTexture(this.cvs); this.tex.colorSpace = THREE.SRGBColorSpace; }
  paint(top: THREE.Color, bot: THREE.Color) { const g = this.cvs.getContext("2d")!, gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, "#" + top.getHexString(THREE.SRGBColorSpace)); gr.addColorStop(1, "#" + bot.getHexString(THREE.SRGBColorSpace)); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); this.tex.needsUpdate = true; }
  dispose() { this.tex.dispose(); }
}
export const stats = (style: string, q: number) => { const w = window as any; return (w.__styleStats ||= { style, quality: q, frames: 0, avg: 0, last: 0, log: new Float32Array(120) }); };
