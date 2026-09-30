import * as THREE from "three";
import layoutJson from "../game/data/hall.layout.json";
import type { HallLayout, Subject } from "../game/types";
import { PERIODS, DAY, periodAt, astar, rnd, shuffle } from "./logic";
import { bakeSheet, DIRS, COLS, FW, FH, SCALE, FEET, SKINS, SHIRTS, HAIRS, type Look } from "./characters";
import * as T from "./textures";

const L = layoutJson as unknown as HallLayout;
const HALL_W = 6, HALL_L = 24, WALL_H = 4.2, UNIT = 1.75 / 45;           // one drawing unit of the chibi art in world units
const gridToWorld = (gx: number, gy: number) => new THREE.Vector3(gy - HALL_W / 2, 0, -gx);
const STYLES = ["crop", "pony", "bun", "curly", "bob", "long", "crop", "pony", "curly", "bob"];
const LOCKER_COL = ["#7fb2d6", "#f2a79b", "#9fd0b0", "#f4d488"];
const DOOR_COL: Record<Subject, string> = { math: "#4F91C7", ela: "#88B89A", science: "#8FC9E8", history: "#C98569" };
const DOOR_LABEL: Record<Subject, string> = { math: "MATH", ela: "ELA", science: "SCIENCE", history: "HISTORY" };
export type ViewMode = "close" | "overview" | "first";

interface Person { id: number; look: Look; sprite: THREE.Sprite; mat: THREE.SpriteMaterial; tex: THREE.Texture; blob: THREE.Mesh; pos: THREE.Vector3; dir: number; frame: number; moving: boolean }
interface Stu extends Person { hidden: boolean; path: THREE.Vector3[]; speed: number; pending: null | { delay: number; dest: { x: number; y: number }; hide: boolean; appear?: { x: number; y: number } }; lastDoor: { x: number; y: number }; hideOnArrive: boolean; fade: number }

export class HallScene {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
  clock = 0; idx = -1; speed = 1; view: ViewMode = "close"; tint: [number, number, number, number] = [255, 255, 255, 0];
  students: Stu[] = []; player!: Person; inDoor: string | null = null; onToast: (m: string) => void = () => {};
  keys: Record<string, boolean> = {}; input = { x: 0, y: 0 };
  private doorMats: Record<string, { door: THREE.MeshStandardMaterial; sign: THREE.MeshBasicMaterial }> = {};
  private texCache = new Map<string, THREE.Texture>();
  private camPos = new THREE.Vector3(0, 6, 8); private camLook = new THREE.Vector3(0, 1, -4);
  private last = performance.now(); private t = 0; private blobTex = T.blobTex();

  constructor(private host: HTMLElement) {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(r.domElement); this.scene.background = new THREE.Color("#EADFCB");
    this.buildLights(); this.buildHall(); this.buildPeople();
    addEventListener("resize", () => this.resize()); this.resize();
    addEventListener("keydown", (e) => { this.keys[e.key.toLowerCase()] = true; if (e.key.startsWith("Arrow")) e.preventDefault(); });
    addEventListener("keyup", (e) => { this.keys[e.key.toLowerCase()] = false; });
    addEventListener("message", (e) => { const m = e.data; if (m && m.type === "unify:exit") this.placeAtDoor(m.room); });
    this.setView("close", true); requestAnimationFrame(this.frame);
  }
  resize() { const w = this.host.clientWidth || innerWidth, h = this.host.clientHeight || innerHeight; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.fov = w / h < 0.8 ? 62 : 48; this.camera.updateProjectionMatrix(); }
  private tex<K extends string>(key: K, make: () => THREE.Texture) { let t = this.texCache.get(key); if (!t) { t = make(); this.texCache.set(key, t); } return t; }

