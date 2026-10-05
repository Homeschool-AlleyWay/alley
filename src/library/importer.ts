/** Turns free book text (Project Gutenberg and similar) into a Book the reader can show: chapters, a gist, a mood and a cast with costumes. */
import type { Book, Chapter } from "./books";
import { moodOf } from "./music";
const ROLE_CYCLE = ["kid", "kid2", "citizen", "senator", "trumpeter", "painter", "scientist", "merchant"];
const NOT_NAMES = new Set("The A An And But He She It They We You I His Her Their Our Your My In On At For With From By As Is Was Were Be Then When Where What Who How Why There Here If So Not No Yes Chapter Project Gutenberg Mr Mrs Miss Dr".split(" "));
export function importBook(id: string, title: string, raw: string): Book {
  const text = raw.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n"); const parts = text.split(/\n\s*(?:CHAPTER|Chapter)\s+[IVXLC0-9]+[^\n]*\n/g).filter((p) => p.trim().length > 200);
  let pieces: string[] = parts.length >= 2 ? parts : []; if (!pieces.length) { const words = text.split(/\s+/); for (let i = 0; i < words.length && pieces.length < 6; i += 420) pieces.push(words.slice(i, i + 420).join(" ")); }
  pieces = pieces.slice(0, 6).map((p) => { const w = p.trim().split(/\s+/); return w.slice(0, 420).join(" ").replace(/\n\n+/g, "\n\n"); });
  const names = new Map<string, number>(); for (const m of text.slice(0, 60000).matchAll(/(?<![.!?]\s)(?<!^)\b([A-Z][a-z]{2,})\b/g)) if (!NOT_NAMES.has(m[1])) names.set(m[1], (names.get(m[1]) || 0) + 1);
  const cast: Record<string, string> = {}; [...names.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([n], i) => { cast[n] = ROLE_CYCLE[i % ROLE_CYCLE.length]; }); if (!Object.keys(cast).length) cast.Narrator = "narrator";
  const chapters: Chapter[] = pieces.map((p, i) => { const first = (p.match(/[^.!?]+[.!?]/) || [p.slice(0, 80)])[0].trim(); return { title: `Chapter ${i + 1}`, gist: first.slice(0, 120), mood: moodOf(p, "calm"), text: p }; });
  return { id: `gb-${id}`, title, author: "Free public-domain text", bands: ["g68", "hs"], subjects: ["ela"], kind: "story", mood: chapters[0]?.mood ?? "calm", blurb: "Imported from a free public-domain text and retold into short illustrated pages.", cover: ["#8173AE", "#EDE2CF"], sourceId: "archive", cast, chapters };
}
