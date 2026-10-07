/** Sims-style relationships: friendships grow slowly (daily cap), people react to what you say (laugh, roll their eyes, ignore you, get pushy, get mean),
 *  older kids talk more casually and more deeply, and kids only talk freely with their own grade group. */
import { bandOf, kindFor, slangFor, trendOf, type Band, type TrendKind } from "./trends";
import type { Convo, Reply, Mood } from "./dialogue";
import type { Personality } from "./roster";
import { Social, bump, today } from "./social";

export const CONTACT_FR = 20;
export const RELATE_IDS = new Set(["trend", "tease", "silly", "vent", "deep", "highfive", "apologize", "snap", "push_yes", "push_no"]);
export const playerBand = (): Band => bandOf((Social.profile.avatar as any)?.age);
/** can this player chat freely with this NPC? (same grade group, or a teacher/staff member) */
export const sameGroup = (npc: { role: string; age: string }) => npc.role === "staff" || bandOf(npc.age) === playerBand();
export const stage = (fr: number) => fr >= 85 ? "best friend" : fr >= 60 ? "good friend" : fr >= 35 ? "friend" : fr >= CONTACT_FR ? "buddy" : fr >= 8 ? "acquaintance" : "stranger";
const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)];

/** friendship grows slowly: at most 10 points per person per day, so a new face is never an instant best friend */
export function gain(id: number, d: number): number {
  if (d <= 0) { bump(id, d); return d; }
  let given = 0; Social.edit(id, (m) => { const day = (m as any).capDay === today() ? ((m as any).capPts ?? 0) : 0, room = Math.max(0, 10 - day); given = Math.min(d, room); (m as any).capDay = today(); (m as any).capPts = day + given; });
  if (given) { const before = Social.mem(id).fr; bump(id, given); if (before < CONTACT_FR && before + given >= CONTACT_FR) { try { dispatchEvent(new CustomEvent("unify:contact", { detail: { id } })); } catch { /* none */ } } }
  return given;
}
/** old friendships fade a little if you never visit (checked when the game opens) */
export function decay() { const now = Date.parse(today()); for (const { id, mem } of Social.friends()) { if (!mem.lastDay) continue; const days = (now - Date.parse(mem.lastDay)) / 864e5; if (days >= 6 && mem.fr > 10) { const drop = Math.min(mem.fr - 10, Math.floor((days - 3) / 3)); if (drop > 0 && (mem as any).decayDay !== today()) Social.edit(id, (m) => { m.fr -= drop; (m as any).decayDay = today(); }); } } }

