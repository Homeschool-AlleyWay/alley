# UNIFY Academy

One web app, three connected pieces. Run it: `npm install && npm start` → http://localhost:8787

| Piece | File | What it is |
|---|---|---|
| **Shell** | `index.html` | Tabs + hand-offs between the pieces below |
| **Hallway** | `school-sim-cartoon.html` | Cartoon top-down school: 10 students on a clock/schedule, A* pathing, walkable teacher (WASD / arrows / touch joystick) |
| **Auditorium** | `auditorium.html` + `src/game/**` | Phaser isometric lecture auditorium (50 seated NPCs, raised stage, projector, seat view). Art from `public/assets/unify/**` |
| **Newsroom** | `news.html` | Live studio: two anchors, weather map, field reports, clip cards, ticker |
| **Feed service** | `server/server.mjs` | Static server + `/api/broadcast?city=&grade=` (weather + local/national/world stories) |

## How they connect
- **Hallway → Auditorium.** Every classroom is a lecture auditorium (see `docs/UNIFY_AUDITORIUM_BIBLE_UPDATE.md`). Walk into a doorway: the hallway posts `unify:enter` to the shell, the shell opens the auditorium and starts that subject's lesson (`unify:lesson`), and the student walks to a seat. Doors are labelled with the current subject: arrival/Period 1 → **A = Math, B = ELA**; later periods → **A = Science, B = History**. **← Leave auditorium** (or Esc) returns you to the spot below the door.
- **Newsroom.** `news.html` calls `/api/broadcast` on the same origin. If the service or network is unavailable it falls back to sample content (badge shows `SAMPLE DATA` vs `LIVE FEED`). The clip cards (from `prototypes/newsroom-enhanced.html`) jump the broadcast to that story. Switching tabs pauses the anchors' voices.
- Standalone pages still work: open `school-sim-cartoon.html` or `news.html` alone (doorways just show a hint).

## Scripts
- `npm run build` bundles the auditorium (Phaser included) to `demo/dist/bundle.js` (also runs on `npm install`).
- `npm run typecheck`, `npm run assets` (Python + Pillow art pipeline; see `docs/AUDITORIUM_PIPELINE.md`).
- Env for the feed: `PORT`, `SCHOOL_CITY`, optional `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` for better anchor copy.

## Docs
`docs/` holds the auditorium Bible update, the pipeline README and the broadcast integration/delivery notes. `school-sim.html` is the original pixel-art prototype; `prototypes/newsroom-enhanced.html` is the reference newsroom.

## Known gaps
- The hallway's top-down classrooms are still the cutaway rooms; the auditorium is entered through the doors rather than shown inside them.
- The live feed could not be exercised from the build sandbox (outbound hosts blocked); it falls back to sample data.
- The broadcast TypeScript modules named in `docs/BROADCAST_INTEGRATION_GUIDE.md` (DialogSystem.ts etc.) were not in the upload; the news page already has equivalent dialog/animation code.
- Auditorium performance was only checked with software GL; profile on a real phone.
