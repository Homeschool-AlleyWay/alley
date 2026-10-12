/** Auditorium extras that follow the mood: spotlight beams (additive cones), a banner over the stage, wall pennants, and re-coloured seats / light tints. */
import * as THREE from "three";
import { QuadBatch, BoxBatch, bannerStripeTex, tex } from "../hall3d/decor";
import { Mood, Gfx } from "../hall3d/mood";

export interface AudIn { hemi: THREE.HemisphereLight; dl: THREE.DirectionalLight; spots: THREE.SpotLight[]; bg: THREE.Color; fog: THREE.Fog; baseMesh: THREE.InstancedMesh; backMesh: THREE.InstancedMesh; seatCount: number }
const hash = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };

export function buildAudExtras(S: THREE.Scene, A: AudIn) {
  const G = new THREE.Group(); G.name = "details"; S.add(G); const tmp = new THREE.Color(), b0 = { hemi: A.hemi.color.clone(), gnd: A.hemi.groundColor.clone(), dl: A.dl.color.clone(), bg: A.bg.clone() }, white = new THREE.Color("#ffffff");
  // additive beams from the two spots down to the stage; they tint with the mood accent
  const cones = A.spots.map((sp, i) => { const len = sp.position.distanceTo(sp.target.position), g = new THREE.ConeGeometry(4.2, len, 28, 1, true).translate(0, -len / 2, 0).rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: "#fff0cf", transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); m.position.copy(sp.position); m.lookAt(sp.target.position); m.frustumCulled = false; G.add(m); void i; return m; });
  // banner hung over the stage opening, tinted by the accent, with two ropes
  const bn = tex(1024, 140, (c, w, h) => { c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); c.fillStyle = "rgba(0,0,0,.12)"; c.fillRect(0, h - 12, w, 12); c.fillStyle = "#3b2f6b"; const t = "UNIFY ACADEMY  ★  LEARN · ASK · DISCOVER"; let fs = 76; c.font = `700 ${fs}px 'Trebuchet MS',sans-serif`; while (c.measureText(t).width > w - 80 && fs > 30) { fs -= 2; c.font = `700 ${fs}px 'Trebuchet MS',sans-serif`; } c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(t, w / 2, h / 2 - 4); }), bm = Mood.tinted(new THREE.MeshBasicMaterial({ map: bn, side: THREE.DoubleSide }), "accent2", 0.75);
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.2), bm); ban.position.set(0, 12.6, -26.55); G.add(ban);
  const rope = new BoxBatch(); for (const sx of [-7.6, 7.6]) rope.box(sx, 14.0, -26.56, 0.08, 1.8, 0.08, "#d9b25a"); G.add(rope.mesh(new THREE.MeshStandardMaterial({ vertexColors: true }), false));
  // pennants along both side walls
  const bt = bannerStripeTex(), q1 = new QuadBatch(), q2 = new QuadBatch(); for (let z = -22, i = 0; z < 36; z += 7, i++) for (const sx of [-1, 1]) (i % 2 ? q1 : q2).quad(sx * 34.85, 10.5, z, sx < 0 ? Math.PI / 2 : -Math.PI / 2, 1.9, 5.7, [0, 0, 1, 1]);
  const pen = [q1.mesh(Mood.tinted(new THREE.MeshStandardMaterial({ map: bt, vertexColors: true, roughness: 1 }), "accent", 1)), q2.mesh(Mood.tinted(new THREE.MeshStandardMaterial({ map: bt, vertexColors: true, roughness: 1 }), "accent2", 1))]; pen.forEach((m) => G.add(Gfx.detail(m)));
  // seats: mostly velvet reds, a scatter of plum / teal / gold / navy, and a few in the mood accent
  const reds = ["#8e1f33", "#9c2438", "#841c2f", "#a02a40"], mix = ["#6b2a5a", "#1f5a62", "#a8742a", "#2f4a8a"], col = new THREE.Color();
  const paintSeats = () => { for (let i = 0; i < A.seatCount; i++) { const h = hash(i, 5); if (h < 0.1) col.copy(Mood.accent).multiplyScalar(0.75); else if (h < 0.34) col.set(mix[Math.floor(hash(i, 6) * 4)]); else col.set(reds[(i * 7) % 4]); A.baseMesh.setColorAt(i, col); A.backMesh.setColorAt(i, col); } if (A.baseMesh.instanceColor) A.baseMesh.instanceColor.needsUpdate = true; if (A.backMesh.instanceColor) A.backMesh.instanceColor.needsUpdate = true; };
  const tint = () => {
    A.hemi.color.copy(b0.hemi).lerp(Mood.hemiSky, 0.3); A.hemi.groundColor.copy(b0.gnd).lerp(Mood.accent2, 0.12); A.dl.color.copy(b0.dl).lerp(Mood.sun, 0.3);
    A.bg.copy(b0.bg).lerp(tmp.copy(Mood.sky).multiplyScalar(0.22), 0.45); A.fog.color.copy(A.bg);
    A.spots[0]?.color.copy(white).lerp(Mood.accent2, 0.4); A.spots[1]?.color.copy(white).lerp(Mood.accent, 0.4);
    cones.forEach((c, i) => (c.material as THREE.MeshBasicMaterial).color.copy(white).lerp(i ? Mood.accent : Mood.accent2, 0.55));
  };
  Mood.onChange(() => { paintSeats(); tint(); }); paintSeats(); tint();
  return { tick(t: number) { const pulse = Gfx.reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 1.3); cones.forEach((c, i) => ((c.material as THREE.MeshBasicMaterial).opacity = (0.035 + 0.035 * Mood.night) * (i ? 2 - pulse : pulse))); } };
}
