/** Walkway clearance for trees and big planters. A walkway is a centre line with a half width; a tree of radius r must keep `TREE_CLEAR` free between its trunk edge
 *  and the walkway edge. placeTree() relocates a spot that is too close (spiral search) or rejects it. Pure data/maths (plain-node testable). */
export interface Walk { x0: number; z0: number; x1: number; z1: number; hw: number }
export const TREE_CLEAR = 1.2;
export const distToWalk = (w: Walk, x: number, z: number) => {
  const dx = w.x1 - w.x0, dz = w.z1 - w.z0, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - w.x0) * dx + (z - w.z0) * dz) / l2)) : 0;
  return Math.hypot(x - (w.x0 + dx * t), z - (w.z0 + dz * t));
};
/** clearance between a tree trunk edge and the nearest walkway edge (negative = standing on the path) */
export const clearance = (walks: Walk[], x: number, z: number, r = 0) => { let m = Infinity; for (const w of walks) m = Math.min(m, distToWalk(w, x, z) - w.hw - r); return m; };
export const clearOfWalks = (walks: Walk[], x: number, z: number, r = 0.5, clear = TREE_CLEAR) => clearance(walks, x, z, r) >= clear;
/** keep the spot if it is clear, else the nearest clear spot (also satisfying `ok`), else null */
export function placeTree(walks: Walk[], x: number, z: number, r = 0.5, ok: (x: number, z: number) => boolean = () => true, clear = TREE_CLEAR, maxD = 7): { x: number; z: number } | null {
  if (clearOfWalks(walks, x, z, r, clear) && ok(x, z)) return { x, z };
  for (let d = 0.4; d <= maxD; d += 0.4) for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 + d, nx = x + Math.cos(a) * d, nz = z + Math.sin(a) * d; if (clearOfWalks(walks, nx, nz, r, clear) && ok(nx, nz)) return { x: nx, z: nz }; }
  return null;
}
