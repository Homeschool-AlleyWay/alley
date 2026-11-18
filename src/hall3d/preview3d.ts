/** Small stand-alone 3D preview of an AvatarSpec (the dorm's procedural character in the papercut style) for the avatar creator. */
import * as THREE from "three";
import { createChar3D, type Char3DEx } from "../dorm/char3d";
import { getStyle } from "../dorm/style";
import { isPixar } from "../shared/look";
import type { AvatarSpec } from "./avatar";
import type { StyleRig } from "../dorm/types";

export class Preview3D {
  readonly ok: boolean; private renderer?: THREE.WebGLRenderer; private scene = new THREE.Scene(); private cam = new THREE.PerspectiveCamera(30, 0.75, 0.1, 60); private rig?: StyleRig;
  private char?: Char3DEx; private yaw = 0; private tYaw = 0; private floor?: THREE.Mesh; private drag = -1; private lastX = 0; private last = performance.now();
  constructor(readonly canvas: HTMLCanvasElement, spec: AvatarSpec) {
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
      const pix = isPixar(), style = getStyle(pix ? "pixar" : "papercut"); this.rig = style.setup(this.renderer, this.scene, this.cam); this.rig.setQuality(0);
      if (!pix) this.scene.background = new THREE.Color("#e4eddf"); const fog = this.scene.fog as THREE.Fog | null; if (fog) { fog.near = 300; fog.far = 600; }   // the style keeps recolouring the fog, so keep it but push it out of view
      this.floor = new THREE.Mesh(new THREE.CircleGeometry(0.85, 40).rotateX(-Math.PI / 2), style.mat("floor", "#cfdccb")); this.floor.receiveShadow = true; this.scene.add(this.floor);
      this.char = createChar3D(style, spec); this.scene.add(this.char.root); this.ok = true;
      canvas.addEventListener("pointerdown", (e) => { this.drag = e.pointerId; this.lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener("pointermove", (e) => { if (e.pointerId !== this.drag) return; this.tYaw += (e.clientX - this.lastX) * 0.012; this.yaw = this.tYaw; this.lastX = e.clientX; });
      canvas.addEventListener("pointerup", (e) => { if (e.pointerId === this.drag) this.drag = -1; });
      canvas.style.touchAction = "pan-y";
    } catch { this.ok = false; }
  }
  setSpec(s: AvatarSpec) { this.char?.setSpec({ ...s }); }
  /** 0 front, 1 right, 2 back, 3 left */
  face(i: number) { this.tYaw = [0, Math.PI / 2, Math.PI, -Math.PI / 2][i] ?? 0; }
  walk(on: boolean) { this.char?.play(on ? "walk" : "idle"); }
  /** the character's current (stylised) pixel signature for tests */
  get height() { return this.char?.height ?? 0; }
  render() {
    if (!this.ok || !this.renderer || !this.rig || !this.char) return;
    const now = performance.now(); if (now - this.last < 30) return; const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (w < 8 || h < 8) return;
    const pr = Math.min(devicePixelRatio || 1, 1.25), W = Math.round(w * pr), H = Math.round(h * pr);
    if (this.canvas.width !== W || this.canvas.height !== H) this.rig.resize(w, h, pr);
    this.yaw += (this.tYaw - this.yaw) * (1 - Math.exp(-dt * 10)); this.char.root.rotation.y = this.yaw; this.char.update(dt);
    const ch = this.char.height, th = Math.tan((this.cam.fov * Math.PI) / 360), d = Math.max((ch * 1.18) / 2 / th, 0.42 * (ch / 1.6) / (th * this.cam.aspect));
    this.cam.position.set(0, ch * 0.55, d); this.cam.lookAt(0, ch * 0.5, 0); this.rig.render(dt);
  }
  dispose() { this.char?.dispose(); this.rig?.dispose(); this.floor?.geometry.dispose(); this.renderer?.dispose(); }
}
