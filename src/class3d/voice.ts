/** Spoken lessons with the browser's built-in speech (no network, no keys). Every person keeps ONE voice: the choice is made once from the
 *  device's voices (sorted, so the order can't change), saved, and kept distinct between teachers. Personality sets pitch and pace; the teacher's
 *  mood only nudges them a little so a voice is always recognisable. Mute is remembered. */
import type { NpcDef } from "../hall3d/roster";
import { personaOf } from "./persona";
import { FACULTY_BY_ID } from "../hall3d/faculty";

const KEY = "unify.voice.on", MAP = "unify.voice.map.v1";
const synth: SpeechSynthesis | null = typeof speechSynthesis !== "undefined" ? speechSynthesis : null;
let voices: SpeechSynthesisVoice[] = [], ready: Promise<void> | null = null;
const load = () => { voices = synth ? synth.getVoices().filter((v) => /^en/i.test(v.lang)).sort((a, b) => (a.name + a.lang).localeCompare(b.name + b.lang)) : []; };
if (synth) { load(); synth.addEventListener?.("voiceschanged", load); }
/** resolves once the device has reported its voices (or after a short wait), so the first line already uses the final voice */
const whenReady = () => ready ??= new Promise<void>((res) => { if (!synth || voices.length) return res(); let n = 0; const t = setInterval(() => { load(); if (voices.length || ++n > 12) { clearInterval(t); res(); } }, 100); });
const FEM = /(female|zira|samantha|karen|victoria|susan|hazel|aria|jenny|linda|moira|tessa|fiona|allison|ava|serena|catherine|kate|emma|joanna|salli|kendra|kimberly|ivy|libby|sonia)/i;
const MAL = /(\bmale\b|david|mark|daniel|alex|fred|george|guy|ryan|james|tom|oliver|arthur|aaron|matthew|joey|justin|brian|eric|gordon|thomas|rishi)/i;
const hash = (n: number) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; return x >>> 0; };
const KIDS: Record<string, number> = { k2: 1.65, g35: 1.45, g68: 1.25, hs: 1.1, adult: 1 };
const store = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(MAP) || "{}"); } catch { return {}; } };
const save = (m: Record<string, string>) => { try { localStorage.setItem(MAP, JSON.stringify(m)); } catch { /* private mode */ } };
export const voice = {
  get enabled() { try { return localStorage.getItem(KEY) !== "0"; } catch { return true; } },
  set enabled(v: boolean) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* private mode */ } if (!v) this.cancel(); },
  get available() { return !!synth; },
  /** who is speaking in what mood (the classroom supplies this) */
  mood: ((_d: NpcDef) => "neutral") as (d: NpcDef) => string,
  cancel() { try { synth?.cancel(); } catch { /* ignore */ } },
  /** the one voice for this person: saved choice first, otherwise the first free voice of the right kind, distinct from other teachers */
  pick(d: NpcDef): SpeechSynthesisVoice | null {
    if (!voices.length) load(); if (!voices.length) return null;
    const m = store(), key = String(d.id), saved = voices.find((v) => v.voiceURI === m[key]); if (saved) return saved;
    const fac = d.faculty ? FACULTY_BY_ID[d.faculty] : null, female = fac ? fac.gender === "F" : /^(ms|mrs|miss)\b/i.test(d.name) || (d.role !== "staff" ? hash(d.id) % 2 === 0 : false);
    const kind = voices.filter((v) => (female ? FEM.test(v.name) : MAL.test(v.name)) && !(female ? MAL.test(v.name) : FEM.test(v.name))), pool = kind.length ? kind : voices;
    const used = new Set(Object.entries(m).filter(([k]) => k !== key && (d.role === "staff") === (Number(k) >= 100)).map(([, u]) => u));
    const start = hash(d.id + 7) % pool.length; let v = pool[start]; for (let i = 0; i < pool.length; i++) { const c = pool[(start + i) % pool.length]; if (!used.has(c.voiceURI)) { v = c; break; } }
    m[key] = v.voiceURI; save(m); return v;
  },
  /** speak a line as this person; resolves when finished (or after a safe timeout), never rejects */
  async speak(d: NpcDef, text: string, moodIn?: string): Promise<void> {
    const line = text.replace(/\s+/g, " ").replace(/["“”]/g, "").trim();
    if (!synth || !voice.enabled || !line) return;
    await whenReady(); const mood = moodIn ?? voice.mood(d);
    const base = d.role === "staff" ? personaOf(d.faculty ?? d.personality).voice : { pitch: KIDS[d.age] ?? 1.1, rate: 1.04 + (hash(d.id) % 10) / 100 };
    let pitch = base.pitch, rate = base.rate;       // small, bounded nudges only: the voice stays the same person
    if (mood === "joy") { pitch *= 1.06; rate *= 1.05; } else if (mood === "upset" || mood === "frown") { pitch *= 0.94; rate *= 0.92; } else if (mood === "frustrated") { pitch *= 1.03; rate *= 1.08; } else if (mood === "stern") { pitch *= 0.96; rate *= 0.96; } else if (mood === "surprised") pitch *= 1.08;
    const v = voice.pick(d); const parts = line.match(/[^.!?]+[.!?]*/g) ?? [line]; const chunks: string[] = []; for (const p of parts) { const s = p.trim(); if (!s) continue; if (s.length > 170) { const w = s.split(" "); let cur = ""; for (const x of w) { if ((cur + " " + x).length > 150) { chunks.push(cur); cur = x; } else cur += (cur ? " " : "") + x; } if (cur) chunks.push(cur); } else chunks.push(s); }
    voice.cancel();
    return new Promise<void>((res) => {
      let left = chunks.length, done = false; const fin = () => { if (!done) { done = true; res(); } };
      setTimeout(fin, Math.min(30000, 2500 + line.length * 95 / Math.max(.7, rate)));
      for (const ch of chunks) { try { const u = new SpeechSynthesisUtterance(ch); if (v) u.voice = v; u.lang = v?.lang ?? "en-US"; u.pitch = Math.max(0.1, Math.min(2, pitch)); u.rate = Math.max(0.5, Math.min(1.8, rate)); u.volume = 1; u.onend = u.onerror = () => { if (--left <= 0) fin(); }; synth.speak(u); } catch { fin(); } }
    });
  },
};
