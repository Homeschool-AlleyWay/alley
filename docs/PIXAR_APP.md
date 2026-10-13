# UNIFY Academy - Pixar edition

A separate full build of the academy where every page and 3D scene uses the Pixar-inspired look. The normal build is unchanged (look defaults to `papercut`).

How it works: `look.js` (first script on every page) sets `window.UNIFY_LOOK` and `data-look` on `<html>`. The Pixar build ships it with `LOOK = "pixar"`, which also loads `pixar-ui.css` (warm sunset palette, glossy buttons, pill nav, big radii; scoped to `html[data-look="pixar"]`). TypeScript code reads `isPixar()` from `src/shared/look.ts`. The dorm starts in the pixar style (still switchable in its Look panel).

Build:

    npm run build && python3 tools/build_pixar_app.py dist-pixar      # add --zip for dist-pixar.zip

It runs `tools/build_netlify.py` (so `/api` functions are included), then rewrites look.js, adds pixar-ui.css, injects look.js into every html page, suffixes the index title with " - Pixar edition", and adds `no-store` for html plus `X-Robots-Tag: noindex` to netlify.toml. It fails if any page references a missing file.

Deploy as its own Netlify site: create a new site (separate from the normal academy) and deploy `dist-pixar` (`netlify deploy --prod --dir=dist-pixar`; use Git/CLI, not drag-and-drop, if you want the news functions).

Backend: it ships the same `supabase-config.js`, so it shares the same Supabase project (accounts, mail, presence) as the normal academy.

Test: `node tests/pixar-app.test.mjs` (after `npm run build`); smoke: `SMOKE_DIR=dist-pixar node tests/smoke.mjs`.
