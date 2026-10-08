/** Locker panel: claim an open locker, decorate it (photos, stickers, a note, a colour), read your grades and a report card. Everything stays on this device. */
import { Cosm } from "../game/cosmetics";
import { openHub } from "./hubui";
import { Lockers, STICKERS, THEMES, npcLocker, slot, type LockerData } from "../game/lockers";
import { Progress, SUBJECT_NAME, ALL_SUBJECTS, dayKey } from "../game/progress";
import { CURRICULUM } from "../class3d/curriculum";
import { TEACHER_BY_SUBJECT } from "./roster";
import { Social } from "./social";
import { drawChar } from "./rig";
import { PORTRAIT_SCALE } from "./characters";
import { toLook } from "./avatar";
import type { Subject } from "../game/types";

const CSS = `
.lk{position:fixed;inset:0;z-index:72;display:none;background:rgba(40,30,30,.5);font-family:var(--ui,"Fredoka","Trebuchet MS",system-ui,sans-serif);color:var(--ink,#4A3B3F)}
.lk.show{display:flex;align-items:center;justify-content:center}
.lk-p{width:min(920px,96vw);height:min(640px,94vh);background:var(--kraft,#F3E7CF);border:1px solid rgba(255,255,255,.75);border-radius:16px;box-shadow:0 3px 0 var(--kraft-edge,#C9B28A),0 14px 34px rgba(60,40,30,.45);display:flex;flex-direction:column;padding:12px;box-sizing:border-box;gap:8px}
.lk-h{display:flex;align-items:center;gap:8px}.lk-h h2{font-size:20px;margin:0;font-weight:600;flex:1}
.lk-b{font:inherit;font-size:14px;padding:6px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.8);background:#FFF9F0;color:inherit;cursor:pointer;box-shadow:0 2px 0 var(--kraft-edge,#C9B28A);min-height:34px}
.lk-b.on{background:var(--acc,#E07A66);color:#fff}.lk-b.go{background:var(--sage,#4E8A64);color:#fff}.lk-b:active{transform:translateY(2px);box-shadow:none}.lk-b:disabled{opacity:.5}
.lk-tabs{display:flex;gap:6px;flex-wrap:wrap}.lk-body{flex:1;min-height:0;overflow:auto}
.lk-in{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:12px;height:100%}@media(max-width:700px){.lk-in{grid-template-columns:1fr;height:auto}}
.lk-door{border-radius:12px;padding:12px;min-height:300px;box-shadow:inset 0 0 0 5px rgba(0,0,0,.18),inset 0 -40px 60px rgba(0,0,0,.15);position:relative;display:flex;flex-wrap:wrap;gap:10px;align-content:flex-start}
.lk-pic{width:118px;background:#fff;padding:6px 6px 4px;box-shadow:0 3px 6px rgba(0,0,0,.35);position:relative;transform:rotate(var(--r,0deg))}.lk-pic img{width:100%;height:96px;object-fit:cover;display:block;background:#ddd}.lk-pic input{width:100%;box-sizing:border-box;border:0;font:inherit;font-size:12px;text-align:center;background:none;color:#4A3B3F;margin-top:3px}
.lk-pic i{position:absolute;top:-6px;left:50%;width:14px;height:14px;border-radius:50%;background:#d9564a;box-shadow:0 2px 2px rgba(0,0,0,.4);margin-left:-7px}
.lk-x{position:absolute;right:-6px;top:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#4A3B3F;color:#fff;cursor:pointer;font-size:13px;line-height:22px;padding:0;z-index:2}
.lk-st{font-size:30px;transform:rotate(var(--r,0deg))}.lk-note{background:#fff6a8;padding:8px 10px;width:150px;font-size:14px;box-shadow:0 3px 6px rgba(0,0,0,.3);transform:rotate(-2deg)}
.lk-side{display:flex;flex-direction:column;gap:6px;overflow:auto}.lk-lab{font-size:12px;color:var(--soft,#8A7A70);text-transform:uppercase;letter-spacing:.4px;font-weight:600;margin-top:4px}
.lk-row{display:flex;flex-wrap:wrap;gap:6px}.lk-sw{width:28px;height:28px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1.5px #6d5a5f;cursor:pointer;padding:0}.lk-sw.on{box-shadow:0 0 0 3px var(--acc,#E07A66)}
.lk-em{font-size:22px;background:#FFF9F0;border:1px solid rgba(0,0,0,.1);border-radius:8px;cursor:pointer;padding:2px 6px}
.lk-ta{width:100%;box-sizing:border-box;min-height:60px;font:inherit;border-radius:10px;border:1px solid var(--kraft-edge,#C9B28A);padding:6px 8px}
.lk-tab{width:100%;border-collapse:collapse}.lk-tab th,.lk-tab td{padding:7px 8px;text-align:left;border-bottom:1px solid rgba(74,59,63,.15);font-size:14px}.lk-tab th{font-size:12px;text-transform:uppercase;color:var(--soft,#8A7A70)}
.lk-gr{display:inline-block;min-width:34px;text-align:center;font-weight:700;font-size:18px;border-radius:8px;padding:1px 6px;background:#fff}.lk-bar{height:8px;border-radius:5px;background:rgba(74,59,63,.15);overflow:hidden;min-width:70px}.lk-bar i{display:block;height:100%;background:var(--sage,#4E8A64)}
.lk-rep{background:#fffdf8;border-radius:12px;padding:14px 18px;font-size:15px;line-height:1.5;border:1px solid rgba(74,59,63,.15)}.lk-rep h3{margin:10px 0 2px;font-size:16px}.lk-rep p{margin:2px 0}
.lk-big{font-size:18px;text-align:center;padding:30px 10px}
`;
let styled = false;
const E = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", parent?: HTMLElement, text = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e; };
const rot = (i: number) => `${((i * 37) % 9) - 4}deg`;

