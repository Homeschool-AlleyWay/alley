/** Paper-style conversation + journal panels shared by the hallway and the auditorium. DOM only; no framework. */
import { drawChar } from "./rig";
import { PORTRAIT_SCALE, type Look } from "./characters";
import { Convo, converse, type Ctx, type Opt, type Reply } from "./dialogue";
import { byId, type NpcDef } from "./roster";
import { Social, hearts, tier } from "./social";

const CSS = `
.uchat{position:absolute;left:0;right:0;bottom:0;z-index:45;display:none;justify-content:center;padding:0 10px calc(10px + env(safe-area-inset-bottom,0px));pointer-events:none}
.uchat.show{display:flex}
.uchat.top{top:58px;bottom:auto;align-items:flex-start;padding:0 10px}
.uchat-card{pointer-events:auto;display:flex;gap:12px;max-width:860px;width:100%;background:var(--kraft,#F3E7CF);border:1px solid rgba(255,255,255,.75);border-radius:16px;padding:10px 12px;box-shadow:0 3px 0 var(--kraft-edge,#C9B28A),0 12px 26px rgba(80,50,40,.38);font-family:var(--ui,"Fredoka","Trebuchet MS",system-ui,sans-serif);color:var(--ink,#4A3B3F);touch-action:manipulation;user-select:text;-webkit-user-select:text}
.uchat-portrait{flex:0 0 auto;width:118px;height:150px;border-radius:12px;background:linear-gradient(#EAF1E8,#DDE9DE);border:2px solid var(--kraft-edge,#C9B28A);box-shadow:inset 0 -6px 0 rgba(0,0,0,.05)}
.uchat-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.uchat-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.uchat-head b{font-size:17px;font-weight:600}
.uchat-sub{font-size:12px;color:var(--soft,#8A7A70)}
.uchat-hearts{color:#E07A66;font-size:14px;letter-spacing:1px}
.uchat-x{margin-left:auto;font:inherit;border:1px solid rgba(255,255,255,.7);background:#FFF9F0;border-radius:10px;padding:2px 10px;cursor:pointer;color:inherit;box-shadow:0 2px 0 var(--kraft-edge,#C9B28A)}
.uchat-text{background:#FFF9F0;border-radius:12px;padding:8px 12px;font-size:15px;line-height:1.35;min-height:44px;max-height:30vh;overflow:auto;box-shadow:inset 0 0 0 1px rgba(201,178,138,.5)}
.uchat-text .you{color:var(--soft,#8A7A70);font-size:12px;display:block;margin-bottom:2px}
.uchat-opts{display:flex;flex-wrap:wrap;gap:6px}
.uchat-opts button{font:inherit;font-size:14px;color:var(--ink,#4A3B3F);background:#FFF9F0;border:1px solid rgba(255,255,255,.8);border-radius:10px;padding:6px 10px;cursor:pointer;box-shadow:0 2px 0 var(--kraft-edge,#C9B28A);min-height:34px;text-align:left}
.uchat-opts button:active{transform:translateY(2px);box-shadow:none}
.uchat-opts button:focus-visible,.uchat-in input:focus-visible,.uchat-x:focus-visible{outline:3px solid var(--blue,#4F91C7);outline-offset:2px}
.uchat-in{display:flex;gap:6px}
.uchat-in input{flex:1;min-width:0;font:inherit;font-size:15px;border:1px solid var(--kraft-edge,#C9B28A);border-radius:10px;padding:7px 10px;background:#fff;color:var(--ink,#4A3B3F)}
.uchat-in button{font:inherit;color:#fff;background:var(--acc,#E07A66);border:1px solid rgba(255,255,255,.7);border-radius:10px;padding:6px 14px;cursor:pointer;box-shadow:0 2px 0 #b95a48}
.uchat-bubble{position:absolute;z-index:35;transform:translate(-50%,-100%);max-width:200px;background:#FFF9F0;border:1.5px solid #6d5a5f;border-radius:12px;padding:5px 9px;font:500 12px/1.25 var(--ui,"Fredoka","Trebuchet MS",sans-serif);color:#4A3B3F;box-shadow:0 2px 0 var(--kraft-edge,#C9B28A),0 5px 9px rgba(80,50,40,.25);pointer-events:none;text-align:center}
.uchat-bubble:after{content:"";position:absolute;left:50%;bottom:-6px;width:8px;height:8px;background:#FFF9F0;border-right:1.5px solid #6d5a5f;border-bottom:1.5px solid #6d5a5f;transform:translateX(-50%) rotate(45deg)}
.uchat-tag{position:absolute;z-index:34;transform:translate(-50%,-100%);font:600 11px var(--ui,"Fredoka","Trebuchet MS",sans-serif);color:#4A3B3F;background:rgba(255,249,240,.92);border:1px solid #C9B28A;border-radius:8px;padding:1px 7px;white-space:nowrap;pointer-events:none}
.uchat-tag.staff{font-size:14px;font-weight:700;background:#E8A33D;color:#fff;border:2px solid #8a5f1c;border-radius:10px;padding:2px 10px;box-shadow:0 2px 0 #8a5f1c;text-shadow:0 1px 0 rgba(0,0,0,.25)}
.uchat-tag i{font-style:normal;color:#E07A66;margin-left:4px}
.ujournal{position:absolute;inset:0;z-index:50;display:none;align-items:center;justify-content:center;background:rgba(234,223,203,.8);padding:12px}
.ujournal.show{display:flex}
.ujournal-card{background:var(--kraft,#F3E7CF);border-radius:16px;border:1px solid rgba(255,255,255,.75);box-shadow:0 3px 0 var(--kraft-edge,#C9B28A),0 14px 30px rgba(80,50,40,.4);max-width:720px;width:100%;max-height:86vh;display:flex;flex-direction:column;font-family:var(--ui,"Fredoka","Trebuchet MS",sans-serif);color:var(--ink,#4A3B3F)}
.ujournal-card>header{display:flex;align-items:center;padding:12px 16px;gap:10px;font-weight:600;font-size:17px}
.ujournal-card>header button{margin-left:auto;font:inherit;color:inherit;border:1px solid rgba(255,255,255,.7);background:#FFF9F0;border-radius:10px;padding:3px 12px;cursor:pointer;box-shadow:0 2px 0 var(--kraft-edge,#C9B28A)}
.ujournal-list{overflow:auto;padding:0 14px 14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
.ujournal-item{display:flex;gap:10px;background:#FFF9F0;border-radius:12px;padding:8px;box-shadow:inset 0 0 0 1px rgba(201,178,138,.5);cursor:pointer;text-align:left;font:inherit;color:inherit;border:0}
.ujournal-item canvas{flex:0 0 auto;width:54px;height:70px;background:#EAF1E8;border-radius:8px}
.ujournal-item b{font-size:15px}.ujournal-item small{display:block;color:var(--soft,#8A7A70);font-size:12px;line-height:1.35}
.ujournal-empty{padding:18px;color:var(--soft,#8A7A70)}
@media(max-width:560px){.uchat-portrait{width:78px;height:100px}.uchat-text{font-size:14px}}
`;
let cssDone = false; const ensureCss = () => { if (cssDone) return; cssDone = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", parent?: HTMLElement, text = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e; };

/** draw a person (front view) onto a canvas; used for portraits and journal thumbnails */
export function drawPortrait(cv: HTMLCanvasElement, look: Look, t = 0, mouth = 0, scale = 3.7) {
  const c = cv.getContext("2d")!, w = cv.width, h = cv.height; c.clearRect(0, 0, w, h);
  const s = scale * (look.age === "adult" ? 0.74 : Math.min(1, PORTRAIT_SCALE[look.age ?? "hs"] ?? 1)) * (w / 118); c.save(); c.translate(w / 2, h - 10 * (h / 150)); c.scale(s, s); c.shadowColor = "rgba(52,34,46,.3)"; c.shadowBlur = 2; c.shadowOffsetY = 1;
  drawChar(c, 0, 0, { ...look, dir: "down", moving: false, walk: 0, mouth, tag: false }, t); c.restore();
}
export const heartStr = (fr: number) => "♥".repeat(hearts(fr)) + "♡".repeat(5 - hearts(fr));

export class ChatPanel {
  root: HTMLElement; card: HTMLElement; cv: HTMLCanvasElement; nameEl: HTMLElement; subEl: HTMLElement; heartEl: HTMLElement; textEl: HTMLElement; optsEl: HTMLElement; input: HTMLInputElement;
  convo?: Convo; npc?: NpcDef; private typing = 0; private full = ""; private raf = 0; private t0 = 0; private busy = false; private opts: Opt[] = [];
  onClose: () => void = () => {}; onReply: (r: Reply, npc: NpcDef) => void = () => {};
  constructor(host: HTMLElement) {
    ensureCss(); this.root = el("div", "uchat", host); this.card = el("div", "uchat-card", this.root);
    this.cv = el("canvas", "uchat-portrait", this.card) as HTMLCanvasElement; this.cv.width = 236; this.cv.height = 300;
    const main = el("div", "uchat-main", this.card), head = el("div", "uchat-head", main);
    this.nameEl = el("b", "", head); this.subEl = el("span", "uchat-sub", head); this.heartEl = el("span", "uchat-hearts", head);
    const x = el("button", "uchat-x", head, "Bye"); x.type = "button"; x.onclick = () => this.close();
    this.textEl = el("div", "uchat-text", main); this.textEl.setAttribute("aria-live", "polite"); this.textEl.onclick = () => this.finishTyping();
    this.optsEl = el("div", "uchat-opts", main);
    const form = el("form", "uchat-in", main); this.input = el("input", "", form) as HTMLInputElement; this.input.placeholder = "Or type something to say…"; this.input.maxLength = 200; this.input.autocomplete = "off";
    const send = el("button", "", form, "Say"); send.type = "submit";
    form.onsubmit = (e) => { e.preventDefault(); const v = this.input.value.trim(); if (v) { this.input.value = ""; void this.say(v); } };
    this.root.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") this.close(); else if (document.activeElement !== this.input && /^[1-6]$/.test(e.key)) this.opts[+e.key - 1] && void this.pick(this.opts[+e.key - 1]); });
    ["pointerdown", "wheel", "touchstart"].forEach((n) => this.root.addEventListener(n, (e) => e.stopPropagation(), { passive: true }));
  }
  get isOpen() { return this.root.classList.contains("show"); }
  open(npc: NpcDef, ctx: Ctx) {
    this.npc = npc; this.convo = new Convo(npc, ctx); this.root.classList.add("show"); this.t0 = performance.now(); this.busy = false;
    this.nameEl.textContent = npc.name; this.refreshHead(); this.deliver(this.convo.greet()); this.loop(); setTimeout(() => this.root.querySelector<HTMLButtonElement>(".uchat-opts button")?.focus({ preventScroll: true }), 30);
  }
  /** custom NPC panel (e.g. teacher Q&A) */
  say = async (text: string) => {
    if (!this.convo || this.busy) return; this.busy = true; this.showYou(text);
    try { this.deliver(await converse(this.convo, text)); } finally { this.busy = false; }
  };
  private async pick(o: Opt) { if (!this.convo || this.busy) return; this.showYou(this.labelOf(o)); this.deliver(this.convo.choose(o.id, o.data)); }
  private labelOf(o: Opt) { return o.label; }
  private showYou(text: string) { this.textEl.innerHTML = ""; const y = el("span", "you", this.textEl, `${Social.profile.name || "You"}: ${text}`); void y; }
  private refreshHead() { if (!this.npc) return; const m = Social.mem(this.npc.id); this.subEl.textContent = `${this.npc.role === "staff" ? this.npc.title : "Grade " + this.npc.grade} · ${tier(m.fr)}`; this.heartEl.textContent = heartStr(m.fr); }
  private deliver(r: Reply) {
    this.refreshHead(); this.opts = r.options; this.optsEl.innerHTML = "";
    r.options.forEach((o, i) => { const b = el("button", "", this.optsEl, `${i + 1}. ${o.label}`); b.type = "button"; b.onclick = () => void this.pick(o); });
    const you = this.textEl.querySelector(".you"); this.textEl.innerHTML = ""; if (you) this.textEl.appendChild(you);
    this.full = r.text; this.typing = 0; this.mood = r.mood; this.onReply(r, this.npc!);
    if (r.end) setTimeout(() => this.close(), Math.min(2600, 900 + r.text.length * 28));
  }
  private mood = "happy";
  private finishTyping() { this.typing = this.full.length; this.renderText(); }
  private renderText() { let sp = this.textEl.querySelector<HTMLElement>(".say"); if (!sp) { sp = el("span", "say", this.textEl); } sp.textContent = this.full.slice(0, Math.floor(this.typing)); }
  private loop = () => {
    if (!this.isOpen) return; const now = performance.now(), talking = this.typing < this.full.length;
    if (talking) { this.typing += 1.1 + this.full.length * 0.012; this.renderText(); }
    if (this.npc) drawPortrait(this.cv, this.npc.look, (now - this.t0) / 1000, talking ? 0.4 + 0.6 * Math.abs(Math.sin(now / 70)) : 0);
    this.raf = requestAnimationFrame(this.loop);
  };
  close() { if (!this.isOpen) return; this.root.classList.remove("show"); cancelAnimationFrame(this.raf); this.input.blur(); this.onClose(); }
}

/** everyone the player has met: hearts, what they remember, tap to talk */
export class Journal {
  root: HTMLElement; list: HTMLElement; onPick: (npc: NpcDef) => void = () => {};
  constructor(host: HTMLElement) {
    ensureCss(); this.root = el("div", "ujournal", host); const card = el("div", "ujournal-card", this.root), head = el("header", "", card, "Friends and classmates");
    const x = el("button", "", head, "Close"); x.type = "button"; x.onclick = () => this.hide(); this.list = el("div", "ujournal-list", card);
    this.root.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.root.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") this.hide(); });
  }
  show() { this.render(); this.root.classList.add("show"); }
  hide() { this.root.classList.remove("show"); }
  toggle() { this.root.classList.contains("show") ? this.hide() : this.show(); }
  render() {
    this.list.innerHTML = ""; const fr = Social.friends();
    if (!fr.length) { el("div", "ujournal-empty", this.list, "You haven't met anyone yet. Walk up to a student and tap them, or press T when one is close."); return; }
    for (const { id, mem } of fr) {
      const n = byId(Number(id)); if (!n) continue; const b = el("button", "ujournal-item", this.list); b.type = "button"; b.onclick = () => { this.hide(); this.onPick(n); };
      const cv = el("canvas", "", b) as HTMLCanvasElement; cv.width = 108; cv.height = 140; drawPortrait(cv, n.look, 0, 0, 3.7);
      const t = el("div", "", b), facts = Object.entries(mem.facts).map(([k, v]) => `${k.replace("fav_", "favorite ")}: ${v}`).join(", ");
      el("b", "", t, n.name); el("small", "", t, `${n.role === "staff" ? n.title : "Grade " + n.grade} · ${tier(mem.fr)} ${heartStr(mem.fr)}`);
      el("small", "", t, `Talked ${mem.talks}x · quiz ${mem.quiz.right}/${mem.quiz.total}${mem.lunchBuddy ? " · lunch buddy" : ""}`);
      if (facts) el("small", "", t, `Remembers: ${facts}`);
    }
  }
}

/** A smaller speech card used for classroom moments (teacher questions, answers, hand-raise Q&A). Top of the screen so the seat view stays visible. */
export class SpeakPanel {
  root: HTMLElement; cv: HTMLCanvasElement; nameEl: HTMLElement; textEl: HTMLElement; optsEl: HTMLElement; form: HTMLFormElement; input: HTMLInputElement; private raf = 0; private npc?: NpcDef; private t0 = 0; private talkUntil = 0; private hideT: any = 0;
  onPick: (o: Opt) => void = () => {}; onText: (t: string) => void = () => {};
  constructor(host: HTMLElement) {
    ensureCss(); this.root = el("div", "uchat top", host); const card = el("div", "uchat-card", this.root);
    this.cv = el("canvas", "uchat-portrait", card) as HTMLCanvasElement; this.cv.width = 236; this.cv.height = 300;
    const main = el("div", "uchat-main", card), head = el("div", "uchat-head", main); this.nameEl = el("b", "", head);
    this.textEl = el("div", "uchat-text", main); this.textEl.setAttribute("aria-live", "polite"); this.optsEl = el("div", "uchat-opts", main);
    this.form = el("form", "uchat-in", main) as HTMLFormElement; this.input = el("input", "", this.form) as HTMLInputElement; this.input.maxLength = 200; this.input.autocomplete = "off"; const b = el("button", "", this.form, "Ask"); b.type = "submit";
    this.form.onsubmit = (e) => { e.preventDefault(); const v = this.input.value.trim(); if (v) { this.input.value = ""; this.onText(v); } };
    this.root.addEventListener("keydown", (e) => e.stopPropagation()); ["pointerdown", "wheel", "touchstart"].forEach((n) => this.root.addEventListener(n, (e) => e.stopPropagation(), { passive: true }));
  }
  get isOpen() { return this.root.classList.contains("show"); }
  /** speaker = an NPC, or the player's avatar look */
  show(speaker: { name: string; look: Look; sub?: string }, text: string, o: { options?: Opt[]; input?: string; autoHideMs?: number } = {}) {
    clearTimeout(this.hideT); this.root.classList.add("show"); this.npc = { look: speaker.look } as NpcDef; this.t0 = performance.now(); this.talkUntil = this.t0 + Math.min(4000, 300 + text.length * 32);
    this.nameEl.textContent = speaker.name + (speaker.sub ? ` · ${speaker.sub}` : ""); this.textEl.textContent = text; this.optsEl.innerHTML = "";
    (o.options ?? []).forEach((op, i) => { const bt = el("button", "", this.optsEl, `${i + 1}. ${op.label}`); bt.type = "button"; bt.onclick = () => this.onPick(op); });
    this.form.style.display = o.input ? "flex" : "none"; if (o.input) this.input.placeholder = o.input;
    if (o.autoHideMs) this.hideT = setTimeout(() => this.hide(), o.autoHideMs);
    cancelAnimationFrame(this.raf); const loop = () => { if (!this.isOpen) return; const now = performance.now(); drawPortrait(this.cv, this.npc!.look, (now - this.t0) / 1000, now < this.talkUntil ? 0.4 + 0.6 * Math.abs(Math.sin(now / 70)) : 0); this.raf = requestAnimationFrame(loop); }; loop();
  }
  hide() { clearTimeout(this.hideT); this.root.classList.remove("show"); cancelAnimationFrame(this.raf); this.input.blur(); }
}
