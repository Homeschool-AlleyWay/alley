/** Study group "video call": your avatar and three classmates in tiles, live chat, a shared whiteboard to draw and type on, and study partners who
 *  respond right away: they explain, quiz you, draw examples on the board, and push you deeper step by step (recall, why, apply, teach it back). */
import { ROSTER, type NpcDef } from "../hall3d/roster";
import { drawPortrait } from "../hall3d/chatui";
import { toLook } from "../hall3d/avatar";
import { Social, remember } from "../hall3d/social";
import { ALL_LESSONS, explainLesson, todaysLesson, type LessonDef } from "../class3d/curriculum";
import { Schedule } from "../academy/schedule";
import { knowProb } from "../game/classroom";
import { Library } from "./loans";
import { quizFor } from "../hall3d/quizbank";

const CSS = `.sg{display:grid;grid-template-columns:minmax(220px,260px) 1fr minmax(260px,320px);gap:10px;height:100%;min-height:560px;font-family:"Fredoka","Trebuchet MS",system-ui,sans-serif;color:#4A3B3F}
.sg .col{display:flex;flex-direction:column;gap:8px;min-height:0}.sg .pn{background:#F3E7CF;border-radius:12px;padding:8px;box-shadow:0 2px 0 #C9B28A;border:1px solid rgba(255,255,255,.7)}
.sg .tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sg .tile{position:relative;background:#26406b;border-radius:10px;overflow:hidden;border:3px solid transparent;aspect-ratio:4/3}.sg .tile.talk{border-color:#5FAE6A}.sg .tile canvas{width:100%;height:100%;display:block;background:linear-gradient(#cfe3ee,#b6cfc2)}
.sg .tile .nm{position:absolute;left:0;right:0;bottom:0;background:rgba(30,24,26,.65);color:#fff;font-size:11px;padding:2px 6px;display:flex;justify-content:space-between}.sg .tile .hand{position:absolute;top:4px;right:4px;background:#EAB94E;color:#4A3B3F;font-size:10px;border-radius:6px;padding:1px 6px;display:none}.sg .tile.up .hand{display:block}
.sg .ctl{display:flex;gap:6px;flex-wrap:wrap}.sg button,.sg select,.sg input[type=text]{font:inherit;font-size:13px;color:#4A3B3F}.sg .b{background:#FFF9F0;border:1px solid rgba(255,255,255,.8);border-radius:9px;padding:5px 10px;cursor:pointer;box-shadow:0 2px 0 #C9B28A;min-height:32px}.sg .b.on{background:#E07A66;color:#fff}.sg .b.pri{background:#E07A66;color:#fff;box-shadow:0 2px 0 #b95a48}.sg .b.off{background:#c4463c;color:#fff}.sg .b:focus-visible,.sg input:focus-visible,.sg select:focus-visible{outline:3px solid #4F91C7;outline-offset:2px}
.sg .board{background:#fff;border-radius:12px;box-shadow:0 3px 0 #C9B28A;border:3px solid #9DA7AA;display:block;width:100%;touch-action:none;cursor:crosshair;aspect-ratio:16/9}.sg .tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.sg .sw{width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px #888;cursor:pointer;padding:0}.sg .sw.on{box-shadow:0 0 0 3px #4F91C7}
.sg .chat{flex:1;min-height:200px;overflow:auto;display:flex;flex-direction:column;gap:6px;padding:4px}.sg .m{font-size:14px;line-height:1.35;background:#fff;border-radius:10px;padding:6px 10px;max-width:92%;align-self:flex-start}.sg .m.me{align-self:flex-end;background:#E3F0FA}.sg .m b{display:block;font-size:11px;color:#8A7A70}.sg .m.sys{background:transparent;color:#8A7A70;font-size:12px;align-self:center}
.sg .typing{font-size:12px;color:#8A7A70;min-height:16px}.sg form{display:flex;gap:6px}.sg form input{flex:1;padding:7px 9px;border:2px solid #C9B28A;border-radius:9px;background:#fff}.sg .opts{display:flex;flex-direction:column;gap:4px;margin-top:4px}.sg .opts button{text-align:left;background:#FFF9F0;border:2px solid #C9B28A;border-radius:8px;padding:4px 8px;cursor:pointer}
.sg .tag{position:absolute;pointer-events:none;font-size:11px;color:#fff;padding:1px 6px;border-radius:6px}.sg .wrap{position:relative}.sg .ti{position:absolute;display:none;z-index:3}.sg .ti input{width:200px;padding:4px 6px;border:2px solid #4F91C7;border-radius:6px}
.sg select{width:100%}@media(max-width:900px){.sg{grid-template-columns:1fr;height:auto}}`;
let cssOk = false; const ensureCss = () => { if (cssOk) return; cssOk = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
function el<K extends keyof HTMLElementTagNameMap>(t: K, c = "", p?: HTMLElement, x?: string) { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; p?.appendChild(e); return e; }
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const COLORS = ["#2a5fa8", "#c4463c", "#2f7a52", "#7a4fa8", "#4A3B3F"];
const NPC_COLORS = ["#c4463c", "#2f7a52", "#7a4fa8"];
interface Op { t: "line" | "text" | "erase"; pts?: number[][]; x?: number; y?: number; s?: string; c: string; w: number; who?: string }

/* ------------------------------------------------------------ what a partner draws for a lesson */
const W = 960, H = 540;
function circle(cx: number, cy: number, r: number, n = 40) { const a: number[][] = []; for (let i = 0; i <= n; i++) a.push([cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r]); return a; }
function planFor(l: LessonDef): Op[] {
  const c = "#c4463c", b = "#2a5fa8", g = "#2f7a52", ops: Op[] = [], line = (pts: number[][], col = b, w = 4) => ops.push({ t: "line", pts, c: col, w }), text = (x: number, y: number, s: string, col = c) => ops.push({ t: "text", x, y, s, c: col, w: 22 });
  text(40, 56, l.title, b); line([[40, 70], [40 + l.title.length * 13, 70]], "#EAB94E", 5);
  if (l.id === "parabola") { line([[120, 460], [840, 460]], "#4A3B3F", 3); line([[480, 120], [480, 500]], "#4A3B3F", 3); const pts: number[][] = []; for (let x = -4; x <= 4; x += 0.25) pts.push([480 + x * 70, 440 - x * x * 22]); line(pts, c, 5); line(circle(480, 440, 6, 12), b, 5); text(500, 430, "vertex (0, 0)", b); line([[480, 120], [480, 460]], g, 3); text(496, 150, "axis of symmetry", g); text(150, 200, "y = x²", c); }
  else if (l.id === "fractions") { line(circle(300, 300, 120), b, 5); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; line([[300, 300], [300 + Math.cos(a) * 120, 300 + Math.sin(a) * 120]], b, 3); } for (let i = 0; i < 3; i++) { const a0 = (i / 8) * Math.PI * 2 + 0.1, a1 = ((i + 1) / 8) * Math.PI * 2 - 0.1; for (let r = 20; r < 110; r += 18) { const arc: number[][] = []; for (let k = 0; k <= 8; k++) { const a = a0 + ((a1 - a0) * k) / 8; arc.push([300 + Math.cos(a) * r, 300 + Math.sin(a) * r]); } line(arc, c, 3); } } text(520, 230, "3 slices eaten out of 8", c); text(520, 280, "numerator = 3 (parts we have)", b); text(520, 330, "denominator = 8 (equal parts in all)", g); text(520, 400, "3/8", c); }
  else if (l.id === "cell") { line(circle(480, 300, 190, 60), g, 6); line(circle(420, 260, 55), b, 5); text(380, 262, "nucleus", b); line(circle(580, 330, 50, 24), c, 4); text(540, 335, "vacuole", c); line(circle(560, 220, 22, 20), g, 4); text(590, 218, "chloroplast", g); text(290, 130, "cell wall", g); line([[330, 140], [350, 175]], g, 3); }
  else if (l.id === "photosynthesis" || l.id === "photosynth") { line(circle(150, 150, 40, 30), "#EAB94E", 6); text(110, 230, "sunlight", "#b46a1a"); line([[200, 180], [420, 300]], "#EAB94E", 4); line([[480, 440], [480, 280]], g, 8); line(circle(480, 250, 50, 24), g, 5); text(560, 250, "leaf: chloroplasts", g); text(60, 480, "water + carbon dioxide + light  →  sugar + oxygen", c); }
  else if (l.id === "theme") { line([[100, 440], [250, 340], [420, 140], [640, 260], [860, 450]], b, 5); text(80, 480, "Beginning", g); text(380, 120, "Climax", c); text(780, 480, "Ending", g); text(300, 520, "What changes? That points to the theme.", b); }
  else if (l.id === "branches") { ["Legislative", "Executive", "Judicial"].forEach((n, i) => { const x = 140 + i * 280; line([[x, 180], [x + 220, 180], [x + 220, 280], [x, 280], [x, 180]], [b, g, c][i], 5); text(x + 20, 240, n, [b, g, c][i]); }); text(150, 330, "makes laws", b); text(430, 330, "carries out laws", g); text(710, 330, "explains laws", c); line([[250, 290], [450, 290]], "#4A3B3F", 2); line([[570, 290], [770, 290]], "#4A3B3F", 2); text(300, 420, "They check and balance each other.", c); }
  else if (l.id === "bill") { ["Idea", "Committee", "House + Senate", "President", "Law"].forEach((n, i) => { const x = 60 + i * 180; line([[x, 220], [x + 150, 220], [x + 150, 290], [x, 290], [x, 220]], b, 4); text(x + 10, 262, n, c); if (i < 4) line([[x + 152, 255], [x + 178, 255]], "#4A3B3F", 3); }); text(80, 400, "A bill must win a majority in both chambers.", g); }
  else { l.points.slice(0, 4).forEach((p, i) => { line(circle(70, 130 + i * 90, 8, 14), c, 5); text(100, 138 + i * 90, p.length > 62 ? p.slice(0, 60) + "..." : p, [b, c, g, "#7a4fa8"][i]); }); }
  return ops;
}

