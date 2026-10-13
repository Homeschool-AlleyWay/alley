/** Skeleton groups + skin body (torso, neck, limbs). Base model is ~1.8 m tall in these units; char3d scales the root per age band. */
import * as THREE from "three";
import type { AvatarSpec } from "../../hall3d/avatar";
import { V, lathe, sphereG } from "./geo";
import type { Ctx } from "./face";

export interface Rig {
  root: THREE.Group; pelvis: THREE.Group; spine: THREE.Group; neck: THREE.Group; head: THREE.Group;
  shoulder: THREE.Group[]; elbow: THREE.Group[]; wrist: THREE.Group[]; hip: THREE.Group[]; knee: THREE.Group[]; ankle: THREE.Group[];
}
export const DIM = { pelvisY: 0.88, shoulderY: 0.42, neckY: 0.47, thigh: 0.41, shin: 0.395, upper: 0.27, fore: 0.25, torsoZ: 0.78 };
export const bwOf = (b: string) => (b === "slim" ? 0.9 : b === "sturdy" ? 1.14 : 1);

/** torso radius at height y (relative to the pelvis pivot), before build scaling */
const KEYS: [number, number][] = [[-0.3, 0.158], [-0.14, 0.152], [-0.06, 0.142], [0.0, 0.134], [0.14, 0.125], [0.27, 0.142], [0.36, 0.152], [0.42, 0.135], [0.455, 0.1], [0.485, 0.058], [0.5, 0.052]];
/** per-build body shape (set by char3d before every part is built): width multipliers at the shoulders, waist and hips */
export const SHAPE = { shoulder: 1, waist: 1, hips: 1 };
export const shapeOf = (a: AvatarSpec) => { SHAPE.shoulder = a.shoulder ?? 1; SHAPE.waist = a.waist ?? 1; SHAPE.hips = a.hips ?? 1; };
const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const shapeF = (y: number) => { const { shoulder: S, waist: W, hips: H } = SHAPE; return (H + (W - H) * sstep(-0.1, 0.08, y)) + (S - W) * sstep(0.18, 0.36, y); };
export function torsoR(y: number) { return torsoR0(y) * shapeF(y); }
function torsoR0(y: number) { if (y <= KEYS[0][0]) return KEYS[0][1]; for (let i = 1; i < KEYS.length; i++) if (y <= KEYS[i][0]) { const [y0, r0] = KEYS[i - 1], [y1, r1] = KEYS[i]; return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0); } return 0.052; }

export function makeRig(): Rig {
  const g = () => new THREE.Group(), root = g(), pelvis = g(), spine = g(), neck = g(), head = g();
  root.add(pelvis); pelvis.position.y = DIM.pelvisY; pelvis.add(spine); spine.add(neck); neck.position.y = DIM.neckY; neck.add(head);
  const sh = [g(), g()], el = [g(), g()], wr = [g(), g()], hp = [g(), g()], kn = [g(), g()], an = [g(), g()];
  for (let i = 0; i < 2; i++) { spine.add(sh[i]); sh[i].add(el[i]); el[i].position.y = -DIM.upper; el[i].add(wr[i]); wr[i].position.y = -DIM.fore; pelvis.add(hp[i]); hp[i].add(kn[i]); kn[i].position.y = -DIM.thigh; kn[i].add(an[i]); an[i].position.y = -DIM.shin; }
  return { root, pelvis, spine, neck, head, shoulder: sh, elbow: el, wrist: wr, hip: hp, knee: kn, ankle: an };
}
/** place joints for a build (x offsets) */
export function fitRig(r: Rig, bw: number, sh = 1) {
  r.shoulder[0].position.set(0.152 * bw * sh, DIM.shoulderY - 0.01, 0); r.shoulder[1].position.set(-0.152 * bw * sh, DIM.shoulderY - 0.01, 0);
  r.hip[0].position.set(0.075 * bw, -0.02, 0); r.hip[1].position.set(-0.075 * bw, -0.02, 0);
}

export function cylSeg(r0: number, r1: number, len: number, seg = 10): THREE.BufferGeometry { return new THREE.CylinderGeometry(r0, r1, len, seg, 1).translate(0, -len / 2, 0); }

export function buildBody(c: Ctx, r: Rig, spec: AvatarSpec, bw: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [], skin = c.mat("skin", spec.skin), seg = c.lod ? 22 : 12, sg = c.lod ? 12 : 7;
  const put = (g: THREE.BufferGeometry, p: THREE.Object3D, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(g, skin); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; p.add(m); out.push(m); return m; };
  const prof: [number, number][] = []; for (let y = -0.1; y <= 0.5001; y += 0.03) prof.push([torsoR(y) * (y > 0.4 ? 1 : 0.97), y]); prof.unshift([0.001, -0.11]);
  put(lathe(prof, seg), r.spine, 0, 0, 0, bw, 1, DIM.torsoZ);
  put(cylSeg(0.053, 0.056, 0.14, sg).translate(0, 0.14, 0), r.neck, 0, -0.01, 0);
  const k = 1 + (bw - 1) * 0.6;
  for (let i = 0; i < 2; i++) {
    put(sphereG(0.05 * k, 0.05 * k, 0.05 * k, sg, c.lod ? 8 : 5), r.shoulder[i]);
    put(cylSeg(0.05 * k, 0.043 * k, DIM.upper, sg), r.shoulder[i]);
    put(sphereG(0.043 * k, 0.043 * k, 0.043 * k, sg, c.lod ? 8 : 5), r.elbow[i]);
    put(cylSeg(0.042 * k, 0.034 * k, DIM.fore, sg), r.elbow[i]);
    put(sphereG(0.034 * k, 0.034 * k, 0.034 * k, sg, c.lod ? 8 : 5), r.wrist[i]);
    put(sphereG(0.04, 0.06, 0.03, sg, c.lod ? 8 : 5), r.wrist[i], 0, -0.06, 0);                                      // palm
    const s = i === 0 ? 1 : -1; put(sphereG(0.018, 0.035, 0.018, 8, 6), r.wrist[i], s * 0.03, -0.065, 0.025).rotation.z = s * -0.5;   // thumb
    put(sphereG(0.06 * k, 0.06 * k, 0.06 * k, sg, c.lod ? 8 : 5), r.hip[i], 0, -0.07, 0);
    put(cylSeg(0.072 * k, 0.062 * k, DIM.thigh - 0.07, sg).translate(0, -0.07, 0), r.hip[i]);   // starts under the hip ball, below a tee hem (a full-length tube pokes through the tee when the leg swings)
    put(sphereG(0.063 * k, 0.063 * k, 0.063 * k, sg, c.lod ? 8 : 5), r.knee[i]);
    put(cylSeg(0.058 * k, 0.04 * k, DIM.shin, sg), r.knee[i]);
    put(sphereG(0.04, 0.04, 0.04, 8, 6), r.ankle[i]);
  }
  void V;
  return out;
}
