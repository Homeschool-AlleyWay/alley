/** The 3D papercut newsroom (three.js). Everything is a flat paper cutout standing at its own depth: each piece is a textured card (rough scissor edge,
 *  lit rim, paper grain) with its own soft drop-shadow card a little behind it, so orbiting the camera makes the layers slide over each other like a
 *  paper theatre. Back wall with a window onto a layered skyline, the big screen that plays the field-report films, a bulletin board with clickable
 *  notes, an anchor desk with two papercut anchors, cameras, plants, lanterns. Unlit materials only (the colours are the paper's). */
import * as THREE from "three";
import { Broadcast } from "./broadcast";
import { PAL, FONT, R, E, P, line, piece, poly, curve, rough, rectPts, ellPts, shade, hsh, clamp, lerp } from "./papercut";
import { dprCap, smallScreen } from "../shared/polish";

export interface NoteItem { id: string; kind: string; title: string; body: string; when?: string; pinned?: boolean }
export type ViewName = "wide" | "screen" | "desk" | "board";
export interface Newsroom {
  broadcast: Broadcast; view: ViewName; setView(v: ViewName): void; setNotes(n: NoteItem[]): void; resize(): void; dispose(): void;
  onNote: ((n: NoteItem) => void) | null; onScreen: (() => void) | null; stats(): { meshes: number; textures: number };
  /** page coordinates of a bulletin note (for tests and automation) */
  notePos(i: number): { x: number; y: number } | null;
}
type C2 = CanvasRenderingContext2D;
type Cut = THREE.Group & { face: THREE.Mesh; shadowMesh: THREE.Mesh | null };
const PPU = smallScreen() ? 40 : 56, OAKHI = "#F1C887";

