/** Shared "Pixar look" for the classroom, auditorium and field-trip scenes (only used when isPixar()).
 *  usePixarLook: ACES filmic + sRGB, soft key shadows, RoomEnvironment IBL and a HalfFloat bloom chain (MSAA on desktop, plain on phones, plain renderer.render if anything fails).
 *  Plus small helpers: slanted light shafts, drifting dust motes, glow halos and a material "pixarize" pass (satin, saturated). */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { smallScreen } from "./polish";

export interface PixarOpts { exposure?: number; bloom?: number; radius?: number; threshold?: number; env?: number }
export interface PixarLook { render(dt?: number, bypass?: boolean): void; resize(w: number, h: number): void; dispose(): void; bloom: UnrealBloomPass | null }

export function usePixarLook(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, o: PixarOpts = {}): PixarLook {
  const small = smallScreen();
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = o.exposure ?? 1; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  let pm: THREE.PMREMGenerator | null = null, envRT: THREE.WebGLRenderTarget | null = null;
  try { pm = new THREE.PMREMGenerator(renderer); const rs = new RoomEnvironment(); envRT = pm.fromScene(rs, 0.04); scene.environment = envRT.texture; scene.environmentIntensity = o.env ?? 0.25; rs.dispose(); } catch { /* no IBL: lights only */ }
  let composer: EffectComposer | null = null, bloom: UnrealBloomPass | null = null, W = 0, H = 0, broken = false;
  const self: PixarLook = {
    bloom: null,
    render(dt = 0.016, bypass = false) {
      if (bypass || broken || !W) { renderer.render(scene, camera); return; }
      try {
        if (!composer) {
          const pr = renderer.getPixelRatio();
          composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W * pr, H * pr, { type: THREE.HalfFloatType, samples: small ? 0 : 4 }));
          composer.setPixelRatio(pr); composer.setSize(W, H);
          composer.addPass(new RenderPass(scene, camera));
          bloom = self.bloom = new UnrealBloomPass(new THREE.Vector2(small ? W / 2 : W, small ? H / 2 : H), o.bloom ?? 0.35, o.radius ?? 0.7, o.threshold ?? 0.95); composer.addPass(bloom);
          composer.addPass(new OutputPass());
        }
        composer.render(dt);
      } catch (e) { broken = true; try { composer?.dispose(); } catch { /* ignore */ } composer = null; console.warn("pixar post-processing off:", e); renderer.render(scene, camera); }
    },
    resize(w, h) { W = w; H = h; if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); } },
    dispose() { composer?.dispose(); composer = null; envRT?.dispose(); pm?.dispose(); scene.environment = null; },
  };
  return self;
}

/* ---------------------------------------------------------------- helpers */
const tcache: Record<string, THREE.CanvasTexture> = {};
function ctex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) { return tcache[key] ??= (() => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d")!); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })(); }
export const dotTex = () => ctex("dot", 32, 32, (c) => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 32, 32); });
/** v runs 0 (source) to 1 (far end): bright near the source, long fade; soft across the width */
const shaftTex = () => ctex("shaft", 64, 128, (c) => { const im = c.createImageData(64, 128); for (let y = 0; y < 128; y++) for (let x = 0; x < 64; x++) { const u = x / 63 * 2 - 1, v = y / 127, a = Math.pow(1 - v, 1.4) * Math.pow(1 - u * u, 1.6) * Math.min(1, v * 14 + 0.25), o = (y * 64 + x) * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = 255; im.data[o + 3] = Math.round(255 * a); } c.putImageData(im, 0, 0); });

