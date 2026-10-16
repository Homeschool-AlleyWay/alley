/** "Pixar edition" of the hallway (only constructed when isPixar()): ACES + warm golden key / teal fill / coloured rims, peach haze, glossy materials, bloom grade pass,
 *  window light shafts, garlands + foreground greenery, and real 3D Pixar characters (src/dorm/char3d.ts) for the player and the NPCs near them. The papercut path never imports any of this at runtime. */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createPixar } from "../dorm/style-pixar";
import { createChar3D, type Char3DEx } from "../dorm/char3d";
import { INTERIOR_SCALE as IS, CHAR_K } from "../shared/scale";
import type { Anim } from "../dorm/types";
import type { AvatarSpec } from "./avatar";
import type { Person, Stu } from "./HallScene";
import { Mood, Gfx } from "./mood";
import { smallScreen, dprCap } from "../shared/polish";
import { W, H } from "./campus";

const KEY = new THREE.Color("#ffc878"), TEAL = new THREE.Color("#a9dff0"), PEACH = new THREE.Color("#f4a77a"), HAZE = new THREE.Color("#f3d2bb"), NIGHT_HAZE = new THREE.Color("#2b2650");
const hash = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
/** warm highlights / cool shadows, a little extra saturation and a soft vignette (linear HDR, before the output pass) */
const GRADE = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c=texture2D(tDiffuse,vUv); float lu=dot(c.rgb,vec3(.299,.587,.114)); c.rgb=mix(vec3(lu),c.rgb,1.16);
    c.rgb*=mix(vec3(.94,.99,1.07),vec3(1.07,1.,.9),smoothstep(.04,.8,lu)); float v=smoothstep(.5,1.1,length(vUv-.5)*1.25); c.rgb*=1.-v*.2; gl_FragColor=c; }`,
};

export interface PxCtx { player: Person; playerSpec: AvatarSpec; camera: THREE.Camera; shown: boolean; first: boolean; seat: { pos: THREE.Vector3; ctr: THREE.Vector3 } | null; talkingTo: Person | null }
export interface PxTags { floor: THREE.Mesh; lockers: THREE.Material[]; winSpots: { x: number; y: number; z: number; rot: number }[] }

const ACT: Record<string, Anim> = { wave: "wave", highfive: "wave", cheer: "cheer", jump: "cheer", hop: "cheer", dance: "dance", clap: "clap", excited: "cheer", silly: "cheer", laugh: "cheer", kick: "cheer", nod: "nod", shake: "shake", talk: "talk", scratch: "think", shy: "think", shrug: "shrug", point: "point", hip: "hip", eyeroll: "think", facepalm: "think", thumbs: "wave" };
const lerpAngle = (a: number, b: number, k: number) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; };

interface Ent { c: Char3DEx; spec: AvatarSpec; lx: number; lz: number; yaw: number; ty: number }
const MAX3D = 12, NEAR = 18, FAR = 21;
/** real 3D characters for the player and the nearest NPCs; everyone else stays a (tinted) sprite */
export class PixarCrowd {
  private ents = new Map<Person, Ent>(); private style = createPixar(); private tmp = new THREE.Vector3(); private camLocal = new THREE.Vector3();
  constructor(private scene: THREE.Scene) {}
  has(p: Person) { return this.ents.has(p); }
  private drop(p: Person) { const e = this.ents.get(p); if (!e) return; e.c.dispose(); this.ents.delete(p); }
  private make(p: Person, spec: AvatarSpec, cam: THREE.Camera): Ent | null {
    let c: Char3DEx; try { c = createChar3D(this.style, spec); } catch (err) { console.warn("3D character failed", err); return null; }
    const yaw = Math.atan2(cam.position.x / IS - p.pos.x, cam.position.z / IS - p.pos.z); c.root.position.set(p.pos.x, 0, p.pos.z); c.root.rotation.y = yaw; this.scene.add(c.root);
    const e = { c, spec, lx: p.pos.x, lz: p.pos.z, yaw, ty: yaw }; this.ents.set(p, e); return e;
  }
  update(dt: number, list: Person[], x: PxCtx) {
    const P = x.player.pos, cand: { p: Person; d: number; spec: AvatarSpec }[] = [];
    for (const p of list) {
      if ((p as Stu).hidden) continue; const spec = p === x.player ? x.playerSpec : p.def?.spec; if (!spec) continue;
      const d = p === x.player ? -1 : Math.hypot(p.pos.x - P.x, p.pos.z - P.z); if (d < (this.ents.has(p) ? FAR : NEAR)) cand.push({ p, d, spec });
    }
    cand.sort((a, b) => a.d - b.d); const keep = new Set<Person>(cand.slice(0, MAX3D).map((c) => c.p));
    for (const p of [...this.ents.keys()]) if (!keep.has(p)) this.drop(p);
    let made = 0;
    for (const { p, spec } of cand) {
      if (!keep.has(p)) continue; let e = this.ents.get(p);
      if (!e) { if (p !== x.player && made >= 1) continue; e = this.make(p, spec, x.camera) ?? undefined; made++; if (!e) { keep.delete(p); continue; } }
      else if (e.spec !== spec) { e.c.setSpec(spec); e.spec = spec; }
      this.step(dt, p, e, x);
    }
    for (const p of keep) if (this.ents.has(p)) { p.sprite.visible = false; p.blob.visible = false; }
  }
  private step(dt: number, p: Person, e: Ent, x: PxCtx) {
    const c = e.c, isP = p === x.player, seated = isP && x.seat != null, mx = p.pos.x - e.lx, mz = p.pos.z - e.lz;
    if (mx * mx + mz * mz > 16) { e.lx = p.pos.x; e.lz = p.pos.z; } else if (mx * mx + mz * mz > 1e-6) { e.ty = Math.atan2(mx, mz); e.lx = p.pos.x; e.lz = p.pos.z; }
    if (seated) e.ty = Math.atan2(x.seat!.ctr.x - x.seat!.pos.x, x.seat!.ctr.z - x.seat!.pos.z);
    else if (!p.moving) { const o = isP ? x.talkingTo : p.talking ? x.player : null; if (o) e.ty = Math.atan2(o.pos.x - p.pos.x, o.pos.z - p.pos.z); }
    e.yaw = lerpAngle(e.yaw, e.ty, 1 - Math.exp(-dt * 11));
    const act = p.act ? ACT[p.act.name] : undefined, anim: Anim = seated ? "sit" : p.moving ? "walk" : act ?? (p.speaking || p.talking ? "talk" : "idle");
    c.play(anim); c.speak(!!p.speaking); const st = p.moving ? Math.min(1.7, Math.max(0.75, (isP ? 4.3 : (p as Stu).speed ?? 2.4) / 2.4)) : 1; c.update(dt * st);
    c.root.position.set(p.pos.x, seated ? 0.46 - c.seatHeight * CHAR_K : 0, p.pos.z); c.root.rotation.y = e.yaw;
    const f = (p as Stu).fade ?? 1; c.root.scale.setScalar(Math.max(0.02, f) * CHAR_K);
    c.root.visible = isP ? x.shown : !(x.first && this.tmp.set(p.pos.x, 0, p.pos.z).distanceTo(this.camLocal.copy(x.camera.position).divideScalar(IS)) < 1.1 / IS);
    void anim;
  }
  dispose() { for (const p of [...this.ents.keys()]) this.drop(p); }
}

export class PixarHall {
  readonly crowd: PixarCrowd; private composer: EffectComposer | null = null; private failed = false; private w = 1; private h = 1; private bloom: UnrealBloomPass | null = null; private shafts: THREE.Mesh | null = null;
  private rim1: THREE.DirectionalLight; private rim2: THREE.DirectionalLight; private warm: THREE.PointLight; private cool: THREE.PointLight; private skyCv = document.createElement("canvas"); private skyTex: THREE.CanvasTexture; private fog: THREE.Fog;
  constructor(private r: THREE.WebGLRenderer, private scene: THREE.Scene, private cam: THREE.PerspectiveCamera, private sun: THREE.DirectionalLight, private hemi: THREE.HemisphereLight) {
    r.shadowMap.type = THREE.PCFShadowMap; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.95; r.outputColorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(r), env = new RoomEnvironment(), rt = pm.fromScene(env, 0.04); scene.environment = rt.texture; scene.environmentIntensity = 0.18; pm.dispose(); env.dispose();
    this.skyCv.width = 4; this.skyCv.height = 128; this.skyTex = new THREE.CanvasTexture(this.skyCv); this.skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = this.skyTex;
    this.fog = scene.fog = new THREE.Fog(HAZE.getHex(), 55 * IS, 210 * IS);
    sun.color.copy(KEY); sun.intensity = 1.7; hemi.color.copy(TEAL); hemi.groundColor.copy(PEACH); hemi.intensity = 0.42;
    this.rim1 = new THREE.DirectionalLight("#5fd0ff", 1.1); this.rim1.position.set(-12, 9, -15); this.rim2 = new THREE.DirectionalLight("#ff8fc0", 0.7); this.rim2.position.set(14, 7, -12);
    this.warm = new THREE.PointLight("#ff9a5a", 5 * IS * IS, 9 * IS, 2); this.cool = new THREE.PointLight("#6fc6ff", 3 * IS * IS, 10 * IS, 2);
    scene.add(this.rim1, this.rim2, this.warm, this.cool); this.crowd = new PixarCrowd(scene); this.paintSky(); Mood.onChange(() => this.paintSky());
    this.resize(r.domElement.clientWidth || innerWidth, r.domElement.clientHeight || innerHeight);
  }
  private paintSky() {
    const n = Mood.night, c = this.skyCv.getContext("2d")!, g = c.createLinearGradient(0, 0, 0, 128), m = (a: string, b: string) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), n).getHexString();
    g.addColorStop(0, m("#4f9ee8", "#12163a")); g.addColorStop(0.55, m("#bfe0ff", "#272a5c")); g.addColorStop(1, m("#ffd4ae", "#3a2d52")); c.fillStyle = g; c.fillRect(0, 0, 4, 128); this.skyTex.needsUpdate = true;
    this.fog.color.copy(HAZE).lerp(NIGHT_HAZE, n);
  }
  /** per frame: lights follow the school-day clock (Mood), bounce lights follow the player */
  tick(t: number, player: THREE.Vector3) {
    const n = Mood.night; void t;
    this.sun.color.copy(KEY).lerp(Mood.sun, 0.18 + 0.6 * n); this.sun.intensity = 1.7 * Mood.sunK;
    this.hemi.color.copy(TEAL).lerp(Mood.hemiSky, 0.12 + 0.4 * n); this.hemi.groundColor.copy(PEACH).lerp(Mood.hemiGnd, 0.15); this.hemi.intensity = 0.42 * Mood.hemiK;
    this.rim1.intensity = 1.1 * (1 - 0.5 * n); this.rim2.intensity = 0.7 * (1 - 0.5 * n); this.scene.environmentIntensity = 0.18 * (1 - 0.6 * n);
    this.warm.position.set(player.x + 1.6, 0.7, player.z + 1.2); this.cool.position.set(player.x - 2.4, 3.2, player.z - 2.6);
    if (this.shafts) (this.shafts.material as THREE.MeshBasicMaterial).color.setScalar((1 - n) * 0.35);
  }
  resize(w: number, h: number) { this.w = w; this.h = h; if (this.composer) { this.composer.setPixelRatio(this.r.getPixelRatio()); this.composer.setSize(w, h); } }
  /** true when the post stack drew the frame; false = caller renders normally (low graphics, phones that failed, no post support) */
  render(): boolean {
    if (Gfx.low || this.failed) return false;
    try {
      if (!this.composer) {
        const pr = this.r.getPixelRatio(), small = smallScreen(), rt = new THREE.WebGLRenderTarget(this.w * pr, this.h * pr, { type: THREE.HalfFloatType, samples: small ? 0 : 4 });
        const cp = this.composer = new EffectComposer(this.r, rt); cp.setPixelRatio(pr); cp.setSize(this.w, this.h);
        cp.addPass(new RenderPass(this.scene, this.cam)); this.bloom = new UnrealBloomPass(new THREE.Vector2(this.w / 2, this.h / 2), small ? 0.2 : 0.3, 0.5, 1.1); cp.addPass(this.bloom);   // bloom runs at half resolution
        cp.addPass(new ShaderPass(GRADE)); cp.addPass(new OutputPass());
        if (small) { const fx = new ShaderPass(FXAAShader); fx.uniforms.resolution.value.set(1 / (this.w * pr), 1 / (this.h * pr)); cp.addPass(fx); }
      }
      this.composer.render(); return true;
    } catch (err) { console.warn("post-processing unavailable, using plain rendering", err); this.failed = true; this.composer?.dispose(); this.composer = null; this.r.setRenderTarget(null); return false; }
  }

  /* ------------------------------------------------------------ one pass over everything the hall built: glossy satin materials, smooth shapes, no paper outlines */
  finish(tags: PxTags) {
    const S = this.scene, lock = new Set(tags.lockers), seen = new Set<THREE.Material>(), hsl = { h: 0, s: 0, l: 0 };
    const tune = (m: THREE.Material, o: THREE.Mesh) => {
      if (seen.has(m)) return; seen.add(m); const s = m as THREE.MeshStandardMaterial; if (!s.isMeshStandardMaterial) return;
      if (s.flatShading) { s.flatShading = false; s.needsUpdate = true; }
      if (!s.map && !s.emissiveMap) { s.color.getHSL(hsl); if (hsl.s > 0.08) s.color.setHSL(hsl.h, Math.min(1, hsl.s * 1.18 + 0.04), hsl.l); }
      s.envMapIntensity = 1;
      if (o === tags.floor) { s.roughness = 0.25; s.metalness = 0.04; s.envMapIntensity = 2.2; }          // waxed floor with a soft reflection gradient
      else if (lock.has(m)) { s.roughness = 0.3; s.metalness = 0.35; s.envMapIntensity = 1.4; }          // satin painted-metal lockers
      else if (s.color.getHexString() === "9a653d") { s.roughness = 0.45; s.metalness = 0; }              // warm waxed wood
      else if (s.roughness >= 0.9) s.roughness = 0.66;                                                    // soft painted surfaces
    };
    S.traverse((o) => {
      const l = o as THREE.LineSegments; if (l.isLineSegments) { l.visible = false; return; }
      const m = o as THREE.Mesh; if (!m.isMesh) return; const g = m.geometry as any, mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const x of mats) tune(x, m);
      if (g.type === "IcosahedronGeometry" && g.parameters.detail === 0) { m.geometry = new THREE.IcosahedronGeometry(g.parameters.radius, 3); g.dispose(); if (!(m as THREE.InstancedMesh).isInstancedMesh) m.scale.multiplyScalar(1.12); }   // plump round foliage
      else if (g.type === "ConeGeometry" && g.parameters.radialSegments === 6 && g.parameters.height > 10) { const rad = g.parameters.radius; m.geometry = new THREE.SphereGeometry(rad, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2); m.scale.y = g.parameters.height / rad * 1.1; m.position.y = -0.5; g.dispose(); }   // rolling hills
      else if (g.type === "PlaneGeometry" && g.parameters.width === W + 7) m.visible = false;              // papercut diorama shadow
    });
    this.addShafts(tags.winSpots); this.addScenery();
  }

  /** slanted additive light shafts from every sun-facing window plus a warm patch on the floor (one merged mesh) */
  private addShafts(wins: PxTags["winSpots"]) {
    const d = new THREE.Vector3(-11, -9, -7).normalize(), pos: number[] = [], col: number[] = [], idx: number[] = []; let n = 0;
    const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, e: THREE.Vector3, ca: number, cb: number) => { for (const [v, k] of [[a, ca], [b, ca], [c, cb], [e, cb]] as const) { pos.push(v.x, v.y, v.z); col.push(1 * k, 0.8 * k, 0.5 * k); } idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4; };
    const at = (w: { x: number; z: number }, t: THREE.Vector2, u: number, y: number, s: number) => new THREE.Vector3(w.x + t.x * u + d.x * s, y + d.y * s, w.z + t.y * u + d.z * s);
    wins.forEach((w, i) => {
      const nx = Math.sin(w.rot), nz = Math.cos(w.rot), t = new THREE.Vector2(Math.cos(w.rot), -Math.sin(w.rot)); if (d.x * nx + d.z * nz <= 0.1 || hash(i, 3) < 0.15) return;
      for (const y of [3.75, 2.4]) { const s = y / -d.y; quad(at(w, t, -0.7, y, 0.05), at(w, t, 0.7, y, 0.05), at(w, t, 0.7, y, s), at(w, t, -0.7, y, s), 0.5, 0); }
      const s0 = 2.1 / -d.y, s1 = 3.95 / -d.y, f = (u: number, s: number) => { const p = at(w, t, u, 0, s); p.y = 0.035; return p; };
      quad(f(-0.7, s0), f(0.7, s0), f(0.7, s1), f(-0.7, s1), 0.55, 0.3);
    });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    const m = this.shafts = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    m.frustumCulled = false; m.renderOrder = 4; this.scene.add(m);
  }

  /** garlands of glowing bulbs along the walls and over the fountain, plump bushes and flowers in front of the school */
  private addScenery() {
    const S = this.scene, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), bulbs: [number, number, number][] = [];
    const run = (x0: number, z0: number, x1: number, z1: number) => { const len = Math.hypot(x1 - x0, z1 - z0), k = Math.floor(len / 1.1); for (let i = 0; i <= k; i++) { const u = i / k; bulbs.push([x0 + (x1 - x0) * u, 3.62 - Math.sin(u * Math.PI * (len / 6)) * 0.12, z0 + (z1 - z0) * u]); } };
    const a = W / 2 - 0.5, b = H / 2 - 0.5; run(-a, -b, a, -b); run(-a, -b, -a, b); run(a, -b, a, b);
    for (let i = 0; i < 28; i++) { const t = (i / 28) * Math.PI * 2; bulbs.push([Math.cos(t) * 5.6, 4.4, Math.sin(t) * 5.6]); }
    const cols = ["#ffb35a", "#ff7aa8", "#7fe0ff", "#ffe27a", "#b9a0ff"], bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), bulbs.length);
    bulbs.forEach((p, i) => { bm.setMatrixAt(i, m4.compose(new THREE.Vector3(...p), q, new THREE.Vector3(1, 1.25, 1))); bm.setColorAt(i, c.set(cols[i % 5]).multiplyScalar(2.4)); }); S.add(bm);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.014, 4, 80), new THREE.MeshBasicMaterial({ color: "#5a3d2a" })); ring.rotation.x = Math.PI / 2; ring.position.y = 4.4; S.add(ring);
    const spots: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 70; i++) { const x = (hash(i, 21) - 0.5) * 52; if (Math.abs(x) < 6.5) continue; spots.push({ x, z: H / 2 + 1.5 + hash(i, 22) * 2.4, s: 0.55 + hash(i, 23) * 0.55 }); }
    const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3), new THREE.MeshStandardMaterial({ roughness: 0.7 }), spots.length), fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.5, emissive: "#ffffff", emissiveIntensity: 0.18 }), spots.length * 3);
    const greens = ["#4fb06c", "#6cc57f", "#3f9a62", "#7bd18a"], fc = ["#ff6f91", "#ffd23f", "#ffffff", "#b58cff", "#ff9a3c"];
    spots.forEach((p, i) => { bush.setMatrixAt(i, m4.compose(new THREE.Vector3(p.x, p.s * 0.75, p.z), q, new THREE.Vector3(p.s, p.s * 0.85, p.s))); bush.setColorAt(i, c.set(greens[i % 4]));
      for (let k = 0; k < 3; k++) { const an = hash(i, 30 + k) * 6.28, r = p.s * (0.55 + 0.3 * hash(i, 40 + k)); fl.setMatrixAt(i * 3 + k, m4.compose(new THREE.Vector3(p.x + Math.cos(an) * r * 0.7, p.s * (0.95 + 0.3 * hash(i, 50 + k)), p.z + Math.sin(an) * r * 0.7 + 0.35 * p.s), q, new THREE.Vector3(1, 1, 1))); fl.setColorAt(i * 3 + k, c.set(fc[(i + k) % 5])); } });
    bush.castShadow = true; bush.receiveShadow = true; S.add(bush, fl);
  }
}