export function startNewsroom(host: HTMLElement, broadcast: Broadcast): Newsroom {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(dprCap()); renderer.setClearColor(0xeadfcb); host.appendChild(renderer.domElement); renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
  renderer.domElement.setAttribute("aria-label", "UNIFY News newsroom (3D papercut scene)");
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 80), textures: THREE.Texture[] = [], geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [];
  const track = <T extends THREE.Texture>(t: T) => { textures.push(t); return t; };

  /* ------------------------------------------------ cutout factory */
  const cv = (w: number, h: number, ppu: number) => { const c = document.createElement("canvas"); c.width = Math.max(2, Math.ceil(w * ppu)); c.height = Math.max(2, Math.ceil(h * ppu)); return c; };
  const mkTex = (c: HTMLCanvasElement, mip = true) => { const t = track(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (!mip) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; } return t; };
  const plane = (w: number, h: number) => { const g = new THREE.PlaneGeometry(w, h); geos.push(g); return g; };
  const mat = (map: THREE.Texture, o: { transparent?: boolean; color?: number } = {}) => { const m = new THREE.MeshBasicMaterial({ map, transparent: o.transparent ?? true, depthWrite: !(o.transparent ?? true), toneMapped: false, color: o.color ?? 0xffffff }); mats.push(m); return m; };
  /** a shadow canvas from a face canvas: the face's silhouette, blurred (drawn off-canvas with a shadow offset so only the shadow lands) */
  const shadowOf = (face: HTMLCanvasElement, blur: number) => { const pad = Math.ceil(blur * 1.8), s = document.createElement("canvas"); s.width = face.width + pad * 2; s.height = face.height + pad * 2; const g = s.getContext("2d")!; g.shadowColor = "rgba(46,28,38,.62)"; g.shadowBlur = blur; g.shadowOffsetX = s.width; g.drawImage(face, pad - s.width, pad); return { s, pad }; };
  interface CutO { x?: number; y?: number; z?: number; shadow?: number; anchor?: "b" | "c" | "t"; opaque?: boolean; ppu?: number; color?: number; rot?: number; name?: string }
  /** draw order follows each card's depth z (never the camera angle). A paper card standing at depth z. Group origin = bottom-centre (anchor b), centre (c) or top-centre (t). */
  function cut(w: number, h: number, draw: (c: C2, u: number, W: number, H: number) => void, o: CutO = {}): Cut {
    const u = o.ppu ?? PPU, face = cv(w, h, u), g = face.getContext("2d")!; draw(g, u, face.width, face.height);
    const grp = new THREE.Group() as Cut, oy = o.anchor === "c" ? 0 : o.anchor === "t" ? -h / 2 : h / 2;
    const fm = new THREE.Mesh(plane(w, h), mat(mkTex(face), { transparent: !o.opaque, color: o.color })); fm.position.y = oy; const zo = Math.round((o.z ?? 0) * 1000); fm.renderOrder = zo * 2 + 1; grp.add(fm); grp.face = fm; grp.shadowMesh = null;
    const k = o.shadow ?? 1; if (k > 0) {
      const blur = Math.max(4, u * 0.14 * k), { s, pad } = shadowOf(face, blur), sm = new THREE.Mesh(plane(w + (pad * 2) / u, h + (pad * 2) / u), mat(mkTex(s, false)));
      sm.position.set(0.07 * k, oy - 0.1 * k, -0.045 * Math.max(0.6, k)); sm.renderOrder = zo * 2; grp.add(sm); grp.shadowMesh = sm;
    }
    grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0); if (o.rot) grp.rotation.z = o.rot; if (o.name) grp.name = o.name; scene.add(grp); return grp;
  }
  const px = (u: number, v: number) => v * u;   // world units -> pixels
  /** paper grain over a finished card (keeps it from looking flat) */
  const grainTile = (() => { const c = document.createElement("canvas"); c.width = c.height = 96; const g = c.getContext("2d")!, d = g.createImageData(96, 96); for (let i = 0; i < d.data.length; i += 4) { const n = hsh(i, 9), dark = n > 0; d.data[i] = dark ? 70 : 255; d.data[i + 1] = dark ? 48 : 250; d.data[i + 2] = dark ? 40 : 240; d.data[i + 3] = Math.abs(n) * (dark ? 60 : 70); } g.putImageData(d, 0, 0); return c; })();
  /** paper grain over a finished card: only where the card is opaque (source-atop), so cut-out areas stay clear */
  const grain = (c: C2, W: number, H: number, a = 0.5) => { c.save(); c.globalCompositeOperation = "source-atop"; c.globalAlpha = Math.min(1, a * 1.6); const p = c.createPattern(grainTile, "repeat"); if (p) { c.fillStyle = p; c.fillRect(0, 0, W, H); } c.restore(); };
  const lin = (c: C2, x0: number, y0: number, x1: number, y1: number, a: string, b: string) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const wrapText = (c: C2, s: string, maxW: number, maxLines: number) => { const out: string[] = []; let cur = ""; for (const w of s.split(/\s+/)) { const t = cur ? cur + " " + w : w; if (c.measureText(t).width > maxW && cur) { out.push(cur); cur = w; if (out.length >= maxLines) break; } else cur = t; } if (cur && out.length < maxLines) out.push(cur); return out; };

  /* ------------------------------------------------ the set */
  const WALL_W = 30, WALL_H = 9.8, swayers: { g: THREE.Object3D; a: number; s: number; p: number; base: number }[] = [];
  const sway = (g: THREE.Object3D, a: number, s: number, p = Math.random() * 6) => swayers.push({ g, a, s, p, base: g.rotation.z });

  // far sky behind everything, then three layers of skyline seen through the window (they slide as the camera orbits)
  const sky = new THREE.Mesh(plane(80, 34), mat(mkTex((() => { const c = cv(1, 1, 2); c.width = 4; c.height = 256; const g = c.getContext("2d")!; g.fillStyle = lin(g, 0, 0, 0, 256, "#8FC9E8", "#EAF7FC"); g.fillRect(0, 0, 4, 256); return c; })(), false), { transparent: false })); sky.position.set(0, 4, -9); scene.add(sky);
  const skyline = (z: number, col: string, hMin: number, hMax: number, seed: number, y = 0.6, cloud = false) => cut(34, 5, (c, u, W, H) => {
    if (cloud) for (let i = 0; i < 5; i++) { const cx = (i * 7 + 2) * u, cy = H - (3.6 + (i % 2) * 0.5) * u; piece(c, curve(ellPts(cx, cy, 1.9 * u, 0.55 * u, 14)), "#ffffff", { sh: 0, rim: false }); piece(c, curve(ellPts(cx - 0.8 * u, cy + 0.1 * u, 1 * u, 0.5 * u, 12)), "#ffffff", { sh: 0, rim: false }); }
    let x = 0, i = 0; while (x < 34) { const w = 0.9 + hsh(seed, i) * 0.9 + 0.5, hh = hMin + (hsh(seed + 3, i) + 0.5) * (hMax - hMin); R(c, x * u, H - hh * u, w * u, hh * u, col, { sh: 0, rim: false }); if (hh > 2) for (let yy = 0.5; yy < hh - 0.4; yy += 0.55) for (let xx = 0.18; xx < w - 0.3; xx += 0.36) R(c, (x + xx) * u, H - (hh - yy) * u, 0.18 * u, 0.26 * u, "rgba(255,255,255,.55)", { sh: 0, rim: false }); x += w + 0.05; i++; }
  }, { z, y, shadow: 0, ppu: 24, anchor: "b" });
  skyline(-7, shade(PAL.lav, 0.1), 1.2, 3.2, 11, 0.4, true); skyline(-5, PAL.powder, 1, 2.6, 22, 0.2); skyline(-3, PAL.peach, 0.8, 2.0, 33, 0); skyline(-1.6, PAL.mint, 0.5, 1.2, 44, 0);

  // back wall (with a window hole), wainscot, garland
  const HOLE = { x: -5.5, y: 4.3, w: 3.2, h: 3.5 };
  cut(WALL_W, WALL_H, (c, u, W, H) => {
    c.fillStyle = lin(c, 0, 0, 0, H, "#FBF1DD", "#F1EDDD"); c.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 1.05 * u) { c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(x, 0, 0.42 * u, H); c.fillStyle = "rgba(110,120,110,.07)"; c.fillRect(x + 0.42 * u, 0, 0.07 * u, H); }
    grain(c, W, H, 0.45); c.globalCompositeOperation = "destination-out"; c.fillStyle = "#000"; const hx = (WALL_W / 2 + HOLE.x - HOLE.w / 2) * u, hy = H - (HOLE.y + HOLE.h / 2) * u; c.beginPath(); c.roundRect(hx, hy, HOLE.w * u, HOLE.h * u, 0.12 * u); c.fill();
  }, { z: 0, y: 0, shadow: 0, ppu: 28 });
  cut(WALL_W, 1.7, (c, u, W, H) => { c.fillStyle = "#A9CDB8"; c.fillRect(0, 0, W, H); for (let x = 0.4 * u; x < W; x += 2.2 * u) R(c, x, 0.28 * u, 1.9 * u, H - 0.5 * u, "#B9D8C6", { sh: 0.35, rim: true }); R(c, 0, 0, W, 0.2 * u, PAL.gold, { sh: 0.8 }); grain(c, W, H, 0.4); }, { z: 0.05, y: 0, ppu: 28, shadow: 0.7 });
  cut(WALL_W, 0.95, (c, u, W, H) => { c.fillStyle = PAL.cream; c.fillRect(0, 0, W, 0.3 * u); const cols = [PAL.coral, PAL.gold, PAL.powder, PAL.lav]; for (let i = 0; i * 0.6 * u < W; i++) piece(c, curve(rough(ellPts(0.3 * u + i * 0.6 * u, 0.32 * u, 0.3 * u, 0.34 * u, 12), 0.5)), cols[i % 4], { sh: 0, rim: true }); grain(c, W, H, 0.4); }, { z: 0.14, y: 6.55, ppu: 40, shadow: 1 });
  // window: frame + panes, sill, paper curtains
  cut(HOLE.w + 0.5, HOLE.h + 0.5, (c, u, W, H) => { R(c, 0, 0, W, H, PAL.cream, { sh: 0, rim: true }); c.globalCompositeOperation = "destination-out"; c.fillStyle = "#000"; c.fillRect(0.25 * u, 0.25 * u, W - 0.5 * u, H - 0.5 * u); c.globalCompositeOperation = "source-over"; R(c, W / 2 - 0.05 * u, 0.2 * u, 0.1 * u, H - 0.4 * u, PAL.cream, { sh: 0, rim: true }); R(c, 0.2 * u, H / 2 - 0.05 * u, W - 0.4 * u, 0.1 * u, PAL.cream, { sh: 0, rim: true }); grain(c, W, H, 0.4); }, { x: HOLE.x, y: HOLE.y - (HOLE.h + 0.5) / 2, z: 0.09, shadow: 0.8 });
  cut(HOLE.w + 0.9, 0.2, (c, u, W, H) => { R(c, 0, 0, W, H, PAL.oak, { sh: 0, rim: true }); grain(c, W, H, 0.4); }, { x: HOLE.x, y: HOLE.y - HOLE.h / 2 - 0.34, z: 0.3, shadow: 1 });
  for (const sd of [-1, 1]) { const cur = cut(0.9, HOLE.h + 0.3, (c, u, W, H) => { const p: [number, number][] = []; for (let i = 0; i <= 12; i++) p.push([(sd < 0 ? 0 : W) + (sd < 0 ? 1 : -1) * (Math.sin(i * 0.9) * 0.06 * u), (i / 12) * H]); p.push([sd < 0 ? W : 0, H], [sd < 0 ? W : 0, 0]); piece(c, poly(rough(p, 0.5)), PAL.coral, { sh: 0, rim: true }); for (let i = 1; i < 4; i++) line(c, [[i * W / 4, 0.1 * u], [i * W / 4 + 0.05 * u, H - 0.1 * u]], shade(PAL.coral, -0.16), 2); grain(c, W, H, 0.4); }, { x: HOLE.x + sd * (HOLE.w / 2 + 0.05), y: HOLE.y - HOLE.h / 2 - 0.15, z: 0.34, shadow: 1.2, anchor: "b" }); sway(cur, 0.01, 0.8); }

  // big screen: kraft frame + the live canvas
  const SCREEN = { x: 0, y: 4.55, w: 4.8, h: 2.7 }, FR = 0.34;
  cut(SCREEN.w + FR * 2, SCREEN.h + FR * 2, (c, u, W, H) => { piece(c, poly(rough(rectPts(0, 0, W, H), 0.7)), PAL.oak, { sh: 0, rim: true }); R(c, 0.12 * u, 0.12 * u, W - 0.24 * u, H - 0.24 * u, shade(PAL.oak, -0.28), { sh: 0, rim: false }); R(c, 0.2 * u, 0.2 * u, W - 0.4 * u, H - 0.4 * u, PAL.cream, { sh: 0, rim: false }); grain(c, W, H, 0.4); }, { x: SCREEN.x, y: SCREEN.y - SCREEN.h / 2 - FR, z: 0.3, shadow: 1.6, ppu: 48 });
  const sc = document.createElement("canvas"); sc.width = 640; sc.height = 360; const sctx = sc.getContext("2d")!, screenTex = track(new THREE.CanvasTexture(sc)); screenTex.colorSpace = THREE.SRGBColorSpace; screenTex.generateMipmaps = false; screenTex.minFilter = THREE.LinearFilter;
  const screen = new THREE.Mesh(plane(SCREEN.w - 0.1, SCREEN.h - 0.07), mat(screenTex, { transparent: false })); screen.position.set(SCREEN.x, SCREEN.y, 0.4); screen.name = "screen"; scene.add(screen);
  const onAir = cut(1.2, 0.46, (c, u, W, H) => { R(c, 0, 0, W, H, PAL.red, { sh: 0, rim: true }); c.fillStyle = PAL.cream; c.font = `700 ${0.22 * u}px ${FONT}`; c.textAlign = "center"; c.fillText("ON AIR", W / 2, H * 0.68); grain(c, W, H, 0.3); }, { x: 2.0, y: 6.55, z: 0.42, shadow: 0.9, anchor: "c", ppu: 80 });
  cut(1.7, 0.34, (c, u, W, H) => { R(c, 0, 0, W, H, PAL.deep, { sh: 0, rim: true }); c.fillStyle = PAL.cream; c.font = `700 ${0.2 * u}px ${FONT}`; c.textAlign = "center"; c.fillText("UNIFY NEWS", W / 2, H * 0.68); grain(c, W, H, 0.3); }, { x: -1.9, y: 6.55, z: 0.42, shadow: 0.9, anchor: "c", ppu: 80 });

  // bulletin board with clickable notes
  const BOARD = { x: 5.3, y: 4.2, w: 3.6, h: 2.9 };
  cut(BOARD.w, BOARD.h, (c, u, W, H) => { piece(c, poly(rough(rectPts(0, 0, W, H), 0.6)), PAL.oakSh, { sh: 0, rim: true }); const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#D7A66C"); g.addColorStop(1, "#C28E55"); c.fillStyle = g; c.fillRect(0.16 * u, 0.16 * u, W - 0.32 * u, H - 0.32 * u); for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(${90 + (hsh(i, 1) + 0.5) * 80},${50 + (hsh(i, 2) + 0.5) * 50},20,.22)`; c.fillRect((hsh(i, 3) + 0.5) * W, (hsh(i, 4) + 0.5) * H, 1.4, 1.4); } grain(c, W, H, 0.35); }, { x: BOARD.x, y: BOARD.y - BOARD.h / 2, z: 0.12, shadow: 1.3, ppu: 48 });
  cut(2.6, 0.5, (c, u, W, H) => { P(c, [[0.1 * u, 0], [W - 0.1 * u, 0], [W, H / 2], [W - 0.1 * u, H], [0.1 * u, H], [0, H / 2]], PAL.coral, { sh: 0, rim: true }); c.fillStyle = PAL.cream; c.font = `700 ${0.22 * u}px ${FONT}`; c.textAlign = "center"; c.fillText("BULLETIN BOARD", W / 2, H * 0.66); grain(c, W, H, 0.3); }, { x: BOARD.x, y: BOARD.y + BOARD.h / 2 + 0.05, z: 0.2, shadow: 1, ppu: 80 });
  const noteGroup = new THREE.Group(); scene.add(noteGroup); const noteHits: THREE.Mesh[] = []; let noteItems: NoteItem[] = [];
  const NOTE_COL: Record<string, string> = { bulletin: "#F8D977", announcement: "#A9DDF2", story: "#A9DCC0", alert: "#F6B294", event: "#B8A8DA" };
  function setNotes(items: NoteItem[]) {
    noteGroup.children.slice().forEach((ch) => { noteGroup.remove(ch); ch.traverse((o) => { const m = o as THREE.Mesh; if (m.material) (m.material as THREE.Material).dispose(); if (m.geometry) m.geometry.dispose(); }); }); noteHits.length = 0; noteItems = items.slice(0, 6);
    noteItems.forEach((n, i) => {
      const col = i % 3, row = Math.floor(i / 3), nx = BOARD.x + (col - 1) * 1.12, ny = BOARD.y + 0.62 - row * 1.18 - (hsh(i, 5)) * 0.1, rot = hsh(i, 8) * 0.12, paperCol = NOTE_COL[n.kind] ?? NOTE_COL.bulletin;
      const g = cut(1.0, 0.92, (c, u, W, H) => { P(c, [[0, 0], [W, 0.02 * u], [W - 0.02 * u, H], [0.03 * u, H - 0.02 * u]], paperCol, { sh: 0, rim: true }); c.fillStyle = PAL.dark; c.textAlign = "left"; c.font = `700 ${0.115 * u}px ${FONT}`; const ls = wrapText(c, n.title, W - 0.2 * u, 4); ls.forEach((l, k) => c.fillText(l, 0.1 * u, 0.3 * u + k * 0.14 * u)); c.fillStyle = "rgba(49,58,63,.6)"; c.font = `500 ${0.085 * u}px ${FONT}`; c.fillText((n.pinned ? "PINNED  " : "") + n.kind.toUpperCase(), 0.1 * u, H - 0.09 * u); E(c, W / 2, 0.08 * u, 0.06 * u, 0.06 * u, PAL.red, { sh: 0.3, rim: true }); grain(c, W, H, 0.3); }, { x: nx, y: ny - 0.46, z: 0.26 + i * 0.004, shadow: 0.7, anchor: "b", ppu: 120, rot });
      g.face.userData.note = i; noteHits.push(g.face); noteGroup.add(g);
    });
  }

  // floor, rug, desk
  const floorC = cv(30, 16, 22), fg = floorC.getContext("2d")!; for (let i = 0; i < 30; i++) for (let j = 0; j < 16; j++) { fg.fillStyle = (i + j) % 2 ? "#E3F3F9" : "#D3E9F2"; fg.fillRect(i * 22, j * 22, 22, 22); } fg.fillStyle = "rgba(90,120,140,.18)"; for (let i = 0; i <= 30; i++) fg.fillRect(i * 22, 0, 1, floorC.height); for (let j = 0; j <= 16; j++) fg.fillRect(0, j * 22, floorC.width, 1); grain(fg, floorC.width, floorC.height, 0.5);
  const floor = new THREE.Mesh(plane(30, 16), mat(mkTex(floorC), { transparent: false })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 7.6); scene.add(floor);
  const rug = cut(8.4, 4.4, (c, u, W, H) => { E(c, W / 2, H / 2, W / 2 - 3, H / 2 - 3, PAL.gold, { sh: 0, rim: true }); E(c, W / 2, H / 2, W / 2 - 0.2 * u, H / 2 - 0.16 * u, "#9fd0e8", { sh: 0, rim: false }); c.strokeStyle = PAL.coral; c.lineWidth = 0.05 * u; c.beginPath(); c.ellipse(W / 2, H / 2, W / 2 - 0.4 * u, H / 2 - 0.34 * u, 0, 0, 7); c.stroke(); grain(c, W, H, 0.4); }, { x: 0, y: 0.02, z: 1.6, shadow: 0, anchor: "c", ppu: 40 }); rug.rotation.x = -Math.PI / 2;
  const DESK = { w: 8.6, h: 1.35, zFront: 2.3, depth: 1.5 };
  const deskTopC = cv(DESK.w, DESK.depth, 40), dtg = deskTopC.getContext("2d")!; dtg.fillStyle = lin(dtg, 0, 0, 0, deskTopC.height, OAKHI, "#E8C39A"); dtg.fillRect(0, 0, deskTopC.width, deskTopC.height); dtg.fillStyle = "rgba(255,255,255,.35)"; dtg.fillRect(0, deskTopC.height - 5, deskTopC.width, 4); for (let i = 0; i < 24; i++) { dtg.fillStyle = "rgba(154,101,61,.10)"; dtg.fillRect(0, (i + 0.5) * deskTopC.height / 24, deskTopC.width, 1); } grain(dtg, deskTopC.width, deskTopC.height, 0.4);
  const deskTop = new THREE.Mesh(plane(DESK.w, DESK.depth), mat(mkTex(deskTopC), { transparent: false })); deskTop.rotation.x = -Math.PI / 2; deskTop.position.set(0, DESK.h, DESK.zFront - DESK.depth / 2); scene.add(deskTop);
  const deskFront = cut(DESK.w, DESK.h, (c, u, W, H) => { c.fillStyle = lin(c, 0, 0, 0, H, "#E8C39A", "#C98B4D"); c.fillRect(0, 0, W, H); R(c, 0, 0, W, 0.14 * u, OAKHI, { sh: 0, rim: false }); for (let i = 0; i < 4; i++) R(c, (0.3 + i * 1.75) * u, 0.3 * u, 1.55 * u, H - 0.5 * u, "#D9A66D", { sh: 0.5, rim: true }); piece(c, poly(rough(rectPts(W / 2 - 1.25 * u, 0.28 * u, 2.5 * u, 0.7 * u), 0.6)), PAL.coral, { sh: 0.5, rim: true }); c.fillStyle = PAL.cream; c.font = `800 ${0.38 * u}px ${FONT}`; c.textAlign = "center"; c.fillText("UNIFY NEWS", W / 2, 0.78 * u); grain(c, W, H, 0.4); }, { x: 0, y: 0, z: DESK.zFront, shadow: 1.5, opaque: true, ppu: 64 });
  void deskFront;
  // desk props: standing paper sign, mics, mugs, papers
  const mic = (x: number, z: number) => { cut(0.3, 0.9, (c, u, W, H) => { R(c, W / 2 - 0.02 * u, 0.1 * u, 0.04 * u, H - 0.3 * u, PAL.char, { sh: 0, rim: false }); E(c, W / 2, 0.12 * u, 0.12 * u, 0.04 * u, PAL.dark, { sh: 0.2, rim: false }); E(c, W / 2, H - 0.14 * u, 0.1 * u, 0.13 * u, PAL.dark, { sh: 0.4, rim: true }); grain(c, W, H, 0.3); }, { x, y: DESK.h, z, shadow: 0.7, ppu: 80 }); };
  mic(-1.2, 1.9); mic(1.2, 1.9);
  cut(0.36, 0.38, (c, u, W, H) => { R(c, 0.03 * u, 0.02 * u, W - 0.1 * u, H - 0.04 * u, PAL.cream, { sh: 0, rim: true }); c.strokeStyle = PAL.char; c.lineWidth = 3; c.beginPath(); c.arc(W - 0.04 * u, H / 2, 0.09 * u, -1.5, 1.5); c.stroke(); R(c, 0.03 * u, 0.02 * u, W - 0.1 * u, 0.08 * u, PAL.coral, { sh: 0, rim: false }); grain(c, W, H, 0.3); }, { x: -2.1, y: DESK.h, z: 1.7, shadow: 0.7, ppu: 90 });
  cut(0.9, 0.12, (c, u, W, H) => { R(c, 0, H * 0.3, W, H * 0.7, PAL.cream, { sh: 0, rim: true }); R(c, 0.1 * u, 0, W - 0.2 * u, H * 0.5, PAL.sky, { sh: 0, rim: false }); grain(c, W, H, 0.3); }, { x: 2.2, y: DESK.h, z: 1.8, shadow: 0.5, ppu: 80 });
  cut(2.4, 0.9, (c, u, W, H) => { P(c, [[0.1 * u, H], [W - 0.1 * u, H], [W - 0.25 * u, 0], [0.25 * u, 0]], PAL.deep, { sh: 0, rim: true }); c.fillStyle = PAL.cream; c.font = `800 ${0.3 * u}px ${FONT}`; c.textAlign = "center"; c.fillText("UNIFY", W / 2, H * 0.52); c.font = `700 ${0.2 * u}px ${FONT}`; c.fillText("NEWS", W / 2, H * 0.8); grain(c, W, H, 0.3); }, { x: 0, y: DESK.h, z: 1.3, shadow: 0.9, ppu: 70 });

  // anchors (layered paper people)
  interface Spec { name: string; skin: string; hair: string; long: boolean; blazer: string; tie?: string; glasses?: boolean; x: number }
  const SPECS: Spec[] = [{ name: "Maya", skin: "#DFAE87", hair: "#694A38", long: true, blazer: PAL.coral, x: -3.15 }, { name: "Marcus", skin: "#744735", hair: "#28292B", long: false, blazer: PAL.deep, tie: PAL.gold, glasses: true, x: 3.15 }];
  const anchors = SPECS.map((s) => {
    const baseY = 1.0, z = 1.0;
    const hairBack = cut(s.long ? 1.7 : 1.25, s.long ? 2.0 : 1.15, (c, u, W, H) => { piece(c, curve(rough(s.long ? [[0.1, 0], [0.05 * W / u, 1.1], [0.25, 1.75], [W / u / 2, 2.0], [W / u - 0.25, 1.75], [W / u - 0.05, 1.1], [W / u - 0.1, 0], [W / u / 2, 0.25]].map(([a, b]) => [a * u, H - b * u] as [number, number]) : [[0.1, 0.1], [0.05, 0.7], [0.3, 1.1], [W / u / 2, 1.15], [W / u - 0.3, 1.1], [W / u - 0.05, 0.7], [W / u - 0.1, 0.1]].map(([a, b]) => [a * u, H - b * u] as [number, number]), 0.5)), s.hair, { sh: 0, rim: true }); grain(c, W, H, 0.4); }, { x: s.x, y: baseY + (s.long ? 0.95 : 1.62), z: s.long ? z - 0.06 : z + 0.02, shadow: 0.8, ppu: 64 });
    const body = cut(2.2, 1.9, (c, u, W, H) => {
      const Y = (v: number) => H - v * u, X = (v: number) => v * u, pts: [number, number][] = [[0.3, 0], [0.26, 1.2], [0.42, 1.58], [0.8, 1.76], [1.1, 1.8], [1.4, 1.76], [1.78, 1.58], [1.94, 1.2], [1.9, 0]].map(([a, b]) => [X(a), Y(b)]);
      piece(c, curve(rough(pts, 0.6)), s.blazer, { sh: 0, rim: true }); P(c, [[X(0.88), Y(1.8)], [X(1.1), Y(1.25)], [X(1.32), Y(1.8)]], PAL.cream, { sh: 0, rim: false });
      P(c, [[X(0.86), Y(1.8)], [X(1.1), Y(1.22)], [X(0.7), Y(1.1)], [X(0.62), Y(1.62)]], shade(s.blazer, -0.18), { sh: 0, rim: false }); P(c, [[X(1.34), Y(1.8)], [X(1.1), Y(1.22)], [X(1.5), Y(1.1)], [X(1.58), Y(1.62)]], shade(s.blazer, -0.18), { sh: 0, rim: false });
      if (s.tie) P(c, [[X(1.04), Y(1.7)], [X(1.16), Y(1.7)], [X(1.2), Y(1.0)], [X(1.1), Y(0.85)], [X(1.0), Y(1.0)]], s.tie, { sh: 0, rim: false }); else { c.strokeStyle = PAL.gold; c.lineWidth = 2; c.beginPath(); c.arc(X(1.1), Y(1.8), 0.24 * u, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
      piece(c, curve(rough([[0.2, 1.4], [0.5, 1.56], [0.52, 0.4], [0.2, 0.3]].map(([a, b]) => [X(a), Y(b)] as [number, number]), 0.5)), shade(s.blazer, -0.1), { sh: 0, rim: true }); E(c, X(0.36), Y(0.28), 0.14 * u, 0.12 * u, s.skin, { sh: 0, rim: true }); grain(c, W, H, 0.4);
    }, { x: s.x, y: baseY, z, shadow: 1.2, ppu: 64 });
    const arm = cut(0.5, 1.5, (c, u, W, H) => { piece(c, curve(rough([[0.05, 0.05], [0.45, 0.08], [0.42, 1.3], [0.08, 1.3]].map(([a, b]) => [a * u, b * u] as [number, number]), 0.5)), s.blazer, { sh: 0, rim: true }); E(c, 0.25 * u, 1.38 * u, 0.15 * u, 0.15 * u, s.skin, { sh: 0, rim: true }); grain(c, W, H, 0.4); }, { x: s.x + 0.78, y: baseY + 1.52, z: z + 0.06, shadow: 0.8, anchor: "t", ppu: 72 });
    const headDraw = (open: boolean) => (c: C2, u: number, W: number, H: number) => {
      const X = (v: number) => v * u, Y = (v: number) => H - v * u; R(c, X(0.42), Y(0.4), X(0.26), X(0.4), shade(s.skin, -0.1), { sh: 0, rim: false });
      E(c, X(0.1), Y(0.7), 0.07 * u, 0.1 * u, s.skin, { sh: 0, rim: false }); E(c, X(1.0), Y(0.7), 0.07 * u, 0.1 * u, s.skin, { sh: 0, rim: false }); E(c, X(0.55), Y(0.74), 0.43 * u, 0.48 * u, s.skin, { sh: 0, rim: true });
      c.fillStyle = PAL.dark; for (const ex of [0.4, 0.7]) { c.beginPath(); c.ellipse(X(ex), Y(0.72), 0.045 * u, 0.06 * u, 0, 0, 7); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(X(ex - 0.012), Y(0.745), 0.014 * u, 0, 7); c.fill(); c.fillStyle = PAL.dark; }
      c.strokeStyle = shade(s.hair, -0.1); c.lineWidth = Math.max(1.5, 0.025 * u); c.lineCap = "round"; for (const ex of [0.4, 0.7]) { c.beginPath(); c.moveTo(X(ex - 0.07), Y(0.83)); c.lineTo(X(ex + 0.07), Y(0.85)); c.stroke(); }
      c.fillStyle = "rgba(242,143,126,.45)"; for (const ex of [0.3, 0.8]) { c.beginPath(); c.ellipse(X(ex), Y(0.6), 0.07 * u, 0.045 * u, 0, 0, 7); c.fill(); }
      c.strokeStyle = shade(s.skin, -0.28); c.lineWidth = 1.5; c.beginPath(); c.moveTo(X(0.55), Y(0.68)); c.quadraticCurveTo(X(0.58), Y(0.6), X(0.54), Y(0.58)); c.stroke();
      if (open) { c.fillStyle = "#7A3B3B"; c.beginPath(); c.ellipse(X(0.55), Y(0.48), 0.1 * u, 0.075 * u, 0, 0, 7); c.fill(); c.fillStyle = PAL.pink; c.beginPath(); c.ellipse(X(0.55), Y(0.45), 0.06 * u, 0.03 * u, 0, 0, 7); c.fill(); } else { c.strokeStyle = "#7A3B3B"; c.lineWidth = 2; c.beginPath(); c.arc(X(0.55), Y(0.52), 0.1 * u, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
      if (s.glasses) { c.strokeStyle = PAL.char; c.lineWidth = Math.max(1.5, 0.022 * u); for (const ex of [0.4, 0.7]) { c.beginPath(); c.ellipse(X(ex), Y(0.72), 0.11 * u, 0.095 * u, 0, 0, 7); c.stroke(); } c.beginPath(); c.moveTo(X(0.51), Y(0.72)); c.lineTo(X(0.59), Y(0.72)); c.stroke(); }
      grain(c, W, H, 0.35);
    };
    const head = cut(1.1, 1.3, headDraw(false), { x: s.x, y: baseY + 1.68, z: z + 0.04, shadow: 0.9, ppu: 80 });
    const openTex = mkTex((() => { const c = cv(1.1, 1.3, 80); headDraw(true)(c.getContext("2d")!, 80, c.width, c.height); return c; })()), closedTex = (head.face.material as THREE.MeshBasicMaterial).map!;
    const fringe = cut(1.1, 0.7, (c, u, W, H) => { piece(c, curve(rough((s.long ? [[0.06, 0.1], [0.04, 0.45], [0.35, 0.68], [0.8, 0.66], [1.04, 0.45], [1.0, 0.1], [0.85, 0.3], [0.55, 0.42], [0.3, 0.3]] : [[0.1, 0.05], [0.08, 0.4], [0.3, 0.62], [0.6, 0.66], [0.9, 0.55], [1.0, 0.1], [0.9, 0.3], [0.6, 0.38], [0.2, 0.28]]).map(([a, b]) => [a * u, H - b * u] as [number, number]), 0.4)), s.hair, { sh: 0, rim: true }); grain(c, W, H, 0.35); }, { x: s.x, y: baseY + 1.68 + 0.78, z: z + 0.07, shadow: 0.5, ppu: 80 });
    return { s, body, arm, head, fringe, hairBack, openTex, closedTex, baseHeadY: baseY + 1.68, headMat: head.face.material as THREE.MeshBasicMaterial };
  });

  // cameras, plants, lanterns, foreground tabs
  const camera3 = (x: number, flip: number) => { const g = cut(1.9, 2.9, (c, u, W, H) => { const Y = (v: number) => H - v * u; for (const [x0, x1] of [[0.95, 0.15], [0.95, 1.75], [0.95, 0.95]]) line(c, [[x0 * u, Y(1.6)], [x1 * u, Y(0.02)]], PAL.char, 0.07 * u); R(c, 0.3 * u, Y(2.45), 1.3 * u, 0.85 * u, PAL.gray, { sh: 0.6, rim: true }); R(c, 0.38 * u, Y(2.35), 0.9 * u, 0.4 * u, PAL.lgray, { sh: 0, rim: false }); E(c, (flip > 0 ? 1.62 : 0.28) * u, Y(2.05), 0.16 * u, 0.16 * u, PAL.dark, { sh: 0.4, rim: true }); E(c, (flip > 0 ? 1.62 : 0.28) * u, Y(2.05), 0.07 * u, 0.07 * u, PAL.deep, { sh: 0, rim: false }); R(c, 0.42 * u, Y(2.9), 0.7 * u, 0.5 * u, PAL.dark, { sh: 0.5, rim: true }); grain(c, W, H, 0.4); }, { x, y: 0, z: 2.9, shadow: 1.4, ppu: 64 }); sway(g, 0.008, 0.6); return g; };
  camera3(-5.6, -1); camera3(5.6, 1);
  const tally = cut(0.12, 0.12, (c, u, W, H) => { E(c, W / 2, H / 2, W / 2 - 1, H / 2 - 1, PAL.red, { sh: 0, rim: false }); }, { x: 5.6 - 0.3, y: 2.65, z: 2.92, shadow: 0, anchor: "c", ppu: 120 });
  const plant = (x: number, z: number, s: number) => { cut(0.9 * s, 0.8 * s, (c, u, W, H) => { P(c, [[0.05 * u, 0], [W - 0.05 * u, 0], [W - 0.14 * u, H], [0.14 * u, H]], PAL.coral, { sh: 0, rim: true }); R(c, 0.04 * u, 0, W - 0.08 * u, 0.12 * u, shade(PAL.coral, -0.1), { sh: 0, rim: false }); grain(c, W, H, 0.4); }, { x, y: 0, z, shadow: 1, ppu: 80 }); for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.3, lf = cut(0.5 * s, 2.2 * s, (c, u, W, H) => { piece(c, curve(rough([[W / 2, H], [W * 0.95, H * 0.55], [W / 2, 0.02 * u], [W * 0.05, H * 0.55]].map(([a2, b]) => [a2, b] as [number, number]), 0.6)), i % 2 ? PAL.leaf : PAL.dleaf, { sh: 0, rim: true }); line(c, [[W / 2, H * 0.95], [W / 2, 0.1 * u]], shade(PAL.leaf, -0.2), 1.5); grain(c, W, H, 0.35); }, { x: x + (i - 3) * 0.06 * s, y: 0.7 * s, z: z + 0.015 * (i % 4) - 0.02, shadow: 0.5, ppu: 70, rot: -a }); lf.scale.y = 0.65 + (i % 3) * 0.18; sway(lf, 0.04, 1.1 + i * 0.1); } };
  plant(-7.6, 1.1, 1.3); plant(7.8, 1.0, 1.2);
  const lanterns = [[-7.2, 0.6, PAL.gold], [-3.2, 0.9, PAL.coral], [0.0, 0.5, PAL.powder], [3.6, 1.0, PAL.mint], [7.3, 0.7, PAL.lav]].map(([x, z, col], i) => { const ln = cut(0.8, 1.9, (c, u, W, H) => { line(c, [[W / 2, 0], [W / 2, 0.8 * u]], PAL.oakSh, 1.6); E(c, W / 2, H - 0.55 * u, 0.3 * u, 0.4 * u, col as string, { sh: 0, rim: true }); c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 2; c.beginPath(); c.ellipse(W / 2 - 0.08 * u, H - 0.55 * u, 0.09 * u, 0.3 * u, 0, 0, 7); c.stroke(); R(c, W / 2 - 0.12 * u, H - 0.98 * u, 0.24 * u, 0.1 * u, PAL.oakSh, { sh: 0, rim: false }); grain(c, W, H, 0.35); }, { x: x as number, y: 5.6 - (i % 2) * 0.25, z: z as number, shadow: 1.2, anchor: "b", ppu: 64 }); ln.position.y = 5.75 - (i % 2) * 0.25; sway(ln, 0.04, 0.9 + i * 0.13, i * 1.7); return ln; });
  void lanterns;
  for (const sd of [-1, 1]) cut(1.3, 8.6, (c, u, W, H) => { const p: [number, number][] = []; for (let i = 0; i <= 24; i++) p.push([sd < 0 ? W - 0.1 * u + Math.sin(i * 0.7) * 0.12 * u - 0.45 * u : 0.1 * u + 0.45 * u - Math.sin(i * 0.7) * 0.12 * u, (i / 24) * H]); p.push([sd < 0 ? 0 : W, H], [sd < 0 ? 0 : W, 0]); piece(c, poly(rough(p, 0.5)), PAL.coral, { sh: 0, rim: true }); for (let i = 1; i < 3; i++) line(c, [[(sd < 0 ? 0.2 + i * 0.25 : W - 0.2 * u - i * 0.25 * u) , 0], [(sd < 0 ? 0.2 + i * 0.25 : W - 0.2 * u - i * 0.25 * u), H]], shade(PAL.coral, -0.14), 2); grain(c, W, H, 0.35); }, { x: sd * 5.75, y: -0.4, z: 4.4, shadow: 1.6, ppu: 36 });

  /* ------------------------------------------------ camera, views, input */
  const VIEWS: Record<ViewName, { tx: number; ty: number; tz: number; d: number; yaw: number; pitch: number; half: number }> = {
    wide: { tx: 0, ty: 3.2, tz: 0, d: 14.2, yaw: 0, pitch: 0.085, half: 8.0 }, screen: { tx: 0, ty: 4.5, tz: 0, d: 8.6, yaw: 0, pitch: 0.03, half: 2.6 },
    desk: { tx: 0, ty: 2.6, tz: 1.2, d: 10.5, yaw: 0, pitch: 0.12, half: 5.2 }, board: { tx: 5.3, ty: 4.8, tz: 0, d: 8.6, yaw: -0.07, pitch: 0.03, half: 2.7 } };
  const st = { view: "wide" as ViewName, tx: 0, ty: 3.2, tz: 0, d: 14.2, yaw: 0, pitch: 0.085, uYaw: 0, uPitch: 0, uZoom: 1, aspect: 1.78 };
  const goal = () => { const v = VIEWS[st.view], t = Math.tan((camera.fov * Math.PI) / 360), narrow = st.aspect < 0.9; return { ...v, ty: narrow && st.view === "screen" ? 3.8 : v.ty, d: Math.min(Math.max(v.d, v.half / (t * st.aspect)), 5.6 / t) * st.uZoom }; };   // tall phones: never zoom out past the wall (no empty sky or floor)
  let drag: { x: number; y: number; id: number; moved: number } | null = null; const pts = new Map<number, { x: number; y: number }>(); let pinch0 = 0;
  const el = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0 }; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); } });
  el.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) st.uZoom = clamp(st.uZoom * (pinch0 / d), 0.7, 1.15); pinch0 = d; if (drag) drag.moved = 99; return; }
    if (drag && drag.id === e.pointerId) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy); st.uYaw = clamp(st.uYaw - dx * 0.0035, -0.32, 0.32); st.uPitch = clamp(st.uPitch + dy * 0.002, -0.1, 0.14); }
  });
  const up = (e: PointerEvent) => { const was = drag && drag.id === e.pointerId ? drag : null; pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; if (was) { drag = null; if (was.moved < 8) click(e); } };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", (e) => { pts.delete(e.pointerId); drag = null; });
  el.addEventListener("wheel", (e) => { e.preventDefault(); st.uZoom = clamp(st.uZoom * (1 + Math.sign(e.deltaY) * 0.06), 0.7, 1.15); }, { passive: false });
  function click(e: PointerEvent) {
    const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([...noteHits, screen], false)[0]; if (!hit) return;
    if (hit.object === screen) api.onScreen?.(); else { const n = noteItems[hit.object.userData.note as number]; if (n) api.onNote?.(n); }
  }

  /* ------------------------------------------------ loop */
  let alive = true, last = performance.now(), clock = 0, drawAcc = 1, talkUntil = 0, lastIdx = -1, lastId = "";
  const camPos = new THREE.Vector3(), look = new THREE.Vector3();
  const frame = (now: number) => {
    if (!alive) return; requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    broadcast.update(dt); drawAcc += dt; if (drawAcc >= 1 / (smallScreen() ? 20 : 30)) { drawAcc = 0; broadcast.draw(sctx, 640, 360); screenTex.needsUpdate = true; }
    const cur = broadcast.current; if (cur && cur.id !== lastId) { lastId = cur.id; lastIdx = broadcast.idx; talkUntil = clock + 3.6; }
    const g = goal(), k = Math.min(1, dt * 3.2);
    st.tx = lerp(st.tx, g.tx, k); st.ty = lerp(st.ty, g.ty, k); st.tz = lerp(st.tz, g.tz, k); st.d = lerp(st.d, g.d, k); st.yaw = lerp(st.yaw, g.yaw, k); st.pitch = lerp(st.pitch, g.pitch, k);
    const yaw = st.yaw + st.uYaw + Math.sin(clock * 0.18) * 0.012, pitch = st.pitch + st.uPitch;
    look.set(st.tx, st.ty, st.tz); camPos.set(look.x + Math.sin(yaw) * Math.cos(pitch) * st.d, look.y + Math.sin(pitch) * st.d, look.z + Math.cos(yaw) * Math.cos(pitch) * st.d); camera.position.copy(camPos); camera.lookAt(look);
    for (const s of swayers) s.g.rotation.z = s.base + Math.sin(clock * s.s + s.p) * s.a;
    const pulse = 0.7 + 0.3 * Math.sin(clock * 3); (onAir.face.material as THREE.MeshBasicMaterial).color.setScalar(0.8 + 0.2 * pulse); (tally.face.material as THREE.MeshBasicMaterial).color.setScalar(Math.sin(clock * 4) > 0 ? 1 : 0.4);
    anchors.forEach((a, i) => {
      const talking = clock < talkUntil && lastIdx % 2 === i, bob = Math.sin(clock * 1.6 + i * 2) * 0.012, nod = talking ? Math.sin(clock * 3.2) * 0.04 : Math.sin(clock * 0.9 + i) * 0.015;
      a.head.position.y = a.baseHeadY + bob; a.fringe.position.y = a.baseHeadY + 0.78 + bob; a.head.rotation.z = nod - (i ? -0.03 : 0.03); a.fringe.rotation.z = a.head.rotation.z; a.hairBack.rotation.z = a.head.rotation.z * 0.6; a.body.position.y = 1.0 + bob * 0.5;
      const open = talking && Math.sin(clock * 13 + i) > -0.2; a.headMat.map = open ? a.openTex : a.closedTex;
      const wave = talking && i === lastIdx % 2 && clock > talkUntil - 3.0 && clock < talkUntil - 1.6; a.arm.rotation.z = (i ? 1 : -1) * 0 + lerp(a.arm.rotation.z, wave ? 2.5 + Math.sin(clock * 9) * 0.35 : 0.06, Math.min(1, dt * 8));
    });
    renderer.render(scene, camera);
  };
  const resize = () => { const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight); renderer.setSize(w, h, false); st.aspect = w / h; camera.aspect = st.aspect; camera.updateProjectionMatrix(); };
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null; ro?.observe(host); addEventListener("resize", resize); resize();
  setNotes([]); requestAnimationFrame(frame);
  const api: Newsroom = {
    broadcast, get view() { return st.view; }, set view(v: ViewName) { api.setView(v); },
    setView(v) { st.view = v; st.uYaw = 0; st.uPitch = 0; st.uZoom = 1; }, setNotes, resize, onNote: null, onScreen: null,
    stats: () => ({ meshes: scene.children.length, textures: textures.length }),
    notePos(i) { const m = noteHits[i]; if (!m) return null; const v = m.getWorldPosition(new THREE.Vector3()).project(camera), r = renderer.domElement.getBoundingClientRect(); return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }; },
    dispose() { alive = false; ro?.disconnect(); removeEventListener("resize", resize); textures.forEach((t) => t.dispose()); geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); renderer.dispose(); renderer.domElement.remove(); },
  };
  return api;
}