/** soft additive glow billboard (for bloom-ish halos around lamps and stage lights) */
export function halo(color: THREE.ColorRepresentation, size: number, opacity = 0.7) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(size); s.raycast = () => {}; return s;
}
/** a slanted light shaft: the four faces of a prism from the quad (a,b = the two top corners) along `dir` for `len`. One mesh, additive, fades along its length. */
export function lightShaft(a: THREE.Vector3, b: THREE.Vector3, dir: THREE.Vector3, len: number, color: THREE.ColorRepresentation, opacity = 0.12, spread = 1.0) {
  const d = dir.clone().normalize().multiplyScalar(len), c = b.clone().add(d), e = a.clone().add(d), mid = a.clone().add(b).multiplyScalar(0.5), w = a.distanceTo(b);
  // far end grows by `spread`; the second sheet crosses the first so the beam reads from any angle
  const grow = (p: THREE.Vector3) => p.clone().sub(mid.clone().add(d)).multiplyScalar(spread).add(mid.clone().add(d));
  const A = a, B = b, C = grow(c), E = grow(e), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3().subVectors(b, a).normalize(), perp = new THREE.Vector3().crossVectors(side, dir).normalize(); if (!perp.lengthSq()) perp.copy(up);
  const m2 = mid.clone().addScaledVector(perp, -w / 2), m3 = mid.clone().addScaledVector(perp, w / 2), far = mid.clone().add(d);
  const pos: number[] = [], uv: number[] = [], idx: number[] = []; let n = 0;
  const quad = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) => { for (const p of [p0, p1, p2, p3]) pos.push(p.x, p.y, p.z); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4; };
  quad(A, B, C, E);
  quad(m2, m3, far.clone().addScaledVector(perp, w / 2 * spread), far.clone().addScaledVector(perp, -w / 2 * spread));
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: shaftTex(), color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, toneMapped: false })); m.frustumCulled = false; m.renderOrder = 5; m.raycast = () => {}; return m;
}
/** drifting dust motes in a box; call tick(t) every frame */
export function dustMotes(box: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }, n: number, color: THREE.ColorRepresentation = "#fff2cf", size = 0.07, opacity = 0.55) {
  const base = new Float32Array(n * 3), ph = new Float32Array(n), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { base[i * 3] = box.x0 + Math.random() * (box.x1 - box.x0); base[i * 3 + 1] = box.y0 + Math.random() * (box.y1 - box.y0); base[i * 3 + 2] = box.z0 + Math.random() * (box.z1 - box.z0); ph[i] = Math.random() * 6.28; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex(), color, size, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })); pts.frustumCulled = false; pts.raycast = () => {};
  const tick = (t: number) => { for (let i = 0; i < n; i++) { const p = ph[i]; pos[i * 3] = base[i * 3] + Math.sin(t * 0.21 + p) * 0.5; pos[i * 3 + 1] = box.y0 + ((base[i * 3 + 1] - box.y0 - t * 0.05 * (0.5 + (p % 1)) + 1000 * (box.y1 - box.y0)) % (box.y1 - box.y0)); pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.17 + p * 1.7) * 0.5; } (g.attributes.position as THREE.BufferAttribute).needsUpdate = true; };
  tick(0); return { points: pts, tick };
}
/** smooth, satin, saturated: every MeshStandardMaterial below `root` gets lower roughness and richer colour (once per material) */
const done = new WeakSet<THREE.Material>();
export function pixarize(root: THREE.Object3D, o: { rough?: number; sat?: number; env?: number } = {}) {
  const hsl = { h: 0, s: 0, l: 0 };
  root.traverse((ob) => {
    const m = (ob as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined; if (!m) return;
    for (const x of Array.isArray(m) ? m : [m]) {
      const s = x as THREE.MeshStandardMaterial; if (!s.isMeshStandardMaterial || done.has(x)) continue; done.add(x);
      s.roughness = Math.max(o.rough ?? 0.42, s.roughness * 0.55); s.envMapIntensity = o.env ?? 1;
      if (s.color && !s.map) { s.color.getHSL(hsl); if (hsl.s > 0.05) s.color.setHSL(hsl.h, Math.min(1, hsl.s * (o.sat ?? 1.18)), hsl.l); }
    }
  });
}
