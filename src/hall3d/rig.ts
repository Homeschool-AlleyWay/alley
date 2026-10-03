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
  c.save(); c.translate(Math.round(fx * 2) / 2, Math.round(fy * 2) / 2);
  const mv = o.moving, sw = mv ? Math.sin(o.walk) : 0, dir = o.dir, side = dir === "left" || dir === "right", fl = dir === "left" ? -1 : 1, up = dir === "up", sit = o.sitting;
  const top = o.top, bottom = o.bottom || "pants", hs = o.headSize || 1, bw = o.build === "slim" ? 0.9 : o.build === "sturdy" ? 1.12 : 1;
  c.fillStyle = "rgba(70,45,55,.24)"; c.beginPath(); c.ellipse(0, 1, 10 * bw, 3.6, 0, 0, 7); c.fill();
  if (sit) c.translate(0, 8);
  c.translate(0, mv ? -Math.abs(Math.cos(o.walk)) * 1.8 : Math.sin(t * 2 + o.id) * .35);
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
  // ---- head + hair (back layer)
  c.save(); c.translate((o.turn || 0) * 1.7, 0);
  const hy = -28, hc = o.hair, st = o.style, hc2 = o.hair2 || shade(hc, -.28);
  const HX = 8.9 * hs, HY = 8.3 * hs;
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
        const rx = es === "wide" ? 2.1 : es === "oval" ? 1.4 : 1.7, ry = es === "wide" ? 2.7 : es === "oval" ? 2.7 : 2.3;
        c.fillStyle = ec || "#3a2a30"; c.beginPath(); c.ellipse(x, hy, rx, ry, 0, 0, 7); c.fill();
        if (ec) { c.fillStyle = "#2a1d22"; c.beginPath(); c.ellipse(x, hy + .2, rx * .5, ry * .55, 0, 0, 7); c.fill(); }
        c.fillStyle = "#fff"; c.beginPath(); c.arc(x - .5, hy - .9, es === "wide" ? .9 : .7, 0, 7); c.fill();
        if (es === "sleepy") { c.fillStyle = o.skin; c.beginPath(); c.ellipse(x, hy - 1.1, rx + .5, ry * .62, 0, Math.PI, 2 * Math.PI); c.fill(); c.strokeStyle = "#3a2a30"; c.lineWidth = .9; c.beginPath(); c.moveTo(x - rx - .4, hy - .6); c.lineTo(x + rx + .4, hy - .6); c.stroke(); }
        if (es === "lash") { c.strokeStyle = "#3a2a30"; c.lineWidth = .8; const sg = side ? fl : (k ? 1 : -1); c.beginPath(); c.moveTo(x + sg * rx, hy - 1); c.lineTo(x + sg * (rx + 1.4), hy - 2.2); c.moveTo(x + sg * rx, hy - .1); c.lineTo(x + sg * (rx + 1.6), hy - .6); c.stroke(); }
      }
      if (brow !== "none") {
        c.strokeStyle = bc; c.lineCap = "round"; c.lineWidth = brow === "thick" ? 1.6 : brow === "thin" ? .6 : .9; c.beginPath();
        if (brow === "arch") { c.moveTo(x - 2, hy - 3.2); c.quadraticCurveTo(x, hy - 5.2, x + 2, hy - 3.6); } else { c.moveTo(x - 2, hy - 3.6); c.lineTo(x + 2, hy - 3.9); } c.stroke();
      }
      if (o.glasses) {
        const gs = o.glasses === true ? "round" : o.glasses, gc = o.glassColor || "#5b4048"; c.strokeStyle = gc; c.lineWidth = gs === "sun" ? 1 : .9;
        c.beginPath();
        if (gs === "square") c.roundRect(x - 3.1, hy - 2.6, 6.2, 5.2, 1.2); else if (gs === "cat") { c.ellipse(x, hy, 3.2, 2.7, 0, 0, 7); c.moveTo(x + (side ? fl : (k ? 1 : -1)) * 3, hy - 1.6); c.lineTo(x + (side ? fl : (k ? 1 : -1)) * 4.4, hy - 3.4); } else if (gs === "half") c.arc(x, hy, 3.2, Math.PI, 0); else c.arc(x, hy, 3.2, 0, 7);
        if (gs === "sun") { c.fillStyle = "rgba(40,30,40,.82)"; c.fill(); } c.stroke();
      }
    });
    if (o.glasses && !side) { c.strokeStyle = o.glassColor || "#5b4048"; c.lineWidth = .9; c.beginPath(); c.moveTo(-.3, hy - .5); c.lineTo(.3, hy - .5); c.stroke(); }
    if (o.blush !== false) { c.fillStyle = o.blushColor || "rgba(255,110,125,.38)"; (side ? [fl * 6.4] : [-6, 6]).forEach((x) => { c.beginPath(); c.ellipse(x, hy + 3.4, 2.1, 1.3, 0, 0, 7); c.fill(); }); }
    if (o.freckles) { c.fillStyle = shade(o.skin, .32); (side ? [[fl * 5.6, hy + 2.2], [fl * 6.8, hy + 3.2], [fl * 5.2, hy + 3.8]] : [[-5.6, hy + 2.4], [-4.2, hy + 3.4], [-6.4, hy + 3.8], [5.6, hy + 2.4], [4.2, hy + 3.4], [6.4, hy + 3.8]]).forEach(([x, y]) => { c.beginPath(); c.arc(x, y, .5, 0, 7); c.fill(); }); }
    if (o.mole) { c.fillStyle = "#4a2f2a"; c.beginPath(); c.arc(side ? fl * 6 : 4.4, hy + 5.2, .65, 0, 7); c.fill(); }
    if (o.nose) { c.strokeStyle = shade(o.skin, .3); c.lineWidth = .8; c.beginPath(); const nx = side ? fl * 6.4 : 0; c.arc(nx, hy + 2.6, .9, .1 * Math.PI, .9 * Math.PI); c.stroke(); }
    const mx = side ? fl * 3.6 : 0, my = hy + 4.7, ms = o.mouthStyle || "smile", lc = o.lip || "#8a4650";
    if (o.mouth) { c.fillStyle = "#7A3B3B"; c.beginPath(); c.ellipse(mx, hy + 4.8, 1.7, .7 + o.mouth * 1.5, 0, 0, 7); c.fill(); }
    else if (ms === "grin") { c.beginPath(); c.moveTo(mx - 2.4, my - .9); c.quadraticCurveTo(mx, my + 2.8, mx + 2.4, my - .9); c.closePath(); c.fillStyle = "#fff"; c.fill(); c.strokeStyle = lc; c.lineWidth = .9; c.stroke(); }
    else if (ms === "smirk") { c.strokeStyle = lc; c.lineWidth = 1; c.lineCap = "round"; c.beginPath(); c.moveTo(mx - 1.8, my); c.quadraticCurveTo(mx + .4, my + 1, mx + 2.2, my - .8); c.stroke(); }
    else if (ms === "flat") { c.strokeStyle = lc; c.lineWidth = 1; c.lineCap = "round"; c.beginPath(); c.moveTo(mx - 1.5, my); c.lineTo(mx + 1.5, my); c.stroke(); }
    else if (ms === "o") { c.fillStyle = "#7A3B3B"; c.beginPath(); c.ellipse(mx, my + .2, 1, 1.2, 0, 0, 7); c.fill(); }
    else if (ms === "cat") { c.strokeStyle = lc; c.lineWidth = .9; c.lineCap = "round"; c.beginPath(); c.arc(mx - 1, my - .4, 1.1, .1 * Math.PI, .9 * Math.PI); c.arc(mx + 1, my - .4, 1.1, .1 * Math.PI, .9 * Math.PI); c.stroke(); }
    else { c.strokeStyle = lc; c.lineWidth = 1; c.lineCap = "round"; c.beginPath(); c.arc(mx, hy + 4.6, 1.7, .15 * Math.PI, .85 * Math.PI); c.stroke(); }
    if (side) { c.beginPath(); c.arc(fl * 9, hy + .6, 1, 0, 7); c.fillStyle = o.skin; c.fill(); }
  }
  // ---- hair (front layer)
  const sx = side ? -fl * 1.6 : 0, cap = () => {           // side views are drawn as "facing right" and mirrored for left
    const m = side ? fl : 1, q = side ? -1.6 : 0; if (side) { c.save(); c.scale(m, 1); }
    c.beginPath(); c.moveTo(-9.3 + q, hy + .5); c.bezierCurveTo(-11 + q, hy - 14, 11 + q, hy - 14, 9.3 + q, hy + .5);
    if (side) { c.quadraticCurveTo(7 + q, hy - 5.4, 4 + q, hy - 4.6); c.lineTo(-9.3 + q, hy + .5); } else { c.quadraticCurveTo(6, hy - 3.4, 2, hy - 4.4); c.quadraticCurveTo(-3, hy - 6, -9.3, hy + .5); }
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
  // ---- accessories on the head
  const hatC = o.hatColor || "#e07a66", ht = o.hat;
  if (o.earrings && !up) (side ? [fl * 9] : [-9, 9]).forEach((x) => { c.beginPath(); c.arc(x, hy + 4.4, 1.2, 0, 7); fs(c, o.earrings, .8); });
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
