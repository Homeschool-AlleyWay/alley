/** The bulletin board overlay: today's notices, then the sign-up board (five random times per class plus morning, lunch and evening). */
import { Schedule, SUBJ, SUBJ_NAME, MIN_CLASSES, FREE_EXTRAS, timeStr, type Slot, type Subj } from "./schedule";
import { todaysLesson } from "../class3d/curriculum";

const CSS = `.bb{position:fixed;inset:0;z-index:60;display:none;background:rgba(40,30,30,.5);align-items:center;justify-content:center;font-family:"Fredoka","Trebuchet MS",system-ui,sans-serif;color:#4A3B3F}.bb.show{display:flex}
.bb-card{width:min(980px,96vw);max-height:94vh;overflow:auto;background:#F3E7CF;border-radius:18px;padding:16px 20px;box-shadow:0 3px 0 #C9B28A,0 14px 34px rgba(60,40,30,.45);border:1px solid rgba(255,255,255,.8);display:flex;flex-direction:column;gap:12px}
.bb-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.bb-head h2{font-size:22px;font-weight:600}.bb-head small{color:#8A7A70;font-size:13px;display:block}
.bb-notes{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.bb-note{background:#FFF9F0;border-radius:6px;padding:10px 12px;box-shadow:0 2px 0 #C9B28A;font-size:14px;line-height:1.35;position:relative}.bb-note:before{content:"";position:absolute;top:-6px;left:50%;width:10px;height:10px;border-radius:50%;background:#E07A66;transform:translateX(-50%);box-shadow:0 1px 0 #b95a48}.bb-note b{display:block;margin-bottom:2px}
.bb-rows{display:flex;flex-direction:column;gap:8px}.bb-row{display:grid;grid-template-columns:100px 1fr;gap:8px;align-items:center}.bb-row>b{font-size:16px}
.bb-slots{display:flex;flex-wrap:wrap;gap:6px}.bb-slot{font:inherit;font-size:13px;color:#4A3B3F;background:#fff;border:2px solid #C9B28A;border-radius:10px;padding:5px 10px;cursor:pointer;min-height:34px}
.bb-slot.named{background:#EEF4E4}.bb-slot.on{background:#E07A66;color:#fff;border-color:#b95a48}.bb-slot:disabled{opacity:.4;cursor:not-allowed}.bb-slot:focus-visible,.bb-btn:focus-visible{outline:3px solid #4F91C7;outline-offset:2px}
.bb-slot small{display:block;font-size:10px;opacity:.75}.bb-foot{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.bb-count{font-size:14px;font-weight:600}.bb-msg{font-size:13px;color:#b95a48;min-height:18px}
.bb-btn{font:inherit;font-size:15px;color:#4A3B3F;background:#FFF9F0;border:1px solid rgba(255,255,255,.8);border-radius:10px;padding:7px 14px;cursor:pointer;box-shadow:0 2px 0 #C9B28A;min-height:36px}.bb-btn.pri{background:#E07A66;color:#fff;box-shadow:0 2px 0 #b95a48}.bb-btn:disabled{opacity:.5;cursor:not-allowed}
.bb-perm{background:#FFF9F0;border-radius:10px;padding:10px 12px;display:none;gap:8px;flex-direction:column;font-size:14px}.bb-perm.show{display:flex}.bb-perm input{font:inherit;padding:6px 8px;border:2px solid #C9B28A;border-radius:8px;width:120px}`;
let cssDone = false; const ensureCss = () => { if (cssDone) return; cssDone = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
function el<K extends keyof HTMLElementTagNameMap>(t: K, c = "", p?: HTMLElement, x?: string) { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; p?.appendChild(e); return e; }

export class Bulletin {
  root: HTMLElement; card: HTMLElement; onClose: () => void = () => {}; onChange: () => void = () => {}; private extraMode = false;
  constructor(host: HTMLElement = document.body) {
    ensureCss(); this.root = el("div", "bb", host); this.root.setAttribute("role", "dialog"); this.root.setAttribute("aria-label", "Bulletin board"); this.card = el("div", "bb-card", this.root);
    addEventListener("keydown", (e) => { if (e.key === "Escape" && this.isOpen && Schedule.minMet) this.close(); });
    Schedule.onChange(() => { if (this.isOpen) this.render(); });
  }
  get isOpen() { return this.root.classList.contains("show"); }
  open(extra = false) { this.extraMode = extra; this.root.classList.add("show"); this.render(); this.root.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }); }
  close() { if (!this.isOpen) return; Schedule.markSeen(); this.root.classList.remove("show"); this.onClose(); }
  private render() {
    const C = this.card, d = Schedule.day; C.innerHTML = "";
    const head = el("div", "bb-head", C), t = el("div", "", head); el("h2", "", t, "Daily Bulletin Board"); el("small", "", t, `${new Date().toDateString()}  ·  academy time ${timeStr(Schedule.now())}`);
    const hb = el("div", "bb-foot", head); const skip = el("button", "bb-btn", hb, "Skip ahead to next class"); skip.type = "button"; skip.onclick = () => { Schedule.skipToNext(); this.onChange(); };
    const notes = el("div", "bb-notes", C);
    const lessons = SUBJ.map((s) => `${SUBJ_NAME[s]}: ${todaysLesson(s).title}`); const n1 = el("div", "bb-note", notes); el("b", "", n1, "Today's lessons"); lessons.forEach((l) => el("div", "", n1, l));
    const n2 = el("div", "bb-note", notes); el("b", "", n2, "Plan your day"); el("div", "", n2, `Pick at least ${MIN_CLASSES} classes. Times cannot overlap. Finished early? Add up to ${FREE_EXTRAS} extra lessons. More needs a teacher and a parent.`);
    const n3 = el("div", "bb-note", notes); el("b", "", n3, "Library and news"); el("div", "", n3, "Check out a book for homework, join a study group, and watch the afternoon newsroom for field reports.");
    const rows = el("div", "bb-rows", C);
    for (const s of SUBJ) {
      const r = el("div", "bb-row", rows); el("b", "", r, SUBJ_NAME[s]); const w = el("div", "bb-slots", r), cur = Schedule.signupFor(s, true);
      for (const slot of d.slots[s]) {
        const on = d.signups.some((x) => x.slotId === slot.id), c = Schedule.conflict(slot), done = cur?.status === "done" && cur.slotId === slot.id, locked = (cur && cur.status !== "planned" && cur.slotId !== slot.id && !cur.extra) || done;
        const b = el("button", "bb-slot" + (slot.kind !== "random" ? " named" : "") + (on ? " on" : ""), w); b.type = "button"; b.disabled = !on && (!!c || !!locked) || (!this.extraMode && !!cur && cur.status !== "planned" && !on);
        b.textContent = timeStr(slot.start); if (slot.kind !== "random") el("small", "", b, slot.kind[0].toUpperCase() + slot.kind.slice(1)); b.title = c ? `Overlaps ${SUBJ_NAME[c.subject]} at ${timeStr(c.start)}` : "";
        b.onclick = () => { if (on) Schedule.unchoose(s); else { const res = Schedule.choose(slot, this.extraMode && !!Schedule.signupFor(s, true) && !cur?.extra ? true : false); if (!res.ok) msg.textContent = res.why ?? ""; } this.onChange(); };
      }
    }
    const foot = el("div", "bb-foot", C), cnt = el("span", "bb-count", foot, `${Schedule.required.length} classes chosen (at least ${MIN_CLASSES}, extras allowed)${Schedule.extras.length ? `  ·  ${Schedule.extras.length} extra` : ""}`), msg = el("span", "bb-msg", foot);
    const ex = el("button", "bb-btn", foot, "Add an extra lesson"); ex.type = "button"; ex.disabled = !Schedule.minMet; ex.title = "Finished early? Add another lesson."; void cnt;
    const perm = el("div", "bb-perm", C); const showPerm = () => { perm.classList.add("show"); perm.innerHTML = ""; el("div", "", perm, "You have used your two extra lessons. A teacher and a parent must approve more."); const pin = el("input", "", perm) as HTMLInputElement; pin.type = "password"; pin.inputMode = "numeric"; pin.maxLength = 4; pin.placeholder = Schedule.parentPinSet() ? "Parent PIN" : "Set a parent PIN (4 digits)"; pin.setAttribute("aria-label", "Parent PIN"); const go = el("button", "bb-btn pri", perm, "Ask teacher and parent"); go.type = "button"; go.onclick = () => { const r = Schedule.requestPermission(pin.value, Schedule.avgScore()); if (r.ok) { perm.classList.remove("show"); msg.textContent = "Teacher and parent approved."; this.render(); } else msg.textContent = r.why ?? ""; }; };
    ex.onclick = () => { const a = Schedule.canAddExtra(); if (a.needsPermission) { showPerm(); return; } const next = SUBJ.find((s) => !Schedule.signupFor(s, true)?.extra && Schedule.signupFor(s, true)?.status === "done") ?? SUBJ[0]; const r = Schedule.addExtra(next); msg.textContent = r.ok ? `Extra ${SUBJ_NAME[next]} lesson added.` : r.why ?? ""; this.onChange(); };
    const ok = el("button", "bb-btn pri", foot, Schedule.minMet ? "Confirm my day" : `Pick ${MIN_CLASSES - Schedule.required.length} more`); ok.type = "button"; ok.disabled = !Schedule.minMet; ok.onclick = () => this.close();
  }
}
