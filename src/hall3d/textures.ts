/** Paper-cut surface textures, drawn with Canvas2D at load time. Soft cut edges (never black), a lit rim upper-left and a soft shadow lower-right. */
import * as THREE from "three";

export const OUT = "#6d5a5f", PAPER = "#F7EEDF";
const mk = (w: number, h: number, fn: (c: CanvasRenderingContext2D, w: number, h: number) => void, repeat = false) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const c = cv.getContext("2d")!; fn(c, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const stroke = (c: CanvasRenderingContext2D, lw = 3, col = OUT) => { c.lineWidth = lw; c.strokeStyle = col; c.lineJoin = "round"; c.stroke(); };
const fillStroke = (c: CanvasRenderingContext2D, fill: string, lw = 3) => { c.fillStyle = fill; c.fill(); if (lw) stroke(c, lw); };
const hash = (a: number, b: number, k = 0) => { const n = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453; return n - Math.floor(n); };
/** lit rim upper-left + shadow lower-right along the current path bounds (cheap bevel for rectangles) */
const bevel = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s = 6) => {
  c.save(); c.lineWidth = s; c.strokeStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.moveTo(x + s, y + h - s); c.lineTo(x + s, y + s); c.lineTo(x + w - s, y + s); c.stroke();
  c.strokeStyle = "rgba(70,40,50,.22)"; c.beginPath(); c.moveTo(x + w - s, y + s); c.lineTo(x + w - s, y + h - s); c.lineTo(x + s, y + h - s); c.stroke(); c.restore();
};

export const floorTex = () => mk(256, 256, (c) => {
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const x = i * 128, y = j * 128; c.fillStyle = (i + j) & 1 ? "#d4ebf5" : "#e3f3f9"; c.fillRect(x, y, 128, 128);
    const g = c.createLinearGradient(x, y, x + 128, y + 128); g.addColorStop(0, "rgba(255,255,255,.28)"); g.addColorStop(1, "rgba(60,90,110,.10)"); c.fillStyle = g; c.fillRect(x, y, 128, 128);
    for (let k = 0; k < 26; k++) { c.fillStyle = k & 1 ? "rgba(255,255,255,.55)" : "rgba(80,110,130,.18)"; c.fillRect(x + hash(i, j, k) * 124, y + hash(j, i, k + 40) * 124, 2.4, 2.4); }
  }
  c.strokeStyle = "rgba(90,120,140,.45)"; c.lineWidth = 3; c.strokeRect(1.5, 1.5, 253, 253); c.beginPath(); c.moveTo(128, 0); c.lineTo(128, 256); c.moveTo(0, 128); c.lineTo(256, 128); c.stroke();
}, true);

export const rugTex = () => mk(256, 256, (c) => {
  c.fillStyle = "#9fd0e8"; c.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 220; k++) { c.fillStyle = k & 1 ? "rgba(255,255,255,.3)" : "rgba(50,108,158,.14)"; c.fillRect(hash(k, 1) * 256, hash(k, 2) * 256, 3, 3); }
  for (const [x, w, col] of [[0, 18, "#EAB94E"], [22, 8, "#F28F7E"], [226, 8, "#F28F7E"], [238, 18, "#EAB94E"]] as const) { c.fillStyle = col; c.fillRect(x, 0, w, 256); }
  c.fillStyle = "rgba(255,255,255,.55)"; for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(128, i * 128 + 16); c.lineTo(160, i * 128 + 64); c.lineTo(128, i * 128 + 112); c.lineTo(96, i * 128 + 64); c.closePath(); c.fill(); }
}, true);

/** wall face: crown, scalloped paper garland, striped paint, chair rail, sage wainscot, baseboard. Maps 4 units of length x 4.2 of height. */
export const wallTex = () => mk(512, 540, (c, w, h) => {
  c.fillStyle = "#F4EBDB"; c.fillRect(0, 0, w, h);
  const paint = c.createLinearGradient(0, 0, 0, h); paint.addColorStop(0, "#FBF1DD"); paint.addColorStop(1, "#EAF1E8"); c.fillStyle = paint; c.fillRect(0, 60, w, 300);
  for (let x = 0; x < w; x += 32) { c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(x, 60, 14, 300); c.fillStyle = "rgba(110,120,110,.10)"; c.fillRect(x + 14, 60, 3, 300); }
  c.fillStyle = "#FFF9F0"; c.fillRect(0, 0, w, 40);
  const cols = ["#F28F7E", "#EAB94E", "#8FC9E8", "#B8A8DA"];
  for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(32 + i * 64, 42, 30, 0, Math.PI); fillStroke(c, cols[i % 4], 3); }
  c.fillStyle = "#EAB94E"; c.fillRect(0, 340, w, 22); c.fillStyle = "rgba(255,255,255,.45)"; c.fillRect(0, 340, w, 5);
  c.fillStyle = "#A9CDB8"; c.fillRect(0, 362, w, 150);
  for (let p = 0; p < 2; p++) { rr(c, 24 + p * 256, 384, 208, 104, 8); fillStroke(c, "#98C1A8", 3); bevel(c, 24 + p * 256, 384, 208, 104, 5); }
  c.fillStyle = "#9A653D"; c.fillRect(0, 512, w, 28); c.fillStyle = "rgba(255,255,255,.3)"; c.fillRect(0, 512, w, 4);
  c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 361); c.lineTo(w, 361); c.moveTo(0, 512); c.lineTo(w, 512); c.stroke();
}, true);

