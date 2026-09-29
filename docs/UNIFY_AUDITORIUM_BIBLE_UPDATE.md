# UNIFY AUDITORIUM-LECTURE MODEL — BIBLE UPDATE

All classrooms are now lecture auditoriums. Same curriculum, different architecture & NPC behavior.

---

## 1. AUDITORIUM ARCHITECTURE & SCALE

**Room dimensions:** 14–16 tiles wide × 11–13 tiles deep (larger than traditional classrooms).

**Seating capacity:** 40–60 student NPCs per auditorium (filled on lesson start; NPCs leave when user enters if no spare seats).

**Stepped seating rows:**
- Row 1 (front): 8–10 seats, 0.5 tile raised
- Row 2: 10–12 seats, 1.0 tile raised
- Row 3: 12–14 seats, 1.5 tiles raised
- Row 4 (rear): 14–16 seats, 2.0 tiles raised
- Row 5 (optional tall): 16–18 seats, 2.5 tiles raised (high school / college auditoriums only)

**Vertical rise between rows:** ~24–28 px per row (visual height, not tile grid height).

**Seat spacing:** ~1.25–1.5 tile width per seat horizontally; ~0.8 tile depth per row.

**Aisles:** central aisle 2 tiles wide for circulation; side aisles 1 tile each (optional).

---

## 2. STAGE & PRESENTATION ZONE

**Stage platform:**
- Raised 0.75–1.0 tile above floor
- 6–8 tiles wide × 3–4 tiles deep
- Stairs/ramp at front-center; gentle slope ~12–15° or step-down with 3–4 steps

**Stage elements (all on raised platform):**
- Teacher podium/desk: center-left or center-right, 85–100 px wide
- Projection screen: center-back, 200–280 px wide × 140–160 px tall
  - White bezel frame 8–12 px; can display 2D lesson props or 3D model renders
  - Top-mounted or recessed into back wall
- Large whiteboard: 150–200 px wide × 100–120 px tall, left or right of screen
- Demo table/station: optional, 1.2×0.9 tile, for hands-on props or interactive models

