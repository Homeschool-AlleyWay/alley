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