/* ---------------- grades ---------------- */
export interface Grade { subject: Subject; done: number; total: number; labPct: number | null; labQ: number; extras: number; mastery: number | null; letter: string }
const letterOf = (m: number) => (m >= 0.9 ? "A" : m >= 0.8 ? "B" : m >= 0.7 ? "C" : m >= 0.6 ? "D" : "F");
/** grades from a saved progress state (the parent view reads this from the cloud) */
export function gradesFromState(st: any): Grade[] {
  return ALL_SUBJECTS.map((subject) => {
    const total = CURRICULUM[subject].length, done = Math.min((st?.done?.[subject] ?? []).length, total), sc = st?.scores?.[subject] ?? [0, 0], r = sc[0] ?? 0, q = sc[1] ?? 0, labPct = q ? r / q : null, extras = (st?.extra?.[subject] ?? []).length;
    const progress = Math.min(1, done / Math.max(3, Math.min(total, 6))), mastery = !done && !q ? null : 0.7 * (labPct ?? 0.82) + 0.3 * progress;
    return { subject, done, total, labPct, labQ: q, extras, mastery, letter: mastery == null ? "—" : letterOf(mastery) };
  });
}
export function gradesNow(): Grade[] {
  return ALL_SUBJECTS.map((subject) => {
    const total = CURRICULUM[subject].length, done = Math.min(Progress.doneCount(subject), total), [r, q] = Progress.scores(subject), labPct = q ? r / q : null, extras = Progress.extraDone(subject).length;
    const progress = Math.min(1, done / Math.max(3, Math.min(total, 6)));
    const mastery = !done && !q ? null : 0.7 * (labPct ?? 0.82) + 0.3 * progress;
    return { subject, done, total, labPct, labQ: q, extras, mastery, letter: mastery == null ? "—" : letterOf(mastery) };
  });
}
function comment(g: Grade): string {
  const T = TEACHER_BY_SUBJECT[g.subject], who = T ? `${T.title ?? ""} ${T.name.split(" ").slice(-1)[0]}`.trim() : "Your teacher";
  const nm = Social.profile.name || "You";
  if (g.mastery == null) return `${who}: ${nm} hasn't been to ${SUBJECT_NAME[g.subject]} yet. Walk into the classroom whenever you're ready. I'd love to meet you.`;
  const pct = g.labPct == null ? "" : ` Lab accuracy is ${Math.round(g.labPct * 100)}%.`;
  const base = g.letter === "A" ? `Excellent work. ${g.done} lesson${g.done === 1 ? "" : "s"} finished.${pct} Keep it up, and try an elective to stretch yourself.` : g.letter === "B" ? `Strong progress with ${g.done} lesson${g.done === 1 ? "" : "s"} done.${pct} Review the glossary words before the next lab to reach an A.` : g.letter === "C" ? `Steady effort so far.${pct} Slow down on the labs and read the Textbook section after each lesson.` : `This subject needs more practice.${pct} Try the extra lessons in More, and ask me questions in class. Questions are always welcome.`;
  return `${who}: ${base}`;
}
export function reportText(): string {
  const gr = gradesNow(), p = Social.profile, a = Progress.assessment(), lines = [`UNIFY Academy report card`, `Student: ${p.name || "Student"}`, `Date: ${dayKey()}`, `Days with classes planned this fortnight: ${Progress.daysActive()}`];
  if (a) lines.push(`Starting points (age ${a.age}): ${Object.entries(a.levels).map(([k, v]) => `${SUBJECT_NAME[k as Subject]} level ${v}`).join(", ")}`);
  lines.push("", ...gr.map((g) => `${SUBJECT_NAME[g.subject]}: ${g.letter}  (${g.done}/${g.total} lessons${g.labPct != null ? `, labs ${Math.round(g.labPct * 100)}%` : ""})\n  ${comment(g)}`));
  return lines.join("\n");
}

