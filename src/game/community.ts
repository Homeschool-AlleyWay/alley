/** Community: clubs with co-op meetings, student-made plays and show-and-tell (parent approved before the school sees them), and the school's
 *  daily storyline (buzz, friendships, a new student buddy, moods) that also drives friendly texts on the phone. Everything is kind and school-appropriate. */
import { ROSTER, byId, type NpcDef, type Personality } from "../hall3d/roster";
import { Social } from "../hall3d/social";
import { sameGroup, CONTACT_FR } from "../hall3d/relate";
import { cleanMessage } from "./safety";
import { Quests } from "./quests";
import { Cosm } from "./cosmetics";
import { dayMood, type DayMood } from "../hall3d/moods";

const dayN = (d = new Date()) => Math.floor(d.getTime() / 864e5);
const hash = (a: number, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
const rd = <T,>(k: string, d: T): T => { try { return { ...(d as any), ...(JSON.parse(localStorage.getItem(k) || "null") || {}) }; } catch { return d; } };
const wr = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

/* ------------------------------------------------------------------ clubs */
export interface Round { prompt: string; options: { t: string; good: boolean; say: string }[] }
export interface Club { id: string; name: string; icon: string; day: number; blurb: string; likes: Personality[]; rounds: Round[]; prize: string }
export const CLUBS: Club[] = [
  { id: "garden", name: "Garden Club", icon: "🌱", day: 1, blurb: "Grow things together on the school lawn.", likes: ["kind", "dreamy", "curious"], prize: "A seed-packet locker magnet",
    rounds: [{ prompt: "The seedlings look droopy. What should the team do first?", options: [{ t: "Check the soil and give water", good: true, say: "Good thinking, plants need the right amount of water." }, { t: "Move them into a dark closet", good: false, say: "Hmm, plants need light to make their food. Let's try again." }] },
      { prompt: "Who does which job?", options: [{ t: "Everybody picks a job they like and swaps next week", good: true, say: "I like that. Everyone gets a turn at the fun parts." }, { t: "One person does everything", good: false, say: "That would be tiring! Teams share the work." }] },
      { prompt: "A bean sprout finally appears! What do we do?", options: [{ t: "Measure it and write it in the team journal", good: true, say: "Scientists record what they see. Nice work!" }, { t: "Pull it up to look at the roots", good: false, say: "Oops, that would hurt the plant. Let's keep it growing." }] }] },
  { id: "puzzle", name: "Puzzle & Chess Club", icon: "♟️", day: 2, blurb: "Brain teasers, chess, and cheering each other on.", likes: ["nerdy", "curious", "bossy"], prize: "A tiny chess-piece magnet",
    rounds: [{ prompt: "Teamwork riddle: you need to move 3 pieces to win. What helps most?", options: [{ t: "Think a few moves ahead together", good: true, say: "Planning ahead is what good players do." }, { t: "Move quickly without looking", good: false, say: "Speed is fun, but looking first wins games." }] },
      { prompt: "A teammate made a mistake. What do you say?", options: [{ t: "\"That's okay, let's see what we can learn.\"", good: true, say: "Thanks. Mistakes are how we get better." }, { t: "\"That was silly.\"", good: false, say: "Ouch. Kind words keep teams strong." }] },
      { prompt: "The final puzzle needs two ideas combined. You...", options: [{ t: "Ask everyone for one idea and mix them", good: true, say: "And we solved it together!" }, { t: "Use only your own idea", good: false, say: "Let's try asking the whole team." }] }] },
  { id: "art", name: "Art & Mural Club", icon: "🎨", day: 3, blurb: "Paint, doodle and decorate the school together.", likes: ["artsy", "dreamy", "funny"], prize: "A rainbow locker light",
    rounds: [{ prompt: "We are painting a hallway mural. How do we start?", options: [{ t: "Sketch a plan and agree on colours", good: true, say: "A plan helps everyone's parts fit together." }, { t: "Everyone paints over each other", good: false, say: "That could turn muddy! Let's plan first." }] },
      { prompt: "Someone's drawing looks different from yours. You...", options: [{ t: "Say what you like about it", good: true, say: "It's nice to hear that. Art can look many ways." }, { t: "Say it's wrong", good: false, say: "There isn't one right way to make art." }] },
      { prompt: "The mural is finished! What now?", options: [{ t: "Everyone signs a corner and cleans up together", good: true, say: "A proud, tidy team. Beautiful." }, { t: "Leave the mess for someone else", good: false, say: "Cleaning up together is part of the job." }] }] },
  { id: "drama", name: "Drama Club", icon: "🎭", day: 4, blurb: "Write and act little plays for the auditorium.", likes: ["funny", "cheerful", "bossy"], prize: "A stage-curtain locker wallpaper",
    rounds: [{ prompt: "We need a story for our play. How do we pick?", options: [{ t: "Each person pitches an idea and we vote", good: true, say: "Fair and fun. Voting it is!" }, { t: "The loudest voice decides", good: false, say: "Everyone should get a say." }] },
      { prompt: "Someone is nervous about their lines.", options: [{ t: "Practise together and cheer them on", good: true, say: "Thanks. I feel much braver now." }, { t: "Tell them not to be silly", good: false, say: "That doesn't help. Let's encourage them." }] },
      { prompt: "Opening night! The audience is waiting.", options: [{ t: "Take a deep breath, smile, and begin", good: true, say: "Break a leg, everyone!" }, { t: "Run away and hide", good: false, say: "You've practised. You can do it!" }] }] },
  { id: "code", name: "Coding & Robots Club", icon: "🤖", day: 5, blurb: "Give instructions to robots and fix their bugs.", likes: ["nerdy", "curious", "shy"], prize: "A pixel-robot locker magnet",
    rounds: [{ prompt: "The robot walked into a wall. What is the first step?", options: [{ t: "Read the instructions and find the bug", good: true, say: "Debugging means finding what went wrong. Good call." }, { t: "Throw the robot", good: false, say: "That won't fix it! Let's look at the steps." }] },
      { prompt: "Two ideas both might work. You...", options: [{ t: "Test each one and compare", good: true, say: "Testing beats guessing every time." }, { t: "Pick the one you like and skip testing", good: false, say: "Let's test to be sure." }] },
      { prompt: "It works! How do we share what we learned?", options: [{ t: "Write simple notes so others can build on it", good: true, say: "Great teams document their work." }, { t: "Keep it secret", good: false, say: "Sharing helps everybody learn." }] }] },
  { id: "kindness", name: "Kindness Crew", icon: "💛", day: 3, blurb: "Spread kindness around the school.", likes: ["kind", "cheerful", "shy"], prize: "A heart-shaped Chat Chow flag",
    rounds: [{ prompt: "A new student looks lonely at lunch.", options: [{ t: "Invite them to sit with the group", good: true, say: "That made their whole day." }, { t: "Pretend not to notice", good: false, say: "A small hello can mean a lot." }] },
      { prompt: "We want to brighten the hallway. Best idea?", options: [{ t: "Write kind notes for lockers", good: true, say: "Notes of kindness. I love it." }, { t: "Tease the shy kids", good: false, say: "That would hurt feelings. Let's be kind." }] },
      { prompt: "Someone says thank you. You say...", options: [{ t: "\"You're welcome. Anytime!\"", good: true, say: "Warm hearts all around." }, { t: "Nothing", good: false, say: "A reply makes thanks feel welcome." }] }] },
];
const CK = "unify.clubs.v1";
interface CS { mine: string[]; done: Record<string, string> }
export const Clubs = {
  state: () => rd<CS>(CK, { mine: [], done: {} }),
  mine(): Club[] { const s = Clubs.state(); return CLUBS.filter((c) => s.mine.includes(c.id)); },
  join(id: string) { const s = Clubs.state(); if (!s.mine.includes(id)) s.mine.push(id); wr(CK, s); },
  leave(id: string) { const s = Clubs.state(); s.mine = s.mine.filter((x) => x !== id); wr(CK, s); },
  meetsToday: (c: Club, d = new Date()) => c.day === d.getDay(),
  attended: (c: Club) => Clubs.state().done[c.id] === new Date().toISOString().slice(0, 10),
  /** the classmates in a club: NPCs from the player's own grade group, the ones who like it first */
  members(c: Club): NpcDef[] { return ROSTER.filter((n) => n.role === "student" && sameGroup(n)).map((n) => ({ n, s: (c.likes.includes(n.personality) ? 1 : 0) + hash(n.id, c.id.length * 31) * 0.9 })).sort((a, b) => b.s - a.s).slice(0, 5).map((x) => x.n); },
  finish(c: Club, score: number) { const s = Clubs.state(); s.done[c.id] = new Date().toISOString().slice(0, 10); wr(CK, s); Quests.track("club", c.id); Quests.track("kind", "club-" + c.id); if (score >= 2) Cosm.reward(2); },
};

/* ------------------------------------------------------------------ student-made plays and show-and-tell */
export interface Piece { id: string; title: string; author: string; lines: string[]; approved: boolean; at: number }
const SK = "unify.showtell.v1";
export const ShowTell = {
  all: (): Piece[] => rd<{ items: Piece[] }>(SK, { items: [] }).items,
  approved: (): Piece[] => ShowTell.all().filter((p) => p.approved),
  /** write a short piece (a play, a story or "show and tell" with up to 8 lines). Personal details are hidden and rude words are refused. */
  submit(title: string, raw: string, author: string): { ok: boolean; note: string } {
    const t = cleanMessage(title).text.slice(0, 50).trim(); const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 8).map((l) => cleanMessage(l));
    if (!t) return { ok: false, note: "Give your piece a kind, school-friendly title." }; if (lines.some((l) => !l.text && l.blocked)) return { ok: false, note: "One line has words we keep out of school. Please rewrite it kindly." };
    if (lines.length < 2) return { ok: false, note: "Write at least two lines (one per line)." };
    const items = ShowTell.all(); items.unshift({ id: "st_" + Math.random().toString(36).slice(2, 8), title: t, author: author.slice(0, 20) || "A student", lines: lines.map((l) => l.text.slice(0, 160)), approved: false, at: Date.now() }); wr(SK, { items: items.slice(0, 20) });
    const hid = lines.find((l) => l.blocked)?.blocked; return { ok: true, note: "Saved! A grown-up needs to approve it before it goes on stage." + (hid ? " (" + hid + ")" : "") };
  },
  approve(id: string, ok: boolean) { const items = ShowTell.all(); const p = items.find((x) => x.id === id); if (p) p.approved = ok; wr(SK, { items }); },
  remove(id: string) { wr(SK, { items: ShowTell.all().filter((x) => x.id !== id) }); },
};

