/** Interactive examples that open from the classroom: small hands-on games for every lesson. Each can be done alone or with a classmate partner
 *  (an NPC who hints, cheers and remembers working with you). Some are 3D (drag to orbit, click parts). */
import { Progress } from "../game/progress";
import * as THREE from "three";
import { Social } from "../hall3d/social";
import { drawPortrait } from "../hall3d/chatui";
import type { NpcDef } from "../hall3d/roster";
import { knowProb } from "../game/classroom";
import type { LessonDef } from "./curriculum";

export interface LabCtx { body: HTMLElement; cfg?: string; partner: NpcDef | null; say(text: string, mine?: boolean): void; finish(score: number, total: number): void; hint(right: boolean, text: string): void }
type LabFn = (c: LabCtx) => (() => void) | void;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent?: HTMLElement, text?: string) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; parent?.appendChild(e); return e; }
const rnd = (a: number, b: number) => a + Math.random() * (b - a), ri = (a: number, b: number) => Math.floor(rnd(a, b + 1)), shuffle = <T,>(a: T[]) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = ri(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const btn = (p: HTMLElement, t: string, f: () => void, cls = "lbtn") => { const b = el("button", cls, p, t); b.type = "button"; b.onclick = f; return b; };

/* ---------------------------------------------------------------- generic: put in order / sort into groups */
export type Order = { kind: "order"; prompt: string; items: string[]; q?: { q: string; options: string[]; answer: number } };
export type Sort = { kind: "sort"; prompt: string; groups: Record<string, string[]> };
export const SETS: Record<string, Order | Sort> = {
  tortoise: { kind: "order", prompt: "Put the story in order.", items: ["The hare brags that he is the fastest.", "The tortoise accepts the race.", "The hare naps in the middle of the race.", "The tortoise keeps walking, never stopping.", "The tortoise crosses the finish line first."], q: { q: "Which theme do these events prove?", options: ["Slow and steady wins the race.", "Hares are fast.", "Races are fun."], answer: 0 } },
  watercycle: { kind: "order", prompt: "Order the water cycle.", items: ["Sun heats the ocean (evaporation)", "Water vapor rises and cools", "Vapor forms clouds (condensation)", "Rain or snow falls (precipitation)", "Water collects in rivers and returns to the sea"] },
  silkroad: { kind: "order", prompt: "Follow a silk caravan west.", items: ["Xi'an, China: silk is made", "Crossing the Taklamakan Desert", "Samarkand: traders swap goods", "Baghdad: markets and scholars", "Rome: silk reaches buyers"] },
  teaparty: { kind: "order", prompt: "Order the road to the Boston Tea Party.", items: ["Britain taxes tea with no colonial vote", "Colonists protest: 'No taxation without representation'", "Tea ships arrive in Boston harbor", "Colonists dump 342 chests of tea in the water", "Britain punishes Boston and tension grows"] },
  bill: { kind: "order", prompt: "How a bill becomes a law.", items: ["A member of Congress introduces a bill", "A committee studies and edits it", "The House and Senate both vote to pass it", "The President signs it", "It becomes a law"] },
  orchestra: { kind: "sort", prompt: "Sort the instruments into their families.", groups: { Strings: ["violin", "cello", "harp"], Woodwinds: ["flute", "clarinet", "oboe"], Brass: ["trumpet", "trombone", "tuba"], Percussion: ["drum", "xylophone", "cymbals"] } },
  figurative: { kind: "sort", prompt: "Which kind of figurative language is it?", groups: { Simile: ["Her smile was like sunshine", "He ran like the wind"], Metaphor: ["Time is a thief", "The classroom was a zoo"], Personification: ["The wind whispered through the trees", "The sun smiled down on us"] } },
  perspective: { kind: "sort", prompt: "Where do these belong in a perspective drawing?", groups: { "Foreground (big, detailed)": ["the girl on the path", "the fence post nearby"], "Middle ground": ["the red barn", "the row of trees"], "Background (small, pale)": ["the distant mountain", "tiny far-off hills"] } },
  "careers-find": { kind: "sort", prompt: "Interests, Skills or Values?", groups: { "Interests (what I enjoy)": ["Building with my hands", "Drawing and designing"], "Skills (what I can do)": ["Explaining ideas clearly", "Fixing things step by step"], "Values (what matters)": ["Helping other people", "Having a steady job"] } },
  "careers-build": { kind: "sort", prompt: "Which cluster does each job belong to?", groups: { Construction: ["Electrician", "Carpenter"], Manufacturing: ["Welder", "Machinist"], "Transportation and Logistics": ["Pilot", "Warehouse coordinator"] } },
  "careers-care": { kind: "sort", prompt: "Which cluster does each job belong to?", groups: { "Health Science": ["Nurse", "Dental hygienist"], "Education and Training": ["Teacher", "Librarian"], "Human Services": ["School counselor", "Social worker"] } },
  "careers-public": { kind: "sort", prompt: "Which cluster does each job belong to?", groups: { "Law and Public Safety": ["Firefighter", "Paralegal"], "Government": ["City planner", "Town clerk"] } },
  "careers-tech": { kind: "sort", prompt: "Information Technology or STEM?", groups: { "Information Technology": ["Web developer", "Network administrator"], STEM: ["Civil engineer", "Chemist"] } },
  "careers-biz": { kind: "sort", prompt: "Which cluster does each job belong to?", groups: { "Business Management": ["Office manager", "Entrepreneur"], Finance: ["Accountant", "Bank teller"], "Marketing and Sales": ["Ad designer", "Sales representative"] } },
  "careers-create": { kind: "sort", prompt: "Which cluster does each job belong to?", groups: { "Arts and Communications": ["Graphic designer", "Journalist"], "Hospitality and Tourism": ["Chef", "Hotel manager"] } },
  "careers-land": { kind: "sort", prompt: "Which group does each job belong to?", groups: { Agriculture: ["Farmer", "Veterinary technician"], "Natural Resources": ["Park ranger", "Forester"], "Food": ["Food scientist", "Baker"] } },
  "careers-plan": { kind: "order", prompt: "Put the career plan in order.", items: ["Explore your interests and strengths", "Research jobs and what they need", "Pick a training route", "Build a resume and practice interviews", "Apply, start, and keep growing"] },
  "careers-money": { kind: "sort", prompt: "Money in or money out?", groups: { "Pay (money in)": ["Hourly wage", "Bonus"], "Costs (money out)": ["Rent", "Taxes"] } },
  "life-money": { kind: "sort", prompt: "Needs, wants or savings?", groups: { Needs: ["Groceries", "Medicine"], Wants: ["Video game", "Designer sneakers"], Savings: ["Emergency fund", "Money set aside for a bike"] } },
  "life-budget": { kind: "sort", prompt: "Where does it belong in a 50/30/20 budget?", groups: { "Needs (about 50%)": ["Rent", "Groceries"], "Wants (about 30%)": ["Streaming service", "Eating out"], "Savings and debt (about 20%)": ["Emergency fund", "Paying off a loan"] } },
  "life-credit": { kind: "sort", prompt: "Safe habit or warning sign?", groups: { "Safe habit": ["Pay the full balance each month", "Check your credit report for free"], "Warning sign": ["Pay with gift cards to claim a prize", "Act now or lose the offer"] } },
  "life-home": { kind: "order", prompt: "Put the laundry steps in order.", items: ["Sort clothes by color and care label", "Load the machine and add detergent", "Run the wash", "Move wet clothes to the dryer or line", "Fold or hang them right away"] },
  "life-food": { kind: "sort", prompt: "Do or don't?", groups: { Do: ["Wash hands before cooking", "Use a separate board for raw meat"], "Don't": ["Leave leftovers out overnight", "Rinse raw chicken in the sink"] } },
  "life-health": { kind: "sort", prompt: "How much care does it need?", groups: { "Rest and home care": ["A mild cold", "Tired after a long day"], "See a doctor soon": ["A fever that lasts for days", "A cut that looks infected"], "Emergency: call 911": ["Trouble breathing", "Heavy bleeding that will not stop"] } },
  "life-mind": { kind: "sort", prompt: "Helpful or unhelpful?", groups: { Helpful: ["Take slow breaths", "Talk to a trusted adult"], Unhelpful: ["Bottle it all up", "Stay up all night worrying"] } },
  "life-safety": { kind: "order", prompt: "Put the emergency steps in order.", items: ["Make sure the area is safe", "Call emergency services if it is serious", "Give simple help you were taught", "Stay with the person until help arrives"] },
  "life-digital": { kind: "sort", prompt: "Strong habit or risky habit?", groups: { "Strong habit": ["A unique passphrase for each account", "Two-step sign-in"], "Risky habit": ["Same password everywhere", "Clicking a link from an unknown sender"] } },
  "life-people": { kind: "sort", prompt: "Respectful or not?", groups: { Respectful: ["Asking before borrowing", "Listening without interrupting"], "Not respectful": ["Reading someone's messages without asking", "Pressuring someone after they said no"] } },
  "life-time": { kind: "order", prompt: "Put the goal-setting steps in order.", items: ["Write the goal", "Break it into small steps", "Put the steps on a calendar", "Do the next step today", "Review and adjust each week"] },
  "life-adult": { kind: "sort", prompt: "Lock it up or carry it?", groups: { "Keep locked at home": ["Birth certificate", "Social Security card"], "Fine to carry": ["Photo ID", "Transit pass"] } },
  "life-travel": { kind: "order", prompt: "Plan a trip in order.", items: ["Pick where and when you need to be", "Check routes and travel time", "Leave early with a charged phone and fare", "Tell someone your plan", "Arrive and confirm the way home"] },
  "life-decide": { kind: "order", prompt: "Put the decision steps in order.", items: ["Name the problem", "List your options", "Weigh the good and bad of each", "Choose one and try it", "Check the result and learn"] },
  branches: { kind: "sort", prompt: "Which branch has this power?", groups: { "Legislative (makes laws)": ["Writes new laws", "Declares war"], "Executive (carries out laws)": ["Signs bills into law", "Commands the military"], "Judicial (explains laws)": ["Decides if a law is fair", "Hears court cases"] } },
};
const cardsort: LabFn = (c) => {
  const set = SETS[c.cfg ?? "tortoise"]; const wrap = el("div", "lcol", c.body); el("p", "lprompt", wrap, set.prompt); let right = 0, total = 0;
  if (set.kind === "order") {
    const slots = el("ol", "lslots", wrap), pool = el("div", "lpool", wrap); let next = 0; const done: HTMLElement[] = [];
    set.items.forEach((_, i) => { const li = el("li", "lslot", slots, `${i + 1}.`); done.push(li); });
    const finish = () => {
      if (set.q) { const q = el("div", "lquiz", wrap); el("p", "lprompt", q, set.q.q); shuffle(set.q.options.map((o, i) => ({ o, i }))).forEach(({ o, i }) => btn(q, o, () => { total++; if (i === set.q!.answer) right++; c.hint(i === set.q!.answer, "That theme is proven by the events in order."); c.finish(right, total); })); }
      else c.finish(right, total);
    };
    shuffle(set.items.map((t, i) => ({ t, i }))).forEach(({ t, i }) => { const b = btn(pool, t, () => { total++; if (i === next) { right++; done[next].textContent = `${next + 1}. ${t}`; done[next].classList.add("ok"); b.remove(); next++; if (next === set.items.length) finish(); else c.hint(true, "Yes, that's next."); } else { b.classList.add("bad"); setTimeout(() => b.classList.remove("bad"), 500); c.hint(false, "Think about what has to happen first."); } }, "lcard"); });
  } else {
    const groups = Object.keys(set.groups), bins = el("div", "lbins", wrap), items = shuffle(Object.entries(set.groups).flatMap(([g, l]) => l.map((t) => ({ t, g })))); let cur = 0; const card = el("div", "lbig", wrap);
    const show = () => { card.textContent = items[cur]?.t ?? ""; }; show();
    groups.forEach((g) => { const bin = el("div", "lbin", bins); el("b", "", bin, g); btn(bin, "Put here", () => { total++; if (items[cur].g === g) { right++; el("div", "lfill", bin, items[cur].t); c.hint(true, "That's it."); cur++; if (cur >= items.length) { card.textContent = "All sorted!"; c.finish(right, total); } else show(); } else { bin.classList.add("shake"); setTimeout(() => bin.classList.remove("shake"), 400); c.hint(false, "Look at the clue in the words."); } }); });
  }
};

/* ---------------------------------------------------------------- math */
const parabola: LabFn = (c) => {
  const a0 = [1, 2, -1, 0.5][ri(0, 3)], h0 = ri(-3, 3), k0 = ri(-2, 3), xs = [h0 - 2, h0 + 1, h0 + 3].map((x) => Math.max(-5, Math.min(5, x))), pts = [...new Set(xs)].map((x) => [x, a0 * (x - h0) ** 2 + k0]);
  const cv = el("canvas", "lcanvas", c.body) as HTMLCanvasElement; cv.width = 640; cv.height = 400; const g = cv.getContext("2d")!; const st = { a: 1, h: 0, k: 0 }; let hit = 0, solved = false, flight = 0;
  const ctl = el("div", "lctl", c.body); const row = (n: string, key: "a" | "h" | "k", min: number, max: number, step: number) => { const r = el("label", "", ctl, n + " "); const o = el("output", "", r); const i = el("input", "", r) as HTMLInputElement; i.type = "range"; i.min = String(min); i.max = String(max); i.step = String(step); i.value = String(st[key]); const f = () => { st[key] = +i.value; o.textContent = String(st[key]); flight = 0; }; i.oninput = f; o.textContent = String(st[key]); };
  row("a (width and flip)", "a", -3, 3, 0.5); row("h (slide left or right)", "h", -5, 5, 1); row("k (slide up or down)", "k", -4, 6, 1);
  const msg = el("p", "lmsg", c.body, "Make the curve y = a(x - h)² + k pass through every red target."); c.say(`Targets at ${pts.map((p) => `(${p[0]}, ${p[1]})`).join(", ")}.`);
  const X = (x: number) => 320 + x * 52, Y = (y: number) => 300 - y * 34; let raf = 0, last = performance.now();
  const frame = (now: number) => { const dt = (now - last) / 1000; last = now; flight = Math.min(1, flight + dt * 0.5);
    g.fillStyle = "#fdfaf1"; g.fillRect(0, 0, 640, 400); g.strokeStyle = "rgba(0,0,0,.08)"; for (let x = -6; x <= 6; x++) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), 400); g.stroke(); } for (let y = -6; y <= 9; y++) { g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(640, Y(y)); g.stroke(); }
    g.strokeStyle = "#4A3B3F"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(640, Y(0)); g.moveTo(X(0), 0); g.lineTo(X(0), 400); g.stroke();
    g.setLineDash([6, 5]); g.strokeStyle = "#4F91C7"; g.beginPath(); g.moveTo(X(st.h), 0); g.lineTo(X(st.h), 400); g.stroke(); g.setLineDash([]);
    g.strokeStyle = "#E07A66"; g.lineWidth = 4; g.beginPath(); let started = false; for (let px = -6; px <= -6 + 12 * flight; px += 0.05) { const y = st.a * (px - st.h) ** 2 + st.k; if (Math.abs(y) > 12) continue; if (!started) { g.moveTo(X(px), Y(y)); started = true; } else g.lineTo(X(px), Y(y)); } g.stroke();
    g.fillStyle = "#4F91C7"; g.beginPath(); g.arc(X(st.h), Y(st.k), 7, 0, 7); g.fill(); g.fillStyle = "#4A3B3F"; g.font = "bold 14px sans-serif"; g.fillText(`vertex (${st.h}, ${st.k})`, X(st.h) + 10, Y(st.k) - 10);
    hit = 0; for (const [x, y] of pts) { const on = Math.abs(st.a * (x - st.h) ** 2 + st.k - y) < 0.3; if (on) hit++; g.fillStyle = on ? "#5FAE6A" : "#D9564A"; g.beginPath(); g.arc(X(x), Y(y), 9, 0, 7); g.fill(); }
    if (hit === pts.length && flight >= 1 && !solved) { solved = true; msg.textContent = `Yes! y = ${a0}(x - ${h0})² + ${k0}. Vertex (${h0}, ${k0}).`; c.finish(1, 1); }
    raf = requestAnimationFrame(frame); }; raf = requestAnimationFrame(frame); return () => cancelAnimationFrame(raf);
};
const pizza: LabFn = (c) => {
  const total = 8, orders = [[1, 2], [3, 4], [1, 4], [3, 8], [5, 8]].map(([n, d]) => ({ n: n * (total / d), t: `${n}/${d}` })), rounds = shuffle(orders).slice(0, 4); let i = 0, right = 0; const sel = new Set<number>();
  const msg = el("p", "lprompt", c.body), cv = el("div", "lpizza", c.body), ctl = el("div", "lctl", c.body);
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "-110 -110 220 220"); svg.setAttribute("width", "240"); svg.setAttribute("height", "240"); cv.appendChild(svg); const slices: SVGElement[] = [];
  for (let s = 0; s < total; s++) { const a0 = (s / total) * Math.PI * 2 - Math.PI / 2, a1 = ((s + 1) / total) * Math.PI * 2 - Math.PI / 2, p = document.createElementNS(NS, "path"); p.setAttribute("d", `M0 0 L${Math.cos(a0) * 100} ${Math.sin(a0) * 100} A100 100 0 0 1 ${Math.cos(a1) * 100} ${Math.sin(a1) * 100} Z`); p.setAttribute("class", "lslice"); p.setAttribute("tabindex", "0"); p.setAttribute("role", "button"); p.setAttribute("aria-label", `slice ${s + 1}`);
    const tog = () => { sel.has(s) ? sel.delete(s) : sel.add(s); p.classList.toggle("on", sel.has(s)); }; p.addEventListener("click", tog); p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tog(); } }); svg.appendChild(p); slices.push(p); }
  const ask = () => { sel.clear(); slices.forEach((s) => s.classList.remove("on")); msg.textContent = `Customer ${i + 1}: "I'd like ${rounds[i].t} of the pizza, please."`; }; ask();
  btn(ctl, "Serve", () => { const ok = sel.size === rounds[i].n; if (ok) right++; c.hint(ok, ok ? `${rounds[i].t} of 8 slices is ${rounds[i].n} slices.` : `The pizza has 8 slices, so ${rounds[i].t} is ${rounds[i].n} slice${rounds[i].n > 1 ? "s" : ""}.`); i++; if (i >= rounds.length) c.finish(right, rounds.length); else ask(); });
};
const colormix: LabFn = (c) => {
  const rounds = [{ n: "orange", r: [1, 1, 0] }, { n: "green", r: [0, 1, 1] }, { n: "purple", r: [1, 0, 1] }], base: Record<string, number[]> = { red: [217, 64, 64], yellow: [247, 214, 70], blue: [64, 110, 214] }; let i = 0, right = 0;
  const msg = el("p", "lprompt", c.body), row = el("div", "lsw", c.body), tgt = el("div", "lswatch", row), mix = el("div", "lswatch", row), ctl = el("div", "lctl", c.body); const v = { red: 0, yellow: 0, blue: 0 } as Record<string, number>;
  const col = (r: number[]) => { const w = r.reduce((a, b) => a + b, 0) || 1, t = [0, 0, 0]; (["red", "yellow", "blue"] as const).forEach((k, j) => { for (let q = 0; q < 3; q++) t[q] += base[k][q] * r[j]; }); return t.map((x) => Math.round(x / w)); };
  const upd = () => { const arr = [v.red, v.yellow, v.blue]; mix.style.background = arr.some((x) => x) ? `rgb(${col(arr).join(",")})` : "#fff"; };
  (["red", "yellow", "blue"] as const).forEach((k) => { const l = el("label", "", ctl, k + " "), i2 = el("input", "", l) as HTMLInputElement; i2.type = "range"; i2.min = "0"; i2.max = "2"; i2.step = "1"; i2.value = "0"; i2.oninput = () => { v[k] = +i2.value; upd(); }; });
  const load = () => { msg.textContent = `Mix paint to make ${rounds[i].n}. Primaries are red, yellow and blue.`; tgt.style.background = `rgb(${col(rounds[i].r).join(",")})`; };
  load(); btn(ctl, "Check mix", () => { const R = rounds[i].r, vals = [v.red, v.yellow, v.blue], used = vals.filter((x) => x > 0), ok = vals.every((x, j) => (x > 0) === (R[j] > 0)) && used.every((x) => x === used[0]); if (ok) right++; c.hint(ok, ok ? `${rounds[i].n} is made from equal parts of two primaries.` : "Use equal parts of just the two primaries that make it."); i++; if (i >= rounds.length) c.finish(right, rounds.length); else { load(); } });
};

