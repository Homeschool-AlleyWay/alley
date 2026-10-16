/** The broadcast: plays the viewer's visible field reports one after another (at most FIELD_REPORT_MAX), each as its papercut film.
 *  One class for every screen: the 3D newsroom's big screen, the desk preview, the 2D page and the hallway TV (tv.ts). Draw it into any canvas. */
import { drawFilm, filmDuration, sceneAt } from "./papercut";
import { visibleTo, type Band, type FieldReport, type Store } from "./fieldreports";

export class Broadcast {
  store: Store; band: Band; list: FieldReport[] = []; idx = 0; t = 0; playing = true; narrate = false; onChange: (() => void) | null = null;
  private lastScene = -1; private lastId = ""; private synth: SpeechSynthesis | null = typeof speechSynthesis !== "undefined" ? speechSynthesis : null;
  constructor(store: Store, band: Band) { this.store = store; this.band = band; this.refilter(); }
  /** re-apply the audience gate (after the store or the viewer changed); keeps the current report when it is still allowed */
  refilter() {
    const cur = this.current; this.list = visibleTo(this.store.active, this.band);
    const i = cur ? this.list.findIndex((r) => r.id === cur.id) : -1; this.idx = i >= 0 ? i : 0; if (i < 0) { this.t = 0; this.lastScene = -1; }
    this.onChange?.();
  }
  setStore(s: Store) { this.store = s; this.refilter(); }
  setBand(b: Band) { this.band = b; this.refilter(); }
  get current(): FieldReport | undefined { return this.list[this.idx]; }
  get duration() { const r = this.current; return r ? filmDuration(r.script) : 0; }
  get sceneIndex() { const r = this.current; return r ? sceneAt(r.script, this.t).i : 0; }
  jump(i: number) { if (!this.list.length) return; this.idx = ((i % this.list.length) + this.list.length) % this.list.length; this.t = 0; this.lastScene = -1; this.stopVoice(); this.onChange?.(); }
  next() { this.jump(this.idx + 1); } prev() { this.jump(this.idx - 1); }
  setPlaying(p: boolean) { this.playing = p; if (!p) this.stopVoice(); else this.lastScene = -1; this.onChange?.(); }
  /** advance the clock; moves to the next report when the film ends */
  update(dt: number) {
    const r = this.current; if (!r || !this.playing) return;
    this.t += dt; if (this.t >= this.duration) { this.next(); return; }
    if (this.narrate) { const s = sceneAt(r.script, this.t).i; if (s !== this.lastScene || r.id !== this.lastId) { this.lastScene = s; this.lastId = r.id; this.say(r.script.scenes[s].say); } }
  }
  draw(c: CanvasRenderingContext2D, w: number, h: number) { const r = this.current; if (r) drawFilm(c, w, h, r.script, this.t); else { c.fillStyle = "#EADFCB"; c.fillRect(0, 0, w, h); } }
  private stopVoice() { try { this.synth?.cancel(); } catch { /* no speech */ } }
  /** read a caption aloud with the device voice (shares the app's voice on/off switch) */
  private say(text: string) {
    if (!this.synth) return; try { if (localStorage.getItem("unify.voice.on") === "0") return; } catch { /* default on */ }
    try { this.synth.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; u.pitch = 1.05; this.synth.speak(u); } catch { /* ignore */ }
  }
  dispose() { this.stopVoice(); this.onChange = null; }
}
