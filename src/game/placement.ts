/** New-student assessment: finds a student's age and grade band, then a level in each core subject by adaptive questions
 *  (start at the age's band, step up after a pass, step down after a miss). The result picks a starting point for EXTRA lessons
 *  that run beside regular classes, so nobody misses class to catch up. Off by default for demo runs. */
import { Progress, type Assessment, type Subject, SUBJECT_NAME, dayKey } from "./progress";
import { makeMath } from "../hall3d/quizbank";
import { CATCHUP, BAND_LABEL } from "../class3d/catchup";
import type { LessonDef } from "../class3d/curriculum";

export const CORE: Subject[] = ["math", "ela", "science", "history"];
export const bandForAge = (age: number) => (age <= 7 ? 0 : age <= 10 ? 1 : age <= 13 ? 2 : 3);
const AGE_FOR_BAND = ["k2", "g35", "g68", "hs"] as const;
type Q = { q: string; options: string[]; answer: number };
type P = [string, string, string[]];
const sh = <T,>(a: T[]) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mk = (p: P): Q => { const o = sh([p[1], ...p[2]]); return { q: p[0], options: o, answer: o.indexOf(p[1]) }; };
const BANK: Record<string, P[][]> = {
  ela: [
    [["Which word rhymes with 'cat'?", "hat", ["dog", "cup"]], ["What letter does 'ball' start with?", "b", ["d", "p"]], ["Which is a complete sentence?", "The dog ran.", ["The big", "Ran fast"]], ["Which word is the opposite of 'up'?", "down", ["over", "tall"]]],
    [["Which word is a verb?", "jump", ["happy", "table"]], ["What mark ends a question?", "?", [".", "!"]], ["In 'The red ball rolled', which word is an adjective?", "red", ["ball", "rolled"]], ["The main idea of a paragraph is...", "what it is mostly about", ["its first word", "its longest sentence"]]],
    [["A word that means the same as 'big' is a...", "synonym", ["antonym", "homophone"]], ["'Time is a thief' is a...", "metaphor", ["simile", "rhyme"]], ["The prefix 'un-' in 'unhappy' means...", "not", ["again", "before"]], ["Which sentence states a fact?", "Water freezes at 0 C.", ["Winter is the best season.", "Ice is boring."]]],
    [["A theme is...", "the central message of a work", ["the main character", "the setting"]], ["Foreshadowing is...", "hints about later events", ["a flashback", "a rhyme scheme"]], ["Which is a primary source?", "a diary written at the time", ["a textbook", "a movie about it"]], ["An allusion is...", "a reference to a well-known person, event or work", ["a type of rhyme", "a long speech"]]],
  ],
  science: [
    [["Which is living?", "a tree", ["a rock", "a chair"]], ["What do plants need to grow?", "sunlight and water", ["candy", "darkness"]], ["Which season is usually coldest?", "winter", ["summer", "spring"]], ["Which animal can fly?", "a bird", ["a fish", "a dog"]]],
    [["Ice is which state of matter?", "solid", ["liquid", "gas"]], ["Animals with fur that feed babies milk are...", "mammals", ["reptiles", "insects"]], ["What is at the center of our solar system?", "the Sun", ["the Moon", "Earth"]], ["Which plant part takes in water?", "roots", ["flowers", "petals"]]],
    [["Which gas do plants take in for photosynthesis?", "carbon dioxide", ["oxygen", "helium"]], ["What is the unit of force?", "newton", ["joule", "watt"]], ["Which part of the cell makes most of its energy?", "mitochondria", ["cell wall", "nucleus"]], ["Which is a chemical change?", "burning wood", ["melting ice", "cutting paper"]]],
    [["DNA stands for...", "deoxyribonucleic acid", ["dynamic nuclear acid", "double nitrogen atom"]], ["Which law says every action has an equal and opposite reaction?", "Newton's third law", ["the law of gravity", "Ohm's law"]], ["What is the pH of a neutral solution?", "7", ["0", "14"]], ["Which particle has a negative charge?", "electron", ["proton", "neutron"]]],
  ],
  history: [
    [["Who helps keep us safe in a fire?", "a firefighter", ["a baker", "a painter"]], ["A picture of a place from above is a...", "map", ["song", "recipe"]], ["Which is a good school rule?", "raise your hand to speak", ["run in the halls", "shout in class"]], ["A flag is a symbol of...", "a country", ["a snack", "a game"]]],
    [["Who was the first U.S. president?", "George Washington", ["Abraham Lincoln", "Thomas Edison"]], ["How many continents are there?", "7", ["5", "10"]], ["People who travel to explore new lands are...", "explorers", ["teachers", "farmers"]], ["Which ocean is the largest?", "Pacific", ["Atlantic", "Arctic"]]],
    [["The pyramids of Egypt were built as...", "tombs for pharaohs", ["markets", "schools"]], ["The Declaration of Independence was signed in...", "1776", ["1492", "1865"]], ["The Roman Republic was ruled by...", "elected leaders and a Senate", ["one pharaoh", "the Vikings"]], ["The Silk Road was a network for...", "trade between Asia and Europe", ["sailing to America", "building pyramids"]]],
    [["How many branches does the U.S. government have?", "3", ["2", "5"]], ["The Industrial Revolution mainly changed...", "how goods were made", ["the calendar", "the alphabet"]], ["The Magna Carta limited...", "the power of the king", ["trade", "farming"]], ["'Checks and balances' means...", "each branch limits the others", ["one branch rules", "voting every year"]]],
  ],
};
const askFor = (subject: Subject, band: number, used: Set<string>): Q => {
  if (subject === "math") { for (let i = 0; i < 20; i++) { const q = makeMath(AGE_FOR_BAND[band], Math.random); if (!used.has(q.q)) return { q: q.q, options: q.options, answer: q.answer }; } const q = makeMath(AGE_FOR_BAND[band], Math.random); return { q: q.q, options: q.options, answer: q.answer }; }
  const all = BANK[subject][band], pool = all.filter((p) => !used.has(p[0])); const list = pool.length ? pool : all; return mk(list[Math.floor(Math.random() * list.length)]);
};
export const Placement = {
  /** this student's extra-lesson plan for a class: bands from their level up to just below their grade band; regular lessons are untouched */
  plan(subject: Subject): { lessons: LessonDef[]; remaining: LessonDef[]; next: LessonDef | null; level: number; expected: number } | null {
    const a = Progress.assessment(); if (!a || a.levels[subject] === undefined) return null;
    const level = a.levels[subject]!, expected = a.band, done = Progress.extraDone(subject), lessons: LessonDef[] = [];
    for (let b = level; b < Math.min(expected, 3); b++) lessons.push(...CATCHUP.filter((l) => l.subject === subject && l.band === b));
    const remaining = lessons.filter((l) => !done.includes(l.id)); return { lessons, remaining, next: remaining[0] ?? null, level, expected };
  },
};
const CSS = `.plWrap{position:fixed;inset:0;z-index:80;background:rgba(40,30,30,.6);display:flex;align-items:center;justify-content:center;padding:12px}
.plBox{background:#F3E7CF;border-radius:18px;max-width:620px;width:100%;max-height:92vh;overflow:auto;padding:18px 22px;font:16px/1.4 'Fredoka','Trebuchet MS',system-ui,sans-serif;color:#4A3B3F;box-shadow:0 3px 0 #C9B28A,0 14px 34px rgba(60,40,30,.5);border:1px solid rgba(255,255,255,.8)}
.plBox h2{font-size:22px;font-weight:600;margin-bottom:6px}.plBox p{margin:8px 0}.plBox small{color:#8A7A70}
.plBtn{font:inherit;font-size:16px;color:#4A3B3F;background:#FFF9F0;border:1px solid rgba(255,255,255,.8);border-radius:10px;padding:9px 14px;cursor:pointer;box-shadow:0 2px 0 #C9B28A;margin:4px 4px 4px 0;min-height:40px;text-align:left}
.plBtn:active{transform:translateY(2px);box-shadow:none}.plBtn.go{background:#E07A66;color:#fff}.plBtn.q{display:block;width:100%}.plBtn.dim{background:#EADFCB}.plAges{display:flex;flex-wrap:wrap}.plAges .plBtn{min-width:56px;text-align:center}
.plBar{height:8px;border-radius:5px;background:rgba(74,59,63,.15);overflow:hidden;margin:8px 0}.plBar i{display:block;height:100%;background:#E07A66}
.plTab{width:100%;border-collapse:collapse;margin:8px 0;font-size:15px}.plTab td,.plTab th{padding:6px 8px;border-top:1px solid #D9C9A8;text-align:left}.plTab th{font-size:12px;color:#8A7A70;text-transform:uppercase}.plChip{display:inline-block;border-radius:8px;padding:1px 8px;font-size:13px}`;
/** show the assessment; resolves with the saved result, or null if the student skipped */
export function runPlacement(): Promise<Assessment | null> {
  return new Promise((done) => {
    if (!document.getElementById("plCss")) { const st = document.createElement("style"); st.id = "plCss"; st.textContent = CSS; document.head.appendChild(st); }
    const wrap = document.createElement("div"); wrap.className = "plWrap"; const box = document.createElement("div"); box.className = "plBox"; wrap.appendChild(box); document.body.appendChild(wrap);
    const close = (r: Assessment | null) => { wrap.remove(); done(r); };
    const btn = (label: string, f: () => void, cls = "") => { const b = document.createElement("button"); b.className = "plBtn " + cls; b.textContent = label; b.onclick = f; box.appendChild(b); return b; };
    const head = (t: string) => { box.innerHTML = `<h2>${t}</h2>`; };
    const levels: Partial<Record<Subject, number>> = {};
    const welcome = () => { head("Welcome! Let's find your starting point"); box.insertAdjacentHTML("beforeend", `<p>A few quick questions in math, reading, science and history show where you are. There are no grades and you will not lose anything.</p><p>Your regular classes always stay the same. If there is something to catch up on, you get <b>extra lessons</b> beside your classes.</p><small>About 10 minutes. You can skip any subject.</small><br><br>`); btn("Start", askAge, "go"); btn("Skip for now", () => close(null), "dim"); };
    const askAge = () => { head("How old are you?"); const row = document.createElement("div"); row.className = "plAges"; box.appendChild(row); const one = (n: number, lab: string) => { const b = document.createElement("button"); b.className = "plBtn"; b.textContent = lab; b.onclick = () => { void subjectLoop(n, 0); }; row.appendChild(b); }; for (let n = 5; n <= 18; n++) one(n, String(n)); one(19, "19+"); box.insertAdjacentHTML("beforeend", "<p><small>This sets the grade band your regular classes use: K-2, 3-5, 6-8 or high school.</small></p>"); };
    const round = (subject: Subject, band: number, used: Set<string>, nth: number, total: number): Promise<boolean | "stop"> => new Promise((res) => {
      let right = 0, n = 0; const step = () => {
        if (n >= 3) return res(right >= 2);
        const q = askFor(subject, band, used); used.add(q.q); head(SUBJECT_NAME[subject]); box.insertAdjacentHTML("beforeend", `<div class="plBar"><i style="width:${Math.round(((nth + n / 3) / total) * 100)}%"></i></div><p><small>Question ${n + 1} of 3 in this step</small></p><p><b>${q.q}</b></p>`);
        q.options.forEach((o, i) => btn(o, () => { if (i === q.answer) right++; n++; step(); }, "q")); btn("I don't know", () => { n++; step(); }, "q dim"); btn("Skip this subject", () => res("stop"), "dim");
      }; step();
    });
    const subjectLoop = async (ageN: number, si: number): Promise<void> => {
      if (si >= CORE.length) return results(ageN);
      const subject = CORE[si], used = new Set<string>(), total = CORE.length; let b = bandForAge(ageN), level = -1, rounds = 0;
      const r0 = await round(subject, b, used, si, total); if (r0 === "stop") return subjectLoop(ageN, si + 1);
      if (r0) { level = b; while (b < 3 && rounds++ < 2) { const up = await round(subject, b + 1, used, si, total); if (up === "stop" || !up) break; b++; level = b; } }
      else { while (b > 0 && level < 0 && rounds++ < 3) { b--; const dn = await round(subject, b, used, si, total); if (dn === "stop") break; if (dn) level = b; } if (level < 0) level = 0; }
      levels[subject] = level; return subjectLoop(ageN, si + 1);
    };
    const results = (ageN: number) => {
      const a: Assessment = { date: dayKey(), age: ageN, band: bandForAge(ageN), levels }; Progress.saveAssessment(a);
      head("Your starting point"); box.insertAdjacentHTML("beforeend", `<p>Age ${ageN === 19 ? "19+" : ageN}: your regular classes use <b>${BAND_LABEL[a.band]}</b> work.</p><table class="plTab"><tr><th>Subject</th><th>You are working at</th><th>Plan</th></tr>${CORE.map((s) => { const lv = levels[s]; if (lv === undefined) return `<tr><td>${SUBJECT_NAME[s]}</td><td>not tested</td><td>regular class only</td></tr>`; const pl = Placement.plan(s), gap = a.band - lv; const chip = gap <= 0 ? `<span class="plChip" style="background:#D6ECD6">${gap < 0 ? "ahead" : "on level"}</span>` : `<span class="plChip" style="background:#FBE3B5">${pl?.lessons.length ?? 0} extra lessons</span>`; return `<tr><td>${SUBJECT_NAME[s]}</td><td>${BAND_LABEL[lv]}</td><td>${chip}</td></tr>`; }).join("")}</table><p><small>Extra lessons are in each classroom's More menu and on the class times board. Regular classes keep going as usual.</small></p>`);
      btn("Start my plan", () => close(a), "go");
    };
    welcome();
  });
}
