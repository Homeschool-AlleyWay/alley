/** Head + face: deformed skull with painted skin texture, big layered eyes with lids, brows, nose, ears, mouth rig, beard, earrings. Unit space: head radius 1, face toward +z. */
import * as THREE from "three";
import type { AvatarSpec } from "../../hall3d/avatar";
import type { MatKind, MatOpts, MouthShape } from "../types";
import { V, PI, lerp, clamp, tube, sphereG, mkRng } from "./geo";
import { strandTex } from "./detail";
import { hairlineOf } from "./hair";

export interface Ctx { mat(kind: MatKind, color: string | number, o?: MatOpts): THREE.Material; lod: number; pixar: boolean; track(m: THREE.Material | THREE.Texture): void }
/** mouth: open amount 0..1; mw width scale; mc corner lift (+ smile, - frown); mp pucker (+) or pressed lips (-); brow -1 (frown) .. 1 (raised); squint 0..1 (smile eyes) */
export interface FaceState { blink: number; gx: number; gy: number; mouth: number; mw?: number; mc?: number; mp?: number; brow?: number; squint?: number }
export interface MouthPose { o: number; w: number; c: number; p: number }
/** visemes: the mouth poses setMouth() and the talking loop choose from */
export const VISEMES: Record<MouthShape, MouthPose> = {
  closed: { o: 0, w: 1, c: 0, p: 0 }, small: { o: 0.28, w: 0.95, c: 0, p: 0 }, wide: { o: 0.85, w: 1.12, c: 0.05, p: 0 }, o: { o: 0.55, w: 0.42, c: 0, p: 1 },
  smile: { o: 0.08, w: 1.18, c: 0.18, p: 0 }, frown: { o: 0, w: 0.92, c: -0.26, p: 0 }, mbp: { o: 0, w: 0.9, c: -0.03, p: -1 },
};
/** per-age face proportions (unit head space). Kids: eyes lower, wider-set and larger, small low nose, soft chin, round cheeks. Adults: smaller eyes set higher, longer nose, brow ridge, defined jaw and chin. */
export interface FaceProfile { eyeAz: number; eyeEl: number; eyeS: number; noseEl: number; noseS: number; mouthEl: number; mouthS: number; browS: number; earS: number; jaw: number; chin: number; cheek: number; ridge: number; bridge: number }
const AGEF: Record<string, FaceProfile> = {
  k2: { eyeAz: 0.52, eyeEl: -0.11, eyeS: 1.08, noseEl: -0.34, noseS: 0.82, mouthEl: -0.6, mouthS: 0.92, browS: 0.8, earS: 1.1, jaw: -0.05, chin: 0, cheek: 0.12, ridge: 0, bridge: 0 },
  g35: { eyeAz: 0.5, eyeEl: -0.08, eyeS: 1.0, noseEl: -0.32, noseS: 0.92, mouthEl: -0.58, mouthS: 0.95, browS: 0.9, earS: 1.05, jaw: 0, chin: 0.02, cheek: 0.08, ridge: 0, bridge: 0 },
  g68: { eyeAz: 0.48, eyeEl: -0.06, eyeS: 0.93, noseEl: -0.31, noseS: 1, mouthEl: -0.57, mouthS: 1, browS: 1, earS: 1, jaw: 0.02, chin: 0.05, cheek: 0.04, ridge: 0.15, bridge: 0.25 },
  hs: { eyeAz: 0.46, eyeEl: -0.04, eyeS: 0.85, noseEl: -0.3, noseS: 1.08, mouthEl: -0.56, mouthS: 1.02, browS: 1.1, earS: 0.95, jaw: 0.06, chin: 0.08, cheek: 0, ridge: 0.5, bridge: 0.55 },
  adult: { eyeAz: 0.44, eyeEl: -0.03, eyeS: 0.78, noseEl: -0.3, noseS: 1.14, mouthEl: -0.55, mouthS: 1.05, browS: 1.2, earS: 0.92, jaw: 0.1, chin: 0.12, cheek: 0, ridge: 1, bridge: 0.8 },
};
export function faceProfile(spec: AvatarSpec): FaceProfile {
  const a = AGEF[spec.age] ?? AGEF.hs, b = spec.build === "sturdy" ? 1 : spec.build === "slim" ? -1 : 0;
  return { ...a, jaw: a.jaw + b * 0.06, chin: a.chin + b * 0.02, cheek: Math.max(0, a.cheek + (b > 0 ? 0.03 : 0)) };
}
const FP = { jaw: 0, chin: 0, cheek: 0 };
export interface Face { group: THREE.Group; set(s: FaceState): void; dispose(): void; ax: number; ay: number; az: number; earY: number }

