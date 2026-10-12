/** Live school news for the 3D hallway: the shell relays `{type:'academy:live', posts, events, settings}`; the cork boards and the Newsroom marquee redraw only when new data arrives. */
import { corkTex } from "./decor";

export interface Post { id?: any; kind?: string; title?: string; body?: string; icon?: string; theme?: string; accent?: string; pinned?: boolean; board?: string }
export interface Ev { id?: any; title?: string; room?: string; host?: string; starts_at?: string; ends_at?: string; live?: boolean; icon?: string; theme?: string; accent?: string }
export interface FeedData { posts: Post[]; events: Ev[]; settings: any }
/** same palette ids as academy-live.js: colours (light to deep) and ink */
const PAL: Record<string, { c: string[]; t: string }> = {
  sun: { c: ["#FFE27A", "#FFB84D"], t: "#4A3B3F" }, sky: { c: ["#BFE3FF", "#7FB8E8"], t: "#1F2F44" }, mint: { c: ["#C9F2DC", "#8FDDB5"], t: "#1F4034" }, berry: { c: ["#F08AB0", "#B9529E"], t: "#FFFFFF" },
  sunset: { c: ["#FFB36B", "#F0707A"], t: "#FFFFFF" }, ocean: { c: ["#4E9ED6", "#2E6FB0"], t: "#FFFFFF" }, forest: { c: ["#5DAE70", "#3A7F4D"], t: "#FFFFFF" }, night: { c: ["#5A5EA0", "#34376F"], t: "#FFFFFF" },
  candy: { c: ["#FFC2E0", "#C7B6FF"], t: "#4A3B3F" }, paper: { c: ["#FBF3E2", "#EADFCB"], t: "#4A3B3F" },
};
export const Feed = {
  data: null as FeedData | null, subs: [] as ((d: FeedData | null) => void)[],
  on(f: (d: FeedData | null) => void) { this.subs.push(f); },
  /** accept an academy:live payload (posts / events / settings are each optional and merged into what we already have) */
  feed(d: any) {
    if (!d || (d.posts === undefined && d.events === undefined && !(d.settings && d.settings.banner !== undefined))) return;
    const prev = this.data ?? { posts: [], events: [], settings: {} }, next: FeedData = { posts: Array.isArray(d.posts) ? d.posts : prev.posts, events: Array.isArray(d.events) ? d.events : prev.events, settings: { ...prev.settings, ...(d.settings || {}) } };
    if (this.data && JSON.stringify(next) === JSON.stringify(this.data)) return; this.data = next; this.subs.forEach((f) => f(next));
  },
};
addEventListener("message", (e) => { const d = e.data; if (d && d.type === "academy:live") Feed.feed(d); });
(window as any).__feedBoards = (d: any) => Feed.feed(d && d.type ? d : { type: "academy:live", ...d });

export const bannerText = (s: any): string => { const b = s && s.banner; return typeof b === "string" ? b : b && typeof b === "object" ? String(b.text || b.title || b.message || "") : ""; };
export const liveEvent = (d: FeedData | null) => d?.events.find((e) => e.live) ?? null;
/** posts, pinned first */
export const sortedPosts = (d: FeedData | null) => (d?.posts ?? []).slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
const when = (s?: string) => { const t = Date.parse(s || ""); if (isNaN(t)) return ""; const d = new Date(t), now = new Date(), same = d.toDateString() === now.toDateString(); const tm = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); return same ? "Today " + tm : d.toLocaleDateString([], { weekday: "short" }) + " " + tm; };

interface Note { icon: string; title: string; sub: string; theme?: string; accent?: string; pinned?: boolean; live?: boolean }
export const postNotes = (ps: Post[]): Note[] => ps.map((p) => ({ icon: p.icon || "📌", title: p.title || "", sub: p.body || "", theme: p.theme, accent: p.accent, pinned: !!p.pinned }));
export const eventNotes = (es: Ev[]): Note[] => es.map((e) => ({ icon: e.icon || "📅", title: e.title || "", sub: [when(e.starts_at), e.room].filter(Boolean).join(" · "), theme: e.theme, accent: e.accent, live: !!e.live }));

