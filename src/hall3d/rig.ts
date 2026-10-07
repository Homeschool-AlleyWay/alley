// @ts-nocheck
/** Chibi rig v2. Every option is optional: a look that only has the original fields (skin, hair, style, shirt, glasses, tag, pack)
 *  draws exactly as before, so the baked auditorium sheets keep their look. New fields (see avatar.ts for the option lists):
 *  hair styles + highlight, eyes (shape, colour), brows, freckles, mole, mouthStyle, glasses styles, hats, earrings, scarf,
 *  tops (hoodie, sweater, jersey, blazer, dress, overalls, vest, tank), patterns, bottoms (pants, shorts, skirt, joggers),
 *  shoes, bag style, build and head size. */
let OUT = "#6b4a4f";
export const setOutline = (col) => { OUT = col; };
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function fs(c, fill, lw = 1.4) { c.fillStyle = fill; c.fill(); if (lw) { c.lineWidth = lw; c.strokeStyle = OUT; c.lineJoin = "round"; c.stroke(); } }
function line(c, x1, y1, x2, y2, w, col) { c.lineCap = "round"; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = OUT; c.lineWidth = w + 2.2; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); }
const PANTS = ["#5b6b8c", "#7a6a58", "#4f5d75", "#8a5f6a", "#5f7a68"];
/** mix a #rrggbb colour toward black (k>0) or white (k<0) */
export function shade(h, k) {
  if (!h || h[0] !== "#" || h.length < 7) return h; const n = parseInt(h.slice(1, 7), 16), t = k > 0 ? 0 : 255, a = Math.abs(k);
  return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (t - v) * a).toString(16).padStart(2, "0")).join("");
}
function heart(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y + s * .9); c.bezierCurveTo(x - s * 1.6, y - s * .2, x - s * .7, y - s * 1.2, x, y - s * .35); c.bezierCurveTo(x + s * .7, y - s * 1.2, x + s * 1.6, y - s * .2, x, y + s * .9); c.fill(); }
function star(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i & 1 ? s * .45 : s; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); }

