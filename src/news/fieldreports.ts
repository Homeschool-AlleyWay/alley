/** Field reports: the one place that defines the cap (FIELD_REPORT_MAX), the audience gate ('all' | 'hs'), the unsafe-word filter and the
 *  store (active + archived) used by the 3D newsroom, the 2D page, the desk and the hallway TV. Pure functions: storage is passed in.
 *  Policy: at most FIELD_REPORT_MAX reports are ACTIVE. The 21st is refused with a friendly message; nothing is ever deleted silently:
 *  archiving moves a report to `archived` (still stored, can be restored when there is room). */
import { generateScript, type ReportBeat, type SceneScript } from "./scenegen";
import { SEED_REPORTS } from "./seedReports";

export const FIELD_REPORT_MAX = 20;
export type Audience = "all" | "hs";
/** who is watching: young students, high school students, adults, or nobody known (treated like the youngest) */
export type Band = "k2" | "g35" | "g68" | "hs" | "adult" | "general";
export interface FieldReport { id: string; title: string; topic: string; audience: Audience; beats: ReportBeat[]; script: SceneScript; created: number; by?: string }
export interface Store { v: 1; active: FieldReport[]; archived: FieldReport[] }
export const STORE_KEY = "unify.fieldreports.v1";
export const FULL_MESSAGE = `The newsroom already has ${FIELD_REPORT_MAX} field reports, which is the most it can show. Archive one first (it stays saved) and then add this one.`;

/* ------------------------------------------------------------ unsafe-word filter (compose step) */
const BLOCK = [
  "kill", "kills", "killed", "killing", "murder", "murdered", "shoot", "shooting", "gun", "guns", "weapon", "weapons", "bomb", "bombs", "stab", "stabbed", "blood", "bloody", "gore", "corpse", "abuse", "terror", "terrorist", "violence", "violent", "fight", "fights", "war", "suicide",
  "horror", "haunted", "zombie", "zombies", "demon", "demons", "creepy", "nightmare", "ghost", "scary",
  "kiss", "kissing", "dating", "boyfriend", "girlfriend", "sexy", "sex", "nude", "naked", "porn",
  "alcohol", "beer", "wine", "vodka", "whiskey", "drunk", "vape", "vaping", "cigarette", "cigarettes", "smoking", "marijuana", "cocaine", "drugs", "meth", "opioid",
  "impeach", "riot", "riots", "extremist", "propaganda", "rigged",
  "damn", "crap", "hell", "stupid", "idiot", "loser", "hate", "shut up",
];
const SQUASH = ["murder", "weapon", "alcohol", "cocaine", "marijuana", "porn", "zombie", "suicide"];   // also caught when letters are spaced out
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };
const norm = (s: string) => s.toLowerCase().replace(/[013457@$!]/g, (ch) => LEET[ch]);
/** which blocked terms does this text contain? ok = none */
export function checkText(text: string): { ok: boolean; hits: string[] } {
  const raw = String(text ?? "").toLowerCase(), n = norm(raw).replace(/[^a-z\s]/g, " "), hits = new Set<string>();
  const words = ` ${n.replace(/\s+/g, " ")} `, rawWords = ` ${raw.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ")} `;
  for (const w of BLOCK) { const k = ` ${w} `; if (words.includes(k) || rawWords.includes(k)) hits.add(w); }
  const squashed = n.replace(/[^a-z]/g, "");
  for (const w of SQUASH) if (squashed.includes(w)) hits.add(w);
  return { ok: hits.size === 0, hits: [...hits] };
}
export function checkReport(r: { title: string; beats: { text: string }[] }): { ok: boolean; hits: string[] } {
  return checkText([r.title, ...r.beats.map((b) => b.text)].join(" . "));
}
export const friendly = (hits: string[]) => `Please reword this report: it contains ${hits.length > 1 ? "words that are" : "a word that is"} not right for a school newsroom (${hits.slice(0, 3).map((h) => `"${h}"`).join(", ")}).`;

