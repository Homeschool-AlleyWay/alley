/** Homework binder: the same 'flip.homework' list the flip phone uses ({id,s,text,due,done,doneAt}), byte-compatible. */
import { E, btn, lsGet } from "./dom";

export interface Hw { id: number; s: string; text: string; due: number; done: boolean; doneAt: number; [k: string]: unknown }
const KEY = "flip.homework";
export const SUBJ = [{ k: "math", n: "Math", c: "#4F91C7" }, { k: "ela", n: "ELA", c: "#88B89A" }, { k: "science", n: "Science", c: "#5E9C72" }, { k: "history", n: "History", c: "#C98569" }, { k: "careers", n: "CarryingCareers", c: "#E8A33D" }, { k: "life", n: "Life Lessons", c: "#7CB6A0" }];
export const readHw = (): Hw[] => { const v = lsGet<unknown>(KEY, []); return Array.isArray(v) ? (v as Hw[]).filter((h) => h && typeof h.text === "string") : []; };
export function writeHw(l: Hw[]): boolean { try { localStorage.setItem(KEY, JSON.stringify(l)); return true; } catch { return false; } }
const hm = (m: number) => { const h = Math.floor(m / 60), mi = m % 60; return `${h % 12 || 12}:${String(mi).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
export function dueText(t: number): string {
  const d = new Date(t), td = new Date(), dd = Math.round((+new Date(d.getFullYear(), d.getMonth(), d.getDate()) - +new Date(td.getFullYear(), td.getMonth(), td.getDate())) / 864e5);
  return (t < Date.now() ? "Overdue · " : "") + (dd === 0 ? "Today" : dd === 1 ? "Tomorrow" : dd < 0 ? -dd + " days ago" : d.toLocaleDateString(undefined, { weekday: "long" })) + " " + hm(d.getHours() * 60 + d.getMinutes());
}

export function openHomework(body: HTMLElement): () => void {
  const wrap = E("div", "binder", body); E("h3", "", wrap, "📓 Homework"); const paper = E("div", "paper", wrap);
  const listEl = E("div", "", paper);
  const draw = () => {
    listEl.innerHTML = ""; const list = readHw().sort((a, b) => Number(a.done) - Number(b.done) || a.due - b.due);
    if (!list.length) E("p", "dp-note", listEl, "Nothing assigned. Teachers add homework here at the end of class, or add your own below.");
    for (const h of list) {
      const sj = SUBJ.find((x) => x.k === h.s), row = E("div", "hw-item", listEl); row.style.borderLeftColor = sj ? sj.c : "#C9B28A";
      const c = E("button", "hw-chk" + (h.done ? " on" : ""), row, h.done ? "✓" : ""); c.type = "button"; c.setAttribute("role", "checkbox"); c.setAttribute("aria-checked", String(!!h.done)); c.setAttribute("aria-label", `${h.done ? "Mark not done" : "Mark done"}: ${h.text}`);
      c.onclick = () => { const l = readHw(), i = l.findIndex((x) => x.id === h.id); if (i < 0) return; l[i].done = !l[i].done; l[i].doneAt = l[i].done ? Date.now() : 0; writeHw(l); draw(); };
      const tx = E("div", "hw-tx" + (h.done ? " done" : ""), row); E("div", "", tx, h.text); E("small", "", tx, `${sj ? sj.n + " · " : ""}${dueText(h.due)}`);
      const x = E("button", "dp-btn dp-sm", row, "🗑"); x.type = "button"; x.setAttribute("aria-label", `Delete: ${h.text}`); x.onclick = () => { writeHw(readHw().filter((y) => y.id !== h.id)); draw(); };
    }
  };
  draw();
  E("div", "dp-lab", paper, "Add homework");
  const sel = E("select", "dp-in", paper); sel.setAttribute("aria-label", "Subject"); sel.add(new Option("Subject (optional)", "")); for (const s of SUBJ) sel.add(new Option(s.n, s.k));
  const inp = E("input", "dp-in", paper); inp.type = "text"; inp.maxLength = 120; inp.placeholder = "What is the homework?"; inp.setAttribute("aria-label", "What is the homework?"); inp.style.marginTop = "6px";
  const msg = E("div", "dp-err", paper); const row = E("div", "dp-row", paper);
  const add = (days: number, label: string) => btn(row, label, () => {
    const t = inp.value.trim(); if (!t) { msg.textContent = "Type what the homework is first."; inp.focus(); return; }
    msg.textContent = ""; const due = new Date(); due.setDate(due.getDate() + days); due.setHours(7, 30, 0, 0);
    const l = readHw(); l.push({ id: Date.now() + Math.random(), s: sel.value, text: t, due: due.getTime(), done: false, doneAt: 0 }); writeHw(l); inp.value = ""; draw();
  }, "dp-btn dp-sm", `Add, due ${label}`);
  add(1, "Due tomorrow"); add(2, "In 2 days"); add(7, "Next week");
  const onStore = (e: StorageEvent) => { if (e.key === KEY) draw(); };
  addEventListener("storage", onStore);
  return () => removeEventListener("storage", onStore);
}