const FIT: Record<string, Partial<Record<Personality, number>>> = {
  tease: { funny: 2, sporty: 1, cheerful: 1, curious: 0, dreamy: 0, bossy: -1, nerdy: -1, artsy: -1, kind: -1, shy: -2 },
  silly: { funny: 2, cheerful: 2, curious: 1, artsy: 1, sporty: 1, dreamy: 1, kind: 1, shy: 0, nerdy: 0, bossy: -1 },
  vent: { kind: 2, dreamy: 1, artsy: 1, curious: 1, cheerful: 0, shy: 0, nerdy: 0, funny: 0, sporty: 0, bossy: -1 },
  deep: { dreamy: 2, artsy: 2, curious: 2, nerdy: 1, kind: 1, shy: 0, cheerful: 0, funny: 0, sporty: -1, bossy: -1 },
  trend: { cheerful: 2, funny: 1, artsy: 2, sporty: 1, curious: 1, kind: 1, dreamy: 1, shy: 0, nerdy: 0, bossy: 0 },
  highfive: { sporty: 2, cheerful: 2, funny: 1, kind: 1, bossy: 1, curious: 1, artsy: 0, dreamy: 0, nerdy: 0, shy: -1 },
};
const score = (c: Convo, id: string) => { const n = c.npc, m = c.mem; let s = (FIT[id]?.[n.personality] ?? 0) + (m.fr >= 45 ? 1 : m.fr < 8 && ["tease", "snap", "vent", "deep"].includes(id) ? -1 : 0) + (m.mood > 2 ? 1 : m.mood < -2 ? -1 : 0); const x = c.r(); if (x < 0.2) s -= 1; else if (x > 0.8) s += 1; return s; };
type Out = "great" | "ok" | "bad";
const tier = (s: number): Out => (s >= 2 ? "great" : s >= 0 ? "ok" : "bad");
const MOOD: Record<Out, Mood[]> = { great: ["excited", "happy"], ok: ["happy", "neutral"], bad: ["annoyed", "sad"] };
const ACT: Record<string, Record<Out, string[]>> = {
  tease: { great: ["laugh", "silly"], ok: ["shrug", "laugh"], bad: ["eyeroll", "shake"] }, silly: { great: ["laugh", "dance", "silly"], ok: ["laugh", "shrug"], bad: ["eyeroll", "facepalm"] },
  vent: { great: ["nod"], ok: ["nod"], bad: ["shrug"] }, deep: { great: ["scratch", "nod"], ok: ["scratch", "shrug"], bad: ["shrug", "shy"] }, trend: { great: ["excited", "cheer"], ok: ["nod", "thumbs"], bad: ["shrug"] },
  highfive: { great: ["highfive", "cheer"], ok: ["highfive"], bad: ["shy"] }, apologize: { great: ["nod"], ok: ["nod"], bad: ["eyeroll"] }, snap: { great: ["shake"], ok: ["shake"], bad: ["facepalm", "eyeroll"] },
};
const L = (npc: { first: string }, me: string, r: () => number, band: Band) => ({ first: npc.first, me, slang: slangFor(band, Math.floor(r() * 9)) });