export class StudyGroup {
  private root!: HTMLElement; private lesson: LessonDef = todaysLesson("math"); private team: NpcDef[] = []; private chat!: HTMLElement; private typing!: HTMLElement; private cv!: HTMLCanvasElement; private ctx!: CanvasRenderingContext2D;
  private ops: Op[] = []; private tool: "pen" | "eraser" | "text" = "pen"; private color = COLORS[0]; private talkId = -1; private raf = 0; private tiles = new Map<number, { cv: HTMLCanvasElement; box: HTMLElement }>(); private inbox = 0; private poll = 0; private rot = 0;
  private sel: HTMLSelectElement | null = null; private depth = 0; private awaiting: { npc: NpcDef; depth: number; keys: string[]; tries: number } | null = null; private lastInk = 0; private reactT = 0; private busy = false; private bc: BroadcastChannel | null = null; private alive = false; private tag!: HTMLElement; private drawing = false; private cur: Op | null = null;
  constructor(public host: HTMLElement) {}
  leave() { this.alive = false; cancelAnimationFrame(this.raf); clearInterval(this.poll); this.bc?.close(); this.bc = null; }

  show(host: HTMLElement, _modalHost?: HTMLElement) {
    this.host = host; ensureCss(); this.leave(); this.alive = true; host.innerHTML = ""; const root = this.root = el("div", "sg", host); const lessonSubs = Schedule.day.signups.map((x) => x.subject), first = lessonSubs[0] ?? "math"; this.lesson = todaysLesson(first);
    const age = Social.profile.avatar?.age ?? "g68", pool = ROSTER.filter((d) => d.role !== "staff" && d.age === (age === "adult" ? "hs" : age)), mates = (pool.length >= 3 ? pool : ROSTER.filter((d) => d.role !== "staff"));
    const nerd = mates.filter((d) => d.personality === "nerdy" || d.personality === "curious")[0], others = mates.filter((d) => d !== nerd).sort(() => Math.random() - 0.5); this.team = [nerd ?? others[0], others[0], others[1]].filter((d, i, a) => d && a.indexOf(d) === i).slice(0, 3); while (this.team.length < 3) this.team.push(mates[this.team.length + 3]);
    // left: tiles + controls
    const L = el("div", "col", root), tiles = el("div", "tiles pn", L); const meTile = this.mkTile(tiles, -1, Social.profile.name || "You", "you");
    this.team.forEach((d) => this.mkTile(tiles, d.id, d.first, `Grade ${d.grade}`)); void meTile;
    const ctl = el("div", "ctl pn", L); const mic = el("button", "b", ctl, "Mic on"), cam = el("button", "b", ctl, "Camera on"), hand = el("button", "b", ctl, "Raise hand"), deep = el("button", "b pri", ctl, "Go deeper"); [mic, cam, hand, deep].forEach((b) => ((b as HTMLButtonElement).type = "button"));
    mic.onclick = () => { const off = mic.classList.toggle("off"); mic.textContent = off ? "Mic off" : "Mic on"; }; cam.onclick = () => { const off = cam.classList.toggle("off"); cam.textContent = off ? "Camera off" : "Camera on"; this.tiles.get(-1)?.box.classList.toggle("cam-off", off); };
    hand.onclick = () => { const up = hand.classList.toggle("on"); this.tiles.get(-1)!.box.classList.toggle("up", up); if (up) void this.npcSay(this.team[0], `Go ahead, ${Social.profile.name || "friend"}, what's your question?`); };
    deep.onclick = () => void this.goDeeper();
    const tp = el("div", "pn", L); el("label", "", tp, "Topic ").setAttribute("for", "sgTopic"); const sel = el("select", "", tp) as HTMLSelectElement; sel.id = "sgTopic"; ALL_LESSONS.forEach((l) => { const o = el("option", "", sel, `${l.subject.toUpperCase()}: ${l.title}`); o.value = `${l.subject}:${l.id}`; }); sel.value = `${this.lesson.subject}:${this.lesson.id}`;
    this.sel = sel; sel.onchange = () => { const [s, i] = sel.value.split(":"); this.lesson = ALL_LESSONS.find((x) => x.subject === s && x.id === i)!; this.depth = 0; this.awaiting = null; this.sys(`Topic: ${this.lesson.title}`); void this.npcSay(this.team[0], `Okay, ${this.lesson.title}. ${this.lesson.points[0]}. Want me to draw it on the board?`); };
    const leaveBtn = el("button", "b", L, "Leave call"); (leaveBtn as HTMLButtonElement).type = "button"; leaveBtn.onclick = () => { this.leave(); this.sys("You left the call."); host.dispatchEvent(new CustomEvent("sg-leave")); };
    // middle: board
    const M = el("div", "col", root), wrap = el("div", "wrap", M), cv = this.cv = el("canvas", "board", wrap) as HTMLCanvasElement; cv.width = W; cv.height = H; this.ctx = cv.getContext("2d")!; this.tag = el("div", "tag", wrap); this.tag.style.display = "none";
    const ti = el("div", "ti", wrap), tin = el("input", "", ti) as HTMLInputElement; tin.type = "text"; tin.placeholder = "Type, then Enter"; tin.setAttribute("aria-label", "Type on the board");
    const tools = el("div", "tools pn", M); const tb = (label: string, f: () => void, on?: () => boolean) => { const b = el("button", "b", tools, label); (b as HTMLButtonElement).type = "button"; b.onclick = () => { f(); refresh(); }; return [b, on] as const; };
    const tl = [tb("Pen", () => (this.tool = "pen"), () => this.tool === "pen"), tb("Type", () => (this.tool = "text"), () => this.tool === "text"), tb("Eraser", () => (this.tool = "eraser"), () => this.tool === "eraser")]; const refresh = () => tl.forEach(([b, on]) => b.classList.toggle("on", !!on?.()));
    COLORS.forEach((c, i) => { const s = el("button", "sw" + (i === 0 ? " on" : ""), tools); (s as HTMLButtonElement).type = "button"; s.style.background = c; s.setAttribute("aria-label", `Color ${i + 1}`); s.onclick = () => { this.color = c; tools.querySelectorAll(".sw").forEach((x) => x.classList.toggle("on", x === s)); this.tool = this.tool === "eraser" ? "pen" : this.tool; refresh(); }; });
    tb("Undo", () => { for (let i = this.ops.length - 1; i >= 0; i--) if (this.ops[i].who === "me") { this.ops.splice(i, 1); break; } this.redraw(); this.send({ k: "redo", ops: this.ops.filter((o) => o.who) }); }); tb("Clear board", () => { this.ops = []; this.redraw(); this.send({ k: "clear" }); });
    tb("Ask the group to draw it", () => void this.demo(this.team[0])); tb("Save board", () => { const a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = "study-board.png"; a.click(); }); refresh();
    this.bindBoard(cv, ti, tin);
    // right: chat
    const R = el("div", "col pn", root); el("b", "", R, "Group chat"); this.chat = el("div", "chat", R); this.typing = el("div", "typing", R); const f = el("form", "", R), inp = el("input", "", f) as HTMLInputElement; inp.type = "text"; inp.placeholder = "Say something to the group"; inp.maxLength = 300; inp.setAttribute("aria-label", "Chat message"); const go = el("button", "b pri", f, "Send"); (go as HTMLButtonElement).type = "submit";
    f.onsubmit = (e) => { e.preventDefault(); const v = inp.value.trim(); if (!v) return; inp.value = ""; this.userSay(v); };
    this.sys(`Study group: ${this.lesson.title}. Type, draw, or press Go deeper.`); this.redraw();
    // other windows on the same device join the same room
    try { this.bc = new BroadcastChannel("unify-study"); this.bc.onmessage = (e) => this.recv(e.data); } catch { /* not supported */ }
    this.inbox = (() => { try { return JSON.parse(localStorage.getItem("unify.group.inbox.v1") || "[]").length; } catch { return 0; } })();
    this.poll = window.setInterval(() => this.checkInbox(), 3000); this.loop();
    const mate = this.team[0]; setTimeout(() => this.alive && void this.npcSay(mate, `Hi ${Social.profile.name || "there"}! I'm ${mate.first}. We're on ${this.lesson.title}. ${this.lesson.points[0]}.`), 700);
    setTimeout(() => this.alive && void this.npcSay(this.team[1], "I'll put an example on the board. Tell me if it makes sense."), 4200); setTimeout(() => this.alive && void this.demo(this.team[1]), 6200);
  }

