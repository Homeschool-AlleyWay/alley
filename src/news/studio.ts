/** Report video studio: turns every news report and field report into a finished video for this app, keeps them in a local library, and
 *  regenerates them when the story or the look changes. Rendering is the same paper-cut engine as video.ts (see makePlan / draw / record),
 *  run one at a time in a background queue; finished WebM files + a poster live in IndexedDB so the newsroom, the phone and later visits reuse them.
 *  Nothing is invented: a video only contains what its story's own text says. */
import { makePlan, draw, record, type Plan, type Story } from "./video";
import type { Place } from "./gazetteer";

/** bump when the paper-cut look or shot logic changes: every stored video then counts as stale and is regenerated */
export const VIDEO_VERSION = 1;
const DB = "unify-report-videos", MAX_KEEP = 80, KEEP_MS = 24 * 3600e3;

export interface VideoMeta { id: string; title: string; tier: string; topic: string; source: string; place: string; seconds: number; bytes: number; created: number; seen: number; ver: number; hash: string; poster: string; story: Story; ctx: Ctx }
export interface StudioState { queued: number; rendering: string | null; renderingIds: string[]; progressOf: Record<string, number>; progress: number; ready: number; paused: boolean; auto: boolean; failed: number }
type Ctx = { home?: Place | null; stamp?: string };
type Job = { plan: Plan; story: Story; hash: string; resolve: ((b: Blob | null) => void)[]; tries: number };

const hashStr = (s: string) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const planHash = (p: Plan) => hashStr([VIDEO_VERSION, p.headline, p.snippet, p.source, p.placeLabel, p.stamp, p.topic, p.shots.map((s) => s.kind).join()].join("|"));

/* ------------------------------------------------------------ library (IndexedDB) */
let dbp: Promise<IDBDatabase | null> | null = null;
const db = () => dbp ??= new Promise((res) => {
  try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => { r.result.createObjectStore("meta", { keyPath: "id" }); r.result.createObjectStore("blob"); }; r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); }
});
const tx = async <T>(stores: string[], mode: IDBTransactionMode, f: (t: IDBTransaction) => IDBRequest | void): Promise<T | undefined> => {
  const d = await db(); if (!d) return undefined;
  return new Promise((res) => { try { const t = d.transaction(stores, mode); const r = f(t); t.oncomplete = () => res(r ? (r.result as T) : undefined); t.onerror = t.onabort = () => res(undefined); } catch { res(undefined); } });
};
export const library = {
  list: async (): Promise<VideoMeta[]> => ((await tx<VideoMeta[]>(["meta"], "readonly", (t) => t.objectStore("meta").getAll())) ?? []).sort((a, b) => b.created - a.created),
  meta: (id: string) => tx<VideoMeta>(["meta"], "readonly", (t) => t.objectStore("meta").get(id)),
  blob: (id: string) => tx<Blob>(["blob"], "readonly", (t) => t.objectStore("blob").get(id)),
  put: (m: VideoMeta, b: Blob) => tx([ "meta", "blob"], "readwrite", (t) => { t.objectStore("meta").put(m); t.objectStore("blob").put(b, m.id); }),
  remove: (id: string) => tx(["meta", "blob"], "readwrite", (t) => { t.objectStore("meta").delete(id); t.objectStore("blob").delete(id); }),
  clear: () => tx(["meta", "blob"], "readwrite", (t) => { t.objectStore("meta").clear(); t.objectStore("blob").clear(); }),
  touch: async (ids: string[]) => { const now = Date.now(); for (const id of ids) { const m = await library.meta(id); if (m) { m.seen = now; await tx(["meta"], "readwrite", (t) => t.objectStore("meta").put(m)); } } },
  /** drop videos whose story is gone for a day, and the oldest beyond the cap */
  prune: async () => { const all = await library.list(), now = Date.now(); const drop = all.filter((m) => now - m.seen > KEEP_MS); const rest = all.filter((m) => !drop.includes(m)).sort((a, b) => b.seen - a.seen).slice(MAX_KEEP); for (const m of [...drop, ...rest]) await library.remove(m.id); },
};

/* ------------------------------------------------------------ poster frame */
function poster(p: Plan): string {
  try { const cv = document.createElement("canvas"); cv.width = 124; cv.height = 220; draw(cv.getContext("2d")!, 124, 220, p, p.shots[0].dur * 0.7); return cv.toDataURL("image/jpeg", 0.7); } catch { return ""; }
}

/* ------------------------------------------------------------ queue */
/** videos are captured in real time, so a few render side by side; more than this just makes every one of them stutter */
const PARALLEL = 2;
const listeners = new Set<(s: StudioState) => void>();
const queue: Job[] = [], active = new Map<string, { job: Job; progress: number }>(); let failed = 0, ready = 0, paused = false;
let auto = (() => { try { return localStorage.getItem("unify.videos.auto") !== "0"; } catch { return true; } })();
const state = (): StudioState => {
  const ids = [...active.keys()], progressOf: Record<string, number> = {}; active.forEach((v, k) => { progressOf[k] = v.progress; });
  return { queued: queue.length, rendering: ids[0] ?? null, renderingIds: ids, progressOf, progress: ids.length ? Math.min(...ids.map((k) => progressOf[k])) : 0, ready, paused, auto, failed };
};
const emit = () => { const s = state(); listeners.forEach((f) => { try { f(s); } catch { /* listener errors never stop the queue */ } }); };
const refreshReady = async () => { ready = (await library.list()).length; emit(); };

