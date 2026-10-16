import { placeTree, TREE_CLEAR, type Walk } from "../shared/walkways";
/** Indoor campus layout (pure data): a ring corridor around four subject blocks and a central plaza.
 *  Grid units = world units. Grid x runs west->east, grid y runs north->south. World = (x - W/2, z = y - H/2). */
export type Subject = "math" | "ela" | "science" | "history" | "careers" | "life";
export const SUBJECTS: Subject[] = ["math", "ela", "science", "history", "careers", "life"];
export const W = 56, H = 44, WALL_H = 4.2, LOCK_D = 0.6;
export interface Rect { x: number; y: number; w: number; h: number }
export type Face = "N" | "S" | "E" | "W";

export const BLOCKS: { subject: Subject; rect: Rect }[] = [
  { subject: "math", rect: { x: 5, y: 5, w: 16, h: 12 } },
  { subject: "ela", rect: { x: 35, y: 5, w: 16, h: 12 } },
  { subject: "science", rect: { x: 5, y: 27, w: 16, h: 12 } },
  { subject: "history", rect: { x: 35, y: 27, w: 16, h: 12 } },
  { subject: "careers", rect: { x: 22.5, y: 6, w: 5, h: 7 } },   // CarryingCareers: every career path, any type, in one room
  { subject: "life", rect: { x: 28.5, y: 6, w: 5, h: 7 } },       // Life Lessons: the fundamentals of growing into an independent adult
];

export interface Door { subject: Subject; face: Face; cx: number; cy: number; trigger: Rect; approach: { x: number; y: number } }
/** one door per block, on the face that opens onto the plaza band */
export const DOORS: Door[] = BLOCKS.map((b) => {
  const south = b.rect.y < 20, cx = b.rect.x + b.rect.w / 2, cy = south ? b.rect.y + b.rect.h : b.rect.y;
  return { subject: b.subject, face: south ? "S" : "N", cx, cy, trigger: { x: cx - 1.2, y: south ? cy : cy - 0.9, w: 2.4, h: 0.9 }, approach: { x: cx, y: south ? cy + 1.6 : cy - 1.6 } };
});

/** the newsroom door: centred on the north outer wall, between two locker runs */
export const NEWS = { cx: 28, cy: 0, trigger: { x: 26.8, y: 0.45, w: 2.4, h: 0.95 } as Rect, approach: { x: 28, y: 2.4 } };
/** The Open Door: the parent-run classroom, a door in the west outer wall */
export const OPEN = { cx: 0, cy: 22, trigger: { x: 0.45, y: 20.8, w: 0.95, h: 2.4 } as Rect, approach: { x: 2.6, y: 22 } };
export type Room = Subject | "news" | "open";
export interface LockerRun { rect: Rect; face: Face }
export const LOCKERS: LockerRun[] = [
  { rect: { x: 6, y: 0, w: 19, h: LOCK_D }, face: "S" }, { rect: { x: 31, y: 0, w: 19, h: LOCK_D }, face: "S" },
  { rect: { x: 6, y: H - LOCK_D, w: 18, h: LOCK_D }, face: "N" }, { rect: { x: 32, y: H - LOCK_D, w: 18, h: LOCK_D }, face: "N" },
  { rect: { x: 0, y: 6, w: LOCK_D, h: 14 }, face: "E" }, { rect: { x: 0, y: 24, w: LOCK_D, h: 14 }, face: "E" }, { rect: { x: W - LOCK_D, y: 6, w: LOCK_D, h: 32 }, face: "W" },
  { rect: { x: 6, y: 5 - LOCK_D, w: 14, h: LOCK_D }, face: "N" }, { rect: { x: 36, y: 5 - LOCK_D, w: 14, h: LOCK_D }, face: "N" },
  { rect: { x: 6, y: 39, w: 14, h: LOCK_D }, face: "S" }, { rect: { x: 36, y: 39, w: 14, h: LOCK_D }, face: "S" },
  { rect: { x: 5 - LOCK_D, y: 6, w: LOCK_D, h: 10 }, face: "W" }, { rect: { x: 5 - LOCK_D, y: 28, w: LOCK_D, h: 10 }, face: "W" },
  { rect: { x: 51, y: 6, w: LOCK_D, h: 10 }, face: "E" }, { rect: { x: 51, y: 28, w: LOCK_D, h: 10 }, face: "E" },
];

