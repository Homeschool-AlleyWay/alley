/** Ambient mood for every 3D scene: time of day + season + an optional palette sent by the academy ({type:'academy:live', settings:{theme:{palette, accent}}}).
 *  Each scene registers the lights / materials it wants driven; Mood.update(dt, tod) eases them toward the target over ~2 s. No allocation per frame.
 *  Gfx: quality tier (auto-drops detail when the first 60 frames are slow) and prefers-reduced-motion. */
import * as THREE from "three";
import { seasonOf } from "../game/world";
import { isPixar } from "../shared/look";

interface Pal { hemi: string; gnd: string; sun: string; wash: string; floor: string; sky: string; accent: string; accent2: string; night?: number; w: number }
export const PALETTES: Record<string, Pal> = {
  sun: { hemi: "#fff1b8", gnd: "#f1dca0", sun: "#ffe08a", wash: "#FFE9A8", floor: "#fff3d0", sky: "#f8e4a0", accent: "#FFB84D", accent2: "#FFE27A", w: 0.5 },
  sky: { hemi: "#d6ecff", gnd: "#bcd6ee", sun: "#e8f3ff", wash: "#CFE6FA", floor: "#e2f1fb", sky: "#bfe3ff", accent: "#4F91C7", accent2: "#7FB8E8", w: 0.5 },
  mint: { hemi: "#d8f7e6", gnd: "#b9e3cc", sun: "#f0fff6", wash: "#CDEFD9", floor: "#e3f8ec", sky: "#c9f2dc", accent: "#3FBF8B", accent2: "#8FDDB5", w: 0.5 },
  berry: { hemi: "#f6cfe0", gnd: "#d6a2c2", sun: "#ffd9ec", wash: "#F2C2D8", floor: "#f6dbe8", sky: "#e8a4c4", accent: "#C2456B", accent2: "#9B3F8C", w: 0.55 },
  sunset: { hemi: "#ffd0a8", gnd: "#e8a8a0", sun: "#ffb890", wash: "#FFD2B0", floor: "#ffe3cc", sky: "#f7b890", accent: "#F0707A", accent2: "#FFB36B", w: 0.6 },
  ocean: { hemi: "#cfe6f7", gnd: "#9cc0dc", sun: "#d8ecff", wash: "#BAD9F0", floor: "#d4e8f6", sky: "#8fb8e0", accent: "#2E86C1", accent2: "#1B4F8A", w: 0.55 },
  forest: { hemi: "#d6ecd0", gnd: "#a8c89c", sun: "#e6f5d8", wash: "#C4E0B8", floor: "#dcecd2", sky: "#a9cdb8", accent: "#4C9A5F", accent2: "#25613A", w: 0.5 },
  night: { hemi: "#9aa0e0", gnd: "#ffb070", sun: "#a9b8ff", wash: "#7076b8", floor: "#8a90c8", sky: "#1d1f44", accent: "#F6C85F", accent2: "#8E7CC3", night: 1, w: 0.7 },
  candy: { hemi: "#ffe0f0", gnd: "#d8c8ff", sun: "#fff0fa", wash: "#FFD3EA", floor: "#fbe6f4", sky: "#e8d3ff", accent: "#FF8FB1", accent2: "#A8E6FF", w: 0.5 },
  paper: { hemi: "#fff6e8", gnd: "#e4d3b4", sun: "#fff0d8", wash: "#ffffff", floor: "#ffffff", sky: "#EADFCB", accent: "#E07A66", accent2: "#EAB94E", w: 0 },
};
/** time of day (hours) -> [hemi, sun, sky] keyframes; the last two entries fade into night */
const TOD: [number, string, string, string][] = [[0, "#8a90d0", "#9fb0ff", "#1d1f44"], [5.5, "#8a90d0", "#9fb0ff", "#1d1f44"], [6.8, "#ffd2b0", "#ffe9d0", "#f7c9a8"], [10.5, "#fff6e8", "#fff0d8", "#efe3c6"], [15, "#ffe2b0", "#ffd49a", "#f3d6a6"], [18, "#ffc2a8", "#ffb48c", "#d9b8e0"], [20.5, "#8a90d0", "#9fb0ff", "#1d1f44"], [24, "#8a90d0", "#9fb0ff", "#1d1f44"]];
const SEASON: Record<string, string> = { winter: "#dbe8ff", spring: "#ffeaf0", summer: "#fff4c8", autumn: "#ffdcb0" };
const KEY = "unify.mood.v1";
const C = (h = "#ffffff") => new THREE.Color(h);

