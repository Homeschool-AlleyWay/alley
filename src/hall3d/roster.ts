/** Unique, named NPCs: every student has their own look, grade, personality, interests and backstory (same for every player). */
import type { Age, Look } from "./characters";
import { AvatarSpec, OPTIONS, randomAvatar, rng, signature, toLook } from "./avatar";

export type Personality = "cheerful" | "shy" | "sporty" | "nerdy" | "artsy" | "funny" | "curious" | "bossy" | "dreamy" | "kind";
export type Subj = "math" | "ela" | "science" | "history";
export const PERSONALITIES: Personality[] = ["cheerful", "shy", "sporty", "nerdy", "artsy", "funny", "curious", "bossy", "dreamy", "kind"];
export interface NpcDef {
  id: number; key: string; name: string; first: string; role: "student" | "staff"; age: Age; grade: string; spec: AvatarSpec; look: Look;
  personality: Personality; interests: string[]; favSubject: Subj; hardSubject: Subj; food: string; pet: string | null; dream: string; quirk: string; secret: string;
  bestFriend: number; rival: number | null; bio: string; title?: string;
}

const FIRST = ["Maya", "Marcus", "Priya", "Leo", "Amara", "Diego", "Sofia", "Kenji", "Zara", "Eli", "Nadia", "Tobias", "Imani", "Mateo", "Hana", "Omar", "Lucia", "Jonah", "Anika", "Caleb", "Mei", "Ravi", "Talia", "Felix", "Yara", "Ben", "Chloe", "Dev", "Esme", "Finn", "Grace", "Hugo", "Isla", "Jamal", "Keira", "Liam", "Mira", "Noah", "Olive", "Pablo", "Quinn", "Rosa", "Sam", "Tessa", "Uma", "Victor", "Willa", "Xavier", "Yusuf", "Zoe", "Aiden", "Bella", "Cyrus", "Daria", "Emil", "Farah", "Gus", "Harper"];
const LAST = ["Chen", "Reed", "Patel", "Okafor", "Santos", "Nguyen", "Kim", "Haddad", "Rivera", "Brooks", "Ivanov", "Tanaka", "Mensah", "Larsen", "Cruz", "Adeyemi", "Fischer", "Ibrahim", "Kowalski", "Lopez", "Morales", "Novak", "Osei", "Park", "Quintero", "Rossi", "Singh", "Torres", "Underwood", "Vega", "Walker", "Yamada", "Zhang", "Abbott", "Bishop", "Castillo", "Dalton", "Ellis", "Foster", "Grant"];
const INTERESTS: Record<string, string[]> = {
  young: ["dinosaurs", "building with blocks", "drawing animals", "jumping rope", "bugs and butterflies", "playing tag", "stickers", "toy trains", "singing songs", "baking cookies"],
  mid: ["soccer", "robotics club", "drawing comics", "chess", "baking", "birdwatching", "skateboarding", "minecraft builds", "magic tricks", "swimming", "reading mysteries", "playing violin", "origami", "space and rockets"],
  teen: ["basketball", "coding", "photography", "theater", "poetry", "painting", "piano", "track and field", "debate", "gardening", "making music", "volleyball", "film editing", "cooking"],
};
const FOODS = ["tacos", "mac and cheese", "pizza", "fried rice", "mango slices", "pancakes", "dumplings", "hummus and pita", "grilled cheese", "pasta", "chicken nuggets", "cheeseburgers", "sushi rolls", "samosas", "peanut butter sandwiches"];
const PETS = ["a dog named Biscuit", "a cat named Pickles", "a hamster named Nugget", "two goldfish", "a rabbit named Clover", "a parrot named Mango", "a turtle named Speedy", "a gecko named Ziggy", null, null, null];
const DREAMS = ["become an astronaut", "open a bakery", "play pro soccer", "write a graphic novel", "be a marine biologist", "build robots", "become a teacher", "direct movies", "be a vet", "design video games", "be a chef", "become a pilot", "run for mayor", "be a musician"];
const QUIRKS = ["always hums while working", "carries a tiny notebook everywhere", "says 'for real though' a lot", "collects interesting rocks", "never leaves without a snack", "talks to plants", "draws doodles on everything", "counts steps in the hallway", "makes up nicknames", "loves puns", "gets the hiccups when nervous", "is always five minutes early"];
const SECRETS = ["is secretly afraid of the dark", "still sleeps with a stuffed bunny", "writes songs nobody has heard", "wants to try out for the school play but is nervous", "can solve a Rubik's cube in under a minute", "once got lost in the library for an hour", "has a crush on someone in the art club", "is saving up for a telescope", "is learning a new language in secret", "feels nervous about speaking in class"];
const SUBJECTS: Subj[] = ["math", "ela", "science", "history"];
const AGES: Age[] = ["k2", "g35", "g68", "hs", "g35", "g68", "k2", "hs", "g68", "g35"];

export const gradeLabel = (age: Age, n: number) => age === "k2" ? ["K", "1", "2"][n % 3] : age === "g35" ? ["3", "4", "5"][n % 3] : age === "g68" ? ["6", "7", "8"][n % 3] : age === "hs" ? ["9", "10", "11", "12"][n % 4] : "Staff";
const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)];