/* ------------------------------------------------------------------ the school storyline */
/** each classmate has a mood that changes day to day (and a few reasons are shown in the daily buzz) */
export const Story = {
  moodOf(id: number, d = new Date()): DayMood { return dayMood(id, byId(id)?.personality === "shy", d); },
  newStudent(d = new Date()): NpcDef | null { const w = Math.floor((dayN(d) + 3) / 7); const pool = ROSTER.filter((n) => n.role === "student" && sameGroup(n)); return pool.length ? pool[Math.floor(hash(w, 99) * pool.length)] : null; },
  /** three kind headlines for today (for the bulletin board, the Today panel and the phone) */
  buzz(d = new Date()): string[] {
    const n = dayN(d), pool = ROSTER.filter((x) => x.role === "student" && sameGroup(x)); if (pool.length < 6) return ["It's a quiet, sunny day at UNIFY."];
    const pick = (k: number) => pool[Math.floor(hash(n, k) * pool.length)]; const a = pick(1), b0 = pick(2), b = b0.id === a.id ? pool[(pool.indexOf(a) + 1) % pool.length] : b0, c = pick(3), ns = Story.newStudent(d), club = CLUBS[n % CLUBS.length];
    const pair = `${a.first} and ${b.first}`;
    return [
      `${pair} ${["are planning a surprise thank-you card for Ms. Okafor", "started a lunch-table puzzle challenge", "teamed up to fix the wobbly bench in the courtyard", "made friendship bracelets for the whole class"][Math.floor(hash(n, 4) * 4)]}.`,
      ns ? `New this week: ${ns.first} ${ns.grade ? "(grade " + ns.grade + ") " : ""}is the school's newest buddy-in-training. Say hi!` : `${c.first} is looking for someone to practise ${c.favSubject} with.`,
      `${club.icon} ${club.name} meets ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][club.day]}. ${["Everyone is welcome!", "Bring a friend!", "Ideas wanted!"][n % 3]}`,
      `${c.first} ${c.id % 2 ? "is having a great day" : "could use a friendly hello"} ${["today", "at school"][n % 2]}.`,
    ].slice(0, 3);
  },
  /** friendly texts to send today (one per friend at most, not every day) as { from, text } */
  texts(d = new Date()): { from: string; text: string; id: number }[] {
    const day = d.toISOString().slice(0, 10), out: { from: string; text: string; id: number }[] = [], n = dayN(d);
    for (const { id, mem } of Social.friends()) { const npc = byId(+id); if (!npc || npc.role !== "student" || mem.fr < CONTACT_FR) continue; if (hash(+id, n) > 0.28) continue;
      const lines = [`Hi! ${["Did you see the buzz today?", "Want to sit together at Chat Chow?", "Are you going to the club meeting?", "I'm glad we're friends 😊"][Math.floor(hash(+id, n + 1) * 4)]}`, `${npc.first} here! ${Story.moodOf(+id, d) === "sad" ? "I had a rough morning. Could use a kind word." : "Have a great day at school!"}`, `Hey, I was thinking about ${npc.interests[0] ?? "something fun"}. Want to talk about it in the hall?`];
      out.push({ from: npc.first, id: +id, text: lines[Math.floor(hash(+id, n + 2) * lines.length)] }); }
    void day; return out.slice(0, 2);
  },
};
export const lastTextDay = () => { try { return localStorage.getItem("unify.texts.day") || ""; } catch { return ""; } };
export const markTextDay = () => { try { localStorage.setItem("unify.texts.day", new Date().toISOString().slice(0, 10)); } catch { /* none */ } };
