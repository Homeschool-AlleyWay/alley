/** Hallway lockers: every locker along the walls is a numbered slot. Most belong to students (a fixed, shared assignment); the rest are open to claim.
 *  The player's locker keeps pictures, stickers and a note on this device only (localStorage). Geometry is in hallway grid units. */
import { LOCKERS, LOCK_D } from "../hall3d/campus";
import { ROSTER, type NpcDef } from "../hall3d/roster";
import type { AvatarSpec } from "../hall3d/avatar";

type Face = "N" | "S" | "E" | "W";
export interface Slot { id: number; run: number; n: number; face: Face; /** grid point on the floor in front of this locker */ fx: number; fy: number; /** grid point on the locker face */ cx: number; cy: number }
export interface Pic { src: string; cap: string; at: number }
export interface LockerData { pics: Pic[]; stickers: string[]; note: string; theme: string }
/** a real classmate, from a showcase another family chose to publish (never photos) */
export interface Classmate { key: string; name: string; avatar: Partial<AvatarSpec>; stickers: string[]; note: string; theme: string; slot: number }
export type Owner = { kind: "mine" } | { kind: "npc"; npc: NpcDef } | { kind: "kid"; kid: Classmate } | null;

const SLOTS: Slot[] = [];
LOCKERS.forEach((l, run) => {
  const r = l.rect, horiz = l.face === "N" || l.face === "S", len = Math.floor(horiz ? r.w : r.h);
  for (let n = 0; n < len; n++) {
    const along = (horiz ? r.x : r.y) + n + 0.5; let cx = 0, cy = 0, fx = 0, fy = 0;
    if (l.face === "S") { cx = along; cy = r.y + LOCK_D; fx = along; fy = cy + 0.8; }
    else if (l.face === "N") { cx = along; cy = r.y; fx = along; fy = cy - 0.8; }
    else if (l.face === "E") { cx = r.x + LOCK_D; cy = along; fx = cx + 0.8; fy = along; }
    else { cx = r.x; cy = along; fx = cx - 0.8; fy = along; }
    SLOTS.push({ id: SLOTS.length + 1, run, n, face: l.face, fx, fy, cx, cy });
  }
});
export const LOCKER_COUNT = SLOTS.length;
export const slot = (id: number): Slot | undefined => SLOTS[id - 1];

/** the locker whose face the player (grid x, y) is standing in front of, within `reach` units */
export function lockerNear(gx: number, gy: number, reach = 1.5): Slot | null {
  let best: Slot | null = null, bd = reach;
  for (const s of SLOTS) { const d = Math.hypot(gx - s.fx, gy - s.fy); if (d < bd && (s.face === "N" || s.face === "S" ? Math.abs(gy - s.cy) : Math.abs(gx - s.cx)) < reach) { bd = d; best = s; } }
  return best;
}

/* ---- who owns which locker: students get a fixed, spread-out assignment; a few are reserved so some stretches stay open ---- */
const NPC_AT = new Map<number, NpcDef>();
(() => { const students = ROSTER.filter((s) => s.role === "student"); students.forEach((s, i) => { let id = ((i * 7919 + 13) % LOCKER_COUNT) + 1, guard = 0; while (NPC_AT.has(id) && guard++ < LOCKER_COUNT) id = (id % LOCKER_COUNT) + 1; NPC_AT.set(id, s); }); })();

const KEY = "unify.locker.v1";
interface State { mine: number | null; d: Record<string, LockerData> }
const blank = (): LockerData => ({ pics: [], stickers: [], note: "", theme: "#7fb2d6" });
let st: State = { mine: null, d: {} }; const subs = new Set<() => void>();
const load = () => { try { const j = JSON.parse(localStorage.getItem(KEY) || "null"); if (j && typeof j === "object") st = { mine: Number.isInteger(j.mine) ? j.mine : null, d: j.d && typeof j.d === "object" ? j.d : {} }; } catch { /* private mode */ } };
const save = (): boolean => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { return false; } subs.forEach((f) => f()); return true; };
try { addEventListener("unify:classmates", (e) => setClassmates((e as CustomEvent).detail || [])); } catch { /* not a window */ }
load(); try { addEventListener("storage", (e) => { if (e.key === KEY) { load(); subs.forEach((f) => f()); } }); } catch { /* not a window */ }

