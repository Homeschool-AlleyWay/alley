# Hallway news TV (hand-off API)

`src/news/tv.ts` renders the newsroom broadcast into a canvas so the hallway can put it on a wall-mounted TV. It plays the viewer's visible
field reports one after another as papercut films, with the lower-third caption and the **UNIFY News** bug. The hallway does not need to know anything about reports.

```ts
import * as THREE from "three";
import { createNewsTV } from "../news/tv";

const tv = createNewsTV({ width: 512, height: 288 });          // 16:9; fps defaults to 15
const tex = new THREE.CanvasTexture(tv.canvas);
tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;   // = tv.texture hints
tvScreenMaterial.map = tex;                                    // MeshBasicMaterial on the TV's screen plane

// every frame
if (tv.update(dt)) tex.needsUpdate = true;                     // returns true when the canvas was repainted

tv.setAudienceHS(player.band === "hs" || player.band === "adult");   // default false: all-ages reports only
// tv.next() / tv.prev(), tv.now() -> { title, audience, index, of }
// when the hallway scene is disposed: tv.dispose(); tex.dispose();
```

* `canvas` live-updating `HTMLCanvasElement`. Only repainted at `fps`, so a wall TV costs about 1 ms per painted frame.
* `texture` the three.js texture settings to apply (no three.js import in `tv.ts`, the world builds the texture).
* `update(dt)` advance and repaint; returns whether the canvas changed (set `texture.needsUpdate`).
* `setAudienceHS(on)` high-school reports (`audience: "hs"`) only play when `on` is true. A public hallway TV should pass the player's own band.
* `dispose()` stops the clock and frees the canvas.

Options: `{ width, height, fps?, store?, hs? }`. `store` defaults to this browser's list (`loadLocal()`: the 20 curated reports until the
newsroom team posts others). Optional narration is a newsroom-screen feature only; the TV is silent.

Try it without the hallway: open `tests/news-tv-harness.html` from a served build (it loads `demo/dist/fieldreports.js`, which exposes `__fieldReports.createNewsTV`).

## Field reports in one paragraph
At most 20 reports are active (`FIELD_REPORT_MAX` in `src/news/fieldreports.ts`); a 21st is refused with a friendly message, and the extras are
**archived, never deleted** (the desk's Archive / Restore, `field_reports.status`). Every report has `audience: "all" | "hs"`. All-ages reports
are written to be suitable for K-8; `hs` reports (careers, college prep, civics, money) are shown only to high-school and adult viewers (avatar age
`hs` / `adult`, or the family link band) with a visible "High school" badge. Posts go through an unsafe-word filter on the desk. Each report
carries its generated scene script (`src/news/scenegen.ts`, deterministic, seeded by the report id); `src/news/papercut.ts` draws it.
