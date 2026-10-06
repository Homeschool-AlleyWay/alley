/** Game data for the flip phone: the real NPC roster, the shared social memory (same localStorage the hallway and classrooms use),
 *  the dialogue engine (local, with the optional /api/chat model) and the lesson homework. Loaded on demand by phone.html. */
import { ROSTER, STAFF, byId, TEACHER_BY_SUBJECT } from "../src/hall3d/roster";
import { Social, tier, hearts } from "../src/hall3d/social";
import { Convo, converse } from "../src/hall3d/dialogue";
import { LESSONS } from "../src/game/lessons";
(window as any).__phoneData = { ROSTER, STAFF, byId, TEACHER_BY_SUBJECT, Social, tier, hearts, Convo, converse, LESSONS };
