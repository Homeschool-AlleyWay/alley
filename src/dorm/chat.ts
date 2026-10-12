/** Private chat in a dorm. "Visit a friend": pick a friend, pick whose dorm, and talk with both avatars standing in it.
 *  Everything goes through PhoneNet (a normal private thread), so the parent's "Live chats" always shows it. No side channels. */
import { OPTIONS, defaultAvatar, randomAvatar, rng, type AvatarSpec } from "../hall3d/avatar";
import type { DormLayout } from "./types";
import { E, btn } from "./page/dom";

/* ------------------------------------------------------------------ the scene the page gives us */
export interface VisitScene {
  mySpec(): AvatarSpec;
  begin(o: { dorm: DormLayout | null; their: AvatarSpec; theirName: string; at: "me" | "them" }): void;
  end(): void;
  setTheirSpec(s: AvatarSpec): void;
  setAway(away: boolean): void;
  say(who: "me" | "them", text: string): void;
  emote(who: "me" | "them", emoji: string, id: string): void;
}
interface NetUser { id: string; handle: string; name: string; role: string; band: string; grade?: number; open?: boolean }
interface Msg { id: string; from: string; text: string; at: number }
interface Thread { tid: string; other: string; msgs: Msg[]; user: NetUser | null }
interface PEntry { id: string; name: string; handle: string; spec: Record<string, unknown>; emote?: string; emoteAt?: number }
const PN = (): any => (window as any).PhoneNet;

/* ------------------------------------------------------------------ helpers */
const hash36 = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
/** the presence room for a dorm: the same name for both friends, whoever owns it */
export const dormRoom = (hostId: string) => "dorm-" + hash36(hostId);
const HEX = /^#[0-9a-fA-F]{6}$/;
/** an avatar from another device is data, not code: keep only values of the right type and known option ids */
export function cleanSpec(raw: unknown): AvatarSpec {
  const base = defaultAvatar() as unknown as Record<string, unknown>, r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>, out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(base)) {
    const v = r[k], d = base[k]; if (v === undefined || k === "closet" || k === "favs") continue;
    if (typeof d === "number") { if (typeof v === "number" && isFinite(v)) out[k] = Math.min(1.3, Math.max(0.7, v)); continue; }
    if (typeof d === "boolean") { if (typeof v === "boolean") out[k] = v; continue; }
    if (d === null || typeof d === "string") {
      if (v === null && d === null) continue;
      if (typeof v !== "string" || v.length > 24) continue;
      const opts = (OPTIONS as Record<string, { id: string }[]>)[k];
      if (opts) { if (opts.some((o) => o.id === v) || (k === "age" && v === "adult")) out[k] = v; continue; }
      if (typeof d === "string" && d.startsWith("#") || d === null && v.startsWith("#")) { if (HEX.test(v)) out[k] = v; continue; }
      if (k === "name") out[k] = v.replace(/[^\w .'-]/g, "").slice(0, 14) || "Student"; else if (k === "pronouns") out[k] = ["she/her", "he/him", "they/them"].includes(v) ? v : d;
      continue;
    }
  }
  out.closet = []; out.favs = []; return out as unknown as AvatarSpec;
}
/** only the fields that differ from the default avatar (the presence document is limited to 1800 characters) */
export function slimSpec(a: AvatarSpec): Record<string, unknown> {
  const d = defaultAvatar() as unknown as Record<string, unknown>, o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(a as unknown as Record<string, unknown>)) if (k !== "closet" && k !== "favs" && JSON.stringify(v) !== JSON.stringify(d[k])) o[k] = v;
  return o;
}
function classmateRow(otherId: string): { name: string; json: any } | null {
  const rows: { key: string; name: string; json: string }[] = (() => { try { return (window as any).__classmates || (window.parent !== window ? (window.parent as any).__classmates : null) || []; } catch { return (window as any).__classmates || []; } })();
  const r = rows.find((x) => typeof x.key === "string" && x.key.replace("/", "_") === otherId); if (!r) return null;
  try { return { name: r.name, json: JSON.parse(r.json) }; } catch { return null; }
}
const friendly = (e: unknown, fb = "Something went wrong. Please try again."): string => { const m = e instanceof Error ? e.message : typeof e === "string" ? e : ""; return m && m.length < 220 ? m : fb; };
const hue = (s: string) => `hsl(${parseInt(hash36(s), 36) % 360},55%,52%)`;