let cork: HTMLCanvasElement | null = null;
const wrap = (c: CanvasRenderingContext2D, txt: string, maxW: number, maxL: number) => { const out: string[] = []; let cur = ""; for (const wd of txt.split(/\s+/)) { const t = cur ? cur + " " + wd : wd; if (c.measureText(t).width > maxW && cur) { out.push(cur); cur = wd; if (out.length >= maxL) break; } else cur = t; } if (cur && out.length < maxL) out.push(cur); if (out.length === maxL) { let l = out[maxL - 1]; if (c.measureText(l).width > maxW) { while (l.length > 1 && c.measureText(l + "…").width > maxW) l = l.slice(0, -1); out[maxL - 1] = l + "…"; } } return out; };

/** draw a cork board with up to 6 sticky notes (3 x 2) */
export function drawBoardCanvas(cv: HTMLCanvasElement, heading: string, notes: Note[], empty = "Nothing posted yet") {
  const c = cv.getContext("2d")!, w = cv.width, h = cv.height;
  if (!cork) cork = (corkTex().image as HTMLCanvasElement);
  c.clearRect(0, 0, w, h); c.drawImage(cork, 0, 0, w, h);
  // wood frame + heading plate
  c.lineWidth = 22; c.strokeStyle = "#8a5a33"; c.strokeRect(0, 0, w, h); c.lineWidth = 4; c.strokeStyle = "rgba(255,230,190,.55)"; c.strokeRect(12, 12, w - 24, h - 24);
  c.save(); c.shadowColor = "rgba(60,30,20,.4)"; c.shadowBlur = 8; c.shadowOffsetY = 4; c.fillStyle = "#F3E7CF"; c.beginPath(); c.roundRect(w / 2 - 170, 14, 340, 56, 12); c.fill(); c.restore();
  c.fillStyle = "#4A3B3F"; c.font = "700 32px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(heading, w / 2, 44);
  if (!notes.length) { drawNote(c, w / 2 - 150, h / 2 - 70, 300, 170, { icon: "🌱", title: empty, sub: "Check back soon", theme: "paper" }, 0.015); return; }
  const list = notes.slice(0, 6), cols = list.length <= 2 ? list.length : list.length <= 4 ? 2 : 3, rows = Math.ceil(list.length / cols), gx = 22, gy = 22, top = 92, cw = Math.min(330, (w - 2 * 40 - (cols - 1) * gx) / cols), ch = Math.min(260, (h - top - 36 - (rows - 1) * gy) / rows);
  const x0 = (w - (cols * cw + (cols - 1) * gx)) / 2, y0 = top + (h - top - 30 - (rows * ch + (rows - 1) * gy)) / 2;
  list.forEach((n, i) => { drawNote(c, x0 + (i % cols) * (cw + gx), y0 + Math.floor(i / cols) * (ch + gy), cw, ch, n, Math.sin(i * 12.9) * 0.035); });
}
function drawNote(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, n: Note, rot: number) {
  const p = PAL[n.theme || ""] || PAL.sun, acc = n.accent && /^#[0-9a-f]{6}$/i.test(n.accent) ? n.accent : p.c[1];
  const k = Math.max(0.9, Math.min(1.45, Math.min(w / 220, h / 190)));
  c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(rot); c.translate(-w / 2, -h / 2);
  c.shadowColor = "rgba(50,28,18,.45)"; c.shadowBlur = 10; c.shadowOffsetX = 3; c.shadowOffsetY = 5;
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, p.c[0]); g.addColorStop(1, p.c[1]); c.fillStyle = g; c.beginPath(); c.roundRect(0, 0, w, h, 6); c.fill(); c.shadowColor = "transparent";
  c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(6, 0, w - 12, 3);                       // lit rim
  c.fillStyle = acc; c.fillRect(0, 0, 11, h);                                                // accent edge
  c.fillStyle = p.t; c.textAlign = "left"; c.textBaseline = "alphabetic";
  c.font = `${44 * k}px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif`; c.fillText(n.icon, 24, 56 * k);
  c.font = `700 ${25 * k}px 'Trebuchet MS',sans-serif`; const tl = wrap(c, n.title, w - 40, 3); tl.forEach((l, i) => c.fillText(l, 22, (90 + i * 28) * k));
  if (n.sub) { c.globalAlpha = 0.85; c.font = `500 ${17 * k}px 'Trebuchet MS',sans-serif`; wrap(c, n.sub, w - 40, 2).forEach((l, i) => { const yy = (90 + tl.length * 28 + 6 + i * 21) * k; if (yy < h - 6) c.fillText(l, 22, yy); }); c.globalAlpha = 1; }
  if (n.pinned) { c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.arc(w / 2 + 2, 10, 9, 0, 7); c.fill(); c.fillStyle = "#D8433A"; c.beginPath(); c.arc(w / 2, 8, 9, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(w / 2 - 3, 5, 3, 0, 7); c.fill(); }
  if (n.live) { const rw = 116 * k, rh = 28 * k, rx = w - rw - 8, ry = 9; c.save(); c.shadowColor = "rgba(0,0,0,.35)"; c.shadowBlur = 5; c.shadowOffsetY = 2; c.fillStyle = "#D8433A"; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx + rw, ry); c.lineTo(rx + rw - 9 * k, ry + rh / 2); c.lineTo(rx + rw, ry + rh); c.lineTo(rx, ry + rh); c.closePath(); c.fill(); c.shadowColor = "transparent"; c.fillStyle = "#fff"; c.beginPath(); c.arc(rx + 12 * k, ry + rh / 2, 4.5 * k, 0, 7); c.fill(); c.font = `700 ${15 * k}px 'Trebuchet MS',sans-serif`; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("LIVE NOW", rx + 22 * k, ry + rh / 2 + 1); c.restore(); }
  c.restore();
}

