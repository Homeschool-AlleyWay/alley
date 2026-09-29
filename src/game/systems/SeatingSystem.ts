import type { SeatDef } from "../types";
export interface SeatState extends SeatDef { occupant?: string }
export class SeatingSystem {
  seats: SeatState[];
  constructor(defs: SeatDef[]) { this.seats = defs.map((s) => ({ ...s })); }
  get empty() { return this.seats.filter((s) => !s.occupant); }
  assign(seatId: string, who: string) { const s = this.seats.find((x) => x.id === seatId)!; s.occupant = who; return s; }
  free(who: string) { const s = this.seats.find((x) => x.occupant === who); if (s) s.occupant = undefined; return s; }
}
