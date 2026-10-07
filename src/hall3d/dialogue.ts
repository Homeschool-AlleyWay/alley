/** Two-way conversation engine. Buttons and typed text both work; every reply is shaped by the NPC's personality, their backstory,
 *  and what they remember about the player (friendship, past topics, things the player told them). An optional /api/chat model
 *  call handles free text when the server has a key; otherwise the local engine answers. */
import { ROSTER, STAFF, byId, type NpcDef, type Personality, type Subj, TEACHER_BY_SUBJECT } from "./roster";
import { Social, remember, bump, today, tier, type Mem } from "./social";
import { quizFor, type Quiz } from "./quizbank";
import { lookFeatures, rng } from "./avatar";

export type Mood = "happy" | "neutral" | "shy" | "excited" | "sad" | "annoyed";
export interface Ctx { place: string; kind: "arrive" | "class" | "lunch" | "dismiss"; period: string; clock: string }
export interface Opt { id: string; label: string; data?: any }
export interface Reply { text: string; options: Opt[]; mood: Mood; delta: number; end?: boolean; quiz?: Quiz }

const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const SUBJ_NAME: Record<Subj, string> = { math: "math", ela: "reading and writing", science: "science", history: "history", careers: "careers", life: "life skills" };
const HOBBIES = ["soccer", "drawing", "video games", "reading", "baking", "music", "dancing", "robots", "swimming", "chess", "skateboarding", "gardening", "photography", "basketball"];
const FOOD_OPTS = ["pizza", "tacos", "pasta", "sushi", "pancakes", "fried rice", "burgers", "dumplings"];
const JOKES = [
  ["Why did the student eat their homework?", "Because the teacher said it was a piece of cake!"], ["What do you call a sleeping bull?", "A bulldozer!"], ["Why was the math book sad?", "It had too many problems."],
  ["What did the ocean say to the beach?", "Nothing, it just waved."], ["Why can't you trust atoms?", "They make up everything!"], ["What has hands but can't clap?", "A clock!"], ["Why did the scarecrow win an award?", "He was outstanding in his field."],
  ["What kind of tree fits in your hand?", "A palm tree!"], ["Why do bees have sticky hair?", "Because they use honeycombs."], ["What do you call cheese that isn't yours?", "Nacho cheese!"],
];
/** short voice fragments so each personality sounds like itself */
const V: Record<Personality, { yes: string[]; hm: string[]; wow: string[]; bye: string[] }> = {
  cheerful: { yes: ["Yay!", "Oh, totally!", "Ooh!"], hm: ["Hmm, let's see!", "Good question!"], wow: ["No way, that's awesome!", "I love that!"], bye: ["See you soon!", "Bye bye, have a sunny day!"] },
  shy: { yes: ["Um, yeah.", "...Okay."], hm: ["Uh... I think...", "Hmm, um..."], wow: ["Oh! Really? That's... nice.", "Wow. Um, cool."], bye: ["Um, bye.", "Okay... see you."] },
  sporty: { yes: ["Yep!", "Heck yeah!"], hm: ["Okay, huddle up.", "Let me think, coach mode."], wow: ["Let's gooo!", "That's a W!"], bye: ["Catch you on the field!", "Hustle, hustle!"] },
  nerdy: { yes: ["Correct.", "Indeed."], hm: ["Technically speaking,", "Fun fact:"], wow: ["Fascinating!", "That's statistically cool."], bye: ["Until next time. Cite your sources.", "Farewell!"] },
  artsy: { yes: ["Mm, yes.", "Beautiful."], hm: ["Let me paint you a picture...", "Hmm, imagine this:"], wow: ["That's so inspiring!", "Oh, the colors in that!"], bye: ["Stay colorful!", "Goodbye, friend, go make something."] },
  funny: { yes: ["Ha! Yes.", "You bet."], hm: ["Okay, hear me out.", "So, plot twist:"], wow: ["Shut the front door!", "Okay that's actually hilarious."], bye: ["I'd say 'break a leg' but we have PE next.", "Later, alligator!"] },
  curious: { yes: ["Ooh, yes!", "Wait, really?"], hm: ["Hmm, why though?", "I wonder..."], wow: ["Tell me more!", "That is so interesting!"], bye: ["I have so many more questions! Bye!", "See you! Don't forget to ask 'why'."] },
  bossy: { yes: ["Obviously.", "Correct."], hm: ["Listen.", "Here's the plan:"], wow: ["Good. I approve.", "Not bad. Not bad at all."], bye: ["Don't be late.", "Dismissed! ...kidding. Mostly."] },
  dreamy: { yes: ["Mm, yes...", "Oh, yes."], hm: ["I was just wondering...", "Hmm, imagine..."], wow: ["Ooh, that's like a story.", "That sounds magical."], bye: ["Goodbye... see you in the clouds.", "Bye. I'll daydream about it."] },
  kind: { yes: ["Of course!", "Happy to!"], hm: ["Let me think about it.", "Good thought."], wow: ["That's wonderful!", "I'm so glad."], bye: ["Take care of yourself!", "Bye! I'm rooting for you."] },
};
const featPhrase = (npc: NpcDef, r: () => number) => { const f = lookFeatures(npc.spec).filter((x) => x.key !== "shoes"); return pick(r, f); };
const topicLabel: Record<string, string> = { how: "how our day was going", class: "school subjects", hobby: "hobbies", you: "each other's stories", food: "food", gossip: "the latest hallway news", joke: "a joke", help: "studying", quiz: "a quiz question", compliment: "style", invite: "hanging out" };