type Role = "wash" | "floor" | "accent" | "accent2";
interface Tinted { mat: THREE.Material & { color: THREE.Color }; base: THREE.Color; role: Role; amt: number }
interface Rig { hemi?: THREE.HemisphereLight; hemiBase: number; sun?: THREE.DirectionalLight; sunBase: number; bg?: THREE.Color; fog?: THREE.Fog; manual: boolean; bgDark: number }

class MoodImpl {
  /** eased state (read by scenes) */
  hemiSky = C(); hemiGnd = C(); sun = C(); sky = C(); wash = C(); floor = C(); accent = C("#E07A66"); accent2 = C("#EAB94E"); lamp = C("#ffd9a0"); win = C();
  night = 0; glow = 0; hemiK = 1; sunK = 1; winI = 0.2;
  /** bumps when the palette target changes (instanced colours re-read it) */
  version = 0; palette = "auto";
  private T = { hemiSky: C(), hemiGnd: C(), sun: C(), sky: C(), wash: C(), floor: C(), accent: C(), accent2: C(), lamp: C(), win: C(), night: 0, glow: 0, hemiK: 1, sunK: 1, winI: 0.2 };
  private tint: Tinted[] = []; private wins: (THREE.MeshStandardMaterial)[] = []; private glows: { mat: THREE.MeshBasicMaterial; k: number; min: number }[] = []; private emis: { mat: THREE.MeshStandardMaterial; k: number; min: number }[] = [];
  private rigs: Rig[] = []; private subs: (() => void)[] = []; private override: { id: string | null; accent: string | null } = { id: null, accent: null };
  private tmpA = C(); private tmpB = C(); private dirty = true; private acc = 9; private sub = 0; private tod = 10.5; private season = "autumn";

