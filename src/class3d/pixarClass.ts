/** Pixar edition of the classroom (isPixar() only): ACES + bloom chain, warm key / cool fill / magenta rim, haze, window light shafts, dust motes, glowing pendants,
 *  richer props, and real 3D Pixar characters (createChar3D) for the teacher, the player and the ~12 nearest classmates. Everyone else keeps their sprite, tinted warm. */
import * as THREE from "three";
import type { Classroom3D } from "./Classroom3D";
import { usePixarLook, lightShaft, dustMotes, halo, dotTex, pixarize } from "../shared/pixarScene";
import { getStyle } from "../dorm/style";
import { createChar3D, type Char3DEx } from "../dorm/char3d";
import type { Anim } from "../dorm/types";
import { Social } from "../hall3d/social";
import type { AvatarSpec } from "../hall3d/avatar";
import { Mood } from "../hall3d/mood";
import { INTERIOR_SCALE as IS, CHAR_K, fitChar } from "../shared/scale";

export interface ClassGeo { X0: number; X1: number; Z0: number; Z1: number; WALL: number; STAGE_H: number; groundY(z: number): number; rowH(r: number): number; rowZ(r: number): number }
export interface ClassLights { hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight; spot: THREE.SpotLight; ceil: THREE.MeshBasicMaterial }
export interface ClassPx { k: { hemi: number; sun: number }; render(dt: number): void; resize(w: number, h: number): void; update(dt: number, t: number, dim: number): void; syncSeats(): void; syncTeacher(): void; refresh(root: THREE.Object3D): void }
const N3D = 12, WARM = new THREE.Color(1.0, 0.95, 0.86);
const lerpA = (a: number, b: number, k: number) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

