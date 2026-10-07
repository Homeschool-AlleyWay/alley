/** Wall pictures: the hallway and classroom walls show the same real diagrams as the projector (PICS), chosen to match the lesson being taught.
 *  Tapping a picture opens a big, animated version with an explanation that is true and kid-friendly. */
import { PICS, PIC_BY_ID, PW, PH } from "../class3d/pics";

export const PIC_NOTES: Record<string, string> = {
  parabola: "A parabola is the U-shaped curve you get from y = x². The turning point is the vertex, and the axis of symmetry splits the curve into two mirror-image halves.",
  "plant-cell": "A plant cell has a cell wall for support, chloroplasts that capture sunlight, a big vacuole that stores water, a nucleus that holds DNA, and mitochondria that release energy.",
  "silk-map": "The Silk Road was a network of trade routes joining China to the Mediterranean for over 1,500 years. Silk, paper, spices and ideas travelled along it, usually passed from trader to trader.",
  timeline: "A timeline puts events in order so you can see what came before and after. Looking at the order helps you spot causes and effects.",
  branches: "The U.S. government has three branches. Congress makes laws, the President carries them out, and the courts decide what the laws mean. Each branch can check the others.",
  staff: "Music is written on a staff of five lines. Where a note sits shows how high or low it sounds, and its shape shows how long it lasts.",
  "color-wheel": "Red, yellow and blue are the primary colors. Mixing two primaries makes a secondary color: orange, green or purple.",
  "water-cycle": "Water evaporates from oceans and lakes, rises and cools into clouds (condensation), falls as rain or snow (precipitation), and flows back toward the sea.",
  simile: "A simile compares two things using 'like' or 'as'. A metaphor says one thing IS another. Both help readers picture an idea.",
  fractions: "A fraction names equal parts of a whole. The bottom number tells how many equal parts there are; the top number tells how many you have.",
  pyramid: "Egyptian pyramids were tombs for pharaohs. The Great Pyramid was built from over two million stone blocks, with passages that lead to the burial chamber.",
  press: "Around 1450 Johannes Gutenberg used movable metal letters in a printing press. Books could be copied quickly, and ideas spread across Europe.",
  photosynthesis: "Plants make their own food. Using sunlight, they turn carbon dioxide and water into sugar and release oxygen: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂.",
  organizer: "To find a theme, ask what happens, what changes, and what evidence shows it. Then write the message as a full sentence.",
  "bill-flow": "A bill becomes a law when the House and the Senate both pass it and the President signs it. Congress can override a veto with enough votes.",
  orbit: "Gravity pulls objects toward each other. A moon stays in orbit because its sideways speed keeps it falling around the planet instead of into it.",
  "pizza-fraction": "Equivalent fractions name the same amount. 4/8 and 1/2 cover exactly the same part of the whole, just cut into different numbers of pieces.",
  "career-clusters": "The 16 career clusters group jobs by interest, such as health science, information technology or arts and media. Each cluster holds many different jobs.",
  "career-path": "A career path often goes explore, research, train, build a resume, then apply and keep growing. You can take any of these steps at any age.",
  "pay-paths": "Different routes take different amounts of training, from a few months for a certificate to several years for a degree. Compare time and cost before you choose.",
  "life-wheel": "Becoming independent means learning many skills: money, home, food, health, mind, safety, people and time. Nobody learns them all at once.",
  "budget-split": "A simple budget splits income into about 50% needs, 30% wants and 20% savings and debt repayment. Adjust the numbers to fit your life.",
  "first-aid": "In an emergency, stay safe, call 911 (in the U.S.), help only in ways you know are safe, and stay until help arrives. Say where you are first.",
};
export const picNote = (id: string) => PIC_NOTES[id] ?? "";
export const picTitle = (id: string) => PIC_BY_ID[id]?.title ?? id;