**Lighting rigs:**
- Theater grid ~80–120 px above stage floor (simulated via shadow direction)
- Three visible spotlights or track lights (left, center, right) mounted on black beam
- Fixtures cast warm pools (soft yellow #F8D977 at ~8% opacity) on stage area

**Back wall:**
- Tall (300–350 px apparent height) to contain stage area
- Color: soft white #FFF9F0 or soft gray #F5F7F4
- Texture: subtle vertical ribbing or acoustic panels (1–2 px light lines, 20 px apart)
- Upper section above screen: vertical pipes/columns (see below)

---

## 3. COLUMNS & HARRY POTTER AESTHETIC

**Column style:** Bright, light, architectural grace—not dark dungeons.

**Design:**
- 4–8 tall slender columns: 40–60 px wide, 280–380 px tall (reaching 60–80% of wall height)
- Round or octagonal: `border-radius: 20–30px` on visible faces
- Fluted surfaces: 4–6 subtle vertical grooves (~1 px light line + shadow), 12–18 px apart
- Capital (top): decorative carved band 12–16 px tall; light ornamental detail
- Base: 8–12 px plinth, slightly wider than column shaft
- Color: light cream #FFF9F0 with `#DDAA68` (Light Oak) for shadow/groove detail
- Outline: 2 px `#9A653D` (Oak Shadow)
- Soft drop shadow: `#596267` at 12–18% opacity, blur 4–6 px

**Placement:**
- 2 columns front-stage corners (frame the stage opening)
- 2 columns at mid-wall (visual anchors)
- 2 columns rear-corners (optional, for larger auditoriums)

**Lighting on columns:** upper third lighter (highlight from above stage lights), lower third shadow gradient from floor.

---

## 4. FLOOR, WALLS & GENERAL ARCHITECTURE

**Floor:**
- Flat polished wood (#DDAA68 Light Oak) with subtle grain texture or stripe pattern
- Transition zone from stage to seating: slight tonal shift (~2% darker) to define zones
- Aisles: same material, continuous (no hard edge; just width shift)

**Walls (side & front non-stage):**
- Upper wall: soft white #FFF9F0
- Mid-wall: soft gray #F5F7F4 or pale yellow wash (3–5% opacity)
- Lower wall (wainscot): light oak #DDAA68 or ivory #F7EEDF panel band 40–50 px tall
- Baseboard: 5–7 px, oak shadow #9A653D

**Lighting:** global upper-left/northwest at ~45° (consistent with entire school). Shadows cast lower-right/southeast.

---

## 5. SEATING, DESKS & INTERACTIVE PROPS

**Student seats (per row):**
- Chair: 30–38 px seat width, 48–58 px total height (smaller than standalone; part of continuous row)
- Shared armrest/desk combo per 1–2 seats; or individual cantilever desks attached to row frame
- Desk surface: 48–65 px wide × 28–36 px deep; white, pale blue, or soft oak
- Color variation: row 1 pale blue (#8FC9E8), row 2 soft yellow (#F8D977), row 3 mint (#A9DCC0), row 4+ sage (#88B89A)
- Seat frame: metal or wood edges, light gray/oak finish

**Teacher station (stage podium):**
- 85–100 px wide × 40–50 px deep
- Height: 40–46 px (standing height)
- Finish: oak or walnut, subtle panel detail
- Surface: space for notes, water bottle, interactive stylus (if touch-screen enabled)
- Small cubbies/shelves for props

**Interactive props (stage area, can swap per lesson):**
- Math manipulatives on demo table (base-ten blocks, fraction circles, algebra tiles, calculators)
- ELA reference books/evidence boards on side shelf
- Science models (3D printed or rendered): molecular models, anatomy, geometric solids
- Props sit on 0.9×0.6 tile surfaces; ~30–40% scale of real furniture

---

## 6. PROJECTION SCREEN & 3D/2D VISUAL AIDS

**Screen hardware:** white bezel, center-back of stage; 200–280 px wide × 140–160 px tall.

**Display content (dynamically swapped per lesson):**

**2D overlays (raster layers on screen):**
- Math: coordinate grids, function graphs, multiplication arrays, fraction models, geometry constructions
- ELA: text passages, annotation templates, vocabulary word walls, literary devices
- Science: diagrams, labeled anatomies, process flows, data charts
- History: maps, timelines, primary source facsimiles

**3D interactive models (Babylon.js / Three.js renderings, castable to screen):**
- Math: rotating polyhedra, function graphs (3D), coordinate system
- Science: molecular structures (rotating), anatomy layers (toggle organs), ecosystems
- History: buildings/monuments (rotate/pan), artifacts (zoom detail)
- Tech: circuits, code visualization

**Interaction modes:**
- Lesson-driven auto-play: model rotates slowly during instruction
- Touch/click-controlled: pause and rotate; select components for focus
- Student interaction: raise hand → user or NPC moves to stage to manipulate
- Annotations overlay: pen/highlight on screen (teacher demo)

---

## 7. NPC BEHAVIOR & SEATING DYNAMICS

**Student NPC baseline behavior:**
- Sit quietly during lesson (default seat)
- Hands raised when prompted (15–25% of class)
- Turn to listen to speaker (facing stage)
- Take notes (occasional writing gesture, ~5 frames every 2–3 sec)
- Look at screen during demonstration
- Walk to seat on lesson start; leave seat when user enters (if no spare seats)

**Teacher NPC behavior:**
- Stand at podium or stage-center
- Point to board/screen during instruction (6-frame point cycle)
- Circulate stage (walk 2–3 tile arcs)
- Write on whiteboard (8-frame animation)
- Make eye contact with class (head turns ~10° side-to-side, 2 sec cycle)
- Gesture while teaching (varied arm positions, 4–6 frames)

**NPC leaving logic:**
- When user enters auditorium with no spare seats:
  1. Identify students in rear rows (lower visual priority)
  2. Trigger walk-out animation toward door (3–5 sec)
  3. Remove from scene; update seat availability
  4. Limit to 1–3 NPCs leaving per entry (avoid abrupt emptying)

**Hallway NPCs:** unchanged (walk to class, use lockers, carry books).

---

## 8. PALETTE & LIGHTING

**Auditorium accents (subject-specific):**
- Math: blue (#4F91C7) + gold (#EAB94E)
- ELA: sage (#88B89A) + coral (#F28F7E)
- Science: aqua (#A9DDF2) + green (#5E9C72)
- History: gold (#EAB94E) + terracotta (#C98569)
- Technology: deep blue (#326C9E) + aqua (#A9DDF2)
- Art: coral (#F28F7E) + lavender (#B8A8DA) + gold (#EAB94E)

**Accent placement:**
- Trim on seating rows (front face, 2–3 px line or 1-tile band)
- Pillow detail on stage floor or front edge
- Podium surface or decorative stripe
- Column base accent ring

**Theater lighting effect:**
- Directional light from upper-left (stage lights)
- Warm pool (#F8D977 @ 6–8% opacity) on stage area
- Cooler ambient fill (#A9DDF2 @ 2–3% opacity) on seating
- Shadow under each seat (contact shadow, #596267 @ 15%, ellipse 45–55% seat width, 10–12% height)

---

## 9. ASSET MANIFEST ADDITIONS

```
/public/assets/unify/

  auditorium/
    stage_platform.png
    stage_stairs.png
    projection_screen_bezel.png
    whiteboard_large.png
    podium_oak.png
    podium_surface.png
    demo_table.png
    
  seating/
    row_frame_blue.png
    row_frame_yellow.png
    row_frame_mint.png
    row_frame_sage.png
    seat_individual_blue.png
    seat_individual_yellow.png
    desk_cantilever_white.png
    armrest_shared_oak.png
    
  columns/
    column_fluted_full.png
    column_capital.png
    column_base.png
    
  lighting/
    spotlight_rig.png
    light_pool_warm.png
    light_pool_cool.png
    
  props/ (interactive)
    demo_table_with_props.png
    
  theater_effects/
    shadow_stage.png
    shadow_row.png
    highlight_stage.png
```

**Curriculum-specific screen content:**
```
screens/
  math/coordinate_grid.png
  math/function_graph.png
  math/array_model.png
  
  ela/vocabulary_wall.png
  ela/text_passage.png
  
  science/molecular_structure.png (3D model list)
  science/anatomy_layers.png (3D model list)
```

---

## 10. NPC DEFINITIONS FOR AUDITORIUM

```typescript
export interface AuditoriumNPC {
  id: string;
  role: "student" | "teacher";
  gridX: number;
  gridY: number;
  seatRow: 1 | 2 | 3 | 4 | 5;       // seating row (1=front, 5=rear)
  seatColumn: number;                 // position within row
  initialState: "sit" | "walk-to-seat" | "stand-teach";
  behavior: "listen" | "take-notes" | "raise-hand" | "teach";
  removableOnUserEntry: boolean;      // can leave if no spare seats
}
```

---

## 11. LAYERING & DEPTH SORTING (AUDITORIUM)

```typescript
export const LAYERS = {
  FLOOR: 0,
  STAGE_PLATFORM: 5,
  REAR_WALL: 10,
  COLUMNS_BACK: 12,
  WALLS_SIDE: 15,
  SEATING_ROWS_FAR: 20,
  LARGE_FURNITURE: 30,
  WHITEBOARD: 35,
  PROJECTION_SCREEN: 37,
  SEATING_ROWS_NEAR: 40,
  DEMO_PROPS: 45,
  CHARACTERS_FAR: 50,      // far-back rows
  CHARACTERS_MID: 60,      // mid rows
  CHARACTERS_NEAR: 70,     // front rows & stage
  COLUMNS_FRONT: 75,
  FOREGROUND_PROPS: 80,
  INTERACTION_UI: 100
} as const;

// Depth calculation:
// Base layer × 10000 + (grid Y descending) × 100 + grid X
// This ensures rows closer to viewer (higher Y in isometric world) render on top
```

---

## 12. PROJECTION SCREEN RENDERING

**Structure:**
- SVG/Canvas layer for 2D overlays (text, graphs, annotations)
- Babylon.js or Three.js viewport for 3D models
- Single stage canvas, swappable content per lesson domain

**Interactivity:**
- Touch/mouse on screen triggers interaction context
- 3D model: rotate, zoom, toggle layers
- 2D content: highlight, pan, reveal annotations
- Teacher can click to advance or students can interact (raise hand)

**Example: Math lesson (fractions)**
```
Screen displays: 3D rotating fraction circles (numerator/denominator)
Interaction: click circle → select fraction; drag → change value
Display: animated bar shows equivalent fractions
```

---

## 13. CURRICULUM VISUAL STATE & SWAPPABLE PROPS

**Lesson-driven auditorium updates:**

```typescript
export function resolveAuditoriumAssets(s: CurriculumVisualState): {
  screenContent: string;        // screen asset path
  demoProps: string[];          // items on demo table
  boardOverlay: string;         // whiteboard content
  accentColor: string;          // row accent + details
} {
  const d = s.domain.toLowerCase();
  const g = s.grade;
  
  if (s.subject === "math") {
    if (g === "K" || [1,2].includes(g as number)) {
      if (d.includes("fraction"))
        return {
          screenContent: "screens/math/fraction_circles_3d.model",
          demoProps: ["math_fraction_circle", "math_fraction_bar"],
          boardOverlay: "board/math/fraction_label",
          accentColor: "#EAB94E"
        };
    }
    if ([3,4,5].includes(g as number)) {
      if (d.includes("coordinate"))
        return {
          screenContent: "screens/math/coordinate_plane.png",
          demoProps: ["math_coordinate_graph", "math_ruler"],
          boardOverlay: "board/math/axes_label",
          accentColor: "#4F91C7"
        };
    }
    // ... etc for each grade/domain combo
  }
  
  if (s.subject === "ela") {
    if (d.includes("vocabulary"))
      return {
        screenContent: "screens/ela/wordwall_interactive.png",
        demoProps: ["ela_vocabulary_cards"],
        boardOverlay: "board/ela/vocab_template",
        accentColor: "#F28F7E"
      };
  }
  
  return {
    screenContent: "screens/default.png",
    demoProps: [],
    boardOverlay: "",
    accentColor: "#DDAA68"
  };
}
```

---

## 14. INTERACTION SYSTEM (AUDITORIUM)

**Valid interactions:**

| Object | Interaction | Outcome |
|--------|-------------|---------|
| Seat | sit | user takes seat; NPC leaves if needed |
| Projection screen | view | display lesson content |
| 3D model on screen | tap/drag | rotate/interact; linked to lesson domain |
| Whiteboard | view | read current lesson note |
| Podium | approach | contextual label "Teacher station" |
| Stage floor | walk | free movement; cannot interrupt teacher |
| Demo table | hover | show available props for this lesson |
| Raised hand (NPC) | look at | brief dialogue or gesture |

**Collision & interaction zones:**
- Seats have narrow entry zones (1 tile wide at row front)
- Stage is accessible by stairs/ramp only; direct walk blocked
- Aisles are primary pathways (no seat collision)
- Screen is view-only (no collision)

---

## 15. BUILD ORDER (AUDITORIUM MODEL)

1. Implement auditorium stage + seating grid layout in isometric projection
2. Build one-row visual (seats, chairs, armrests, floor)
3. Add columns, lighting rigs, theater effects (shadows & pools)
4. Integrate projection screen (static content first)
5. Replace player with human avatar; place in seat
6. Add teacher NPC with contextual stage behaviors (stand, point, write)
7. Add student NPCs in rows (sitting, listening, hand-raising)
8. Wire NPC seating dynamics (entry → leave if full)
9. Connect screen swapping to lesson domain (2D & 3D content)
10. QA on phone & desktop; verify perspective consistency
11. Expand to second auditorium (different subject/grade)

---

## 16. FINAL CHECKLIST (AUDITORIUM)

- ✓ Stepped seating clearly visible in isometric projection
- ✓ Raised stage with stairs/ramp (not just a flat platform)
- ✓ Projection screen readable and distinctly mounted
- ✓ Large whiteboard visible; teacher can write on it
- ✓ 4–8 tall columns with architectural detail; not plain cylinders
- ✓ Theater lighting visible (spotlights, warm pools, shadows)
- ✓ NPCs fill 80–90% of seats on lesson start
- ✓ NPCs leave smoothly when user enters (if no seats)
- ✓ Teacher positioned on stage; acts like teacher (not student)
- ✓ Students in varied rows; seated, listening, hands raised
- ✓ Screen content changes per lesson domain
- ✓ 3D model on screen is interactive (rotate/zoom)
- ✓ Floor, walls, palette match Bible accent colors
- ✓ Shadows consistent (upper-left light, lower-right shadows)
- ✓ No visible collision boxes; no debug geometry
- ✓ At close zoom, details remain distinct (not collapsed rectangles)

---

## 17. DEFINITION OF DONE (AUDITORIUM FIRST MILESTONE)

One auditorium classroom with stepped seating, raised stage, projection screen, 40+ student NPCs, teacher NPC, theater lighting, 2D & 3D lesson content, and functional seating dynamics (NPCs leave when user enters) must look like a finished illustrated game scene. User can sit, watch lesson, interact with 3D models on screen, and move freely in aisles. Hallway remains functional. Do not expand campus until this meets production visual quality.
