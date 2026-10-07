/** Body language for every character: a library of poses (arms, head nods and shakes, eye rolls, mouth shapes) baked lazily into a small front-facing action sheet,
 *  plus whole-body motion (jump, hop, sway, dance) applied to the sprite. Also walking styles (gaits) so people move in their own way. */
import { drawChar, FW, FH, SCALE, FEET, type Look } from "./characters";

export interface ActPose { arms?: { R: [number, number]; L: [number, number] }; mouth?: number; emote?: string; hdy?: number; hx?: number; tilt?: number; lookX?: number; lookY?: number; moving?: boolean; walk?: number; thumb?: boolean; sitting?: boolean }
const HANG = { R: [9, -11] as [number, number], L: [-9, -11] as [number, number] };
export const POSES: Record<string, ActPose> = {
  stand: {}, talk1: { mouth: 0.35 }, talk2: { mouth: 0.85 }, talk3: { mouth: 0.55 },
  nodUp: { hdy: -0.7 }, nodDown: { hdy: 2.2, tilt: 0.07 },
  shakeL: { tilt: -0.17, hx: -0.8 }, shakeR: { tilt: 0.17, hx: 0.8 },
  rollA: { emote: "stern", lookX: -0.55, lookY: 0.1, tilt: 0.04 }, rollB: { emote: "stern", lookX: -0.3, lookY: -0.5, tilt: 0.08 }, rollC: { emote: "stern", lookX: 0.3, lookY: -0.5, tilt: 0.1 }, rollD: { emote: "stern", lookX: 0.55, lookY: 0.1, tilt: 0.06 },
  cheerA: { emote: "joy", mouth: 0.8, arms: { R: [10, -32], L: [-10, -32] } }, cheerB: { emote: "joy", mouth: 0.4, arms: { R: [12, -26], L: [-12, -26] } },
  clapA: { emote: "joy", arms: { R: [2.5, -13], L: [-2.5, -13] } }, clapB: { emote: "joy", arms: { R: [9, -14], L: [-9, -14] } },
  waveA: { emote: "smile", arms: { R: [12, -30], L: HANG.L } }, waveB: { emote: "smile", arms: { R: [10, -34], L: HANG.L } },
  thumbs: { emote: "joy", thumb: true, arms: { R: [12, -22], L: HANG.L } }, hiFive: { emote: "joy", arms: { R: [11, -34], L: HANG.L } },
  scratchA: { emote: "thinking", arms: { R: [3, -26], L: HANG.L } }, scratchB: { emote: "thinking", tilt: 0.1, arms: { R: [5.5, -28.5], L: HANG.L } },
  shrug: { emote: "smile", hdy: -0.5, arms: { R: [12, -15], L: [-12, -15] } },
  laughA: { emote: "joy", mouth: 0.9, hdy: -0.8, tilt: -0.07 }, laughB: { emote: "joy", mouth: 0.5, hdy: 0.8, tilt: 0.07 },
  sillyA: { emote: "surprised", mouth: 0.9, tilt: 0.18, arms: { R: [12, -30], L: [-6, -12] } }, sillyB: { emote: "joy", mouth: 0.5, tilt: -0.18, arms: { R: [6, -12], L: [-12, -30] } },
  danceA: { emote: "joy", tilt: 0.1, arms: { R: [10, -31], L: [-10, -17] } }, danceB: { emote: "joy", tilt: -0.1, arms: { R: [10, -17], L: [-10, -31] } }, danceC: { emote: "joy", arms: { R: [10, -30], L: [-10, -30] } },
  kick: { moving: true, walk: Math.PI / 2, tilt: 0.05, arms: { R: [-7, -17], L: [8, -23] } }, kickB: { moving: true, walk: -Math.PI / 2, tilt: -0.03, arms: { R: [8, -17], L: [-7, -22] } },
  facepalm: { emote: "upset", hdy: 1.2, arms: { R: [2, -27], L: HANG.L } }, point: { mouth: 0.3, arms: { R: [13, -21], L: HANG.L } },
  excited: { emote: "surprised", mouth: 0.7, arms: { R: [11, -24], L: [-11, -24] } }, shy: { emote: "smile", tilt: 0.1, hdy: 1, arms: { R: [3, -12], L: [-3, -12] } },
};
export const POSE_KEYS = Object.keys(POSES), POSE_IX: Record<string, number> = Object.fromEntries(POSE_KEYS.map((k, i) => [k, i]));

