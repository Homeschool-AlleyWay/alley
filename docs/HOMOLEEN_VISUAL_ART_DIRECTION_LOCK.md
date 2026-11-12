# Homoleen Academy — Visual Art-Direction Lock
Status: visual baseline / approval criteria. **Not a claim that current WebGL assets achieve this fidelity.**

## Approved reference visual language

Reference images from the user's earlier project:
- **Hamouline Academy Campus Welcome** — lush, cinematic third-person school entrance, purple/gold identity, detailed domed stone campus, mature trees, blossoms, patterned walkways, depth-rich fountain, crowds of expressive students, late afternoon sun.
- **Hamouline Academy Courtyard Encounter** — close conversational framing, expressive characters with rich hair/clothing silhouettes, eye highlights and facial proportions, visible interaction controls.
- Earlier **Homoleen/Hamouline 3D academy concept art** — inhabited pedestrian campus, auditorium, classrooms, museums, district wayfinding, social/family life.

These are **rendered visual concepts**. They are not rigged 3D meshes, texture atlases, animations or complete scene files. Existing procedural Three.js geometry and shaders are NOT equivalent to those references.

## Non-negotiable: protect the current source of truth

- `Pathways Campus (1).html` is the supplied *interactive source baseline*. Preserve its established building layouts, architectural kit, functions, classes and controls.
- The new town, school, family condo and adult districts must extend the *same coherent visual world*: no separate lower-quality box districts.
- Do **not** replace accepted art direction with simple cylinders, duplicated ball hair, rounded block avatars, plain wall panels or empty cubes while claiming more realism.
- No overwrite of the approved playable build until a side-by-side **actual gameplay screenshot** is reviewed for exterior and interior visual quality.
- Keep latest functionality (travel, navigation, Sim, education, town, residential, work, museum, auditorium) intact during upgrades.

## Target visual fidelity

### Architecture
- Individual, recognisable building identities with believable massing: pitched and domed roofs where appropriate, dormers, columns, stepped foundations, shaded colonnades, cornices and roof flashing, detailed glass framing, brick/stone masonry and variation.
- Full PBR texture sets (albedo/base color, normal, roughness, metalness when appropriate, ambient occlusion); consistent texel density; no plastic-looking flat wall color.
- Actual modeled door recesses, room-depth through windows, fixtures, warm interior light, planting beds, garden walls, meaningful signage and human-scaled street details.
- Rich environment storytelling: footpaths that genuinely connect destinations, trees/flowers with visual variation, layered distance haze, shadows, reflected light, family/town/school identities.

### Characters
- Each playable and NPC character should use a **professionally modeled rigged glTF/GLB**, not only runtime lathe/spheres, with cohesive anatomy and expressive stylized faces.
- Appropriate head/body proportions per age bracket, proper eyelids/cornea shapes, distinct eyebrows, nose/lips/ears, believable skin shading, layered hair cards/curves, articulated fingers, textured clothing and accessories.
- Smooth idle, walking, sitting, turning, greeting, classroom and conversation animations with calibrated foot placement and collision. Natural NPC timing and behaviors.
- Avatar customization must preview the **same** character mesh/rig that appears in world, at legible scale.
- New character assets must be visibly comparable to the approved concept references before promotion. Changing shader roughness/vertex counts alone does not count as an art-quality upgrade.

### Interiors
- Each building has its *own* room layout (not a repeated 24×20 template), spatial partitioning, windows and sightlines.
- Classroom furniture, art & science materials, library stacks, clinic equipment, café menu/fixtures, cinema seating, auditorium stage, condo kitchen/bath/bedrooms are identifiable at human eye level.
- Character and camera can walk, turn and interact without clipping or colliding with occupied furniture.

### Streets/ambient life
- Connected roads, realistic sidewalks/curbs/crosswalks, driveways, public plazas; bus stops/vehicle parking; walk, car, bike, bus and scenic camera choices visually follow these routes.
- Bystanders, cyclists, buses, street lighting, plants and animations create a living world rather than a scenic empty background.

## Visual acceptance gates before future production deployment

1. **Actually render** on desktop WebGL and Android Chromium (not merely a JS syntax check).
2. Supply four unretouched **real in-game screenshots** at matching angles:
   - Campus front plaza with characters
   - Town Square with café, street and pedestrians
   - Furnished classroom with seated students/teacher
   - Family condo interior with playable character
3. Supply a short real-time gameplay capture of avatar walking, interacting, entering classroom, traveling to town, and entering a condo.
4. Compare those captures to the reference artwork for architecture, character silhouettes, vegetation, lighting, and immersion. No marketing phrases such as "cinematic-quality" without visible proof.
5. Keep a rollback route and preserve original campus code until the new asset replacements have been approved.

## Current state / limitations

- Current project uses mostly procedural Three.js meshes. Even the original Pathways baseline is stylized procedural WebGL, while the beautiful approved images are **concept renders, not shipped 3D assets**.
- A separate `homoleen-pathways-art-preview.html` reinstates the original Pathways architectural builder and original character rig for review; it is **not** the final target fidelity.
- Reaching the approved look requires importing real, optimized, rigged 3D model and texture assets and staging their lighting and animation. Do not call a code-only mesh smoothing pass a finished art restoration.
