/** School events. One rotates in each week (Wednesday to Friday). Every event is OPTIONAL and ADAPTABLE: you pick your own team colour, accessory or role
 *  (adopt), tune it to suit you (adapt), or skip it (opt out, or switch on quiet mode in the Today panel). Nothing about an event is required for lessons. */
import { World, themeOf } from "./world";
export interface Choice { id: string; label: string; color?: string; emoji?: string }
export interface EventDef { id: string; name: string; icon: string; blurb: string; color: string; kind?: string; teams?: Choice[]; accessories?: Choice[]; roles?: Choice[]; quest: string }
export const EVENTS: EventDef[] = [
  { id: "spirit", name: "Spirit Week", icon: "🎉", blurb: "Wear your team colour and cheer on everyone. Pick the colours and style that feel like you.", color: "#E8604C", quest: "cheer",
    teams: [{ id: "red", label: "Red Rockets", color: "#E8604C" }, { id: "blue", label: "Blue Comets", color: "#4F91C7" }, { id: "green", label: "Green Giants", color: "#5FB37A" }, { id: "gold", label: "Golden Stars", color: "#EAB94E" }],
    accessories: [{ id: "headband", label: "Headband", emoji: "🎽" }, { id: "cap", label: "Team cap", emoji: "🧢" }, { id: "none", label: "Just the colour" }], roles: [{ id: "cheer", label: "Cheerleader" }, { id: "player", label: "Team player" }, { id: "fan", label: "Quiet fan" }] },
  { id: "trivia", name: "Trivia Showdown", icon: "🧠", blurb: "Class vs class quiz in the auditorium. Play as captain, answerer or cheerer, whichever you enjoy.", color: "#6AA9F0", quest: "trivia",
    teams: [{ id: "owls", label: "Owls", color: "#8E7CC3" }, { id: "foxes", label: "Foxes", color: "#E8833A" }], roles: [{ id: "captain", label: "Captain" }, { id: "answer", label: "Answerer" }, { id: "cheer", label: "Cheerer" }] },
  { id: "fair", name: "Science & Maker Fair", icon: "🔬", blurb: "Show off something you made or learned. Pick a booth theme and tell your story your way.", color: "#5FB37A", quest: "show",
    accessories: [{ id: "goggles", label: "Safety goggles", emoji: "🥽" }, { id: "labcoat", label: "Lab coat feel" }, { id: "none", label: "Casual" }], roles: [{ id: "present", label: "Present a project" }, { id: "visit", label: "Visit booths" }] },
  { id: "festival", name: "Seasonal Festival", icon: "🎈", blurb: "The decorations of the season come alive with games and treats. Join the games you like.", color: "#F2A03D", quest: "festival",
    accessories: [{ id: "crown", label: "Festival crown", emoji: "👑" }, { id: "scarf", label: "Cosy scarf", emoji: "🧣" }, { id: "none", label: "Just the fun" }], roles: [{ id: "games", label: "Play games" }, { id: "snacks", label: "Snack helper" }, { id: "art", label: "Decorate" }] },
  { id: "trip", name: "VR Field Trip Day", icon: "🥽", blurb: "Travel the world, the ocean or space together without leaving school. Look around by dragging or tilting your phone.", color: "#3BCEAC", quest: "trip",
    roles: [{ id: "explorer", label: "Explorer" }, { id: "scribe", label: "Note taker" }, { id: "photo", label: "Photographer" }] },
  { id: "book", name: "Book & Story Day", icon: "📚", blurb: "Dress as a favourite character (or just bring a favourite story) and swap recommendations.", color: "#B8A8DA", quest: "story",
    accessories: [{ id: "glasses", label: "Reading glasses", emoji: "👓" }, { id: "hat", label: "Storyteller hat", emoji: "🎩" }, { id: "none", label: "Just the book" }], roles: [{ id: "reader", label: "Reader" }, { id: "writer", label: "Writer" }] },
  { id: "picture", name: "Picture Day", icon: "📸", blurb: "Smile! Pick your pose and background colour for the school picture.", color: "#EAA5B2", quest: "pose",
    teams: [{ id: "sky", label: "Sky blue", color: "#8FC9E8" }, { id: "rose", label: "Rose", color: "#EAA5B2" }, { id: "mint", label: "Mint", color: "#A9DCC0" }, { id: "sun", label: "Sunny", color: "#FBE08A" }], roles: [{ id: "smile", label: "Big smile" }, { id: "cool", label: "Cool pose" }, { id: "silly", label: "Silly face" }] },
];
const KEY = "unify.events.v1";
interface St { adopt: Record<string, { team?: string; acc?: string; role?: string; day: string }>; out: Record<string, string> }
const read = (): St => { try { return { adopt: {}, out: {}, ...(JSON.parse(localStorage.getItem(KEY) || "null") || {}) }; } catch { return { adopt: {}, out: {} }; } };
const write = (s: St) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };
const dayStr = (d = new Date()) => d.toISOString().slice(0, 10);
const weekNo = (d: Date) => Math.floor((d.getTime() / 864e5 + 3) / 7);
export interface Today { def: EventDef; live: boolean; startsIn: number }
/** this week's event; it is "live" Wednesday to Friday (the phone calendar shows it all week) */
export function eventThisWeek(d = new Date()): Today { const def = EVENTS[weekNo(d) % EVENTS.length], dow = d.getDay(); return { def, live: dow >= 3 && dow <= 5, startsIn: dow < 3 ? 3 - dow : 0 }; }
export const Events = {
  today: eventThisWeek,
  mine(id: string) { const a = read().adopt[id]; return a && a.day === weekKeyStr() ? a : null; },
  optedOut(id: string) { return read().out[id] === weekKeyStr(); },
  adopt(id: string, o: { team?: string; acc?: string; role?: string }) { const s = read(); s.adopt[id] = { ...o, day: weekKeyStr() }; delete s.out[id]; write(s); try { dispatchEvent(new CustomEvent("unify:event-adopt", { detail: { id } })); } catch { /* none */ } },
  optOut(id: string) { const s = read(); delete s.adopt[id]; s.out[id] = weekKeyStr(); write(s); try { dispatchEvent(new CustomEvent("unify:event-adopt", { detail: { id } })); } catch { /* none */ } },
  quiet() { return World.prefs.quiet; },
  /** the look overrides for the player (their own choices) or an NPC (the school joins in only if quiet mode is off) */
  dress(look: any, id: number, isMe: boolean) {
    if (World.prefs.quiet) return look; const t = eventThisWeek(); if (!t.live) return look; const d = t.def, a = isMe ? Events.mine(d.id) : null;
    if (isMe && !a) return look;
    const out = { ...look };
    const team = d.teams ? (a?.team ? d.teams.find((x) => x.id === a.team) : d.teams[id % d.teams.length]) : null;
    if (d.id === "spirit" && team?.color) { out.shirt = team.color; out.shirt2 = "#ffffff"; }
    const acc = a?.acc ?? (d.accessories ? d.accessories[id % d.accessories.length].id : "none");
    const map: Record<string, any> = { headband: { hat: "headband" }, cap: { hat: "cap" }, goggles: { glasses: "#6AA9F0" }, crown: { hat: "crown" }, scarf: { scarf: "#EAB94E" }, glasses: { glasses: "round" }, hat: { hat: "fedora" } };
    if (acc && map[acc]) Object.assign(out, map[acc], map[acc].hat ? { hatColor: team?.color ?? d.color } : {});
    return out;
  },
  banner(): string { const t = eventThisWeek(), th = themeOf(); return t.live ? `${t.def.icon} ${t.def.name} is on! ${t.def.blurb}` : `${t.def.icon} Coming ${t.startsIn === 1 ? "tomorrow" : `in ${t.startsIn} days`}: ${t.def.name}${th ? ` · ${th.name} decorations up` : ""}`; },
};
function weekKeyStr() { return String(weekNo(new Date())); }
void dayStr;
