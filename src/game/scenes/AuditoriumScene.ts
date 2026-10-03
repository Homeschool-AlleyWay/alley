import Phaser from "phaser";
import { ATLAS, CHARACTER_SHEETS, ENV_KEYS, SEATVIEW_IMAGES } from "../assets/assetManifest";
import layoutJson from "../data/auditorium.layout.json";
import { SCREEN_FOR, STUDENT_IDS, TEACHER_FOR, type AuditoriumLayout, type FocusTarget, type Subject, type ViewMode } from "../types";
import { Actor, createAnims } from "../entities/Actor";
import { CollisionSystem } from "../systems/CollisionSystem";
import { SeatingSystem } from "../systems/SeatingSystem";
import { actorDepth, directionFromGrid, isoToScreen, screenInputToGrid } from "../systems/IsoMath";

const L = layoutJson as unknown as AuditoriumLayout;
import { VIRTUAL_INPUT } from "../input";
import { ensureSheet } from "../runtimeChars";
import { ROSTER, TEACHER_BY_SUBJECT, byId, type NpcDef } from "../../hall3d/roster";
import { Social } from "../../hall3d/social";
import { toLook } from "../../hall3d/avatar";
export { VIRTUAL_INPUT };
const SVX = 50000;                        // seat-view world is parked far to the right of the isometric world
const SV_W = 1280, SV_H = 720;
// seat-view focus presets (design px inside the 1280x720 illustration): [centerX, centerY, zoomMultiplier]
const SV_FOCUS: Record<FocusTarget, [number, number, number]> = { teacher: [470, 410, 2.1], board: [285, 240, 2.5], screen: [830, 185, 2.5], room: [640, 360, 1] };
const PLAYER_TIER = 3, PLAYER_ROW = 5;

