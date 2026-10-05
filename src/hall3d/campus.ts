/** Indoor campus layout (pure data): a ring corridor around four subject blocks and a central plaza.
 *  Grid units = world units. Grid x runs west->east, grid y runs north->south. World = (x - W/2, z = y - H/2). */
export type Subject = "math" | "ela" | "science" | "history";
export const SUBJECTS: Subject[] = ["math", "ela", "science", "history"];
export const W = 56, H = 44, WALL_H = 4.2, LOCK_D = 0.6;
export interface Rect { x: number; y: number; w: number; h: number }
export type Face = "N" | "S" | "E" | "W";

export const BLOCKS: { subject: Subject; rect: Rect }[] = [
  { subject: "math", rect: { x: 5, y: 5, w: 16, h: 12 } },
  { subject: "ela", rect: { x: 35, y: 5, w: 16, h: 12 } },
  { subject: "science", rect: { x: 5, y: 27, w: 16, h: 12 } },
  { subject: "history", rect: { x: 35, y: 27, w: 16, h: 12 } },
];

export interface Door { subject: Subject; face: Face; cx: number; cy: number; trigger: Rect; approach: { x: number; y: number } }
/** one door per block, on the face that opens onto the plaza band */
export const DOORS: Door[] = BLOCKS.map((b) => {
  const south = b.rect.y < 20, cx = b.rect.x + b.rect.w / 2, cy = south ? b.rect.y + b.rect.h : b.rect.y;
  return { subject: b.subject, face: south ? "S" : "N", cx, cy, trigger: { x: cx - 1.2, y: south ? cy : cy - 0.9, w: 2.4, h: 0.9 }, approach: { x: cx, y: south ? cy + 1.6 : cy - 1.6 } };
});

/** the newsroom door: centred on the north outer wall, between two locker runs */
export const NEWS = { cx: 28, cy: 0, trigger: { x: 26.8, y: 0.45, w: 2.4, h: 0.95 } as Rect, approach: { x: 28, y: 2.4 } };
/** the library door: on the south wall, east of the main entrance */
export const LIB = { cx: 53, cy: H, trigger: { x: 51.8, y: H - 1.4, w: 2.4, h: 0.95 } as Rect, approach: { x: 53, y: H - 2.6 } };
export type Room = Subject | "news" | "library";
export interface LockerRun { rect: Rect; face: Face }
export const LOCKERS: LockerRun[] = [
  { rect: { x: 6, y: 0, w: 19, h: LOCK_D }, face: "S" }, { rect: { x: 31, y: 0, w: 19, h: LOCK_D }, face: "S" },
  { rect: { x: 6, y: H - LOCK_D, w: 18, h: LOCK_D }, face: "N" }, { rect: { x: 32, y: H - LOCK_D, w: 18, h: LOCK_D }, face: "N" },
  { rect: { x: 0, y: 6, w: LOCK_D, h: 32 }, face: "E" }, { rect: { x: W - LOCK_D, y: 6, w: LOCK_D, h: 32 }, face: "W" },
  { rect: { x: 6, y: 5 - LOCK_D, w: 14, h: LOCK_D }, face: "N" }, { rect: { x: 36, y: 5 - LOCK_D, w: 14, h: LOCK_D }, face: "N" },
  { rect: { x: 6, y: 39, w: 14, h: LOCK_D }, face: "S" }, { rect: { x: 36, y: 39, w: 14, h: LOCK_D }, face: "S" },
  { rect: { x: 5 - LOCK_D, y: 6, w: LOCK_D, h: 10 }, face: "W" }, { rect: { x: 5 - LOCK_D, y: 28, w: LOCK_D, h: 10 }, face: "W" },
  { rect: { x: 51, y: 6, w: LOCK_D, h: 10 }, face: "E" }, { rect: { x: 51, y: 28, w: LOCK_D, h: 10 }, face: "E" },
];

export type PropKind = "tree" | "bench" | "table" | "fountain" | "planter" | "lamp";
export interface Prop { kind: PropKind; x: number; y: number; rot?: number }
export const ENTRANCE = { gap: { x0: 24, x1: 32 }, tile: { x: 28, y: H - 1 } };
const tablesAt = (xs: number[], ys: number[]): Prop[] => xs.flatMap((x) => ys.map((y) => ({ kind: "table" as const, x, y })));
export const PROPS: Prop[] = [
  { kind: "fountain", x: 28, y: 22 },
  ...[[23.5, 7.5], [32.5, 7.5], [23.5, 36.5], [32.5, 36.5], [7, 19], [7, 25], [49, 19], [49, 25], [23, 14], [33, 14], [23, 30], [33, 30]].map(([x, y]) => ({ kind: "tree" as const, x, y })),
  ...tablesAt([10, 14, 18], [20, 24]), ...tablesAt([38, 42, 46], [20, 24]),
  ...[[24.2, 11], [31.8, 11], [24.2, 33], [31.8, 33]].map(([x, y]) => ({ kind: "bench" as const, x, y, rot: Math.PI / 2 })),
  { kind: "planter", x: 25.2, y: 18.2 }, { kind: "planter", x: 30.8, y: 18.2 }, { kind: "planter", x: 25.2, y: 25.8 }, { kind: "planter", x: 30.8, y: 25.8 },
  ...[[12, 2.5], [20, 2.5], [36, 2.5], [44, 2.5], [12, 41.5], [44, 41.5], [2.5, 22], [53.5, 22]].map(([x, y]) => ({ kind: "lamp" as const, x, y })),
];

const SIZE: Record<PropKind, [number, number]> = { tree: [1.2, 1.2], bench: [0.7, 1.9], table: [1.9, 1.9], fountain: [4.6, 4.6], planter: [1.4, 1.4], lamp: [0.1, 0.1] };

/** solid rectangles used for collision and navigation */
export function blockers(): Rect[] {
  const r: Rect[] = BLOCKS.map((b) => ({ ...b.rect }));
  for (const l of LOCKERS) r.push(l.rect);
  for (const p of PROPS) { const [w, h] = SIZE[p.kind]; if (p.kind === "lamp") continue; r.push({ x: p.x - w / 2, y: p.y - h / 2, w, h }); }
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
