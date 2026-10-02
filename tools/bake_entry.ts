// Bundled by tools/bake_chibi.py and run in headless Chromium: draws the chibi rig into sprite sheets that match tools/char_manifest.json.
import { drawChar, setOutline, SKINS, SHIRTS, HAIRS, AGE_SCALE } from "../src/hall3d/characters";
const STYLES = ["crop", "pony", "bun", "curly", "bob", "long", "crop", "pony", "curly", "bob"];
const studentLook = (i: number) => ({ id: i, skin: SKINS[(i * 2) % 5], hair: HAIRS[(i * 5) % 6], style: STYLES[i], shirt: SHIRTS[i] });
const LOOKS: Record<string, any> = {
  player_student: { id: 11, skin: "#f0c29b", hair: "#5a3a35", style: "bun", shirt: "#d9564a", glasses: true, pack: "#8a5f6a" },
  teacher_keisha: { id: 21, skin: "#a86f4f", hair: "#2b2b33", style: "curly", shirt: "#f6b294" },
  teacher_james: { id: 22, skin: "#d9a074", hair: "#694a38", style: "crop", shirt: "#8fc9e8", glasses: true },
  teacher_jamal: { id: 23, skin: "#7a4a36", hair: "#3a2a30", style: "long", shirt: "#a9dcc0" },
  teacher_marcus: { id: 24, skin: "#7a4a36", hair: "#2b2b33", style: "crop", shirt: "#c98569" },
};
for (let i = 0; i < 10; i++) LOOKS[`student_hs_${String(i + 1).padStart(2, "0")}`] = studentLook(i);
const DIRMAP: Record<string, [string, number]> = { down: ["down", 0], down_left: ["down", -1], left: ["left", 0], up_left: ["up", -1], up: ["up", 0], up_right: ["up", 1], right: ["right", 0], down_right: ["down", 1] };
const HANG = { R: [8.2, -9.5], L: [-8.2, -9.5] }, LAP = { R: [5, -10], L: [-5, -10] };
function pose(action: string, i: number, n: number): any {
  const t = (2 * Math.PI * i) / n;
  switch (action) {
    case "walk": return { moving: true, walk: t };
    case "sit": case "read": case "think": case "type": return { sitting: true, arms: LAP };
    case "raisehand": { const p = i / Math.max(1, n - 1); return { sitting: true, arms: { R: [8, -10 - p * 24], L: LAP.L } }; }
    case "write": return { sitting: true, arms: { R: [4 + Math.sin(t * 2) * 2.4, -10 + Math.cos(t * 2) * 0.8], L: LAP.L } };
    case "talk": return { mouth: Math.abs(Math.sin(t * 3)), arms: { R: [10 + Math.sin(t) * 3, -16 + Math.cos(t) * 2.5], L: HANG.L } };
    case "point": return { arms: { R: [12.5, -21 + Math.sin(t) * 0.8], L: HANG.L } };
    case "boardwrite": return { arms: { R: [6 + Math.sin(t * 2) * 3, -32 + Math.cos(t * 2) * 2], L: HANG.L } };
    default: return {};                                                   // idle
  }
}
(window as any).bakeSheet = (spec: any) => {
  setOutline("#455057");                                                  // the pipeline's outline colour, so paper_finish treats it like the rest of the auditorium art
  const { character, action, dirs, frames, frameWidth: fw, frameHeight: fh } = spec, k = fw / 96, teacher = character.startsWith("teacher");
  const S = 2.0 * AGE_SCALE[teacher ? "adult" : "hs"] * k, look = LOOKS[character];   // adults tallest, then high school
  const cv = document.createElement("canvas"); cv.width = fw * frames; cv.height = fh * dirs.length; const c = cv.getContext("2d")!;
  dirs.forEach((d: string, r: number) => {
    const [dir, turn] = DIRMAP[d];
    for (let f = 0; f < frames; f++) {
      c.save(); c.translate(f * fw + fw / 2, r * fh + 108 * k); c.scale(S, S);
      drawChar(c, 0, 0, { ...look, dir, turn, ...pose(action, f, frames) }, 0); c.restore();
    }
  });
  return cv.toDataURL("image/png");
};