/* ---------------- photos ---------------- */
async function fileToJpeg(f: File): Promise<string> {
  if (!f.type.startsWith("image/")) throw new Error("That file isn't a picture.");
  const url = URL.createObjectURL(f);
  try { const img = new Image(); img.src = url; await img.decode(); const k = Math.min(1, 360 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k)); c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.72); } finally { URL.revokeObjectURL(url); }
}
function avatarPhoto(): string {
  const cv = document.createElement("canvas"); cv.width = 240; cv.height = 300; const c = cv.getContext("2d")!; const g = c.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, "#EAF1E8"); g.addColorStop(1, "#C9DCCB"); c.fillStyle = g; c.fillRect(0, 0, 240, 300);
  const a = Social.profile.avatar, s = 5.6 * (PORTRAIT_SCALE[a.age] ?? 1); c.save(); c.translate(120, 276); c.scale(s, s); drawChar(c, 0, 0, { ...toLook(a, 11), dir: "down", moving: false, walk: 0, tag: false }, 0); c.restore(); return cv.toDataURL("image/jpeg", 0.8);
}

/* ---------------- the panel ---------------- */
let root: HTMLElement | null = null;
export function openLocker(id: number, onClose: () => void) {
  if (!styled) { styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }
  root ??= E("div", "lk", document.body); const R = root; R.innerHTML = ""; R.classList.add("show"); R.onkeydown = (e) => e.stopPropagation(); R.onpointerdown = (e) => e.stopPropagation();
  const P = E("div", "lk-p", R), H = E("div", "lk-h", P), body = E("div", "lk-body", P); let tab = "Inside";
  const close = () => { R.classList.remove("show"); R.innerHTML = ""; onClose(); };
  const sl = slot(id);
  const h2 = E("h2", "", H); const cb = E("button", "lk-b", H, "Close"); cb.onclick = close; R.onclick = (e) => { if (e.target === R) close(); };
  void sl;
  const draw = () => {
    body.innerHTML = ""; P.querySelector(".lk-tabs")?.remove();
    const cur = Lockers.owner(id); h2.textContent = `Locker ${id}${cur?.kind === "mine" ? " (yours)" : cur?.kind === "npc" ? ` · ${cur.npc.first}'s` : " · open"}`;
    if (!cur) {                                                           // open locker
      const b = E("div", "lk-big", body); E("p", "", b, "This locker is open. Claim it to keep pictures, stickers and your report card inside.");
      E("p", "", b, Lockers.mine != null ? `You already have locker ${Lockers.mine}. Claiming this one moves your things here.` : "Pick it and it's yours.");
      const c = E("button", "lk-b go", b, Lockers.mine != null ? "Move my locker here" : "Claim this locker"); c.onclick = () => { Lockers.claim(id); draw(); }; return;
    }
    if (cur.kind === "npc") {                                             // peek at a classmate's locker
      const d = npcLocker(cur.npc); const wrap = E("div", "lk-in", body); const door = E("div", "lk-door", wrap); door.style.background = `linear-gradient(${d.theme},${d.theme})`;
      d.stickers.forEach((s, i) => { const e = E("div", "lk-st", door, s); e.style.setProperty("--r", rot(i + 3)); }); E("div", "lk-note", door, d.note);
      const side = E("div", "lk-side", wrap); E("div", "lk-lab", side, "Locker of"); E("b", "", side, `${cur.npc.name} (${cur.npc.grade})`); E("div", "", side, cur.npc.bio); E("div", "lk-lab", side, "Locker manners"); E("div", "", side, "You can look but not touch. Only the owner opens a locker.");
      return;
    }
    const tabs = E("div", "lk-tabs"); P.insertBefore(tabs, body); for (const t of ["Inside", "Grades", "Report"]) { const b = E("button", "lk-b" + (t === tab ? " on" : ""), tabs, t); b.onclick = () => { tab = t; draw(); }; }
    if (tab === "Inside") inside(body, draw); else if (tab === "Grades") grades(body); else report(body);
  };
  draw();
}
function inside(body: HTMLElement, redraw: () => void) {
  const d = Lockers.data()!, wrap = E("div", "lk-in", body), door = E("div", "lk-door", wrap); door.style.background = d.theme;
  { // collected decorations: wallpaper, string lights, magnets and a name plate
    const wl = Cosm.eq("wall"); if (wl?.color) door.style.background = wl.color;
    const lt = Cosm.eq("light"); if (lt) { const row = E("div", "", door); row.style.cssText = "position:absolute;left:6px;right:6px;top:2px;display:flex;justify-content:space-around;pointer-events:none;z-index:2"; for (let i = 0; i < 9; i++) { const b = E("i", "", row); const col = lt.color === "rainbow" ? ["#f26b5b", "#ffd23f", "#7bd389", "#6aa9f0", "#b8a8da"][i % 5] : (lt.color ?? "#ffd98a"); b.style.cssText = `width:9px;height:9px;border-radius:50%;background:${col};box-shadow:0 0 8px 3px ${col};margin-top:${i % 2 ? 6 : 0}px;animation:lkTw ${1.2 + (i % 4) * 0.35}s ease-in-out ${i * 0.15}s infinite alternate`; } if (!document.getElementById("lkTw")) { const st = document.createElement("style"); st.id = "lkTw"; st.textContent = "@keyframes lkTw{from{opacity:.45}to{opacity:1}}"; document.head.appendChild(st); } }
    Cosm.magnets().forEach((m, i) => { const e = E("div", "lk-st", door, m.art); e.style.setProperty("--r", rot(i + 9)); e.style.fontSize = "30px"; });
    const pl = Cosm.eq("plate"); if (pl) { const n = E("div", "", door, Social.profile.name || "Me"); n.style.cssText = `position:absolute;left:50%;bottom:6px;transform:translateX(-50%);background:${pl.color};color:#fff;font-weight:700;padding:2px 12px;border-radius:6px;font-size:13px;box-shadow:0 2px 0 rgba(0,0,0,.3);z-index:2`; }
  }
  d.pics.forEach((p, i) => { const f = E("div", "lk-pic", door); f.style.setProperty("--r", rot(i)); E("i", "", f); const im = E("img", "", f) as HTMLImageElement; im.src = p.src; im.alt = p.cap || "Locker photo"; const t = E("input", "", f) as HTMLInputElement; t.value = p.cap; t.maxLength = 28; t.placeholder = "Add a caption"; t.onchange = () => Lockers.edit((x) => { x.pics[i].cap = t.value; });
    const x = E("button", "lk-x", f, "×"); x.setAttribute("aria-label", "Remove photo"); x.onclick = () => { Lockers.edit((q) => { q.pics.splice(i, 1); }); redraw(); }; });
  d.stickers.forEach((s, i) => { const e = E("button", "lk-st", door, s); e.style.cssText += ";background:none;border:0;cursor:pointer"; e.style.setProperty("--r", rot(i + 5)); e.title = "Tap to remove"; e.onclick = () => { Lockers.edit((q) => { q.stickers.splice(i, 1); }); redraw(); }; });
  if (d.note) E("div", "lk-note", door, d.note); if (!d.pics.length && !d.stickers.length && !d.note) E("div", "", door, "Your locker is empty. Add a photo, a sticker or a note!").style.color = "#fff";
  const side = E("div", "lk-side", wrap); const msg = E("div", "", side); msg.style.cssText = "font-size:13px;color:#a24a3c;min-height:16px";
  E("div", "lk-lab", side, "Photos"); const r1 = E("div", "lk-row", side);
  const add = E("button", "lk-b", r1, "Add a photo"), cam = E("button", "lk-b", r1, "Take a photo"), me = E("button", "lk-b", r1, "My avatar");
  const mk = (capture: boolean) => { const f = E("input", "", side) as HTMLInputElement; f.type = "file"; f.accept = "image/*"; if (capture) f.setAttribute("capture", "user"); f.hidden = true; f.onchange = async () => { const file = f.files?.[0]; f.value = ""; if (!file) return; try { const src = await fileToJpeg(file); if (d.pics.length >= 9) { msg.textContent = "The locker is full. Remove a photo first."; return; } if (!Lockers.edit((q) => { q.pics.push({ src, cap: "", at: Date.now() }); })) msg.textContent = "Couldn't save that photo (storage is full). Remove one first."; else redraw(); } catch (e) { msg.textContent = (e as Error).message; } }; return f; };
  const f1 = mk(false), f2 = mk(true); add.onclick = () => f1.click(); cam.onclick = () => f2.click();
  me.onclick = () => { if (d.pics.length >= 9) { msg.textContent = "The locker is full. Remove a photo first."; return; } Lockers.edit((q) => { q.pics.push({ src: avatarPhoto(), cap: Social.profile.name || "Me", at: Date.now() }); }); redraw(); };
  E("div", "", side, "Photos stay on this device. Don't post pictures with names, addresses or your school.").style.cssText = "font-size:12px;color:var(--soft,#8A7A70)";
  E("div", "lk-lab", side, "Stickers (tap one on the door to remove)"); const r2 = E("div", "lk-row", side); STICKERS.forEach((s) => { const b = E("button", "lk-em", r2, s); b.onclick = () => { if (d.stickers.length < 14) { Lockers.edit((q) => { q.stickers.push(s); }); redraw(); } }; });
  E("div", "lk-lab", side, "Door colour"); const r3 = E("div", "lk-row", side); THEMES.forEach((c) => { const b = E("button", "lk-sw" + (c === d.theme ? " on" : ""), r3); b.style.background = c; b.setAttribute("aria-label", "Colour " + c); b.onclick = () => { Lockers.edit((q) => { q.theme = c; }); redraw(); }; });
  E("div", "lk-lab", side, "Sticky note"); const ta = E("textarea", "lk-ta", side) as HTMLTextAreaElement; ta.maxLength = 140; ta.value = d.note; ta.placeholder = "A note to your future self"; ta.onchange = () => { Lockers.edit((q) => { q.note = ta.value.trim().slice(0, 140); }); redraw(); };
  const dec = E("button", "lk-b", side, "🎨 Decorate with my collection"); dec.onclick = () => { openHub({ onClose: () => redraw() }, "Collection"); };
  const rel = E("button", "lk-b", side, "Give this locker back"); rel.onclick = () => { if (confirm("Give this locker back? Your photos and stickers will be removed.")) { Lockers.release(); redraw(); } };
}
function grades(body: HTMLElement) {
  const gr = gradesNow(), t = E("table", "lk-tab", body), hd = E("tr", "", t); ["Class", "Lessons", "Labs", "Grade"].forEach((h) => E("th", "", hd, h));
  for (const g of gr) { const r = E("tr", "", t); E("td", "", r, SUBJECT_NAME[g.subject]); const c = E("td", "", r); E("div", "", c, `${g.done} of ${g.total}${g.extras ? ` · ${g.extras} extra` : ""}`); const bar = E("div", "lk-bar", c); E("i", "", bar).style.width = `${Math.round((g.done / Math.max(1, g.total)) * 100)}%`; E("td", "", r, g.labPct == null ? "none yet" : `${Math.round(g.labPct * 100)}% (${g.labQ} questions)`); const gt = E("td", "", r); const b = E("span", "lk-gr", gt, g.letter); b.style.color = g.letter === "A" ? "#2f7a4c" : g.letter === "B" ? "#3b6ea8" : g.letter === "—" ? "#8a7a70" : "#c4463c"; }
  const m = gr.filter((g) => g.mastery != null) as (Grade & { mastery: number })[]; const p = E("p", "", body, m.length ? `Overall: ${letterOf(m.reduce((a, g) => a + g.mastery, 0) / m.length)} across ${m.length} class${m.length === 1 ? "" : "es"}.` : "Take a class to see your first grade."); p.style.marginTop = "10px";
  const n = E("p", "", body, "Grade = 70% lab accuracy + 30% lesson progress. Finish lessons and do the labs to raise it."); n.style.cssText = "font-size:13px;color:var(--soft,#8A7A70)";
}
function report(body: HTMLElement) {
  const gr = gradesNow(), p = Social.profile, a = Progress.assessment(), r = E("div", "lk-rep", body);
  E("h3", "", r, "UNIFY Academy report card"); E("p", "", r, `Student: ${p.name || "Student"}`); E("p", "", r, `Date: ${dayKey()}`);
  if (a) E("p", "", r, `Starting points (age ${a.age}): ${Object.entries(a.levels).map(([k, v]) => `${SUBJECT_NAME[k as Subject]} level ${v}`).join(", ")}`);
  for (const g of gr) { E("h3", "", r, `${SUBJECT_NAME[g.subject]}: ${g.letter}`); E("p", "", r, comment(g)); }
  const row = E("div", "lk-row", body); row.style.marginTop = "10px";
  const cp = E("button", "lk-b", row, "Copy report"); cp.onclick = async () => { try { await navigator.clipboard.writeText(reportText()); cp.textContent = "Copied!"; } catch { cp.textContent = "Couldn't copy"; } };
  const dl = E("button", "lk-b", row, "Download as text"); dl.onclick = () => { const u = URL.createObjectURL(new Blob([reportText()], { type: "text/plain" })), a2 = E("a", "", document.body); (a2 as HTMLAnchorElement).href = u; (a2 as HTMLAnchorElement).download = "report-card.txt"; a2.click(); a2.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); };
}
export type { LockerData };