  constructor() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) this.override = { id: PALETTES[s.id] ? s.id : null, accent: /^#[0-9a-f]{6}$/i.test(s.accent || "") ? s.accent : null }; } catch { /* none */ }
    try { this.season = seasonOf(); } catch { /* default */ }
    addEventListener("message", (e) => { const d = e.data; if (d && d.type === "academy:live" && d.settings && d.settings.theme) this.set(d.settings.theme.palette, d.settings.theme.accent); });
    this.snap(10.5);
  }
  /** choose a palette id (or null/unknown for none) and an optional accent colour */
  set(id: string | null | undefined, accent?: string | null) {
    const o = { id: id && PALETTES[id] ? id : null, accent: accent && /^#[0-9a-f]{6}$/i.test(accent) ? accent : null };
    if (o.id === this.override.id && o.accent === this.override.accent) return; this.override = o; this.palette = o.id ?? "auto"; this.dirty = true;
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* private mode */ }
  }
  /** drive a scene's lights and background; intensities are scaled from the given bases unless `manual` */
  rig(o: { hemi?: THREE.HemisphereLight; sun?: THREE.DirectionalLight; bg?: THREE.Color; fog?: THREE.Fog; manual?: boolean; bgDark?: number }) {
    this.rigs.push({ hemi: o.hemi, hemiBase: o.hemi?.intensity ?? 1, sun: o.sun, sunBase: o.sun?.intensity ?? 1, bg: o.bg, fog: o.fog, manual: !!o.manual, bgDark: o.bgDark ?? 0 }); this.dirty = true;
  }
  /** a material whose colour eases from `base` toward a palette role by `amt` */
  tinted<M extends THREE.Material & { color: THREE.Color }>(mat: M, role: Role, amt: number): M { this.tint.push({ mat, base: mat.color.clone(), role, amt }); this.dirty = true; return mat; }
  /** window glass: bright by day, warm lit at night (needs a map) */
  window(mat: THREE.MeshStandardMaterial) { mat.emissiveMap = mat.map; this.wins.push(mat); this.dirty = true; return mat; }
  /** an additive glow (light pool, halo): opacity = glow * k, never below min */
  glowing(mat: THREE.MeshBasicMaterial, k = 1, min = 0) { this.glows.push({ mat, k, min }); this.dirty = true; return mat; }
  /** a lamp / lantern: emissive intensity rises at night (keeps its own emissive colour) */
  lit(mat: THREE.MeshStandardMaterial, k = 1, min = 0.25) { this.emis.push({ mat, k, min }); this.dirty = true; return mat; }
  onChange(f: () => void) { this.subs.push(f); }
  /** ?tod=11 forces an hour (tests, screenshots) */
  queryTod(): number | null { try { const v = new URLSearchParams(location.search).get("tod"); return v == null || isNaN(+v) ? null : +v; } catch { return null; } }
  /** hour of day for the rooms that have no game clock: the real hour, kept inside school daylight (7:00 to 17:30) so lessons stay readable; the night palette still goes dark */
  realTod() { const d = new Date(); return Math.min(17.5, Math.max(7, d.getHours() + d.getMinutes() / 60)); }

  /** jump straight to the target (tests, first paint) */
  settle() { this.target(this.tod); this.copyAll(1); this.apply(); this.version++; for (const f of this.subs) f(); }
  private snap(tod: number) { this.target(tod); this.copyAll(1); this.apply(); }
  private target(tod: number) {
    const T = this.T, p = this.override.id ? PALETTES[this.override.id] : PALETTES.paper;
    let i = 0; while (i < TOD.length - 2 && tod > TOD[i + 1][0]) i++; const a = TOD[i], b = TOD[i + 1], u = Math.min(1, Math.max(0, (tod - a[0]) / (b[0] - a[0])));
    T.hemiSky.set(a[1]).lerp(this.tmpA.set(b[1]), u); T.sun.set(a[2]).lerp(this.tmpA.set(b[2]), u); T.sky.set(a[3]).lerp(this.tmpA.set(b[3]), u);
    // night factor: 0 by day, 1 deep night
    let n = tod < 6.8 ? Math.min(1, (6.8 - tod) / 1.3) : tod > 18 ? Math.min(1, (tod - 18) / 2.5) : 0; if (p.night) n = Math.max(n, p.night);
    // the season and the palette each pull the colours a little
    const sc = this.tmpB.set(SEASON[this.season] || "#ffffff"); T.hemiSky.lerp(sc, 0.16); T.sun.lerp(sc, 0.12); T.sky.lerp(sc, 0.1);
    if (p.w > 0) { T.hemiSky.lerp(this.tmpA.set(p.hemi), p.w * (1 - 0.35 * n)); T.sun.lerp(this.tmpA.set(p.sun), p.w * (1 - 0.35 * n)); T.sky.lerp(this.tmpA.set(p.sky), p.w); }
    T.hemiGnd.set("#e4d3b4").lerp(this.tmpA.set("#ffb070"), n * 0.8); if (p.w > 0) T.hemiGnd.lerp(this.tmpA.set(p.gnd), p.w * 0.6);
    T.wash.set("#ffffff").lerp(this.tmpA.set(p.wash), p.w * 0.55 + n * 0.2); T.floor.set("#ffffff").lerp(this.tmpA.set(p.floor), p.w * 0.5);
    T.wash.multiplyScalar(1 - 0.28 * n); T.floor.multiplyScalar(1 - 0.22 * n);
    T.accent.set(this.override.accent || p.accent); T.accent2.set(p.accent2);
    T.lamp.set("#ffd9a0"); T.night = n; T.glow = Math.max(n, tod > 17 && tod <= 18 ? tod - 17 : 0) * 0.9 + (tod > 18 && tod < 20.5 ? 0.1 : 0);
    T.hemiK = 1 - 0.6 * n; T.sunK = 1 - 0.86 * n;
    T.win.set("#fff7e0").lerp(this.tmpA.set("#ffb45a"), n); T.winI = 0.16 + 0.78 * n;
    if (isPixar()) {   // Pixar edition: warmer, richer palette variants + brighter glowing windows
      if (!this.override.id) { T.wash.lerp(this.tmpA.set("#ffdcae"), 0.55); T.floor.lerp(this.tmpA.set("#cfe6ff"), 0.3); T.accent.set("#FF6F61"); T.accent2.set("#FFC44D"); }
      const hs = { h: 0, s: 0, l: 0 }; for (const c of [T.wash, T.floor, T.accent, T.accent2]) { c.getHSL(hs); c.setHSL(hs.h, Math.min(1, hs.s * 1.25 + 0.06), hs.l); }
      T.winI = 0.6 + 0.7 * n;
    }
  }
  private copyAll(k: number) {
    const c = this, T = this.T; let d = 0;
    for (const key of ["hemiSky", "hemiGnd", "sun", "sky", "wash", "floor", "accent", "accent2", "lamp", "win"] as const) { const cur = c[key], t = T[key]; d += Math.abs(cur.r - t.r) + Math.abs(cur.g - t.g) + Math.abs(cur.b - t.b); if (k >= 1) cur.copy(t); else cur.lerp(t, k); }
    for (const key of ["night", "glow", "hemiK", "sunK", "winI"] as const) { d += Math.abs(c[key] - T[key]); c[key] += (T[key] - c[key]) * k; }
    return d;
  }
  /** call every frame; `tod` = hour of day (hall: school-day clock mapped to 6.8..18.3) */
  update(dt: number, tod: number) {
    this.tod = tod; this.acc += dt; if (this.acc > 0.25 || this.dirty) { this.acc = 0; this.target(tod); }
    const d = this.copyAll(1 - Math.exp(-dt / 0.55));                                     // ~2 s to settle
    if (d > 0.0015 || this.dirty) { this.apply(); if ((this.sub += dt) > 0.12) { this.sub = 0; this.version++; for (const f of this.subs) f(); } }
    this.dirty = false;
  }
  private apply() {
    for (const r of this.rigs) {
      if (r.hemi) { r.hemi.color.copy(this.hemiSky); r.hemi.groundColor.copy(this.hemiGnd); if (!r.manual) r.hemi.intensity = r.hemiBase * this.hemiK; }
      if (r.sun) { r.sun.color.copy(this.sun); if (!r.manual) r.sun.intensity = r.sunBase * this.sunK; }
      if (r.bg) { r.bg.copy(this.sky); if (r.bgDark) r.bg.multiplyScalar(1 - r.bgDark * this.night); }
      if (r.fog) r.fog.color.copy(this.sky);
    }
    for (const t of this.tint) { const tgt = t.role === "wash" ? this.wash : t.role === "floor" ? this.floor : t.role === "accent" ? this.accent : this.accent2; t.mat.color.copy(t.base).lerp(tgt, t.amt); }
    for (const w of this.wins) { w.emissive.copy(this.win); w.emissiveIntensity = this.winI; }
    for (const g of this.glows) g.mat.opacity = Math.max(g.min, this.glow * g.k);
    for (const e of this.emis) e.mat.emissiveIntensity = (e.min + this.glow * e.k) * (isPixar() ? 2.2 : 1);
  }
}
export const Mood = new MoodImpl();