export class AuditoriumScene extends Phaser.Scene {
  collision = new CollisionSystem(L);
  seating = new SeatingSystem(L.seats);
  npcs = new Map<string, Actor>();
  player!: Actor; teacher!: Actor;
  subject: Subject = "math";
  view: ViewMode = "iso"; freeLook = false; focusTarget: FocusTarget = "room"; seated = false; busy = false;
  teacherState = { action: "talk", target: "audience" };
  private roomObjs: Phaser.GameObjects.GameObject[] = [];
  private svObjs: Phaser.GameObjects.GameObject[] = [];
  private screens = new Map<string, Phaser.GameObjects.Image>();
  private svContent?: Phaser.GameObjects.Image; private svTeacher?: Phaser.GameObjects.Sprite; private svHands: Phaser.GameObjects.Sprite[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>; private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private evicting = new Set<string>(); private teacherRun = 0;
  /** who sits where (every seat is a unique, named classmate) and what the player looks like now */
  defOf = new Map<string, NpcDef>(); attendeeIds: number[] = []; ambientHands = true; private playerSig = "";
  private debug = new URLSearchParams(window.location.search).has("debug");
  constructor() { super("AuditoriumScene"); }

  // ------------------------------------------------------------------ loading
  private queueSheet(key: string) { const s = CHARACTER_SHEETS.find((x) => x.key === key); if (s && !this.textures.exists(key) && !this.load.textureManager.exists(key)) this.load.spritesheet(key, s.url, { frameWidth: s.fw, frameHeight: s.fh }); }
  private queueSubject(subject: Subject) {
    for (const k of [`sv_backdrop__${subject}`, `sv_foreground__${subject}`, ...L.screenKinds.map((s) => `sv_content_${s}`)]) {
      const im = SEATVIEW_IMAGES.find((i) => i.key === k); if (im && !this.textures.exists(k)) this.load.image(k, im.url);
    }
  }
  /** teachers are drawn by the same rig as everyone else (looks come from the roster) */
  private bakeTeacher(subject: Subject) {
    const t = TEACHER_FOR[subject], look = TEACHER_BY_SUBJECT[subject].look;
    for (const a of ["idle", "walk", "talk", "point", "boardwrite"]) ensureSheet(this, t, look, a);
    for (const a of ["idle", "talk", "point", "boardwrite"]) ensureSheet(this, t, look, "svt_" + a);
  }
  /** the player's avatar (customised in the creator) */
  bakePlayer(force = false) {
    const look = { ...toLook(Social.profile.avatar, 11), tag: false }, sig = JSON.stringify(look); if (!force && sig === this.playerSig) return false; const had = !!this.playerSig; this.playerSig = sig;
    if (had) this.player?.sprite.stop();
    for (const a of ["idle", "walk", "sit", "raisehand", "write"]) ensureSheet(this, "player_student", look, a, had);
    if (had && this.player) { this.player.sprite.setTexture(`player_student_${this.player.state === "walk" ? "walk" : this.player.state === "sit" ? "sit" : "idle"}`); this.player.play(this.seated ? "sit" : "idle", this.seated ? "up_left" : this.player.facing); }
    return true;
  }
  /** unique classmate sprites for a roster member (only the seated poses; walking is baked when they leave) */
  private bakeNpc(def: NpcDef, extra: string[] = []) { for (const a of ["sit", "write", "raisehand", ...extra]) ensureSheet(this, `npc${def.id}`, def.look, a); }
  private loadNow(): Promise<void> { return new Promise((res) => { if (!this.load.list.size) return res(); this.load.once("complete", () => { createAnims(this); res(); }); this.load.start(); }); }
  preload() {
    this.load.atlas(ATLAS.key, ATLAS.image, ATLAS.data);
    this.queueSubject("math");
  }

  create() {
    createAnims(this); this.bakePlayer(); this.bakeTeacher("math");
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,V,F,ONE,TWO,THREE,FOUR") as Record<string, Phaser.Input.Keyboard.Key>;
    this.buildRoom("math");
    this.spawnAudience();
    this.player = new Actor(this, "player", "player_student", L.playerSpawn.gx, L.playerSpawn.gy, 0);
    this.player.play("idle", "down");
    this.setupPointerCamera();
    this.setView("iso", true);
    if (this.debug) this.drawDebug();
    this.time.addEvent({ delay: 900, loop: true, callback: () => this.tickAudience() });
    (window as any).__unify = this;
  }

  // ------------------------------------------------------------------ room (iso world), rebuilt per subject
  private variant(key: string) { const v = `${key}__${this.subject}`; return ENV_KEYS.includes(v) ? v : key; }
  buildRoom(subject: Subject) {
    this.subject = subject;
    this.roomObjs.forEach((o) => o.destroy()); this.roomObjs = []; this.screens.clear();
    for (const p of [...L.placements, ...L.decor[subject]]) {
      const img = this.add.image(p.x, p.y, ATLAS.key, this.variant(p.key)).setOrigin(p.ox, p.oy).setDepth(p.depth);
      if (p.key === "light_pool_warm") img.setAlpha(0.9);
      if (p.screenContent) { img.setVisible(p.screenContent === SCREEN_FOR[subject]); this.screens.set(p.screenContent, img); }
      this.roomObjs.push(img);
    }
  }
  private centerOf(key: string) { const p = L.placements.find((q) => q.key === key)!, f = this.textures.getFrame(ATLAS.key, key); return { x: p.x + f.width / 2, y: p.y + f.height / 2 }; }

  // ------------------------------------------------------------------ subject / teacher
  async setSubject(subject: Subject) {
    this.teacherRun++;
    this.queueSubject(subject); await this.loadNow(); this.bakeTeacher(subject);
    this.buildRoom(subject); this.buildSeatView(subject);
    this.teacher?.sprite.destroy();
    const t = L.teacher;
    this.teacher = new Actor(this, "teacher", TEACHER_FOR[subject], t.gx, t.gy, t.elev, "talk");
    this.teacher.speed = 1.5; this.teacher.play("talk", "down_right");
    void this.teacherLoop(this.teacherRun);
    this.events.emit("subject", subject);
  }
  private wait(ms: number) { return new Promise<void>((r) => this.time.delayedCall(ms, r)); }
  private setTeacher(action: string, target: string) { this.teacherState = { action, target }; this.updateSvTeacher(); this.events.emit("teacher", this.teacherState); }
  private async teacherLoop(run: number) {
    const T = this.teacher, S = L.stations, home = L.teacher;
    while (run === this.teacherRun) {
      this.setTeacher("talk", "audience"); T.play("talk", "down_right"); await this.wait(4200); if (run !== this.teacherRun) return;
      this.setTeacher("walk", "screen"); await T.walkPath([{ gx: S.screen.gx + 0.9, gy: S.screen.gy }]); if (run !== this.teacherRun) return;
      this.setTeacher("point", "screen"); T.play("point", "up_left"); await this.wait(3600); if (run !== this.teacherRun) return;
      this.setTeacher("walk", "board"); await T.walkPath([{ gx: S.board.gx + 0.9, gy: S.board.gy }]); if (run !== this.teacherRun) return;
      this.setTeacher("boardwrite", "board"); T.play("boardwrite", "up_left"); await this.wait(4000); if (run !== this.teacherRun) return;
      this.setTeacher("walk", "audience"); await T.walkPath([{ gx: home.gx, gy: home.gy }]);
    }
  }
  setScreen(kind: string) {
    this.screens.forEach((im, k) => im.setVisible(k === kind));
    if (this.svContent && this.textures.exists(`sv_content_${kind}`)) this.svContent.setTexture(`sv_content_${kind}`);
  }

  // ------------------------------------------------------------------ seat view (first person illustration world)
  private buildSeatView(subject: Subject) {
    this.svObjs.forEach((o) => o.destroy()); this.svObjs = []; this.svHands = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { this.svObjs.push(o); return o; };
    add(this.add.image(SVX, 0, `sv_backdrop__${subject}`).setOrigin(0, 0).setScale(0.5).setDepth(0));
    this.svContent = add(this.add.image(SVX + 668, 92, `sv_content_${SCREEN_FOR[subject]}`).setOrigin(0, 0).setDisplaySize(324, 178).setDepth(1)) as Phaser.GameObjects.Image;
    // students in front (backs of heads), some with raised hands
    const xs = [120, 330, 860, 1080], tier = PLAYER_TIER, count = Math.min(xs.length, 1 + tier), pool = this.frontDefs();
    for (let i = 0; i < count; i++) {
      const def = pool[(i * 3 + 1) % pool.length], id = `npc${def.id}`, key = `sv_${id}_sit`; ensureSheet(this, id, def.look, "sv_sit"); ensureSheet(this, id, def.look, "sv_raisehand");
      if (!this.textures.exists(key)) continue;
      const sp = add(this.add.sprite(SVX + xs[i], 742, key, 0).setOrigin(0.5, 216 / 256).setScale(1.1).setDepth(5 + i)) as Phaser.GameObjects.Sprite;
      sp.play(`${key}:up`); this.svHands.push(sp); (sp as any).__id = id;
    }
    const NOTES: Record<Subject, string[]> = { math: ["Graphing a parabola", "1. Vertex = turning point", "2. Axis of symmetry", "3. Plot, then mirror"], ela: ["Finding the theme", "1. What happens?", "2. What changes?", "3. Back it up: evidence"], science: ["Plant cells", "1. Cell wall = support", "2. Chloroplasts = food", "3. Vacuole = storage"], history: ["Where & when?", "1. Locate it on the map", "2. Put it on the timeline", "3. Ask: who gained?"] };
    NOTES[subject].forEach((ln, i) => add(this.add.text(SVX + 150, 166 + i * 36, ln, { fontFamily: "'Comic Sans MS','Segoe Print',cursive", fontSize: i ? "21px" : "26px", color: i ? "#326C9E" : "#313A3F", fontStyle: i ? "normal" : "bold" }).setDepth(2)));
    add(this.add.image(SVX, 0, `sv_foreground__${subject}`).setOrigin(0, 0).setScale(0.5).setDepth(50));
    const t = TEACHER_FOR[subject];
    this.svTeacher = add(this.add.sprite(SVX + 470, 548, `sv_${t}_talk`, 0).setOrigin(0.5, 324 / 384).setScale(0.9).setDepth(10)) as Phaser.GameObjects.Sprite;
    this.updateSvTeacher();
    this.time.addEvent({ delay: 2600, loop: true, callback: () => { const s = Phaser.Utils.Array.GetRandom(this.svHands); if (!s) return; const id = (s as any).__id, k = `sv_${id}_raisehand`; if (this.textures.exists(k) && s.active) { s.play(`${k}:up`); s.once("animationcomplete", () => s.active && s.play(`sv_${id}_sit:up`)); } } });
  }
  private updateSvTeacher() {
    const sp = this.svTeacher; if (!sp?.active) return;
    const t = TEACHER_FOR[this.subject], { action, target } = this.teacherState;
    let anim = `sv_${t}_talk:down`, x = 470;
    if (action === "point") { anim = `sv_${t}_point:${target === "screen" ? "right" : "left"}`; x = target === "screen" ? 580 : 350; }
    else if (action === "boardwrite") { anim = `sv_${t}_boardwrite:up`; x = 350; }
    else if (action === "walk") { anim = `sv_${t}_idle:down`; x = target === "screen" ? 580 : target === "board" ? 350 : 470; }
    if (this.anims.exists(anim)) sp.play(anim);
    this.tweens.add({ targets: sp, x: SVX + x, duration: 1400, ease: "Sine.easeInOut" });
  }

  // ------------------------------------------------------------------ CAMERA: views, focus presets, free look
  private isoBounds() {
    const xs = L.placements.map((p) => p.x), ys = L.placements.map((p) => p.y);
    return { x: Math.min(...xs) - 700, y: Math.min(...ys) - 500, w: Math.max(...xs) - Math.min(...xs) + 1400, h: Math.max(...ys) - Math.min(...ys) + 1000 };
  }
  private fitZoom() {
    const w = this.scale.width, h = this.scale.height;
    if (this.view === "seat") return Math.max(w / SV_W, Math.min(h / SV_H, 0.55) , 0.5);
    const b = this.isoBounds(); return Math.max(0.45, Math.min(w / (b.w - 1000), h / (b.h - 700)) * 1.05);
  }
  setView(v: ViewMode, instant = false) {
    const apply = () => {
      const cam = this.cameras.main; this.view = v; this.freeLook = false; this.focusTarget = "room"; cam.stopFollow();
      if (v === "iso") { const b = this.isoBounds(); cam.setBounds(b.x, b.y, b.w, b.h); cam.setZoom(this.fitZoom()); const follow = this.scale.width < 700 || this.seated === false; if (follow) cam.startFollow(this.player.sprite, true, 0.09, 0.09); else cam.centerOn(b.x + b.w / 2, b.y + b.h / 2); }
      else { cam.setBounds(SVX - 200, -300, SV_W + 400, SV_H + 600); cam.setZoom(this.fitZoom()); cam.centerOn(SVX + SV_W / 2, SV_H / 2); }
      this.events.emit("camstate", this.camState());
    };
    if (instant) return apply();
    const cam = this.cameras.main; cam.fadeOut(140, 0, 0, 0); cam.once("camerafadeoutcomplete", () => { apply(); cam.fadeIn(180, 0, 0, 0); });
  }
  toggleView() { this.setView(this.view === "seat" ? "iso" : "seat"); }
  focus(target: FocusTarget) {
    const cam = this.cameras.main; this.focusTarget = target; this.freeLook = false; cam.stopFollow();
    let cx: number, cy: number, z: number;
    if (this.view === "seat") { const [x, y, m] = SV_FOCUS[target]; cx = target === "teacher" && this.svTeacher ? this.svTeacher.x : SVX + x; cy = y; z = this.fitZoom() * m; if (target === "room") { cx = SVX + SV_W / 2; cy = SV_H / 2; } }
    else if (target === "teacher") { cx = this.teacher.sprite.x; cy = this.teacher.sprite.y - 40; z = 2.2; }
    else if (target === "board") { const c = this.centerOf("board_white_large_left"); cx = c.x; cy = c.y; z = 2.3; }
    else if (target === "screen") { const c = this.centerOf("screen_bezel_left"); cx = c.x; cy = c.y; z = 2.0; }
    else { cam.startFollow(this.player.sprite, true, 0.09, 0.09); cam.zoomTo(this.fitZoom(), 450, "Sine.easeInOut"); this.events.emit("camstate", this.camState()); return; }
    cam.pan(cx, cy, 550, "Sine.easeInOut", true); cam.zoomTo(Math.min(z, 3.2), 550, "Sine.easeInOut");
    this.events.emit("camstate", this.camState());
  }
  /** Detach the camera so the player can look around freely; the avatar does not move. */
  toggleFreeLook(on?: boolean) {
    this.freeLook = on ?? !this.freeLook; const cam = this.cameras.main;
    if (this.freeLook) cam.stopFollow();
    else if (this.view === "iso") { cam.startFollow(this.player.sprite, true, 0.09, 0.09); this.focusTarget = "room"; }
    this.events.emit("camstate", this.camState());
  }
  camState() { return { view: this.view, freeLook: this.freeLook, focus: this.focusTarget, seated: this.seated, subject: this.subject }; }
  private setupPointerCamera() {
    this.input.addPointer(1);
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.freeLook || !p.isDown || this.input.pointer2.isDown) return; const cam = this.cameras.main;
      cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom; cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
    });
    this.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => { if (this.freeLook) this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom * (dy > 0 ? 0.9 : 1.1), 0.3, 3.5)); });
  }
  private pinch = 0;
  private updatePinch() {
    const a = this.input.pointer1, b = this.input.pointer2;
    if (this.freeLook && a.isDown && b.isDown) { const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y); if (this.pinch) this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom * (d / this.pinch), 0.3, 3.5)); this.pinch = d; } else this.pinch = 0;
  }

  // ------------------------------------------------------------------ audience, seating, lesson start (auto-walk)
  /** the roster members to seat: those attending this class first, then everyone else, so each seat is a different person */
  private pool(): NpcDef[] { const att = this.attendeeIds.map((i) => ROSTER[i]).filter(Boolean), rest = ROSTER.filter((d) => !this.attendeeIds.includes(d.id)); return [...att, ...rest]; }
  private frontDefs(): NpcDef[] { const seated = [...this.npcs.values()].filter((a) => a.seatId).map((a) => this.defOf.get(a.id)!).filter(Boolean); return seated.length ? seated : ROSTER.slice(0, 8); }
  private spawnAudience() {
    const pool = this.pool();
    L.seats.forEach((s, i) => {
      const def = pool[i % pool.length]; this.bakeNpc(def);
      const a = new Actor(this, `npc_${s.id}`, `npc${def.id}`, s.sitX, s.sitY, s.elev, "sit");
      a.depthOverride = s.depth; a.seatId = s.id; a.sync(); a.play("sit", "up_left"); this.seating.assign(s.id, a.id); this.npcs.set(a.id, a); this.defOf.set(a.id, def);
      a.sprite.setInteractive({ useHandCursor: true }).on("pointerdown", () => { if (!this.freeLook && !this.evicting.has(a.id)) this.events.emit("npc-tap", this.defOf.get(a.id)); });
    });
  }
  /** re-deal the seats for a new class (attendees come from the hallway) */
  private reseat(ids: number[]) {
    this.attendeeIds = ids; const pool = this.pool(); let i = 0;
    for (const s of L.seats) { const a = this.npcs.get(`npc_${s.id}`); if (!a || this.evicting.has(a.id) || a.seatId !== s.id) { i++; continue; } const def = pool[i++ % pool.length]; this.bakeNpc(def); a.character = `npc${def.id}`; a.sprite.stop(); a.sprite.setTexture(`npc${def.id}_sit`); this.defOf.set(a.id, def); a.play("sit", "up_left"); }
  }
  /** NPCs sitting right now (classroom Q&A talks to these) */
  seatedDefs(): NpcDef[] { return [...this.npcs.values()].filter((a) => a.seatId && !this.evicting.has(a.id)).map((a) => this.defOf.get(a.id)!).filter(Boolean); }
  setNpcHand(id: number, up: boolean) {
    const a = [...this.npcs.values()].find((x) => this.defOf.get(x.id)?.id === id && x.seatId); if (a) a.play(up ? "raisehand" : "sit", "up_left");
    const heads = this.svHands.filter((h) => h.active); if (!heads.length) return;
    if (up) { const free = heads.filter((h) => !(h as any).__up); const h = free[Math.floor(Math.random() * free.length)]; if (h) { (h as any).__up = true; const k = `sv_${(h as any).__id}_raisehand`; if (this.textures.exists(k)) h.play(`${k}:up`); } }
    else heads.forEach((h) => { if ((h as any).__up) { (h as any).__up = false; const k = `sv_${(h as any).__id}_sit`; if (this.anims.exists(`${k}:up`)) h.play(`${k}:up`); } });
  }
  setPlayerHand(up: boolean) { if (this.seated) this.player.play(up ? "raisehand" : "sit", "up_left"); }
  private tickAudience() {
    if (!this.ambientHands) return;
    const seated = [...this.npcs.values()].filter((n) => n.seatId && !this.evicting.has(n.id));
    for (let k = 0; k < 4; k++) {
      const n = seated[Math.floor(Math.random() * seated.length)]; if (!n) return; const r = Math.random();
      if (n.state === "raisehand") { if (r < 0.5) n.play("sit", "up_left"); } else if (r < 0.2) n.play("raisehand", "up_left"); else if (r < 0.5) n.play("write", "up_left"); else n.play("sit", "up_left");
    }
  }
  private route(from: { gx: number; gy: number }, seat: (typeof L.seats)[number]) {
    const ay = 7.0, ap = seat.approach;
    return [{ gx: 5.0, gy: from.gy }, { gx: 5.0, gy: ay }, { gx: ap.gx, gy: ay }, { gx: ap.gx, gy: ap.gy }, { gx: seat.sitX, gy: seat.sitY }];
  }
  private async evict(npcId: string) {
    const n = this.npcs.get(npcId)!; this.evicting.add(npcId); { const d = this.defOf.get(npcId); if (d) ensureSheet(this, `npc${d.id}`, d.look, "walk"); } const seat = this.seating.free(npcId)!; n.seatId = undefined; n.depthOverride = undefined;
    await n.walkPath([{ gx: seat.approach.gx, gy: seat.approach.gy }, { gx: seat.approach.gx, gy: 7.0 }, { gx: 5.0, gy: 7.0 }, { gx: L.door.gx, gy: L.door.gy }]);
    this.npcs.delete(npcId); n.sprite.destroy();
  }
  /** Lesson start: swap the room to the subject, then the system walks the student from the door to their seat. */
  async startLesson(subject: Subject, attendees: number[] = []) {
    if (this.busy) return; this.busy = true;
    if (this.seated) this.standUp();
    this.bakePlayer(); this.reseat(attendees.length ? attendees : this.attendeeIds);
    await this.setSubject(subject); this.setScreen(SCREEN_FOR[subject]);
    this.setView("iso", true);
    this.player.path = []; this.player.gx = L.door.gx; this.player.gy = L.door.gy; this.player.elev = 0; this.player.shownElev = 0; this.player.depthOverride = undefined; this.player.sync();
    this.player.play("idle", "down"); this.events.emit("lesson", { phase: "walking", subject });
    const seat = this.seating.seats.find((s) => s.tier === PLAYER_TIER && s.gy === PLAYER_ROW)!;
    if (seat.occupant) { void this.evict(seat.occupant); await this.wait(700); }
    this.seating.assign(seat.id, "player"); this.player.seatId = seat.id;
    await this.player.walkPath(this.route(this.player, seat));
    this.player.elev = seat.elev; this.player.depthOverride = seat.depth; this.player.sync(); this.player.play("sit", "up_left"); this.seated = true;
    this.events.emit("lesson", { phase: "seated", subject });
    await this.wait(500); this.setView("seat"); this.busy = false;
  }
  standUp() {
    const s = this.seating.free("player"); this.seated = false; this.player.depthOverride = undefined; this.player.seatId = undefined;
    if (s) { this.player.gx = s.approach.gx; this.player.gy = s.approach.gy; this.player.elev = this.collision.elevAt(this.player.gx, this.player.gy); this.player.shownElev = this.player.elev; this.player.sync(); }
    this.player.play("idle", "down_right"); if (this.view === "seat") this.setView("iso"); else this.events.emit("camstate", this.camState());
  }

  // ------------------------------------------------------------------ update
  update(_t: number, dtMs: number) {
    const dt = dtMs / 1000, K = this.keys, C = this.cursors;
    for (const n of this.npcs.values()) n.step(dt, (x, y) => this.collision.elevAt(x, y));
    this.teacher?.step(dt, () => L.stage.elev); this.updatePinch();
    if (this.focusTarget === "teacher" && !this.freeLook) {   // keep the teacher centered while they move
      const t = this.view === "seat" && this.svTeacher ? { x: this.svTeacher.x, y: this.svTeacher.y - 110 } : { x: this.teacher.sprite.x, y: this.teacher.sprite.y - 40 };
      const c = this.cameras.main, k = Math.min(1, dt * 4); c.scrollX += (t.x - c.midPoint.x) * k; c.scrollY += (t.y - c.midPoint.y) * k;
    }
    if (Phaser.Input.Keyboard.JustDown(K.V)) this.toggleView(); if (Phaser.Input.Keyboard.JustDown(K.F)) this.toggleFreeLook();
    if (Phaser.Input.Keyboard.JustDown(K.ONE)) this.focus("teacher"); if (Phaser.Input.Keyboard.JustDown(K.TWO)) this.focus("board");
    if (Phaser.Input.Keyboard.JustDown(K.THREE)) this.focus("screen"); if (Phaser.Input.Keyboard.JustDown(K.FOUR)) this.focus("room");
    let sx = (C.right.isDown || K.D.isDown ? 1 : 0) - (C.left.isDown || K.A.isDown ? 1 : 0) + VIRTUAL_INPUT.x;
    let sy = (C.down.isDown || K.S.isDown ? 1 : 0) - (C.up.isDown || K.W.isDown ? 1 : 0) + VIRTUAL_INPUT.y;
    const moving = Math.hypot(sx, sy) > 0.1, cam = this.cameras.main;
    if (this.freeLook) { if (moving) { cam.scrollX += (sx * 600 * dt) / cam.zoom; cam.scrollY += (sy * 600 * dt) / cam.zoom; } this.player.step(dt, (x, y) => this.collision.elevAt(x, y)); return; } // avatar stays put
    if (this.player.path.length || this.busy) { this.player.step(dt, (x, y) => this.collision.elevAt(x, y)); return; }
    if (this.seated) { if (moving && this.view === "iso") this.standUp(); this.player.step(dt, () => this.player.elev); return; }
    if (moving) {
      const g = screenInputToGrid(sx, sy), len = Math.hypot(g.x, g.y) || 1, m = this.collision.move(this.player.gx, this.player.gy, (g.x / len) * 3 * dt, (g.y / len) * 3 * dt);
      this.player.gx = m.gx; this.player.gy = m.gy; this.player.play("walk", directionFromGrid(g.x, g.y));
    } else this.player.play("idle");
    this.player.elev = this.collision.elevAt(this.player.gx, this.player.gy); this.player.sync(dt);
  }
  private drawDebug() {
    const g = this.add.graphics().setDepth(99999).lineStyle(2, 0xff00ff, 0.9);
    for (const r of this.collision.rects) { const a = isoToScreen(r.gx, r.gy), b = isoToScreen(r.gx + r.w, r.gy), c = isoToScreen(r.gx + r.w, r.gy + r.d), d = isoToScreen(r.gx, r.gy + r.d), e = this.collision.elevAt(r.gx + r.w / 2, r.gy + r.d / 2);
      g.strokePoints([{ x: a.x, y: a.y - e }, { x: b.x, y: b.y - e }, { x: c.x, y: c.y - e }, { x: d.x, y: d.y - e }], true); }
  }
}
