/** Questions generated from what was actually read: who, where, what the chapter is about, a missing word and what happened first. */
import { BOOKS, type Book } from "./books";
import { beatsOf, castIn, keywords, placeOf, sentences } from "./clips";
export interface Question { q: string; options: string[]; answer: number; kind: "who" | "where" | "idea" | "word" | "order"; why: string }
const PLACE_LABEL: Record<string, string> = { harbor: "at sea and in the harbor", night: "in the dark of night", hall: "in a grand hall or palace", capitol: "at the Capitol", court: "in a court of law", garden: "in a garden or meadow", lab: "in a science lab", road: "on a road", street: "in a village street", landscape: "in the hills and woods", desert: "in the desert" };
const rs = <T,>(a: T[], seed: number) => { const o = [...a]; let s = seed || 1; for (let i = o.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [o[i], o[j]] = [o[j], o[i]]; } return o; };
const place = (opts: string[], correct: string, seed: number) => { const o = rs(opts, seed), i = o.indexOf(correct); return { options: o, answer: i }; };
const uniq = <T,>(a: T[]) => [...new Set(a)];
const allNames = () => uniq(BOOKS.flatMap((b) => Object.keys(b.cast)));
const allGists = (not: string) => BOOKS.flatMap((b) => b.chapters.map((c) => c.gist)).filter((g) => g !== not);

/** up to `n` questions about the chapters in `chapters` (indexes), optionally only the text up to a sentence limit */
export function questionsFor(book: Book, chapters: number[], n = 5, seed = 7): Question[] {
  const out: Question[] = [], tryAdd = (q: Question | null) => { if (q && out.length < n && !out.some((x) => x.q === q.q)) out.push(q); };
  const texts = chapters.map((i) => book.chapters[i]).filter(Boolean), joined = texts.map((c) => c.text).join("\n\n");
  // who: a character that appears
  const counts = Object.keys(book.cast).map((nm) => ({ nm, n: (joined.match(new RegExp(`\\b${nm}s?\\b`, "gi")) || []).length })).sort((a, b) => b.n - a.n);
  if (counts[0]?.n) { const right = counts[0].nm, wrong = rs(allNames().filter((x) => !counts.find((c) => c.nm === x && c.n > 0)), seed).slice(0, 3); if (wrong.length >= 2) { const p = place([right, ...wrong], right, seed); tryAdd({ q: book.kind === "story" ? "Which character is most important in this part of the book?" : "Which idea or person is mentioned most in this part?", options: p.options, answer: p.answer, kind: "who", why: `${right} appears again and again in these pages.` }); } }
  // where
  const bg = placeOf(joined + " " + texts.map((c) => c.title).join(" ")), right = PLACE_LABEL[bg] ?? "in the hills and woods";
  if (book.kind === "story") { const wrong = rs(Object.values(PLACE_LABEL).filter((x) => x !== right), seed + 1).slice(0, 3), p = place([right, ...wrong], right, seed + 2); tryAdd({ q: "Where does most of this part take place?", options: p.options, answer: p.answer, kind: "where", why: `The setting of these pages is ${right}.` }); }
  // idea
  const gist = texts[texts.length - 1]?.gist; if (gist) { const wrong = rs(allGists(gist), seed + 3).slice(0, 3), p = place([gist, ...wrong], gist, seed + 4); tryAdd({ q: book.kind === "story" ? "What is this part mainly about?" : "What is the main idea of this part?", options: p.options, answer: p.answer, kind: "idea", why: gist }); }
  // missing word
  const sents = texts.flatMap((c) => sentences(c.text).filter((s) => s.length > 40 && s.length < 150 && s !== "¶")); if (sents.length) {
    const s = sents[Math.floor(seed * 3.7) % sents.length], words = keywords(s).filter((w) => w.length > 4); if (words.length) {
      const w = words[Math.floor(seed * 1.9) % words.length], pool = uniq(keywords(joined).filter((x) => x !== w && x.length >= 4 && Math.abs(x.length - w.length) <= 3)), wrong = rs(pool, seed + 5).slice(0, 3);
      if (wrong.length >= 3) { const p = place([w, ...wrong], w, seed + 6); tryAdd({ q: `Fill in the missing word: "${s.replace(new RegExp(`\\b${w}\\b`, "i"), "_____").slice(0, 140)}"`, options: p.options, answer: p.answer, kind: "word", why: `The sentence reads: "${s.slice(0, 140)}"` }); }
    }
  }
  // order: which of two events came first
  const bs = beatsOf({ ...book, chapters: texts }, 12).filter((b) => b.text.length > 25 && b.text.length < 120); if (bs.length >= 4) {
    const a = bs[1], b = bs[bs.length - 2], flip = seed % 2 === 0, o = flip ? [b.text, a.text] : [a.text, b.text]; tryAdd({ q: "Which of these happened first in this part?", options: o, answer: flip ? 1 : 0, kind: "order", why: `"${a.text.slice(0, 100)}" came before "${b.text.slice(0, 100)}".` });
  }
  void castIn; return out.slice(0, n);
}
