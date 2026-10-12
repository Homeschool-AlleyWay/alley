/** 360 degree orbit camera for the dorm (Sims-style): drag/pinch/pan/keys, inertia, eased focus transitions. */
import * as THREE from "three";

export interface CamPose { pos: THREE.Vector3; target: THREE.Vector3 }
export interface DormCameraOpts { home?: CamPose; bounds?: THREE.Box3; minDist?: number; maxDist?: number }

const TAU = Math.PI * 2;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrapPi = (a: number) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

export class DormCamera {
  /** page can set this to refuse drags that start on something else (e.g. dragging a furniture piece) */
  ignore: ((e: PointerEvent) => boolean) | null = null;
  enabled = true;
  readonly target = new THREE.Vector3(0.1, 1.0, -0.3);
  yaw = 0; pitch = 0.4; dist = 5;
  private el: HTMLElement | null = null;
  private home: CamPose;
  private bounds: THREE.Box3;
  private minDist: number; private maxDist: number;
  private yawV = 0; private pitchV = 0; private zoomV = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private gesture = { dist: 0, mx: 0, my: 0 };
  private panning = false;
  private down = { t: 0, x: 0, y: 0, moved: 0, id: -1, count: 0 };
  private tapCb: ((e: PointerEvent) => void)[] = [];
  private keys = new Set<string>();
  private auto = false; private autoPause = 0;
  private reduced = false;
  private tr: { t: number; d: number; t0: THREE.Vector3; t1: THREE.Vector3; y0: number; y1: number; p0: number; p1: number; d0: number; d1: number } | null = null;
  private v1 = new THREE.Vector3(); private v2 = new THREE.Vector3(); private v3 = new THREE.Vector3();
  private mq: MediaQueryList | null = null;

  constructor(readonly camera: THREE.PerspectiveCamera, o: DormCameraOpts = {}) {
    this.home = o.home ?? { pos: new THREE.Vector3(-1.0, 2.75, 6.3), target: new THREE.Vector3(0.1, 0.95, -0.3) };
    this.bounds = o.bounds ?? new THREE.Box3(new THREE.Vector3(-2.1, 0.2, -2.4), new THREE.Vector3(2.1, 2.1, 2.4));
    this.minDist = o.minDist ?? 0.6; this.maxDist = o.maxDist ?? 9;
    if (typeof matchMedia === "function") { this.mq = matchMedia("(prefers-reduced-motion: reduce)"); this.reduced = this.mq.matches; }
    this.setPose(this.home);
    this.apply();
  }

  /* ------------------------------------------------------------ public */
  attach(el: HTMLElement) {
    this.detach(); this.el = el; el.style.touchAction = "none";
    el.addEventListener("pointerdown", this.onDown); el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerup", this.onUp); el.addEventListener("pointercancel", this.onUp);
    el.addEventListener("wheel", this.onWheel, { passive: false }); el.addEventListener("contextmenu", this.onCtx);
    window.addEventListener("keydown", this.onKey); window.addEventListener("keyup", this.onKeyUp); window.addEventListener("blur", this.onBlur);
  }
  detach() {
    const el = this.el; if (!el) return;
    el.removeEventListener("pointerdown", this.onDown); el.removeEventListener("pointermove", this.onMove);
    el.removeEventListener("pointerup", this.onUp); el.removeEventListener("pointercancel", this.onUp);
    el.removeEventListener("wheel", this.onWheel); el.removeEventListener("contextmenu", this.onCtx);
    window.removeEventListener("keydown", this.onKey); window.removeEventListener("keyup", this.onKeyUp); window.removeEventListener("blur", this.onBlur);
    this.pointers.clear(); this.keys.clear(); this.el = null;
  }
  onTap(cb: (e: PointerEvent) => void) { this.tapCb.push(cb); }
  /** client coordinates of an event to normalised device coords for api.pick() */
  toNdc(e: { clientX: number; clientY: number }, out = { x: 0, y: 0 }) {
    const r = (this.el ?? document.body).getBoundingClientRect();
    out.x = ((e.clientX - r.left) / r.width) * 2 - 1; out.y = -((e.clientY - r.top) / r.height) * 2 + 1; return out;
  }
  focusOn(p: CamPose, seconds = 0.8) {
    const dest = this.toSph(p);
    this.yawV = this.pitchV = this.zoomV = 0;
    if (this.reduced || seconds <= 0) { this.target.copy(p.target); this.yaw = dest.yaw; this.pitch = dest.pitch; this.dist = dest.dist; this.tr = null; this.apply(); return; }
    this.tr = { t: 0, d: seconds, t0: this.target.clone(), t1: p.target.clone(), y0: this.yaw, y1: this.yaw + wrapPi(dest.yaw - this.yaw), p0: this.pitch, p1: dest.pitch, d0: this.dist, d1: dest.dist };
  }
  reset(seconds = 0.8) { this.focusOn(this.home, seconds); }
  setHome(p: CamPose) { this.home = { pos: p.pos.clone(), target: p.target.clone() }; }
  autoRotate(on: boolean) { this.auto = on && !this.reduced; }
  get autoRotating() { return this.auto; }
  get transitioning() { return !!this.tr; }
  /** instantly place the camera */
  setPose(p: CamPose) { const s = this.toSph(p); this.target.copy(p.target); this.yaw = s.yaw; this.pitch = s.pitch; this.dist = s.dist; this.tr = null; }
  orbitBy(dyaw: number, dpitch = 0) { this.yaw += dyaw; this.pitch += dpitch; this.clampAll(); this.apply(); }
  zoomBy(f: number) { this.dist *= f; this.clampAll(); this.apply(); }
  dispose() { this.detach(); this.tapCb.length = 0; }

