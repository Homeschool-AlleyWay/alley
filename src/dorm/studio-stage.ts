/** The wardrobe studio's 3D stage: an open wardrobe with true mirrors (three.js Reflector) behind a slowly spinning avatar, a room corner, warm Sims-1-like light and soft shadows.
 *  It draws into a rectangle of the page's existing renderer (viewport + scissor), so there is one WebGL context and no extra canvas. */
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { createChar3D, type Char3DEx } from "./char3d";
import type { AvatarSpec } from "../hall3d/avatar";
import type { Style } from "./types";

const SPIN_SECONDS = 13.5, IDLE_RESUME = 3;
export interface Rect { x: number; y: number; w: number; h: number }

export class StudioStage {
  readonly scene = new THREE.Scene(); readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40); readonly char: Char3DEx;
  yaw = 0.15; private zoom = 1; private idle = 99; private dragging = false; private open = 0; private pitch = 0.17; private camYaw = 0.42;
  private set = new THREE.Group(); private doors: THREE.Group[] = []; private mirrors: Reflector[] = []; private disposables: { dispose(): void }[] = []; private key: THREE.DirectionalLight;
  constructor(private renderer: THREE.WebGLRenderer, style: Style, spec: AvatarSpec, private mobile: boolean) {
    const sc = this.scene, pixar = style.id === "pixar", tex = mobile ? 256 : 512;
    sc.background = new THREE.Color(pixar ? "#d9c3a6" : "#e8d9bf");
    const hemi = new THREE.HemisphereLight(0xfff1dc, 0xb88a64, pixar ? 0.55 : 0.85), key = new THREE.DirectionalLight(0xffdcaa, pixar ? 2.1 : 1.5), rim = new THREE.DirectionalLight(0xbfd4ff, pixar ? 0.9 : 0.5), fill = new THREE.DirectionalLight(0xffe9d0, pixar ? 0.5 : 0.3);
    key.position.set(2.6, 4.2, 3.4); key.castShadow = true; key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); key.shadow.radius = 5; key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
    const c = key.shadow.camera; c.left = c.bottom = -2.4; c.right = c.top = 2.4; c.near = 1; c.far = 14; rim.position.set(-3, 3, -4); fill.position.set(-3, 1.5, 3);
    sc.add(hemi, key, key.target, rim, fill); this.key = key;
    const M = (k: any, col: string, o: any = {}) => style.mat(k, col, o);
    const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, p: THREE.Object3D = this.set) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); this.disposables.push(o.geometry); return o; };
    // room corner: floor, back wall, left wall, skirting
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), M("floor", "#c79a6a")); floor.receiveShadow = true; floor.position.set(0, 0, 0.5);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), M("wall", "#e9cfae")); back.position.set(0, 2, -0.95); back.receiveShadow = true;
    const left = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), M("wall", "#e2c4a0")); left.rotation.y = Math.PI / 2; left.position.set(-2.1, 2, 0.5); left.receiveShadow = true;
    this.set.add(floor, back, left); this.disposables.push(floor.geometry, back.geometry, left.geometry);
    box(9, 0.1, 0.03, M("wood", "#9a6b43"), 0, 0.05, -0.93); box(0.03, 0.1, 9, M("wood", "#9a6b43"), -2.08, 0.05, 0.5);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40).rotateX(-Math.PI / 2), M("rug", "#e8b9a8")); rug.position.set(0, 0.006, 0); rug.receiveShadow = true; this.set.add(rug); this.disposables.push(rug.geometry);
    // the wardrobe: carcass, plinth, crown and two doors swung open
    const wood = M("wood", "#b9803f"), dark = M("wood", "#8c5b2d"), W = 1.7, H = 2.1, D = 0.55, z0 = -0.9, zf = z0 + D;
    box(0.05, H, D, wood, -W / 2 - 0.025, H / 2, z0 + D / 2); box(0.05, H, D, wood, W / 2 + 0.025, H / 2, z0 + D / 2); box(W + 0.1, 0.06, D, wood, 0, H + 0.03, z0 + D / 2); box(W + 0.1, 0.1, D, dark, 0, 0.05, z0 + D / 2); box(W + 0.16, 0.04, D + 0.06, dark, 0, H + 0.08, z0 + D / 2 + 0.01);
    box(W, 0.03, D - 0.02, wood, 0, 0.12, z0 + D / 2); box(W, H - 0.2, 0.03, dark, 0, H / 2 + 0.1, z0 + 0.015);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, W, 8).rotateZ(Math.PI / 2), M("metal", "#cfcfd6")); rod.position.set(0, H - 0.22, z0 + 0.3); this.set.add(rod); this.disposables.push(rod.geometry);
    const mir = (w: number, h: number, parent: THREE.Object3D, x: number, y: number, z: number, ry: number) => {
      const r = new Reflector(new THREE.PlaneGeometry(w, h), { textureWidth: tex, textureHeight: Math.round(tex * h / w) || tex, color: 0x868b93, clipBias: 0.003, multisample: mobile ? 0 : 2 }); r.position.set(x, y, z); r.rotation.y = ry; parent.add(r); this.mirrors.push(r); this.disposables.push(r.geometry, r); return r;
    };
    mir(W - 0.12, H - 0.42, this.set, 0, H / 2 + 0.1, z0 + 0.04, 0);
    for (const sd of [-1, 1]) {
      const hinge = new THREE.Group(); hinge.position.set(sd * (W / 2 + 0.05), 0, zf); this.set.add(hinge); this.doors.push(hinge);
      const dw = W / 2 + 0.02, off = -sd * dw / 2;   // door leaf extends from the hinge toward the middle when closed
      box(dw, H - 0.04, 0.035, wood, off, H / 2, 0, hinge); box(0.06, H - 0.04, 0.045, dark, off - sd * (dw / 2 - 0.03), H / 2, 0, hinge);
      mir(dw - 0.14, H - 0.36, hinge, off, H / 2, -0.0195, Math.PI);   // mirror on the inside face
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), M("metal", "#e6c46a")); knob.position.set(-sd * (dw - 0.03), H * 0.5, 0.03); hinge.add(knob); this.disposables.push(knob.geometry);
    }
    sc.add(this.set);
    this.char = createChar3D(style, spec); sc.add(this.char.root); this.fit();
  }
  /** keep the set in proportion to the avatar (kids are smaller than the wardrobe, but not absurdly so) */
  private fit() { const k = THREE.MathUtils.clamp(this.char.height / 1.7, 0.72, 1.1); this.set.scale.setScalar(k); this.key.target.position.set(0, this.char.height * 0.4, 0); }
  setSpec(s: AvatarSpec) { this.char.setSpec({ ...s }); this.fit(); }
  setDragging(on: boolean) { this.dragging = on; this.idle = 0; }
  spinBy(dx: number) { this.yaw += dx; this.idle = 0; }
  zoomBy(f: number) { this.zoom = THREE.MathUtils.clamp(this.zoom * f, 0.62, 1.5); }
  get spinning() { return !this.dragging && this.idle >= IDLE_RESUME; }
  /** ray from a point in the stage (0..1 across and down) */
  ray(fx: number, fy: number) { const r = new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(fx * 2 - 1, -(fy * 2 - 1)), this.camera); return r; }
  update(dt: number) {
    dt = Math.min(dt, 0.1); this.idle += dt; if (this.spinning) this.yaw += (Math.PI * 2 / SPIN_SECONDS) * dt;
    this.open = Math.min(1, this.open + dt / 1.1); const e = 1 - Math.pow(1 - this.open, 3);
    this.doors[0].rotation.y = -e * 1.85; this.doors[1].rotation.y = e * 1.85;
    this.char.root.rotation.y = this.yaw; this.char.update(dt);
  }
  render(r: Rect) {
    const R = this.renderer, h = this.char.height, aspect = r.w / Math.max(1, r.h), th = Math.tan(this.camera.fov * Math.PI / 360);
    const dist = Math.max((h * 1.5) / 2 / th, 2.0 / (th * aspect)) * this.zoom;
    this.camera.aspect = aspect; this.camera.updateProjectionMatrix();
    const ty = h * 0.5; this.camera.position.set(Math.sin(this.camYaw) * Math.cos(this.pitch) * dist, ty + Math.sin(this.pitch) * dist, Math.cos(this.camYaw) * Math.cos(this.pitch) * dist); this.camera.lookAt(0, ty, 0);
    const innerH = R.domElement.clientHeight; R.setViewport(r.x, innerH - r.y - r.h, r.w, r.h); R.setScissor(r.x, innerH - r.y - r.h, r.w, r.h); R.setScissorTest(true);
    R.render(this.scene, this.camera); R.setScissorTest(false);
  }
  dispose() {
    this.char.dispose(); for (const d of this.disposables) d.dispose(); this.scene.traverse((o: any) => { if (o.isLight && o.shadow?.map) o.shadow.map.dispose(); }); this.scene.clear();
  }
}
