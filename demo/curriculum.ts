/** UNIFY Curriculum: a separate app for the wired-in curriculum. Browse every subject and lesson, read the textbook, take electives, import packs, listen to the lesson read aloud. Works offline once opened. */
import { CURRICULUM, type LessonDef } from "../src/class3d/curriculum";
import { ELECTIVES, Packs } from "../src/class3d/packs";
import { openTextbook, openPacks } from "../src/class3d/curriculumui";
import { SUBJECT_NAME } from "../src/game/progress";
import type { Subject } from "../src/game/types";
const SUBJ: Subject[] = ["math", "ela", "science", "history", "careers", "life"];
const ICON: Record<Subject, string> = { math: "➗", ela: "📖", science: "🔬", history: "🏛️", careers: "💼", life: "🌱" };
const COL: Record<Subject, string> = { math: "#6AA9F0", ela: "#E8604C", science: "#5FB37A", history: "#C99B66", careers: "#8E7CC3", life: "#EAB94E" };
const $ = (id: string) => document.getElementById(id)!;
const el = (tag: string, cls = "", parent?: HTMLElement, text = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e; };
const KEY = "unify.curapp.v1";
const read = (): { done: string[] } => { try { return { done: [], ...(JSON.parse(localStorage.getItem(KEY) || "null") || {}) }; } catch { return { done: [] }; } };
const write = (s: { done: string[] }) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };
const main = $("main"), host = $("host");
let speaking = false;
const stopSpeak = () => { try { speechSynthesis.cancel(); } catch { /* none */ } speaking = false; };
const all = (s: Subject): LessonDef[] => [...CURRICULUM[s], ...ELECTIVES[s]];
const clear = () => { stopSpeak(); main.innerHTML = ""; window.scrollTo(0, 0); };
const crumbs = (...c: [string, (() => void)?][]) => { const b = el("div", "crumbs", main); c.forEach(([t, f], i) => { if (i) el("span", "", b, " › "); if (f) { const a = el("button", "link", b, t); a.onclick = f; } else el("b", "", b, t); }); };