export function relate(c: Convo, id: string, data?: any): Reply {
  const n = c.npc, m = c.mem, r = c.r, band = bandOf(n.age), me = c.me, o = L(n, me, r, band), P = n.personality as Personality, hs = band === "hs", mid = band === "g68", young = band === "k2" || band === "g35";
  const done = (text: string, out: Out, delta: number, opts: Partial<Reply> = {}): Reply => { const act = pick(r, ACT[id]?.[out] ?? ["nod"]); const rep = c.reply(text, { mood: pick(r, MOOD[out]), delta, ...opts }); (rep as any).act = act; if (delta < 0) Social.edit(n.id, (mm) => { mm.mood = Math.max(-5, mm.mood - 1); }); if (delta > 0) Social.edit(n.id, (mm) => { mm.mood = Math.min(5, mm.mood + 1); }); return rep; };
  switch (id) {
    case "trend": {
      const kind: TrendKind = Math.random() < 0.55 ? kindFor(n.interests[0] ?? "") : (["music", "fashion", "game", "show", "hobby"] as TrendKind[])[Math.floor(r() * 5)], t = trendOf(band, kind, n.id) ?? "everything", t2 = trendOf(band, kind, n.id + 3) ?? t, s = score(c, id), out = tier(s);
      const lead = { music: "listening to", fashion: "into", hobby: "obsessed with", game: "playing", show: "watching", sport: "into", slang: "saying" }[kind];
      const good = pick(r, young ? [`Ooh, I'm ${lead} ${t}! Everyone at my table is too!`, `${t}! Have you tried it? It's so fun.`] : mid ? [`Honestly? I'm ${lead} ${t} right now. Lowkey can't stop. What about you?`, `Everyone's on ${t} lately. My cousin put me on it and now I'm ${o.slang}.`] : [`Okay so I'm ${lead} ${t} and I have opinions. ${n.interests[0] ? `It kind of pairs with my ${n.interests[0]} thing.` : ""} You?`, `Real talk, ${t} and ${t2}. That's the whole personality this month.`]);
      const meh = pick(r, [`Hm, I'm not really into what everyone's into. I'd rather do ${n.interests[0] ?? "my own thing"}.`, `Trends come and go. I stick to ${n.interests[0] ?? "what I like"}.`]);
      return done(out === "bad" ? meh : good, out, out === "great" ? 3 : out === "ok" ? 2 : 1, out === "bad" ? { mood: "neutral" } : {});
    }
    case "highfive": { const s = score(c, id), out = tier(s); return done(pick(r, out === "bad" ? ["Oh! Um, okay... *awkward tap*", "Maybe later.", "I'm good, thanks."] : out === "great" ? ["*SMACK* Yes!", "Up top! That one was loud!", "Boom! We're basically a team now."] : ["Up top.", "Nice.", "*high five*"]), out, out === "bad" ? 0 : out === "great" ? 3 : 1); }
    case "silly": { const s = score(c, id), out = tier(s); const g = pick(r, young ? ["HAHA! Do it again, do it again!", "That's the silliest thing ever!"] : ["Okay, that was ridiculous. I'm crying.", "I can't. I literally can't. Stop.", `${o.slang}, you're unreal.`]); const bd = pick(r, ["...Why are we doing this?", "Okay. That was weird. Even for here.", P === "bossy" ? "Can we be serious for one second?" : "Um. Cool. Moving on."]); return done(out === "bad" ? bd : g, out, out === "bad" ? -1 : out === "great" ? 3 : 1); }
    case "tease": {
      const s = score(c, id) - (m.fr < 10 ? 1 : 0), out = tier(s), thing = c.feat.noun;
      const g = pick(r, [`Oh you did NOT. ...Okay that's fair. I do love my ${thing}.`, `Rude! But accurate. I walked into that one.`, `Wow, wow, okay. I see how it is. Nice one though.`, `Careful. I tease back, and I'm better at it.`]);
      const b = pick(r, P === "shy" ? ["...That kind of stings, actually.", "Oh. Okay. I'll just... go over there."] : P === "kind" ? ["That wasn't very nice. I thought we were friends."] : ["Okay, ouch. Not funny.", "Cool. Really cool. Thanks.", "Hm. Noted."]);
      return done(out === "bad" ? b : g, out, out === "bad" ? -3 : out === "great" ? 3 : 1, { options: out === "bad" ? [{ id: "apologize", label: "Say sorry" }, { id: "bye", label: "Walk away" }] : undefined });
    }
    case "vent": {
      if (m.fr < 20) return done(pick(r, ["Oh. Um, we don't know each other that well yet. Maybe talk about something lighter first?", "I'd like to hear it eventually. Let's get to know each other a little first."]), "ok", 0);
      const s = score(c, id), out = tier(s); const g = pick(r, [`I'm listening. Take your time, ${me}. That sounds really hard.`, `Ugh, that's rough. You don't have to be okay about it. I've got you.`, hs ? `Yeah. Some days are just a lot. Want to sit here for a minute? No fixing, just company.` : `I'm sorry. Do you want a hug or a snack or both?`]);
      Social.learn("vented", today()); return done(out === "bad" ? pick(r, ["I want to help, I really do. I'm just not great with big feelings. Maybe a teacher could help too?"]) : g, out, out === "bad" ? 1 : 4);
    }
    case "deep": {
      if (m.fr < 25 || young) return done(pick(r, ["That's a big question. Can we talk about something smaller? Like snacks?"]), "ok", 0);
      const q = pick(r, hs ? ["Do you ever think about what you'll be like in ten years?", "Do you think people ever really change?", "What are you most afraid of, honestly?", "Is it weird that I miss things that haven't happened yet?"] : ["What do you want to be when you grow up, for real?", "Do you ever feel like everyone else has it figured out?"]);
      const a = pick(r, [`...Honestly? ${n.dream ? `I want to ${n.dream}. But I'm scared I'll mess it up.` : "I don't know. I think about it a lot."}`, "Whoa. Nobody ever asks me that. Give me a sec.", hs ? "Okay, that took me somewhere. I think I'm scared of being ordinary, and also scared of not being." : "I think I'm scared of being forgotten. Weird, right?"]);
      Social.edit(n.id, (mm) => { mm.facts.deepTalk = today(); }); const s = score(c, id), out = tier(s); return done(`${q} ...${out === "bad" ? "That's a lot. Can we talk about it another day?" : a}`, out, out === "bad" ? 0 : 4);
    }
    case "snap": {
      const out: Out = "bad"; Social.edit(n.id, (mm) => { mm.hurt++; }); const rep = done(pick(r, P === "bossy" ? ["Excuse me?! You can't talk to me like that.", "Wow. No. Try that again, nicely."] : P === "shy" ? ["...Okay. I'm sorry I bothered you.", "I'll... just go."] : P === "funny" ? ["Whoa. Okay. Even I'm not laughing."] : ["That was really unkind. I didn't do anything to you.", "Ouch. Okay. I'm done talking."]), out, -6, { end: !!(m.hurt >= 2), options: [{ id: "apologize", label: "I'm sorry, that was wrong" }, { id: "bye", label: "Walk away" }] });
      return rep;
    }
    case "apologize": {
      const out: Out = m.hurt >= 3 && m.fr < 10 ? "bad" : m.hurt ? "ok" : "great"; Social.edit(n.id, (mm) => { if (mm.hurt > 0 && out !== "bad") mm.hurt--; });
      return done(out === "bad" ? "I... don't know. It's going to take a while. Maybe be kinder from now on." : pick(r, [`Thank you for saying that. It means a lot. We're okay.`, `Okay. Apology accepted. Just... be kind to me, alright?`, `Hey, thanks for owning it. That takes guts.`]), out, out === "bad" ? 0 : 3);
    }
    case "push_yes": return done(`Good. I knew you had good taste. Lunch table, front row. Don't be late!`, "great", 3, { mood: "excited" });
    case "push_no": return done(pick(r, [`Seriously? Fine. Whatever. I'll ask someone else.`, `Wow, okay. Remember who invited you first.`]), "bad", -3, { mood: "annoyed" });
  }
  return c.reply("Hm?", { mood: "neutral" });
}