/** x: sideways, y: up, roll: tilt in radians, sy: squash and stretch (multiplier on height) */
export interface Move { y?: number; x?: number; roll?: number; sy?: number }
export interface Action { label: string; icon: string; dur: number; loop?: boolean; frames: [string, number][]; move?: (t: number) => Move; social?: boolean }
const sec = (...f: [string, number][]) => f;
const sine = (t: number, hz: number) => Math.sin(t * hz * Math.PI * 2);
export const ACTIONS: Record<string, Action> = {
  wave: { label: "Wave", icon: "👋", dur: 2.4, frames: sec(["waveA", 0.22], ["waveB", 0.22], ["waveA", 0.22], ["waveB", 0.22], ["waveA", 0.22], ["waveB", 0.22], ["stand", 0.2]) },
  nod: { label: "Nod yes", icon: "🙂", dur: 1.4, frames: sec(["nodDown", 0.28], ["nodUp", 0.28], ["nodDown", 0.28], ["stand", 0.3]) },
  shake: { label: "Shake no", icon: "🙅", dur: 1.4, frames: sec(["shakeL", 0.22], ["shakeR", 0.22], ["shakeL", 0.22], ["shakeR", 0.22], ["stand", 0.3]) },
  eyeroll: { label: "Eye roll", icon: "🙄", dur: 1.9, frames: sec(["rollA", 0.22], ["rollB", 0.22], ["rollC", 0.22], ["rollD", 0.22], ["stand", 0.5]) },
  jump: { label: "Jump", icon: "🤾", dur: 1.1, frames: sec(["cheerA", 0.55], ["cheerB", 0.2], ["stand", 0.3]), move: (t) => ({ y: Math.max(0, Math.sin(Math.min(1, t / 0.7) * Math.PI)) * 0.95, sy: t < 0.12 ? 0.9 : t < 0.7 ? 1.06 : t < 0.85 ? 0.92 : 1 }) },
  hop: { label: "Hop", icon: "🐇", dur: 1.4, frames: sec(["stand", 1.4]), move: (t) => ({ y: Math.abs(Math.sin(t * 3 * Math.PI)) * 0.4 }) },
  cheer: { label: "Cheer", icon: "🎉", dur: 2.2, frames: sec(["cheerA", 0.3], ["cheerB", 0.3], ["cheerA", 0.3], ["cheerB", 0.3], ["cheerA", 0.3], ["cheerB", 0.3], ["stand", 0.4]), move: (t) => ({ y: Math.abs(sine(t, 1.7)) * 0.3 }) },
  clap: { label: "Clap", icon: "👏", dur: 2.4, frames: sec(["clapA", 0.16], ["clapB", 0.16], ["clapA", 0.16], ["clapB", 0.16], ["clapA", 0.16], ["clapB", 0.16], ["clapA", 0.16], ["clapB", 0.16], ["clapA", 0.16], ["clapB", 0.16], ["stand", 0.3]) },
  thumbs: { label: "Thumbs up", icon: "👍", dur: 1.8, frames: sec(["thumbs", 1.6], ["stand", 0.2]), move: (t) => ({ y: Math.abs(sine(t, 2)) * 0.06 }) },
  highfive: { label: "High five", icon: "🙌", dur: 1.6, social: true, frames: sec(["hiFive", 0.9], ["clapB", 0.2], ["hiFive", 0.3], ["stand", 0.2]), move: (t) => ({ y: t > 0.5 && t < 0.8 ? 0.14 : 0 }) },
  dance: { label: "Dance", icon: "💃", dur: 5, loop: true, frames: sec(["danceA", 0.3], ["danceC", 0.3], ["danceB", 0.3], ["danceC", 0.3]), move: (t) => ({ y: Math.abs(sine(t, 2.2)) * 0.18, roll: sine(t, 1.1) * 0.12, x: sine(t, 1.1) * 0.12 }) },
  kick: { label: "Kick", icon: "⚽", dur: 1.5, frames: sec(["stand", 0.3], ["kick", 0.3], ["kickB", 0.25], ["kick", 0.3], ["stand", 0.3]), move: (t) => ({ roll: t > 0.3 && t < 0.9 ? -0.1 : 0, x: t > 0.3 && t < 0.9 ? 0.1 : 0 }) },
  scratch: { label: "Scratch head", icon: "🤔", dur: 2.3, frames: sec(["scratchA", 0.2], ["scratchB", 0.2], ["scratchA", 0.2], ["scratchB", 0.2], ["scratchA", 0.2], ["scratchB", 0.2], ["stand", 0.3]) },
  shrug: { label: "Shrug", icon: "🤷", dur: 1.6, frames: sec(["shrug", 1.3], ["stand", 0.3]), move: (t) => ({ y: t < 0.3 ? t * 0.1 : 0.03 }) },
  laugh: { label: "Laugh", icon: "😂", dur: 2.4, frames: sec(["laughA", 0.2], ["laughB", 0.2], ["laughA", 0.2], ["laughB", 0.2], ["laughA", 0.2], ["laughB", 0.2], ["laughA", 0.2], ["stand", 0.3]), move: (t) => ({ y: Math.abs(sine(t, 3)) * 0.06, roll: sine(t, 1.5) * 0.04 }) },
  silly: { label: "Be silly", icon: "🤪", dur: 3, frames: sec(["sillyA", 0.25], ["sillyB", 0.25], ["sillyA", 0.25], ["sillyB", 0.25], ["excited", 0.25], ["sillyA", 0.25], ["sillyB", 0.25], ["stand", 0.3]), move: (t) => ({ y: Math.abs(sine(t, 2)) * 0.2, roll: sine(t, 2.4) * 0.16, x: sine(t, 1.2) * 0.15 }) },
  facepalm: { label: "Facepalm", icon: "🤦", dur: 1.8, frames: sec(["facepalm", 1.5], ["stand", 0.3]) },
  excited: { label: "Squeal", icon: "🤩", dur: 1.8, frames: sec(["excited", 0.3], ["cheerB", 0.3], ["excited", 0.3], ["cheerB", 0.3], ["stand", 0.3]), move: (t) => ({ y: Math.abs(sine(t, 3)) * 0.14 }) },
  shy: { label: "Act shy", icon: "😊", dur: 2, frames: sec(["shy", 1.7], ["stand", 0.3]), move: (t) => ({ roll: sine(t, 0.8) * 0.05 }) },
  talk: { label: "Talk", icon: "💬", dur: 1.2, loop: true, frames: sec(["talk1", 0.12], ["talk2", 0.12], ["talk3", 0.12], ["stand", 0.1], ["talk2", 0.12], ["talk1", 0.12]) },
};
/** emotes offered in the emote menu, in order */
export const EMOTES = ["wave", "nod", "shake", "clap", "cheer", "jump", "hop", "dance", "thumbs", "highfive", "shrug", "laugh", "eyeroll", "scratch", "kick", "silly", "facepalm", "shy"];
/** what people do while they wait around (picked at random), by personality */
export const FIDGETS: Record<string, string[]> = {
  cheerful: ["wave", "hop", "dance", "laugh", "thumbs"], shy: ["shy", "scratch", "shrug"], sporty: ["kick", "hop", "jump", "cheer"], nerdy: ["scratch", "nod", "shrug"], artsy: ["dance", "silly", "wave"],
  funny: ["silly", "laugh", "dance", "eyeroll"], curious: ["scratch", "nod", "shrug", "wave"], bossy: ["eyeroll", "shake", "facepalm", "thumbs"], dreamy: ["dance", "shy", "scratch"], kind: ["wave", "nod", "thumbs", "clap"],
};