/** the Newsroom door marquee text: live event, else the banner, else a welcome. The pattern repeats every 1024 px so the texture can scroll seamlessly. */
export function marqueeText(d: FeedData | null) { const le = liveEvent(d); if (le) return { live: true, text: `${le.title || "Newsroom"}${le.room ? " · " + le.room : ""}` }; const b = bannerText(d?.settings); return { live: false, text: b || "WELCOME TO UNIFY ACADEMY" }; }
export function drawMarquee(cv: HTMLCanvasElement, d: FeedData | null) {
  const c = cv.getContext("2d")!, w = cv.width, h = cv.height, m = marqueeText(d), per = w / 2;
  c.fillStyle = "#14121f"; c.fillRect(0, 0, w, h); c.fillStyle = "rgba(255,190,90,.07)"; for (let x = 0; x < w; x += 8) for (let y = 0; y < h; y += 8) c.fillRect(x + 1, y + 1, 5, 5);
  let size = 96; c.font = `700 ${size}px 'Trebuchet MS',sans-serif`; const lead = m.live ? 190 : 40; while (size > 40 && c.measureText(m.text).width > per - lead - 50) { size -= 4; c.font = `700 ${size}px 'Trebuchet MS',sans-serif`; }
  let txt = m.text; while (txt.length > 4 && c.measureText(txt).width > per - lead - 50) txt = txt.slice(0, -2); if (txt !== m.text) txt = txt.trimEnd() + "…";
  c.textBaseline = "middle"; c.textAlign = "left";
  for (let k = 0; k < 2; k++) {
    const ox = k * per + 20; let x = ox;
    if (m.live) { c.fillStyle = "#D8433A"; c.beginPath(); c.roundRect(ox, h / 2 - 40, 150, 80, 14); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(ox + 28, h / 2, 10, 0, 7); c.fill(); c.font = "700 36px 'Trebuchet MS',sans-serif"; c.fillText("LIVE", ox + 48, h / 2 + 2); x = ox + 175; }
    c.font = `700 ${size}px 'Trebuchet MS',sans-serif`; c.fillStyle = m.live ? "#FFD27A" : "#F8D977"; c.fillText(txt, x, h / 2 + 2);
  }
}
