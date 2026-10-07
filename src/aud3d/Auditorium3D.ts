/** The Auditorium: a huge downstairs hall with a stage, curtains, a big screen, rows of velvet seats and a student audience.
 *  Used for the morning assembly (Pledge of Allegiance and the Lord's Prayer led by the principals), the live newsroom broadcast, plays, musicals and reenactments. */
import * as THREE from "three";
import { bakeSheet, drawChar, FW, FH, SCALE, FEET, COLS, DIRS, AGE_SCALE, type Look } from "../hall3d/characters";
import { ROSTER } from "../hall3d/roster";
import { Social } from "../hall3d/social";
import { toLook } from "../hall3d/avatar";
import { FACULTY_BY_ID, facultyLook } from "../hall3d/faculty";

const UNIT = 1.75 / 45;
export const ROWS = 18, PER_SIDE = 12, SEAT_W = 0.95, ROW_D = 1.55, RISE = 0.2, AUD_Z0 = -18;
const rngSeed = (n: number) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; return (x % 10000) / 10000; };

export const PRINCIPALS = {
  ayrissa: { key: "ayrissa", name: "Principal Ayrissa Canty", first: "Ayrissa", look: (): Look => { const t = FACULTY_BY_ID.ayrissa, l = facultyLook(t); return { ...l, id: 901, top: "blazer", shirt: "#3b2f6b", shirt2: "#f6f1e8", bottom: "pants", pants: "#2e2a3d", acc: "lanyard", lanyard: true, shoes: "#2b2430" } as Look; } },
  marcus: { key: "marcus", name: "Principal Marcus Canty", first: "Marcus", look: (): Look => ({ id: 902, age: "adult", skin: "#6b4430", hair: "#1c1512", style: "crop", shirt: "#2b3445", shirt2: "#f1f4f8", top: "blazer", bottom: "pants", pants: "#232a38", shoes: "#241c18", acc: "tie", accent: "#c8963e", eyeColor: "#2a1c12", browColor: "#17110e", brow: "thick", beard: "goatee", beardColor: "#1c1512", glasses: false, bodyW: 1.05, hScale: 1.04, lanyard: true, tag: false } as Look) },
};
export type Who = "ayrissa" | "marcus";
export type ScreenMode = "bulletin" | "assembly" | "news" | "event";

interface Stand { sprite: THREE.Sprite; mat: THREE.SpriteMaterial; tex: THREE.CanvasTexture; walkTex: THREE.CanvasTexture; pos: THREE.Vector3; target: THREE.Vector3 | null; frame: number; dir: number }
interface Aud { sprite: THREE.Sprite; mat: THREE.SpriteMaterial; tex: THREE.CanvasTexture; seat: number; scaleH: number; me?: boolean; name?: string }

const canvasTex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, rep?: [number, number]) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d")!); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; };

export class Auditorium3D {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
  host: HTMLElement; t = 0; last = performance.now();
  seats!: { x: number; y: number; z: number; row: number; col: number }[]; baseMesh!: THREE.InstancedMesh; backMesh!: THREE.InstancedMesh;
  stage = new Map<Who, Stand>(); audience: Aud[] = []; me!: Aud; mySeat = 0;
  speaking: Who | "both" | null = null; chatter = false; cheer = false; standing = false; bowing = false; held = new Set<number>();
  screenCv = document.createElement("canvas"); screenTex!: THREE.CanvasTexture; mode: ScreenMode = "bulletin"; screenTitle = "UNIFY ACADEMY"; screenLines: string[] = []; newsCanvas: HTMLCanvasElement | null = null;
  curtainL!: THREE.Mesh; curtainR!: THREE.Mesh; curtainOpen = 1; curtainTarget = 1;
  view = "audience"; yaw = 0; pitch = 0; zoom = 1; camPos = new THREE.Vector3(0, 6, 22); camLook = new THREE.Vector3(0, 5, -30);
  onSeatChosen: (i: number) => void = () => {};
  private ray = new THREE.Raycaster(); private tween: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null; private hover = -1; private spotL!: THREE.SpotLight; private spotR!: THREE.SpotLight;

