/** Spoken lessons with the browser's built-in speech (no network, no keys). Each person gets a stable voice from the voices the device offers,
 *  shaped by personality and age, and the teacher's mood changes pitch and pace. Mute is remembered. */
import type { NpcDef } from "../hall3d/roster";
import { personaOf } from "./persona";

const KEY = "unify.voice.on";
const synth: SpeechSynthesis | null = typeof speechSynthesis !== "undefined" ? speechSynthesis : null;
let voices: SpeechSynthesisVoice[] = [];
const load = () => { voices = synth ? synth.getVoices().filter((v) => /^en/i.test(v.lang)) : []; };
if (synth) { load(); synth.addEventListener?.("voiceschanged", load); }
const FEM = /(female|zira|samantha|karen|victoria|susan|hazel|aria|jenny|linda|moira|tessa|fiona|allison|ava|serena|catherine|kate|emma|joanna|salli|kendra|kimberly|ivy)/i;
const MAL = /(\bmale\b|david|mark|daniel|alex|fred|george|guy|ryan|james|tom|oliver|arthur|aaron|matthew|joey|justin|brian|eric|gordon)/i;
const hash = (n: number) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; return x >>> 0; };
const KIDS: Record<string, number> = { k2: 1.65, g35: 1.45, g68: 1.25, hs: 1.1, adult: 1 };
export const voice = {
  get enabled() { try { return localStorage.getItem(KEY) !== "0"; } catch { return true; } },
  set enabled(v: boolean) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* private mode */ } if (!v) this.cancel(); },
  get available() { return !!synth; },
  /** who is speaking in what mood (the classroom supplies this) */
  mood: ((_d: NpcDef) => "neutral") as (d: NpcDef) => string,
  cancel() { try { synth?.cancel(); } catch { /* ignore */ } },
  pick(d: NpcDef): SpeechSynthesisVoice | null {
    if (!voices.length) load(); if (!voices.length) return null;
    const female = /^(ms|mrs|miss)\b/i.test(d.name) || (d.role !== "staff" ? hash(d.id) % 2 === 0 : false);
    const pool = voices.filter((v) => (female ? FEM.test(v.name) : MAL.test(v.name)) && !(female ? MAL.test(v.name) : FEM.test(v.name)));
    const list = pool.length ? pool : voices; return list[hash(d.id + 7) % list.length];
  },
  /** speak a line as this person; resolves when finished (or after a safe timeout), never rejects */
  speak(d: NpcDef, text: string, moodIn?: string): Promise<void> {
    const mood = moodIn ?? voice.mood(d);
    const line = text.replace(/\s+/g, " ").replace(/["“”]/g, "").trim();
    if (!synth || !voice.enabled || !line) return Promise.resolve();
    const base = d.role === "staff" ? personaOf(d.personality).voice : { pitch: KIDS[d.age] ?? 1.1, rate: 1.04 + (hash(d.id) % 10) / 100 };
    let pitch = base.pitch + ((hash(d.id + 3) % 11) - 5) / 50, rate = base.rate;
    if (mood === "joy") { pitch *= 1.1; rate *= 1.08; } else if (mood === "upset" || mood === "frown") { pitch *= 0.9; rate *= 0.85; } else if (mood === "frustrated") { pitch *= 1.04; rate *= 1.16; } else if (mood === "stern") { pitch *= 0.92; rate *= 0.94; } else if (mood === "surprised") { pitch *= 1.18; } else if (mood === "smile") { pitch *= 1.04; }
    const v = voice.pick(d); const parts = line.match(/[^.!?]+[.!?]*/g) ?? [line]; const chunks: string[] = []; for (const p of parts) { const s = p.trim(); if (!s) continue; if (s.length > 170) { const w = s.split(" "); let cur = ""; for (const x of w) { if ((cur + " " + x).length > 150) { chunks.push(cur); cur = x; } else cur += (cur ? " " : "") + x; } if (cur) chunks.push(cur); } else chunks.push(s); }
    voice.cancel();
    return new Promise<void>((res) => {
      let left = chunks.length, done = false; const fin = () => { if (!done) { done = true; res(); } };
      setTimeout(fin, Math.min(30000, 2500 + line.length * 95 / Math.max(.7, rate)));
      for (const ch of chunks) { try { const u = new SpeechSynthesisUtterance(ch); if (v) u.voice = v; u.lang = v?.lang ?? "en-US"; u.pitch = Math.max(0.1, Math.min(2, pitch)); u.rate = Math.max(0.5, Math.min(1.8, rate)); u.volume = 1; u.onend = u.onerror = () => { if (--left <= 0) fin(); }; synth.speak(u); } catch { fin(); } }
    });
  },
};
