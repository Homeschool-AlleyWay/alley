// @ts-nocheck
/** Chibi character drawing (ported from the cartoon prototype) + a baker that turns it into billboard sprite sheets.
 *  Sheet layout: 4 rows (down, up, left, right) x 5 columns (stand, walk 1..4). */
import { drawChar, setOutline } from "./rig";
export { drawChar, setOutline };
const SKINS=['#fbdcc4','#f0c29b','#d9a074','#a86f4f','#7a4a36'];
const SHIRTS=['#4f91c7','#88b89a','#eab94e','#b8a8da','#f6b294','#8fc9e8','#eaa5b2','#5e9c72','#f28f7e','#a9dcc0'];
const HAIRS=['#3a2a30','#694a38','#9a653d','#e0b04e','#2b2b33','#b5563e'];
const PANTS=['#5b6b8c','#7a6a58','#4f5d75','#8a5f6a','#5f7a68'];
/** Body-size ladder by age (1 = the original student size): adults tallest, then high school, then younger kids. */
export const AGE_SCALE = { adult: 1.4, hs: 0.9, g68: 0.78, g35: 0.66, k2: 0.54 } as const;   // world sprite size: students a little smaller (less crowded), adults much taller
/** portraits / previews keep the old proportions so faces stay the same size on cards */
export const PORTRAIT_SCALE = { adult: 1.2, hs: 1.0, g68: 0.86, g35: 0.74, k2: 0.6 } as const;
export type Age = keyof typeof AGE_SCALE;
export const DIRS = ["down", "up", "left", "right"] as const;
export const FW = 160, FH = 240, COLS = 5, SCALE = 4.6, FEET = 12;
export interface Look { emote?: string; age?: Age; id: number; skin: string; hair: string; style: string; shirt: string; glasses?: boolean | string; tag?: boolean; pack?: string; [k: string]: any }
export { SKINS, SHIRTS, HAIRS };

/** Bake one character's sprite sheet into a canvas. */
export function bakeSheet(look: Look): HTMLCanvasElement {
  const cv = document.createElement("canvas"); cv.width = FW * COLS; cv.height = FH * DIRS.length;
  const c = cv.getContext("2d")!;
  DIRS.forEach((dir, r) => {
    for (let k = 0; k < COLS; k++) {
      c.save(); c.translate(k * FW + FW / 2, r * FH + FH - FEET); c.scale(SCALE, SCALE);
      c.shadowColor = "rgba(52,34,46,.35)"; c.shadowBlur = 2.2; c.shadowOffsetX = 0.5; c.shadowOffsetY = 1.2;    // paper cut-out drop shadow
      drawChar(c, 0, 0, { ...look, dir, moving: k > 0, walk: (k * Math.PI) / 2, sitting: false }, 0);
      c.restore();
    }
  });
  return cv;
}
