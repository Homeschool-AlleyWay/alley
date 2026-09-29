# UNIFY auditorium asset pipeline

Generates, packs, validates and renders the auditorium art, and ships a Phaser 3 + TypeScript scene that consumes it.

## Run
    pip install pillow            # python 3.10+
    npm install
    npm run assets                # env -> chars -> layout -> atlas -> validate -> preview
    npm run typecheck
    npm run demo                  # esbuild bundle, then serve demo/ + public/ (assets load from /assets/unify/...)

`npm run assets:validate` exits non-zero on any failure, so wire it into CI / the Replit run step.

## Pipeline
| Stage | File | Output |
|---|---|---|
| Palette + iso drawing lib (locked Bible colors, 4x supersample, #455057 outlines, upper-left light) | tools/lib.py | - |
| Environment art (floors, tiers, stage, stairs, walls, door, column, seats, podium, table, board, screen, rigs, plant) | tools/gen_env.py | public/assets/unify/**, tools/env_manifest.json |
| Characters: 11 roster entries x 11 action sheets, 8 directions, 96x128, feet at y=108 | tools/gen_chars.py | characters/{students,teachers}/*.png |
| Layout: placements, depth, seats, collision (single source of truth) | tools/layout.py | src/game/data/auditorium.layout.json |
| Atlas + generated TS manifest | tools/pack_atlas.py | atlas/auditorium_env.{png,json}, src/game/assets/assetManifest.ts |
| QA gate | tools/validate.py | pass/fail |
| Compositor preview (same math as Phaser) | tools/preview.py | preview/auditorium_preview.png |
| Headless runtime test (Playwright) | tools/runtime_test.py | preview/runtime_*.png |

## Runtime (src/game)
- `AuditoriumScene` builds everything from the layout JSON. Depth = `(gx+gy)*100 + offset`; seat base < seated actor < seat back so backrests overlap students correctly.
- `SeatingSystem` + `requestSeat()`: uses a free seat; if none, the rear-most NPC stands, walks the aisle to the door lane and despawns, then the player sits.
- `CollisionSystem` is logical only. `?debug=1` draws it; it is never drawn otherwise.
- `CurriculumVisualSystem.resolveAuditoriumVisuals()` + `scene.setLesson()` swap projection-screen content; the room is not rebuilt.
- `MobileControls.tsx`: 60px translucent pad, bottom-left; writes `VIRTUAL_INPUT`, which the scene converts screen->grid.

## Locked decisions that differ from the earlier Bible update (please confirm)
- Tier rise is 12 px/row, not 24-28. A 24 px rise exactly cancels the 24 px/tile screen shift of iso depth and flattens the tiers.
- Stage on the upper-left wall; audience faces it, so students are seen from behind (also hides the need for detailed rear faces).
- 12 x 14 tile room, 5 tiers, 50 seats.

## Known gaps (not done)
- Art is procedural and stylized. It passes the Bible's structural rules but is not illustrator-grade; treat it as the production-ready *pipeline* with placeholder-quality final art. Swap in hand-drawn/AI-assisted PNGs with the same names, sizes and anchors and every gate still applies.
- Character layers (01-11 composable) are not exported separately; sheets are pre-composited per roster entry. Only 3 sample non-HS ages (k2, g35, g68) exist.
- Skirts/dresses supported in code but no roster entry uses them; hair styles: short, long, ponytail, bun, curly, afro (no braids/locs/coils yet).
- Hallway, exterior, ELA/science props and per-lesson demo-table prop swapping are not built. Screen content exists for idle, math graph, math fractions, ELA annotation only. 3D model casting on the screen is not implemented.
- Performance measured only in a software-GL headless browser (FPS fell to ~6-20 there). Profile on a real phone before committing.
