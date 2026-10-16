/** Scene-script generator: turns a field report (title + 2-4 beats with setting / subject / action keywords) into a short papercut film
 *  script (JSON): 3-5 scenes, each a stack of layered paper pieces. Pure and deterministic (seeded by the report id), no network, no AI service.
 *  The script is stored with the report, so playback is identical every time; papercut.ts only draws it. */

export interface ReportBeat { text: string; setting?: string; subject?: string; action?: string }
export interface ReportInput { id: string; title: string; audience?: string; beats: ReportBeat[] }
/** one paper piece. k = kind, d = depth (0 far .. 1.4 near, drives parallax), x/y/s = place and size on the 640x360 sheet, v = variant, c = colour index, a = animation, sd = shape seed */
export interface Layer { k: string; d: number; x: number; y: number; s: number; v?: string; c?: number; a?: string; sd: number }
export interface Scene { dur: number; setting: string; pal: string; pan: number; tr: "slide" | "page" | "fade"; cap: string; say: string; L: Layer[] }
export interface SceneScript { v: 1; seed: number; title: string; audience: string; dur: number; scenes: Scene[] }

export const SETTINGS = ["meadow", "forest", "city", "school", "beach", "ocean", "river", "mountain", "space", "lab", "stadium", "stage", "museum", "garden", "farm", "office", "civic", "home"] as const;
export const SUBJECTS = ["kids", "adult", "scientist", "dog", "cat", "bird", "fish", "whale", "turtle", "bee", "butterfly", "robot", "rocket", "planet", "ball", "book", "bike", "boat", "bus", "tree", "flower", "coins", "laptop", "lightbulb", "trophy", "easel", "music", "microscope", "telescope", "gradcap", "trafficlight", "kite", "dino"] as const;
export const ACTIONS = ["bob", "walk", "fly", "jump", "grow", "float", "spin", "wave", "work"] as const;

