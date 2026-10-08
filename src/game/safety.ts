/** Family safety tools: how long the school was used, who a child is talking to, a block list, approved live-class hosts, and a message filter.
 *  Everything is stored on this device (and travels with the family account if sync is on). Only a parent with the PIN unlocked can change it. */
const KEY = "unify.safety.v1";
interface St { mins: Record<string, number>; blocked: string[]; hosts: Record<string, "ok" | "no">; reports: { at: number; who: string; why: string }[]; limitMin: number }
const read = (): St => { try { return { mins: {}, blocked: [], hosts: {}, reports: [], limitMin: 0, ...(JSON.parse(localStorage.getItem(KEY) || "null") || {}) }; } catch { return { mins: {}, blocked: [], hosts: {}, reports: [], limitMin: 0 }; } };
const write = (s: St) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };
const day = (d = new Date()) => d.toISOString().slice(0, 10);
export const parentUnlocked = () => { try { return sessionStorage.getItem("unify.family.unlock") === "1" || sessionStorage.getItem("unify.family.ci") === "parent" || localStorage.getItem("unify.opendoor.adult") === "1"; } catch { return false; } };
export const Safety = {
  state: read,
  /** call once a minute while the page is visible */
  tick() { if (document.hidden) return; const s = read(); s.mins[day()] = (s.mins[day()] ?? 0) + 1; const keep = Object.keys(s.mins).sort().slice(-30); s.mins = Object.fromEntries(keep.map((k) => [k, s.mins[k]])); write(s); },
  minutesToday() { return read().mins[day()] ?? 0; },
  minutesWeek() { const s = read(); let t = 0; for (let i = 0; i < 7; i++) t += s.mins[day(new Date(Date.now() - i * 864e5))] ?? 0; return t; },
  overLimit() { const s = read(); return s.limitMin > 0 && (s.mins[day()] ?? 0) >= s.limitMin; },
  setLimit(m: number) { const s = read(); s.limitMin = Math.max(0, Math.min(600, m | 0)); write(s); },
  isBlocked(handle: string) { return read().blocked.includes(handle.toLowerCase()); },
  block(handle: string, why = "") { const s = read(), h = handle.toLowerCase(); if (!s.blocked.includes(h)) s.blocked.push(h); s.reports.push({ at: Date.now(), who: h, why: why.slice(0, 120) }); write(s); },
  unblock(handle: string) { const s = read(); s.blocked = s.blocked.filter((x) => x !== handle.toLowerCase()); write(s); },
  hostStatus(name: string): "ok" | "no" | "new" { return read().hosts[name.trim().toLowerCase()] ?? "new"; },
  setHost(name: string, v: "ok" | "no") { const s = read(); s.hosts[name.trim().toLowerCase()] = v; write(s); },
};
/** keep personal details and rude words out of real-person chats. Returns the cleaned text and a friendly reason if something was blocked. */
const BAD = /\b(fuck\w*|shit\w*|bitch\w*|cunt|dick|nigg\w*|fag\w*|porn\w*|sex\w*|rape|nazi)\b/i;
export function cleanMessage(text: string): { text: string; blocked: string | null } {
  let t = text.trim().slice(0, 500);
  if (BAD.test(t)) return { text: "", blocked: "Let's keep it kind and school-friendly. That message wasn't sent." };
  const personal: [RegExp, string][] = [[/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, "an email address"], [/\b(?:\+?\d[\s().-]?){9,}\b/g, "a phone number"], [/\bhttps?:\/\/\S+|\bwww\.\S+/gi, "a link"], [/\b\d{1,5}\s+[A-Za-z]+\s+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|court|ct|blvd|way)\b/gi, "an address"]];
  let hit: string | null = null; for (const [re, what] of personal) if (re.test(t)) { hit = what; t = t.replace(re, "▒▒▒"); }
  return { text: t, blocked: hit ? `For safety, ${hit} was hidden. Please don't share personal details online.` : null };
}