/** bake the front-facing action sheet for one character: one column per pose */
export function bakeActions(look: Look): HTMLCanvasElement {
  const cv = document.createElement("canvas"); cv.width = FW * POSE_KEYS.length; cv.height = FH; const c = cv.getContext("2d")!;
  POSE_KEYS.forEach((k, i) => {
    c.save(); c.translate(i * FW + FW / 2, FH - FEET); c.scale(SCALE, SCALE); const adult = look.age === "adult";
    if (adult) { c.shadowColor = "rgba(255,244,205,.95)"; c.shadowBlur = 9; drawChar(c, 0, 0, { ...look, dir: "down", moving: false, walk: 0, turn: 0, ...POSES[k] }, 0); }
    c.shadowColor = "rgba(52,34,46,.35)"; c.shadowBlur = 2.2; c.shadowOffsetX = 0.5; c.shadowOffsetY = 1.2; drawChar(c, 0, 0, { ...look, dir: "down", moving: false, walk: 0, turn: 0, ...POSES[k] }, 0); c.restore();
  });
  return cv;
}

/** which frame of an action is showing at time t */
export function frameAt(a: Action, t: number): string { let acc = 0; const tt = a.loop ? t % a.frames.reduce((s, f) => s + f[1], 0) : t; for (const [k, d] of a.frames) { acc += d; if (tt < acc) return k; } return a.frames[a.frames.length - 1][0]; }

