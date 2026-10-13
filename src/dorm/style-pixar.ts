/** "pixar": stylised-film look. MeshPhysicalMaterial per-kind tuning, RoomEnvironment IBL, soft key shadows, bounce lights, ACES, and a post stack (GTAO, bloom, SMAA/FXAA, vignette + grain) by quality. */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { MatKind, MatOpts, Mood, Style, StyleRig } from "./types";
import { TexCache } from "./char-parts/tex";
import { shadowSize, dprCap } from "../shared/polish";
import { Sky, lerpMood, moodTarget, newMoodState, stats } from "./char-parts/mood";

const WARMGND = new THREE.Color(0xe8a46c), WARMKEY = new THREE.Color(0xffd9a8), skyB = new THREE.Color();
const FILM = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, uAmt: { value: 0.3 }, uGrain: { value: 0.03 }, uT: { value: 0 }, uWarm: { value: 0.55 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uAmt,uGrain,uT,uWarm; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uT)*43758.5453); }
    void main(){ vec4 c=texture2D(tDiffuse,vUv); float v=smoothstep(.45,1.05,length(vUv-.5)*1.3); c.rgb*=mix(vec3(1.),vec3(1.,.9,.78),v*.55)*(1.-v*uAmt); float lu=dot(c.rgb,vec3(.299,.587,.114)); c.rgb=mix(vec3(lu),c.rgb,1.25);
      c.rgb*=mix(vec3(1.),vec3(1.07,1.,.9),uWarm*smoothstep(0.,.6,lu)); c.rgb=mix(c.rgb,c.rgb+vec3(.012,.004,.02)*(1.-smoothstep(0.,.25,lu)),uWarm); c.rgb+=(h(vUv*1234.5)-.5)*uGrain; gl_FragColor=c; }`,
};

export function createPixar(): Style {
  const cache = new Map<string, THREE.Material>(), tex = new TexCache(), own: THREE.Texture[] = [];
  const rep = (t: THREE.Texture, r?: [number, number]) => { if (!r) return t; const k = t.clone(); k.repeat.set(r[0], r[1]); k.needsUpdate = true; own.push(k); return k; };

  function skinRim(m: THREE.MeshPhysicalMaterial, rim: THREE.Color) {
    const r = `vec3(${rim.r.toFixed(3)},${rim.g.toFixed(3)},${rim.b.toFixed(3)})`;
    m.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      { float fr = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 2.2); totalEmissiveRadiance += ${r} * fr * 0.55; }`); };
    m.customProgramCacheKey = () => "skinrim" + r;
  }

  function mat(kind: MatKind, color: string | number, o: MatOpts = {}): THREE.Material {
    const key = `${kind}|${new THREE.Color(color as any).getHexString()}|${JSON.stringify(o, (k, v) => (v && v.isTexture ? v.uuid : v))}`;
    let m = cache.get(key); if (m) return m;
    const col = new THREE.Color(color as any);
    const p: THREE.MeshPhysicalMaterialParameters = { color: col, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide, map: o.map ?? null, normalMap: o.normalMap ?? null };
    let map = o.map ?? null, nrm = o.normalMap ?? null;
    const t = o.texture || (kind === "cloth" || kind === "fabric" ? "weave" : kind === "knit" ? "knit" : kind === "denim" ? "denim" : kind === "wood" ? "wood" : kind === "rug" ? "carpet" : kind === "wall" ? "plaster" : undefined);
    if (t && !map && o.texture && !["weave"].includes(t)) { map = rep(tex.pattern(t, color, o.textureColor2 ?? col.clone().offsetHSL(0, 0, 0.18)), o.repeat); p.color = new THREE.Color(0xffffff); }
    if (t && !nrm && kind !== "skin" && kind !== "hair") { nrm = rep(tex.normal(t, t === "knit" || t === "cable" ? 3 : 1.6), o.repeat ?? (o.texture ? undefined : [5, 5])); p.normalScale = new THREE.Vector2(t === "knit" || t === "cable" ? 1.2 : 0.7, t === "knit" || t === "cable" ? 1.2 : 0.7); }
    p.map = map; p.normalMap = nrm;
    if (o.emissive !== undefined) { p.emissive = new THREE.Color(o.emissive as any); p.emissiveIntensity = o.emissiveIntensity ?? 1; }
    const sheenOf = (a: number, l = 0.25) => new THREE.Color(color as any).offsetHSL(0, 0.05, l * a);
    switch (kind) {
      case "skin": {
        // warm, smooth skin: pull the hue toward peach/brown (dark tones stay brown, not red), keep dark tones from sinking, and fake subsurface warmth with a faint emissive + warm sheen
        const hs = { h: 0, s: 0, l: 0 }; col.getHSL(hs, THREE.SRGBColorSpace);
        const deep = THREE.MathUtils.smoothstep(0.55 - hs.l, 0, 0.35), h2 = hs.h + (0.072 - hs.h) * (0.3 + 0.6 * deep);
        const warm = new THREE.Color().setHSL(h2, Math.min(0.9, hs.s * (1.04 + 0.1 * deep)), Math.min(0.92, hs.l * (1 + 0.05 * deep)), THREE.SRGBColorSpace).lerp(new THREE.Color("#ffc29a"), 0.38 * (1 - deep));   // pale tones get a peach lift so they do not go grey-beige
        p.color = warm.clone().multiplyScalar(1.0 + 0.1 * deep);
        Object.assign(p, { roughness: o.rough ?? 0.58, metalness: 0, specularIntensity: 0.55, sheen: 0.4, sheenRoughness: 0.5, sheenColor: warm.clone().lerp(new THREE.Color("#ffb27a"), 0.55).multiplyScalar(0.3), clearcoat: 0, emissive: warm.clone().lerp(new THREE.Color("#ff9a60"), 0.4), emissiveIntensity: 0.19 - 0.05 * deep });
        const pm = new THREE.MeshPhysicalMaterial(p); skinRim(pm, warm.clone().lerp(new THREE.Color("#ffb070"), 0.5).multiplyScalar(0.2 * (1 - 0.3 * deep))); m = pm; break; }
      case "hair": Object.assign(p, { color: new THREE.Color(0xffffff), vertexColors: true, roughness: o.rough ?? 0.55, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color("#fff4e0").multiplyScalar(0.3), clearcoat: o.clearcoat ?? 0.0, envMapIntensity: 0.6 }); break;
      case "cloth": case "fabric": Object.assign(p, { roughness: o.rough ?? 0.85, sheen: o.sheen ?? 0.7, sheenRoughness: 0.55, sheenColor: sheenOf(1) }); break;
      case "knit": Object.assign(p, { roughness: o.rough ?? 0.95, sheen: 1, sheenRoughness: 0.8, sheenColor: sheenOf(1, 0.3) }); break;
      case "denim": Object.assign(p, { roughness: o.rough ?? 0.78, sheen: 0.5, sheenColor: sheenOf(1, 0.2) }); break;
      case "leather": Object.assign(p, { roughness: o.rough ?? 0.5, clearcoat: o.clearcoat ?? 0.35, clearcoatRoughness: 0.4 }); break;
      case "wood": Object.assign(p, { roughness: o.rough ?? 0.6, clearcoat: o.clearcoat ?? 0.15 }); break;
      case "metal": Object.assign(p, { roughness: o.rough ?? 0.3, metalness: o.metal ?? 1 }); break;
      case "glass": Object.assign(p, { roughness: o.rough ?? 0.05, transmission: o.opacity === undefined ? 0.9 : 0, thickness: 0.05, ior: 1.45, transparent: true, opacity: o.opacity ?? 1 }); if (o.opacity !== undefined) p.opacity = o.opacity; break;
      case "plastic": Object.assign(p, { roughness: o.rough ?? 0.4, clearcoat: o.clearcoat ?? 0.5, clearcoatRoughness: 0.25 }); break;
      case "paper": Object.assign(p, { roughness: o.rough ?? 0.92 }); break;
      case "eye": Object.assign(p, { roughness: o.rough ?? 0.25, clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 0.5 }); break;
      case "emissive": Object.assign(p, { emissive: new THREE.Color(color as any), emissiveIntensity: o.emissiveIntensity ?? 1.4, color: new THREE.Color(0x000000), roughness: 1 }); break;
      case "screen": Object.assign(p, { emissive: new THREE.Color(0xffffff), emissiveMap: map, emissiveIntensity: o.emissiveIntensity ?? 1.1, roughness: 0.25, color: new THREE.Color(0x111111), map: null }); break;
      case "wall": Object.assign(p, { roughness: o.rough ?? 0.92 }); break;
      case "floor": Object.assign(p, { roughness: o.rough ?? 0.55, clearcoat: o.clearcoat ?? 0.12 }); break;
      case "rug": Object.assign(p, { roughness: 1, sheen: 1, sheenRoughness: 0.9, sheenColor: sheenOf(1, 0.2) }); break;
    }
    if (o.metal !== undefined && kind !== "metal") p.metalness = o.metal;
    if (o.sheen !== undefined && kind !== "cloth" && kind !== "fabric") p.sheen = o.sheen;
    m = m ?? new THREE.MeshPhysicalMaterial(p); cache.set(key, m); return m;
  }

  return {
    id: "pixar", label: "Pixar-style", mat,
    setup(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): StyleRig {
      let q: 0 | 1 | 2 = 2, W = 1, H = 1, PR = 1;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
      scene.userData.style = "pixar";
      const pm = new THREE.PMREMGenerator(renderer), envScene = new RoomEnvironment(), envRT = pm.fromScene(envScene, 0.04);
      scene.environment = envRT.texture; scene.environmentIntensity = 0.3;
      const hemi = new THREE.HemisphereLight(0xdfe9ff, 0xe8a46c, 0.3), key = new THREE.DirectionalLight(0xffffff, 1.35);
      key.castShadow = true; key.shadow.mapSize.set(shadowSize(2048), shadowSize(2048)); key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
      const sc = key.shadow.camera; sc.left = sc.bottom = -4.5; sc.right = sc.top = 4.5; sc.near = 0.5; sc.far = 24;
      const bounce = new THREE.PointLight(0xffb27a, 2.8, 14, 2), cool = new THREE.PointLight(0xa9c6ff, 1.0, 14, 2), lamp = new THREE.PointLight(0xffb06a, 0, 9, 2);
      bounce.position.set(0.5, 0.9, 4.2); cool.position.set(-5, 3.2, -2.5); lamp.position.set(0, 2.3, 0); key.position.set(4, 8, 4);
      const rim = new THREE.DirectionalLight(0x9fc0ff, 0.55); rim.position.set(-4, 5, -6);   // cool back rim against the warm key
      scene.add(hemi, key, key.target, bounce, cool, lamp, rim);
      const sky = new Sky(); scene.background = sky.tex; scene.fog = new THREE.Fog(0xcfe6f7, 16, 70);

      let composer: EffectComposer | null = null, bloom: UnrealBloomPass | null = null, film: ShaderPass | null = null, fxaa: ShaderPass | null = null, smaa: SMAAPass | null = null, gtao: GTAOPass | null = null;
      const build = () => {
        composer?.dispose(); composer = null; if (q === 0) return;
        composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W * PR, H * PR, { type: THREE.HalfFloatType, samples: 0 }));
        composer.setPixelRatio(PR); composer.setSize(W, H);
        composer.addPass(new RenderPass(scene, camera));
        gtao = null; if (q >= 2) { gtao = new GTAOPass(scene, camera, W * PR, H * PR); gtao.blendIntensity = 0.8; composer.addPass(gtao);
          // GTAO re-renders the scene with a normal material, which turns billboard sprites (name tags, bubbles) into dark boxes: keep them out of that pass
          const g0 = (gtao as any).render.bind(gtao); (gtao as any).render = (...a: unknown[]) => { const hid: THREE.Object3D[] = []; scene.traverseVisible((o) => { if ((o as THREE.Sprite).isSprite) hid.push(o); }); hid.forEach((o) => (o.visible = false)); try { g0(...a); } finally { hid.forEach((o) => (o.visible = true)); } }; }
        bloom = new UnrealBloomPass(new THREE.Vector2(W * PR, H * PR), q >= 2 ? 0.24 : 0.2, 0.7, 1.0); composer.addPass(bloom);
        film = new ShaderPass(FILM); composer.addPass(film);
        composer.addPass(new OutputPass());
        fxaa = smaa = null;
        if (q >= 2) { smaa = new SMAAPass(); composer.addPass(smaa); } else { fxaa = new ShaderPass(FXAAShader); fxaa.uniforms.resolution.value.set(1 / (W * PR), 1 / (H * PR)); composer.addPass(fxaa); }
      };
      const cur = newMoodState(), tgt = newMoodState(); let settle = 0;
      const apply = () => {
        hemi.color.copy(cur.hemiSky); hemi.groundColor.copy(cur.hemiGnd).lerp(WARMGND, 0.4 * (1 - cur.night)); hemi.intensity = cur.hemiI * 0.34;
        key.color.copy(cur.key).lerp(WARMKEY, 0.18 * (1 - cur.night)); key.intensity = cur.keyI * 1.0; key.position.copy(cur.sun).multiplyScalar(9);
        lamp.intensity = cur.lamp * 14; bounce.intensity = 2.8 * (1 - cur.night * 0.7); rim.intensity = 0.55 * (1 - cur.night * 0.5); cool.intensity = 1.0 * (1 - cur.night * 0.5);
        renderer.toneMappingExposure = cur.exposure * 0.8; scene.environmentIntensity = 0.22 * (1 - cur.night * 0.65);
        skyB.copy(cur.skyBot).multiplyScalar(1 - 0.22 * (1 - cur.night)).lerp(WARMKEY, 0.28 * (1 - cur.night)); (scene.fog as THREE.Fog).color.copy(skyB); sky.paint(cur.skyTop, skyB);
        scene.userData.mood = { night: cur.night, windowGlow: cur.lamp };
      };
      const setMood = (m: Mood, snap = false) => { moodTarget(m, tgt); if (snap) lerpMood(cur, tgt, 1); settle = snap ? 0.01 : 2.6; if (snap) apply(); };
      setMood({ hour: 14, palette: "sun" }, true);
      const st = stats("pixar", q); let tt = 0;
      return {
        render(dt) {
          const t0 = performance.now();
          if (settle > 0) { settle -= dt; lerpMood(cur, tgt, 1 - Math.exp(-dt * 3)); apply(); }
          if (q > 0 && !composer) build();
          if (composer && q > 0) { if (film) film.uniforms.uT.value = (tt += dt) % 10; composer.render(dt); } else renderer.render(scene, camera);
          const ms = performance.now() - t0; st.style = "pixar"; st.quality = q; st.last = ms; st.log[st.frames % 120] = ms; st.frames++; st.avg += (ms - st.avg) * 0.05;
        },
        resize(w, h, pr) { W = w; H = h; PR = pr ?? dprCap(); renderer.setPixelRatio(PR); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (composer) { composer.setPixelRatio(PR); composer.setSize(w, h); fxaa?.uniforms.resolution.value.set(1 / (W * PR), 1 / (H * PR)); } },
        setMood(m) { setMood(m); },
        setQuality(v) { if (v === q && (composer || v === 0)) return; q = v; st.quality = v; const s = v >= 1 ? 2048 : 1024; key.shadow.mapSize.set(s, s); key.shadow.map?.dispose(); (key.shadow as any).map = null; build(); },
        dispose() { composer?.dispose(); composer = null; scene.remove(hemi, key, key.target, bounce, cool, lamp); key.shadow.map?.dispose(); sky.dispose(); envRT.dispose(); pm.dispose(); envScene.dispose(); scene.environment = null; scene.background = null; scene.fog = null; cache.forEach((x) => x.dispose()); cache.clear(); tex.dispose(); own.forEach((x) => x.dispose()); own.length = 0; },
      };
    },
  };
}