export function makeRoster(n = 48, seed = 20260930): NpcDef[] {
  const r = rng(seed), seen = new Set<string>(), names = new Set<string>(), out: NpcDef[] = []; let lastStyle = "", lastHair = "";
  for (let i = 0; i < n; i++) {
    const age = AGES[i % AGES.length]; let spec: AvatarSpec, tries = 0;
    do { spec = randomAvatar(r, age); tries++; } while ((seen.has(signature(spec)) || spec.hairStyle === lastStyle || spec.hair === lastHair) && tries < 60);
    seen.add(signature(spec)); lastStyle = spec.hairStyle; lastHair = spec.hair;
    if (age === "k2" || age === "g35") { spec.glasses = r() < 0.12 ? spec.glasses : "none"; if (spec.top === "blazer") spec.top = "hoodie"; }
    let first = FIRST[i % FIRST.length], last = pick(r, LAST), full = `${first} ${last}`; while (names.has(full)) { last = pick(r, LAST); full = `${first} ${last}`; }
    names.add(full); spec.name = first;
    const band = age === "k2" || age === "g35" ? "young" : age === "g68" ? "mid" : "teen", pool = INTERESTS[band];
    const interests = [pick(r, pool)]; while (interests.length < 3) { const x = pick(r, [...pool, ...INTERESTS.mid]); if (!interests.includes(x)) interests.push(x); }
    const fav = pick(r, SUBJECTS), hard = pick(r, SUBJECTS.filter((s) => s !== fav)), personality = PERSONALITIES[(i * 3 + Math.floor(r() * 10)) % 10];
    const gradeNo = Math.floor(r() * 4), grade = gradeLabel(age, gradeNo);
    out.push({
      id: i, key: `n${i}`, name: full, first, role: "student", age, grade, spec, look: { ...toLook(spec, i), tag: false }, personality, interests, favSubject: fav, hardSubject: hard,
      food: pick(r, FOODS), pet: pick(r, PETS), dream: pick(r, DREAMS), quirk: pick(r, QUIRKS), secret: pick(r, SECRETS), bestFriend: (i + 1 + Math.floor(r() * 5)) % n, rival: r() < 0.3 ? (i + 7 + Math.floor(r() * 9)) % n : null,
      bio: `${first} is in grade ${grade}, loves ${interests[0]} and ${interests[1]}, and ${pick(r, QUIRKS)}.`,
    });
  }
  for (const d of out) if (d.bestFriend === d.id) d.bestFriend = (d.id + 1) % n;
  return out;
}

export const ROSTER = makeRoster();
export const byId = (id: number) => ROSTER[id] ?? STAFF.find((s) => s.id === id);

const staffSpec = (over: Partial<AvatarSpec>): AvatarSpec => ({ ...randomAvatar(rng(over.name?.length ?? 5), "adult"), ...over });
function staff(id: number, name: string, title: string, sub: Subj | null, over: Partial<AvatarSpec>, personality: Personality, extra: Partial<NpcDef> = {}): NpcDef {
  const spec = staffSpec({ name: name.split(" ").pop(), age: "adult", ...over }), first = name.split(" ").pop()!;
  return { id, key: `s${id}`, name, first, role: "staff", title, age: "adult", grade: "Staff", spec, look: { ...toLook(spec, id), tag: false }, personality, interests: ["helping students", "coffee", "crossword puzzles"], favSubject: sub ?? "history", hardSubject: "math",
    food: "a good salad", pet: null, dream: "see every student find something they love", quirk: "keeps spare pencils in every pocket", secret: "still has their own first-grade report card", bestFriend: 0, rival: null, bio: `${name} is ${title}.`, ...extra };
}
export const STAFF: NpcDef[] = [
  staff(100, "Mr. Okafor", "the hall monitor", null, { skin: "#7a4a36", hair: "#2b2b33", hairStyle: "crop", top: "vest", shirt: "#c98569", shirt2: "#fff6ea", bottom: "pants", pants: "#2b3a55", hat: "none", glasses: "none", packStyle: "none", brow: "thick", mouthStyle: "smile" }, "kind"),
  staff(101, "Ms. Alvarez", "a teacher on hall duty", "ela", { skin: "#f0c29b", hair: "#b5563e", hairStyle: "bun", top: "sweater", shirt: "#8173ae", glasses: "cat", packStyle: "messenger", pack: "#9a653d", bottom: "skirt", pants: "#4a3b3f", earrings: "#eab94e" }, "cheerful"),
  staff(110, "Ms. Keisha Brown", "the math teacher", "math", { skin: "#a86f4f", hair: "#2b2b33", hairStyle: "curly", top: "blazer", shirt: "#f6b294", shirt2: "#fff6ea", glasses: "none", packStyle: "none", bottom: "pants", pants: "#4a3b3f" }, "nerdy"),
  staff(111, "Mr. James Lee", "the English teacher", "ela", { skin: "#d9a074", hair: "#694a38", hairStyle: "crop", top: "sweater", shirt: "#8fc9e8", glasses: "round", packStyle: "none", bottom: "pants", pants: "#5b6b8c" }, "dreamy"),
  staff(112, "Mr. Jamal Carter", "the science teacher", "science", { skin: "#7a4a36", hair: "#3a2a30", hairStyle: "afro", top: "tee", shirt: "#a9dcc0", pattern: "solid", glasses: "none", packStyle: "none", bottom: "pants", pants: "#5f7a68" }, "curious"),
  staff(113, "Mr. Marcus Reed", "the history teacher", "history", { skin: "#7a4a36", hair: "#2b2b33", hairStyle: "buzz", top: "blazer", shirt: "#c98569", glasses: "square", packStyle: "none", bottom: "pants", pants: "#2b3a55", brow: "thick" }, "funny"),
];
export const TEACHER_BY_SUBJECT: Record<Subj, NpcDef> = { math: STAFF[2], ela: STAFF[3], science: STAFF[4], history: STAFF[5] };
export const HALL_COUNT = 24;
void OPTIONS;
