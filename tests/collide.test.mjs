// Collision + tree-clearance maths (no browser).  node tests/collide.test.mjs
import { Statics, Crowd } from "../src/shared/collide.ts";
import { placeTree, clearOfWalks, clearance } from "../src/shared/walkways.ts";
let bad = 0; const t = (n, c, v = "") => { console.log((c ? "PASS  " : "FAIL  ") + n + (v ? "  " + v : "")); if (!c) bad++; };
const S = new Statics(); S.addRect(0, 0, 10, 1); S.addCircle(5, 5, 1); S.addBox(-5, 0, 2, 2);
// walls: driving straight into a wall never penetrates, and sliding keeps the tangent motion
let p = { x: 5, z: 3 }; for (let i = 0; i < 200; i++) p = S.slide(p.x, p.z, 0, -0.1, 0.4);
t("stops at wall face + radius", p.z >= 1.4 - 1e-6 && p.z < 1.45, p.z.toFixed(3));
p = { x: 2, z: 2 }; for (let i = 0; i < 40; i++) p = S.slide(p.x, p.z, 0.1, -0.1, 0.4);
t("slides along wall (x advances, z held)", p.x > 4 && p.z >= 1.4 - 1e-6 && p.z < 1.5, `${p.x.toFixed(2)},${p.z.toFixed(2)}`);
p = { x: 5, z: 8 }; for (let i = 0; i < 100; i++) p = S.slide(p.x, p.z, 0, -0.1, 0.4);
t("circle obstacle keeps radius sum", Math.hypot(p.x - 5, p.z - 5) >= 1.4 - 1e-6, Math.hypot(p.x - 5, p.z - 5).toFixed(3));
p = S.push(0.2, 0.5, 0.4); t("pushed out from inside a rect", !S.blocked(p.x, p.z, 0.4));
// fast mover cannot tunnel through a thin wall
const T = new Statics(); T.addRect(-5, -0.05, 5, 0.05); let q = { x: 0, z: 2 }; for (let i = 0; i < 20; i++) q = T.slide(q.x, q.z, 0, -0.9, 0.35); t("no tunnelling through a thin wall", q.z > 0.3, q.z.toFixed(2));
// disabled (open) door lets people through
const D = new Statics(); const did = D.addRect(-1, -0.1, 1, 0.1); let r = { x: 0, z: 1 }; for (let i = 0; i < 20; i++) r = D.slide(r.x, r.z, 0, -0.1, 0.3); t("closed door blocks", r.z > 0.3);
D.setEnabled(did, false); for (let i = 0; i < 20; i++) r = D.slide(r.x, r.z, 0, -0.1, 0.3); t("open door passes", r.z < -0.2, r.z.toFixed(2));
// people never overlap after separation; 120 people in a tight blob
const C = new Crowd(); const bodies = Array.from({ length: 120 }, (_, i) => ({ id: i, x: 10 + (i % 12) * 0.2, z: 10 + Math.floor(i / 12) * 0.2, r: 0.35 }));
for (let it = 0; it < 120; it++) { C.rebuild(bodies); C.separate(0.6); }
let minGap = 9; for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) minGap = Math.min(minGap, Math.hypot(bodies[i].x - bodies[j].x, bodies[i].z - bodies[j].z) - 0.7);
t("120 bodies resolve to no overlap (>= -0.05)", minGap >= -0.05, minGap.toFixed(3));
const t0 = performance.now(); for (let it = 0; it < 200; it++) { C.rebuild(bodies); C.separate(0.6); } t("separation 200 frames of 120 bodies < 250 ms", performance.now() - t0 < 250, (performance.now() - t0).toFixed(0) + "ms");
// two walkers head-on: one waits or goes around, they never overlap
const A = { id: 1, x: 0, z: 0, r: 0.35 }, B = { id: 2, x: 4, z: 0, r: 0.35 }; let overlap = false;
for (let i = 0; i < 400; i++) { const cc = new Crowd(); cc.rebuild([A, B]); for (const [m, dir] of [[A, 1], [B, -1]]) { const v = cc.avoid(m, dir * 0.05, 0); m.x += v.vx; m.z += v.vz; } cc.rebuild([A, B]); cc.separate(0.6); if (Math.hypot(A.x - B.x, A.z - B.z) < 0.7 - 0.06) overlap = true; }
t("head-on walkers never overlap and get past or wait", !overlap && (Math.abs(A.z - B.z) > 0.2 || A.x < B.x), `A(${A.x.toFixed(2)},${A.z.toFixed(2)}) B(${B.x.toFixed(2)},${B.z.toFixed(2)})`);
// avatar vs static + avatar: walker pushed into a pillar by another still cannot enter it
const P2 = new Statics(); P2.addRect(4, -1, 5, 1); const w1 = { id: 1, x: 3.2, z: 0, r: 0.4 }, w2 = { id: 2, x: 2.5, z: 0, r: 0.4 };
for (let i = 0; i < 100; i++) { w2.x += 0.05; const cc = new Crowd(); cc.rebuild([w1, w2]); cc.separate(0.8, P2); }
t("pushed avatar stays out of a wall", !P2.blocked(w1.x, w1.z, 0.4 - 1e-3), w1.x.toFixed(2));
// walkway clearance
const walks = [{ x0: 0, z0: 0, x1: 20, z1: 0, hw: 2 }, { x0: 10, z0: 0, x1: 10, z1: 20, hw: 1.5 }];
t("on-path spot is rejected as is", !clearOfWalks(walks, 5, 1, 0.5));
const spots = [[5, 1], [10, 8], [3, -2], [30, 30], [12, 3]].map(([x, z]) => placeTree(walks, x, z, 0.5)); t("every spot relocates", spots.every(Boolean));
t("relocated trees keep >= 1.2 clearance from path edges", spots.every((s) => clearance(walks, s.x, s.z, 0.5) >= 1.2 - 1e-9), spots.map((s) => clearance(walks, s.x, s.z, 0.5).toFixed(2)).join(","));
import { DoorState, DOOR_READY } from "../src/shared/doors.ts";
const d = new DoorState(); let tReady = -1; d.request(); for (let i = 0; i < 100; i++) { d.update(0.02); if (d.ready && tReady < 0) tReady = i * 0.02; }
t("door is not ready at the start and becomes ready around 0.5-0.7 s", tReady > 0.3 && tReady < 0.9, tReady.toFixed(2) + "s");
let closedAgain = false; for (let i = 0; i < 300; i++) { d.update(0.02); if (d.closed) closedAgain = true; } t("door closes again when nobody is near", closedAgain);
t("ready threshold is 70%", DOOR_READY === 0.7);
process.exit(bad ? 1 : 0);
