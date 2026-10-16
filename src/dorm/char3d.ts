/** Procedural 3D character built from the same AvatarSpec as the 2D rig. See types.ts (Char3D). Faces +z, feet at y = 0, origin between the feet. */
import * as THREE from "three";
import { AGE_H } from "../shared/scale";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { normalizeRegions, REGION_IDS, type AvatarSpec, type RegionSpec } from "../hall3d/avatar";
import type { Anim, Char3D, MouthShape, Style } from "./types";
import { makeRig, fitRig, buildBody, bwOf, DIM, shapeOf, type Rig } from "./char-parts/body";
import { buildFace, headScale, VISEMES, type Face, type Ctx, type MouthPose } from "./char-parts/face";
import { decorate, hairMaterial } from "./char-parts/detail";
import { buildHair } from "./char-parts/hair";
import { buildTop, buildNeck, buildWrist, buildBottom, buildSocks, buildShoes } from "./char-parts/clothes";
import { buildHat, buildGlasses, buildHeadExtra, buildBodyExtra, buildPack } from "./char-parts/items";

const H: Record<string, number> = AGE_H;
/** head-heights tall (body height / head height) per proportion style and age: kids have big heads, adults realistic ones (Sims-1-like at the stylised end) */
const HEADS: Record<string, Record<string, number>> = {
  chibi: { k2: 3.1, g35: 3.4, g68: 3.7, hs: 5.2, adult: 5.7 }, stylised: { k2: 3.5, g35: 3.8, g68: 4.1, hs: 5.2, adult: 5.7 }, realistic: { k2: 4.4, g35: 4.7, g68: 5.0, hs: 5.5, adult: 5.75 },
};
/** per-age motion: v = gesture amplitude, f = tempo, b = bounce (kids bouncier and fidgety, adults calmer) */
const AGEV: Record<string, { v: number; f: number; b: number }> = { k2: { v: 1.3, f: 1.15, b: 1.8 }, g35: { v: 1.2, f: 1.08, b: 1.4 }, g68: { v: 1.0, f: 1.0, b: 1.0 }, hs: { v: 0.92, f: 0.97, b: 0.7 }, adult: { v: 0.78, f: 0.9, b: 0.5 } };
/** proportion styles: head scale (and how strongly the age band's big-head factor applies), leg / arm length, shoulder width */
const PROP: Record<string, { head: number; ageExp: number; leg: number; arm: number; sh: number }> = {
  chibi: { head: 1, ageExp: 1, leg: 0.94, arm: 0.96, sh: 1 }, stylised: { head: 0.84, ageExp: 0.85, leg: 1.04, arm: 1.02, sh: 1 }, realistic: { head: 0.7, ageExp: 0.6, leg: 1.14, arm: 1.08, sh: 1.04 },
};
/** hs and adult read as grown whatever style was picked: blend the chosen style toward realistic (adults a touch broader) */
function propFor(age: string, style?: string) {
  const b = PROP[style ?? "chibi"] ?? PROP.chibi, g = age === "adult" ? 1 : age === "hs" ? 0.85 : 0; if (!g) return b; const r = PROP.realistic, m = (x: number, y: number) => x + (y - x) * g, br = age === "adult" ? 1.05 : 1;
  return { head: m(b.head, r.head), ageExp: m(b.ageExp, r.ageExp), leg: m(b.leg, r.leg), arm: m(b.arm, r.arm), sh: m(b.sh, r.sh) * br };
}
const KEYS: Record<string, (keyof AvatarSpec)[]> = {
  scale: ["age", "height", "headSize", "faceShape", "prop", "shoulder", "waist", "hips", "limbs", "build"],
  body: ["skin", "build", "prop", "shoulder", "waist", "hips", "limbs"],
  face: ["skin", "faceShape", "eyeShape", "eyeColor", "eyeColor2", "eyeShadow", "liner", "brow", "browColor", "hair", "blush", "freckles", "mole", "nose", "nosePin", "mark", "mouthStyle", "lip", "noseShape", "earShape", "earrings", "earStyle", "beard", "beardColor", "age", "build", "hairStyle", "hat"],
  hair: ["hairStyle", "hair", "hair2", "hl", "part", "fringe", "clip", "hat", "hatColor", "hairTip", "hairHi", "skin"],
  hat: ["hat", "hatColor", "hat2", "hairStyle"], glasses: ["glasses", "glassColor", "faceShape", "age"], hextra: ["extra", "extraColor", "hairStyle", "hat"],
  top: ["top", "shirt", "shirt2", "pattern", "patColor", "trim", "emblem", "build", "shoulder", "waist", "hips"], outer: ["outer", "outerColor", "outerColor2", "outerPattern", "outerPatColor", "outerTrim", "build", "shoulder", "waist", "hips"], neck: ["neckwear", "neckColor", "scarf", "badge", "top", "outer", "build", "shoulder", "waist", "hips"], wrist: ["wrist", "wristColor", "age", "rings"],
  bottom: ["bottom", "pants", "pantsPattern", "pantsPatColor", "pantsTrim", "top", "shirt", "shirt2", "build", "shoulder", "waist", "hips"], socks: ["socks", "sockColor", "build"], shoes: ["shoeStyle", "shoes", "shoes2", "skin"], pack: ["packStyle", "pack", "pack2", "badge", "packCharm", "build", "shoulder", "waist", "hips"], bextra: ["extra", "extraColor", "build", "shoulder", "waist", "hips"],
};
/** customizer region ids that each part belongs to (colour/pattern/paint/scale come from spec.regions) */
const REGION_OF: Record<string, string[]> = { face: ["skin", "hair", "jewelry.ears"], body: ["skin"], hair: ["hair"], hat: ["hat"], top: ["top"], outer: ["outer"], bottom: ["bottom"], shoes: ["shoes"], pack: ["backpack"], neck: ["jewelry.neck"], wrist: ["jewelry.wrists", "jewelry.fingers"] };
const PAINT_PARTS: Record<string, string> = { hair: "hair", top: "top", outer: "outer", bottom: "bottom", shoes: "shoes", pack: "backpack", hat: "hat", body: "skin" };
/** the region a mesh of each part belongs to (what a tap on it selects) */
const PICK_REGION: Record<string, string> = { face: "skin", body: "skin", hair: "hair", hat: "hat", top: "top", outer: "outer", bottom: "bottom", socks: "bottom", shoes: "shoes", pack: "backpack", neck: "jewelry.neck", wrist: "jewelry.wrists" };
const SEAM_PARTS = new Set(["top", "outer", "bottom", "socks"]);
/** apply spec.regions colours/patterns onto the legacy fields the part builders read */
function effSpec(s: AvatarSpec): AvatarSpec {
  const r = s.regions; if (!r || !Object.keys(r).length) return s; const e: any = { ...s }, c = (id: string) => r[id]?.c, p = (id: string) => r[id]?.pat;
  e.hair = c("hair") ?? e.hair; e.skin = c("skin") ?? e.skin; e.shirt = c("top") ?? e.shirt; e.pattern = p("top") ?? e.pattern; e.outerColor = c("outer") ?? e.outerColor; e.outerPattern = p("outer") ?? e.outerPattern;
  e.pants = c("bottom") ?? e.pants; e.pantsPattern = p("bottom") ?? e.pantsPattern; e.shoes = c("shoes") ?? e.shoes; e.pack = c("backpack") ?? e.pack; e.hatColor = c("hat") ?? e.hatColor;
  e.neckColor = c("jewelry.neck") ?? e.neckColor; if (e.earrings) e.earrings = c("jewelry.ears") ?? e.earrings; e.wristColor = c("jewelry.wrists") ?? e.wristColor; if (e.rings) e.rings = c("jewelry.fingers") ?? e.rings;
  return e;
}
const ORDER = ["scale", "body", "face", "hair", "hat", "glasses", "hextra", "top", "outer", "neck", "wrist", "bottom", "socks", "shoes", "pack", "bextra"];