/* ------------------------------------------------------------ audience gate */
/** the viewer's band from the saved avatar (AvatarSpec.age) or the family link; unknown = 'general' (sees only all-ages reports) */
export function bandOf(read: (k: string) => string | null = (k) => { try { return localStorage.getItem(k); } catch { return null; } }): Band {
  try {
    const age = JSON.parse(read("unify.social.v1") || "null")?.profile?.avatar?.age;
    if (age === "k2" || age === "g35" || age === "g68" || age === "hs" || age === "adult") return age;
    const f = JSON.parse(read("unify.family.link") || "null");
    if (f) { if (f.band === "hs" || f.band === "adult") return f.band; if (+f.grade >= 9) return "hs"; if (f.band === "k2" || f.band === "g35" || f.band === "g68") return f.band; }
  } catch { /* unreadable profile: stay general */ }
  return "general";
}
export const canSee = (audience: Audience | undefined, band: Band): boolean => (audience === "hs" ? band === "hs" || band === "adult" : true);
/** what this viewer may watch: never more than FIELD_REPORT_MAX */
export const visibleTo = (list: FieldReport[], band: Band): FieldReport[] => list.filter((r) => canSee(r.audience, band)).slice(0, FIELD_REPORT_MAX);

/* ------------------------------------------------------------ store: seed, normalize, add, archive */
const fromInput = (i: { id: string; title: string; topic?: string; audience?: string; beats: ReportBeat[]; created?: number; by?: string }): FieldReport => {
  const audience: Audience = i.audience === "hs" ? "hs" : "all", beats = i.beats.slice(0, 4);
  return { id: i.id, title: i.title.trim().slice(0, 120), topic: i.topic || "community", audience, beats, script: generateScript({ id: i.id, title: i.title.trim(), audience, beats }), created: i.created ?? Date.now(), by: i.by };
};
/** the curated 20, each with its generated film script (made at seed time) */
export function seedStore(): Store {
  return { v: 1, active: SEED_REPORTS.map((s, i) => fromInput({ ...s, created: 1700000000000 + i })), archived: [] };
}
/** make any stored value safe: default audience 'all', a script for every report, and never more than FIELD_REPORT_MAX active
 *  (extra reports are moved to `archived`, newest kept, nothing is dropped). Reports that fail the word filter are archived too. */
export function normalizeStore(raw: unknown): Store {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Store>, seen = new Set<string>();
  const fix = (x: any): FieldReport | null => {
    if (!x || typeof x.title !== "string" || !Array.isArray(x.beats) || !x.beats.length || typeof x.id !== "string" || seen.has(x.id)) return null;
    seen.add(x.id);
    const beats: ReportBeat[] = x.beats.slice(0, 4).filter((b: any) => b && typeof b.text === "string" && b.text.trim()).map((b: any) => ({ text: String(b.text).slice(0, 300), setting: b.setting, subject: b.subject, action: b.action }));
    if (!beats.length) return null;
    const r = fromInput({ id: x.id, title: x.title, topic: x.topic, audience: x.audience, beats, created: +x.created || 0, by: x.by });
    if (x.script && x.script.v === 1 && Array.isArray(x.script.scenes) && x.script.scenes.length >= 3) r.script = x.script;   // keep the stored script: playback stays identical
    return r;
  };
  const act = (Array.isArray(o.active) ? o.active : []).map(fix).filter(Boolean) as FieldReport[], arch = (Array.isArray(o.archived) ? o.archived : []).map(fix).filter(Boolean) as FieldReport[];
  const unsafe = act.filter((r) => !checkReport(r).ok), keep = act.filter((r) => checkReport(r).ok).sort((a, b) => a.created - b.created);
  const over = keep.splice(0, Math.max(0, keep.length - FIELD_REPORT_MAX));   // oldest beyond the cap go to the archive
  return { v: 1, active: keep, archived: [...arch, ...over, ...unsafe].slice(-200) };
}
export interface AddResult { ok: boolean; store: Store; error?: string; report?: FieldReport }
/** post a new report: refused (friendly message, store untouched) when it is unsafe, empty, or the newsroom already has FIELD_REPORT_MAX */
export function addReport(store: Store, draft: { title: string; topic?: string; audience?: string; beats: ReportBeat[]; by?: string }, now = Date.now()): AddResult {
  const title = draft.title.trim(), beats = draft.beats.filter((b) => b.text.trim()).map((b) => ({ ...b, text: b.text.trim() }));
  if (!title) return { ok: false, store, error: "Please give the report a title." };
  if (beats.length < 2 || beats.length > 4) return { ok: false, store, error: "A field report needs 2 to 4 short story beats." };
  const bad = checkReport({ title, beats });
  if (!bad.ok) return { ok: false, store, error: friendly(bad.hits) };
  if (store.active.length >= FIELD_REPORT_MAX) return { ok: false, store, error: FULL_MESSAGE };
  const report = fromInput({ id: "fr-" + now.toString(36) + Math.random().toString(36).slice(2, 6), title, topic: draft.topic, audience: draft.audience, beats, created: now, by: draft.by });
  return { ok: true, store: { ...store, active: [...store.active, report] }, report };
}
/** move a report to the archive (kept, not deleted) */
export function archiveReport(store: Store, id: string): Store {
  const r = store.active.find((x) => x.id === id); if (!r) return store;
  return { ...store, active: store.active.filter((x) => x.id !== id), archived: [...store.archived, r] };
}
/** bring an archived report back, if there is room */
export function restoreReport(store: Store, id: string): AddResult {
  const r = store.archived.find((x) => x.id === id); if (!r) return { ok: false, store, error: "That report is not in the archive." };
  if (store.active.length >= FIELD_REPORT_MAX) return { ok: false, store, error: FULL_MESSAGE };
  return { ok: true, store: { ...store, active: [...store.active, r], archived: store.archived.filter((x) => x.id !== id) }, report: r };
}

