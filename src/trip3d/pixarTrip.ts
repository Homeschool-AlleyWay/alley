/** Pixar edition of the field trips (isPixar() only): vivid sky + haze, warm sun with soft shadows, cool fill, sun shafts and dust, bloom on the glowing orbs,
 *  saturated satin materials, and the guide teacher as a real 3D Pixar character (talking mouth) instead of the 2D sprite. */
import * as THREE from "three";
import type { Trip3D, Trip } from "./Trip3D";
import { usePixarLook, lightShaft, dustMotes, pixarize, type PixarLook } from "../shared/pixarScene";
import { getStyle } from "../dorm/style";
import { createChar3D, type Char3DEx } from "../dorm/char3d";
import type { NpcDef } from "../hall3d/roster";

export interface TripPx { look: PixarLook; onLoad(t: Trip): void; guide(npc: NpcDef): void; talk(on: boolean): void; update(dt: number, t: number): void }

/** richer ground: soft procedural texture (mottling + speckle + a worn path), grass tufts, and soft contact shadows under props */
function enrichGround(world: THREE.Group, P: THREE.Group, id: string) {
  let gm: THREE.Mesh | null = null;
  world.traverse((o) => { const m = o as THREE.Mesh; if (!gm && m.isMesh && m.geometry.type === "CircleGeometry" && (m.geometry as THREE.CircleGeometry).parameters.radius >= 60) gm = m; });
  if (!gm) return; const g = gm as THREE.Mesh, gy = g.position.y, mt = g.material as THREE.MeshStandardMaterial, rnd = Math.random;
  const cv = document.createElement("canvas"); cv.width = cv.height = 512; const c = cv.getContext("2d")!; c.fillStyle = "#fff"; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) { const x = rnd() * 512, y = rnd() * 512, r = 30 + rnd() * 90, d = rnd() < 0.5, gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, d ? "rgba(70,60,40,.34)" : "rgba(255,255,230,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; for (const ox of [-512, 0, 512]) { c.save(); c.translate(ox, 0); c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); } }
  for (let i = 0; i < 2600; i++) { c.fillStyle = rnd() < 0.5 ? "rgba(40,40,20,.16)" : "rgba(255,255,220,.2)"; c.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 2.5, 1 + rnd() * 2.5); }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(9, 9); tx.anisotropy = 4; mt.map = tx; mt.color.multiplyScalar(1.05); mt.needsUpdate = true;
  g.receiveShadow = true;
  const tuft = ({ forest: [1200, ["#2f8a3a", "#4fae48", "#76c653", "#1f6e3a"]], dino: [1300, ["#6a9a2e", "#8cbc3c", "#b2cc4a", "#4f8a30"]], rome: [260, ["#8f9a3e", "#a8a850", "#7c8a3a"]] } as Record<string, [number, string[]]>)[id];
  if (tuft) {
    const n = tuft[0], geo = new THREE.ConeGeometry(0.1, 0.9, 4).translate(0, 0.45, 0), im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), n * 3), d = new THREE.Object3D(), col = new THREE.Color(); let k = 0;
    for (let i = 0; i < n; i++) { const a = rnd() * 6.283, r = 2.5 + Math.sqrt(rnd()) * 30, x = Math.cos(a) * r, z = Math.sin(a) * r; if (id === "forest" && Math.abs(x) < 2.6) continue; const s = 0.6 + rnd() * 1.1; col.set(tuft[1][i % tuft[1].length]);
      for (let b = 0; b < 3; b++) { d.position.set(x + (b - 1) * 0.07, gy, z + (rnd() - 0.5) * 0.12); d.rotation.set((rnd() - 0.5) * 0.7, rnd() * 6.28, (rnd() - 0.5) * 0.7); d.scale.set(1, s * (0.8 + rnd() * 0.5), 1); d.updateMatrix(); im.setMatrixAt(k, d.matrix); im.setColorAt(k++, col); } }
    im.count = k; im.castShadow = false; im.receiveShadow = true; im.raycast = () => {}; P.add(im);
  }
  /* contact shadows: a soft dark pool under every grounded prop */
  const cs = document.createElement("canvas"); cs.width = cs.height = 64; const x2 = cs.getContext("2d")!, rg = x2.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, "rgba(0,0,0,.6)"); rg.addColorStop(0.5, "rgba(0,0,0,.3)"); rg.addColorStop(1, "rgba(0,0,0,0)"); x2.fillStyle = rg; x2.fillRect(0, 0, 64, 64);
  const cm = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cs), transparent: true, depthWrite: false, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), cg = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), bb = new THREE.Box3(), sz = new THREE.Vector3(), ct = new THREE.Vector3(); let nc = 0;
  for (const o of world.children) { if (o === g || nc > 140) continue; bb.setFromObject(o); if (bb.isEmpty() || bb.min.y > gy + 0.9 || bb.min.y < gy - 1.2) continue; bb.getSize(sz); bb.getCenter(ct); const r = Math.max(sz.x, sz.z); if (r < 0.3 || r > 14) continue;
    const m = new THREE.Mesh(cg, cm); m.scale.set(r * 1.5, 1, r * 1.5); m.position.set(ct.x, gy + 0.03, ct.z); m.renderOrder = 1; m.raycast = () => {}; P.add(m); nc++; }
}