/** subjects' default pictures when a lesson lists none */
export const SUBJECT_PICS: Record<string, string[]> = {
  math: ["parabola", "fractions", "pizza-fraction", "budget-split"], ela: ["simile", "organizer", "staff", "color-wheel"], science: ["plant-cell", "photosynthesis", "water-cycle", "orbit"],
  history: ["timeline", "silk-map", "branches", "press"], careers: ["career-clusters", "career-path", "pay-paths", "life-wheel"], life: ["life-wheel", "budget-split", "first-aid", "career-path"],
};
/** up to n pictures for a lesson: its own first, then the subject's, no repeats */
export function picsFor(subject: string, lessonPics: string[], n = 4): string[] {
  const out: string[] = []; for (const id of [...lessonPics, ...(SUBJECT_PICS[subject] ?? []), ...PICS.map((p) => p.id)]) { if (PIC_BY_ID[id] && !out.includes(id)) out.push(id); if (out.length >= n) break; } return out;
}
/** the finished (fully revealed) picture on a canvas, for wall textures */
export function drawPicFinal(id: string, cv?: HTMLCanvasElement): HTMLCanvasElement {
  const c = cv ?? document.createElement("canvas"); c.width = PW; c.height = PH; const p = PIC_BY_ID[id]; if (p) p.draw(c.getContext("2d")!, 99); return c;
}

/* ---------------- the viewer ---------------- */
const CSS = `
.pv{position:fixed;inset:0;z-index:74;display:none;background:rgba(40,30,30,.6);align-items:center;justify-content:center;font-family:var(--ui,"Fredoka","Trebuchet MS",system-ui,sans-serif);color:var(--ink,#4A3B3F)}.pv.show{display:flex}
.pv-p{width:min(780px,96vw);max-height:94vh;overflow:auto;background:var(--kraft,#F3E7CF);border:1px solid rgba(255,255,255,.75);border-radius:16px;box-shadow:0 3px 0 var(--edge,#C9B28A),0 14px 34px rgba(60,40,30,.45);padding:12px;display:flex;flex-direction:column;gap:8px;box-sizing:border-box}
.pv-p canvas{width:100%;aspect-ratio:16/9;border-radius:12px;border:2px solid var(--edge,#C9B28A);background:#fff}.pv-p h2{margin:0;font-size:20px;font-weight:600;flex:1}.pv-p p{margin:0;font-size:16px;line-height:1.45}.pv-h{display:flex;align-items:center;gap:8px}
.pv-b{font:inherit;font-size:14px;padding:6px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.8);background:#FFF9F0;color:inherit;cursor:pointer;box-shadow:0 2px 0 var(--edge,#C9B28A);min-height:36px}.pv-sm{font-size:13px;color:var(--soft,#8A7A70)}
`;
let root: HTMLElement | null = null, raf = 0, styled = false;
export function openPic(id: string, ctx: { lesson?: string; onClose?: () => void } = {}) {
  const p = PIC_BY_ID[id]; if (!p) return;
  if (!styled) { styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }
  if (!root) { root = document.createElement("div"); root.className = "pv"; document.body.appendChild(root); }
  const R = root; R.innerHTML = ""; R.classList.add("show"); const P = document.createElement("div"); P.className = "pv-p"; R.appendChild(P);
  const h = document.createElement("div"); h.className = "pv-h"; const t = document.createElement("h2"); t.textContent = p.title; const x = document.createElement("button"); x.className = "pv-b"; x.textContent = "Close"; h.append(t, x); P.appendChild(h);
  const cv = document.createElement("canvas"); cv.width = PW; cv.height = PH; P.appendChild(cv); const note = document.createElement("p"); note.textContent = picNote(id); P.appendChild(note);
  if (ctx.lesson) { const l = document.createElement("div"); l.className = "pv-sm"; l.textContent = `From the lesson: ${ctx.lesson}`; P.appendChild(l); }
  const rep = document.createElement("button"); rep.className = "pv-b"; rep.textContent = "Watch it build again"; rep.style.alignSelf = "flex-start"; P.appendChild(rep);
  const c = cv.getContext("2d")!; let t0 = performance.now(); const loop = () => { if (!R.classList.contains("show")) return; p.draw(c, (performance.now() - t0) / 1000); raf = requestAnimationFrame(loop); }; loop(); rep.onclick = () => { t0 = performance.now(); };
  const close = () => { R.classList.remove("show"); cancelAnimationFrame(raf); document.removeEventListener("keydown", esc, true); ctx.onClose?.(); }; const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
  x.onclick = close; R.onclick = (e) => { if (e.target === R) close(); }; document.addEventListener("keydown", esc, true); x.focus();
}