/* pose vector layout */
const hipY = 0, hipZ = 1, hipX = 2, spX = 3, spY = 4, spZ = 5, nkX = 6, nkY = 7, nkZ = 8, shL = 9, shR = 12, elL = 15, elR = 16, hdL = 17, hdR = 18, hpL = 19, hpR = 21, knL = 23, knR = 24, anL = 25, anR = 26, ezL = 27, ezR = 28, hipR = 29, hipYw = 30, shr = 31, pelX = 32, N = 33;
const SIT_DROP = -0.405;
/** soft rim light + faint top-down gradient; toon materials get the papercut look, pixar materials a gentle cel band. Cloned once per source material, so the room is untouched. */
const rimMats = new WeakMap<THREE.Material, THREE.Material>();
function rim(m: THREE.Material, pixar: boolean): THREE.Material {
  if (!pixar && !(m as any).isMeshToonMaterial) return m; if (pixar && !(m as any).isMeshPhysicalMaterial) return m; let r = rimMats.get(m); if (r) return r; r = m.clone();
  const prev = m.onBeforeCompile, pk = m.customProgramCacheKey?.() ?? "";
  const body = pixar
    ? "float rimK = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.4);\n float lm = dot(outgoingLight, vec3(0.299, 0.587, 0.114)), q = floor(lm * 5.0 + 0.5) / 5.0;\n outgoingLight *= mix(1.0, clamp((q + 0.02) / (lm + 0.02), 0.82, 1.2), 0.2);\n outgoingLight = outgoingLight * (0.97 + 0.04 * normalize(vNormal).y) + rimK * 0.1 * vec3(1.0, 0.93, 0.84);\n"
    : "float rimK = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.6);\n outgoingLight = outgoingLight * (0.95 + 0.07 * normalize(vNormal).y) + rimK * 0.16 * vec3(1.0, 0.95, 0.86);\n";
  r.onBeforeCompile = (sh, rd) => { prev?.call(r, sh, rd); sh.fragmentShader = sh.fragmentShader.replace("#include <opaque_fragment>", body + "#include <opaque_fragment>"); };
  r.customProgramCacheKey = () => pk + (pixar ? "charRimP" : "charRim"); rimMats.set(m, r); return r;
}