export const lockerTex = (col: string, n: number) => mk(264, 640, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = "rgba(255,255,255,.22)"; c.fillRect(0, 0, w, 34);
  rr(c, 16, 44, w - 32, h - 70, 10); fillStroke(c, "rgba(0,0,0,.09)", 3); bevel(c, 16, 44, w - 32, h - 70, 5);
  for (let i = 0; i < 5; i++) { rr(c, 46, 66 + i * 17, w - 92, 7, 3); c.fillStyle = "rgba(60,40,50,.42)"; c.fill(); }
  rr(c, 78, 252, 108, 42, 6); fillStroke(c, "#FFF9F0", 2.5); c.fillStyle = "#6d5a5f"; c.font = "700 26px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText(String(100 + n), 132, 282);
  rr(c, w - 62, 330, 18, 74, 8); fillStroke(c, "#EAB94E", 2.5);
  if (n % 2 === 0) { c.beginPath(); c.arc(70, 372, 16, 0, 7); fillStroke(c, ["#F28F7E", "#EAB94E", "#B8A8DA"][n % 3], 2.5); }
  for (let i = 0; i < 4; i++) { rr(c, 46, h - 96 + i * 12, w - 92, 5, 2); c.fillStyle = "rgba(60,40,50,.3)"; c.fill(); }
  c.strokeStyle = OUT; c.lineWidth = 6; c.strokeRect(0, 0, w, h);
});

export const doorTex = (col: string) => mk(320, 576, (c, w, h) => {
  c.fillStyle = col; c.fillRect(0, 0, w, h);
  for (const x of [10, 168]) {
    rr(c, x + 14, 84, 118, 150, 8); fillStroke(c, "#A9DDF2", 3); rr(c, x + 24, 96, 30, 120, 6); c.fillStyle = "rgba(255,255,255,.6)"; c.fill();
    rr(c, x + 10, 280, 126, 200, 8); fillStroke(c, "rgba(0,0,0,.12)", 3); bevel(c, x + 10, 280, 126, 200, 5);
  }
  c.fillStyle = "rgba(0,0,0,.22)"; c.fillRect(150, 0, 20, h);
  c.fillStyle = "#EAB94E"; c.fillRect(0, h - 44, w, 44); c.fillStyle = "rgba(255,255,255,.4)"; c.fillRect(0, h - 44, w, 6);
  for (const x of [128, 192]) { c.beginPath(); c.arc(x, 330, 9, 0, 7); fillStroke(c, "#EAB94E", 2.5); }
  c.strokeStyle = OUT; c.lineWidth = 6; c.strokeRect(0, 0, w, h); c.beginPath(); c.moveTo(160, 0); c.lineTo(160, h); c.stroke();
});

export const signTex = (label: string, col: string, ink = "#FFF9F0") => mk(512, 128, (c, w, h) => {
  rr(c, 8, 22, w - 16, h - 30, 22); fillStroke(c, col, 5); rr(c, 22, 34, w - 44, h - 54, 14); c.fillStyle = "rgba(255,255,255,.28)"; c.fill();
  c.fillStyle = ink; c.font = "800 58px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, w / 2, h / 2 + 4);
  c.strokeStyle = OUT; c.lineWidth = 4; for (const x of [80, w - 80]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 24); c.stroke(); }
});

