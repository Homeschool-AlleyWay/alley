/** A hinged door leaf (swings about its left edge) in front of a painted glimpse of what is behind it. Used by the classroom and auditorium; the hallway builds its own with the same DoorState. */
import * as THREE from "three";
import { DoorState } from "./doors";

export interface DoorMesh { root: THREE.Group; state: DoorState; update(dt: number): void }
/** root faces +z (into the room); put it on the wall face and rotate it so +z points into the room */
export function hingedDoor(o: { w?: number; h: number; leaf: THREE.Texture; peek: THREE.Texture; swing?: number; speed?: number }): DoorMesh {
  const w = o.w ?? 1.3, root = new THREE.Group(), st = new DoorState(o.speed ?? 1 / 0.9, 1.4), swing = o.swing ?? 1.8;
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(w, o.h), new THREE.MeshBasicMaterial({ map: o.peek })); inner.position.set(0, o.h / 2, 0.02); root.add(inner);
  const pv = new THREE.Group(); pv.position.set(-w / 2, 0, 0.06);
  const leaf = new THREE.Mesh(new THREE.PlaneGeometry(w, o.h), new THREE.MeshStandardMaterial({ map: o.leaf, roughness: 0.95, side: THREE.DoubleSide })); leaf.position.set(w / 2, o.h / 2, 0); leaf.castShadow = true; pv.add(leaf);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: "#EAB94E" })); knob.position.set(w - 0.12, o.h * 0.44, 0.04); pv.add(knob); root.add(pv);
  return { root, state: st, update(dt) { st.update(dt); pv.rotation.y = -st.eased * swing; } };
}
/** a tiny painted hallway (blue lockers, tile floor) for the far side of a classroom door */
export function hallGlimpse(): THREE.CanvasTexture {
  const cv = document.createElement("canvas"); cv.width = 128; cv.height = 256; const c = cv.getContext("2d")!;
  c.fillStyle = "#EADFCB"; c.fillRect(0, 0, 128, 256); c.fillStyle = "#cfe0ea"; for (let i = 0; i < 4; i++) { c.fillStyle = ["#7fb2d6", "#f2a79b", "#9fd0b0", "#f4d488"][i]; c.fillRect(i * 32, 80, 30, 120); c.fillStyle = "rgba(0,0,0,.2)"; c.fillRect(i * 32 + 8, 100, 14, 3); }
  c.fillStyle = "#F7ECD6"; c.fillRect(0, 200, 128, 56); c.strokeStyle = "rgba(120,100,70,.35)"; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, 205 + i * 10); c.lineTo(128, 205 + i * 10); c.stroke(); }
  const t = new THREE.CanvasTexture(c.canvas); t.colorSpace = THREE.SRGBColorSpace; return t;
}