const env = (x: number) => { const s = Math.sin(x); return s * s; };
function pose(a: Anim, t: number, p: Float32Array, g: { v: number; f: number; b: number }) {
  p.fill(0);
  const T = t * g.f, v = g.v, br = Math.sin(T * 1.7), sw = Math.sin(T * 0.33), sw2 = Math.sin(T * 0.21 + 1), roll = 0.035 * sw * v;
  // base standing: breathing, a slow weight shift (pelvis rolls, legs stay planted, one knee relaxes), micro head and arm sway
  p[spX] = 0.016 + 0.018 * br; p[spZ] = -roll * 1.1; p[spY] = 0.02 * sw2 * v; p[hipX] = 0.01 * sw; p[hipR] = roll; p[pelX] = 0.012 * sw * v; p[nkX] = -0.01 * br; p[nkZ] = 0.02 * sw2 * v; p[nkY] = 0.03 * Math.sin(T * 0.4) * v;
  p[shL + 2] = 0.1 + 0.014 * br; p[shR + 2] = -(0.1 + 0.014 * br); p[shL] = 0.04 * sw2 * v; p[shR] = -0.04 * sw2 * v; p[elL] = -0.14 - 0.02 * br; p[elR] = -0.14 + 0.02 * br; p[hdL] = p[hdR] = -0.12; p[shr] = 0.004 * br;
  p[hpL + 1] = 0.02 - roll + 0.035 * Math.max(0, -sw) * v; p[hpR + 1] = -0.02 - roll - 0.035 * Math.max(0, sw) * v; p[knL] = 0.07 * Math.max(0, -sw) * v; p[knR] = 0.07 * Math.max(0, sw) * v; p[hipY] = g.b * 0.006 * Math.abs(Math.sin(T * 2.4));
  const sit = () => {
    p[hipY] = SIT_DROP; p[hipZ] = -0.01; p[hipX] = 0; p[hipR] = 0; p[pelX] = 0; p[hpL] = p[hpR] = -1.53; p[hpL + 1] = 0.05; p[hpR + 1] = -0.05; p[knL] = p[knR] = 1.51; p[anL] = p[anR] = 0.03; p[spZ] = 0.012 * sw2;
    p[spX] = 0.07 + 0.02 * br + 0.025 * Math.sin(T * 0.3);   // a slight lean forward that drifts
    p[knL] += 0.1 * (g.b - 0.4) * Math.sin(T * 2.3); p[knR] += 0.1 * (g.b - 0.4) * Math.sin(T * 2.3 + 2.4);   // kids swing their legs
  };
  switch (a) {
    case "wave": p[shR + 2] = -2.75; p[shR] = 0.1; p[elR] = -0.3; p[ezR] = Math.sin(t * 9) * 0.5; p[nkZ] = -0.08; p[nkY] = 0.12; p[spZ] += 0.03; p[shr] = 0.01; break;
    case "sit": sit(); p[shL] = p[shR] = -0.45; p[elL] = p[elR] = -0.95; p[shL + 2] = 0.12; p[shR + 2] = -0.12; p[hdL] = p[hdR] = 0; p[nkX] = 0.03; break;
    case "lean": sit(); p[spX] = -0.14 + 0.015 * br; p[nkX] = 0.12; p[nkZ] = 0.06; p[shL] = p[shR] = -0.15; p[elL] = p[elR] = -0.5; p[shL + 2] = 0.18; p[shR + 2] = -0.18; p[hdL] = p[hdR] = 0; p[hpL + 1] = 0.12; p[hpR + 1] = -0.12; break;   // seated, leaning back
    case "raise": sit(); p[shL] = p[shR] = -0.45; p[elL] = -0.95; p[shL + 2] = 0.12; p[shR + 2] = -2.55; p[shR] = 0.05; p[elR] = -0.25; p[hdL] = 0; p[nkX] = -0.04; p[nkZ] = -0.06; p[ezR] = 0.06 * Math.sin(T * 2.2); break;   // seated, right hand up (classroom)
    case "type": { sit(); p[shL] = p[shR] = -0.78; p[shL + 2] = 0.1; p[shR + 2] = -0.1; p[elL] = -1.32 + 0.05 * Math.sin(t * 13); p[elR] = -1.32 + 0.05 * Math.sin(t * 13 + 2); p[hdL] = 0.3 + 0.2 * Math.sin(t * 15); p[hdR] = 0.3 + 0.2 * Math.sin(t * 15 + 1.7); p[nkX] = 0.2; p[spX] = 0.09; break; }
    case "talk": { const g1 = Math.sin(T * 2.3), g2 = Math.sin(T * 1.9 + 2), beat = env(T * 1.15); p[shR] = (-0.55 + 0.3 * g1) * v; p[shR + 2] = -0.3 - 0.1 * beat; p[elR] = -1.05 + 0.4 * Math.sin(T * 2.3 + 1) * v; p[hdR] = -0.1 + 0.25 * g1; p[shL] = (-0.3 + 0.2 * g2) * v; p[shL + 2] = 0.22; p[elL] = -0.8 + 0.3 * Math.sin(T * 1.9) * v; p[nkX] = 0.05 * Math.sin(T * 3.1) + 0.05 * beat; p[nkY] = 0.1 * Math.sin(T * 0.8); p[spY] = 0.05 * Math.sin(T * 0.8); p[nkZ] = 0.04 * Math.sin(T * 1.3); p[shr] = 0.008 * beat; break; }
    case "think": p[shR] = -1.12; p[shR + 2] = -0.12; p[elR] = -2.25; p[hdR] = -0.2; p[shL] = -0.55; p[shL + 2] = 0.05; p[elL] = -1.6; p[nkZ] = 0.14; p[nkX] = -0.08; p[nkY] = -0.1; p[spZ] += 0.03; p[hipX] += 0.02; break;
    case "hip": p[shR + 2] = -0.55; p[shR] = 0.2; p[elR] = -0.1; p[ezR] = 1.25; p[hdR] = 0.2; p[hipR] = 0.05 + 0.01 * br; p[spZ] = -0.05; p[nkZ] = 0.08; p[nkY] = 0.12 * Math.sin(T * 0.5); p[hpL + 1] = 0.02 - 0.05 + 0.04; p[hpR + 1] = -0.02 - 0.05; p[knL] = 0.1; break;   // right hand on hip, weight on the right leg
    case "point": { const jab = Math.max(0, Math.sin(T * 2.6)); p[shR] = -1.5 - 0.07 * jab; p[shR + 2] = -0.1; p[elR] = -0.1; p[hdR] = -0.08; p[spY] = -0.14; p[nkY] = 0.12; p[nkX] = 0.02; p[spX] = 0.05 + 0.02 * jab; p[shL] = -0.1; p[elL] = -0.4; p[shr] = 0.006; break; }
    case "shrug": { const e = env(T * 1.1); p[shr] = 0.04 * e; p[shL + 2] = 0.1 + 0.3 * e; p[shR + 2] = -(0.1 + 0.3 * e); p[shL] = -0.25 * e; p[shR] = -0.25 * e; p[elL] = -0.14 - 1.0 * e; p[elR] = -0.14 - 1.0 * e; p[hdL] = p[hdR] = -0.12 - 0.5 * e; p[nkZ] = 0.1 * e; p[nkX] = 0.06 * e; p[spX] += 0.03 * e; break; }
    case "nod": { const n = Math.max(0, Math.sin(T * 5.6)); p[nkX] = 0.04 + 0.2 * n; p[spX] += 0.03 * n; p[shr] = 0.004; break; }
    case "shake": { const s2 = Math.sin(T * 7.2); p[nkY] = 0.4 * s2 * v; p[nkZ] = 0.05 * s2; p[spY] = 0.04 * s2; p[nkX] = 0.03; break; }
    case "cheer": { const b = Math.sin(t * 8); p[shL + 2] = 2.7 + 0.18 * b; p[shR + 2] = -(2.7 - 0.18 * b); p[elL] = p[elR] = -0.25; p[hipY] = Math.abs(Math.sin(t * 4)) * 0.07 - 0.04; p[hpL] = p[hpR] = -0.1; p[hipR] = 0; p[hpL + 1] = 0.02; p[hpR + 1] = -0.02; p[knL] = p[knR] = 0.25; p[spX] = -0.08; p[nkX] = -0.22; p[nkZ] = 0.06 * b; p[shr] = 0.02; break; }
    case "dance": { const b = Math.sin(t * 6), c2 = -b, h2 = Math.sin(t * 3); p[shL + 2] = 1.5 + 0.9 * b; p[shR + 2] = -(1.5 + 0.9 * c2); p[elL] = -0.5 + 0.35 * b; p[elR] = -0.5 + 0.35 * c2; p[hipY] = Math.abs(b) * 0.06 - 0.03; p[hipR] = 0.2 * h2; p[spZ] = 0.1 * h2; p[nkZ] = -0.16 * h2; p[hpL] = -0.1 + 0.3 * Math.max(0, b); p[hpR] = -0.1 + 0.3 * Math.max(0, c2); p[knL] = 0.15 + 0.35 * Math.max(0, b); p[knR] = 0.15 + 0.35 * Math.max(0, c2); p[shr] = 0.02; break; }   // arms pump, hips sway, knees bounce
    case "clap": { const k = Math.abs(Math.sin(t * 9)); p[shL] = p[shR] = -1.15; p[elL] = p[elR] = -1.25; p[shL + 2] = 0.5 - 0.5 * k; p[shR + 2] = -(0.5 - 0.5 * k); p[nkX] = -0.05; p[hipY] = -0.01 * k; break; }   // hands meet in front of the chest
    case "walk": {
      const w = T * 7.5, s = Math.sin(w), c = Math.cos(w), sa = Math.sin(w - 0.3), sv = 0.7 + 0.3 * v;
      p[hpL] = -0.65 * s; p[hpR] = 0.65 * s; p[knL] = 0.12 + 0.75 * Math.max(0, c); p[knR] = 0.12 + 0.75 * Math.max(0, -c); p[anL] = 0.25 * s; p[anR] = -0.25 * s;
      p[shL] = 0.58 * sa * sv; p[shR] = -0.58 * sa * sv; p[elL] = -0.25 - 0.4 * Math.max(0, -sa); p[elR] = -0.25 - 0.4 * Math.max(0, sa); p[hdL] = -0.1 - 0.15 * Math.max(0, -sa); p[hdR] = -0.1 - 0.15 * Math.max(0, sa);   // arms swing opposite the legs, elbows bend on the forward swing
      p[hipY] = -0.012 + 0.025 * Math.abs(c) * (0.8 + 0.3 * g.b); p[hipYw] = -0.09 * s; p[spY] = 0.2 * s * sv; p[spX] = 0.05; p[spZ] = 0.03 * c; p[hipR] = 0.035 * c; p[hpL + 1] = 0.02 - 0.035 * c; p[hpR + 1] = -0.02 - 0.035 * c; p[nkY] = -0.1 * s; p[shr] = 0.006 * c; break; }
  }
}

