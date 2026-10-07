/** The class-times bulletin board: a picture of it (hallway and classroom walls) and the panel students use to pick today's session times. */
import { ALL_SUBJECTS, SET_TIMES, SUBJECT_NAME, Progress, clock12, slotsFor, type Subject } from "./progress";
import { CURRICULUM } from "../class3d/curriculum";
import { TEACHER_BY_SUBJECT } from "../hall3d/roster";
import { Placement } from "./placement";

export const SUBJECT_COLOR: Record<Subject, string> = { math: "#4F91C7", ela: "#88B89A", science: "#5E9C72", history: "#C98569", careers: "#E8A33D", life: "#7CB6A0" };
const lessonLine = (s: Subject) => { const list = CURRICULUM[s], i = Progress.index(s, list.length); return { n: i + 1, of: list.length, title: list[i].title }; };

/** draw the corkboard: every class with its picked time and lesson number (or, with `focus`, one class in detail with its 5 times) */
export function drawBoard(c: CanvasRenderingContext2D, w: number, h: number, focus?: Subject) {
  c.fillStyle = "#C9955E"; c.fillRect(0, 0, w, h); for (let k = 0; k < w * h / 220; k++) { c.fillStyle = `rgba(${90 + Math.random() * 80},${50 + Math.random() * 50},20,.22)`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  c.strokeStyle = "#7a4a2a"; c.lineWidth = Math.round(h / 28); c.strokeRect(0, 0, w, h);
  const pad = Math.round(h / 22), paper = (x: number, y: number, ww: number, hh: number, col: string, rot = 0) => { c.save(); c.translate(x + ww / 2, y + hh / 2); c.rotate(rot); c.fillStyle = "rgba(60,40,30,.25)"; c.fillRect(-ww / 2 + 4, -hh / 2 + 5, ww, hh); c.fillStyle = col; c.fillRect(-ww / 2, -hh / 2, ww, hh); c.fillStyle = "#c4463c"; c.beginPath(); c.arc(0, -hh / 2 + 9, 6, 0, 7); c.fill(); c.restore(); };
  const font = (px: number, wt = 600) => { c.font = `${wt} ${px}px 'Trebuchet MS',sans-serif`; };
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  paper(pad * 2, pad * 1.4, w - pad * 4, h * 0.2, "#FFF9F0", -0.008); c.fillStyle = "#E07A66"; font(h * 0.105, 800); c.textAlign = "center"; c.fillText(focus ? `${SUBJECT_NAME[focus].toUpperCase()}: TODAY'S TIMES` : "CLASS TIMES TODAY", w / 2, pad * 1.4 + h * 0.135); c.fillStyle = "#6a5a50"; font(h * 0.045, 600); c.fillText(today, w / 2, pad * 1.4 + h * 0.185);
  const top = pad * 1.4 + h * 0.23;
  if (focus) {
    const picked = Progress.pickedFor(focus), L = lessonLine(focus);
    paper(pad * 2, top, w * 0.56, h * 0.5, "#FFF3C9", 0.006); c.textAlign = "left"; c.fillStyle = "#4A3B3F"; font(h * 0.05, 700); c.fillText("5 session times today", pad * 3, top + h * 0.075);
    slotsFor(focus).forEach((m, i) => { const sel = picked === m; c.fillStyle = sel ? SUBJECT_COLOR[focus] : "#4A3B3F"; font(h * 0.058, sel ? 800 : 600); c.fillText(`${sel ? "✔ " : ""}${clock12(m)}`, pad * 3, top + h * 0.15 + i * h * 0.07); });
    paper(w * 0.62, top, w * 0.34, h * 0.23, "#DCEBFA", -0.012); c.fillStyle = "#4A3B3F"; font(h * 0.04, 700); c.fillText("Or pick a set time", w * 0.635, top + h * 0.06); SET_TIMES.forEach((t, i) => { font(h * 0.04, 600); c.fillText(`${t.label}: ${clock12(t.min)}`, w * 0.635, top + h * 0.115 + i * h * 0.042); });
    paper(w * 0.62, top + h * 0.26, w * 0.34, h * 0.24, "#E3F4E4", 0.01); c.fillStyle = "#4A3B3F"; font(h * 0.04, 700); c.fillText(`Lesson ${L.n} of ${L.of}`, w * 0.635, top + h * 0.32); font(h * 0.036, 500); const words = L.title.split(" "); let line = "", y = top + h * 0.37; for (const wd of words) { if ((line + wd).length > 20) { c.fillText(line, w * 0.635, y); line = ""; y += h * 0.04; } line += wd + " "; } c.fillText(line, w * 0.635, y);
    c.textAlign = "center"; c.fillStyle = "#5a4a40"; font(h * 0.036, 600); c.fillText("Finish a lesson and the next one opens so you can get ahead.", w / 2, h - pad * 1.1);
  } else {
    const rows = ALL_SUBJECTS, rh = (h - top - pad * 2.4) / rows.length;
    rows.forEach((s, i) => { const y = top + i * rh, picked = Progress.pickedFor(s), L = lessonLine(s); paper(pad * 2, y, w - pad * 4, rh - 6, i % 2 ? "#FFF9F0" : "#FFF3C9", (i % 2 ? 1 : -1) * 0.004);
      c.fillStyle = SUBJECT_COLOR[s]; c.fillRect(pad * 2.6, y + 8, 10, rh - 22); c.textAlign = "left"; c.fillStyle = "#4A3B3F"; font(rh * 0.42, 800); c.fillText(SUBJECT_NAME[s], pad * 2.6 + 22, y + rh * 0.52);
      font(rh * 0.3, 500); c.fillStyle = "#6a5a50"; c.fillText(`Lesson ${L.n}/${L.of}`, pad * 2.6 + 22, y + rh * 0.86);
      c.textAlign = "right"; font(rh * 0.44, 800); c.fillStyle = picked !== null ? SUBJECT_COLOR[s] : "#9a8a80"; c.fillText(picked !== null ? clock12(picked) : "pick a time", w - pad * 2.8, y + rh * 0.6); });
    c.textAlign = "center"; c.fillStyle = "#4A3B3F"; font(h * 0.036, 700); c.fillText("5 random times a day, or Morning, Noon or Evening", w / 2, h - pad * 1.1);
  }
}

const CSS = `.tmWrap{position:fixed;inset:0;z-index:60;background:rgba(40,30,30,.5);display:none;align-items:center;justify-content:center;padding:12px}.tmWrap.show{display:flex}
.tmPanel{background:#F3E7CF;border-radius:18px;max-width:760px;width:100%;max-height:92vh;overflow:auto;padding:16px 18px;box-shadow:0 3px 0 #C9B28A,0 14px 34px rgba(60,40,30,.5);border:1px solid rgba(255,255,255,.8);font:15px/1.35 'Fredoka','Trebuchet MS',system-ui,sans-serif;color:#4A3B3F}
.tmHead{display:flex;justify-content:space-between;align-items:center;gap:10px}.tmHead h2{font-size:22px;font-weight:600}.tmHead small{color:#8A7A70;display:block;font-size:13px}
.tmRow{background:#FFF9F0;border-radius:12px;margin-top:10px;padding:10px 12px;border-left:8px solid var(--c);box-shadow:0 2px 0 #C9B28A}.tmRow.focus{outline:3px solid #E07A66}
.tmTop{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}.tmTop b{font-size:17px}.tmTop span{font-size:13px;color:#8A7A70}
.tmChips{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px;align-items:center}.tmChips em{font-style:normal;font-size:12px;color:#8A7A70;min-width:74px}
.tmChip,.tmBtn{font:inherit;font-size:14px;color:#4A3B3F;background:#F3E7CF;border:1px solid rgba(255,255,255,.8);border-radius:10px;padding:5px 10px;cursor:pointer;box-shadow:0 2px 0 #C9B28A;min-height:34px}
.tmChip.on{background:var(--c);color:#fff;border-color:var(--c)}.tmChip:active,.tmBtn:active{transform:translateY(2px);box-shadow:none}.tmBtn.go{background:#E07A66;color:#fff}.tmBtn.x{background:#FFF9F0}
.tmNext{display:inline-block;background:#D6ECD6;border-radius:8px;padding:2px 8px;font-size:12px;margin-left:6px}`;
/** the extra (catch-up) lesson for this class, booked at a set time so it never replaces a regular class */
const extraRow = (s: Subject, col: string) => { const pl = Placement.plan(s); if (!pl || !pl.next) return ""; const px = Progress.pickedFor(s, true); return `<div class="tmChips"><em>Extra lesson</em><span style="font-size:13px">${pl.next.title} (${pl.remaining.length} left)</span></div><div class="tmChips"><em>Extra time</em>${SET_TIMES.map((t) => `<button class="tmChip${px === t.min ? " on" : ""}" style="--c:${col}" data-s="${s}" data-m="${t.min}" data-k="set" data-x="1">${t.label} ${clock12(t.min)}</button>`).join("")}</div>`; };
let el: HTMLElement | null = null;
export function openTimes(opts: { focus?: Subject; onGo?: (s: Subject) => void } = {}) {
  if (!el) { const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st); el = document.createElement("div"); el.className = "tmWrap"; document.body.appendChild(el); el.addEventListener("pointerdown", (e) => { if (e.target === el) close(); }); addEventListener("keydown", (e) => { if (e.key === "Escape" && el?.classList.contains("show")) close(); }); addEventListener("unify:progress", () => { if (el?.classList.contains("show")) render(); }); }
  const close = () => { el!.classList.remove("show"); dispatchEvent(new Event("unify:times-closed")); };
  const render = () => {
    const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    el!.innerHTML = `<div class="tmPanel"><div class="tmHead"><div><h2>Class times</h2><small>${date}. Pick a session time for each class: one of 5 random times, or Morning, Noon or Evening. It goes on today's schedule in your phone.</small></div><button class="tmBtn x" data-x>Close</button></div>${ALL_SUBJECTS.map((s) => {
      const picked = Progress.pickedFor(s), list = CURRICULUM[s], i = Progress.index(s, list.length), col = SUBJECT_COLOR[s];
      return `<div class="tmRow${opts.focus === s ? " focus" : ""}" style="--c:${col}"><div class="tmTop"><b>${SUBJECT_NAME[s]}</b><span>${TEACHER_BY_SUBJECT[s].name} · Lesson ${i + 1} of ${list.length}: ${list[i].title}${Progress.doneCount(s) ? `<i class="tmNext">${Progress.doneCount(s)} done, next lesson ready</i>` : ""}</span></div>
      <div class="tmChips"><em>5 times today</em>${slotsFor(s).map((m) => `<button class="tmChip${picked === m ? " on" : ""}" data-s="${s}" data-m="${m}" data-k="random">${clock12(m)}</button>`).join("")}</div>
      <div class="tmChips"><em>Set times</em>${SET_TIMES.map((t) => `<button class="tmChip${picked === t.min ? " on" : ""}" data-s="${s}" data-m="${t.min}" data-k="set">${t.label} ${clock12(t.min)}</button>`).join("")}${picked !== null ? `<button class="tmBtn x" data-clear="${s}">Clear</button>` : ""}${opts.onGo ? `<button class="tmBtn go" data-go="${s}">Go to class</button>` : ""}</div>${extraRow(s, col)}</div>`; }).join("")}</div>`;
    el!.querySelector("[data-x]")!.addEventListener("click", close);
    el!.querySelectorAll<HTMLElement>(".tmChip").forEach((b) => b.addEventListener("click", () => { const s = b.dataset.s as Subject, m = +b.dataset.m!, x = !!b.dataset.x; if (Progress.pickedFor(s, x) === m) Progress.unpick(s, x); else Progress.pick(s, m, b.dataset.k as "random" | "set", x); render(); }));
    el!.querySelectorAll<HTMLElement>("[data-clear]").forEach((b) => b.addEventListener("click", () => { Progress.unpick(b.dataset.clear as Subject); render(); }));
    el!.querySelectorAll<HTMLElement>("[data-go]").forEach((b) => b.addEventListener("click", () => { close(); opts.onGo?.(b.dataset.go as Subject); }));
  };
  render(); el.classList.add("show");
}
