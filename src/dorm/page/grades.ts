/** Grades folder: an animated manila folder that opens to the report card (from the saved progress, same numbers the parent sees). */
import { gradesFromState } from "../../hall3d/lockerui";
import { SUBJECT_NAME } from "../../game/progress";
import { Social } from "../../hall3d/social";
import { E, lsGet } from "./dom";

export function openGrades(body: HTMLElement): () => void {
  const name = Social.profile.name || "Student";
  const folder = E("div", "folder", body); E("div", "back", folder);
  const sheetp = E("div", "sheetp", folder); E("b", "", sheetp, "Report card"); E("div", "", sheetp, name);
  const front = E("div", "front", folder, "📁 Grades"); front.setAttribute("aria-hidden", "true");
  const rep = E("div", "report", body); rep.style.display = "none";
  const prog = lsGet<unknown>("unify.progress.v1", null), g = gradesFromState(prog);
  E("h3", "", rep, `${name}'s report card`).style.margin = "0 0 4px";
  const t = E("table", "rep-tab", rep), hd = E("tr", "", t); for (const h of ["Class", "Lessons done", "Grade"]) E("th", "", hd, h);
  for (const x of g) {
    const r = E("tr", "", t); E("td", "", r, SUBJECT_NAME[x.subject]);
    const c = E("td", "", r); E("div", "", c, `${x.done} of ${x.total}`); const bar = E("div", "bar", c); E("i", "", bar).style.width = `${Math.round((x.done / Math.max(1, x.total)) * 100)}%`;
    E("span", "gr", E("td", "", r), x.letter);
  }
  const any = g.some((x) => x.done > 0);
  E("p", "dp-note", rep, any ? "Keep going! Finish a lesson in each class to raise your grade." : "No lessons finished yet. Walk into a classroom to get your first grade.");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t1 = window.setTimeout(() => { folder.classList.add("open"); rep.style.display = ""; }, reduce ? 0 : 150);
  return () => clearTimeout(t1);
}
