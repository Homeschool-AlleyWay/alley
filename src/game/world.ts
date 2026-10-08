/** The living school: seasons, weather and decorations that match where the family really lives, plus the settings that control them.
 *  Privacy: location is OFF until a parent or the player opts in. Only coordinates rounded to ~11 km are stored, on this device only (never synced).
 *  Weather comes from the free Open-Meteo service (no account, no key). With location off, the school follows the date and the browser's time zone. */
export type Weather = "clear" | "cloud" | "rain" | "snow" | "storm" | "fog";
export type Season = "winter" | "spring" | "summer" | "autumn";
export interface Prefs { decor: "auto" | "off" | string; local: boolean; lat: number | null; lon: number | null; sound: boolean; music: boolean; quiet: boolean; weatherFx: boolean }
const KEY = "unify.world.v1";
const DEF: Prefs = { decor: "auto", local: false, lat: null, lon: null, sound: true, music: true, quiet: false, weatherFx: true };
let P: Prefs = { ...DEF }; try { P = { ...DEF, ...(JSON.parse(localStorage.getItem(KEY) || "null") || {}) }; } catch { /* defaults */ }
const subs = new Set<() => void>();
export const World = {
  get prefs() { return P; },
  set(p: Partial<Prefs>) { P = { ...P, ...p }; try { localStorage.setItem(KEY, JSON.stringify(P)); } catch { /* private mode */ } subs.forEach((f) => f()); },
  onChange(f: () => void) { subs.add(f); return () => subs.delete(f); },
};

