import type { AuditoriumLayout, BlockRect } from "../types";
/** Logical collision only. Never drawn unless ?debug=1. */
export class CollisionSystem {
  rects: BlockRect[];
  constructor(private L: AuditoriumLayout) {
    const [x0, x1] = L.stage.x, [y0, y1] = L.stage.y, [a0, a1] = L.aisle;
    this.rects = [...L.blocked,
      { gx: x1 - 0.3, gy: y0, w: 0.3, d: a0 - y0, kind: "stageEdge" }, { gx: x1 - 0.3, gy: a1 + 1, w: 0.3, d: y1 - (a1 + 1), kind: "stageEdge" },
      { gx: x0, gy: y0 - 0.15, w: x1 - x0, d: 0.15, kind: "stageSide" }, { gx: x0, gy: y1, w: x1 - x0, d: 0.15, kind: "stageSide" }];
  }
  blocked(gx: number, gy: number, r = 0.18): boolean {
    const g = this.L.grid;
    if (gx < 0.4 || gy < 0.4 || gx > g.w - 0.4 || gy > g.h - 0.4) return true;
    return this.rects.some((b) => gx > b.gx - r && gx < b.gx + b.w + r && gy > b.gy - r && gy < b.gy + b.d + r);
  }
  move(gx: number, gy: number, dx: number, dy: number) {
    let nx = gx, ny = gy;
    if (!this.blocked(gx + dx, gy)) nx = gx + dx;
    if (!this.blocked(nx, gy + dy)) ny = gy + dy;
    return { gx: nx, gy: ny };
  }
  elevAt(gx: number, gy: number): number {
    const L = this.L, [x1] = [L.stage.x[1]], [y0, y1] = L.stage.y, [a0, a1] = L.aisle;
    if (gx < x1 && gy >= y0 && gy < y1) return L.stage.elev;
    if (gx >= x1 && gx < x1 + 1 && gy >= a0 && gy < a1 + 1) return L.stage.elev * (x1 + 1 - gx);
    const t = Math.floor((gx - L.tiers.x0) / 2);
    if (t >= 0 && t < L.tiers.n && gy >= 1 && gy < 13) return L.tiers.riser * (t + 1);
    return 0;
  }
}
