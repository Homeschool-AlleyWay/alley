/** Generated field-report videos: every story becomes a short paper-cut animation (scene, figures or quote, map with a real pin, title card)
 *  built from the story's own words. Nothing is invented: scenes come from the topic, the map pin from a place named in the text, numbers only
 *  if they appear in the text. Frame size is 248x440 (portrait); draw() scales to any canvas. */
import { drawChar } from "../hall3d/rig";
import { FIRST, LAST } from "../hall3d/roster";
import { randomAvatar, rng, toLook } from "../hall3d/avatar";
import type { Look } from "../hall3d/characters";
import { classify, figures, TOPIC_LABEL, type Topic } from "./topics";
import { findPlace, type Place } from "./gazetteer";

export interface Story { id: string; tier: string; headline: string; snippet?: string; source: string; place?: string; published?: string }
type ShotKind = "scene" | "figures" | "quote" | "map" | "title";
export interface Plan {
  id: string; topic: Topic; tier: string; headline: string; snippet: string; source: string; place: Place | null; placeLabel: string; local: boolean; home: Place | null; seed: number;
  shots: { kind: ShotKind; dur: number }[]; total: number; reporter: { name: string; look: Look }; figs: { value: string; label: string }[]; variant: string; stamp: string;
}
export const W = 248, H = 440;
const OUT = "#6d5a5f", INK = "#4A3B3F", CREAM = "#FFF9F0";
const hash = (s: string) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v)), lerp = (a: number, b: number, t: number) => a + (b - a) * t, ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export function makePlan(s: Story, ctx: { home?: Place | null; stamp?: string } = {}): Plan {
  const text = `${s.headline}. ${s.snippet ?? ""}`, topic = classify(text, s.tier), seed = hash(s.id || s.headline), r = rng(seed);
  let place = findPlace(s.headline) ?? findPlace(s.snippet ?? ""); const local = s.tier === "local";
  if (local && s.place) place = ctx.home ?? place;
  const figs = figures(s.headline + " " + (s.snippet ?? "")), hasMap = local || !!place;
  const shots: Plan["shots"] = [{ kind: "scene", dur: 4.6 }, figs.length ? { kind: "figures", dur: 3.6 } : { kind: "quote", dur: 3.8 }];
  if (hasMap) shots.push({ kind: "map", dur: 4.2 }); shots.push({ kind: "title", dur: 3.6 });
  const look = { ...toLook(randomAvatar(r, "adult"), 40 + (seed % 20)), tag: false };
  const name = `${FIRST[seed % FIRST.length]} ${LAST[(seed >>> 5) % LAST.length]}`;
  const variants = ["a", "b", "c"], variant = (/\b(snow|blizzard|frost|cold)\b/i.test(text) ? "snow" : /\b(rain|storm|flood|thunder|hurricane|typhoon|monsoon)\b/i.test(text) ? "rain" : /\b(wind|breezy|gust)\b/i.test(text) ? "wind" : /\b(heat|hot|sunny|clear)\b/i.test(text) ? "sun" : variants[seed % 3]);
  return { id: s.id, topic, tier: s.tier, headline: s.headline, snippet: (s.snippet ?? "").trim(), source: s.source, place, placeLabel: place?.name ?? (local ? (s.place ?? "") : ""), local, home: ctx.home ?? null, seed, shots, total: shots.reduce((a, x) => a + x.dur, 0), reporter: { name, look }, figs, variant, stamp: ctx.stamp ?? "" };
}