export function drawChar(c, fx, fy, o, t) {
  if (o.age === "adult" && !o.legacyAdult) return drawAdult(c, fx, fy, o, t);
  c.save(); c.translate(Math.round(fx * 2) / 2, Math.round(fy * 2) / 2);
  const mv = o.moving, sw = mv ? Math.sin(o.walk) : 0, dir = o.dir, side = dir === "left" || dir === "right", fl = dir === "left" ? -1 : 1, up = dir === "up", sit = o.sitting;
  const adult = o.age === "adult", top = o.top, bottom = o.bottom || "pants", hs = (o.headSize || 1) * (adult ? 1 : 1), bw = (o.build === "slim" ? 0.9 : o.build === "sturdy" ? 1.12 : 1) * (adult ? 1.12 : 1), SY = adult ? 1.28 : 1;
  c.fillStyle = "rgba(70,45,55,.24)"; c.beginPath(); c.ellipse(0, 1, 10 * bw, 3.6, 0, 0, 7); c.fill();
  if (sit) c.translate(0, 8);
  c.translate(0, mv ? -Math.abs(Math.cos(o.walk)) * 1.8 : Math.sin(t * 2 + o.id) * .35);
  if (adult) c.scale(1, SY);                                             // adults: longer legs and torso, then a smaller head on top
  const pants = o.pants || PANTS[o.id % 5], pack = o.pack || ["#f28f7e", "#4f91c7", "#eab94e", "#88b89a", "#b8a8da"][o.id % 5], shoe = o.shoes || "#fbf6ee", packStyle = o.packStyle || "pack";
  const armCol = top === "tank" ? o.skin : o.shirt, under = o.shirt2 || "#fff6ea";
  // ---- legs + shoes
  if (!sit) [-1, 1].forEach((s) => {
    const lift = mv ? Math.max(0, s * sw) * 2.6 : 0, x1 = side ? 0 : s * 3.2 * bw, x2 = side ? s * sw * 4.2 : s * 3.2 * bw;
    if (bottom === "shorts") { line(c, x1, -9, x2, -2 - lift, 3.4, o.skin); line(c, x1, -9, x1 + (x2 - x1) * .38, -6 - lift * .38, 3.9, pants); }
    else if (bottom === "skirt") line(c, x1, -9, x2, -2 - lift, 3.2, o.skin);
    else line(c, x1, -9, x2, -2 - lift, bottom === "joggers" ? 4.2 : 3.6, pants);
    const fx2 = x2 + (side ? fl * 1.2 : 0), fy2 = -.6 - lift;
    if (o.shoeStyle === "boot") { rr(c, fx2 - 2.6, fy2 - 3.6, 5.2, 4.6, 1.6); fs(c, shoe, 1.1); c.beginPath(); c.ellipse(fx2 + (side ? fl * 1.2 : 0), fy2 + .6, 3.6, 1.7, 0, 0, 7); fs(c, shade(shoe, .25), 1.1); }
    else if (o.shoeStyle === "sandal") { c.beginPath(); c.ellipse(fx2, fy2, 3.4, 1.7, 0, 0, 7); fs(c, o.skin, 1.1); c.strokeStyle = shoe; c.lineWidth = 1.2; c.beginPath(); c.moveTo(fx2 - 2.2, fy2 - .3); c.lineTo(fx2 + 2.2, fy2 - .3); c.stroke(); }
    else { c.beginPath(); c.ellipse(fx2, fy2, 3.4, 1.9, 0, 0, 7); fs(c, shoe, 1.1); if (o.shoeStyle === "sneaker") { c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(fx2 - 3, fy2 + .5, 6, .7); } }
  });
  if (bottom === "skirt" && !sit) { c.beginPath(); c.moveTo(-6.8 * bw, -12); c.lineTo(6.8 * bw, -12); c.lineTo(9.6 * bw, -5.6); c.lineTo(-9.6 * bw, -5.6); c.closePath(); fs(c, pants, 1.3); c.fillStyle = "rgba(255,255,255,.22)"; c.fillRect(-8.2 * bw, -7.4, 16.4 * bw, 1); }
  // ---- arms (far side first), packs peeking behind
  const arm = (s, near) => { let ax = side ? s * sw * 3.5 : s * 8.2, hy = -9.5 - (mv ? -s * sw * 1.5 : 0); const A = o.arms && (s > 0 ? o.arms.R : o.arms.L); if (A) { ax = side ? fl * Math.abs(A[0]) * 0.9 : A[0]; hy = A[1]; } line(c, side ? 0 : s * 6.6 * bw, -17, ax, hy, 3.2, armCol); c.beginPath(); c.arc(ax, hy + .6, 1.9, 0, 7); fs(c, o.skin, 1); };
  if (side) arm(-fl * -1, false);
  if (side && packStyle === "pack") { rr(c, -fl * 9.5, -19, 7, 10, 3); fs(c, pack, 1.2); }
  else if (side && packStyle === "mini") { rr(c, -fl * 8, -16, 5, 6.5, 2.4); fs(c, pack, 1.1); }
  // ---- torso
  if (top === "hoodie") { c.beginPath(); c.ellipse(0, -19.6, 6.4 * bw, 3.2, 0, 0, 7); fs(c, shade(o.shirt, .14), 1.2); }
  const tp = () => {
    if (top === "dress") { c.beginPath(); c.moveTo(-6.4 * bw, -19.5); c.quadraticCurveTo(0, -21, 6.4 * bw, -19.5); c.lineTo(7 * bw, -13); c.lineTo(9.6 * bw, -6); c.quadraticCurveTo(0, -4.4, -9.6 * bw, -6); c.lineTo(-7 * bw, -13); c.closePath(); }
    else if (top === "tank") rr(c, -5.6 * bw, -19.5, 11.2 * bw, 11.5, 4); else rr(c, -6.6 * bw, -19.5, 13.2 * bw, 11.5, 4.5);
  };
  const base = top === "overalls" || top === "vest" ? under : o.shirt;
  tp(); fs(c, base, 1.4);
  if (o.pattern && o.pattern !== "solid" && top !== "overalls" && top !== "vest") {
    const pc = o.shirt2 || (shade(o.shirt, .3)); c.save(); tp(); c.clip();
    if (o.pattern === "stripes") for (let y = -20; y < -4; y += 3.6) { c.fillStyle = pc; c.fillRect(-11, y, 22, 1.7); }
    else if (o.pattern === "dots") for (let y = -19; y < -4; y += 3.2) for (let x = -9 + ((y * 3) & 1) * 1.6; x < 10; x += 3.2) { c.fillStyle = pc; c.beginPath(); c.arc(x, y, .85, 0, 7); c.fill(); }
    else if (o.pattern === "plaid") { c.strokeStyle = pc; c.globalAlpha = .75; c.lineWidth = 1; for (let y = -19; y < -4; y += 3.6) { c.beginPath(); c.moveTo(-11, y); c.lineTo(11, y); c.stroke(); } for (let x = -9; x < 10; x += 3.6) { c.beginPath(); c.moveTo(x, -21); c.lineTo(x, -4); c.stroke(); } c.globalAlpha = 1; }
    else if (o.pattern === "hearts") for (let y = -17; y < -5; y += 4.2) for (let x = -7 + ((y * 2) & 1) * 2; x < 8; x += 4.4) heart(c, x, y, 1.1, pc);
    else if (o.pattern === "stars") for (let y = -17; y < -5; y += 4.2) for (let x = -7 + ((y * 2) & 1) * 2; x < 8; x += 4.4) star(c, x, y, 1.4, pc);
    c.restore(); tp(); c.lineWidth = 1.4; c.strokeStyle = OUT; c.stroke();
  }
  c.fillStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.ellipse(-2.4, -16.5, 2.4, 3.4, 0, 0, 7); c.fill();
  if (!top) {                                                             // original look: decoration chosen by id
    const v = o.id % 3;
    if (v === 0) { c.fillStyle = "rgba(255,255,255,.45)"; c.fillRect(-6, -15.4, 12, 2.4); }
    else if (v === 2 && !up) { c.fillStyle = "#fff"; c.beginPath(); c.moveTo(-3, -19.4); c.lineTo(0, -16); c.lineTo(3, -19.4); c.closePath(); fs(c, "#fff", .9); }
  } else if (!up) {
    if (top === "hoodie") { rr(c, -3.8, -14, 7.6, 3.6, 1.6); c.lineWidth = 1; c.strokeStyle = shade(o.shirt, .3); c.stroke(); line(c, -1.6, -18.6, -1.6, -14.8, .8, under); line(c, 1.6, -18.6, 1.6, -14.8, .8, under); }
    else if (top === "sweater") { c.fillStyle = shade(o.shirt, -.28); c.fillRect(-6.4 * bw, -10.6, 12.8 * bw, 2); c.beginPath(); c.ellipse(0, -19.3, 3.6, 1.5, 0, 0, 7); fs(c, shade(o.shirt, -.28), 1); }
    else if (top === "jersey") { c.fillStyle = o.shirt2 || "#fff"; c.font = "800 6.4px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText(String(o.num ?? (o.id % 90) + 1), 0, -11.8); c.fillRect(-6.4 * bw, -19.4, 12.8 * bw, .9); }
    else if (top === "blazer") { c.beginPath(); c.moveTo(-3.4, -19.4); c.lineTo(0, -12.4); c.lineTo(3.4, -19.4); c.closePath(); fs(c, under, .9); c.beginPath(); c.moveTo(-3.4, -19.4); c.lineTo(-.4, -11.8); c.lineTo(-5.6, -11); c.lineTo(-6.4, -17.6); c.closePath(); fs(c, shade(o.shirt, .16), .9); c.beginPath(); c.moveTo(3.4, -19.4); c.lineTo(.4, -11.8); c.lineTo(5.6, -11); c.lineTo(6.4, -17.6); c.closePath(); fs(c, shade(o.shirt, .16), .9); c.fillStyle = "#EAB94E"; c.beginPath(); c.arc(0, -10.4, .7, 0, 7); c.fill(); }
    else if (top === "overalls") { rr(c, -4, -16.4, 8, 6.8, 1.6); fs(c, o.shirt, 1.1); line(c, -3.4, -19.4, -3.2, -16.2, 1.2, o.shirt); line(c, 3.4, -19.4, 3.2, -16.2, 1.2, o.shirt); c.fillStyle = "#EAB94E"; [-3.2, 3.2].forEach((x) => { c.beginPath(); c.arc(x, -16.2, .7, 0, 7); c.fill(); }); rr(c, -2, -14.4, 4, 2.4, .8); c.lineWidth = .8; c.strokeStyle = shade(o.shirt, .3); c.stroke(); }
    else if (top === "vest") { c.beginPath(); c.moveTo(-6.6 * bw, -19.4); c.lineTo(-1.2, -19.4); c.lineTo(-.6, -9.4); c.lineTo(-6.2 * bw, -9.4); c.closePath(); fs(c, o.shirt, 1); c.beginPath(); c.moveTo(6.6 * bw, -19.4); c.lineTo(1.2, -19.4); c.lineTo(.6, -9.4); c.lineTo(6.2 * bw, -9.4); c.closePath(); fs(c, o.shirt, 1); }
    else if (top === "tee") { c.beginPath(); c.ellipse(0, -19.3, 3.2, 1.3, 0, 0, 7); fs(c, shade(o.shirt, .12), .9); }
    else if (top === "dress") { c.fillStyle = shade(o.shirt, -.35); c.fillRect(-6.4 * bw, -13.2, 13.2 * bw, 1.2); }
  }
  if (up) { if (packStyle !== "none") { rr(c, -6, -19, 12, 10.5, 4); fs(c, pack, 1.3); c.fillStyle = "rgba(255,255,255,.3)"; c.fillRect(-4, -17.5, 8, 2); } }
  else if (!side && packStyle === "pack") { line(c, -3.6, -19.2, -3.6, -11, 1.5, pack); line(c, 3.6, -19.2, 3.6, -11, 1.5, pack); }
  else if (!side && packStyle === "messenger") { line(c, -5.6, -19.2, 5.2, -9.8, 1.5, pack); rr(c, 3.2, -12.6, 5.6, 5, 1.6); fs(c, pack, 1.1); }
  if (o.scarf) { c.beginPath(); c.ellipse(0, -19.4, 6.6 * bw, 2.4, 0, 0, 7); fs(c, o.scarf, 1.2); if (!up && !side) { rr(c, 1.6, -19, 3.2, 8, 1.4); fs(c, o.scarf, 1.1); c.fillStyle = "rgba(255,255,255,.4)"; c.fillRect(1.9, -15.6, 2.6, .9); } }
  if (o.tag) { c.beginPath(); c.moveTo(-6, -19.5); c.lineTo(-1, -8.5); c.lineTo(-6.6, -9); c.closePath(); c.fillStyle = "#c4463c"; c.fill(); c.beginPath(); c.moveTo(6, -19.5); c.lineTo(1, -8.5); c.lineTo(6.6, -9); c.closePath(); c.fill(); }
  if (o.badge && !up && !side) { c.beginPath(); c.arc(-3.8, -15.4, 1.5, 0, 7); fs(c, o.badge, .9); }
  if (!side) { arm(-1); arm(1); } else arm(fl * 1, true);
  if (adult) c.scale(1, 1 / SY);
  // ---- head + hair (back layer)
  c.save(); if (adult) { c.translate(0, -8.4 + (side ? 0 : 0)); c.scale(0.82, 0.82); } c.translate((o.turn || 0) * 1.7, 0);
  const hy = -28, hc = o.hair, st = o.style, hc2 = o.hair2 || shade(hc, -.28);
  const HX = (adult ? 8.1 : 8.9) * hs, HY = (adult ? 9.2 : 8.3) * hs;
  if (st === "long" || st === "bob") { rr(c, -9.8, hy - 6, 19.6, st === "long" ? 20 : 14, 7); fs(c, hc, 1.3); }
  if (st === "wavy") { rr(c, -10.2, hy - 6, 20.4, 18, 7); fs(c, hc, 1.3); [-7, 0, 7].forEach((x) => { c.beginPath(); c.arc(x, hy + 12, 3.6, 0, 7); fs(c, hc, 1.1); }); }
  if (st === "afro") { c.beginPath(); c.ellipse(side ? -fl * 1.2 : 0, hy - 3, 13.2, 12.6, 0, 0, 7); fs(c, hc, 1.4); }
  if (st === "bun") { c.beginPath(); c.arc(side ? -fl * 3 : 0, hy - 9.5, 4.4, 0, 7); fs(c, hc, 1.3); }
  if (st === "topknot") { c.beginPath(); c.arc(side ? -fl * 2 : 0, hy - 12, 3.4, 0, 7); fs(c, hc, 1.3); }
  if (st === "twinbuns") (side ? [-fl * 3] : [-7.6, 7.6]).forEach((x) => { c.beginPath(); c.arc(x, hy - 10.4, 3.9, 0, 7); fs(c, hc, 1.3); });
  if (st === "pony") { c.save(); c.translate(side ? -fl * 9 : up ? 0 : 9, side ? hy + 2 : up ? hy + 8 : hy + 1); c.rotate(side ? 0 : up ? 0 : -.5); c.beginPath(); c.ellipse(0, 4, 3.2, 6.5, 0, 0, 7); fs(c, hc, 1.3); c.restore(); }
  if (st === "pigtails") (side ? [-fl * 10] : [-10.6, 10.6]).forEach((x, i) => { c.save(); c.translate(x, hy + 3); c.rotate(side ? 0 : (i ? -.4 : .4)); c.beginPath(); c.ellipse(0, 5, 2.9, 6.6, 0, 0, 7); fs(c, hc, 1.3); c.restore(); });
  if (st === "braids") (side ? [-fl * 8.4] : [-9.4, 9.4]).forEach((x) => { for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(x, hy + 4 + k * 3.7, 2.2, 2.1, 0, 0, 7); fs(c, k & 1 ? hc2 : hc, 1.1); } });
  if (st === "curly") [[-8, hy - 2], [8, hy - 2], [-6, hy - 8], [6, hy - 8], [0, hy - 10]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 4.6, 0, 7); fs(c, hc, 1.2); });
  if (!side) [-1, 1].forEach((s) => { c.beginPath(); c.arc(s * 8.7, hy + 1, 2, 0, 7); fs(c, o.skin, 1); });
  c.beginPath(); c.ellipse(side ? fl * .6 : 0, hy, HX, HY, 0, 0, 7); fs(c, o.skin, 1.5);
  c.fillStyle = "rgba(120,70,60,.13)"; c.beginPath(); c.ellipse(3, hy + 3, 7.5, 6, 0, 0, 7); c.fill();
  // ---- face
  if (!up) {
    const blink = (t * .9 + o.id * 1.7) % 4 < .13, ex = side ? [fl * 4.4] : [-3.5, 3.5], es = o.eyeShape || "round", ec = o.eyeColor, brow = o.brow || "soft", bc = o.browColor || o.hair;
    ex.forEach((x, k) => {
      if (blink || es === "happy") { c.strokeStyle = "#3a2a30"; c.lineWidth = 1.1; c.beginPath(); if (es === "happy" && !blink) c.arc(x, hy + .6, 1.7, Math.PI * 1.1, Math.PI * 1.9); else { c.moveTo(x - 1.6, hy); c.lineTo(x + 1.6, hy); } c.stroke(); }
      else {
        const ak = adult ? 0.74 : 1, rx = (es === "wide" ? 2.1 : es === "oval" ? 1.4 : 1.7) * ak, ry = (es === "wide" ? 2.7 : es === "oval" ? 2.7 : 2.3) * (adult ? 0.82 : 1);
        c.fillStyle = ec || "#3a2a30"; c.beginPath(); c.ellipse(x, hy, rx, ry, 0, 0, 7); c.fill();
        if (ec) { c.fillStyle = "#2a1d22"; c.beginPath(); c.ellipse(x, hy + .2, rx * .5, ry * .55, 0, 0, 7); c.fill(); }
        c.fillStyle = "#fff"; c.beginPath(); c.arc(x - .5, hy - .9, es === "wide" ? .9 : .7, 0, 7); c.fill();
        if (es === "sleepy") { c.fillStyle = o.skin; c.beginPath(); c.ellipse(x, hy - 1.1, rx + .5, ry * .62, 0, Math.PI, 2 * Math.PI); c.fill(); c.strokeStyle = "#3a2a30"; c.lineWidth = .9; c.beginPath(); c.moveTo(x - rx - .4, hy - .6); c.lineTo(x + rx + .4, hy - .6); c.stroke(); }
        if (es === "lash") { c.strokeStyle = "#3a2a30"; c.lineWidth = .8; const sg = side ? fl : (k ? 1 : -1); c.beginPath(); c.moveTo(x + sg * rx, hy - 1); c.lineTo(x + sg * (rx + 1.4), hy - 2.2); c.moveTo(x + sg * rx, hy - .1); c.lineTo(x + sg * (rx + 1.6), hy - .6); c.stroke(); }
      }
      if (brow !== "none") {
        c.strokeStyle = bc; c.lineCap = "round"; c.lineWidth = (brow === "thick" ? 1.6 : brow === "thin" ? .6 : .9) + (adult ? 0.45 : 0); c.beginPath();
        if (brow === "arch") { c.moveTo(x - 2, hy - 3.2); c.quadraticCurveTo(x, hy - 5.2, x + 2, hy - 3.6); } else if (adult) { const sg = side ? 1 : (k ? 1 : -1); c.moveTo(x - 2.2 * sg, hy - 3.5); c.lineTo(x + 2.2 * sg, hy - 4.3); } else { c.moveTo(x - 2, hy - 3.6); c.lineTo(x + 2, hy - 3.9); } c.stroke();
      }
      if (o.glasses) {
        const gs = o.glasses === true ? "round" : o.glasses, gc = o.glassColor || "#5b4048"; c.strokeStyle = gc; c.lineWidth = gs === "sun" ? 1 : .9;
        c.beginPath();
        if (gs === "square") c.roundRect(x - 3.1, hy - 2.6, 6.2, 5.2, 1.2); else if (gs === "cat") { c.ellipse(x, hy, 3.2, 2.7, 0, 0, 7); c.moveTo(x + (side ? fl : (k ? 1 : -1)) * 3, hy - 1.6); c.lineTo(x + (side ? fl : (k ? 1 : -1)) * 4.4, hy - 3.4); } else if (gs === "half") c.arc(x, hy, 3.2, Math.PI, 0); else c.arc(x, hy, 3.2, 0, 7);
        if (gs === "sun") { c.fillStyle = "rgba(40,30,40,.82)"; c.fill(); } c.stroke();
      }
    });
    if (o.glasses && !side) { c.strokeStyle = o.glassColor || "#5b4048"; c.lineWidth = .9; c.beginPath(); c.moveTo(-.3, hy - .5); c.lineTo(.3, hy - .5); c.stroke(); }
    if (adult ? o.blush === true : o.blush !== false) { c.fillStyle = o.blushColor || (adult ? "rgba(255,110,125,.14)" : "rgba(255,110,125,.38)"); (side ? [fl * 6.4] : [-6, 6]).forEach((x) => { c.beginPath(); c.ellipse(x, hy + 3.4, 2.1, 1.3, 0, 0, 7); c.fill(); }); }
    if (o.freckles) { c.fillStyle = shade(o.skin, .32); (side ? [[fl * 5.6, hy + 2.2], [fl * 6.8, hy + 3.2], [fl * 5.2, hy + 3.8]] : [[-5.6, hy + 2.4], [-4.2, hy + 3.4], [-6.4, hy + 3.8], [5.6, hy + 2.4], [4.2, hy + 3.4], [6.4, hy + 3.8]]).forEach(([x, y]) => { c.beginPath(); c.arc(x, y, .5, 0, 7); c.fill(); }); }
    if (o.mole) { c.fillStyle = "#4a2f2a"; c.beginPath(); c.arc(side ? fl * 6 : 4.4, hy + 5.2, .65, 0, 7); c.fill(); }
    if (o.nose || adult) { c.strokeStyle = shade(o.skin, .3); c.lineWidth = .8; c.beginPath(); const nx = side ? fl * 6.4 : 0; c.arc(nx, hy + 2.6, .9, .1 * Math.PI, .9 * Math.PI); c.stroke(); }
    const mx = side ? fl * 3.6 : 0, my = hy + 4.7, ms = o.mouthStyle || "smile", lc = o.lip || "#8a4650";
    if (o.mouth) { c.fillStyle = "#7A3B3B"; c.beginPath(); c.ellipse(mx, hy + 4.8, 1.7, .7 + o.mouth * 1.5, 0, 0, 7); c.fill(); }
    else if (ms === "grin") { c.beginPath(); c.moveTo(mx - 2.4, my - .9); c.quadraticCurveTo(mx, my + 2.8, mx + 2.4, my - .9); c.closePath(); c.fillStyle = "#fff"; c.fill(); c.strokeStyle = lc; c.lineWidth = .9; c.stroke(); }
    else if (ms === "smirk") { c.strokeStyle = lc; c.lineWidth = 1; c.lineCap = "round"; c.beginPath(); c.moveTo(mx - 1.8, my); c.quadraticCurveTo(mx + .4, my + 1, mx + 2.2, my - .8); c.stroke(); }
    else if (ms === "flat") { c.strokeStyle = lc; c.lineWidth = 1; c.lineCap = "round"; c.beginPath(); c.moveTo(mx - 1.5, my); c.lineTo(mx + 1.5, my); c.stroke(); }
    else if (ms === "o") { c.fillStyle = "#7A3B3B"; c.beginPath(); c.ellipse(mx, my + .2, 1, 1.2, 0, 0, 7); c.fill(); }
    else if (ms === "cat") { c.strokeStyle = lc; c.lineWidth = .9; c.lineCap = "round"; c.beginPath(); c.arc(mx - 1, my - .4, 1.1, .1 * Math.PI, .9 * Math.PI); c.arc(mx + 1, my - .4, 1.1, .1 * Math.PI, .9 * Math.PI); c.stroke(); }
    else { c.strokeStyle = lc; c.lineWidth = 1; c.lineCap = "round"; c.beginPath(); c.arc(mx, hy + (adult ? 5.4 : 4.6), adult ? 1.35 : 1.7, .15 * Math.PI, .85 * Math.PI); c.stroke(); }
  }
  // ---- hair (front layer)
  const sx = side ? -fl * 1.6 : 0, cap = () => {           // side views are drawn as "facing right" and mirrored for left
    const m = side ? fl : 1, q = side ? -1.6 : 0; if (side) { c.save(); c.scale(m, 1); }
    c.beginPath();
    if (side) { c.moveTo(-9.2 + q, hy + 5.4); c.lineTo(-9.3 + q, hy + .5); c.bezierCurveTo(-11 + q, hy - 14, 11 + q, hy - 14, 9.3 + q, hy + .5); c.quadraticCurveTo(7 + q, hy - 5.4, 4 + q, hy - 4.6); c.lineTo(-2.6 + q, hy - 1.6); c.lineTo(-5.4 + q, hy + 3.6); }
    else { c.moveTo(-9.3, hy + .5); c.bezierCurveTo(-11, hy - 14, 11, hy - 14, 9.3, hy + .5); c.quadraticCurveTo(6, hy - 3.4, 2, hy - 4.4); c.quadraticCurveTo(-3, hy - 6, -9.3, hy + .5); }
    c.closePath(); if (side) c.restore();
  };
  if (up) { c.beginPath(); c.ellipse(0, hy - .4, 9.4, 8.9, 0, 0, 7); fs(c, hc, 1.4); c.fillStyle = "rgba(255,255,255,.2)"; c.beginPath(); c.ellipse(-2.5, hy - 4, 3.5, 2, 0, 0, 7); c.fill(); }
  else if (st === "buzz") { c.beginPath(); c.moveTo(-8.8 + sx, hy - 1.2); c.bezierCurveTo(-10 + sx, hy - 11, 10 + sx, hy - 11, 8.8 + sx, hy - 1.2); c.quadraticCurveTo(0, hy - 4.6, -8.8 + sx, hy - 1.2); c.closePath(); fs(c, hc, 1.3); }
  else if (st === "undercut") { cap(); fs(c, shade(hc, .12), 1.3); c.beginPath(); c.moveTo(-7 + sx, hy - 4); c.bezierCurveTo(-8 + sx, hy - 17, 9 + sx, hy - 16, 7.4 + sx, hy - 4); c.quadraticCurveTo(0, hy - 6, -7 + sx, hy - 4); c.closePath(); fs(c, hc, 1.3); }
  else if (st === "spiky" || st === "messy") { cap(); fs(c, hc, 1.4); const n = st === "spiky" ? 6 : 4; for (let i = 0; i < n; i++) { const a = -Math.PI * (.12 + .76 * i / (n - 1)), bx = Math.cos(a + Math.PI) * 7.6 + sx, by = hy - 3 + Math.sin(a) * 5.4, ln = st === "spiky" ? 6.4 : 4.4 + (i % 2) * 1.6; c.beginPath(); c.moveTo(bx - 2.1, by + 1.4); c.lineTo(bx + (i - n / 2) * .8, by - ln); c.lineTo(bx + 2.1, by + 1.4); c.closePath(); fs(c, hc, 1.2); } cap(); fs(c, hc, 1.2); }
  else if (st === "sidebang" || st === "pixie") { cap(); fs(c, hc, 1.4); c.beginPath(); c.moveTo(-9 + sx, hy - 6); c.quadraticCurveTo(2 + sx, hy - 12, 9.4 + sx, hy - 1.4); c.quadraticCurveTo(st === "pixie" ? 4 + sx : -1 + sx, hy - 3.6, -9 + sx, hy - 6); c.closePath(); fs(c, hc, 1.2); if (st === "pixie" && !side) [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(s * 9.2, hy - 1); c.lineTo(s * 10.4, hy + 5); c.lineTo(s * 7.6, hy + 1); c.closePath(); fs(c, hc, 1); }); }
  else if (st === "curtains") { cap(); fs(c, hc, 1.4); if (!side) { c.strokeStyle = shade(hc, .35); c.lineWidth = 1; c.beginPath(); c.moveTo(0, hy - 9.4); c.quadraticCurveTo(-1.2, hy - 6, -.2, hy - 3.6); c.stroke(); } }
  else if (st === "afro") { c.beginPath(); c.moveTo(-9 + sx, hy - 1); c.bezierCurveTo(-10 + sx, hy - 13, 10 + sx, hy - 13, 9 + sx, hy - 1); c.quadraticCurveTo(0 + sx, hy - 5.4, -9 + sx, hy - 1); c.closePath(); fs(c, hc, 1.3); }
  else { cap(); fs(c, hc, 1.4); }
  if (!up && o.hair2) { c.strokeStyle = o.hair2; c.lineWidth = 1.3; c.lineCap = "round"; c.beginPath(); c.moveTo(-5 + sx, hy - 6.2); c.quadraticCurveTo(-3 + sx, hy - 8.6, 0 + sx, hy - 9); c.moveTo(1 + sx, hy - 9); c.quadraticCurveTo(4 + sx, hy - 8, 6 + sx, hy - 5.4); c.stroke(); }
  if (!up) { c.fillStyle = "rgba(255,255,255,.22)"; c.beginPath(); c.ellipse(-3 + sx, hy - 6.4, 3.4, 1.5, -.3, 0, 7); c.fill(); }
  if ((st === "long" || st === "wavy") && !up && !side) [-1, 1].forEach((s) => { c.beginPath(); c.ellipse(s * 9, hy + 6, 2.3, 7, 0, 0, 7); fs(c, hc, 1.1); });
  if (side && !up) { c.beginPath(); c.ellipse(-fl * 1.2 + fl * .6, hy + 2.2, 1.5, 2.2, 0, 0, 7); fs(c, o.skin, 1); c.fillStyle = "rgba(160,90,80,.25)"; c.beginPath(); c.ellipse(-fl * 1.2 + fl * .6, hy + 2.4, .6, 1.1, 0, 0, 7); c.fill(); if (o.glasses) { c.strokeStyle = o.glassColor || "#5b4048"; c.lineWidth = .9; c.beginPath(); c.moveTo(fl * 1.1, hy - .6); c.lineTo(-fl * .6, hy + .9); c.stroke(); } }
  // ---- accessories on the head
  const hatC = o.hatColor || "#e07a66", ht = o.hat;
  if (o.earrings && !up) (side ? [-fl * 0.6] : [-9, 9]).forEach((x) => { c.beginPath(); c.arc(x, hy + 4.6, 1.2, 0, 7); fs(c, o.earrings, .8); });
  if (ht === "cap") { c.beginPath(); c.moveTo(-9.4 + sx, hy - 2.8); c.bezierCurveTo(-9.8 + sx, hy - 15, 9.8 + sx, hy - 15, 9.4 + sx, hy - 2.8); c.closePath(); fs(c, hatC, 1.3); if (!up) { c.beginPath(); if (side) c.ellipse(fl * 9.2 + sx, hy - 3, 5.2, 1.7, 0, 0, 7); else c.ellipse(0, hy - 2.6, 7.4, 2, 0, 0, 7); fs(c, shade(hatC, .18), 1.1); } c.beginPath(); c.arc(0, hy - 12.2, 1, 0, 7); fs(c, shade(hatC, .2), .8); }
  else if (ht === "beanie") { c.beginPath(); c.moveTo(-9.8 + sx, hy - 2.4); c.bezierCurveTo(-10.4 + sx, hy - 17, 10.4 + sx, hy - 17, 9.8 + sx, hy - 2.4); c.closePath(); fs(c, hatC, 1.3); rr(c, -10 + sx, hy - 4.6, 20, 3.8, 1.6); fs(c, shade(hatC, -.25), 1.1); c.beginPath(); c.arc(sx, hy - 14, 2.3, 0, 7); fs(c, shade(hatC, -.35), 1); }
  else if (ht === "bucket") { c.beginPath(); c.moveTo(-8 + sx, hy - 4); c.lineTo(-7 + sx, hy - 11.4); c.lineTo(7 + sx, hy - 11.4); c.lineTo(8 + sx, hy - 4); c.closePath(); fs(c, hatC, 1.3); c.beginPath(); c.ellipse(sx, hy - 4.4, 12.2, 2.8, 0, 0, 7); fs(c, shade(hatC, .1), 1.2); }
  else if (ht === "beret") { c.beginPath(); c.ellipse(2 + sx, hy - 8.6, 9, 3.6, -.12, 0, 7); fs(c, hatC, 1.3); c.beginPath(); c.arc(3 + sx, hy - 12.2, 1, 0, 7); fs(c, shade(hatC, .25), .8); }
  else if (ht === "crown") { c.beginPath(); c.moveTo(-6 + sx, hy - 8); c.lineTo(-6.6 + sx, hy - 14); c.lineTo(-3 + sx, hy - 11); c.lineTo(0 + sx, hy - 15.4); c.lineTo(3 + sx, hy - 11); c.lineTo(6.6 + sx, hy - 14); c.lineTo(6 + sx, hy - 8); c.closePath(); fs(c, o.hatColor || "#EAB94E", 1.2); [-3, 0, 3].forEach((x) => { c.beginPath(); c.arc(x + sx, hy - 9.4, .7, 0, 7); c.fillStyle = "#e07a66"; c.fill(); }); }
  else if (ht === "catears") [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(s * 2.6 + sx, hy - 8.4); c.lineTo(s * 6.2 + sx, hy - 15.6); c.lineTo(s * 9 + sx, hy - 6.2); c.closePath(); fs(c, hc, 1.2); c.beginPath(); c.moveTo(s * 4.2 + sx, hy - 8.8); c.lineTo(s * 6.2 + sx, hy - 12.8); c.lineTo(s * 7.6 + sx, hy - 7.6); c.closePath(); c.fillStyle = "#f0a6b5"; c.fill(); });
  else if (ht === "headphones") { c.strokeStyle = OUT; c.lineWidth = 3.6; c.beginPath(); c.arc(sx, hy - .5, 10.4, Math.PI * 1.06, Math.PI * 1.94); c.stroke(); c.strokeStyle = hatC; c.lineWidth = 2; c.stroke(); if (!up) (side ? [fl * 9.2] : [-9.8, 9.8]).forEach((x) => { rr(c, x - 1.7, hy - 3, 3.4, 6.2, 1.4); fs(c, hatC, 1.1); }); }
  else if (ht === "headband" && !up) { c.strokeStyle = OUT; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-9 + sx, hy - 1.2); c.quadraticCurveTo(sx, hy - 12, 9 + sx, hy - 1.2); c.stroke(); c.strokeStyle = hatC; c.lineWidth = 2; c.stroke(); }
  else if (ht === "headband") { c.strokeStyle = hatC; c.lineWidth = 2; c.beginPath(); c.moveTo(-9, hy - 1.2); c.quadraticCurveTo(0, hy - 12, 9, hy - 1.2); c.stroke(); }
  else if (ht === "bow") { const bx = side ? -fl * 1.5 : 6.6, by = hy - 9.6; [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + s * 5.4, by - 2.8); c.lineTo(bx + s * 5.4, by + 2.8); c.closePath(); fs(c, hatC, 1.1); }); c.beginPath(); c.arc(bx, by, 1.5, 0, 7); fs(c, shade(hatC, .2), 1); }
  else if (ht === "flower") { const bx = side ? -fl * 2 : -6, by = hy - 8.4; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; c.beginPath(); c.arc(bx + Math.cos(a) * 2.3, by + Math.sin(a) * 2.3, 1.8, 0, 7); fs(c, hatC, .9); } c.beginPath(); c.arc(bx, by, 1.3, 0, 7); fs(c, "#EAB94E", .8); }
  c.restore();
  if (o.tag) { const my2 = hy - 19 + Math.sin(t * 4) * 1.5; c.beginPath(); c.moveTo(-5, my2 - 5); c.lineTo(5, my2 - 5); c.lineTo(0, my2 + 1); c.closePath(); fs(c, "#f28f7e", 1.3); }
  c.restore();
}