/* ---------------------------------------------------------------- music */
const beats: LabFn = (c) => {
  const cv = el("canvas", "lcanvas", c.body) as HTMLCanvasElement; cv.width = 640; cv.height = 260; const g = cv.getContext("2d")!; const bpm = 90, spb = 60 / bpm, N = 12; let t0 = performance.now() + 2000, hits = 0, raf = 0, pressed = new Set<number>(), flash = 0, done = false; const at = new Set<number>();
  el("p", "lmsg", c.body, "Tap the button or press Space when a note reaches the line. Keep the beat!");
  const tap = () => { const now = (performance.now() - t0) / 1000; const k = Math.round(now / spb); if (k >= 0 && k < N && !pressed.has(k) && Math.abs(now - k * spb) < 0.17) { pressed.add(k); hits++; flash = 1; try { const ctx = new AudioContext(), o = ctx.createOscillator(), gn = ctx.createGain(); o.frequency.value = 440 + (k % 4) * 110; gn.gain.value = 0.08; o.connect(gn); gn.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.12); } catch { /* no audio */ } } };
  const key = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); e.stopPropagation(); tap(); } }; addEventListener("keydown", key, true); btn(c.body, "Tap the beat", tap, "lbtn big"); void at;
  const frame = () => { const now = (performance.now() - t0) / 1000; g.fillStyle = "#2b3350"; g.fillRect(0, 0, 640, 260); g.fillStyle = "#EAB94E"; g.fillRect(120, 20, 6, 220);
    for (let k = 0; k < N; k++) { const x = 123 + (k * spb - now) * 190; if (x < -20 || x > 660) continue; const was = pressed.has(k); g.fillStyle = was ? "#5FAE6A" : "#F28F7E"; g.beginPath(); g.arc(x, 130, 22, 0, 7); g.fill(); }
    flash = Math.max(0, flash - 0.05); g.fillStyle = `rgba(255,255,255,${flash * 0.4})`; g.fillRect(0, 0, 640, 260); g.fillStyle = "#fff"; g.font = "bold 20px sans-serif"; g.fillText(`Hits ${hits} / ${N}`, 460, 40);
    if (!done && now > N * spb + 0.6) { done = true; c.finish(hits, N); } raf = requestAnimationFrame(frame); }; raf = requestAnimationFrame(frame); return () => { cancelAnimationFrame(raf); removeEventListener("keydown", key, true); };
};

