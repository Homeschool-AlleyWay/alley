/** The morning assembly: the principals welcome everyone, lead the Pledge of Allegiance and (optionally) the Lord's Prayer, then read the day's announcements.
 *  Voices stay consistent (one per principal) and the mouths move while they speak. */
import type { Auditorium3D, Who } from "./Auditorium3D";
import { PRINCIPALS } from "./Auditorium3D";
import { ALL_SUBJECTS, SUBJECT_NAME, Progress, clock12 } from "../game/progress";
import { newsItems } from "../game/newstv";

const FEM = /(female|zira|samantha|karen|victoria|susan|hazel|aria|jenny|linda|moira|tessa|fiona|allison|ava|serena|catherine|kate|emma|joanna|salli|kendra|kimberly|ivy|libby|sonia)/i;
const MAL = /(\bmale\b|david|mark|daniel|alex|fred|george|guy|ryan|james|tom|oliver|arthur|aaron|matthew|joey|justin|brian|eric|gordon|thomas|rishi)/i;
const synth: SpeechSynthesis | null = (() => { try { return window.speechSynthesis ?? null; } catch { return null; } })();
const voices = () => { try { return (synth?.getVoices() ?? []).filter((v) => /^en/i.test(v.lang)); } catch { return []; } };
const voiceFor = (who: Who) => { const vs = voices(); if (!vs.length) return null; const want = who === "ayrissa" ? (v: SpeechSynthesisVoice) => FEM.test(v.name) && !MAL.test(v.name) : (v: SpeechSynthesisVoice) => MAL.test(v.name) && !FEM.test(v.name); return vs.find(want) ?? vs[who === "ayrissa" ? 0 : Math.min(1, vs.length - 1)]; };
export const prayerOn = () => { try { return localStorage.getItem("unify.assembly.prayer") !== "0"; } catch { return true; } };
export const setPrayer = (on: boolean) => { try { localStorage.setItem("unify.assembly.prayer", on ? "1" : "0"); } catch { /* private mode */ } };
export const assemblyDay = () => { try { return localStorage.getItem("unify.assembly.day"); } catch { return null; } };
export const markAssemblyDone = () => { try { localStorage.setItem("unify.assembly.day", new Date().toDateString()); } catch { /* private mode */ } };

