/** Cheap interior detail shared by the hallway, classroom and auditorium: merged quad / box batches (one draw call each) and procedural canvas textures (no image files).
 *  Paper-cut look: soft rims, kraft frames, one warm cast. */
import * as THREE from "three";

export const tex = (w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, repeat = false) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
const hash = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
const _c = new THREE.Color();

/** flat quads merged into one mesh. A quad faces +z at rotY 0 (same as HallScene.card). */
export class QuadBatch {
  private p: number[] = []; private u: number[] = []; private c: number[] = []; private i: number[] = []; private n = 0;
  quad(x: number, y: number, z: number, rotY: number, w: number, h: number, uv: [number, number, number, number] = [0, 0, 1, 1], color: THREE.ColorRepresentation = "#ffffff", dy = 0) {
    const s = Math.sin(rotY), co = Math.cos(rotY); _c.set(color);
    for (const [lx, ly, ux, uy] of [[-w / 2, -h / 2 + dy, uv[0], uv[1]], [w / 2, -h / 2 + dy, uv[2], uv[1]], [w / 2, h / 2 + dy, uv[2], uv[3]], [-w / 2, h / 2 + dy, uv[0], uv[3]]]) { this.p.push(x + lx * co, y + ly, z - lx * s); this.u.push(ux, uy); this.c.push(_c.r, _c.g, _c.b); }
    this.i.push(this.n, this.n + 1, this.n + 2, this.n, this.n + 2, this.n + 3); this.n += 4; return this;
  }
  /** a quad lying on the floor (faces up), w along x, d along z */
  flat(x: number, y: number, z: number, w: number, d: number, uv: [number, number, number, number] = [0, 0, 1, 1], color: THREE.ColorRepresentation = "#ffffff") {
    _c.set(color); for (const [lx, lz, ux, uy] of [[-w / 2, d / 2, uv[0], uv[1]], [w / 2, d / 2, uv[2], uv[1]], [w / 2, -d / 2, uv[2], uv[3]], [-w / 2, -d / 2, uv[0], uv[3]]]) { this.p.push(x + lx, y, z + lz); this.u.push(ux, uy); this.c.push(_c.r, _c.g, _c.b); }
    this.i.push(this.n, this.n + 1, this.n + 2, this.n, this.n + 2, this.n + 3); this.n += 4; return this;
  }
  get count() { return this.n / 4; }
  mesh(mat: THREE.Material, shadow = false) {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = shadow; return m;
  }
}
/** boxes merged into one mesh with vertex colours */
export class BoxBatch {
  private p: number[] = []; private nn: number[] = []; private c: number[] = []; private i: number[] = []; private n = 0;
  private base = new THREE.BoxGeometry(1, 1, 1); private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private v = new THREE.Vector3(); private nm = new THREE.Matrix3();
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: THREE.ColorRepresentation = "#ffffff", rotY = 0, rotX = 0) {
    this.e.set(rotX, rotY, 0); this.q.setFromEuler(this.e); this.m.compose(this.v.set(x, y, z), this.q, new THREE.Vector3(w, h, d)); this.nm.getNormalMatrix(this.m); _c.set(color);
    const pa = this.base.attributes.position, na = this.base.attributes.normal, ix = this.base.index!;
    for (let k = 0; k < pa.count; k++) { this.v.fromBufferAttribute(pa, k).applyMatrix4(this.m); this.p.push(this.v.x, this.v.y, this.v.z); this.v.fromBufferAttribute(na, k).applyMatrix3(this.nm).normalize(); this.nn.push(this.v.x, this.v.y, this.v.z); this.c.push(_c.r, _c.g, _c.b); }
    for (let k = 0; k < ix.count; k++) this.i.push(ix.getX(k) + this.n); this.n += pa.count; return this;
  }
  mesh(mat: THREE.Material, shadow = true) {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nn, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i);
    const m = new THREE.Mesh(g, mat); m.castShadow = shadow; m.receiveShadow = true; return m;
  }
}

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const grain = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) => { for (let k = 0; k < w * h / 90; k++) { c.fillStyle = k & 1 ? "rgba(255,255,255,.18)" : "rgba(90,60,40,.07)"; c.fillRect(x + hash(k, seed) * w, y + hash(seed, k) * h, 2, 2); } };

