import { Classroom3D, type CamMode } from "../src/class3d/Classroom3D";
import { Director } from "../src/class3d/director";
import { ALL_LESSONS, todaysLesson, type LessonDef } from "../src/class3d/curriculum";
import { ClassroomLife } from "../src/game/classroom";
import { ChatPanel, Journal } from "../src/hall3d/chatui";
import { AvatarCreator } from "../src/hall3d/avatarui";
import { Social } from "../src/hall3d/social";
import { toLook } from "../src/hall3d/avatar";
import { TEACHER_BY_SUBJECT } from "../src/hall3d/roster";
import { openLab as openLabUI } from "../src/class3d/labs";
import { Schedule } from "../src/academy/schedule";
import type { Subject } from "../src/game/types";

const $ = (id: string) => document.getElementById(id)!;
const params = new URLSearchParams(location.search);
const SUBJECTS: Subject[] = ["math", "ela", "science", "history"];
const room = new Classroom3D($("game")); (window as any).__room = room;
const chat = new ChatPanel(document.body), journal = new Journal(document.body), creator = new AvatarCreator(document.body);
let lesson: LessonDef = todaysLesson("math"), subject: Subject = "math";

/* ---- paper grain overlay (same as the hallway) ---- */
(() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d")!, d = x.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = 226 + Math.random() * 29; d.data[i] = v; d.data[i + 1] = v * 0.965; d.data[i + 2] = v * 0.9; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); $("paper").style.backgroundImage = `url(${c.toDataURL()})`; })();

/* ---- teacher questions, hand raising and memory (shared with the Phaser auditorium) ---- */
const life = new ClassroomLife({
  seated: () => room.seatedDefs(), setHand: (id, up) => room.setHand(id, up), playerHand: (up) => room.setPlayerHand(up),
  playerSeated: () => true, playerLook: () => ({ ...toLook(Social.profile.avatar, 11), tag: false }),
}, document.body); life.auto = false; (window as any).__life = life;
life.onState = (st) => { $("bHand").classList.toggle("on", st.handUp); $("bHand").textContent = st.handUp ? "Hand up" : "Raise hand (H)"; };
$("bHand").onclick = () => life.raiseHand();

/* ---- captions + steps ---- */
let capT = 0;
const cap = $("cap");
const ui = {
  caption(who: string, text: string, ms: number) { cap.innerHTML = ""; const b = document.createElement("b"); b.textContent = who + ":"; cap.append(b, document.createTextNode(" " + text)); cap.classList.add("show"); clearTimeout(capT); capT = window.setTimeout(() => cap.classList.remove("show"), ms + 400); },
  clearCaption() { clearTimeout(capT); cap.classList.remove("show"); },
  step(label: string, i: number, n: number) { $("steps").textContent = `Step ${i} of ${n}: ${label}`; },
  labReady(_l: LessonDef["lab"]) { $("bLab").classList.add("on"); },
  async ask(kind: "teacher" | "npc") { await life.askNow(kind); },
  setTitle(t: string) { $("ltitle").textContent = t; },
  /** the 15 minute break: one per lesson, skippable */
  breakTime(): Promise<void> {
    if (Schedule.breakUsed(subject)) return Promise.resolve(); Schedule.useBreak(subject);
    return new Promise((res) => {
      const box = $("brk"), left = $("brkLeft"); let secs = 15 * 60, timer = 0; const fin = () => { clearInterval(timer); box.classList.remove("show"); res(); };
      const tick = () => { left.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`; if (secs-- <= 0) fin(); }; tick(); timer = window.setInterval(tick, 1000); box.classList.add("show");
      ($("brkSkip") as HTMLButtonElement).onclick = fin; (window as any).__endBreak = fin;
    });
  },
  done() { const s = Social.profile.stats, dt = s.quizTotal - base.t, dr = s.quizRight - base.r; Schedule.complete(subject, dt > 0 ? dr / dt : 1); },
};
const director = new Director(room, ui); (window as any).__dir = director;

/* ---- the lesson is set by the class you walked into (today's lesson for that subject); students can't pick one ---- */
let base = { r: 0, t: 0 };
function start(s: Subject, att: number[] = []) {
  base = { r: Social.profile.stats.quizRight, t: Social.profile.stats.quizTotal }; Schedule.begin(s);
  subject = s; lesson = todaysLesson(s); $("subj").textContent = s === "ela" ? "ELA" : s[0].toUpperCase() + s.slice(1);
  room.assign(att); life.stop(); life.lesson = lesson; chat.close(); $("bLab").classList.remove("on"); room.auto = true; markCam("auto");
  void director.run(lesson); void life.start(s);
}
$("bSkip").onclick = () => director.skip();
$("bFriends").onclick = () => journal.toggle(); $("bAvatar").onclick = () => creator.show(); creator.onSave = () => room.rebuildPlayer(); Social.onChange(() => { try { room.rebuildPlayer(); } catch { /* not ready */ } });

/* ---- camera buttons ---- */
const camBtns = Array.from(document.querySelectorAll<HTMLElement>("[data-cam]"));
function markCam(k: string) { camBtns.forEach((b) => b.classList.toggle("on", b.dataset.cam === k)); }
camBtns.forEach((b) => b.addEventListener("click", () => { const k = b.dataset.cam!; if (k === "auto") { room.auto = true; room.setMode("follow"); } else room.setMode(k as CamMode, true); markCam(k); }));
addEventListener("keydown", (e) => { if ((e.target as HTMLElement)?.tagName === "INPUT") return; const k = e.key.toLowerCase(); if (k === "n") director.skip(); });

/* ---- people ---- */
room.onTapStudent = (d) => { if (!chat.isOpen) chat.open(d, { place: "class", kind: "class", period: lesson.title, clock: "" }); };
room.onTapTeacher = () => { life.raiseHand(); };
room.onHover = (label, x, y) => { const t = $("tip"); if (!label) { t.style.display = "none"; return; } t.textContent = label; t.style.display = "block"; t.style.left = x + 14 + "px"; t.style.top = y + 14 + "px"; };
const openLab = () => { if ($("labHost").classList.contains("show")) return; room.inputLocked = true; openLabUI($("labHost"), lesson, room.seatedDefs(), () => { room.inputLocked = false; }); };
(window as any).__openLab = openLab;
room.onTapDemo = openLab; $("bLab").onclick = openLab;

/* ---- shell integration ---- */
let wanted: string | null = params.get("subject"), wantedAtt: number[] = [];
addEventListener("message", (e) => { const d = e.data; if (d && d.type === "unify:lesson" && SUBJECTS.includes(d.subject)) start(d.subject, Array.isArray(d.attendees) ? d.attendees.filter((x: any) => Number.isInteger(x)) : []); else if (d && d.type === "unify:exit") { director.stop(); life.stop(); } });
start(SUBJECTS.includes(wanted as Subject) ? (wanted as Subject) : "math");
parent !== window && parent.postMessage({ type: "unify:auditorium-ready" }, "*");
void ALL_LESSONS; void TEACHER_BY_SUBJECT;
import { VIDEO_BY_ID } from "../src/class3d/videos"; (window as any).__vids = VIDEO_BY_ID;
(window as any).__labs = { open: (id: string, cfg?: string) => { const l = ALL_LESSONS.find((x) => x.lab.id === id && (!cfg || x.lab.cfg === cfg))!; openLabUI($("labHost"), l, room.seatedDefs(), () => {}); return l.title; } };
(window as any).__ui = ui;
