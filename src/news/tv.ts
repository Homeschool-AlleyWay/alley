/** Hallway TV hand-off: createNewsTV({ width, height }) renders the newsroom broadcast (the papercut field-report films with their lower-third and the
 *  'UNIFY News' bug) into a canvas the world can use as a CanvasTexture on a wall-mounted TV. See docs/NEWS_TV.md. No three.js import: the world builds the texture. */
import { Broadcast } from "./broadcast";
import { loadLocal, type Band, type Store } from "./fieldreports";

export interface NewsTVOptions { width: number; height: number; /** frames per second to repaint (default 15; a wall TV does not need more) */ fps?: number; /** the field reports to play (default: this browser's newsroom list) */ store?: Store; /** may the viewer see high-school reports? default false */ hs?: boolean }
export interface NewsTV {
  /** live-updating canvas: use `new THREE.CanvasTexture(tv.canvas)` */
  canvas: HTMLCanvasElement;
  /** settings to apply to that texture */
  texture: { colorSpace: "srgb"; generateMipmaps: false; minFilter: "LinearFilter"; magFilter: "LinearFilter"; needsUpdateOnRedraw: true };
  /** call every frame with the frame time in seconds; returns true when the canvas was repainted (then set texture.needsUpdate = true) */
  update(dt: number): boolean;
  /** high-school and adult viewers may watch the high-school reports; everyone else only sees the all-ages ones */
  setAudienceHS(on: boolean): void;
  /** title of the report now on screen (for a caption or tooltip) */
  now(): { title: string; audience: "all" | "hs"; index: number; of: number } | null;
  next(): void; prev(): void;
  dispose(): void;
}
export function createNewsTV(o: NewsTVOptions): NewsTV {
  const canvas = document.createElement("canvas"); canvas.width = Math.max(64, Math.round(o.width)); canvas.height = Math.max(36, Math.round(o.height));
  const ctx = canvas.getContext("2d")!, bandOf = (hs: boolean): Band => (hs ? "hs" : "general");
  const b = new Broadcast(o.store ?? loadLocal(), bandOf(!!o.hs)), step = 1 / (o.fps ?? 15); let acc = step, alive = true;
  b.draw(ctx, canvas.width, canvas.height);
  return {
    canvas, texture: { colorSpace: "srgb", generateMipmaps: false, minFilter: "LinearFilter", magFilter: "LinearFilter", needsUpdateOnRedraw: true },
    update(dt) { if (!alive) return false; b.update(dt); acc += dt; if (acc < step) return false; acc = 0; b.draw(ctx, canvas.width, canvas.height); return true; },
    setAudienceHS(on) { b.setBand(bandOf(on)); acc = step; },
    now() { const r = b.current; return r ? { title: r.title, audience: r.audience, index: b.idx, of: b.list.length } : null; },
    next() { b.next(); acc = step; }, prev() { b.prev(); acc = step; },
    dispose() { alive = false; b.dispose(); canvas.width = canvas.height = 1; },
  };
}