  constructor(host: HTMLElement) {
    this.host = host; const r = this.renderer = new THREE.WebGLRenderer({ antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = false;
    host.appendChild(r.domElement); this.scene.background = new THREE.Color("#171528"); this.scene.fog = new THREE.Fog("#171528", 60, 150);
    this.buildRoom(); this.buildStage(); this.buildSeats(); this.buildScreen(); this.buildPeople(); this.bind();
    addEventListener("resize", () => this.resize()); this.resize(); this.setView("audience", true); requestAnimationFrame(this.frame);
  }
  resize() { const w = this.host.clientWidth || innerWidth, h = this.host.clientHeight || innerHeight; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  /* ---------------------------------------------------------------- the room */
  private buildRoom() {
    const S = this.scene, wood = canvasTex(512, 512, (c) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? "#a8723f" : "#b57c46"; c.fillRect(0, i * 32, 512, 32); c.fillStyle = "rgba(60,30,10,.25)"; c.fillRect(0, i * 32, 512, 2); for (let k = 0; k < 14; k++) { c.fillStyle = `rgba(70,40,15,${0.04 + Math.random() * 0.06})`; c.fillRect(Math.random() * 512, i * 32 + 4, 40 + Math.random() * 120, 2); } } }, [10, 14]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 90), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.8 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -5); S.add(floor);
    const wallTex = canvasTex(256, 256, (c) => { c.fillStyle = "#2d2a52"; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 4; i++) { c.fillStyle = "#38346a"; c.fillRect(i * 64 + 6, 8, 52, 240); c.strokeStyle = "#c9a44e"; c.lineWidth = 2; c.strokeRect(i * 64 + 6, 8, 52, 240); } }, [14, 1]);
    const wm = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });
    const side = (x: number, rot: number) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(95, 17), wm); w.position.set(x, 8.5, -5); w.rotation.y = rot; S.add(w); const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 95), new THREE.MeshStandardMaterial({ color: "#6b4a2a" })); base.position.set(x - Math.sign(x) * 0.2, 1.5, -5); S.add(base); };
    side(-35, Math.PI / 2); side(35, -Math.PI / 2);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(70, 17), wm); back.position.set(0, 8.5, 40); back.rotation.y = Math.PI; S.add(back);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(70, 95), new THREE.MeshStandardMaterial({ color: "#1d1a38", roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 17, -5); S.add(ceil);
    const beamM = new THREE.MeshStandardMaterial({ color: "#5a3f27", roughness: 0.9 }); for (let z = -38; z < 40; z += 8) { const b = new THREE.Mesh(new THREE.BoxGeometry(70, 0.7, 0.8), beamM); b.position.set(0, 16.6, z); S.add(b); }
    // chandeliers / ceiling lights (warm, colourful)
    const cols = ["#ffd98a", "#ffb3a0", "#a8d8ff", "#cdb4ff"]; for (let z = -30, i = 0; z < 36; z += 9, i++) for (const x of [-22, -8, 8, 22]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshBasicMaterial({ color: cols[(i + (x > 0 ? 1 : 0)) % 4] })); l.position.set(x, 15.4, z); S.add(l); }
    S.add(new THREE.HemisphereLight("#ffe9c9", "#3a2b55", 0.85)); const dl = new THREE.DirectionalLight("#fff1d6", 0.55); dl.position.set(8, 20, 30); S.add(dl);
    this.spotL = new THREE.SpotLight("#fff0cf", 90, 70, 0.5, 0.5, 1); this.spotL.position.set(-8, 15, -10); this.spotL.target.position.set(-3, 1.5, -33); S.add(this.spotL, this.spotL.target);
    this.spotR = new THREE.SpotLight("#cfe4ff", 90, 70, 0.5, 0.5, 1); this.spotR.position.set(8, 15, -10); this.spotR.target.position.set(3, 1.5, -33); S.add(this.spotR, this.spotR.target);
    // carpet aisles
    const carpet = new THREE.MeshStandardMaterial({ color: "#8e2f3a", roughness: 1 }); for (const x of [0, -(PER_SIDE * SEAT_W + 3.2), PER_SIDE * SEAT_W + 3.2]) { const a = new THREE.Mesh(new THREE.PlaneGeometry(x === 0 ? 2.4 : 1.8, ROWS * ROW_D + 6), carpet); a.rotation.x = -Math.PI / 2; a.position.set(x, 0.02 + (x === 0 ? 0 : 0), AUD_Z0 + (ROWS * ROW_D) / 2 - 0.5); S.add(a); }
    // the way back up to the school: a staircase door on the back wall
    const door = new THREE.Mesh(new THREE.BoxGeometry(4.2, 5.4, 0.3), new THREE.MeshStandardMaterial({ color: "#6b4a2a" })); door.position.set(-24, 2.7, 39.8); S.add(door);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1), new THREE.MeshBasicMaterial({ map: canvasTex(512, 100, (c) => { c.fillStyle = "#e8433a"; c.fillRect(0, 0, 512, 100); c.fillStyle = "#fff"; c.font = "700 54px sans-serif"; c.textAlign = "center"; c.fillText("▲ UP TO SCHOOL", 256, 70); }) })); sign.position.set(-24, 6.2, 39.6); sign.rotation.y = Math.PI; S.add(sign);
    for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.28, 1.1 + i * 0.0), new THREE.MeshStandardMaterial({ color: "#c9a36b" })); st.position.set(-24, 0.14 + i * 0.28, 38.4 - i * 0.0); void st; }
  }

  /* ---------------------------------------------------------------- the stage */
  private buildStage() {
    const S = this.scene, deck = new THREE.Mesh(new THREE.BoxGeometry(40, 1.5, 14), new THREE.MeshStandardMaterial({ color: "#6b4426", roughness: 0.75 })); deck.position.set(0, 0.75, -34); S.add(deck);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(40.4, 0.25, 0.5), new THREE.MeshStandardMaterial({ color: "#c9a44e", metalness: 0.4, roughness: 0.4 })); edge.position.set(0, 1.45, -26.9); S.add(edge);
    for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: "#c9a36b" })); st.position.set(0, 0.25 + i * 0.5 - 0.0, -26.2 + (1 - i) * 0.0 + i * -0.5); st.scale.y = 1; S.add(st); }
    const pro = new THREE.Mesh(new THREE.BoxGeometry(40, 2.2, 1), new THREE.MeshStandardMaterial({ color: "#7a1f2b", roughness: 0.8 })); pro.position.set(0, 15.2, -27.3); S.add(pro);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(40.2, 0.3, 1.1), new THREE.MeshStandardMaterial({ color: "#d9b25a", metalness: 0.5, roughness: 0.35 })); trim.position.set(0, 14.0, -27.3); S.add(trim);
    for (const sx of [-20.5, 20.5]) { const col = new THREE.Mesh(new THREE.BoxGeometry(1.4, 17, 1.4), new THREE.MeshStandardMaterial({ color: "#7a5230", roughness: 0.8 })); col.position.set(sx, 8.5, -27.3); S.add(col); }
    const back = new THREE.Mesh(new THREE.PlaneGeometry(42, 17), new THREE.MeshStandardMaterial({ color: "#2a2650" })); back.position.set(0, 8.5, -40.9); S.add(back);
    // velvet curtains (pleated) that open and close
    const velvet = canvasTex(256, 64, (c) => { for (let i = 0; i < 16; i++) { const g = c.createLinearGradient(i * 16, 0, i * 16 + 16, 0); g.addColorStop(0, "#5e1520"); g.addColorStop(0.5, "#b32a3c"); g.addColorStop(1, "#5e1520"); c.fillStyle = g; c.fillRect(i * 16, 0, 16, 64); } }, [1, 1]);
    const cm = new THREE.MeshStandardMaterial({ map: velvet, roughness: 0.9, side: THREE.DoubleSide });
    this.curtainL = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), cm); this.curtainR = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), cm); this.curtainL.position.set(-20, 7.4, -26.9); this.curtainR.position.set(20, 7.4, -26.9); S.add(this.curtainL, this.curtainR);
    // podium with microphone, flags
    const pod = new THREE.Group(); const pb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.0), new THREE.MeshStandardMaterial({ color: "#7a5230", roughness: 0.7 })); pb.position.y = 1.1; pod.add(pb); const pt = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.2), new THREE.MeshStandardMaterial({ color: "#9a6b3c" })); pt.position.y = 2.25; pod.add(pt);
    const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), new THREE.MeshStandardMaterial({ color: "#333" })); mic.position.set(0, 2.7, 0.15); mic.rotation.x = 0.4; pod.add(mic); const emb = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (c) => { c.fillStyle = "#3b2f6b"; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.fillStyle = "#f6c85f"; c.font = "700 54px sans-serif"; c.textAlign = "center"; c.fillText("U", 64, 84); }), transparent: true })); emb.position.set(0, 1.2, 0.52); pod.add(emb);
    pod.position.set(0, 1.5, -32); S.add(pod);
    const flag = (x: number, usa: boolean) => { const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6.6, 6), new THREE.MeshStandardMaterial({ color: "#d9b25a", metalness: 0.6 })); pole.position.y = 3.3; g.add(pole); const fl = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: canvasTex(320, 210, (c) => { if (usa) { for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? "#fff" : "#b22234"; c.fillRect(0, i * 16.15, 320, 16.2); } c.fillStyle = "#3c3b6e"; c.fillRect(0, 0, 140, 113); c.fillStyle = "#fff"; for (let r = 0; r < 5; r++) for (let q = 0; q < 6; q++) c.fillRect(10 + q * 22, 8 + r * 20, 5, 5); } else { c.fillStyle = "#3b2f6b"; c.fillRect(0, 0, 320, 210); c.fillStyle = "#f6c85f"; c.font = "700 120px sans-serif"; c.textAlign = "center"; c.fillText("U", 160, 140); } }) })); fl.position.set(1.7, 5.4, 0); g.add(fl); g.position.set(x, 1.5, -36.5); S.add(g); };
    flag(-6.5, true); flag(6.5, false);
    // stage wings / backdrop lights
    for (const sx of [-14, -7, 0, 7, 14]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.6, 8), new THREE.MeshBasicMaterial({ color: "#fff6dd" })); l.position.set(sx, 13.3, -30); S.add(l); }
  }

  /* ---------------------------------------------------------------- the seats */
  private buildSeats() {
    this.seats = []; const half = PER_SIDE * SEAT_W; for (let r = 0; r < ROWS; r++) for (const sg of [-1, 1]) for (let c = 0; c < PER_SIDE; c++) this.seats.push({ x: sg * (1.9 + c * SEAT_W + SEAT_W / 2), y: r * RISE, z: AUD_Z0 + r * ROW_D, row: r, col: sg * (c + 1) });
    const n = this.seats.length; this.baseMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.28, 0.8), new THREE.MeshStandardMaterial({ roughness: 0.8 }), n); this.backMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.95, 0.16), new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
    const m = new THREE.Matrix4(), col = new THREE.Color(); const velv = ["#8e1f33", "#9c2438", "#841c2f", "#a02a40"];
    this.seats.forEach((s, i) => { m.makeTranslation(s.x, s.y + 0.55, s.z); this.baseMesh.setMatrixAt(i, m); col.set(velv[(i * 7) % 4]); this.baseMesh.setColorAt(i, col); m.makeTranslation(s.x, s.y + 1.05, s.z + 0.38); this.backMesh.setMatrixAt(i, m); this.backMesh.setColorAt(i, col); });
    this.scene.add(this.baseMesh, this.backMesh);
    // stepped floor under each row
    const riser = new THREE.MeshStandardMaterial({ color: "#4a3320", roughness: 0.9 }); for (let r = 0; r < ROWS; r++) { const b = new THREE.Mesh(new THREE.BoxGeometry(2 * half + 5.4, r * RISE + 0.05, ROW_D), riser); b.position.set(0, (r * RISE) / 2, AUD_Z0 + r * ROW_D); b.scale.y = 1; this.scene.add(b); b.material = new THREE.MeshStandardMaterial({ color: r % 2 ? "#5a3f28" : "#664630", roughness: 0.9 }); }
    void half;
  }

  /* ---------------------------------------------------------------- the big screen */
  private buildScreen() {
    const cv = this.screenCv; cv.width = 1920; cv.height = 1000; this.screenTex = new THREE.CanvasTexture(cv); this.screenTex.colorSpace = THREE.SRGBColorSpace; this.screenTex.anisotropy = 4;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(25.2, 13.4, 0.5), new THREE.MeshStandardMaterial({ color: "#14121f", roughness: 0.5 })); frame.position.set(0, 9.2, -40.4); this.scene.add(frame);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(24, 12.5), new THREE.MeshBasicMaterial({ map: this.screenTex, toneMapped: false })); scr.position.set(0, 9.2, -40.1); this.scene.add(scr); this.drawScreen();
  }
  setScreen(mode: ScreenMode, title?: string, lines?: string[]) { this.mode = mode; if (title != null) this.screenTitle = title; if (lines) this.screenLines = lines; this.drawScreen(); }
  drawScreen() {
    const c = this.screenCv.getContext("2d")!, w = 1920, h = 1000;
    if (this.mode === "news" && this.newsCanvas) { try { c.drawImage(this.newsCanvas, 0, 0, w, h); this.screenTex.needsUpdate = true; return; } catch { /* cross-origin or not ready */ } }
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#1c1650"); g.addColorStop(0.5, "#34246e"); g.addColorStop(1, "#7a2a6a"); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { c.fillStyle = `hsla(${(i * 37) % 360},90%,70%,.12)`; c.beginPath(); c.arc((i * 331) % w, (i * 197) % h, 20 + (i % 7) * 12, 0, 7); c.fill(); }
    c.textAlign = "center"; c.fillStyle = "#f6c85f"; c.font = "700 72px 'Trebuchet MS',sans-serif"; c.fillText("UNIFY ACADEMY", w / 2, 130);
    c.fillStyle = "#fff"; c.font = "700 120px 'Trebuchet MS',sans-serif"; const words = this.screenTitle.split(" "); let line = "", y = 330; for (const wd of words) { const t = line ? line + " " + wd : wd; if (c.measureText(t).width > w - 240 && line) { c.fillText(line, w / 2, y); line = wd; y += 130; } else line = t; } c.fillText(line, w / 2, y);
    c.font = "500 56px 'Trebuchet MS',sans-serif"; c.fillStyle = "#e9e2ff"; let yy = y + 120; for (const l of this.screenLines.slice(0, 7)) { const txt = l.length > 70 ? l.slice(0, 68) + "…" : l; c.fillText(txt, w / 2, yy); yy += 80; }
    this.screenTex.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- people */
  private sprite(tex: THREE.Texture, h: number) { const mat = new THREE.SpriteMaterial({ map: tex, transparent: true }), sp = new THREE.Sprite(mat); sp.center.set(0.5, FEET / FH); sp.scale.set((FW / SCALE) * UNIT * h, (FH / SCALE) * UNIT * h, 1); this.scene.add(sp); return { sp, mat }; }
  /** one character's audience frames: columns sit, stand with hand on heart, head bowed; rows front, back */
  private bakeAud(look: Look): THREE.CanvasTexture {
    const cols = [{ sitting: true, arms: { R: [2, -11], L: [-2, -11] } }, { arms: { R: [3, -19.5], L: [-9, -11] } }, { arms: { R: [2, -13.5], L: [-2, -13.5] }, hdy: 1.4, tilt: 0.1 }, { sitting: true, mouth: 0.5, arms: { R: [2, -11], L: [-2, -11] } }], cv = document.createElement("canvas"); cv.width = FW * cols.length; cv.height = FH * 2; const c = cv.getContext("2d")!;
    (["down", "up"] as const).forEach((dir, r) => cols.forEach((p, k) => { c.save(); c.translate(k * FW + FW / 2, r * FH + FH - FEET); c.scale(SCALE, SCALE); c.shadowColor = "rgba(52,34,46,.35)"; c.shadowBlur = 2.2; c.shadowOffsetY = 1.2; drawChar(c, 0, 0, { ...look, dir, moving: false, walk: 0, turn: 0, ...p }, 0); c.restore(); }));
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1 / cols.length, 1 / 2); t.anisotropy = 4; return t;
  }
  /** the principals' stage frames (front view): 0 stand, 1-2 talk, 3 wave, 4 hand on heart, 5 head bowed, 6 point, 7 arms open */
  private bakeStage(look: Look): THREE.CanvasTexture {
    const P = [{}, { mouth: 0.4 }, { mouth: 0.9 }, { arms: { R: [12, -31], L: [-9, -11] } }, { arms: { R: [3, -19.5], L: [-9, -11] } }, { arms: { R: [2, -13.5], L: [-2, -13.5] }, hdy: 1.6, tilt: 0.1 }, { mouth: 0.3, arms: { R: [13, -21], L: [-9, -11] } }, { mouth: 0.5, arms: { R: [12, -22], L: [-12, -22] } }], cv = document.createElement("canvas"); cv.width = FW * P.length; cv.height = FH; const c = cv.getContext("2d")!;
    P.forEach((p, k) => { c.save(); c.translate(k * FW + FW / 2, FH - FEET); c.scale(SCALE, SCALE); c.shadowColor = "rgba(255,244,205,.9)"; c.shadowBlur = 9; drawChar(c, 0, 0, { ...look, dir: "down", moving: false, walk: 0, turn: 0, ...p }, 0); c.shadowColor = "rgba(52,34,46,.35)"; c.shadowBlur = 2.2; c.shadowOffsetY = 1.2; drawChar(c, 0, 0, { ...look, dir: "down", moving: false, walk: 0, turn: 0, ...p }, 0); c.restore(); });
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1 / P.length, 1); t.anisotropy = 4; return t;
  }
  private buildPeople() {
    for (const k of ["ayrissa", "marcus"] as Who[]) {
      const look = PRINCIPALS[k].look(), tex = this.bakeStage(look), wt = new THREE.CanvasTexture(bakeSheet(look)); wt.colorSpace = THREE.SRGBColorSpace; wt.repeat.set(1 / COLS, 1 / DIRS.length);
      const { sp, mat } = this.sprite(tex, AGE_SCALE.adult * ((look as any).hScale ?? 1)); const pos = new THREE.Vector3(k === "ayrissa" ? -2.6 : 2.6, 1.5, -33.4);
      this.stage.set(k, { sprite: sp, mat, tex, walkTex: wt, pos: new THREE.Vector3(k === "ayrissa" ? -26 : 26, 1.5, -33.4), target: pos, frame: 0, dir: 0 }); sp.position.copy(this.stage.get(k)!.pos);
    }
    // the audience: classmates from the roster (every look different), the player in the middle of the front rows
    const looks: { look: Look; name: string; h: number }[] = ROSTER.slice(0, 36).map((d) => ({ look: d.look, name: d.first, h: AGE_SCALE[d.age] * ((d.look as any).hScale ?? 1) }));
    const pickSeats: number[] = []; for (let r = 0; r < 17; r++) for (let i = 0; i < this.seats.length; i++) if (this.seats[i].row === r && rngSeed(i * 13 + r) < 0.7) pickSeats.push(i);
    const me = this.seats.findIndex((s) => s.row === 8 && s.col === -3); this.mySeat = me;
    pickSeats.filter((i) => i !== me).slice(0, 150).forEach((si, n) => { const L = looks[n % looks.length]; const look = { ...L.look, shirt: n >= looks.length ? ["#e8789a", "#4f91c7", "#88b89a", "#eab94e", "#b8a8da"][n % 5] : L.look.shirt }; const tex = this.bakeAud(look); const { sp, mat } = this.sprite(tex, L.h); const s = this.seats[si]; sp.position.set(s.x, s.y + 0.4, s.z + 0.1); this.audience.push({ sprite: sp, mat, tex, seat: si, scaleH: L.h }); });
    const look = { ...toLook(Social.profile.avatar, 11) } as Look, tex = this.bakeAud(look), { sp, mat } = this.sprite(tex, AGE_SCALE[(look.age ?? "hs") as keyof typeof AGE_SCALE] * ((look as any).hScale ?? 1)); const ms = this.seats[me]; sp.position.set(ms.x, ms.y + 0.4, ms.z + 0.1);
    this.me = { sprite: sp, mat, tex, seat: me, scaleH: 1, me: true, name: Social.profile.name || "You" };
    // name tag over the player
    const tag = canvasTex(256, 64, (c) => { c.fillStyle = "#F3E7CF"; c.beginPath(); c.roundRect(4, 8, 248, 48, 20); c.fill(); c.fillStyle = "#4A3B3F"; c.font = "700 30px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText((this.me.name || "You").slice(0, 12), 128, 42); });
    const ts = new THREE.Sprite(new THREE.SpriteMaterial({ map: tag, transparent: true, depthTest: false })); ts.scale.set(1.4, 0.35, 1); ts.position.set(ms.x, ms.y + 2.6, ms.z); this.scene.add(ts); (this.me as any).tagSprite = ts;
  }
  /** the player moves to another seat */
  sitAt(i: number) { const s = this.seats[i]; if (!s || i === this.mySeat) return; const from = this.me.sprite.position.clone(), to = new THREE.Vector3(s.x, s.y + 0.4, s.z + 0.1); this.tween = { from, to, t: 0 }; this.mySeat = i; this.onSeatChosen(i); }

  /* ---------------------------------------------------------------- stage actions */
  walkOn() { for (const [k, p] of this.stage) { p.pos.set(k === "ayrissa" ? -26 : 26, 1.5, -33.4); p.target = new THREE.Vector3(k === "ayrissa" ? -2.6 : 2.6, 1.5, -33.4); } }
  private audFrame() { return this.standing ? (this.bowing ? 2 : 1) : 0; }

  /* ---------------------------------------------------------------- camera */
  setView(v: string, snap = false) { this.view = v; this.yaw = 0; this.pitch = 0; this.zoom = 1; if (snap) this.updateCamera(1, true); }
  private updateCamera(dt: number, snap = false) {
    let pos: THREE.Vector3, look: THREE.Vector3; const y = this.yaw, p = this.pitch;
    if (this.view === "audience") { const s = this.seats[this.mySeat]; pos = new THREE.Vector3(s.x, s.y + 2.9, s.z + 3.2); look = new THREE.Vector3(0, 6.5, -34); }
    else if (this.view === "wide") { pos = new THREE.Vector3(0, 11, 36); look = new THREE.Vector3(0, 5, -30); }
    else if (this.view === "stage") { pos = new THREE.Vector3(0, 4.2, -17); look = new THREE.Vector3(0, 4.6, -36); }
    else if (this.view === "balcony") { pos = new THREE.Vector3(24, 14, 30); look = new THREE.Vector3(0, 3, -22); }
    else { pos = new THREE.Vector3(0, 3.2, -26); look = new THREE.Vector3(0, 2.5, 10); }   // "crowd": from the stage looking at the audience
    const base = look.clone().sub(pos), d = base.length(); const dir = base.normalize(); const q = new THREE.Euler(p, y, 0, "YXZ"); dir.applyEuler(q); look = pos.clone().addScaledVector(dir, d);
    if (this.zoom !== 1) pos.lerp(look, 1 - this.zoom);
    const k = snap ? 1 : Math.min(1, dt * 4); this.camPos.lerp(pos, k); this.camLook.lerp(look, k); this.camera.position.copy(this.camPos); this.camera.lookAt(this.camLook);
  }

  /* ---------------------------------------------------------------- input */
  private bind() {
    const el = this.renderer.domElement; let down = false, sx = 0, sy = 0, st = 0, moved = 0; const pts = new Map<number, { x: number; y: number }>(); let pinch = 0;
    el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = true; sx = e.clientX; sy = e.clientY; st = performance.now(); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
    el.addEventListener("pointermove", (e) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) this.zoom = Math.max(0.35, Math.min(1.6, this.zoom * (pinch / d))); pinch = d; return; }
      if (down) { const dx = e.clientX - sx, dy = e.clientY - sy; moved += Math.abs(dx) + Math.abs(dy); this.yaw = Math.max(-1.1, Math.min(1.1, this.yaw + dx * 0.004)); this.pitch = Math.max(-0.5, Math.min(0.5, this.pitch + dy * 0.003)); sx = e.clientX; sy = e.clientY; }
      else this.hoverAt(e.clientX, e.clientY);
    });
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (!pts.size) { pinch = 0; if (down && moved < 8 && performance.now() - st < 500) this.tap(e.clientX, e.clientY); down = false; } };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", (e) => { e.preventDefault(); this.zoom = Math.max(0.35, Math.min(1.6, this.zoom * (1 + e.deltaY * 0.001))); }, { passive: false });
  }
  private pick(cx: number, cy: number) { const r = this.renderer.domElement.getBoundingClientRect(); this.ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), this.camera); const h = this.ray.intersectObject(this.baseMesh, false); return h.length ? h[0].instanceId ?? -1 : -1; }
  private hoverAt(cx: number, cy: number) { const i = this.pick(cx, cy); this.renderer.domElement.style.cursor = i >= 0 ? "pointer" : "default"; this.hover = i; }
  private tap(cx: number, cy: number) { const i = this.pick(cx, cy); if (i >= 0) this.sitAt(i); }

  /* ---------------------------------------------------------------- frame */
  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    // curtains
    this.curtainTarget = this.curtainTarget; this.curtainOpen += (this.curtainTarget - this.curtainOpen) * Math.min(1, dt * 1.6); const cw = 1 + (1 - this.curtainOpen) * 9; this.curtainL.scale.x = this.curtainR.scale.x = 0.35 + (1 - this.curtainOpen) * 1.3; this.curtainL.position.x = -20 + (1 - this.curtainOpen) * 10 - (this.curtainL.scale.x - 1) * 10; this.curtainR.position.x = 20 - (1 - this.curtainOpen) * 10 + (this.curtainR.scale.x - 1) * 10; void cw;
    // principals
    for (const [k, p] of this.stage) {
      let walking = false; if (p.target) { const d = p.target.clone().sub(p.pos); d.y = 0; const len = d.length(); if (len < 0.08) { p.pos.copy(p.target); p.target = null; } else { d.normalize(); p.pos.addScaledVector(d, Math.min(len, 5.2 * dt)); walking = true; } }
      p.sprite.position.copy(p.pos);
      if (walking) { if (p.mat.map !== p.walkTex) { p.mat.map = p.walkTex; p.mat.needsUpdate = true; } const col = 1 + (Math.floor(this.t * 8) % 4); p.walkTex.offset.set(col / COLS, 1 - 1 / DIRS.length); p.sprite.position.y += Math.abs(Math.sin(this.t * 9)) * 0.06; }
      else { if (p.mat.map !== p.tex) { p.mat.map = p.tex; p.mat.needsUpdate = true; } const talking = this.speaking === k || this.speaking === "both"; let f = 0; if (talking) f = [1, 2, 1, 0, 2, 1][Math.floor(this.t * 9) % 6]; else if (this.bowing) f = 5; else if (this.standing) f = 4; else if (this.gesture === k) f = this.gestureFrame; p.tex.offset.set(f / 8, 0); }
    }
    // audience faces the stage; show the front or back by where the camera is
    const camZ = this.camera.position.z; let ai = 0; for (const a of [...this.audience, this.me]) {
      const row = camZ < a.sprite.position.z - 1 ? 0 : 1; let col = this.audFrame(); const aa = a as any, ph: number = aa.phase ?? (aa.phase = rngSeed(ai * 7 + 3)); ai++;
      // mouths move: whispering neighbours, cheering crowds
      if (col === 0 && !a.me) { if (this.cheer) col = Math.sin(this.t * 9 + ph * 20) > -0.2 ? 3 : 0; else if (this.chatter && ph < 0.4) col = (this.t * (0.9 + ph) + ph * 9) % 1 < 0.55 ? 3 : 0; }
      if (!a.me && !this.tween) { const by: number = aa.by ?? (aa.by = a.sprite.position.y); a.sprite.position.y = by + (this.cheer ? Math.abs(Math.sin(this.t * 7 + ph * 12)) * 0.35 : 0); }
      a.tex.offset.set(col / 4, row === 0 ? 0.5 : 0);
    }
    if (this.tween) { const tw = this.tween; tw.t += dt / 0.7; const k = Math.min(1, tw.t), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; this.me.sprite.position.lerpVectors(tw.from, tw.to, e); this.me.sprite.position.y += Math.sin(k * Math.PI) * 0.8; if (k >= 1) this.tween = null; }
    const mp = this.me.sprite.position, ts = (this.me as any).tagSprite as THREE.Sprite; ts.position.set(mp.x, mp.y + 2.4, mp.z);
    if (this.mode === "news" || this.mode === "assembly") { if (this.mode === "news") this.drawScreen(); }
    this.updateCamera(dt); this.renderer.render(this.scene, this.camera); requestAnimationFrame(this.frame);
  };
  gesture: Who | null = null; gestureFrame = 0;
  /** open or close the curtains */
  curtains(open: boolean) { this.curtainTarget = open ? 1 : 0; }
}
