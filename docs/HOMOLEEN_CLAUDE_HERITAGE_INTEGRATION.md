# Homoleen Claude/UNIFY heritage integration (November 2026)

Status: **separate review branch; no production replacement**.

Source conversation: https://claude.ai/share/072e2830-478e-4203-9832-99fa6e78de19

The conversation documents auditorium classroom design, 40–60 student NPC seating, detailed character concepts, an age-banded roster, eight-way movement, distinct subject teachers, and a small-town district layout. This is a source of design ideas, **not** a verified new rigged 3D asset pack.

## What is actually built here

- New responsive preview route at /homoleen-heritage-review.html.
- Eight working scene selectors for preserved Pathways architecture, the walkable school, town square, family district, young adult district, 3D classroom, 3D auditorium, and character studio. These open existing local pages in one iframe to reduce concurrent WebGL memory use.
- Deep links use the world’s existing preview=school/town/family/adult and npc=studio parameters, with direct open in a separate tab.
- Photo mode hides this review UI to allow a **real device screenshot**; it does not pretend to take a screenshot or produce a synthetic image.
- Review notes are stored **only on this device** and can be exported as JSON. No student profiles or transcripts are accessed.
- A Netlify build entry and source-level route check.

**Unchanged:** Main campus and live homepage; original Pathways source and character rigs; existing curriculum, teacher interactions, districts, student records, older repositories, deployments and independent open PRs.

## Concept-to-implementation map

| Claude reference | Existing source to keep | Upgrade not yet completed |
|---|---|---|
| Downtown town, school, family condos, young adult area | homoleen-living-world.html | Better high-fidelity buildings, connected travel and mobile GPU screenshots reviewed against the approved art. |
| Auditorium classrooms, stepped seating, projector, stage | docs/UNIFY_AUDITORIUM_BIBLE_UPDATE.md; classroom3d.html; auditorium3d.html | Validate actual hall geometry and lesson delivery together, then remodel without losing current interactive lessons. |
| Cohesive age-banded NPCs with diverse hair and smooth motion | visuals/Pathways_NPC_Art_V2.js; NPC studio; separate NPC PR #15 | Licensed/owned rigged GLB characters, tested on device, replacing placeholder geometry only after approval. |
| Teacher-led Q&A, voice, NPC memory | Current academy classroom and src/hall3d modules | Validate permissions, voice, dialogue safety and true cross-device persistence before claiming production readiness. |

## Review before promotion

1. Visit the new route in a deploy preview. Check all eight scene selectors and the open-full-scene link.
2. Compare **actual** campus, town, classroom, and condo WebGL screenshots against docs/HOMOLEEN_VISUAL_ART_DIRECTION_LOCK.md.
3. Check Android and desktop interaction, FPS, context recovery and photo mode. No blank/blue screens or missing assets.
4. Review original school architecture and final chosen NPC art style side-by-side. Do not substitute boxes/rounded shapes and call them upgraded models.
5. Keep PR #13 and PR #15 independent. Do not merge this preview into the main homepage without visual acceptance and a rollback plan.

Checks: node tools/test_homoleen_heritage.cjs, node tools/test_homoleen_world.cjs, normal Netlify build. This is a source-level integration; **real Android/desktop visual verification is still needed**.

## New Quaternius art choice (user-requested November 15, 2026)

An isolated ninth scene now opens `/homoleen-quaternius-studio.html`. This is **not** a procedural copy: it loads the original Quaternius Universal Base Character free/Standard **male and female rigged glTF models**, and tries real CC0 clips from Quaternius Universal Animation Library via `THREE.AnimationMixer`. It uses the same named humanoid joints and only offers a motion when sufficient tracks match. Android WebGL fidelity must be checked before replacing any existing NPCs.

- Models: https://quaternius.com/packs/universalbasecharacters.html (CC0 as stated on source page).
- Animations: https://quaternius.com/packs/universalanimationlibrary.html (CC0 as stated on source page).
- A pinned open-source mirror provides the free Standard files during isolated preview builds: https://github.com/NafisRayan/Animate-Rigged-Humanoid-No-Blender at commit `5821923af517ac5fdc82505faa92a0d575fc1b1a`.
- Build importer: `tools/import_quaternius_trial.py`; local trial-only assets in published `/quaternius-trial/`. Missing/failed downloads cause **preview build failure** instead of showing fake characters.
- Mixer and studio: `demo/quaternius-studio.ts`, `homoleen-quaternius-studio.html`.
- This preview includes **no Mixamo animation files**. Adobe's FAQ permits use in games, but Adobe community guidance places restrictions on raw asset redistribution. Quaternius's compatible CC0 locomotion library is used first. If Mixamo clips are used later, adapt them privately within the licensed project and do not expose raw files in an asset download feature.
- Models in this Standard download are superhero-style bases; this does **not** yet complete K–2 children, adult staff, outfits, facial expression rigs, or full campus NPC substitution. The original-world art direction lock remains the acceptance standard.

Before promotion: confirm both characters display (including textures and hair), verify Idle/Walk and at least one greeting/seat animation on desktop and Android, check footprint, shadows and collision, inspect real screenshots, and then plan an opt-in NPC integration in a separate PR. **No production change on this branch.**