/* ---------------------------------------------------------------- history / government */
const vote: LabFn = (c) => {
  const issues = [{ who: "a parent", q: "The playground is unsafe.", options: ["Repair the playground", "Build a parking lot"], answer: 0 }, { who: "a student", q: "The library closes too early.", options: ["Keep it open later", "Close it earlier"], answer: 0 }, { who: "a teacher", q: "Classrooms need new books.", options: ["Fund new books", "Cut the book budget"], answer: 0 }], tally = { Alex: 0, Sam: 0 }; let i = 0, right = 0;
  const msg = el("p", "lprompt", c.body, "You are a candidate. Voters ask for help. Their votes decide the election."), card = el("div", "lbig", c.body), opts = el("div", "lpool", c.body);
  const step = () => { if (i >= issues.length) { const win = tally.Alex >= 2 ? "You win" : "You lose by a vote"; card.textContent = `Votes: you ${tally.Alex}, opponent ${tally.Sam}. ${win}. In a democracy, the majority decides.`; opts.innerHTML = ""; c.finish(right, issues.length); return; } const I = issues[i]; card.textContent = `${I.who[0].toUpperCase() + I.who.slice(1)} says: "${I.q}"`; opts.innerHTML = ""; I.options.forEach((o, j) => btn(opts, o, () => { const ok = j === I.answer; if (ok) { right++; tally.Alex++; } else tally.Sam++; c.hint(ok, ok ? "Listening to voters earns votes." : "That voter will not be pleased."); i++; step(); }, "lcard")); }; step(); void msg;
};