/* ------------------------------------------------------------ paper helpers */
export type C = CanvasRenderingContext2D;
export function paper(c: C, path: (c: C) => void, fill: string, lw = 1.5, shadow = true) {
  c.save(); if (shadow) { c.shadowColor = "rgba(52,34,46,.30)"; c.shadowBlur = 3.5; c.shadowOffsetX = 1.2; c.shadowOffsetY = 2.6; } path(c); c.fillStyle = fill; c.fill(); c.shadowColor = "transparent";
  if (lw) { c.lineWidth = lw; c.strokeStyle = OUT; c.lineJoin = "round"; c.stroke(); } c.restore();
}
export const rrp = (c: C, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
export const box = (c: C, x: number, y: number, w: number, h: number, fill: string, r = 3, shadow = true) => paper(c, (c) => rrp(c, x, y, w, h, r), fill, 1.4, shadow);
export const dot = (c: C, x: number, y: number, r: number, fill: string, shadow = true) => paper(c, (c) => { c.beginPath(); c.arc(x, y, r, 0, 7); }, fill, 1.3, shadow);
export const poly = (c: C, pts: number[][], fill: string, shadow = true) => paper(c, (c) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); }, fill, 1.4, shadow);
export const cloud = (c: C, x: number, y: number, s: number, fill = "#fff") => paper(c, (c) => { c.beginPath(); c.arc(x - 9 * s, y + 2 * s, 7 * s, 0, 7); c.arc(x, y - 4 * s, 10 * s, 0, 7); c.arc(x + 11 * s, y + 1 * s, 8 * s, 0, 7); c.rect(x - 9 * s, y + 2 * s, 20 * s, 7 * s); }, fill, 1.2);
export const tree = (c: C, x: number, y: number, s: number, col = "#5E9C72", sway = 0) => { box(c, x - 1.6 * s, y - 10 * s, 3.2 * s, 10 * s, "#9A653D", 1, false); dot(c, x + sway, y - 17 * s, 9 * s, col); dot(c, x - 6 * s + sway, y - 12 * s, 6 * s, "#88B89A"); dot(c, x + 6 * s + sway, y - 12.5 * s, 6 * s, "#3F7655"); };
export const hills = (c: C, y: number, col: string, amp: number, ph: number, shadow = true) => paper(c, (c) => { c.beginPath(); c.moveTo(-5, H + 5); c.lineTo(-5, y); for (let x = -5; x <= W + 5; x += 6) c.lineTo(x, y + Math.sin(x * 0.03 + ph) * amp + Math.sin(x * 0.011 + ph * 2) * amp * 0.6); c.lineTo(W + 5, H + 5); c.closePath(); }, col, 1.4, shadow);
export const sky = (c: C, a: string, b: string) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(-4, -4, W + 8, H + 8); };
export const text = (c: C, s: string, x: number, y: number, size: number, col = INK, align: CanvasTextAlign = "left", weight = 800) => { c.font = `${weight} ${size}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`; c.textAlign = align; c.fillStyle = col; c.fillText(s, x, y); };
export function wrapLines(c: C, s: string, maxW: number) { const out: string[] = []; let cur = ""; for (const w of s.split(/\s+/)) { const t = cur ? cur + " " + w : w; if (c.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }
export const person = (c: C, x: number, y: number, s: number, look: Look, o: Record<string, any> = {}) => { c.save(); c.translate(x, y); c.scale(s, s); c.shadowColor = "rgba(52,34,46,.3)"; c.shadowBlur = 2; c.shadowOffsetY = 1; drawChar(c, 0, 0, { ...look, dir: "down", moving: false, walk: 0, ...o }, o.t ?? 0); c.restore(); };
const crowd = (p: Plan, n: number) => Array.from({ length: n }, (_, i) => ({ ...toLook(randomAvatar(rng(p.seed + i * 977), i % 3 === 0 ? "hs" : i % 3 === 1 ? "g68" : "g35"), 60 + i), tag: false }) as Look);

/* ------------------------------------------------------------ scenes (one per topic) */
const PAL: Record<Topic, [string, string]> = { weather: ["#8fc9e8", "#e9f7fc"], sports: ["#a9ddf2", "#d8efd0"], politics: ["#f6b294", "#fff3e0"], economy: ["#b8a8da", "#fff3e0"], health: ["#eaa5b2", "#fff3e8"], science: ["#a9dcc0", "#e9f7fc"], space: ["#26325e", "#6a5fa8"], tech: ["#4f91c7", "#9fd0ea"], environment: ["#a9ddf2", "#cfe9c8"], education: ["#f8d977", "#fff3e0"], arts: ["#a9374a", "#f28f7e"], food: ["#f6b294", "#f8d977"], transport: ["#8fc9e8", "#fff3e0"], emergency: ["#f6b294", "#eaa5b2"], community: ["#a9ddf2", "#cfe9c8"], world: ["#4f91c7", "#a9ddf2"], general: ["#8fc9e8", "#fff3e0"] };
function reporterAt(c: C, p: Plan, x: number, y: number, t: number) {
  person(c, x, y, 2.5, p.reporter.look, { arms: { R: [9, -22], L: [-8.2, -9.5] }, mouth: Math.abs(Math.sin(t * 9)) * 0.6, t });
  const mx = x + 9 * 2.5 + 1, my = y - 22 * 2.5 + 4; box(c, mx - 2, my - 3, 4, 16, "#313A3F", 2); dot(c, mx, my - 6, 4, "#EAB94E");
}
const SCENES: Record<Topic, (c: C, p: Plan, u: number) => void> = {
  weather(c, p, u) {
    const rain = p.variant === "rain", snow = p.variant === "snow", wind = p.variant === "wind", sun = p.variant === "sun" || (!rain && !snow && !wind);
    sky(c, rain ? "#6f8aa6" : snow ? "#b9d3e6" : "#8fc9e8", rain ? "#b7c8d6" : "#f2f9fd");
    if (sun) { c.save(); c.translate(180, 90); c.rotate(u * 0.3); for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); poly(c, [[-5, -34], [0, -52], [5, -34]], "#F8D977", false); } c.restore(); dot(c, 180, 90, 28, "#EAB94E"); }
    for (let i = 0; i < 4; i++) cloud(c, ((u * (wind ? 40 : 10) + i * 90) % (W + 120)) - 40, 70 + i * 34, 1.5 + (i % 2) * 0.5, rain ? "#8a9bad" : "#fff");
    hills(c, 330, "#88B89A", 10, 1, true); hills(c, 360, "#5E9C72", 8, 3, true);
    tree(c, 40, 360, 1.5, "#5E9C72", wind ? Math.sin(u * 5) * 3 : 0); tree(c, 205, 366, 1.8, "#3F7655", wind ? Math.sin(u * 5 + 1) * 3 : 0);
    c.save(); c.strokeStyle = rain ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.95)"; c.lineWidth = snow ? 0 : 1.4; for (let i = 0; i < 46; i++) { const x = (i * 53 + (u * (wind ? 70 : 20) * 3)) % (W + 20) - 10, y = ((i * 97 + u * (snow ? 40 : 260)) % (H + 20)) - 10; if (rain) { c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 12); c.stroke(); } else if (snow) { c.fillStyle = "#fff"; c.beginPath(); c.arc(x + Math.sin(u + i) * 6, y, 2.2, 0, 7); c.fill(); } } c.restore();
    if (rain && Math.sin(u * 2.3) > 0.96) { c.fillStyle = "rgba(255,255,255,.45)"; c.fillRect(0, 0, W, H); }
    reporterAt(c, p, 62, 408, u);
  },
  sports(c, p, u) {
    sky(c, "#a9ddf2", "#e9f7fc"); box(c, 0, 250, W, 200, "#88B89A", 0, false); for (let i = 0; i < 8; i++) { c.fillStyle = i & 1 ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.05)"; c.fillRect(0, 250 + i * 25, W, 25); }
    c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 3; c.strokeRect(14, 262, W - 28, 170); c.beginPath(); c.arc(W / 2, 347, 28, 0, 7); c.moveTo(W / 2, 262); c.lineTo(W / 2, 432); c.stroke();
    for (const x of [30, 218]) { box(c, x - 3, 130, 6, 124, "#9DA7AA", 1); box(c, x - 16, 112, 32, 20, "#FFF9F0", 3); for (let i = 0; i < 4; i++) dot(c, x - 10 + (i % 2) * 20, 117 + Math.floor(i / 2) * 10, 3.4, "#F8D977", false); }
    box(c, 74, 40, 100, 44, "#313A3F", 6); text(c, p.figs.find((f) => /-/.test(f.value))?.value ?? "GAME DAY", 124, 70, 24, "#F8D977", "center", 900);
    const looks = crowd(p, 3); looks.forEach((lk, i) => { const x = ((u * (40 + i * 12) + i * 90) % (W + 80)) - 40; person(c, x, 380 + i * 18, 2.1, lk, { moving: true, walk: u * 9 + i, t: u }); });
    const bx = 124 + Math.sin(u * 1.6) * 80, by = 330 - Math.abs(Math.sin(u * 3.2)) * 120; c.save(); c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(bx, 392, 11, 3.2, 0, 0, 7); c.fill(); c.restore(); dot(c, bx, by, 9, CREAM); c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.arc(bx, by, 4.5, 0, 7); c.stroke();
    reporterAt(c, p, 206, 420, u);
  },
  politics(c, p, u) {
    sky(c, "#f6b294", "#fff3e0"); for (let i = 0; i < 14; i++) star(c, (i * 71) % W, 20 + ((i * 37) % 90), 2 + (i % 3), "#fff9f0");
    box(c, 30, 310, 188, 14, "#EDE2CF", 2); box(c, 20, 324, 208, 14, "#E4D6BC", 2); box(c, 10, 338, 228, 16, "#DCCCAD", 2);
    for (let i = 0; i < 6; i++) box(c, 42 + i * 30, 222, 13, 88, "#FFF9F0", 3);
    poly(c, [[26, 222], [124, 168], [222, 222]], "#EDE2CF"); paper(c, (c) => { c.beginPath(); c.ellipse(124, 150, 40, 36, 0, Math.PI, 0); c.lineTo(164, 168); c.lineTo(84, 168); c.closePath(); }, "#FFF9F0"); box(c, 120, 100, 8, 22, "#9DA7AA", 1); dot(c, 124, 96, 4, "#EAB94E");
    for (const [x, col] of [[34, "#d9564a"], [214, "#4f91c7"]] as const) { box(c, x - 1.5, 90, 3, 130, "#9DA7AA", 1, false); paper(c, (c) => { c.beginPath(); c.moveTo(x + 1, 94); for (let k = 0; k <= 20; k += 4) c.lineTo(x + 1 + k * 1.6 * (x < 100 ? 1 : -1), 94 + Math.sin(u * 4 + k * 0.5) * 3); for (let k = 20; k >= 0; k -= 4) c.lineTo(x + 1 + k * 1.6 * (x < 100 ? 1 : -1), 118 + Math.sin(u * 4 + k * 0.5) * 3); c.closePath(); }, col, 1.3); }
    box(c, 92, 372, 64, 44, "#9A653D", 3); box(c, 86, 366, 76, 8, "#C98B4D", 3); box(c, 122, 346, 3, 22, "#313A3F", 1); dot(c, 123, 343, 4, "#313A3F"); reporterAt(c, p, 188, 424, u);
  },
  economy(c, p, u) {
    sky(c, "#b8a8da", "#fff3e0"); const bs = [[10, 60, 150], [50, 40, 200], [96, 54, 120], [146, 38, 180], [186, 50, 140]];
    bs.forEach(([x, w, h], i) => { box(c, x, 330 - h, w, h, ["#8173AE", "#4F91C7", "#88B89A", "#EAB94E", "#F28F7E"][i], 3); for (let a = 0; a < 6; a++) for (let b = 0; b < Math.floor(h / 24); b++) if ((a + b + Math.floor(u * 0.8)) % 3) { c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(x + 6 + (a % 3) * 14, 330 - h + 8 + b * 22, 8, 12); } });
    box(c, 0, 330, W, 110, "#DCCCAD", 0, false); const gy = 250; box(c, 38, 346, 172, 64, CREAM, 8); for (let i = 0; i < 7; i++) { const hh = 10 + ((Math.sin(u * 1.4 + i * 1.3) + 1) * 14); box(c, 48 + i * 22, 402 - hh, 14, hh, i % 2 ? "#4F91C7" : "#F28F7E", 2, false); } void gy;
    for (let i = 0; i < 3; i++) { const y = 190 - ((u * 30 + i * 70) % 160); dot(c, 40 + i * 80, y + 160, 8, "#EAB94E"); text(c, "$", 40 + i * 80, y + 164, 10, OUT, "center"); }
    reporterAt(c, p, 206, 424, u);
  },
  health(c, p, u) {
    sky(c, "#eaa5b2", "#fff3e8"); box(c, 36, 190, 176, 150, "#FFF9F0", 6); box(c, 108, 140, 32, 50, "#FFF9F0", 4); box(c, 118, 118, 12, 30, "#EA6F6F", 2); box(c, 108, 128, 32, 10, "#EA6F6F", 2);
    for (let i = 0; i < 8; i++) { c.fillStyle = "#cfe3f0"; c.fillRect(48 + (i % 4) * 40, 206 + Math.floor(i / 4) * 44, 26, 30); }
    const s = 1 + Math.sin(u * 7) * 0.08; c.save(); c.translate(124, 290); c.scale(s * 2.4, s * 2.4); paper(c, (c) => { c.beginPath(); c.moveTo(0, 14); c.bezierCurveTo(-26, -4, -14, -26, 0, -10); c.bezierCurveTo(14, -26, 26, -4, 0, 14); }, "#E9515D", 1); c.restore();
    c.strokeStyle = "#E9515D"; c.lineWidth = 2.2; c.beginPath(); for (let x = 0; x <= W; x += 3) { const ph = (x / 60 - u * 1.2) % 1; const y = 380 + (ph > 0.4 && ph < 0.45 ? -26 : ph >= 0.45 && ph < 0.5 ? 18 : Math.sin(x * 0.4) * 0.8); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    for (let i = 0; i < 5; i++) { const y = 400 - ((u * 24 + i * 60) % 330); text(c, "+", 30 + i * 46, y, 22, "#F9D6DC", "center"); }
    reporterAt(c, p, 206, 430, u);
  },
  science(c, p, u) {
    sky(c, "#a9dcc0", "#e9f7fc"); c.save(); c.translate(124, 190); for (let i = 0; i < 3; i++) { c.save(); c.rotate(i * Math.PI / 3); c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath(); c.ellipse(0, 0, 70, 24, 0, 0, 7); c.stroke(); const a = u * (2 + i * 0.4) + i; dot(c, Math.cos(a) * 70, Math.sin(a) * 24, 6, ["#F28F7E", "#4F91C7", "#EAB94E"][i]); c.restore(); } dot(c, 0, 0, 14, "#B8A8DA"); c.restore();
    paper(c, (c) => { c.beginPath(); c.moveTo(94, 300); c.lineTo(94, 340); c.lineTo(70, 400); c.quadraticCurveTo(66, 414, 80, 414); c.lineTo(168, 414); c.quadraticCurveTo(182, 414, 178, 400); c.lineTo(154, 340); c.lineTo(154, 300); c.closePath(); }, "#EAF7FB", 1.5); c.fillStyle = "#88B89A"; c.beginPath(); c.moveTo(80, 396); c.lineTo(168, 396); c.lineTo(176, 402); c.lineTo(72, 402); c.fill();
    for (let i = 0; i < 5; i++) { const y = 380 - ((u * 30 + i * 22) % 70), x = 108 + ((i * 17) % 40); dot(c, x + Math.sin(u * 3 + i) * 3, y, 3 + (i % 3), "#CFEFE0", false); }
    reporterAt(c, p, 206, 430, u);
  },
  space(c, p, u) {
    sky(c, "#26325e", "#6a5fa8"); for (let i = 0; i < 50; i++) { const tw = 0.4 + 0.6 * Math.abs(Math.sin(u * 2 + i)); c.fillStyle = `rgba(255,249,240,${tw})`; c.fillRect((i * 83) % W, (i * 47) % H, 1.8, 1.8); }
    c.save(); c.translate(70, 120); dot(c, 0, 0, 36, "#F6B294"); c.rotate(-0.4); c.strokeStyle = "#F8D977"; c.lineWidth = 5; c.beginPath(); c.ellipse(0, 0, 62, 14, 0, 0, 7); c.stroke(); c.restore(); dot(c, 190, 70, 14, "#EDE2CF");
    const ry = 400 - ((u * 55) % 460), rx = 140 + Math.sin(u) * 6; poly(c, [[rx - 12, ry + 50], [rx - 12, ry], [rx, ry - 36], [rx + 12, ry], [rx + 12, ry + 50]], "#FFF9F0"); dot(c, rx, ry + 6, 6, "#4F91C7"); poly(c, [[rx - 12, ry + 30], [rx - 26, ry + 52], [rx - 12, ry + 50]], "#F28F7E"); poly(c, [[rx + 12, ry + 30], [rx + 26, ry + 52], [rx + 12, ry + 50]], "#F28F7E");
    poly(c, [[rx - 8, ry + 52], [rx, ry + 52 + 30 + Math.sin(u * 30) * 6], [rx + 8, ry + 52]], "#F8D977", false); hills(c, 410, "#6a5fa8", 4, 1); reporterAt(c, p, 60, 430, u);
  },
  tech(c, p, u) {
    sky(c, "#4f91c7", "#9fd0ea"); c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 2; for (let i = 0; i < 8; i++) { const y = 40 + i * 48; c.beginPath(); c.moveTo(0, y); c.lineTo(60 + (i * 23) % 50, y); c.lineTo(80 + (i * 23) % 50, y + 24); c.lineTo(W, y + 24); c.stroke(); const px = ((u * 90 + i * 60) % (W + 40)) - 20; dot(c, px, y + (px > 80 ? 24 : 0), 3, "#F8D977", false); }
    box(c, 70, 170, 108, 108, "#313A3F", 10); box(c, 82, 182, 84, 84, "#4F91C7", 6); for (let i = 0; i < 6; i++) { box(c, 66, 182 + i * 14, 8, 6, "#EDE2CF", 1, false); box(c, 174, 182 + i * 14, 8, 6, "#EDE2CF", 1, false); } text(c, "AI", 124, 236, 30, CREAM, "center", 900);
    for (let i = 0; i < 3; i++) { c.strokeStyle = `rgba(255,255,255,${0.9 - i * 0.25})`; c.lineWidth = 3; c.beginPath(); c.arc(124, 140, 14 + ((u * 20 + i * 14) % 42), Math.PI * 1.2, Math.PI * 1.8); c.stroke(); }
    box(c, 40, 320, 168, 90, "#9DA7AA", 8); box(c, 48, 328, 152, 74, "#DDF3FB", 4); const eyeY = 360; dot(c, 96, eyeY, 10, "#313A3F", false); dot(c, 152, eyeY, 10, "#313A3F", false); c.fillStyle = "#fff"; c.fillRect(93 + Math.sin(u * 2) * 2, eyeY - 3, 3, 3); c.fillRect(149 + Math.sin(u * 2) * 2, eyeY - 3, 3, 3); box(c, 104, 384, 40, 6, "#313A3F", 3, false);
    reporterAt(c, p, 214, 432, u);
  },
  environment(c, p, u) {
    sky(c, "#a9ddf2", "#e9f7fc"); dot(c, 190, 80, 24, "#F8D977"); cloud(c, ((u * 8) % (W + 100)) - 30, 60, 1.6); hills(c, 250, "#A9DCC0", 14, 0.5); hills(c, 290, "#88B89A", 12, 2); hills(c, 330, "#5E9C72", 10, 4);
    for (const [x, y] of [[50, 250], [120, 236], [196, 252]]) { box(c, x - 2, y, 4, 70, "#EDE2CF", 1); c.save(); c.translate(x, y); c.rotate(u * 2 + x); for (let i = 0; i < 3; i++) { c.rotate(Math.PI * 2 / 3); poly(c, [[-2, 0], [2, 0], [1, -34], [-1, -34]], "#FFF9F0", false); } c.restore(); dot(c, x, y, 4, "#9DA7AA", false); }
    paper(c, (c) => { c.beginPath(); c.moveTo(-5, 380); for (let x = 0; x <= W + 5; x += 8) c.lineTo(x, 380 + Math.sin(x * 0.05 + u * 1.2) * 4); c.lineTo(W + 5, H); c.lineTo(-5, H); c.closePath(); }, "#8FC9E8", 1.2);
    tree(c, 30, 352, 1.9); tree(c, 90, 340, 1.4, "#3F7655"); tree(c, 214, 350, 2.0); reporterAt(c, p, 150, 424, u);
  },
  education(c, p, u) {
    sky(c, "#f8d977", "#fff3e0"); box(c, 30, 190, 188, 150, "#F28F7E", 5); poly(c, [[20, 190], [124, 130], [228, 190]], "#C4463C"); box(c, 104, 262, 40, 78, "#9A653D", 4); for (let i = 0; i < 4; i++) { box(c, 46 + (i % 2) * 120 + (i >> 1) * 0, 214 + 0, 36, 32, "#DDF3FB", 3); } box(c, 116, 96, 4, 40, "#9DA7AA", 1); paper(c, (c) => { c.beginPath(); c.moveTo(120, 98); for (let k = 0; k <= 26; k += 4) c.lineTo(120 + k, 98 + Math.sin(u * 5 + k * 0.4) * 2); for (let k = 26; k >= 0; k -= 4) c.lineTo(120 + k, 114 + Math.sin(u * 5 + k * 0.4) * 2); c.closePath(); }, "#4F91C7", 1.2);
    box(c, 0, 340, W, 100, "#A9DCC0", 0, false); const cs = crowd(p, 3); cs.forEach((lk, i) => person(c, 60 + i * 56 + Math.sin(u + i) * 4, 392 + (i % 2) * 14, 2.1, lk, { moving: true, walk: u * 7 + i, t: u }));
    for (let i = 0; i < 3; i++) box(c, 20 + i * 8, 420 - i * 9, 44 - i * 4, 8, ["#4F91C7", "#F28F7E", "#88B89A"][i], 2); reporterAt(c, p, 206, 428, u);
  },
  arts(c, p, u) {
    sky(c, "#a9374a", "#f28f7e"); box(c, 0, 360, W, 80, "#C98B4D", 0, false); for (let i = 0; i < 9; i++) { c.strokeStyle = "rgba(0,0,0,.12)"; c.beginPath(); c.moveTo(0, 360 + i * 9); c.lineTo(W, 360 + i * 9); c.stroke(); }
    for (const sd of [-1, 1]) paper(c, (c) => { c.beginPath(); const x0 = sd < 0 ? -4 : W + 4; c.moveTo(x0, -4); c.quadraticCurveTo(x0 - sd * 70, 140, x0 - sd * 74, 370); c.lineTo(x0, 370); c.closePath(); }, "#C4463C", 1.4);
    paper(c, (c) => { c.beginPath(); c.moveTo(70, 0); c.lineTo(178, 0); c.lineTo(232, 360); c.lineTo(16, 360); c.closePath(); }, `rgba(255,236,170,${0.22 + 0.06 * Math.sin(u * 3)})`, 0, false);
    for (let i = 0; i < 6; i++) { const y = 340 - ((u * 28 + i * 55) % 300); text(c, ["♪", "♫", "♪"][i % 3], 50 + ((i * 41) % 150), y, 20, "#FFF3C7", "center", 400); }
    const looks = crowd(p, 2); looks.forEach((lk, i) => person(c, 96 + i * 56, 400, 2.4, lk, { mouth: Math.abs(Math.sin(u * 8 + i)), arms: { R: [10, -24 + Math.sin(u * 3 + i) * 4], L: [-8.2, -9.5] }, t: u }));
    reporterAt(c, p, 36, 430, u);
  },
  food(c, p, u) {
    sky(c, "#f6b294", "#f8d977"); for (let i = 0; i < 3; i++) { const x = 8 + i * 80; paper(c, (c) => { c.beginPath(); c.moveTo(x, 190); c.lineTo(x + 70, 190); c.lineTo(x + 78, 224); c.lineTo(x - 8, 224); c.closePath(); }, i & 1 ? "#4F91C7" : "#D9564A"); for (let k = 0; k < 4; k++) { c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(x - 6 + k * 20, 190, 10, 34); } box(c, x + 4, 226, 62, 66, "#C98B4D", 3); for (let k = 0; k < 6; k++) dot(c, x + 14 + (k % 3) * 18, 244 + Math.floor(k / 3) * 22 + Math.sin(u * 2 + k) * 1, 8, ["#F28F7E", "#EAB94E", "#88B89A", "#B8A8DA", "#F28F7E", "#F8D977"][(k + i) % 6]); }
    box(c, 0, 330, W, 110, "#EAD9B0", 0, false); const cs = crowd(p, 2); cs.forEach((lk, i) => person(c, 80 + i * 70, 400, 2.3, lk, { moving: true, walk: u * 5 + i * 2, t: u })); reporterAt(c, p, 210, 430, u);
  },
  transport(c, p, u) {
    sky(c, "#8fc9e8", "#fff3e0"); cloud(c, ((u * 14) % (W + 100)) - 30, 70, 1.5); const ax = (u * 50) % (W + 120) - 60; poly(c, [[ax - 20, 110], [ax + 18, 110], [ax + 26, 116], [ax + 18, 122], [ax - 20, 122]], "#FFF9F0"); poly(c, [[ax - 4, 114], [ax + 6, 114], [ax - 6, 100]], "#4F91C7"); poly(c, [[ax - 20, 110], [ax - 26, 100], [ax - 18, 110]], "#F28F7E");
    hills(c, 290, "#A9DCC0", 14, 1); box(c, 0, 330, W, 12, "#9DA7AA", 0, false); box(c, 0, 340, W, 6, "#6d5a5f", 0, false); const tx = ((u * 80) % (W + 260)) - 200;
    for (let i = 0; i < 3; i++) { box(c, tx + i * 66, 290, 62, 42, i === 0 ? "#D9564A" : "#4F91C7", 6); for (let k = 0; k < 3; k++) box(c, tx + i * 66 + 6 + k * 18, 298, 14, 14, "#DDF3FB", 2, false); dot(c, tx + i * 66 + 14, 336, 5, "#313A3F", false); dot(c, tx + i * 66 + 48, 336, 5, "#313A3F", false); }
    box(c, 0, 360, W, 80, "#6d6a70", 0, false); c.strokeStyle = "#F8D977"; c.lineWidth = 3; c.setLineDash([16, 12]); c.lineDashOffset = -u * 60; c.beginPath(); c.moveTo(0, 400); c.lineTo(W, 400); c.stroke(); c.setLineDash([]);
    const cx = ((u * 60 + 60) % (W + 100)) - 50; box(c, cx, 376, 38, 16, "#F8D977", 5); dot(c, cx + 9, 394, 4.4, "#313A3F", false); dot(c, cx + 29, 394, 4.4, "#313A3F", false); reporterAt(c, p, 206, 432, u);
  },
  emergency(c, p, u) {
    sky(c, "#f6b294", "#eaa5b2"); for (let i = 0; i < 6; i++) box(c, 8 + i * 40, 220 - (i * 37) % 70, 32, 140 + (i * 37) % 70, i & 1 ? "#8A7A70" : "#9DA7AA", 2);
    box(c, 0, 360, W, 80, "#DCCCAD", 0, false); const a = u * 5; paper(c, (c) => { c.beginPath(); c.arc(124, 190, 40, 0, 7); }, "#fff", 1.2); c.save(); c.translate(124, 190); c.rotate(a); poly(c, [[0, 0], [-30, -90], [30, -90]], "rgba(233,81,93,.28)", false); c.restore(); dot(c, 124, 190, 14, Math.sin(a * 2) > 0 ? "#E9515D" : "#4F91C7");
    box(c, 40, 120, 168, 24, "#FFF9F0", 6); text(c, "STAY INFORMED", 124, 138, 12, "#C4463C", "center", 900); const cs = crowd(p, 2); cs.forEach((lk, i) => person(c, 60 + i * 70, 410, 2.3, lk, { top: "vest", shirt: "#F8D977", t: u })); reporterAt(c, p, 206, 430, u);
  },
  community(c, p, u) {
    sky(c, "#a9ddf2", "#e9f7fc"); cloud(c, ((u * 9) % (W + 100)) - 30, 60, 1.5); hills(c, 260, "#A9DCC0", 10, 1);
    [[10, 170, 60, 90, "#F2A79B"], [76, 150, 70, 110, "#F4D488"], [152, 176, 78, 84, "#9CC3E0"]].forEach(([x, y, w, h, col]: any, i) => { box(c, x, y + 70, w, h, col, 4); poly(c, [[x - 6, y + 72], [x + w / 2, y + 30], [x + w + 6, y + 72]], ["#C98569", "#9A653D", "#7C94B0"][i]); box(c, x + w / 2 - 8, y + 70 + h - 36, 16, 36, "#9A653D", 2, false); box(c, x + 8, y + 90, 14, 14, "#DDF3FB", 2, false); });
    box(c, 0, 330, W, 110, "#A9DCC0", 0, false); tree(c, 24, 376, 1.6); tree(c, 226, 380, 1.8); const cs = crowd(p, 3); cs.forEach((lk, i) => person(c, 70 + i * 54, 410 + (i % 2) * 8, 2.1, lk, { t: u, mouth: i === 1 ? Math.abs(Math.sin(u * 8)) * 0.6 : 0 })); reporterAt(c, p, 206, 432, u);
  },
  world(c, p, u) {
    sky(c, "#4f91c7", "#a9ddf2"); drawGlobe(c, 124, 190, 84, u * 18, p.place); for (let i = 0; i < 20; i++) { c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect((i * 67) % W, (i * 41) % 110, 2, 2); } box(c, 0, 320, W, 120, "#8FC9E8", 0, false); reporterAt(c, p, 60, 428, u);
  },
  general(c, p, u) {
    sky(c, "#8fc9e8", "#fff3e0"); for (let i = 0; i < 4; i++) { c.save(); c.translate(124, 230 + i * 3); c.rotate((i - 1.5) * 0.12); box(c, -70, -90, 140, 180, i === 3 ? CREAM : "#F3E7CF", 4); if (i === 3) { text(c, "NEWS", 0, -48, 28, "#4A3B3F", "center", 900); c.fillStyle = "#8A7A70"; for (let k = 0; k < 8; k++) c.fillRect(-56, -22 + k * 14, k % 3 ? 112 : 70, 4); box(c, -56, 50, 50, 28, "#8FC9E8", 3, false); } c.restore(); }
    dot(c, 190, 360, 14, "#313A3F"); box(c, 186, 372, 8, 40, "#9DA7AA", 2); const pulse = 6 + Math.sin(u * 5) * 3; c.strokeStyle = "rgba(233,81,93,.7)"; c.lineWidth = 2; c.beginPath(); c.arc(190, 360, 18 + pulse, 0, 7); c.stroke(); reporterAt(c, p, 56, 430, u);
  },
};
export function star(c: C, x: number, y: number, r: number, col: string) { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i & 1 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }

/* ------------------------------------------------------------ world map + globe */
const LAND: number[][][] = [
  [[-168, 66], [-162, 70], [-141, 70], [-125, 70], [-95, 72], [-80, 73], [-62, 66], [-55, 52], [-66, 45], [-76, 38], [-81, 31], [-80, 25], [-84, 30], [-90, 29], [-97, 26], [-98, 19], [-92, 15], [-84, 10], [-80, 8], [-85, 12], [-92, 16], [-105, 20], [-110, 24], [-112, 31], [-117, 32], [-124, 40], [-125, 49], [-135, 58], [-148, 61], [-158, 57], [-165, 62]],
  [[-73, 78], [-60, 82], [-30, 83], [-20, 75], [-24, 69], [-42, 60], [-52, 66], [-58, 75]],
  [[-80, 9], [-72, 12], [-62, 10], [-52, 5], [-50, 0], [-35, -6], [-39, -14], [-48, -26], [-58, -35], [-65, -42], [-68, -52], [-72, -50], [-74, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-79, 2]],
  [[-10, 36], [-9, 43], [-1, 46], [-4, 48], [2, 51], [8, 54], [9, 57], [11, 55], [14, 54], [21, 55], [24, 59], [28, 60], [30, 70], [45, 68], [60, 70], [80, 73], [105, 77], [140, 72], [160, 70], [180, 68], [170, 60], [162, 57], [156, 51], [142, 52], [140, 46], [130, 42], [127, 36], [122, 40], [121, 32], [120, 26], [110, 20], [108, 12], [105, 9], [100, 13], [98, 8], [103, 1], [100, 6], [98, 16], [93, 19], [90, 22], [80, 15], [78, 8], [73, 17], [68, 24], [58, 25], [56, 26], [50, 30], [48, 29], [44, 26], [40, 16], [43, 13], [35, 28], [34, 31], [36, 36], [30, 36], [27, 37], [26, 40], [23, 38], [19, 41], [13, 45], [16, 38], [12, 38], [8, 44], [3, 43], [-1, 38], [-6, 36]],
  [[-17, 21], [-16, 28], [-10, 35], [0, 36], [10, 37], [20, 32], [32, 31], [34, 28], [43, 12], [51, 12], [43, -2], [40, -15], [35, -24], [32, -29], [20, -35], [17, -30], [12, -17], [12, -6], [9, 4], [-8, 4], [-17, 14]],
  [[114, -22], [122, -18], [130, -12], [136, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [135, -34], [129, -32], [117, -35], [115, -30]],
  [[-5, 50], [1, 51], [-2, 56], [-4, 58], [-6, 55]], [[130, 31], [141, 36], [145, 44], [141, 42], [135, 34]], [[44, -13], [50, -16], [47, -25], [43, -22]], [[95, 5], [106, -6], [115, -8], [105, -6], [98, 1]], [[110, 1], [118, 5], [118, -3], [110, -3]], [[172, -35], [178, -38], [174, -46], [168, -46]], [[-24, 65], [-14, 66], [-14, 64], [-22, 63]],
];
function worldMap(c: C, cx: number, cy: number, S: number, p: Plan, k: number, u: number) {
  // equirectangular, S px per degree; (cx, cy) in map coords = centre of view
  c.fillStyle = "#8FC9E8"; c.fillRect(-4, -4, W + 8, H + 8); c.save(); c.translate(W / 2, H / 2 - 20); c.scale(S, S); c.translate(-cx, -cy);
  c.fillStyle = "#8FC9E8"; c.fillRect(-190, -100, 380, 200); c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 0.18; for (let lo = -180; lo <= 180; lo += 30) { c.beginPath(); c.moveTo(lo, -90); c.lineTo(lo, 90); c.stroke(); } for (let la = -60; la <= 60; la += 30) { c.beginPath(); c.moveTo(-180, la); c.lineTo(180, la); c.stroke(); }
  LAND.forEach((pts, i) => { c.save(); c.shadowColor = "rgba(52,34,46,.3)"; c.shadowBlur = 3 / S; c.shadowOffsetY = 1.4 / S; c.beginPath(); pts.forEach(([x, y], j) => j ? c.lineTo(x, -y) : c.moveTo(x, -y)); c.closePath(); c.fillStyle = ["#A9DCC0", "#EDE2CF", "#88B89A", "#B7D8A4", "#F8D977", "#F6B294", "#A9DCC0", "#A9DCC0", "#B7D8A4", "#88B89A", "#A9DCC0", "#EDE2CF"][i % 12]; c.fill(); c.shadowColor = "transparent"; c.lineWidth = 0.5; c.strokeStyle = OUT; c.lineJoin = "round"; c.stroke(); c.restore(); });
  if (p.home && p.place && p.home !== p.place && p.tier !== "local") { const a = p.home, b = p.place; c.setLineDash([2, 2]); c.strokeStyle = "rgba(242,143,126,.95)"; c.lineWidth = 0.7; c.beginPath(); c.moveTo(a.lon, -a.lat); c.quadraticCurveTo((a.lon + b.lon) / 2, -((a.lat + b.lat) / 2) - 18, b.lon, -b.lat); c.stroke(); c.setLineDash([]); dot(c, a.lon, -a.lat, 1.6, "#4F91C7"); }
  if (p.place) { const x = p.place.lon, y = -p.place.lat; for (let i = 0; i < 3; i++) { const ph = ((u * 0.8 + i / 3) % 1); c.strokeStyle = `rgba(233,81,93,${1 - ph})`; c.lineWidth = 0.8; c.beginPath(); c.arc(x, y, 1 + ph * 9, 0, 7); c.stroke(); } paper(c, (c) => { c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - 3.4, y - 4, x - 3, y - 9, x, y - 9); c.bezierCurveTo(x + 3, y - 9, x + 3.4, y - 4, x, y); }, "#E9515D", 0.5); dot(c, x, y - 6, 1.2, CREAM, false); }
  c.restore(); void k;
}
function drawGlobe(c: C, x: number, y: number, r: number, lonOff: number, place: Place | null) {
  c.save(); c.translate(x, y); paper(c, (c) => { c.beginPath(); c.arc(0, 0, r, 0, 7); }, "#8FC9E8", 1.6); c.beginPath(); c.arc(0, 0, r - 1, 0, 7); c.clip();
  for (const pts of LAND) { c.beginPath(); let started = false; pts.forEach(([lo, la]) => { const L = ((lo + lonOff + 540) % 360 - 180) * Math.PI / 180, B = la * Math.PI / 180, vx = r * Math.cos(B) * Math.sin(L), vy = -r * Math.sin(B), vis = Math.cos(B) * Math.cos(L) > -0.05; if (vis) { started ? c.lineTo(vx, vy) : c.moveTo(vx, vy); started = true; } }); c.closePath(); c.fillStyle = "#88B89A"; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.8; c.stroke(); }
  if (place) { const L = ((place.lon + lonOff + 540) % 360 - 180) * Math.PI / 180, B = place.lat * Math.PI / 180; if (Math.cos(B) * Math.cos(L) > 0) dot(c, r * Math.cos(B) * Math.sin(L), -r * Math.sin(B), 4, "#E9515D"); }
  const g = c.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.2, 0, 0, r); g.addColorStop(0, "rgba(255,255,255,.28)"); g.addColorStop(1, "rgba(30,50,90,.22)"); c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r); c.restore();
}
function localMap(c: C, p: Plan, k: number, u: number) {
  const r = rng(hash(p.placeLabel || "area")); c.fillStyle = "#F3E7CF"; c.fillRect(-4, -4, W + 8, H + 8); c.save(); const z = 1 + k * 0.25; c.translate(W / 2, H / 2 - 20); c.scale(z, z); c.translate(-W / 2, -H / 2 + 20);
  for (let i = 0; i < 9; i++) { const x = r() * W, y = r() * H, w = 30 + r() * 60, h = 24 + r() * 50; box(c, x - w / 2, y - h / 2, w, h, r() < 0.4 ? "#B7D8A4" : "#EDE2CF", 4, false); }
  paper(c, (c) => { c.beginPath(); c.moveTo(-10, 120 + r() * 60); c.bezierCurveTo(60, 60, 120, 260, W + 10, 160); c.lineTo(W + 10, 200); c.bezierCurveTo(130, 300, 60, 100, -10, 160); c.closePath(); }, "#8FC9E8", 1.2, false);
  c.strokeStyle = "#fff"; c.lineWidth = 7; c.lineCap = "round"; for (let i = 0; i < 5; i++) { c.beginPath(); const y = 60 + i * 80 + r() * 20; c.moveTo(-10, y); c.lineTo(W + 10, y + (r() - 0.5) * 30); c.stroke(); } for (let i = 0; i < 4; i++) { c.beginPath(); const x = 30 + i * 60 + r() * 14; c.moveTo(x, -10); c.lineTo(x + (r() - 0.5) * 30, H + 10); c.stroke(); }
  c.strokeStyle = "#F8D977"; c.lineWidth = 3; c.beginPath(); c.moveTo(-10, 300); c.lineTo(W + 10, 270); c.stroke(); c.restore();
  const x = W / 2, y = H / 2 - 20; for (let i = 0; i < 3; i++) { const ph = (u * 0.8 + i / 3) % 1; c.strokeStyle = `rgba(233,81,93,${1 - ph})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 6 + ph * 40, 0, 7); c.stroke(); } paper(c, (c) => { c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - 14, y - 16, x - 12, y - 38, x, y - 38); c.bezierCurveTo(x + 12, y - 38, x + 14, y - 16, x, y); }, "#E9515D", 1.4); dot(c, x, y - 26, 5, CREAM, false);
  c.save(); c.translate(204, 56); dot(c, 0, 0, 16, CREAM); poly(c, [[0, -13], [4, 0], [0, 13], [-4, 0]], "#E9515D", false); text(c, "N", 0, -19, 9, INK, "center", 900); c.restore();
}

/* ------------------------------------------------------------ shots */
const chip = (c: C, s: string, x: number, y: number, col: string, ink = "#fff") => { c.font = "800 9px system-ui,sans-serif"; const w = c.measureText(s).width + 16; box(c, x, y, w, 17, col, 8); text(c, s, x + 8, y + 12, 9, ink, "left", 800); return w; };
function shotScene(c: C, p: Plan, u: number, k: number) {
  c.save(); const z = 1 + 0.07 * k; c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2 + Math.sin(p.seed) * 6 * k, -H / 2); SCENES[p.topic](c, p, u); c.restore();
  // reporter lower third
  const a = clamp(Math.min(u / 0.5, (4.6 - u) / 0.4), 0, 1); if (a > 0) { c.save(); c.globalAlpha = a; box(c, 10, 30, 150, 34, "rgba(255,249,240,.96)", 8); text(c, "REPORTING", 18, 44, 8, "#E07A66", "left", 900); text(c, p.reporter.name, 18, 58, 12, INK, "left", 800); c.restore(); }
}
function shotQuote(c: C, p: Plan, u: number, k: number) {
  const [a, b] = PAL[p.topic]; sky(c, a, b); for (let i = 0; i < 5; i++) dot(c, ((i * 61 + u * 6) % (W + 40)) - 20, 40 + i * 80, 22 + (i % 3) * 8, "rgba(255,255,255,.22)", false);
  const src = p.snippet && p.snippet.length > 24 ? p.snippet.split(/(?<=[.!?])\s/)[0] : p.headline; c.font = "700 15px system-ui,sans-serif"; const ls = wrapLines(c, src.length > 190 ? src.slice(0, 187) + "…" : src, W - 68), bh = 96 + Math.min(9, ls.length) * 21 + 34; box(c, 16, 78, W - 32, bh, CREAM, 14); text(c, "“", 32, 134, 64, "#E07A66", "left", 900); c.fillStyle = INK;
  const shown = Math.floor(clamp(u / 2.6, 0, 1) * src.length); let used = 0; ls.slice(0, 9).forEach((l, i) => { const part = l.slice(0, Math.max(0, shown - used)); used += l.length + 1; text(c, part, 32, 156 + i * 21, 15, INK, "left", 700); });
  text(c, "FROM THE REPORT", 32, 78 + bh - 14, 9, "#8A7A70", "left", 800); chip(c, TOPIC_LABEL[p.topic].toUpperCase(), 16, 78 + bh + 14, "#4F91C7"); text(c, `via ${p.source}`.slice(0, 34), 18, 396, 11, "#fff", "left", 700); void k;
}
function shotFigures(c: C, p: Plan, u: number, k: number) {
  const [a, b] = PAL[p.topic]; sky(c, a, b); text(c, "BY THE NUMBERS", W / 2, 54, 12, "#fff", "center", 900); const f = p.figs;
  f.forEach((fg, i) => { const y = 140 + i * 96, appear = ease(clamp((u - i * 0.35) / 0.6, 0, 1)); c.save(); c.globalAlpha = appear; c.translate(0, (1 - appear) * 20); box(c, 18, y - 40, W - 36, 80, CREAM, 14); const num = parseFloat(fg.value.replace(/[$,]/g, "")), unit = fg.value.replace(/^[$\d.,\s]+/, "");
    const val = isFinite(num) && !/-/.test(fg.value) ? (num * clamp(u / 1.8, 0, 1)) : null; const shown = val == null ? fg.value : (fg.value.startsWith("$") ? "$" : "") + (num % 1 ? val.toFixed(1) : Math.round(val).toLocaleString("en-US")) + (unit ? (/^%|^percent/.test(unit) ? "%" : " " + unit) : ""); text(c, shown.slice(0, 14), 32, y + 6, shown.length > 9 ? 24 : 32, "#E07A66", "left", 900); text(c, fg.label.slice(0, 22), 34, y + 28, 12, "#8A7A70", "left", 700); c.restore(); });
  text(c, `via ${p.source}`.slice(0, 34), 18, 408, 11, "#fff", "left", 700); void k;
}
function shotMap(c: C, p: Plan, u: number, k: number) {
  if (p.local && (!p.place || p.place === p.home)) { localMap(c, p, k, u); }
  else if (p.place) { const e = ease(clamp(u / 3.4, 0, 1)); const S = lerp(0.62, p.place.kind === "country" || p.place.kind === "region" ? 1.7 : 2.6, e); worldMap(c, lerp(0, p.place.lon, e), lerp(0, -p.place.lat, e), S * (W / 248), p, k, u); }
  else localMap(c, p, k, u);
  const label = p.place?.name ?? p.placeLabel; if (label) { const w = Math.min(190, 30 + label.length * 8); box(c, W / 2 - w / 2, 366, w, 36, CREAM, 10); text(c, "LOCATION", W / 2, 378, 7, "#E07A66", "center", 900); text(c, label, W / 2, 394, 14, INK, "center", 900); }
}
function shotTitle(c: C, p: Plan, u: number, k: number) {
  const [a, b] = PAL[p.topic]; sky(c, a, b); const bx = (u * 10) % 60; for (let i = -1; i < 6; i++) { c.fillStyle = "rgba(255,255,255,.14)"; c.fillRect(i * 60 + bx - 20, 0, 24, H); }
  c.font = "900 20px system-ui,sans-serif"; const ls0 = wrapLines(c, p.headline, W - 60), th = 84 + Math.min(7, ls0.length) * 26 + 40; box(c, 14, 70, W - 28, th, CREAM, 14); let x = 26; x += chip(c, TOPIC_LABEL[p.topic].toUpperCase(), x, 84, "#4F91C7") + 6; chip(c, p.tier === "local" ? "LOCAL" : p.tier === "world" ? "WORLD" : "NATIONAL", x, 84, "#E07A66");
  c.font = "900 20px system-ui,sans-serif"; const ls = wrapLines(c, p.headline, W - 60), words = p.headline.split(/\s+/).length, shownW = Math.floor(clamp(u / 2.2, 0, 1) * words); let seen = 0;
  ls.slice(0, 7).forEach((l, i) => { const lw = l.split(/\s+/); const vis = lw.slice(0, Math.max(0, shownW - seen)).join(" "); seen += lw.length; if (vis) { if (i === 0) { c.fillStyle = "rgba(248,217,119,.55)"; c.fillRect(24, 126 + i * 26 - 3, Math.min(W - 48, c.measureText(vis).width + 8), 8); } text(c, vis, 26, 124 + i * 26, 20, INK, "left", 900); } });
  text(c, `via ${p.source}`.slice(0, 32), 26, 70 + th - 14, 11, "#8A7A70", "left", 800); box(c, 14, 372, W - 28, 44, "#313A3F", 10); text(c, "UNIFY NEWS", 26, 398, 12, "#fff", "left", 900); text(c, p.stamp || "", W - 24, 398, 8, "#F8D977", "right", 800); void k;
}
export function draw(c: CanvasRenderingContext2D, w: number, h: number, p: Plan, t: number) {
  c.save(); c.scale(w / W, h / H); c.beginPath(); c.rect(0, 0, W, H); c.clip();
  let u = t % p.total, kind: ShotKind = p.shots[0].kind, dur = p.shots[0].dur; for (const s of p.shots) { if (u < s.dur) { kind = s.kind; dur = s.dur; break; } u -= s.dur; }
  const k = clamp(u / dur, 0, 1); c.lineCap = "round";
  ({ scene: shotScene, quote: shotQuote, figures: shotFigures, map: shotMap, title: shotTitle })[kind](c, p, u, k);
  c.restore();
}
/** record the generated video as a downloadable file (WebM) */
export function record(p: Plan, seconds = p.total, done: (blob: Blob | null) => void) {
  try {
    const cv = document.createElement("canvas"); cv.width = 496; cv.height = 880; const c = cv.getContext("2d")!, stream = (cv as any).captureStream(30) as MediaStream;
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => (window as any).MediaRecorder?.isTypeSupported(m)); if (!mime) return done(null);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 }), chunks: Blob[] = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data); rec.onstop = () => done(new Blob(chunks, { type: "video/webm" }));
    const t0 = performance.now(); rec.start(); const loop = () => { const t = (performance.now() - t0) / 1000; draw(c, cv.width, cv.height, p, t); if (t < seconds) requestAnimationFrame(loop); else rec.stop(); }; loop();
  } catch { done(null); }
}
