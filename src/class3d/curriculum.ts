/** Lessons: what goes on the boards, which pictures and videos the projector shows, which interactive 3D lab to try, and the answers to student questions. */
import type { Subject } from "../game/types";
import { FULL } from "./fulllessons";
export interface LabRef { id: string; cfg?: string; title: string; intro: string }
export interface LessonDef {
  id: string; subject: Subject; title: string; blurb: string; points: string[]; examples: string[]; pics: string[]; videos: string[]; lab: LabRef;
  intro: string; wrap: string; homework: string; glossary: Record<string, string>; whys: string[];
  /** extra (catch-up) lessons only: 0 = K-2, 1 = grades 3-5, 2 = grades 6-8 */ band?: number; extra?: boolean;
  /** curriculum packs: the teacher's script, the textbook section this lesson links to, an elective course name, grade range and the pack it came from */
  script?: import("./packs").ScriptStep[]; bookRef?: string; elective?: string; grades?: string; pack?: string;
}
const L = (l: LessonDef) => l;
/** one full lesson per class (see fulllessons.ts) */
export const CURRICULUM: Record<Subject, LessonDef[]> = { math: [...FULL.math], ela: [...FULL.ela], science: [...FULL.science], history: [...FULL.history], careers: [...FULL.careers], life: [...FULL.life] };
export const ALL_LESSONS: LessonDef[] = Object.values(CURRICULUM).flat();
export const lessonById = (subject: Subject, id?: string) => CURRICULUM[subject].find((l) => l.id === id) ?? CURRICULUM[subject][0];
/** pick the day's lesson for a subject: rotates through the list by calendar day */
export const todaysLesson = (subject: Subject) => { const list = CURRICULUM[subject], d = Math.floor(Date.now() / 864e5); return list[d % list.length]; };
export function explainLesson(lesson: LessonDef, text: string, rot = 0): string | null {
  const t = text.toLowerCase();
  for (const [k, v] of Object.entries(lesson.glossary)) if (t.includes(k)) return v;
  if (/\b(again|repeat|confus|lost|don'?t (get|understand)|slow)\b/.test(t)) return `Let's go step by step. ${lesson.points[rot % lesson.points.length]}.`;
  if (/\b(example|show me|for instance)\b/.test(t)) return lesson.examples[rot % lesson.examples.length];
  if (/\b(why|how come|reason)\b/.test(t)) return lesson.whys[rot % lesson.whys.length];
  if (/\b(homework|assignment|due)\b/.test(t)) return `For homework: ${lesson.homework}`;
  if (/\b(video|clip|movie)\b/.test(t)) return "We'll watch the clip on the projector. I'll point out the key parts as it plays.";
  if (/\b(test|quiz|exam)\b/.test(t)) return "There may be a quick quiz soon. Review the points on the board and you'll be ready.";
  if (/\b(thanks|thank you)\b/.test(t)) return "You're welcome! Great job asking.";
  return null;
}
