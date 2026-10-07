import { HallScene, GOTO } from "../src/hall3d/HallScene";
import { HallSocial } from "../src/hall3d/hallsocial";
import { AvatarCreator } from "../src/hall3d/avatarui";
import { Social } from "../src/hall3d/social";
import { PERIODS, clockStr } from "../src/hall3d/logic";
import { openTimes } from "../src/game/timesui";
import { Progress, ALL_SUBJECTS } from "../src/game/progress";
import { runPlacement } from "../src/game/placement";
import { openPic } from "../src/game/wallart";
import { openNewsPanel } from "../src/game/newstv";
import { CURRICULUM } from "../src/class3d/curriculum";
import { Lockers, lockerNear, slot as lockerSlot } from "../src/game/lockers";
import { openLocker } from "../src/hall3d/lockerui";
import { ACTIONS, EMOTES, GAITS } from "../src/hall3d/actions";
import { decay } from "../src/hall3d/relate";
import { loadTrends } from "../src/hall3d/trends";
import { byId } from "../src/hall3d/roster";
const $ = (id: string) => document.getElementById(id)!;
const hall = new HallScene($("game")); (window as any).__hall = hall;
hall.onToast = (m) => { const t = $("toast"); t.textContent = m; t.classList.toggle("show", !!m); clearTimeout((hall as any)._tt); if (m) (hall as any)._tt = setTimeout(() => t.classList.remove("show"), 3500); };
const social = new HallSocial(hall, document.body); (window as any).__social = social;
const creator = new AvatarCreator(document.body); (window as any).__creator = creator;
const lock = (on: boolean) => { hall.inputLocked = on; };
const askAssess = () => { if (Progress.assessOn && !Progress.assessment()) { lock(true); void runPlacement().then(() => lock(false)); } };
creator.onSave = (spec) => { hall.setAvatar(spec); lock(false); hall.onToast(`Looking good, ${spec.name}!`); setTimeout(askAssess, 400); };
creator.onCancel = () => lock(false);
$("bAvatar").onclick = () => { lock(true); creator.show(); };
$("bCloset").onclick = () => { lock(true); creator.show("Closet"); };
$("bFriends").onclick = () => social.journal.toggle();
const chip = $("talkChip"); social.onNearby = (p) => { chip.classList.toggle("show", !!p); if (p) chip.textContent = `Talk to ${p.def?.first} (T)`; };
chip.onclick = () => { if (social.nearby) social.talkTo(social.nearby); };
if (!Social.profile.hasAvatar) setTimeout(() => { lock(true); creator.show(); }, 600); else setTimeout(askAssess, 900);
$("bTake").onclick = () => { lock(true); void runPlacement().then((r) => { lock(false); if (r) hall.onToast("Starting points saved. Extra lessons are in each classroom."); }); };
const held: Record<string, boolean> = {};
const upd = () => { hall.input.x = (held.r ? 1 : 0) - (held.l ? 1 : 0); hall.input.y = (held.d ? 1 : 0) - (held.u ? 1 : 0); };
document.querySelectorAll<HTMLElement>("[data-k]").forEach((b) => { const k = b.dataset.k!; b.addEventListener("pointerdown", (e) => { e.preventDefault(); held[k] = true; upd(); }); ["pointerup", "pointerleave", "pointercancel"].forEach((e) => b.addEventListener(e, () => { held[k] = false; upd(); })); });
document.querySelectorAll<HTMLElement>("[data-rot]").forEach((b) => { const k = +b.dataset.rot!; b.addEventListener("pointerdown", (e) => { e.preventDefault(); hall.rotate = k; }); ["pointerup", "pointerleave", "pointercancel"].forEach((e) => b.addEventListener(e, () => { hall.rotate = 0; })); });
const menu = $("goMenu"), viewMenu = $("viewMenu"), meMenu = $("meMenu"), menus = [menu, viewMenu, meMenu];
const toggle = (m: HTMLElement) => { const open = !m.classList.contains("show"); menus.forEach((x) => x.classList.remove("show")); m.classList.toggle("show", open); };
$("bViewM").onclick = () => toggle(viewMenu); $("bMe").onclick = () => toggle(meMenu);
const times = () => { menus.forEach((x) => x.classList.remove("show")); lock(true); openTimes({ onGo: (s) => { lock(false); hall.goTo(s); } }); };
$("bTimes").onclick = times;
document.addEventListener("pointerdown", (e) => { if (!(e.target as HTMLElement).closest(".menu, #goMenu, #bGo, #bViewM, #bMe")) menus.forEach((x) => x.classList.remove("show")); });
menus.forEach((m) => m.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("button") && m !== menu) setTimeout(() => m.classList.remove("show"), 0); }));
addEventListener("unify:times-closed", () => lock(false));
const bchip = $("boardChip"); bchip.onclick = times;
addEventListener("keydown", (e) => { if ((e.key === "b" || e.key === "B") && !(e.target as HTMLElement)?.closest("input,textarea")) times(); });
setInterval(() => { const p = hall.player.pos, b = hall.boardPos; bchip.classList.toggle("show", Math.hypot(p.x - b.x, p.z - b.z) < 3.4 && p.z > b.z - 0.2); }, 250);
GOTO.forEach((g) => { const b = document.createElement("button"); b.innerHTML = `<i style="background:${g.color}"></i>${g.label}`; b.onclick = () => { menu.classList.remove("show"); hall.goTo(g.key); }; menu.appendChild(b); });
$("bGo").onclick = () => toggle(menu);
$("game").addEventListener("pointerdown", () => menu.classList.remove("show"));
$("bSpd").onclick = () => { hall.speed = hall.speed === 1 ? 4 : hall.speed === 4 ? 16 : 1; $("bSpd").textContent = `Speed x${hall.speed}`; };
const NAMES = { close: "Close-up", overview: "Overview", first: "First person" } as const;
$("bView").onclick = () => { const v = hall.cycleView(); $("bView").textContent = `View: ${NAMES[v]}`; };
setInterval(() => {
  const P = PERIODS[Math.max(0, hall.idx)]; $("clk").textContent = clockStr(hall.clock); $("per").textContent = P.name; ($("fill") as HTMLElement).style.width = `${((hall.clock - P.start) / P.len) * 100}%`;
  const seen = hall.students.filter((x) => !x.hidden).length; $("cnt").textContent = `${seen} in the hall, ${hall.students.length - seen} in class or away`;
  const [r, g, b, a] = hall.tint; ($("tint") as HTMLElement).style.background = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}, 200);
(() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d")!, d = x.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = 226 + Math.random() * 29; d.data[i] = v; d.data[i + 1] = v * 0.965; d.data[i + 2] = v * 0.9; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); x.lineCap = "round"; for (let i = 0; i < 260; i++) { x.strokeStyle = `rgba(255,250,240,${0.08 + Math.random() * 0.16})`; x.lineWidth = 0.6 + Math.random() * 0.5; const px = Math.random() * 256, py = Math.random() * 256, a = Math.random() * 6.28, l = 3 + Math.random() * 9; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  $("paper").style.backgroundImage = `url(${c.toDataURL()})`; })();

/* ---- lockers: a chip appears at any locker (open, a classmate's, or yours); L opens it; the Me menu finds yours or an open one ---- */
const lchip = $("lockerChip"); let nearLocker: number | null = null;
const syncMark = () => { const sl = Lockers.mine != null ? lockerSlot(Lockers.mine) ?? null : null; hall.setMyLocker(sl, Social.profile.name || "Mine"); };
syncMark(); Lockers.onChange(syncMark); Social.onChange(syncMark);
const openL = (id: number) => { lock(true); openLocker(id, () => lock(false)); };
setInterval(() => {
  const p = hall.player.pos, s = lockerNear(p.x + 28, p.z + 22); nearLocker = s ? s.id : null; lchip.classList.toggle("show", !!s && !hall.inputLocked);
  if (s) { const o = Lockers.owner(s.id); lchip.textContent = o?.kind === "mine" ? "Open your locker (L)" : o?.kind === "npc" ? `Peek at ${o.npc.first}'s locker (L)` : `Locker ${s.id} is open: look inside (L)`; }
}, 200);
lchip.onclick = () => { if (nearLocker != null) openL(nearLocker); };
addEventListener("keydown", (e) => { if ((e.key === "l" || e.key === "L") && !(e.target as HTMLElement)?.closest("input,textarea") && nearLocker != null && !hall.inputLocked) openL(nearLocker); });
$("bLocker").onclick = () => { if (Lockers.mine == null) { hall.onToast("You don't have a locker yet. Use Find an open locker."); return; } const sl = lockerSlot(Lockers.mine); if (sl) hall.goToSlot(sl); };
$("bOpenLocker").onclick = () => { const p = hall.player.pos, s = Lockers.nearestOpen(p.x + 28, p.z + 22); if (s) hall.goToSlot(s); };

/* ---- wall pictures and the news TV are tappable ---- */
hall.onPic = (pid, _title, subject) => { lock(true); const ls = (CURRICULUM as any)[subject] ?? [], cur = ls[Progress.index(subject as any, ls.length)]; openPic(pid, { lesson: cur?.title, onClose: () => lock(false) }); };
hall.onTV = () => { lock(true); openNewsPanel(() => lock(false), () => parent !== window && parent.postMessage({ type: "unify:open", view: "news" }, "*")); };

/* ---- the school day: ride the bus in, walk to the bulletin board, make the schedule, go inside (assembly, then first class); sit at Chat Chow when idle ---- */
const todayKey = () => new Date().toDateString();
const assemblyDone = () => { try { return localStorage.getItem("unify.assembly.day") === todayKey(); } catch { return false; } };
const firstClass = () => { let best: { s: string; m: number } | null = null; for (const s of ALL_SUBJECTS) { const m = Progress.pickedFor(s, false); if (m !== null && (!best || m < best.m)) best = { s, m }; } return best?.s ?? null; };
let afterStage: (() => void) | null = null, dayStarted = false, lastAct = Date.now();
const goFirst = () => { const s = firstClass(); if (s) hall.goTo(s); else hall.onToast("Pick a class time on the bulletin board by the front door."); };
const gotoNext = () => { if (!assemblyDone() && firstClass()) { afterStage = goFirst; hall.goTo("news"); } else goFirst(); };
const inside = () => hall.walkInside(gotoNext);
const atBoard = () => {
  const have = ALL_SUBJECTS.some((s) => Progress.pickedFor(s, false) !== null);
  if (have) { setTimeout(inside, 1600); return; }
  hall.onToast("Pick your class times on the bulletin board."); lock(true);
  const done = () => { removeEventListener("unify:times-closed", done); setTimeout(inside, 500); };
  addEventListener("unify:times-closed", done); openTimes({ onGo: () => { /* we walk in ourselves */ } });
};
const skip = document.createElement("button"); skip.textContent = "Skip arrival ▸"; skip.style.cssText = "position:fixed;right:12px;bottom:96px;z-index:50;display:none;font:inherit;font-size:14px;padding:6px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.7);background:#F3E7CF;color:#4A3B3F;box-shadow:0 2px 0 #C9B28A;cursor:pointer"; document.body.appendChild(skip); skip.onclick = () => hall.skipCine();
setInterval(() => { skip.style.display = hall.cine || (dayStarted && hall.inputLocked && !document.querySelector(".tmWrap.show, #creator.show") && hall.bus?.visible) ? "block" : "none"; }, 300);
const startDay = () => { if (dayStarted || new URLSearchParams(location.search).has("nobus")) return; dayStarted = true; setTimeout(() => hall.startArrival(atBoard), 400); };
if (Social.profile.hasAvatar) setTimeout(startDay, 1500); else creator.onSave = ((orig) => (spec, nm) => { orig(spec, nm); setTimeout(startDay, 1400); })(creator.onSave);
addEventListener("message", (e) => { const m = e.data; if (m && m.type === "unify:exit" && afterStage) { const f = afterStage; afterStage = null; setTimeout(f, 700); } });
["pointerdown", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, () => { lastAct = Date.now(); }, true));
setInterval(() => { if (dayStarted && !hall.inputLocked && !hall.walking && !hall.cine && hall.sitting == null && Date.now() - lastAct > 25000) hall.autoSit(); }, 2500);