/* ---------------------------------------------------------------- 3D labs */
interface Part { name: string; mesh: THREE.Object3D; info: string }
function viewer3d(c: LabCtx, build: (g: THREE.Group, add: (name: string, mesh: THREE.Object3D, info: string) => void) => void, prompts: string[], opts: { fov?: number; cam?: number } = {}) {
  const box = el("div", "l3d", c.body), r = new THREE.WebGLRenderer({ antialias: true }); r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); box.appendChild(r.domElement); const scene = new THREE.Scene(); scene.background = new THREE.Color("#EFE6D2");
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(3, 5, 4); scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c9a8, 2.2), sun); const cam = new THREE.PerspectiveCamera(opts.fov ?? 45, 1.6, 0.1, 50), grp = new THREE.Group(); scene.add(grp);
  const parts: Part[] = []; build(grp, (name, mesh, info) => { mesh.userData.part = name; parts.push({ name, mesh, info }); grp.add(mesh); });
  const prompt = el("p", "lprompt", c.body); let yaw = 0.5, pitch = 0.25, dist = opts.cam ?? 5, down = false, lx = 0, ly = 0, mv = 0, q = 0, right = 0; const label = el("div", "llabel", box); const order = shuffle(prompts.filter((p) => parts.some((q2) => q2.name === p)));
  const ask = () => { prompt.textContent = q < order.length ? `Click the ${order[q]}.` : "Done."; }; ask();
  const rc = new THREE.Raycaster(); const resize = () => { const w = box.clientWidth || 640, h = Math.round(w / 1.7); r.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); }; resize();
  const ptr = (e: PointerEvent) => { const b = r.domElement.getBoundingClientRect(); rc.setFromCamera(new THREE.Vector2(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1), cam); const hit = rc.intersectObjects(parts.map((p) => p.mesh), true)[0]; let o: THREE.Object3D | null = hit?.object ?? null; while (o && !o.userData.part) o = o.parent; return o ? parts.find((p) => p.name === o!.userData.part)! : null; };
  r.domElement.addEventListener("pointerdown", (e) => { down = true; lx = e.clientX; ly = e.clientY; mv = 0; r.domElement.setPointerCapture(e.pointerId); });
  r.domElement.addEventListener("pointermove", (e) => { if (down) { yaw -= (e.clientX - lx) * 0.01; pitch = Math.max(-0.2, Math.min(1.2, pitch + (e.clientY - ly) * 0.008)); mv += Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly); lx = e.clientX; ly = e.clientY; } else { const p = ptr(e); label.textContent = p ? p.name : ""; } });
  r.domElement.addEventListener("pointerup", (e) => { down = false; if (mv < 6) { const p = ptr(e); if (p) { label.textContent = `${p.name}: ${p.info}`; if (q < order.length) { const ok = p.name === order[q]; if (ok) { right++; q++; c.hint(true, p.info); } else c.hint(false, `That is the ${p.name}. ${p.info}`); if (q >= order.length) c.finish(right, order.length + (q - right)); else ask(); } } } });
  r.domElement.addEventListener("wheel", (e) => { e.preventDefault(); dist = Math.max(2.5, Math.min(9, dist * Math.exp(e.deltaY * 0.001))); }, { passive: false });
  let raf = 0, tt = 0; const frame = () => { tt += 0.016; if (!down) yaw += 0.003; cam.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist + 0.4, Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(0, 0.2, 0); r.render(scene, cam); raf = requestAnimationFrame(frame); }; raf = requestAnimationFrame(frame);
  addEventListener("resize", resize); return () => { cancelAnimationFrame(raf); r.dispose(); removeEventListener("resize", resize); };
}
const M = (c: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true, ...o });
const cell: LabFn = (c) => viewer3d(c, (g, add) => {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2.2), M("#8FC9A0", { transparent: true, opacity: 0.35 })); add("cell wall", wall, "The stiff outer layer that supports the plant cell.");
  const vac = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 14), M("#9ED0F0", { transparent: true, opacity: 0.75 })); vac.position.set(0.5, 0, 0); vac.scale.set(1.2, 1, 1); add("vacuole", vac, "Stores water. It keeps the cell firm.");
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), M("#B8A8DA")); nuc.position.set(-1.0, 0.35, 0.3); add("nucleus", nuc, "The control center. It holds the cell's instructions.");
  [[-0.8, -0.6, 0.5], [1.0, 0.6, 0.6], [0.1, -0.7, -0.6]].forEach(([x, y, z], i) => { const ch = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.28, 4, 10), M("#3FA05C")); ch.position.set(x, y, z); ch.rotation.z = 0.8 + i; add(i ? "chloroplast " + i : "chloroplast", ch, "Makes food from sunlight, water and carbon dioxide."); });
}, ["cell wall", "vacuole", "nucleus", "chloroplast"], { cam: 5.2 });
const pyramid: LabFn = (c) => viewer3d(c, (g, add) => {
  const sand = M("#E8C98A"); for (let i = 0; i < 6; i++) { const w = 3.4 - i * 0.55, b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, w), sand); b.position.y = -1 + i * 0.4; add(i === 5 ? "capstone" : i === 0 ? "base" : "stone layer " + i, b, i === 5 ? "The pointed top, once covered with gold." : i === 0 ? "A huge square base. Each side is almost equal." : "Blocks of limestone stacked in layers."); }
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), M("#6b4f3a")); ch.position.set(0, -0.7, 0); add("burial chamber", ch, "Where the pharaoh was laid to rest."); const sp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.2), M("#D6B876")); sp.position.set(0, -1.0, 2.7); add("sphinx", sp, "A guardian with a lion's body.");
}, ["capstone", "base", "burial chamber", "sphinx"], { cam: 6.4 });
const gravity: LabFn = (c) => {
  const cv = el("canvas", "lcanvas", c.body) as HTMLCanvasElement; cv.width = 640; cv.height = 360; const g = cv.getContext("2d")!; el("p", "lprompt", c.body, "Set the moon's distance, then press Launch. Closer orbits are faster. Land the moon in the green ring (speed matches).");
  const ctl = el("div", "lctl", c.body), lab = el("label", "", ctl, "Distance "), inp = el("input", "", lab) as HTMLInputElement; inp.type = "range"; inp.min = "60"; inp.max = "160"; inp.value = "110"; let ang = 0, raf = 0, trail: number[][] = [], target = ri(80, 140), tries = 0, good = false;
  el("p", "lmsg", c.body, `Challenge: get the moon to orbit at a distance of about ${target} (green ring).`);
  btn(ctl, "Check orbit", () => { tries++; const ok = Math.abs(+inp.value - target) < 8; good = ok; c.hint(ok, ok ? "Gravity pulls the moon into a stable path." : +inp.value < target ? "Too close. Gravity is stronger here." : "Too far. The pull is weaker."); if (ok) c.finish(1, tries); });
  const frame = () => { const d = +inp.value, w = 2.4e3 / Math.pow(d, 1.5) * 4; ang += w * 0.016 * 1; g.fillStyle = "#0f1530"; g.fillRect(0, 0, 640, 360); g.strokeStyle = "#5FAE6A"; g.lineWidth = 3; g.beginPath(); g.arc(320, 180, target, 0, 7); g.stroke(); g.strokeStyle = "rgba(255,255,255,.3)"; g.beginPath(); g.arc(320, 180, d, 0, 7); g.stroke(); g.fillStyle = "#4F91C7"; g.beginPath(); g.arc(320, 180, 24, 0, 7); g.fill(); g.fillStyle = good ? "#5FAE6A" : "#EDE2CF"; g.beginPath(); g.arc(320 + Math.cos(ang) * d, 180 + Math.sin(ang) * d * 0.9, 9, 0, 7); g.fill(); void trail; raf = requestAnimationFrame(frame); }; raf = requestAnimationFrame(frame); return () => cancelAnimationFrame(raf);
};
const photosynth: LabFn = (c) => {
  const cv = el("canvas", "lcanvas", c.body) as HTMLCanvasElement; cv.width = 640; cv.height = 320; const g = cv.getContext("2d")!; const v = { Sunlight: 1, Water: 1, "Carbon dioxide": 1 } as Record<string, number>; const ctl = el("div", "lctl", c.body);
  for (const k of Object.keys(v)) { const l = el("label", "", ctl, k + " "), i = el("input", "", l) as HTMLInputElement; i.type = "range"; i.min = "0"; i.max = "3"; i.step = "1"; i.value = "1"; i.oninput = () => { v[k] = +i.value; }; }
  const msg = el("p", "lmsg", c.body, "Plants need sunlight, water and carbon dioxide. Remove one and watch the sugar. Find which ingredient limits growth."); let raf = 0, sugar = 0, q = 0, right = 0; const qs = [["Which makes a plant stop making sugar entirely?", ["Sunlight (or any one missing)", "A slightly cooler room"], 0]] as const;
  const qd = el("div", "lpool", c.body); qs[0][1].forEach((o, j) => btn(qd, o, () => { q++; const ok = j === qs[0][2]; if (ok) right++; c.hint(ok, "Photosynthesis needs all three: light, water and carbon dioxide."); c.finish(right, 1); qd.remove(); }, "lcard")); void msg; void q;
  const frame = () => { const rate = Math.min(v.Sunlight, v.Water, v["Carbon dioxide"]); sugar = Math.min(100, sugar + rate * 0.15); g.fillStyle = "#E6F3FA"; g.fillRect(0, 0, 640, 320); g.fillStyle = "#6b4f3a"; g.fillRect(0, 270, 640, 50); g.strokeStyle = "#3FA05C"; g.lineWidth = 8; g.beginPath(); g.moveTo(320, 270); g.lineTo(320, 140); g.stroke(); for (let i = 0; i < 6; i++) { g.fillStyle = "#4FAE6B"; g.beginPath(); g.ellipse(320 + (i % 2 ? 40 : -40), 140 + i * 18, 34, 12, i % 2 ? 0.5 : -0.5, 0, 7); g.fill(); }
    g.fillStyle = "#F8D977"; g.beginPath(); g.arc(80, 70, 20 + v.Sunlight * 6, 0, 7); g.fill(); g.fillStyle = "#4F91C7"; for (let i = 0; i < v.Water * 4; i++) { g.beginPath(); g.arc(300 + (i % 3) * 14, 300 - i * 4, 4, 0, 7); g.fill(); } g.fillStyle = "#555"; g.font = "bold 16px sans-serif"; g.fillText(`CO2 x${v["Carbon dioxide"]}`, 480, 80); g.fillStyle = "#E07A66"; g.fillRect(500, 280 - sugar * 1.6, 90, sugar * 1.6); g.fillStyle = "#333"; g.fillText(`Sugar ${sugar | 0}`, 506, 300); raf = requestAnimationFrame(frame); }; raf = requestAnimationFrame(frame); return () => cancelAnimationFrame(raf);
};
const press: LabFn = (c) => {
  const word = "READ", wrap = el("div", "lcol", c.body), msg = el("p", "lprompt", wrap, "Copying by hand takes months. Set the type: click the letters to spell READ, then crank the press."), row = el("div", "lpool", wrap), plate = el("div", "lbig", wrap, "_ _ _ _"), out = el("div", "lmsg", wrap); let set = "", pages = 0, cranks = 0;
  const crank = btn(wrap, "Crank the press", () => { cranks++; pages = Math.floor(cranks / 1) ; out.textContent = `Pages printed: ${pages}. A scribe copies 1 page per day by hand.`; if (pages >= 20) { c.hint(true, "One press made hundreds of copies in a day."); c.finish(1, 1); crank.disabled = true; } }, "lbtn big"); crank.disabled = true;
  shuffle(word.split("")).forEach((ch) => { const b = btn(row, ch, () => { if (word[set.length] === ch) { set += ch; plate.textContent = set.split("").join(" ") + " " + "_ ".repeat(4 - set.length); b.disabled = true; if (set === word) { crank.disabled = false; msg.textContent = "Type is set. Crank the press to print copies!"; } } else c.hint(false, `Spell ${word} in order.`); }, "lcard"); });
};
export const LABS: Record<string, LabFn> = { parabola, pizza, cardsort, cell, photosynth, gravity, pyramid, press, vote, beats, colormix };