/** a season for a date; the southern hemisphere is flipped when we know the latitude or the time zone says so */
export function hemisphereSouth(): boolean {
  if (P.local && P.lat != null) return P.lat < 0;
  try { return /^(Australia|Pacific\/(Auckland|Fiji)|America\/(Sao_Paulo|Argentina|Santiago|Lima|Bogota)|Africa\/(Johannesburg|Nairobi|Harare|Maputo))/.test(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { return false; }
}
export function seasonOf(d = new Date()): Season {
  const m = d.getMonth(); let s: Season = m === 11 || m <= 1 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "autumn";
  if (hemisphereSouth()) s = ({ winter: "summer", summer: "winter", spring: "autumn", autumn: "spring" } as const)[s];
  return s;
}

export interface Theme { id: string; name: string; season: Season; palette: string[]; decor: string[]; wall: string; mood: string }
export const THEMES: Theme[] = [
  { id: "autumn", name: "Autumn Harvest", season: "autumn", palette: ["#E8833A", "#C2452D", "#EAB94E", "#8A5A2B", "#B5563E", "#D9A441"], decor: ["🍂", "🍁", "🎃", "🌾", "🍎"], wall: "#E8A33D", mood: "Crunchy leaves and warm colours" },
  { id: "winter", name: "Winter Wonderland", season: "winter", palette: ["#8FC9E8", "#FFFFFF", "#B8A8DA", "#6AA9F0", "#DDEBFA", "#A9DCC0"], decor: ["❄️", "⛄", "🧣", "🌟", "🧤"], wall: "#6AA9F0", mood: "Snowflakes and cosy lights" },
  { id: "spring", name: "Spring Bloom", season: "spring", palette: ["#F28F7E", "#A9DCC0", "#EAA5B2", "#FBE08A", "#B8A8DA", "#8FD18F"], decor: ["🌷", "🌼", "🐝", "🦋", "🌱"], wall: "#8FD18F", mood: "Flowers, bees and fresh air" },
  { id: "summer", name: "Summer Splash", season: "summer", palette: ["#FFD23F", "#3BCEAC", "#F26B5B", "#6AA9F0", "#FF8FB1", "#7BD389"], decor: ["☀️", "🍉", "🕶️", "🏖️", "🍦"], wall: "#FFD23F", mood: "Sunshine and beach vibes" },
  { id: "spooky", name: "Spooky Fun", season: "autumn", palette: ["#F28A1E", "#6B3FA0", "#2B2B34", "#8FD18F", "#F2E94E", "#C2452D"], decor: ["🎃", "🦇", "👻", "🕸️", "🕯️"], wall: "#6B3FA0", mood: "Friendly spooky (nothing scary)" },
  { id: "kindness", name: "Love & Kindness", season: "winter", palette: ["#F28F7E", "#EAA5B2", "#FFFFFF", "#C2456B", "#FBE08A", "#B8A8DA"], decor: ["💖", "💌", "🤝", "🌈", "🌸"], wall: "#EAA5B2", mood: "Friendship notes and kind words" },
  { id: "earth", name: "Earth Week", season: "spring", palette: ["#4C9F70", "#6AA9F0", "#A9DCC0", "#8A5A2B", "#FBE08A", "#7BD389"], decor: ["🌍", "♻️", "🌳", "🐢", "💧"], wall: "#4C9F70", mood: "Plants, recycling and clean water" },
];
const bySeason: Record<Season, string> = { autumn: "autumn", winter: "winter", spring: "spring", summer: "summer" };
/** the theme of the day: a calendar celebration if one applies (US-style dates only for en-US, otherwise just the season), else the season */
export function themeOf(d = new Date()): Theme | null {
  if (P.decor === "off") return null;
  if (P.decor !== "auto") return THEMES.find((t) => t.id === P.decor) ?? null;
  const m = d.getMonth() + 1, day = d.getDate(), us = /^en-US/i.test(navigator.language || "");
  if (us && m === 10 && day >= 20) return THEMES.find((t) => t.id === "spooky")!;
  if (m === 2 && day >= 7 && day <= 14) return THEMES.find((t) => t.id === "kindness")!;
  if (m === 4 && day >= 18 && day <= 25) return THEMES.find((t) => t.id === "earth")!;
  return THEMES.find((t) => t.id === bySeason[seasonOf(d)])!;
}

/* ---------------------------------------------------------------- weather */
export interface Now { weather: Weather; tempC: number | null; isDay: boolean; place: "local" | "seasonal"; at: number }
let now: Now = { weather: "clear", tempC: null, isDay: true, place: "seasonal", at: 0 };
const code = (c: number): Weather => (c === 0 || c === 1 ? "clear" : c <= 3 ? "cloud" : c === 45 || c === 48 ? "fog" : (c >= 51 && c <= 67) || (c >= 80 && c <= 82) ? "rain" : (c >= 71 && c <= 77) || c === 85 || c === 86 ? "snow" : c >= 95 ? "storm" : "cloud");
export const weatherNow = () => now;
/** one gentle, seeded stand-in weather when we don't know the place: mostly clear, a little cloud/rain/snow by season */
function seasonal(): Now { const d = new Date(), s = seasonOf(d), r = Math.abs(Math.sin(d.getDate() * 12.9898 + d.getMonth() * 78.233)) % 1; const w: Weather = s === "winter" ? (r < 0.3 ? "snow" : r < 0.55 ? "cloud" : "clear") : s === "spring" ? (r < 0.3 ? "rain" : r < 0.5 ? "cloud" : "clear") : s === "autumn" ? (r < 0.25 ? "rain" : r < 0.55 ? "cloud" : "clear") : (r < 0.12 ? "storm" : r < 0.3 ? "cloud" : "clear"); return { weather: w, tempC: null, isDay: true, place: "seasonal", at: Date.now() }; }
export async function refreshWeather(): Promise<Now> {
  if (Date.now() - now.at < 20 * 60e3 && now.at) return now;
  if (P.local && P.lat != null && P.lon != null) {
    try { const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${P.lat}&longitude=${P.lon}&current=temperature_2m,weather_code,is_day`); const j = await r.json(); const c = j.current; if (c) { now = { weather: code(+c.weather_code), tempC: +c.temperature_2m, isDay: !!c.is_day, place: "local", at: Date.now() }; subs.forEach((f) => f()); return now; } } catch { /* offline: fall back */ }
  }
  now = seasonal(); subs.forEach((f) => f()); return now;
}
/** ask the browser for the place (only after the user said yes); rounds to one decimal place (about 11 km) and never leaves this device */
export function enableLocal(): Promise<boolean> {
  return new Promise((res) => {
    if (!navigator.geolocation) { res(false); return; }
    navigator.geolocation.getCurrentPosition((p) => { World.set({ local: true, lat: Math.round(p.coords.latitude * 10) / 10, lon: Math.round(p.coords.longitude * 10) / 10 }); now.at = 0; void refreshWeather(); res(true); }, () => res(false), { timeout: 8000, maximumAge: 36e5 });
  });
}
export const disableLocal = () => { World.set({ local: false, lat: null, lon: null }); now.at = 0; void refreshWeather(); };
export const describe = () => { const t = themeOf(), w = now; return `${t ? t.name : "Plain school"} · ${w.weather}${w.tempC != null ? ` ${Math.round(w.tempC)}°C` : ""}${w.place === "local" ? " (your area)" : ""}`; };