  /* ------------------------------------------------------------ tiles */
  private mkTile(host: HTMLElement, id: number, name: string, sub: string) { const box = el("div", "tile", host), cv = el("canvas", "", box) as HTMLCanvasElement; cv.width = 160; cv.height = 120; const nm = el("div", "nm", box); el("span", "", nm, name); el("span", "", nm, sub); el("div", "hand", box, "Hand up"); this.tiles.set(id, { cv, box }); return box; }
  private loop = () => {
    if (!this.alive) return; const now = performance.now(); if (now - (this as any)._lt > 66 || !(this as any)._lt) { (this as any)._lt = now;
      for (const [id, t] of this.tiles) { const look = id === -1 ? { ...toLook(Social.profile.avatar, 11), tag: false } : this.team.find((d) => d.id === id)!.look, talking = id === this.talkId; t.box.classList.toggle("talk", talking); if (t.box.classList.contains("cam-off")) { const c = t.cv.getContext("2d")!; c.fillStyle = "#26406b"; c.fillRect(0, 0, 160, 120); continue; } drawPortrait(t.cv, look as any, now / 1000, talking ? 0.4 + 0.6 * Math.abs(Math.sin(now / 80)) : 0, 2.0); }
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /* ------------------------------------------------------------ chat */
  private msg(who: string, text: string, me = false) { const m = el("div", "m" + (me ? " me" : ""), this.chat); el("b", "", m, who); m.appendChild(document.createTextNode(text)); this.chat.scrollTop = this.chat.scrollHeight; return m; }
  private sys(t: string) { el("div", "m sys", this.chat, t); this.chat.scrollTop = this.chat.scrollHeight; }
  private async npcSay(npc: NpcDef, text: string, opts?: { options?: { label: string; on: () => void }[]; delay?: number }) {
    this.typing.textContent = `${npc.first} is typing...`; await sleep(opts?.delay ?? 500 + Math.min(1400, text.length * 14)); if (!this.alive) return; this.typing.textContent = ""; this.talkId = npc.id; const m = this.msg(npc.first, text); setTimeout(() => { if (this.talkId === npc.id) this.talkId = -1; }, 900 + text.length * 25);
    if (opts?.options) { const o = el("div", "opts", m); opts.options.forEach((x) => { const b = el("button", "", o, x.label); b.type = "button"; b.onclick = () => { o.remove(); x.on(); }; }); }
    this.send({ k: "chat", who: npc.first, text }); remember(npc.id, "npc", text); Social.edit(npc.id, (mm) => { mm.met = true; });
  }
  private best(subject = this.lesson.subject): NpcDef { return [...this.team].sort((a, b) => knowProb(b, subject as any) - knowProb(a, subject as any))[0]; }
  private userSay(text: string) { this.msg(Social.profile.name || "You", text, true); this.talkId = -1; this.send({ k: "chat", who: Social.profile.name || "You", text }); this.tiles.get(-1)!.box.classList.remove("up"); void this.respond(text); }
  private mentioned(text: string) { return this.team.find((d) => new RegExp(`\\b${d.first}\\b`, "i").test(text)); }
  private async respond(text: string) {
    if (this.busy) return; this.busy = true; try {
      const L = this.lesson, t = text.toLowerCase(), who = this.mentioned(text) ?? this.best(); this.team.forEach((d) => remember(d.id, "me", text));
      if (this.awaiting) { await this.judge(text); return; }
      const hit = ALL_LESSONS.find((x) => x !== L && Object.keys(x.glossary).some((k) => t.includes(k))); if (hit && !Object.keys(L.glossary).some((k) => t.includes(k))) { this.lesson = hit; this.depth = 0; if (this.sel) this.sel.value = `${hit.subject}:${hit.id}`; this.sys(`Topic changed to ${hit.title}`); await this.npcSay(this.best(hit.subject), `That's from ${hit.title}.`, { delay: 400 }); await this.respond2(text); return; }
      if (/\b(quiz|test me|question me|practice)\b/.test(t)) { await this.quiz(who); return; }
      if (/\b(draw|show me|board|sketch|diagram)\b/.test(t)) { await this.npcSay(who, "Sure, watch the board."); await this.demo(who); return; }
      if (/\b(deeper|harder|more)\b/.test(t)) { await this.goDeeper(); return; }
      if (/\b(thanks|thank you)\b/.test(t)) { await this.npcSay(who, "Anytime! Teaching it to each other is the best way to learn it."); return; }
      if (/\b(hi|hello|hey)\b/.test(t) && t.length < 20) { await this.npcSay(who, `Hey ${Social.profile.name || "there"}! Ready to dig into ${L.title}?`); return; }
      await this.respond2(text);
    } finally { this.busy = false; }
  }
  private async respond2(text: string) {
    { const L = this.lesson, t = text.toLowerCase(), who = this.mentioned(text) ?? this.best();
      const exp = explainLesson(L, text, this.rot++); if (exp) { await this.npcSay(who, exp); const other = this.team.find((d) => d !== who)!; await sleep(500); await this.npcSay(other, Math.random() < 0.5 ? `To add to that: ${L.examples[this.rot % L.examples.length]}` : "Does that make sense, or should I draw it?", { options: [{ label: "Draw it", on: () => void this.demo(other) }, { label: "Got it", on: () => void this.goDeeper() }] }); return; }
      if (/\?$/.test(t.trim()) || /\b(what|why|how|explain)\b/.test(t)) { const w = /\bwhy\b/.test(t) ? L.whys[this.rot++ % L.whys.length] : /\bhow\b/.test(t) ? L.points[this.rot++ % L.points.length] : L.points[this.rot++ % L.points.length]; await this.npcSay(who, w); await this.npcSay(this.team.find((d) => d !== who)!, "Good question. Let's try an example."); await this.npcSay(who, L.examples[this.rot % L.examples.length]); return; }
      await this.npcSay(who, `${Math.random() < 0.5 ? "Interesting point" : "I see what you mean"}. ${L.points[this.rot++ % L.points.length]}.`); await sleep(300); await this.goDeeper(); }
  }

  /* ------------------------------------------------------------ going deeper: recall, why, apply, teach it back */
  private async goDeeper() {
    const L = this.lesson, d = Math.min(3, this.depth), npc = this.team[d % this.team.length], keys = Object.keys(L.glossary), k = keys[this.rot++ % keys.length]; this.depth = Math.min(4, this.depth + 1);
    const qs = [`In your own words, what is ${k === "axis" ? "the axis of symmetry" : k}?`, `Why does it work that way? ${L.whys[this.rot % L.whys.length].split(".")[0]} Can you explain the reason?`, `Apply it: make up a new example, different from ours, using ${k}.`, `Teach it back: explain ${L.title.toLowerCase()} to a fourth grader in two sentences.`, "Challenge: find a mistake someone could make with this, and say how to avoid it."][d];
    this.sys(`Level ${d + 1} of 5: ${["recall", "why", "apply", "teach it back", "challenge"][d]}`); await this.npcSay(npc, qs); this.awaiting = { npc, depth: d, keys: [k, ...keys.slice(0, 3)].map((x) => x.toLowerCase()), tries: 0 };
  }
  private async judge(text: string) {
    const a = this.awaiting!, L = this.lesson, pool = [L.points.join(" "), L.examples.join(" "), L.whys.join(" "), Object.values(L.glossary).join(" ")].join(" ").toLowerCase(), words = text.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter((w) => w.length > 3);
    const hits = words.filter((w) => pool.includes(w)).length, ok = hits >= (a.depth === 0 ? 2 : 3) || words.length >= 14 && hits >= 2; a.tries++;
    if (ok || a.tries >= 2) { this.awaiting = null; Social.profile.stats.quizTotal += 1; if (ok) Social.profile.stats.quizRight += 1; Social.save(); await this.npcSay(a.npc, ok ? `Nice. You used ${words.filter((w) => pool.includes(w)).slice(0, 3).join(", ")}, and that is the heart of it. ${L.points[this.rot++ % L.points.length]}.` : `Good effort. Here is how I would say it: ${L.glossary[a.keys[0]] ?? L.points[0]}`); await sleep(400); await this.npcSay(this.team[(a.depth + 1) % this.team.length], "Ready for the next level?", { options: [{ label: "Go deeper", on: () => void this.goDeeper() }, { label: "Draw an example", on: () => void this.demo(this.team[1]) }] }); }
    else await this.npcSay(a.npc, `Close. Try using the words from the lesson, like ${a.keys.slice(0, 2).join(" or ")}. One more try.`);
  }
  private async quiz(npc: NpcDef) {
    const q = quizFor(this.lesson.subject, (Social.profile.avatar?.age ?? "g68") as any); await this.npcSay(npc, `Quick one: ${q.q}`, { options: q.options.map((o, i) => ({ label: o, on: () => { const ok = i === q.answer; Social.profile.stats.quizTotal++; if (ok) Social.profile.stats.quizRight++; Social.save(); void this.npcSay(npc, ok ? `Yes. ${q.why ?? ""}` : `Not quite. The answer is ${q.options[q.answer]}. ${q.why ?? ""}`); } })) });
  }

  /* ------------------------------------------------------------ the shared board */
  private redraw() { const c = this.ctx; c.fillStyle = "#fff"; c.fillRect(0, 0, W, H); c.strokeStyle = "rgba(120,130,125,.12)"; c.lineWidth = 1; for (let x = 0; x < W; x += 48) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } for (const o of this.ops) this.paint(o); }
  private paint(o: Op, upTo = Infinity) { const c = this.ctx; c.lineCap = c.lineJoin = "round"; if (o.t === "line" && o.pts) { c.strokeStyle = o.c; c.lineWidth = o.w; c.beginPath(); o.pts.slice(0, upTo).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); } else if (o.t === "text") { c.fillStyle = o.c; c.font = `700 ${o.w}px "Comic Sans MS","Segoe Print",cursive`; c.fillText((o.s ?? "").slice(0, upTo), o.x!, o.y!); } else if (o.t === "erase" && o.pts) { c.strokeStyle = "#fff"; c.lineWidth = 26; c.beginPath(); o.pts.slice(0, upTo).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); } }
  private pos(e: PointerEvent) { const r = this.cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; }
  private bindBoard(cv: HTMLCanvasElement, ti: HTMLElement, tin: HTMLInputElement) {
    cv.addEventListener("pointerdown", (e) => { const [x, y] = this.pos(e); if (this.tool === "text") { ti.style.display = "block"; const r = cv.getBoundingClientRect(); ti.style.left = `${e.clientX - r.left}px`; ti.style.top = `${e.clientY - r.top}px`; tin.value = ""; tin.focus(); tin.onkeydown = (k) => { if (k.key === "Enter" && tin.value.trim()) { const o: Op = { t: "text", x, y: y + 8, s: tin.value.trim().slice(0, 80), c: this.color, w: 22, who: "me" }; this.ops.push(o); this.paint(o); this.send({ k: "op", op: o }); this.inked(o.s ?? ""); ti.style.display = "none"; } else if (k.key === "Escape") ti.style.display = "none"; }; return; }
      this.drawing = true; cv.setPointerCapture(e.pointerId); this.cur = { t: this.tool === "eraser" ? "erase" : "line", pts: [[x, y]], c: this.color, w: 4, who: "me" }; this.ops.push(this.cur); });
    cv.addEventListener("pointermove", (e) => { if (!this.drawing || !this.cur) return; const p = this.pos(e); this.cur.pts!.push(p); const n = this.cur.pts!.length; const c = this.ctx; c.lineCap = "round"; c.strokeStyle = this.cur.t === "erase" ? "#fff" : this.cur.c; c.lineWidth = this.cur.t === "erase" ? 26 : 4; c.beginPath(); c.moveTo(this.cur.pts![n - 2][0], this.cur.pts![n - 2][1]); c.lineTo(p[0], p[1]); c.stroke(); });
    const end = () => { if (!this.drawing || !this.cur) return; this.drawing = false; this.send({ k: "op", op: this.cur }); this.inked(""); this.cur = null; }; cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  }
  /** a partner draws a worked example, stroke by stroke, with a name tag following their pen */
  private async demo(npc: NpcDef) {
    const ops = planFor(this.lesson), col = NPC_COLORS[this.team.indexOf(npc) % 3]; this.talkId = npc.id; this.tag.style.display = "block"; this.tag.style.background = col; this.tag.textContent = npc.first;
    for (const base of ops) { if (!this.alive) return; const o: Op = { ...base, c: base.c, who: npc.first }; this.ops.push(o); const n = o.t === "text" ? (o.s ?? "").length : (o.pts?.length ?? 0), step = o.t === "text" ? 2 : Math.max(1, Math.ceil(n / 14));
      for (let i = step; i < n + step; i += step) { this.redraw(); this.paint(o, i); const pt = o.t === "text" ? [o.x! + Math.min(i, n) * 11, o.y! - 6] : o.pts![Math.min(i, n) - 1]; this.moveTag(pt[0], pt[1]); await sleep(o.t === "text" ? 45 : 28); } this.send({ k: "op", op: o }); }
    this.redraw(); this.tag.style.display = "none"; this.talkId = -1; await this.npcSay(npc, `That's my example for ${this.lesson.title}. Add your own, or press Go deeper.`);
  }
  private moveTag(x: number, y: number) { const r = this.cv.getBoundingClientRect(), w = this.cv.parentElement!.getBoundingClientRect(); this.tag.style.left = `${(x / W) * r.width + r.left - w.left + 8}px`; this.tag.style.top = `${(y / H) * r.height + r.top - w.top + 8}px`; }
  /** after you draw or type, a partner reacts */
  private inked(text: string) {
    this.lastInk = Date.now(); clearTimeout(this.reactT); this.reactT = window.setTimeout(async () => {
      if (!this.alive || this.busy) return; const L = this.lesson, who = this.team[this.rot++ % this.team.length], mine = this.ops.filter((o) => o.who === "me"), typed = mine.filter((o) => o.t === "text").map((o) => o.s ?? "").join(" ").toLowerCase(), term = Object.keys(L.glossary).find((k) => typed.includes(k));
      if (term && text) { await this.npcSay(who, `You wrote "${term}". Yes: ${L.glossary[term]}`); return; }
      if (text) { await this.npcSay(who, `Good note: "${text.slice(0, 50)}". Can you connect it to ${Object.keys(L.glossary)[0]}?`); return; }
      if (mine.filter((o) => o.t === "line").length >= 2) await this.npcSay(who, "Nice drawing! Add a label with the Type tool so the group knows what each part is.");
    }, 1800);
  }

  /* ------------------------------------------------------------ same-device windows join the same room; shared sources arrive in chat */
  private send(m: any) { try { this.bc?.postMessage(m); } catch { /* closed */ } }
  private recv(m: any) {
    if (!this.alive || !m) return; if (m.k === "chat") this.msg(`${m.who} (other window)`, m.text); else if (m.k === "op") { this.ops.push({ ...m.op, who: "remote" }); this.paint(m.op); } else if (m.k === "clear") { this.ops = []; this.redraw(); } else if (m.k === "redo") { this.ops = m.ops; this.redraw(); }
  }
  private checkInbox() { try { const arr = JSON.parse(localStorage.getItem("unify.group.inbox.v1") || "[]"); if (arr.length > this.inbox) { const fresh = arr.slice(this.inbox); this.inbox = arr.length; fresh.forEach((f: any) => { this.msg(Social.profile.name || "You", f.text, true); void this.npcSay(this.best(), "Thanks for sharing that source. Let's check who made it and whether it matches what our lesson says."); }); } } catch { /* ignore */ } void Library; }
}