export function setupPixarClass(r: Classroom3D, G: ClassGeo, L: ClassLights): ClassPx {
  const { scene, camera, renderer } = r, style = getStyle("pixar");
  const look = usePixarLook(renderer, scene, camera, { exposure: 0.88, bloom: 0.18, radius: 0.6, threshold: 1.25, env: 0.12 });
  scene.fog = new THREE.Fog(0xe8c9a0, 40, 110);
  /* lights: warm key from the windows, cool teal fill from the right, magenta/gold rim from behind the stage */
  L.sun.position.set(-13, 8.5, 4.5); L.sun.shadow.radius = 7; L.sun.shadow.mapSize.set(Math.min(L.sun.shadow.mapSize.x, 2048), Math.min(L.sun.shadow.mapSize.y, 2048));
  const fill = new THREE.DirectionalLight(0x8fd2ff, 0.3); fill.position.set(10, 6, 9); const rim = new THREE.DirectionalLight(0xff8fd0, 0.7); rim.position.set(-4, 6, -14); const warmPt = new THREE.PointLight(0xffb066, 9 * IS * IS, 12 * IS, 1.6); warmPt.position.set(0, 3.6, -6.5);
  scene.add(fill, rim, warmPt);
  const hemiSky = new THREE.Color(0xcfe8ff), hemiGnd = new THREE.Color(0xffc98a), sunC = new THREE.Color(0xffcf94);

  /* window light shafts (left wall), dust motes, glowing pendants */
  const P = new THREE.Group(); P.name = "pixar"; scene.add(P);
  const dir = new THREE.Vector3(0.82, -0.46, -0.18);
  const shafts = [-6.2, -2.6, 1.0, 4.6, 7.8].map((z) => { const a = new THREE.Vector3(G.X0 + 0.3, 4.15, z - 0.9), b = new THREE.Vector3(G.X0 + 0.3, 4.15, z + 0.9), m = lightShaft(a, b, dir, 11, 0xffd9a0, 0.1, 1.5); P.add(m); return m.material as THREE.MeshBasicMaterial; });
  const dust = dustMotes({ x0: G.X0 + 1, x1: G.X1 - 1, y0: 0.4, y1: 4.6, z0: G.Z0 + 1, z1: G.Z1 - 1 }, 150, "#fff0c8", 0.07, 0.6); P.add(dust.points);
  const lampM = new THREE.MeshStandardMaterial({ color: "#fff1d6", emissive: new THREE.Color("#ffb454"), emissiveIntensity: 3.2, roughness: 0.4 });
  const lampCols = [0xffb454, 0xff7fb0, 0x6fd6e0, 0xffd45a];
  [[-4, -5.2], [4, -5.2], [-4, 0.5], [4, 0.5], [-4, 5.5], [4, 5.5]].forEach(([x, z], i) => {
    const m = lampM.clone(); m.emissive.set(lampCols[i % 4]); const g = new THREE.Group(), s = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), m); s.scale.y = 1.15; g.add(s);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshStandardMaterial({ color: "#6b4a3a" })); cord.position.y = 0.64; cord.scale.y = 0.9; g.add(cord);
    const h = halo(lampCols[i % 4], 1.9, 0.5); g.add(h); g.position.set(x, G.WALL - 1.75, z); P.add(g);
  });
  /* richer props: lush plants, a big glossy globe by the teacher, stacked books, pennant garland, warm glow pools */
  const leafCols = [0x3fae6a, 0x62c27a, 0x2e8f5a, 0x8ad08a];
  const plant = (x: number, y: number, z: number, s = 1) => { const g = new THREE.Group(), pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.5, 20), new THREE.MeshStandardMaterial({ color: "#ff8a6b", roughness: 0.35 })); pot.position.y = 0.25; pot.castShadow = true; g.add(pot);
    for (let i = 0; i < 14; i++) { const a = i * 2.4, l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshStandardMaterial({ color: leafCols[i % 4], roughness: 0.5 })); l.scale.set(0.45, 1.5 + (i % 3) * 0.4, 0.2); l.position.set(Math.cos(a) * 0.18, 0.95 + (i % 4) * 0.12, Math.sin(a) * 0.18); l.rotation.set(Math.sin(a) * 0.55, -a, -Math.cos(a) * 0.55); l.castShadow = true; g.add(l); }
    g.scale.setScalar(s); g.position.set(x, y, z); P.add(g); };
  void plant;   // tall shared plants (shared/plants.ts) are placed by Classroom3D
  { const g = new THREE.Group(), gm = new THREE.MeshStandardMaterial({ color: "#3d8be0", roughness: 0.18, metalness: 0.15 }); const s = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), gm); s.position.y = 1.02; s.rotation.z = 0.4; s.castShadow = true; g.add(s);
    for (const [px, pz, c] of [[-0.2, 0.1, 0x4cc27a], [0.15, -0.2, 0x6ad08a], [0.1, 0.25, 0x56b86f]] as const) { const lm = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 })); lm.scale.set(1, 0.3, 1); lm.position.set(px * 1.6, 1.02 + pz * 0.9, pz * 1.5 + 0.34); g.add(lm); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 36, Math.PI * 1.1), new THREE.MeshStandardMaterial({ color: "#f2c14e", metalness: 0.8, roughness: 0.25 })); ring.position.y = 1.02; ring.rotation.set(0.2, 0.3, 0); g.add(ring);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.1, 20), new THREE.MeshStandardMaterial({ color: "#f2c14e", metalness: 0.7, roughness: 0.3 })); base.position.y = 0.05; g.add(base);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), new THREE.MeshStandardMaterial({ color: "#f2c14e", metalness: 0.7, roughness: 0.3 })); st.position.y = 0.45; g.add(st); g.position.set(-5.3, G.STAGE_H, -8.0); P.add(g); }
  { const bc = [0xe8505b, 0x3d8be0, 0xf2c14e, 0x4cc27a, 0x9b6ad0]; for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.46 - i * 0.03, 0.09, 0.34), new THREE.MeshStandardMaterial({ color: bc[i], roughness: 0.4 })); b.position.set(-2.1 + (i % 2) * 0.03, G.STAGE_H + 0.9 + i * 0.09, -8.15); b.rotation.y = (i - 2) * 0.12; b.castShadow = true; P.add(b); } }
  { const cols = [0xff7a59, 0xffc233, 0x2fc4b2, 0xb36bd6, 0xff6fa3], pos: number[] = [], col: number[] = []; const y0 = G.WALL - 0.55, n = 22;
    for (let i = 0; i < n; i++) { const x0 = G.X0 + 0.5 + (i / n) * (G.X1 - G.X0 - 1), x1 = x0 + 0.62, yA = y0 - Math.sin((i / n) * Math.PI) * 0.0 - 0.3 * Math.sin((i / n) * Math.PI * 3), c = new THREE.Color(cols[i % 5]); pos.push(x0, yA, -2.4, x1, yA, -2.4, (x0 + x1) / 2, yA - 0.5, -2.4); for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); P.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.6 }))); }
  const glow = (x: number, z: number, w: number, d: number, c: number, y: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: dotTex(), color: c, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); P.add(m); };
  glow(0, -7.0, 9, 3.4, 0xffb25a, G.STAGE_H + 0.03); glow(-6.2, -7.6, 4.5, 2.4, 0xff9ad0, G.STAGE_H + 0.03); glow(6.2, -7.6, 4.5, 2.4, 0x7fd6ff, G.STAGE_H + 0.03);
  pixarize(scene, { rough: 0.38, sat: 1.4 });

  /* characters */
  const chars: Char3DEx[] = [], mk = (spec: AvatarSpec) => { const c = fitChar(createChar3D(style, spec)); scene.add(c.root); chars.push(c); return c; };
  const kill = (c: Char3DEx | undefined) => { if (!c) return; c.dispose(); const i = chars.indexOf(c); if (i >= 0) chars.splice(i, 1); };
  let tChar: Char3DEx | null = null, tDef: unknown = null;
  const seatAnim = (s: (typeof r.seats)[number]): Anim => (s.hand === 1 ? "raise" : s.act && !s.player ? "type" : "sit");
  const put = (s: (typeof r.seats)[number]) => { const c = s.c3 as Char3DEx; c.root.position.set(s.x, s.y + 0.03 - c.seatHeight * CHAR_K, s.z + 0.02); c.root.rotation.y = Math.PI; c.play("sit"); };
  const tmpV = new THREE.Vector3(), headV = new THREE.Vector3();
  const syncTeacher = () => { const t = r.teacher; if (!t || tDef === t.def) return; kill(tChar ?? undefined); tDef = t.def; tChar = mk(t.def.spec); tChar.root.position.copy(t.pos); t.bb.sprite.visible = false; t.bb.blob.visible = false; };
  return {
    k: { hemi: 0.22, sun: 1.9 },
    render(dt) { look.render(dt); },
    resize(w, h) { look.resize(w, h); },
    refresh(root) { pixarize(root, { rough: 0.38, sat: 1.4 }); },
    syncSeats() {
      for (const s of r.seats) { if (s.c3) { kill(s.c3 as Char3DEx); s.c3 = undefined; } }
      const ps = r.playerSeat, order = r.seats.filter((s) => !s.player).sort((a, b) => Math.hypot(a.x - ps.x, a.z - ps.z) - Math.hypot(b.x - ps.x, b.z - ps.z)).slice(0, N3D);
      for (const s of [ps, ...order]) { const spec = s.player ? Social.profile.avatar : s.def?.spec; if (!spec) continue; s.c3 = mk(spec); put(s); }
    },
    syncTeacher,
    update(dt, t, dim) {
      // keep the palette (the mood system recolours the lights when the hour changes)
      L.hemi.color.copy(Mood.hemiSky).lerp(hemiSky, 0.7); L.hemi.groundColor.copy(hemiGnd); L.sun.color.copy(Mood.sun).lerp(sunC, 0.7);
      warmPt.intensity = 9 * IS * IS * (1 - 0.7 * dim); fill.intensity = 0.3 * (1 - 0.6 * dim); rim.intensity = 0.7 * (1 - 0.3 * dim);
      L.ceil.color.multiplyScalar(1.3);                                       // ceiling panels glow (bloom)
      const sm = ((r as unknown) as { screenMesh?: THREE.Mesh }).screenMesh; if (sm) (sm.material as THREE.MeshBasicMaterial).color.setScalar(1.25);
      dust.tick(t); for (const m of shafts) m.opacity = 0.1 * (1 - 0.7 * dim) * (0.85 + 0.15 * Math.sin(t * 0.7));
      // teacher
      const T = r.teacher; syncTeacher();
      if (tChar && T) {
        T.bb.sprite.visible = false; T.bb.blob.visible = false; tChar.root.position.copy(T.pos); tChar.root.rotation.y = lerpA(tChar.root.rotation.y, Math.atan2(T.face.x, T.face.z), Math.min(1, dt * 10));
        const on = !!T.emo && t < T.emo.until, g = on ? T.emo!.g : null, thinking = g === "chin" || g === "headhands" || (on && T.emo!.e === "thinking");
        tChar.play(T.moving ? "walk" : g === "cheer" || g === "clap" ? "cheer" : g === "wave" ? "wave" : thinking ? "think" : T.mode === "point" ? "point" : T.mode === "write" || T.mode === "present" || T.talking ? "talk" : "idle");
        tChar.speak(T.talking); tChar.lookAt(null); tChar.update(dt);
      }
      // students
      const tp = T ? headV.set(T.pos.x, T.pos.y, T.pos.z).multiplyScalar(IS).setY(T.pos.y * IS + 1.55) : null;
      for (const s of r.seats) {
        const c = s.c3 as Char3DEx | undefined;
        if (!c) { s.bb.mat.color.multiply(WARM); continue; }
        s.bb.sprite.visible = false; s.bb.blob.visible = false; c.root.visible = !(s.player && r.mode === "seat");
        c.play(seatAnim(s)); if (tp && !s.player) c.lookAt(tmpV.copy(tp)); c.update(dt);
      }
    },
  };
}
