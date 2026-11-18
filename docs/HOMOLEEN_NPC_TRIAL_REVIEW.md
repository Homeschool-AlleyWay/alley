# Homoleen / Pathways NPC integration preview — November 13, 2026

## What this branch changes
- Adds an **isolated** `homoleen-npc-trial.html` page copied from the **current** `homoleen-living-world.html` source, including existing Stage 15 architecture and interiors.
- Embeds six original, independent animated GLB characters from Homoleen's Pass 3 model studio: Mila (elementary), Nora (older student), Ms. Brooks (staff), Sam (town), Rae (family), Morgan (adult). They are fictional NPCs, not real students.
- Loads real glTF 2.0 geometry and animation clips with the already-vendored THREE runtime; keeps the normal 27-character Pathways cast untouched.
- Adds a compact **Character animation trial** panel. Choose a character, focus the camera, hide/show trial models, or try Idle, Walk, Wave, and Cheer.
- Updates Netlify's static build manifest to include **only the additional preview page**, and adds a branch build gate `tools/test_homoleen_npc_trial.cjs` verifying each GLB's animation metadata.

## What this does *not* change
- **No edits to** `homoleen-living-world.html`, `index.html`, legacy campus entrypoints, older repos, original GLB sources, student data, or production deployment.
- It does **not** replace the approved visual standard with basic low-poly characters; Pass 3 still has rigid-pivot movements, simplified geometry and no facial performance. This is a working integration bridge for comparison, **not** the visual sign-off candidate.
- It does **not** claim new real multiplayer accounts, school records, true collision-safe NPC pathfinding, Unreal-quality PBR art, skinned retargeting or face tracking.

## How to review
1. Use the **deploy preview for this branch** (if Netlify is configured to create one), then open `/homoleen-npc-trial.html`. If branch deploys are unavailable, build this branch locally with the existing Netlify build command or use the downloadable standalone trial.
2. Choose **Enter 3D world** on the preserved home shell, then open **Character animation trial**.
3. Select Mila/Nora/Ms. Brooks on campus, Sam in Town, Rae near Family Condos, or Morgan by Adult Apartments. Tap **Find in 3D**.
4. Run Idle, Walk, Wave, Cheer; check grounding, leg and shoulder pivot alignment, camera framing, occlusion, draw performance and visual consistency.
5. Capture four **actual** unretouched in-engine screenshots (school plaza, town, classroom, condo) and check Android Chrome performance. Compare with the approved art references **before** any promotion.

## Risk/rollback
- Main site remains unchanged; reverting this preview is as simple as closing the PR or deleting the preview branch.
- Six embedded GLBs add ~1 MB to trial HTML; monitor initial load/memory and replace data URIs with optimized separate GLBs once approved.
- The trial's minimal in-engine GLB reader supports the exported Pass 3 files only; use full GLTFLoader for arbitrary externally authored assets later.
- Tests are structural and do not establish successful WebGL or Android visual QA.
