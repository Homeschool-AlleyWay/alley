/** Scene clips for books: each short beat of the story (a line of dialogue or a bit of action) becomes a small animated scene using the same
 *  reenactment engine as the lesson videos. A book of 450 to 600 words yields 30 to 60 clips; the first frame of each clip is its illustration. */
import { drawVideo, videoLength, type VideoDef, type Shot, type ActorT, type PropT } from "../class3d/reenact";
import type { Book } from "./books";

export interface Beat { text: string; chapter: number; page: number; idx: number; quote: string | null; speaker: string | null }
const STOP = new Set("the a an and or but of to in on at for with from by as is was were be been it its he she they we you i his her their our your my me him them us this that these those so not no yes do did does had has have will would could should can may might shall must then than too very just also all any each more most some such only own same into over after before while when where which who whom what how why there here again once".split(" "));

/** split chapter text into sentences, keeping quoted speech together with who says it */
export function sentences(text: string): string[] {
  const out: string[] = []; for (const para of text.split(/\n\n+/)) { const m = para.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g); if (m) for (const s of m) { const t = s.trim(); if (t) out.push(t); } out.push("¶"); }
  return out.filter((s, i, a) => !(s === "¶" && (i === 0 || a[i - 1] === "¶")));
}

/** group sentences into beats of roughly `target` words (each is one clip) */
export function beatsOf(book: Book, target = 15): Beat[] {
  const beats: Beat[] = []; let idx = 0;
  book.chapters.forEach((ch, ci) => {
    let cur: string[] = [], n = 0; const flush = () => { if (!cur.length) return; const text = cur.join(" ").trim(), q = text.match(/["“]([^"”]+)["”]/); beats.push({ text, chapter: ci, page: 0, idx: idx++, quote: q ? q[1] : null, speaker: null }); cur = []; n = 0; };
    for (const s of sentences(ch.text)) { if (s === "¶") { if (n >= target * 0.6) flush(); continue; } cur.push(s); n += s.split(/\s+/).length; if (n >= target) flush(); }
    flush();
  });
  return beats;
}

const SETTINGS: [RegExp, string][] = [
  [/\b(ship|sea|sail|schooner|island|harbor|anchor|boat|pirate|bristol)\b/i, "harbor"], [/\b(night|moon|dark|midnight|dream|tomb|candle|stars?)\b/i, "night"],
  [/\b(emerald|queen|king|palace|court|throne|balcony|hall|castle|verona|doors?)\b/i, "hall"], [/\b(congress|senate|capitol|bill|vote|committee|constitution|law)\b/i, "capitol"],
  [/\b(judge|supreme|trial|court)\b/i, "court"], [/\b(garden|rose|flower|lettuce|radish|cabbage|gate|meadow|rabbit hole|plant|leaf|leaves|sunlight|chloroplast|photosynthesis)\b/i, "garden"],
  [/\b(cell|nucleus|vacuole|mitochondria|organelle|microscope|scientist|glucose|cork)\b/i, "lab"], [/\b(road|race|path|lane|walk|yellow brick|finish|prairie)\b/i, "road"],
  [/\b(street|square|village|town|market|inn|city)\b/i, "street"], [/\b(hill|woods|forest|mountain|field|grass|tree|cornfield)\b/i, "landscape"], [/\b(desert|sand)\b/i, "desert"],
];
const PROPS: [RegExp, string][] = [
  [/\btortoise\b/i, "tortoise"], [/\bhare\b/i, "hare"], [/\bship|schooner|hispaniola\b/i, "ship"], [/\b(sun|sunlight)\b/i, "sun"], [/\btrees?\b/i, "tree"], [/\bapple\b/i, "apple"],
  [/\b(heart|love)\b/i, "heart"], [/\bstars?\b/i, "star"], [/\b(cloud|storm|cyclone)\b/i, "cloud"], [/\brain|tears\b/i, "rain"], [/\bplant|leaf|leaves\b/i, "leaf"], [/\bwater|drop\b/i, "drop"],
  [/\bsugar|glucose\b/i, "sugar"], [/\bgavel|judge\b/i, "gavel"], [/\bflag\b/i, "flag"], [/\bbill\b/i, "bill"], [/\bvote|ballot\b/i, "ballotbox"], [/\bbook|map|scroll\b/i, "scroll"], [/\bcell\b/i, "cell"], [/\bscales|balance\b/i, "scales"],
];
export const placeOf = (text: string): string => { for (const [re, bg] of SETTINGS) if (re.test(text)) return bg; return "landscape"; };

/** which characters (by name) appear in this beat, and who speaks the quote */
export function castIn(book: Book, text: string): string[] {
  const names = Object.keys(book.cast).filter((n) => new RegExp(`\\b${n}s?\\b`, "i").test(text)); return names;
}
const hashStr = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

export function clipFor(book: Book, beat: Beat): VideoDef {
  const text = beat.text, bg = placeOf(text + " " + (book.chapters[beat.chapter]?.title ?? "")), present = castIn(book, text);
  const castNames = Object.keys(book.cast), lead = present[0] ?? castNames[hashStr(book.id + beat.idx) % castNames.length];
  const members = (present.length ? present : [lead]).slice(0, 3), dur = Math.max(4.2, Math.min(8, 2.6 + text.split(/\s+/).length * 0.22)), h = hashStr(book.id + beat.idx);
  // a quote is said by whoever is named just before it (else the first character in the beat)
  let speaker = members[0]; if (beat.quote) { const before = text.slice(0, text.indexOf(beat.quote)), named = members.filter((m) => new RegExp(`\\b${m}\\b`, "i").test(before)); speaker = named.length ? named[named.length - 1] : members[members.length > 1 ? members.length - 1 : 0]; if (new RegExp(`\\b${speaker}\\b[^.]*\\bsaid\\b`, "i").test(text) === false && members.length > 1) speaker = members[0]; }
  const actors: ActorT[] = members.map((m, i) => {
    const spread = members.length === 1 ? [320] : members.length === 2 ? [230, 410] : [170, 320, 470], x = spread[i], from = i % 2 ? 660 : -20, y = 268 + ((h + i * 7) % 4) * 8, talking = m === speaker && beat.quote;
    const say: [number, number, string][] = talking ? [[1.2, dur - 0.3, beat.quote!.slice(0, 80)]] : [];
    const act = /\b(ran|run|rushed|dashed|hurried|raced)\b/i.test(text) ? "carry" : /\b(pointed|showed|looked)\b/i.test(text) ? "point" : /\b(cried|shouted|cheer|laughed)\b/i.test(text) ? "cheer" : /\b(thought|wonder|whisper)\b/i.test(text) ? "think" : talking ? "talk" : "idle";
    return { role: book.cast[m], keys: [{ t: 0, x: from, y, pose: "carry" }, { t: 1.0, x, y, pose: act }, { t: dur, x: x + (i % 2 ? -10 : 10), y, pose: act }], say, s: 1 };
  });
  const props: PropT[] = []; for (const [re, kind] of PROPS) if (re.test(text) && props.length < 2) props.push({ kind, x: 90 + ((h >> 3) % 460), y: 205 + ((h >> 5) % 40), s: 1, t0: 0.4, t1: dur });
  const shot: Shot = { dur, bg, actors, props, cap: beat.quote ? `${beat.speaker ?? speaker}: "${beat.quote.slice(0, 90)}"` : text.slice(0, 110), zoom: [1, 1.1] };
  return { id: `${book.id}-${beat.idx}`, title: book.chapters[beat.chapter]?.title ?? book.title, subject: "ela", lesson: book.id, tag: "BOOK", shots: [shot] };
}

/** every clip for a book (cached): between 30 and 60 */
const cache = new Map<string, { beats: Beat[]; clips: VideoDef[] }>();
export function clipsFor(book: Book) {
  let hit = cache.get(book.id); if (hit) return hit;
  const words = book.chapters.reduce((n, c) => n + c.text.split(/\s+/).length, 0); let target = 15, beats = beatsOf(book, target);
  for (let k = 0; k < 8 && (beats.length < 30 || beats.length > 60); k++) { target = beats.length < 30 ? Math.max(6, target - 2) : target + 3; beats = beatsOf(book, target); }
  beats = beats.slice(0, 60); void words; hit = { beats, clips: beats.map((b) => clipFor(book, b)) }; cache.set(book.id, hit); return hit;
}
/** draw an illustration (the middle of a clip) onto a canvas */
export function drawIllustration(cv: HTMLCanvasElement, clip: VideoDef) { const c = cv.getContext("2d")!; drawVideo(c, cv.width, cv.height, clip, Math.min(videoLength(clip) - 0.01, 2.2), { captions: false }); }
export const keywords = (text: string) => text.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