export const windowTex = () => mk(320, 400, (c, w, h) => {
  rr(c, 10, 10, w - 20, h - 46, 14); fillStroke(c, "#FFF9F0", 5);
  const g = c.createLinearGradient(0, 40, 0, 250); g.addColorStop(0, "#A9DDF2"); g.addColorStop(1, "#E9F7FC"); rr(c, 40, 40, w - 80, 230, 6); c.fillStyle = g; c.fill(); stroke(c, 3);
  c.beginPath(); c.arc(220, 96, 26, 0, 7); fillStroke(c, "#F8D977", 3);
  c.beginPath(); c.moveTo(44, 260); c.lineTo(110, 170); c.lineTo(170, 260); c.closePath(); fillStroke(c, "#88B89A", 3);
  c.beginPath(); c.moveTo(120, 260); c.lineTo(210, 150); c.lineTo(276, 260); c.closePath(); fillStroke(c, "#5E9C72", 3);
  c.strokeStyle = "#FFF9F0"; c.lineWidth = 9; c.beginPath(); c.moveTo(w / 2, 40); c.lineTo(w / 2, 270); c.moveTo(40, 155); c.lineTo(w - 40, 155); c.stroke();
  rr(c, 0, h - 60, w, 26, 8); fillStroke(c, "#F1C887", 4);
  for (const s of [-1, 1]) { const x = s < 0 ? 16 : w - 16; c.beginPath(); c.moveTo(x, 14); c.quadraticCurveTo(x + s * -50, 90, x + s * -34, 250); c.lineTo(x + s * -34, 300); c.lineTo(x, 300); c.closePath(); fillStroke(c, "#F28F7E", 3.5); }
});

export const boardTex = () => mk(384, 256, (c, w, h) => {
  rr(c, 4, 4, w - 8, h - 8, 14); fillStroke(c, "#C98B4D", 6); rr(c, 20, 20, w - 40, h - 40, 6); c.fillStyle = "#E8C39A"; c.fill(); stroke(c, 3);
  const cols = ["#FFF9F0", "#F8D977", "#8FC9E8", "#A9DCC0", "#EAA5B2", "#B8A8DA"];
  [[36, 34], [148, 30], [256, 40], [40, 138], [156, 130], [262, 140]].forEach(([x, y], i) => {
    c.save(); c.translate(x + 40, y + 40); c.rotate((hash(i, 3) - 0.5) * 0.24); c.translate(-40, -40);
    c.shadowColor = "rgba(50,30,40,.35)"; c.shadowBlur = 6; c.shadowOffsetY = 4; rr(c, 0, 0, 82, 84, 4); fillStroke(c, cols[i], 3); c.shadowColor = "transparent";
    for (let k = 0; k < 4; k++) { c.fillStyle = "rgba(60,50,60,.4)"; c.fillRect(10, 18 + k * 14, 50 + (k % 2) * 12, 4); }
    c.beginPath(); c.arc(41, 6, 6, 0, 7); fillStroke(c, i & 1 ? "#F28F7E" : "#4F91C7", 2); c.restore();
  });
});

export const trophyTex = () => mk(320, 300, (c, w, h) => {
  rr(c, 4, 4, w - 8, h - 8, 14); fillStroke(c, "#C98B4D", 6); rr(c, 22, 22, w - 44, h - 44, 8); c.fillStyle = "#DDF0F6"; c.fill(); stroke(c, 3);
  for (const y of [120, 226]) { rr(c, 26, y, w - 52, 14, 4); fillStroke(c, "#DDAA68", 3); }
  [[70, 120, 1], [160, 120, 1.25], [250, 120, 0.9], [110, 226, 1.1], [220, 226, 1]].forEach(([cx, y, s]) => {
    c.beginPath(); c.moveTo(cx - 26 * s, y - 74 * s); c.lineTo(cx + 26 * s, y - 74 * s); c.lineTo(cx + 14 * s, y - 30 * s); c.lineTo(cx - 14 * s, y - 30 * s); c.closePath(); fillStroke(c, "#EAB94E", 3);
    rr(c, cx - 6 * s, y - 30 * s, 12 * s, 18 * s, 3); fillStroke(c, "#EAB94E", 3); rr(c, cx - 22 * s, y - 12 * s, 44 * s, 12 * s, 3); fillStroke(c, "#9A653D", 3);
  });
  c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 8; c.beginPath(); c.moveTo(44, 40); c.lineTo(110, 100); c.stroke();
});

export const clockTex = () => mk(256, 256, (c) => {
  c.beginPath(); c.arc(128, 128, 120, 0, 7); fillStroke(c, "#F28F7E", 8); c.beginPath(); c.arc(128, 128, 96, 0, 7); fillStroke(c, "#FFF9F0", 4);
  for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; c.strokeStyle = "#4a3b3f"; c.lineWidth = 6; c.beginPath(); c.moveTo(128 + Math.sin(a) * 76, 128 - Math.cos(a) * 76); c.lineTo(128 + Math.sin(a) * 90, 128 - Math.cos(a) * 90); c.stroke(); }
  c.strokeStyle = "#4a3b3f"; c.lineCap = "round"; c.lineWidth = 9; c.beginPath(); c.moveTo(128, 128); c.lineTo(160, 88); c.stroke(); c.lineWidth = 6; c.beginPath(); c.moveTo(128, 128); c.lineTo(118, 52); c.stroke();
  c.beginPath(); c.arc(128, 128, 9, 0, 7); fillStroke(c, "#F28F7E", 3);
});

