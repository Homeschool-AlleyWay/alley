# Homoleen Academy — Visual Source

These files are the **actual 3D artwork and rendering code** used by the Pathways-based academy. No substitute image mockups.

## Open the code on your phone

- **Full running world (HTML source):** [homoleen-living-world.html](../homoleen-living-world.html). This is the authoritative version containing the entire academy and its homepage.
- **3D visual code (JS):** [Homoleen_3D_World_Visuals.js](./Homoleen_3D_World_Visuals.js) — campus, town, school, family and adult districts, terrain, roads, vehicles, textured buildings, interiors, NPCs, lighting, cameras, animations, and playable character.
- **NPC visual model source only:** [Pathways_NPC_Art_V2.js](./Pathways_NPC_Art_V2.js) — the sculpted face, flatter eyes, hair geometry, clothing, legs, arms, and animation-compatible rig. Designed to replace the old `makeAvatar` in the world script; **not independently runnable** without its surrounding Pathways helpers.
- **Local vendored 3D engine:** [Three.js](../vendor/homoleen-three.min.js) and [OrbitControls](../vendor/homoleen-orbitcontrols.js).
- **Regression checks:** [tools/test_homoleen_world.cjs](../tools/test_homoleen_world.cjs).

## Interactive visual preview

- [NPC Character Studio](https://newcademy.netlify.app/homoleen-living-world.html?npc=studio) — inspect the very same NPC model construction, zoomed closer, with six different character looks and full-body/face views.
- [Play Homoleen Academy](https://newcademy.netlify.app/) — actual world and homepages.
- [Browser 3D diagnostics](https://newcademy.netlify.app/homoleen-living-world.html?qa=1).

The NPC studio and live world use the **same `makeAvatar` function**; the studio is for inspecting geometry and shading. These are modeled, stylized 3D characters, not motion-captured or photogrammetry scans.

## Make visual edits

Open the full world file and find these symbols:

| System | Main code |
|---|---|
| Material and texture palettes | `TEX`, `M`, `AVM`, `npc2Geo` |
| NPC face and hair | `npc2Head`, `npc2HairCap`, `npc2HairCurtain`, `makeAvatar` |
| Character movement | `animate`, `animateOutsideNPCs`, `simFrame` |
| Original school campus | `SCHOOLS`, `B`, `campus` |
| New district architecture | `districtDetailedBuilding`, `communityStructure` |
| Interiors | `makeInterior`, `stage15InteriorArt`, `s10Decorate` |
| Streets and transit | `roadSegment`, `makeCityBus`, `makeCityCar`, `makeBike` |
| Camera and transport | `flyTo`, `scenicTravel`, `startAmbiance` |
| Character preview | `npc2StudioOpen`, `npc2StudioLooks` |

**Running locally:** Keep `homoleen-living-world.html` at the project root next to the `vendor/` directory, and serve the directory with an ordinary static HTTP server. Opening a raw HTML file on some phones may prevent JavaScript or WebGL from loading correctly.

**Important:** `Homoleen_3D_World_Visuals.js` is a source extraction, not a complete standalone app. To run the complete experience, use `homoleen-living-world.html` with the two vendor scripts.

Current verification is based on the deployment status and browser smoke tests. Exact appearance and frame rate depend on your Android graphics hardware.