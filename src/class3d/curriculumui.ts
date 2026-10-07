/** Panels for curriculum packs: the Textbook viewer (read in depth), the Electives list, and the Curriculum packs manager (import / remove). They render inside #labHost. */
import { BOOKS, ELECTIVES, Packs, notesBook, type Book } from "./packs";
import { CURRICULUM, type LessonDef } from "./curriculum";
import { SUBJECT_NAME, Progress } from "../game/progress";
import type { Subject } from "../game/types";

const el = (tag: string, cls = "", parent?: HTMLElement, text = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e; };
let styled = false;
function css() {
  if (styled) return; styled = true; const s = document.createElement("style");
  s.textContent = `.bk{display:flex;gap:14px;flex:1;min-height:0}.bknav{width:230px;flex:none;overflow:auto;display:flex;flex-direction:column;gap:4px;padding-right:6px}.bkbody{flex:1;overflow:auto;background:#FFFDF8;border-radius:12px;padding:14px 20px;border:1px solid rgba(74,59,63,.15);font-size:16px;line-height:1.55}
.bkbody h3{font-size:19px;margin:14px 0 4px}.bkbody h3:first-child{margin-top:0}.bkbody p{margin:6px 0}.bkbody ul{margin:6px 0 6px 20px}.bkch{font:inherit;font-weight:600;text-align:left;background:none;border:0;padding:6px 4px;cursor:pointer;color:var(--ink)}.bkch.on{color:var(--acc)}
.bksec{font:inherit;font-size:14px;text-align:left;background:none;border:0;padding:3px 4px 3px 14px;cursor:pointer;color:var(--soft)}.bksec.on{color:var(--ink);font-weight:600}.bktools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.bktools select,.bktools input{font:inherit;font-size:15px;border-radius:9px;border:1px solid rgba(74,59,63,.3);padding:6px 8px;background:#fff;color:var(--ink);min-height:36px}
.bkhit{display:block;width:100%;text-align:left;font:inherit;background:#fff;border:1px solid rgba(74,59,63,.15);border-radius:10px;padding:8px 10px;margin:6px 0;cursor:pointer;color:var(--ink)}.bkhit small{display:block;color:var(--soft)}
.pkrow{display:flex;gap:10px;align-items:center;justify-content:space-between;background:#FFF9F0;border-radius:10px;padding:8px 12px;border:1px solid rgba(74,59,63,.15)}.pkrow small{color:var(--soft);display:block}.pkta{width:100%;min-height:110px;font:13px ui-monospace,Menlo,monospace;border-radius:10px;border:1px solid rgba(74,59,63,.3);padding:8px;box-sizing:border-box}
@media(max-width:700px){.bk{flex-direction:column}.bknav{width:auto;max-height:34%}}`; document.head.appendChild(s);
}
function shell(host: HTMLElement, title: string, onClose: () => void) {
  css(); host.innerHTML = ""; host.classList.add("show"); const panel = el("div", "lpanel", host), head = el("div", "lhead", panel); el("h2", "", head, title);
  const close = () => { host.classList.remove("show"); host.innerHTML = ""; onClose(); }; const b = el("button", "lbtn", head, "Close"); b.onclick = close; return { panel, close };
}
/** tiny safe markup: paragraphs, "- " bullet lists and **bold**; everything is text, never HTML */
export function renderBody(parent: HTMLElement, text: string) {
  let ul: HTMLElement | null = null; const inline = (p: HTMLElement, s: string) => { s.split(/(\*\*[^*]+\*\*)/).forEach((part) => { if (part.startsWith("**") && part.endsWith("**")) el("b", "", p, part.slice(2, -2)); else if (part) p.appendChild(document.createTextNode(part)); }); };
  for (const line of text.split("\n")) { const t = line.trim(); if (!t) { ul = null; continue; } if (t.startsWith("- ")) { ul ??= el("ul", "", parent); inline(el("li", "", ul), t.slice(2)); } else { ul = null; inline(el("p", "", parent), t); } }
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function allBooks(subject: Subject): Book[] {
  const mine = [notesBook(subject, SUBJECT_NAME[subject]), ...BOOKS.filter((b) => !b.subject || b.subject === subject)];
  const others = [...BOOKS.filter((b) => b.subject && b.subject !== subject), ...(["math", "ela", "science", "history", "careers", "life"] as Subject[]).filter((s) => s !== subject).map((s) => notesBook(s, SUBJECT_NAME[s]))];
  return [...mine, ...others];
}
/** find "Chapter/Section" (or just a chapter) in the books */
function resolve(books: Book[], ref: string): { b: number; c: number; s: number } | null {
  const [cr, sr] = ref.split("/").map((x) => norm(x)); if (!cr) return null;
  for (let b = 0; b < books.length; b++) for (let c = 0; c < books[b].chapters.length; c++) { const ch = books[b].chapters[c]; if (norm(ch.title).includes(cr) || cr.includes(norm(ch.title))) { const s = sr ? ch.sections.findIndex((x) => norm(x.heading).includes(sr)) : 0; return { b, c, s: Math.max(0, s) }; } }
  return null;
}

/** the Textbook: every class has class notes made from its lessons; imported packs add full chapters. `ref` opens a chapter or "Chapter/Section". */
export function openTextbook(host: HTMLElement, o: { subject: Subject; lesson?: LessonDef; ref?: string; onClose: () => void }) {
  const books = allBooks(o.subject), { panel } = shell(host, "Textbook", o.onClose);
  let at = resolve(books, o.ref ?? o.lesson?.bookRef ?? "") ?? (o.lesson ? resolve(books.slice(0, 1), o.lesson.title) : null) ?? { b: 0, c: 0, s: 0 };
  const tools = el("div", "bktools", panel), sel = el("select", "", tools) as HTMLSelectElement, q = el("input", "", tools) as HTMLInputElement; q.type = "search"; q.placeholder = "Search the textbook"; q.setAttribute("aria-label", "Search the textbook");
  books.forEach((b, i) => { const op = el("option", "", sel, b.title); op.setAttribute("value", String(i)); }); sel.value = String(at.b);
  const wrap = el("div", "bk", panel), nav = el("div", "bknav", wrap), body = el("div", "bkbody", wrap);
  function show() {
    nav.innerHTML = ""; body.innerHTML = ""; const bk = books[at.b], term = q.value.trim().toLowerCase();
    if (term) { let n = 0; books.forEach((b, bi) => b.chapters.forEach((c, ci) => c.sections.forEach((s, si) => { if (`${c.title} ${s.heading} ${s.body}`.toLowerCase().includes(term) && n < 40) { n++; const h = el("button", "bkhit", body); el("b", "", h, s.heading || c.title); el("small", "", h, `${b.title} · ${c.title}`); h.onclick = () => { at = { b: bi, c: ci, s: si }; q.value = ""; sel.value = String(bi); show(); }; } }))); if (!n) el("p", "", body, "Nothing found. Try another word."); return; }
    bk.chapters.forEach((c, ci) => { const b = el("button", "bkch" + (ci === at.c ? " on" : ""), nav, c.title); b.onclick = () => { at = { b: at.b, c: ci, s: 0 }; show(); };
      if (ci === at.c) c.sections.forEach((s, si) => { const sb = el("button", "bksec" + (si === at.s ? " on" : ""), nav, s.heading || "Section"); sb.onclick = () => { at.s = si; show(); }; }); });
    const ch = bk.chapters[at.c]; if (!ch) { el("p", "", body, "This book is empty."); return; } el("h3", "", body, ch.title);
    ch.sections.forEach((s, si) => { const sec = el("div", "", body); if (s.heading) el("h3", "", sec, s.heading); renderBody(sec, s.body); if (si === at.s) setTimeout(() => sec.scrollIntoView({ block: "start" }), 0); });
  }
  sel.onchange = () => { at = { b: Number(sel.value), c: 0, s: 0 }; show(); }; q.oninput = show; show();
}

/** Electives: extra courses (such as high-school electives) from curriculum packs; they sit beside regular classes and never change your lesson number. */
export function openElectives(host: HTMLElement, o: { subject: Subject; onPick: (l: LessonDef) => void; onClose: () => void }) {
  const { panel, close } = shell(host, "Electives", o.onClose); el("p", "lintro", panel, "Extra courses you can take any time, in addition to your regular classes. Pick one and the teacher will start the lesson.");
  const subs = (["math", "ela", "science", "history", "careers", "life"] as Subject[]).sort((a, b) => (a === o.subject ? -1 : b === o.subject ? 1 : 0)); let any = false;
  for (const s of subs) { const ls = ELECTIVES[s]; if (!ls.length) continue; any = true; el("h3", "", panel, SUBJECT_NAME[s] + (s === o.subject ? " (this room)" : ""));
    const done = new Set(Progress.extraDone(s)); const courses = [...new Set(ls.map((l) => l.elective ?? "Elective"))];
    for (const c of courses) { el("b", "", panel, c); for (const l of ls.filter((x) => (x.elective ?? "Elective") === c)) { const b = el("button", "lbtn", panel, `${done.has(l.id) ? "✓ " : ""}${l.title}${l.grades ? ` · grades ${l.grades}` : ""}`); b.style.textAlign = "left"; b.onclick = () => { close(); o.onPick(l); }; } } }
  if (!any) el("p", "", panel, "No electives installed yet. Open More, then Curriculum packs to add some.");
}

/** Curriculum packs: list, import a file (.json or .md) or pasted text, remove imported packs */
export function openPacks(host: HTMLElement, o: { onClose: () => void }) {
  const { panel } = shell(host, "Curriculum packs", o.onClose); el("p", "lintro", panel, "A pack brings in lessons, a script for the teacher and a textbook. Import a .json or .md file, or paste it below. Packs stay on this device. See curriculum/README.md for the format.");
  const list = el("div", "lcol", panel), msg = el("p", "lmsg", panel);
  const paint = () => { list.innerHTML = ""; for (const { pack: p, source } of Packs.all()) { const r = el("div", "pkrow", list), t = el("div", "", r); el("b", "", t, p.title); el("small", "", t, `${SUBJECT_NAME[p.subject]} · ${p.kind === "elective" ? "electives" : p.kind === "replace" ? "replaces built-in lessons" : "added lessons"} · ${p.lessons.length} lessons${p.book ? ` · textbook (${p.book.chapters.length} chapters)` : ""} · ${source}`);
    if (source === "imported") { const b = el("button", "lbtn", r, "Remove"); b.onclick = () => { Packs.remove(p.id); paint(); }; } } if (!Packs.all().length) el("p", "", list, "No packs yet."); };
  const add = (text: string) => { try { const p = Packs.add(text); msg.textContent = `Added "${p.title}": ${p.lessons.length} lessons${p.book ? " and a textbook" : ""}.`; ta.value = ""; paint(); } catch (e) { msg.textContent = "Could not read that pack: " + (e as Error).message; } };
  const row = el("div", "bktools", panel), fb = el("button", "lbtn", row, "Import file…"), file = el("input", "", row) as HTMLInputElement; file.type = "file"; file.accept = ".json,.md,.txt,text/markdown,application/json"; file.multiple = true; file.hidden = true;
  fb.onclick = () => file.click(); file.onchange = async () => { for (const f of Array.from(file.files ?? [])) add(await f.text()); file.value = ""; };
  const ta = el("textarea", "pkta", panel) as HTMLTextAreaElement; ta.placeholder = "…or paste a pack here (JSON or Markdown)"; const ab = el("button", "lbtn", panel, "Add pasted pack"); ab.style.alignSelf = "flex-start"; ab.onclick = () => { if (ta.value.trim()) add(ta.value); };
  void CURRICULUM; paint();
}
