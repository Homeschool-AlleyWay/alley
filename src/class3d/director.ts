/** Runs a lesson in the 3D classroom: the teacher writes the board, walks the room, points at the clip title card, the lights dim for a slow close-up of
 *  the screen while the video plays, and questions are asked along the way. Every step can be cancelled (a new lesson or leaving the room). */
import { TEACHER_BY_SUBJECT } from "../hall3d/roster";
import { Social } from "../hall3d/social";
import type { Classroom3D, CamMode } from "./Classroom3D";
import type { LessonDef } from "./curriculum";
import { VIDEO_BY_ID } from "./videos";
import { shotAt, videoLength } from "./reenact";
import { voice } from "./voice";

export interface DirectorUI { caption(who: string, text: string, ms: number): void; clearCaption(): void; step(label: string, i: number, n: number): void; labReady(l: LessonDef["lab"]): void; ask(kind: "teacher" | "npc"): Promise<void>; setTitle(t: string): void; speak?(def: any, text: string): Promise<void> }
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export class Director {
  private tok = 0; lesson!: LessonDef; running = false; skipReq = false; stepNo = 0;
  constructor(private room: Classroom3D, private ui: DirectorUI) {}
  stop() { this.tok++; this.running = false; this.room.setDim(false); this.room.setTalking(false); this.room.setTeacherMode("idle"); voice.cancel(); this.room.projector.idle(); this.ui.clearCaption(); }
  /** jump to the next step of the plan */
  skip() { this.skipReq = true; this.room.projector.ended = true; const f = this.room.projector.onEnd; this.room.projector.onEnd = null; f?.(); }
  private get T() { return TEACHER_BY_SUBJECT[this.lesson.subject]; }
  private ok(t: number) { return t === this.tok; }
  /** teacher speaks: caption + mouth animation; resolves after reading time */
  private async say(t: number, text: string, mode?: CamMode, extra = 0) {
    if (!this.ok(t)) return; if (mode) this.room.setMode(mode); const ms = Math.min(9000, 1700 + text.length * 48) + extra;
    this.room.setTalking(true); this.ui.caption(this.T.name, text, ms); const sp = this.ui.speak?.(this.T, text); await this.wait(t, ms); if (sp && this.ok(t)) await Promise.race([sp, this.wait(t, 20000)]); this.room.setTalking(false);
  }
  private async wait(t: number, ms: number) { const end = performance.now() + ms; while (this.ok(t) && performance.now() < end && !this.skipReq) await sleep(60); this.skipReq = false; }
  private async go(t: number, spot: string, face?: [number, number]) { if (!this.ok(t)) return; await this.room.walkTo(spot, face); }
  /** wander toward a spot while talking so the camera follows a moving teacher */
  private async strollSay(t: number, spot: string, text: string, face?: [number, number]) {
    if (!this.ok(t)) return; this.room.setMode("follow"); this.room.setTeacherMode("idle"); const walk = this.room.walkTo(spot, face); await this.say(t, text); await Promise.race([walk, sleep(5000)]);
  }

  async run(lesson: LessonDef) {
    this.stop(); const t = ++this.tok; this.lesson = lesson; this.running = true; const R = this.room, P = R.projector, n = 5 + lesson.videos.length + lesson.pics.length; this.stepNo = 0;
    const step = (label: string) => this.ui.step(label, ++this.stepNo, n);
    R.setSubject(lesson.subject, lesson.subject === "careers" ? "careers" : lesson.lab.id); R.setTeacher(this.T); R.boardL.clear(); R.boardR.clear(); P.idle(lesson.subject, lesson.title); this.ui.setTitle(lesson.title);
    if (R.auto) R.setMode("wide");
    const me = Social.profile.name || "friend", m = Social.peek(this.T.id), seen = m?.met;
    // 1. welcome
    step("Welcome"); await this.go(t, "center", [0, 1]); R.setTeacherMode("idle", [0, 1]); const hi = R.react("welcome");
    await this.say(t, `${hi ? hi + " " : ""}${seen ? "Welcome back" : "Good morning"}, class. ${me}, ${seen ? "good to see you again." : "glad you're here."} ${lesson.intro}`, R.auto ? "wide" : undefined);
    // 2. points on the left board
    step("Key points"); R.setMode(R.auto ? "follow" : R.mode); await this.go(t, "boardL", [0, -1]); if (!this.ok(t)) return; R.setTeacherMode("write", [0, -1]); R.boardL.set(lesson.title, lesson.points.map((x) => ({ text: x })));
    if (R.auto) R.setMode("board-left"); const w = R.boardL.write(24); this.ui.caption(this.T.name, "Let's write down what's important to know.", 3000); R.setTalking(false); await Promise.race([w, this.wait(t, 60000)]); if (!this.ok(t)) return; R.boardL.showAll();
    R.react("think"); R.setTeacherMode("point", [0, -1]); await this.say(t, "These are the points to remember. Copy them into your notes.", R.auto ? "board-left" : undefined, 1200);
    // 3. examples on the right board
    step("Worked examples"); R.setTeacherMode("idle"); if (R.auto) R.setMode("follow"); await this.go(t, "boardR", [0, -1]); if (!this.ok(t)) return; R.setTeacherMode("write", [0, -1]); R.boardR.set("Examples", lesson.examples.map((x) => ({ text: x, kind: "example" })));
    if (R.auto) R.setMode("board-right"); this.ui.caption(this.T.name, "Now some examples so it sticks.", 2600); await Promise.race([R.boardR.write(26), this.wait(t, 70000)]); if (!this.ok(t)) return; R.boardR.showAll();
    R.setTeacherMode("point", [0, -1]); await this.say(t, lesson.examples[0], R.auto ? "board-right" : undefined, 800); R.setTeacherMode("idle");
    // 4. live pictures on the projector
    for (const pid of lesson.pics) {
      if (!this.ok(t)) return; step("Picture"); await this.go(t, "screenL", [1, -0.1]); P.pic(pid); R.setTeacherMode("point", [1, -0.2]); if (R.auto) R.setMode("follow");
      await this.say(t, `Look at the screen. This picture shows it clearly.`, undefined, 2500); R.setTeacherMode("idle");
    }
    // 5. clips: introduce at the title card, then dim + slow close-up while it plays
    for (let vi = 0; vi < lesson.videos.length; vi++) {
      if (!this.ok(t)) return; const v = VIDEO_BY_ID[lesson.videos[vi]]; if (!v) continue; step("Clip: " + v.title);
      await this.go(t, "screenL", [1, -0.1]); if (!this.ok(t)) return; P.title(v); R.setTeacherMode("point", [1, -0.15]); if (R.auto) R.setMode("follow");
      await this.say(t, `We're going to watch a short clip: "${v.title}". ${v.blurb ?? ""}`, undefined, 2200); R.setTeacherMode("idle", [1, -0.1]);
      await this.say(t, "Pay attention to the details. I'll talk through it as we go.", undefined, 400); if (!this.ok(t)) return;
      R.setDim(true); await this.wait(t, 900); const len = videoLength(v); if (R.auto) R.closeUpScreen(len); P.play(v); let last = -1; const done = new Promise<void>((r) => { P.onEnd = r; });
      const poll = (async () => { while (this.ok(t) && P.playing) { const i = shotAt(v, P.t).i; if (i !== last) { last = i; const line = v.discuss?.[i]; if (line) { R.setTalking(true); this.ui.caption(this.T.name, line, Math.min(8000, shotAt(v, P.t).shot.dur * 1000)); void this.ui.speak?.(this.T, line); setTimeout(() => this.ok(t) && R.setTalking(false), 3200); } } await sleep(120); } })();
      await Promise.race([done, poll]); await done; R.setTalking(false); this.ui.clearCaption(); if (!this.ok(t)) return;
      R.setDim(false); R.setTeacherMode("idle"); P.idle(lesson.subject, lesson.title); if (R.auto) R.setMode("follow"); await this.wait(t, 1400);
      await this.strollSay(t, vi % 2 ? "midL" : "midR", `So what did we see? ${v.discuss?.[v.discuss.length - 1] ?? "Let's talk about it."}`);
    }
    // 6. questions while walking the aisles
    step("Questions"); await this.strollSay(t, "aisleC", "Let's check what you've got. Think about it, and raise your hand if you know."); if (!this.ok(t)) return; if (R.auto) R.setMode("follow");
    await this.ui.ask("teacher"); if (!this.ok(t)) return; await this.strollSay(t, "mid", "Good. One more question from the class.", [0, 1]); await this.ui.ask("npc"); if (!this.ok(t)) return;
    // 7. interactive example
    step("Try it"); R.setTeacherMode("idle"); if (R.auto) R.setMode("follow"); await this.go(t, "demo", [0, 1]); R.setTeacherMode("point", [0.8, 0.6]);
    this.ui.labReady(lesson.lab); await this.say(t, `${lesson.lab.title}: ${lesson.lab.intro} Click the 3D model or the Try it button.`, R.auto ? "demo" : undefined, 2500);
    // 8. wrap up
    R.setTeacherMode("idle"); await this.go(t, "center", [0, 1]); if (R.auto) R.setMode("wide"); const wr = R.react("wrap"); await this.say(t, `${wr ? wr + " " : ""}${lesson.wrap} Homework: ${lesson.homework}`, undefined, 1500);
    if (parent !== window) parent.postMessage({ type: "unify:event", kind: "homework", subject: lesson.subject, text: lesson.homework }, "*");
    Social.edit(this.T.id, (mm) => { mm.topics.push("lesson:" + lesson.id); if (mm.topics.length > 24) mm.topics.shift(); });
    this.running = false; this.ui.step("Class dismissed. Ask questions or try the lab", n, n);
  }
}
