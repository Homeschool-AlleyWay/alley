/** Curriculum packs: a way to bring a whole curriculum into the sim. A pack is a JSON file (or the friendlier Markdown format below) with
 *  - lessons: points, examples, glossary, a "check yourself" activity, and a SCRIPT the teacher performs (lines with moods and gestures, board writing, questions, "turn to page" cues)
 *  - a textbook: chapters and sections students can read in depth in the Textbook viewer, linked from the lessons
 *  A pack can ADD lessons to a class, REPLACE a class's built-in lessons, or add ELECTIVES (extra courses such as high-school electives).
 *  Packs live in the browser (imported on the phone/tablet/PC) and/or ship in curriculum/*.json (listed in curriculum/index.json). See curriculum/README.md. */
import { CURRICULUM, type LessonDef } from "./curriculum";
import { SETS, type Order, type Sort } from "./labs";
import type { Emotion } from "./persona";
import { GESTURE } from "./sprites";
import type { Subject } from "../game/types";

export const MOODS: Emotion[] = ["neutral", "smile", "joy", "frown", "upset", "frustrated", "surprised", "thinking", "stern"];
export const GESTURES = Object.keys(GESTURE);
const SUBJECTS: Subject[] = ["math", "ela", "science", "history", "careers", "life"];

export interface ScriptStep { say?: string; mood?: Emotion; gesture?: string; board?: { side: "left" | "right"; title?: string; lines: string[] }; ask?: boolean; read?: string }
export interface BookSection { heading: string; body: string }
export interface BookChapter { id: string; title: string; sections: BookSection[] }
export interface Book { id: string; title: string; subject?: Subject; chapters: BookChapter[]; pack?: string }
export type Check = { kind: "sort"; prompt: string; groups: Record<string, string[]> } | { kind: "order"; prompt: string; items: string[] };
export interface PackLesson { id?: string; title: string; blurb?: string; intro?: string; points?: string[]; examples?: string[]; wrap?: string; homework?: string; glossary?: Record<string, string>; whys?: string[]; script?: (ScriptStep | string)[]; book?: string; check?: Check; course?: string; subject?: Subject }
export interface Pack { id: string; title: string; subject: Subject; kind: "regular" | "elective" | "replace"; grades?: string; course?: string; book?: Omit<Book, "pack">; lessons: PackLesson[] }

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "x";
const str = (v: unknown, max = 4000) => (typeof v === "string" ? v.slice(0, max) : "");
const strs = (v: unknown, n = 40) => (Array.isArray(v) ? v.map((x) => str(x, 600)).filter(Boolean).slice(0, n) : []);

