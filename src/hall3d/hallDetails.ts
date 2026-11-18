/** Hallway interior detail + live bulletin boards. Everything repeated is merged or instanced (about 40 extra draw calls), colours follow Mood, glow pools and instanced props drop out in low graphics. */
import * as THREE from "three";
import { W, H, BLOCKS, DOORS, ENTRANCE, NEWS, PROPS, LOCKERS } from "./campus";
import { aoStrips } from "../shared/polish";
import { QuadBatch, BoxBatch, posterAtlas, atlasUV, rugPattern, checkerTex, glowTex, starTex, bannerStripeTex, tex } from "./decor";
import { Mood, Gfx } from "./mood";
import { Feed, drawBoardCanvas, drawMarquee, eventNotes, postNotes, sortedPosts, bannerText, type FeedData } from "./boards";
import { cardShadowTex } from "./textures";
import { isPixar } from "../shared/look";

export interface HallIn { wins: { x: number; y: number; z: number; rot: number }[]; doors: { x: number; z: number; rot: number; col: string }[]; benches: { x: number; z: number; rot: number }[] }
const hash = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
const nrm = (rot: number) => [Math.sin(rot), Math.cos(rot)] as const;       // outward (into the room) normal of a wall card
const OUTER = 0.17;                                                          // how far wall cards stand off the wall

