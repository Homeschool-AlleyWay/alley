/** Classroom life: the teacher asks questions, classmates raise hands and answer, and the player can raise a hand to answer or to ask
 *  the teacher something (buttons or typed text). Everything is remembered in the shared social store. */
import { SpeakPanel } from "../hall3d/chatui";
import { Convo, askModel } from "../hall3d/dialogue";
import { quizFor, type Quiz } from "../hall3d/quizbank";
import { TEACHER_BY_SUBJECT, byId, type NpcDef } from "../hall3d/roster";
import { Social, today } from "../hall3d/social";
import type { Look } from "../hall3d/characters";
import { LESSONS, explain, type Lesson } from "./lessons";
import type { Subject } from "./types";

export interface ClassHost {
  /** NPCs sitting in the room right now */ seated(): NpcDef[];
  setHand(npcId: number, up: boolean): void; playerHand(up: boolean): void; playerSeated(): boolean; playerLook(): Look;
  /** optional: speak a line aloud as this speaker (resolves when done) */ onSpeech?(speaker: { name: string }, text: string): Promise<void>;
  /** optional: the teacher reacts in character; may return a short spoken interjection */ react?(kind: "correct" | "wrong" | "noHands" | "thanks" | "ask"): string;
}
const explainWith = (L: Lesson, text: string, rot: number): string | null => {
  const t = text.toLowerCase(); for (const [k, v] of Object.entries(L.glossary)) if (t.includes(k)) return v;
  if (/\b(again|repeat|confus|lost|don'?t (get|understand)|slow)\b/.test(t)) return `Let's go step by step. ${L.points[rot % L.points.length]}`;
  if (/\b(example|show me|for instance)\b/.test(t)) return L.examples[rot % L.examples.length];
  if (/\b(why|how come|reason)\b/.test(t)) return L.whys[rot % L.whys.length];
  if (/\b(homework|assignment|due)\b/.test(t)) return `For homework: ${L.homework}`;
  return null;
};
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const spk = (d: NpcDef) => ({ name: d.name, look: d.look, sub: d.role === "staff" ? d.title : `Grade ${d.grade}` });
const KNOW_BASE = { hs: 0.8, g68: 0.7, g35: 0.62, k2: 0.5, adult: 1 } as const;
export const knowProb = (d: NpcDef, subject: Subject) => Math.max(0.2, Math.min(0.95, KNOW_BASE[d.age] + (d.favSubject === subject ? 0.15 : 0) - (d.hardSubject === subject ? 0.2 : 0) + (d.personality === "nerdy" ? 0.1 : 0) - (d.personality === "shy" ? 0.05 : 0)));
type Pick = { id: string; label: string } | string | null;

export class ClassroomLife {
  /** the lesson being taught; set it to make questions and answers follow the current board. `auto:false` turns off the timed question loop (a director calls ask methods itself). */
  lesson: Lesson | null = null; auto = true;
  panel: SpeakPanel; subject: Subject = "math"; handUp = false; private tok = 0; private busy = false; private rot = 0; private raiseWaiter: (() => void) | null = null; private resolver: ((p: Pick) => void) | null = null; private asked = 0;
  onState: (s: { handUp: boolean; question: boolean }) => void = () => {};
  constructor(private host: ClassHost, root: HTMLElement) {
    this.panel = new SpeakPanel(root);
    this.panel.onPick = (o) => this.resolver?.(o); this.panel.onText = (t) => this.resolver?.(t);
    addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.resolver) this.resolver(null);
      else if ((e.target as HTMLElement)?.tagName !== "INPUT") { if (e.key === "h" || e.key === "H") this.raiseHand(); else if (/^[1-5]$/.test(e.key) && this.panel.isOpen) { const b = this.panel.optsEl.children[+e.key - 1] as HTMLButtonElement | undefined; b?.click(); } }
    });
  }
  private get L(): Lesson { return this.lesson ?? this.L; }
  get teacher() { return TEACHER_BY_SUBJECT[this.subject]; }
  get me() { return { name: Social.profile.name || "You", look: this.host.playerLook(), sub: "you" }; }
  private alive(t: number) { return t === this.tok && this.host.playerSeated(); }
  private emit(q = false) { this.onState({ handUp: this.handUp, question: q }); }
  /** show a card and wait for a button / typed text / Escape */
  private ask(speaker: ReturnType<typeof spk>, text: string, options: { id: string; label: string }[], input?: string): Promise<Pick> {
    void this.host.onSpeech?.(speaker, text);
    return new Promise((res) => { this.resolver = (p) => { this.resolver = null; res(p); }; this.panel.show(speaker, text, { options, input }); });
  }
  private say(speaker: ReturnType<typeof spk>, text: string, ms = 0) { this.panel.show(speaker, text, { autoHideMs: ms || Math.min(7000, 2200 + text.length * 45) }); const sp = this.host.onSpeech?.(speaker, text); const wait = sleep(ms || Math.min(6200, 1800 + text.length * 40)); return sp ? Promise.all([wait, sp]).then(() => undefined) : wait; }

  /* ------------------------------------------------------------ lifecycle */
  async start(subject: Subject) {
    this.stop(); const t = ++this.tok; this.subject = subject; const T = this.teacher, m = Social.mem(T.id), me = Social.profile.name || "friend";
    const first = !m.met; const days = m.lastDay && m.lastDay !== today();
    Social.edit(T.id, (mm) => { mm.met = true; mm.talks++; mm.lastDay = today(); mm.lastAt = Date.now(); mm.fr = Math.min(100, mm.fr + (first ? 2 : 1)); });
    if (!this.auto) return;   // a director greets the class itself
    const last = m.topics.filter((x) => x.startsWith("q:")).pop();
    const greet = first ? `Welcome, ${me}! I'm ${T.name}. Today's lesson: ${this.L.title}. Raise your hand any time with H or the button.`
      : `${days ? "Welcome back" : "Good to see you again"}, ${me}! ${last ? `Last time you asked about ${last.slice(2)}. ` : ""}Today: ${this.L.title}.`;
    await sleep(900); if (!this.alive(t)) return; await this.say(spk(T), greet, 6500); if (!this.alive(t)) return;
    if (!this.auto) return;
    let n = 0;
    while (this.alive(t)) {
      await sleep(rnd(17000, 28000)); if (!this.alive(t) || this.busy || this.handUp) continue;
      this.busy = true; try { if (n++ % 3 === 2) await this.npcQuestion(t); else await this.teacherAsk(t); } finally { this.busy = false; this.host.seated().forEach((d) => this.host.setHand(d.id, false)); this.emit(false); }
    }
  }
  stop() { this.tok++; this.resolver?.(null); this.raiseWaiter = null; this.panel.hide(); if (this.handUp) { this.handUp = false; this.host.playerHand(false); } this.busy = false; this.host.seated().forEach((d) => this.host.setHand(d.id, false)); this.emit(false); }

  /* ------------------------------------------------------------ the player raises a hand */
  raiseHand() {
    if (!this.host.playerSeated()) return;
    if (this.raiseWaiter) { const w = this.raiseWaiter; this.raiseWaiter = null; w(); return; }          // a question is open: you're volunteering
    if (this.busy || this.handUp) return; void this.freeHand(this.tok);
  }
  private async freeHand(t: number) {
    this.busy = true; this.handUp = true; this.host.playerHand(true); this.emit(false); const T = this.teacher, me = Social.profile.name || "friend";
    Social.profile.stats.hands++; Social.save(); await sleep(rnd(1100, 2000));
    let line = `Yes, ${me}? What's your question?`, count = 0;
    while (this.alive(t)) {
      const r = await this.ask(spk(T), line, [{ id: "again", label: "Explain that again" }, { id: "example", label: "Give an example" }, { id: "why", label: "Why does that work?" }, { id: "done", label: "Never mind" }], "Or ask your own question…");
      if (r === null || (typeof r !== "string" && r.id === "done")) break;
      const L = this.L; let reply: string, topic = typeof r === "string" ? r.slice(0, 24) : r.id;
      if (typeof r === "string") reply = (this.lesson ? explainWith(this.lesson, r, this.rot) : explain(this.subject, r, this.rot)) ?? (await this.modelOrGeneric(r));
      else reply = r.id === "again" ? `Sure. ${L.points[this.rot % L.points.length]}` : r.id === "example" ? L.examples[this.rot % L.examples.length] : L.whys[this.rot % L.whys.length];
      this.rot++; count++; Social.edit(T.id, (mm) => { mm.topics.push("q:" + topic); if (mm.topics.length > 24) mm.topics.shift(); mm.fr = Math.min(100, mm.fr + 1); mm.called++; });
      line = `${reply} Anything else?`;
    }
    if (this.alive(t)) { await this.say(spk(T), count ? `Great asking, ${me}. Questions make everyone smarter.` : "No problem. Ask any time.", 2600); }
    this.panel.hide(); this.handUp = false; this.host.playerHand(false); this.busy = false; this.emit(false);
  }
  private async modelOrGeneric(text: string): Promise<string> {
    const convo = new Convo(this.teacher, { place: "class", kind: "class", period: this.L.title, clock: "" }); const r = await askModel(convo, text);
    return r?.text ?? `Good question, ${Social.profile.name || "friend"}. Let's look at the board together. ${this.L.points[this.rot % 3]}`;
  }

  /* ------------------------------------------------------------ the teacher asks, hands go up */
  private async teacherAsk(t: number) {
    const T = this.teacher, S = this.subject, quiz = quizFor(S, Social.profile.avatar.age), me = Social.profile.name || "friend"; this.asked++;
    const volunteers = this.host.seated().filter((d) => Math.random() < 0.18 + 0.4 * knowProb(d, S)).slice(0, 7);
    this.emit(true);
    volunteers.forEach((d) => setTimeout(() => this.alive(t) && this.host.setHand(d.id, true), rnd(700, 3800)));
    void this.host.onSpeech?.(spk(T), quiz.q); this.host.react?.("ask"); this.panel.show(spk(T), `Question: ${quiz.q}`, { options: [{ id: "raise", label: "Raise my hand (H)" }, { id: "listen", label: "Just listen" }] });
    this.panel.onPick = (o) => { if (o.id === "raise") this.raiseHand(); else this.resolver?.(o); };
    const raised = await new Promise<boolean>((res) => { this.raiseWaiter = () => res(true); this.resolver = () => res(false); setTimeout(() => res(false), 9000); });
    this.raiseWaiter = null; this.resolver = null; this.panel.onPick = (o) => this.resolver?.(o);
    if (!this.alive(t)) return;
    if (raised) { this.handUp = true; this.host.playerHand(true); this.emit(true); await this.playerAnswers(t, quiz); this.handUp = false; this.host.playerHand(false); return; }
    const who = volunteers.length ? volunteers[Math.floor(Math.random() * volunteers.length)] : null;
    if (!who) { const rr = this.host.react?.("noHands") ?? ""; await this.say(spk(T), `${rr ? rr + " " : ""}Let's work it out together. The answer is "${quiz.options[quiz.answer]}". ${quiz.why ?? ""}`, 6000); return; }
    const right = Math.random() < knowProb(who, S), pickIdx = right ? quiz.answer : (quiz.answer + 1 + Math.floor(Math.random() * (quiz.options.length - 1))) % quiz.options.length;
    await this.say(spk(T), `${who.first}, go ahead.`, 1500); if (!this.alive(t)) return;
    await this.say(spk(who), quiz.options[pickIdx] + (who.personality === "shy" ? "... maybe?" : "!"), 2400); if (!this.alive(t)) return;
    Social.edit(who.id, (m) => { m.called++; if (right) m.quiz.right++; m.quiz.total++; });
    if (right) { const rr = this.host.react?.("correct") ?? ""; await this.say(spk(T), `${rr ? rr + " " : ""}Yes, ${who.first}! ${quiz.why ?? ""}`, 3800); return; }
    this.host.seated().forEach((d) => d.id !== who.id && Math.random() < 0.5 && this.host.setHand(d.id, true));
    const wr = this.host.react?.("wrong") ?? ""; void this.host.onSpeech?.(spk(T), `${wr} Not quite, ${who.first}, thank you for trying. Can anyone help?`);
    this.panel.show(spk(T), `Not quite, ${who.first}, thank you for trying. Can anyone help?`, { options: [{ id: "raise", label: "Raise my hand (H)" }, { id: "listen", label: "Let someone else" }] });
    this.panel.onPick = (o) => { if (o.id === "raise") this.raiseHand(); else this.resolver?.(o); };
    const help = await new Promise<boolean>((res) => { this.raiseWaiter = () => res(true); this.resolver = () => res(false); setTimeout(() => res(false), 7500); });
    this.raiseWaiter = null; this.resolver = null; this.panel.onPick = (o) => this.resolver?.(o); if (!this.alive(t)) return;
    if (help) { this.handUp = true; this.host.playerHand(true); await this.playerAnswers(t, quiz, who); this.handUp = false; this.host.playerHand(false); }
    else await this.say(spk(T), `The answer is "${quiz.options[quiz.answer]}". ${quiz.why ?? ""} Don't worry, ${who.first}, that's how we learn.`, 5200);
  }
  private async playerAnswers(t: number, quiz: Quiz, helping?: NpcDef) {
    const T = this.teacher, me = Social.profile.name || "friend";
    const r = await this.ask(spk(T), `${me}? Go ahead. ${helping ? "" : quiz.q}`, quiz.options.map((o, i) => ({ id: "a" + i, label: o })));
    if (r === null || typeof r === "string") { await this.say(spk(T), "That's okay. We'll come back to it.", 2200); return; }
    const ok = r.id === "a" + quiz.answer; Social.profile.stats.quizTotal++; if (ok) Social.profile.stats.quizRight++; Social.save();
    Social.edit(T.id, (m) => { m.quiz.total++; if (ok) m.quiz.right++; m.fr = Math.min(100, m.fr + (ok ? 2 : 1)); m.called++; });
    if (ok && helping) Social.edit(helping.id, (m) => { m.helped++; m.fr = Math.min(100, m.fr + 3); });
    this.host.seated().forEach((d) => { const m = Social.peek(d.id); if (m?.met) Social.edit(d.id, (mm) => { mm.seenInClass++; }); });
    const rr = this.host.react?.(ok ? "correct" : "wrong") ?? "";
    await this.say(spk(T), ok ? `${rr ? rr + " " : ""}Exactly right, ${me}! ${quiz.why ?? ""}${helping ? ` Thank you for helping ${helping.first}.` : ""}` : `${rr ? rr + " " : ""}Good try, ${me}. The answer is "${quiz.options[quiz.answer]}". ${quiz.why ?? ""} Mistakes help us learn.`, 5200);
  }

  /* ------------------------------------------------------------ a classmate asks the teacher */
  private async npcQuestion(t: number) {
    const T = this.teacher, L = this.L, seated = this.host.seated(); if (!seated.length) return;
    const who = seated.find((d) => d.personality === "curious") ?? seated[Math.floor(Math.random() * seated.length)], which = this.rot % 3;
    this.host.setHand(who.id, true); await sleep(1800); if (!this.alive(t)) return;
    const q = [`Why does this matter? ${L.points[which].split(".")[0].toLowerCase()}...`, "Can you give another example?", "Why does that work?"][this.rot % 3];
    this.rot++; this.panel.show(spk(T), `${who.first}, you have a question?`, { autoHideMs: 1800 }); await sleep(1700); if (!this.alive(t)) return;
    await this.say(spk(who), q, 3200); if (!this.alive(t)) return;
    const a = q.startsWith("Can you give") ? L.examples[which] : q.startsWith("Why does that") ? L.whys[which] : L.points[which];
    const r = await this.ask(spk(T), a, [{ id: "me2", label: `I wondered that too` }, { id: "ok", label: "Got it" }]);
    if (r && typeof r !== "string" && r.id === "me2") { Social.edit(who.id, (m) => { m.fr = Math.min(100, m.fr + 2); m.met = true; }); await this.say(spk(who), `${Social.profile.name || "You"} wondered too? Cool, thanks!`, 2400); }
    this.panel.hide();
  }
  /** director hooks: one teacher question / one classmate question, now */
  async askNow(kind: "teacher" | "npc" = "teacher") { if (this.busy) return; const t = this.tok; this.busy = true; try { if (kind === "npc") await this.npcQuestion(t); else await this.teacherAsk(t); } finally { this.busy = false; this.host.seated().forEach((d) => this.host.setHand(d.id, false)); this.emit(false); } }
  /** a quiet whisper to someone nearby is handled by the page's chat panel; this just tells classes whether the teacher is mid-question */
  get questionOpen() { return !!this.raiseWaiter; }
  byId = byId;
}
