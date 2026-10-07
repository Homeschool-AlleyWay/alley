/** Game data for the flip phone: the real NPC roster, the shared social memory (same localStorage the hallway and classrooms use),
 *  the dialogue engine (local, with the optional /api/chat model) and the lesson homework. Loaded on demand by phone.html. */
import { ROSTER, STAFF, byId, TEACHER_BY_SUBJECT } from "../src/hall3d/roster";
import { Social, tier, hearts } from "../src/hall3d/social";
import { Convo, converse } from "../src/hall3d/dialogue";
import { LESSONS } from "../src/game/lessons";
import { drawChar } from "../src/hall3d/rig";

/** A small head-and-shoulders picture of an NPC, drawn with the same rig as the hallway (cached as a data URL). */
const faces = new Map<number, string>();
function portrait(npc: any, size = 44): string | null {
  try {
    const hit = faces.get(npc.id); if (hit) return hit;
    const cv = document.createElement("canvas"); cv.width = cv.height = size; const c = cv.getContext("2d")!;
    c.fillStyle = "#EADFCB"; c.fillRect(0, 0, size, size); c.imageSmoothingEnabled = false;
    const ad = npc.look?.age === "adult", k = ad ? size / 17.5 : size / 21; c.save(); c.translate(size / 2, ad ? size * 0.52 + 40.4 * k : size * 1.46); c.scale(k, k);
    drawChar(c, 0, 0, { ...npc.look, dir: "down", moving: false, walk: 0 }, 0); c.restore();
    const url = cv.toDataURL("image/png"); faces.set(npc.id, url); return url;
  } catch { return null; }
}
(window as any).__phoneData = { ROSTER, STAFF, byId, TEACHER_BY_SUBJECT, Social, tier, hearts, Convo, converse, LESSONS, portrait };