/** one conversation with one NPC */
export class Convo {
  used = new Set<string>(); turns = 0; quiz?: Quiz; r: () => number; history: { who: "me" | "npc"; text: string }[] = []; waiting: null | "hobby" | "food" | "fav" | "feel" | "quiz" | "name" = null;
  constructor(public npc: NpcDef, public ctx: Ctx) { this.r = rng(npc.id * 977 + Math.floor(Date.now() / 60000)); }
  private _feat?: { phrase: string; noun: string };
  /** the one thing about this NPC the player can compliment (stable for the whole chat) */
  get feat() { return this._feat ?? (this._feat = featPhrase(this.npc, rng(this.npc.id * 13 + 5))); }
  get mem(): Mem { return Social.mem(this.npc.id); }
  get me() { return Social.profile.name || "friend"; }
  private v(s: string, extra: Record<string, string> = {}) {
    const n = this.npc, m = this.mem, vars: Record<string, string> = { me: this.me, first: n.first, grade: n.grade, hobby: m.facts.hobby ?? "", interest: n.interests[0], food: n.food, dream: n.dream, ...extra };
    return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  }
  private pc(map: Partial<Record<Personality, string>> & { d: string }) { return this.v(map[this.npc.personality] ?? map.d); }
  private flavor(text: string, p = 0.33) { return this.r() < p ? `${pick(this.r, V[this.npc.personality].yes)} ${text}` : text; }
  private reply(text: string, o: Partial<Reply> = {}): Reply {
    const rep: Reply = { text, options: o.options ?? this.menu(), mood: o.mood ?? "happy", delta: o.delta ?? 0, end: o.end, quiz: o.quiz };
    this.turns++; this.history.push({ who: "npc", text }); remember(this.npc.id, "npc", text);
    if (rep.delta) bump(this.npc.id, rep.delta);
    return rep;
  }
  private note(topic: string) { this.used.add(topic); Social.edit(this.npc.id, (m) => { m.topics.push(topic); if (m.topics.length > 24) m.topics.shift(); m.lastDay = today(); m.lastAt = Date.now(); }); }

  /* ------------------------------------------------------------ greeting */
  greet(): Reply {
    const n = this.npc, m = this.mem, first = !m.met, since = Date.now() - m.lastAt, days = m.lastDay && m.lastDay !== today() ? Math.max(1, Math.round((Date.parse(today()) - Date.parse(m.lastDay)) / 864e5)) : 0;
    const me = this.me; let text: string, mood: Mood = "happy", delta = 0;
    const feat = featPhrase(n, this.r).phrase;
    if (first) {
      text = this.pc({
        cheerful: `Hi hi! I'm ${n.first}! I'm in grade ${n.grade}. Are you new here? I love your ${lookFeatures(Social.profile.avatar).find((f) => f.key === "top")?.phrase ?? "style"}!`,
        shy: `Oh! Um... hi. I'm ${n.first}. ...Are you ${me}?`, sporty: `Hey! I'm ${n.first}. You look fast. You play anything?`, nerdy: `Hello. I'm ${n.first}, grade ${n.grade}. Did you know this hall has exactly ${44} rows of tiles? ...Sorry. Hi.`,
        artsy: `Hi! I'm ${n.first}. I love the colors you're wearing. Is that on purpose?`, funny: `Hey, I'm ${n.first}. Don't worry, I'm funnier than I look.`, curious: `Hi! I'm ${n.first}! Wait, who are you? What do you like? Tell me everything!`,
        bossy: `Hi. I'm ${n.first}. I run the ${n.interests[0]} club. You should join.`, dreamy: `Oh... hi. I'm ${n.first}. I was just imagining we were all on a ship. Welcome aboard.`, kind: `Hi there! I'm ${n.first}. Welcome! Can I help you find anything?`, d: `Hi! I'm ${n.first}.`,
      });
      if (Social.profile.name) text += ` Nice to meet you, ${me}!`;
      Social.edit(n.id, (mm) => { mm.met = true; mm.fr = Math.max(mm.fr, 2); }); Social.profile.stats.talks++; delta = 1; mood = n.personality === "shy" ? "shy" : "happy";
    } else if (m.hurt >= 2 && m.fr < 12) { text = this.pc({ d: "Oh. Hi.", funny: "Oh. It's you. Hi, I guess.", kind: "Hi. I'm still a bit upset, but hi." }); mood = "annoyed"; }
    else {
      const t = tier(m.fr);
      const base = t === "best friend" ? `There you are, ${me}! My favorite person!` : t === "close friend" ? `${me}! I was hoping I'd see you!` : t === "friend" ? `Hey ${me}!` : `Hi again, ${me}.`;
      let call = "";
      if (since < 8 * 60e3 && m.lastAt) call = pick(this.r, ["Back so soon?", "Missed me already?", "Did you forget something?"]);
      else if (m.lunchBuddy && this.ctx.kind === "lunch") call = "Still on for lunch together?";
      else if (m.facts.hobby && this.r() < 0.6) call = `How's ${m.facts.hobby} going?`;
      else if (m.facts.mood && ["sad", "tired", "nervous", "stressed", "worried", "lonely"].includes(m.facts.mood) && this.r() < 0.8) call = `Are you feeling less ${m.facts.mood} than last time?`;
      else if (m.quiz.total > 0 && this.r() < 0.5) call = m.quiz.right >= m.quiz.total / 2 ? "You were so good at that quiz stuff last time." : "Want another try at those quiz questions?";
      else if (m.topics.length) call = `Last time we talked about ${topicLabel[m.topics[m.topics.length - 1]] ?? "stuff"}. That was fun.`;
      else call = "";
      const ctxLine = this.ctx.place === "class" ? pick(this.r, ["Shh! Whisper, the teacher is right there.", "Psst, quietly!", "Hi! Quick, before she looks over."]) : days >= 2 ? `It's been ${days} days!` : this.ctx.kind === "arrive" ? pick(this.r, ["Morning already!", "Ready for today?"]) : this.ctx.kind === "lunch" ? pick(this.r, ["I'm starving.", "Lunch smells good today."]) : this.ctx.kind === "dismiss" ? "Almost time to go home!" : this.ctx.kind === "class" ? "Shouldn't we both be in class? ...I won't tell." : "";
      text = `${base} ${call || ctxLine}`.trim(); delta = days ? 1 : 0; Social.profile.stats.talks++;
    }
    Social.edit(n.id, (mm) => { mm.lastDay = today(); mm.lastAt = Date.now(); mm.talks++; });
    void feat;
    return this.reply(text, { mood, delta, options: this.menu() });
  }

