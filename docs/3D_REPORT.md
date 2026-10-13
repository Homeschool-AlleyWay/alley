# UNIFY Academy — 3D / Pixar Edition Report

## Live apps
| App | URL | Notes |
|---|---|---|
| Pixar (3D everything) | https://unify-academy-pixar.netlify.app | Pixar look on every page and 3D scene; includes /api functions |
| Standard | https://unify-academy-standard.netlify.app | Normal look; static build (no /api functions) |
| Old standard | https://unify-academy-live.netlify.app | Older build, redundant; redeploys failed |

Both current apps share one Supabase project (accounts, mail, presence).

## Source
- `Homeschool-AlleyWay/alley` (branch `ccr-f001028e-qorwak`; `main` at 2ad42e0)
- `ayrissacanty/unify-campus-quest` `main` = school source (replaced Campus Quest; old code in git history)
- Build Pixar: `npm run build && python3 tools/build_pixar_app.py dist-pixar` (see docs/PIXAR_APP.md)

## What the 3D work includes
**Scenes** (Three.js 0.186, bundled with esbuild)
- Hallway, classroom, auditorium and field trip each have a Pixar look: ACES tone mapping, image-based lighting (RoomEnvironment), half-res bloom, MSAA on desktop only, automatic fallback on weak devices.
- Added depth: richer props, ground detail on field trips, mood lighting.

**Avatars**
- Three proportion styles: Chibi / Stylised / Realistic (more realistic body shapes).
- 3D feel with 2D wrap; thicker outlines (3D hull 0.0065, 2D about +40%).
- Sims-1-style creator: Body, Face, Hair, Facial hair, Wardrobe, Outfit designer (personalised, non-premade outfits), Accessories, Closet, Backpack, You.
- Live preview updates per input (about 0.4 ms measured), 2D and 3D.
- Older saved profiles load as Stylised.

**Guidance and following**
- Auditorium-first, then class flow restored (beacon, banner "Morning assembly: head to the Auditorium", "Take me there").
- Light beam on the player's avatar (toggle `#tBeam`; softer, warm-white version in Pixar).

**My Dorm**
- 3D dorm, 360 view, editable room, private dorm chat; parents see live. Starts in the Pixar style when in Pixar mode.

**Pixar UI theme**
- `look.js` + `pixar-ui.css` applied to all 18 pages: warm palette, glossy buttons, pill nav.

## Testing
- Normal school: 18/18 pages load cleanly; Pixar build 18/18 (headless Chromium, software rendering).
- CI green on the merge commit (includes security fix #12).

## Not verified / known gaps
- No real-GPU or phone performance testing.
- Pixar look not visually checked on news, open door, parent, newsdesk, index, or dorm/avatar preview in Pixar mode.
- Reef, Rome and space field trips not screenshotted.
- No beam on field trip or open door.
- 2D high-school/adult skirt patterns missing.
- Arrival at the auditorium door, picked-class path and Skip were not tested.
- Supabase-backed flows (cloud mail, kid sign-in, Newsroom posting) not tested end to end through the UI.
- `demo/dist/bundle.js` grew about 0.7 MB; Pixar code also ships in the normal build.

## Your to-do
- Rotate the Supabase secret key (never used by me).
- Delete stray empty `/modes.mjs` at the filesystem root.
- Optionally drop `public.zz_scratch_kid_logins_unused`.
- Decide whether to delete `unify-academy-live`, and whether Standard needs the /api functions.