const SHAPES: Record<string, [number, number, number]> = { oval: [1, 1.08, 1], round: [1.07, 1.0, 1.02], long: [0.95, 1.22, 0.98], square: [1.05, 1.04, 1.0], heart: [1.03, 1.06, 1.0] };
export function headScale(shape: string) { return SHAPES[shape] ?? SHAPES.oval; }
function deform(d: THREE.Vector3, shape: string, o: THREE.Vector3) {
  const [ax, ay, az] = headScale(shape); let x = d.x * ax, y = d.y * ay, z = d.z * az;
  if (d.y < 0) {
    const t = -d.y; let k = 1;
    if (shape === "heart") k = 1 - 0.4 * Math.pow(t, 1.25); else if (shape === "oval") k = 1 - 0.14 * Math.pow(t, 1.5); else if (shape === "long") k = 1 - 0.1 * t; else if (shape === "square") { k = 1 + 0.07 * THREE.MathUtils.smoothstep(t, 0.1, 0.45) * (1 - THREE.MathUtils.smoothstep(t, 0.65, 1)); y = d.y * ay * (1 - 0.06 * THREE.MathUtils.smoothstep(t, 0.6, 1)); } else if (shape === "round") k = 1 + 0.04 * Math.sin(t * PI);
    const sm = THREE.MathUtils.smoothstep;
    k *= 1 + FP.jaw * sm(t, 0.15, 0.6) * (1 - sm(t, 0.8, 1));          // jaw width: wider/heavier or narrower
    x *= k; z *= lerp(1, k, 0.6);
    if (d.z > 0) { z *= 1 + FP.chin * sm(t, 0.6, 0.95) * d.z; x *= 1 + FP.cheek * Math.sin(PI * clamp((t - 0.05) / 0.55, 0, 1)); }   // chin projects, cheeks puff
  }
  return o.set(x, y, z);
}
const _d = new THREE.Vector3(), _p = new THREE.Vector3();
function surf(shape: string, az: number, el: number, off = 0, out = new THREE.Vector3()) { _d.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); deform(_d, shape, out); const [ax, ay, azz] = headScale(shape); _p.set(_d.x / (ax * ax), _d.y / (ay * ay), _d.z / (azz * azz)).normalize(); return out.addScaledVector(_p, off); }

const shadeHex = (c: string, l: number, s = 0) => "#" + new THREE.Color(c).offsetHSL(0, s, l).getHexString();

/* ---- textures ---- */
const irisCache = new Map<string, THREE.CanvasTexture>();
function irisTex(c1: string, sclera = "#f7f2ec") {
  const k = c1 + sclera; let t = irisCache.get(k); if (t) return t;
  const cv = document.createElement("canvas"); cv.width = cv.height = 256; const g = cv.getContext("2d")!;
  g.fillStyle = sclera; g.fillRect(0, 0, 256, 256);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 124);
  gr.addColorStop(0, "#000"); gr.addColorStop(0.3, "#050508"); gr.addColorStop(0.33, shadeHex(c1, 0.22, 0.05)); gr.addColorStop(0.55, c1); gr.addColorStop(0.85, shadeHex(c1, -0.12)); gr.addColorStop(0.95, shadeHex(c1, -0.38)); gr.addColorStop(1, shadeHex(c1, -0.42));
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.fillStyle = "#050507"; g.beginPath(); g.arc(128, 128, 40, 0, 7); g.fill();                                   // crisp pupil
  g.strokeStyle = shadeHex(c1, 0.18, 0.05); g.globalAlpha = 0.55; g.lineWidth = 5; g.beginPath(); g.arc(128, 128, 56, 0, 7); g.stroke(); g.globalAlpha = 1;   // collarette ring
  g.save(); g.beginPath(); g.arc(128, 128, 124, 0, 7); g.clip();
  const r = mkRng(7); for (let i = 0; i < 90; i++) { const a = r() * PI * 2, r0 = 40 + r() * 20, r1 = r0 + 30 + r() * 50; g.strokeStyle = r() < 0.5 ? "rgba(255,255,255,.14)" : "rgba(0,0,0,.14)"; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); g.lineTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1); g.stroke(); }
  const sh = g.createRadialGradient(128, 70, 0, 128, 70, 110); sh.addColorStop(0, "rgba(0,0,0,.3)"); sh.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = sh; g.fillRect(0, 0, 256, 256);   // upper-lid shadow on the iris
  g.restore();
  t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; irisCache.set(k, t); return t;
}