/** quality tier + reduced motion. `low` skips instanced props and glow pools; auto-switches when the first 60 frames average over 24 ms. ?gfx=low|high or localStorage unify.gfx overrides. */
class GfxImpl {
  low = false; reduced = false; mode: "auto" | "low" | "high" = "auto"; private n = 0; private sum = 0; private subs: (() => void)[] = []; private groups: THREE.Object3D[] = [];
  constructor() {
    try { this.reduced = !!matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* none */ }
    let m: string | null = null; try { m = new URLSearchParams(location.search).get("gfx") || localStorage.getItem("unify.gfx"); } catch { /* none */ }
    if (m === "low" || m === "high") { this.mode = m; this.low = m === "low"; }
  }
  /** register a detail group that is hidden in low mode */
  detail<T extends THREE.Object3D>(o: T): T { this.groups.push(o); o.visible = !this.low; return o; }
  onChange(f: () => void) { this.subs.push(f); }
  setMode(m: "auto" | "low" | "high") { this.mode = m; try { localStorage.setItem("unify.gfx", m); } catch { /* none */ } this.n = m === "auto" ? 0 : 99; this.sum = 0; this.apply(m === "low"); }
  cycle() { const m = this.mode === "auto" ? "low" : this.mode === "low" ? "high" : "auto"; this.setMode(m); return m; }
  /** feed the frame time (ms) every frame */
  tick(ms: number) {
    if (this.n >= 60 || this.mode !== "auto") return; if (this.n > 2) this.sum += ms; this.n++;     // skip the first frames (shader compile)
    if (this.n === 60 && this.sum / 57 > 24) this.apply(true);
  }
  private apply(low: boolean) { this.low = low; for (const g of this.groups) g.visible = !low; this.subs.forEach((f) => f()); }
}
export const Gfx = new GfxImpl();
(window as any).__gfx = Gfx; (window as any).__mood = Mood;
