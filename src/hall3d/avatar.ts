/** Avatar options (single source of truth for the creator UI and the NPC generator) and Look conversion. */
import type { Age, Look } from "./characters";

export const SKIN_TONES = ["#fde7d3", "#fbdcc4", "#f5cfa8", "#f0c29b", "#e3ad7f", "#d9a074", "#c58a5f", "#a86f4f", "#8d5a3e", "#7a4a36", "#5e3a2b", "#4a2e24"];
export const HAIR_COLORS = ["#2b2b33", "#3a2a30", "#5a3a35", "#694a38", "#9a653d", "#b5563e", "#c9773e", "#e0b04e", "#f1d98a", "#d9d4cc", "#8c8c96", "#4F91C7", "#b8a8da", "#e8789a", "#5e9c72", "#e07a66"];
export const EYE_COLORS = ["#3a2a30", "#5a3a2a", "#8a6a3a", "#c98a3a", "#4f8a5e", "#4f91c7", "#7a8794", "#8173ae"];
export const CLOTH_COLORS = ["#4f91c7", "#326c9e", "#8fc9e8", "#88b89a", "#5e9c72", "#a9dcc0", "#eab94e", "#f8d977", "#f6b294", "#f28f7e", "#d9564a", "#eaa5b2", "#b8a8da", "#8173ae", "#c98569", "#9a653d", "#fff6ea", "#9da7aa", "#4a3b3f", "#2b3a55"];
export const SHOE_COLORS = ["#fbf6ee", "#313a3f", "#d9564a", "#4f91c7", "#eab94e", "#88b89a", "#9a653d", "#b8a8da"];

export interface Opt { id: string; label: string }
const o = (...pairs: [string, string][]): Opt[] => pairs.map(([id, label]) => ({ id, label }));
export const OPTIONS = {
  hairStyle: o(["crop", "Short crop"], ["buzz", "Buzz cut"], ["undercut", "Undercut"], ["spiky", "Spiky"], ["messy", "Messy"], ["sidebang", "Side bangs"], ["curtains", "Curtains"], ["pixie", "Pixie"], ["bob", "Bob"], ["long", "Long"], ["wavy", "Wavy long"], ["curly", "Curly puffs"], ["afro", "Afro"], ["pony", "Ponytail"], ["pigtails", "Pigtails"], ["twinbuns", "Twin buns"], ["bun", "Bun"], ["topknot", "Top knot"], ["braids", "Braids"]),
  eyeShape: o(["round", "Round"], ["oval", "Oval"], ["wide", "Wide"], ["sleepy", "Sleepy"], ["happy", "Happy"], ["lash", "Lashes"]),
  brow: o(["soft", "Soft"], ["thick", "Thick"], ["thin", "Thin"], ["arch", "Arched"], ["none", "None"]),
  mouthStyle: o(["smile", "Smile"], ["grin", "Grin"], ["smirk", "Smirk"], ["flat", "Calm"], ["o", "Surprised"], ["cat", "Cat"]),
  glasses: o(["none", "None"], ["round", "Round"], ["square", "Square"], ["cat", "Cat-eye"], ["half", "Half-rim"], ["sun", "Sunglasses"]),
  hat: o(["none", "None"], ["cap", "Cap"], ["beanie", "Beanie"], ["bucket", "Bucket hat"], ["beret", "Beret"], ["headband", "Headband"], ["bow", "Bow"], ["flower", "Flower"], ["crown", "Crown"], ["headphones", "Headphones"], ["catears", "Cat ears"]),
  top: o(["tee", "T-shirt"], ["hoodie", "Hoodie"], ["sweater", "Sweater"], ["jersey", "Jersey"], ["blazer", "Blazer"], ["dress", "Dress"], ["overalls", "Overalls"], ["vest", "Vest"], ["tank", "Tank top"]),
  pattern: o(["solid", "Solid"], ["stripes", "Stripes"], ["dots", "Dots"], ["plaid", "Plaid"], ["hearts", "Hearts"], ["stars", "Stars"]),
  bottom: o(["pants", "Pants"], ["joggers", "Joggers"], ["shorts", "Shorts"], ["skirt", "Skirt"]),
  shoeStyle: o(["sneaker", "Sneakers"], ["boot", "Boots"], ["sandal", "Sandals"], ["plain", "Plain shoes"]),
  packStyle: o(["pack", "Backpack"], ["messenger", "Messenger bag"], ["mini", "Mini pack"], ["none", "No bag"]),
  build: o(["slim", "Slim"], ["regular", "Regular"], ["sturdy", "Sturdy"]),
  age: o(["k2", "Grades K-2"], ["g35", "Grades 3-5"], ["g68", "Grades 6-8"], ["hs", "High school"]),
};
export const PRONOUNS = ["she/her", "he/him", "they/them"];