/* ------------------------------------------------------------------ the visit controller */
export class DormVisit {
  visiting = false; ready = false; notReady = "";
  private me: NetUser | null = null; private threads = new Map<string, Thread>(); private unwatchNet: (() => void) | null = null;
  private v: { tid: string; other: NetUser; at: "me" | "them"; room: string; seen: Set<string>; unRoom: () => void; hb: number; here: boolean; lastEmote: number; echo: string[] } | null = null;
  private listEl: HTMLElement | null = null; private drawList: (() => void) | null = null;
  private bar: HTMLElement; private logEl!: HTMLElement; private statusEl!: HTMLElement; private errEl!: HTMLElement; private input!: HTMLInputElement; private titleEl!: HTMLElement;
  onVisit: (on: boolean) => void = () => {}; toast: (m: string) => void = () => {};

  constructor(private scene: VisitScene, barHost: HTMLElement) { this.bar = barHost; this.buildBar(); }

  /** identify me on the network and start watching conversations. Never throws; sets notReady with a friendly reason. */
  async init(): Promise<void> {
    const pn = PN();
    if (!pn) { this.notReady = "Messages isn't available on this page."; return; }
    try {
      const m = await pn.me(); if (!m.user) { await pn.presence.autoJoin(); }
      const m2 = m.user ? m : await pn.me();
      if (!m2.user) { this.notReady = "Messages isn't set up yet. Open Messages on your phone to join, then come back."; return; }
      this.me = m2.user; this.ready = true; this.notReady = "";
      this.unwatchNet = pn.watch((list: Thread[]) => { this.threads.clear(); for (const t of list) this.threads.set(t.tid, t); this.drawList?.(); this.onThreads(); });
    } catch (e) { this.notReady = navigator.onLine === false ? "You're offline right now. Messages will work again when you're back online." : friendly(e, "Messages isn't set up yet."); }
  }

  /* ------------------------------------------------------------ picker panel */
  openPicker(body: HTMLElement): () => void {
    if (this.visiting) { this.pickerVisiting(body); return () => {}; }
    E("p", "dp-note", body, "Hang out in a dorm and chat. Pick a friend, then pick whose room to meet in. 🔒 Chats are private, and your parents can always see them.");
    const msg = E("div", "dp-err", body); msg.setAttribute("aria-live", "polite"); const list = E("div", "", body); this.listEl = list;
    const step = { other: null as NetUser | null };
    const choose = (u: NetUser) => {
      list.innerHTML = ""; msg.textContent = ""; step.other = u;
      E("h3", "", list, "Whose dorm?").style.margin = "4px 0";
      E("div", "dp-note", list, `Meeting ${u.name}. Both of you will see each other there.`);
      const go = (at: "me" | "them") => this.visit(u.handle, at).then((err) => { if (err) { msg.textContent = err; this.drawList?.(); } });
      const a = btn(list, "🏠 Mine", () => go("me"), "dp-btn go"); a.style.cssText += ";width:100%;margin:6px 0;font-size:17px";
      const b = btn(list, `🚪 ${u.name}'s dorm`, () => go("them"), "dp-btn"); b.style.cssText += ";width:100%;margin:6px 0;font-size:17px";
      btn(list, "← Back", () => this.drawList?.(), "dp-btn dp-sm");
    };
    const draw = () => {
      list.innerHTML = "";
      if (!this.ready) { E("p", "dp-err", list, this.notReady || "Getting Messages ready…"); btn(list, "Try again", async () => { await this.init(); draw(); }, "dp-btn dp-sm"); return; }
      E("div", "dp-lab", list, "Your friends");
      const ts = [...this.threads.values()].filter((t) => t.user).sort((a, b) => (b.msgs[b.msgs.length - 1]?.at ?? 0) - (a.msgs[a.msgs.length - 1]?.at ?? 0)), pn = PN();
      if (!ts.length) E("p", "dp-note", list, "No conversations yet. Type a friend's handle below to start one.");
      for (const t of ts) {
        const u = t.user!, ok = !!pn.canChat(this.me, u), row = E("div", "frow" + (ok ? "" : " no"), list);
        E("div", "dot", row, (u.name || "?").slice(0, 1).toUpperCase()).style.background = hue(u.id);
        const nm = E("div", "nm", row); E("b", "", nm, u.name); E("small", "", nm, `@${u.handle} · ${u.grade != null ? pn.gradeName(u.grade) : pn.BANDS?.[u.band] ?? ""}`);
        if (!ok) E("small", "", nm, pn.why(this.me, u) || "You can't chat with this person right now.");
        const b = btn(row, "Visit", () => choose(u), "dp-btn go", `Visit ${u.name}`); b.disabled = !ok;
      }
      E("div", "dp-lab", list, "Start a chat with a handle");
      const r = E("div", "dp-row", list), inp = E("input", "dp-in", r) as HTMLInputElement; inp.type = "text"; inp.placeholder = "Friend's handle"; inp.maxLength = 20; inp.setAttribute("aria-label", "Friend's handle"); inp.style.flex = "1";
      const go = btn(r, "Find", async () => {
        const h = inp.value.trim(); if (!h) { msg.textContent = "Type your friend's handle first."; return; }
        go.disabled = true; msg.textContent = "";
        try { const res = await pn.start(h); choose(res.other); } catch (e) { msg.textContent = friendly(e, "Couldn't find that handle."); } go.disabled = false;
      }, "dp-btn go");
      inp.onkeydown = (e) => { if (e.key === "Enter") go.click(); };
    };
    this.drawList = draw; draw();
    return () => { this.drawList = null; this.listEl = null; };
  }
  private pickerVisiting(body: HTMLElement) {
    E("p", "dp-note", body, `You are visiting ${this.v?.other.name ?? "a friend"}. Use the chat at the bottom, or leave when you're done.`);
    btn(body, "← Leave this visit", () => this.leave(), "dp-btn go");
  }

