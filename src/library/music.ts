/** Generative story music: a short theme when a book opens, then soft ambient music that follows the mood of the page being read. */
import type { Mood } from "./books";
interface Style { root: number; scale: number[]; bpm: number; wave: OscillatorType; chord: number[]; bright: number }
const STYLES: Record<Mood, Style> = {
  calm: { root: 48, scale: [0, 2, 4, 7, 9], bpm: 58, wave: "sine", chord: [0, 7, 16], bright: 900 },
  joy: { root: 50, scale: [0, 2, 4, 5, 7, 9, 11], bpm: 96, wave: "triangle", chord: [0, 4, 7], bright: 1800 },
  tense: { root: 45, scale: [0, 2, 3, 5, 7, 8, 11], bpm: 84, wave: "sawtooth", chord: [0, 3, 7], bright: 700 },
  sad: { root: 50, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 52, wave: "sine", chord: [0, 3, 7], bright: 800 },
  mystery: { root: 51, scale: [0, 2, 4, 6, 8, 10], bpm: 62, wave: "triangle", chord: [0, 6, 10], bright: 1000 },
  adventure: { root: 52, scale: [0, 2, 4, 5, 7, 9, 10], bpm: 106, wave: "triangle", chord: [0, 4, 7], bright: 1600 },
  triumph: { root: 55, scale: [0, 2, 4, 5, 7, 9, 11], bpm: 90, wave: "triangle", chord: [0, 4, 7], bright: 2000 },
};
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const MOOD_WORDS: [RegExp, Mood][] = [[/\b(laugh|smil|cheer|happy|joy|party|friend|sang|play)/i, "joy"], [/\b(cried|tears|dead|died|sorry|alone|grief|weep|sad)/i, "sad"], [/\b(ran|chase|roar|danger|terrified|pirate|sword|fight|wolf|net|quick)/i, "tense"],
  [/\b(dark|night|strange|curious|shadow|secret|whisper|wonder)/i, "mystery"], [/\b(road|journey|sail|island|adventure|walked on|set out)/i, "adventure"], [/\b(finally|at last|free|win|won|crossing|saved|safe)/i, "triumph"]];
/** a mood for a bit of text: keyword scores against the chapter's own mood */
export function moodOf(text: string, base: Mood): Mood { const score = new Map<Mood, number>(); for (const [re, m] of MOOD_WORDS) { const n = (text.match(new RegExp(re.source, "gi")) || []).length; if (n) score.set(m, n); } let best = base, top = 1; for (const [m, n] of score) if (n > top) { best = m; top = n; } return best; }

export class StoryMusic {
  private ctx: AudioContext | null = null; private master!: GainNode; private mood: Mood = "calm"; private timer = 0; private next = 0; private beat = 0; private phase: "theme" | "ambient" = "ambient"; private themeLeft = 0;
  private motif: number[] = []; private on = false; vol = 0.6; muted = false; private seed = 1;
  get playing() { return this.on; }
  private rnd() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  async start(mood: Mood, seed = 1) {
    if (this.on) { this.setMood(mood); return; }
    try { this.ctx = this.ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)(); await this.ctx.resume(); } catch { return; }
    this.master = this.ctx.createGain(); this.master.gain.value = 0; this.master.connect(this.ctx.destination); this.master.gain.linearRampToValueAtTime(this.muted ? 0 : this.vol * 0.5, this.ctx.currentTime + 1.5);
    this.on = true; this.mood = mood; this.seed = seed * 7919 + 13; this.next = this.ctx.currentTime + 0.2; this.beat = 0; this.phase = "theme"; this.themeLeft = 16;
    const st = STYLES[mood]; this.motif = Array.from({ length: 8 }, () => st.scale[Math.floor(this.rnd() * st.scale.length)] + (this.rnd() < 0.3 ? 12 : 0));
    this.timer = window.setInterval(() => this.tick(), 200);
  }
  setMood(m: Mood) { this.mood = m; }
  setMuted(m: boolean) { this.muted = m; if (this.ctx && this.on) this.master.gain.linearRampToValueAtTime(m ? 0 : this.vol * 0.5, this.ctx.currentTime + 0.4); }
  setVolume(v: number) { this.vol = v; if (this.ctx && this.on && !this.muted) this.master.gain.linearRampToValueAtTime(v * 0.5, this.ctx.currentTime + 0.2); }
  stop() { if (!this.ctx || !this.on) return; this.on = false; clearInterval(this.timer); const m = this.master, t = this.ctx.currentTime; m.gain.cancelScheduledValues(t); m.gain.linearRampToValueAtTime(0, t + 1.2); setTimeout(() => { try { m.disconnect(); } catch { /* gone */ } }, 1500); }
  private tone(f: number, t: number, dur: number, gain: number, type: OscillatorType, bright: number) {
    const c = this.ctx!, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(); o.type = type; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = bright; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(0.25, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  private tick() {
    const c = this.ctx!; if (!c || !this.on) return; const st = STYLES[this.mood], spb = 60 / st.bpm;
    while (this.next < c.currentTime + 0.6) {
      const t = this.next, b = this.beat;
      if (this.phase === "theme") {
        const n = this.motif[b % this.motif.length]; this.tone(hz(st.root + 12 + n), t, spb * 1.6, 0.34, st.wave, st.bright * 1.4); if (b % 4 === 0) st.chord.forEach((i) => this.tone(hz(st.root + i), t, spb * 4, 0.12, "sine", st.bright));
        if (--this.themeLeft <= 0) this.phase = "ambient";
      } else {
        // ambient: a soft chord every four beats and a sparse note now and then, quiet enough to read by
        if (b % 8 === 0) st.chord.forEach((i) => this.tone(hz(st.root + i), t, spb * 8, 0.07, "sine", st.bright * 0.7));
        if (this.rnd() < 0.34) this.tone(hz(st.root + 12 + st.scale[Math.floor(this.rnd() * st.scale.length)]), t, spb * 2.4, 0.05, st.wave === "sawtooth" ? "triangle" : st.wave, st.bright * 0.8);
      }
      this.next += spb; this.beat++;
    }
  }
}
