/** Pure 2D collision on the ground plane (x,z). Static rects/circles in a spatial hash, soft circle-vs-circle separation for people, and a small steering helper
 *  (wait or go around). No three.js, so it runs under plain node for tests. Keep this file free of enums/namespaces (node type-stripping). */
export interface Circ { x: number; z: number; r: number }
export interface Body extends Circ { id: number; fixed?: boolean; ghost?: boolean }
type Shape = { rect: boolean; x0: number; z0: number; x1: number; z1: number; cx: number; cz: number; r: number };
const CELL = 4, key = (i: number, j: number) => (i + 512) * 1024 + (j + 512);

export class Statics {
  shapes: Shape[] = []; private grid = new Map<number, number[]>(); private seen: number[] = []; private stamp = 0;
  private put(s: Shape) {
    const id = this.shapes.push(s) - 1;
    for (let i = Math.floor(s.x0 / CELL); i <= Math.floor(s.x1 / CELL); i++) for (let j = Math.floor(s.z0 / CELL); j <= Math.floor(s.z1 / CELL); j++) { const k = key(i, j); const a = this.grid.get(k); if (a) a.push(id); else this.grid.set(k, [id]); }
    return id;
  }
  addRect(x0: number, z0: number, x1: number, z1: number) { return this.put({ rect: true, x0, z0, x1, z1, cx: 0, cz: 0, r: 0 }); }
  addBox(cx: number, cz: number, w: number, d: number) { return this.addRect(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2); }
  addCircle(cx: number, cz: number, r: number) { return this.put({ rect: false, x0: cx - r, z0: cz - r, x1: cx + r, z1: cz + r, cx, cz, r }); }
  /** a rect that can be switched off (a closed door blocks, an open one does not) */
  private off = new Set<number>();
  setEnabled(id: number, on: boolean) { if (on) this.off.delete(id); else this.off.add(id); }
  near(x: number, z: number, r: number): Shape[] {
    const out: Shape[] = [], st = ++this.stamp;
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
      const a = this.grid.get(key(i, j)); if (!a) continue;
      for (const id of a) { if (this.seen[id] === st || this.off.has(id)) continue; this.seen[id] = st; out.push(this.shapes[id]); }
    }
    return out;
  }
  /** push a circle out of everything it overlaps; returns the corrected position and whether anything was touched */
  push(x: number, z: number, r: number): { x: number; z: number; hit: boolean } {
    let hit = false;
    for (let it = 0; it < 4; it++) {
      let moved = false;
      for (const s of this.near(x, z, r + 0.01)) {
        let nx: number, nz: number, d: number, lim = r;
        if (s.rect) {
          const px = Math.max(s.x0, Math.min(s.x1, x)), pz = Math.max(s.z0, Math.min(s.z1, z)); nx = x - px; nz = z - pz; d = Math.hypot(nx, nz);
          if (d === 0) { const l = x - s.x0, rr = s.x1 - x, t = z - s.z0, b = s.z1 - z, m = Math.min(l, rr, t, b); if (m === l) { nx = -1; nz = 0; } else if (m === rr) { nx = 1; nz = 0; } else if (m === t) { nx = 0; nz = -1; } else { nx = 0; nz = 1; } x += nx * (m + r); z += nz * (m + r); moved = hit = true; continue; }
        } else { nx = x - s.cx; nz = z - s.cz; d = Math.hypot(nx, nz); if (d === 0) { nx = 1; nz = 0; d = 1e-6; } lim = r + s.r; }
        if (d < lim - 1e-6) { const k = (lim - d) / d; x += nx * k; z += nz * k; moved = hit = true; }
      }
      if (!moved) break;
    }
    return { x, z, hit };
  }
  blocked(x: number, z: number, r: number) { return this.push(x, z, r).hit; }
  /** move by (dx,dz) in small steps, sliding along whatever is hit */
  slide(x: number, z: number, dx: number, dz: number, r: number): { x: number; z: number; hit: boolean } {
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (r * 0.5))); let hit = false;
    for (let i = 0; i < n; i++) { const p = this.push(x + dx / n, z + dz / n, r); x = p.x; z = p.z; if (p.hit) hit = true; }
    return { x, z, hit };
  }
}