  update(dt: number) {
    dt = Math.min(dt, 0.1);
    if (this.reduced) { this.yawV = this.pitchV = this.zoomV = 0; }
    if (this.tr) {
      const t = this.tr; t.t += dt; const k = ease(Math.min(1, t.t / t.d));
      this.target.lerpVectors(t.t0, t.t1, k); this.yaw = t.y0 + (t.y1 - t.y0) * k; this.pitch = t.p0 + (t.p1 - t.p0) * k; this.dist = t.d0 + (t.d1 - t.d0) * k;
      if (t.t >= t.d) this.tr = null;
    } else {
      this.keyStep(dt);
      const dragging = this.pointers.size > 0;
      if (!dragging) {
        if (this.autoPause > 0) this.autoPause -= dt; else if (this.auto) this.yaw += 0.18 * dt;
        this.yaw += this.yawV * dt; this.pitch += this.pitchV * dt; this.dist *= Math.exp(this.zoomV * dt);
        const d = Math.exp(-dt * 6); this.yawV *= d; this.pitchV *= d; this.zoomV *= d;
        if (Math.abs(this.yawV) < 1e-3) this.yawV = 0; if (Math.abs(this.pitchV) < 1e-3) this.pitchV = 0; if (Math.abs(this.zoomV) < 1e-3) this.zoomV = 0;
      }
    }
    this.clampAll(); this.apply();
  }