async function render(job: Job) {
  const id = job.plan.id, entry = { job, progress: 0 }; active.set(id, entry); emit();
  const total = job.plan.total + 0.3, t0 = performance.now();
  const tick = setInterval(() => { entry.progress = Math.min(0.99, (performance.now() - t0) / 1000 / total); emit(); }, 400);
  const blob = await new Promise<Blob | null>((res) => {
    const guard = setTimeout(() => res(null), (total * 3 + 8) * 1000);
    record(job.plan, total, (b) => { clearTimeout(guard); res(b); });
  });
  clearInterval(tick);
  if (blob && blob.size > 1000) {
    const p = job.plan, now = Date.now();
    await library.put({ id: p.id, title: p.headline, tier: p.tier, topic: p.topic, source: p.source, place: p.placeLabel, seconds: Math.round(p.total * 10) / 10, bytes: blob.size, created: now, seen: now, ver: VIDEO_VERSION, hash: job.hash, poster: poster(p), story: job.story, ctx: { home: p.home, stamp: p.stamp } }, blob);
    job.resolve.forEach((r) => r(blob));
  } else if (++job.tries < 2) { queue.push(job); } else { failed++; job.resolve.forEach((r) => r(null)); }
  active.delete(id); await refreshReady(); await library.prune(); pump();
}
function pump() {
  if (paused) return;
  if (typeof document !== "undefined" && document.hidden) return;   // requestAnimationFrame is frozen in hidden tabs; resume when visible
  while (active.size < PARALLEL && queue.length) void render(queue.shift()!);
}
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (!document.hidden) pump(); });

function enqueue(plan: Plan, story: Story, front = false): Promise<Blob | null> {
  const hash = planHash(plan), cur = active.get(plan.id);
  if (cur && cur.job.hash === hash) return new Promise((r) => cur.job.resolve.push(r));
  const dup = queue.find((j) => j.plan.id === plan.id);
  if (dup && dup.hash === hash) { if (front) { queue.splice(queue.indexOf(dup), 1); queue.unshift(dup); pump(); } return new Promise((r) => dup.resolve.push(r)); }
  if (dup) queue.splice(queue.indexOf(dup), 1);
  return new Promise((resolve) => { const job: Job = { plan, story, hash, resolve: [resolve], tries: 0 }; front ? queue.unshift(job) : queue.push(job); emit(); pump(); });
}

export const studio = {
  state, library,
  onChange(f: (s: StudioState) => void) { listeners.add(f); f(state()); return () => listeners.delete(f); },
  setAuto(on: boolean) { auto = on; try { localStorage.setItem("unify.videos.auto", on ? "1" : "0"); } catch { /* private mode */ } emit(); },
  setPaused(on: boolean) { paused = on; emit(); if (!on) pump(); },
  /** the current rundown: new or changed stories are queued, unchanged ones keep their stored video, stale ones are regenerated. Returns how many were queued. */
  async sync(stories: Story[], ctx: Ctx = {}): Promise<number> {
    await refreshReady(); if (!auto) return 0;
    const have = new Map((await library.list()).map((m) => [m.id, m])); let n = 0; const keep: string[] = [];
    for (const s of stories) {
      const plan = makePlan(s, ctx), m = have.get(plan.id);
      if (m && m.hash === planHash(plan) && m.ver === VIDEO_VERSION) { keep.push(plan.id); continue; }
      enqueue(plan, s); n++;
    }
    await library.touch(keep); return n;
  },
  /** one story, now: from the library when it is current, else rendered at the front of the queue. */
  async ensure(story: Story, ctx: Ctx = {}): Promise<Blob | null> {
    const plan = makePlan(story, ctx), m = await library.meta(plan.id);
    if (m && m.hash === planHash(plan)) { const b = await library.blob(plan.id); if (b) { library.touch([plan.id]); return b; } }
    return enqueue(plan, story, true);
  },
  /** throw away the stored video and make it again */
  async regenerate(story: Story, ctx: Ctx = {}) { await library.remove(story.id); await refreshReady(); return enqueue(makePlan(story, ctx), story, true); },
  async redo(id: string) { const m = await library.meta(id); return m ? studio.regenerate(m.story, m.ctx) : null; },
  async redoAll() { for (const m of await library.list()) { await library.remove(m.id); enqueue(makePlan(m.story, m.ctx), m.story); } await refreshReady(); },
  async clear() { queue.length = 0; await library.clear(); failed = 0; await refreshReady(); },
  async url(id: string): Promise<string | null> { const b = await library.blob(id); return b ? URL.createObjectURL(b) : null; },
};
export type { Story, Plan };