function home() {
  clear(); history.replaceState(null, "", "#"); crumbs(["Curriculum"]);
  const g = el("div", "grid", main); const d = new Set(read().done);
  for (const s of SUBJ) { const ls = all(s), n = ls.filter((l) => d.has(l.id)).length; const c = el("button", "card", g); c.style.setProperty("--c", COL[s]); el("div", "big", c, ICON[s]); el("b", "", c, SUBJECT_NAME[s]); el("small", "", c, `${ls.length} lessons · ${n} studied`); const bar = el("div", "meter", c); el("i", "", bar).style.width = (ls.length ? (n / ls.length) * 100 : 0) + "%"; c.onclick = () => subject(s); }
  const t = el("div", "row", main); t.style.marginTop = "14px";
  el("button", "btn pri", t, "📚 Textbook").onclick = () => openTextbook(host, { subject: "math", onClose: () => { /* back */ } });
  el("button", "btn", t, "🧩 Curriculum packs").onclick = () => openPacks(host, { onClose: () => home() });
  el("a", "btn", t, "🏫 Open the school").setAttribute("href", "index.html");
}
function subject(s: Subject) {
  clear(); history.replaceState(null, "", "#" + s); crumbs(["Curriculum", home], [SUBJECT_NAME[s]]);
  const d = new Set(read().done), reg = CURRICULUM[s], el2 = ELECTIVES[s];
  const list = (title: string, ls: LessonDef[]) => { if (!ls.length) return; el("h3", "", main, title); const w = el("div", "list", main); ls.forEach((l) => { const r = el("button", "item", w); r.style.setProperty("--c", COL[s]); el("b", "", r, `${d.has(l.id) ? "✓ " : ""}${l.title}`); el("small", "", r, l.blurb || ""); r.onclick = () => lesson(l); }); };
  list("Lessons", reg); list("Electives and extras", el2);
  const t = el("div", "row", main); t.style.marginTop = "12px"; el("button", "btn", t, "📚 Open the " + SUBJECT_NAME[s] + " textbook").onclick = () => openTextbook(host, { subject: s, onClose: () => { /* back */ } });
}
function section(parent: HTMLElement, title: string, items: string[] | string) { const arr = Array.isArray(items) ? items : items ? [items] : []; if (!arr.length) return; el("h3", "", parent, title); if (arr.length === 1 && !Array.isArray(items)) el("p", "", parent, arr[0]); else { const u = el("ul", "", parent); arr.forEach((x) => el("li", "", u, x)); } }
function lesson(l: LessonDef) {
  clear(); history.replaceState(null, "", "#" + l.subject + "/" + l.id); crumbs(["Curriculum", home], [SUBJECT_NAME[l.subject], () => subject(l.subject)], [l.title]);
  const card = el("article", "page", main); card.style.setProperty("--c", COL[l.subject]);
  el("h2", "", card, `${ICON[l.subject]} ${l.title}`); if (l.blurb) el("p", "lede", card, l.blurb); if (l.grades) el("small", "", card, "Grades " + l.grades + (l.elective ? " · elective: " + l.elective : ""));
  const row = el("div", "row", card), say = el("button", "btn", row, "🔊 Read aloud");
  const text = () => [l.intro, ...l.points, ...l.examples, l.wrap].filter(Boolean).join(" ");
  say.onclick = () => { if (speaking) { stopSpeak(); say.textContent = "🔊 Read aloud"; return; } try { const u = new SpeechSynthesisUtterance(text()); u.rate = 0.95; u.onend = () => { speaking = false; say.textContent = "🔊 Read aloud"; }; speechSynthesis.speak(u); speaking = true; say.textContent = "⏹ Stop"; } catch { /* none */ } };
  const done = read().done.includes(l.id), mk = el("button", "btn pri", row, done ? "✓ Studied (tap to undo)" : "Mark as studied");
  mk.onclick = () => { const s = read(); s.done = s.done.includes(l.id) ? s.done.filter((x) => x !== l.id) : [...s.done, l.id]; write(s); lesson(l); };
  el("button", "btn", row, "📚 Textbook").onclick = () => openTextbook(host, { subject: l.subject, lesson: l, onClose: () => { /* back */ } });
  if (l.intro) section(card, "Introduction", l.intro); section(card, "Key points", l.points); section(card, "Examples", l.examples);
  if (l.whys?.length) section(card, "Why does it matter?", l.whys);
  const g = Object.entries(l.glossary ?? {}); if (g.length) { el("h3", "", card, "Glossary"); const dl = el("dl", "", card); g.forEach(([k, v]) => { el("dt", "", dl, k); el("dd", "", dl, v); }); }
  if (l.lab?.title) section(card, "Try it (interactive lab in the classroom)", `${l.lab.title}. ${l.lab.intro}`);
  if (l.wrap) section(card, "Wrap-up", l.wrap); if (l.homework) section(card, "Homework", l.homework);
  if (l.script?.length) { const det = el("details", "", card); el("summary", "", det, "Teacher's script"); l.script.forEach((st) => { if (st.say) el("p", "", det, st.say); }); }
}
function search(q: string) {
  q = q.trim().toLowerCase(); if (!q) { home(); return; } clear(); crumbs(["Curriculum", home], ["Search: " + q]); const w = el("div", "list", main); let n = 0;
  for (const s of SUBJ) for (const l of all(s)) { const hay = [l.title, l.blurb, ...(l.points || []), ...(l.examples || []), ...Object.keys(l.glossary || {})].join(" ").toLowerCase(); if (hay.includes(q) && n < 60) { n++; const r = el("button", "item", w); r.style.setProperty("--c", COL[s]); el("b", "", r, `${ICON[s]} ${l.title}`); el("small", "", r, SUBJECT_NAME[s] + " · " + (l.blurb || "")); r.onclick = () => lesson(l); } }
  if (!n) el("p", "", main, "Nothing matched. Try another word.");
}
($("q") as HTMLInputElement).oninput = (e) => search((e.target as HTMLInputElement).value);
function route() { const h = location.hash.slice(1); const [s, id] = h.split("/"); if (s && (SUBJ as string[]).includes(s)) { const l = all(s as Subject).find((x) => x.id === id); if (l) { lesson(l); return; } subject(s as Subject); return; } home(); }
Packs.loadBundled().then(route).catch(route); route();
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("curriculum-sw.js").catch(() => { /* offline install optional */ });
