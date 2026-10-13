/** "papercut": the academy's matte card look in 3D: toon steps, kraft palette, soft PCF shadows, static grain + vignette, thin hull outlines on characters (char3d). */
import { dprCap } from "../shared/polish";
import * as THREE from "three";
import type { MatKind, MatOpts, Mood, Style, StyleRig } from "./types";
import { TexCache } from "./char-parts/tex";
import { Sky, lerpMood, moodTarget, newMoodState, stats } from "./char-parts/mood";

const KRAFT = new THREE.Color("#f3e7cf");

export function createPapercut(): Style {
  const cache = new Map<string, THREE.Material>(), tex = new TexCache(), own: THREE.Texture[] = [];
  const grad = new THREE.DataTexture(new Uint8Array([96, 158, 214, 255]), 4, 1, THREE.RedFormat); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const rep = (t: THREE.Texture, r?: [number, number]) => { if (!r) return t; const k = t.clone(); k.repeat.set(r[0], r[1]); k.needsUpdate = true; own.push(k); return k; };

  function mat(kind: MatKind, color: string | number, o: MatOpts = {}): THREE.Material {
    const key = `${kind}|${new THREE.Color(color as any).getHexString()}|${JSON.stringify(o, (k, v) => (v && v.isTexture ? v.uuid : v))}`;
    let m = cache.get(key); if (m) return m;
    const c = new THREE.Color(color as any).lerp(KRAFT, kind === "skin" || kind === "eye" || kind === "emissive" ? 0 : 0.05);
    let map = o.map ?? null;
    if (!map && o.texture) { map = rep(tex.pattern(o.texture, color, o.textureColor2 ?? new THREE.Color(color as any).offsetHSL(0, 0, 0.18)), o.repeat); c.set(0xffffff); }
    const common: any = { color: c, map, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide };
    if (o.emissive !== undefined) { common.emissive = new THREE.Color(o.emissive as any); common.emissiveIntensity = o.emissiveIntensity ?? 1; }
    if (kind === "emissive" || kind === "screen" || (kind === "eye" && map)) { m = new THREE.MeshBasicMaterial({ color: kind === "emissive" ? new THREE.Color(color as any) : common.color, map, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: common.side }); (m as any).toneMapped = false; }
    else if (kind === "glass") m = new THREE.MeshToonMaterial({ ...common, gradientMap: grad, transparent: true, opacity: o.opacity ?? 0.35 });
    else { if (kind === "hair") { common.vertexColors = true; common.color = new THREE.Color(0xffffff); } m = new THREE.MeshToonMaterial({ ...common, gradientMap: grad }); }
    cache.set(key, m); return m;
  }

  return {
    id: "papercut", label: "Paper cut", mat,
    setup(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): StyleRig {
      let q: 0 | 1 | 2 = 0;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMappingExposure = 1;
      scene.userData.style = "papercut";
      const hemi = new THREE.HemisphereLight(0xffffff, 0xd9b894, 0.7), key = new THREE.DirectionalLight(0xffffff, 1.6), lamp = new THREE.PointLight(0xffb870, 0, 9, 1.6);
      key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 5; key.shadow.bias = -0.0006; key.shadow.normalBias = 0.025;
      const sc = key.shadow.camera; sc.left = sc.bottom = -4.5; sc.right = sc.top = 4.5; sc.near = 0.5; sc.far = 24;
      lamp.position.set(0, 2.3, 0); key.position.set(4, 8, 4);
      scene.add(hemi, key, key.target, lamp);
      const sky = new Sky(); scene.background = sky.tex; scene.fog = new THREE.Fog(0xcfe6f7, 14, 60);
      const ov = new THREE.Scene(), ocam = new THREE.Camera();
      const om = new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false,
        vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }",
        fragmentShader: `varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
          void main(){ float n=h(floor(gl_FragCoord.xy*0.5)); float ag=abs(n-.5)*.06; vec3 cg=n>.5?vec3(1.,.97,.9):vec3(.2,.12,.05);
          float v=smoothstep(.38,.95,length(vUv-.5)*1.28)*.3; vec3 cv=vec3(.2,.11,.04); float a=ag+v; gl_FragColor=vec4((cg*ag+cv*v)/max(a,1e-4),a); }` });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), om); quad.frustumCulled = false; ov.add(quad);
      const cur = newMoodState(), tgt = newMoodState(); let settle = 0;
      const apply = () => {
        hemi.color.copy(cur.hemiSky); hemi.groundColor.copy(cur.hemiGnd); hemi.intensity = cur.hemiI * 1.05;
        key.color.copy(cur.key); key.intensity = cur.keyI * 0.95; key.position.copy(cur.sun).multiplyScalar(9);
        lamp.intensity = cur.lamp * 9; (scene.fog as THREE.Fog).color.copy(cur.skyBot); sky.paint(cur.skyTop, cur.skyBot);
        scene.userData.mood = { night: cur.night, windowGlow: cur.lamp };
      };
      const setMood = (m: Mood, snap = false) => { moodTarget(m, tgt); if (snap) lerpMood(cur, tgt, 1); settle = snap ? 0.01 : 2.6; if (snap) apply(); };
      setMood({ hour: 14, palette: "sun" }, true);
      const st = stats("papercut", q);
      return {
        render(dt) {
          const t0 = performance.now();
          if (settle > 0) { settle -= dt; lerpMood(cur, tgt, 1 - Math.exp(-dt * 3)); apply(); }
          renderer.render(scene, camera);
          const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(ov, ocam); renderer.autoClear = ac;
          const ms = performance.now() - t0; st.style = "papercut"; st.quality = q; st.last = ms; st.log[st.frames % 120] = ms; st.frames++; st.avg += (ms - st.avg) * 0.05;
        },
        resize(w, h, pr) { renderer.setPixelRatio(pr ?? dprCap()); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); },
        setMood(m) { setMood(m); },
        setQuality(v) { q = v; const s = v >= 1 ? 2048 : 1024; if (key.shadow.mapSize.x !== s) { key.shadow.mapSize.set(s, s); key.shadow.map?.dispose(); (key.shadow as any).map = null; } st.quality = v; },
        dispose() { scene.remove(hemi, key, key.target, lamp); key.shadow.map?.dispose(); sky.dispose(); quad.geometry.dispose(); om.dispose(); scene.background = null; scene.fog = null; cache.forEach((m) => m.dispose()); cache.clear(); tex.dispose(); own.forEach((t) => t.dispose()); own.length = 0; },
      };
    },
  };
}