export interface Ctx { A: Auditorium3D; caption: (name: string, text: string) => void; soundOn: () => boolean; cancelled: () => boolean }
export const say = (cx: Ctx, who: Who | "both", text: string, opts: { gesture?: number; speaker?: Who; name?: string } = {}) => new Promise<void>((done) => {
  const A = cx.A, sp = opts.speaker ?? (who === "both" ? "ayrissa" : who), nm = opts.name ?? (who === "both" ? "Principals Ayrissa and Marcus Canty" : PRINCIPALS[who].name);
  A.speaking = who; A.gesture = null; if (opts.gesture != null) { A.gesture = sp; A.gestureFrame = opts.gesture; } cx.caption(nm, text);
  const ms = Math.max(2000, text.length * 58), finish = () => { if (fin) return; fin = true; clearTimeout(tm); A.speaking = null; A.gesture = null; setTimeout(done, 280); }; let fin = false; const tm = setTimeout(finish, ms + 4000);
  if (cx.soundOn() && synth) { try { const u = new SpeechSynthesisUtterance(text), v = voiceFor(sp); if (v) u.voice = v; u.pitch = sp === "ayrissa" ? 1.08 : 0.82; u.rate = who === "both" ? 0.88 : 0.97; u.onend = u.onerror = finish; synth.speak(u); const stuck = setTimeout(() => { if (!synth.speaking) { /* blocked: fall back to the timer */ setTimeout(finish, ms); } }, 700); void stuck; return; } catch { /* fall through */ } }
  setTimeout(finish, ms);
});
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function runAssembly(cx: Ctx): Promise<boolean> {
  const A = cx.A, ok = () => !cx.cancelled();
  A.setScreen("assembly", "Good morning, UNIFY Academy", ["Morning assembly"]); A.curtains(true); A.walkOn(); await wait(4200); if (!ok()) return false;
  await say(cx, "marcus", "Good morning, UNIFY Academy! Welcome to morning assembly.", { gesture: 3 }); if (!ok()) return false;
  await say(cx, "ayrissa", "Thank you, everyone, for being here. Today we start the way we always do, together.", { gesture: 7 }); if (!ok()) return false;
  A.setScreen("assembly", "The Pledge of Allegiance", ["Please rise and face the flag", "Right hand over your heart"]);
  await say(cx, "ayrissa", "Please rise, face the flag, and place your right hand over your heart.", { gesture: 6 }); if (!ok()) return false;
  A.standing = true; await wait(900);
  const pledge = ["I pledge allegiance to the Flag of the United States of America,", "and to the Republic for which it stands,", "one Nation under God, indivisible,", "with liberty and justice for all."];
  for (const l of pledge) { A.setScreen("assembly", "The Pledge of Allegiance", [l]); await say(cx, "both", l); if (!ok()) return false; }
  A.standing = false; await wait(600);
  if (prayerOn()) {
    A.setScreen("assembly", "A moment of prayer", ["Please bow your heads"]);
    await say(cx, "marcus", "Please remain respectful, and bow your heads for a moment of prayer. Thank you for joining us.", { gesture: 7 }); if (!ok()) return false;
    A.standing = true; A.bowing = true; await wait(700);
    const prayer = ["Our Father, who art in heaven, hallowed be thy name;", "thy kingdom come, thy will be done, on earth as it is in heaven.", "Give us this day our daily bread,", "and forgive us our trespasses, as we forgive those who trespass against us;", "and lead us not into temptation, but deliver us from evil.", "For thine is the kingdom, and the power, and the glory, forever. Amen."];
    for (const l of prayer) { A.setScreen("assembly", "The Lord's Prayer", [l]); await say(cx, "both", l); if (!ok()) return false; }
    A.bowing = false; A.standing = false; await wait(500);
  }
  const lines: string[] = []; for (const s of ALL_SUBJECTS) { const m = Progress.pickedFor(s, false); if (m !== null) lines.push(`${SUBJECT_NAME[s]} at ${clock12(m)}`); }
  A.setScreen("assembly", "Today at UNIFY", lines.length ? lines : ["Pick your class times on the bulletin board by the front door"]);
  await say(cx, "marcus", lines.length ? `Here is today's schedule for our scholars. ${lines.join(". ")}.` : "Please remember to pick your class times on the bulletin board by the front door.", { gesture: 6 }); if (!ok()) return false;
  { let od: any[] = []; try { const l = JSON.parse(localStorage.getItem("unify.opendoor.v1") || "null"); if (Array.isArray(l)) od = l.slice(0, 3); } catch { /* none */ }
    if (od.length) { const names = od.map((c) => c.title); A.setScreen("assembly", "The Open Door", names); await say(cx, "ayrissa", `Down the west hall, The Open Door has classes taught by our families and guests today: ${names.join(", ")}. Stop by and learn something new.`, { gesture: 6 }); if (!ok()) return false; } }
  const top = newsItems()[0]; if (top) { A.setScreen("assembly", "In the news today", [top.title.slice(0, 90)]); await say(cx, "ayrissa", `In the news today: ${top.title}`, { gesture: 6 }); if (!ok()) return false; }
  A.setScreen("assembly", "Have a wonderful day of learning!", ["Walk to your first class"]);
  await say(cx, "ayrissa", "We are so proud of you. Be kind, be curious, and have a wonderful day of learning.", { gesture: 3 }); if (!ok()) return false;
  await say(cx, "marcus", "Assembly is dismissed. Off to class!", { gesture: 3 }); markAssemblyDone(); return true;
}
