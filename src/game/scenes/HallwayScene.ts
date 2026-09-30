import Phaser from "phaser";
import { ATLAS, CHARACTER_SHEETS, type Direction } from "../assets/assetManifest";
import layoutJson from "../data/hall.layout.json";
import { STUDENT_IDS, type HallLayout, type Subject } from "../types";
import { Actor, animKey, createAnims } from "../entities/Actor";
import { directionFromGrid, isoToScreen, screenInputToGrid } from "../systems/IsoMath";
import { VIRTUAL_INPUT } from "../input";

const L = layoutJson as unknown as HallLayout;

/* ---------------------------------------------------------------- clock + schedule (1 in-game minute = 1 real second at x1) */
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

/* ---------------------------------------------------------------- A* on the nav grid (4-neighbour) */
const navOpen = (x: number, y: number) => y >= 0 && x >= 0 && y < L.grid.h && x < L.grid.w && L.nav[y][x] === ".";
function astar(sx: number, sy: number, gx: number, gy: number): { x: number; y: number }[] {
  if ((sx === gx && sy === gy) || !navOpen(gx, gy)) return [];
  const W = L.grid.w, key = (x: number, y: number) => y * W + x, g = new Map<number, number>([[key(sx, sy), 0]]), from = new Map<number, number>();
  const open = [{ x: sx, y: sy, f: 0 }], closed = new Set<number>();
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0], ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue; closed.add(ck);
    if (cur.x === gx && cur.y === gy) { const p: { x: number; y: number }[] = []; let k = ck; while (k !== key(sx, sy)) { p.push({ x: k % W, y: Math.floor(k / W) }); k = from.get(k)!; } return p.reverse(); }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx, ny = cur.y + dy; if (!navOpen(nx, ny)) continue;
      const nk = key(nx, ny), ng = g.get(ck)! + 1; if (g.has(nk) && g.get(nk)! <= ng) continue;
      g.set(nk, ng); from.set(nk, ck); open.push({ x: nx, y: ny, f: ng + Math.abs(nx - gx) + Math.abs(ny - gy) });
    }
  }
  return [];
}
const shuffle = <T,>(a: T[]) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Actor whose sheets only have a walk cycle: standing = first frame of the facing row. */
class HallActor extends Actor {
  play(action: string, dir: Direction = this.facing) {
    this.state = action; this.facing = dir;
    const key = animKey(this.character, action, dir);
    if (!this.sprite.scene.anims.exists(key)) return;
    if (this.sprite.anims.currentAnim?.key !== key || !this.sprite.anims.isPlaying) this.sprite.play(key);
  }
  stand(dir: Direction = this.facing) {
    const sh = CHARACTER_SHEETS.find((s) => s.key === `${this.character}_walk`); if (!sh) return;
    this.facing = dir; this.state = "idle"; this.sprite.anims.stop(); this.sprite.setFrame(Math.max(0, sh.dirs.indexOf(dir)) * sh.frames);
  }
}
interface Pending { delay: number; dest: { x: number; y: number }; hide: boolean; appear?: { x: number; y: number } }
interface Student { id: number; a: HallActor; hidden: boolean; pending: Pending | null; lastDoor: { x: number; y: number }; walking: boolean }

export class HallwayScene extends Phaser.Scene {
  clock = 0; idx = -1; speed = 1; debug = new URLSearchParams(window.location.search).has("debug");
  tint: [number, number, number, number] = [255, 255, 255, 0];
  students: Student[] = []; player!: HallActor; inDoor: string | null = null; players_ready = false;
  private doors: Record<string, Phaser.GameObjects.Image[]> = {};
  private dbg?: Phaser.GameObjects.Graphics;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>; private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  constructor() { super("HallwayScene"); }

  private queueSheet(key: string) { const s = CHARACTER_SHEETS.find((x) => x.key === key); if (s && !this.textures.exists(key)) this.load.spritesheet(key, s.url, { frameWidth: s.fw, frameHeight: s.fh }); }
  preload() {
    this.load.atlas(ATLAS.key, ATLAS.image, ATLAS.data);
    for (const a of ["idle", "walk"]) this.queueSheet(`player_student_${a}`);
    for (const id of STUDENT_IDS) this.queueSheet(`${id}_walk`);
  }