/* ---- emotes and walking style: the player's own body language ---- */
(() => {
  const st = document.createElement("style"); st.textContent = `#emoBtn{position:fixed;right:12px;bottom:150px;z-index:46}#emoBtn,.emo button,.emo select{font:inherit;font-size:14px;color:#4A3B3F;background:#F3E7CF;border:1px solid rgba(255,255,255,.75);border-radius:12px;padding:6px 12px;min-height:38px;cursor:pointer;box-shadow:0 2px 0 #C9B28A,0 6px 10px rgba(80,50,40,.28);touch-action:manipulation}
.emo{position:fixed;right:12px;bottom:196px;z-index:47;width:min(330px,94vw);background:#F3E7CF;border-radius:16px;padding:10px;box-shadow:0 3px 0 #C9B28A,0 12px 26px rgba(60,40,30,.45);border:1px solid rgba(255,255,255,.8);display:none;font-family:'Fredoka','Trebuchet MS',system-ui,sans-serif}.emo.show{display:block}
.emo .g{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.emo .g button{padding:6px 4px;font-size:13px;min-height:44px}.emo .g button i{display:block;font-style:normal;font-size:20px;line-height:1.1}.emo .r{margin-top:8px;display:flex;gap:8px;align-items:center;font-size:13px;color:#4A3B3F}.emo select{flex:1;padding:6px}`; document.head.appendChild(st);
  const b = document.createElement("button"); b.id = "emoBtn"; b.textContent = "😄 Emotes"; document.body.appendChild(b);
  const panel = document.createElement("div"); panel.className = "emo"; document.body.appendChild(panel);
  const g = document.createElement("div"); g.className = "g"; panel.appendChild(g);
  for (const k of EMOTES) { const a = ACTIONS[k], x = document.createElement("button"); x.innerHTML = `<i>${a.icon}</i>${a.label}`; x.onclick = () => { hall.emote(k); }; g.appendChild(x); }
  const r = document.createElement("div"); r.className = "r"; r.innerHTML = "<span>Walk style</span>"; const sel = document.createElement("select"); for (const [k, v] of Object.entries(GAITS)) { const o = document.createElement("option"); o.value = k; o.textContent = v.name; sel.appendChild(o); }
  try { const sv = localStorage.getItem("unify.gait"); if (sv && GAITS[sv]) hall.setGait(sv); } catch { /* none */ } sel.value = hall.gait; sel.onchange = () => hall.setGait(sel.value); r.appendChild(sel); panel.appendChild(r);
  b.onclick = () => panel.classList.toggle("show");
  document.getElementById("game")!.addEventListener("pointerdown", () => panel.classList.remove("show"));
  addEventListener("keydown", (e) => { if ((e.target as HTMLElement)?.closest("input,textarea")) return; const i = "1234567890".indexOf(e.key); if (i >= 0 && !hall.inputLocked) hall.emote(EMOTES[i]); });
})();

/* ---- friendships: slow growth, fading if you never visit, a contact unlocks at 20 points; trending topics come from trends.json when present ---- */
decay(); void loadTrends();
addEventListener("unify:contact", (e) => { const id = (e as CustomEvent).detail?.id, n = byId(Number(id)); hall.onToast(`${n?.first ?? "A classmate"} is now in your phone contacts!`); });
