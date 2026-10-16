import { Events } from "../game/events";
import * as THREE from "three";
import { Beam } from "../shared/beam";
import { dprCap, shadowSize, vignette, rimLight } from "../shared/polish";
import { PERIODS, DAY, DAY_START, periodAt, astar, rnd, shuffle } from "./logic";
import { bakeSheet, DIRS, COLS, FW, FH, SCALE, FEET, SKINS, SHIRTS, HAIRS, AGE_SCALE, type Age, type Look } from "./characters";
import { SUBJECTS, W, H, WALL_H, LOCK_D, BLOCKS, DOORS, NEWS, OPEN, LOCKERS, PROPS, PLANTS, ENTRANCE, OUTSIDE, NAV, BLOCKED, hit, solidAt, outsideTrees, type Subject, type Room, type Rect, type Face } from "./campus";
import { Statics, Crowd, type Body } from "../shared/collide";
import { DoorState } from "../shared/doors";
import { buildForest, singleTree, tickTrees } from "../shared/trees";
import { makePlant } from "../shared/plants";
import { peekCanvas, type PeekKind } from "./peek";
import * as T from "./textures";
import { ROSTER, STAFF, HALL_COUNT, type NpcDef } from "./roster";
import { drawBoard } from "../game/timesui";
import { Social } from "./social";
import { drawPicFinal, picsFor, picTitle } from "../game/wallart";
import { newsItems, newsIsLive, loadNews, onNews } from "../game/newstv";
import { Progress } from "../game/progress";
import { CURRICULUM } from "../class3d/curriculum";
import { toLook, type AvatarSpec } from "./avatar";
import { Mood, Gfx } from "./mood";
import { buildHallDetails } from "./hallDetails";
import { createNewsTV } from "../news/tv";
import { isPixar } from "../shared/look";
import { PixarHall } from "./pixarHall";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ACTIONS, POSE_KEYS, POSE_IX, GAITS, GAIT_BY_PERSONALITY, FIDGETS, bakeActions, frameAt } from "./actions";

import { INTERIOR_SCALE as IS, CHAR_K, PROP_H, scaleScene } from "../shared/scale";
const DR = PROP_H.hallDoor;   // door height (design units)
const UNIT = 1.75 / 45;                                              // one drawing unit of the chibi art in world units
const g2w = (gx: number, gy: number) => new THREE.Vector3(gx - W / 2, 0, gy - H / 2);
const STYLES = ["crop", "pony", "bun", "curly", "bob", "long", "crop", "pony", "curly", "bob"];
const LOCKER_COL = ["#7fb2d6", "#f2a79b", "#9fd0b0", "#f4d488", "#b8a8da", "#f6b294", "#8fc9c4", "#e9a0c0"];
const SUBJ_COL: Record<Subject, string> = { math: "#4F91C7", ela: "#88B89A", science: "#8FC9E8", history: "#C98569", careers: "#E8A33D", life: "#7CB6A0" };
const SUBJ_LABEL: Record<Subject, string> = { math: "MATH", ela: "ELA", science: "SCIENCE", history: "HISTORY", careers: "CAREERS", life: "LIFE" };
/** grade bands by student index: K-2 (smallest) up to high school; adults (staff) are the tallest */
const AGES: Age[] = ["k2", "g35", "g68", "hs", "g35", "g68", "k2", "hs", "g68", "g35"];
export const AGE_LABEL: Record<Age, string> = { adult: "Staff", hs: "High school", g68: "Grades 6-8", g35: "Grades 3-5", k2: "Grades K-2" };
const hash = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
export type ViewMode = "close" | "overview" | "first";
/** destinations offered by the "Go to" menu */
export const GOTO = [
  { key: "math", label: "Math", color: SUBJ_COL.math }, { key: "ela", label: "ELA", color: SUBJ_COL.ela },
  { key: "science", label: "Science", color: SUBJ_COL.science }, { key: "history", label: "History", color: SUBJ_COL.history }, { key: "careers", label: "CarryingCareers", color: SUBJ_COL.careers }, { key: "life", label: "Life Lessons", color: SUBJ_COL.life },
  { key: "news", label: "Auditorium (stairs down)", color: "#8E7CC3" }, { key: "open", label: "The Open Door (parent classes)", color: "#E8A33D" },
  { key: "board", label: "Class-times board", color: "#C9A36B" }, { key: "plaza", label: "Plaza fountain", color: "#EAB94E" }, { key: "entrance", label: "Main entrance", color: "#F28F7E" },
];

export interface Person { speaking?: boolean; actTex?: THREE.Texture; act?: { name: string; t: number; auto?: boolean } | null; gait?: string; baseScale?: THREE.Vector3; fidgetT?: number; sitTex?: THREE.Texture; def?: NpcDef; talking?: boolean; id: number; look: Look; sprite: THREE.Sprite; mat: THREE.SpriteMaterial; tex: THREE.Texture; blob: THREE.Mesh; pos: THREE.Vector3; dir: number; frame: number; moving: boolean }
/** a student passing through a door: wait at the approach until the door is open and free, then walk the `via` points (ghost = through the wall line), then hide or continue */
export interface Pass { door: HallDoor; via: THREE.Vector3[]; stage: 0 | 1; hide: boolean; ghost: boolean; done?: () => void }
export interface Stu extends Person { hidden: boolean; path: THREE.Vector3[]; speed: number; pending: null | { delay: number; dest: { x: number; y: number }; hide: boolean; mode?: "enter" | "exit" | "bus-in" | "bus-out"; door?: HallDoor }; lastDoor: { x: number; y: number }; hideOnArrive: boolean; fade: number; pass: Pass | null; ghost: boolean; waitT: number; busTrip: boolean; lastDoorRec: HallDoor | null }
/** a hinged door: one or two leaves that swing about a hinge; people only pass once `st.ready` */
export interface HallDoor { id: string; room: Room | "entrance"; st: DoorState; leaves: { g: THREE.Group; sgn: number }[]; x: number; z: number; nx: number; nz: number; occ: Set<number>; approach: THREE.Vector3; thr: THREE.Vector3; inside: THREE.Vector3; swing: number; colId: number | null; title: string; kind: PeekKind | null; accent: string; out: THREE.Vector3 | null; cap: number }
interface Occluder { mats: THREE.Material[]; box: THREE.Box3; o: number }

export class HallScene {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(48, 1, 0.1, 260 * IS);
  clock = 0; idx = -1; speed = 1; view: ViewMode = "close"; tint: [number, number, number, number] = [255, 255, 255, 0];
  students: Stu[] = []; player!: Person; monitor!: Person; duty: Person[] = []; inDoor: Room | null = null; onToast: (m: string) => void = () => {};
  keys: Record<string, boolean> = {}; input = { x: 0, y: 0 }; rotate = 0; inputLocked = false;
  /** per-frame hooks (dt = real seconds, sim = simulated seconds) and tap handling for the social layer */
  onTick: ((dt: number, sim: number) => void)[] = []; onTap: (p: Person | null) => void = () => {}; onPic: (pid: string, title: string, subject: string) => void = () => {}; onTV: () => void = () => {}; hallPics: THREE.Mesh[] = []; tvScreen: THREE.Mesh | null = null;
  /** Chat Chow seats (stools at the plaza tables): tap one to sit; the player sits there when idle */
  seats: { pos: THREE.Vector3; ctr: THREE.Vector3; mesh: THREE.Mesh }[] = []; sitting: number | null = null; private pendingSeat: number | null = null;
  /** scripted walking (arrival from the bus, walking in) that ignores walls and input */
  cine: { pts: THREE.Vector3[]; done?: () => void; speed: number; gate?: { door: HallDoor; left: number }; hideWait?: boolean } | null = null; bus: THREE.Group | null = null; private busState: { t: number; mode: "idle" | "in" | "wait" | "out"; from: number; to: number; arm: THREE.Mesh; door: THREE.Mesh } | null = null; onBusStopped: () => void = () => {};
  yaw = 0; pitch = 0.62; zoom = 1; fpitch = 0; navLabel = "";
  private nav: { pts: THREE.Vector3[]; label: string } | null = null;
  private walkers: { p: Person; stops: number[][]; path: THREE.Vector3[]; leg: number; speed: number; waitT: number }[] = []; teacher!: Person;
  open: { x: number; y: number }[] = [];
  private occl: Occluder[] = []; private sun!: THREE.DirectionalLight; private hemi!: THREE.HemisphereLight; private tintT = 9; private shadowR = 0;
  private texCache = new Map<string, THREE.Texture>(); private beam!: Beam;
  /** Pixar edition only (null in the normal build) */
  private px: PixarHall | null = null; private playerSpec: AvatarSpec = Social.profile.avatar; private floorMesh: THREE.Mesh | null = null; private lockMats: THREE.Material[] = [];
  private camPos = new THREE.Vector3(0, 6, 8); private camLook = new THREE.Vector3(0, 1, -4);
  private last = performance.now(); private t = 0; private blobTex = T.blobTex();

  constructor(public host: HTMLElement) {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    r.setPixelRatio(dprCap()); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.outputColorSpace = THREE.SRGBColorSpace;
    scaleScene(this.scene); host.appendChild(r.domElement); this.scene.background = new THREE.Color("#EADFCB"); this.scene.fog = new THREE.Fog("#EADFCB", 80 * IS, 190 * IS);
    this.reachable(); this.buildLights(); this.buildCampus(); this.buildDetails(); this.buildOutside(); this.buildRoad(); this.buildBus(); this.buildPeople();
    if (this.px) this.px.finish({ floor: this.floorMesh!, lockers: this.lockMats, winSpots: this.winSpots });
    addEventListener("resize", () => this.resize()); this.resize();
    addEventListener("keydown", (e) => { if ((e.target as HTMLElement)?.tagName === "INPUT") return; this.keys[e.key.toLowerCase()] = true; if (e.key.startsWith("Arrow")) e.preventDefault(); });
    addEventListener("keyup", (e) => { this.keys[e.key.toLowerCase()] = false; });
    addEventListener("blur", () => { this.keys = {}; });
    addEventListener("message", (e) => { const m = e.data; if (m && m.type === "unify:exit") this.placeAtDoor(m.room); });
    this.bindPointer(r.domElement);
    this.setView("close", true); requestAnimationFrame(this.frame);
  }
  resize() { const w = this.host.clientWidth || innerWidth, h = this.host.clientHeight || innerHeight; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.fov = w / h < 0.8 ? 62 : 48; this.camera.updateProjectionMatrix(); this.px?.resize(w, h); }
  private tex(key: string, make: () => THREE.Texture) { let t = this.texCache.get(key); if (!t) { t = make(); this.texCache.set(key, t); } return t; }
  /** shared texture with its own repeat count (the canvas is shared, only the sampler differs) */
  private rep(key: string, make: () => THREE.Texture, rx: number, ry = 1) {
    const k = `${key}@${rx.toFixed(2)}x${ry.toFixed(2)}`; let t = this.texCache.get(k);
    if (!t) { t = this.tex(key, make).clone(); t.repeat.set(rx, ry); t.needsUpdate = true; this.texCache.set(k, t); } return t;
  }