const SET_KEYS: [string, RegExp][] = [
  ["space", /\b(space|planet|moon|stars?|galaxy|orbit|stargaz\w*|astronom\w*|observatory)\b/], ["ocean", /\b(ocean|sea|reef|underwater|whales?|dolphins?|tide)\b/],
  ["beach", /\b(beach|shore|coast|sand|dunes?)\b/], ["river", /\b(river|lake|pond|creek|stream|wetlands?|harbor)\b/], ["mountain", /\b(mountains?|peaks?|cliffs?|canyon|glacier|volcano)\b/],
  ["forest", /\b(forest|woods|woodland|trail|jungle|rainforest)\b/], ["lab", /\b(lab|laboratory|experiments?|workshop|makerspace|robot\w*|coding|science fair)\b/],
  ["stadium", /\b(stadium|field day|race|relay|track|court|gym|soccer|basketball|baseball|tournament|match|sports?)\b/], ["stage", /\b(stage|theat(er|re)|concert|band|recital|musical|choir|orchestra)\b/],
  ["museum", /\b(museum|gallery|exhibit|archive|library|fossils?|dinosaurs?|history|castle)\b/], ["civic", /\b(council|town hall|debate|vote|voting|election|civics|mayor|courthouse)\b/],
  ["office", /\b(office|career|careers|interview|bank|workplace|paycheck|budget\w*|college|applications?|resume)\b/], ["farm", /\b(farm|barn|orchard|farmers?)\b/],
  ["garden", /\b(garden|greenhouse|bees|seeds?|sprouts?|butterfl\w+|monarchs?|flowers?)\b/], ["school", /\b(school|classroom|campus|playground|cafeteria|hallway|students?|class)\b/],
  ["city", /\b(city|downtown|town|skyline|street|streets|neighbou?rhood|market|crosswalk|traffic|bridge|bikes?|bicycles?)\b/], ["meadow", /\b(meadow|field|prairie|grass|park|hill|pasture)\b/], ["home", /\b(home|kitchen|house|family)\b/],
];
const SUB_KEYS: [string, RegExp][] = [
  ["whale", /\b(whales?|dolphins?)\b/], ["dino", /\b(dinosaurs?|fossils?|dino)\b/], ["telescope", /\b(telescopes?|stargaz\w*)\b/], ["rocket", /\b(rockets?|satellites?|spaceship)\b/], ["planet", /\b(planets?|moon|astronom\w*|stars?)\b/],
  ["robot", /\b(robots?|drones?|machines?|robotics?|ai)\b/], ["microscope", /\b(microscopes?|cells?|specimens?)\b/], ["butterfly", /\b(butterfl\w+|monarchs?)\b/], ["bee", /\b(bees?|insects?|pollen\w*|pollinat\w*)\b/],
  ["turtle", /\b(turtles?|tortoises?)\b/], ["dog", /\b(dogs?|pupp(y|ies))\b/], ["cat", /\b(cats?|kittens?)\b/], ["fish", /\b(fish|trout|salmon)\b/], ["bird", /\b(birds?|owls?|eagles?|ducks?|geese|hawks?)\b/],
  ["trafficlight", /\b(crosswalk|traffic|stoplight|signal|safety|safe)\b/], ["bike", /\b(bikes?|bicycles?|helmets?|pedal\w*)\b/], ["boat", /\b(boats?|ships?|kayaks?|canoes?|sail\w*)\b/], ["bus", /\b(buses|bus|trains?|cars?)\b/],
  ["kite", /\b(kites?)\b/], ["ball", /\b(balls?|soccer|basketball|baseball|relay)\b/], ["trophy", /\b(trophy|trophies|medals?|champions?|winners?)\b/], ["easel", /\b(paint\w*|murals?|art|artists?|drawing|easel)\b/],
  ["music", /\b(music|songs?|band|choir|drums?|guitars?|pianos?|concert|orchestra)\b/], ["gradcap", /\b(graduat\w*|college|diploma|degree|applications?)\b/], ["coins", /\b(coins?|money|budget\w*|savings?|paycheck|bank)\b/],
  ["laptop", /\b(laptops?|code|coding|computers?|apps?|websites?)\b/], ["lightbulb", /\b(light ?bulbs?|ideas?|invent\w*|energy|solar|power\w*)\b/], ["book", /\b(books?|reading|stor(y|ies)|library|novels?)\b/],
  ["scientist", /\b(scientists?|researchers?|engineers?|doctors?)\b/], ["tree", /\b(trees?|saplings?|forest|woods)\b/], ["flower", /\b(flowers?|plants?|garden|seedlings?|seeds?|sunflowers?)\b/],
  ["adult", /\b(teachers?|coach\w*|mentors?|volunteers?|mayor|speakers?|neighbou?rs?|people|community|adults?|council|panel)\b/], ["kids", /\b(kids?|children|students?|team|class|club|friends)\b/],
];
const ACT_KEYS: [string, RegExp][] = [
  ["fly", /\b(fly|flies|flying|soar\w*|glide|launch\w*|rise|rising)\b/], ["float", /\b(swim\w*|dive|sail\w*|float\w*|paddle|splash\w*|watch\w*|migrat\w*)\b/], ["grow", /\b(grow\w*|plant\w*|bloom\w*|sprout\w*)\b/],
  ["spin", /\b(spin\w*|roll\w*|ride|riding|pedal\w*|wheel\w*)\b/], ["jump", /\b(jump\w*|leap\w*|hop\w*|dance\w*|cheer\w*|celebrat\w*|score\w*|win|wins|won)\b/], ["walk", /\b(walk\w*|march\w*|hike|hiking|run|running|race|parade|cross\w*|collect\w*)\b/],
  ["wave", /\b(wave|waving|greet\w*|welcome|present\w*|speak\w*|talk\w*|debate|explain\w*|point\w*|share\w*)\b/], ["work", /\b(build\w*|make|making|paint\w*|write|writing|code|coding|practice|practic\w*|tune|tunes|tuning|sort\w*|study\w*|plan\w*|apply|applying)\b/],
];
const pickKey = (list: [string, RegExp][], text: string, fallback: string) => { const t = text.toLowerCase(); for (const [k, re] of list) if (re.test(t)) return k; return fallback; };
export const inferSetting = (t: string, fb = "meadow") => pickKey(SET_KEYS, t, fb);
export const inferSubject = (t: string, fb = "kids") => pickKey(SUB_KEYS, t, fb);
export const inferAction = (t: string, fb = "bob") => pickKey(ACT_KEYS, t, fb);