  /* ------------------------------------------------------------ menu */
  menu(): Opt[] {
    const n = this.npc, m = this.mem, out: Opt[] = [], add = (id: string, label: string) => { if (out.length < 5) out.push({ id, label }); };
    const bank: [string, string, boolean][] = [
      ["how", "How's your day going?", true], ["hobby", "What do you do for fun?", true], ["class", "What's your favorite subject?", true], ["you", "Tell me about yourself", true],
      ["quiz", "Quiz me!", n.personality === "nerdy" || n.personality === "curious" || m.fr >= 10], ["gossip", "Heard anything interesting?", m.fr >= 8], ["compliment", `I like your ${this.feat.noun}`, true],
      ["food", "What's your favorite food?", true], ["joke", "Tell me a joke", n.personality === "funny" || m.fr >= 6], ["help", "Can you help me study?", m.fr >= 6], ["invite", "Want to eat lunch together?", m.fr >= 12 && !m.lunchBuddy],
      ["advice", "I need some advice", m.fr >= 15],
    ];
    const fresh = bank.filter(([id, , ok]) => ok && !this.used.has(id));
    // rotate so repeat visits aren't identical: start from the first topic not recently discussed
    fresh.sort((a, b) => (m.topics.lastIndexOf(a[0]) + 1 || -1) - (m.topics.lastIndexOf(b[0]) + 1 || -1));
    fresh.slice(0, 4).forEach(([id, label]) => add(id, label));
    out.push({ id: "bye", label: "See you later" });
    return out;
  }
  private back(extra: Opt[] = []): Opt[] { return [...extra, ...this.menu().filter((o) => !extra.some((e) => e.id === o.id))].slice(0, 5); }

