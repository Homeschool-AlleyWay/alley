/** Procedural 3D character built from the same AvatarSpec as the 2D rig. See types.ts (Char3D). Faces +z, feet at y = 0, origin between the feet. */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { AvatarSpec } from "../hall3d/avatar";
import type { Anim, Char3D, Style } from "./types";
import { makeRig, fitRig, buildBody, bwOf, DIM, shapeOf, type Rig } from "./char-parts/body";
import { buildFace, headScale, type Face, type Ctx } from "./char-parts/face";
import { buildHair } from "./char-parts/hair";
import { buildTop, buildNeck, buildWrist, buildBottom, buildSocks, buildShoes } from "./char-parts/clothes";
import { buildHat, buildGlasses, buildHeadExtra, buildBodyExtra, buildPack } from "./char-parts/items";

const H: Record<string, number> = { k2: 1.05, g35: 1.22, g68: 1.42, hs: 1.62, adult: 1.74 }, HEADMUL: Record<string, number> = { k2: 1.3, g35: 1.18, g68: 1.08, hs: 1.0, adult: 0.94 };
/** proportion styles: head scale (and how strongly the age band's big-head factor applies), leg / arm length, shoulder width */
const PROP: Record<string, { head: number; ageExp: number; leg: number; arm: number; sh: number }> = {
  chibi: { head: 1, ageExp: 1, leg: 0.94, arm: 0.96, sh: 1 }, stylised: { head: 0.84, ageExp: 0.85, leg: 1.04, arm: 1.02, sh: 1 }, realistic: { head: 0.7, ageExp: 0.6, leg: 1.14, arm: 1.08, sh: 1.04 },
};
const BASE_H = 1.8;
const KEYS: Record<string, (keyof AvatarSpec)[]> = {
  scale: ["age", "height", "headSize", "faceShape", "prop", "shoulder", "waist", "hips", "limbs", "build"],
  body: ["skin", "build", "prop", "shoulder", "waist", "hips", "limbs"],
  face: ["skin", "faceShape", "eyeShape", "eyeColor", "eyeColor2", "eyeShadow", "liner", "brow", "browColor", "hair", "blush", "freckles", "mole", "nose", "nosePin", "mark", "mouthStyle", "lip", "noseShape", "earShape", "earrings", "earStyle", "beard", "beardColor", "age"],
  hair: ["hairStyle", "hair", "hair2", "hl", "part", "fringe", "clip", "hat", "hatColor"],
  hat: ["hat", "hatColor", "hat2", "hairStyle"], glasses: ["glasses", "glassColor", "faceShape"], hextra: ["extra", "extraColor", "hairStyle", "hat"],
  top: ["top", "shirt", "shirt2", "pattern", "patColor", "trim", "emblem", "build", "shoulder", "waist", "hips"], outer: ["outer", "outerColor", "outerColor2", "outerPattern", "outerPatColor", "outerTrim", "build", "shoulder", "waist", "hips"], neck: ["neckwear", "neckColor", "scarf", "badge", "top", "outer", "build", "shoulder", "waist", "hips"], wrist: ["wrist", "wristColor", "age"],
  bottom: ["bottom", "pants", "pantsPattern", "pantsPatColor", "pantsTrim", "top", "shirt", "shirt2", "build", "shoulder", "waist", "hips"], socks: ["socks", "sockColor", "build"], shoes: ["shoeStyle", "shoes", "shoes2", "skin"], pack: ["packStyle", "pack", "pack2", "build", "shoulder", "waist", "hips"], bextra: ["extra", "extraColor", "build", "shoulder", "waist", "hips"],
};
const ORDER = ["scale", "body", "face", "hair", "hat", "glasses", "hextra", "top", "outer", "neck", "wrist", "bottom", "socks", "shoes", "pack", "bextra"];

/* pose vector layout */
const hipY = 0, hipZ = 1, hipX = 2, spX = 3, spY = 4, spZ = 5, nkX = 6, nkY = 7, nkZ = 8, shL = 9, shR = 12, elL = 15, elR = 16, hdL = 17, hdR = 18, hpL = 19, hpR = 21, knL = 23, knR = 24, anL = 25, anR = 26, ezL = 27, ezR = 28, N = 29;
const SIT_DROP = -0.405;
/** soft rim light + a faint top-down painted gradient on the toon materials (papercut style); cloned once per source material so the room is untouched */
const rimMats = new WeakMap<THREE.Material, THREE.Material>();
function rim(m: THREE.Material): THREE.Material {
  if (!(m as any).isMeshToonMaterial) return m; let r = rimMats.get(m); if (r) return r; r = m.clone();
  r.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("#include <opaque_fragment>", "float rimK = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.6);\n outgoingLight = outgoingLight * (0.95 + 0.07 * normalize(vNormal).y) + rimK * 0.16 * vec3(1.0, 0.95, 0.86);\n#include <opaque_fragment>"); };
  r.customProgramCacheKey = () => "charRim"; rimMats.set(m, r); return r;
}