function faceCanvas(spec: AvatarSpec, fp: FaceProfile, covered: boolean): HTMLCanvasElement {
  const W = 1024, H = 512, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d")!, sk = spec.skin;
  g.fillStyle = sk; g.fillRect(0, 0, W, H);
  const P = (az: number, el: number): [number, number] => [(0.5 + az / (2 * PI)) * W, (0.5 - el / PI) * H], kx = W / (2 * PI), ky = H / PI;
  const blob = (az: number, el: number, r: number, rgba: string, rgba0: string) => { const [x, y] = P(az, el), rx = (r / Math.max(0.3, Math.cos(el))) * kx, ry = r * ky; g.save(); g.translate(x, y); g.scale(rx, ry); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, rgba); gr.addColorStop(1, rgba0); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore(); };
  const dot = (az: number, el: number, r: number, c: string) => { const [x, y] = P(az, el); g.fillStyle = c; g.beginPath(); g.ellipse(x, y, (r / Math.max(0.3, Math.cos(el))) * kx, r * ky, 0, 0, 7); g.fill(); };
  const r = mkRng(11);
  blob(0, 0.55, 0.5, "rgba(255,255,255,.07)", "rgba(255,255,255,0)");        // forehead highlight
  blob(0, -0.8, 0.3, "rgba(120,50,30,.06)", "rgba(120,50,30,0)");
  // soft form shading: eye sockets, nose + nostril, philtrum, under the lower lip, chin, temples, nasolabial folds (adults)
  const dk = (a: number) => `rgba(120,62,50,${a})`, dk0 = "rgba(120,62,50,0)", ageK = spec.age === "adult" ? 1 : spec.age === "hs" ? 0.75 : spec.age === "g68" ? 0.5 : 0.3;
  for (const s of [-1, 1]) { blob(s * fp.eyeAz, fp.eyeEl, 0.24 * fp.eyeS + 0.04, dk(0.11), dk0); if (fp.ridge > 0.2) blob(s * (fp.eyeAz - 0.02), fp.eyeEl + 0.13 + 0.3 * fp.eyeS, 0.17, dk(0.2 * fp.ridge), dk0);   // brow ridge shadow
    blob(s * 1.0, 0.1, 0.3, dk(0.09), dk0); blob(s * 0.2, fp.noseEl - 0.04, 0.1, dk(0.12 * ageK + 0.06), dk0); if (ageK > 0.6) blob(s * 0.34, fp.mouthEl + 0.14, 0.08, dk(0.12 * ageK), dk0); }
  blob(0, fp.noseEl - 0.13, 0.085, dk(0.24), dk0); blob(0, (fp.noseEl + fp.mouthEl) / 2 + 0.02, 0.05, dk(0.1), dk0); blob(0, fp.mouthEl - 0.12, 0.13, dk(0.15), dk0); blob(0, -0.95, 0.2, dk(0.12), dk0);
  if (!covered) { const hl = hairlineOf(spec.hairStyle); if (hl !== null) { const el = PI / 2 - hl - 0.05, hc = new THREE.Color(spec.hair).multiplyScalar(0.7), rg = (a: number) => `rgba(${Math.round(hc.r * 255)},${Math.round(hc.g * 255)},${Math.round(hc.b * 255)},${a})`; for (let a = -1.3; a <= 1.31; a += 0.16) blob(a, el, 0.2, rg(0.2), rg(0)); } }   // soft hair shadow along the hairline
  if (spec.blush) for (const s of [-1, 1]) blob(s * 0.66, -0.4, 0.22 + fp.cheek * 0.5, "rgba(255,95,115,.5)", "rgba(255,95,115,0)");
  if (spec.eyeShape === "tired") for (const s of [-1, 1]) blob(s * 0.47, -0.27, 0.15, "rgba(110,70,120,.28)", "rgba(110,70,120,0)");
  if (spec.eyeShadow) for (const s of [-1, 1]) blob(s * 0.47, 0.2, 0.2, spec.eyeShadow + "bb", spec.eyeShadow + "00");
  if (spec.freckles) for (let i = 0; i < 26; i++) { const s = r() < 0.5 ? -1 : 1; dot(s * (0.1 + r() * 0.62), -0.12 - r() * 0.28, 0.011 + r() * 0.01, "rgba(150,88,58,.62)"); }
  if (spec.mole) dot(0.5, -0.56, 0.02, "#3a2420");
  if (spec.beard === "stubble") for (let i = 0; i < 700; i++) dot((r() - 0.5) * 2.4, -0.62 - r() * 0.55, 0.006, "rgba(50,35,30,.35)");
  switch (spec.mark) {
    case "dimples": for (const s of [-1, 1]) blob(s * 0.4, -0.58, 0.05, "rgba(130,60,50,.35)", "rgba(130,60,50,0)"); break;
    case "birthmark": blob(-0.72, -0.18, 0.08, "rgba(120,70,45,.7)", "rgba(120,70,45,0)"); break;
    case "bandaid": { const [x, y] = P(0.72, -0.32); g.save(); g.translate(x, y); g.rotate(-0.5); g.fillStyle = "#ecc9a0"; g.fillRect(-34, -13, 68, 26); g.fillStyle = "#dcae82"; g.fillRect(-10, -13, 20, 26); g.restore(); break; }
    case "star": { const [x, y] = P(-0.66, -0.3); g.fillStyle = "#f5c542"; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + (i * PI) / 5, rr = i % 2 ? 11 : 26; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); break; }
    case "paint": for (const s of [-1, 1]) { const [x, y] = P(s * 0.78, -0.3); g.fillStyle = s < 0 ? "#e8456a" : "#4f91c7"; g.beginPath(); g.moveTo(x, y + 14); g.bezierCurveTo(x - 34, y - 8, x - 14, y - 30, x, y - 12); g.bezierCurveTo(x + 14, y - 30, x + 34, y - 8, x, y + 14); g.fill(); } break;
    case "scar": { const [x, y] = P(-0.4, 0.3), [x2, y2] = P(-0.5, -0.12); g.strokeStyle = "rgba(190,110,110,.8)"; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1.5; g.stroke(); break; }
    case "glitter": for (let i = 0; i < 60; i++) { const s = r() < 0.5 ? -1 : 1; dot(s * (0.35 + r() * 0.4), -0.1 - r() * 0.35, 0.007 + r() * 0.008, r() < 0.5 ? "#fff6c0" : "#ffd0f0"); } break;
  }
  return cv;
}

/* ---- builders ---- */
const EYES: Record<string, { ex: number; ey: number; lid: number; iris: number; sparkle?: boolean; lash?: boolean; closed?: "happy" }> = {
  round: { ex: 0.27, ey: 0.29, lid: -1.05, iris: 0.95 }, oval: { ex: 0.22, ey: 0.33, lid: -1.05, iris: 0.92 }, wide: { ex: 0.32, ey: 0.29, lid: -1.05, iris: 0.95 },
  cute: { ex: 0.29, ey: 0.36, lid: -1.1, iris: 1.12, sparkle: true }, tired: { ex: 0.27, ey: 0.27, lid: -0.4, iris: 0.95 }, sleepy: { ex: 0.27, ey: 0.28, lid: -0.62, iris: 0.95 },
  happy: { ex: 0.27, ey: 0.27, lid: 1.25, iris: 0.8, closed: "happy" }, wink: { ex: 0.28, ey: 0.32, lid: -1.1, iris: 0.9, sparkle: true }, lash: { ex: 0.26, ey: 0.32, lid: -1.0, iris: 1.0, lash: true },
};

