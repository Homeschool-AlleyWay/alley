# UNIFY Academy

One web app in one **paper-cut isometric** art style: a hallway, four lecture auditoriums and a live newsroom.
Run it: `npm install && npm start` → http://localhost:8787

| Piece | Files | What it is |
|---|---|---|
| **Shell** | `index.html` | Tabs and hand-offs between the pieces below |
| **Hallway** | `hallway3d.html`, `src/hall3d/*` | Perspective 3D paper-cut **indoor campus** (Three.js): a ring corridor with locker runs around four subject blocks (Math, ELA, Science, History) and a central plaza with fountain, trees and tables, ringed by lawn, trees and houses outside the walls. Orbit camera (drag, Q/E, on-screen buttons, wheel zoom) plus overview and first-person views; a **Go to** menu auto-walks you to a class door (or the **Newsroom** door in the north wall) and opens it; 20 students in K-2 / 3-5 / 6-8 / high-school size bands plus two adult staff (hall monitor and teacher) on a clock/schedule with A* pathing; a walkable player (WASD / arrows / touch pad, camera-relative). The earlier isometric version is still in `hallway.html` + `src/game/scenes/HallwayScene.ts` |
| **Auditorium** | `auditorium.html`, `src/game/scenes/AuditoriumScene.ts` | Phaser isometric lecture hall: 50 seated NPCs, raised stage, projector, first-person seat view |
| **Newsroom** | `news.html`, `src/news/*` | Live studio: two chibi anchors, weather map, ticker, and a **generated paper-cut video for every field report** (no cap on how many) |
| **People** | `src/hall3d/{rig,avatar,avatarui,roster,social,dialogue,chatui,hallsocial}.ts`, `src/game/{classroom,lessons,runtimeChars}.ts` | Avatar creator, 56 unique named NPCs with memory, two-way conversations, hand-raise Q&A |
| **Feed service** | `server/server.mjs` | Static server + `/api/broadcast` (weather + every local/national/world story for the viewer's place and AM/PM edition) + optional `/api/chat` |
| **Art pipeline** | `tools/` | Python (Pillow + numpy) generators for every PNG, with the paper-cut finish applied on save |

## How they connect
- **Hallway → Auditorium.** Every classroom is a lecture auditorium (`docs/UNIFY_AUDITORIUM_BIBLE_UPDATE.md`). Walk into a doorway and the hallway posts `unify:enter`; the shell opens the auditorium and starts that subject (`unify:lesson`). Each block has one door with its subject sign, so any class is reachable at any time (use **Go to** to walk there). Students walk to the doors during class and fill the hall at arrival, lunch and dismissal. **Leave auditorium** (or Esc) returns you to the spot in front of the door.
- **Newsroom.** `news.html` calls `/api/broadcast` on the same origin; without it the page shows sample content (badge: `SAMPLE DATA` / `LIVE FEED`).
  - *Where and when:* the page asks for the browser's location once (or take a typed city), sends `lat/lon/tz`, and the server returns that place's **morning or evening edition** (AM = since 6 pm yesterday, PM = since 6 am today, widened if a window is thin). Query params: `city | lat,lon`, `tz`, `edition=am|pm`, `grade`, optional `limit` (default: no limit). It refreshes every 10 minutes and slips new stories in after the current report.
  - *Sources:* Google News (geo + search for the place, nation topics, world), PBS, NPR, ABC, CBS, NBC, Guardian, BBC (+ regions), Al Jazeera, DW, France 24, UN News; BBC Newsround for grades K-5. Kid-safety filtering follows the avatar's grade band.
  - *Generated videos* (`src/news/video.ts`): each story becomes a short animation built from its own words: a topic scene with a field reporter, a figures shot only if the text contains numbers, a quote shot, a map with a pin for a place named in the text (`gazetteer.ts`), and a title card. **Save report as video** downloads it as WebM. Offline demo of the whole pipeline: `UNIFY_MOCK_FEEDS=1 npm start`.
  - The rundown lists every report with tier filters and search; tap one to jump.
- Every page also runs standalone (doorways then just show a hint).

## Art style
See `docs/ART_STYLE.md`: soft cut edges, paper-core rims, drop shadows, sheet curl, one shared kraft palette and a screen-level grain overlay on every page. `UNIFY_PAPER=0 npm run assets` regenerates the previous flat look.

## Scripts
- `npm run build` bundles the auditorium (`demo/dist/bundle.js`, Phaser included) and both hallways (`hall3d.js` with Three.js, `hall.js`); also runs on `npm install`.
- `npm run typecheck`; `npm run assets` runs the art pipeline (needs Python 3.10+, `pip install pillow numpy`). Isometric hallway art: `tools/gen_hall.py` + `tools/layout_hall.py` (the 3D campus is laid out in `src/hall3d/campus.ts`: blocks, doors, lockers, props and the nav grid).
- `python3 tools/bake_chibi.py` redraws the auditorium characters with the hallway's chibi rig. `python3 tools/build_artifact.py OUT_DIR` writes a relative-path copy for plain file hosts.
- Feed env: `PORT`, `SCHOOL_CITY` (fallback city), optional `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` (anchor copy for every story, and live NPC replies to typed text via `/api/chat`; without a key the local dialogue engine answers).
- `UNIFY_MOCK_FEEDS=1` serves built-in fixtures so the newsroom pipeline runs without internet.

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

## People, memory and conversations
- **Avatar creator** (Avatar button; shown on first visit): body (grade band sets height, build, head size, skin), face (eye shape and colour, brows, mouth, freckles, glasses styles), 19 hair styles with colour and highlights, outfit (9 tops, patterns, bottoms, shoes), extras (hats, bag, earrings, scarf, badge), name and pronouns, with a live turn-around and walk preview. It is used for your character in the campus **and** in the auditorium (baked at runtime).
- **56 unique NPCs** (`roster.ts`): each has a name, grade, look, personality, interests, favourite and hardest subject, food, pet, dream, quirk, secret and a best friend or rival. Looks are checked for uniqueness. Staff (hall monitor, teacher, four subject teachers) are adults.
- **Memory** (`social.ts`, localStorage `unify.social.v1`, shared by all pages): friendship, how often you talked, topics, facts you told them (hobby, favourite food or subject, pet, mood), quiz results, lunch buddies. NPCs greet you by name, ask how your hobby is going, remember when you helped them, and friends walk up to say hi. **Friends** (F) lists everyone you met.
- **Conversations** (tap a person or press T): choose a reply or type your own. Topics: how are you, subjects, hobbies, about me, food, gossip (grounded in the roster and other NPCs' memories), compliments on what they actually wear, jokes, studying with quiz questions by grade, advice, lunch invitations. Hallway chatter bubbles also come from the roster.
- **Hand raising** (auditorium, H or the button): the teacher asks questions, classmates raise their hands and answer (sometimes wrongly), and you can volunteer to answer or help someone, or raise your hand to ask the teacher to explain again, give an example, say why, define a word, or answer your own typed question. Teachers remember what you asked. Tap a seated classmate to whisper.
