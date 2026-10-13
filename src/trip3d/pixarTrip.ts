/** Pixar edition of the field trips (isPixar() only): vivid sky + haze, warm sun with soft shadows, cool fill, sun shafts and dust, bloom on the glowing orbs,
 *  saturated satin materials, and the guide teacher as a real 3D Pixar character (talking mouth) instead of the 2D sprite. */
import * as THREE from "three";
import type { Trip3D, Trip } from "./Trip3D";
import { usePixarLook, lightShaft, dustMotes, pixarize, type PixarLook } from "../shared/pixarScene";
import { getStyle } from "../dorm/style";
import { createChar3D, type Char3DEx } from "../dorm/char3d";
import type { NpcDef } from "../hall3d/roster";

export interface TripPx { look: PixarLook; onLoad(t: Trip): void; guide(npc: NpcDef): void; talk(on: boolean): void; update(dt: number, t: number): void }

export function setupPixarTrip(T: Trip3D, hemi: THREE.HemisphereLight, sun: THREE.DirectionalLight): TripPx {
  const { scene, cam, renderer } = T, style = getStyle("pixar");
  const look = usePixarLook(renderer, scene, cam, { exposure: 1.0, bloom: 0.5, radius: 0.8, threshold: 0.85, env: 0.25 });
  hemi.color.set(0xcdeaff); hemi.groundColor.set(0xffd9a0); hemi.intensity = 0.95; sun.color.set(0xffd9a0); sun.intensity = 2.4; sun.position.set(14, 24, 10);
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
      if (scene.fog) { const f = scene.fog as THREE.Fog; f.near = 24; f.far = 95; }
      hemi.intensity = space ? 0.35 : 0.95; sun.intensity = space ? 1.6 : 2.4;
      T.world.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const mt = m.material as THREE.MeshBasicMaterial; m.castShadow = !!(m.material as THREE.MeshStandardMaterial).isMeshStandardMaterial; m.receiveShadow = true; if (mt.isMeshBasicMaterial && mt.color.getHex() === 0xffe27a) mt.color.multiplyScalar(2.5); });
      pixarize(T.world, { rough: 0.5, sat: 1.3 });
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
