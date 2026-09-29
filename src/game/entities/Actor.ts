import Phaser from "phaser";
import { CHARACTER_SHEETS, type Direction } from "../assets/assetManifest";
import { actorDepth, directionFromGrid, isoToScreen } from "../systems/IsoMath";

export const animKey = (character: string, action: string, dir: string) => `${character}_${action}:${dir}`;
/** Create direction animations for every loaded sheet. Sheet rows follow the manifest's dirs list. */
export function createAnims(scene: Phaser.Scene) {
  for (const s of CHARACTER_SHEETS) {
    if (!scene.textures.exists(s.key)) continue;
    s.dirs.forEach((d, row) => {
      const key = `${s.key}:${d}`;
      if (scene.anims.exists(key)) return;
      scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(s.key, { start: row * s.frames, end: row * s.frames + s.frames - 1 }), frameRate: s.fps, repeat: s.loop ? -1 : 0 });
    });
  }
}

/** Character positioned in GRID space; feet baseline of the 96x128 frame is y=108. */
export class Actor {
  sprite: Phaser.GameObjects.Sprite;
  state = "idle"; facing: Direction = "down"; path: { gx: number; gy: number }[] = []; speed = 2.2;
  seatId?: string; depthOverride?: number; shownElev: number;
  private arrive?: () => void;
  constructor(scene: Phaser.Scene, public id: string, public character: string, public gx: number, public gy: number, public elev = 0, first = "idle") {
    this.sprite = scene.add.sprite(0, 0, `${character}_${first}`, 0).setOrigin(0.5, 108 / 128);
    this.shownElev = elev; this.sync();
  }
  sync(dt = 1) {
    this.shownElev += (this.elev - this.shownElev) * Math.min(1, dt * 12);
    const p = isoToScreen(this.gx, this.gy);
    this.sprite.setPosition(p.x, p.y - this.shownElev).setDepth(this.depthOverride ?? actorDepth(this.gx, this.gy));
  }
  play(action: string, dir: Direction = this.facing) {
    this.state = action; this.facing = dir;
    const key = animKey(this.character, action, dir);
    if (!this.sprite.scene.anims.exists(key)) return;
    if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key);
  }
  walkPath(points: { gx: number; gy: number }[]): Promise<void> { this.path = points.slice(); return new Promise((r) => { this.arrive = r; }); }
  step(dt: number, elevAt: (gx: number, gy: number) => number) {
    if (this.path.length) {
      const t = this.path[0], dx = t.gx - this.gx, dy = t.gy - this.gy, dist = Math.hypot(dx, dy), len = this.speed * dt;
      if (dist <= len) { this.gx = t.gx; this.gy = t.gy; this.path.shift(); if (!this.path.length) { this.arrive?.(); this.arrive = undefined; } }
      else { this.gx += (dx / dist) * len; this.gy += (dy / dist) * len; this.play("walk", directionFromGrid(dx, dy)); }
      this.elev = elevAt(this.gx, this.gy);
    }
    this.sync(dt);
  }
}