export const Lockers = {
  get mine() { return st.mine; },
  owner(id: number): Owner { if (st.mine === id) return { kind: "mine" }; const n = NPC_AT.get(id); if (n) return { kind: "npc", npc: n }; const k = CLASS_AT.get(id); return k ? { kind: "kid", kid: k } : null; },
  /** claim an open locker (moves your things if you already have one) */
  claim(id: number): boolean { if (NPC_AT.has(id) || CLASS_AT.has(id) || !slot(id)) return false; if (st.mine != null && st.mine !== id) { st.d[String(id)] = st.d[String(st.mine)] ?? blank(); delete st.d[String(st.mine)]; } st.mine = id; st.d[String(id)] ??= blank(); return save(); },
  release() { if (st.mine != null) { delete st.d[String(st.mine)]; st.mine = null; save(); } },
  data(): LockerData | null { return st.mine == null ? null : (st.d[String(st.mine)] ??= blank()); },
  /** edit your locker; returns false if the browser refused to store it (too many pictures) */
  edit(fn: (d: LockerData) => void): boolean { const d = Lockers.data(); if (!d) return false; const snap = JSON.stringify(d); fn(d); if (!save()) { Object.assign(d, JSON.parse(snap)); return false; } return true; },
  /** the nearest open locker to a grid point */
  nearestOpen(gx: number, gy: number): Slot | null { let best: Slot | null = null, bd = 1e9; for (const s of SLOTS) { if (NPC_AT.has(s.id) || CLASS_AT.has(s.id) || st.mine === s.id) continue; const d = Math.hypot(gx - s.fx, gy - s.fy); if (d < bd) { bd = d; best = s; } } return best; },
  onChange(f: () => void) { subs.add(f); return () => subs.delete(f); },
};
/* ---- real classmates: each published showcase keeps the locker its child claimed; two claims on one locker give the later one the nearest free locker ---- */
let CLASS_AT = new Map<number, Classmate>();
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** rows are {key, name, json} from the cloud; anything malformed is ignored. Stickers must come from the sticker list. */
export function setClassmates(rows: { key: string; name: string; json: string }[]) {
  const parsed: Classmate[] = [];
  for (const r of rows) {
    let j: any; try { j = JSON.parse(r.json); } catch { continue; }
    if (!j || typeof j !== "object" || !Number.isInteger(j.slot) || !slot(j.slot)) continue;
    parsed.push({
      key: String(r.key), name: String(r.name || "Student").slice(0, 40),
      avatar: j.avatar && typeof j.avatar === "object" ? j.avatar : {},
      stickers: (Array.isArray(j.stickers) ? j.stickers : []).filter((x: unknown) => typeof x === "string" && STICKERS.includes(x)).slice(0, 14),
      note: typeof j.note === "string" ? j.note.slice(0, 140) : "",
      theme: typeof j.theme === "string" && /^#[0-9a-f]{6}$/i.test(j.theme) ? j.theme : "#7fb2d6",
      slot: j.slot,
    });
  }
  const next = new Map<number, Classmate>(), free = (id: number) => !!slot(id) && !NPC_AT.has(id) && !next.has(id);
  const list = parsed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)), clash: Classmate[] = [];
  for (const c of list) { if (free(c.slot)) next.set(c.slot, c); else clash.push(c); }
  for (const c of clash) { let id = (hash(c.key) % LOCKER_COUNT) + 1, g = 0; while (!free(id) && g++ < LOCKER_COUNT) id = (id % LOCKER_COUNT) + 1; if (free(id)) next.set(id, c); }
  CLASS_AT = next; subs.forEach((f) => f());
}
export const STICKERS = ["⭐", "❤️", "🎵", "⚽", "📚", "🎨", "🐶", "🐱", "🌈", "🚀", "🍕", "🎮", "🦋", "🌻", "🏀", "🔬", "🎸", "🍪"];
export const THEMES = ["#7fb2d6", "#f2a79b", "#9fd0b0", "#f4d488", "#b8a8da", "#9db8c8", "#e8789a", "#4a3b3f"];
/** a peek into a classmate's locker: stickers, colour and a note, all made from who they are */
export function npcLocker(n: NpcDef): LockerData {
  const h = (n.id * 2654435761) >>> 0; const pick = (k: number, a: string[]) => a[(h >>> k) % a.length];
  const stickers = [0, 3, 6, 9].map((k) => pick(k, STICKERS)).filter((x, i, a) => a.indexOf(x) === i);
  return { pics: [], stickers, theme: n.spec.shirt || pick(2, THEMES), note: `${n.dream ? "I want to " + n.dream.replace(/^to /, "") + "." : ""} ${n.pet ? "Ask me about my " + n.pet + "." : ""}`.trim() || "Have a great day!" };
}
// classmates fetched before this module loaded (the family screen caches them on window)
try { const pre = (window as any).__classmates; if (Array.isArray(pre)) setClassmates(pre); } catch { /* no window */ }