  /* ------------------------------------------------------------ starting / leaving */
  /** returns an error message, or "" when the visit started */
  async visit(handle: string, at: "me" | "them"): Promise<string> {
    const pn = PN(); if (!this.ready) { await this.init(); if (!this.ready) return this.notReady; }
    if (this.visiting) this.leave();
    let res: { tid: string; other: NetUser };
    try { res = await pn.start(handle); } catch (e) { return friendly(e, "Couldn't start that chat."); }
    const other = res.other, host = at === "me" ? this.me!.id : other.id, room = dormRoom(host);
    const row = classmateRow(other.id), theirDorm = at === "them" ? row?.json?.dorm ?? null : null;
    pn.presence.setRoom(room);
    const th = this.threads.get(res.tid), seen = new Set<string>((th?.msgs ?? []).map((m) => m.id));
    this.v = { tid: res.tid, other, at, room, seen, unRoom: () => {}, hb: 0, here: false, lastEmote: 0, echo: [] };
    this.visiting = true;
    const startSpec = cleanSpec(row?.json?.avatar);
    this.scene.begin({ dorm: theirDorm, their: row?.json?.avatar ? startSpec : cleanSpec(randomAvatar(rng(parseInt(hash36(other.id), 36)), (other.band as any) === "adult" ? "hs" : (other.band as any) || "hs")), theirName: other.name, at });
    this.scene.setAway(true);
    this.announce(true); this.v.hb = window.setInterval(() => this.announce(false), 4000);
    this.v.unRoom = pn.presence.watchRoom(room, (list: PEntry[]) => this.onRoom(list)) || (() => {});
    this.setStatus(); this.titleEl.textContent = `🔒 Private chat with ${other.name} in ${at === "me" ? "your" : `${other.name}'s`} dorm`;
    this.errEl.textContent = at === "them" && !theirDorm ? `${other.name} hasn't shared their dorm yet, so you're meeting in a standard room.` : "";
    this.bar.classList.add("show"); this.onThreads(true); this.onVisit(true); return "";
  }
  leave() {
    const v = this.v; if (!v) return; clearInterval(v.hb); try { v.unRoom(); } catch { /* ignore */ }
    this.v = null; this.visiting = false; this.bar.classList.remove("show"); this.scene.end();
    const pn = PN(); try { pn.presence.setRoom("dorm"); this.announce(true); } catch { /* ignore */ }
    this.onVisit(false);
  }
  /** the page left the dorm view / closed: stop the visit and clear presence of the visit room */
  dispose() { if (this.visiting) this.leave(); this.unwatchNet?.(); }

  /** the room I am "in" when not visiting: 'dorm' while the dorm page is showing, 'hall' once I have left it */
  home(inDorm: boolean) {
    if (this.visiting) { if (!inDorm) this.leave(); return; }
    try { const p = PN().presence; p.setRoom(inDorm ? "dorm" : "hall"); if (this.ready) this.announce(true); } catch { /* quiet */ }
  }
  private announce(force: boolean) { try { PN().presence.announce({ avatar: slimSpec(this.scene.mySpec()), x: 0, z: 0, dir: 0, moving: false }, force); } catch { /* quiet */ } }