/** 4x3 atlas of posters and student art, 256x341 cells; uv(i) returns the cell's rectangle */
export const ATLAS_COLS = 4, ATLAS_ROWS = 3;
export const atlasUV = (i: number): [number, number, number, number] => { const cx = i % ATLAS_COLS, cy = Math.floor(i / ATLAS_COLS); return [cx / ATLAS_COLS + 0.004, 1 - (cy + 1) / ATLAS_ROWS + 0.004, (cx + 1) / ATLAS_COLS - 0.004, 1 - cy / ATLAS_ROWS - 0.004]; };
export const posterAtlas = () => tex(1024, 1024, (c) => {
  const cw = 256, ch = 341, cells: [string, string, (x: number, y: number) => void][] = [
    ["#4F91C7", "#FFF9F0", (x, y) => { c.fillStyle = "#FFF9F0"; c.font = "700 120px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("π", x + 128, y + 150); c.font = "700 34px 'Trebuchet MS',sans-serif"; c.fillText("MATH", x + 128, y + 200); c.font = "700 44px 'Trebuchet MS',sans-serif"; c.fillStyle = "#F8D977"; c.fillText("2 + 3 = 5", x + 128, y + 270); }],
    ["#88B89A", "#FFF9F0", (x, y) => { c.fillStyle = "#FFF9F0"; rr(c, x + 56, y + 60, 68, 90, 6); c.fill(); rr(c, x + 132, y + 60, 68, 90, 6); c.fill(); c.fillStyle = "#EAB94E"; c.fillRect(x + 124, y + 56, 8, 98); c.font = "700 40px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("READ!", x + 128, y + 210); c.font = "600 24px 'Trebuchet MS',sans-serif"; c.fillText("every day", x + 128, y + 250); }],
    ["#8FC9E8", "#3b3340", (x, y) => { c.strokeStyle = "#3b3340"; c.lineWidth = 7; c.beginPath(); c.ellipse(x + 128, y + 110, 70, 26, 0.5, 0, 7); c.ellipse(x + 128, y + 110, 70, 26, -0.5, 0, 7); c.stroke(); c.fillStyle = "#E07A66"; c.beginPath(); c.arc(x + 128, y + 110, 13, 0, 7); c.fill(); c.fillStyle = "#3b3340"; c.font = "700 36px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("SCIENCE", x + 128, y + 220); c.font = "600 24px 'Trebuchet MS',sans-serif"; c.fillText("ask why", x + 128, y + 256); }],
    ["#C98569", "#FFF9F0", (x, y) => { c.fillStyle = "#FFF9F0"; c.fillRect(x + 62, y + 70, 132, 14); for (let i = 0; i < 4; i++) c.fillRect(x + 72 + i * 34, y + 84, 18, 80); c.fillRect(x + 56, y + 164, 144, 14); c.font = "700 34px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("HISTORY", x + 128, y + 232); c.font = "600 24px 'Trebuchet MS',sans-serif"; c.fillText("then & now", x + 128, y + 268); }],
    ["#FBE9C4", "#6d5a5f", (x, y) => { const g = c.createLinearGradient(0, y + 40, 0, y + 200); g.addColorStop(0, "#F0707A"); g.addColorStop(1, "#FFD08A"); c.fillStyle = g; c.fillRect(x + 28, y + 40, 200, 170); c.fillStyle = "#FFF3B0"; c.beginPath(); c.arc(x + 128, y + 170, 46, Math.PI, 0); c.fill(); c.fillStyle = "#4C9A5F"; c.beginPath(); c.moveTo(x + 28, y + 210); c.quadraticCurveTo(x + 100, y + 150, x + 228, y + 210); c.fill(); c.fillStyle = "#6d5a5f"; c.font = "italic 600 22px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("Sunset by Mia, age 7", x + 128, y + 260); }],
    ["#FBE9C4", "#6d5a5f", (x, y) => { c.fillStyle = "#8FC9E8"; c.fillRect(x + 28, y + 40, 200, 170); c.fillStyle = "#F2B632"; c.beginPath(); c.arc(x + 200, y + 70, 24, 0, 7); c.fill(); c.fillStyle = "#F28F7E"; c.fillRect(x + 70, y + 120, 90, 70); c.fillStyle = "#9A653D"; c.beginPath(); c.moveTo(x + 60, y + 122); c.lineTo(x + 115, y + 80); c.lineTo(x + 170, y + 122); c.fill(); c.fillStyle = "#88B89A"; c.fillRect(x + 28, y + 190, 200, 20); c.fillStyle = "#6d5a5f"; c.font = "italic 600 22px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("My house, Leo", x + 128, y + 260); }],
    ["#FBE9C4", "#6d5a5f", (x, y) => { const cols = ["#E07A66", "#EAB94E", "#4F91C7", "#88B89A", "#B8A8DA"]; for (let i = 0; i < 9; i++) { c.fillStyle = cols[i % 5]; c.globalAlpha = 0.85; c.beginPath(); if (i % 3 === 0) c.arc(x + 60 + hash(i, 1) * 140, y + 70 + hash(i, 2) * 110, 26 + hash(i, 3) * 14, 0, 7); else c.rect(x + 40 + hash(i, 4) * 130, y + 50 + hash(i, 5) * 120, 40 + hash(i, 6) * 30, 40 + hash(i, 7) * 30); c.fill(); } c.globalAlpha = 1; c.fillStyle = "#6d5a5f"; c.font = "italic 600 22px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("Shapes, Ava", x + 128, y + 260); }],
    ["#FBE9C4", "#6d5a5f", (x, y) => { c.fillStyle = "#A8E6FF"; c.fillRect(x + 28, y + 40, 200, 170); c.fillStyle = "#F2A03D"; c.beginPath(); c.ellipse(x + 118, y + 125, 52, 30, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(x + 166, y + 125); c.lineTo(x + 206, y + 95); c.lineTo(x + 206, y + 155); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(x + 90, y + 118, 9, 0, 7); c.fill(); c.fillStyle = "#3b3340"; c.beginPath(); c.arc(x + 88, y + 118, 4, 0, 7); c.fill(); c.fillStyle = "#6d5a5f"; c.font = "italic 600 22px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("Fish, Noah", x + 128, y + 260); }],
    ["#F28F7E", "#FFF9F0", (x, y) => { c.fillStyle = "#FFF9F0"; c.font = "700 120px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("♥", x + 128, y + 150); c.font = "700 44px 'Trebuchet MS',sans-serif"; c.fillText("BE KIND", x + 128, y + 222); c.font = "600 24px 'Trebuchet MS',sans-serif"; c.fillText("it costs nothing", x + 128, y + 262); }],
    ["#3B3F72", "#F8D977", (x, y) => { c.fillStyle = "#F8D977"; c.font = "700 130px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("U", x + 128, y + 160); c.font = "700 36px 'Trebuchet MS',sans-serif"; c.fillText("TEAM UNIFY", x + 128, y + 220); c.fillStyle = "#fff"; c.font = "600 24px 'Trebuchet MS',sans-serif"; c.fillText("one school, one team", x + 128, y + 262); }],
    ["#FFF9F0", "#6d5a5f", (x, y) => { const cx = x + 128, cy = y + 150; c.fillStyle = "#EADFCB"; c.beginPath(); c.arc(cx, cy, 98, 0, 7); c.fill(); c.fillStyle = "#FFFDF6"; c.beginPath(); c.arc(cx, cy, 86, 0, 7); c.fill(); c.strokeStyle = "#6d5a5f"; c.lineWidth = 4; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70); c.lineTo(cx + Math.cos(a) * 80, cy + Math.sin(a) * 80); c.stroke(); } c.lineWidth = 7; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + 36, cy - 26); c.stroke(); c.lineWidth = 5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx - 8, cy - 58); c.stroke(); c.fillStyle = "#E07A66"; c.beginPath(); c.arc(cx, cy, 6, 0, 7); c.fill(); }],
    ["#E8A33D", "#FFF9F0", (x, y) => { c.fillStyle = "#FFF9F0"; c.font = "700 40px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("CAREERS", x + 128, y + 100); c.font = "90px sans-serif"; c.fillText("🚀", x + 128, y + 210); c.font = "600 24px 'Trebuchet MS',sans-serif"; c.fillText("what will you be?", x + 128, y + 262); }],
  ];
  c.fillStyle = "#FBF3E2"; c.fillRect(0, 0, 1024, 1024);
  cells.forEach(([bg, , draw], i) => { const x = (i % 4) * cw, y = Math.floor(i / 4) * ch, art = bg === "#FBE9C4"; c.save(); c.beginPath(); c.rect(x, y, cw, ch); c.clip();
    c.fillStyle = bg; c.fillRect(x, y, cw, ch); grain(c, x, y, cw, ch, i + 3);
    if (!art) { c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 6; c.strokeRect(x + 10, y + 10, cw - 20, ch - 20); }
    const g = c.createLinearGradient(x, y, x + cw, y + ch); g.addColorStop(0, "rgba(255,255,255,.14)"); g.addColorStop(1, "rgba(60,30,30,.10)"); c.fillStyle = g; c.fillRect(x, y, cw, ch);
    c.textBaseline = "alphabetic"; draw(x, y); c.restore(); });
});

/** a patterned woven rug (tile it with repeat): diamonds, stripes and a border in the given colours */
export const rugPattern = (a: string, b: string, c2: string) => tex(256, 256, (c) => {
  c.fillStyle = a; c.fillRect(0, 0, 256, 256); grain(c, 0, 0, 256, 256, 9);
  c.fillStyle = b; c.fillRect(0, 0, 256, 24); c.fillRect(0, 232, 256, 24); c.fillRect(0, 0, 24, 256); c.fillRect(232, 0, 24, 256);
  c.fillStyle = c2; for (let i = 0; i < 8; i++) { c.fillRect(4 + i * 32, 8, 16, 8); c.fillRect(4 + i * 32, 240, 16, 8); c.fillRect(8, 4 + i * 32, 8, 16); c.fillRect(240, 4 + i * 32, 8, 16); }
  for (const [x, y] of [[128, 128], [64, 64], [192, 64], [64, 192], [192, 192]] as const) { const r = x === 128 ? 60 : 30; c.fillStyle = c2; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); c.fill(); c.fillStyle = b; c.beginPath(); c.moveTo(x, y - r * 0.6); c.lineTo(x + r * 0.6, y); c.lineTo(x, y + r * 0.6); c.lineTo(x - r * 0.6, y); c.closePath(); c.fill(); c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.arc(x, y, r * 0.14, 0, 7); c.fill(); }
}, true);
export const checkerTex = (a: string, b: string, n = 8) => tex(256, 256, (c) => { const s = 256 / n; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { c.fillStyle = (i + j) & 1 ? a : b; c.fillRect(i * s, j * s, s, s); } grain(c, 0, 0, 256, 256, 4); c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 2; c.strokeRect(1, 1, 254, 254); }, true);
/** soft radial pool of light (additive) */
export const glowTex = () => tex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 2, 64, 64, 62); g.addColorStop(0, "rgba(255,230,170,1)"); g.addColorStop(0.45, "rgba(255,200,120,.45)"); g.addColorStop(1, "rgba(255,180,90,0)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
export const starTex = () => tex(64, 64, (c) => { c.translate(32, 32); c.fillStyle = "#fff"; c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 5 : 30, a = i * Math.PI / 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); const g = c.createRadialGradient(0, 0, 0, 0, 0, 20); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(-32, -32, 64, 64); });
/** vertical pennant banner in grey-scale stripes so material.color tints it with the mood accent */
export const bannerStripeTex = () => tex(128, 384, (c) => {
  c.fillStyle = "#fff"; c.fillRect(0, 0, 128, 384); grain(c, 0, 0, 128, 384, 6); c.fillStyle = "rgba(0,0,0,.14)"; c.fillRect(0, 0, 128, 18); c.fillRect(0, 300, 128, 12);
  c.fillStyle = "#FFF9F0"; c.font = "700 70px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("U", 64, 130); c.font = "700 26px 'Trebuchet MS',sans-serif"; c.fillText("UNIFY", 64, 180); c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(64, 240, 28, 0, 7); c.fill(); c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.arc(64, 240, 14, 0, 7); c.fill();
  c.fillStyle = "#fff"; c.beginPath(); c.moveTo(0, 384); c.lineTo(64, 330); c.lineTo(128, 384); c.fill();
});
export const corkTex = () => tex(512, 512, (c) => { c.fillStyle = "#C9A36B"; c.fillRect(0, 0, 512, 512); for (let k = 0; k < 1700; k++) { c.fillStyle = k % 3 === 0 ? "rgba(255,230,180,.35)" : k % 3 === 1 ? "rgba(120,80,40,.28)" : "rgba(90,55,25,.2)"; const r = 1 + hash(k, 3) * 3; c.beginPath(); c.arc(hash(k, 1) * 512, hash(k, 2) * 512, r, 0, 7); c.fill(); } }, true);