export function hashStr(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** small seeded random generator (mulberry32) */
export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const INDOOR = new Set(["lab", "stage", "museum", "office", "civic", "home", "school"]);
const NIGHT = /\b(night|moon|stars?|stargaz\w*|evening|tonight|galaxy|telescope)\b/i, DUSK = /\b(sunset|dusk|golden hour|evening)\b/i;
const rd = (n: number) => Math.round(n * 10) / 10;
/** seconds that neighbouring scenes overlap while a transition plays */
export const TR = 0.8;

/** the paper pieces of one scene: backdrop for the setting, a few clouds / sun, the subject(s), a foreground strip */
function composeScene(setting0: string, subject: string, action: string, text: string, r: () => number): { L: Layer[]; pal: string } {
  const setting = setting0 === "ocean" && subject === "boat" ? "coast" : setting0, sd = () => Math.floor(r() * 1e9), L: Layer[] = [];
  const pal = setting === "space" || (NIGHT.test(text) && !INDOOR.has(setting)) ? "night" : DUSK.test(text) && !INDOOR.has(setting) ? "dusk" : INDOOR.has(setting) && setting !== "school" ? "room" : "day";
  const add = (k: string, d: number, x: number, y: number, s = 1, o: Partial<Layer> = {}) => L.push({ k, d, x: rd(x), y: rd(y), s: rd(s), sd: sd(), ...o });
  add("sky", 0, 0, 0);
  if (pal === "night") { add("stars", 0.05, 0, 0); add("moon", 0.08, 120 + r() * 380, 90 + r() * 30, 1); }
  else if (pal !== "room" && setting !== "ocean") { add("sun", 0.08, 90 + r() * 460, pal === "dusk" ? 190 : 100 + r() * 24, 1, { a: "glow" }); }
  if (pal !== "room" && setting !== "ocean" && setting !== "space") for (let i = 0; i < 3; i++) add("cloud", 0.18 + i * 0.06, -40 + r() * 680, 66 + r() * 80, 0.8 + r() * 0.8, { a: "drift" });
  const groundY = 262;
  switch (setting) {
    case "meadow": add("hill", 0.2, 0, 200, 1, { c: 0 }); add("hill", 0.4, 0, 232, 1, { c: 1 }); for (let i = 0; i < 3; i++) add("tree", 0.5, 70 + i * 230 + r() * 80, 246, 0.9 + r() * 0.5, { a: "sway" }); for (let i = 0; i < 6; i++) add("flower", 0.9, 30 + i * 105 + r() * 50, 330 - r() * 8, 0.7 + r() * 0.5, { c: i % 4, a: "sway" }); break;
    case "forest": add("hill", 0.2, 0, 190, 1, { c: 1 }); for (let i = 0; i < 9; i++) add("pine", 0.3 + (i % 3) * 0.15, 20 + i * 76 + r() * 30, 236 + (i % 3) * 18, 1.1 + r() * 0.7, { c: i % 3 }); add("hill", 0.8, 0, 300, 1, { c: 0 }); break;
    case "city": for (let i = 0; i < 8; i++) add("bldg", 0.25, i * 90 - 20 + r() * 20, 230, 1, { c: i % 5, v: "far" }); for (let i = 0; i < 5; i++) add("bldg", 0.5, i * 150 - 30 + r() * 30, 285, 1, { c: (i + 2) % 5, v: "near" }); add("road", 0.7, 0, 300); break;
    case "school": add("hill", 0.2, 0, 215, 1, { c: 1 }); add("school", 0.45, 150 + r() * 80, 285, 1.1); add("tree", 0.55, 60, 290, 1.2, { a: "sway" }); add("tree", 0.55, 590, 290, 1.1, { a: "sway" }); add("grass", 0.8, 0, 300); break;
    case "beach": add("sea", 0.2, 0, 206, 1); add("sand", 0.5, 0, 262, 1); add("palm", 0.6, 70 + r() * 40, 275, 1.2, { a: "sway" }); add("palm", 0.6, 540, 270, 1, { a: "sway" }); break;
    case "ocean": add("water", 0.05, 0, 0); add("rays", 0.1, 280, 0); for (let i = 0; i < 5; i++) add("weed", 0.6 + (i % 2) * 0.2, 30 + i * 150 + r() * 60, 350, 1 + r() * 0.5, { c: i % 3, a: "sway" }); for (let i = 0; i < 12; i++) add("bubble", 0.7, r() * 640, 120 + r() * 220, 0.5 + r() * 0.8, { a: "rise" }); add("sandbed", 0.9, 0, 322); break;
    case "coast": add("sea", 0.2, 0, 196, 1); add("sea", 0.4, 0, 232, 1); add("palm", 0.35, 590, 215, 0.8, { a: "sway" }); break;
    case "river": add("hill", 0.2, 0, 190, 1, { c: 1 }); add("hill", 0.35, 0, 224, 1, { c: 0 }); add("riverband", 0.55, 0, 262); for (let i = 0; i < 5; i++) add("reed", 0.9, 20 + i * 150 + r() * 60, 346, 1, { a: "sway" }); break;
    case "mountain": add("peak", 0.2, 80, 250, 1.6, { c: 0 }); add("peak", 0.28, 380, 252, 1.9, { c: 1 }); add("peak", 0.4, 220, 280, 1.3, { c: 2 }); for (let i = 0; i < 5; i++) add("pine", 0.7, 20 + i * 150 + r() * 60, 330, 1.2, { c: 0 }); add("hill", 0.85, 0, 330, 1, { c: 0 }); break;
    case "space": for (let i = 0; i < 3; i++) add("orb", 0.15 + i * 0.1, 80 + r() * 480, 60 + r() * 200, 0.6 + r() * 1.2, { c: i, a: "drift" }); add("moonground", 0.7, 0, 318); break;
    case "lab": add("wall", 0.02, 0, 0, 1, { c: 2 }); add("window", 0.2, 470 + r() * 40, 90, 1); add("shelf", 0.25, 40, 110, 1); add("shelf", 0.25, 40, 170, 1); add("floor", 0.4, 0, 292); add("bench", 0.6, 60, 300, 1.2); break;
    case "stadium": add("hill", 0.2, 0, 190, 1, { c: 1 }); add("stands", 0.3, 0, 226, 1); add("fieldgrass", 0.5, 0, 262); add("goal", 0.6, 540, 290, 1); add("lines", 0.7, 0, 300); break;
    case "stage": add("wall", 0.02, 0, 0, 1, { c: 3 }); add("curtain", 0.2, 0, 0, 1); add("spot", 0.3, 220 + r() * 200, 0, 1, { a: "sweep" }); add("boards", 0.5, 0, 290); break;
    case "museum": add("wall", 0.02, 0, 0, 1, { c: 0 }); for (let i = 0; i < 3; i++) add("frame", 0.2, 70 + i * 200 + r() * 40, 70 + r() * 20, 1, { c: i }); add("floor", 0.4, 0, 292); add("plinth", 0.55, 520, 310, 1); break;
    case "garden": add("hill", 0.2, 0, 205, 1, { c: 1 }); add("fence", 0.4, 0, 262, 1); for (let i = 0; i < 4; i++) add("sunflower", 0.55, 60 + i * 170 + r() * 50, 290, 1 + r() * 0.5, { a: "sway" }); add("grass", 0.85, 0, 306); break;
    case "farm": add("hill", 0.2, 0, 200, 1, { c: 1 }); add("barn", 0.4, 90 + r() * 60, 275, 1.1); add("fence", 0.55, 0, 285, 1); add("tree", 0.5, 560, 270, 1, { a: "sway" }); add("grass", 0.85, 0, 306); break;
    case "office": add("wall", 0.02, 0, 0, 1, { c: 1 }); add("window", 0.2, 60 + r() * 30, 70, 1.2); add("window", 0.2, 380 + r() * 30, 70, 1.2); add("floor", 0.4, 0, 292); add("desk", 0.6, 360, 305, 1.1); add("plant", 0.7, 590, 300, 1, { a: "sway" }); break;
    case "civic": add("wall", 0.02, 0, 0, 1, { c: 4 }); add("columns", 0.25, 0, 0, 1); add("flag", 0.3, 560, 40, 1, { a: "sway" }); add("floor", 0.4, 0, 292); add("podium", 0.6, 120, 300, 1); break;
    default: add("wall", 0.02, 0, 0, 1, { c: 1 }); add("window", 0.2, 250, 70, 1.2); add("floor", 0.4, 0, 292); add("rug", 0.5, 300, 318, 1); break;
  }
  const baseY = setting === "ocean" ? 210 : setting === "coast" ? 292 : setting === "space" ? 250 : setting === "river" || setting === "beach" ? 306 : INDOOR.has(setting) ? 308 : 318;
  const sub = (subject: string, x: number, y: number, s: number, o: Partial<Layer> = {}) => add("actor", 0.9, x, y, s * 1.4, { v: subject, a: action, ...o });
  const mid = 280 + r() * 110;
  if (subject === "kids") { sub("kid", mid - 80, baseY, 1.1, { c: 0 }); sub("kid", mid + 10, baseY + 6, 1.25, { c: 1 }); sub("kid", mid + 100, baseY, 1.05, { c: 2 }); }
  else if (subject === "adult" || subject === "scientist") { sub(subject === "adult" ? "adult" : "scientist", mid, baseY, 1.45, { c: Math.floor(r() * 3) }); sub("kid", mid + 100, baseY + 5, 1.1, { c: 1 }); }
  else sub(subject, mid, baseY, ["whale", "bus", "boat", "dino"].includes(subject) ? 1.5 : 1.35);
  if (["lab", "stage", "museum", "office", "civic", "home", "school", "meadow", "garden", "farm", "stadium", "city"].includes(setting) && subject !== "kids" && r() < 0.6) sub("kid", mid - 130, baseY + 4, 1.0, { c: 2 });
  if (INDOOR.has(setting)) add("fg", 1.25, 0, 346, 1, { c: 1 }); else add("fg", 1.25, 0, 340, 1, { c: 0 });
  if (setting === "meadow" || setting === "garden" || setting === "forest") add("butterflyfx", 1.0, 100 + r() * 400, 120 + r() * 80, 0.8, { a: "flutter" });
  return { L, pal };
}

const wordsOf = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
/** a spoken-style version of a beat (what the narrator says) */
const sayOf = (s: string) => s.replace(/\s+/g, " ").trim();

/** Make the film script for a report. 2-4 beats become 3-5 scenes (an opening title scene plus one scene per beat). Same report in, same script out. */
export function generateScript(rep: ReportInput): SceneScript {
  const seed = hashStr(rep.id + "|" + rep.title), r = rng(seed), beats = rep.beats.filter((b) => b.text.trim()).slice(0, 4);
  const titleText = rep.title;
  const scenes: Scene[] = []; let setting = inferSetting(titleText + " " + (beats[0]?.text ?? ""), "meadow"), subject = inferSubject(titleText, "kids"), action = "bob";
  const mk = (cap: string, say: string, st: string, su: string, ac: string, text: string, idx: number, title = false) => {
    const { L, pal } = composeScene(st, su, ac, text, r), dur = title ? 3.4 : Math.min(7, Math.max(3.6, wordsOf(cap) * 0.34 + 1.4));
    scenes.push({ dur: rd(dur), setting: st, pal, pan: idx % 2 ? -1 : 1, tr: idx % 2 ? "page" : "slide", cap, say, L });
  };
  // opening scene: the title over the first beat's setting
  const b0 = beats[0]; if (b0) { setting = b0.setting && SETTINGS.includes(b0.setting as never) ? b0.setting : inferSetting(titleText + " " + b0.text, setting); subject = b0.subject && SUBJECTS.includes(b0.subject as never) ? b0.subject : inferSubject(titleText + " " + b0.text, subject); }
  mk(titleText, titleText, setting, subject, inferAction(titleText, "wave"), titleText, 0, true);
  beats.forEach((b, i) => {
    const text = `${b.text} ${i === 0 ? titleText : ""}`;
    setting = b.setting && SETTINGS.includes(b.setting as never) ? b.setting : inferSetting(b.text, setting);
    subject = b.subject && SUBJECTS.includes(b.subject as never) ? b.subject : inferSubject(b.text, subject);
    action = b.action && ACTIONS.includes(b.action as never) ? b.action : inferAction(b.text, ["bob", "walk", "wave", "work"][i % 4]);
    mk(b.text.trim(), sayOf(b.text), setting, subject, action, text, i + 1);
  });
  if (scenes.length < 3) mk("Reported by UNIFY News", "That is the report from UNIFY News.", setting, subject, "wave", "", scenes.length);
  scenes.length = Math.min(scenes.length, 5);
  scenes[scenes.length - 1].tr = "fade";
  return { v: 1, seed, title: titleText, audience: rep.audience === "hs" ? "hs" : "all", dur: rd(scenes.reduce((n, s) => n + s.dur, 0) - TR * (scenes.length - 1)), scenes };
}