  /* ------------------------------------------------------------ room presence + messages */
  private onRoom(list: PEntry[]) {
    const v = this.v; if (!v) return; const e = list.find((x) => x.id === v.other.id);
    if (!!e !== v.here) { v.here = !!e; this.scene.setAway(!e); this.setStatus(); }
    if (e) {
      if (e.spec && Object.keys(e.spec).length) this.scene.setTheirSpec(cleanSpec(e.spec));
      if (e.emote && e.emoteAt && e.emoteAt > v.lastEmote && Date.now() - e.emoteAt < 4000) { v.lastEmote = e.emoteAt; const em = PN().presence.EMOTES.find((x: any) => x.id === e.emote); if (em) this.scene.emote("them", em.emoji, em.id); }
    }
  }
  private setStatus() { const v = this.v; if (!v) return; this.statusEl.textContent = v.here ? `✅ ${v.other.name} is here with you` : `💤 ${v.other.name} is away right now. Your messages will wait for them.`; }
  private onThreads(first = false) {
    const v = this.v; if (!v || !this.me) return; const t = this.threads.get(v.tid); if (!t) { if (first) this.renderLog([]); return; }
    for (const m of t.msgs) {
      if (v.seen.has(m.id)) continue; v.seen.add(m.id); const mine = m.from === this.me.id;
      if (mine) { const i = v.echo.indexOf(m.text); if (i >= 0) { v.echo.splice(i, 1); continue; } }
      this.scene.say(mine ? "me" : "them", m.text);
    }
    this.renderLog(t.msgs);
  }
  private renderLog(msgs: Msg[]) {
    const log = this.logEl, stick = log.scrollHeight - log.scrollTop - log.clientHeight < 40; log.innerHTML = "";
    if (!msgs.length) E("div", "dp-note", log, "Say hi! 👋");
    for (const m of msgs.slice(-40)) { const mine = m.from === this.me?.id, d = E("div", "msgl" + (mine ? " me" : ""), log); E("small", "", d, mine ? "You" : this.v?.other.name ?? ""); d.append(document.createTextNode(m.text)); }
    if (stick) log.scrollTop = log.scrollHeight;
  }

  /* ------------------------------------------------------------ the chat bar */
  private buildBar() {
    const b = this.bar; b.innerHTML = ""; b.setAttribute("role", "region"); b.setAttribute("aria-label", "Dorm chat");
    const top = E("div", "banner", b); this.titleEl = E("b", "", top); this.titleEl.style.flex = "1"; E("span", "", top, "👪 Parents can see this chat");
    btn(top, "Leave", () => this.leave(), "dp-btn dp-sm", "Leave this visit").style.minHeight = "36px";
    this.statusEl = E("div", "dp-note", b); this.statusEl.style.margin = "0"; this.statusEl.setAttribute("aria-live", "polite");
    this.logEl = E("div", "", b); this.logEl.id = "vlog"; this.logEl.setAttribute("role", "log"); this.logEl.setAttribute("aria-live", "polite");
    this.errEl = E("div", "dp-err", b); this.errEl.style.margin = "0"; this.errEl.setAttribute("role", "status");
    const em = E("div", "dp-row", b); em.style.margin = "0"; em.style.flexWrap = "nowrap"; em.style.overflowX = "auto";
    const pn = PN(); for (const x of pn?.presence?.EMOTES ?? []) { const e = btn(em, x.emoji, () => { if (pn.presence.emote(x.id)) this.scene.emote("me", x.emoji, x.id); }, "dp-btn emo", x.label); e.title = x.label; }
    const form = E("form", "dp-row", b); form.style.margin = "0"; form.style.flexWrap = "nowrap";
    this.input = E("input", "dp-in", form) as HTMLInputElement; this.input.type = "text"; this.input.maxLength = 300; this.input.placeholder = "Type a message"; this.input.setAttribute("aria-label", "Type a message"); this.input.autocomplete = "off";
    const send = E("button", "dp-btn go", form, "Send"); send.type = "submit";
    form.onsubmit = async (e) => { e.preventDefault(); await this.send(); };
    b.addEventListener("keydown", (e) => e.stopPropagation());
  }
  private async send() {
    const v = this.v, text = this.input.value.trim(); if (!v || !text) return; this.errEl.textContent = "";
    if (navigator.onLine === false) { this.errEl.textContent = "You're offline. Your message can't be sent until you're back online."; return; }
    const pn = PN(), c = pn.cleanMessage(text) as { text: string; blocked: string | null };
    if (!c.text) { this.errEl.textContent = c.blocked || "Type a message first."; return; }
    v.echo.push(c.text);
    try { await pn.send(v.tid, text); this.input.value = ""; this.scene.say("me", c.text); }
    catch (e) {
      const m = friendly(e, "That message couldn't be sent. Please try again."); this.errEl.textContent = m;
      if (c.blocked) { this.input.value = ""; this.scene.say("me", c.text); } else v.echo = v.echo.filter((x) => x !== c.text);   // sent, with private details hidden
    }
  }
}
