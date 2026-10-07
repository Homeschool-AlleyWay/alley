/** Stage shows: plays, reenactments and musicals performed by the principals (and a rotating "cast" voiced by them) with the curtains,
 *  the big screen as the set, moving mouths, an audience that whispers before the curtain and cheers at the end.
 *  One show a day rotates automatically; Fridays are Showtime (the auditorium announces it and the Show button lights up). */
import type { Ctx } from "./assembly";
import { say, wait } from "./assembly";
import type { Who } from "./Auditorium3D";

export interface Cue { who: Who | "both"; role: string; text: string; gesture?: number }
export interface Act { title: string; set: string[]; cues: Cue[] }
export interface Show { id: string; title: string; kind: "play" | "reenactment" | "musical" | "showcase"; blurb: string; acts: Act[] }

export const SHOWS: Show[] = [
  { id: "hare", title: "The Tortoise and the Hare", kind: "play", blurb: "A classic fable about slow and steady.", acts: [
    { title: "Act 1: The Bragging", set: ["A sunny meadow", "Morning"], cues: [
      { who: "marcus", role: "Narrator", text: "Once upon a time, in a sunny meadow, lived a very fast hare and a very slow tortoise.", gesture: 7 },
      { who: "ayrissa", role: "Hare", text: "I am the fastest creature alive! Nobody can catch me. Not even you, Tortoise!", gesture: 3 },
      { who: "marcus", role: "Tortoise", text: "Perhaps not. But I would happily race you, friend. Slow and steady is a fine way to travel.", gesture: 6 } ] },
    { title: "Act 2: The Race", set: ["The long winding road", "Noon"], cues: [
      { who: "ayrissa", role: "Hare", text: "Ha! Look at him go. Which is to say, not at all. I will take a little nap under this tree.", gesture: 3 },
      { who: "marcus", role: "Narrator", text: "And so the hare dozed off, while the tortoise kept walking. One step, and another, and another.", gesture: 7 },
      { who: "marcus", role: "Tortoise", text: "Almost there. Do not stop. One more step.", gesture: 6 } ] },
    { title: "Act 3: The Finish", set: ["The finish line", "Evening"], cues: [
      { who: "ayrissa", role: "Hare", text: "Oh no! I overslept! Wait for me!", gesture: 3 },
      { who: "marcus", role: "Narrator", text: "But it was too late. The tortoise crossed the finish line first, and the whole meadow cheered.", gesture: 7 },
      { who: "both", role: "The Cast", text: "The moral of the story: slow and steady wins the race." } ] } ] },
  { id: "signing", title: "Founders' Day: Signing the Constitution", kind: "reenactment", blurb: "A history reenactment of the summer of 1787.", acts: [
    { title: "Scene 1: Philadelphia, 1787", set: ["Independence Hall", "Summer, 1787"], cues: [
      { who: "marcus", role: "Narrator", text: "In the hot summer of 1787, delegates from the states gathered in Philadelphia. The old rules were not working, and they needed a stronger plan for the new country.", gesture: 7 },
      { who: "ayrissa", role: "Delegate", text: "We need a government that is strong enough to work, but fair enough to protect everyone's rights.", gesture: 6 } ] },
    { title: "Scene 2: The Great Compromise", set: ["Debate in the hall", "Weeks of argument"], cues: [
      { who: "marcus", role: "Delegate", text: "Big states want more votes, small states want an equal voice. We are stuck.", gesture: 6 },
      { who: "ayrissa", role: "Delegate", text: "Then let us build two chambers. One by population, one equal for every state. Everyone gets heard.", gesture: 3 } ] },
    { title: "Scene 3: We the People", set: ["September 17, 1787", "The signing"], cues: [
      { who: "marcus", role: "Narrator", text: "On September seventeenth, thirty-nine delegates signed the new Constitution.", gesture: 7 },
      { who: "both", role: "The Cast", text: "We the People of the United States, in order to form a more perfect Union." } ] } ] },
  { id: "garden", title: "The Little Seed (a musical)", kind: "musical", blurb: "A sing-along about growing, with the whole school.", acts: [
    { title: "Song 1: Dig, Dig, Dig", set: ["La la la", "Everybody clap along"], cues: [
      { who: "ayrissa", role: "Gardener", text: "Dig, dig, dig, a little hole. Plant a seed and watch it grow!", gesture: 3 },
      { who: "marcus", role: "Gardener", text: "Sun, sun, sun, and drops of rain. Be patient, little seed!", gesture: 7 } ] },
    { title: "Song 2: Up, Up, Up", set: ["Reach for the sky", "Everybody stand and stretch"], cues: [
      { who: "both", role: "The Chorus", text: "Up, up, up, it reaches for the light. Roots go down and leaves go out. Now it's tall and bright!" },
      { who: "ayrissa", role: "Gardener", text: "And every one of you started out as a little seed too. Keep growing!", gesture: 3 } ] } ] },
  { id: "fair", title: "Science Fair Showcase", kind: "showcase", blurb: "Student discoveries, explained out loud.", acts: [
    { title: "Exhibit 1: Plants and Light", set: ["How do plants eat?", "Photosynthesis"], cues: [
      { who: "ayrissa", role: "Presenter", text: "Our experiment: do plants grow toward light? We put two beans in a box with a window cut in one side.", gesture: 6 },
      { who: "marcus", role: "Presenter", text: "After two weeks, the bean near the window bent toward the light. Plants reach for the sun to make their food.", gesture: 3 } ] },
    { title: "Exhibit 2: The Bouncing Ball", set: ["Energy in motion", "Potential to kinetic"], cues: [
      { who: "marcus", role: "Presenter", text: "We dropped the ball from three different heights. The higher it starts, the more energy it has, and the higher it bounces back.", gesture: 6 },
      { who: "both", role: "The Cast", text: "Thank you for visiting our science fair. Keep asking questions!" } ] } ] },
];

/** one show per day on a rotation; Friday is Showtime */
export const showOfDay = (d = new Date()) => SHOWS[Math.floor(d.getTime() / 864e5) % SHOWS.length];
export const isShowtime = (d = new Date()) => d.getDay() === 5;

export async function runShow(cx: Ctx, show: Show): Promise<boolean> {
  const A = cx.A, ok = () => !cx.cancelled();
  A.chatter = false; A.cheer = false; A.standing = false; A.bowing = false; A.curtains(false); A.walkOn();
  A.setScreen("event", show.title, ["Tonight on stage", show.blurb]); cx.caption("Showtime", `${show.title}. ${show.blurb}`);
  A.chatter = true; await wait(3400); if (!ok()) return false;
  A.chatter = false; A.curtains(true); await wait(2400); if (!ok()) return false;
  for (const act of show.acts) {
    A.setScreen("event", act.title, act.set); cx.caption("Stage", act.title); await wait(1500); if (!ok()) return false;
    for (const c of act.cues) { await say(cx, c.who, c.text, { gesture: c.gesture, name: c.role }); if (!ok()) return false; }
    await wait(500);
  }
  A.setScreen("event", "Thank you!", ["Bow, everyone", show.title]); A.bowing = false; A.cheer = true; cx.caption("The audience", "Everybody cheers and claps!");
  await wait(4500); A.cheer = false; if (!ok()) return false;
  A.curtains(false); await wait(1600); return true;
}