  /* ------------------------------------------------------------ choices (buttons) */
  choose(id: string, data?: any): Reply {
    const n = this.npc, m = this.mem, r = this.r, V0 = V[n.personality];
    const first = !this.used.has(id); const pts = (x: number) => (first ? x : 0);
    if (id.startsWith("ans")) return this.answer(Number(id.slice(3)));
    this.history.push({ who: "me", text: this.optLabel(id, data) }); remember(n.id, "me", this.optLabel(id, data));
    if (id !== "hobby_pick" && id !== "food_pick" && id !== "fav_pick" && id !== "feel") this.note(id);
    switch (id) {
      case "bye": return this.reply(this.v(`${pick(r, V0.bye)} ${m.fr >= 30 ? "Come find me later, " + this.me + "!" : ""}`).trim(), { end: true, options: [] });
      case "how": {
        const t = this.ctx.kind === "arrive" ? this.pc({ cheerful: "Great! The bus was only a little loud today.", shy: "Okay... a little nervous about class, honestly.", sporty: "Pumped! I jogged here.", nerdy: "Productive. I reviewed my notes on the bus.", artsy: "Inspired! The light in this hallway is gorgeous.", funny: "Surviving! Barely. Breakfast was just a banana peel and hope.", curious: "So good! I've already asked three questions today.", bossy: "Busy. I've got a schedule to keep.", dreamy: "Floaty. I woke up from a really good dream.", kind: "Good! How about you?", d: "Pretty good!" })
          : this.pc({ cheerful: "Awesome! How are you?", shy: "Fine... thanks for asking.", sporty: "Great, I've got practice later!", nerdy: "Well, my pencil snapped, but otherwise fine.", artsy: "Creative. I sketched a bird during snack.", funny: "My day is like a sandwich: mostly bread.", curious: "Curious as ever. And you?", bossy: "Efficient. And you?", dreamy: "Drifty, but nice.", kind: "I'm good, thank you! How are you doing?", d: "Good! You?" });
        return this.reply(`${t}`, { delta: pts(1), options: [{ id: "feel", label: "I'm doing great", data: "great" }, { id: "feel", label: "A little tired", data: "tired" }, { id: "feel", label: "Kind of nervous", data: "nervous" }, { id: "feel", label: "Sort of sad", data: "sad" }] });
      }
      case "feel": {
        const f = String(data); Social.learn("mood", f); Social.edit(n.id, (mm) => { mm.facts.mood = f; });
        const t = f === "great" ? this.flavor(pick(r, ["That's awesome, it's contagious!", "Love that energy!", "Good! Keep it going!"]))
          : f === "tired" ? this.pc({ cheerful: "Aw, me too sometimes. Have some water and a snack!", shy: "Me too... maybe we can both sit quietly for a second.", sporty: "Shake it out! A few jumping jacks and you'll be good.", nerdy: "Sleep is scientifically important. Try going to bed earlier.", d: "Hang in there. Maybe a snack at lunch will help?" })
          : f === "nervous" ? this.pc({ cheerful: "You've totally got this! I believe in you!", shy: "Oh. I get nervous too. We can be nervous together.", sporty: "Deep breath. Treat it like the big game, you've trained for this.", nerdy: "Statistically, most of the things we worry about don't happen.", d: "It's okay to feel that way. One step at a time." })
          : this.pc({ kind: "I'm sorry. Do you want to sit together for a bit? I'll listen.", funny: "Aw. Okay, emergency compliment: your whole vibe is great.", d: "I'm sorry you're sad. I'm here if you want to talk." });
        return this.reply(t, { delta: pts(2) + 1, mood: f === "sad" ? "sad" : "happy", options: this.back() });
      }
      case "class": {
        const fav = n.favSubject, hard = n.hardSubject;
        const why = { math: "numbers always make sense", ela: "stories take me places", science: "I get to find out how things work", history: "the past is full of surprises", careers: "I like imagining jobs I could have", life: "I like learning how grown-up things work" }[fav];
        return this.reply(this.v(`I love ${SUBJ_NAME[fav]}. ${cap(why)}. ${SUBJ_NAME[hard] === SUBJ_NAME[fav] ? "" : `${cap(SUBJ_NAME[hard])} is harder for me, though.`} What's yours?`), { delta: pts(1), mood: "happy", options: (["math", "ela", "science", "history"] as Subj[]).map((s) => ({ id: "fav_pick", label: cap(SUBJ_NAME[s]), data: s })).concat([{ id: "back", label: "Not sure yet", data: "" } as any]) });
      }
      case "fav_pick": {
        const s = data as Subj; Social.learn("favSubject", s); Social.edit(n.id, (mm) => { mm.facts.favSubject = s; });
        const same = s === n.favSubject;
        return this.reply(same ? this.v(`No way, ${SUBJ_NAME[s]} is my favorite too! We should study together sometime.`) : s === n.hardSubject ? this.v(`Really? ${cap(SUBJ_NAME[s])} is tough for me. Maybe you could help me!`) : this.v(`${cap(SUBJ_NAME[s])}, nice! I'd like to hear more about that.`), { delta: same ? 4 : 2, mood: same ? "excited" : "happy", options: this.back() });
      }
      case "back": return this.reply(this.flavor("Okay! What else?"), { options: this.menu() });
      case "hobby": {
        const i = n.interests[0], detail = { soccer: "I practice every day after school.", chess: "I'm working on a new opening.", baking: "Yesterday I made lemon cookies.", "robotics club": "We're building a robot that picks up balls.", dinosaurs: "My favorite is the Triceratops!", drawing: "I fill a notebook every week." }[i as string] ?? `I could talk about ${i} all day.`;
        this.waiting = "hobby";
        return this.reply(this.v(`I'm really into ${i}. ${detail} I also like ${n.interests[1]}. What about you?`), { delta: pts(1), options: [...[n.interests[0], ...HOBBIES.filter((h) => !n.interests.includes(h)).slice(0, 3), "something else"].map((h) => ({ id: "hobby_pick", label: cap(h), data: h })) ] });
      }
      case "hobby_pick": {
        const h = String(data).toLowerCase(); this.waiting = null;
        if (h === "something else") return this.reply(this.flavor("Ooh, tell me what it is! Just type it below."), { options: this.menu(), mood: "excited" });
        Social.learn("hobby", h); Social.edit(n.id, (mm) => { mm.facts.hobby = h; });
        const match = n.interests.some((x) => x.includes(h) || h.includes(x));
        return this.reply(match ? this.v(`No way, we like the same thing! ${pick(r, V0.wow)} We should do ${h} together sometime.`) : this.v(`${cap(h)}? Cool! ${pick(r, V0.wow)} I've never really tried it. Maybe you can show me.`), { delta: match ? 5 : 2, mood: match ? "excited" : "happy", options: this.menu() });
      }
      case "you": {
        const t = tier(m.fr), k = m.talks;
        const line = t === "new face" ? n.bio : t === "classmate" ? `I live with ${n.pet ?? "my family"}${n.pet ? "" : ", it's pretty loud"}, and I could eat ${n.food} every day.` : t === "friend" ? `Someday I want to ${n.dream}. I haven't told many people that.` : t === "close friend" ? `Okay, a secret: I ${n.quirk}. Everyone's noticed, I think.` : `You're my best friend, so... I ${n.secret}. Please don't tell.`;
        return this.reply(this.v(line), { delta: pts(t === "new face" ? 1 : 2) + (k % 3 === 0 ? 0 : 0), mood: t === "best friend" ? "shy" : "happy" });
      }
      case "food": { this.waiting = "food"; return this.reply(this.v(`Easy: ${n.food}! What's yours?`), { delta: pts(1), options: [...FOOD_OPTS.slice(0, 4).map((f) => ({ id: "food_pick", label: cap(f), data: f })), { id: "food_pick", label: cap(n.food), data: n.food }].slice(0, 5) }); }
      case "food_pick": {
        const f = String(data); Social.learn("food", f); Social.edit(n.id, (mm) => { mm.facts.food = f; }); this.waiting = null;
        return this.reply(f === n.food ? this.v(`${cap(f)}! We have the same taste. Today's lunch better be good.`) : this.v(`${cap(f)} is good too. I'd trade you some ${n.food} for it.`), { delta: f === n.food ? 4 : 1, mood: f === n.food ? "excited" : "happy", options: this.menu() });
      }
      case "gossip": return this.gossip(first);
      case "compliment": {
        const f = this.feat; const t = this.pc({ shy: `Oh! Um... thank you. I picked my ${f.phrase} myself.`, cheerful: `Aww, thanks! I love my ${f.phrase} too!`, artsy: `Thank you! My ${f.phrase} is part of my whole look.`, sporty: `Ha, thanks! Gotta look good when we win.`, funny: `Thanks! My ${f.noun} has been told it's the best part of me.`, d: `Thanks! That's sweet. I like my ${f.phrase} too.` });
        return this.reply(t, { delta: pts(3), mood: n.personality === "shy" ? "shy" : "happy" });
      }
      case "joke": {
        const [q, a] = pick(r, JOKES); const pre = n.personality === "funny" ? "Oh, I have SO many. " : n.personality === "shy" ? "Um, okay... " : "";
        return this.reply(`${pre}${q} ... ${a}`, { delta: pts(2), mood: "excited", options: [{ id: "laugh", label: "Ha! Good one" }, { id: "groan", label: "*groan*" }, ...this.back().slice(0, 3)] });
      }
      case "laugh": return this.reply(this.flavor(pick(r, ["I'm here all week!", "I knew you'd get it.", "That one never fails."])), { delta: 2, mood: "excited" });
      case "groan": return this.reply(this.pc({ funny: "Groans are the sound of success.", d: "Hey, comedy is hard!" }), { delta: 0 });
      case "help": {
        if (n.hardSubject && this.r() < 0.5 && n.personality !== "nerdy" && m.fr < 30) { const buddy = byId(n.bestFriend); return this.reply(this.v(`I'm better at ${SUBJ_NAME[n.favSubject]}. If you need ${SUBJ_NAME[n.hardSubject]}, ask ${buddy?.first ?? "Ms. Brown"}. Want me to quiz you on ${SUBJ_NAME[n.favSubject]} instead?`), { delta: pts(1), options: [{ id: "quiz", label: "Sure, quiz me" }, ...this.back().slice(0, 3)] }); }
        return this.choose("quiz");
      }
      case "quiz": {
        const age = Social.profile.avatar.age, subject = r() < 0.7 ? n.favSubject : (["math", "ela", "science", "history"] as Subj[])[Math.floor(r() * 4)];
        this.quiz = quizFor(subject, age, r); this.waiting = "quiz";
        return this.reply(this.v(`Okay, ${SUBJ_NAME[subject]} time! ${this.quiz.q}`), { delta: 0, mood: "excited", quiz: this.quiz, options: this.quiz.options.map((o, i) => ({ id: `ans${i}`, label: o })) });
      }
      case "invite": {
        const need = n.personality === "shy" ? 25 : 12;
        if (m.fr >= need) { Social.edit(n.id, (mm) => { mm.lunchBuddy = true; }); return this.reply(this.pc({ shy: "Really? Um... yes. I'd like that.", d: `Yes! I'll save you a seat at lunch. ${n.food[0].toUpperCase() + n.food.slice(1)} for both of us!` }), { delta: 4, mood: "excited", options: this.back() }); }
        return this.reply(this.pc({ shy: "Um... maybe after we know each other better? Sorry.", d: "Maybe soon! Let's hang out a bit more first." }), { delta: 0, mood: "shy", options: this.back() });
      }
      case "advice": {
        const t = this.pc({ cheerful: "Smile at three people today. It really works.", shy: "Taking a deep breath before talking helps me. And writing notes.", sporty: "Warm up before big things. Even a test.", nerdy: "Make a study schedule. Fifteen minutes a day beats a panic night before.", artsy: "Doodle when you feel stuck. Your brain loosens up.", funny: "If all else fails, laugh at it. Then try again.", curious: "Ask more questions. Nobody minds, honestly.", bossy: "Make a list. Do the hardest thing first.", dreamy: "Look out a window for a minute. Then you'll know what to do.", kind: "Be gentle with yourself. And ask for help, it's brave.", d: "Take it one step at a time." });
        return this.reply(t, { delta: pts(2), options: this.back() });
      }
      case "chatter_pick": return this.reply("Okay!", { options: this.menu() });
      default: return this.reply(this.flavor("Hm, I'm not sure what to say to that."), { options: this.menu(), mood: "neutral" });
    }
  }
  private optLabel(id: string, data?: any) { return typeof data === "string" && data ? cap(data) : this.menu().find((o) => o.id === id)?.label ?? id; }

