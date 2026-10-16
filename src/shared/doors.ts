/** Door animation state shared by every scene (no three.js). A door opens while somebody asks for it, stays open a moment, then closes.
 *  Nobody passes until `ready` (about 70% open), so people never walk through a closed door. */
export const DOOR_READY = 0.7;
export class DoorState {
  open = 0; private hold = 0; speed: number; linger: number;
  constructor(speed = 1 / 0.85, linger = 1.1) { this.speed = speed; this.linger = linger; }
  /** ask for the door to be (kept) open */
  request(extra = 0) { this.hold = Math.max(this.hold, this.linger + extra); }
  update(dt: number) { this.hold = Math.max(0, this.hold - dt); const to = this.hold > 0 ? 1 : 0; this.open = to > this.open ? Math.min(to, this.open + this.speed * dt) : Math.max(to, this.open - this.speed * 0.8 * dt); }
  get ready() { return this.open >= DOOR_READY; }
  get closed() { return this.open <= 0.01; }
  /** eased swing 0..1 for the leaf angle */
  get eased() { const t = this.open; return t * t * (3 - 2 * t); }
}
