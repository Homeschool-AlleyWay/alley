/** Tiny typed event bus between Phaser scenes and DOM/React UI. */
type Handler = (payload: any) => void;
class Bus {
  private m = new Map<string, Set<Handler>>();
  on(ev: string, h: Handler) { (this.m.get(ev) ?? this.m.set(ev, new Set()).get(ev)!).add(h); return () => this.m.get(ev)?.delete(h); }
  emit(ev: string, payload?: any) { this.m.get(ev)?.forEach((h) => h(payload)); }
}
export const bus = new Bus();
