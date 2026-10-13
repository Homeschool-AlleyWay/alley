/** Pixar edition of the auditorium (isPixar() only): deep indigo hall with magenta/gold accents, ACES + bloom, soft spotlight shadows, visible stage beams with dust,
 *  glowing footlights / ceiling lamps, and real 3D Pixar characters for the two principals, you and the ~11 nearest audience members (the rest stay tinted sprites). */
import * as THREE from "three";
import type { Auditorium3D } from "./Auditorium3D";
import { usePixarLook, lightShaft, dustMotes, halo, pixarize } from "../shared/pixarScene";
import { getStyle } from "../dorm/style";
import { createChar3D, type Char3DEx } from "../dorm/char3d";
import type { Anim } from "../dorm/types";
import { ROSTER, STAFF } from "../hall3d/roster";
import { Social } from "../hall3d/social";

export interface AudPx { render(dt: number): void; resize(w: number, h: number): void; update(dt: number, t: number): void }
const TINT = new THREE.Color(1.0, 0.93, 0.9), N3D = 11;
const lerpA = (a: number, b: number, k: number) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

export function setupPixarAud(A: Auditorium3D, L: { hemi: THREE.HemisphereLight; dl: THREE.DirectionalLight; spotL: THREE.SpotLight; spotR: THREE.SpotLight }): AudPx {
  const { scene, camera, renderer } = A, style = getStyle("pixar");
  const look = usePixarLook(renderer, scene, camera, { exposure: 0.85, bloom: 0.4, radius: 0.8, threshold: 1.0, env: 0.18 });
  scene.background = new THREE.Color("#1b1240"); (scene.fog as THREE.Fog).color.set("#241a52"); (scene.fog as THREE.Fog).near = 50; (scene.fog as THREE.Fog).far = 140;
  L.hemi.color.set("#ffd9f0"); L.hemi.groundColor.set("#3a2470"); L.hemi.intensity = 0.55; L.dl.color.set("#ffcf9a"); L.dl.intensity = 0.7;
  L.spotL.color.set("#ffd27a"); L.spotR.color.set("#ff8fd6"); L.spotL.intensity = L.spotR.intensity = 140; L.spotL.angle = L.spotR.angle = 0.6;
  for (const sp of [L.spotL, L.spotR]) { sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.0004; sp.shadow.normalBias = 0.03; sp.shadow.radius = 5; sp.shadow.camera.near = 5; sp.shadow.camera.far = 60; }
  const rim = new THREE.DirectionalLight(0x6fd6ff, 0.6); rim.position.set(0, 12, 40); scene.add(rim);
  const P = new THREE.Group(); scene.add(P);
  /* beams from the truss lights, dust inside them, footlights, aisle lights */
  const beams = [[-8, 15, -10, -3, 1.5, -33, 0xffd27a], [8, 15, -10, 3, 1.5, -33, 0xff8fd6], [-14, 13.3, -30, -10, 1.5, -33, 0x6fd6ff], [14, 13.3, -30, 10, 1.5, -33, 0xffb454]].map(([x, y, z, tx, ty, tz, c]) => {
    const a = new THREE.Vector3(x - 0.5, y, z), b = new THREE.Vector3(x + 0.5, y, z), m = lightShaft(a, b, new THREE.Vector3(tx - x, ty - y, tz - z), Math.hypot(tx - x, ty - y, tz - z), c, 0.13, 7); P.add(m); return m.material as THREE.MeshBasicMaterial;
  });
  const dust = dustMotes({ x0: -16, x1: 16, y0: 1.5, y1: 14, z0: -36, z1: -12 }, 260, "#ffe8c0", 0.12, 0.6); P.add(dust.points);
  const dust2 = dustMotes({ x0: -14, x1: 14, y0: 1, y1: 13, z0: -12, z1: 20 }, 120, "#ffe8c0", 0.1, 0.4); P.add(dust2.points);
  const fm = new THREE.MeshStandardMaterial({ color: "#fff2cf", emissive: new THREE.Color("#ffb454"), emissiveIntensity: 2.5, roughness: 0.4 });
  for (let i = -9; i <= 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), fm); l.position.set(i * 2, 1.78, -27.2); P.add(l); }
  const aisle = new THREE.MeshStandardMaterial({ color: "#fff", emissive: new THREE.Color("#ff9ad0"), emissiveIntensity: 3 });
  for (let r = 0; r < 18; r++) for (const x of [-1.35, 1.35]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), aisle); l.position.set(x, r * 0.2 + 0.2, -18 + r * 1.55); P.add(l); }
  const gold = new THREE.MeshStandardMaterial({ color: "#f2c14e", metalness: 0.8, roughness: 0.25 });
  for (const sx of [-1, 1]) { const g = new THREE.Group(), pot = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.65, 1.3, 24), gold); pot.position.y = 0.65; g.add(pot);
    for (let i = 0; i < 16; i++) { const a = i * 2.4, lf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: ["#2fae6a", "#5fcf7f", "#1e8a55"][i % 3], roughness: 0.5 })); lf.scale.set(0.45, 2.2 + (i % 3) * 0.5, 0.25); lf.position.set(Math.cos(a) * 0.45, 2.3, Math.sin(a) * 0.45); lf.rotation.set(Math.sin(a) * 0.5, -a, -Math.cos(a) * 0.5); g.add(lf); }
    g.position.set(sx * 17, 1.5, -30); P.add(g); }
  /* glow on lamps / screen */
  scene.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const mt = m.material as THREE.MeshBasicMaterial;
    if (mt.isMeshBasicMaterial && !mt.map && (Math.abs(m.position.y - 15.4) < 0.01 || Math.abs(m.position.y - 13.3) < 0.01)) { mt.color.multiplyScalar(3); if (Math.abs(m.position.y - 13.3) < 0.01) { const h = halo(0xfff0cf, 3.2, 0.5); h.position.copy(m.position); P.add(h); } }
    if (mt.isMeshBasicMaterial && mt.map === A.screenTex) mt.color.setScalar(1.0); });
  /* shadows: everything receives, the stage + podium + characters cast */
  scene.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh) return; m.receiveShadow = true; if (m.position.z < -24 && m.position.y < 4 && !(m.material as THREE.Material).transparent) m.castShadow = true; });
  A.baseMesh.receiveShadow = A.backMesh.receiveShadow = true;
  pixarize(scene, { rough: 0.45, sat: 1.15 });

  /* characters */
  const chars: Char3DEx[] = [], mk = (spec: any) => { const c = createChar3D(style, spec); scene.add(c.root); chars.push(c); return c; };
  const princ = new Map<string, Char3DEx>(), aud = new Map<number, Char3DEx>(); let me: Char3DEx | null = null;
  { const base = (f: string) => STAFF.find((d) => d.faculty === f)!.spec;
    princ.set("ayrissa", mk({ ...base("ayrissa"), top: "blazer", shirt: "#3b2f6b", shirt2: "#f6f1e8", bottom: "pants", pants: "#2e2a3d" }));
    princ.set("marcus", mk({ ...base("tanaka"), skin: "#6b4430", hair: "#1c1512", shirt: "#2b3445", shirt2: "#f1f4f8", top: "blazer", bottom: "pants", pants: "#232a38", beard: "goatee", beardColor: "#1c1512" })); }
  const seatPos = (i: number) => A.seats[i];
  const sit = (c: Char3DEx, x: number, y: number, z: number) => { c.root.position.set(x, y + 0.55 + 0.03 - c.seatHeight, z + 0.02); c.root.rotation.y = Math.PI; };
  const chosen: number[] = A.audience.map((a, i) => ({ a, i })).sort((p, q) => Math.hypot(p.a.sprite.position.x - A.me.sprite.position.x, p.a.sprite.position.z - A.me.sprite.position.z) - Math.hypot(q.a.sprite.position.x - A.me.sprite.position.x, q.a.sprite.position.z - A.me.sprite.position.z)).slice(0, N3D).map((p) => p.i);
  for (const i of chosen) { const spec = ROSTER[i % 36].spec; aud.set(i, mk(i >= 36 ? { ...spec, shirt: ["#e8789a", "#4f91c7", "#88b89a", "#eab94e", "#b8a8da"][i % 5] } : spec)); }
  me = mk(Social.profile.avatar);
  const pose: Record<string, number> = {}; void pose; void seatPos;
  return {
    render(dt) { look.render(dt); },
    resize(w, h) { look.resize(w, h); },
    update(dt, t) {
      dust.tick(t); dust2.tick(t); for (let i = 0; i < beams.length; i++) beams[i].opacity = 0.12 * (0.85 + 0.15 * Math.sin(t * 1.3 + i));
      for (const [k, p] of A.stage) {
        const c = princ.get(k)!, sp = p.sprite; sp.visible = false; c.root.position.set(p.pos.x, p.pos.y, p.pos.z);
        const walking = !!p.target, talk = A.speaking === k || A.speaking === "both";
        if (walking && p.target) c.root.rotation.y = lerpA(c.root.rotation.y, Math.atan2(p.target.x - p.pos.x, p.target.z - p.pos.z), 0.2); else c.root.rotation.y = lerpA(c.root.rotation.y, 0, 0.1);
        c.play(walking ? "walk" : A.gesture === k && A.gestureFrame === 3 ? "wave" : talk || (A.gesture === k) ? "talk" : "idle"); c.speak(talk); c.update(dt);
      }
      const stand = A.standing, hide = A.view === "audience";
      for (const [i, c] of aud) {
        const a = A.audience[i], s = A.seats[a.seat]; a.sprite.visible = false;
        if (stand) { c.root.position.set(s.x, s.y + 0.05, s.z - 0.1); c.play(A.cheer ? "cheer" : "idle"); } else { sit(c, s.x, s.y, s.z); c.play(A.cheer ? "cheer" : "sit"); if (A.cheer) c.root.position.y = s.y + 0.05; }
        c.speak(A.chatter && i % 3 === 0); c.update(dt);
      }
      if (me) { const mp = A.me.sprite.position; A.me.sprite.visible = false; me.root.visible = !hide;
        if (stand) { me.root.position.set(mp.x, mp.y - 0.35, mp.z - 0.1); me.play("idle"); } else { sit(me, mp.x, mp.y - 0.4, mp.z - 0.1); me.play(A.cheer ? "cheer" : "sit"); } me.update(dt); }
      for (const a of A.audience) if (a.sprite.visible !== false) a.mat.color.copy(TINT);
    },
  };
}
