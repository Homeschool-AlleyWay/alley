/** Classroom extras: low bookcases with instanced coloured spines, an aquarium with animated swimmers, student art, night light pools, patterned row runners.
 *  Merged / instanced so the whole set costs about 12 draw calls. */
import * as THREE from "three";
import { QuadBatch, BoxBatch, posterAtlas, atlasUV, rugPattern, glowTex } from "../hall3d/decor";
import { Mood, Gfx } from "../hall3d/mood";

export interface RoomIn { X0: number; X1: number; Z0: number; Z1: number; WALL: number; groundY: (z: number) => number; rowH: (r: number) => number; rowZ: (r: number) => number; ROWS: number; XS: number[]; ceilPanels: [number, number][] }
const hash = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };

export function buildClassExtras(S: THREE.Scene, R: RoomIn) {
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 1, ...o });
  const G = new THREE.Group(); G.name = "details"; S.add(G); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  const put = (im: THREE.InstancedMesh, i: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { q.setFromEuler(e.set(rx, ry, rz)); im.setMatrixAt(i, m4.compose(v.set(x, y, z), q, sc.set(sx, sy, sz))); };

  /* ---- low bookcases under the left windows: wooden frame (merged) + instanced books whose spines follow the mood ---- */
  const frame = new BoxBatch(), cases = [1.0, 7.8], books: { x: number; y: number; z: number; h: number; t: number; tilt: number; c: number }[] = [];
  const bc = ["#4F91C7", "#E07A66", "#88B89A", "#EAB94E", "#B8A8DA", "#F28F7E", "#8173AE", "#6DB085", "#EAA5B2"];
  for (const z of cases) {
    const x = R.X0 + 0.34; frame.box(x, 0.55, z, 0.46, 1.1, 2.0, "#C98B4D").box(x + 0.02, 0.06, z, 0.5, 0.12, 2.04, "#9A653D").box(x + 0.02, 1.12, z, 0.52, 0.05, 2.08, "#EDE2CF");
    for (let sh = 0; sh < 3; sh++) { const y = 0.1 + sh * 0.33; frame.box(x + 0.02, y + 0.02, z, 0.44, 0.03, 1.94, "#9A653D"); let zz = z - 0.93; for (let k = 0; k < 40 && zz < z + 0.9; k++) { const t = 0.07 + hash(k, sh + z) * 0.08, h = 0.18 + hash(sh, k + z) * 0.11; if (hash(k, z + sh * 3) < 0.1) { zz += 0.12; continue; } books.push({ x: x + 0.05, y: y + 0.035 + h / 2, z: zz + t / 2, h, t, tilt: hash(k, 9) < 0.06 ? 0.25 : 0, c: Math.floor(hash(k * 3, sh + z) * 9) }); zz += t + 0.006; } }
  }
  G.add(frame.mesh(std({ vertexColors: true })));
  const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 1, 1), std({}), books.length), bcols = books.map((b) => b.c);
  books.forEach((b, i) => put(bm, i, b.x, b.y, b.z, b.tilt, 0, 0, 1, b.h, b.t)); bm.castShadow = false; bm.receiveShadow = true; bm.frustumCulled = false; Gfx.detail(bm); G.add(bm);
  const paintBooks = () => { bcols.forEach((c, i) => bm.setColorAt(i, c % 5 === 4 ? Mood.accent : c % 5 === 3 ? Mood.accent2 : col.set(bc[c]))); if (bm.instanceColor) bm.instanceColor.needsUpdate = true; }; paintBooks();

  /* ---- student art + a subject poster on the right wall (one atlas quad batch + kraft frames) ---- */
  const pq = new QuadBatch(), pf = new BoxBatch(); [[-8.0, 4], [-6.6, 5], [-5.2, 7], [-3.8, 6], [-2.4, 8]].forEach(([z, cell], i) => { const y = 3.55 + (i % 2) * 0.12, h = 1.15, w = h * 0.75; pq.quad(R.X1 - 0.17 - 0.045, y, z, -Math.PI / 2, w, h, atlasUV(cell)); pf.box(R.X1 - 0.17 - 0.005, y, z, 0.05, h + 0.12, w + 0.12, "#9A653D"); });
  G.add(pq.mesh(Mood.tinted(std({ map: posterAtlas(), vertexColors: true }), "wash", 0.5)), pf.mesh(std({ vertexColors: true }), false));

  /* ---- aquarium on a cabinet, right wall near the front: glass tank, plants, animated fish (instanced) and bubbles ---- */
  const az = -4.1, ax = R.X1 - 0.42, ab = new BoxBatch();
  ab.box(ax, 0.42, az, 0.62, 0.84, 2.3, "#C98B4D").box(ax, 0.86, az, 0.7, 0.05, 2.4, "#EDE2CF").box(ax, 1.78, az, 0.66, 0.05, 2.34, "#3b2f33").box(ax + 0.31, 1.3, az, 0.04, 0.86, 2.2, "#4f9fc8").box(ax, 0.9 + 0.1, az, 0.58, 0.1, 2.2, "#E8D7B0");
  for (let i = 0; i < 7; i++) { const pz = az - 0.9 + i * 0.3, ph = 0.25 + hash(i, 3) * 0.3; ab.box(ax + 0.12, 1.0 + ph / 2, pz, 0.03, ph, 0.05, i % 2 ? "#3F9B6B" : "#5CB382", 0, (hash(i, 4) - 0.5) * 0.4); }
  ab.box(ax - 0.1, 1.08, az + 0.5, 0.26, 0.2, 0.3, "#8a6a4a"); ab.box(ax - 0.1, 1.2, az + 0.5, 0.2, 0.06, 0.22, "#9a7a5a");
  G.add(ab.mesh(std({ vertexColors: true }), false));
  const water = Mood.lit(new THREE.MeshStandardMaterial({ color: "#9fdcf2", emissive: "#4fb8e0", emissiveIntensity: 0.25, transparent: true, opacity: 0.34, roughness: 0.15, depthWrite: false }), 0.4, 0.22);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.78, 2.2), water); tank.position.set(ax - 0.01, 1.35, az); G.add(tank);
  const fishN = 7, fb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), std({}), fishN), ft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.1, 4), std({}), fishN), fc = ["#F2A03D", "#E07A66", "#F8D977", "#8FC9E8", "#F28F7E", "#EAB94E", "#B8A8DA"];
  fc.forEach((c, i) => { fb.setColorAt(i, col.set(c)); ft.setColorAt(i, col.set(c).multiplyScalar(0.85)); }); fb.frustumCulled = ft.frustumCulled = false; G.add(fb, ft);
  const bub = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(8 * 3), 3)), new THREE.PointsMaterial({ color: "#e6f8ff", size: 0.05, transparent: true, opacity: 0.8, depthWrite: false })); bub.frustumCulled = false; G.add(bub);
  const swim = (t: number) => {
    for (let i = 0; i < fishN; i++) {
      const sp = 0.25 + hash(i, 1) * 0.3, u = (t * sp * 0.3 + hash(i, 2) * 6.28) % 6.28, zz = az + Math.sin(u) * 0.8, yy = 1.3 + Math.sin(u * 2.3 + i) * 0.22 + (hash(i, 5) - 0.5) * 0.2, xx = ax - 0.12 + Math.sin(u * 1.7 + i) * 0.1, tz = Math.cos(u) >= 0 ? -1 : 1;
      fb.setMatrixAt(i, m4.compose(v.set(xx, yy, zz), q.identity(), sc.set(0.7, 1, 1.7 + hash(i, 6) * 0.6)));                                   // body: a long ellipsoid along z
      q.setFromEuler(e.set(-tz * Math.PI / 2, 0, 0)); ft.setMatrixAt(i, m4.compose(v.set(xx, yy, zz + tz * (0.1 + Math.sin(t * 9 + i) * 0.01)), q, sc.set(1, 1, 1)));   // tail behind it, wagging
    }
    fb.instanceMatrix.needsUpdate = ft.instanceMatrix.needsUpdate = true;
    const pa = bub.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < 8; i++) { const k = (t * 0.25 + i / 8) % 1; pa.setXYZ(i, ax + 0.08 + Math.sin(i * 7 + t) * 0.03, 1.0 + k * 0.7, az - 0.7 + (i % 4) * 0.45); } pa.needsUpdate = true;
  };
  swim(0);

  /* ---- patterned runner down each row aisle (merged, one quad per row) ---- */
  const rt = rugPattern("#7F6FB0", "#EAB94E", "#F8D977"); rt.repeat.set(1, 1);
  const rq = new QuadBatch(); for (let r = 0; r < R.ROWS; r++) { const z = R.rowZ(r), d = 1.9; rq.flat(0, R.rowH(r) + 0.016, z - 0.05, 1.4, d); }
  const rm = rq.mesh(Mood.tinted(std({ map: rt, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), "accent", 0.35));
  G.add(rm);

  /* ---- warm light pools under the ceiling panels at night ---- */
  const pm = Mood.glowing(new THREE.MeshBasicMaterial({ map: glowTex(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), 0.7);
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), pm, R.ceilPanels.length); pools.frustumCulled = false; Gfx.detail(pools);
  R.ceilPanels.forEach(([x, z], i) => put(pools, i, x, R.groundY(z) + 0.04, z, 0, 0, 0, 6.2, 1, 6.2)); G.add(pools);

  Mood.onChange(paintBooks); let bi = 0;
  return {
    tick(t: number) {
      if (!Gfx.reduced && ++bi % 2 === 0) swim(t);
      pools.visible = !Gfx.low && Mood.glow > 0.03;
    },
  };
}
