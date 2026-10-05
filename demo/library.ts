import { BOOKS, SOURCES, type Book, type Band } from "../src/library/books";
import { Reader } from "../src/library/reader";
import { Library, fmtLeft } from "../src/library/loans";
import { importBook } from "../src/library/importer";
import { StudyGroup } from "../src/library/group";
import { Schedule, SUBJ, SUBJ_NAME, type Subj } from "../src/academy/schedule";
import { Social } from "../src/hall3d/social";
import { clipsFor } from "../src/library/clips";

const $ = (id: string) => document.getElementById(id)!;
function el<K extends keyof HTMLElementTagNameMap>(t: K, c = "", p?: HTMLElement, x?: string) { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; p?.appendChild(e); return e; }
const btn = (p: HTMLElement, t: string, f: () => void, c = "bt") => { const b = el("button", c, p, t); b.type = "button"; b.onclick = f; return b; };
const view = $("view"), reader = new Reader(document.body); (window as any).__reader = reader; (window as any).__lib = Library;
const userBand = (): Band => { const a = Social.profile.avatar?.age; return a === "k2" || a === "g35" || a === "g68" || a === "hs" ? a : "g68"; };
(() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d")!, d = x.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = 226 + Math.random() * 29; d.data[i] = v; d.data[i + 1] = v * 0.965; d.data[i + 2] = v * 0.9; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); $("paper").style.backgroundImage = `url(${c.toDataURL()})`; })();

/* ---- imported books (from the free text server) are kept so loans and bookmarks keep working ---- */
const IMP = "unify.library.imported.v1"; let imported: Book[] = []; try { imported = JSON.parse(localStorage.getItem(IMP) || "[]"); } catch { /* none */ }
const allBooks = () => [...BOOKS, ...imported];
const addImported = (b: Book) => { if (!imported.some((x) => x.id === b.id)) { imported.push(b); try { localStorage.setItem(IMP, JSON.stringify(imported)); } catch { /* full */ } } };
const COLORS: Record<string, string> = { math: "Math", ela: "ELA", science: "Science", history: "History" };

function openBook(b: Book, checkout = false) { if (checkout && !Library.open(b.id) && !Library.expired(b.id)) Library.checkout(b.id); reader.open(b); }
reader.onClose = () => show(cur);

/* ---------------------------------------------------------------- stacks */
let q = "", fBand: Band | "all" = "all", fSubj: Subj | "all" = "all", fKind: "all" | "story" | "nonfiction" = "all";
function stacks() {
  view.innerHTML = ""; const bar = el("div", "bar", view);
  const s = el("input", "fld", bar) as HTMLInputElement; s.type = "search"; s.placeholder = "Look up a book, author or subject"; s.value = q; s.setAttribute("aria-label", "Look up a book"); s.oninput = () => { q = s.value; renderShelf(); };
  const sel = (label: string, opts: [string, string][], val: string, on: (v: string) => void) => { const w = el("label", "muted", bar, label + " "); const e = el("select", "fld", w) as HTMLSelectElement; e.style.minWidth = "0"; opts.forEach(([v, t]) => { const o = el("option", "", e, t); o.value = v; }); e.value = val; e.onchange = () => on(e.value); };
  sel("Level", [["all", "All levels"], ["k2", "K-2"], ["g35", "Grades 3-5"], ["g68", "Grades 6-8"], ["hs", "High school"]], fBand, (v) => { fBand = v as any; renderShelf(); });
  sel("Subject", [["all", "All subjects"], ...SUBJ.map((x) => [x, SUBJ_NAME[x]] as [string, string])], fSubj, (v) => { fSubj = v as any; renderShelf(); });
  sel("Kind", [["all", "Stories and nonfiction"], ["story", "Stories"], ["nonfiction", "Nonfiction"]], fKind, (v) => { fKind = v as any; renderShelf(); });
  btn(bar, "Search the web library (Alleyway)", () => { show("zone"); }, "bt");
  const sug = el("div", "sec", view); const shelf = el("div", "sec", view); const online = el("div", "sec", view); const src = el("div", "sec", view);
  function suggestions() {
    sug.innerHTML = ""; const subs = Schedule.day.signups.map((x) => x.subject), mine = [...new Set(subs)]; const band = userBand();
    const pick = allBooks().filter((b) => b.bands.includes(band) && (mine.length ? b.subjects.some((x) => mine.includes(x)) : true)).slice(0, 4); if (!pick.length) return;
    el("h2", "", sug, mine.length ? `Suggested for today's classes: ${mine.map((x) => SUBJ_NAME[x]).join(", ")}` : "Suggested for you"); el("small", "", sug, "Good for homework and for going deeper after class."); const g = el("div", "shelf", sug); pick.forEach((b) => card(g, b));
  }
  function renderShelf() {
    shelf.innerHTML = ""; el("h2", "", shelf, "The stacks"); const g = el("div", "shelf", shelf), t = q.toLowerCase().trim();
    const list = allBooks().filter((b) => (fBand === "all" || b.bands.includes(fBand)) && (fSubj === "all" || b.subjects.includes(fSubj)) && (fKind === "all" || b.kind === fKind) && (!t || (b.title + " " + b.author + " " + b.blurb + " " + b.subjects.join(" ")).toLowerCase().includes(t)));
    if (!list.length) el("p", "muted", g, "Nothing on these shelves matches. Try the web library below."); list.forEach((b) => card(g, b));
    online.innerHTML = ""; if (t.length > 2) { el("h2", "", online, `More books for "${q}"`); const o = el("div", "", online); btn(o, "Look it up in free libraries", () => lookup(q, o), "bt pri"); }
  }
  async function lookup(text: string, host: HTMLElement) {
    host.innerHTML = "Looking..."; try { const j = await (await fetch(`/api/search?tab=books&q=${encodeURIComponent(text)}`)).json(); host.innerHTML = ""; if (j.blocked) { el("div", "notice warn", host, j.message); return; }
      (j.results || []).forEach((r: any) => { const row = el("div", "res", host); const a = el("a", "t", row, r.title) as HTMLAnchorElement; a.href = r.url; a.target = "_blank"; a.rel = "noopener noreferrer"; el("div", "u", row, `${r.source}`); el("div", "sn", row, r.snippet);
        if (r.gutenberg) btn(row, "Read it here (retold into pages)", async () => { try { const d = await (await fetch(`/api/book?id=${r.gutenberg}`)).json(); const bk = importBook(String(r.gutenberg), r.title || d.title, d.text); addImported(bk); openBook(bk); } catch { el("div", "notice warn", row, "That text could not be loaded right now. Try the link instead."); } }, "bt pri"); });
      if (!(j.results || []).length) host.textContent = "No books came back. Try different words."; } catch { host.textContent = "The web library is not reachable from here. The stacks above still work."; }
  }
  function sources() {
    src.innerHTML = ""; el("h2", "", src, "Free online libraries"); el("small", "", src, "Some sites mostly offer older classics. Library apps are more likely to have newer books. For younger readers, preview titles and read together when you can.");
    const groups: [string, (s: (typeof SOURCES)[0]) => boolean][] = [["For elementary readers", (s) => s.bands !== "all" && s.bands.includes("k2")], ["For middle and high school", (s) => s.bands !== "all" && s.bands.includes("hs")], ["For all ages", (s) => s.bands === "all"]];
    for (const [t, f] of groups) { el("h2", "", src, t).style.fontSize = "15px"; const g = el("div", "src", src); SOURCES.filter(f).forEach((s) => { const a = el("a", "", g) as HTMLAnchorElement; a.href = s.url; a.target = "_blank"; a.rel = "noopener noreferrer"; el("b", "", a, s.name); el("span", "", a, s.note + (s.account ? ` (${s.account})` : "")); }); }
  }
  suggestions(); renderShelf(); sources();
}
function card(host: HTMLElement, b: Book) {
  const c = el("div", "bk", host), cv = el("div", "cv", c, b.title); cv.style.background = `linear-gradient(135deg,${b.cover[0]},${b.cover[1]})`; const bd = el("div", "bd", c); el("div", "au", bd, b.author);
  const tags = el("div", "", bd); b.subjects.forEach((s) => el("span", "pill", tags, COLORS[s])); el("span", "pill g", tags, b.kind === "story" ? "Story" : "Nonfiction"); const bands = b.bands.map((x) => ({ k2: "K-2", g35: "3-5", g68: "6-8", hs: "HS" } as any)[x]).join(", "); el("div", "au", bd, `Levels: ${bands}  ·  ${clipsFor(b).clips.length} scenes`);
  el("div", "", bd, b.blurb).style.fontSize = "12px"; const l = Library.peek(b.id), st = Library.open(b.id) ? `Checked out: ${fmtLeft(Library.timeLeft(b.id))}` : l?.checkouts ? "Loan ended: check out again" : l?.maxPage ? "Started" : ""; if (st) el("span", "pill r", bd, st);
  const row = el("div", "row", bd); btn(row, l?.maxPage ? "Continue" : "Read", () => openBook(b), "bt pri"); btn(row, Library.open(b.id) ? "Checked out" : "Check out", () => { openBook(b, true); }, "bt").disabled = Library.open(b.id);
}

/* ---------------------------------------------------------------- study zone: computers with Alleyway (education-only search) */
const ALLOW = ["wikipedia.org", "wikisource.org", "wikibooks.org", "wikimedia.org", "openstax.org", "ck12.org", "khanacademy.org", "nasa.gov", "si.edu", "loc.gov", "archive.org", "gutenberg.org", "openlibrary.org", "standardebooks.org", "pbs.org", "pbslearningmedia.org", "pbskids.org", "studentreportinglabs.org", "dogonews.com", "cnn.com", "storylineonline.net", "oxfordowl.co.uk", "uniteforliteracy.com", "bookspring.org", "africanstorybook.org", "overdrive.com", "manybooks.net", "kids.nationalgeographic.com", "kids.britannica.com", "nps.gov", "noaa.gov", "usa.gov", "congress.gov", "archives.gov", "mathsisfun.com", "edu", "gov", "k12.us"];
const hostOk = (u: string) => { try { const h = new URL(u).hostname.replace(/^www\./, ""); return ALLOW.some((d) => h === d || h.endsWith("." + d)); } catch { return false; } };
const FALLBACK_SITES: [string, string, string][] = [["OpenStax", "Free textbooks", "https://openstax.org/"], ["CK-12", "Free digital lessons", "https://www.ck12.org/"], ["Khan Academy", "Lessons and practice", "https://www.khanacademy.org/"], ["NASA", "Space and Earth science", "https://www.nasa.gov/"], ["Library of Congress", "Primary sources", "https://www.loc.gov/"], ["Smithsonian", "Collections and learning", "https://www.si.edu/"]];
function zone() {
  view.innerHTML = ""; el("h2", "", view, "Study zone"); el("p", "muted", view, "Pick a computer. Alleyway is a search made for school: it only shows educational and research sites, so you can find sources for homework and projects.");
  const lab = el("div", "lab", view); for (let i = 1; i <= 6; i++) { const b = el("button", "pc", lab); b.type = "button"; el("div", "scr", b); el("div", "", b, `Computer ${i}`); b.onclick = () => alleyway(i); }
  const hint = el("div", "sec", view); el("small", "", hint, "Your saved sources and notes are in My loans and notes. Send a source to your study group from the results.");
}
let awTab: "all" | "articles" | "books" = "all";
function alleyway(pc: number) {
  view.innerHTML = ""; const win = el("div", "aw", view), bar = el("div", "bar2", win); const logo = el("span", "logo", bar); logo.innerHTML = "Alley<i>way</i>"; const f = el("input", "fld", bar) as HTMLInputElement; f.type = "search"; f.placeholder = "Search for a topic, person, place or question"; f.style.flex = "1"; f.setAttribute("aria-label", "Alleyway search");
  const go = btn(bar, "Search", () => run(), "bt pri"); const tabs = el("div", "tabs2", bar); (["all", "articles", "books"] as const).forEach((t) => { const b = el("button", t === awTab ? "on" : "", tabs, t === "all" ? "All" : t === "articles" ? "Articles" : "Books"); b.type = "button"; b.onclick = () => { awTab = t; tabs.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); if (f.value) run(); }; });
  btn(bar, `Log off computer ${pc}`, () => zone(), "bt"); const body = el("div", "body", win); el("div", "notice", body, "Educational and research sites only. Results come from encyclopedias, free libraries, museums and school resources.");
  const out = el("div", "", body);
  async function run() {
    const text = f.value.trim(); if (!text) return; out.innerHTML = "Searching..."; go.disabled = true;
    try { const j = await (await fetch(`/api/search?tab=${awTab}&q=${encodeURIComponent(text)}`)).json(); out.innerHTML = ""; if (j.blocked) { el("div", "notice warn", out, j.message); return; }
      const rs = (j.results || []).filter((r: any) => hostOk(r.url)); if (!rs.length) el("p", "muted", out, "No results from the live sources. Try the school sites below.");
      rs.forEach((r: any) => result(out, r)); if ((j.sites || []).length) { el("h2", "", out, "More on trusted school sites").style.fontSize = "15px"; (j.sites as any[]).forEach((s) => result(out, { title: s.name, snippet: s.why, url: s.url, source: new URL(s.url).hostname.replace(/^www\./, "") })); }
    } catch { out.innerHTML = ""; el("div", "notice", out, "The live search is offline right now. Here are trusted school sites:"); FALLBACK_SITES.forEach(([n, w, u]) => result(out, { title: n, snippet: w, url: u, source: new URL(u).hostname })); } finally { go.disabled = false; }
  }
  f.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); }); f.focus();
}
function result(host: HTMLElement, r: { title: string; snippet: string; url: string; source: string }) {
  const row = el("div", "res", host), a = el("a", "t", row, r.title) as HTMLAnchorElement; if (hostOk(r.url)) { a.href = r.url; a.target = "_blank"; a.rel = "noopener noreferrer"; } else { a.removeAttribute("href"); }
  el("div", "u", row, `${r.source}  ·  ${hostOk(r.url) ? r.url : "blocked: not an educational site"}`); el("div", "sn", row, r.snippet); const act = el("div", "row", row); act.style.cssText = "display:flex;gap:6px;flex-wrap:wrap";
  const cite = `${r.title}. ${r.source}. ${r.url}. Accessed ${new Date().toDateString()}.`;
  btn(act, "Save source to notes", () => { Library.addNote("Source: " + cite); flash(act, "Saved"); }); btn(act, "Send to study group", () => { try { const k = "unify.group.inbox.v1", arr = JSON.parse(localStorage.getItem(k) || "[]"); arr.push({ t: Date.now(), text: `Shared source: ${r.title} (${r.source}) ${r.url}` }); localStorage.setItem(k, JSON.stringify(arr.slice(-20))); } catch { /* ignore */ } flash(act, "Sent"); });
  btn(act, "Copy citation", () => { try { void navigator.clipboard.writeText(cite); } catch { /* ignore */ } flash(act, "Copied"); });
}
const flash = (host: HTMLElement, t: string) => { const s = el("span", "pill g", host, t); setTimeout(() => s.remove(), 1600); };

