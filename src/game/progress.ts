/** Class times, lesson progress and placement levels, saved on this device (same origin for the hallway, classrooms and phone).
 *  - Each class offers 5 random session times per day, or three set times (morning, noon, evening) to pick from; the pick goes on today's schedule.
 *  - Finishing a lesson opens the next one for that class so students can get ahead.
 *  - Lessons follow placement: a short check sets where each student starts. The check is OFF by default (demo run); turn it on in the classroom menu. */
export type Subject = "math" | "ela" | "science" | "history" | "careers" | "life";
export const ALL_SUBJECTS: Subject[] = ["math", "ela", "science", "history", "careers", "life"];
export const SUBJECT_NAME: Record<Subject, string> = { math: "Math", ela: "ELA", science: "Science", history: "History", careers: "CarryingCareers", life: "Life Lessons" };
export const SET_TIMES = [{ id: "morning", label: "Morning", min: 9 * 60 }, { id: "noon", label: "Noon", min: 12 * 60 + 30 }, { id: "evening", label: "Evening", min: 17 * 60 + 30 }] as const;
const KEY = "unify.progress.v1", ASSESS = "unify.assess.on";
interface Pick { min: number; kind: "random" | "set"; at: number }
export interface Assessment { date: string; age: number; band: number; levels: Partial<Record<Subject, number>> }
interface State { idx: Partial<Record<Subject, number>>; done: Partial<Record<Subject, string[]>>; level: Partial<Record<Subject, number>>; extra: Partial<Record<Subject, string[]>>; assess?: Assessment; days: Record<string, Record<string, Pick>> }
const read = (): State => { try { const s = JSON.parse(localStorage.getItem(KEY) || "{}"); return { idx: s.idx || {}, done: s.done || {}, level: s.level || {}, extra: s.extra || {}, assess: s.assess, days: s.days || {} }; } catch { return { idx: {}, done: {}, level: {}, extra: {}, days: {} }; } };
const write = (s: State) => { try { const keep = Object.keys(s.days).sort().slice(-14); s.days = Object.fromEntries(keep.map((k) => [k, s.days[k]])); localStorage.setItem(KEY, JSON.stringify(s)); window.dispatchEvent(new Event("unify:progress")); } catch { /* private mode */ } };
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hashStr = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const clock12 = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
/** 5 random session times for this class today (same for everyone, changes daily): 5-minute marks between 8:00 AM and 6:30 PM, at least 40 minutes apart */
export function slotsFor(subject: Subject, date = new Date()): number[] {
  const r = rng(hashStr(dayKey(date) + subject)), out: number[] = []; let guard = 0;
  while (out.length < 5 && guard++ < 400) { const m = 8 * 60 + Math.floor(r() * 125) * 5; if (m <= 18 * 60 + 30 && out.every((x) => Math.abs(x - m) >= 40)) out.push(m); }
  return out.sort((a, b) => a - b);
}
export const Progress = {
  get assessOn() { try { return localStorage.getItem(ASSESS) === "1"; } catch { return false; } },
  set assessOn(v: boolean) { try { localStorage.setItem(ASSESS, v ? "1" : "0"); } catch { /* private mode */ } },
  /** which lesson number this student is on in a class (placement or finished-lessons count; with no history the day's rotation keeps the demo varied) */
  index(subject: Subject, count: number): number { const s = read(); const i = s.idx[subject]; return (i ?? Math.floor(Date.now() / 864e5)) % Math.max(1, count); },
  /** the new-student assessment result (age, grade band and a level per subject), or null if not taken */
  assessment: (): Assessment | null => read().assess ?? null,
  saveAssessment(a: Assessment) { const s = read(); s.assess = a; write(s); },
  clearAssessment() { const s = read(); delete s.assess; s.extra = {}; write(s); },
  /** extra (catch-up) lessons finished, on top of regular classes */
  extraDone: (subject: Subject) => read().extra[subject] ?? [],
  completeExtra(subject: Subject, id: string) { const s = read(); const d = (s.extra[subject] ??= []); if (!d.includes(id)) d.push(id); write(s); },
  /** finished a lesson: remember it and open the next one for this class */
  complete(subject: Subject, lessonId: string, count: number): number {
    const s = read(); const d = (s.done[subject] ??= []); if (!d.includes(lessonId)) d.push(lessonId); const cur = s.idx[subject] ?? Math.floor(Date.now() / 864e5) % Math.max(1, count);
    s.idx[subject] = (cur + 1) % Math.max(1, count); write(s); return s.idx[subject]!;
  },
  doneCount: (subject: Subject) => (read().done[subject] ?? []).length,
  /** pick a session time for a class today (random slot or a set time); extra=true books the extra (catch-up) lesson for that class instead */
  pick(subject: Subject, min: number, kind: "random" | "set", extra = false) { const s = read(), k = dayKey(); (s.days[k] ??= {})[subject + (extra ? "-extra" : "")] = { min, kind, at: Date.now() }; write(s); },
  unpick(subject: Subject, extra = false) { const s = read(), k = dayKey(); if (s.days[k]) delete s.days[k][subject + (extra ? "-extra" : "")]; write(s); },
  today(): { subject: Subject; min: number; extra: boolean }[] { const d = read().days[dayKey()] ?? {}; return Object.keys(d).map((key) => ({ subject: key.replace("-extra", "") as Subject, min: d[key].min, extra: key.endsWith("-extra") })).sort((a, b) => a.min - b.min); },
  pickedFor(subject: Subject, extra = false): number | null { return read().days[dayKey()]?.[subject + (extra ? "-extra" : "")]?.min ?? null; },
};
