# Art style: paper-cut isometric

One look across the hallway, the auditoriums and the newsroom: **cut card pieces layered on a cream sheet**.

## What makes it read as paper
- **Soft cut edges.** Dark outlines are replaced by a darker tone of the paper beside them, with a lit rim on the upper-left and a cast shadow on the lower-right (light is always upper-left).
- **Paper core.** Free-standing props and characters get a thin pale band just inside their silhouette (the white card core showing at the cut) and a soft drop shadow onto whatever is behind them.
- **Sheet curl.** A very gentle light-to-dark gradient across each piece so flat cards look slightly bowed.
- **One grain, one colour temperature.** A light fibre/noise pass and a shared warm cast on every asset, plus a single screen-level grain and vignette laid over each page (`#paper`, `#vig`), so nothing looks like a different product.
- **Layered decoration.** Scalloped paper garlands, cut-paper bunting, folded paper lanterns, cork boards with pinned sheets.

## Where it lives
- `tools/lib.py` `paper_finish()` runs inside `save()`, so *every* generated PNG gets the finish. Seamless pieces (floors, risers, walls, backdrops) skip the rim/drop/curl so tiles still join without grid lines; soft light pools and screen content skip the bevel.
- `tools/gen_hall.py` + `tools/layout_hall.py` build the hallway (lockers, doors with subject signs, windows, bunting, lanterns, bench, fountain, rug tiles).
- `hallway.html`, `auditorium.html`, `news.html` and `index.html` share the same kraft tokens (`--sheet #EADFCB`, `--kraft #F3E7CF`, `--edge #C9B28A`) and the same paper-tag buttons.
- The newsroom canvas turns on `ctx.shadow*` for the whole frame, so every drawn shape casts onto the one beneath it.

## Tuning
`UNIFY_PAPER=0 npm run assets` regenerates the previous flat look. Strengths are constants in `paper_finish()` (edge shadow, rim, core, grain, curl).

## Known gaps
- The newsroom anchors are still drawn live in vector; they share the palette, shadows and grain but not the exact pipeline sprites.
- `tools/gen_decor.py` / `gen_fpv.py` output (`public/assets/unify/decor`, `fpv`, `textbook`) is not used at runtime.

## The 3D hallway (perspective)
`hallway3d.html` renders the corridor with a real perspective camera (Three.js). It follows the viewpoints of the reference art: a **high-angle follow camera** looking down the hall, an **overview**, and an **eye-level first-person** view (cycle with the View button).
- Every surface is a paper-textured card or box: `src/hall3d/textures.ts` draws lockers, doors, windows, boards, posters, floor tiles, rug and the far wall with Canvas2D (soft cut edges, bevel, sage/cream palette). Wall decor sits on a soft shadow card so pieces look layered.
- Characters are chibi sprites baked from vector art at 4 directions x 5 frames (`src/hall3d/characters.ts`) and billboarded, so kids near the camera are large and crisp.
- **Swapping in generated art:** replace a texture function in `textures.ts` with `new THREE.TextureLoader().load(url)` (same aspect ratio) and the geometry, lighting and shadows stay as they are. The same works for character sheets (`bakeSheet` returns a 5x4 canvas: columns stand, walk1-4; rows down, up, left, right).

## One cast of characters
The hallway and the auditoriums use the **same chibi rig** (`src/hall3d/characters.ts`), so a student looks the same in both. The auditorium sheets are baked from it: `python3 tools/bake_chibi.py` reads `tools/char_manifest.json`, draws every sheet (8 directions, sit / raise hand / write / talk / point / board-write, plus the large seat-view versions) in headless Chromium, then applies the paper finish. `npm run assets:chars` runs `gen_chars.py` (manifest) and then the bake. Student looks are defined once in `tools/bake_entry.ts` and match the hallway roster; teachers and the player have fixed looks there too. Needs `npm i` (esbuild) and `playwright` (`npm i -g playwright`).
