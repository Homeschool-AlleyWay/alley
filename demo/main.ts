import { createSchoolGame } from "../src/game/SchoolGame";
import { VIRTUAL_INPUT, type AuditoriumScene } from "../src/game/scenes/AuditoriumScene";
createSchoolGame(document.getElementById("game")!);
const sc = () => (window as any).__unify as AuditoriumScene | undefined;
const held: Record<string, boolean> = {};
const upd = () => { VIRTUAL_INPUT.x = (held.r ? 1 : 0) - (held.l ? 1 : 0); VIRTUAL_INPUT.y = (held.d ? 1 : 0) - (held.u ? 1 : 0); };
document.querySelectorAll<HTMLElement>("[data-k]").forEach((b) => { const k = b.dataset.k!; b.addEventListener("pointerdown", () => { held[k] = true; upd(); });
  ["pointerup", "pointerleave", "pointercancel"].forEach((e) => b.addEventListener(e, () => { held[k] = false; upd(); })); });
const on = (id: string, fn: (s: AuditoriumScene) => void) => document.getElementById(id)?.addEventListener("click", () => { const s = sc(); if (s) fn(s); });
on("v-toggle", (s) => s.toggleView()); on("v-free", (s) => s.toggleFreeLook());
on("f-teacher", (s) => s.focus("teacher")); on("f-board", (s) => s.focus("board")); on("f-screen", (s) => s.focus("screen")); on("f-room", (s) => s.focus("room"));
document.querySelectorAll<HTMLElement>("[data-lesson]").forEach((b) => b.addEventListener("click", () => sc()?.startLesson(b.dataset.lesson as any)));
const mark = (id: string, active: boolean) => document.getElementById(id)?.classList.toggle("on", active);
setInterval(() => { const s = sc(); if (!s) return; const st = s.camState();
  (document.getElementById("v-toggle") as HTMLElement).textContent = st.view === "seat" ? "View: Seat (1st)" : "View: Overview (2nd)";
  mark("v-free", st.freeLook); (["teacher", "board", "screen", "room"] as const).forEach((t) => mark("f-" + t, st.focus === t && !st.freeLook)); }, 200);

/* ---- academy integration: start a lesson from ?subject= or from the parent shell via postMessage ---- */
const SUBJECTS = ["math", "ela", "science", "history"];
let wanted: string | null = new URLSearchParams(location.search).get("subject");
let ready = false;
const tryStart = () => { const s = sc(); if (!s || !s.player || !wanted) return; if (!SUBJECTS.includes(wanted)) { wanted = null; return; }
  const subj = wanted; wanted = null; void s.startLesson(subj as any); };
addEventListener("message", (e) => { const d = e.data; if (d && d.type === "unify:lesson" && SUBJECTS.includes(d.subject)) { wanted = d.subject; if (ready) tryStart(); } });
const wait = setInterval(() => { const s = sc(); if (s && s.player) { ready = true; clearInterval(wait);
  parent !== window && parent.postMessage({ type: "unify:auditorium-ready" }, "*"); tryStart(); } }, 100);