  /* ------------------------------------------------------------ quiz answers */
  private answer(i: number): Reply {
    const q = this.quiz!, n = this.npc; this.quiz = undefined; this.waiting = null; const ok = i === q.answer;
    Social.edit(n.id, (m) => { m.quiz.total++; if (ok) { m.quiz.right++; m.helped++; } }); Social.profile.stats.quizTotal++; if (ok) Social.profile.stats.quizRight++; Social.save();
    this.history.push({ who: "me", text: q.options[i] ?? "..." }); remember(n.id, "me", q.options[i] ?? "...");
    if (ok) return this.reply(this.v(`${pick(this.r, V[n.personality].wow)} Yes, "${q.options[q.answer]}"! ${q.why ?? ""}`), { delta: 3, mood: "excited", options: [{ id: "quiz", label: "Another one!" }, ...this.menu().slice(0, 3)] });
    return this.reply(this.v(`Almost! The answer is "${q.options[q.answer]}". ${q.why ?? ""} ${n.personality === "kind" ? "That's a tricky one." : "Don't worry, you'll get the next one."}`), { delta: 1, mood: "neutral", options: [{ id: "quiz", label: "Try another" }, ...this.menu().slice(0, 3)] });
  }

  /* ------------------------------------------------------------ gossip: what others think, grounded in the roster + their memories */
  private gossip(first: boolean): Reply {
    const n = this.npc, r = this.r, friend = byId(n.bestFriend), rival = n.rival != null ? byId(n.rival) : null, other = pick(r, ROSTER);
    const kinds: string[] = [];
    const heard = ROSTER.filter((x) => x.id !== n.id && (Social.peek(x.id)?.fr ?? 0) >= 30);
    if (heard.length) kinds.push("opinion");
    if (friend) kinds.push("friend");
    if (rival) kinds.push("rival");
    kinds.push("quirk", "new");
    const k = pick(r, kinds); let t = "";
    if (k === "opinion") { const x = pick(r, heard); t = `${x.first} told me you're really nice. ${x.first} remembers that you ${Social.peek(x.id)!.quiz.right > 0 ? "helped with a quiz" : "said hi"}.`; }
    else if (k === "friend" && friend) t = `${friend.first} and I are working on ${n.interests[0]} together. ${friend.first} ${friend.quirk}, which is funny.`;
    else if (k === "rival" && rival) t = `${rival.first} and I are kind of competing this week. Please don't tell ${rival.first}. ${rival.first} ${rival.quirk}.`;
    else if (k === "quirk") t = `${other.first} ${other.quirk}. Have you noticed?`;
    else { const f = lookFeatures(other.spec).find((x) => x.key === "hat" || x.key === "glasses" || x.key === "hair")!; t = `${other.first} showed up with ${f.phrase} today. Everyone's talking about it.`; }
    return this.reply(this.pc({ shy: `Um... don't tell anyone, but ${t}`, funny: `Okay, hot gossip, ${this.me}: ${t}`, d: t }), { delta: first ? 1 : 0, mood: "happy" });
  }

