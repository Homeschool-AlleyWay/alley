/** Sound for the school, all made live with the Web Audio API (no downloads): room tone and happy chatter that grows with the crowd, footsteps on the floor,
 *  the period bell, soft rain or wind when the weather is wet or stormy, and a gentle looping tune that changes with the season. Starts on the first tap and
 *  respects the Sound and Music switches in the Today panel. Volumes are deliberately low so voices and lessons stay clear. */
import { World, seasonOf, weatherNow } from "../game/world";
let ctx: AudioContext | null = null, master: GainNode, chat: GainNode, rain: GainNode, wind: GainNode, mus: GainNode, noiseBuf: AudioBuffer, nextNote = 0, stepAt = 0, started = false;
const SCALES: Record<string, number[]> = { spring: [0, 2, 4, 7, 9, 12], summer: [0, 2, 4, 7, 9, 12], autumn: [0, 3, 5, 7, 10, 12], winter: [0, 2, 3, 7, 8, 12] };
const hz = (n: number) => 261.63 * Math.pow(2, n / 12);
function noise(): AudioBuffer { const b = ctx!.createBuffer(1, ctx!.sampleRate * 2, ctx!.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5 + w * 0.12; } return b; }
function loopNoise(freq: number, q: number, type: BiquadFilterType, dest: AudioNode): void { const s = ctx!.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx!.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; s.connect(f); f.connect(dest); s.start(); }
export const Ambience = {
  start() {
    if (started) { void ctx?.resume(); return; } started = true;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); noiseBuf = noise();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      chat = ctx.createGain(); chat.gain.value = 0; rain = ctx.createGain(); rain.gain.value = 0; wind = ctx.createGain(); wind.gain.value = 0; mus = ctx.createGain(); mus.gain.value = 0.5;
      [chat, rain, wind, mus].forEach((g) => g.connect(master));
      loopNoise(900, 0.7, "bandpass", chat); loopNoise(2400, 0.4, "highpass", rain); loopNoise(380, 0.6, "lowpass", wind);
      // a slow wobble makes the room tone sound like many small conversations
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.37; lg.gain.value = 0.012; lfo.connect(lg); lg.connect(chat.gain); lfo.start();
    } catch { ctx = null; }
  },
  get on() { return !!ctx && World.prefs.sound; },
  /** call a few times a second with what is going on */
  update(o: { walking: boolean; crowd: number; room: "hall" | "stage" | "class" }, dt: number) {
    if (!ctx) return; const P = World.prefs, wx = weatherNow().weather, t = ctx.currentTime;
    const on = P.sound ? 1 : 0, tgt = (v: number) => v * on;
    chat.gain.setTargetAtTime(tgt(o.room === "hall" ? 0.035 + Math.min(0.09, o.crowd * 0.0045) : o.room === "stage" ? 0.02 : 0.01), t, 0.6);
    rain.gain.setTargetAtTime(tgt(P.weatherFx && (wx === "rain" || wx === "storm") ? (wx === "storm" ? 0.05 : 0.03) : 0), t, 1.2);
    wind.gain.setTargetAtTime(tgt(P.weatherFx && (wx === "storm" || wx === "snow") ? 0.04 : 0), t, 1.2);
    mus.gain.setTargetAtTime(P.sound && P.music && o.room !== "class" ? 0.5 : 0, t, 1.5);
    if (P.sound && o.walking && t > stepAt) { stepAt = t + 0.34; this.step(); }
    if (P.sound && P.music && o.room !== "class" && t > nextNote) this.note(t);
    void dt;
  },
  step() { if (!ctx) return; const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 500 + Math.random() * 300; const g = ctx.createGain(); g.gain.setValueAtTime(0.05, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0005, ctx.currentTime + 0.09); s.connect(f); f.connect(g); g.connect(master); s.start(ctx.currentTime, Math.random()); s.stop(ctx.currentTime + 0.1); },
  note(t: number) {
    if (!ctx) return; const sc = SCALES[seasonOf()], base = sc[Math.floor(Math.random() * sc.length)] - 12 + (Math.random() < 0.3 ? 12 : 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = hz(base); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.4); o.connect(g); g.connect(mus); o.start(t); o.stop(t + 1.5);
    nextNote = t + [0.5, 0.75, 1, 1.5, 2.2][Math.floor(Math.random() * 5)];
  },
  bell() { if (!ctx || !World.prefs.sound) return; const t = ctx.currentTime; [0, 0.55].forEach((d, i) => { const o = ctx!.createOscillator(), g = ctx!.createGain(); o.type = "sine"; o.frequency.value = i ? 784 : 988; g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.16, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d + 1.1); o.connect(g); g.connect(master); o.start(t + d); o.stop(t + d + 1.2); }); },
  cheer() { if (!ctx || !World.prefs.sound) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1500; const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14, t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + 1.8); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 1.9); },
  ding() { if (!ctx || !World.prefs.sound) return; const t = ctx.currentTime; [659, 880, 1175].forEach((fq, i) => { const o = ctx!.createOscillator(), g = ctx!.createGain(); o.type = "sine"; o.frequency.value = fq; g.gain.setValueAtTime(0, t + i * 0.09); g.gain.linearRampToValueAtTime(0.1, t + i * 0.09 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.5); o.connect(g); g.connect(master); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.55); }); },
};