/* ---------------- walking styles ---------------- */
export interface Gait { name: string; speed: number; bounce: number; sway: number; lean: number; stepHz: number; squash: number }
export const GAITS: Record<string, Gait> = {
  steady: { name: "Steady", speed: 1, bounce: 0.03, sway: 0, lean: 0, stepHz: 1, squash: 0 },
  bouncy: { name: "Bouncy", speed: 1.05, bounce: 0.2, sway: 0.03, lean: 0, stepHz: 1.05, squash: 0.05 },
  skip: { name: "Skippy", speed: 1.0, bounce: 0.3, sway: 0.05, lean: 0.02, stepHz: 0.8, squash: 0.08 },
  swagger: { name: "Swagger", speed: 0.86, bounce: 0.05, sway: 0.1, lean: -0.03, stepHz: 0.85, squash: 0 },
  stomp: { name: "Stompy", speed: 0.92, bounce: 0.12, sway: 0.04, lean: 0.05, stepHz: 0.9, squash: 0.06 },
  slouch: { name: "Slouchy", speed: 0.78, bounce: 0.02, sway: 0.03, lean: 0.12, stepHz: 0.8, squash: 0.03 },
  march: { name: "Marching", speed: 1.0, bounce: 0.08, sway: 0, lean: 0, stepHz: 1.1, squash: 0.02 },
  float: { name: "Dreamy", speed: 0.8, bounce: 0.1, sway: 0.08, lean: -0.02, stepHz: 0.6, squash: 0 },
  wobble: { name: "Wobbly", speed: 0.95, bounce: 0.1, sway: 0.18, lean: 0, stepHz: 1, squash: 0.04 },
  jog: { name: "Jogging", speed: 1.22, bounce: 0.14, sway: 0.03, lean: 0.1, stepHz: 1.5, squash: 0.03 },
  stride: { name: "Confident", speed: 1.0, bounce: 0.03, sway: 0.02, lean: -0.02, stepHz: 0.95, squash: 0 },
};
export const GAIT_BY_PERSONALITY: Record<string, string> = { cheerful: "skip", shy: "slouch", sporty: "jog", nerdy: "march", artsy: "wobble", funny: "wobble", curious: "bouncy", bossy: "stomp", dreamy: "float", kind: "steady" };