/** fewer draw calls: static sibling meshes that share a parent + material (+ attribute layout) become one mesh. Animated/spinning/child-bearing meshes are left alone. */
function mergeStatic(objs: THREE.Object3D[]): THREE.Object3D[] {
  const groups = new Map<string, THREE.Mesh[]>(), keep: THREE.Object3D[] = [];
  for (const o of objs) {
    const m = o as THREE.Mesh, mat = m.material as THREE.Material | undefined;
    if (!m.isMesh || !m.parent || m.children.length || m.userData.spin || m.userData.hull || m.userData.keep || Array.isArray(mat) || m.geometry.groups.length || m.geometry.userData.shared) { keep.push(o); continue; }
    const g = m.geometry, k = [m.parent.uuid, mat!.uuid, Object.keys(g.attributes).sort().join(), g.index ? 1 : 0, m.castShadow ? 1 : 0, m.renderOrder, m.visible ? 1 : 0].join("|");
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(m);
  }
  for (const list of groups.values()) {
    if (list.length < 2) { keep.push(...list); continue; }
    const gs = list.map((m) => { m.updateMatrix(); return m.geometry.clone().applyMatrix4(m.matrix); }), g = mergeGeometries(gs, false);
    gs.forEach((x) => x.dispose());
    if (!g) { keep.push(...list); continue; }
    const first = list[0], mm = new THREE.Mesh(g, first.material); mm.castShadow = first.castShadow; mm.renderOrder = first.renderOrder; mm.visible = first.visible;
    first.parent!.add(mm); for (const m of list) { m.removeFromParent(); m.geometry.dispose(); } keep.push(mm);
  }
  return keep;
}