  create() {
    createAnims(this);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,G") as Record<string, Phaser.Input.Keyboard.Key>;
    const b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    for (const p of L.placements) {
      const img = this.add.image(p.x, p.y, ATLAS.key, p.key).setOrigin(p.ox, p.oy).setDepth(p.depth);
      if (p.kind === "door" || p.kind === "sign") { (this.doors[`${p.room}:${p.subject}:${p.kind}`] ??= []).push(img); img.setVisible(false); }
      if (p.depth < 4000) { const r = img.getBounds(); b.x0 = Math.min(b.x0, r.x); b.y0 = Math.min(b.y0, r.y); b.x1 = Math.max(b.x1, r.right); b.y1 = Math.max(b.y1, r.bottom); }
    }
    this.bounds = new Phaser.Geom.Rectangle(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);

    this.students = STUDENT_IDS.map((sid, i) => {
      const a = new HallActor(this, `s${i}`, sid, L.entrance.gx, L.entrance.gy, 0, "walk"); a.speed = rnd(1.9, 2.6); a.sprite.setVisible(false); a.stand("down_left");
      return { id: i, a, hidden: true, pending: null, lastDoor: { x: L.doors[i % 2].tiles[0].x, y: 0 }, walking: false };
    });
    this.player = new HallActor(this, "player", "player_student", L.playerSpawn.gx, L.playerSpawn.gy, 0, "idle"); this.player.speed = 3; this.player.play("idle", "down");
    if (this.debug) this.dbg = this.add.graphics().setDepth(9e5);

    this.applyCamera(); this.scale.on("resize", () => this.applyCamera());
    addEventListener("message", (e) => { const m = e.data; if (m && m.type === "unify:exit") this.placeAtDoor(m.room); });
    this.players_ready = true; (window as any).__hall = this;
  }
  bounds!: Phaser.Geom.Rectangle;

  /* ---------------------------------------------------------------- camera */
  private fitZoom() { const w = this.scale.width, h = this.scale.height, r = this.bounds; return Math.min(w / (r.width + 60), h / (r.height + 60)); }
  overview = false;
  toggleOverview() { this.overview = !this.overview; this.applyCamera(); }
  private applyCamera() {
    const cam = this.cameras.main, fit = this.fitZoom(), narrow = this.scale.width < 700;
    const zoom = this.overview ? fit : Math.max(fit, narrow ? 0.8 : 1.05), follow = zoom > fit * 1.05;
    cam.setZoom(zoom);
    cam.setBounds(this.bounds.x - 120, this.bounds.y - 120, this.bounds.width + 240, this.bounds.height + 240);
    if (follow) cam.startFollow(this.player.sprite, true, 0.09, 0.09); else { cam.stopFollow(); cam.centerOn(this.bounds.centerX, this.bounds.centerY); }
  }

  /* ---------------------------------------------------------------- doors + subjects */
  subjectFor(room: "A" | "B"): Subject { return L.periodSubjects[this.idx < 2 ? "early" : "late"][room]; }
  private refreshDoors() {
    for (const room of ["A", "B"] as const) for (const s of L.subjects) for (const kind of ["door", "sign"]) {
      const on = this.subjectFor(room) === s;
      this.doors[`${room}:${s}:${kind}`]?.forEach((im) => im.setVisible(on));
    }
  }
  placeAtDoor(room: string) {
    const d = L.doors.find((x) => x.room === room) ?? L.doors[0];
    this.player.path = []; this.player.gx = d.approach.gx; this.player.gy = 1.8; this.player.sync(); this.player.stand("down_right"); this.inDoor = d.room;
    this.events.emit("toast", "");
  }

  /* ---------------------------------------------------------------- schedule -> student intents */
  private enterPeriod(i: number) {
    const P = PERIODS[i], spots = shuffle(L.nav.flatMap((row, y) => row.split("").map((c, x) => ({ c, x, y }))).filter((t) => t.c === "." && t.y >= 1)), ent = { x: Math.floor(L.entrance.gx), y: Math.floor(L.entrance.gy) };
    this.refreshDoors();
    this.students.forEach((s, n) => {
      if (P.kind === "class") { const door = L.doors.find((d) => d.room === (((n < 5) !== !!P.swap) ? "A" : "B"))!, t = door.tiles[n % 2]; s.lastDoor = t; s.pending = { delay: rnd(0, 8), dest: t, hide: true }; }
      else if (P.kind === "lunch") s.pending = { delay: rnd(0, 10), dest: spots[n], hide: false, appear: s.hidden ? s.lastDoor : undefined };
      else if (P.kind === "arrive") { s.a.sprite.setVisible(false); s.hidden = true; s.a.path = []; s.pending = { delay: rnd(0, 20), dest: spots[n], hide: false, appear: ent }; }
      else s.pending = { delay: rnd(0, 12), dest: ent, hide: true, appear: s.hidden ? s.lastDoor : undefined };
    });
  }
  private begin(s: Student) {
    const p = s.pending!; s.pending = null;
    if (p.appear) { s.a.gx = p.appear.x + 0.5; s.a.gy = p.appear.y + 0.5; s.a.sync(); s.hidden = false; s.a.sprite.setVisible(true).setAlpha(0); this.tweens.add({ targets: s.a.sprite, alpha: 1, duration: 350 }); }
    const sx = Math.min(L.grid.w - 1, Math.max(0, Math.floor(s.a.gx))), sy = Math.min(L.grid.h - 1, Math.max(0, Math.floor(s.a.gy)));
    const path = astar(sx, sy, p.dest.x, p.dest.y).map((t) => ({ gx: t.x + 0.5, gy: t.y + 0.5 }));
    s.walking = true;
    const done = () => { s.walking = false; if (p.hide) { this.tweens.add({ targets: s.a.sprite, alpha: 0, duration: 300, onComplete: () => { s.hidden = true; s.a.sprite.setVisible(false); } }); } else s.a.stand(); };
    if (!path.length) return done();
    void s.a.walkPath(path).then(done);
  }

