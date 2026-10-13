/** Player light beam: a soft additive light pillar + floor ring + sparkles over the player's own avatar, so you can always find yourself.
 *  One shared on/off setting (localStorage 'unify.beam', default ON) that every 3D page reads; the shell flips it and the other pages follow via the `storage` event. */
import * as THREE from "three";
import { isPixar } from "./look";

const KEY = "unify.beam";
let on = true; try { on = localStorage.getItem(KEY) !== "0"; } catch { /* private mode */ }
const subs = new Set<() => void>();
export function isBeamEnabled() { return on; }
export function setBeamEnabled(v: boolean) { on = !!v; try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* private mode */ } subs.forEach((f) => f()); }
export function onBeamChange(f: () => void) { subs.add(f); }
addEventListener("storage", (e) => { if (e.key === KEY) { on = e.newValue !== "0"; subs.forEach((f) => f()); } });

/** an avatar colour pushed into a bright, saturated beam tint */
export function beamColor(hex: string | number | THREE.Color | undefined, fallback = "#ffd36a"): THREE.Color {
  const c = new THREE.Color(hex ?? fallback), h = { h: 0, s: 0, l: 0 }; c.getHSL(h);
  if (isPixar()) return c.setHSL(h.h, Math.min(0.55, h.s) * 0.7, 0.62).lerp(new THREE.Color(1, 0.94, 0.82), 0.55);   // Pixar look: the accent only whispers, toward warm white
  return c.setHSL(h.h, Math.max(h.s, 0.6), Math.min(0.68, Math.max(0.56, h.l)));
}

