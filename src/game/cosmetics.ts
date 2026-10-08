/** Things to collect and show off: locker decorations (wall paper, lights, magnets, door plate) and Chat Chow "crew" looks (table cloth, flag, crew name).
 *  Earned from daily quests and events; everything is just for fun and stays on this family's device / synced family account. */
export type Slot = "wall" | "light" | "magnet" | "plate" | "cloth" | "flag" | "crew";
export interface Item { id: string; slot: Slot; name: string; art: string; color?: string; free?: boolean; tier: 1 | 2 | 3 }
export const ITEMS: Item[] = [
  { id: "w-stars", slot: "wall", name: "Starry night wallpaper", art: "✨", color: "linear-gradient(#2b2b6b,#5b3c8c)", free: true, tier: 1 },
  { id: "w-sunset", slot: "wall", name: "Sunset stripes", art: "🌇", color: "linear-gradient(#ff9a5b,#f2548d)", tier: 1 },
  { id: "w-ocean", slot: "wall", name: "Ocean waves", art: "🌊", color: "linear-gradient(#3bb6d8,#2459b8)", tier: 1 },
  { id: "w-forest", slot: "wall", name: "Forest green", art: "🌲", color: "linear-gradient(#4c9f70,#1f6b46)", tier: 2 },
  { id: "w-candy", slot: "wall", name: "Candy swirl", art: "🍭", color: "linear-gradient(135deg,#ff8fb1,#ffd23f,#7bd389)", tier: 2 },
  { id: "w-galaxy", slot: "wall", name: "Galaxy", art: "🪐", color: "linear-gradient(135deg,#0d0d2b,#6b3fa0,#e8604c)", tier: 3 },
  { id: "l-warm", slot: "light", name: "Warm string lights", art: "💡", color: "#ffd98a", free: true, tier: 1 },
  { id: "l-rainbow", slot: "light", name: "Rainbow lights", art: "🌈", color: "rainbow", tier: 2 },
  { id: "l-neon", slot: "light", name: "Neon glow", art: "🟣", color: "#d36bff", tier: 2 },
  { id: "l-fire", slot: "light", name: "Firefly lights", art: "✨", color: "#d6ff6b", tier: 3 },
  { id: "m-heart", slot: "magnet", name: "Heart magnet", art: "💖", tier: 1 }, { id: "m-soccer", slot: "magnet", name: "Soccer ball", art: "⚽", tier: 1 }, { id: "m-guitar", slot: "magnet", name: "Guitar", art: "🎸", tier: 1 },
  { id: "m-paint", slot: "magnet", name: "Paint palette", art: "🎨", tier: 2 }, { id: "m-rocket", slot: "magnet", name: "Rocket", art: "🚀", tier: 2 }, { id: "m-dino", slot: "magnet", name: "Dinosaur", art: "🦖", tier: 2 },
  { id: "m-crown", slot: "magnet", name: "Golden crown", art: "👑", tier: 3 }, { id: "m-rainbow", slot: "magnet", name: "Rainbow", art: "🌈", tier: 3 },
  { id: "p-name", slot: "plate", name: "Bold name plate", art: "🏷️", color: "#E8604C", free: true, tier: 1 }, { id: "p-gold", slot: "plate", name: "Gold plate", art: "🥇", color: "#EAB94E", tier: 2 }, { id: "p-neon", slot: "plate", name: "Neon plate", art: "🟢", color: "#3BCEAC", tier: 3 },
  { id: "c-checks", slot: "cloth", name: "Picnic checks", art: "🧺", color: "#E8604C", free: true, tier: 1 }, { id: "c-ocean", slot: "cloth", name: "Ocean blue", art: "🌊", color: "#4F91C7", tier: 1 },
  { id: "c-mint", slot: "cloth", name: "Mint fresh", art: "🍃", color: "#5FB37A", tier: 1 }, { id: "c-grape", slot: "cloth", name: "Grape", art: "🍇", color: "#8E7CC3", tier: 2 }, { id: "c-sun", slot: "cloth", name: "Sunshine", art: "🌞", color: "#F2B632", tier: 2 }, { id: "c-gold", slot: "cloth", name: "Royal gold", art: "👑", color: "#D9A441", tier: 3 },
  { id: "f-star", slot: "flag", name: "Star flag", art: "⭐", free: true, tier: 1 }, { id: "f-paw", slot: "flag", name: "Paw print", art: "🐾", tier: 1 }, { id: "f-bolt", slot: "flag", name: "Lightning", art: "⚡", tier: 2 }, { id: "f-moon", slot: "flag", name: "Moon", art: "🌙", tier: 2 }, { id: "f-dragon", slot: "flag", name: "Dragon", art: "🐉", tier: 3 },
  { id: "n-crew", slot: "crew", name: "The Crew", art: "🤝", free: true, tier: 1 }, { id: "n-snack", slot: "crew", name: "Snack Squad", art: "🍿", tier: 1 }, { id: "n-brain", slot: "crew", name: "Brain Trust", art: "🧠", tier: 2 }, { id: "n-wave", slot: "crew", name: "Wave Riders", art: "🏄", tier: 2 }, { id: "n-spark", slot: "crew", name: "Spark Club", art: "⚡", tier: 3 },
];
const KEY = "unify.cosmetics.v1";
interface St { own: string[]; eq: Partial<Record<Slot, string>> & { magnets?: string[] }; crewName?: string }
const read = (): St => { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) return { own: [], eq: {}, ...s }; } catch { /* default */ } return { own: ITEMS.filter((i) => i.free).map((i) => i.id), eq: { wall: "w-stars", light: "l-warm", plate: "p-name", cloth: "c-checks", flag: "f-star", crew: "n-crew", magnets: [] } }; };
const write = (s: St) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } try { dispatchEvent(new CustomEvent("unify:cosmetics")); } catch { /* none */ } };
export const itemById = (id: string) => ITEMS.find((i) => i.id === id);
export const Cosm = {
  items: ITEMS, state: read,
  owned(id: string) { return read().own.includes(id); },
  grant(id: string): boolean { const s = read(); if (s.own.includes(id) || !itemById(id)) return false; s.own.push(id); write(s); return true; },
  /** a random item the player doesn't own yet, from the given tier or lower (null when everything is collected) */
  reward(maxTier: 1 | 2 | 3 = 2): Item | null { const s = read(), pool = ITEMS.filter((i) => !s.own.includes(i.id) && i.tier <= maxTier); if (!pool.length) return null; const it = pool[Math.floor(Math.random() * pool.length)]; Cosm.grant(it.id); return it; },
  equip(id: string) { const it = itemById(id); if (!it || !read().own.includes(id)) return; const s = read(); if (it.slot === "magnet") { const m = s.eq.magnets ?? []; const i = m.indexOf(id); if (i >= 0) m.splice(i, 1); else if (m.length < 6) m.push(id); s.eq.magnets = m; } else s.eq[it.slot] = id; write(s); },
  eq(slot: Slot): Item | undefined { const id = (read().eq as any)[slot]; return id ? itemById(id) : undefined; },
  magnets(): Item[] { return (read().eq.magnets ?? []).map((i) => itemById(i)!).filter(Boolean); },
  crewName(): string { return read().crewName || Cosm.eq("crew")?.name || "The Crew"; },
  setCrewName(n: string) { const s = read(); s.crewName = n.trim().slice(0, 18); write(s); },
};