function pose(a: Anim, t: number, p: Float32Array) {
  p.fill(0);
  const br = Math.sin(t * 1.7), sw = Math.sin(t * 0.55);
  // base standing
  p[spX] = 0.02 * br; p[spZ] = 0.02 * sw; p[hipX] = 0.012 * sw; p[nkX] = -0.01 * br;
  p[shL + 2] = 0.1 + 0.012 * br; p[shR + 2] = -(0.1 + 0.012 * br); p[elL] = p[elR] = -0.14; p[hdL] = p[hdR] = -0.12;
  p[hpL + 1] = 0.02 + 0.015 * sw; p[hpR + 1] = -0.02 + 0.015 * sw;
  const sit = () => { p[hipY] = SIT_DROP; p[hipZ] = -0.01; p[hipX] = 0; p[hpL] = p[hpR] = -1.53; p[hpL + 1] = 0.05; p[hpR + 1] = -0.05; p[knL] = p[knR] = 1.51; p[anL] = p[anR] = 0.03; p[spX] = 0.02 * br; p[spZ] = 0; };
  switch (a) {
    case "wave": p[shR + 2] = -2.75; p[shR] = 0.1; p[elR] = -0.3; p[ezR] = Math.sin(t * 9) * 0.5; p[nkZ] = -0.08; p[nkY] = 0.12; p[spZ] += 0.03; break;
    case "sit": sit(); p[shL] = p[shR] = -0.45; p[elL] = p[elR] = -0.95; p[shL + 2] = 0.12; p[shR + 2] = -0.12; p[hdL] = p[hdR] = 0; p[nkX] = 0.03; break;
    case "raise": sit(); p[shL] = p[shR] = -0.45; p[elL] = -0.95; p[shL + 2] = 0.12; p[shR + 2] = -2.55; p[shR] = 0.05; p[elR] = -0.25; p[hdL] = 0; p[nkX] = -0.04; p[nkZ] = -0.06; break;   // seated, right hand up (classroom)
    case "type": { sit(); p[shL] = p[shR] = -0.78; p[shL + 2] = 0.1; p[shR + 2] = -0.1; p[elL] = -1.32 + 0.05 * Math.sin(t * 13); p[elR] = -1.32 + 0.05 * Math.sin(t * 13 + 2); p[hdL] = 0.3 + 0.2 * Math.sin(t * 15); p[hdR] = 0.3 + 0.2 * Math.sin(t * 15 + 1.7); p[nkX] = 0.2; p[spX] = 0.06; break; }
    case "talk": { const g = Math.sin(t * 2.3), g2 = Math.sin(t * 1.9 + 2); p[shR] = -0.55 + 0.3 * g; p[shR + 2] = -0.3; p[elR] = -1.05 + 0.4 * Math.sin(t * 2.3 + 1); p[shL] = -0.3 + 0.2 * g2; p[shL + 2] = 0.22; p[elL] = -0.8 + 0.3 * Math.sin(t * 1.9); p[nkX] = 0.05 * Math.sin(t * 3.1); p[nkY] = 0.1 * Math.sin(t * 0.8); p[spY] = 0.05 * Math.sin(t * 0.8); break; }
    case "think": p[shR] = -1.12; p[shR + 2] = -0.12; p[elR] = -2.25; p[hdR] = -0.2; p[shL] = -0.55; p[shL + 2] = 0.05; p[elL] = -1.6; p[nkZ] = 0.14; p[nkX] = -0.08; p[nkY] = -0.1; p[spZ] += 0.03; p[hipX] += 0.02; break;
    case "cheer": { const b = Math.sin(t * 8); p[shL + 2] = 2.7 + 0.18 * b; p[shR + 2] = -(2.7 - 0.18 * b); p[elL] = p[elR] = -0.25; p[hipY] = Math.abs(Math.sin(t * 4)) * 0.07 - 0.04; p[hpL] = p[hpR] = -0.1; p[knL] = p[knR] = 0.25; p[spX] = -0.08; p[nkX] = -0.22; p[nkZ] = 0.06 * b; break; }
    case "walk": { const w = t * 7.5, s = Math.sin(w), c = Math.cos(w); p[hpL] = -0.65 * s; p[hpR] = 0.65 * s; p[knL] = 0.12 + 0.75 * Math.max(0, c); p[knR] = 0.12 + 0.75 * Math.max(0, -c); p[anL] = 0.25 * s; p[anR] = -0.25 * s; p[shL] = 0.6 * s; p[shR] = -0.6 * s; p[elL] = -0.3 - 0.3 * Math.max(0, -s); p[elR] = -0.3 - 0.3 * Math.max(0, s); p[hipY] = -0.012 + 0.025 * Math.abs(c); p[spY] = 0.12 * s; p[spX] = 0.05; p[nkY] = -0.1 * s; p[spZ] = 0.03 * c; break; }
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

const sm = (x: number) => x * x * (3 - 2 * x);
let blobTex: THREE.CanvasTexture | null = null;
function blob() { if (blobTex) return blobTex; const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d")!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(0.55, "rgba(0,0,0,.25)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); blobTex = new THREE.CanvasTexture(c); return blobTex; }
const hulls = new Map<number, THREE.MeshBasicMaterial>();
function hull(t: number) { const k = Math.max(1, Math.round(t * 20000)); let m = hulls.get(k); if (m) return m; m = new THREE.MeshBasicMaterial({ color: 0x4a2f36, side: THREE.BackSide }); m.onBeforeCompile = (s) => { s.uniforms.uT = { value: k / 20000 }; s.vertexShader = "uniform float uT;\n" + s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed += normalize(normal) * uT;"); }; m.customProgramCacheKey = () => "hull"; hulls.set(k, m); return m; }

export type Char3DEx = Char3D & { seatHeight: number; setBag(mode: "worn" | "hidden"): void; tris(): number; partMeshes(): Record<string, number>; partTris(): Record<string, number> };

export function createChar3D(style: Style, spec0: AvatarSpec): Char3DEx {
  const pixar = style.id === "pixar", owned: (THREE.Material | THREE.Texture)[] = [];
  const ctx: Ctx = { mat: (k, c, o) => (pixar ? style.mat(k, c, o) : rim(style.mat(k, c, o))), lod: pixar ? 1 : 0, pixar, track: (m) => owned.push(m) };
  const rig: Rig = makeRig(), root = new THREE.Group(); root.add(rig.root);
  const parts: Record<string, THREE.Object3D[]> = {}, sigs: Record<string, string> = {};
  let spec = spec0, face: Face | null = null, packG: THREE.Group | null = null, bag: "worn" | "hidden" = "worn", hatR = 1.17, curH = 1.6, bw = 1, legS = 1, armS = 1, legY = 0, rootS = 1, hairMesh: THREE.Mesh | null = null, sHead = 0.165;
  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blob(), transparent: true, depthWrite: false, opacity: 0.7 })); shadowDisc.position.y = 0.004; shadowDisc.renderOrder = -1; rig.root.add(shadowDisc);

  const sig = (name: string) => KEYS[name].map((k) => String((spec as any)[k] ?? "")).join("|");
  const clear = (name: string) => {
    for (const o of parts[name] ?? []) { o.removeFromParent(); o.traverse((c: any) => { if (c.geometry) c.geometry.dispose(); }); }
    parts[name] = [];
    if (name === "face") { face?.dispose(); face = null; }
    if (name === "hair") hairMesh = null;
    if (name === "pack") packG = null;
  };
  const finish = (objs: THREE.Object3D[], outline = false) => {
    for (const o of objs) o.traverse((c) => {
      const m = c as THREE.Mesh; if (!m.isMesh) return;
      const mat = m.material as any; if (mat.isMeshBasicMaterial && !m.userData.hull) { m.castShadow = false; return; }
      m.castShadow = true; m.receiveShadow = true;
    });
    if (!pixar && outline) {
      root.updateMatrixWorld(true);
      for (const o of objs) o.traverse((c) => { const m = c as THREE.Mesh; if (!m.isMesh || m.userData.hull || !m.geometry || (m.material as any).side === THREE.DoubleSide || m.geometry.attributes.position.count < 220) return; const h = new THREE.Mesh(m.geometry, hull(0.0065 / (m.matrixWorld.getMaxScaleOnAxis() || 1))); h.userData.hull = true; h.castShadow = false; m.add(h); });
    }
  };
  const build = (name: string) => {
    clear(name); shapeOf(spec); let objs: THREE.Object3D[] = [], ol = false;
    switch (name) {
      case "scale": {
        const pr = PROP[spec.prop ?? "chibi"] ?? PROP.chibi, lm = spec.limbs ?? 1, sw = (spec.shoulder ?? 1) * pr.sh;
        bw = bwOf(spec.build); const [, ay] = headScale(spec.faceShape); sHead = 0.225 * (spec.headSize || 1) * Math.pow(HEADMUL[spec.age] ?? 1, pr.ageExp) * pr.head;
        legS = pr.leg * lm; armS = pr.arm * lm; legY = (legS - 1) * 0.805; curH = (H[spec.age] ?? 1.62) * (spec.height || 1); rootS = curH / (BASE_H + legY); rig.root.scale.setScalar(rootS); fitRig(rig, bw, sw);
        for (let i = 0; i < 2; i++) { rig.hip[i].scale.set(1, legS, 1); rig.ankle[i].scale.set(1, 1 / legS, 1); rig.shoulder[i].scale.set(1, armS, 1); rig.wrist[i].scale.set(1, 1 / armS, 1); }
        rig.head.scale.setScalar(sHead); rig.head.position.y = 0.065 + sHead * ay * 0.96; break; }
      case "body": objs = buildBody(ctx, rig, spec, bw); ol = true; break;
      case "face": { const hc = spec.hair; face = buildFace(ctx, spec, hc); rig.head.add(face.group); objs = [face.group]; ol = false; for (const m of face.group.children) if ((m as THREE.Mesh).isMesh && (m as THREE.Mesh).geometry.attributes.position.count > 1500) { /* skull */ const mm = m as THREE.Mesh; objs.push(mm); } break; }
      case "hair": {
        const h = buildHair(spec, ctx.lod); hatR = h.hatR;
        if (h.geo) { const [ax, ay, az] = headScale(spec.faceShape); const m = new THREE.Mesh(h.geo, ctx.mat("hair", "#ffffff", { side: THREE.DoubleSide })); const cv = ["cap", "beanie", "bucket", "sunhat", "beret", "bandana"].includes(spec.hat) ? 0.93 : 1; m.scale.set(ax * cv, ay * cv, az * cv); rig.head.add(m); hairMesh = m; objs = [m]; ol = true; }
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
    objs = mergeStatic(objs); parts[name] = objs; sigs[name] = sig(name); finish(objs, ol);
  };
  const setSpec = (s: AvatarSpec) => {
    spec = s;
    for (const name of ORDER) {
      if (sigs[name] === sig(name) && (parts[name] || name === "scale")) continue;
      build(name);
      if (name === "scale") { /* hair and everything head-attached stays valid */ }
    }
    // hair/hat depend on each other through hatR: if hair rebuilt, hat sig must refresh (hat keys include hairStyle)
  };

  /* ---------------------------------------------------------------- animation state */
  const cur = new Float32Array(N), from = new Float32Array(N), tgt = new Float32Array(N);
  let anim: Anim = "idle", time = Math.random() * 10, bl = 1, speaking = false, mouth = 0, blinkAt = 1.5 + Math.random() * 3, blinkT = -1, dartAt = 1, gx = 0, gy = 0, tgx = 0, tgy = 0, look: THREE.Vector3 | null = null;
  const tmp = new THREE.Vector3();
  pose("idle", time, cur); from.set(cur);
  const apply = (p: Float32Array, lookYaw: number, lookPitch: number) => {
    rig.pelvis.position.set(0, DIM.pelvisY + legY + p[hipY] - Math.min(1, Math.max(0, -p[hipY] / 0.405)) * (legS - 1) * 0.41, p[hipZ]); rig.pelvis.rotation.set(p[hipX], 0, 0);
    rig.spine.rotation.set(p[spX], p[spY], p[spZ]);
    rig.neck.rotation.set(p[nkX] - lookPitch * 0.6, p[nkY] + lookYaw * 0.6 - p[spY] * 0.7, p[nkZ]);
    rig.shoulder[0].rotation.set(p[shL], p[shL + 1], p[shL + 2]); rig.shoulder[1].rotation.set(p[shR], p[shR + 1], p[shR + 2]);
    rig.elbow[0].rotation.set(p[elL], 0, p[ezL]); rig.elbow[1].rotation.set(p[elR], 0, p[ezR]);
    rig.wrist[0].rotation.set(p[hdL], 0, 0); rig.wrist[1].rotation.set(p[hdR], 0, 0);
    rig.hip[0].rotation.set(p[hpL], 0, p[hpL + 1]); rig.hip[1].rotation.set(p[hpR], 0, p[hpR + 1]);
    rig.knee[0].rotation.set(p[knL], 0, 0); rig.knee[1].rotation.set(p[knR], 0, 0);
    rig.ankle[0].rotation.set(p[anL] - (p[hpL] + p[knL]) * 0.0, 0, 0); rig.ankle[1].rotation.set(p[anR], 0, 0);
  };
  const update = (dt: number) => {
    dt = Math.min(dt, 0.1); time += dt; pose(anim, time, tgt);
    if (bl < 1) { bl = Math.min(1, bl + dt / 0.25); const s = sm(bl); for (let i = 0; i < N; i++) cur[i] = from[i] + (tgt[i] - from[i]) * s; } else cur.set(tgt);
    let yaw = 0, pitch = 0;
    if (look) { tmp.copy(look); rig.root.worldToLocal(tmp); tmp.y -= 1.58; yaw = Math.atan2(tmp.x, tmp.z); pitch = Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)); yaw = Math.max(-1.1, Math.min(1.1, yaw)); pitch = Math.max(-0.6, Math.min(0.6, pitch)); if (Math.abs(yaw) > 1.0 && tmp.z < 0) { yaw = 0; pitch = 0; } }
    apply(cur, yaw, pitch);
    // eyes: darting + blink + mouth
    blinkAt -= dt; if (blinkAt <= 0 && blinkT < 0) { blinkT = 0; blinkAt = 2 + Math.random() * 4; }
    let blink = 0; if (blinkT >= 0) { blinkT += dt; blink = Math.sin(Math.min(1, blinkT / 0.17) * Math.PI); if (blinkT > 0.17) blinkT = -1; }
    dartAt -= dt; if (dartAt <= 0) { dartAt = 0.8 + Math.random() * 2.2; tgx = (Math.random() - 0.5) * 0.3; tgy = (Math.random() - 0.5) * 0.14; }
    const k = 1 - Math.exp(-dt * 14), lx = look ? yaw * 0.4 : tgx, ly = look ? -pitch * 0.4 : tgy; gx += (lx - gx) * k; gy += (ly - gy) * k;
    const mt = speaking ? 0.2 + 0.5 * Math.abs(Math.sin(time * 12.5)) * (0.55 + 0.45 * Math.sin(time * 3.3)) : anim === "talk" ? 0 : 0; mouth += (mt - mouth) * (1 - Math.exp(-dt * 25));
    face?.set({ blink, gx, gy, mouth });
    if (packG) { const sitting = anim === "sit" || anim === "type" || anim === "raise"; packG.position.z += ((sitting ? -0.05 : 0) - packG.position.z) * 0.2; packG.position.y += ((sitting ? 0.03 : 0) - packG.position.y) * 0.2; }
    for (const o of parts.hextra ?? []) if (o.userData.spin) o.rotation.y += dt * o.userData.spin;
  };

  setSpec(spec0); root.updateMatrixWorld(true);
  const v = new THREE.Vector3(), wp = (o: THREE.Object3D, x = 0, y = 0, z = 0) => { root.updateWorldMatrix(true, true); return o.localToWorld(v.set(x, y, z)).clone(); };
  const api: Char3DEx = {
    root, setSpec, update,
    play(a) { if (a === anim) return; from.set(cur); bl = 0; anim = a; },
    lookAt(t) { look = t ? t.clone() : null; },
    speak(on) { speaking = on; },
    get height() { return curH; },
    anchor(part) { switch (part) { case "head": return wp(rig.head, 0, 0, 0); case "torso": return wp(rig.spine, 0, 0.25, 0); case "legs": return wp(rig.knee[0], -0.075 * bw, 0, 0); case "feet": return wp(rig.ankle[0], -0.075 * bw, -0.06, 0.05); case "bag": return wp(rig.spine, 0, 0.24, -0.2); case "hat": return wp(rig.head, 0, 1.2, 0); } },
    dispose() { for (const n of Object.keys(parts)) clear(n); root.removeFromParent(); shadowDisc.geometry.dispose(); (shadowDisc.material as THREE.Material).dispose(); owned.forEach((o) => o.dispose()); owned.length = 0; },
    get seatHeight() { return (DIM.pelvisY + legY + SIT_DROP - (legS - 1) * 0.41 - 0.079) * rootS; },
    setBag(m) { bag = m; if (packG) packG.visible = m === "worn"; },
    partTris() { const o: Record<string, number> = {}; for (const [n, l] of Object.entries(parts)) { let t = 0; for (const x of l) x.traverse((m: any) => { if (m.isMesh) t += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }); o[n] = Math.round(t); } return o; },
    partMeshes() { const o: Record<string, number> = {}; for (const [n, l] of Object.entries(parts)) { let t = 0; for (const x of l) x.traverse((m: any) => { if (m.isMesh) t++; }); o[n] = t; } return o; },
    tris() { let n = 0; root.traverse((o: any) => { if (o.isMesh && o.visible) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return Math.round(n); },
  };
  return api;
}
