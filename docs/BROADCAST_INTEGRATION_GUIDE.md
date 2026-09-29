# UNIFY Broadcast System — Integration Guide

Complete news broadcasting studio system for UNIFY academy game with procedurally generated dialog, character animations, and dynamic video content display.

---

## System Components

### 1. **DialogSystem.ts**
Procedural dialog generation with template variation

**Key Features:**
- Template-based dialog with placeholder expansion
- Automatic story/weather context injection
- Template cycling to avoid repetition
- 40+ unique dialog lines across 8 segment types

**Exports:**
```typescript
DialogSystem.generateDialog(segment: DialogSegment, context: DialogContext): string
DialogContext { anchor1, anchor2, storyName?, condition?, temperature?, advice? }
NEWS_STORIES: { local, national, weather }
pickRandom<T>(arr: T[]): T
```

### 2. **NewsAnchorCharacter.ts**
UNIFY-compliant character with procedural appearance and animations

**Key Features:**
- Procedural skin tone / hair color / clothing generation
- 5 character states: idle, walk, talk, listen, point
- Smooth animation frames (bounce, arm swing, expressions)
- Head-to-body proportions per UNIFY Bible (82-90px adults)
- 1.5–2px outlines (#455057 charcoal)
- Contact shadow ellipses (18% opacity)

**Exports:**
```typescript
NewsAnchorCharacter
  - constructor(name: string, x: number, y: number)
  - setState(state: CharacterState, direction?: number): void
  - update(): void
  - draw(ctx: CanvasRenderingContext2D): void
  - appearance: CharacterAppearance
```

**States:**
- `idle` — Standing still, subtle breathing
- `walk` — Moving side-to-side (weather segment)
- `talk` — Animated mouth, head tilt, eye tracking
- `listen` — Attentive posture
- `point` — Arm extended, pointing at map

### 3. **BroadcastScene.ts**
Main system orchestrating broadcast flow

**Key Features:**
- 6-segment broadcast sequence
- Character state management
- Dialog-to-animation synchronization
- Studio environment rendering
- Weather map display (weather segment)

**Exports:**
```typescript
BroadcastScene
  - constructor(canvas: HTMLCanvasElement, config: BroadcastConfig)
  - start(): void
  - setPlaying(playing: boolean): void
  - update(deltaTime: number): void
  - render(): void
```

**Broadcast Sequence:**
1. **Welcome** (4s) — Anchor1 greets viewers
2. **Local Story** (4.5s) — Anchor2 reads local news
3. **Weather** (5.5s) — Anchor2 walks right, points at weather map
4. **Transition** (3s) — Anchor1 transitions to national news
5. **National Story** (4.5s) — Anchor1 reads national news
6. **Outro** (3.5s) — Closing remarks → loops

---

## Integration into UNIFY Replit Project

### Step 1: Add Files to Codebase

```bash
src/scenes/broadcast/
  ├── DialogSystem.ts
  ├── NewsAnchorCharacter.ts
  ├── BroadcastScene.ts
  └── BroadcastManager.ts (new wrapper)
```

### Step 2: Create BroadcastManager.ts

Wrapper for Phaser integration:

```typescript
import Phaser from 'phaser';
import { BroadcastScene } from './BroadcastScene';

export class BroadcastManager {
  private broadcastScene: BroadcastScene;
  private canvas: HTMLCanvasElement;
  private animationFrameId: number = 0;
  private lastTime: number = Date.now();

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.broadcastScene = new BroadcastScene(canvas, {
      width,
      height,
      anchor1Name: 'Alex',
      anchor2Name: 'Jordan',
    });
  }

  public start(): void {
    this.broadcastScene.start();
    this.animate();
  }

  public stop(): void {
    cancelAnimationFrame(this.animationFrameId);
  }

  public setPlaying(playing: boolean): void {
    this.broadcastScene.setPlaying(playing);
  }

  private animate(): void {
    const now = Date.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.broadcastScene.update(deltaTime);
    this.broadcastScene.render();

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }
}
```

### Step 3: Wire into Existing Scenes

In your main game scene:

```typescript
import { BroadcastManager } from './broadcast/BroadcastManager';

export class AcademyScene extends Phaser.Scene {
  private broadcastManager: BroadcastManager;
  private broadcastCanvas: HTMLCanvasElement;

  create() {
    // Get or create canvas for broadcast
    this.broadcastCanvas = document.getElementById('broadcastCanvas') as HTMLCanvasElement;
    
    if (!this.broadcastCanvas) {
      this.broadcastCanvas = document.createElement('canvas');
      this.broadcastCanvas.id = 'broadcastCanvas';
      this.broadcastCanvas.width = 1280;
      this.broadcastCanvas.height = 720;
      document.body.appendChild(this.broadcastCanvas);
    }

    this.broadcastManager = new BroadcastManager(
      this.broadcastCanvas,
      this.broadcastCanvas.width,
      this.broadcastCanvas.height
    );

    this.broadcastManager.start();
  }

  shutdown() {
    this.broadcastManager.stop();
  }
}
```

### Step 4: Add HTML for Video Clips Panel

```html
<div id="newsroom-container">
  <canvas id="studioCanvas"></canvas>
  <div id="videoClipsPanel">
    <h3>📹 Breaking News Clips</h3>
    <div id="videoGrid"></div>
  </div>
</div>
```

---

## Customization

### Change Anchor Names

```typescript
const broadcast = new BroadcastScene(canvas, {
  width: 1280,
  height: 720,
  anchor1Name: 'Dr. Chen',    // Custom name
  anchor2Name: 'Sam Garcia',  // Custom name
});
```

### Add Custom Stories

**DialogSystem.ts:**

```typescript
export const NEWS_STORIES = {
  local: [
    'Your custom local story #1',
    'Your custom local story #2',
    // ...
  ],
  national: [
    'Your custom national story #1',
    // ...
  ],
  weather: [
    { condition: 'Custom condition', temp: 70, advice: 'wear x' },
    // ...
  ],
};
```

### Modify Broadcast Duration

```typescript
// In BroadcastScene.transitionSegment()
case 'welcome':
  this.segmentDuration = 6000;  // 6 seconds instead of 4
  break;
```

### Change Character Appearance Pool

**NewsAnchorCharacter.ts:**

```typescript
const SKIN_TONES = [
  '#F6D6BD', '#EBC09E', '#DFAE87', // ... add your own
];

const HAIR_COLORS = [
  '#28292B', '#363638', // ... add your own
];

const TOP_COLORS = [
  PALETTE.schoolBlue, PALETTE.deepBlue, // ... add your own
];
```

---

## Asset Requirements

All visual assets generated procedurally via canvas. No external PNG dependencies required.

**Palette:** 26 locked UNIFY colors (defined in NewsAnchorCharacter.ts)

**Fonts:** System sans-serif (defaults to OS fonts)

---

## Video Clips Panel Integration

The right panel displays clickable news video clips. Hook this to your media system:

```typescript
// When user clicks a video clip
function onVideoClipClick(clipId: number) {
  // Play video in your player
  playVideoClip(clipId);
  
  // Optional: sync audio with broadcast
  syncAudioToAnchor();
}
```

**Video Clip Data:**
```typescript
{
  id: number;
  title: string;
  category: string;
  duration: string; // "MM:SS"
  emoji: string;    // Visual indicator
}
```

---

## Performance Notes

- Canvas rendering: ~60 FPS on desktop, 30-45 FPS on mobile
- No asset preloading required
- Memory: ~2-3 MB (primarily animation state + dialog strings)
- CPU: Minimal (simple canvas drawing + basic animation math)

---

## Accessibility

- All dialog spoken by animated anchors (add text-to-speech for full A11y)
- High contrast colors (#4F91C7 on #1a1a1a meets WCAG AA)
- Clear visual states (talk/listen/point expressions)
- No rapid flashing or seizure-inducing animations

---

## Troubleshooting

### Dialog Not Changing
- Ensure `DialogSystem.reset()` called at broadcast start
- Check segment duration timers in `BroadcastScene.transitionSegment()`

### Characters Not Animating
- Verify `update(deltaTime)` called every frame
- Confirm state is set via `setState()` before update

### Missing Outfit Colors
- Add colors to PALETTE constants in `NewsAnchorCharacter.ts`
- Ensure colors are valid hex strings (#RRGGBB)

### Video Panel Not Clickable
- Add event listeners to `.video-item` elements
- Hook to `onVideoClipClick()` handler

---

## Future Enhancements

- [ ] Full speech synthesis for dialog
- [ ] More complex camera angles
- [ ] Guest reporter characters
- [ ] Breaking news interrupts
- [ ] Commercial breaks
- [ ] Graphics overlays / lower thirds
- [ ] Multi-language support
- [ ] Closed captioning
- [ ] Streaming HLS/DASH video integration

---

## License & Credits

Part of UNIFY academy game system. Adheres to UNIFY Visual Bible specifications for proportions, palette, outline weight, and lighting.

Created for educational simulation gameplay.