export interface AvatarSpec {
  name: string; pronouns: string; age: Age;
  skin: string; hairStyle: string; hair: string; hair2: string | null; eyeShape: string; eyeColor: string; brow: string; browColor: string | null;
  freckles: boolean; mole: boolean; nose: boolean; blush: boolean; mouthStyle: string; lip: string;
  glasses: string; glassColor: string; hat: string; hatColor: string; earrings: string | null; scarf: string | null; badge: string | null;
  top: string; shirt: string; shirt2: string; pattern: string; bottom: string; pants: string; shoeStyle: string; shoes: string;
  packStyle: string; pack: string; build: string; headSize: number;
}
export const defaultAvatar = (): AvatarSpec => ({
  name: "Student", pronouns: "they/them", age: "hs", skin: "#f0c29b", hairStyle: "bun", hair: "#5a3a35", hair2: null, eyeShape: "round", eyeColor: "#5a3a2a", brow: "soft", browColor: null,
  freckles: false, mole: false, nose: false, blush: true, mouthStyle: "smile", lip: "#8a4650", glasses: "round", glassColor: "#5b4048", hat: "none", hatColor: "#e07a66", earrings: null, scarf: null, badge: null,
  top: "hoodie", shirt: "#d9564a", shirt2: "#fff6ea", pattern: "solid", bottom: "pants", pants: "#4f5d75", shoeStyle: "sneaker", shoes: "#fbf6ee", packStyle: "pack", pack: "#8a5f6a", build: "regular", headSize: 1,
});

/** AvatarSpec -> rig Look (fields the rig reads) */
export function toLook(a: AvatarSpec, id = 11): Look {
  return {
    id, age: a.age, skin: a.skin, hair: a.hair, hair2: a.hair2 || undefined, style: a.hairStyle, shirt: a.shirt, shirt2: a.shirt2, top: a.top, pattern: a.pattern, bottom: a.bottom, pants: a.pants,
    eyeShape: a.eyeShape, eyeColor: a.eyeColor, brow: a.brow, browColor: a.browColor || undefined, freckles: a.freckles, mole: a.mole, nose: a.nose, blush: a.blush, mouthStyle: a.mouthStyle, lip: a.lip,
    glasses: a.glasses === "none" ? false : a.glasses, glassColor: a.glassColor, hat: a.hat === "none" ? undefined : a.hat, hatColor: a.hatColor, earrings: a.earrings || undefined, scarf: a.scarf || undefined, badge: a.badge || undefined,
    shoeStyle: a.shoeStyle, shoes: a.shoes, packStyle: a.packStyle, pack: a.pack, build: a.build, headSize: a.headSize,
  };
}

/** small seeded PRNG so rosters are the same for everyone */
export function rng(seed: number) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)];
const ids = (k: keyof typeof OPTIONS) => OPTIONS[k].map((x) => x.id);