/* ---------------------------------------------------------------- my loans and notes */
function mine() {
  view.innerHTML = ""; el("h2", "", view, "My loans"); const loans = Library.loans.filter((l) => l.checkouts > 0 || l.maxPage > 0);
  if (!loans.length) el("p", "muted", view, "Nothing checked out yet. Open a book in the stacks, and a Check out button appears as you read.");
  loans.forEach((l) => { const b = allBooks().find((x) => x.id === l.bookId); if (!b) return; const row = el("div", "sec", view); row.style.cssText = "background:var(--kraft);border-radius:12px;padding:10px 14px;box-shadow:0 2px 0 var(--kraft-edge)";
    el("b", "", row, b.title); const st = Library.open(b.id) ? `Checked out: ${fmtLeft(Library.timeLeft(b.id))}` : l.checkouts ? "Loan ended. Check out again with a short quiz." : "Preview only"; el("div", "muted", row, `${st}  ·  furthest page ${l.maxPage + 1}  ·  reading time ${Math.round(l.readSecs / 60)} min  ·  section size ${["", "short", "normal", "long"][l.level]}`);
    const avg = l.scores.length ? Math.round((l.scores.reduce((a, c) => a + c, 0) / l.scores.length) * 100) : null; if (avg !== null) el("div", "muted", row, `Chapter question average: ${avg}%`); const r = el("div", "row", row); r.style.marginTop = "6px"; btn(r, "Open book", () => openBook(b), "bt pri"); });
  el("h2", "", view, "My notes and sources"); if (!Library.notes.length) el("p", "muted", view, "Save a source from Alleyway or mark a line in the study group to see it here.");
  Library.notes.forEach((n) => el("div", "res", view, n));
}
Library.onChange(() => { if (cur === "mine" && !reader.isOpen) mine(); });

