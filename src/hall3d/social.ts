/** Persistent social state shared by the hallway, auditorium and newsroom pages (same origin => same localStorage):
 *  the player's profile + avatar, and what every NPC remembers about the player. */
import { AvatarSpec, defaultAvatar } from "./avatar";

const KEY = "unify.social.v1";
export interface LogLine { who: "me" | "npc"; text: string; t: number }
export interface Mem {
  met: boolean; fr: number; talks: number; lastDay: string; lastAt: number; topics: string[]; facts: Record<string, string>; log: LogLine[];
  quiz: { right: number; total: number }; mood: number; helped: number; hurt: number; classNotes: string[]; overheard: string[]; lunchBuddy?: boolean; seenInClass: number; called: number;
}
export interface Profile { name: string; avatar: AvatarSpec; facts: Record<string, string>; stats: { talks: number; quizRight: number; quizTotal: number; hands: number }; created: number; hasAvatar: boolean }
interface State { profile: Profile; mem: Record<string, Mem>; v: 1 }

export const today = () => new Date().toISOString().slice(0, 10);
const blankMem = (): Mem => ({ met: false, fr: 0, talks: 0, lastDay: "", lastAt: 0, topics: [], facts: {}, log: [], quiz: { right: 0, total: 0 }, mood: 0, helped: 0, hurt: 0, classNotes: [], overheard: [], seenInClass: 0, called: 0 });
const blankState = (): State => ({ v: 1, mem: {}, profile: { name: "", avatar: defaultAvatar(), facts: {}, stats: { talks: 0, quizRight: 0, quizTotal: 0, hands: 0 }, created: Date.now(), hasAvatar: false } });

let state: State = blankState(), timer: any = 0; const listeners = new Set<() => void>();
function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.v === 1) { state = { ...blankState(), ...s, profile: { ...blankState().profile, ...s.profile } }; } } catch { /* private mode: stay in memory */ } }
function save() { clearTimeout(timer); timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }, 120); }
load();
try { addEventListener("storage", (e) => { if (e.key === KEY) { load(); listeners.forEach((f) => f()); } }); } catch { /* not in a window */ }

export const Social = {
  get profile() { return state.profile; },
  setProfile(p: Partial<Profile>) { state.profile = { ...state.profile, ...p }; save(); listeners.forEach((f) => f()); },
  learn(k: string, v: string) { state.profile.facts[k] = v; save(); },
  mem(id: number | string): Mem { const k = String(id); return state.mem[k] ?? (state.mem[k] = blankMem()); },
  peek(id: number | string): Mem | undefined { return state.mem[String(id)]; },
  edit(id: number | string, fn: (m: Mem) => void) { fn(Social.mem(id)); save(); listeners.forEach((f) => f()); },
  friends(): { id: string; mem: Mem }[] { return Object.entries(state.mem).filter(([, m]) => m.met).map(([id, mem]) => ({ id, mem })).sort((a, b) => b.mem.fr - a.mem.fr); },
  onChange(f: () => void) { listeners.add(f); return () => listeners.delete(f); },
  reset() { state = blankState(); save(); listeners.forEach((f) => f()); },
  save,
};
export const tier = (fr: number) => fr >= 85 ? "best friend" : fr >= 60 ? "close friend" : fr >= 30 ? "friend" : fr >= 10 ? "classmate" : "new face";
export const hearts = (fr: number) => Math.min(5, Math.ceil(fr / 20));
export function remember(id: number | string, who: "me" | "npc", text: string) { Social.edit(id, (m) => { m.log.push({ who, text: text.slice(0, 220), t: Date.now() }); if (m.log.length > 24) m.log.splice(0, m.log.length - 24); }); }
export function bump(id: number | string, d: number) { Social.edit(id, (m) => { m.fr = Math.max(0, Math.min(100, m.fr + d)); if (d < 0) m.hurt++; }); }