export type PropKind = "tree" | "bench" | "table" | "fountain" | "planter" | "lamp" | "tv" | "bboard";
export interface Prop { kind: PropKind; x: number; y: number; rot?: number }
export const ENTRANCE = { gap: { x0: 24, x1: 32 }, tile: { x: 28, y: H - 1 } };
const tablesAt = (xs: number[], ys: number[]): Prop[] => xs.flatMap((x) => ys.map((y) => ({ kind: "table" as const, x, y })));
export const PROPS: Prop[] = [
  { kind: "fountain", x: 28, y: 22 },
  { kind: "bboard", x: 28, y: 30.8 },   // the live bulletin board on the plaza (drawn by hallDetails)
  { kind: "tv", x: 28, y: 15.6 },   // the wired-in news box TV (drawn by HallScene); the class-times bulletin board now stands outside the entrance
  ...[[23.5, 36.5], [32.5, 36.5], [7, 19], [7, 25], [49, 19], [49, 25], [23, 14], [33, 14], [23, 30], [33, 30]].map(([x, y]) => ({ kind: "tree" as const, x, y })),
  ...tablesAt([10, 14, 18], [20, 24]), ...tablesAt([38, 42, 46], [20, 24]),
  ...[[24.2, 33], [31.8, 33]].map(([x, y]) => ({ kind: "bench" as const, x, y, rot: Math.PI / 2 })),
  { kind: "planter", x: 24.4, y: 18.6 }, { kind: "planter", x: 31.6, y: 18.6 }, { kind: "planter", x: 24.4, y: 25.4 }, { kind: "planter", x: 31.6, y: 25.4 },
  ...[[12, 2.5], [20, 2.5], [36, 2.5], [44, 2.5], [12, 41.5], [44, 41.5], [2.5, 18.5], [53.5, 22]].map(([x, y]) => ({ kind: "lamp" as const, x, y })),
];

/** Walkways (grid units): the ring corridor, plaza cross, every door's approach lane, the entrance path, sidewalk and road. Trees keep >= TREE_CLEAR from their edges. */
export const PATHS: Walk[] = [
  { x0: 2.8, z0: 2.8, x1: W - 2.8, z1: 2.8, hw: 2 }, { x0: 2.8, z0: H - 2.8, x1: W - 2.8, z1: H - 2.8, hw: 2 }, { x0: 2.8, z0: 2.8, x1: 2.8, z1: H - 2.8, hw: 2 }, { x0: W - 2.8, z0: 2.8, x1: W - 2.8, z1: H - 2.8, hw: 2 },
  { x0: 28, z0: H + 28, x1: 28, z1: 24.5, hw: 2.2 }, { x0: 5, z0: 22, x1: W - 5, z1: 22, hw: 1.2 },
  ...DOORS.map((d) => ({ x0: d.cx, z0: d.cy, x1: d.cx, z1: d.cy + (d.face === "S" ? 4 : -4), hw: 1.1 })),
  { x0: NEWS.cx, z0: 0, x1: NEWS.cx, z1: 5, hw: 1.2 }, { x0: 0, z0: OPEN.cy, x1: 5, z1: OPEN.cy, hw: 1.2 },
  { x0: -30, z0: H + 3, x1: W + 30, z1: H + 3, hw: 2.1 }, { x0: -60, z0: H + 7, x1: W + 80, z1: H + 7, hw: 2.3 }, { x0: 28, z0: H + 30, x1: 28, z1: H + 30, hw: 9 },
];
{ const free = (x: number, y: number) => x > 1.8 && x < W - 1.8 && y > 1.8 && y < H - 1.8 && !BLOCKS.some((b) => x > b.rect.x - 1 && x < b.rect.x + b.rect.w + 1 && y > b.rect.y - 1 && y < b.rect.y + b.rect.h + 1) && !PROPS.some((q) => q.kind !== "tree" && q.kind !== "lamp" && Math.hypot(q.x - x, q.y - y) < (q.kind === "fountain" ? 4.2 : 1.9));
  for (const p of PROPS) if (p.kind === "tree") { const q = placeTree(PATHS, p.x, p.y, 0.6, free); if (q) { p.x = +q.x.toFixed(2); p.y = +q.z.toFixed(2); } } }

import type { PlantKind } from "../shared/plants";
export type { PlantKind };
/** tall indoor greenery (grid units): corners and wall ends, never on a walkway or in front of a door or board. Hanging plants use wall brackets (no footprint). */
export interface PlantSpot { kind: PlantKind; x: number; y: number; rot?: number }
export const PLANTS: PlantSpot[] = [
  { kind: "ficus", x: 1.7, y: 1.7 }, { kind: "palm", x: W - 1.7, y: 1.7 }, { kind: "palm", x: 1.7, y: H - 1.7 }, { kind: "ficus", x: W - 1.7, y: H - 1.7 },
  { kind: "bamboo", x: 22.6, y: H - 1.5 }, { kind: "bamboo", x: 33.4, y: H - 1.5 }, { kind: "palm", x: 25.4, y: 1.6 }, { kind: "ficus", x: 30.6, y: 1.6 },
  { kind: "bamboo", x: 1.5, y: 18.4 }, { kind: "ficus", x: 1.5, y: 25.8 }, { kind: "palm", x: W - 1.5, y: 18.4 }, { kind: "bamboo", x: W - 1.5, y: 25.8 },
  { kind: "ficus", x: 5.8, y: 18.1 }, { kind: "palm", x: W - 5.8, y: 18.1 }, { kind: "bamboo", x: 5.8, y: 26.5 }, { kind: "ficus", x: W - 5.8, y: 26.5 },
  ...DOORS.flatMap((d) => [-1.8, 1.8].map((o) => ({ kind: "hang" as const, x: d.cx + o, y: d.cy + (d.face === "S" ? 0.34 : -0.34), rot: d.face === "S" ? 0 : Math.PI }))),
];
export const PLANT_R = 0.5;

