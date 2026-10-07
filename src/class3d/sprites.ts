/** Billboard people for the 3D classroom: pose sheets baked from the shared chibi rig (4 directions x N poses). */
import * as THREE from "three";
import { drawChar } from "../hall3d/rig";
import { AGE_SCALE, type Look } from "../hall3d/characters";
import type { NpcDef } from "../hall3d/roster";

export const DIRS = ["down", "up", "left", "right"] as const;
export const CFW = 96, CFH = 156, CSCALE = 3.0, CFEET = 10, UNIT = 1.75 / 45;
const HANG = { R: [8.2, -9.5], L: [-8.2, -9.5] }, LAP = { R: [5, -10], L: [-5, -10] };
type Pose = Record<string, any>;
/** teacher / standing poses: column index = pose */
export const TEACH: Record<string, number> = { stand: 0, walk1: 1, walk2: 2, walk3: 3, walk4: 4, talkA: 5, talkB: 6, point: 7, pointUp: 8, write: 9, present: 10, hold: 11 };
export const TEACH_POSES: Pose[] = [
  {}, { moving: true, walk: 0.0 }, { moving: true, walk: Math.PI / 2 }, { moving: true, walk: Math.PI }, { moving: true, walk: Math.PI * 1.5 },
  { mouth: 0.9, arms: { R: [11, -17], L: HANG.L } }, { mouth: 0.3, arms: { R: [12, -22], L: [-10, -14] } },
  { arms: { R: [13.5, -20], L: HANG.L } }, { arms: { R: [10, -30], L: HANG.L } }, { arms: { R: [6, -29], L: HANG.L } },
  { mouth: 0.5, arms: { R: [12, -16], L: [-12, -16] } }, { arms: { R: [8, -14], L: [-8, -14] } },
];
/** mood variants of stand / talk (3 poses each) and full-body gestures, appended after the base poses */
export const EMOS = ["joy", "frown", "upset", "frustrated", "surprised", "thinking", "stern"] as const;
export const emoPose = (e: string, k: 0 | 1 | 2) => { const i = EMOS.indexOf(e as any); return i < 0 ? (k === 0 ? 0 : 4 + k) : 12 + i * 3 + k; };   // k: 0 stand, 1 talkA, 2 talkB
export const GESTURE: Record<string, number> = { cheer: 33, clap: 34, headhands: 35, shrug: 36, crossed: 37, wave: 38, chin: 39, facepalm: 40, explain: 41, finger: 42, point: TEACH.point };
TEACH_POSES.push(...EMOS.flatMap((e) => [{ emote: e }, { emote: e, mouth: 0.9 }, { emote: e, mouth: 0.35 }]),
  { emote: "joy", mouth: 0.8, arms: { R: [10, -32], L: [-10, -32] } }, { emote: "joy", arms: { R: [2.5, -13], L: [-2.5, -13] } }, { emote: "frustrated", arms: { R: [5, -25], L: [-5, -25] } },
  { emote: "smile", arms: { R: [12, -15], L: [-12, -15] } }, { emote: "stern", arms: { R: [-4, -13], L: [4, -13] } }, { emote: "joy", mouth: 0.5, arms: { R: [11, -26], L: HANG.L } },
  { emote: "thinking", arms: { R: [1.5, -19], L: [-4, -12] } }, { emote: "upset", arms: { R: [2, -20.5], L: HANG.L } }, { emote: "smile", mouth: 0.6, arms: { R: [11, -14], L: [-11, -14] } }, { emote: "smile", mouth: 0.5, arms: { R: [9, -27], L: HANG.L } });
/** seated student poses */
export const SEAT: Record<string, number> = { sit: 0, writeA: 1, writeB: 2, raiseHalf: 3, raiseFull: 4, talk: 5 };
export const SEAT_POSES: Pose[] = [
  { sitting: true, arms: LAP }, { sitting: true, arms: { R: [4, -10], L: LAP.L } }, { sitting: true, arms: { R: [6.5, -9], L: LAP.L } },
  { sitting: true, arms: { R: [8, -18], L: LAP.L } }, { sitting: true, arms: { R: [8, -33], L: LAP.L } }, { sitting: true, mouth: 0.7, arms: LAP },
];
export function bakePoses(look: Look, poses: Pose[]): HTMLCanvasElement {
  const cv = document.createElement("canvas"); cv.width = CFW * poses.length; cv.height = CFH * DIRS.length; const c = cv.getContext("2d")!;
  DIRS.forEach((dir, r) => poses.forEach((p, k) => {
    c.save(); c.translate(k * CFW + CFW / 2, r * CFH + CFH - CFEET); c.scale(CSCALE, CSCALE);
    c.shadowColor = "rgba(52,34,46,.35)"; c.shadowBlur = 2.2; c.shadowOffsetX = 0.5; c.shadowOffsetY = 1.2;
    drawChar(c, 0, 0, { ...look, dir, moving: false, walk: 0, ...p, turn: 0 }, 0); c.restore();
  }));
  return cv;
}
export interface Billboard { sprite: THREE.Sprite; mat: THREE.SpriteMaterial; tex: THREE.Texture; poses: number; look: Look; h: number; def?: NpcDef; facing: THREE.Vector3; pose: number; blob: THREE.Mesh }
export function makeBillboard(scene: THREE.Scene, look: Look, poses: Pose[], blobTex: THREE.Texture): Billboard {
  const tex = new THREE.CanvasTexture(bakePoses(look, poses)); tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.set(1 / poses.length, 1 / DIRS.length); tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true }), sprite = new THREE.Sprite(mat), h = AGE_SCALE[look.age ?? "hs"] ?? 1;
  sprite.center.set(0.5, CFEET / CFH); sprite.scale.set((CFW / CSCALE) * UNIT * h, (CFH / CSCALE) * UNIT * h, 1); scene.add(sprite);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.55), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; scene.add(blob);
  return { sprite, mat, tex, poses: poses.length, look, h, facing: new THREE.Vector3(0, 0, -1), pose: 0, blob };
}
/** which of the 4 sheet rows to show for a facing vector seen from the camera */
export function dirIndex(face: THREE.Vector3, camFwd: THREE.Vector3, keep = 0) {
  const a = face.x * camFwd.x + face.z * camFwd.z, b = face.x * -camFwd.z + face.z * camFwd.x; if (Math.hypot(a, b) < 1e-3) return keep;
  return Math.abs(a) >= Math.abs(b) ? (a > 0 ? 1 : 0) : b > 0 ? 3 : 2;
}
export function setPose(b: Billboard, pose: number, dir: number) { b.pose = pose; b.tex.offset.set(pose / b.poses, 1 - (dir + 1) / DIRS.length); }