  /* ---------------------------------------------------------------- player */
  private blocked(gx: number, gy: number, r = 0.16) {
    if (gx < 0.5 || gx > L.grid.w - 0.5 || gy < 0.35 || gy > L.grid.h - 0.35) return true;
    return L.blocked.some((b) => gx > b.gx - r && gx < b.gx + b.w + r && gy > b.gy - r && gy < b.gy + b.d + r);
  }
  private movePlayer(dt: number) {
    const K = this.keys, C = this.cursors;
    const sx = (C.right.isDown || K.D.isDown ? 1 : 0) - (C.left.isDown || K.A.isDown ? 1 : 0) + VIRTUAL_INPUT.x;
    const sy = (C.down.isDown || K.S.isDown ? 1 : 0) - (C.up.isDown || K.W.isDown ? 1 : 0) + VIRTUAL_INPUT.y;
    const P = this.player;
    if (Math.hypot(sx, sy) > 0.1) {
      const g = screenInputToGrid(sx, sy), len = Math.hypot(g.x, g.y) || 1, dx = (g.x / len) * P.speed * dt, dy = (g.y / len) * P.speed * dt;
      if (!this.blocked(P.gx + dx, P.gy)) P.gx += dx; if (!this.blocked(P.gx, P.gy + dy)) P.gy += dy;
      P.play("walk", directionFromGrid(g.x, g.y));
    } else if (P.state !== "idle") P.play("idle");
    P.sync(dt);
    const d = L.doors.find((q) => P.gx >= q.x0 && P.gx < q.x1 && P.gy < q.trigger);
    if (d && this.inDoor !== d.room) {
      this.inDoor = d.room; const subject = this.subjectFor(d.room);
      if (parent !== window) parent.postMessage({ type: "unify:enter", subject, room: d.room }, "*");
      else this.events.emit("toast", `${subject.toUpperCase()} auditorium: open index.html to go inside`);
    } else if (!d && P.gy > 1.5) this.inDoor = null;
  }

  /* ---------------------------------------------------------------- frame */
  update(_t: number, dtMs: number) {
    const dt = Math.min(0.05, dtMs / 1000), sim = dt * this.speed;
    this.clock += sim; if (this.clock >= DAY) this.clock -= DAY;
    const idx = periodAt(this.clock); if (idx !== this.idx) { this.idx = idx; this.enterPeriod(idx); }
    for (const s of this.students) {
      if (s.pending) { s.pending.delay -= sim; if (s.pending.delay <= 0) this.begin(s); }
      if (!s.hidden) s.a.step(sim, () => 0);
    }
    this.movePlayer(dt);
    const tg = PERIODS[this.idx].tint, k = Math.min(1, dt * 1.5); for (let i = 0; i < 4; i++) this.tint[i] += (tg[i] - this.tint[i]) * k;
    if (Phaser.Input.Keyboard.JustDown(this.keys.G)) this.toggleDebug();
    this.drawDebug();
  }
  toggleDebug() { this.debug = !this.debug; if (this.debug) this.dbg ??= this.add.graphics().setDepth(9e5); else { this.dbg?.clear(); } }
  private drawDebug() {
    if (!this.debug || !this.dbg) return; const g = this.dbg; g.clear().lineStyle(1.5, 0xff5a7a, 0.9);
    for (let y = 0; y < L.grid.h; y++) for (let x = 0; x < L.grid.w; x++) {
      const a = isoToScreen(x, y), b = isoToScreen(x + 1, y), c = isoToScreen(x + 1, y + 1), d = isoToScreen(x, y + 1);
      g.lineStyle(1, L.nav[y][x] === "#" ? 0xff5a7a : 0xffffff, L.nav[y][x] === "#" ? 0.9 : 0.25).strokePoints([a, b, c, d], true);
    }
    g.lineStyle(2, 0x4f91c7, 0.9);
    for (const s of this.students) { if (s.hidden || !s.a.path.length) continue; const pts = [{ gx: s.a.gx, gy: s.a.gy }, ...s.a.path].map((p) => isoToScreen(p.gx, p.gy)); g.strokePoints(pts, false); }
  }
}
