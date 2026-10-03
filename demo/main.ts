import { createSchoolGame } from "../src/game/SchoolGame";
import { VIRTUAL_INPUT, type AuditoriumScene } from "../src/game/scenes/AuditoriumScene";
import { setOutline } from "../src/hall3d/rig";
import { ChatPanel, Journal } from "../src/hall3d/chatui";
import { AvatarCreator } from "../src/hall3d/avatarui";
import { ClassroomLife } from "../src/game/classroom";
import { Social } from "../src/hall3d/social";
import { toLook } from "../src/hall3d/avatar";
setOutline("#455057");                                        // same outline colour as the pre-baked auditorium art
createSchoolGame(document.getElementById("game")!);
const scAny = () => (window as any).__unify as AuditoriumScene | undefined;
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
  const subj = wanted; wanted = null; void s.startLesson(subj as any, wantedAtt); };
let wantedAtt: number[] = [];
addEventListener("message", (e) => { const d = e.data; if (d && d.type === "unify:lesson" && SUBJECTS.includes(d.subject)) { wanted = d.subject; wantedAtt = Array.isArray(d.attendees) ? d.attendees.filter((x: any) => Number.isInteger(x)) : []; if (ready) tryStart(); } });
const wait = setInterval(() => { const s = sc(); if (s && s.player) { ready = true; clearInterval(wait);
  parent !== window && parent.postMessage({ type: "unify:auditorium-ready" }, "*"); tryStart(); } }, 100);

/* ---- people: whisper to classmates, raise your hand, friends journal, avatar creator ---- */
const chat = new ChatPanel(document.body), journal = new Journal(document.body), creator = new AvatarCreator(document.body); (window as any).__ui = { chat, journal, creator };
const life = new ClassroomLife({
  seated: () => scAny()?.seatedDefs() ?? [], setHand: (id, up) => scAny()?.setNpcHand(id, up), playerHand: (up) => scAny()?.setPlayerHand(up),
  playerSeated: () => !!scAny()?.seated, playerLook: () => ({ ...toLook(Social.profile.avatar, 11), tag: false }),
}, document.body); (window as any).__life = life;
const handBtn = document.getElementById("b-hand")!;
life.onState = (st) => { handBtn.classList.toggle("on", st.handUp); handBtn.textContent = st.handUp ? "Hand up" : "Raise hand (H)"; const s = scAny(); if (s) s.ambientHands = !st.question; };
handBtn.addEventListener("click", () => life.raiseHand());
document.getElementById("b-friends")?.addEventListener("click", () => journal.toggle());
document.getElementById("b-avatar")?.addEventListener("click", () => creator.show());
creator.onSave = () => { scAny()?.bakePlayer(); };
Social.onChange(() => { try { scAny()?.bakePlayer(); } catch { /* scene not ready */ } });
const hookScene = setInterval(() => { const s = scAny(); if (!s || !s.events) return; clearInterval(hookScene);
  s.events.on("npc-tap", (def: any) => { if (!def || chat.isOpen || !s.seated) return; chat.open(def, { place: "class", kind: "class", period: "Class", clock: "" }); });
  s.events.on("lesson", (e: any) => { if (e.phase === "seated") void life.start(e.subject); else if (e.phase === "walking") { life.stop(); chat.close(); } }); }, 100);
