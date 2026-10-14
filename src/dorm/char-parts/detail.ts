/** Shared procedural surface detail for the 3D characters: strand textures for hair (base layer + alpha-tested outer shell), seam/fold shading for cloth, paint-layer overlays for the customizer.
 *  Textures are generated once and shared by every character; per-character cost is a cloned material at most. */
import * as THREE from "three";
import { mkRng } from "./geo";
import { normalFromHeight } from "./tex";

const mkTex = (cv: HTMLCanvasElement, srgb = true, repeatU = true) => { const t = new THREE.CanvasTexture(cv); t.wrapS = repeatU ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; return t; };

/** hair strand canvas: u across the tube/sheet, v along the strand. Luminance = strand brightness; alpha = strand coverage (shell variant has gaps and uneven lengths). */
function strandCanvas(shell: boolean, W = 256, H = 256): HTMLCanvasElement {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d")!, id = g.createImageData(W, H), d = id.data, r = mkRng(shell ? 91 : 17);
  const cols = Array.from({ length: W }, () => ({ b: 0.7 + 0.3 * Math.pow(r(), 0.7), ph: r() * 6.28, f: 0.015 + r() * 0.03, len: shell ? 0.5 + 0.5 * r() : 0.85 + 0.15 * r() })), clump = Array.from({ length: W / 16 }, () => ({ on: r() < 0.7, len: 0.72 + 0.28 * r() }));
  for (let x = 0; x < W; x++) {
    const c = cols[x], cp = clump[x >> 4], k0 = x % 8 === 0 ? 0.8 : 1;
    for (let y = 0; y < H; y++) {
      const v = y / H, L = 255 * c.b * (0.82 + 0.18 * Math.sin(y * c.f + c.ph)) * k0, i = (y * W + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = L; d[i + 3] = shell ? (cp.on && v < cp.len ? 255 : 0) : v < c.len ? 255 : v < 0.99 && (x + y) % 5 !== 0 ? 255 : 0;
    }
  }
  g.putImageData(id, 0, 0); return cv;
}
let strands: { base: THREE.CanvasTexture; shell: THREE.CanvasTexture; nrm: THREE.CanvasTexture } | null = null;
export function strandTex() {
  if (strands) return strands;
  const b = strandCanvas(false), nrm = document.createElement("canvas"); nrm.width = nrm.height = 256; const ng = nrm.getContext("2d")!; ng.drawImage(b, 0, 0, 256, 256);
  strands = { base: mkTex(b), shell: mkTex(strandCanvas(true)), nrm: mkTex(normalFromHeight(nrm, 1.4), false) }; return strands;
}

/** seam + fold shading, multiplied over the garment colour. u = around the garment, v = along it (side seams at u .25/.75). */
let detTex: THREE.CanvasTexture | null = null;
export function detailTex() {
  if (detTex) return detTex;
  const W = 128, H = 128, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d")!, r = mkRng(5);
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 9; k++) { const x = r() * W, w = 5 + r() * 9, gr = g.createLinearGradient(x - w, 0, x + w, 0), a = 0.05 + r() * 0.07; gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, `rgba(60,40,50,${a})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.save(); g.translate(x, 0); g.transform(1, 0, (r() - 0.5) * 0.6, 1, 0, 0); g.translate(-x, 0); g.fillStyle = gr; g.fillRect(x - w, 0, w * 2, H); g.restore(); }   // soft vertical folds
  for (const x of [W * 0.25, W * 0.75]) { const gr = g.createLinearGradient(x - 5, 0, x + 5, 0); gr.addColorStop(0, "rgba(40,25,35,0)"); gr.addColorStop(0.5, "rgba(40,25,35,.30)"); gr.addColorStop(1, "rgba(40,25,35,0)"); g.fillStyle = gr; g.fillRect(x - 5, 0, 10, H); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(x + 2, 0, 1, H); }   // side seams with a stitch highlight
  for (const y of [1.5, H - 1.5]) { g.fillStyle = "rgba(40,25,35,.26)"; g.fillRect(0, y - 1.5, W, 3); g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect(0, y + (y < 10 ? 2 : -3.5), W, 1); }   // hem / collar line
  const sh = g.createLinearGradient(0, 0, 0, H); sh.addColorStop(0, "rgba(0,0,0,.10)"); sh.addColorStop(0.18, "rgba(0,0,0,0)"); g.fillStyle = sh; g.fillRect(0, 0, W, H);
  return (detTex = mkTex(cv, true, true));
}

/* ---------------------------------------------------------------- shader hooks */
const shared = new WeakMap<THREE.Material, Map<string, THREE.Material>>();
/** clone `m` with seam/fold shading and/or a paint-layer overlay (alpha-blended over the diffuse colour). Without a paint layer the clone is shared by every character. */
export function decorate(m: THREE.Material, o: { detail?: boolean; paint?: THREE.Texture | null }, own?: (x: THREE.Material) => void): THREE.Material {
  if (!o.detail && !o.paint) return m;
  const key = o.detail ? "d" : "", per = shared.get(m) ?? shared.set(m, new Map()).get(m)!;   // paint clones are per character (the caller caches and disposes them); detail-only clones are global
  let r = o.paint ? undefined : per.get(key); if (r) return r;
  r = m.clone(); const prev = m.onBeforeCompile, pk = m.customProgramCacheKey?.() ?? "", det = o.detail ? detailTex() : null, paint = o.paint ?? null;
  r.onBeforeCompile = (sh, rd) => {
    prev?.call(r, sh, rd);
    sh.vertexShader = "varying vec2 vPU;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vPU = uv;");
    let u = "varying vec2 vPU;\n" + (det ? "uniform sampler2D uDet;\n" : "") + (paint ? "uniform sampler2D uPaint;\n" : ""), c = "";
    if (det) { sh.uniforms.uDet = { value: det }; c += "\n diffuseColor.rgb *= texture2D(uDet, vPU).rgb;"; }
    if (paint) { sh.uniforms.uPaint = { value: paint }; c += "\n { vec4 pt = texture2D(uPaint, vPU); diffuseColor.rgb = mix(diffuseColor.rgb, pt.rgb, pt.a); }"; }
    sh.fragmentShader = u + sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>" + c);
  };
  r.customProgramCacheKey = () => pk + "|det" + (det ? 1 : 0) + "paint" + (paint ? 1 : 0);
  if (!paint) per.set(key, r); else own?.(r); return r;
}

/** hair material: clone of the style's hair material with a strand map, optional alpha cut-out (shell layer), strand normal map and a Kajiya-Kay style highlight band tinted by hi */
export function hairMaterial(base: THREE.Material, shell: boolean, hi: THREE.Color, own: (x: THREE.Material) => void, paint?: THREE.Texture | null, yr: [number, number] = [-1, 1]): THREE.Material {
  const m = base.clone() as THREE.MeshStandardMaterial, s = strandTex(); m.map = shell ? s.shell : s.base; m.alphaTest = shell ? 0.5 : 0.08; m.side = THREE.DoubleSide; m.transparent = false;
  if (!shell) { m.normalMap = s.nrm; m.normalScale = new THREE.Vector2(0.55, 0.55); }
  const uHi = { value: hi.clone() }, pk = base.customProgramCacheKey?.() ?? "";
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uHi = uHi;
    if (paint) {   // brush layer, mapped around the head (u = angle, v = height) so strokes land where they are drawn whatever the strand uvs are
      sh.uniforms.uPaint = { value: paint }; sh.uniforms.uYr = { value: new THREE.Vector2(yr[0], yr[1]) };
      sh.vertexShader = "varying vec3 vHp;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vHp = position;");
      sh.fragmentShader = "uniform sampler2D uPaint; uniform vec2 uYr; varying vec3 vHp;\n" + sh.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n { vec4 pt = texture2D(uPaint, vec2(atan(vHp.x, vHp.z) / 6.2831853 + 0.5, clamp((vHp.y - uYr.x) / (uYr.y - uYr.x), 0.0, 1.0))); diffuseColor.rgb = mix(diffuseColor.rgb, pt.rgb * (0.55 + 0.45 * texture2D(map, vMapUv).r), pt.a); }");
    }
    sh.fragmentShader = "uniform vec3 uHi;\n" + sh.fragmentShader.replace("#include <opaque_fragment>", `
      { vec3 hn = normalize(vNormal), hv = normalize(vViewPosition), hh = normalize(normalize(vec3(0.25, 0.85, 0.45)) + hv), ht = normalize(vec3(0.0, 1.0, 0.0) - hn * hn.y);
        float dth = dot(ht, hh), sp = sqrt(max(0.0, 1.0 - dth * dth)), band = pow(sp, 34.0) * smoothstep(0.0, 0.4, dot(hn, normalize(vec3(0.25, 0.85, 0.45))));
        float st = texture2D(map, vMapUv).r; outgoingLight += uHi * (band * (0.2 + 0.9 * st) * 0.6 + pow(sp, 7.0) * 0.05); }
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => pk + "hairspec" + (shell ? "S" : "B") + (paint ? "P" : ""); own(m); return m;
}