/* ---------------------------------------------------------------- the overlay: partner picker, bubble, result, memory */
export function openLab(host: HTMLElement, lesson: LessonDef, classmates: NpcDef[], onClose: () => void) {
  host.innerHTML = ""; host.classList.add("show"); const panel = el("div", "lpanel", host), head = el("div", "lhead", panel); el("h2", "", head, lesson.lab.title); const x = btn(head, "Close", () => close(), "lbtn"); const intro = el("p", "lintro", panel, lesson.lab.intro);
  const bar = el("div", "lpartner", panel), stage = el("div", "lstage", panel), bubble = el("div", "lbubble", panel), result = el("div", "lresult", panel); let partner: NpcDef | null = null, cleanup: (() => void) | void, started = false, ended = false;
  const close = () => { try { cleanup?.(); } catch { /* ignore */ } host.classList.remove("show"); host.innerHTML = ""; onClose(); }; void x;
  const say = (t: string, mine = false) => { bubble.textContent = (mine ? "You: " : partner ? partner.first + ": " : "") + t; bubble.classList.add("show"); setTimeout(() => bubble.classList.remove("show"), 4200); };
  const run = () => {
    if (started) return; started = true; bar.querySelectorAll("button").forEach((b) => ((b as HTMLButtonElement).disabled = true)); const ctx: LabCtx = { body: stage, cfg: lesson.lab.cfg, partner, say,
      hint: (right, text) => { if (!partner) { say(text); return; } const sm = Social.mem(partner.id), knows = Math.random() < knowProb(partner, lesson.subject); say(right ? (knows ? `Nice one! ${text}` : "Hey, that worked!") : (knows ? `Hmm, try again. ${text}` : "Hmm, I'm not sure either, let's think."), false); void sm; },
      finish: (score, total) => { if (ended) return; ended = true; const pct = total ? score / total : 1; result.innerHTML = ""; el("b", "", result, pct >= 0.99 ? "Perfect!" : pct >= 0.6 ? "Nice work!" : "Good try, give it another go."); el("span", "", result, ` ${score} of ${total}${partner ? ` with ${partner.first}` : ""}.`); btn(result, "Play again", () => openLab(host, lesson, classmates, onClose)); result.classList.add("show");
        Progress.recordScore(lesson.subject as any, score, total); Social.profile.stats.quizTotal += total ? 1 : 0; if (pct >= 0.6) Social.profile.stats.quizRight += 1; Social.save(); if (partner) Social.edit(partner.id, (m) => { m.met = true; m.fr = Math.min(100, m.fr + (pct >= 0.6 ? 4 : 2)); m.helped += pct >= 0.6 ? 1 : 0; m.topics.push("lab:" + lesson.lab.id); if (m.topics.length > 24) m.topics.shift(); }); } };
    cleanup = (LABS[lesson.lab.id] ?? cardsort)(ctx);
  };
  el("b", "", bar, "Work with:"); btn(bar, "Alone", () => { partner = null; run(); }, "lbtn");
  shuffle(classmates).slice(0, 3).forEach((d) => { const b = btn(bar, "", () => { partner = d; say("Let's do this together!"); run(); }, "lbtn partner"); const cv = el("canvas", "", b) as HTMLCanvasElement; cv.width = 60; cv.height = 76; drawPortrait(cv, d.look, 0, 0); el("span", "", b, `${d.first} (${d.role === "staff" ? d.title : "Grade " + d.grade})`); });
  addEventListener("keydown", function esc(e) { if (e.key === "Escape") { removeEventListener("keydown", esc); if (host.classList.contains("show")) close(); } });
  void intro;
}