  /* ------------------------------------------------------------ lights */
  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xfff6e8, 0xe4d3b4, 2.1));
    const sun = new THREE.DirectionalLight(0xfff0d8, 1.25); sun.position.set(7, 15, 9); sun.target.position.set(0, 0, -11); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const c = sun.shadow.camera; c.left = -16; c.right = 16; c.top = 20; c.bottom = -20; c.near = 1; c.far = 50; sun.shadow.bias = -0.0004; sun.shadow.radius = 5;
    this.scene.add(sun, sun.target);
  }

  /* ------------------------------------------------------------ the hall: floor, walls, lockers, doors, decor */
  private box(w: number, h: number, d: number, mats: THREE.Material | THREE.Material[], x: number, y: number, z: number, outline = true, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; this.scene.add(m);
    if (outline) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x6d5a5f, transparent: true, opacity: 0.55 })); m.add(e); }
    return m;
  }
  private std(map: THREE.Texture | null, color = "#ffffff") { return new THREE.MeshStandardMaterial({ map, color, roughness: 0.95, metalness: 0 }); }
  private plain(color: string) { return new THREE.MeshStandardMaterial({ color, roughness: 1 }); }
  /** flat paper card standing off a wall, with a soft shadow card beneath it (layered look) */
  private card(tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, faceX: 1 | -1 | 0, basic = false) {
    const g = new THREE.Group(); const sh = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.12, h * 1.12), new THREE.MeshBasicMaterial({ map: this.tex("cardsh", () => T.cardShadowTex()), transparent: true, opacity: 0.55, depthWrite: false }));
    sh.position.set(0, -0.05, 0); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic ? new THREE.MeshBasicMaterial({ map: tex, transparent: true }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 1, transparent: true }));
    m.position.z = 0.025; m.receiveShadow = true; g.add(sh, m); g.position.set(x, y, z);
    if (faceX === 1) g.rotation.y = Math.PI / 2; else if (faceX === -1) g.rotation.y = -Math.PI / 2; else g.rotation.y = 0; this.scene.add(g); return m;
  }

  private buildHall() {
    const S = this.scene, midZ = -HALL_L / 2;
    // diorama shadow on the sheet
    const under = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W + 6, HALL_L + 6), new THREE.MeshBasicMaterial({ map: this.tex("dio", () => T.cardShadowTex()), transparent: true, opacity: 0.7, depthWrite: false }));
    under.rotation.x = -Math.PI / 2; under.position.set(0.3, -0.06, midZ - 0.4); S.add(under);
    // floor + runner rug
    const ft = T.floorTex(); ft.repeat.set(HALL_W / 2, HALL_L / 2); const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, HALL_L), this.std(ft)); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, midZ); floor.receiveShadow = true; S.add(floor);
    const rt = T.rugTex(); rt.repeat.set(1, HALL_L / 2); const rug = new THREE.Mesh(new THREE.PlaneGeometry(2, HALL_L - 0.4), this.std(rt)); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.012, midZ); rug.receiveShadow = true; S.add(rug);
    // walls (paper thickness: pale top cap, darker outside)
    const wt = T.wallTex(); wt.repeat.set(HALL_L / 4, 1);
    const cap = this.plain("#F7ECD6"), outer = this.plain("#D8C6A4");
    for (const s of [-1, 1]) {
      const inner = this.std(wt.clone()); (inner.map as THREE.Texture).needsUpdate = true; (inner.map as THREE.Texture).repeat.set(HALL_L / 4, 1); (inner.map as THREE.Texture).wrapS = THREE.RepeatWrapping;
      const mats = s < 0 ? [inner, outer, cap, outer, outer, outer] : [outer, inner, cap, outer, outer, outer];
      this.box(0.3, WALL_H, HALL_L + 0.6, mats, s * (HALL_W / 2 + 0.15), WALL_H / 2, midZ, false);
    }
    const far = this.std(T.farWallTex()); this.box(HALL_W + 0.6, WALL_H, 0.3, [outer, outer, cap, outer, far, outer], 0, WALL_H / 2, -HALL_L - 0.15, false);
    // lockers (left wall), skipping doorways + the alcove
    const doorCols = new Set<number>(); for (const d of L.doors) for (let k = d.x0; k < d.x1; k++) doorCols.add(k);
    for (const b of L.blocked) if (b.kind === "locker") {
      const c = b.gx, z = -(c + 0.5), ci = c % 4, color = LOCKER_COL[ci];
      const front = this.std(this.tex(`lk${ci}-${c % 7}`, () => T.lockerTex(color, c))), side = this.plain(color), top = this.plain("#FFF6E6");
      this.box(0.6, 2.3, 0.94, [front, side, top, side, side, side], -HALL_W / 2 + 0.3, 1.15, z);
    }
    // alcove: bench, fountain, bin (left wall, matches nav blockers)
    this.box(0.62, 0.12, 1.9, this.plain("#F1C887"), -2.62, 0.55, -11.0); this.box(0.5, 0.5, 0.12, this.plain("#9DA7AA"), -2.62, 0.25, -10.2, false); this.box(0.5, 0.5, 0.12, this.plain("#9DA7AA"), -2.62, 0.25, -11.8, false);
    this.box(0.6, 0.06, 0.7, this.plain("#F28F7E"), -2.6, 0.64, -10.6); this.box(0.6, 0.06, 0.7, this.plain("#F28F7E"), -2.6, 0.64, -11.45);
    this.box(0.5, 0.95, 0.55, this.plain("#DDE2E3"), -2.72, 0.48, -12.45); this.box(0.56, 0.12, 0.62, this.plain("#8FC9E8"), -2.7, 1.0, -12.45);
    this.box(0.45, 0.7, 0.45, this.plain("#4F91C7"), -2.75, 0.35, -13.3); this.box(0.5, 0.1, 0.5, this.plain("#88B89A"), -2.75, 0.75, -13.3);
    // wall decor above the alcove and along the right wall
    this.card(this.tex("board", () => T.boardTex()), 2.0, 1.35, -2.97, 2.05, -10.8, 1); this.card(this.tex("trophy", () => T.trophyTex()), 1.4, 1.3, -2.97, 2.05, -13.0, 1);
    this.card(this.tex("clock", () => T.clockTex()), 0.9, 0.9, 2.97, 3.05, -20.5, -1);
    [-2, -6, -10.5, -15, -19.5, -23].forEach((z, i) => this.card(this.tex("win", () => T.windowTex()), 1.5, 1.9, 2.97, 2.2, z, -1));
    [-4, -8.2, -12.5, -17, -21.5].forEach((z, i) => this.card(this.tex(`po${i}`, () => T.posterTex(i)), 1.0, 1.25, 2.97, 1.0, z, -1));
    this.card(this.tex("board", () => T.boardTex()), 2.2, 1.5, 2.97, 1.0, -6, -1);
    // doorways (left wall) with subject doors + sign plaques that follow the period
    for (const d of L.doors) {
      const z = -((d.x0 + d.x1) / 2), room = d.room;
      this.box(0.18, 3.5, 2.3, this.plain("#9A653D"), -2.93, 1.75, z, true);
      const dm = new THREE.MeshStandardMaterial({ map: T.doorTex("#4F91C7"), roughness: 0.95 }); const door = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 3.15), dm); door.rotation.y = Math.PI / 2; door.position.set(-2.83, 1.6, z); door.receiveShadow = true; S.add(door);
      const sm = new THREE.MeshBasicMaterial({ map: T.signTex("MATH", "#4F91C7"), transparent: true }); const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), sm); sign.rotation.y = Math.PI / 2; sign.position.set(-2.82, 3.78, z); S.add(sign);
      this.doorMats[room] = { door: dm, sign: sm };
    }
    // plants + hanging paper lanterns + bunting
    for (const b of L.blocked) if (b.kind === "plant") this.plant(b.gy + b.d / 2 - HALL_W / 2, -(b.gx + b.w / 2));
    [[-1.8, 3.65, -4, "#F8D977"], [1.8, 3.65, -10, "#F28F7E"], [-1.8, 3.65, -16, "#8FC9E8"], [1.8, 3.65, -22, "#A9DCC0"]].forEach(([x, y, z, col]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), new THREE.MeshStandardMaterial({ map: T.lanternTex(col as string), emissive: new THREE.Color(col as string), emissiveIntensity: 0.28, roughness: 1 })); m.scale.y = 1.2; m.position.set(x as number, y as number, z as number); m.castShadow = true; S.add(m);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 4), this.plain("#9A653D")); str.position.set(x as number, (y as number) + 0.9, z as number); S.add(str);
    });
    this.bunting(-HALL_W / 2 + 0.05, 3.85, 1); this.bunting(HALL_W / 2 - 0.05, 3.85, -1);
  }
  private plant(x: number, z: number) {
    const g = new THREE.Group(); const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.42, 14), this.plain("#F28F7E")); pot.position.y = 0.21; pot.castShadow = true; g.add(pot);
    const cols = ["#5E9C72", "#88B89A", "#3F7655", "#A9DCC0"];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.9 + (i % 3) * 0.2, 4), this.plain(cols[i % 4])); leaf.position.set(Math.cos(a) * 0.16, 0.85, Math.sin(a) * 0.16); leaf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); leaf.castShadow = true; g.add(leaf); }
    g.position.set(x, 0, z); this.scene.add(g);
  }
  private bunting(x: number, y: number, side: number) {
    const cols = ["#F28F7E", "#EAB94E", "#8FC9E8", "#A9DCC0", "#B8A8DA", "#EAA5B2"], n = 44;
    for (let i = 0; i < n; i++) {
      const z = -0.5 - (i / n) * (HALL_L - 1), sag = Math.sin((i / n) * Math.PI * 6) * 0.0 - 0.05;
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.16, 0, 0, 0.16, 0, -0.42, 0], 3)); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: cols[i % 6], side: THREE.DoubleSide })); m.position.set(x + side * 0.02, y + sag, z); this.scene.add(m);
    }
  }

  /* ------------------------------------------------------------ people (billboarded chibi sprites baked from the vector art) */
  private makePerson(id: number, look: Look, h = 1): Person {
    const tex = new THREE.CanvasTexture(bakeSheet(look)); tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.set(1 / COLS, 1 / DIRS.length); tex.anisotropy = 4;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true }); const sprite = new THREE.Sprite(mat);
    sprite.center.set(0.5, FEET / FH); sprite.scale.set(((FW / SCALE) * UNIT) * h, ((FH / SCALE) * UNIT) * h, 1); this.scene.add(sprite);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.6), new THREE.MeshBasicMaterial({ map: this.blobTex, transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; this.scene.add(blob);
    return { id, look, sprite, mat, tex, blob, pos: new THREE.Vector3(), dir: 0, frame: 0, moving: false };
  }
  private buildPeople() {
    this.students = Array.from({ length: 10 }, (_, i) => {
      const p = this.makePerson(i, { id: i, skin: SKINS[(i * 2) % 5], hair: HAIRS[(i * 5) % 6], style: STYLES[i], shirt: SHIRTS[i] });
      const e = gridToWorld(L.entrance.gx, L.entrance.gy); p.pos.copy(e); p.sprite.visible = false; p.blob.visible = false;
      return Object.assign(p, { hidden: true, path: [], speed: rnd(1.5, 2.1), pending: null, lastDoor: { x: L.doors[i % 2].tiles[0].x, y: 0 }, hideOnArrive: false, fade: 1 }) as Stu;
    });
    this.player = this.makePerson(11, { id: 11, skin: "#f0c29b", hair: "#5a3a35", style: "bun", shirt: "#d9564a", glasses: true, tag: true, pack: "#8a5f6a" }, 1.08);
    this.player.pos.copy(gridToWorld(L.playerSpawn.gx, L.playerSpawn.gy));
  }
  private placePerson(p: Person) {
    p.sprite.position.copy(p.pos); p.blob.position.set(p.pos.x, 0.02, p.pos.z);
    const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
    p.sprite.userData.fwd = fwd;
  }
  private setFrame(p: Person, dirIdx: number, frame: number) { p.tex.offset.set(frame / COLS, 1 - (dirIdx + 1) / DIRS.length); }
  /** choose down/up/left/right relative to the camera from a world-space velocity */
  private dirFrom(v: THREE.Vector3, fwd: THREE.Vector3, keep: number) {
    const a = v.x * fwd.x + v.z * fwd.z, b = v.x * -fwd.z + v.z * fwd.x; if (Math.hypot(a, b) < 1e-3) return keep;
    return Math.abs(a) >= Math.abs(b) ? (a > 0 ? 1 : 0) : b > 0 ? 3 : 2;
  }

  /* ------------------------------------------------------------ doors + subjects */
  subjectFor(room: "A" | "B"): Subject { return L.periodSubjects[this.idx < 2 ? "early" : "late"][room]; }
  private refreshDoors() {
    for (const room of ["A", "B"] as const) {
      const s = this.subjectFor(room), m = this.doorMats[room]; if (!m) continue;
      m.door.map = this.tex(`door-${s}`, () => T.doorTex(DOOR_COL[s])); m.sign.map = this.tex(`sign-${s}`, () => T.signTex(DOOR_LABEL[s], DOOR_COL[s], s === "science" ? "#3b3340" : "#FFF9F0")); m.door.needsUpdate = m.sign.needsUpdate = true;
    }
  }
  placeAtDoor(room: string) {
    const d = L.doors.find((x) => x.room === room) ?? L.doors[0]; this.player.pos.copy(gridToWorld(1.8, d.approach.gx)); this.player.pos.copy(gridToWorld(d.x0 + 1, 1.8)); this.inDoor = d.room; this.onToast("");
  }

  /* ------------------------------------------------------------ schedule -> student intents */
  private enterPeriod(i: number) {
    const P = PERIODS[i], spots = shuffle(L.nav.flatMap((row, y) => row.split("").map((c, x) => ({ c, x, y }))).filter((t) => t.c === "." && t.y >= 1)), ent = { x: Math.floor(L.entrance.gx), y: Math.floor(L.entrance.gy) };
    this.refreshDoors();
    this.students.forEach((s, n) => {
      if (P.kind === "class") { const door = L.doors.find((d) => d.room === (((n < 5) !== !!P.swap) ? "A" : "B"))!, t = door.tiles[n % 2]; s.lastDoor = t; s.pending = { delay: rnd(0, 8), dest: t, hide: true }; }
      else if (P.kind === "lunch") s.pending = { delay: rnd(0, 10), dest: spots[n], hide: false, appear: s.hidden ? s.lastDoor : undefined };
      else if (P.kind === "arrive") { s.hidden = true; s.sprite.visible = false; s.blob.visible = false; s.path = []; s.pending = { delay: rnd(0, 20), dest: spots[n], hide: false, appear: ent }; }
      else s.pending = { delay: rnd(0, 12), dest: ent, hide: true, appear: s.hidden ? s.lastDoor : undefined };
    });
  }
  private begin(s: Stu) {
    const p = s.pending!; s.pending = null;
    if (p.appear) { s.pos.copy(gridToWorld(p.appear.x + 0.5, p.appear.y + 0.5)); s.hidden = false; s.sprite.visible = true; s.blob.visible = true; s.fade = 0; s.mat.opacity = 0; }
    const sx = Math.min(L.grid.w - 1, Math.max(0, Math.floor(-s.pos.z))), sy = Math.min(L.grid.h - 1, Math.max(0, Math.floor(s.pos.x + HALL_W / 2)));
    s.path = astar(L.nav, sx, sy, p.dest.x, p.dest.y).map((t) => gridToWorld(t.x + 0.5, t.y + 0.5)); s.hideOnArrive = p.hide; s.moving = s.path.length > 0;
    if (!s.path.length && p.hide) { s.hidden = true; s.sprite.visible = false; s.blob.visible = false; }
  }

  /* ------------------------------------------------------------ player + camera */
  private blocked(gx: number, gy: number, r = 0.16) {
    if (gx < 0.5 || gx > L.grid.w - 0.5 || gy < 0.35 || gy > L.grid.h - 0.35) return true;
    return L.blocked.some((b) => gx > b.gx - r && gx < b.gx + b.w + r && gy > b.gy - r && gy < b.gy + b.d + r);
  }
  private movePlayer(dt: number, fwd: THREE.Vector3) {
    const K = this.keys, ix = (K.d || K.arrowright ? 1 : 0) - (K.a || K.arrowleft ? 1 : 0) + this.input.x, iz = (K.s || K.arrowdown ? 1 : 0) - (K.w || K.arrowup ? 1 : 0) + this.input.y;
    const P = this.player, v = new THREE.Vector3(ix, 0, iz); P.moving = v.length() > 0.1;
    if (P.moving) {
      v.normalize().multiplyScalar(3 * dt); const gx = -P.pos.z, gy = P.pos.x + HALL_W / 2;
      if (!this.blocked(gx - v.z, gy)) P.pos.z += v.z; if (!this.blocked(-P.pos.z, gy + v.x)) P.pos.x += v.x;
      P.dir = this.dirFrom(v, fwd, P.dir); P.frame = 1 + (Math.floor(this.t * 9) % 4);
    } else P.frame = 0;
    const gx = -P.pos.z, gy = P.pos.x + HALL_W / 2, d = L.doors.find((q) => gx >= q.x0 && gx < q.x1 && gy < q.trigger);
    if (d && this.inDoor !== d.room) {
      this.inDoor = d.room; const subject = this.subjectFor(d.room);
      if (parent !== window) parent.postMessage({ type: "unify:enter", subject, room: d.room }, "*"); else this.onToast(`${subject.toUpperCase()} auditorium: open index.html to go inside`);
    } else if (!d && gy > 1.5) this.inDoor = null;
  }
  setView(v: ViewMode, instant = false) { this.view = v; if (instant) this.updateCamera(1, true); }
  cycleView() { this.setView(this.view === "close" ? "overview" : this.view === "overview" ? "first" : "close"); return this.view; }
  private updateCamera(dt: number, snap = false) {
    const P = this.player.pos; let pos: THREE.Vector3, look: THREE.Vector3;
    if (this.view === "close") { pos = new THREE.Vector3(P.x * 0.55, 5.4, P.z + 7.2); look = new THREE.Vector3(P.x * 0.75, 1.1, P.z - 3.4); }
    else if (this.view === "overview") { pos = new THREE.Vector3(0, 15.5, 6.5); look = new THREE.Vector3(0, 0, -12); }
    else { pos = new THREE.Vector3(P.x, 1.55, P.z + 0.05); look = new THREE.Vector3(P.x, 1.5, P.z - 6); }
    const k = snap ? 1 : Math.min(1, dt * 4.5); this.camPos.lerp(pos, k); this.camLook.lerp(look, k); this.camera.position.copy(this.camPos); this.camera.lookAt(this.camLook);
  }

  /* ------------------------------------------------------------ frame */
  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt; const sim = dt * this.speed;
    this.clock += sim; if (this.clock >= DAY) this.clock -= DAY;
    const idx = periodAt(this.clock); if (idx !== this.idx) { this.idx = idx; this.enterPeriod(idx); }
    const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
    for (const s of this.students) {
      if (s.pending) { s.pending.delay -= sim; if (s.pending.delay <= 0) this.begin(s); }
      if (s.hidden) continue;
      if (s.fade < 1) { s.fade = Math.min(1, s.fade + sim * 3); s.mat.opacity = s.fade; }
      if (s.path.length) {
        const tgt = s.path[0], d = tgt.clone().sub(s.pos); d.y = 0; const len = d.length(), step = s.speed * sim;
        if (len <= step) { s.pos.copy(tgt); s.path.shift(); } else { d.normalize(); s.pos.addScaledVector(d, step); s.dir = this.dirFrom(d, fwd, s.dir); }
        s.moving = true; s.frame = 1 + (Math.floor((this.t * s.speed * 4.2)) % 4);
        if (!s.path.length && s.hideOnArrive) { s.hidden = true; s.sprite.visible = false; s.blob.visible = false; s.moving = false; }
      } else { s.moving = false; s.frame = 0; }
    }
    this.movePlayer(dt, fwd);
    this.updateCamera(dt);
    this.player.sprite.visible = this.view !== "first"; this.player.blob.visible = this.view !== "first";
    const fwd2 = new THREE.Vector3(); this.camera.getWorldDirection(fwd2); fwd2.y = 0; fwd2.normalize();
    for (const p of [...this.students, this.player]) { if ((p as Stu).hidden) continue; p.sprite.position.copy(p.pos); if (this.view === "first" && p !== this.player) { const near = p.pos.distanceTo(this.camera.position) < 1.1; p.sprite.visible = !near; p.blob.visible = !near; } else if (p !== this.player) { p.sprite.visible = true; p.blob.visible = true; } p.blob.position.set(p.pos.x, 0.02, p.pos.z); this.setFrame(p, p.dir, p.frame); }
    const tg = PERIODS[this.idx].tint, k = Math.min(1, dt * 1.5); for (let i = 0; i < 4; i++) this.tint[i] += (tg[i] - this.tint[i]) * k;
    this.renderer.render(this.scene, this.camera); requestAnimationFrame(this.frame);
  };
}