export const posterTex = (kind: number) => mk(256, 320, (c, w, h) => {
  rr(c, 6, 6, w - 12, h - 12, 8); fillStroke(c, ["#FFFFFF", "#FFF7D8", "#E9F3FF"][kind % 3], 5);
  if (kind % 3 === 0) { c.fillStyle = "#8FC9E8"; c.fillRect(30, 30, 196, 130); stroke(c, 3); c.beginPath(); c.ellipse(90, 90, 44, 28, 0, 0, 7); c.fillStyle = "#88B89A"; c.fill(); c.beginPath(); c.ellipse(170, 108, 32, 20, 0, 0, 7); c.fill(); c.fillStyle = "#F28F7E"; c.fillRect(30, 190, 120, 20); c.fillStyle = "#B8A8DA"; c.fillRect(30, 226, 90, 16); }
  else if (kind % 3 === 1) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, r = i & 1 ? 34 : 88; c.lineTo(128 + Math.cos(a) * r, 130 + Math.sin(a) * r); } c.closePath(); fillStroke(c, "#EAB94E", 4); c.fillStyle = "#F28F7E"; c.fillRect(40, 250, 176, 22); }
  else { c.fillStyle = "#4F91C7"; c.font = "800 78px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("ABC", 128, 130); c.fillStyle = "#F28F7E"; c.fillRect(40, 170, 176, 18); c.fillStyle = "#88B89A"; c.fillRect(40, 208, 120, 16); c.fillStyle = "#EAB94E"; c.fillRect(40, 246, 150, 16); }
  c.beginPath(); c.arc(128, 18, 9, 0, 7); fillStroke(c, "#F28F7E", 3);
});

export const farWallTex = () => mk(768, 512, (c, w, h) => {
  c.fillStyle = "#F4EBDB"; c.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 32) { c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(x, 40, 14, 340); }
  c.fillStyle = "#A9CDB8"; c.fillRect(0, 380, w, 110); c.fillStyle = "#9A653D"; c.fillRect(0, 490, w, 22); c.fillStyle = "#EAB94E"; c.fillRect(0, 366, w, 16);
  c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 380); c.lineTo(w, 380); c.stroke();
  c.fillStyle = "#FFF9F0"; c.fillRect(0, 0, w, 36);
  for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(32 + i * 64, 38, 30, 0, Math.PI); fillStroke(c, ["#F28F7E", "#EAB94E", "#8FC9E8", "#B8A8DA"][i % 4], 3); }
  rr(c, 232, 130, 304, 356, 10); fillStroke(c, "#9A653D", 8);                          // exit double doors
  for (const x of [244, 392]) { rr(c, x, 142, 136, 332, 6); fillStroke(c, "#8FC9E8", 4); rr(c, x + 14, 160, 108, 120, 6); c.fillStyle = "#DDF3FB"; c.fill(); stroke(c, 3); rr(c, x + 14, 320, 108, 130, 6); fillStroke(c, "rgba(0,0,0,.10)", 3); }
  rr(c, 300, 82, 168, 44, 12); fillStroke(c, "#F28F7E", 5); c.fillStyle = "#FFF9F0"; c.font = "800 30px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText("EXIT", 384, 114);
  for (const x of [80, 640]) { rr(c, x - 50, 120, 100, 150, 8); fillStroke(c, "#FFF9F0", 5); rr(c, x - 38, 132, 76, 110, 4); c.fillStyle = "#A9DDF2"; c.fill(); stroke(c, 3); }
});

/** soft shadow blobs */
export const blobTex = () => mk(128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, "rgba(52,34,46,.55)"); g.addColorStop(1, "rgba(52,34,46,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); });
export const cardShadowTex = () => mk(64, 64, (c, w, h) => { c.filter = "blur(5px)"; c.fillStyle = "rgba(50,30,40,.9)"; c.fillRect(12, 12, 40, 40); });
export const lanternTex = (col: string) => mk(256, 256, (c, w, h) => {
  c.fillStyle = col; c.fillRect(0, 0, w, h);
  for (let x = 0; x <= w; x += 32) { c.strokeStyle = "rgba(60,40,50,.28)"; c.lineWidth = 4; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); c.fillStyle = "rgba(255,255,255,.16)"; c.fillRect(x + 6, 0, 10, h); }
});