/* ---------------- validation (JSON from anywhere is untrusted data) ---------------- */
function cleanStep(raw: unknown): ScriptStep | null {
  if (typeof raw === "string") return raw.trim() ? { say: raw.slice(0, 600) } : null;
  if (!raw || typeof raw !== "object") return null; const r = raw as any, s: ScriptStep = {};
  if (r.say) s.say = str(r.say, 600); if (MOODS.includes(r.mood)) s.mood = r.mood; if (typeof r.gesture === "string" && GESTURES.includes(r.gesture)) s.gesture = r.gesture;
  if (r.board && typeof r.board === "object") { const lines = strs(r.board.lines, 12); if (lines.length) s.board = { side: r.board.side === "right" ? "right" : "left", title: str(r.board.title, 80) || undefined, lines }; }
  if (r.ask) s.ask = true; if (r.read) s.read = str(r.read, 160);
  return s.say || s.board || s.ask || s.read ? s : null;
}
function cleanCheck(c: any): Check | undefined {
  if (!c || typeof c !== "object") return;
  if (c.kind === "sort" && c.groups && typeof c.groups === "object") { const g: Record<string, string[]> = {}; for (const k of Object.keys(c.groups).slice(0, 6)) { const items = strs(c.groups[k], 8); if (items.length) g[k.slice(0, 60)] = items; } if (Object.keys(g).length >= 2) return { kind: "sort", prompt: str(c.prompt, 200) || "Sort these.", groups: g }; }
  if (c.kind === "order") { const items = strs(c.items, 8); if (items.length >= 3) return { kind: "order", prompt: str(c.prompt, 200) || "Put these in order.", items }; }
}
export function cleanPack(raw: unknown): Pack {
  if (!raw || typeof raw !== "object") throw new Error("Not a curriculum pack.");
  const r = raw as any, subject: Subject = SUBJECTS.includes(r.subject) ? r.subject : (() => { throw new Error(`"subject" must be one of ${SUBJECTS.join(", ")}.`); })();
  const title = str(r.title, 100).trim(); if (!title) throw new Error("The pack needs a title."); const id = slug(str(r.id, 60) || title);
  const lessons: PackLesson[] = (Array.isArray(r.lessons) ? r.lessons : []).slice(0, 80).map((l: any): PackLesson | null => {
    const t = str(l?.title, 120).trim(); if (!t) return null; const gl: Record<string, string> = {}; if (l.glossary && typeof l.glossary === "object") for (const k of Object.keys(l.glossary).slice(0, 20)) { const v = str(l.glossary[k], 400); if (v) gl[k.slice(0, 40)] = v; }
    return { id: slug(str(l.id, 60) || t), title: t, blurb: str(l.blurb, 200), intro: str(l.intro, 600), points: strs(l.points, 10), examples: strs(l.examples, 10), wrap: str(l.wrap, 500), homework: str(l.homework, 400), glossary: gl, whys: strs(l.whys, 8), script: (Array.isArray(l.script) ? l.script : []).slice(0, 60).map(cleanStep).filter(Boolean) as ScriptStep[], book: str(l.book, 160) || undefined, check: cleanCheck(l.check), course: str(l.course, 80) || undefined };
  }).filter(Boolean) as PackLesson[];
  if (!lessons.length) throw new Error("The pack has no lessons.");
  let book: Pack["book"];
  if (r.book && typeof r.book === "object") { const chapters = (Array.isArray(r.book.chapters) ? r.book.chapters : []).slice(0, 60).map((c: any, i: number): BookChapter | null => { const ct = str(c?.title, 120).trim(); const secs = (Array.isArray(c?.sections) ? c.sections : []).slice(0, 40).map((s: any) => ({ heading: str(s?.heading, 120).trim(), body: str(s?.body, 8000) })).filter((s: BookSection) => s.heading || s.body); return ct && secs.length ? { id: slug(str(c.id, 60) || ct) || "c" + i, title: ct, sections: secs } : null; }).filter(Boolean) as BookChapter[]; if (chapters.length) book = { id: id + "-book", title: str(r.book.title, 120) || title + " (textbook)", subject, chapters }; }
  return { id, title, subject, kind: r.kind === "elective" || r.kind === "replace" ? r.kind : "regular", grades: str(r.grades, 40) || undefined, course: str(r.course, 80) || undefined, book, lessons };
}