export function buildFace(c: Ctx, spec: AvatarSpec, hairColor: string): Face {
  const fp = faceProfile(spec); FP.jaw = fp.jaw; FP.chin = fp.chin; FP.cheek = fp.cheek;
  const grp = new THREE.Group(), shape = spec.faceShape, [ax, ay, az] = headScale(shape), M = c.mat, lod = c.lod;
  const owned: THREE.BufferGeometry[] = [], add = (g: THREE.BufferGeometry) => { owned.push(g); return g; };
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, p?: THREE.Object3D) => { const o = new THREE.Mesh(add(g), m); o.castShadow = false; (p ?? grp).add(o); return o; };
  const skinM = M("skin", spec.skin), strand = strandTex().base;
  // skull with face texture
  const covered = ["cap", "beanie", "bucket", "sunhat", "beret", "bandana"].includes(spec.hat);
  const ftex = new THREE.CanvasTexture(faceCanvas(spec, fp, covered)); ftex.colorSpace = THREE.SRGBColorSpace; ftex.wrapS = THREE.RepeatWrapping; ftex.offset.x = 0.25; ftex.anisotropy = 4; c.track(ftex);
  const headM = (skinM as THREE.MeshPhysicalMaterial).clone() as THREE.MeshPhysicalMaterial; headM.map = ftex; headM.color.set(c.pixar ? 0xdcdcdc : 0xffffff); (headM as any).onBeforeCompile = (skinM as any).onBeforeCompile; headM.customProgramCacheKey = skinM.customProgramCacheKey; c.track(headM);
  const SW = lod ? 48 : 24, SH = lod ? 32 : 16, sg = new THREE.SphereGeometry(1, SW, SH), pos = sg.attributes.position, tmp = new THREE.Vector3(), o3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { tmp.fromBufferAttribute(pos, i).normalize(); deform(tmp, shape, o3); pos.setXYZ(i, o3.x, o3.y, o3.z); }
  sg.computeVertexNormals(); const nr = sg.attributes.normal, w = SW + 1; for (let j = 0; j <= SH; j++) { const a = j * w, b = a + w - 1; tmp.set(nr.getX(a) + nr.getX(b), nr.getY(a) + nr.getY(b), nr.getZ(a) + nr.getZ(b)).normalize(); nr.setXYZ(a, tmp.x, tmp.y, tmp.z); nr.setXYZ(b, tmp.x, tmp.y, tmp.z); }
  mesh(sg, headM).castShadow = true;
  const place = (g: THREE.Object3D, az_: number, el: number, off = 0) => { surf(shape, az_, el, off, g.position); g.rotation.order = "YXZ"; g.rotation.y = az_; g.rotation.x = -el; return g; };
  const old = spec.age === "hs" || spec.age === "adult", mid = old || spec.age === "g68";

  /* eyes */
  const ed = EYES[spec.eyeShape] ?? EYES.round, eyeRigs: { lid: THREE.Mesh; ball: THREE.Group; open: number; closedArc: THREE.Object3D; happyArc: THREE.Object3D; closedAlways: boolean }[] = [], brows: { g: THREE.Group; s: number }[] = [];
  const brw = spec.browColor || new THREE.Color(hairColor).multiplyScalar(0.75).getStyle();
  for (const s of [-1, 1]) {
    const eShape = spec.eyeShape === "wink" && s > 0 ? { ...ed, lid: 1.25, closed: "happy" as const } : ed, closedAlways = !!eShape.closed;
    const root = new THREE.Group(); place(root, s * fp.eyeAz, fp.eyeEl, -0.24); grp.add(root);
    const ex = eShape.ex * 1.18 * fp.eyeS, ey = eShape.ey * 1.22 * fp.eyeS, ez = 0.3, ball = new THREE.Group(); ball.scale.set(ex, ey, ez); root.add(ball);
    mesh(new THREE.SphereGeometry(1, lod ? 24 : 12, lod ? 16 : 8), M("eye", "#f7f2ec", c.pixar ? { emissive: "#ffffff", emissiveIntensity: 0.28 } : {}), ball);
    const ci = s > 0 && spec.eyeColor2 ? spec.eyeColor2 : spec.eyeColor, tl = eShape.iris, rc = Math.sin(tl) * 1.012;
    const ig = new THREE.SphereGeometry(1.012, lod ? 28 : 12, lod ? 10 : 4, 0, PI * 2, 0, tl).rotateX(PI / 2), ip = ig.attributes.position, iuv = ig.attributes.uv; for (let i = 0; i < ip.count; i++) iuv.setXY(i, ip.getX(i) / (2 * rc) + 0.5, ip.getY(i) / (2 * rc) + 0.5);
    mesh(ig, M("eye", "#ffffff", { map: irisTex(ci), rough: 0.2 }), ball);
    if (c.pixar) mesh(new THREE.SphereGeometry(1.035, 24, 12, 0, PI * 2, 0, 1.25).rotateX(PI / 2), M("glass", "#ffffff", { opacity: 0.04, rough: 0.0 }), ball);
    // glints (fixed, in the socket)
    const glM = M("emissive", "#ffffff"), gz = ez * 0.93;
    const gl = (gx: number, gy: number, r: number) => { const m = mesh(new THREE.CircleGeometry(r, 10), glM, root); m.position.set(gx * ex, gy * ey, gz); m.scale.set(ex, ey, 1); return m; };
    if (!eShape.closed) { gl(-0.3, 0.34, 0.2); gl(0.26, -0.3, 0.09); if (eShape.sparkle) { gl(0.34, 0.2, 0.06); gl(-0.1, -0.42, 0.05); } }
    // lid, with a lash line on its edge and (teens/adults) a crease
    const lid = mesh(new THREE.SphereGeometry(1.07, lod ? 20 : 12, lod ? 10 : 5, 0, PI * 2, 0, PI / 2), skinM, root); lid.scale.set(ex, ey, ez); lid.rotation.x = eShape.lid;
    const lineM = M("plastic", spec.liner || eShape.lash ? "#1d1318" : mid ? "#2e1d22" : "#4a2f33", { rough: 0.6 });
    mesh(new THREE.TorusGeometry(1.07, spec.liner ? 0.075 : eShape.lash ? 0.06 : mid ? 0.045 : 0.035, 4, lod ? 24 : 10, PI).rotateX(PI / 2), lineM, lid);
    if (mid && !eShape.closed) { const cr = mesh(new THREE.TorusGeometry(0.93, 0.02, 4, lod ? 20 : 10, PI).rotateX(PI / 2).translate(0, 0.535, 0), M("plastic", shadeHex(spec.skin, -0.2, 0.04), { rough: 0.8 }), lid); void cr; }
    const nl = eShape.lash || spec.liner ? 4 : mid && spec.age !== "g68" ? 2 : 0;
    for (let k = 0; k < nl; k++) { const an = 0.12 + k * (nl > 3 ? 0.26 : 0.4), base = V(s * Math.cos(an) * 1.07, 0, Math.sin(an) * 1.07); lid.add(new THREE.Mesh(add(tube([base, base.clone().add(V(s * 0.14, 0.14, 0.04 * k)), base.clone().add(V(s * 0.32, 0.3, 0.1 * k))], 0.06, 0.012, 4, 1)), lineM)); }
    // closed arcs drawn on the lid (blink = u , happy = n)
    const arcPts = (up: number) => { const p: THREE.Vector3[] = []; for (let i = 0; i <= 8; i++) { const u = i / 8 * 2 - 1; p.push(V(u * ex * 0.95, up * (1 - u * u) * ey * 0.35, ez * 1.12 * Math.sqrt(Math.max(0.1, 1 - u * u * 0.5)))); } return p; };
    const closedArc = new THREE.Mesh(add(tube(arcPts(-1), 0.045 * ex * 3, 0.045 * ex * 3, 5, 1)), lineM), happyArc = new THREE.Mesh(add(tube(arcPts(1), 0.05 * ex * 3, 0.05 * ex * 3, 5, 1)), lineM);
    root.add(closedArc, happyArc); closedArc.visible = false; happyArc.visible = closedAlways; closedArc.position.y = -ey * 0.2; happyArc.position.y = -ey * 0.1;
    if (closedAlways) { lid.visible = ball.visible = false; happyArc.scale.z = 0.86; }   // always-closed eyes (happy, wink) are just the arc on the skin
    eyeRigs.push({ lid, ball, open: eShape.lid, closedArc, happyArc, closedAlways });
    // brows (an inner group so they can lift and tilt at runtime)
    if (spec.brow !== "none") {
      const bm = M("plastic", brw, { rough: 0.7, map: strand }), b = new THREE.Group(), bi = new THREE.Group(); place(b, s * (fp.eyeAz - 0.01), fp.eyeEl + 0.2 + 0.35 * fp.eyeS, -0.02); grp.add(b); b.add(bi);
      const w = (spec.brow === "thick" ? 0.06 : spec.brow === "thin" ? 0.02 : 0.035) * fp.browS, L = 0.27 * (0.8 + 0.2 * fp.eyeS), pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 4; i++) {
        const u = i / 4, x = (u - 0.5) * 2 * L, inner = s > 0 ? 1 - u : u;
        let y = 0; if (spec.brow === "worried") y = inner * 0.09 - 0.02; else if (spec.brow === "angled") y = -inner * 0.1 + 0.03; else if (spec.brow === "arch") y = Math.sin(u * PI) * 0.1; else y = Math.sin(u * PI) * 0.035;
        pts.push(V(x, y, -x * x * 0.4));
      }
      mesh(tube(pts, w * 0.7, w, 6, 2, true), bm, bi); brows.push({ g: bi, s });
    }
  }
  if (spec.brow === "unibrow") { const b = new THREE.Group(); place(b, 0, fp.eyeEl + 0.2 + 0.35 * fp.eyeS, -0.02); grp.add(b); mesh(tube([V(-0.2, 0.02, -0.02), V(0, 0.04, 0.01), V(0.2, 0.02, -0.02)], 0.06, 0.06, 5, 2), M("plastic", brw, { map: strand }), b); }

  /* nose: tip + nostril wings; teens/adults add a bridge */
  const nose = new THREE.Group(); place(nose, 0, fp.noseEl, 0.0); grp.add(nose); nose.scale.setScalar(fp.noseS);
  const nd: Record<string, [number, number, number, number]> = { button: [0.12, 0.1, 0.12, 0.04], pointy: [0.1, 0.12, 0.19, 0.08], wide: [0.2, 0.1, 0.12, 0.03], round: [0.15, 0.14, 0.15, 0.05] }, [nx, ny, nz, nzo] = nd[spec.noseShape] ?? nd.button;
  const nm = mesh(sphereG(nx, ny, nz, 16, 12), skinM, nose); nm.position.z = nzo; nm.rotation.x = 0.15;
  if (mid) for (const s of [-1, 1]) { const wg = mesh(sphereG(nx * 0.42, ny * 0.7, nz * 0.7, 8, 6), skinM, nose); wg.position.set(s * nx * 0.72, -ny * 0.25, nzo * 0.4); }   // alar wings
  if (fp.bridge > 0.05) { const br = mesh(sphereG(0.06 + 0.02 * fp.bridge, 0.12, 0.05 + 0.02 * fp.bridge, 8, 8), skinM, nose); br.position.set(0, 0.1, nzo * 0.1); br.rotation.x = -0.15; }
  if (spec.noseShape === "pointy" || spec.noseShape === "wide" || spec.nose || mid) for (const s of [-1, 1]) { const n2 = mesh(sphereG(0.026, 0.018, 0.02, 6, 5), M("plastic", shadeHex(spec.skin, -0.28), { rough: 0.9 }), nose); n2.position.set(s * nx * 0.4, -ny * 0.55, nz * 0.5 + nzo); }
  if (spec.nosePin) { const p = mesh(sphereG(0.03, 0.03, 0.03, 8, 6), M("metal", spec.nosePin.startsWith("#") ? spec.nosePin : "#eab94e", { rough: 0.25 }), nose); p.position.set(nx * 0.95, -ny * 0.1, nz * 0.2 + nzo); }

  /* ears */
  const earD: Record<string, [number, number, number]> = { round: [0.1, 0.2, 0.15], small: [0.08, 0.14, 0.11], big: [0.13, 0.27, 0.2], pointy: [0.09, 0.22, 0.14] };
  const [erx0, ery0, erz0] = earD[spec.earShape] ?? earD.round, erx = erx0 * fp.earS, ery = ery0 * fp.earS, erz = erz0 * fp.earS, earY = -0.1 - ery * 0.55;
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); surf(shape, s * 1.5, fp.eyeEl + 0.0, -0.03, e.position); e.rotation.y = s * 0.2; grp.add(e);
    const em = mesh(sphereG(erx, ery, erz, 12, 10), skinM, e); em.position.x = s * 0.04; em.rotation.z = -s * 0.15;
    if (spec.earShape === "pointy") { const tp = mesh(new THREE.ConeGeometry(0.12, 0.45, 8).translate(0, 0.22, 0), skinM, e); tp.position.set(s * 0.05, ery * 0.5, 0); tp.rotation.z = -s * 0.35; }
    const inner = mesh(sphereG(erx * 0.5, ery * 0.65, erz * 0.5, 8, 6), M("plastic", shadeHex(spec.skin, -0.12, 0.05), { rough: 0.8 }), e); inner.position.set(s * (erx * 0.7 + 0.04), 0, 0.02);
    const er = spec.earrings; if (er) {
      const em2 = M("metal", er, { rough: 0.22 }), by = -ery * 0.85, st = spec.earStyle, a = new THREE.Group(); a.position.set(s * (erx * 0.9 + 0.05), by, 0.03); e.add(a);
      if (st === "stud" || st === "cuff" || st === "pearl") { mesh(sphereG(0.045, 0.045, 0.045, 8, 6), st === "pearl" ? M("plastic", "#fff6ea", { rough: 0.15 }) : em2, a); if (st === "cuff") { const b2 = mesh(sphereG(0.04, 0.04, 0.04, 8, 6), em2, a); b2.position.y = ery * 0.9; } }
      else if (st === "hoop") { const h = mesh(new THREE.TorusGeometry(0.1, 0.017, 6, 16).rotateY(PI / 2), em2, a); h.position.y = -0.08; }
      else { mesh(sphereG(0.03, 0.03, 0.03, 6, 5), em2, a); const d = mesh(sphereG(0.04, 0.07, 0.04, 8, 6), em2, a); d.position.y = -0.14; mesh(tube([V(0, 0, 0), V(0, -0.07, 0)], 0.008, 0.008, 4, 1), em2, a); }
    }
  }

  /* mouth: lip tubes keep their base positions and are re-posed in place (width, corner lift, jaw drop, pucker) */
  const mg = new THREE.Group(); place(mg, 0, fp.mouthEl, -0.005); mg.scale.setScalar(1.15 * fp.mouthS); grp.add(mg);
  const lipM = M("plastic", spec.lip, { rough: 0.45 }), darkM = M("plastic", "#7a2c3a", { rough: 0.8 }), teethM = M("plastic", "#fffaf2", { rough: 0.3 }), tongM = M("plastic", "#e8788a", { rough: 0.5 });
  const mst = spec.mouthStyle, W = ({ grin: 0.42, teeth: 0.42, tongue: 0.36, smile: 0.36, gap: 0.38, smirk: 0.32, flat: 0.28, pout: 0.14, o: 0.1, cat: 0.28 } as Record<string, number>)[mst] ?? 0.4;
  const curve = (dy: number, kind: string) => { const p: THREE.Vector3[] = []; for (let i = 0; i <= 10; i++) { const u = (i / 10) * 2 - 1; let y = 0; if (kind === "smile") y = (u * u - 1) * 0.1 + 0.1; else if (kind === "grin") y = (u * u - 1) * 0.14 + 0.14; else if (kind === "smirk") y = (u * u) * 0.08 - 0.02 + u * 0.07; else if (kind === "flat") y = u * u * 0.012; else if (kind === "cat") y = -Math.abs(Math.sin(u * PI * 1.0)) * 0.05 * (Math.abs(u) < 0.95 ? 1 : 0) + 0.02; else y = (u * u - 1) * 0.08 + 0.08; p.push(V(u * W, y * (kind === "grin" ? 1 : 0.9) + dy - 0.07, -(u * W) * (u * W) * 0.5)); } return p; };
  const base0 = ({ grin: 0.1, teeth: 0.2, tongue: 0.22, gap: 0.08, o: 0.7 } as Record<string, number>)[mst] ?? 0, cK = mst === "grin" || mst === "teeth" || mst === "gap" || mst === "tongue" ? (mst === "grin" ? "grin" : "smile") : mst === "o" ? "o" : mst === "smirk" ? "smirk" : mst === "flat" ? "flat" : mst === "cat" ? "cat" : mst === "pout" ? "pout" : "smile";
  const lipR = (mst === "pout" ? 0.07 : 0.048) * (spec.age === "k2" ? 1.0 : 1.05);
  const lipParts: { g: THREE.BufferGeometry; b: Float32Array; role: number }[] = [], lip = (g: THREE.BufferGeometry, role: number) => { lipParts.push({ g, b: Float32Array.from(g.attributes.position.array as Float32Array), role }); return g; };
  const upper = mesh(lip(tube(curve(0, cK), lipR, lipR, 5, 2), 0), lipM, mg);
  const lower = mesh(lip(tube(curve(0, cK).map((p) => { p.y += (cK === "pout" ? -0.1 : 0.0); return p; }), lipR, lipR, 5, 2), 1), lipM, mg);
  let ring: THREE.Mesh | null = null;
  if (mst === "pout" || mst === "o") { ring = mesh(new THREE.TorusGeometry(mst === "o" ? 0.1 : 0.12, mst === "o" ? 0.035 : 0.05, 6, 14), lipM, mg); ring.scale.y = mst === "o" ? 1.2 : 0.65; ring.position.z = -0.01; upper.visible = lower.visible = false; }
  const cav = mesh(sphereG(W * 0.92, 0.5, 0.18, 14, 8), darkM, mg); cav.position.set(0, -0.07, -0.2);
  const tongue = mesh(sphereG(W * 0.45, 0.1, 0.14, 10, 7), tongM, mg); tongue.position.set(0, -0.12, -0.1);
  const teeth = mesh(lip(tube(curve(-0.055, cK).map((p) => { p.z += 0.01; return p; }), 0.045, 0.045, 6, 2), 2), teethM, mg);
  const gapT = mesh(new THREE.BoxGeometry(0.045, 0.1, 0.05), darkM, mg); gapT.position.set(0, curve(-0.055, cK)[5].y, 0.02); gapT.visible = mst === "gap";
  const brace = mesh(lip(tube(curve(-0.055, cK).map((p) => { p.z += 0.045; return p; }), 0.012, 0.012, 4, 2), 2), M("metal", "#c8ccd4", { rough: 0.3 }), mg); brace.visible = spec.mark === "braces";
  const tongueOut = mst === "tongue" ? mesh(sphereG(0.09, 0.12, 0.05, 10, 8), tongM, mg) : null; if (tongueOut) tongueOut.position.set(0.03, -0.2, 0.03);

  /* beard (hs / adult): strand-mapped tubes so the hair reads as hair */
  if (spec.beard !== "none" && spec.beard !== "stubble" && old) {
    const bc = spec.beardColor || hairColor, bM = M("plastic", bc, { rough: 0.8, map: strand }), b = spec.beard;
    const tb = (pts: [number, number, number][], r0: number, r1 = r0) => mesh(tube(pts.map(([x, y, z]) => surf(shape, x, y, z, new THREE.Vector3())), r0, r1, 6, 3), bM);
    const arc = (a0: number, a1: number, el: number, r: number, off = 0.03, n = 8) => { const p: [number, number, number][] = []; for (let i = 0; i <= n; i++) p.push([lerp(a0, a1, i / n), el, off]); return tb(p, r); };
    /** a beard surface hugging the jaw: azimuth range, top edge elevation per azimuth, bottom elevation; strand uv runs down the face */
    const patch = (az0: number, az1: number, top: (a: number) => number, bot: number, off = 0.05, nu = 24, nv = 6) => {
      const P: number[] = [], N: number[] = [], U: number[] = [], I: number[] = [], q = new THREE.Vector3();
      for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const a = lerp(az0, az1, i / nu), t = j / nv, e = lerp(top(a), bot, t), o = off + 0.03 * Math.sin(Math.PI * Math.min(1, t * 1.2)); surf(shape, a, e, o, q); P.push(q.x, q.y, q.z); N.push(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)); U.push((i / nu) * 3, 1 - t); }
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const k = i * (nv + 1) + j; I.push(k, k + 1, k + nv + 1, k + nv + 1, k + 1, k + nv + 2); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I);
      return mesh(g, bM);
    };
    const jaw = (r: number, el0 = -0.82, el1 = -1.15) => { for (let k = 0; k < 3; k++) arc(-1.35 + k * 0.05, 1.35 - k * 0.05, lerp(el0, el1, k / 2), r, 0.05 + (k % 2) * 0.012, 12); };
    if (b === "full") patch(-1.38, 1.38, (a) => { const t = clamp((1.35 - Math.abs(a)) / 1.0, 0, 1); return -0.08 - 0.64 * t * t * (3 - 2 * t); }, -1.2, 0.05);
    if (b === "circle") patch(-0.8, 0.8, (a) => -0.72 - 0.1 * Math.abs(a), -1.15, 0.05, 14);
    if (b === "full" || b === "circle") arc(-0.5, 0.5, -0.43, 0.06, 0.05);
    if (b === "goatee" || b === "vandyke" || b === "circle" || b === "soulpatch") { const gp = mesh(sphereG(b === "soulpatch" ? 0.08 : 0.2, b === "soulpatch" ? 0.07 : 0.2, 0.12, 10, 8), bM); surf(shape, 0, b === "soulpatch" ? -0.7 : -1.0, 0.03, gp.position); gp.rotation.x = -0.9; }
    if (b === "vandyke" || b === "pencil" || b === "handlebar" || b === "walrus" || b === "circle") { const w = b === "walrus" ? 0.5 : 0.36, r = b === "pencil" ? 0.02 : b === "walrus" ? 0.1 : 0.05; tb([[-w * 0.9, -0.44, 0.04], [-w * 0.35, -0.42, 0.05], [0, -0.43, 0.06], [w * 0.35, -0.42, 0.05], [w * 0.9, -0.44, 0.04]], r); if (b === "handlebar") { for (const s of [-1, 1]) tb([[s * w * 0.9, -0.44, 0.04], [s * w * 1.1, -0.5, 0.04], [s * w * 1.25, -0.4, 0.04]], 0.035, 0.015); } }
    if (b === "chinstrap") jaw(0.05, -0.7, -0.78);
    if (b === "sideburns" || b === "muttonchops") for (const sd of [-1, 1]) { const a0 = sd * 1.0, a1 = sd * 1.36, mc = b === "muttonchops"; patch(Math.min(a0, a1), Math.max(a0, a1), () => -0.02, mc ? -0.85 : -0.4, 0.05, 6, 5); }
  }

  /* runtime */
  const cur = { o: -1, w: 1, c: 0, p: 0 };
  const poseMouth = (o: number, wd: number, cl: number, pk: number) => {
    const open = Math.max(base0, o), wk = wd * (1 - 0.5 * Math.max(0, pk)), prot = 0.1 * Math.max(0, pk), prs = Math.max(0, -pk);
    for (const { g, b, role } of lipParts) {
      const a = g.attributes.position.array as Float32Array;
      for (let i = 0; i < b.length; i += 3) { const xn = clamp(b[i] / W, -1, 1), q = 1 - xn * xn; a[i] = b[i] * wk; a[i + 1] = b[i + 1] + cl * xn * xn - Math.max(0, pk) * 0.8 * (cK === "grin" ? 0.126 : 0.09) * xn * xn - (role === 1 ? open * 0.2 * (0.3 + 0.7 * q) - prs * 0.012 : open * -0.03 * q); a[i + 2] = b[i + 2] + prot * q - prs * 0.015 * (role === 1 ? 0 : 1); }
      g.attributes.position.needsUpdate = true;
    }
    const showOpen = open > 0.04;
    cav.visible = showOpen || mst === "o"; teeth.visible = open > 0.18 && pk <= 0.4; tongue.visible = open > 0.3; gapT.visible = mst === "gap" && showOpen; brace.visible = spec.mark === "braces" && showOpen;
    cav.scale.set(wk, 0.06 + open * 0.2, 1); cav.position.y = -0.07 - open * 0.1;
    if (mst === "o") cav.scale.set(0.12 / W / 0.95 * 0.9 * wk, 0.12 + open * 0.2, 1);
    if (ring) ring.scale.set(Math.max(0.35, wk), (mst === "o" ? 1.2 : 0.65) * (0.7 + open * 0.6), 1);
    if (tongueOut) tongueOut.position.y = -0.2 - open * 0.1;
  };
  const set = (st: FaceState) => {
    const bl = clamp(st.blink, 0, 1), sq = st.squint ?? 0;
    for (const e of eyeRigs) {
      if (e.closedAlways) { e.lid.rotation.x = 1.25; e.ball.rotation.set(0, 0, 0); continue; }
      e.lid.rotation.x = lerp(e.open, 1.3, bl) + sq * 0.3; e.ball.rotation.y = st.gx; e.ball.rotation.x = st.gy; e.closedArc.visible = bl > 0.7;
    }
    const br = st.brow ?? 0; for (const b of brows) { b.g.position.y = br * 0.07; b.g.rotation.z = b.s * (br < 0 ? -br * 0.2 : -br * 0.05); }
    const o = st.mouth, wd = st.mw ?? 1, cl = st.mc ?? 0, pk = st.mp ?? 0;
    if (Math.abs(o - cur.o) > 0.012 || Math.abs(wd - cur.w) > 0.01 || Math.abs(cl - cur.c) > 0.008 || Math.abs(pk - cur.p) > 0.02) { cur.o = o; cur.w = wd; cur.c = cl; cur.p = pk; poseMouth(o, wd, cl, pk); }
  };
  set({ blink: 0, gx: 0, gy: 0, mouth: 0 });
  return { group: grp, set, ax, ay, az, earY, dispose() { owned.forEach((g) => g.dispose()); ftex.dispose(); headM.dispose(); } };
}