export function randomAvatar(r: () => number, age: Age = "hs"): AvatarSpec {
  const top = pick(r, ids("top")), hat = r() < 0.28 ? pick(r, ids("hat").filter((x) => x !== "none")) : "none";
  const glasses = r() < 0.3 ? pick(r, ids("glasses").filter((x) => x !== "none")) : "none";
  return {
    ...defaultAvatar(), age, name: "", skin: pick(r, SKIN_TONES), hairStyle: pick(r, ids("hairStyle")), hair: pick(r, HAIR_COLORS), hair2: r() < 0.16 ? pick(r, HAIR_COLORS) : null,
    eyeShape: pick(r, ids("eyeShape")), eyeColor: pick(r, EYE_COLORS), brow: pick(r, ids("brow").filter((x) => x !== "none")), freckles: r() < 0.22, mole: r() < 0.1, nose: r() < 0.3, blush: r() < 0.8, mouthStyle: pick(r, ids("mouthStyle")),
    glasses, glassColor: pick(r, ["#5b4048", "#313a3f", "#d9564a", "#4f91c7", "#b8a8da"]), hat, hatColor: pick(r, CLOTH_COLORS), earrings: r() < 0.12 ? pick(r, ["#eab94e", "#fff6ea", "#f28f7e"]) : null, scarf: r() < 0.1 ? pick(r, CLOTH_COLORS) : null, badge: r() < 0.12 ? pick(r, CLOTH_COLORS) : null,
    top, shirt: pick(r, CLOTH_COLORS), shirt2: pick(r, CLOTH_COLORS), pattern: r() < 0.4 ? pick(r, ids("pattern")) : "solid", bottom: top === "dress" ? "pants" : pick(r, ids("bottom")), pants: pick(r, CLOTH_COLORS), shoeStyle: pick(r, ids("shoeStyle")), shoes: pick(r, SHOE_COLORS),
    packStyle: pick(r, ids("packStyle")), pack: pick(r, CLOTH_COLORS), build: pick(r, ids("build")), headSize: 0.94 + r() * 0.12,
  };
}
/** a signature of the look's most visible parts, for uniqueness checks */
export const signature = (a: AvatarSpec) => [a.skin, a.hairStyle, a.hair, a.top, a.shirt, a.pattern, a.hat, a.glasses, a.bottom, a.pants].join("|");

const HAIR_NAMES = ["black", "dark brown", "chestnut", "brown", "caramel", "auburn", "ginger", "blond", "platinum", "silver", "grey", "blue", "lavender", "pink", "green", "coral"];
const CLOTH_NAMES = ["blue", "navy", "sky blue", "sage green", "green", "mint", "gold", "yellow", "peach", "coral", "red", "pink", "lilac", "purple", "terracotta", "brown", "cream", "grey", "charcoal", "midnight blue"];
export const hairName = (hex: string) => HAIR_NAMES[HAIR_COLORS.indexOf(hex)] ?? "colorful";
export const clothName = (hex: string) => CLOTH_NAMES[CLOTH_COLORS.indexOf(hex)] ?? "colorful";
/** things another person would notice and could compliment, in a natural phrase */
export function lookFeatures(a: AvatarSpec): { key: string; phrase: string; noun: string }[] {
  const out: { key: string; phrase: string; noun: string }[] = [];
  const lab = (k: keyof typeof OPTIONS, id: string) => OPTIONS[k].find((x) => x.id === id)?.label.toLowerCase() ?? id;
  if (a.hat && a.hat !== "none") out.push({ key: "hat", phrase: `${clothName(a.hatColor)} ${lab("hat", a.hat)}`, noun: "hat" });
  if (a.glasses && a.glasses !== "none") out.push({ key: "glasses", phrase: `${lab("glasses", a.glasses)} glasses`, noun: "glasses" });
  out.push({ key: "hair", phrase: `${hairName(a.hair)} ${lab("hairStyle", a.hairStyle)} hair`, noun: "hair" });
  out.push({ key: "top", phrase: `${a.pattern !== "solid" ? a.pattern + " " : ""}${clothName(a.shirt)} ${lab("top", a.top)}`, noun: a.top });
  if (a.packStyle !== "none") out.push({ key: "pack", phrase: `${clothName(a.pack)} ${lab("packStyle", a.packStyle)}`, noun: "bag" });
  if (a.freckles) out.push({ key: "freckles", phrase: "freckles", noun: "freckles" });
  if (a.earrings) out.push({ key: "earrings", phrase: "earrings", noun: "earrings" });
  if (a.scarf) out.push({ key: "scarf", phrase: "scarf", noun: "scarf" });
  out.push({ key: "shoes", phrase: `${clothName(a.shoes) === "colorful" ? "" : clothName(a.shoes) + " "}${lab("shoeStyle", a.shoeStyle)}`.trim(), noun: "shoes" });
  return out;
}