  /* ------------------------------------------------------------ orbit input: drag, wheel, Q/E, buttons */
  private bindPointer(el: HTMLElement) {
    let down = false, px = 0, py = 0, sx = 0, sy = 0, st = 0;
    el.addEventListener("pointerdown", (e) => { down = true; px = sx = e.clientX; py = sy = e.clientY; st = performance.now(); el.setPointerCapture(e.pointerId); });
    el.addEventListener("pointermove", (e) => {
      if (!down) return; const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
      this.yaw -= dx * 0.0065;
      if (this.view === "first") this.fpitch = Math.max(-0.6, Math.min(0.6, this.fpitch - dy * 0.004)); else this.pitch = Math.max(0.2, Math.min(1.3, this.pitch + dy * 0.004));
    });
    el.addEventListener("pointerup", (e) => { const was = down; down = false; if (was && Math.hypot(e.clientX - sx, e.clientY - sy) < 7 && performance.now() - st < 500) this.handleTap(e.clientX, e.clientY); });
    el.addEventListener("pointercancel", () => { down = false; });
    el.addEventListener("wheel", (e) => { e.preventDefault(); this.zoom = Math.max(0.45, Math.min(1.6, this.zoom * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
  }

  /* ------------------------------------------------------------ lights */
  private buildLights() {
    const hemi = this.hemi = new THREE.HemisphereLight(0xfff6e8, 0xe4d3b4, 1.85); this.scene.add(hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xfff0d8, 1.6); sun.castShadow = true;
    sun.shadow.mapSize.set(shadowSize(2048), shadowSize(2048)); sun.shadow.camera.near = 1; sun.shadow.camera.far = 70 * IS; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 5;
    this.scene.add(sun, sun.target);
    if (isPixar()) this.px = new PixarHall(this.renderer, this.scene, this.camera, sun, hemi);   // golden key, teal fill, coloured rims, haze and post stack (lights follow Mood themselves)
    else { Mood.rig({ hemi, sun, bg: this.scene.background as THREE.Color, fog: this.scene.fog as THREE.Fog });
      rimLight(this.scene, 0.5); vignette(this.host, 0.24); }   // cool back light + soft screen-edge darkening
    this.beam = new Beam(this.scene, Social.profile.avatar.shirt);   // light pillar over the player
  }

  /* ------------------------------------------------------------ building blocks */
  private std(map: THREE.Texture | null, color = "#ffffff") { return new THREE.MeshStandardMaterial({ map, color, roughness: 0.95, metalness: 0 }); }
  private plain(color: string) { return new THREE.MeshStandardMaterial({ color, roughness: 1 }); }
  private box(w: number, h: number, d: number, mats: THREE.Material | THREE.Material[], x: number, y: number, z: number, o: { outline?: boolean; occlude?: boolean; shadow?: boolean } = {}) {
    const { outline = !this.px, occlude = false, shadow = true } = o;
    if (occlude) mats = (Array.isArray(mats) ? mats : [mats]).map((m) => m.clone());       // own materials so each can fade alone
    const m = new THREE.Mesh(this.px ? new RoundedBoxGeometry(w, h, d, 2, Math.min(0.08, w / 4, h / 4, d / 4)) : new THREE.BoxGeometry(w, h, d), mats); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; this.scene.add(m);
    if (outline) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x6d5a5f, transparent: true, opacity: 0.55 })));
    if (occlude) this.occl.push({ mats: Array.isArray(mats) ? mats : [mats], box: new THREE.Box3().setFromCenterAndSize(m.position, new THREE.Vector3(w + 0.05, h, d + 0.05)), o: 1 });
    return m;
  }
  /** flat paper card standing off a wall (rotY 0 faces +z), with a soft shadow card beneath */
  private card(tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, rotY: number, basic = false) {
    const g = new THREE.Group(), sh = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.12, h * 1.12), new THREE.MeshBasicMaterial({ map: this.tex("cardsh", () => T.cardShadowTex()), transparent: true, opacity: 0.55, depthWrite: false }));
    sh.position.set(0, -0.05, 0); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic ? new THREE.MeshBasicMaterial({ map: tex, transparent: true }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 1, transparent: true }));
    m.position.z = 0.025; m.receiveShadow = true; g.add(sh, m); g.position.set(x, y, z); g.rotation.y = rotY; this.scene.add(g); return m;
  }
  private flat(tex: THREE.Texture, w: number, d: number, x: number, z: number, y = 0.012, rotY = 0) {
    const geo = new THREE.PlaneGeometry(w, d); geo.rotateX(-Math.PI / 2); if (rotY) geo.rotateY(rotY);
    const m = new THREE.Mesh(geo, this.std(tex)); m.position.set(x, y, z); m.receiveShadow = true; this.scene.add(m); return m;
  }
  private winSpots: { x: number; y: number; z: number; rot: number }[] = [];
  /** a window card; its glass glows warm at night (Mood) */
  private win(x: number, y: number, z: number, rot: number) { this.winSpots.push({ x, y, z, rot }); const m = this.card(this.tex("win", () => T.windowTex()), 1.5, 1.9, x, y, z, rot); Mood.window(m.material as THREE.MeshStandardMaterial); return m; }
  private rotOf(f: Face) { return f === "S" ? 0 : f === "N" ? Math.PI : f === "E" ? Math.PI / 2 : -Math.PI / 2; }
  /** world position on the outside of a rect's face, `t` along it (0..1) and `off` away from it */
  private onFace(r: Rect, f: Face, t: number, off: number) {
    if (f === "S") return { x: r.x + r.w * t - W / 2, z: r.y + r.h - H / 2 + off };
    if (f === "N") return { x: r.x + r.w * t - W / 2, z: r.y - H / 2 - off };
    if (f === "E") return { x: r.x + r.w - W / 2 + off, z: r.y + r.h * t - H / 2 };
    return { x: r.x - W / 2 - off, z: r.y + r.h * t - H / 2 };
  }

  /* ------------------------------------------------------------ the campus: floors, outer walls, blocks, lockers, doors, plaza */
  private buildCampus() {
    const S = this.scene, cap = this.plain("#F7ECD6"), outer = this.plain("#D8C6A4");
    // soft diorama shadow on the ground
    const under = new THREE.Mesh(new THREE.PlaneGeometry(W + 7, H + 7), new THREE.MeshBasicMaterial({ map: this.tex("dio", () => T.cardShadowTex()), transparent: true, opacity: 0.7, depthWrite: false }));
    under.rotation.x = -Math.PI / 2; under.position.set(0.4, -0.02, 0.4); S.add(under);
    // floors: blue hall tile everywhere, warm paving for the plaza band and the central atrium, runner rugs around the ring
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), Mood.tinted(this.std(this.rep("floor", () => T.floorTex(), W / 2, H / 2)), "floor", 1)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; S.add(floor); this.floorMesh = floor;
    this.flat(this.rep("stoneA", () => T.stoneTex(), (W - 10) / 4, 10 / 4), W - 10, 10, 0, 0, 0.012);
    this.flat(this.rep("stoneB", () => T.stoneTex(), 14 / 4, (H - 10) / 4), 14, H - 10, 0, 0, 0.012);
    const rug = (len: number, cx: number, cz: number, horiz: boolean) => this.flat(this.rep("rug", () => T.rugTex(), 1, len / 4), 2, len, cx, cz, 0.014, horiz ? Math.PI / 2 : 0);
    rug(W - 4, 0, -H / 2 + 2.5, true); rug(H - 4, -W / 2 + 2.5, 0, false); rug(H - 4, W / 2 - 2.5, 0, false);
    rug((W - 8) / 2 - 1, -W / 4 - 2.5, H / 2 - 2.5, true); rug((W - 8) / 2 - 1, W / 4 + 2.5, H / 2 - 2.5, true);

    // outer walls (paper thickness: pale cap, darker outside); the south wall has the entrance gap with a lintel + banner
    const wall = (len: number, cx: number, cz: number, horiz: boolean, innerIdx: number) => {
      const inner = Mood.tinted(this.std(this.rep("wall", () => T.wallTex(), len / 4)), "wash", 1), mats = [outer, outer, cap, outer, outer, outer]; mats[innerIdx] = inner;
      this.box(horiz ? len : 0.3, WALL_H, horiz ? 0.3 : len, mats, cx, WALL_H / 2, cz, { outline: false, occlude: true });
    };
    wall(W + 0.6, 0, -H / 2 - 0.15, true, 4); wall(H, -W / 2 - 0.15, 0, false, 0); wall(H, W / 2 + 0.15, 0, false, 1);
    const g0 = ENTRANCE.gap.x0 - W / 2, g1 = ENTRANCE.gap.x1 - W / 2, sz = H / 2 + 0.15;
    wall(g0 + W / 2 + 0.3, (-W / 2 - 0.3 + g0) / 2, sz, true, 5); wall(W / 2 + 0.3 - g1, (g1 + W / 2 + 0.3) / 2, sz, true, 5);
    this.box(g1 - g0, 0.9, 0.3, [outer, outer, cap, outer, outer, this.std(this.rep("wall", () => T.wallTex(), 2))], (g0 + g1) / 2, WALL_H - 0.45, sz, { outline: false });
    this.card(this.tex("banner", () => T.bannerTex("UNIFY ACADEMY")), 7.6, 1.2, (g0 + g1) / 2, 3.2, H / 2 - 0.05, Math.PI, true);
    this.card(this.tex("exit", () => T.bannerTex("WELCOME")), 5.2, 0.8, (g0 + g1) / 2, 3.2, H / 2 + 0.35, 0, true);
    this.card(this.tex("clock", () => T.clockTex()), 1.1, 1.1, -9, 3.05, -H / 2 + 0.17, 0);
    // windows along the outer walls (above the lockers), skipping the entrance
    for (let x = 4; x < W - 3; x += 6) if (Math.abs(x - W / 2) > 1.5) this.win(x - W / 2, 3.05, -H / 2 + 0.17, 0);
    for (let x = 4; x < W - 3; x += 6) if (x < ENTRANCE.gap.x0 - 2 || x > ENTRANCE.gap.x1 + 2) this.win(x - W / 2, 3.05, H / 2 - 0.17, Math.PI);
    for (let z = 5; z < H - 3; z += 6) { if (Math.abs(z - OPEN.cy) < 2.4) { this.win(W / 2 - 0.17, 3.05, z - H / 2, -Math.PI / 2); continue; } this.win(-W / 2 + 0.17, 3.05, z - H / 2, Math.PI / 2); this.win(W / 2 - 0.17, 3.05, z - H / 2, -Math.PI / 2); }
    this.buildDoor({ id: "news", room: "news", x: NEWS.cx - W / 2, z: -H / 2, nx: 0, nz: 1, col: "#8E7CC3", sign: ["AUDITORIUM ▼", "#6B5AA8"], kind: "aud", title: "THE AUDITORIUM", approach: NEWS.approach });
    this.buildDoor({ id: "open", room: "open", x: -W / 2, z: OPEN.cy - H / 2, nx: 1, nz: 0, col: "#E8A33D", sign: ["THE OPEN DOOR", "#B8741A"], kind: "open", title: "THE OPEN DOOR", approach: OPEN.approach });
    this.doorMat(-W / 2 + 1.45, OPEN.cy - H / 2, Math.PI / 2, "#E8A33D"); this.doorMat(NEWS.cx - W / 2, -H / 2 + 1.45, 0, "#8E7CC3");
    this.bunting([[-W / 2 + 0.06, -H / 2 + 0.06, W / 2 - 0.06, -H / 2 + 0.06], [-W / 2 + 0.06, -H / 2 + 0.06, -W / 2 + 0.06, H / 2 - 0.06], [W / 2 - 0.06, -H / 2 + 0.06, W / 2 - 0.06, H / 2 - 0.06]], 3.95);

    // subject blocks: solid paper boxes with a big roof label, windows, posters and one door each
    for (const b of BLOCKS) {
      const r = b.rect, s = b.subject, door = DOORS.find((d) => d.subject === s)!;
      const sx = Mood.tinted(this.std(this.rep("wall", () => T.wallTex(), r.h / 4)), "wash", 1), sz2 = Mood.tinted(this.std(this.rep("wall", () => T.wallTex(), r.w / 4)), "wash", 1);
      const roof = this.std(this.tex(`roof-${s}`, () => T.roofLabelTex(SUBJ_LABEL[s], SUBJ_COL[s], s === "science" ? "#3b3340" : "#FFF9F0")));
      this.box(r.w, WALL_H, r.h, [sx, sx, roof, outer, sz2, sz2], r.x + r.w / 2 - W / 2, WALL_H / 2, r.y + r.h / 2 - H / 2, { occlude: true });
      const faces: Face[] = ["N", "S", "E", "W"];
      for (const f of faces) {
        const len = f === "N" || f === "S" ? r.w : r.h, n = Math.round(len / 4.6);
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n, p = this.onFace(r, f, t, 0.17), gx = f === "N" || f === "S" ? r.x + r.w * t : door.cx;
          if (f === door.face && Math.abs(gx - door.cx) < 2.6) continue;
          this.win(p.x, 3.05, p.z, this.rotOf(f));
        }
      }
      // plaza-side wall: posters + notice board beside the door
      const df = door.face, q = (dx: number, i: number) => { const p = this.onFace(r, df, (door.cx + dx - r.x) / r.w, 0.17); return { p, i }; };
      const a = q(-5.2, 0), c2 = q(5.2, 1), bd = q(-3.4, 2), tr = q(3.4, 3);
      const roomy = r.w >= 8;
      if (roomy) {
      { const ls = CURRICULUM[s] ?? [], cur = ls[Progress.index(s, ls.length)], pids = picsFor(s, cur?.pics ?? [], 2);    // wall pictures match what is being taught in this room
        const pic = (pos: { p: { x: number; z: number } }, pid: string) => { const tx = new THREE.CanvasTexture(drawPicFinal(pid)); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; const fr = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.12, 0.06), this.plain("#9A653D")); fr.position.set(pos.p.x, 1.55, pos.p.z); fr.rotation.y = this.rotOf(df); this.scene.add(fr); const m = this.card(tx, 1.7, 0.96, pos.p.x, 1.55, pos.p.z, this.rotOf(df), true); m.position.z += 0.04; m.userData = { pid, title: picTitle(pid), subject: s }; this.hallPics.push(m); };
        pic(a, pids[0]); if (s !== "math") pic(c2, pids[1]); }
      this.card(this.tex("board", () => T.boardTex()), 1.6, 1.1, bd.p.x, 2.2, bd.p.z, this.rotOf(df)); this.card(this.tex("trophy", () => T.trophyTex()), 1.1, 1.0, tr.p.x, 2.2, tr.p.z, this.rotOf(df));
      }
      // door: frame, hinged leaf, painted glimpse of the room behind it, sign
      this.doorMat(door.cx - W / 2, door.cy - H / 2 + (df === "S" ? 1.45 : -1.45), 0, SUBJ_COL[s]);   // a bright welcome mat in the subject's colour
      this.buildDoor({ id: s, room: s, x: door.cx - W / 2, z: door.cy - H / 2, nx: 0, nz: df === "S" ? 1 : -1, col: SUBJ_COL[s], sign: [s === "careers" ? "CARRYING CAREERS" : s === "life" ? "LIFE LESSONS" : SUBJ_LABEL[s], SUBJ_COL[s], s === "science" ? "#3b3340" : "#FFF9F0"], kind: "class", title: `${s === "careers" ? "CARRYING CAREERS" : s === "life" ? "LIFE LESSONS" : SUBJ_LABEL[s]} CLASSROOM`, approach: door.approach });
    }

    // locker runs: one long box each, the four locker colours repeating on the front face
    LOCKERS.forEach((l, i) => {
      const r = l.rect, len = l.face === "N" || l.face === "S" ? r.w : r.h, front = Mood.tinted(this.std(this.rep("lockers", () => T.lockerStripTex(LOCKER_COL), len / LOCKER_COL.length)), "accent", 0.16), side = this.plain("#9db8c8"), top = this.plain("#FFF6E6");
      const mats = [side, side, top, side, side, side]; mats[{ E: 0, W: 1, S: 4, N: 5 }[l.face]] = front; this.lockMats.push(front);
      this.box(r.w, PROP_H.locker, r.h, mats, r.x + r.w / 2 - W / 2, PROP_H.locker / 2, r.y + r.h / 2 - H / 2, { occlude: true });
      void i;
    });

    this.buildClassBoard(); this.buildNewsTV(); this.buildEntranceDoors(); this.buildColliders();
    PLANTS.forEach((pl, i) => { const g = makePlant(pl.kind, i); g.position.set(pl.x - W / 2, 0, pl.y - H / 2); if (pl.kind === "hang") g.rotation.y = pl.rot ?? 0; this.scene.add(g); });
    // plaza furniture
    for (const p of PROPS) {
      const x = p.x - W / 2, z = p.y - H / 2;
      if (p.kind === "tree") this.tree(x, z); else if (p.kind === "fountain") this.fountain(x, z); else if (p.kind === "table") this.table(x, z);
      else if (p.kind === "bench") this.bench(x, z, p.rot ?? 0); else if (p.kind === "planter") this.plant(x, z); else if (p.kind === "tv" || p.kind === "bboard") { /* built by buildNewsTV / buildHallDetails */ } else this.lamp(x, z, i2c(p.x + p.y));
    }
  }
  private fx!: { tick(t: number, dt: number): void };
  private buildDetails() {
    const doors = DOORS.map((d) => ({ x: d.cx - W / 2, z: d.cy - H / 2, rot: d.face === "S" ? 0 : Math.PI, col: SUBJ_COL[d.subject] }));
    doors.push({ x: NEWS.cx - W / 2, z: -H / 2, rot: 0, col: "#8E7CC3" }, { x: -W / 2, z: OPEN.cy - H / 2, rot: Math.PI / 2, col: "#E8A33D" });
    this.fx = buildHallDetails(this.scene, { wins: this.winSpots, doors, benches: PROPS.filter((p) => p.kind === "bench").map((p) => ({ x: p.x - W / 2, z: p.y - H / 2, rot: p.rot ?? 0 })) });
  }
  private treeN = 0;
  private tree(x: number, z: number) {
    const g = new THREE.Group(), tub = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.5, 14), this.plain("#F28F7E")); tub.position.y = 0.25; tub.castShadow = true; g.add(tub);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.06, 14), this.plain("#F7ECD6")); rim.position.y = 0.5; g.add(rim);
    const n = this.treeN++, t = singleTree(n % 3 === 2 ? "birch" : "oak", 0.74 + (n % 3) * 0.05, n); t.position.y = 0.5; g.add(t);
    g.position.set(x, 0, z); this.scene.add(g);
  }
  private fountain(x: number, z: number) {
    const g = new THREE.Group(), cream = this.plain("#F7ECD6");
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.35, 0.6, 28), cream); base.position.y = 0.3; base.castShadow = base.receiveShadow = true; g.add(base);
    base.add(new THREE.LineSegments(new THREE.EdgesGeometry(base.geometry, 40), new THREE.LineBasicMaterial({ color: 0x6d5a5f, transparent: true, opacity: 0.5 })));
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.05, 28), new THREE.MeshStandardMaterial({ color: "#8FC9E8", emissive: "#8FC9E8", emissiveIntensity: 0.25, roughness: 0.4 })); water.position.y = 0.6; g.add(water);
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 1.5, 14), cream); pil.position.y = 1.2; pil.castShadow = true; g.add(pil);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.5, 0.3, 20), cream); bowl.position.y = 1.9; bowl.castShadow = true; g.add(bowl);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 20), new THREE.MeshStandardMaterial({ color: "#8FC9E8", emissive: "#8FC9E8", emissiveIntensity: 0.25 })); top.position.y = 2.05; g.add(top);
    const spray = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 10), new THREE.MeshStandardMaterial({ color: "#DDF3FB", emissive: "#DDF3FB", emissiveIntensity: 0.4, transparent: true, opacity: 0.85 })); spray.position.y = 2.55; g.add(spray);
    g.position.set(x, 0, z); this.scene.add(g);
  }
  private table(x: number, z: number) {
    const g = new THREE.Group(), top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 20), this.plain("#F1C887")); top.position.y = 0.78; top.castShadow = top.receiveShadow = true; g.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.78, 8), this.plain("#9A653D")); leg.position.y = 0.39; g.add(leg);
    ["#F28F7E", "#8FC9E8", "#A9DCC0", "#B8A8DA"].forEach((c, i) => { const a = (i / 4) * Math.PI * 2 + 0.4, st = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.46, 10), this.plain(c)); st.position.set(Math.cos(a) * 1.0, 0.23, Math.sin(a) * 1.0); st.castShadow = true; st.userData.seat = this.seats.length; g.add(st); this.seats.push({ pos: new THREE.Vector3(x + Math.cos(a) * 1.0, 0, z + Math.sin(a) * 1.0), ctr: new THREE.Vector3(x, 0, z), mesh: st }); });
    const cm = new THREE.MeshStandardMaterial({ color: "#F8EBD2", roughness: 0.95 }), cloth = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.95, 0.03, 24), cm); cloth.position.y = 0.84; cloth.receiveShadow = true; g.add(cloth);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 6), this.plain("#9A653D")); pole.position.set(0, 1.5, 0); g.add(pole);
    const flag = this.emo("⭐", 0.8), sign = this.emo("The Crew", 0.28, true); flag.position.set(0, 2.35, 0); sign.position.set(0, 1.05, 0.45); flag.visible = sign.visible = false; g.add(flag, sign);
    this.tables.push({ x, z, cloth, flag, sign, mat: cm });
    g.position.set(x, 0, z); this.scene.add(g);
  }
  private bench(x: number, z: number, rot: number) {
    const g = new THREE.Group(); g.add(this.part(0.62, 0.1, 1.8, "#F1C887", 0, 0.5, 0)); g.add(this.part(0.12, 0.45, 1.7, "#9A653D", -0.24, 0.25, 0)); g.add(this.part(0.1, 0.5, 1.8, "#F28F7E", -0.3, 0.8, 0));
    g.rotation.y = rot; g.position.set(x, 0, z); this.scene.add(g);
  }
  private part(w: number, h: number, d: number, col: string, x: number, y: number, z: number) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.plain(col)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  private lamp(x: number, z: number, col: string) {
    const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.0, 6), this.plain("#9A653D")); pole.position.y = 1.5; pole.castShadow = true; g.add(pole);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 12), Mood.lit(new THREE.MeshStandardMaterial({ map: this.tex(`lan-${col}`, () => T.lanternTex(col)), emissive: col, emissiveIntensity: 0.3, roughness: 1 }), 1.1, 0.3)); l.scale.y = 1.2; l.position.y = 3.2; l.castShadow = true; g.add(l);
    g.position.set(x, 0, z); this.scene.add(g);
  }
  private plantN = 0;
  /** plaza planter: a tall plant (bamboo / ficus) in a stone trough */
  private plant(x: number, z: number) {
    const g = new THREE.Group(), n = this.plantN++, trough = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.34, 1.2), this.plain("#F28F7E")); trough.position.y = 0.17; trough.castShadow = true; g.add(trough);
    const pl = makePlant(n % 2 ? "ficus" : "bamboo", n); pl.position.y = 0.2; pl.scale.setScalar(0.9); g.add(pl); g.position.set(x, 0, z); this.scene.add(g);
  }
  /** one merged mesh of paper pennants hung along wall segments [x0,z0,x1,z1] */
  /** a colourful striped welcome mat in front of a door (colour = the room's colour) */
  private doorMat(x: number, z: number, rotY: number, col: string) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const c = cv.getContext("2d")!, base = new THREE.Color(col);
    c.fillStyle = "#" + base.clone().multiplyScalar(0.62).getHexString(); c.fillRect(0, 0, 256, 128); c.fillStyle = col; c.fillRect(10, 10, 236, 108);
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.18)"; c.fillRect(24 + i * 36, 24, 18, 80); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.95 })); m.rotation.x = -Math.PI / 2; m.rotation.z = rotY; m.position.set(x, 0.035, z); this.scene.add(m);
  }
  private bunting(segs: number[][], y: number) {
    const cols = [0xF28F7E, 0xEAB94E, 0x8FC9E8, 0xA9DCC0, 0xB8A8DA, 0xEAA5B2].map((c) => new THREE.Color(c)), pos: number[] = [], col: number[] = [];
    for (const [x0, z0, x1, z1] of segs) {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 0.9), tx = (x1 - x0) / len, tz = (z1 - z0) / len;
      for (let i = 0; i < n; i++) {
        const d = 0.45 + i * 0.9, cx = x0 + tx * d, cz = z0 + tz * d, c = cols[i % 6];
        pos.push(cx - tx * 0.22, y, cz - tz * 0.22, cx + tx * 0.22, y, cz + tz * 0.22, cx, y - 0.5, cz); for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const bm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); this.scene.add(bm); this.buntMeshes.push(bm);
  }
  private buntMeshes: THREE.Mesh[] = []; private tables: { x: number; z: number; cloth: THREE.Mesh; flag: THREE.Sprite; sign: THREE.Sprite; mat: THREE.MeshStandardMaterial }[] = []; private decorG = new THREE.Group(); private emoCache = new Map<string, THREE.CanvasTexture>();
  /** a small emoji picture (or short text) as a billboard */
  private emo(ch: string, size: number, text = false): THREE.Sprite {
    const key = ch + (text ? "t" : ""); let t = this.emoCache.get(key);
    if (!t) { const cv = document.createElement("canvas"); cv.width = text ? 256 : 128; cv.height = text ? 64 : 128; const c = cv.getContext("2d")!; c.textAlign = "center"; c.textBaseline = "middle";
      if (text) { c.fillStyle = "rgba(255,249,240,.95)"; c.beginPath(); c.roundRect(2, 6, 252, 52, 22); c.fill(); c.strokeStyle = "rgba(90,60,50,.35)"; c.lineWidth = 3; c.stroke(); c.fillStyle = "#4A3B3F"; c.font = "700 30px 'Trebuchet MS',sans-serif"; c.fillText(ch.slice(0, 16), 128, 34); }
      else { c.font = "96px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; c.fillText(ch, 64, 70); }
      t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; this.emoCache.set(key, t); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); sp.scale.set(text ? size * 4 : size, size, 1); return sp;
  }
  /** recolour the bunting flags (theme palette) */
  setBuntingPalette(cols: string[]) { const cs = cols.map((c) => new THREE.Color(c)); for (const m of this.buntMeshes) { const a = m.geometry.getAttribute("color") as THREE.BufferAttribute; for (let i = 0; i < a.count; i++) { const c = cs[Math.floor(i / 3) % cs.length]; a.setXYZ(i, c.r, c.g, c.b); } a.needsUpdate = true; } }
  /** seasonal / holiday decorations indoors (or none): garlands over every door, a ring around the fountain, corner pieces, and a matching bunting palette */
  setTheme(th: { palette: string[]; decor: string[] } | null) {
    this.scene.remove(this.decorG); this.decorG = new THREE.Group(); this.scene.add(this.decorG);
    this.setBuntingPalette(th ? th.palette : ["#F28F7E", "#EAB94E", "#8FC9E8", "#A9DCC0", "#B8A8DA", "#EAA5B2"]); if (!th) return;
    const G = this.decorG, D = th.decor, put = (i: number, x: number, y: number, z: number, sz = 0.55) => { const sp = this.emo(D[i % D.length], sz); sp.position.set(x, y, z); G.add(sp); return sp; };
    const doors: { x: number; z: number; ox: number; oz: number }[] = DOORS.map((d) => { const p = g2w(d.cx, d.cy), o = d.face === "S" ? 0.45 : -0.45; return { x: p.x, z: p.z, ox: 0, oz: o }; });
    const nw = g2w(NEWS.cx, 0), ow = g2w(OPEN.cx, OPEN.cy); doors.push({ x: nw.x, z: nw.z, ox: 0, oz: 0.45 }, { x: ow.x, z: ow.z, ox: 0.45, oz: 0 });
    doors.forEach((d, k) => { const side = d.ox ? "z" : "x"; for (let i = -2; i <= 2; i++) { const sp = put(i + 2 + k, d.x + (side === "x" ? i * 0.5 : d.ox), 3.55 - Math.abs(i) * 0.08, d.z + (side === "z" ? i * 0.5 : d.oz), 0.46); sp.userData.sway = i; } });
    const fc = g2w(28, 22); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, sp = put(i, fc.x + Math.cos(a) * 3.9, 0.55, fc.z + Math.sin(a) * 3.9, 0.7); sp.userData.bob = i; }
    for (const [cx, cz] of [[6, 6], [50, 6], [6, 38], [50, 38]] as const) { const p = g2w(cx, cz); put(3, p.x, 1.1, p.z, 1.3); put(0, p.x + 0.9, 0.6, p.z + 0.4, 0.7); }
  }
  /** per-frame life for the decorations (gentle sway and bobbing) */
  tickDecor(t: number) { for (const sp of this.decorG.children) { const u = sp.userData; if (u.sway != null) sp.position.y += Math.sin(t * 2 + u.sway) * 0.0008; if (u.bob != null) sp.position.y = 0.55 + Math.abs(Math.sin(t * 1.6 + u.bob)) * 0.12; } }
  /** Chat Chow crew look: the table you sit at gets your cloth colour, flag and crew name */
  applyChow(home: number, cloth: string, flag: string, crew: string) {
    this.tables.forEach((t, i) => { const mine = i === home; t.mat.color.set(mine ? cloth : "#F8EBD2"); t.flag.visible = mine; t.sign.visible = mine; if (mine) { const nf = this.emo(flag, 0.8), ns = this.emo(crew, 0.28, true); t.flag.material.map = nf.material.map; t.flag.material.needsUpdate = true; t.sign.material.map = ns.material.map; t.sign.material.needsUpdate = true; } });
  }
  get tableCount() { return this.tables.length; }
  tableNear(x: number, z: number): number { let b = 0, bd = 1e9; this.tables.forEach((t, i) => { const d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; b = i; } }); return b; }


  /* ------------------------------------------------------------ doors: hinged leaves; nobody passes until the door is open */
  doorHits: THREE.Mesh[] = []; doors: HallDoor[] = []; door(id: string) { return this.doors.find((d) => d.id === id)!; } private entDoor!: HallDoor;
  private statics = new Statics(); private crowd = new Crowd(2); private bodies = new Map<Person, Body>(); private bodyN = 1;
  private edge(m: THREE.Mesh) { if (!this.px) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x6d5a5f, transparent: true, opacity: 0.55 }))); }
  /** frame + hinged leaf + a painted glimpse of the room behind + sign. (x, z) is the doorway on the wall face; (nx, nz) points out into the hall. */
  private buildDoor(o: { id: string; room: Room; x: number; z: number; nx: number; nz: number; col: string; sign: [string, string, string?]; kind: PeekKind; title: string; approach: { x: number; y: number } }) {
    const root = new THREE.Group(), wood = this.plain("#9A653D"); root.position.set(o.x, 0, o.z); root.rotation.y = Math.atan2(o.nx, o.nz); this.scene.add(root);
    const pk = new THREE.CanvasTexture(peekCanvas(o.kind, o.col)); pk.colorSpace = THREE.SRGBColorSpace;
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.5, DR), new THREE.MeshBasicMaterial({ map: pk })); inner.position.set(0, DR / 2, 0.03); root.add(inner);
    const part = (w: number, h: number, d: number, x: number, y: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); m.position.set(x, y, 0.09); m.castShadow = true; m.receiveShadow = true; root.add(m); this.edge(m); };
    part(0.2, DR + 0.35, 0.18, -0.85, (DR + 0.35) / 2); part(0.2, DR + 0.35, 0.18, 0.85, (DR + 0.35) / 2); part(1.9, 0.35, 0.18, 0, DR + 0.175);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshBasicMaterial({ map: this.tex(`sign-${o.id}`, () => T.signTex(o.sign[0], o.sign[1], o.sign[2])), transparent: true })); sg.position.set(0, DR + 0.55, 0.2); root.add(sg);
    const pv = new THREE.Group(); pv.position.set(-0.75, 0, 0.13);
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(1.5, DR), new THREE.MeshStandardMaterial({ map: this.tex(`door-${o.id}`, () => T.doorTex(o.col)), roughness: 0.95, side: THREE.DoubleSide })); leaf.position.set(0.75, DR / 2, 0); leaf.castShadow = true; leaf.receiveShadow = true; leaf.userData.room = o.room; this.doorHits.push(leaf); pv.add(leaf);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), this.plain("#EAB94E")); knob.position.set(1.32, DR * 0.44, 0.05); pv.add(knob); root.add(pv);
    const c = g2w(o.approach.x, o.approach.y);
    this.doors.push({ id: o.id, room: o.room, st: new DoorState(), leaves: [{ g: pv, sgn: -1 }], x: o.x, z: o.z, nx: o.nx, nz: o.nz, occ: new Set(), approach: new THREE.Vector3(c.x, 0, c.z), thr: new THREE.Vector3(o.x - o.nx * 0.2, 0, o.z - o.nz * 0.2), inside: new THREE.Vector3(o.x - o.nx * 1.9, 0, o.z - o.nz * 1.9), swing: 1.85, colId: null, title: o.title, kind: o.kind, accent: o.col, out: null, cap: 1 });
  }
  /** the main entrance: two tall glass doors that swing out */
  private buildEntranceDoors() {
    const root = new THREE.Group(); root.position.set(0, 0, H / 2 + 0.15); this.scene.add(root); const hh = WALL_H - 0.95, lw = 3.95;
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 256; const c = cv.getContext("2d")!; c.fillStyle = "rgba(160,205,225,.34)"; c.fillRect(0, 0, 256, 256); c.strokeStyle = "#5b4a4f"; c.lineWidth = 14; c.strokeRect(7, 7, 242, 242); c.lineWidth = 8; c.beginPath(); c.moveTo(7, 128); c.lineTo(249, 128); c.moveTo(128, 7); c.lineTo(128, 249); c.stroke(); c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.moveTo(30, 230); c.lineTo(120, 40); c.lineTo(150, 40); c.lineTo(60, 230); c.fill();
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const mat = new THREE.MeshStandardMaterial({ map: tx, transparent: true, roughness: 0.25, side: THREE.DoubleSide, depthWrite: false }), leaves: { g: THREE.Group; sgn: number }[] = [];
    for (const k of [-1, 1]) { const pv = new THREE.Group(); pv.position.set(k * 3.98, 0, 0); const m = new THREE.Mesh(new THREE.PlaneGeometry(lw, hh), mat); m.position.set(-k * lw / 2, hh / 2, 0); pv.add(m); const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), this.plain("#EAB94E")); bar.position.set(-k * (lw - 0.35), 1.5, 0.07); pv.add(bar); root.add(pv); leaves.push({ g: pv, sgn: k }); }
    const colId = this.statics.addRect(-4, H / 2 - 0.25, 4, H / 2 + 0.55);
    const d: HallDoor = { id: "entrance", room: "entrance", st: new DoorState(1 / 1.0, 1.6), leaves, x: 0, z: H / 2 + 0.15, nx: 0, nz: 1, occ: new Set(), approach: new THREE.Vector3(0, 0, H / 2 - 2.4), thr: new THREE.Vector3(0, 0, H / 2 + 0.15), inside: new THREE.Vector3(0, 0, H / 2 - 1.7), swing: 1.75, colId, title: "THE MAIN ENTRANCE", kind: null, accent: "#F28F7E", out: new THREE.Vector3(0, 0, H / 2 + 2.7), cap: 3 };
    this.doors.push(d); this.entDoor = d;
  }
  /** static colliders: blocks, lockers, furniture, planters, trees, outer walls */
  private buildColliders() {
    const S = this.statics, m = 0.45, X0 = -W / 2, X1 = W / 2, Z0 = -H / 2, Z1 = H / 2, g0 = ENTRANCE.gap.x0 - W / 2, g1 = ENTRANCE.gap.x1 - W / 2;
    for (const r of BLOCKED) S.addRect(r.x - W / 2, r.y - H / 2, r.x + r.w - W / 2, r.y + r.h - H / 2);
    S.addRect(X0 - 3, Z0 - 3, X1 + 3, Z0 + m); S.addRect(X0 - 3, Z0 - 3, X0 + m, Z1 + 0.3); S.addRect(X1 - m, Z0 - 3, X1 + 3, Z1 + 0.3);
    S.addRect(X0 - 3, Z1 - m, g0, Z1 + 3); S.addRect(g1, Z1 - m, X1 + 3, Z1 + 3);
    S.addRect(X0 - 60, Z1 + 0.3, X0 - 6, Z1 + 60); S.addRect(X1 + 6, Z1 + 0.3, X1 + 60, Z1 + 60); S.addRect(X0 - 60, Z1 + 9.5, X1 + 60, Z1 + 60);
  }
  /** one door tick: open for anybody approaching, swing the leaves, switch the closed-door collider */
  private tickDoors(dt: number) {
    const all = this.everyone();
    for (const d of this.doors) {
      if (d.id === "entrance") { for (const p of all) if (Math.hypot(p.pos.x - d.x, p.pos.z - d.z) < 3.6) { d.st.request(); break; } }
      else if (this.sitting == null && Math.hypot(this.player.pos.x - d.x, this.player.pos.z - d.z) < 2.0) d.st.request();
      d.st.update(dt); const a = d.st.eased * d.swing; for (const l of d.leaves) l.g.rotation.y = l.sgn * a;
      if (d.colId != null) this.statics.setEnabled(d.colId, !d.st.ready);
    }
  }
  /* ------------------------------------------------------------ collision: statics (walls, furniture, planters, trees) + soft separation between people */
  private everyone(): Person[] { return [this.player, ...this.students.filter((s) => !s.hidden), this.monitor, this.teacher, ...this.duty, ...this.visitors.values()]; }
  private bodyOf(p: Person) { let b = this.bodies.get(p); if (!b) { b = { id: this.bodyN++, x: 0, z: 0, r: 0.3 }; this.bodies.set(p, b); } return b; }
  private syncBodies(list: Person[]) {
    const out: Body[] = [], vs = new Set<Person>(this.visitors.values());
    for (const p of list) { const b = this.bodyOf(p); b.x = p.pos.x; b.z = p.pos.z; b.ghost = (p as Stu).ghost === true || (p === this.player && !!this.cine); b.fixed = vs.has(p) || (p === this.player && this.sitting != null); out.push(b); }
    this.crowd.rebuild(out); return out;
  }
  /** after everybody has moved: push people out of each other and out of walls/furniture */
  private collideAll() {
    const list = this.everyone(), out = this.syncBodies(list);
    for (let i = 0; i < 2; i++) { this.crowd.separate(0.6, this.statics); this.crowd.rebuild(out); }
    list.forEach((p) => { const b = this.bodyOf(p); p.pos.x = b.x; p.pos.z = b.z; });
  }
  /** steer a walker's direction around people in the way (waits when directly blocked, for a short while only) */
  private steer(p: Person, d: THREE.Vector3, dt: number, s?: { waitT: number }): boolean {
    const b = this.bodyOf(p), a = this.crowd.avoid(b, d.x, d.z, 1.5);
    if (a.wait && (!s || (s.waitT += dt) < 3)) return false; if (s && !a.wait) s.waitT = 0;
    if (!a.wait) { d.x = a.vx; d.z = a.vz; } return true;
  }

  /* ------------------------------------------------------------ outside the walls: lawn, paths, trees, houses, hills (so the paper is never empty) */
  private buildOutside() {
    const S = this.scene;
    const gt = this.rep("grass", () => T.groundTex(), 60, 60), ground = new THREE.Mesh(new THREE.PlaneGeometry(480, 480), this.std(gt)); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.04; ground.receiveShadow = true; S.add(ground);
    this.flat(this.rep("stoneP", () => T.stoneTex(), 2, 7), 7.4, 28, 0, H / 2 + 14, -0.02);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(9, 40), this.std(this.rep("stoneD", () => T.stoneTex(), 5, 5))); disc.rotation.x = -Math.PI / 2; disc.position.set(0, -0.015, H / 2 + 30); disc.receiveShadow = true; S.add(disc);
    // lawn trees: instanced oak / pine / birch, kept off the entrance path, sidewalk, road and bus bay (campus.outsideTrees)
    S.add(buildForest(outsideTrees().map((t) => ({ x: t.x - W / 2, z: t.y - H / 2, s: t.s, sp: t.sp, rot: t.rot, tint: t.tint })), { y: -0.02 }));
    // little paper houses and hills ringing the lawn
    const wallCols = ["#F2A79B", "#F4D488", "#9FD0B0", "#9CC3E0", "#E8C39A", "#C9B7E8"], roofCols = ["#C98569", "#9A653D", "#7C94B0", "#B8604F"];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + hash(i, 8) * 0.2, rx = 78 + hash(i, 9) * 18, x = Math.cos(a) * rx * 1.1, z = Math.sin(a) * rx * 0.85 + 6;
      if (Math.abs(x) < 8 && z > 0) continue;
      const w = 5 + hash(i, 10) * 4, h = 3.5 + hash(i, 11) * 2.5, g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.9), this.plain(wallCols[i % 6])); body.position.y = h / 2; body.castShadow = true; g.add(body);
      body.add(new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: 0x6d5a5f, transparent: true, opacity: 0.45 })));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.82, h * 0.7, 4), this.plain(roofCols[i % 4])); roof.position.y = h + h * 0.35; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
      g.position.set(x, 0, z); g.rotation.y = hash(i, 12) * 6; S.add(g);
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.2, r = 118 + hash(i, 13) * 30, s = 14 + hash(i, 14) * 14, hill = new THREE.Mesh(new THREE.ConeGeometry(s * 1.5, s, 6), new THREE.MeshStandardMaterial({ color: ["#A9CDB8", "#B7D8A4", "#9CC3A8"][i % 3], roughness: 1, flatShading: true }));
      hill.position.set(Math.cos(a) * r * 1.15, s / 2 - 0.5, Math.sin(a) * r * 0.9 + 6); S.add(hill);
    }
  }

  /* ------------------------------------------------------------ people (billboarded chibi sprites baked from the vector art) */
  private makePerson(id: number, look: Look, h = AGE_SCALE[look.age ?? "hs"] * ((look as any).hScale ?? 1)): Person {
    const tex = new THREE.CanvasTexture(bakeSheet(look)); tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.set(1 / COLS, 1 / DIRS.length); tex.anisotropy = 4;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true }); if (this.px) mat.color.set("#ffe6cf"); const sprite = new THREE.Sprite(mat);
    sprite.center.set(0.5, FEET / FH); sprite.scale.set(((FW / SCALE) * UNIT) * h * CHAR_K, ((FH / SCALE) * UNIT) * h * CHAR_K, 1); this.scene.add(sprite);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.6), new THREE.MeshBasicMaterial({ map: this.blobTex, transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; this.scene.add(blob);
    return { id, look, sprite, mat, tex, blob, pos: new THREE.Vector3(), dir: 0, frame: 0, moving: false, baseScale: sprite.scale.clone(), gait: "steady", fidgetT: 4 + Math.random() * 10 };
  }

  /* ------------------------------------------------------------ friends visiting (real people you are connected with, opt-in on both sides) */
  visitors = new Map<string, Person & { tx: number; tz: number; sig: string; label: THREE.Sprite }>();
  myState() { return { x: +this.player.pos.x.toFixed(2), z: +this.player.pos.z.toFixed(2), dir: this.player.dir, moving: this.player.moving }; }
  private dropVisitor(p: Person & { label: THREE.Sprite }) { this.scene.remove(p.sprite, p.blob, p.label); p.tex.dispose(); p.mat.dispose(); (p.label.material as THREE.SpriteMaterial).map?.dispose(); p.label.material.dispose(); }
  setVisitors(list: { id: string; name: string; spec: any; x: number; z: number; dir: number; moving: boolean }[]) {
    const seen = new Set<string>();
    for (const v of list) {
      seen.add(v.id); let p = this.visitors.get(v.id); const sig = JSON.stringify(v.spec);
      if (!p || p.sig !== sig) {
        if (p) this.dropVisitor(p);
        let look: Look; try { look = { ...toLook(v.spec, 900 + this.visitors.size), tag: false } as Look; } catch { continue; }
        const q = this.makePerson(900 + this.visitors.size, look); const cv = document.createElement("canvas"); cv.width = 256; cv.height = 64; const c = cv.getContext("2d")!; c.font = "600 28px Fredoka, sans-serif"; c.textAlign = "center";
        const nm = "\u{1F44B} " + String(v.name).slice(0, 18), w = Math.min(244, c.measureText(nm).width + 24); c.fillStyle = "rgba(255,244,220,.92)"; c.beginPath(); c.roundRect((256 - w) / 2, 8, w, 46, 14); c.fill(); c.fillStyle = "#4A3B3F"; c.fillText(nm, 128, 41);
        const lt = new THREE.CanvasTexture(cv); const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: lt, transparent: true, depthTest: false })); label.scale.set(2.2, 0.55, 1); label.renderOrder = 12; this.scene.add(label);
        p = Object.assign(q, { tx: v.x, tz: v.z, sig, label }); p.pos.set(v.x, 0, v.z); this.visitors.set(v.id, p);
      }
      p.tx = v.x; p.tz = v.z; p.dir = v.dir; p.moving = v.moving;
    }
    for (const [id, p] of this.visitors) if (!seen.has(id)) { this.dropVisitor(p); this.visitors.delete(id); }
  }
  private tickVisitors(dt: number) {
    for (const p of this.visitors.values()) {
      const dx = p.tx - p.pos.x, dz = p.tz - p.pos.z, d = Math.hypot(dx, dz); if (d > 8) p.pos.set(p.tx, 0, p.tz); else if (d > 0.02) { const k = Math.min(1, dt * 4); p.pos.x += dx * k; p.pos.z += dz * k; }
      p.frame = p.moving || d > 0.15 ? 1 + (Math.floor(this.t * 9) % 4) : 0;
      const h = (p.sprite.scale.y || 1); p.label.position.set(p.pos.x, h + 0.5, p.pos.z);
    }
  }
  /** open tiles the entrance can actually reach (flood fill), used as idle spots */
  private reachable() {
    const seen = new Set<number>(), q = [ENTRANCE.tile.y * W + ENTRANCE.tile.x]; seen.add(q[0]);
    while (q.length) { const k = q.pop()!, x = k % W, y = Math.floor(k / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, nk = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || NAV[ny][nx] !== "." || seen.has(nk)) continue; seen.add(nk); q.push(nk); } }
    this.open = [...seen].map((k) => ({ x: k % W, y: Math.floor(k / W) })).filter((t) => t.y < H - 2);
  }
  private buildPeople() {
    const ent = g2w(ENTRANCE.tile.x + 0.5, ENTRANCE.tile.y + 0.5);
    this.students = ROSTER.slice(0, HALL_COUNT).map((def, i) => {
      const age = def.age, p = this.makePerson(def.id, Events.dress(def.look, def.id, false));
      p.pos.copy(ent); p.sprite.visible = false; p.blob.visible = false; p.def = def; const d = DOORS[i % 4];
      const gait = GAIT_BY_PERSONALITY[def.personality] ?? "steady"; return Object.assign(p, { gait, hidden: true, path: [], speed: rnd(2.3, 3.1) * GAITS[gait].speed * (age === "k2" ? 0.8 : age === "g35" ? 0.9 : age === "g68" ? 0.97 : 1), pending: null, lastDoor: { x: Math.floor(d.approach.x), y: Math.floor(d.approach.y) }, hideOnArrive: false, fade: 1, pass: null, ghost: false, waitT: 0, busTrip: false, lastDoorRec: this.door(d.subject) }) as unknown as Stu;
    });
    this.player = this.makePerson(11, Events.dress({ ...toLook(Social.profile.avatar, 11), tag: true }, 11, true));
    this.player.pos.copy(g2w(28, 35));
    // staff: a hall monitor and a teacher (adults, the tallest size class) walking loops of the plaza and ring corridor
    this.monitor = this.makePerson(STAFF[0].id, STAFF[0].look); this.monitor.def = STAFF[0]; this.monitor.pos.copy(g2w(10.5, 18.5));
    this.teacher = this.makePerson(STAFF[1].id, STAFF[1].look); this.teacher.def = STAFF[1]; this.teacher.pos.copy(g2w(46.5, 26.5));
    this.duty = STAFF.filter((d) => d.faculty === "park").map((d, i) => { const p = this.makePerson(d.id, d.look); p.def = d; p.pos.copy(g2w(i ? 30.5 : 22.5, i ? 36.5 : 8.5)); return p; });
    this.walkers = [
      { p: this.duty[0], stops: [[22, 8], [28, 2], [53, 10], [46, 18], [28, 22], [10, 18], [2, 10]], path: [], leg: 0, speed: 0.95, waitT: 0 },
      { p: this.monitor, stops: [[10, 18], [46, 18], [53, 22], [46, 26], [10, 26], [2, 22], [28, 2]], path: [], leg: 0, speed: 1.15, waitT: 0 },
      { p: this.teacher, stops: [[46, 26], [28, 18], [10, 26], [28, 41], [53, 30], [28, 2], [2, 10]], path: [], leg: 0, speed: 1.0, waitT: 0 },
    ];
  }
  /** the class-times bulletin board: a free-standing corkboard on the plaza that shows today's picked times and lesson numbers */
  boardPos = g2w(OUTSIDE.board.x, OUTSIDE.board.y); private boardTex!: THREE.CanvasTexture; private boardCv!: HTMLCanvasElement;
  refreshBoard() { const c = this.boardCv.getContext("2d")!; drawBoard(c, this.boardCv.width, this.boardCv.height); this.boardTex.needsUpdate = true; }
  private buildClassBoard() {
    const cv = this.boardCv = document.createElement("canvas"); cv.width = 1024; cv.height = 680; this.boardTex = new THREE.CanvasTexture(cv); this.boardTex.colorSpace = THREE.SRGBColorSpace; this.boardTex.anisotropy = 4; this.refreshBoard();
    const g = new THREE.Group(), wood = this.plain("#9A653D");
    for (const sx of [-1.35, 1.35]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.7, 0.14), wood); post.position.set(sx, 1.35, 0); post.castShadow = true; g.add(post); }
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.0, 0.1), wood); back.position.set(0, 1.75, 0); back.castShadow = true; g.add(back);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.86, 1.9), new THREE.MeshBasicMaterial({ map: this.boardTex, toneMapped: false })); face.position.set(0, 1.75, 0.06); g.add(face);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.14, 0.4), this.plain("#E07A66")); roof.position.set(0, 2.82, 0.04); roof.castShadow = true; g.add(roof);
    g.position.copy(this.boardPos); this.scene.add(g);
    addEventListener("unify:progress", () => this.refreshBoard()); setInterval(() => this.refreshBoard(), 60000);
  }

  /* ------------------------------------------------------------ the school bus, arrival, and Chat Chow seats */
  private buildBus() {
    const g = new THREE.Group(), yel = this.plain("#F2B632"), blk = this.plain("#2b2b34"), win = new THREE.MeshStandardMaterial({ color: "#8FC9E8", roughness: 0.3, emissive: "#355a70", emissiveIntensity: 0.25 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(8.6, 2.5, 2.7), yel); body.position.set(0.7, 1.85, 0); body.castShadow = true; g.add(body);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 2.5), yel); hood.position.set(-4.6, 1.3, 0); hood.castShadow = true; g.add(hood);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.12, 2.5), this.plain("#F8D977")); roof.position.set(0.7, 3.14, 0); g.add(roof);
    for (const sz of [-1.36, 1.36]) { const strip = new THREE.Mesh(new THREE.BoxGeometry(8.62, 0.14, 0.02), blk); strip.position.set(0.7, 1.55, sz); g.add(strip); const strip2 = strip.clone(); strip2.position.y = 2.4; g.add(strip2);
      for (let i = 0; i < 8; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.7, 0.03), win); w.position.set(-2.55 + i * 0.99, 2.7 - 0.0, sz); w.position.y = 2.72; g.add(w); } }
    for (const [wx, wz] of [[-4.6, -1.15], [-4.6, 1.15], [2.9, -1.2], [2.9, 1.2], [0.5, -1.2], [0.5, 1.2]].slice(0, 4)) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.34, 14), blk); wh.rotation.x = Math.PI / 2; wh.position.set(wx, 0.62, wz); wh.castShadow = true; wh.userData.wheel = 1; g.add(wh); }
    for (const sz of [-0.85, 0.85]) { const hl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: "#FFF3B0" })); hl.position.set(-5.62, 1.0, sz); g.add(hl); }
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.55), new THREE.MeshBasicMaterial({ map: T.signTex("UNIFY ACADEMY", "#2b2b34"), transparent: true })); lbl.position.set(1.4, 2.0, -1.37); lbl.rotation.y = Math.PI; g.add(lbl);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 8), new THREE.MeshBasicMaterial({ color: "#D8433A" })); arm.rotation.x = Math.PI / 2; arm.rotation.z = Math.PI / 8; arm.position.set(-2.6, 2.1, -1.4); arm.visible = false; g.add(arm);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.9, 0.05), this.plain("#d9a31f")); door.position.set(-3.0, 1.55, -1.37); g.add(door);
    g.rotation.y = 0; g.position.set(OUTSIDE.busStop.x - W / 2 + 60, 0, OUTSIDE.busStop.y - H / 2); g.visible = false; this.scene.add(g); this.bus = g; this.busState = { t: 0, mode: "idle", from: g.position.x, to: OUTSIDE.busStop.x - W / 2, arm, door };
  }
  private buildRoad() {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(220, 4.6), new THREE.MeshStandardMaterial({ color: "#5d5a62", roughness: 1 })); road.rotation.x = -Math.PI / 2; road.position.set(0, -0.005, OUTSIDE.roadY - H / 2); road.receiveShadow = true; this.scene.add(road);
    for (let x = -100; x < 100; x += 4) { const d = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.14), new THREE.MeshBasicMaterial({ color: "#F8D977" })); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.002, OUTSIDE.roadY - H / 2 + 1.2); this.scene.add(d); }
    for (let i = 0; i < 7; i++) { const z = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 4.4), new THREE.MeshBasicMaterial({ color: "#F4EEE0" })); z.rotation.x = -Math.PI / 2; z.position.set(-3 + i * 1.0, 0.003, OUTSIDE.roadY - H / 2); this.scene.add(z); }
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(60, 4.2), this.std(this.rep("stoneW", () => T.stoneTex(), 14, 1))); walk.rotation.x = -Math.PI / 2; walk.position.set(0, -0.012, H / 2 + 3.0); this.scene.add(walk);
  }
  /** is a seat free (no one else is meant to be there) */
  standUp() { if (this.sitting == null) return; const s = this.seats[this.sitting]; const out = s.pos.clone().sub(s.ctr).setY(0).normalize().multiplyScalar(0.7); this.player.pos.copy(s.pos).add(out); this.sitting = null; this.pendingSeat = null; }
  /** walk to a Chat Chow seat and sit; face the table */
  sitAt(i: number) {
    if (this.inputLocked || this.cine) return false; const s = this.seats[i]; if (!s) return false; this.standUp();
    const out = s.pos.clone().sub(s.ctr).setY(0).normalize(), pre = s.pos.clone().addScaledVector(out, 0.9), gx = pre.x + W / 2, gy = pre.z + H / 2;
    if (!this.planNav(Math.floor(gx) + 0.5, Math.floor(gy) + 0.5, "a seat at Chat Chow", s.pos.clone())) return false; this.pendingSeat = i; return true;
  }
  /** the nearest free-looking seat to the player (idle behaviour) */
  autoSit() { if (this.sitting != null || this.nav || this.cine || this.inputLocked) return false; let bi = -1, bd = 1e9; this.seats.forEach((s, i) => { const d = s.pos.distanceTo(this.player.pos); if (d < bd) { bd = d; bi = i; } }); return bi >= 0 ? this.sitAt(bi) : false; }
  private ensureSitTex(p: Person) { if (p.sitTex) return; const t = new THREE.CanvasTexture(bakeSheet({ ...p.look, sit: true } as Look)); t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1 / COLS, 1 / DIRS.length); t.anisotropy = 4; p.sitTex = t; }
  /** the bus rolls in and parks (for the morning arrival and the dismissal); it leaves once nobody is boarding or stepping off */
  callBus() { const st = this.busState, B = this.bus; if (!st || !B || st.mode === "in" || st.mode === "wait") return; B.visible = true; B.position.x = st.from; st.t = 0; st.mode = "in"; st.arm.visible = false; }
  private busBusy() { return this.playerOnBus || this.busHold > 0 || this.students.some((s) => s.busTrip || (s.pending && (s.pending.mode === "bus-in" || s.pending.mode === "bus-out"))); }
  private busReady() { const st = this.busState; return !!st && st.mode === "wait" && st.t > 1.3; }
  private playerOnBus = false; private busHold = 0;
  /** the morning arrival: the bus rolls in, the avatar steps off and walks to the bulletin board; `onAtBoard` fires when they get there */
  startArrival(onAtBoard: () => void) {
    if (!this.bus || !this.busState) { onAtBoard(); return; }
    this.standUp(); this.nav = null; const B = this.bus, st = this.busState; this.callBus(); this.player.sprite.visible = false; this.player.blob.visible = false; this.arrivalHide = true; this.arrivalCam = true; this.inputLocked = true; this.playerOnBus = true;
    this.onBusStopped = () => {
      const door = this.busDoorPos(); this.player.pos.copy(door); this.arrivalHide = false; this.player.dir = 0;
      const bs = g2w(OUTSIDE.boardStand.x, OUTSIDE.boardStand.y);
      this.cine = { speed: 3.3, pts: [new THREE.Vector3(door.x, 0, bs.z + 0.5), new THREE.Vector3(bs.x, 0, bs.z)], done: () => { this.cine = null; this.inputLocked = false; this.playerOnBus = false; this.busHold = 1.2; onAtBoard(); } };
    };
    void B; void st;
  }
  private arrivalHide = false; arrivalCam = false;
  /** after the schedule is made: walk to the front doors, wait for them to swing open, step inside, then on to where the day goes next */
  walkInside(next: () => void) {
    this.standUp(); this.inputLocked = false; const ent = this.entDoor;
    this.cine = { speed: 3.6, pts: [ent.out!.clone(), ent.thr.clone(), ent.inside.clone(), g2w(28, H - 3)], gate: { door: ent, left: 3 }, done: () => { this.cine = null; this.arrivalCam = false; next(); } };
  }
  skipCine() { if (!this.cine) return; const last = this.cine.pts[this.cine.pts.length - 1], d = this.cine.done; this.player.pos.copy(last); this.cine = null; this.arrivalHide = false; this.arrivalCam = false; this.playerOnBus = false; this.peek = null; this.hidePeek(); if (this.busState) { this.busHold = 0; } d?.(); }
  private updateBus(dt: number) {
    const st = this.busState, B = this.bus; if (!st || !B) return; this.busHold = Math.max(0, this.busHold - dt);
    const spin = (v: number) => B.children.forEach((c) => { if (c.userData.wheel) c.rotation.z -= v; });
    if (st.mode === "in") { st.t += dt; const k = Math.min(1, st.t / 4.2), e = 1 - Math.pow(1 - k, 3), nx = st.from + (st.to - st.from) * e; spin((nx - B.position.x) * -1.6); B.position.x = nx; if (this.playerOnBus && this.arrivalHide) this.player.pos.set(B.position.x - 3.0, 0, B.position.z); if (k >= 1) { st.mode = "wait"; st.t = 0; st.arm.visible = true; } }
    else if (st.mode === "wait") { st.t += dt; st.door.rotation.y = Math.min(1, st.t / 0.5) * 1.3; if (st.t > 1.1 && this.onBusStopped) { const f = this.onBusStopped; this.onBusStopped = () => {}; f(); } if ((st.t > 2.5 && !this.busBusy()) || st.t > 150) st.mode = "out", st.t = 0; }
    else if (st.mode === "out") { st.t += dt; st.arm.visible = false; st.door.rotation.y = Math.max(0, st.door.rotation.y - dt * 2.6); const sp = Math.min(14, 2 + st.t * 4); B.position.x -= sp * dt; spin(sp * dt * 1.6); if (B.position.x < st.to - 90) { B.visible = false; st.mode = "idle"; B.position.x = st.from; } }
  }

  /* ------------------------------------------------------------ body language: actions, talking mouths, walking styles */
  private actOwners: Person[] = [];
  private ensureAct(p: Person) {
    if (p.actTex) return; const t = new THREE.CanvasTexture(bakeActions(p.look)); t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1 / POSE_KEYS.length, 1); t.anisotropy = 4; p.actTex = t; this.actOwners.push(p);
    if (this.actOwners.length > 14) { const o = this.actOwners.shift()!; if (o !== this.player && !o.act) { o.actTex?.dispose(); o.actTex = undefined; } else this.actOwners.push(o); }
  }
  /** play a named action on a person (ignored while they are walking, sitting or already doing something) */
  playAction(p: Person, name: string): boolean {
    if (!ACTIONS[name] || (p.act && !p.act.auto) || p.moving) return false; if (p === this.player && this.sitting != null) return false;
    this.ensureAct(p); p.act = { name, t: 0 }; return true;
  }
  /** the player's emote: stops walking first */
  emote(name: string) { if (this.nav) this.cancelNav(); if (this.sitting != null) this.standUp(); this.player.moving = false; return this.playAction(this.player, name); }
  /** make an NPC react (used by conversations): by roster id */
  react(id: number, name: string) { const p = this.persons().find((q) => q.def?.id === id) ?? (id === 11 ? this.player : undefined); return p ? this.playAction(p, name) : false; }
  setGait(name: string) { if (GAITS[name]) { this.player.gait = name; try { localStorage.setItem("unify.gait", name); } catch { /* private mode */ } } }
  get gait() { return this.player.gait ?? "steady"; }
  private applyBody(p: Person, dt: number, isPlayer: boolean) {
    const base = p.baseScale; if (!base) return; const seated = isPlayer && this.sitting != null;
    let a = p.act ?? null; if (!a && p.speaking && !p.moving && !seated) { a = p.act = { name: "talk", t: 0, auto: true }; } if (a && a.auto && !p.speaking) { p.act = a = null; }
    if (a && (p.moving || seated)) { p.act = a = null; }
    if (a) { const A = ACTIONS[a.name]; a.t += dt; if (!A.loop && a.t >= A.dur) { p.act = a = null; } }
    let mv: { y?: number; x?: number; roll?: number; sy?: number } = {};
    if (a) { const A = ACTIONS[a.name]; const key = frameAt(A, a.t); this.ensureAct(p); p.mat.map = p.actTex!; p.actTex!.offset.set(POSE_IX[key] / POSE_KEYS.length, 0); mv = A.move?.(A.loop ? a.t % A.dur : a.t) ?? {}; }
    else if (!isPlayer && p.mat.map !== p.tex) p.mat.map = p.tex;
    let y = mv.y ?? 0, x = mv.x ?? 0, roll = mv.roll ?? 0, sy = mv.sy ?? 1;
    if (!a && p.moving && !seated) { const g = GAITS[p.gait ?? "steady"] ?? GAITS.steady, ph = this.t * 9 * g.stepHz; y += Math.abs(Math.sin(ph)) * g.bounce; roll += Math.sin(ph) * g.sway; sy *= 1 - g.squash * Math.abs(Math.cos(ph)); }
    const e = this.camera.matrixWorld.elements; p.sprite.position.x += e[0] * x; p.sprite.position.z += e[2] * x; p.sprite.position.y += y; p.mat.rotation = roll; p.sprite.scale.set(base.x, base.y * sy, 1);
  }
  /** idle people fidget in their own way */
  private fidget(s: Stu, dt: number) {
    if (s.hidden || s.path.length || s.pending || s.talking || s.act || !s.def) return; s.fidgetT = (s.fidgetT ?? 6) - dt; if (s.fidgetT > 0) return;
    s.fidgetT = rnd(7, 18); const list = FIDGETS[s.def.personality] ?? ["wave", "nod"]; this.playAction(s, list[Math.floor(Math.random() * list.length)]);
  }
  private patrol(dt: number, fwd: THREE.Vector3) {
    for (const w of this.walkers) {
      const m = w.p; if (m.talking) { m.moving = false; m.frame = 0; continue; }
      if (!w.path.length) { const gx = Math.floor(m.pos.x + W / 2), gy = Math.floor(m.pos.z + H / 2), [tx, ty] = w.stops[w.leg]; w.leg = (w.leg + 1) % w.stops.length; w.path = astar(NAV, Math.max(0, Math.min(W - 1, gx)), Math.max(0, Math.min(H - 1, gy)), tx, ty).map((t) => g2w(t.x + 0.5, t.y + 0.5)); }
      const tgt = w.path[0]; if (!tgt) { m.moving = false; m.frame = 0; continue; }
      const d = tgt.clone().sub(m.pos); d.y = 0; const len = d.length(), step = w.speed * dt;
      if (len <= step) { m.pos.copy(tgt); w.path.shift(); m.moving = true; } else { d.normalize(); const go = this.steer(m, d, dt, w as unknown as { waitT: number }); if (go) { m.pos.addScaledVector(d, step); m.dir = this.dirFrom(d, fwd, m.dir); m.moving = true; } else m.moving = false; }
      m.frame = m.moving ? 1 + (Math.floor(this.t * 5) % 4) : 0;
    }
  }
  private setFrame(p: Person, dirIdx: number, frame: number) {
    const seated = p === this.player && this.sitting != null && !!p.sitTex, tx = seated ? p.sitTex! : p.tex; if (p === this.player && p.mat.map !== tx) { p.mat.map = tx; }
    tx.offset.set((seated ? 0 : frame) / COLS, 1 - (dirIdx + 1) / DIRS.length);
  }
  /** choose down/up/left/right relative to the camera from a world-space velocity */
  /** facing index for a world-space direction, relative to where the camera looks */
  faceDir(v: THREE.Vector3, keep: number) { const f = new THREE.Vector3(); this.camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-4) f.set(0, 0, -1); return this.dirFrom(v, f.normalize(), keep); }
  private dirFrom(v: THREE.Vector3, fwd: THREE.Vector3, keep: number) {
    const a = v.x * fwd.x + v.z * fwd.z, b = v.x * -fwd.z + v.z * fwd.x; if (Math.hypot(a, b) < 1e-3) return keep;
    return Math.abs(a) >= Math.abs(b) ? (a > 0 ? 1 : 0) : b > 0 ? 3 : 2;
  }

  /** everyone currently on screen */
  persons(): Person[] { return [...this.students.filter((s) => !s.hidden), this.monitor, this.teacher, ...this.duty]; }
  private ray = new THREE.Raycaster();
  /** tap/click: a person (sprite hit, else the nearest to the ray) or a spot on the floor to walk to */
  private handleTap(cx: number, cy: number) {
    const r = this.renderer.domElement.getBoundingClientRect(), nd = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); this.ray.setFromCamera(nd, this.camera);
    const people = this.persons(), hits = this.ray.intersectObjects(people.map((p) => p.sprite).filter((sp) => sp.visible), false);
    let who: Person | null = hits.length ? people.find((p) => p.sprite === hits[0].object) ?? null : null;
    if (!who) { let best = 0.85; for (const p of people) { const c = p.pos.clone().multiplyScalar(IS).setY(0.8 * AGE_SCALE[p.look.age ?? "hs"] + 0.2), d = this.ray.ray.distanceToPoint(c); if (d < best) { best = d; who = p; } } }
    if (who) { this.onTap(who); return; }
    const sh = this.ray.intersectObjects(this.seats.map((q) => q.mesh), false); if (sh.length && sh[0].distance < 70) { this.sitAt(sh[0].object.userData.seat); return; }
    const dh = this.ray.intersectObjects(this.doorHits, false); if (dh.length && dh[0].distance < 110) { this.goTo(String(dh[0].object.userData.room)); return; }   // tap a door: walk to it (it opens as you arrive)
    const art = this.ray.intersectObjects([...this.hallPics, ...(this.tvScreen ? [this.tvScreen] : [])], false);
    if (art.length && art[0].distance < (art[0].object === this.tvScreen ? 90 : 60)) { const o = art[0].object; if (o === this.tvScreen) { this.onTV(); return; } const u = o.userData; this.onPic(u.pid, u.title, u.subject); return; }
    this.onTap(null);
    const hit = new THREE.Vector3(); if (this.view !== "first" && this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) this.walkToPoint(hit.x / IS + W / 2, hit.z / IS + H / 2, "that spot");
  }
  /* ---- the news TV: mounted high on the corner of the math block, facing the main plaza ---- */
  private tvCv!: HTMLCanvasElement; private tvI = 0; private tvAt = 0; private tvTex!: THREE.CanvasTexture;
  private newsTv: ReturnType<typeof createNewsTV> | null = null; private newsTvTex: THREE.CanvasTexture | null = null;
  private buildNewsTV() {
    const pos = g2w(28, 15.6), cv = this.tvCv = document.createElement("canvas"); cv.width = 1024; cv.height = 576; this.tvTex = new THREE.CanvasTexture(cv); this.tvTex.colorSpace = THREE.SRGBColorSpace; this.tvTex.anisotropy = 4;
    const g = new THREE.Group(), dark = this.plain("#2b2b34"), wood = this.plain("#9A653D"), cream = this.plain("#E9DFC9"), steel = this.plain("#8a8a96");
    // a rolling AV cart: two shelves, four legs, little wheels
    for (const [sx, sz] of [[-0.8, -0.5], [0.8, -0.5], [-0.8, 0.5], [0.8, 0.5]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), steel); leg.position.set(sx, 0.55, sz); leg.castShadow = true; g.add(leg); const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 10), dark); wh.rotation.z = Math.PI / 2; wh.position.set(sx, 0.1, sz); g.add(wh); }
    const sh1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.07, 1.2), wood); sh1.position.y = 0.4; sh1.castShadow = true; g.add(sh1); const sh2 = sh1.clone(); sh2.position.y = 1.05; g.add(sh2);
    // the box TV: a chunky CRT cabinet with a bezel, a curved-looking screen, knobs and rabbit ears
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.25, 1.1), cream); body.position.set(0, 1.72, 0); body.castShadow = true; g.add(body);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.55), cream); back.position.set(0, 1.72, -0.75); g.add(back);
    const bez = new THREE.Mesh(new THREE.BoxGeometry(1.34, 1.0, 0.06), dark); bez.position.set(-0.12, 1.74, 0.56); g.add(bez);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ map: this.tvTex, toneMapped: false })); if (this.px) (sc.material as THREE.MeshBasicMaterial).color.setScalar(1.5); sc.position.set(-0.12, 1.74, 0.6); g.add(sc); this.tvScreen = sc;
    for (let i = 0; i < 2; i++) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), dark); k.rotation.x = Math.PI / 2; k.position.set(0.66, 2.0 - i * 0.28, 0.58); g.add(k); }
    for (let i = 0; i < 5; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.02), dark); sl.position.set(0.66, 1.5 - i * 0.04, 0.57); g.add(sl); }
    for (const sgn of [-1, 1]) { const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.95, 5), steel); ear.position.set(sgn * 0.28, 2.65, -0.1); ear.rotation.z = -sgn * 0.5; g.add(ear); }
    const ant = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), steel); ant.position.set(0, 2.38, -0.1); g.add(ant);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: T.signTex("WIRED NEWS: TAP", "#E07A66"), transparent: true })); plate.position.set(0, 0.78, 0.62); g.add(plate);
    // the cable: out of the back, down to the floor, then a long run north toward the auditorium stairs (it is wired in)
    const cp = [new THREE.Vector3(0, 1.7, -1.0), new THREE.Vector3(0, 1.0, -1.5), new THREE.Vector3(0, 0.05, -1.9), new THREE.Vector3(0.4, 0.04, -3.5), new THREE.Vector3(-0.3, 0.04, -5.8), new THREE.Vector3(0.2, 0.04, -8.2), new THREE.Vector3(0, 0.04, -9.5)];
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cp), 40, 0.035, 5), dark); g.add(cable);
    g.position.copy(pos); this.scene.add(g);
    void loadNews(); onNews(() => this.drawTV()); this.drawTV(); setInterval(() => this.drawTV(), 200);
    // the newsroom broadcast (papercut field reports) replaces the old headline card; falls back to it if the broadcast fails
    try {
      const ntv = createNewsTV({ width: 512, height: 288 }), a = (this.player?.look?.age ?? "hs") as string; ntv.setAudienceHS(a === "hs" || a === "adult");
      const nt = new THREE.CanvasTexture(ntv.canvas); nt.colorSpace = THREE.SRGBColorSpace; nt.generateMipmaps = false; nt.minFilter = THREE.LinearFilter;
      (this.tvScreen.material as THREE.MeshBasicMaterial).map = nt; (this.tvScreen.material as THREE.MeshBasicMaterial).needsUpdate = true;
      this.newsTv = ntv; this.newsTvTex = nt;
    } catch { /* keep the headline card */ }
  }
  private drawTV() {
    const c = this.tvCv.getContext("2d")!, w = 1024, h = 576, now = Date.now(), its = newsItems(); if (now - this.tvAt > 8000) { this.tvAt = now; this.tvI = (this.tvI + 1) % Math.max(1, its.length); } const it = its[this.tvI % its.length];
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#12233a"); g.addColorStop(1, "#1f3a5c"); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = "#E07A66"; c.fillRect(0, 0, w, 84); c.fillStyle = "#fff"; c.font = "700 46px 'Trebuchet MS',sans-serif"; c.textAlign = "left"; c.fillText("UNIFY NEWS", 28, 58);
    c.fillStyle = newsIsLive() ? "#2f7a4c" : "#8a5f1c"; c.beginPath(); c.roundRect(w - 270, 20, 242, 44, 22); c.fill(); c.fillStyle = "#fff"; c.font = "700 24px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText(newsIsLive() ? "LIVE HEADLINES" : "SCHOOL BULLETIN", w - 149, 51);
    c.textAlign = "left"; c.fillStyle = "#f8d977"; c.font = "700 26px 'Trebuchet MS',sans-serif"; c.fillText(it.tag, 36, 134);
    const wrap = (txt: string, font: string, maxW: number, maxL: number) => { c.font = font; const words = txt.split(/\s+/), out: string[] = []; let cur = ""; for (const wd of words) { const tst = cur ? cur + " " + wd : wd; if (c.measureText(tst).width > maxW && cur) { out.push(cur); cur = wd; if (out.length >= maxL) break; } else cur = tst; } if (cur && out.length < maxL) out.push(cur); return out; };
    const tl = wrap(it.title, "700 50px 'Trebuchet MS',sans-serif", w - 72, 4); c.fillStyle = "#fff"; c.font = "700 50px 'Trebuchet MS',sans-serif"; tl.forEach((l, i) => c.fillText(l, 36, 196 + i * 58)); const ty = 196 + tl.length * 58 + 12;
    c.fillStyle = "#cfe3f5"; wrap(it.sub, "400 28px 'Trebuchet MS',sans-serif", w - 72, 3).forEach((l, i) => { if (ty + i * 36 < h - 70) { c.font = "400 28px 'Trebuchet MS',sans-serif"; c.fillText(l, 36, ty + i * 36); } });
    c.fillStyle = "#0b1626"; c.fillRect(0, h - 56, w, 56); c.font = "600 26px 'Trebuchet MS',sans-serif"; const line = its.map((x) => x.title).join("   •   "), lw = c.measureText(line).width + 120, off = -((now / 40) % lw); c.fillStyle = "#f8d977"; c.fillText(line + "   •   " + line, off, h - 18);
    for (let i = 0; i < Math.min(12, its.length); i++) { c.fillStyle = i === this.tvI % its.length ? "#E07A66" : "rgba(255,255,255,.3)"; c.beginPath(); c.arc(w - 40 - i * 22, 112, 6, 0, 7); c.fill(); }
    this.tvTex.needsUpdate = true;
  }
  /** walk the player to a floor point (grid units), snapping to the nearest open tile */
  walkToPoint(gx: number, gy: number, label = "there") {
    if (this.inputLocked) return false;
    let best: { x: number; y: number } | null = null, bd = 1e9; const tx = Math.floor(gx), ty = Math.floor(gy);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= W || y >= H || NAV[y][x] !== ".") continue; const d = Math.hypot(x + 0.5 - gx, y + 0.5 - gy); if (d < bd) { bd = d; best = { x, y }; } }
    if (!best || bd > 2.2) return false; return this.planNav(best.x + 0.5, best.y + 0.5, label, null);
  }
  /** swap the player's look (avatar creator) */
  setAvatar(spec: AvatarSpec) {
    const old = this.player, pos = old.pos.clone(); this.scene.remove(old.sprite, old.blob); old.tex.dispose(); old.mat.dispose();
    this.beam?.setColor(spec.shirt); this.playerSpec = spec;
    this.player = this.makePerson(11, Events.dress({ ...toLook(spec, 11), tag: true }, 11, true)); this.player.pos.copy(pos); this.player.dir = old.dir; this.player.def = undefined;
  }

  /* ------------------------------------------------------------ doors, navigation */
  /* ---- a locker you open really opens: its door swings out and you see the shelf inside ---- */
  private lockDoor: { g: THREE.Group; pv: THREE.Group; st: DoorState; closing: boolean } | null = null;
  lockerOpen(sl: { cx: number; cy: number; face: string; n?: number } | null) {
    const L = this.lockDoor; if (!sl) { if (L) L.closing = true; return; } if (L) { this.scene.remove(L.g); this.lockDoor = null; }
    const g = new THREE.Group(), p = g2w(sl.cx, sl.cy), nrm = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] }[sl.face as "S"] ?? [0, 1]; g.position.set(p.x, 0, p.z); g.rotation.y = Math.atan2(nrm[0], nrm[1]);
    const cv = document.createElement("canvas"); cv.width = 128; cv.height = 256; const c = cv.getContext("2d")!; c.fillStyle = "#26242e"; c.fillRect(0, 0, 128, 256); c.fillStyle = "#4d4a5a"; for (const y of [60, 150]) c.fillRect(6, y, 116, 7);
    c.fillStyle = "#E07A66"; c.fillRect(14, 22, 26, 38); c.fillStyle = "#4F91C7"; c.fillRect(42, 28, 22, 32); c.fillStyle = "#EAB94E"; c.fillRect(70, 34, 40, 26); c.fillStyle = "#88B89A"; c.fillRect(20, 112, 50, 38); c.fillStyle = "#F3E7CF"; c.fillRect(82, 100, 30, 50); c.fillStyle = "rgba(255,255,255,.15)"; c.fillRect(0, 0, 128, 256);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 1.72), new THREE.MeshBasicMaterial({ map: tx })); inner.position.set(0, 0.98, 0.012); g.add(inner);
    const pv = new THREE.Group(); pv.position.set(-0.45, 0, 0.03); const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.72, 0.04), this.plain(LOCKER_COL[(sl.n ?? 0) % LOCKER_COL.length])); leaf.position.set(0.45, 0.98, 0); leaf.castShadow = true; pv.add(leaf);
    const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshBasicMaterial({ color: 0x3b3340 })); vent.position.set(0.45, 1.45, 0.022); pv.add(vent); g.add(pv); this.scene.add(g);
    this.lockDoor = { g, pv, st: new DoorState(1 / 0.5, 0.25), closing: false };
  }
  private tickLocker(dt: number) { const L = this.lockDoor; if (!L) return; if (!L.closing) L.st.request(); L.st.update(dt); L.pv.rotation.y = -L.st.eased * 1.9; if (L.closing && L.st.closed) { this.scene.remove(L.g); this.lockDoor = null; } }
  /** coming back from a room: the door opens and the player walks out of it (no teleport) */
  placeAtDoor(room: string) {
    const d = this.door(room === "news" ? "news" : room === "open" ? "open" : (DOORS.find((x) => x.subject === room) ?? DOORS[0]).subject); this.peek = null; this.hidePeek(); this.inDoor = d.room as Room; this.nav = null; this.navLabel = ""; this.onToast("");
    this.player.pos.copy(d.inside); this.player.dir = 0; this.inputLocked = false; this.arrivalHide = true;
    this.cine = { speed: 2.4, pts: [d.thr.clone(), d.approach.clone()], gate: { door: d, left: 2 }, hideWait: true, done: () => { this.cine = null; this.arrivalHide = false; } };
  }
  /* ---- player at a door: step back, the door swings open, the camera comes to the doorway so you see into the room, a name card shows, then you walk in ---- */
  private peek: { door: HallDoor; phase: 0 | 1 | 2 | 3 | 4; t: number } | null = null; private peekEl: HTMLElement | null = null;
  private startPeek(room: Room) {
    if (this.peek || this.cine) { this.inDoor = room; return; }
    const door = this.door(room), P = this.player; this.inDoor = room; this.nav = null; this.navLabel = ""; this.onToast(""); this.standUp(); this.inputLocked = true; this.peek = { door, phase: 0, t: 0 };
    this.cine = { pts: [door.approach.clone()], speed: 3.4, done: () => { this.cine = null; if (this.peek) { this.peek.phase = 1; this.peek.t = 0; } } };
    P.dir = this.dirFrom(new THREE.Vector3(-door.nx, 0, -door.nz), this.camFwd(), P.dir);
  }
  private camFwd() { const f = new THREE.Vector3(); this.camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-4) f.set(0, 0, -1); return f.normalize(); }
  private tickPeek(dt: number) {
    const k = this.peek; if (!k) return; k.t += dt; if (k.phase >= 1 && k.phase <= 3) k.door.st.request(0.6);
    if (k.phase === 1 && k.door.st.ready && k.t > 0.35) { k.phase = 2; k.t = 0; this.showPeek(k.door); }
    else if (k.phase === 2 && k.t > 1.15) { k.phase = 3; k.t = 0; this.cine = { speed: 2.3, pts: [k.door.thr.clone(), k.door.inside.clone()], done: () => { this.cine = null; this.arrivalHide = true; this.finishEnter(k.door); } }; }
    else if (k.phase === 3 && k.t > 0.25) this.hidePeek();
    else if (k.phase === 4 && k.t > 5) this.endPeek(k.door);   // the shell did not take us anywhere: walk back out
  }
  private finishEnter(door: HallDoor) {
    if (!this.peek) return; this.peek.phase = 4; this.peek.t = 0; this.enterDoor(door.room as Room);
    if (parent === window) setTimeout(() => this.endPeek(door), 1300);
  }
  private endPeek(door: HallDoor) { if (!this.peek) return; this.peek = null; this.hidePeek(); this.player.pos.copy(door.inside); this.arrivalHide = true; this.cine = { speed: 2.4, pts: [door.thr.clone(), door.approach.clone()], gate: { door, left: 2 }, hideWait: true, done: () => { this.cine = null; this.arrivalHide = false; this.inputLocked = false; } }; }
  private showPeek(d: HallDoor) {
    const el = this.peekEl ??= (() => { const e = document.createElement("div"); e.className = "hall-peek"; e.style.cssText = "position:fixed;left:50%;bottom:13%;transform:translate(-50%,14px) scale(.95);opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;z-index:31;padding:10px 10px 8px;border-radius:18px;background:#F3E7CF;box-shadow:0 8px 28px rgba(40,25,15,.45);text-align:center;font:600 16px 'Fredoka','Trebuchet MS',system-ui,sans-serif;color:#4A3B3F"; document.body.appendChild(e); return e; })();
    el.innerHTML = ""; el.style.border = `3px solid ${d.accent}`; const cv = document.createElement("canvas"); cv.width = 384; cv.height = 288; cv.style.cssText = "display:block;width:min(44vw,320px);height:auto;border-radius:11px"; cv.getContext("2d")!.drawImage(peekCanvas(d.kind ?? "class", d.accent), 0, 0, 384, 288);
    const t = document.createElement("div"); t.textContent = d.title; t.style.cssText = `margin-top:6px;letter-spacing:.06em;color:${d.accent === "#EAB94E" ? "#8a5f1c" : "#4A3B3F"}`; const sub = document.createElement("div"); sub.textContent = "The door is open. Walking in..."; sub.style.cssText = "font-size:12px;font-weight:500;opacity:.75"; el.append(cv, t, sub);
    requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "translate(-50%,0) scale(1)"; });
  }
  private hidePeek() { const el = this.peekEl; if (el) { el.style.opacity = "0"; el.style.transform = "translate(-50%,10px) scale(.97)"; } }
  private clear(a: THREE.Vector3, b: THREE.Vector3) {
    const n = Math.ceil(a.distanceTo(b) / 0.25); for (let i = 1; i < n; i++) { const p = a.clone().lerp(b, i / n); if (solidAt(p.x + W / 2, p.z + H / 2, 0.3)) return false; } return true;
  }
  /** walk the player to a class door (and in), the plaza fountain, or the main entrance */
  goTo(key: string) {
    const door = DOORS.find((d) => d.subject === key), goal = door ? door.approach : key === "news" ? NEWS.approach : key === "open" ? { x: 8, y: 22 } : key === "plaza" ? { x: 28, y: 18.8 } : key === "board" ? { x: 28, y: 17.4 } : { x: 28, y: 41.5 };
    const label = door ? `${door.subject === "careers" ? "CarryingCareers" : door.subject === "life" ? "Life Lessons" : SUBJ_LABEL[door.subject]} classroom` : key === "news" ? "the auditorium stairs" : key === "open" ? "The Open Door" : key === "plaza" ? "the plaza fountain" : key === "board" ? "the class-times bulletin board" : "the main entrance";
    const tail = door ? g2w(door.cx, door.cy + (door.face === "S" ? 0.5 : -0.5)) : key === "news" ? g2w(NEWS.cx, 0.95) : key === "open" ? g2w(0.95, OPEN.cy) : null;
    if (key === "board" || key === "outside") { this.standUp(); if (this.planNav(ENTRANCE.tile.x + 0.5, ENTRANCE.tile.y - 0.5, label, null) || true) { const pts = this.nav?.pts ?? (this.nav = { pts: [], label }).pts; pts.push(g2w(28, H + 0.7), g2w(OUTSIDE.boardStand.x - 2.5, OUTSIDE.boardStand.y), g2w(OUTSIDE.boardStand.x, OUTSIDE.boardStand.y)); this.navLabel = label; } return; }
    if (this.planNav(goal.x, goal.y, label, tail)) { if (this.inDoor === (door?.subject ?? (key === "news" || key === "open" ? key : null))) this.inDoor = null; }
  }
  /** walk to the floor in front of a locker */
  goToSlot(sl: { fx: number; fy: number; id: number }) { this.planNav(sl.fx, sl.fy, `locker ${sl.id}`, null); }
  private beacon: THREE.Group | null = null;
  /** a glowing light pillar and bobbing arrow over the auditorium ("news"), "open" or a class door; null removes it */
  setBeacon(key: string | null) {
    if (this.beacon) { this.scene.remove(this.beacon); this.beacon = null; }
    if (!key) return;
    const door = DOORS.find((d) => d.subject === key), p = door ? g2w(door.cx, door.cy) : key === "news" ? g2w(NEWS.cx, 0.8) : key === "open" ? g2w(0.8, OPEN.cy) : null; if (!p) return;
    const g = new THREE.Group(), mat = (o: number) => new THREE.MeshBasicMaterial({ color: 0xffd45e, transparent: true, opacity: o, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 5, 16, 1, true), mat(0.3)); pil.position.y = 2.5; g.add(pil);
    const arr = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xffb800, toneMapped: false })); arr.rotation.x = Math.PI; arr.name = "arr"; g.add(arr);
    g.position.set(p.x, 0, p.z); this.scene.add(g); this.beacon = g;
  }
  private lockerMark: THREE.Mesh | null = null;
  /** a gold name plate on the player's locker (null removes it) */
  setMyLocker(sl: { cx: number; cy: number; face: string } | null, name: string) {
    if (this.lockerMark) { this.scene.remove(this.lockerMark); (this.lockerMark.material as THREE.MeshBasicMaterial).map?.dispose(); this.lockerMark = null; }
    if (!sl) return;
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 96; const c = cv.getContext("2d")!;
    c.fillStyle = "#EAB94E"; c.beginPath(); c.roundRect(4, 4, 248, 88, 18); c.fill(); c.lineWidth = 6; c.strokeStyle = "#8a5f1c"; c.stroke(); c.fillStyle = "#4A3B3F"; c.font = "700 40px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText((name || "Mine").slice(0, 10), 128, 50);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.32), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    const pos = g2w(sl.cx, sl.cy), off = 0.03; m.position.set(pos.x, PROP_H.locker - 0.2, pos.z);
    if (sl.face === "S") { m.position.z += off; } else if (sl.face === "N") { m.position.z -= off; m.rotation.y = Math.PI; } else if (sl.face === "E") { m.position.x += off; m.rotation.y = Math.PI / 2; } else { m.position.x -= off; m.rotation.y = -Math.PI / 2; }
    this.scene.add(m); this.lockerMark = m;
  }
  /** A* to a grid point, smoothed into straight legs; `tail` is an extra last step (into a doorway) */
  planNav(gxGoal: number, gyGoal: number, label: string, tail: THREE.Vector3 | null) {
    if (this.sitting != null) this.standUp();
    const P = this.player.pos, sx = Math.max(0, Math.min(W - 1, Math.floor(P.x + W / 2))), sy = Math.max(0, Math.min(H - 1, Math.floor(P.z + H / 2)));
    const tiles = astar(NAV, sx, sy, Math.floor(gxGoal), Math.floor(gyGoal));
    if (!tiles.length && !(sx === Math.floor(gxGoal) && sy === Math.floor(gyGoal))) { this.onToast("No path found from here"); return false; }
    const raw = [P.clone().setY(0), ...tiles.slice(0, -1).map((t) => g2w(t.x + 0.5, t.y + 0.5)), g2w(gxGoal, gyGoal)], pts: THREE.Vector3[] = [];
    for (let i = 0; i < raw.length - 1;) { let j = raw.length - 1; while (j > i + 1 && !this.clear(raw[i], raw[j])) j--; pts.push(raw[j]); i = j; }
    if (tail) pts.push(tail);
    this.nav = { pts, label }; this.navLabel = label; if (label !== "that spot" && label !== "there") this.onToast(`Walking to ${label}… (move to cancel)`); return true;
  }
  cancelNav() { if (this.nav) { this.nav = null; this.navLabel = ""; this.onToast(""); } }
  get walking() { return !!this.nav; }
  private enterDoor(subject: Room) {
    this.inDoor = subject;
    const si = SUBJECTS.indexOf(subject as Subject), swap = PERIODS[Math.max(0, this.idx)].swap ? 1 : 0, attendees = subject === "news" || subject === "open" ? [] : this.students.filter((_, n) => (n + swap) % 4 === si).map((x) => x.def!.id);
    if (parent !== window) parent.postMessage({ type: "unify:enter", subject, room: subject, attendees }, "*"); else this.onToast(`${subject === "open" ? "The Open Door" : subject === "news" ? "Auditorium" : (subject === "careers" ? "CarryingCareers" : subject === "life" ? "Life Lessons" : SUBJ_LABEL[subject]) + " auditorium"}: open index.html to go inside`);
  }

  /* ------------------------------------------------------------ schedule -> student intents */
  private enterPeriod(i: number) {
    const P = PERIODS[i], spots = shuffle(this.open), pt = { x: Math.floor(this.player.pos.x + W / 2), y: Math.floor(this.player.pos.z + H / 2) };
    const near = shuffle(this.open.filter((t) => Math.hypot(t.x - pt.x, t.y - pt.y) <= 3.6 && Math.hypot(t.x - pt.x, t.y - pt.y) >= 1.2)); let ni = 0, order = 0;
    const entTile = { x: 28, y: H - 3 }, exit = (s: Stu) => (s.hidden ? "exit" as const : undefined);
    if (P.kind === "arrive" || P.kind === "dismiss") this.callBus();
    const queue = shuffle(this.students.map((_, k) => k));
    this.students.forEach((s, n) => {
      this.clearPass(s);
      if (P.kind === "class") { const d = DOORS[(n + (P.swap ? 1 : 0)) % 4], t = { x: Math.floor(d.approach.x), y: Math.floor(d.approach.y) }, rec = this.door(d.subject); s.lastDoor = t; s.lastDoorRec = rec; if (s.hidden) s.pending = null; else s.pending = { delay: rnd(0, 8), dest: t, hide: true, mode: "enter", door: rec }; }
      else if (P.kind === "lunch") { const buddy = s.def && Social.peek(s.def.id)?.lunchBuddy && near[ni]; s.pending = { delay: rnd(0, 10), dest: buddy ? near[ni++] : spots[n], hide: false, mode: exit(s), door: s.lastDoorRec ?? undefined }; }
      else if (P.kind === "arrive") { s.hidden = true; s.sprite.visible = false; s.blob.visible = false; s.path = []; s.pending = { delay: 1.2 + queue.indexOf(n) * 1.0 + rnd(0, 0.5), dest: spots[n], hide: false, mode: "bus-in" }; order++; }
      else s.pending = { delay: 1.5 + queue.indexOf(n) * 0.9 + rnd(0, 0.5), dest: entTile, hide: true, mode: "bus-out", door: s.lastDoorRec ?? undefined };
    });
    void order;
  }
  private show(s: Stu) { s.hidden = false; s.sprite.visible = true; s.blob.visible = true; s.fade = 0; s.mat.opacity = 0; }
  private hideNow(s: Stu) { s.hidden = true; s.sprite.visible = false; s.blob.visible = false; s.moving = false; s.busTrip = false; s.ghost = false; }
  private clearPass(s: Stu) { if (s.pass) s.pass.door.occ.delete(s.id); s.pass = null; s.ghost = false; }
  private pathTo(s: Stu, dest: { x: number; y: number }) {
    const sx = Math.min(W - 1, Math.max(0, Math.floor(s.pos.x + W / 2))), sy = Math.min(H - 1, Math.max(0, Math.floor(s.pos.z + H / 2)));
    s.path = astar(NAV, sx, sy, dest.x, dest.y).map((t) => g2w(t.x + 0.5, t.y + 0.5)); s.moving = s.path.length > 0;
  }
  /** where the school bus door is right now (design units); kids step out / climb in here */
  private busDoorPos() { const B = this.bus!; return new THREE.Vector3(B.position.x - 3.0, 0, B.position.z - 1.5); }
  private begin(s: Stu) {
    const p = s.pending!; s.pending = null; this.clearPass(s); const ent = this.entDoor, V = THREE.Vector3;
    if (p.mode === "bus-in") {                     // step off the bus, walk the sidewalk, queue at the entrance doors, go in
      const bd = this.busDoorPos(); s.pos.copy(bd); this.show(s); s.busTrip = true; s.hideOnArrive = false;
      s.path = [new V(bd.x, 0, H / 2 + 4.7), new V(ent.out!.x + 1.6, 0, H / 2 + 3.5), ent.out!.clone()]; s.moving = true;
      s.pass = { door: ent, via: [ent.thr.clone(), ent.inside.clone()], stage: 0, hide: false, ghost: false, done: () => { s.busTrip = false; this.pathTo(s, p.dest); } };
    } else if (p.mode === "exit") {                // out of a classroom: wait hidden behind the door until it is open, then walk out through it
      const d = p.door ?? this.door("math"); s.pos.copy(d.inside); s.path = []; s.moving = false; s.hideOnArrive = false;
      s.pass = { door: d, via: [d.thr.clone(), d.approach.clone()], stage: 0, hide: false, ghost: true, done: () => this.afterExit(s, p) };
    } else if (p.mode === "enter") {               // to a classroom door: walk up, the door opens as they near it, they step in
      const d = p.door!; this.pathTo(s, p.dest); s.hideOnArrive = false; s.pass = { door: d, via: [d.thr.clone(), d.inside.clone()], stage: 0, hide: true, ghost: true };
    } else if (p.mode === "bus-out") {             // home: out the entrance, along the sidewalk, up the bus steps
      if (s.hidden && p.door) { s.pos.copy(p.door.inside); s.path = []; s.pass = { door: p.door, via: [p.door.thr.clone(), p.door.approach.clone()], stage: 0, hide: false, ghost: true, done: () => this.toBus(s, p) }; }
      else this.toBus(s, p);
    } else { this.pathTo(s, p.dest); s.hideOnArrive = p.hide; if (!s.path.length && p.hide) this.hideNow(s); }
  }
  private afterExit(s: Stu, p: NonNullable<Stu["pending"]>) { if (p.mode === "bus-out") this.toBus(s, p); else { this.pathTo(s, p.dest); s.hideOnArrive = p.hide; } }
  private toBus(s: Stu, p: NonNullable<Stu["pending"]>) {
    const ent = this.entDoor, bd = this.bus ? this.busDoorPos() : new THREE.Vector3(10, 0, H / 2 + 5.5); s.busTrip = true; this.pathTo(s, p.dest);
    s.pass = { door: ent, via: [ent.thr.clone(), ent.out!.clone(), new THREE.Vector3(bd.x + 0.6, 0, H / 2 + 3.6), new THREE.Vector3(bd.x, 0, H / 2 + 4.8), bd], stage: 0, hide: true, ghost: false };
  }
  /** door queue: wait at the approach (opening the door as they near it), go through one at a time once it is open */
  private stepPass(s: Stu) {
    const ps = s.pass; if (!ps) return; const d = ps.door;
    if (ps.stage === 1) { d.st.request(); return; }
    if (s.path.length || s.pending) { if (!s.hidden && Math.hypot(s.pos.x - d.x, s.pos.z - d.z) < 4) d.st.request(); return; }
    d.st.request();
    if (d.st.ready && (d.occ.size < d.cap || d.occ.has(s.id))) { d.occ.add(s.id); ps.stage = 1; s.path = ps.via.map((v) => v.clone()); s.moving = true; if (s.hidden) this.show(s); }
  }
  private pathDone(s: Stu) {
    const ps = s.pass; if (ps && ps.stage === 1) { ps.door.occ.delete(s.id); s.pass = null; s.ghost = false; if (ps.hide) { if (ps.door.room !== "entrance") s.lastDoorRec = ps.door; this.hideNow(s); } else ps.done?.(); return; }
    if (s.hideOnArrive) this.hideNow(s);
  }

  /* ------------------------------------------------------------ player + camera */
  private movePlayer(dt: number, fwd: THREE.Vector3) {
    const K = this.keys, ix = (K.d || K.arrowright ? 1 : 0) - (K.a || K.arrowleft ? 1 : 0) + this.input.x, iz = (K.s || K.arrowdown ? 1 : 0) - (K.w || K.arrowup ? 1 : 0) + this.input.y;
    const P = this.player, st = Math.sin(this.yaw), ct = Math.cos(this.yaw), manual = !this.inputLocked && !this.cine && Math.hypot(ix, iz) > 0.1;
    if (this.cine) {                                                // a scripted walk: ignore walls and input
      const c = this.cine, tgt = c.pts[0]; if (!tgt) { const dn = c.done; this.cine = null; dn?.(); return; }
      if (c.gate && c.pts.length === c.gate.left && !c.gate.door.st.ready) { c.gate.door.st.request(0.6); P.moving = false; P.frame = 0; if (c.hideWait) this.arrivalHide = true; return; }   // doors open before anybody goes through
      if (c.hideWait && c.gate && c.pts.length === c.gate.left) this.arrivalHide = false;
      const d = tgt.clone().sub(P.pos); d.y = 0; const len = d.length(), step = c.speed * dt; P.moving = true;
      if (len <= step) { P.pos.copy(tgt); c.pts.shift(); if (!c.pts.length) { P.moving = false; P.frame = 0; const dn = c.done; this.cine = null; dn?.(); } } else { d.normalize(); P.pos.addScaledVector(d, step); P.dir = this.dirFrom(d, fwd, P.dir); P.frame = 1 + (Math.floor(this.t * 9) % 4); }
      return;
    }
    if (this.sitting != null) {                                    // seated: face the table; any movement input stands up
      if (manual) this.standUp(); else { const s = this.seats[this.sitting], f = s.ctr.clone().sub(s.pos); f.y = 0; P.pos.copy(s.pos); P.dir = this.dirFrom(f, fwd, P.dir); P.moving = false; P.frame = 0; return; }
    }
    if (manual && this.nav) { this.cancelNav(); this.pendingSeat = null; }
    if (manual) {                                                  // controls follow the camera: up = away from the viewer
      const v = new THREE.Vector3(ct * ix + st * iz, 0, -st * ix + ct * iz).normalize().multiplyScalar(4 * dt); P.moving = true;
      const r = this.statics.slide(P.pos.x, P.pos.z, v.x, v.z, 0.3); P.pos.x = r.x; P.pos.z = r.z;   // slides along walls and furniture
      P.dir = this.dirFrom(v, fwd, P.dir); P.frame = 1 + (Math.floor(this.t * 9) % 4);
    } else if (this.nav) {
      const tgt = this.nav.pts[0], d = tgt.clone().sub(P.pos); d.y = 0; const len = d.length(), step = 4.6 * dt; P.moving = true;
      if (len <= step) { P.pos.copy(tgt); this.nav.pts.shift(); if (!this.nav.pts.length) { const label = this.nav.label; this.nav = null; this.navLabel = ""; if (this.pendingSeat != null) { this.sitting = this.pendingSeat; this.pendingSeat = null; this.ensureSitTex(P); this.onToast("Sitting at Chat Chow. Move to get up."); return; } if (![...DOORS, NEWS, OPEN].some((q) => hit(q.trigger, P.pos.x + W / 2, P.pos.z + H / 2))) this.onToast(`Arrived at ${label}`); } }
      else { d.normalize(); P.pos.addScaledVector(d, step); P.dir = this.dirFrom(d, fwd, P.dir); }
      P.frame = 1 + (Math.floor(this.t * 9) % 4);
    } else { P.moving = false; P.frame = 0; }
    const gx = P.pos.x + W / 2, gy = P.pos.z + H / 2, d = DOORS.find((q) => hit(q.trigger, gx, gy)) ?? (hit(NEWS.trigger, gx, gy) ? { subject: "news" as Room } : hit(OPEN.trigger, gx, gy) ? { subject: "open" as Room } : undefined);
    if (d && this.inDoor !== d.subject && !this.peek) this.startPeek(d.subject);
    else if (!d && this.inDoor) { const r = this.inDoor === "news" ? NEWS.trigger : this.inDoor === "open" ? OPEN.trigger : DOORS.find((x) => x.subject === this.inDoor)!.trigger, dist = Math.hypot(Math.max(r.x - gx, 0, gx - r.x - r.w), Math.max(r.y - gy, 0, gy - r.y - r.h)); if (dist > 0.35) this.inDoor = null; }
  }
  setView(v: ViewMode, instant = false) {
    this.view = v; this.zoom = 1; if (v === "overview") this.pitch = 1.0; else if (v === "close") this.pitch = 0.62; this.fpitch = 0;
    if (instant) this.updateCamera(1, true);
  }
  cycleView() { this.setView(this.view === "close" ? "overview" : this.view === "overview" ? "first" : "close"); return this.view; }
  private updateCamera(dt: number, snap = false) {
    const P = this.player.pos, st = Math.sin(this.yaw), ct = Math.cos(this.yaw); let pos: THREE.Vector3, look: THREE.Vector3;
    if (this.view === "close") { const ap = this.arrivalCam, pit = ap ? 1.05 : this.pitch, d = (ap ? 12 : 7.2) * this.zoom, cp = Math.cos(pit); pos = new THREE.Vector3(P.x + st * cp * d, 1.0 + Math.sin(pit) * d, P.z + ct * cp * d); look = new THREE.Vector3(P.x - st * 1.8, 1.0, P.z - ct * 1.8); }
    else if (this.view === "overview") { const d = 52 * this.zoom, cp = Math.cos(this.pitch); pos = new THREE.Vector3(st * cp * d, Math.sin(this.pitch) * d, ct * cp * d + 3); look = new THREE.Vector3(0, 0, 3); }
    else { const ey = 1.7; pos = new THREE.Vector3(P.x, ey, P.z); look = new THREE.Vector3(P.x - st * 6, ey + Math.tan(this.fpitch) * 6, P.z - ct * 6); }
    if (this.peek && this.peek.phase >= 1 && this.peek.phase <= 3) { const d = this.peek.door; pos = new THREE.Vector3(d.x + d.nx * 3.3, 1.75, d.z + d.nz * 3.3); look = new THREE.Vector3(d.x - d.nx * 1.5, 1.3, d.z - d.nz * 1.5); }   // dolly to the doorway: you see into the room through the open door
    const k = snap ? 1 : Math.min(1, dt * 9); this.camPos.lerp(pos, k); this.camLook.lerp(look, k); this.camera.position.copy(this.camPos).multiplyScalar(IS); this.camera.lookAt(this.camLook.clone().multiplyScalar(IS));
    // sun follows the action; the shadow box widens in overview
    const R = this.view === "overview" ? 40 : 22, c = this.view === "overview" ? new THREE.Vector3(0, 0, 3) : P;
    this.sun.target.position.copy(c); if (this.px) this.sun.position.set(c.x + 11, 9, c.z + 7); else this.sun.position.set(c.x + 7, 15, c.z + 9);   // Pixar: a low golden sun
    if (R !== this.shadowR) { this.shadowR = R; const sc = this.sun.shadow.camera; sc.left = -R * IS; sc.right = R * IS; sc.top = R * IS; sc.bottom = -R * IS; sc.updateProjectionMatrix(); }
  }
  /** walls/blocks standing between the camera and the player fade out so nobody is hidden */
  private fadeOccluders(dt: number) {
    const from = this.camera.position.clone().divideScalar(IS), to = this.player.pos.clone().setY(1.0), dir = to.clone().sub(from), len = dir.length(), ray = new THREE.Ray(from, dir.normalize()), tmp = new THREE.Vector3();
    for (const o of this.occl) {
      const blocking = this.view !== "first" && !!ray.intersectBox(o.box, tmp) && tmp.distanceTo(from) < len - 0.2, target = blocking ? 0.16 : 1;
      o.o += (target - o.o) * Math.min(1, dt * 9); const solid = o.o > 0.985;
      for (const m of o.mats) { m.opacity = solid ? 1 : o.o; m.transparent = !solid; m.depthWrite = solid; }
    }
  }

  /* ------------------------------------------------------------ frame */
  private lastClockMsg = 0; private todOverride: number | null = Mood.queryTod();
  private frame = (now: number) => {
    const raw = now - this.last, dt = Math.min(0.05, raw / 1000); this.last = now; this.t += dt; this.tickDecor(this.t); if (this.beacon) { const a = this.beacon.getObjectByName("arr"); if (a) { a.position.y = 3.6 + Math.sin(this.t * 4) * 0.25; a.rotation.y = this.t * 2; } } const sim = dt * this.speed;
    this.clock += sim; if (this.clock >= DAY) this.clock -= DAY;
    // the day's colour comes from Mood: school-day clock mapped to a sunrise-to-dusk hour, season and any palette the academy sent
    if (this.newsTv && this.newsTv.update(dt)) this.newsTvTex!.needsUpdate = true; Gfx.tick(raw); Mood.update(dt, this.todOverride ?? 6.8 + Math.min(1, Math.max(0, this.clock / DAY)) * 11.5); this.fx.tick(this.t, dt);

    if (parent !== window && now - this.lastClockMsg > 1000) { this.lastClockMsg = now; parent.postMessage({ type: "unify:clock", minutes: DAY_START + Math.floor(this.clock) }, "*"); }
    const idx = periodAt(this.clock); if (idx !== this.idx) { this.idx = idx; this.enterPeriod(idx); }
    const rot = this.inputLocked ? 0 : (this.keys.e ? 1 : 0) - (this.keys.q ? 1 : 0) + this.rotate; if (rot) this.yaw += rot * 1.9 * dt;
    const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
    this.syncBodies(this.everyone());
    for (const s of this.students) {
      if (s.pending && (!(s.pending.mode === "bus-in" || s.pending.mode === "bus-out") || this.busReady())) { s.pending.delay -= sim; if (s.pending.delay <= 0) this.begin(s); }
      this.stepPass(s); s.ghost = !!s.pass && s.pass.stage === 1 && s.pass.ghost;
      if (s.hidden) continue;
      if (s.talking) { s.moving = false; s.frame = 0; continue; }
      this.fidget(s, dt);
      if (s.act && !s.path.length) { s.moving = false; s.frame = 0; continue; }
      if (s.fade < 1) { s.fade = Math.min(1, s.fade + sim * 3); s.mat.opacity = s.fade; }
      if (s.path.length) {
        const tgt = s.path[0], d = tgt.clone().sub(s.pos); d.y = 0; const len = d.length(), step = s.speed * sim;
        if (len <= step) { s.pos.copy(tgt); s.path.shift(); s.moving = true; }
        else { d.normalize(); const go = s.ghost || this.steer(s, d, dt, s); if (go) { const ox = s.pos.x, oz = s.pos.z; s.pos.addScaledVector(d, step); if (!s.ghost && (this.statics.blocked((ox + s.pos.x) / 2, (oz + s.pos.z) / 2, 0.2) || this.statics.blocked(s.pos.x, s.pos.z, 0.2))) { const q = this.statics.push(s.pos.x, s.pos.z, 0.3); s.pos.x = q.x; s.pos.z = q.z; }   // never end a step inside a wall: route stays on the nav grid / door waypoints
           s.dir = this.dirFrom(d, fwd, s.dir); s.moving = true; } else s.moving = false; }
        if (s.moving) s.frame = 1 + (Math.floor((this.t * s.speed * 3.4)) % 4); else s.frame = 0;
        if (s.pass?.stage === 1 && s.pass.hide && s.path.length <= 1) { const l = s.path[0] ?? s.pos; s.mat.opacity = Math.min(1, Math.hypot(l.x - s.pos.x, l.z - s.pos.z) / 0.9 + 0.05); }   // fades as they step through / climb in
        if (!s.path.length) this.pathDone(s);
      } else { s.moving = false; s.frame = 0; }
    }
    this.patrol(sim, fwd);
    for (const f of this.onTick) f(dt, sim);
    this.movePlayer(dt, fwd); this.updateBus(dt); this.tickPeek(dt); this.tickLocker(dt); this.collideAll(); this.tickDoors(dt); tickTrees(this.t);
    this.updateCamera(dt);
    this.fadeOccluders(dt);
    this.player.sprite.visible = this.view !== "first" && !this.arrivalHide; this.player.blob.visible = this.view !== "first" && !this.arrivalHide;
    this.tickVisitors(dt);
    for (const p of [...this.students, this.player, this.monitor, this.teacher, ...this.duty, ...this.visitors.values()]) { if ((p as Stu).hidden) continue; p.sprite.position.copy(p.pos); if (this.view === "first" && p !== this.player) { const near = p.pos.distanceTo(this.camera.position.clone().divideScalar(IS)) < 1.1; p.sprite.visible = !near; p.blob.visible = !near; } else if (p !== this.player) { p.sprite.visible = true; p.blob.visible = true; } p.blob.position.set(p.pos.x, 0.02, p.pos.z); this.setFrame(p, p.dir, p.frame); this.applyBody(p, dt, p === this.player); }
    if (this.px) {   // real 3D characters for the player and whoever is near (sprites stay for the rest)
      this.px.tick(this.t, this.player.pos);
      this.px.crowd.update(dt, [this.player, ...this.students, this.monitor, this.teacher, ...this.duty], { player: this.player, playerSpec: this.playerSpec, camera: this.camera, shown: this.view !== "first" && !this.arrivalHide, first: this.view === "first", seat: this.sitting != null ? this.seats[this.sitting] : null, talkingTo: this.persons().find((q) => q.talking) ?? null });
    }
    const tg = PERIODS[this.idx].tint, k = Math.min(1, dt * 1.5); for (let i = 0; i < 4; i++) this.tint[i] += (tg[i] - this.tint[i]) * k;
    if (this.sitting != null) this.player.sprite.position.y -= 0.12;
    this.beam.update(this.t, this.camera, this.player.pos, this.view !== "first" && !this.arrivalHide, IS);
    if (!this.px?.render()) this.renderer.render(this.scene, this.camera); requestAnimationFrame(this.frame);
  };
}
const LAMP_COLS = ["#F8D977", "#F28F7E", "#8FC9E8", "#A9DCC0"];
const i2c = (n: number) => LAMP_COLS[Math.floor(n) % 4];
void LOCK_D;