/* ======================================================================================================================
 * Adult rig. Teachers, staff, parents and historical adults are NOT stretched students: they use their own proportions
 * (about five heads tall, shoulders wider than the head, neck, long legs, a defined jaw, small realistic features), clothing
 * with adult details (collars, lapels, belts, a staff lanyard) and sensible shoes. Same canvas contract as drawChar
 * (feet at y = 0, up is negative, about 47 units tall) so the sprite bakers do not change.
 * ==================================================================================================================== */
const ADULT_CY = -43.4;
function stroke1(c, col, w) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(); }
function limb(c, x1, y1, x2, y2, w, col, outline = 1.7) { c.lineCap = "round"; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = OUT; c.lineWidth = w + outline; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); }
function headPath(c, cx, cy, view) {
  c.beginPath();
  if (view === "side") {                                  // facing +x: brow, nose, lips and chin read in profile
    c.moveTo(cx - 3.9, cy + 0.6); c.bezierCurveTo(cx - 4.3, cy - 3.8, cx - 1.8, cy - 4.9, cx + .4, cy - 4.9); c.bezierCurveTo(cx + 2.6, cy - 4.9, cx + 3.8, cy - 3.4, cx + 3.9, cy - 1);
    c.lineTo(cx + 4.0, cy + .4); c.lineTo(cx + 5.0, cy + 2.0); c.lineTo(cx + 3.8, cy + 2.5); c.lineTo(cx + 3.9, cy + 3.3); c.quadraticCurveTo(cx + 3.5, cy + 4.1, cx + 2.8, cy + 4.5);
    c.quadraticCurveTo(cx + 1.2, cy + 5.2, cx - .8, cy + 4.6); c.bezierCurveTo(cx - 2.6, cy + 4, cx - 3.9, cy + 2.6, cx - 3.9, cy + .6);
  } else {
    c.moveTo(cx - 4.2, cy - .6); c.bezierCurveTo(cx - 4.3, cy - 3.9, cx - 2.4, cy - 4.9, cx, cy - 4.9); c.bezierCurveTo(cx + 2.4, cy - 4.9, cx + 4.3, cy - 3.9, cx + 4.2, cy - .6);
    c.bezierCurveTo(cx + 4.1, cy + 2.2, cx + 3.0, cy + 4.0, cx + 1.5, cy + 4.7); c.quadraticCurveTo(cx, cy + 5.2, cx - 1.5, cy + 4.7); c.bezierCurveTo(cx - 3.0, cy + 4.0, cx - 4.1, cy + 2.2, cx - 4.2, cy - .6);
  }
  c.closePath();
}
const EMO = {
  smile: { brow: [-.25, .1], mouth: "smile2", eyes: "open", blush: .12 },
  joy: { brow: [-.9, -.5], mouth: "grin", eyes: "happy", blush: .3 },
  frown: { brow: [-.6, .5], mouth: "frown", eyes: "open", droop: .5 },
  upset: { brow: [-1.1, .7], mouth: "wobble", eyes: "wet", tear: true, droop: 1.1 },
  frustrated: { brow: [1, -.7], mouth: "grit", eyes: "narrow", flush: true, sweat: true, vein: true },
  surprised: { brow: [-1.2, -1.2], mouth: "o", eyes: "wide" },
  thinking: { brow: [-.5, .2], mouth: "smirk", eyes: "up", oneBrow: true },
  stern: { brow: [.45, -.15], mouth: "flat", eyes: "open" },
};
function adultFace(c, o, cx, cy, side, t) {              // side: drawn facing +x (the caller mirrors for "left")
  const sk = o.skin, deep = shade(sk, .3), mv = o.mouth || 0;
  const E = EMO[o.emote] || null, blink = (t * .9 + o.id * 1.7) % 4 < .13 && !(E && (E.eyes === 'happy' || E.eyes === 'wide')), lipC = o.lip || shade(sk, .38);
  const eyes = side ? [2.2] : [-1.9, 1.9];
  eyes.forEach((x0, k) => {
    const x = cx + x0, y = cy + .3, es = E ? (E.eyes === "happy" ? "happy" : o.eyeShape || "round") : o.eyeShape || "round", ek = E ? E.eyes : "open";
    if (blink || es === "happy") { c.beginPath(); if (es === "happy" && !blink) c.arc(x, y + .3, 1, Math.PI * 1.1, Math.PI * 1.9); else { c.moveTo(x - 1, y); c.lineTo(x + 1, y); } stroke1(c, "#3a2a30", .55); }
    else {
      const ry0 = ek === "wide" ? .95 : ek === "narrow" ? .38 : ek === "wet" ? .78 : .66; c.fillStyle = "#fffaf2"; c.beginPath(); c.ellipse(x, y, side ? .8 : 1.0, ry0, 0, 0, 7); c.fill(); stroke1(c, shade(sk, .45), .3);
      c.fillStyle = o.eyeColor || "#3a2a30"; c.beginPath(); c.arc(x + (side ? .25 : 0) + (ek === "up" ? .25 : 0), y + .02 + (ek === "up" ? -.2 : 0) + (ek === "narrow" ? .12 : 0), ek === "wide" ? .42 : .5, 0, 7); c.fill(); if (ek === "wet") { c.fillStyle = "rgba(190,225,255,.9)"; c.beginPath(); c.ellipse(x + .1, y + .28, .55, .22, 0, 0, 7); c.fill(); }
      c.fillStyle = "#fff"; c.beginPath(); c.arc(x + (side ? .05 : -.15), y - .22, .17, 0, 7); c.fill();
      if (es === "sleepy") { c.fillStyle = sk; c.beginPath(); c.ellipse(x, y - .35, 1.05, .42, 0, Math.PI, 2 * Math.PI); c.fill(); }
      c.beginPath(); c.moveTo(x - (side ? .8 : 1.05), y - .35); c.quadraticCurveTo(x, y - .95, x + (side ? .9 : 1.05), y - .35); stroke1(c, "#2a1d22", .45);   // upper lid
      if (es === "lash") { const sg = side ? 1 : (k ? 1 : -1); c.beginPath(); c.moveTo(x + sg * .9, y - .4); c.lineTo(x + sg * 1.7, y - 1.0); stroke1(c, "#2a1d22", .4); }
    }
    const brow = o.brow || "soft";
    if (brow !== "none") {
      const bw2 = brow === "thick" ? .85 : brow === "thin" ? .32 : .55, sg = side ? 1 : (x0 < 0 ? -1 : 1), bi = E ? E.brow[0] : 0, bo = E ? E.brow[1] : .25, lift = E && E.oneBrow && k === 1 ? -.9 : 0, by = y - 1.9 + lift;
      const ix = side ? x - 1.2 : x - sg * 1.2, ox = side ? x + 1.2 : x + sg * 1.3;
      c.beginPath(); c.moveTo(ix, by + bi * .75 + (E ? 0 : .2)); c.quadraticCurveTo((ix + ox) / 2, by - .55 + (bi + bo) * .3 + (brow === "arch" ? -.3 : 0), ox, by + bo * .75); stroke1(c, o.browColor || o.hair, bw2);
    }
    if (o.glasses && o.glasses !== "none") {
      const gs = o.glasses === true ? "round" : o.glasses, gc = o.glassColor || "#3b2f33"; c.beginPath();
      if (gs === "square") c.roundRect(x - 1.6, y - 1.25, 3.2, 2.6, .6); else if (gs === "cat") { c.ellipse(x, y + .05, 1.6, 1.3, 0, 0, 7); const sg = side ? 1 : (x0 < 0 ? -1 : 1); c.moveTo(x + sg * 1.4, y - .7); c.lineTo(x + sg * 2.1, y - 1.6); }
      else if (gs === "half") c.arc(x, y, 1.6, Math.PI, 0); else c.arc(x, y + .05, 1.5, 0, 7);
      if (gs === "sun") { c.fillStyle = "rgba(40,30,40,.82)"; c.fill(); } stroke1(c, gc, .5);
    }
  });
  if (o.glasses && o.glasses !== "none") { const gc = o.glassColor || "#3b2f33"; c.beginPath(); if (side) { c.moveTo(cx + .6, cy + .1); c.lineTo(cx - 3.6, cy + .7); } else { c.moveTo(cx - .5, cy + .15); c.lineTo(cx + .5, cy + .15); } stroke1(c, gc, .45); }
  if (!side) { c.beginPath(); c.moveTo(cx + .2, cy + .9); c.lineTo(cx + .5, cy + 2.2); c.arc(cx, cy + 2.35, .65, .05 * Math.PI, .85 * Math.PI); stroke1(c, deep, .38); }
  if (o.freckles) { c.fillStyle = deep; (side ? [[3, 1.6], [2.3, 2.3]] : [[-2.6, 1.7], [-1.9, 2.4], [2.6, 1.7], [1.9, 2.4]]).forEach(([dx, dy]) => { c.beginPath(); c.arc(cx + dx, cy + dy, .22, 0, 7); c.fill(); }); }
  if (o.blush === true) { c.fillStyle = "rgba(255,110,125,.16)"; (side ? [2.6] : [-2.8, 2.8]).forEach((dx) => { c.beginPath(); c.ellipse(cx + dx, cy + 2.1, 1.0, .6, 0, 0, 7); c.fill(); }); }
  const mx = cx + (side ? 2.6 : 0), my = cy + 3.4, ms = o.mouthStyle || "smile", w = side ? 1.1 : 1.5;
  const em = E ? E.mouth : null;
  if (mv && !(em === "grit")) { c.fillStyle = "#7A3B3B"; c.beginPath(); c.ellipse(mx, my + .1, w * .62, .3 + mv * .9, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(mx, my + .1, w * .62, .3 + mv * .9, 0, 0, 7); stroke1(c, lipC, .35); }
  else if (em === "frown") { c.beginPath(); c.moveTo(mx - w, my + .65); c.quadraticCurveTo(mx, my - .75, mx + w, my + .65); stroke1(c, lipC, .55); }
  else if (em === "wobble") { c.beginPath(); c.moveTo(mx - w, my + .7); c.quadraticCurveTo(mx - w * .5, my - .3, mx - .1, my + .45); c.quadraticCurveTo(mx + w * .5, my - .5, mx + w, my + .7); stroke1(c, lipC, .5); }
  else if (em === "grit") { rr(c, mx - w * .95, my - .35, w * 1.9, 1.15, .4); c.fillStyle = "#fffaf2"; c.fill(); stroke1(c, lipC, .45); c.beginPath(); for (let q = -2; q <= 2; q++) { c.moveTo(mx + q * w * .38, my - .3); c.lineTo(mx + q * w * .38, my + .75); } stroke1(c, shade(lipC, .2), .22); }
  else if (em === "o") { c.fillStyle = "#7A3B3B"; c.beginPath(); c.ellipse(mx, my + .35, .75, 1.0, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(mx, my + .35, .75, 1.0, 0, 0, 7); stroke1(c, lipC, .4); }
  else if (em === "smile2") { c.beginPath(); c.moveTo(mx - w * 1.15, my - .25); c.quadraticCurveTo(mx, my + 1.4, mx + w * 1.15, my - .25); stroke1(c, lipC, .55); c.beginPath(); c.moveTo(mx - w * 1.15, my - .25); c.lineTo(mx - w * 1.3, my - .55); c.moveTo(mx + w * 1.15, my - .25); c.lineTo(mx + w * 1.3, my - .55); stroke1(c, shade(sk, .2), .3); }
  else if (ms === "grin" || em === "grin") { c.beginPath(); c.moveTo(mx - w * (em ? 1.2 : 1), my - .2); c.quadraticCurveTo(mx, my + 2.1, mx + w * (em ? 1.2 : 1), my - .2); c.closePath(); c.fillStyle = "#fffaf2"; c.fill(); stroke1(c, lipC, .45); }
  else if (ms === "flat" || em === "flat") { c.beginPath(); c.moveTo(mx - w * .8, my); c.lineTo(mx + w * .8, my); stroke1(c, lipC, .5); }
  else if (ms === "smirk" || em === "smirk") { c.beginPath(); c.moveTo(mx - w * .8, my + .1); c.quadraticCurveTo(mx + .2, my + .8, mx + w, my - .5); stroke1(c, lipC, .5); }
  else { c.beginPath(); c.moveTo(mx - w, my - .1); c.quadraticCurveTo(mx, my + 1, mx + w, my - .1); stroke1(c, lipC, .52); c.fillStyle = shade(lipC, -.25); c.globalAlpha = .55; c.beginPath(); c.ellipse(mx, my + .6, w * .5, .26, 0, 0, 7); c.fill(); c.globalAlpha = 1; }
  if (E && E.flush) { c.fillStyle = "rgba(235,70,60,.34)"; (side ? [2.6] : [-2.8, 2.8]).forEach((dx) => { c.beginPath(); c.ellipse(cx + dx, cy + 2.1, 1.2, .8, 0, 0, 7); c.fill(); }); c.fillStyle = "rgba(235,70,60,.18)"; c.beginPath(); c.ellipse(cx, cy - 3.2, 3.2, 1.2, 0, 0, 7); c.fill(); }
  if (E && E.tear) { const tx = cx + (side ? 2.4 : -2.4), ty = cy + 1.6 + ((t * 1.3) % 1) * 1.6; c.fillStyle = "rgba(150,205,255,.95)"; c.beginPath(); c.ellipse(tx, ty, .38, .62, 0, 0, 7); c.fill(); stroke1(c, "rgba(90,150,210,.8)", .2); }
  if (E && E.sweat) { const sx = cx + (side ? 3.4 : 3.7), sy = cy - 3.4 + Math.sin(t * 5) * .15; c.fillStyle = "rgba(160,210,255,.95)"; c.beginPath(); c.moveTo(sx, sy - 1); c.quadraticCurveTo(sx + .8, sy + .2, sx, sy + .8); c.quadraticCurveTo(sx - .8, sy + .2, sx, sy - 1); c.fill(); stroke1(c, "rgba(90,150,210,.8)", .2); }
  if (E && E.vein) { const vx = cx + (side ? -1.6 : -3.4), vy = cy - 3.7, pul = 1 + Math.sin(t * 9) * .12; c.strokeStyle = "#d9302a"; c.lineWidth = .38; c.lineCap = "round"; for (const [a, b2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.arc(vx + a * .55 * pul, vy + b2 * .55 * pul, .5 * pul, a < 0 ? (b2 < 0 ? 0 : -Math.PI / 2) : (b2 < 0 ? Math.PI / 2 : Math.PI), a < 0 ? (b2 < 0 ? Math.PI / 2 : 0) : (b2 < 0 ? Math.PI : Math.PI * 1.5)); c.stroke(); } }
  c.beginPath(); c.moveTo(cx + (side ? 3.1 : 2.9), cy + 1.9); c.quadraticCurveTo(cx + (side ? 3.3 : 3.1), cy + 2.8, cx + (side ? 3.1 : 2.8), cy + 3.6); stroke1(c, shade(sk, .13), .3);   // soft cheek line
}
/** hair for the adult head. layer "back" is drawn before the face, "front" after. view: "front" | "back" | "side" (facing +x). */
function adultHair(c, o, cx, cy, view, layer) {
  if (o.style === "bald") return;
  const st = o.style || "crop", hc = o.hair, hl = shade(hc, -.22), side = view === "side", back = view === "back", fillH = (col = hc) => fs(c, col, 1);
  const long = st === "long" || st === "wavy" || st === "braids", bob = st === "bob";
  if (layer === "back") {
    if (st === "afro") { c.beginPath(); c.ellipse(cx - (side ? 1.2 : 0), cy - 1.4, 6.9, 6.5, 0, 0, 7); fillH(); }
    if (st === "curly") [[-5, -1], [5, -1], [-4, -4.8], [4, -4.8], [0, -5.8], [-5.4, 2], [5.4, 2]].forEach(([dx, dy]) => { c.beginPath(); c.arc(cx + (side ? dx * .8 - 1 : dx), cy + dy, 2.2, 0, 7); fillH(); });
    if (long || bob) { const L = long ? 12 : 5.6; if (side) { c.beginPath(); c.moveTo(cx - 3, cy - 4); c.lineTo(cx - 4.6, cy + L); c.lineTo(cx + .8, cy + L - .4); c.lineTo(cx + 1.4, cy); c.closePath(); fillH(); } else { c.beginPath(); c.moveTo(cx - 5, cy - 3); c.lineTo(cx - 5.4, cy + L); c.quadraticCurveTo(cx, cy + L + 1, cx + 5.4, cy + L); c.lineTo(cx + 5, cy - 3); c.closePath(); fillH(); } }
    if (st === "pony" || st === "topknot") { if (side) { c.beginPath(); c.ellipse(cx - 5.2, cy + 3.4, 1.9, 4.6, .3, 0, 7); fillH(); } else if (back) { c.beginPath(); c.ellipse(cx, cy + 4.6, 1.9, 5, 0, 0, 7); fillH(); } }
    return;
  }
  if (back) { c.beginPath(); c.ellipse(cx, cy - .2, 4.7, 5.2, 0, 0, 7); fillH(); if (st === "bun") { c.beginPath(); c.arc(cx, cy - 5.6, 2.5, 0, 7); fillH(); } c.fillStyle = "rgba(255,255,255,.16)"; c.beginPath(); c.ellipse(cx - 1.4, cy - 3, 1.8, 1, -.3, 0, 7); c.fill(); return; }
  const buzz = st === "buzz", top = buzz ? 4.2 : 5.5;
  c.beginPath();
  if (side) { c.moveTo(cx - 4.2, cy + 2.2); c.bezierCurveTo(cx - 5.2, cy - 5.2, cx + 3.6, cy - 6.2, cx + 4.0, cy - 1.8); c.lineTo(cx + 3.7, cy - 2.0); c.quadraticCurveTo(cx + 1.6, cy - 3.5, cx - .6, cy - 2.4); c.lineTo(cx - 2.2, cy + .2); c.lineTo(cx - 2.6, cy + 2.4); }
  else { c.moveTo(cx - 4.5, cy + 1.2); c.bezierCurveTo(cx - 5.3, cy - top - .3, cx + 5.3, cy - top - .3, cx + 4.5, cy + 1.2); c.lineTo(cx + 4.0, cy - .9); c.quadraticCurveTo(cx + 1.6, cy - (buzz ? 3.7 : 3.4), cx - .8, cy - (buzz ? 3.4 : 3.0)); c.quadraticCurveTo(cx - 3.3, cy - 2.6, cx - 4.0, cy - .9); }
  c.closePath(); fillH();
  if (buzz) { c.globalAlpha = .35; c.fillStyle = shade(hc, -.5); c.fill(); c.globalAlpha = 1; }
  if (st === "bun") { c.beginPath(); c.arc(cx - (side ? 2.8 : 0), cy - 6.1, 2.5, 0, 7); fillH(); c.beginPath(); c.arc(cx - (side ? 2.8 : 0), cy - 6.1, 1.2, 0, 7); stroke1(c, hl, .35); }
  if (st === "afro" || st === "curly") [[-3.8, -3.6], [-1.4, -4.8], [1.4, -4.8], [3.8, -3.6]].forEach(([dx, dy]) => { c.beginPath(); c.arc(cx + (side ? dx * .7 - 1 : dx), cy + dy, 1.9, 0, 7); fillH(); });
  if (!buzz && st !== "afro") { c.beginPath(); c.moveTo(cx + (side ? 1.2 : -2.1), cy - 4.6); c.quadraticCurveTo(cx + (side ? 2.4 : 0), cy - 5.4, cx + (side ? 3.2 : 1.4), cy - 3.5); stroke1(c, shade(hc, .34), .5); }       // parting / sheen
  c.fillStyle = "rgba(255,255,255,.16)"; c.beginPath(); c.ellipse(cx - 1.4 + (side ? 1 : 0), cy - 4.1, 1.8, .8, -.25, 0, 7); c.fill();
  if (long && !side) [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(cx + s * 4.2, cy - 1); c.quadraticCurveTo(cx + s * 5.6, cy + 4, cx + s * 5.2, cy + 9); c.lineTo(cx + s * 3.6, cy + 7); c.quadraticCurveTo(cx + s * 4.4, cy + 3, cx + s * 3.6, cy); c.closePath(); fillH(); });
  if (o.hair2) { c.beginPath(); c.moveTo(cx - 3.4, cy - 3.8); c.quadraticCurveTo(cx - 1, cy - 5.6, cx + 1.8, cy - 4.4); stroke1(c, o.hair2, .9); }
}

function adultBeard(c, o, cx, cy, side) {                // full beard: sideburns, jaw and chin; the mouth stays open
  const col = o.beardColor || o.hair; c.beginPath();
  if (side) { c.moveTo(cx - 1.4, cy + .4); c.bezierCurveTo(cx - 1.6, cy + 3.4, cx - .2, cy + 6.2, cx + 2.4, cy + 6.1); c.bezierCurveTo(cx + 4.3, cy + 5.8, cx + 4.7, cy + 3.8, cx + 4.1, cy + 2.4); c.lineTo(cx + 3.4, cy + 2.7); c.quadraticCurveTo(cx + 1.8, cy + 3.5, cx + .4, cy + 1.9); c.closePath(); }
  else { c.moveTo(cx - 4.2, cy - .5); c.bezierCurveTo(cx - 4.7, cy + 3.4, cx - 3.2, cy + 6.4, cx, cy + 6.8); c.bezierCurveTo(cx + 3.2, cy + 6.4, cx + 4.7, cy + 3.4, cx + 4.2, cy - .5); c.lineTo(cx + 3.4, cy + .9); c.quadraticCurveTo(cx + 3, cy + 2.6, cx + 1.8, cy + 2.9); c.quadraticCurveTo(cx, cy + 2.4, cx - 1.8, cy + 2.9); c.quadraticCurveTo(cx - 3, cy + 2.6, cx - 3.4, cy + .9); c.closePath(); }
  fs(c, col, .9); c.fillStyle = "rgba(255,255,255,.1)"; c.beginPath(); c.ellipse(cx - 1.4, cy + 5, 1.8, .7, -.2, 0, 7); c.fill();
  c.fillStyle = shade(o.skin, .08); c.beginPath(); c.ellipse(cx + (side ? 2.7 : 0), cy + 3.5, side ? 1.1 : 1.9, .95, 0, 0, 7); c.fill();
}
function adultStache(c, o, cx, cy, side) {
  const col = o.beardColor || o.hair, mx = cx + (side ? 2.7 : 0); c.beginPath();
  if (side) { c.moveTo(mx - .6, cy + 2.6); c.quadraticCurveTo(mx + 1.2, cy + 2.4, mx + 1.6, cy + 3.1); c.quadraticCurveTo(mx + .2, cy + 3.1, mx - .6, cy + 2.9); }
  else { c.moveTo(cx, cy + 2.7); c.quadraticCurveTo(cx - 1.4, cy + 2.2, cx - 2.6, cy + 3.2); c.quadraticCurveTo(cx - 1.4, cy + 3.2, cx, cy + 2.95); c.quadraticCurveTo(cx + 1.4, cy + 3.2, cx + 2.6, cy + 3.2); c.quadraticCurveTo(cx + 1.4, cy + 2.2, cx, cy + 2.7); }
  c.closePath(); fs(c, col, .5);
}
function drawAdult(c, fx, fy, o, t) {
  c.save(); c.translate(Math.round(fx * 2) / 2, Math.round(fy * 2) / 2); c.scale(.93, .93);
  const mv = o.moving, sw = mv ? Math.sin(o.walk) : 0, dir = o.dir, side = dir === "left" || dir === "right", fl = dir === "left" ? -1 : 1, up = dir === "up";
  const top = o.top === "buttonup" ? "shirt" : o.top || "shirt", bottom = o.bottom || "pants", bw = o.bodyW ?? (o.build === "slim" ? .92 : o.build === "sturdy" ? 1.1 : 1), sk = o.skin, acc = o.acc, accC = o.accent || "#c4463c";
  const shirt = o.shirt || "#8fc9e8", under = o.shirt2 || "#fff6ea", pants = o.pants || "#4a3b3f", shoe = o.shoes || "#3b2f33", dress = top === "dress", skirt = bottom === "skirt" || dress;
  const cy = ADULT_CY, bob = mv ? -Math.abs(Math.cos(o.walk)) * 1.1 : Math.sin(t * 2 + o.id) * .3;
  c.fillStyle = "rgba(70,45,55,.24)"; c.beginPath(); c.ellipse(0, 1, 9.4 * bw, 3, 0, 0, 7); c.fill();
  if (o.sitting) c.translate(0, 6);
  c.translate(0, bob);
  const HIP = -22.5, SHY = -36.4, WAIST = -25.2;
  // ---- legs and shoes
  [-1, 1].forEach((s) => {
    const lift = mv ? Math.max(0, s * sw) * 2.2 : 0, hx = side ? 0 : s * 2.5 * bw, ax = side ? s * sw * 5 : s * 2.6 * bw + (mv ? s * 0 : 0), ay = -2.4 - lift;
    limb(c, hx, HIP + 1, ax, ay, skirt && !o.tights ? 3.2 : 4.4 * (bottom === "joggers" ? 1.05 : 1), skirt ? (o.tights || sk) : pants, skirt ? 1.4 : 1.6);
    if (!skirt && bottom !== "shorts") { c.beginPath(); c.moveTo(hx, HIP + 4); c.lineTo(ax * .98, ay - 3); stroke1(c, shade(pants, .22), .3); }   // trouser crease
    if (bottom === "shorts") limb(c, ax, ay - 5, ax, ay, 3.2, sk, 1.4);
    const fx2 = ax + (side ? fl * 1.5 : 0), fy2 = ay + 1.4 - lift * 0;
    if (o.shoeStyle === "boot") { rr(c, fx2 - 2.5, fy2 - 4.4, 5, 5, 1.4); fs(c, shoe, 1); c.beginPath(); c.ellipse(fx2 + (side ? fl * 1.3 : 0), fy2 + .6, 3.5, 1.6, 0, 0, 7); fs(c, shade(shoe, .25), 1); }
    else { c.beginPath(); c.ellipse(fx2, fy2, side ? 3.7 : 3.0, 1.8, 0, 0, 7); fs(c, shoe, 1); c.fillStyle = "rgba(255,255,255,.22)"; c.beginPath(); c.ellipse(fx2 - .6, fy2 - .7, 1.5, .5, 0, 0, 7); c.fill(); }
  });
  // ---- neck
  c.beginPath(); c.moveTo(-1.9, -39.8); c.lineTo(-1.9, SHY + .6); c.lineTo(1.9, SHY + .6); c.lineTo(1.9, -39.8); c.closePath(); fs(c, sk, 1);
  c.fillStyle = "rgba(110,60,50,.22)"; c.beginPath(); c.ellipse(0, -38.4, 2.0, 1.0, 0, 0, 7); c.fill();
  // ---- arms (far one first in side view)
  const sleeve = top === "tank" || top === "dress" ? sk : shirt, shortSleeve = top === "tee" || top === "tank" || (dress && !o.sleeves), cuff = top === "blazer" ? under : null;
  const reach = (s) => {
    const A = o.arms && (s > 0 ? o.arms.R : o.arms.L);
    let hx, hy;
    if (A) { hx = side ? fl * Math.abs(A[0]) * 1.0 : A[0] * 1.15; hy = Math.max(-47, SHY + 1 + (A[1] + 17) * 1.4); }
    else if (side) { hx = s * sw * 4.2 * -1 + fl * .6; hy = -25.2 + (mv ? -Math.abs(sw) * .8 : 0); }
    else { hx = s * (8.6 * bw + 0.3) + (mv ? -s * sw * .6 : 0); hy = -25.6 + (mv ? -s * sw * 1.4 : 0); }
    return [hx, hy];
  };
  const armDraw = (s) => {
    const [hx, hy] = reach(s), sx = side ? 0 : s * 6.9 * bw, sy = SHY + 1.6, mx = sx + (hx - sx) * .52, my = sy + (hy - sy) * .52 + (A_BEND(hx, sx) );
    if (shortSleeve) { limb(c, sx, sy, mx, my, 3.9, sleeve, 1.5); limb(c, mx, my, hx, hy, 3.0, sk, 1.4); }
    else { limb(c, sx, sy, hx, hy, 3.7, sleeve, 1.5); if (cuff) limb(c, hx - (hx - sx) * .1, hy - (hy - sy) * .1, hx, hy, 3.8, cuff, 1.3); }
    c.beginPath(); c.arc(hx, hy + .9, 1.7, 0, 7); fs(c, sk, 1);
  };
  const A_BEND = (hx, sx) => 0;
  if (side) armDraw(-fl);
  // ---- torso
  const SWd = (side ? 4.5 : 7.0) * bw, CWd = (side ? 4.3 : 6.2) * bw, WWd = (side ? 3.9 : dress || skirt ? 4.8 : 5.4) * bw, HWd = (side ? 4.4 : 6.0) * bw, jacketLen = top === "blazer" || top === "cardigan" ? -20.5 : top === "labcoat" ? -13.2 : top === "track" ? -21.6 : top === "sweater" || top === "turtleneck" ? -22.2 : -22.6;
  const torso = (hemY) => { c.beginPath(); c.moveTo(-SWd + 1.6, SHY - .7); c.quadraticCurveTo(-SWd, SHY - .7, -SWd, SHY + 1); c.lineTo(-CWd, -31); c.lineTo(-WWd, WAIST); c.lineTo(-HWd - (top === "blazer" ? .6 : top === "labcoat" ? 1.6 : 0), hemY); c.lineTo(HWd + (top === "blazer" ? .6 : top === "labcoat" ? 1.6 : 0), hemY); c.lineTo(WWd, WAIST); c.lineTo(CWd, -31); c.lineTo(SWd, SHY + 1); c.quadraticCurveTo(SWd, SHY - .7, SWd - 1.6, SHY - .7); c.quadraticCurveTo(0, SHY - 2.1, -SWd + 1.6, SHY - .7); c.closePath(); };
  if (skirt && !o.sitting) {                                                  // skirt / dress hem behind the top
    const hemY = dress ? -9.5 : -12.5, sp = dress ? 8.6 : 7.8; c.beginPath(); c.moveTo(-HWd, HIP - .8); c.lineTo(HWd, HIP - .8); c.lineTo(sp * bw * (side ? .6 : 1), hemY); c.quadraticCurveTo(0, hemY + 1.3, -sp * bw * (side ? .6 : 1), hemY); c.closePath(); fs(c, dress ? shirt : pants, 1);
    c.fillStyle = "rgba(255,255,255,.14)"; c.fillRect(-sp * bw * .7, hemY - 1.3, sp * 1.4 * bw, .8);
  }
  const bodyCol = top === "vest" || top === "cardigan" ? under : shirt;
  torso(dress ? HIP - 1 : jacketLen); fs(c, bodyCol, 1.1);
  if (!dress && !skirt && !up && top !== "blazer" && top !== "sweater" && !side) { c.fillStyle = shade(pants, .1); c.fillRect(-HWd + .3, -24.2, (HWd - .3) * 2, 1.6); c.fillStyle = "#c9b28a"; c.fillRect(-.8, -24.1, 1.6, 1.4); }   // belt + buckle
  if (!side) { c.fillStyle = "rgba(255,255,255,.2)"; c.beginPath(); c.ellipse(-2.6, -33, 2.0, 3.2, 0, 0, 7); c.fill(); }
  if (!up && !side) {
    if (top === "blazer") {
      c.beginPath(); c.moveTo(-2.4, SHY - .6); c.lineTo(0, -28.5); c.lineTo(2.4, SHY - .6); c.closePath(); fs(c, under, .8);
      [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(s * 2.5, SHY - .7); c.lineTo(s * .2, -27.8); c.lineTo(s * 1.4, -24.6); c.lineTo(s * 5.6, -25.6); c.lineTo(s * 6.2, -32); c.lineTo(s * 4.4, SHY); c.closePath(); fs(c, shade(shirt, .12), .8); });
      c.fillStyle = "#c9b28a"; [-24.6, -21.8].forEach((y) => { c.beginPath(); c.arc(0, y + 2, .5, 0, 7); c.fill(); }); rr(c, 2.4, -31.8, 2.8, .7, .3); c.fillStyle = under; c.fill();
    } else if (top === "sweater") {
      c.fillStyle = shade(shirt, -.2); c.fillRect(-HWd, -24.2, HWd * 2, 2.4); for (let x = -HWd + 1; x < HWd; x += 1.6) { c.fillStyle = "rgba(0,0,0,.08)"; c.fillRect(x, -24.2, .35, 2.4); }
      c.beginPath(); c.moveTo(-3.2, SHY - .6); c.lineTo(0, -33.4); c.lineTo(3.2, SHY - .6); c.closePath(); fs(c, under, .7);
      c.beginPath(); c.ellipse(0, SHY - .8, 3.4, 1.1, 0, 0, Math.PI); stroke1(c, shade(shirt, .3), .9);
    } else if (top === "vest") {
      [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(s * 2.3, SHY - .6); c.lineTo(s * .4, -22.4); c.lineTo(s * 5.9, -22.4); c.lineTo(s * 5.1, -30); c.lineTo(s * 6.8, SHY + 1); c.lineTo(s * 4.8, SHY - .6); c.closePath(); fs(c, shirt, .85); });
      c.beginPath(); c.moveTo(-2.6, SHY - .6); c.lineTo(0, -35); c.lineTo(2.6, SHY - .6); c.lineTo(1.1, SHY + .6); c.lineTo(0, SHY + .2); c.lineTo(-1.1, SHY + .6); c.closePath(); fs(c, "#fffaf2", .6);
      c.beginPath(); c.moveTo(0, -35.2); c.lineTo(.9, -32.4); c.lineTo(0, -27.6); c.lineTo(-.9, -32.4); c.closePath(); fs(c, o.tie || "#a24a3c", .6);
    } else if (top === "cardigan") {
      c.beginPath(); c.moveTo(-3.2, SHY - .6); c.lineTo(0, -31.5); c.lineTo(3.2, SHY - .6); c.closePath(); fs(c, under, .6);
      [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(s * 2.2, SHY - .6); c.lineTo(s * 1.0, jacketLen); c.lineTo(s * (HWd + .3), jacketLen); c.lineTo(s * WWd, WAIST); c.lineTo(s * CWd, -31); c.lineTo(s * SWd, SHY + 1); c.quadraticCurveTo(s * SWd, SHY - .7, s * (SWd - 1.6), SHY - .7); c.closePath(); fs(c, shirt, .9); c.fillStyle = shade(shirt, -.18); c.fillRect(s > 0 ? 1.0 : -1.8, jacketLen - 1.8, .8, 1.8); });
      for (const y of [-32, -28, -24.6]) { c.beginPath(); c.arc(1.1, y, .45, 0, 7); fs(c, shade(shirt, .3), .3); }
    } else if (top === "labcoat") {
      c.beginPath(); c.moveTo(-2.6, SHY - .6); c.lineTo(0, -29); c.lineTo(2.6, SHY - .6); c.closePath(); fs(c, under, .6);
      [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(s * 2.6, SHY - .7); c.lineTo(s * .2, -27); c.lineTo(s * 1.6, -24.4); c.lineTo(s * 5.8, -26.6); c.lineTo(s * 6.2, -33); c.lineTo(s * 4.6, SHY); c.closePath(); fs(c, shade(shirt, .02), .8); rr(c, s * 3.4 - 1.9, -21.6, 3.8, 3.6, .6); stroke1(c, shade(shirt, .32), .55); });
      c.beginPath(); c.moveTo(0, -27); c.lineTo(0, jacketLen); stroke1(c, shade(shirt, .28), .45); for (const y of [-25, -21.5, -18]) { c.beginPath(); c.arc(0, y, .5, 0, 7); fs(c, shade(shirt, .28), .3); }
      rr(c, -4.6, -30.6, 1.6, 3, .4); fs(c, accC || "#3b6ea8", .4);
    } else if (top === "turtleneck") { rr(c, -2.7, SHY - 2.5, 5.4, 3.2, 1.3); fs(c, shade(shirt, .12), .8); for (let q = -1; q <= 1; q += 1) { c.beginPath(); c.moveTo(q * 1.3, SHY - 2.3); c.lineTo(q * 1.3, SHY + .4); stroke1(c, shade(shirt, .3), .25); }
    } else if (top === "track") {
      c.beginPath(); c.moveTo(0, SHY - .8); c.lineTo(0, jacketLen); stroke1(c, shade(shirt, .35), .5); rr(c, -2.6, SHY - 2.2, 5.2, 2.2, 1); fs(c, shade(shirt, .1), .7);
      [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(s * (SWd - .4), SHY + 1); c.lineTo(s * (WWd - .2), jacketLen); stroke1(c, accC, .9); }); c.fillStyle = under; c.fillRect(-HWd, jacketLen - 1.6, HWd * 2, 1.6); c.beginPath(); c.moveTo(-HWd, jacketLen - 1.6); c.lineTo(HWd, jacketLen - 1.6); stroke1(c, shade(shirt, .3), .4);
    } else if (top === "tee") { c.beginPath(); c.ellipse(0, SHY - .3, 2.8, 1.3, 0, 0, Math.PI); fs(c, shade(shirt, .16), .6); }
    else if (top === "tank") { c.beginPath(); c.ellipse(0, SHY, 3.4, 1.7, 0, 0, Math.PI); fs(c, sk, .7); }
    else if (top === "dress") { c.beginPath(); c.ellipse(0, SHY - .2, 3.2, 1.4, 0, 0, Math.PI); fs(c, sk, .7); c.fillStyle = shade(shirt, .25); c.fillRect(-WWd, WAIST - .6, WWd * 2, 1.2); }
    else { [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(s * .3, SHY - .6); c.lineTo(s * 3.2, SHY - .4); c.lineTo(s * 1.4, -34); c.closePath(); fs(c, shade(shirt, -.15), .6); }); c.beginPath(); c.moveTo(0, -34.4); c.lineTo(0, -23); stroke1(c, shade(shirt, .25), .4); [-31, -28, -25].forEach((y) => { c.fillStyle = shade(shirt, .35); c.beginPath(); c.arc(0, y, .3, 0, 7); c.fill(); }); }
    if (acc === "tie" && (top === "blazer" || top === "shirt" || top === "cardigan" || top === "labcoat")) { c.beginPath(); c.moveTo(-.9, SHY - .5); c.lineTo(.9, SHY - .5); c.lineTo(.7, SHY + 1.3); c.lineTo(-.7, SHY + 1.3); c.closePath(); fs(c, accC, .5); c.beginPath(); c.moveTo(-.7, SHY + 1.2); c.lineTo(.7, SHY + 1.2); c.lineTo(1.2, -27.8); c.lineTo(0, -26.6); c.lineTo(-1.2, -27.8); c.closePath(); fs(c, accC, .6); }
    if (acc === "bowtie") { [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(0, SHY + .2); c.lineTo(s * 2.8, SHY - .7); c.lineTo(s * 2.8, SHY + 1.1); c.closePath(); fs(c, accC, .5); }); c.beginPath(); c.arc(0, SHY + .2, .6, 0, 7); fs(c, shade(accC, .2), .4); }
    if (acc === "necklace" || acc === "beads") { c.beginPath(); c.moveTo(-3.4, SHY + .1); c.quadraticCurveTo(0, SHY + (acc === "beads" ? 7 : 5), 3.4, SHY + .1); stroke1(c, acc === "beads" ? shade(accC, 0) : accC, acc === "beads" ? 1.1 : .55); if (acc === "beads") { for (let q = 0; q <= 8; q++) { const u = q / 8, px = -3.4 + 6.8 * u, py = SHY + .1 + 2 * 3.5 * u * (1 - u) * 2; c.beginPath(); c.arc(px, py, .55, 0, 7); fs(c, q % 3 === 1 ? "#f2e8d8" : o.beadColor || "#8a5cc0", .25); } } else { c.beginPath(); c.arc(0, SHY + 2.7, .75, 0, 7); fs(c, accC, .4); } }
    if (acc === "brooch") { c.beginPath(); c.arc(-3.6, -33, 1, 0, 7); fs(c, accC, .5); c.beginPath(); c.arc(-3.6, -33, .35, 0, 7); c.fillStyle = "#fff"; c.fill(); }
    if (acc === "scarf") { c.beginPath(); c.ellipse(0, SHY - .2, 4.4, 1.9, 0, 0, 7); fs(c, accC, .8); rr(c, 1.2, SHY, 3, 7.5, 1.2); fs(c, accC, .8); c.fillStyle = "rgba(255,255,255,.3)"; c.fillRect(1.6, SHY + 4, 2.2, .7); }
    if ((o.lanyard !== false || acc === "lanyard") && !dress && (!acc || acc === "lanyard")) { c.beginPath(); c.moveTo(-1.9, SHY); c.lineTo(0, -29.4); c.lineTo(1.9, SHY); stroke1(c, acc === "lanyard" ? accC : o.lanyardColor || "#c4463c", .7); rr(c, -1.4, -29.6, 2.8, 3.4, .5); fs(c, "#fffaf2", .55); c.fillStyle = "#4F91C7"; c.fillRect(-1, -29.2, 2, .7); }
    if (o.scarf) { c.beginPath(); c.ellipse(0, SHY - .2, 4.2, 1.7, 0, 0, 7); fs(c, o.scarf, .9); }
    if (o.badge) { c.beginPath(); c.arc(-3.4, -32.4, 1.1, 0, 7); fs(c, o.badge, .6); }
  } else if (up) { c.beginPath(); c.moveTo(-3, SHY - .5); c.quadraticCurveTo(0, SHY + .7, 3, SHY - .5); stroke1(c, shade(shirt, .3), .5); if (top === "blazer") { c.beginPath(); c.moveTo(0, SHY + .8); c.lineTo(0, jacketLen); stroke1(c, shade(shirt, .3), .45); } }
  if (!up && o.packStyle === "messenger") { c.beginPath(); c.moveTo(side ? -2 : -5.6, SHY); c.lineTo(side ? 2.5 : 5.4, -24.6); stroke1(c, o.pack || "#9a653d", 1.3); rr(c, side ? 1.4 : 3.2, -27.2, 5.2, 4.4, 1); fs(c, o.pack || "#9a653d", .9); }
  if (up && o.packStyle && o.packStyle !== "none") { rr(c, -5, -34, 10, 9, 2.2); fs(c, o.pack || "#9a653d", 1); }
  if (!side) { armDraw(-1); armDraw(1); } else armDraw(fl);
  // ---- head
  const mir = side && fl < 0; c.save(); if (mir) c.scale(-1, 1); { const EE = EMO[o.emote]; if (EE && EE.droop) c.translate(0, EE.droop * .5 + Math.sin(t * 1.5) * .12); if (o.emote === "frustrated") c.translate(0, -.2 + Math.sin(t * 14) * .18); if (o.emote === "joy") c.translate(0, -Math.abs(Math.sin(t * 6)) * .5); }
  const view = up ? "back" : side ? "side" : "front", hx0 = side ? .4 : 0;
  adultHair(c, o, hx0, cy, view, "back");
  if (!side) [-1, 1].forEach((s) => { c.beginPath(); c.ellipse(s * 4.2, cy + .8, .9, 1.5, 0, 0, 7); fs(c, sk, .8); });
  else { c.beginPath(); c.ellipse(hx0 - .8, cy + .9, 1, 1.6, 0, 0, 7); fs(c, sk, .8); }
  headPath(c, hx0, cy, up ? "front" : view); fs(c, sk, 1.15);
  if (!up) { c.fillStyle = "rgba(120,70,60,.13)"; c.beginPath(); c.ellipse(hx0 + (side ? -1 : 2.2), cy + 2.4, 2.8, 2.6, 0, 0, 7); c.fill(); if (o.beard === "full") adultBeard(c, o, hx0, cy, side); adultFace(c, o, hx0, cy, side, t); if (o.beard === "mustache" || o.beard === "full") adultStache(c, o, hx0, cy, side); if (o.lines) { c.beginPath(); c.moveTo(hx0 + (side ? 3 : 3.6), cy + .3); c.lineTo(hx0 + (side ? 3.4 : 4), cy + .9); c.moveTo(hx0 + (side ? 2.8 : 3.4), cy + .8); c.lineTo(hx0 + (side ? 3.3 : 3.9), cy + 1.5); if (!side) { c.moveTo(hx0 - 3.6, cy + .3); c.lineTo(hx0 - 4, cy + .9); c.moveTo(hx0 - 3.4, cy + .8); c.lineTo(hx0 - 3.9, cy + 1.5); } stroke1(c, shade(sk, .22), .28); } }
  adultHair(c, o, hx0, cy, view, "front");
  if (o.earrings && !up) { const ex = side ? [hx0 - .8] : [4.2, -4.2]; for (const x of ex) { c.beginPath(); if (o.hoops) { c.arc(x, cy + 4.1, 1.7, 0, 7); stroke1(c, o.earrings, .55); } else { c.arc(x, cy + 2.7, .55, 0, 7); fs(c, o.earrings, .4); } } }
  const ht = o.hat, hatC = o.hatColor || "#e07a66";
  if (ht && ht !== "none") {
    if (ht === "cap") { c.beginPath(); c.moveTo(hx0 - 4.6, cy - 1.6); c.bezierCurveTo(hx0 - 4.8, cy - 8.6, hx0 + 4.8, cy - 8.6, hx0 + 4.6, cy - 1.6); c.closePath(); fs(c, hatC, 1); if (!up) { c.beginPath(); c.ellipse(hx0 + (side ? 4.4 : 0), cy - 1.6, side ? 2.7 : 4, 1, 0, 0, 7); fs(c, shade(hatC, .18), .8); } }
    else if (ht === "beanie") { c.beginPath(); c.moveTo(hx0 - 4.8, cy - 1.4); c.bezierCurveTo(hx0 - 5, cy - 9.6, hx0 + 5, cy - 9.6, hx0 + 4.8, cy - 1.4); c.closePath(); fs(c, hatC, 1); rr(c, hx0 - 4.9, cy - 2.8, 9.8, 2, .8); fs(c, shade(hatC, -.25), .8); }
    else if (ht === "bucket" || ht === "fedora") { c.beginPath(); c.moveTo(hx0 - 4, cy - 2.4); c.lineTo(hx0 - 3.6, cy - 6.6); c.lineTo(hx0 + 3.6, cy - 6.6); c.lineTo(hx0 + 4, cy - 2.4); c.closePath(); fs(c, hatC, 1); c.beginPath(); c.ellipse(hx0, cy - 2.5, 6.4, 1.5, 0, 0, 7); fs(c, shade(hatC, .1), .9); }
    else if (ht === "headband") { c.beginPath(); c.moveTo(hx0 - 4.3, cy - 1.8); c.quadraticCurveTo(hx0, cy - 7.4, hx0 + 4.3, cy - 1.8); stroke1(c, hatC, 1.1); }
    else if (ht === "headphones") { c.beginPath(); c.arc(hx0, cy - .4, 5.2, Math.PI * 1.06, Math.PI * 1.94); stroke1(c, hatC, 1.1); if (!up) [-1, 1].forEach((s) => { rr(c, hx0 + s * 5.1 - 1, cy - 1.2, 2, 3.4, .8); fs(c, hatC, .7); }); }
    else if (ht === "crown") { c.beginPath(); c.moveTo(hx0 - 3, cy - 5.4); c.lineTo(hx0 - 3.3, cy - 8.8); c.lineTo(hx0 - 1.4, cy - 6.8); c.lineTo(hx0, cy - 9.4); c.lineTo(hx0 + 1.4, cy - 6.8); c.lineTo(hx0 + 3.3, cy - 8.8); c.lineTo(hx0 + 3, cy - 5.4); c.closePath(); fs(c, o.hatColor || "#EAB94E", .8); }
    else if (ht === "beret") { c.beginPath(); c.ellipse(hx0 + 1, cy - 5, 5, 2, -.12, 0, 7); fs(c, hatC, 1); }
  }
  c.restore();
  if (o.tag) { const my2 = cy - 12 + Math.sin(t * 4) * 1.2; c.beginPath(); c.moveTo(-3.4, my2 - 3.4); c.lineTo(3.4, my2 - 3.4); c.lineTo(0, my2 + 1); c.closePath(); fs(c, "#f28f7e", 1); }
  c.restore();
}