/* ---------------------------------------------------------------- tabs */
let cur = "stacks"; let group: StudyGroup | null = null;
function show(v: string) {
  cur = v; document.querySelectorAll<HTMLElement>(".tab").forEach((t) => t.classList.toggle("on", t.dataset.v === v));
  if (v !== "group") group?.leave(); if (v === "stacks") stacks(); else if (v === "zone") zone(); else if (v === "mine") mine(); else { view.innerHTML = ""; group = group ?? new StudyGroup(view); group.show(view, document.body); }
}
document.querySelectorAll<HTMLElement>(".tab").forEach((t) => t.addEventListener("click", () => show(t.dataset.v!)));
setInterval(() => { $("when").textContent = `Academy time ${new Date(0, 0, 0, 0, Schedule.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`; if (cur === "stacks" && !reader.isOpen && !document.activeElement?.matches("input,select")) { /* keep shelf */ } }, 1000);
addEventListener("message", (e) => { const d = e.data; if (d && d.type === "unify:library-open") show(d.tab === "zone" || d.tab === "group" || d.tab === "mine" ? d.tab : "stacks"); });
const params = new URLSearchParams(location.search); show(["zone", "group", "mine"].includes(params.get("tab") || "") ? params.get("tab")! : "stacks"); const bk = params.get("book"); if (bk) { const b = allBooks().find((x) => x.id === bk); if (b) openBook(b); }
parent !== window && parent.postMessage({ type: "unify:library-ready" }, "*");