/* ---------------- the Markdown format (easiest to write by hand) ---------------- */
export function parseMarkdownPack(text: string): Pack {
  const head: Record<string, string> = {}, lessons: any[] = [], chapters: BookChapter[] = []; let bookTitle = "", mode: "head" | "book" | "lesson" = "head", L: any = null, listKey = "", ch: BookChapter | null = null, sec: BookSection | null = null; const buf: string[] = [];
  const flush = () => { if (sec) { sec.body = buf.join("\n").trim(); } buf.length = 0; };
  const stepOf = (s: string): ScriptStep | null => {
    let m = /^say(?:\[([^\]]*)\])?\s*:\s*(.+)$/i.exec(s); if (m) { const st: ScriptStep = { say: m[2] }; for (const tk of (m[1] ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)) { if (MOODS.includes(tk as Emotion)) st.mood = tk as Emotion; else if (GESTURES.includes(tk)) st.gesture = tk; } return st; }
    m = /^board(?:\[(left|right)\])?\s*(.*)$/i.exec(s); if (m) { const [t, ...rest] = m[2].split(":"); const lines = rest.join(":").split("|").map((x) => x.trim()).filter(Boolean); return lines.length ? { board: { side: (m[1] || "left").toLowerCase() as "left" | "right", title: t.trim(), lines } } : null; }
    if (/^ask\b/i.test(s)) return { ask: true }; m = /^read\s*:\s*(.+)$/i.exec(s); if (m) return { read: m[1] }; return { say: s };
  };
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd(), t = line.trim(); let m: RegExpExecArray | null;
    if ((m = /^@book\s*(.*)$/i.exec(t))) { flush(); mode = "book"; bookTitle = m[1]; ch = null; sec = null; continue; }
    if ((m = /^@lesson\s+(.+)$/i.exec(t))) { flush(); mode = "lesson"; L = { title: m[1], points: [], examples: [], whys: [], script: [], glossary: {} }; lessons.push(L); listKey = ""; continue; }
    if (mode === "head") { if ((m = /^([a-z]+)\s*:\s*(.*)$/i.exec(t))) head[m[1].toLowerCase()] = m[2]; continue; }
    if (mode === "book") {
      if ((m = /^##\s+(?:Chapter:\s*)?(.+)$/i.exec(t)) && !t.startsWith("###")) { flush(); ch = { id: slug(m[1]), title: m[1], sections: [] }; chapters.push(ch); sec = null; continue; }
      if ((m = /^###\s+(.+)$/.exec(t)) && ch) { flush(); sec = { heading: m[1], body: "" }; ch.sections.push(sec); continue; }
      if (ch && !sec && t) { sec = { heading: "Overview", body: "" }; ch.sections.push(sec); } if (sec) buf.push(line); continue;
    }
    if (!L || !t) continue;
    if ((m = /^(points|examples|whys|glossary|script|check)\s*:\s*(.*)$/i.exec(t))) { listKey = m[1].toLowerCase(); if (listKey === "check") { const c = /^(sort|order)\s+(.*)$/i.exec(m[2]); L.check = c ? { kind: c[1].toLowerCase(), prompt: c[2], groups: {}, items: [] } : undefined; } continue; }
    if ((m = /^(blurb|intro|wrap|homework|book|course)\s*:\s*(.+)$/i.exec(t))) { L[m[1].toLowerCase()] = m[2]; listKey = ""; continue; }
    if (t.startsWith("-") && listKey) {
      const item = t.replace(/^-\s*/, "");
      if (listKey === "glossary") { const g = item.split(":"); if (g.length > 1) L.glossary[g[0].trim()] = g.slice(1).join(":").trim(); }
      else if (listKey === "script") { const st = stepOf(item); if (st) L.script.push(st); }
      else if (listKey === "check" && L.check) { if (L.check.kind === "sort") { const g = item.split(":"); if (g.length > 1) L.check.groups[g[0].trim()] = g.slice(1).join(":").split("|").map((x: string) => x.trim()).filter(Boolean); } else L.check.items.push(item); }
      else if (Array.isArray(L[listKey])) L[listKey].push(item);
    }
  }
  flush();
  return cleanPack({ id: head.id || head.pack, title: head.title || head.pack, subject: (head.subject || "").toLowerCase(), kind: (head.kind || "regular").toLowerCase(), grades: head.grades, course: head.course, lessons, book: chapters.length ? { title: bookTitle || (head.title ?? "") + " (textbook)", chapters } : undefined });
}
export function parsePackText(text: string): Pack { const t = text.trim(); if (t.startsWith("{")) return cleanPack(JSON.parse(t)); return parseMarkdownPack(t); }

/* ---------------- the registry ---------------- */
const KEY = "unify.packs.v1";
const BASE: Record<Subject, LessonDef[]> = Object.fromEntries(SUBJECTS.map((s) => [s, CURRICULUM[s].slice()])) as any;
export const ELECTIVES: Record<Subject, LessonDef[]> = { math: [], ela: [], science: [], history: [], careers: [], life: [] };
export const BOOKS: Book[] = [];
let bundled: Pack[] = [], user: Pack[] = []; const listeners: (() => void)[] = [];
try { const j = JSON.parse(localStorage.getItem(KEY) ?? "[]"); if (Array.isArray(j)) user = j.map((p) => { try { return cleanPack(p); } catch { return null; } }).filter(Boolean) as Pack[]; } catch { /* none */ }

function toLesson(p: Pack, l: PackLesson): LessonDef {
  const id = `${p.id}.${l.id ?? slug(l.title)}`, points = l.points?.length ? l.points : [l.title], examples = l.examples?.length ? l.examples : points.slice(0, 2);
  if (l.check) SETS["pk-" + id] = (l.check.kind === "sort" ? { kind: "sort", prompt: l.check.prompt, groups: l.check.groups } : { kind: "order", prompt: l.check.prompt, items: l.check.items }) as Sort | Order;
  const course = l.course ?? p.course;
  return { id, subject: l.subject ?? p.subject, title: l.title, blurb: l.blurb || (course ? `${course} · ${p.title}` : p.title), points, examples, pics: [], videos: [],
    lab: l.check ? { id: "cardsort", cfg: "pk-" + id, title: "Check yourself", intro: l.check.prompt } : { id: "", title: "", intro: "" },
    intro: l.intro || `Today's lesson: ${l.title}.`, wrap: l.wrap || "Good work today. Read the textbook section to go deeper.", homework: l.homework || `Read the textbook section on ${l.title} and write down three things you learned.`,
    glossary: l.glossary ?? {}, whys: l.whys?.length ? l.whys : ["Understanding why it works makes it easier to remember."], script: l.script?.map((x) => cleanStep(x)).filter(Boolean) as ScriptStep[], bookRef: l.book,
    elective: p.kind === "elective" ? course || p.title : undefined, grades: p.grades, pack: p.id };
}
function apply() {
  for (const s of SUBJECTS) { CURRICULUM[s].length = 0; CURRICULUM[s].push(...BASE[s]); ELECTIVES[s].length = 0; } BOOKS.length = 0; const replaced = new Set<Subject>();
  for (const p of [...bundled, ...user]) {
    const ls = p.lessons.map((l) => toLesson(p, l));
    if (p.kind === "elective") { for (const l of ls) ELECTIVES[l.subject].push(l); }
    else if (p.kind === "replace") { if (!replaced.has(p.subject)) { CURRICULUM[p.subject].length = 0; replaced.add(p.subject); } CURRICULUM[p.subject].push(...ls); }
    else CURRICULUM[p.subject].push(...ls);
    if (p.book) BOOKS.push({ ...p.book, pack: p.id });
  }
  listeners.forEach((f) => f());
}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(user)); } catch { /* storage full or private mode */ } };
export const Packs = {
  all: () => [...bundled.map((p) => ({ pack: p, source: "bundled" as const })), ...user.map((p) => ({ pack: p, source: "imported" as const }))],
  /** import a pack from JSON or Markdown text; replaces an imported pack with the same id */
  add(text: string): Pack { const p = parsePackText(text); user = user.filter((x) => x.id !== p.id); user.push(p); persist(); apply(); return p; },
  remove(id: string) { user = user.filter((x) => x.id !== id); persist(); apply(); },
  onChange(f: () => void) { listeners.push(f); },
  /** packs that ship with the app: curriculum/index.json lists the files */
  async loadBundled(base = "curriculum/") {
    try { const idx = await (await fetch(base + "index.json", { cache: "no-cache" })).json(); const names: string[] = Array.isArray(idx?.packs) ? idx.packs : []; const got: Pack[] = [];
      for (const n of names) { try { const r = await fetch(base + n, { cache: "no-cache" }); got.push(parsePackText(await r.text())); } catch { /* skip a bad file */ } }
      bundled = got; apply(); } catch { /* no bundled packs (or offline) */ }
  },
};
apply();

/** a textbook for every class made from the lessons themselves, so the viewer is never empty */
export function notesBook(subject: Subject, name: string): Book {
  const ls = [...CURRICULUM[subject], ...ELECTIVES[subject]];
  return { id: "notes-" + subject, subject, title: `${name}: class notes`, chapters: ls.map((l) => ({ id: slug(l.id), title: l.title, sections: [
    { heading: "Key points", body: l.points.map((x) => "- " + x).join("\n") }, { heading: "Worked examples", body: l.examples.map((x) => "- " + x).join("\n") },
    ...(Object.keys(l.glossary).length ? [{ heading: "Words to know", body: Object.entries(l.glossary).map(([k, v]) => `- **${k}**: ${v}`).join("\n") }] : []),
    ...(l.whys.length ? [{ heading: "Why does it work this way?", body: l.whys.map((x) => "- " + x).join("\n") }] : []), { heading: "Homework", body: l.homework }] })) };
}