export function buildHallDetails(S: THREE.Scene, inp: HallIn) {
  const G = new THREE.Group(); G.name = "details"; S.add(G); const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 1, ...o });
  const gx = (x: number) => x - W / 2, gz = (z: number) => z - H / 2;

  /* ---- baked-feeling ambient occlusion: soft dark gradients where the floor meets blocks, lockers and the outer walls (two draw calls) ---- */
  const rc = (r: { x: number; y: number; w: number; h: number }) => ({ x0: gx(r.x), z0: gz(r.y), x1: gx(r.x + r.w), z1: gz(r.y + r.h) });
  aoStrips(G, BLOCKS.map((b) => rc(b.rect)), { width: 1.5, opacity: 0.4 }); aoStrips(G, LOCKERS.map((l) => rc(l.rect)), { width: 0.8, opacity: 0.32 });
  aoStrips(G, [{ x0: -W / 2, z0: -H / 2, x1: W / 2, z1: H / 2 }], { width: 1.8, opacity: 0.36, inward: true });

  /* ---- posters + student art + clocks (one atlas, one draw call) and their kraft frames (one more) ---- */
  const atlas = posterAtlas(), pq = new QuadBatch(), frames = new BoxBatch(), trim = new BoxBatch();
  const put = (x: number, y: number, z: number, rot: number, cell: number, h = 1.2) => { const w = cell === 10 ? h : h * 0.75, [nx, nz] = nrm(rot); pq.quad(x + nx * (OUTER + 0.045), y, z + nz * (OUTER + 0.045), rot, w, h, atlasUV(cell)); frames.box(x + nx * (OUTER + 0.005), y, z + nz * (OUTER + 0.005), w + 0.12, h + 0.12, 0.05, cell === 10 ? "#F7ECD6" : "#9A653D", rot); };
  const cellFor = (i: number) => [4, 0, 5, 8, 1, 6, 2, 9, 7, 3, 11][i % 11];
  type Spot = { x: number; z: number; rot: number; k: number };
  const spots: Spot[] = []; let pi = 0;
  for (let k = 0; k < 8; k++) {                                                                      // outer walls: x or z = 7 + 6k, between the windows
    const g = 7 + 6 * k;
    if (Math.abs(g - 28) > 3.4 && Math.abs(g - 19) > 1.4) spots.push({ x: gx(g), z: -H / 2, rot: 0, k });                                      // north (newsroom door, boards and clock keep clear)
    if (g < ENTRANCE.gap.x0 - 1.5 || g > ENTRANCE.gap.x1 + 1.5) spots.push({ x: gx(g), z: H / 2, rot: Math.PI, k });                                // south (entrance)
  }
  for (let k = 0; k < 6; k++) { const g = 8 + 6 * k; if (Math.abs(g - 22) > 2.4) spots.push({ x: -W / 2, z: gz(g), rot: Math.PI / 2, k }); spots.push({ x: W / 2, z: gz(g), rot: -Math.PI / 2, k }); }
  const sconces: { x: number; y: number; z: number; rot: number }[] = [], bann: { x: number; z: number; rot: number }[] = [];
  spots.forEach((s, i) => {
    put(s.x, 3.0, s.z, s.rot, s.x === gx(19) && s.rot === Math.PI ? 10 : cellFor(pi++));
    const [nx, nz] = nrm(s.rot), tx = Math.cos(s.rot), tz = -Math.sin(s.rot);
    if (s.k % 2) { for (const sd of [-1, 1]) if (hash(i, sd) < 0.9) bann.push({ x: s.x + tx * sd * 1.45, z: s.z + tz * sd * 1.45, rot: s.rot }); }       // a banner either side of every other poster
    else sconces.push({ x: s.x + nx * 0.2, y: 3.9, z: s.z + nz * 0.2, rot: s.rot });                                                                     // a lamp above the rest
  });
  put(gx(9), 3.0, H / 2, Math.PI, 10, 1.0);                                                           // an extra wall clock on the south wall
  for (const b of BLOCKS) {                                                                         // block faces: posters between the windows
    const r = b.rect; if (r.w < 8) continue; const door = DOORS.find((d) => d.subject === b.subject)!;
    for (const [f, rot] of [["N", Math.PI], ["S", 0], ["E", Math.PI / 2], ["W", -Math.PI / 2]] as const) {
      const len = f === "N" || f === "S" ? r.w : r.h, n = Math.round(len / 4.6);
      for (let k = 1; k < n; k++) {
        const t = k / n, x = f === "E" ? r.x + r.w : f === "W" ? r.x : r.x + r.w * t, z = f === "N" ? r.y : f === "S" ? r.y + r.h : r.y + r.h * t, onDoor = f === door.face;
        if (onDoor && Math.abs(x - door.cx) < 3.0) continue;
        // block faces point away from the block: S faces +z (rot 0), N faces -z (rot PI), E faces +x (rot PI/2), W faces -x (rot -PI/2)
        put(gx(x), onDoor ? 3.3 : 3.05, gz(z), rot, cellFor(pi++), onDoor ? 1.0 : 1.2);
      }
    }
  }
  const posterMat = Mood.tinted(std({ map: atlas, vertexColors: true }), "wash", 0.5);
  G.add(pq.mesh(posterMat), frames.mesh(std({ vertexColors: true }), false));

  /* ---- curtains (3 gathered strips per side) + rods, door pilasters and lintels, ceiling-height light strip ---- */
  const curt = new QuadBatch(), cc = ["#F28F7E", "#EAB94E", "#8FC9E8", "#B8A8DA", "#A9DCC0"], shade = new THREE.Color();
  inp.wins.forEach((w, i) => {
    const [nx, nz] = nrm(w.rot), tx = Math.cos(w.rot), tz = -Math.sin(w.rot), base = new THREE.Color(cc[Math.floor(hash(i, 7) * 5)]);   // w.x/z are the window card's own position (already off the wall)
    for (const sd of [-1, 1]) for (let f = 0; f < 3; f++) {
      shade.copy(base).multiplyScalar(f === 1 ? 0.8 : 1.0); const off = sd * (0.62 + (f - 1) * 0.15), d = 0.06 + (f === 1 ? 0.02 : 0);
      curt.quad(w.x + tx * off + nx * d, w.y, w.z + tz * off + nz * d, w.rot, 0.16, 2.15, [0, 0, 1, 1], shade);
    }
    trim.box(w.x + nx * 0.08, w.y + 1.12, w.z + nz * 0.08, 1.95, 0.05, 0.05, "#9A653D", w.rot);
  });
  G.add(curt.mesh(std({ vertexColors: true, side: THREE.DoubleSide })));
  for (const d of inp.doors) { const [nx, nz] = nrm(d.rot), tx = Math.cos(d.rot), tz = -Math.sin(d.rot); const col = new THREE.Color(d.col).multiplyScalar(0.85);
    for (const sd of [-1, 1]) trim.box(d.x + tx * sd * 1.28 + nx * 0.1, 1.75, d.z + tz * sd * 1.28 + nz * 0.1, 0.2, 3.5, 0.14, col, d.rot);
    trim.box(d.x + nx * 0.1, 3.58, d.z + nz * 0.1, 2.8, 0.2, 0.14, col, d.rot); }
  G.add(trim.mesh(std({ vertexColors: true })));
  const strip = new BoxBatch(), SY = 4.1;
  strip.box(0, SY, -H / 2 + 0.06, W, 0.1, 0.06, "#fff").box(0, SY, H / 2 - 0.06, W, 0.1, 0.06, "#fff").box(-W / 2 + 0.06, SY, 0, 0.06, 0.1, H, "#fff").box(W / 2 - 0.06, SY, 0, 0.06, 0.1, H, "#fff");
  const stripMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: "#FFF4DC" }), stripBase = new THREE.Color("#FFF4DC"), stripWarm = new THREE.Color("#FFC870");
  G.add(strip.mesh(stripMat, false));

  /* ---- hanging banners in the school colours (tinted by the mood accent) ---- */
  const bt = bannerStripeTex(), b1 = new QuadBatch(), b2 = new QuadBatch();
  bann.forEach((b, i) => { const [nx, nz] = nrm(b.rot); (i % 2 ? b2 : b1).quad(b.x + nx * (OUTER + 0.04), 3.3, b.z + nz * (OUTER + 0.04), b.rot, 0.62, 1.85, [0, 0, 1, 1]); trim.box(b.x + nx * (OUTER + 0.05), 4.18, b.z + nz * (OUTER + 0.05), 0.76, 0.05, 0.05, "#9A653D", b.rot); });
  G.add(b1.mesh(Mood.tinted(std({ map: bt, vertexColors: true }), "accent", 1)), b2.mesh(Mood.tinted(std({ map: bt, vertexColors: true }), "accent2", 1)));

  /* ---- rugs and floor patterns ---- */
  const flat = (m: THREE.Material, w: number, d: number, x: number, z: number, y = 0.02, geo?: THREE.BufferGeometry) => { const g = geo ?? new THREE.PlaneGeometry(w, d); if (!geo) g.rotateX(-Math.PI / 2); const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.receiveShadow = true; G.add(me); return me; };
  const rugM = (a: string, b: string, c: string, rx: number, ry: number) => { const t = rugPattern(a, b, c); t.repeat.set(rx, ry); return Mood.tinted(std({ map: t, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), "accent", 0.35); };
  flat(rugM("#F3D9A8", "#C2456B", "#8FC9E8", 3, 2), 12, 7, gx(14), gz(22)); flat(rugM("#CDE8DA", "#4F91C7", "#EAB94E", 3, 2), 12, 7, gx(42), gz(22));
  const ringT = tex(512, 512, (c) => { c.translate(256, 256); const R = 256; for (const [r, col] of [[1, "#8E7CC3"], [0.95, "#F7ECD6"], [0.88, "#EAB94E"], [0.8, "#F28F7E"], [0.72, "#F7ECD6"], [0.52, "#88B89A"]] as const) { c.fillStyle = col; c.beginPath(); c.arc(0, 0, R * r, 0, 7); c.fill(); } for (let i = 0; i < 16; i++) { c.save(); c.rotate(i * Math.PI / 8); c.fillStyle = i % 2 ? "#4F91C7" : "#fff"; c.beginPath(); c.moveTo(R * 0.56, 0); c.lineTo(R * 0.67, -14); c.lineTo(R * 0.78, 0); c.lineTo(R * 0.67, 14); c.closePath(); c.fill(); c.restore(); } });
  const fc = PROPS.find((p) => p.kind === "fountain")!;
  flat(Mood.tinted(std({ map: ringT, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), "accent", 0.2), 0, 0, gx(fc.x), gz(fc.y), 0.02, new THREE.CircleGeometry(4.7, 48).rotateX(-Math.PI / 2));
  const ck = checkerTex("#F28F7E", "#FFF3D8", 8); ck.repeat.set(4, 1.5); flat(Mood.tinted(std({ map: ck, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), "accent", 0.3), 8, 3, 0, gz(H - 3.4));

  /* ---- plants (instanced pots + foliage), bench cushions in accent colours ---- */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  const set = (im: THREE.InstancedMesh, i: number, x: number, y: number, z: number, ry = 0, s: [number, number, number] = [1, 1, 1]) => { q.setFromEuler(e.set(0, ry, 0)); im.setMatrixAt(i, m4.compose(v.set(x, y, z), q, sc.set(s[0], s[1], s[2]))); };
  const pl: [number, number][] = [[1.5, 1.5], [W - 1.5, 1.5], [1.5, H - 1.5], [W - 1.5, H - 1.5], [22.8, H - 1.4], [33.2, H - 1.4], [23.2, 1.5], [32.8, 1.5], [1.4, 19.4], [1.4, 24.6], [W - 1.4, 19.4], [W - 1.4, 24.6]];
  const pots = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.26, 0.5, 10), std({}), pl.length), leaf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.46, 0), std({ flatShading: true }), pl.length), leaf2 = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.3, 0), std({ flatShading: true }), pl.length);
  const greens = ["#5E9C72", "#88B89A", "#3F7655", "#6DB085"], potCols = (i: number) => (i % 2 ? Mood.accent2 : Mood.accent);
  pl.forEach(([x, z], i) => { set(pots, i, gx(x), 0.25, gz(z), 0); set(leaf, i, gx(x), 0.98, gz(z), i, [1, 1.25, 1]); set(leaf2, i, gx(x) + 0.22, 1.5, gz(z) - 0.1, i * 2, [1, 1.1, 1]); leaf.setColorAt(i, col.set(greens[i % 4])); leaf2.setColorAt(i, col.set(greens[(i + 1) % 4])); });
  const recolour = () => { pl.forEach((_, i) => pots.setColorAt(i, potCols(i))); if (pots.instanceColor) pots.instanceColor.needsUpdate = true; cush.forEach((_, i) => cushions.setColorAt(i, i % 2 ? Mood.accent2 : Mood.accent)); if (cushions.instanceColor) cushions.instanceColor.needsUpdate = true; };
  const cush: number[] = []; inp.benches.forEach(() => cush.push(0, 1, 2));
  const cushions = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.13, 0.5), std({}), cush.length);
  inp.benches.forEach((b, bi) => { for (let k = 0; k < 3; k++) { const lz = (k - 1) * 0.6, c = Math.cos(b.rot), s = Math.sin(b.rot); set(cushions, bi * 3 + k, b.x + 0.02 * c + lz * s, 0.62, b.z - 0.02 * s + lz * c, b.rot + (k - 1) * 0.08); } });
  for (const im of [pots, leaf, leaf2, cushions]) { im.castShadow = true; im.receiveShadow = true; Gfx.detail(im); G.add(im); }
  Mood.onChange(recolour); recolour();

  /* ---- sconces (instanced), their halos and the floor light pools under sconces and lamp posts ---- */
  const lampPos: { x: number; z: number; r: number }[] = PROPS.filter((p) => p.kind === "lamp").map((p) => ({ x: gx(p.x), z: gz(p.y), r: 2.6 }));
  const lampMat = Mood.lit(std({ color: "#FFF1D0", emissive: "#FFB867" }), 1.3, 0.35), gt = glowTex();
  const sc3 = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 10, 8), lampMat, sconces.length), halo = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5, 1.5), Mood.glowing(new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), 0.9), sconces.length);
  sconces.forEach((s, i) => { set(sc3, i, s.x, s.y, s.z, 0, [1, 1.3, 1]); set(halo, i, s.x, s.y, s.z + 0.01, s.rot); });
  const poolSpots = [...sconces.map((s) => { const [nx, nz] = nrm(s.rot); return { x: s.x + nx * 1.1, z: s.z + nz * 1.1, r: 2.8 }; }), ...lampPos];
  const poolMat = Mood.glowing(new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), 0.8);
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, poolSpots.length); poolSpots.forEach((p, i) => set(pools, i, p.x, 0.03, p.z, 0, [p.r * 2, 1, p.r * 2])); pools.frustumCulled = false;
  G.add(sc3, halo, Gfx.detail(pools)); halo.frustumCulled = false;
  for (const im of [sc3, halo, pools]) im.instanceMatrix.needsUpdate = true;

  /* ---- trophy cases with sparkles (NW and NE corners) ---- */
  const cab = new BoxBatch(), gold = new THREE.Color("#EAB94E"), sparkPts: number[] = [];
  const trophy = (x: number, y: number, z: number, s: number, tone: number) => { const c = gold.clone().multiplyScalar(0.85 + tone * 0.2); cab.box(x, y + 0.03 * s, z, 0.22 * s, 0.06 * s, 0.22 * s, "#6b4a2a").box(x, y + 0.12 * s, z, 0.05 * s, 0.14 * s, 0.05 * s, c).box(x, y + 0.27 * s, z, 0.2 * s, 0.17 * s, 0.16 * s, c).box(x - 0.13 * s, y + 0.28 * s, z, 0.04 * s, 0.1 * s, 0.04 * s, c).box(x + 0.13 * s, y + 0.28 * s, z, 0.04 * s, 0.1 * s, 0.04 * s, c); };
  for (const [cx, rot] of [[3.4, 0], [W - 3.4, 0]] as const) {
    const x = gx(cx), z = -H / 2 + 0.34, y0 = 0.35;
    cab.box(x, 0.17, z, 1.7, 0.34, 0.6, "#8a5a33").box(x, 2.02, z, 1.7, 0.16, 0.6, "#8a5a33").box(x - 0.82, 1.1, z, 0.06, 1.7, 0.56, "#9A653D").box(x + 0.82, 1.1, z, 0.06, 1.7, 0.56, "#9A653D").box(x, 1.1, z - 0.27, 1.6, 1.7, 0.04, "#F7E3B8");
    for (let sh = 0; sh < 3; sh++) { const sy = y0 + 0.02 + sh * 0.56; cab.box(x, sy, z, 1.6, 0.04, 0.5, "#C9A36B"); for (let t = 0; t < 4; t++) { trophy(x - 0.55 + t * 0.37, sy + 0.02, z, 0.8 + hash(sh, t + cx) * 0.7, hash(t, sh)); sparkPts.push(x - 0.55 + t * 0.37, sy + 0.45, z + 0.12); } }
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.7), new THREE.MeshStandardMaterial({ color: "#d8f1ff", transparent: true, opacity: 0.16, roughness: 0.1 })); gl.position.set(x, 1.1, z + 0.29); G.add(gl);
    const lt = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.6), Mood.glowing(new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }), 0.4, 0.3)); lt.position.set(x, 1.1, z - 0.2); G.add(lt); void rot;
  }
  G.add(cab.mesh(std({ vertexColors: true, metalness: 0.15, roughness: 0.55 })));
  const stars: THREE.Points[] = [0, 1].map((k) => { const pos = new Float32Array(sparkPts.length / 2); for (let i = 0; i < pos.length; i += 3) { const j = (i / 3 * 2 + k) % (sparkPts.length / 3) * 3; pos[i] = sparkPts[j] + (hash(i, k) - 0.5) * 0.3; pos[i + 1] = sparkPts[j + 1] + (hash(i, k + 3) - 0.5) * 0.3; pos[i + 2] = sparkPts[j + 2]; } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ map: starTex(), size: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: "#FFF1B0" })); p.frustumCulled = false; G.add(Gfx.detail(p)); return p; });

  /* ---- live bulletin boards: two beside the Newsroom door and one free-standing on the plaza; a marquee above the door ---- */
  const faceMats: THREE.MeshBasicMaterial[] = [], shT = cardShadowTex();
  const mkBoard = (w: number, h: number, cw: number, ch: number, x: number, y: number, z: number, rot: number, heading: string, notes: (d: FeedData | null) => ReturnType<typeof postNotes>, both = false) => {
    const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false }); faceMats.push(m); const g = new THREE.Group();
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.1, h * 1.12), new THREE.MeshBasicMaterial({ map: shT, transparent: true, opacity: 0.5, depthWrite: false })); sh.position.set(0.03, -0.05, 0); g.add(sh);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); f.position.z = 0.05; g.add(f);
    if (both) { const bk = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); bk.position.z = -0.05; bk.rotation.y = Math.PI; g.add(bk); }
    g.position.set(x, y, z); g.rotation.y = rot; G.add(g);
    const draw = (d: FeedData | null) => { drawBoardCanvas(cv, heading, notes(d)); t.needsUpdate = true; }; Feed.on(draw); draw(Feed.data); return g;
  };
  const posts = (d: FeedData | null) => sortedPosts(d);
  mkBoard(2.3, 1.53, 768, 512, gx(24.6), 3.1, -H / 2 + 0.12, 0, "TODAY & SOON", (d) => eventNotes((d?.events ?? []).slice().sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0)).slice(0, 6)));
  mkBoard(2.3, 1.53, 768, 512, gx(31.4), 3.1, -H / 2 + 0.12, 0, "SCHOOL NEWS", (d) => { const rest = posts(d).slice(6, 12), b = bannerText(d?.settings); return rest.length ? postNotes(rest) : b ? [{ icon: "📣", title: b, sub: "From the office", theme: "sun", accent: "#E8A33D", pinned: true }] : []; });
  const pbX = gx(28), pbZ = gz(30.8);
  { const g = mkBoard(2.7, 1.8, 960, 640, pbX, 1.75, pbZ, 0, "UNIFY BULLETIN", (d) => postNotes(posts(d).slice(0, 6)), true);
    const post = new BoxBatch(); for (const sx of [-1.4, 1.4]) post.box(sx, 1.3, 0, 0.14, 2.6, 0.14, "#9A653D"); post.box(0, 1.75, 0, 2.8, 1.9, 0.08, "#8a5a33").box(0, 2.78, 0.0, 3.1, 0.14, 0.44, "#E07A66");
    const pm = post.mesh(Mood.tinted(std({ vertexColors: true }), "accent", 0.0)); pm.position.set(pbX, 0, pbZ); G.add(pm); void g; }
  let marq!: THREE.CanvasTexture;
  { // Newsroom door marquee: a dark LED screen on the wall above the door, scrolling text (static when motion is reduced)
    const cv = document.createElement("canvas"); cv.width = 2048; cv.height = 256; const mt = new THREE.CanvasTexture(cv); mt.colorSpace = THREE.SRGBColorSpace; mt.wrapS = THREE.RepeatWrapping; mt.repeat.set(0.5, 1); mt.anisotropy = 4;
    const dx = gx(NEWS.cx), bez = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.44, 0.1), new THREE.MeshStandardMaterial({ color: "#2b2b34", roughness: 0.6 })); bez.position.set(dx, 3.97, -H / 2 + 0.2); G.add(bez);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.66, 0.333), new THREE.MeshBasicMaterial({ map: mt, toneMapped: false })); scr.position.set(dx, 3.97, -H / 2 + 0.26); G.add(scr); if (isPixar()) (scr.material as THREE.MeshBasicMaterial).color.setScalar(1.7);   // glowing marquee
    Feed.on((d) => { drawMarquee(cv, d); mt.needsUpdate = true; }); drawMarquee(cv, Feed.data);
    marq = mt;
  }
  void tex;

  const sparkMats = stars.map((s) => s.material as THREE.PointsMaterial); let lastLow = false;
  return {
    tick(t: number, dt: number) {
      const night = Mood.night, dim = 1 - 0.42 * night; for (const m of faceMats) m.color.setScalar(dim);
      stripMat.color.copy(stripBase).lerp(stripWarm, Mood.glow);
      const anim = !Gfx.reduced; if (anim) marq.offset.x = (t * 0.06) % 1;
      sparkMats[0].opacity = anim ? 0.45 + 0.55 * Math.abs(Math.sin(t * 2.1)) : 0.8; sparkMats[1].opacity = anim ? 0.45 + 0.55 * Math.abs(Math.sin(t * 2.1 + 1.6)) : 0.8;
      const low = Gfx.low; if (low !== lastLow) { lastLow = low; } pools.visible = !low && Mood.glow > 0.03; halo.visible = Mood.glow > 0.03; void dt;
    },
  };
}