const SIZE: Record<PropKind, [number, number]> = { tree: [1.2, 1.2], bench: [0.7, 1.9], table: [1.9, 1.9], fountain: [4.6, 4.6], planter: [1.4, 1.4], lamp: [0.1, 0.1], tv: [2.0, 1.3], bboard: [3.2, 0.7] };

/** solid rectangles used for collision and navigation */
export function blockers(): Rect[] {
  const r: Rect[] = BLOCKS.map((b) => ({ ...b.rect }));
  for (const l of LOCKERS) r.push(l.rect);
  for (const p of PROPS) { const [w, h] = SIZE[p.kind]; if (p.kind === "lamp") continue; r.push({ x: p.x - w / 2, y: p.y - h / 2, w, h }); }
  for (const p of PLANTS) if (p.kind !== "hang") r.push({ x: p.x - PLANT_R, y: p.y - PLANT_R, w: PLANT_R * 2, h: PLANT_R * 2 });
  return r;
}
export const BLOCKED = blockers();

export const hit = (r: Rect, x: number, y: number, pad = 0) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
export function solidAt(x: number, y: number, pad = 0.16): boolean {
  if (x < 0.45 || y < 0.45 || x > W - 0.45) return true;
  if (y > H - 0.45) return !(x > ENTRANCE.gap.x0 && x < ENTRANCE.gap.x1 && y < H + 3);
  return BLOCKED.some((r) => hit(r, x, y, pad));
}
/** nav grid, one char per 1x1 tile: "." open, "#" blocked (tile centre inside a blocker) */
export const NAV: string[] = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (BLOCKED.some((r) => hit(r, x + 0.5, y + 0.5, 0.2)) ? "#" : ".")).join(""));
export const PLAZA_TILES: { x: number; y: number }[] = NAV.flatMap((row, y) => row.split("").map((c, x) => ({ c, x, y }))).filter((t) => t.c === "." && t.x >= 7 && t.x <= 48 && t.y >= 7 && t.y <= 37 && !BLOCKS.some((b) => hit(b.rect, t.x + 0.5, t.y + 0.5, 0)));
export const CORRIDOR_TILES: { x: number; y: number }[] = NAV.flatMap((row, y) => row.split("").map((c, x) => ({ c, x, y }))).filter((t) => t.c === "." && (t.x < 4 || t.x > W - 5 || t.y < 4 || t.y > H - 5));

/** outside the front doors: the class-times bulletin board by the entrance, the bus stop on the road in front of the school (grid units; y > H is outdoors) */
export const OUTSIDE = { board: { x: 35.2, y: H + 2.4 }, boardStand: { x: 35.2, y: H + 4.0 }, busStop: { x: 38.2, y: H + 7 }, busDoor: { x: 35.2, y: H + 5.55 }, roadY: H + 7 };
/** Chat Chow: the plaza tables where students sit and talk (the six west and six east tables) */
export const CHOW_TABLES: { x: number; y: number }[] = PROPS.filter((p) => p.kind === "table").map((p) => ({ x: p.x, y: p.y }));

/** the lawn trees outside the building (grid units). Deterministic; every tree keeps TREE_CLEAR from the entrance path, sidewalk, road and bus bay. */
export interface OutTree { x: number; y: number; s: number; sp: "oak" | "pine" | "birch"; rot: number; tint: number }
const hsh = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
export function outsideTrees(): OutTree[] {
  const out: OutTree[] = [];
  for (let i = 0; i < 900 && out.length < 190; i++) {
    const wx = (hsh(i, 1) - 0.5) * 150, wz = (hsh(i, 2) - 0.5) * 140 + 8, s = 0.8 + hsh(i, 3) * 0.9;
    if (Math.abs(wx) < W / 2 + 5 && Math.abs(wz) < H / 2 + 5) continue;                       // keep clear of the building
    const q = placeTree(PATHS, wx + W / 2, wz + H / 2, 0.8 * s, (x, y) => !(Math.abs(x - W / 2) < W / 2 + 5 && Math.abs(y - H / 2) < H / 2 + 5), TREE_CLEAR, 3); if (!q) continue;
    const r = hsh(i, 15); out.push({ x: q.x, y: q.z, s, sp: r < 0.5 ? "oak" : r < 0.8 ? "pine" : "birch", rot: hsh(i, 5) * 6.28, tint: hsh(i, 6) });
  }
  return out;
}