/** "rainbow" jewelry colour: the (white) material is tinted by a hue that walks around the piece */
const rainbows = new WeakMap<THREE.Material, THREE.Material>();
function rainbow(m: THREE.Material): THREE.Material {
  let r = rainbows.get(m); if (r) return r; r = m.clone(); const prev = m.onBeforeCompile, pk = m.customProgramCacheKey?.() ?? "";
  r.onBeforeCompile = (sh, rd) => { prev?.call(r, sh, rd); sh.vertexShader = "varying vec3 vRb;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vRb = position;"); sh.fragmentShader = "varying vec3 vRb;\n" + sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n { float hh = fract((vRb.x + vRb.y + vRb.z) * 9.0); diffuseColor.rgb *= clamp(abs(fract(hh + vec3(0.0, 0.6667, 0.3333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0) * 0.8 + 0.2; }"); };
  r.customProgramCacheKey = () => pk + "rainbow"; rainbows.set(m, r); return r;
}
const sm = (x: number) => x * x * (3 - 2 * x);
/** Sims-1 style soft blob shadows: one wide ambient disc under the body and a tighter contact blob under each foot */
const blobTexs: THREE.CanvasTexture[] = [];
function blob(tight = false) { const k = tight ? 1 : 0; if (blobTexs[k]) return blobTexs[k]; const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d")!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); if (tight) { gr.addColorStop(0, "rgba(20,10,15,.75)"); gr.addColorStop(0.5, "rgba(20,10,15,.4)"); gr.addColorStop(1, "rgba(20,10,15,0)"); } else { gr.addColorStop(0, "rgba(0,0,0,.42)"); gr.addColorStop(0.6, "rgba(0,0,0,.2)"); gr.addColorStop(1, "rgba(0,0,0,0)"); } g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (blobTexs[k] = new THREE.CanvasTexture(c)); }
const hulls = new Map<number, THREE.MeshBasicMaterial>();
function hull(t: number) { const k = Math.max(1, Math.round(t * 20000)); let m = hulls.get(k); if (m) return m; m = new THREE.MeshBasicMaterial({ color: 0x4a2f36, side: THREE.BackSide }); m.onBeforeCompile = (s) => { s.uniforms.uT = { value: k / 20000 }; s.vertexShader = "uniform float uT;\n" + s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed += normalize(normal) * uT;"); }; m.customProgramCacheKey = () => "hull"; hulls.set(k, m); return m; }

export type Char3DEx = Char3D & {
  seatHeight: number; setBag(mode: "worn" | "hidden"): void; tris(): number; partMeshes(): Record<string, number>; partTris(): Record<string, number>;
  /** force a blink now */ blink(): void;
  /** customizer hooks: the region ids this character exposes, and the paint layer (a CanvasTexture the customizer draws on; call tex.needsUpdate = true after drawing) */
  readonly regionIds: readonly string[]; paintTexture(region: string): THREE.CanvasTexture; exportPaint(region: string): string | null;
  /** ray-pick a customizer region: its id plus the paint-canvas uv (0..1, v up) of the hit */
  pick(ray: THREE.Raycaster): { region: string; u: number; v: number } | null;
  /** pulse a glowing overlay on a region (null = off) */
  highlight(region: string | null): void;
};
const PAINT_REGIONS = Object.values(PAINT_PARTS);
const sat = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
type MP = { o: number; w: number; c: number; p: number };
/** what the face does for each animation when nobody is talking: [viseme, brow, squint] */
const ANIM_FACE: Partial<Record<Anim, [MouthShape, number]>> = { cheer: ["smile", 0.5], wave: ["smile", 0.3], raise: ["smile", 0.15], shrug: ["frown", 0.6], shake: ["mbp", -0.15], nod: ["smile", 0.1], think: ["closed", 0.25], point: ["closed", 0.1], hip: ["smile", 0] };

export function createChar3D(style: Style, spec0: AvatarSpec): Char3DEx {
  const pixar = style.id === "pixar", owned: (THREE.Material | THREE.Texture)[] = [];
  const paints = new Map<string, { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; src: string }>();
  let curPart = "";
  const partMats: Record<string, Map<string, { dispose(): void }>> = {};   // per-character paint clones and hair materials, disposed when their part is rebuilt
  const own = (x: THREE.Material | THREE.Texture, k = "") => { (partMats[curPart] ??= new Map()).set(k || x.uuid, x); };
  const ctx: Ctx = {
    mat: (k, c, o) => {
      if (c === "rainbow") return rainbow(style.mat(k, "#ffffff", o));
      const m = rim(style.mat(k, c, o), pixar), rid = PAINT_PARTS[curPart], pt = rid ? paints.get(rid)?.tex : null, skip = k === "glass" || k === "eye" || k === "emissive" || k === "metal", det = SEAM_PARTS.has(curPart) && (k === "cloth" || k === "knit" || k === "denim");
      if (!pt || skip) return decorate(m, { detail: det });
      const ck = m.uuid + (det ? "d" : ""); return (partMats[curPart]?.get(ck) as THREE.Material | undefined) ?? decorate(m, { detail: det, paint: pt }, (x) => own(x, ck));
    }, lod: pixar ? 1 : 0, pixar, track: (m) => own(m),
  };
  const rig: Rig = makeRig(), root = new THREE.Group(); root.add(rig.root);
  const parts: Record<string, THREE.Object3D[]> = {}, sigs: Record<string, string> = {};
  let raw = spec0, spec = effSpec(spec0), face: Face | null = null, packG: THREE.Group | null = null, bag: "worn" | "hidden" = "worn", hatR = 1.17, curH = 1.6, bw = 1, legS = 1, armS = 1, legY = 0, rootS = 1, hairYr: [number, number] = [-1, 1], hi: string | null = null, hiMeshes: THREE.Mesh[] = [], hairMesh: THREE.Mesh | null = null, sHead = 0.165;
  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blob(), transparent: true, depthWrite: false, opacity: 0.8 })); shadowDisc.position.y = 0.004; shadowDisc.renderOrder = -1; rig.root.add(shadowDisc);
  const contact = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.46).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blob(true), transparent: true, depthWrite: false, opacity: 0.7 })); m.position.y = 0.006; m.renderOrder = -1; rig.root.add(m); return m; });

  const rg = (id: string): RegionSpec => raw.regions?.[id] ?? {};
  const sig = (name: string) => KEYS[name].map((k) => String((spec as any)[k] ?? "")).join("|") + (REGION_OF[name] ?? []).map((id) => JSON.stringify(raw.regions?.[id] ?? 0, (k, v) => (k === "paint" ? (v ? 1 : 0) : v))).join("|") + (PAINT_PARTS[name] && paints.has(PAINT_PARTS[name]) ? "P" : "");
  const clear = (name: string) => {
    for (const o of parts[name] ?? []) { o.removeFromParent(); o.traverse((c: any) => { if (c.geometry && !c.geometry.userData.shared) c.geometry.dispose(); }); }
    parts[name] = []; partMats[name]?.forEach((m) => m.dispose()); partMats[name]?.clear();
    if (name === "face") { face?.dispose(); face = null; }
    if (name === "hair") hairMesh = null;
    if (name === "pack") packG = null;
  };
  const finish = (objs: THREE.Object3D[], outline = false) => {
    for (const o of objs) o.traverse((c) => {
      const m = c as THREE.Mesh; if (!m.isMesh) return;
      const mat = m.material as any; if (mat.isMeshBasicMaterial && !m.userData.hull) { m.castShadow = false; return; }
      m.castShadow = !m.userData.noShadow; m.receiveShadow = true;
    });
    if (!pixar && outline) {
      root.updateMatrixWorld(true);
      for (const o of objs) o.traverse((c) => { const m = c as THREE.Mesh; if (!m.isMesh || m.userData.hull || !m.geometry || (m.material as any).side === THREE.DoubleSide || m.geometry.attributes.position.count < 220) return; const h = new THREE.Mesh(m.geometry, hull(0.0065 / (m.matrixWorld.getMaxScaleOnAxis() || 1))); h.userData.hull = true; h.castShadow = false; m.add(h); });
    }
  };
  /** per-region width/length multipliers (clamped by normalizeRegions): garments stretch about their hem/collar, shoes get wider/longer, bags and jewelry resize */
  const fitRegion = (name: string, objs: THREE.Object3D[]) => {
    const ids = REGION_OF[name] ?? (name === "pack" ? ["backpack"] : []); const r = ids.length ? rg(ids[0]) : {}, w = r.w ?? 1, l = r.l ?? 1; if (name === "pack") { const q = rg("backpack"); if (packG && ((q.w ?? 1) !== 1 || (q.l ?? 1) !== 1)) packG.scale.set(q.w ?? 1, q.l ?? 1, q.w ?? 1); return; }
    if (w === 1 && l === 1 && name !== "wrist") return;
    for (const o of objs) {
      const par = o.parent, torso = par === rig.spine || par === rig.pelvis, pv = name === "bottom" ? 0.04 : 0.47;
      if (name === "top" || name === "outer" || name === "bottom") { o.scale.x *= w; o.scale.z *= w; o.position.x *= torso ? w : 1; o.position.z *= torso ? w : 1; if (torso) { o.position.y = o.position.y * l + pv * (1 - l); o.scale.y *= l; } }
      else if (name === "shoes") { o.scale.x *= w; o.scale.z *= l; o.position.z *= l; }
      else if (name === "hat") o.scale.set(o.scale.x * w, o.scale.y * l, o.scale.z * w);
      else if (name === "neck") o.scale.multiplyScalar(w);
      else if (name === "wrist") { const wr = rg("jewelry.wrists").w ?? 1, fr = rg("jewelry.fingers").w ?? 1; if (wr !== 1 || fr !== 1) o.scale.multiplyScalar(o.position.y < -0.05 ? fr : wr); }
    }
  };
  const build = (name: string) => {
    clear(name); shapeOf(spec); curPart = name; let objs: THREE.Object3D[] = [], ol = false;
    switch (name) {
      case "scale": {
        const pr = propFor(spec.age, spec.prop), lm = spec.limbs ?? 1, sw = (spec.shoulder ?? 1) * pr.sh;
        bw = bwOf(spec.build); const [, ay] = headScale(spec.faceShape); legS = pr.leg * lm; armS = pr.arm * lm; legY = (legS - 1) * 0.805; curH = (H[spec.age] ?? 1.62) * (spec.height || 1);
        // head from the age table: body height / heads-tall gives the head height; sHead is its radius. rootS then makes the whole figure (feet to crown) exactly curH.
        const heads = (HEADS[spec.prop ?? "chibi"] ?? HEADS.chibi)[spec.age] ?? 5.2, hh = (1.415 + legY) / (heads - 0.98), hs = spec.headSize || 1;
        sHead = (hh / (2 * ay)) * hs; rootS = curH / (1.415 + legY + 1.96 * sHead * ay); rig.root.scale.setScalar(rootS); fitRig(rig, bw, sw);
        for (let i = 0; i < 2; i++) { rig.hip[i].scale.set(1, legS, 1); rig.ankle[i].scale.set(1, 1 / legS, 1); rig.shoulder[i].scale.set(1, armS, 1); rig.wrist[i].scale.set(1, 1 / armS, 1); }
        rig.head.scale.setScalar(sHead); rig.head.position.y = 0.065 + sHead * ay * 0.96; break; }
      case "body": objs = buildBody(ctx, rig, spec, bw); ol = true; break;
      case "face": { const hc = spec.hair; face = buildFace(ctx, spec, hc); rig.head.add(face.group); objs = [face.group]; ol = false; for (const m of face.group.children) if ((m as THREE.Mesh).isMesh && (m as THREE.Mesh).geometry.attributes.position.count > 1500) { /* skull */ const mm = m as THREE.Mesh; objs.push(mm); } break; }
      case "hair": {
        const h = buildHair(spec, ctx.lod); hatR = h.hatR;
        if (h.geo) {
          const [ax, ay, az] = headScale(spec.faceShape), cv = ["cap", "beanie", "bucket", "sunhat", "beret", "bandana"].includes(spec.hat) ? 0.93 : 1, hr = rg("hair"), yr = (hairYr = ((): [number, number] => { h.geo!.computeBoundingBox(); return [h.geo!.boundingBox!.min.y, h.geo!.boundingBox!.max.y]; })()), rw = hr.w ?? 1, rl = hr.l ?? 1, baseM = style.mat("hair", "#ffffff", { side: THREE.DoubleSide }), hi = new THREE.Color(h.hi);
          const mk = (g: THREE.BufferGeometry, shell: boolean) => { const m = new THREE.Mesh(g, hairMaterial(baseM, shell, hi, (x) => own(x), paints.get("hair")?.tex, yr)); m.scale.set(ax * cv * rw, ay * cv * rl, az * cv * rw); if (shell) m.userData.noShadow = true; rig.head.add(m); return m; };
          hairMesh = mk(h.geo, false); objs = [hairMesh]; if (h.shell) objs.push(mk(h.shell, true)); ol = true;
        }
        break; }
      case "hat": objs = buildHat(ctx, rig, spec, hatR); break;
      case "glasses": objs = buildGlasses(ctx, rig, spec); break;
      case "hextra": objs = buildHeadExtra(ctx, rig, spec, hatR); break;
      case "top": objs = buildTop(ctx, rig, spec, bw); ol = true; break;
      case "outer": if (spec.outer && spec.outer !== "none") { objs = buildTop(ctx, rig, { ...spec, top: spec.outer, shirt: spec.outerColor ?? "#8a6a4a", shirt2: spec.outerColor2 ?? "#fff6ea", pattern: spec.outerPattern ?? "solid", patColor: spec.outerPatColor, trim: spec.outerTrim, emblem: "none" }, bw, 0.02); ol = true; } break;
      case "neck": objs = buildNeck(ctx, rig, spec, bw); break;
      case "wrist": objs = buildWrist(ctx, rig, spec); break;
      case "bottom": objs = buildBottom(ctx, rig, spec, bw); ol = ctx.lod === 1; break;
      case "socks": objs = buildSocks(ctx, rig, spec, bw); break;
      case "shoes": objs = buildShoes(ctx, rig, spec); break;
      case "pack": { const p = buildPack(ctx, rig, spec, bw); packG = p.group; objs = p.out; packG.visible = bag === "worn"; break; }
      case "bextra": objs = buildBodyExtra(ctx, rig, spec, bw); break;
    }
    if (name !== "scale") fitRegion(name, objs);
    curPart = "";
    objs = mergeStatic(objs); for (const o of objs) o.traverse((c) => { c.userData.part = name; }); parts[name] = objs; sigs[name] = sig(name); finish(objs, ol);
  };
  /** load a saved paint layer (data URL) into the region's canvas */
  const loadPaint = (id: string) => {
    const src = rg(id).paint; let e = paints.get(id);
    if (!src) { if (e && e.src) { e.src = ""; e.cv.getContext("2d")!.clearRect(0, 0, e.cv.width, e.cv.height); e.tex.needsUpdate = true; } return; } if (!e) e = mkPaint(id); if (e.src === src) return; e.src = src;
    const img = new Image(); img.onload = () => { if (paints.get(id) !== e) return; const g = e!.cv.getContext("2d")!; g.clearRect(0, 0, e!.cv.width, e!.cv.height); g.drawImage(img, 0, 0, e!.cv.width, e!.cv.height); e!.tex.needsUpdate = true; }; img.src = src;
  };
  const mkPaint = (id: string) => { const cv = document.createElement("canvas"); cv.width = cv.height = 512; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = 4; const e = { cv, tex, src: "" }; paints.set(id, e); owned.push(tex); return e; };
  const hiMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); owned.push(hiMat as any);
  const applyHi = () => {
    for (const m of hiMeshes) m.removeFromParent(); hiMeshes = []; if (!hi) return;
    for (const [name, list] of Object.entries(parts)) if (PICK_REGION[name] === hi) for (const o of list) o.traverse((c) => { const m = c as THREE.Mesh; if (!m.isMesh || m.userData.hull || m.userData.overlay || (m.material as any).isMeshBasicMaterial || !m.geometry) return; const x = new THREE.Mesh(m.geometry, hiMat); x.userData.overlay = true; x.castShadow = false; x.raycast = () => {}; m.add(x); hiMeshes.push(x); });
  };
  const setSpec = (s: AvatarSpec) => {
    raw = { ...s, regions: normalizeRegions(s.regions) }; spec = effSpec(raw);
    for (const id of PAINT_REGIONS) loadPaint(id);
    for (const name of ORDER) {
      if (sigs[name] === sig(name) && (parts[name] || name === "scale")) continue;
      build(name);
    }
    applyHi();
  };

  /* ---------------------------------------------------------------- animation state */
  const cur = new Float32Array(N), from = new Float32Array(N), tgt = new Float32Array(N), AV = () => AGEV[spec.age] ?? AGEV.g68;
  let anim: Anim = "idle", time = Math.random() * 10, bl = 1, speaking = false, blinkAt = 1.5 + Math.random() * 3, blinkT = -1, dartAt = 1, gx = 0, gy = 0, tgx = 0, tgy = 0, look: THREE.Vector3 | null = null;
  let hy = 0, hp = 0, glanceAt = 1 + Math.random() * 2, gyT = 0, gpT = 0;
  let manualMouth: MouthPose | null = null, manualBrow: number | null = null, visT = 0, vis: MouthPose = VISEMES.closed, energy = 1, browAt = 2 + Math.random() * 4, browPulse = 0, brow = 0;
  const mCur: MP = { o: 0, w: 1, c: 0, p: 0 }, tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const TALK: [MouthShape, number][] = [["small", 3], ["wide", 2.2], ["o", 1.1], ["mbp", 1.2], ["small", 2], ["closed", 0.7], ["wide", 1]];
  const pickViseme = () => { let t = Math.random() * TALK.reduce((a, [, w]) => a + w, 0); for (const [k, w] of TALK) { t -= w; if (t <= 0) return k; } return "small" as MouthShape; };
  pose("idle", time, cur, AV()); from.set(cur);
  const apply = (p: Float32Array, lookYaw: number, lookPitch: number) => {
    rig.pelvis.position.set(p[pelX], DIM.pelvisY + legY + p[hipY] - Math.min(1, Math.max(0, -p[hipY] / 0.405)) * (legS - 1) * 0.41, p[hipZ]); rig.pelvis.rotation.set(p[hipX], p[hipYw], p[hipR]);
    rig.spine.rotation.set(p[spX], p[spY], p[spZ]);
    rig.neck.rotation.set(p[nkX] - lookPitch * 0.6, p[nkY] + lookYaw * 0.6 - (p[spY] + p[hipYw]) * 0.7, p[nkZ]);
    rig.shoulder[0].position.y = rig.shoulder[1].position.y = DIM.shoulderY - 0.01 + p[shr];
    rig.shoulder[0].rotation.set(p[shL], p[shL + 1], p[shL + 2]); rig.shoulder[1].rotation.set(p[shR], p[shR + 1], p[shR + 2]);
    rig.elbow[0].rotation.set(p[elL], 0, p[ezL]); rig.elbow[1].rotation.set(p[elR], 0, p[ezR]);
    rig.wrist[0].rotation.set(p[hdL], 0, 0); rig.wrist[1].rotation.set(p[hdR], 0, 0);
    rig.hip[0].rotation.set(p[hpL], 0, p[hpL + 1]); rig.hip[1].rotation.set(p[hpR], 0, p[hpR + 1]);
    rig.knee[0].rotation.set(p[knL], 0, 0); rig.knee[1].rotation.set(p[knR], 0, 0);
    rig.ankle[0].rotation.set(p[anL], 0, 0); rig.ankle[1].rotation.set(p[anR], 0, 0);
  };
  const update = (dt: number) => {
    dt = Math.min(dt, 0.1); time += dt; pose(anim, time, tgt, AV());
    if (bl < 1) { bl = Math.min(1, bl + dt / 0.25); const s = sm(bl); for (let i = 0; i < N; i++) cur[i] = from[i] + (tgt[i] - from[i]) * s; } else cur.set(tgt);
    /* head look-at: toward the target when set, else an occasional idle glance; the head eases, the eyes lead it */
    let yaw = 0, pitch = 0;
    if (look) {
      rig.head.getWorldPosition(tmp2); rig.root.worldToLocal(tmp2); tmp.copy(look); rig.root.worldToLocal(tmp); tmp.sub(tmp2); yaw = Math.atan2(tmp.x, tmp.z); pitch = Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)); yaw = Math.max(-1.1, Math.min(1.1, yaw)); pitch = Math.max(-0.6, Math.min(0.6, pitch)); if (Math.abs(yaw) > 1.0 && tmp.z < 0) { yaw = 0; pitch = 0; }
    } else {
      glanceAt -= dt; if (glanceAt <= 0) { glanceAt = 2.2 + Math.random() * 4.5; const big = Math.random() < 0.25, m = AV().v * (anim === "type" ? 0.4 : 1); gyT = (Math.random() - 0.5) * (big ? 1.0 : 0.45) * m; gpT = (Math.random() - 0.35) * 0.25 * m; }
      if (anim !== "walk") { yaw = gyT; pitch = gpT; }
    }
    const kh = 1 - Math.exp(-dt * (look ? 6 : 3.5)); hy += (yaw - hy) * kh; hp += (pitch - hp) * kh;
    apply(cur, hy, hp);
    // eyes: darting + blink (sometimes double) ; they lead the head toward the target
    blinkAt -= dt; if (blinkAt <= 0 && blinkT < 0) { blinkT = 0; blinkAt = Math.random() < 0.18 ? 0.22 : 2 + Math.random() * 4; }
    let blink = 0; if (blinkT >= 0) { blinkT += dt; blink = Math.sin(Math.min(1, blinkT / 0.17) * Math.PI); if (blinkT > 0.17) blinkT = -1; }
    dartAt -= dt; if (dartAt <= 0) { dartAt = 0.8 + Math.random() * 2.2; tgx = (Math.random() - 0.5) * 0.3; tgy = (Math.random() - 0.5) * 0.14; }
    const k = 1 - Math.exp(-dt * 14), lx = sat((yaw - hy) * 1.2 + (look ? 0 : tgx) * 0.8 + (look ? tgx * 0.2 : 0), -0.45, 0.45), ly = sat(-(pitch - hp) * 1.2 + (look ? 0 : tgy) * 0.8, -0.3, 0.3); gx += (lx - gx) * k; gy += (ly - gy) * k;
    /* mouth: held shape > talking viseme loop > the anim's expression */
    const talking = speaking || anim === "talk", af = ANIM_FACE[anim] ?? ["closed", 0] as [MouthShape, number], base = VISEMES[af[0]];
    let tgt2: MouthPose;
    if (manualMouth) tgt2 = manualMouth;
    else if (talking) {
      visT -= dt; energy = 0.65 + 0.35 * Math.sin(time * 2.7) * Math.sin(time * 1.3 + 1);
      if (visT <= 0) { const sh = pickViseme(); vis = VISEMES[sh]; visT = sh === "mbp" || sh === "closed" ? 0.07 + Math.random() * 0.05 : 0.08 + Math.random() * 0.12; if (sh === "wide" && Math.random() < 0.3) browPulse = Math.max(browPulse, 0.8); }
      tgt2 = { o: vis.o * energy, w: vis.w, c: base.c + vis.c * 0.4 + 0.02, p: vis.p };
    } else tgt2 = base;
    const km = 1 - Math.exp(-dt * (talking && !manualMouth ? 26 : 9)); mCur.o += (tgt2.o - mCur.o) * km; mCur.w += (tgt2.w - mCur.w) * km; mCur.c += (tgt2.c - mCur.c) * km; mCur.p += (tgt2.p - mCur.p) * km;
    /* brows: idle flashes, speech stress, expression */
    browAt -= dt; if (browAt <= 0) { browAt = 3 + Math.random() * 5; browPulse = 1; } browPulse = Math.max(0, browPulse - dt * 1.7);
    const bt = manualBrow !== null ? manualBrow : af[1] + (browPulse > 0 ? Math.sin(Math.PI * (1 - browPulse)) * 0.4 : 0); brow += (bt - brow) * (1 - Math.exp(-dt * 12));
    face?.set({ blink, gx, gy, mouth: mCur.o, mw: mCur.w, mc: mCur.c, mp: mCur.p, brow, squint: sat(mCur.c * 2.2, 0, 0.35) });
    if (packG) { const sitting = anim === "sit" || anim === "type" || anim === "raise" || anim === "lean"; packG.position.z += ((sitting ? -0.05 : 0) - packG.position.z) * 0.2; packG.position.y += ((sitting ? 0.03 : 0) - packG.position.y) * 0.2; }
    if (hi) hiMat.opacity = 0.11 + 0.08 * Math.sin(time * 6);
    for (const o of parts.hextra ?? []) if (o.userData.spin) o.rotation.y += dt * o.userData.spin;
    for (let i = 0; i < 2; i++) { rig.ankle[i].getWorldPosition(tmp); rig.root.worldToLocal(tmp); contact[i].position.set(tmp.x, 0.006, tmp.z + 0.05); (contact[i].material as THREE.MeshBasicMaterial).opacity = 0.7 * sat(1 - tmp.y / (0.28 * rootS)); }
  };

  setSpec(spec0); root.updateMatrixWorld(true);
  const v = new THREE.Vector3(), wp = (o: THREE.Object3D, x = 0, y = 0, z = 0) => { root.updateWorldMatrix(true, true); return o.localToWorld(v.set(x, y, z)).clone(); };
  const api: Char3DEx = {
    root, setSpec, update,
    play(a) { if (a === anim) return; from.set(cur); bl = 0; anim = a; },
    lookAt(t) { look = t ? t.clone() : null; },
    speak(on) { if (on && !speaking) visT = 0; speaking = on; },
    setMouth(m) { manualMouth = m === null ? null : typeof m === "number" ? { o: sat(m), w: 1, c: 0, p: 0 } : VISEMES[m] ?? null; },
    setBrow(b) { manualBrow = b === null ? null : sat(b, -1, 1); },
    blink() { if (blinkT < 0) blinkT = 0; },
    get height() { return curH; },
    get regionIds() { return REGION_IDS; },
    pick(ray) {
      root.updateWorldMatrix(true, true);
      for (const h of ray.intersectObject(root, true)) {
        const m = h.object as THREE.Mesh, part = m.userData.part as string | undefined, region = part && PICK_REGION[part]; if (!region || m.userData.hull || m.userData.overlay || m.visible === false) continue;
        if (part === "hair") { const p = m.worldToLocal(h.point.clone()), yr = hairYr; return { region, u: Math.atan2(p.x, p.z) / (Math.PI * 2) + 0.5, v: sat((p.y - yr[0]) / (yr[1] - yr[0])) }; }
        return h.uv ? { region, u: h.uv.x, v: h.uv.y } : { region, u: 0.5, v: 0.5 };
      }
      return null;
    },
    highlight(id) { hi = id; applyHi(); },
    paintTexture(id) { let e = paints.get(id); if (!e) { e = mkPaint(id); const names = Object.entries(PAINT_PARTS).filter(([, r]) => r === id).map(([n]) => n); for (const n of names) { sigs[n] = ""; } setSpec(raw); } return e.tex; },
    exportPaint(id) {
      const e = paints.get(id); if (!e) return null;
      for (const px of [256, 128]) {   // small + compressed: webp where the browser can encode it (else png), shrunk again if still large
        const c = document.createElement("canvas"); c.width = c.height = px; c.getContext("2d")!.drawImage(e.cv, 0, 0, px, px);
        const d = c.toDataURL("image/webp", 0.8); if (d.length <= 40000 || px === 128) { e.src = d; return d; }
      }
      return null;
    },
    anchor(part) { switch (part) { case "head": return wp(rig.head, 0, 0, 0); case "torso": return wp(rig.spine, 0, 0.25, 0); case "legs": return wp(rig.knee[0], -0.075 * bw, 0, 0); case "feet": return wp(rig.ankle[0], -0.075 * bw, -0.06, 0.05); case "bag": return wp(rig.spine, 0, 0.24, -0.2); case "hat": return wp(rig.head, 0, 1.2, 0); } },
    dispose() { for (const n of Object.keys(parts)) clear(n); root.removeFromParent(); shadowDisc.geometry.dispose(); (shadowDisc.material as THREE.Material).dispose(); for (const c of contact) { c.geometry.dispose(); (c.material as THREE.Material).dispose(); } owned.forEach((o) => o.dispose()); owned.length = 0; },
    get seatHeight() { return (DIM.pelvisY + legY + SIT_DROP - (legS - 1) * 0.41 - 0.079) * rootS; },
    setBag(m) { bag = m; if (packG) packG.visible = m === "worn"; },
    partTris() { const o: Record<string, number> = {}; for (const [n, l] of Object.entries(parts)) { let t = 0; for (const x of l) x.traverse((m: any) => { if (m.isMesh) t += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }); o[n] = Math.round(t); } return o; },
    partMeshes() { const o: Record<string, number> = {}; for (const [n, l] of Object.entries(parts)) { let t = 0; for (const x of l) x.traverse((m: any) => { if (m.isMesh) t++; }); o[n] = t; } return o; },
    tris() { let n = 0; root.traverse((o: any) => { if (o.isMesh && o.visible) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return Math.round(n); },
  };
  return api;
}