/** an NPC sometimes starts the conversation in their own way: ignores you, pushes you, or is a bit mean (never cruel) */
export function opener(c: Convo): Reply | null {
  const n = c.npc, m = c.mem, P = n.personality as Personality, r = c.r, me = c.me;
  if (m.met && m.hurt >= 3 && m.fr < 10) { const rep = c.reply(pick(r, ["(looks away and pretends to read something)", "...", "(turns toward the wall and keeps walking)"]), { mood: "annoyed", end: true, options: [] }); (rep as any).act = "eyeroll"; return rep; }
  if (m.met && P === "bossy" && m.fr >= 12 && m.fr < 60 && r() < 0.5 && c.ctx.kind !== "class") { const rep = c.reply(`${me}. Lunch. You're sitting with me today. I already saved you a seat.`, { mood: "excited", options: [{ id: "push_yes", label: "Okay, sure!" }, { id: "push_no", label: "Actually, I made other plans" }] }); (rep as any).act = "point"; return rep; }
  if (m.met && (P === "funny" || P === "sporty") && m.fr < 25 && m.fr >= 6 && r() < 0.18) { const rep = c.reply(pick(r, [`Oh, look who it is. Try to keep up this time.`, `Hey ${me}. Nice walk. Real fast. Like a sloth.`]), { mood: "happy", options: [{ id: "tease", label: "Tease back" }, { id: "highfive", label: "Laugh and high five" }, { id: "snap", label: "Snap at them" }, { id: "bye", label: "Keep walking" }] }); (rep as any).act = "silly"; return rep; }
  return null;
}