/* ------------------------------------------------------------ persistence: this browser, and the field_reports table when it exists */
export function loadLocal(): Store {
  try { const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (raw) return normalizeStore(raw); } catch { /* start from the seeds */ }
  return seedStore();
}
export function saveLocal(s: Store) { try { localStorage.setItem(STORE_KEY, JSON.stringify(normalizeStore(s))); } catch { /* private mode */ } }
/** read the shared list from the field_reports table (see supabase/migrations/20261016000000_field_reports.sql); null = no table yet, no rows, or no access (the caller falls back to this browser's list) */
export async function loadCloud(c: any): Promise<Store | null> {
  try {
    const r = await c.from("field_reports").select("*").order("created_at", { ascending: true }); if (r.error || !Array.isArray(r.data) || !r.data.length) return null;
    const row = (x: any) => ({ id: x.id, title: x.title, topic: x.topic, audience: x.audience, beats: x.beats, script: x.scene_script, created: Date.parse(x.created_at) || 0, by: x.author_name || undefined, status: x.status });
    const all = r.data.map(row);
    return normalizeStore({ v: 1, active: all.filter((x: any) => x.status === "active"), archived: all.filter((x: any) => x.status !== "active") });
  } catch { return null; }
}
/** write the shared list: archived rows first, so a swap (archive one, add one) never has 21 active at any moment. The cap is checked here and again by the database. */
export async function saveCloud(c: any, s: Store): Promise<{ ok: boolean; error?: string }> {
  if (s.active.length > FIELD_REPORT_MAX) return { ok: false, error: FULL_MESSAGE };
  const n = normalizeStore(s), row = (r: FieldReport, status: string) => ({ id: r.id, title: r.title, topic: r.topic, audience: r.audience, beats: r.beats, scene_script: r.script, status, author_name: (r.by || "").slice(0, 40) });
  try {
    const rows = [...n.archived.map((r) => row(r, "archived")), ...n.active.map((r) => row(r, "active"))];
    const r = await c.from("field_reports").upsert(rows, { onConflict: "id" });
    return r.error ? { ok: false, error: r.error.message || String(r.error) } : { ok: true };
  } catch (e: any) { return { ok: false, error: String(e?.message || e) }; }
}

/* ------------------------------------------------------------ live stories (2D page): rate and cap */
const HS_TOPICS = new Set(["politics", "economy", "emergency", "world"]);
/** a live news story is shown to everyone only when it passes the word filter and is not a heated or mature topic; those become high-school-only, and blocked words drop the story */
export function rateStory(headline: string, snippet: string, topic: string): "all" | "hs" | "blocked" {
  if (!checkText(`${headline} ${snippet}`).ok) return "blocked";
  return HS_TOPICS.has(topic) ? "hs" : "all";
}
/** keep at most FIELD_REPORT_MAX items, in order */
export const capList = <T>(l: T[]): T[] => l.slice(0, FIELD_REPORT_MAX);
