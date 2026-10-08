/** A classmate's mood changes day to day (same for everyone on a given day). */
export type DayMood = "happy" | "neutral" | "shy" | "excited" | "sad" | "annoyed";
const MOODS: DayMood[] = ["happy", "happy", "excited", "neutral", "neutral", "shy", "sad"];
const hash = (a: number, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
export function dayMood(id: number, shy = false, d = new Date()): DayMood { const m = MOODS[Math.floor(hash(id + 7, Math.floor(d.getTime() / 864e5)) * MOODS.length)]; return shy && m === "excited" ? "shy" : m; }
export const moodLine = (m: DayMood) => m === "sad" ? " I'm a little down today, to be honest." : m === "excited" ? " I'm so excited today!" : m === "shy" ? " I'm feeling a bit quiet today." : "";