/** spatial hash of moving bodies, rebuilt every frame */
export class Crowd {
  private cell: number; private grid = new Map<number, Body[]>(); bodies: Body[] = [];
  constructor(cell = 2) { this.cell = cell; }
  rebuild(bodies: Body[]) {
    this.bodies = bodies; this.grid.clear();
    for (const b of bodies) { const k = key(Math.floor(b.x / this.cell), Math.floor(b.z / this.cell)); const a = this.grid.get(k); if (a) a.push(b); else this.grid.set(k, [b]); }
  }
  near(x: number, z: number, rad: number, fn: (b: Body) => void) {
    const c = this.cell;
    for (let i = Math.floor((x - rad) / c); i <= Math.floor((x + rad) / c); i++) for (let j = Math.floor((z - rad) / c); j <= Math.floor((z + rad) / c); j++) { const a = this.grid.get(key(i, j)); if (a) for (const b of a) fn(b); }
  }
  /** soft push-out: every overlapping pair is moved apart (fixed bodies do not move); returns the number of contacts. Call after rebuild(). */
  separate(strength = 0.6, statics?: Statics): number {
    let n = 0;
    for (const a of this.bodies) {
      this.near(a.x, a.z, a.r * 2.2, (b) => {
        if (b === a || b.id < a.id) return;
        let dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); const min = a.r + b.r; if (d >= min) return;
        if (d < 1e-5) { const t = (a.id * 2.399) % 6.283; dx = Math.cos(t); dz = Math.sin(t); d = 1e-5; } else { dx /= d; dz /= d; }
        const o = (min - d) * strength, wa = a.fixed ? 0 : b.fixed ? 1 : 0.5, wb = b.fixed ? 0 : a.fixed ? 1 : 0.5; n++;
        a.x -= dx * o * wa; a.z -= dz * o * wa; b.x += dx * o * wb; b.z += dz * o * wb;
      });
    }
    if (statics) for (const b of this.bodies) if (!b.ghost) { const p = statics.push(b.x, b.z, b.r); b.x = p.x; b.z = p.z; }
    return n;
  }
  /** steering for a walker: returns a velocity that goes around a body in the way or stops (wait) when it is directly blocked.
   *  Of two walkers meeting head-on the one with the higher id waits. */
  avoid(me: Body, vx: number, vz: number, look = 1.6): { vx: number; vz: number; wait: boolean } {
    const sp = Math.hypot(vx, vz); if (sp < 1e-6) return { vx, vz, wait: false };
    const hx = vx / sp, hz = vz / sp; let ax = 0, az = 0, wait = false;
    this.near(me.x + hx * look * 0.5, me.z + hz * look * 0.5, look * 0.6, (o) => {
      if (o === me) return; const rx = o.x - me.x, rz = o.z - me.z, ahead = rx * hx + rz * hz; if (ahead < 0 || ahead > look) return;
      const lat = -rx * hz + rz * hx, R = me.r + o.r; if (Math.abs(lat) >= R * 1.1) return;
      if (ahead < R + 0.2 && Math.abs(lat) < R * 0.5 && (o.id < me.id || o.fixed)) { wait = true; return; }
      const side = lat === 0 ? (me.id % 2 ? 1 : -1) : Math.sign(lat), w = 1 - ahead / look; ax += side * hz * w * 1.6; az -= side * hx * w * 1.6;
    });
    if (wait) return { vx: 0, vz: 0, wait: true };
    const nx = hx + ax, nz = hz + az, l = Math.hypot(nx, nz) || 1; return { vx: (nx / l) * sp, vz: (nz / l) * sp, wait: false };
  }
}
