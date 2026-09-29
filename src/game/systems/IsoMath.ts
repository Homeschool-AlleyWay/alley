import type { Direction } from "../assets/assetManifest";
export const TILE_W = 96, TILE_H = 48;
export const isoToScreen = (x: number, y: number) => ({ x: (x - y) * (TILE_W / 2), y: (x + y) * (TILE_H / 2) });
/** Actors stand inside a tile; +1 puts them in front of the tile they stand on and behind the next tile toward the camera. */
export const actorDepth = (gx: number, gy: number) => (gx + gy + 1) * 100 + 20;
export function directionFromGrid(dgx: number, dgy: number): Direction {
  const sx = (dgx - dgy) * (TILE_W / 2), sy = (dgx + dgy) * (TILE_H / 2);
  const a = (Math.atan2(sy, sx) * 180) / Math.PI;
  const names: Direction[] = ["right", "down_right", "down", "down_left", "left", "up_left", "up", "up_right"];
  return names[((Math.round(a / 45) % 8) + 8) % 8];
}
export const screenInputToGrid = (sx: number, sy: number) => ({ x: sx + sy, y: sy - sx });
