/** The academy day: five random start times per class plus a morning, lunch and evening option, no overlaps, at least three classes a day,
 *  two extra lessons allowed freely and more only with teacher and parent permission. State lives in localStorage so the hallway, classroom and library agree. */
export type Subj = "math" | "ela" | "science" | "history";
export const SUBJ: Subj[] = ["math", "ela", "science", "history"];
export const SUBJECTS_SET = new Set<string>(SUBJ);
export const SUBJ_NAME: Record<Subj, string> = { math: "Math", ela: "ELA", science: "Science", history: "History" };
export const MIN_CLASSES = 3, FREE_EXTRAS = 2, LESSON_LEN = 50, DAY_OPEN = 7 * 60 + 30, DAY_CLOSE = 21 * 60, CLOCK_RATE = 8;
export interface Slot { id: string; subject: Subj; start: number; len: number; kind: "random" | "morning" | "lunch" | "evening" }
export interface Signup { subject: Subj; slotId: string; start: number; len: number; kind: Slot["kind"]; extra: boolean; status: "planned" | "inprogress" | "done"; score?: number }
export interface Day { day: string; seen: boolean; clock0: number; skip: number; slots: Record<Subj, Slot[]>; signups: Signup[]; breaks: string[]; permitted: boolean }
const KEY = "unify.schedule.v1", PIN_KEY = "unify.parentpin.v1";
const dayKey = () => new Date().toISOString().slice(0, 10);
const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed: number) => () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) ^ Math.imul(seed ^ (seed >>> 13), 3266489909)), ((seed ^= seed >>> 16) >>> 0) / 4294967296);
export const overlaps = (a: { start: number; len: number }, b: { start: number; len: number }) => a.start < b.start + b.len && b.start < a.start + a.len;
export const timeStr = (m: number) => { const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
export const NAMED: { kind: Slot["kind"]; start: number }[] = [{ kind: "morning", start: 8 * 60 + 30 }, { kind: "lunch", start: 12 * 60 }, { kind: "evening", start: 17 * 60 + 30 }];

/** five random times per class (seeded by the day, so everyone sees the same board) plus the three named blocks */
export function makeSlots(day: string): Record<Subj, Slot[]> {
  const out = {} as Record<Subj, Slot[]>;
  for (const s of SUBJ) {
    const r = rng(hash(day + s)), starts = new Set<number>(); while (starts.size < 5) starts.add(Math.round((9 * 60 + r() * (19 * 60 - 9 * 60)) / 5) * 5);
    const rand = [...starts].sort((a, b) => a - b).map((t, i) => ({ id: `${s}-r${i}`, subject: s, start: t, len: LESSON_LEN, kind: "random" as const }));
    const named = NAMED.map((n) => ({ id: `${s}-${n.kind}`, subject: s, start: n.start, len: LESSON_LEN, kind: n.kind }));
    out[s] = [...rand, ...named].sort((a, b) => a.start - b.start);
  }
  return out;
}
const fresh = (): Day => ({ day: dayKey(), seen: false, clock0: Date.now(), skip: 0, slots: makeSlots(dayKey()), signups: [], breaks: [], permitted: false });
let state: Day = fresh(); const listeners = new Set<() => void>();
function load() { try { const j = JSON.parse(localStorage.getItem(KEY) || "null"); state = j && j.day === dayKey() ? { ...fresh(), ...j } : fresh(); } catch { state = fresh(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } listeners.forEach((f) => f()); }
load(); try { addEventListener("storage", (e) => { if (e.key === KEY) { load(); listeners.forEach((f) => f()); } }); } catch { /* not in a window */ }

export const Schedule = {
  get day() { if (state.day !== dayKey()) { state = fresh(); save(); } return state; },
  onChange(f: () => void) { listeners.add(f); return () => listeners.delete(f); },
  /** the academy clock in minutes since midnight: starts at 7:30 AM when the day starts and runs CLOCK_RATE times faster than real time */
  now() { return Math.min(DAY_CLOSE, DAY_OPEN + ((Date.now() - Schedule.day.clock0) / 60000) * CLOCK_RATE + state.skip); },
  skipToNext() { const n = Schedule.nextUp(); if (n) { state.skip += Math.max(0, n.start - 5 - Schedule.now()); save(); } return n; },
  markSeen() { Schedule.day.seen = true; save(); },
  get seen() { return Schedule.day.seen; },
  signupFor(s: Subj, includeDone = true) { return Schedule.day.signups.find((x) => x.subject === s && (includeDone || x.status !== "done")); },
  /** can this slot be picked? (not overlapping another pick) */
  conflict(slot: Slot) { return Schedule.day.signups.find((x) => x.subject !== slot.subject && overlaps(x, slot)) ?? null; },
  choose(slot: Slot, extra = false): { ok: boolean; why?: string } {
    const d = Schedule.day, c = Schedule.conflict(slot); if (c) return { ok: false, why: `That overlaps your ${SUBJ_NAME[c.subject]} class at ${timeStr(c.start)}.` };
    const have = d.signups.find((x) => x.subject === slot.subject && !x.extra); if (have && !extra) d.signups = d.signups.filter((x) => x !== have);
    d.signups.push({ subject: slot.subject, slotId: slot.id, start: slot.start, len: slot.len, kind: slot.kind, extra, status: "planned" }); d.signups.sort((a, b) => a.start - b.start); save(); return { ok: true };
  },
  unchoose(s: Subj) { const d = Schedule.day; d.signups = d.signups.filter((x) => !(x.subject === s && x.status === "planned" && !x.extra)); save(); },
  get required() { return Schedule.day.signups.filter((x) => !x.extra); },
  get extras() { return Schedule.day.signups.filter((x) => x.extra); },
  get minMet() { return Schedule.required.length >= MIN_CLASSES; },
  /** may the student add another lesson (after finishing early)? two are free, then a teacher and parent must approve */
  canAddExtra(): { ok: boolean; needsPermission: boolean } { const n = Schedule.extras.length; return { ok: n < FREE_EXTRAS || Schedule.day.permitted, needsPermission: n >= FREE_EXTRAS && !Schedule.day.permitted }; },
  addExtra(subject: Subj, slot?: Slot): { ok: boolean; why?: string } {
    const a = Schedule.canAddExtra(); if (!a.ok) return { ok: false, why: "Extra lessons beyond two need teacher and parent permission." };
    const now = Schedule.now(), s = slot ?? { id: `${subject}-x${Schedule.extras.length}`, subject, start: Math.max(DAY_OPEN, Math.round(now / 5) * 5), len: LESSON_LEN, kind: "random" as const };
    if (Schedule.conflict(s)) return { ok: false, why: "That overlaps another class." }; return Schedule.choose(s, true);
  },
  parentPinSet() { try { return !!localStorage.getItem(PIN_KEY); } catch { return false; } },
  /** teacher approval comes from how the day's lessons went; the parent approves with their PIN (set the first time) */
  requestPermission(pin: string, avgScore: number): { ok: boolean; why?: string } {
    if (!/^\d{4}$/.test(pin)) return { ok: false, why: "The parent PIN is four digits." };
    const stored = (() => { try { return localStorage.getItem(PIN_KEY); } catch { return null; } })();
    if (stored && stored !== pin) return { ok: false, why: "That is not the parent PIN." };
    if (avgScore < 0.6) return { ok: false, why: "Your teacher would like to see stronger quiz results from today's lessons first." };
    try { if (!stored) localStorage.setItem(PIN_KEY, pin); } catch { /* ignore */ } Schedule.day.permitted = true; save(); return { ok: true };
  },
  avgScore() { const d = Schedule.day.signups.filter((x) => x.score != null); return d.length ? d.reduce((n, x) => n + x.score!, 0) / d.length : 1; },
  /** gate for walking into a class from the hallway */
  canStart(s: Subj): { ok: boolean; why?: string; signup?: Signup } {
    if (!Schedule.seen) return { ok: false, why: "Check the bulletin board before your first class." };
    const su = Schedule.signupFor(s, false); if (!su) return { ok: false, why: `${SUBJ_NAME[s]} is not on your schedule today. Add it on the bulletin board.` };
    if (Schedule.now() < su.start - 10) return { ok: false, why: `${SUBJ_NAME[s]} starts at ${timeStr(su.start)}. It is ${timeStr(Schedule.now())} now.`, signup: su };
    return { ok: true, signup: su };
  },
  begin(s: Subj) { const su = Schedule.signupFor(s, false); if (su) { su.status = "inprogress"; save(); } return su; },
  complete(s: Subj, score = 1) { const su = Schedule.day.signups.find((x) => x.subject === s && x.status !== "done"); if (su) { su.status = "done"; su.score = score; save(); } },
  nextUp() { return Schedule.day.signups.find((x) => x.status === "planned") ?? null; },
  /** the 15 minute break: once per lesson */
  breakKey(s: Subj) { const su = Schedule.signupFor(s, false); return `${s}@${su ? su.slotId : "free"}`; },
  breakUsed(s: Subj) { return Schedule.day.breaks.includes(Schedule.breakKey(s)); },
  useBreak(s: Subj) { const k = Schedule.breakKey(s); if (!Schedule.day.breaks.includes(k)) { Schedule.day.breaks.push(k); save(); } },
  /** reset (testing) */
  reset() { state = fresh(); save(); },
};
