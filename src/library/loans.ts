/** Checkouts: four hours of open access, then the book goes blank until it is checked out again with a short quiz on what was last read. */
export const LOAN_MS = (() => { try { const s = new URLSearchParams(location.search).get("loanSeconds"); return s ? Math.max(5, +s) * 1000 : 4 * 3600 * 1000; } catch { return 4 * 3600 * 1000; } })();
export const PREVIEW_PAGES = 4;
export interface Loan { bookId: string; start: number; until: number; active: boolean; page: number; sent: number; frontier: number; level: 1 | 2 | 3; maxPage: number; scores: number[]; checkouts: number; finished: boolean; readSecs: number }
const KEY = "unify.library.v1";
interface Store { loans: Record<string, Loan>; notes: string[]; music: boolean; vol: number }
let S: Store = { loans: {}, notes: [], music: true, vol: 0.6 }; const listeners = new Set<() => void>();
try { const j = JSON.parse(localStorage.getItem(KEY) || "null"); if (j) S = { ...S, ...j }; } catch { /* fresh */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* ignore */ } listeners.forEach((f) => f()); };
try { addEventListener("storage", (e) => { if (e.key === KEY) { try { S = { ...S, ...JSON.parse(e.newValue || "{}") }; } catch { /* ignore */ } listeners.forEach((f) => f()); } }); } catch { /* not a window */ }
export const Library = {
  onChange(f: () => void) { listeners.add(f); return () => listeners.delete(f); },
  get loans() { return Object.values(S.loans); },
  get(bookId: string): Loan { return S.loans[bookId] ?? (S.loans[bookId] = { bookId, start: 0, until: 0, active: false, page: 0, sent: 0, frontier: 0, level: 2, maxPage: 0, scores: [], checkouts: 0, finished: false, readSecs: 0 }); },
  peek(bookId: string) { return S.loans[bookId]; },
  /** is the book open to read right now? */
  open(bookId: string) { const l = S.loans[bookId]; return !!l && l.active && Date.now() < l.until; },
  expired(bookId: string) { const l = S.loans[bookId]; return !!l && l.checkouts > 0 && !(l.active && Date.now() < l.until); },
  timeLeft(bookId: string) { const l = S.loans[bookId]; return l && l.active ? Math.max(0, l.until - Date.now()) : 0; },
  checkout(bookId: string) { const l = Library.get(bookId); l.start = Date.now(); l.until = l.start + LOAN_MS; l.active = true; l.checkouts++; save(); return l; },
  expire(bookId: string) { const l = S.loans[bookId]; if (l) { l.active = false; save(); } },
  update(bookId: string, f: (l: Loan) => void) { const l = Library.get(bookId); f(l); save(); },
  get notes() { return S.notes; }, addNote(t: string) { S.notes.push(t.slice(0, 400)); if (S.notes.length > 100) S.notes.shift(); save(); },
  get music() { return S.music; }, setMusic(on: boolean) { S.music = on; save(); }, get vol() { return S.vol; }, setVol(v: number) { S.vol = v; save(); },
  reset() { S = { loans: {}, notes: [], music: true, vol: 0.6 }; save(); },
};
export const fmtLeft = (ms: number) => { const m = Math.ceil(ms / 60000), h = Math.floor(m / 60); return ms < 60000 ? `${Math.ceil(ms / 1000)}s left` : h ? `${h}h ${m % 60}m left` : `${m}m left`; };