export function setupPixarTrip(T: Trip3D, hemi: THREE.HemisphereLight, sun: THREE.DirectionalLight): TripPx {
  const { scene, cam, renderer } = T, style = getStyle("pixar");
  const look = usePixarLook(renderer, scene, cam, { exposure: 1.0, bloom: 0.35, radius: 0.7, threshold: 1.0, env: 0.25 });
  hemi.color.set(0xcdeaff); hemi.groundColor.set(0xffd9a0); hemi.intensity = 0.7; sun.color.set(0xffd9a0); sun.intensity = 2.9; sun.position.set(14, 24, 10);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 5; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
  const sc = sun.shadow.camera; sc.left = sc.bottom = -34; sc.right = sc.top = 34; sc.near = 1; sc.far = 80;
  const fill = new THREE.DirectionalLight(0x8fd2ff, 0.5); fill.position.set(-12, 6, -10); const rim = new THREE.DirectionalLight(0xff9ad0, 0.5); rim.position.set(-6, 8, 16); scene.add(fill, rim);
  let P = new THREE.Group(); scene.add(P); let dust = dustMotes({ x0: -14, x1: 14, y0: -1, y1: 9, z0: -14, z1: 14 }, 140); P.add(dust.points);
  let ch: Char3DEx | null = null;
  return {
    look,
    onLoad(t) {
      scene.remove(P); P = new THREE.Group(); scene.add(P); const space = t.id === "space";
      const bg = scene.background as THREE.Texture | null; if (bg) { bg.colorSpace = THREE.SRGBColorSpace; bg.needsUpdate = true; }
      if (scene.fog) { const f = scene.fog as THREE.Fog; f.near = 22; f.far = 68; }
      hemi.intensity = space ? 0.35 : 0.7; sun.intensity = space ? 1.6 : 2.9;
      T.world.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const mt = m.material as THREE.MeshBasicMaterial; m.castShadow = !!(m.material as THREE.MeshStandardMaterial).isMeshStandardMaterial; m.receiveShadow = true; if (mt.isMeshBasicMaterial && mt.color.getHex() === 0xffe27a) mt.color.multiplyScalar(2.5); });
      pixarize(T.world, { rough: 0.5, sat: 1.45 }); if (!space) enrichGround(T.world, P, t.id);
      dust = dustMotes({ x0: -14, x1: 14, y0: -1, y1: 9, z0: -14, z1: 14 }, space ? 60 : 140, space ? "#bcd8ff" : "#fff2cf"); P.add(dust.points);
      if (!space) for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.35, x = Math.sin(a) * 18, z = -Math.cos(a) * 18; P.add(lightShaft(new THREE.Vector3(x + 4, 24, z - 3), new THREE.Vector3(x + 7, 24, z - 2), new THREE.Vector3(-0.35, -1, 0.15), 28, 0xffe2a8, 0.1, 1.6)); }
    },
    guide(npc) {
      if (ch) { ch.dispose(); ch = null; } ch = createChar3D(style, npc.spec); ch.root.scale.setScalar(1.25); scene.add(ch.root);
    },
    talk(on) { ch?.speak(on); ch?.play(on ? "talk" : "idle"); },
    update(dt, t) {
      dust.tick(t); if (T.guide) T.guide.visible = false;
      if (ch && T.guide) { const g = T.guide.position; ch.root.position.set(g.x, g.y - 1.125, g.z); ch.root.rotation.y = Math.atan2(cam.position.x - g.x, cam.position.z - g.z); ch.update(dt); }
    },
  };
}
