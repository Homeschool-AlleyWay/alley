# UNIFY Academy

One web app in one **paper-cut isometric** art style: a hallway, four lecture auditoriums and a live newsroom.
Run it: `npm install && npm start` → http://localhost:8787

| Piece | Files | What it is |
|---|---|---|
| **Shell** | `index.html` | Tabs and hand-offs between the pieces below |
| **Hallway** | `hallway3d.html`, `src/hall3d/*` | Perspective 3D paper-cut corridor (Three.js): high-angle follow camera, overview and first-person views; 10 big billboarded students on a clock/schedule with A* pathing; a walkable player (WASD / arrows / touch pad); doors to the auditoriums. The earlier isometric version is still in `hallway.html` + `src/game/scenes/HallwayScene.ts` |
| **Auditorium** | `auditorium.html`, `src/game/scenes/AuditoriumScene.ts` | Phaser isometric lecture hall: 50 seated NPCs, raised stage, projector, first-person seat view |
| **Newsroom** | `news.html` | Live studio: two anchors, weather map, field reports, clip cards, ticker |
| **Feed service** | `server/server.mjs` | Static server + `/api/broadcast?city=&grade=` (weather + local/national/world stories) |
| **Art pipeline** | `tools/` | Python (Pillow + numpy) generators for every PNG, with the paper-cut finish applied on save |

## How they connect
- **Hallway → Auditorium.** Every classroom is a lecture auditorium (`docs/UNIFY_AUDITORIUM_BIBLE_UPDATE.md`). Walk into a doorway and the hallway posts `unify:enter`; the shell opens the auditorium and starts that subject (`unify:lesson`). Doors carry the subject sign: arrival/Period 1 → **A = Math, B = ELA**; later periods → **A = Science, B = History**. Students walk to the doors during class and fill the hall at arrival, lunch and dismissal. **Leave auditorium** (or Esc) returns you to the spot in front of the door.
- **Newsroom.** `news.html` calls `/api/broadcast` on the same origin; without it the page shows sample content (badge: `SAMPLE DATA` / `LIVE FEED`). Clip cards jump the broadcast to that story. Switching tabs pauses the anchors' voices.
- Every page also runs standalone (doorways then just show a hint).

## Art style
See `docs/ART_STYLE.md`: soft cut edges, paper-core rims, drop shadows, sheet curl, one shared kraft palette and a screen-level grain overlay on every page. `UNIFY_PAPER=0 npm run assets` regenerates the previous flat look.

## Scripts
- `npm run build` bundles the auditorium (`demo/dist/bundle.js`, Phaser included) and both hallways (`hall3d.js` with Three.js, `hall.js`); also runs on `npm install`.
- `npm run typecheck`; `npm run assets` runs the art pipeline (needs Python 3.10+, `pip install pillow numpy`). Isometric hallway art: `tools/gen_hall.py` + `tools/layout_hall.py` (the 3D hallway reuses `hall.layout.json` for its nav grid, blockers and doors).
- `python3 tools/bake_chibi.py` redraws the auditorium characters with the hallway's chibi rig. `python3 tools/build_artifact.py OUT_DIR` writes a relative-path copy for plain file hosts.
- Feed env: `PORT`, `SCHOOL_CITY`, optional `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` for better anchor copy.

## Docs
`docs/`: auditorium Bible update, pipeline README, art style, broadcast integration notes. `school-sim.html` / `school-sim-cartoon.html` are the earlier top-down prototypes; `prototypes/newsroom-enhanced.html` is the reference newsroom.

## Known gaps
- Newsroom anchors are drawn live in vector (same palette, shadows and grain, not the pipeline sprites).
- The live feed could not be exercised from the build sandbox (outbound hosts blocked); it falls back to sample data.
- Hallway NPCs do not use lockers or benches yet (they walk and stand).
- Diagonal directions in the auditorium sheets are the front/back chibi view with the head turned, not a true three-quarter drawing.
- Performance was only measured with software rendering; profile on a real phone.
- `tools/gen_decor.py` / `gen_fpv.py` output (`decor`, `fpv`, `textbook`) is not used at runtime.

- Netlify: `python3 tools/build_netlify.py OUT_DIR --zip` builds a deployable site (static game + the news feed as a Netlify Function at `/api/broadcast`).

## Deploy on Netlify from Git
The repo root `netlify.toml` builds from source (`npm run build`, then `tools/build_netlify.py dist`), publishes `dist/` and serves the news feed as a function at `/api/broadcast`. In Netlify: Add new project > Import from GitHub > choose this repo and branch. No settings needed; optional env vars `SCHOOL_CITY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`. New sites are public by default (team-only visitor access is a per-site setting under Site configuration > Access & security).