  /* ------------------------------------------------------------ internals */
  private toSph(p: CamPose) {
    const v = this.v1.subVectors(p.pos, p.target); const dist = Math.max(0.1, v.length());
    return { yaw: Math.atan2(v.x, v.z), pitch: Math.asin(THREE.MathUtils.clamp(v.y / dist, -1, 1)), dist };
  }
  private clampAll() {
    this.dist = THREE.MathUtils.clamp(this.dist, this.minDist, this.maxDist);
    const b = this.bounds; this.target.clamp(b.min, b.max);
    // keep the camera above the floor
    const lo = Math.max(0.03, Math.asin(THREE.MathUtils.clamp((0.18 - this.target.y) / this.dist, -1, 1)));
    this.pitch = THREE.MathUtils.clamp(this.pitch, lo, 1.5);
    if (this.yaw > Math.PI * 8 || this.yaw < -Math.PI * 8) this.yaw = wrapPi(this.yaw);
  }
  private apply() {
    const cp = Math.cos(this.pitch);
    this.camera.position.set(this.target.x + this.dist * cp * Math.sin(this.yaw), this.target.y + this.dist * Math.sin(this.pitch), this.target.z + this.dist * cp * Math.cos(this.yaw));
    this.camera.lookAt(this.target);
  }
  private pan(dx: number, dy: number) {
    const h = this.el?.clientHeight || 600;
    const k = (2 * this.dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2)) / h;
    const right = this.v2.setFromMatrixColumn(this.camera.matrixWorld, 0);
    const fwd = this.v3.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.target.addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k * 1.0);
    this.clampAll();
  }
  private keyStep(dt: number) {
    const k = this.keys; if (!k.size) return;
    const r = 1.6 * dt;
    if (k.has("q") || k.has("arrowleft")) this.yaw -= r;
    if (k.has("e") || k.has("arrowright")) this.yaw += r;
    if (k.has("arrowup")) this.pitch += r * 0.6;
    if (k.has("arrowdown")) this.pitch -= r * 0.6;
    if (k.has("+") || k.has("=")) this.dist *= Math.exp(-1.2 * dt);
    if (k.has("-") || k.has("_")) this.dist *= Math.exp(1.2 * dt);
    this.autoPause = 2;
  }
  private interrupt() { this.tr = null; this.autoPause = 3; }

  private onCtx = (e: Event) => e.preventDefault();
  private onDown = (e: PointerEvent) => {
    if (!this.enabled || e.target !== this.el || (this.ignore && this.ignore(e))) return;
    this.el!.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.interrupt(); this.yawV = this.pitchV = this.zoomV = 0;
    if (this.pointers.size === 1) {
      this.down = { t: performance.now(), x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId, count: 1 };
      this.panning = e.button === 2 || e.button === 1 || e.shiftKey || e.ctrlKey;
    } else { this.down.count = 2; this.startGesture(); }
  };
  private startGesture() {
    const p = [...this.pointers.values()]; if (p.length < 2) return;
    this.gesture.dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
    this.gesture.mx = (p[0].x + p[1].x) / 2; this.gesture.my = (p[0].y + p[1].y) / 2;
  }
  private onMove = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (this.pointers.size === 1) {
      this.down.moved += Math.abs(dx) + Math.abs(dy);
      if (this.panning) { this.pan(dx, dy); return; }
      const h = this.el!.clientHeight || 600;
      const dyaw = -(dx / h) * 4.2, dpit = (dy / h) * 3.0;
      this.yaw += dyaw; this.pitch += dpit;
      if (!this.reduced) { this.yawV = dyaw * 60; this.pitchV = dpit * 60; }
    } else if (this.pointers.size >= 2) {
      const q = [...this.pointers.values()];
      const d = Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y) || 1;
      this.dist *= this.gesture.dist / d; this.gesture.dist = d;
      const mx = (q[0].x + q[1].x) / 2, my = (q[0].y + q[1].y) / 2;
      this.pan(mx - this.gesture.mx, my - this.gesture.my); this.gesture.mx = mx; this.gesture.my = my;
      this.down.moved += 99;
    }
    this.clampAll(); this.apply();
  };
  private onUp = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    try { this.el!.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (this.pointers.size === 1) this.startGesture();
    const d = this.down;
    if (e.type === "pointerup" && d.id === e.pointerId && d.count === 1 && d.moved < 10 && performance.now() - d.t < 450 && !this.panning) {
      d.id = -1; for (const cb of this.tapCb) cb(e);
    }
    if (this.pointers.size === 0) this.panning = false;
  };
  private onWheel = (e: WheelEvent) => {
    if (!this.enabled) return;
    e.preventDefault(); this.interrupt();
    const k = e.ctrlKey ? 0.01 : 0.0012;
    this.dist *= Math.exp(Math.max(-200, Math.min(200, e.deltaY)) * k);
    if (!this.reduced) this.zoomV = 0;
    this.clampAll(); this.apply();
  };
  private typing(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  }
  private onKey = (e: KeyboardEvent) => {
    if (!this.enabled || this.typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if ("qe+=-_".includes(k) && k.length === 1 || k.startsWith("arrow")) {
      this.keys.add(k); this.interrupt();
      if (k.startsWith("arrow")) e.preventDefault();
      if (this.reduced) { const s = k === "q" || k === "arrowleft" ? -0.25 : k === "e" || k === "arrowright" ? 0.25 : 0; this.yaw += s; if (k === "arrowup") this.pitch += 0.12; if (k === "arrowdown") this.pitch -= 0.12; if (k === "+" || k === "=") this.dist *= 0.9; if (k === "-" || k === "_") this.dist *= 1.1; this.keys.delete(k); this.clampAll(); this.apply(); }
    }
  };
  private onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); };
  private onBlur = () => { this.keys.clear(); this.pointers.clear(); };
}
