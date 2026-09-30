/** Clock, schedule and pathfinding shared by the 3D hallway (same rules as the isometric one). */
export interface Period { name: string; len: number; kind: "arrive" | "class" | "lunch" | "dismiss"; swap?: boolean; tint: [number, number, number, number]; start: number }
const P0: Omit<Period, "start">[] = [
  { name: "Morning Arrival", len: 30, kind: "arrive", tint: [255, 200, 140, 0.16] },
  { name: "Period 1", len: 60, kind: "class", swap: false, tint: [255, 255, 255, 0] },
  { name: "Lunch", len: 30, kind: "lunch", tint: [255, 236, 170, 0.12] },
  { name: "Period 2", len: 60, kind: "class", swap: true, tint: [255, 235, 215, 0.07] },
  { name: "Dismissal", len: 30, kind: "dismiss", tint: [255, 130, 80, 0.24] },
];
export const PERIODS: Period[] = (() => { let a = 0; return P0.map((p) => { const q = { ...p, start: a }; a += p.len; return q; }); })();
export const DAY = PERIODS.reduce((n, p) => n + p.len, 0), DAY_START = 7 * 60 + 30;
export const periodAt = (t: number) => { for (let i = PERIODS.length - 1; i >= 0; i--) if (t >= PERIODS[i].start) return i; return 0; };
export const clockStr = (t: number) => { const m = DAY_START + Math.floor(t), h = Math.floor(m / 60) % 24, mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const shuffle = <T,>(a: T[]) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/** 4-neighbour A* over a nav grid ("." open, "#" blocked). Returns tiles after the start tile. */
export function astar(nav: string[], sx: number, sy: number, gx: number, gy: number): { x: number; y: number }[] {
  const H = nav.length, W = nav[0].length, open_ = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && nav[y][x] === ".";
  if ((sx === gx && sy === gy) || !open_(gx, gy)) return [];
  const key = (x: number, y: number) => y * W + x, g = new Map<number, number>([[key(sx, sy), 0]]), from = new Map<number, number>();
  const open = [{ x: sx, y: sy, f: 0 }], closed = new Set<number>();
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0], ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue; closed.add(ck);
    if (cur.x === gx && cur.y === gy) { const p: { x: number; y: number }[] = []; let k = ck; while (k !== key(sx, sy)) { p.push({ x: k % W, y: Math.floor(k / W) }); k = from.get(k)!; } return p.reverse(); }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx, ny = cur.y + dy; if (!open_(nx, ny)) continue;
      const nk = key(nx, ny), ng = g.get(ck)! + 1; if (g.has(nk) && g.get(nk)! <= ng) continue;
      g.set(nk, ng); from.set(nk, ck); open.push({ x: nx, y: ny, f: ng + Math.abs(nx - gx) + Math.abs(ny - gy) });
    }
  }
  return [];
}