  /* ------------------------------------------------------------ typed text */
  say(text: string): Reply {
    text = text.trim().slice(0, 240); if (!text) return this.reply("...?", { mood: "neutral" });
    const n = this.npc, t = text.toLowerCase(), r = this.r;
    this.history.push({ who: "me", text }); remember(n.id, "me", text);
    if (this.waiting === "quiz" && this.quiz) { const idx = this.quiz.options.findIndex((o) => t.includes(o.toLowerCase())); if (idx >= 0) return this.answer(idx); }
    const name = t.match(/(?:my name is|call me|i'?m called)\s+([a-z][a-z'-]{1,16})/); if (name) { const nm = cap(name[1]); Social.setProfile({ name: nm }); return this.reply(this.v(`Nice to meet you, ${nm}! I'll remember that.`), { delta: 2, mood: "excited" }); }
    const feel = t.match(/\bi(?:'m| am| feel| feeling)\s+(?:so |really |kind of |a little |very )?(sad|happy|tired|nervous|scared|excited|angry|bored|hungry|sick|lonely|stressed|worried|great|good|fine|okay|proud)\b/);
    if (feel) { const f = feel[1]; return this.choose("feel", ["happy", "excited", "great", "good", "fine", "okay", "proud"].includes(f) ? "great" : ["tired", "bored", "sick", "hungry"].includes(f) ? "tired" : ["nervous", "scared", "worried", "stressed"].includes(f) ? "nervous" : "sad"); }
    const like = t.match(/\bi (?:really |absolutely )?(?:like|love|enjoy|adore|play)\s+([a-z ]{2,28})/);
    if (like) return this.choose("hobby_pick", like[1].trim().replace(/\s+(a lot|so much|too|and.*)$/, ""));
    const fav = t.match(/\bmy favou?rite (subject|food|color|colour|animal|game|sport|class) is\s+([a-z ]{2,24})/);
    if (fav) { const kind = fav[1], val = fav[2].trim(); Social.learn("fav_" + kind, val); Social.edit(n.id, (mm) => { mm.facts["fav_" + kind] = val; }); const same = kind === "food" && val.includes(n.food.split(" ")[0]); return this.reply(this.v(same ? `${cap(val)}! Mine too!` : `${cap(val)}, huh? I'll remember that your favorite ${kind} is ${val}.`), { delta: same ? 3 : 2, mood: same ? "excited" : "happy" }); }
    const pet = t.match(/\bi have (?:a|an|two|three) ([a-z]+)(?: named ([a-z]+))?/);
    if (pet) { Social.learn("pet", pet[1] + (pet[2] ? " named " + cap(pet[2]) : "")); return this.reply(this.v(`A ${pet[1]}${pet[2] ? " named " + cap(pet[2]) : ""}! I want to meet them${n.pet ? `. I have ${n.pet}, you know.` : "."}`), { delta: 3, mood: "excited" }); }
    if (/\b(stupid|dumb|ugly|hate you|shut up|loser|idiot)\b/.test(t)) { return this.reply(this.pc({ shy: "...That hurts. I'm going to go now.", funny: "Ouch. That was not funny. Even I can tell.", kind: "That's not very kind. I'd like us to be nice to each other.", d: "That's rude. I don't like that." }), { delta: -8, mood: "annoyed", options: [{ id: "sorry", label: "Sorry, I didn't mean it" }, { id: "bye", label: "Okay, bye" }] }); }
    if (/\b(sorry|apologi[sz]e|my bad)\b/.test(t)) { return this.reply(this.pc({ kind: "Thank you for saying that. It's okay.", d: "Okay. Thanks for saying sorry." }), { delta: 3, mood: "neutral", options: this.menu() }); }
    if (/\b(thanks|thank you|thx)\b/.test(t)) return this.reply(this.flavor(pick(r, ["Anytime!", "Of course.", "No problem!"])), { delta: 1, options: this.menu() });
    if (/\b(you'?re|you are|love your|like your|nice|cool|awesome|amazing|great|pretty|cute)\b/.test(t) && /\b(you|your)\b/.test(t)) return this.choose("compliment");
    if (/\b(bye|goodbye|see you|gotta go|have to go|later)\b/.test(t)) return this.choose("bye");
    if (/\b(joke|funny|laugh)\b/.test(t)) return this.choose("joke");
    if (/\b(quiz|test me|question)\b/.test(t)) return this.choose("quiz");
    if (/\b(help|study|homework)\b/.test(t)) return this.choose("help");
    if (/\b(lunch|eat|food|hungry|pizza|snack)\b/.test(t)) return this.choose("food");
    if (/\b(hobby|hobbies|fun|weekend|play)\b/.test(t)) return this.choose("hobby");
    if (/\b(class|subject|math|science|history|reading|english|teacher)\b/.test(t)) return this.choose("class");
    if (/\b(who are you|about you|your name|tell me about)\b/.test(t)) return this.choose("you");
    if (/\b(rumou?r|gossip|news|heard)\b/.test(t)) return this.choose("gossip");
    if (/\b(hi|hello|hey|yo|sup)\b/.test(t) && t.split(/\s+/).length <= 3) return this.reply(this.flavor("Hi! What's up?"), { mood: "happy" });
    if (/\b(how are you|how's it going|what's up)\b/.test(t)) return this.choose("how");
    if (/\?\s*$/.test(t)) return this.reply(this.pc({ nerdy: "Hmm, interesting question. I'd have to look that up. Want a quiz question instead?", curious: "Ooh, good question! I don't know, but I want to find out with you.", d: `${pick(r, V[n.personality].hm)} I'm not sure. What do you think?` }), { delta: 1, mood: "neutral" });
    const m = this.mem; return this.reply(this.v(m.facts.hobby ? `${pick(r, V[n.personality].hm)} Is that like ${m.facts.hobby}? Tell me more.` : `${pick(r, V[n.personality].hm)} Tell me more about that.`), { delta: 1, mood: "neutral" });
  }
}

/** NPC-to-NPC chatter heard in the hallway (also remembered by the player's journal when overheard) */
export function chatter(a: NpcDef, b: NpcDef, ctx: { kind: string; subject?: Subj }): string {
  const r = rng((a.id * 31 + b.id) * 1009 + Math.floor(Date.now() / 20000)), pm = Social.profile, pl = pm.name || "the new kid", fa = Social.peek(a.id), best = (Social.peek(b.id)?.fr ?? 0) >= 30 || (fa?.fr ?? 0) >= 30;
  const f = pick(r, lookFeatures(b.spec).filter((x) => x.key !== "shoes"));
  const lines = [
    `${b.first}, did you finish the ${pick(r, ["math", "reading", "science", "history"])} homework?`, `Are you going to ${a.interests[0]} after school?`, `I love your ${f.phrase}!`, `${b.first}, you ${b.quirk} again. It's cute.`,
    best ? `${pl} is really nice. Have you talked to ${pl}?` : `Who's the new kid, ${b.first}?`, ctx.kind === "lunch" ? `I'm trading ${a.food} for ${b.food}. Deal?` : ctx.kind === "arrive" ? "The bus was SO loud this morning." : ctx.kind === "dismiss" ? "Don't forget your backpack!" : `Shh, ${b.first}, we're supposed to be in class.`,
    `${pick(r, a.interests)} club is on Thursday, ${b.first}!`, `Did you know ${a.pet ?? "my family"} ${a.pet ? "learned a new trick?" : "makes the best snacks?"}`,
  ];
  return pick(r, lines);
}
export function approachLine(npc: NpcDef): string {
  const m = Social.mem(npc.id), me = Social.profile.name || "you"; return m.fr >= 60 ? `${me}! Over here!` : m.facts.hobby ? `Hey ${me}! How's ${m.facts.hobby}?` : `Hey ${me}!`;
}

/** Free-text replies from a model when the server provides one (/api/chat); null means "use the local engine". */
let modelOffUntil = 0;
export async function askModel(convo: Convo, text: string): Promise<Reply | null> {
  if (Date.now() < modelOffUntil) return null;
  const n = convo.npc, m = convo.mem, ac = new AbortController(), to = setTimeout(() => ac.abort(), 6500);
  try {
    const body = { npc: { name: n.name, first: n.first, grade: n.grade, role: n.role, title: n.title, personality: n.personality, interests: n.interests, favSubject: n.favSubject, food: n.food, pet: n.pet, dream: n.dream, quirk: n.quirk, bio: n.bio },
      player: { name: Social.profile.name, facts: Social.profile.facts }, memory: { friendship: m.fr, tier: tier(m.fr), talks: m.talks, topics: m.topics.slice(-6), facts: m.facts, recent: m.log.slice(-8) },
      ctx: convo.ctx, history: convo.history.slice(-8), input: text };
    const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ac.signal });
    if (!res.ok) { modelOffUntil = Date.now() + 5 * 60e3; return null; } const j = await res.json(); if (!j || typeof j.text !== "string") return null;
    const delta = Math.max(-6, Math.min(6, Number(j.delta) || 0)); convo.history.push({ who: "me", text }); remember(n.id, "me", text);
    if (j.learned && typeof j.learned === "object") for (const [k, v] of Object.entries(j.learned)) if (typeof v === "string") { Social.learn(k, v.slice(0, 40)); Social.edit(n.id, (mm) => { mm.facts[k] = String(v).slice(0, 40); }); }
    convo.history.push({ who: "npc", text: j.text }); remember(n.id, "npc", j.text); if (delta) bump(n.id, delta); convo.turns++;
    return { text: String(j.text).slice(0, 400), options: convo.menu(), mood: (j.mood as Mood) || "happy", delta };
  } catch { modelOffUntil = Date.now() + 60e3; return null; } finally { clearTimeout(to); }
}
export async function converse(convo: Convo, text: string): Promise<Reply> {
  const smart = await askModel(convo, text); return smart ?? convo.say(text);
}
void STAFF; void TEACHER_BY_SUBJECT;