let texCol: THREE.CanvasTexture | null = null, texRing: THREE.CanvasTexture | null = null, texDot: THREE.CanvasTexture | null = null;
function cv(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function textures() {
  // the pillar is faint around the body (bottom ~26%) and strongest just above the head, then fades out: it marks you without tinting you. Soft sides come from the horizontal falloff.
  texCol ||= (() => {
    const c = document.createElement("canvas"); c.width = 32; c.height = 64; const g = c.getContext("2d")!, im = g.createImageData(32, 64), st = [[0, 0], [0.45, 0.34], [0.72, 0.36], [0.8, 0.12], [1, 0.05]];
    for (let y = 0; y < 64; y++) { const v = y / 63; let k = 1; while (k < st.length - 1 && v > st[k][0]) k++; const a = st[k - 1][1] + (st[k][1] - st[k - 1][1]) * Math.min(1, (v - st[k - 1][0]) / (st[k][0] - st[k - 1][0]));
      for (let x = 0; x < 32; x++) { const u = (x + 0.5) / 16 - 1, h = (1 - u * u) ** 2, o = (y * 32 + x) * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = 255; im.data[o + 3] = Math.round(255 * a * h * 2.2); } }
    g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  texRing ||= cv(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,.35)"); g.addColorStop(0.55, "rgba(255,255,255,.18)"); g.addColorStop(0.72, "rgba(255,255,255,.95)"); g.addColorStop(0.82, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  texDot ||= cv(32, 32, (c) => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 32, 32); });
  return { col: texCol, ring: texRing, dot: texDot };
}
const mat = (map: THREE.Texture, color: THREE.Color, side: THREE.Side = THREE.FrontSide, add = true) => new THREE.MeshBasicMaterial({ map, color, transparent: true, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, side, fog: false, toneMapped: false, opacity: 0.8 });

export class Beam {
  readonly group = new THREE.Group();
  private pillar: THREE.Mesh; private ring: THREE.Mesh; private ripple: THREE.Mesh; private sparks: THREE.Points; private mats: THREE.Material[]; private sp: Float32Array; private ph: number[] = [];
  private color: THREE.Color; private H: number; private R: number; private reduced = false;
  /** `size` scales the whole beam (1 = a person ~1.8 high); `height` of the pillar in world units */
  constructor(parent: THREE.Object3D, color?: string | number | THREE.Color, o: { size?: number; height?: number } = {}) {
    const s = o.size ?? 1, T = textures(); this.R = 0.62 * s; this.H = (o.height ?? 7) * s; this.color = beamColor(color);
    const pg = new THREE.PlaneGeometry(this.R * (isPixar() ? 1.5 : 2.4), this.H); pg.translate(0, this.H / 2, 0);   // a camera-facing soft-edged strip (billboard around Y)
    this.pillar = new THREE.Mesh(pg, mat(T.col, this.color, THREE.FrontSide, false));   // normal blending: tints bright rooms instead of washing out to white
    const fg = new THREE.PlaneGeometry(1, 1); fg.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(fg, mat(T.ring, this.color)); this.ring.scale.setScalar(this.R * 2.6); this.ring.position.y = 0.04;
    this.ripple = new THREE.Mesh(fg, mat(T.ring, this.color)); this.ripple.position.y = 0.045;
    this.sp = new Float32Array(10 * 3); const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute("position", new THREE.BufferAttribute(this.sp, 3));
    for (let i = 0; i < 10; i++) this.ph.push(Math.random());
    const pm = new THREE.PointsMaterial({ map: T.dot, color: this.color, size: 0.16 * s, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, sizeAttenuation: true });
    this.sparks = new THREE.Points(pgeo, pm); this.sparks.frustumCulled = false;
    this.mats = [this.pillar.material as THREE.Material, this.ring.material as THREE.Material, this.ripple.material as THREE.Material, pm];
    this.group.add(this.pillar, this.ring, this.ripple, this.sparks); this.group.traverse((m) => { m.renderOrder = 10; m.frustumCulled = false; });
    this.ring.renderOrder = this.ripple.renderOrder = -5;   // floor glow is drawn before the avatar sprites, so their quads never cut into it
    this.group.visible = false; parent.add(this.group);
    try { this.reduced = !!matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* none */ }
  }
  setColor(c: string | number | THREE.Color | undefined) { this.color = beamColor(c); for (const m of this.mats) (m as THREE.MeshBasicMaterial).color.copy(this.color); }
  dispose() { this.group.removeFromParent(); this.pillar.geometry.dispose(); this.ring.geometry.dispose(); this.sparks.geometry.dispose(); this.mats.forEach((m) => m.dispose()); }
  /** call every frame: `pos` = feet of the player; `show` false hides it (e.g. the avatar is hidden); `t` = seconds */
  update(t: number, camera: THREE.Camera, pos: THREE.Vector3 | { x: number; y: number; z: number }, show = true) {
    const g = this.group; g.visible = show && on; if (!g.visible) return;
    g.position.set(pos.x, pos.y, pos.z);
    // fade the pillar out when the camera is close (own-seat / first-person views), and widen it with distance so it stays findable from far away
    const dx = camera.position.x - pos.x, dz = camera.position.z - pos.z, dist = Math.hypot(dx, dz) || 1, near = Math.min(1, Math.max(0, (dist - 3) / 3)), far = Math.min(3, Math.max(1, dist / 14));
    this.pillar.visible = near > 0.02; this.pillar.rotation.y = Math.atan2(dx, dz); this.pillar.position.set(dx / dist * 0.4, 0, dz / dist * 0.4); this.pillar.scale.x = far;   // a little toward the camera so it is never hidden inside the avatar's own sprite quad
    this.sparks.visible = near > 0.3; const k = this.reduced ? 0 : 1, pulse = 0.85 + 0.15 * Math.sin(t * 2.2) * k;
    (this.pillar.material as THREE.MeshBasicMaterial).opacity = pulse * near * (isPixar() ? 0.6 : 1);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = (isPixar() ? 0.5 : 0.6) * pulse; this.ring.scale.setScalar(this.R * 2.6 * Math.sqrt(far) * (1 + 0.05 * Math.sin(t * 2.2) * k));
    const u = this.reduced ? 0.5 : (t * 0.55) % 1; this.ripple.scale.setScalar(this.R * Math.sqrt(far) * (2.4 + u * 3.2)); (this.ripple.material as THREE.MeshBasicMaterial).opacity = this.reduced ? 0 : 0.5 * (1 - u) * (1 - u);
    for (let i = 0; i < 10; i++) { const p = (this.ph[i] + t * (0.09 + (i % 3) * 0.03) * k) % 1, a = this.ph[i] * 40 + t * 0.7 * k, r = this.R * (0.35 + 0.45 * ((i * 37) % 10) / 10); this.sp[i * 3] = Math.cos(a) * r; this.sp[i * 3 + 1] = 0.2 + p * this.H * 0.8; this.sp[i * 3 + 2] = Math.sin(a) * r; }
    (this.sparks.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
(window as any).__beam = { setBeamEnabled, isBeamEnabled };   // for the shell / tests
