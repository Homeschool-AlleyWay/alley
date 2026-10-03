/** The hallway's social layer: tap/T to talk, name tags, speech bubbles, hallway chatter, friends who walk up to you, journal. */
import * as THREE from "three";
import type { HallScene, Person, Stu } from "./HallScene";
import { ChatPanel, Journal, heartStr } from "./chatui";
import { approachLine, chatter, type Ctx } from "./dialogue";
import { astar, clockStr, PERIODS, rnd } from "./logic";
import { H, NAV, W } from "./campus";
import { Social } from "./social";
import { AGE_SCALE } from "./characters";
import type { NpcDef } from "./roster";

interface Bubble { el: HTMLElement; p: Person; until: number; h: number }
const REPLIES = ["Ha, totally!", "Same!", "Yeah!", "No way!", "Okay okay.", "I know, right?", "Shh!", "Maybe!", "Ooh!"];
const g2w = (gx: number, gy: number) => new THREE.Vector3(gx - W / 2, 0, gy - H / 2);

export class HallSocial {
  chat: ChatPanel; journal: Journal; nearby: Person | null = null; talkingTo: Person | null = null; onNearby: (p: Person | null) => void = () => {};
  private layer: HTMLElement; private bubbles: Bubble[] = []; private tags = new Map<Person, HTMLElement>(); private chase: { p: Person; replan: number } | null = null;
  private nextChatter = 4; private approachAt = new Map<number, number>(); private approaching: { s: Stu; replan: number; since: number } | null = null; private acc = 0;
  constructor(public hall: HallScene, host: HTMLElement = document.body) {
    this.layer = document.createElement("div"); this.layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:34"; host.appendChild(this.layer);
    this.chat = new ChatPanel(host); this.journal = new Journal(host);
    this.chat.onClose = () => this.endTalk(); this.journal.onPick = (n) => { const p = hall.persons().find((q) => q.def?.id === n.id); if (p) this.talkTo(p); else hall.onToast(`${n.first} isn't in the hall right now.`); };
    hall.onTap = (p) => { if (p?.def) this.talkTo(p); };
    hall.onTick.push((dt, sim) => this.tick(dt, sim));
    addEventListener("keydown", (e) => { if ((e.target as HTMLElement)?.tagName === "INPUT") return; if ((e.key === "t" || e.key === "T") && !this.chat.isOpen) { if (this.nearby) this.talkTo(this.nearby); } else if ((e.key === "f" || e.key === "F") && !this.chat.isOpen) this.journal.toggle(); });
  }
  ctx(): Ctx { const P = PERIODS[Math.max(0, this.hall.idx)]; return { place: "hall", kind: P.kind, period: P.name, clock: clockStr(this.hall.clock) }; }
  private dist(p: Person) { return Math.hypot(p.pos.x - this.hall.player.pos.x, p.pos.z - this.hall.player.pos.z); }
  talkTo(p: Person) {
    const def = p.def; if (!def || this.chat.isOpen) return;
    if (this.dist(p) > 2.7) { this.chase = { p, replan: 0 }; this.hall.walkToPoint(p.pos.x + W / 2, p.pos.z + H / 2, "there"); this.hall.onToast(`Walking over to ${def.first}…`); return; }
    this.chase = null; this.hall.cancelNav(); this.talkingTo = p; p.talking = true; p.moving = false;
    const d = new THREE.Vector3().subVectors(this.hall.player.pos, p.pos); p.dir = this.hall.faceDir(d, p.dir);
    const pl = this.hall.player; pl.dir = this.hall.faceDir(d.clone().negate(), pl.dir);
    this.hall.inputLocked = true; this.journal.hide(); this.chat.open(def, this.ctx());
  }
  private endTalk() { const p = this.talkingTo; this.talkingTo = null; this.hall.inputLocked = false; if (p) { p.talking = false; const s = p as Stu; if (s.path && !s.path.length && s.hidden === false) { /* resume wandering */ } } }
  say(p: Person, text: string, ms = 3400) {
    this.bubbles.filter((b) => b.p === p).forEach((b) => { b.el.remove(); }); this.bubbles = this.bubbles.filter((b) => b.p !== p);
    const el = document.createElement("div"); el.className = "uchat-bubble"; el.textContent = text; this.layer.appendChild(el); this.bubbles.push({ el, p, until: performance.now() + ms, h: 1.55 * (AGE_SCALE[p.look.age ?? "hs"] ?? 1) + 0.35 });
  }
  private project(p: Person, h: number): { x: number; y: number; ok: boolean } {
    const v = new THREE.Vector3(p.pos.x, h, p.pos.z).project(this.hall.camera), r = this.hall.renderer.domElement.getBoundingClientRect();
    return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height, ok: v.z < 1 && v.z > -1 };
  }
  private tick(dt: number, sim: number) {
    const hall = this.hall, now = performance.now(), pl = hall.player;
    // nearest person you could talk to
    let best: Person | null = null, bd = 2.5; if (!this.chat.isOpen) for (const p of hall.persons()) { const d = this.dist(p); if (d < bd && !p.talking) { bd = d; best = p; } }
    if (best !== this.nearby) { this.nearby = best; this.onNearby(best); }
    // walking over to someone you tapped
    if (this.chase) { const c = this.chase; c.replan -= dt; if (this.dist(c.p) <= 2.4) { this.talkTo(c.p); } else if (!hall.walking && c.replan <= 0) { c.replan = 0.5; if (!hall.walkToPoint(c.p.pos.x + W / 2, c.p.pos.z + H / 2, "there")) this.chase = null; } else if (c.replan <= 0) { c.replan = 0.7; hall.walkToPoint(c.p.pos.x + W / 2, c.p.pos.z + H / 2, "there"); } }
    // name tags for people close to you; bubbles follow their speakers
    const near = hall.persons().filter((p) => this.dist(p) < 5.5 && p.def && !hall.inputLocked).sort((a, b) => this.dist(a) - this.dist(b)).slice(0, 5);
    for (const [p, el] of this.tags) if (!near.includes(p)) { el.remove(); this.tags.delete(p); }
    for (const p of near) { let el = this.tags.get(p); if (!el) { el = document.createElement("div"); el.className = "uchat-tag"; this.layer.appendChild(el); this.tags.set(p, el); } const m = Social.peek(p.def!.id); el.innerHTML = `${p.def!.first}${m?.met ? `<i>${heartStr(m.fr).replace(/♡/g, "")}</i>` : ""}`; const pr = this.project(p, 1.55 * (AGE_SCALE[p.look.age ?? "hs"] ?? 1) + 0.1); el.style.display = pr.ok ? "block" : "none"; el.style.left = `${pr.x}px`; el.style.top = `${pr.y}px`; }
    this.bubbles = this.bubbles.filter((b) => { if (now > b.until) { b.el.remove(); return false; } const pr = this.project(b.p, b.h); b.el.style.display = pr.ok ? "block" : "none"; b.el.style.left = `${pr.x}px`; b.el.style.top = `${pr.y - 16}px`; return true; });
    // hallway chatter between students who stand/walk close together
    this.nextChatter -= dt; if (this.nextChatter <= 0 && !this.chat.isOpen) {
      this.nextChatter = rnd(2.4, 5); const ps = hall.persons().filter((p) => p.def && !p.talking && this.dist(p) < 16), a = ps[Math.floor(Math.random() * ps.length)];
      if (a && this.bubbles.length < 4) { const b = ps.filter((q) => q !== a && Math.hypot(q.pos.x - a.pos.x, q.pos.z - a.pos.z) < 3.2)[0]; if (b) { const ctx = this.ctx(); this.say(a, chatter(a.def!, b.def!, { kind: ctx.kind }), 3600); setTimeout(() => this.say(b, REPLIES[Math.floor(Math.random() * REPLIES.length)], 1800), 1900); } }
    }
    // friends walk up to say hi
    this.acc += dt; if (this.acc > 1) { this.acc = 0; this.checkApproach(now); }
    if (this.approaching) { const A = this.approaching; A.replan -= dt; if (A.s.hidden) this.approaching = null; else if (this.dist(A.s) < 1.9) { A.s.path = []; A.s.moving = false; this.say(A.s, approachLine(A.s.def!), 4200); hall.onToast(`${A.s.def!.first} wants to chat. Tap them or press T.`); this.approachAt.set(A.s.def!.id, now); this.approaching = null; setTimeout(() => { if (!A.s.talking && A.s.path.length === 0) A.s.pending = { delay: 0, dest: hall.open[Math.floor(Math.random() * hall.open.length)], hide: false }; }, 14000); }
      else if (A.replan <= 0 || now - A.since > 20000) { A.replan = 1; if (now - A.since > 20000) this.approaching = null; else this.pathTo(A.s); } }
    void sim; void pl;
  }
  private pathTo(s: Stu) {
    const hall = this.hall, sx = Math.max(0, Math.min(W - 1, Math.floor(s.pos.x + W / 2))), sy = Math.max(0, Math.min(H - 1, Math.floor(s.pos.z + H / 2))), gx = Math.max(0, Math.min(W - 1, Math.floor(hall.player.pos.x + W / 2))), gy = Math.max(0, Math.min(H - 1, Math.floor(hall.player.pos.z + H / 2)));
    s.pending = null; s.hideOnArrive = false; s.path = astar(NAV, sx, sy, gx, gy).map((t) => g2w(t.x + 0.5, t.y + 0.5)); s.path.pop(); s.moving = s.path.length > 0;
  }
  private checkApproach(now: number) {
    if (this.approaching || this.chat.isOpen || this.hall.walking) return; const kind = this.ctx().kind; if (kind === "class") return;
    for (const s of this.hall.students) {
      if (s.hidden || s.talking || !s.def) continue; const m = Social.peek(s.def.id); if (!m || m.fr < 30) continue;
      const d = this.dist(s); if (d < 3 || d > 11) continue; if (now - (this.approachAt.get(s.def.id) ?? 0) < 180000) continue;
      this.approaching = { s, replan: 0, since: now }; this.pathTo(s); return;
    }
  }
  /** all NPC definitions currently visible (for tests) */
  visible(): NpcDef[] { return this.hall.persons().map((p) => p.def!).filter(Boolean); }
}
