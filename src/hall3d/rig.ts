// @ts-nocheck
/** Chibi rig v2. Every option is optional: a look that only has the original fields (skin, hair, style, shirt, glasses, tag, pack)
 *  draws exactly as before, so the baked auditorium sheets keep their look. New fields (see avatar.ts for the option lists):
 *  hair styles + highlight, eyes (shape, colour), brows, freckles, mole, mouthStyle, glasses styles, hats, earrings, scarf,
 *  tops (hoodie, sweater, jersey, blazer, dress, overalls, vest, tank), patterns, bottoms (pants, shorts, skirt, joggers),
 *  shoes, bag style, build and head size. */
let OUT = "#6b4a4f";
export const setOutline = (col) => { OUT = col; };
export const getOutline = () => OUT;
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

/** chibi facial hair: stubble, goatees, full beards and mustaches (front and side views) */
function facialHair(c, o, hy, side, fl) {
  const st = o.beard; if (!st || st === "none") return; const col = o.beardColor || shade(o.hair, -.12), dk = shade(col, -.3), skin = o.skin, S = side;
  const F = (fn, lw = 1) => { c.beginPath(); fn(); fs(c, col, lw); }, patch = () => { c.fillStyle = skin; c.beginPath(); c.ellipse(S ? fl * 3.8 : 0, hy + 4.9, S ? 1.8 : 2.7, 1.25, 0, 0, 7); c.fill(); };
  const jaw = () => { if (S) { c.moveTo(fl * 1.6, hy + 1.4); c.bezierCurveTo(fl * 3, hy + 3.6, fl * 5.6, hy + 3.4, fl * 7.4, hy + 3.6); c.quadraticCurveTo(fl * 8.6, hy + 6.4, fl * 6.4, hy + 9); c.quadraticCurveTo(fl * 3, hy + 10.6, fl * -.2, hy + 7); c.lineTo(fl * -.4, hy + 1.4); } else { c.moveTo(-8.2, hy + .2); c.lineTo(-7.2, hy + 3.2); c.quadraticCurveTo(-4.6, hy + 3.6, -2.6, hy + 3.1); c.quadraticCurveTo(0, hy + 3.9, 2.6, hy + 3.1); c.quadraticCurveTo(4.6, hy + 3.6, 7.2, hy + 3.2); c.lineTo(8.2, hy + .2); c.bezierCurveTo(8.8, hy + 9, 3.6, hy + 11.2, 0, hy + 11.2); c.bezierCurveTo(-3.6, hy + 11.2, -8.8, hy + 9, -8.2, hy + .2); } c.closePath(); };
  if (st === "stubble") { c.save(); c.beginPath(); jaw(); c.clip(); c.fillStyle = col; c.globalAlpha = .16; c.fillRect(-10, hy, 20, 12); c.globalAlpha = .75; for (let i = 0; i < 46; i++) { const x = S ? fl * (.6 + (i * 37 % 78) / 10) : -7.2 + (i * 37 % 144) / 10, y = hy + 3.2 + (i * 53 % 66) / 10; c.beginPath(); c.arc(x, y, .26, 0, 7); c.fill(); } c.restore(); return; }
  if (st === "full" || st === "muttonchops") { if (st === "full") { c.beginPath(); jaw(); fs(c, col, 1.1); patch(); c.strokeStyle = dk; c.lineWidth = .35; for (let q = -3; q <= 3; q++) { c.beginPath(); c.moveTo(S ? fl * (3.2 + q) : q * 2, hy + 6.6); c.lineTo(S ? fl * (3.6 + q * 1.1) : q * 2.2, hy + 10); c.stroke(); } } else { [-1, 1].forEach((q) => { if (S && q < 0) return; const X = S ? fl : q; c.beginPath(); c.moveTo(X * 8.4, hy - 1.4); c.lineTo(X * 8.8, hy + 5.4); c.quadraticCurveTo(X * 7.6, hy + 9.2, X * 4.4, hy + 9.4); c.lineTo(X * 5.4, hy + 5.6); c.lineTo(X * 6.6, hy - 1); c.closePath(); fs(c, col, 1); }); } return; }
  if (st === "sideburns") { [-1, 1].forEach((q) => { if (S && q < 0) return; const X = S ? fl : q; c.beginPath(); c.moveTo(X * (S ? 1.6 : 8.6), hy - 2.6); c.lineTo(X * (S ? 2.6 : 8.8), hy + 3.8); c.lineTo(X * (S ? .6 : 6.8), hy + 3); c.lineTo(X * (S ? .4 : 7), hy - 2.4); c.closePath(); fs(c, col, .9); }); return; }
  if (st === "chinstrap") { c.strokeStyle = OUT; c.lineWidth = 2.6; c.lineCap = "round"; c.beginPath(); if (S) { c.moveTo(fl * 0, hy + 1); c.quadraticCurveTo(fl * 1.4, hy + 8.4, fl * 6.4, hy + 8.6); } else { c.moveTo(-8.2, hy + 1); c.bezierCurveTo(-8.2, hy + 9.4, -3.6, hy + 10.6, 0, hy + 10.6); c.bezierCurveTo(3.6, hy + 10.6, 8.2, hy + 9.4, 8.2, hy + 1); } c.stroke(); c.strokeStyle = col; c.lineWidth = 1.3; c.stroke(); return; }
  if (st === "goatee" || st === "vandyke" || st === "circle" || st === "soulpatch") {
    if (st === "soulpatch") { F(() => c.ellipse(S ? fl * 4.2 : 0, hy + 6.7, S ? 1 : 1.1, 1.2, 0, 0, 7), .8); return; }
    if (st === "goatee") F(() => { if (S) { c.ellipse(fl * 5.8, hy + 7.2, 2.5, 2.8, 0, 0, 7); } else { c.moveTo(-3, hy + 5.8); c.quadraticCurveTo(-3.4, hy + 10.4, 0, hy + 10.6); c.quadraticCurveTo(3.4, hy + 10.4, 3, hy + 5.8); c.quadraticCurveTo(0, hy + 6.8, -3, hy + 5.8); c.closePath(); } }, 1);
    if (st === "vandyke") { F(() => { if (S) { c.moveTo(fl * 4.6, hy + 6); c.lineTo(fl * 5.4, hy + 11.8); c.lineTo(fl * 7.4, hy + 6.4); c.closePath(); } else { c.moveTo(-2.6, hy + 5.8); c.quadraticCurveTo(-1.6, hy + 9, 0, hy + 12.2); c.quadraticCurveTo(1.6, hy + 9, 2.6, hy + 5.8); c.quadraticCurveTo(0, hy + 6.8, -2.6, hy + 5.8); c.closePath(); } }, 1); }
    if (st === "circle") { c.strokeStyle = OUT; c.lineWidth = 3.4; c.lineCap = "round"; c.beginPath(); if (S) c.ellipse(fl * 4.8, hy + 5.6, 2.8, 3.6, 0, -1.4, 1.4); else c.ellipse(0, hy + 5.8, 4.1, 3.6, 0, 0, 7); c.stroke(); c.strokeStyle = col; c.lineWidth = 2; c.stroke(); }
    if (st === "vandyke" || st === "circle") { c.strokeStyle = col; c.lineWidth = 1.1; c.lineCap = "round"; c.beginPath(); if (S) { c.moveTo(fl * 4.2, hy + 3.6); c.lineTo(fl * 7.2, hy + 3.9); } else { c.moveTo(-1, hy + 3.3); c.quadraticCurveTo(-3, hy + 3.4, -4.6, hy + 2.6); c.moveTo(1, hy + 3.3); c.quadraticCurveTo(3, hy + 3.4, 4.6, hy + 2.6); } c.stroke(); }
    return; }
  // mustaches
  c.lineCap = "round"; if (st === "pencil") { c.strokeStyle = col; c.lineWidth = .9; c.beginPath(); if (S) { c.moveTo(fl * 4, hy + 3.6); c.lineTo(fl * 7, hy + 3.8); } else { c.moveTo(-3.2, hy + 3.7); c.quadraticCurveTo(0, hy + 3, 3.2, hy + 3.7); } c.stroke(); return; }
  if (st === "handlebar") { c.strokeStyle = OUT; c.lineWidth = 2.6; const path = () => { c.beginPath(); if (S) { c.moveTo(fl * 4, hy + 3.5); c.quadraticCurveTo(fl * 6.6, hy + 3.2, fl * 7.8, hy + 1.8); } else { c.moveTo(0, hy + 3.4); c.quadraticCurveTo(-3.6, hy + 4.2, -5.8, hy + 2); c.moveTo(0, hy + 3.4); c.quadraticCurveTo(3.6, hy + 4.2, 5.8, hy + 2); } c.stroke(); }; path(); c.strokeStyle = col; c.lineWidth = 1.4; path(); return; }
  if (st === "walrus" || st === "mustache") { F(() => { if (S) { c.moveTo(fl * 3.6, hy + 2.6); c.quadraticCurveTo(fl * 7.4, hy + 2.4, fl * 8, hy + 5.2); c.quadraticCurveTo(fl * 5.6, hy + 5.6, fl * 3.6, hy + 4.6); c.closePath(); } else { c.moveTo(0, hy + 3); c.quadraticCurveTo(-5, hy + 2.4, -6.4, hy + 5.8); c.quadraticCurveTo(-3.2, hy + 5.6, 0, hy + 4.4); c.quadraticCurveTo(3.2, hy + 5.6, 6.4, hy + 5.8); c.quadraticCurveTo(5, hy + 2.4, 0, hy + 3); c.closePath(); } }, .9); }
}
const NK = 2.4;                                         // chibi neck: the head floats this far above the shoulders
const HAIR_LONG = ["long", "wavy", "bob", "braids", "pigtails", "pony"];
export function drawChar(c, fx, fy, o, t) {
  if (o.age === "hs" && o.adultRig === undefined && !o.legacyAdult) o = { ...o, adultRig: true, teen: true, packColor: o.pack };   // high schoolers use the grown-up body, kept younger by freckles, braces, a backpack and a smaller frame
  if ((o.age === "adult" || o.adultRig) && !o.legacyAdult) return drawAdult(c, fx, fy, o, t);
  c.save(); c.translate(Math.round(fx * 2) / 2, Math.round(fy * 2) / 2);
  const mv = o.moving, sw = mv ? Math.sin(o.walk) : 0, dir = o.dir, side = dir === "left" || dir === "right", fl = dir === "left" ? -1 : 1, up = dir === "up", sit = o.sitting;
  const adult = o.age === "adult", top = o.top, bottom = o.bottom || "pants", hs = (o.headSize || 1) * (adult ? 1 : 1), bw = (o.build === "slim" ? 0.9 : o.build === "sturdy" ? 1.12 : 1) * (adult ? 1.12 : 1), SY = adult ? 1.28 : 1;
  c.fillStyle = "rgba(70,45,55,.24)"; c.beginPath(); c.ellipse(0, 1, 10 * bw, 3.6, 0, 0, 7); c.fill();
  if (sit) c.translate(0, 8);
  c.translate(0, mv ? -Math.abs(Math.cos(o.walk)) * 1.8 : Math.sin(t * 2 + o.id) * .35);
  if (adult) c.scale(1, SY);                                             // adults: longer legs and torso, then a smaller head on top
  const pants = o.pants || PANTS[o.id % 5], pack = o.pack || ["#f28f7e", "#4f91c7", "#eab94e", "#88b89a", "#b8a8da"][o.id % 5], shoe = o.shoes || "#fbf6ee", packStyle = o.packStyle || "pack";
  const under = o.shirt2 || "#fff6ea", armCol = top === "tank" ? o.skin : top === "varsity" ? under : top === "sailor" ? shade(o.shirt, -.1) : top === "apron" ? under : top === "cableknit" || top === "chunky" ? shade(o.shirt, .06) : o.shirt;
  // ---- hair colour / highlight styles. HG fills the front, HB the back-hair that sits behind the body
  const hy = -28, hc = o.hair, st = o.style, hc2 = o.hair2 || shade(hc, -.28), hl = o.hl || (o.hair2 ? "streak" : "none"), LL = st === "long" || st === "hime" ? 13.5 : st === "wavy" || st === "halfup" ? 12.5 : st === "mullet" ? 10 : st === "bob" ? 9 : st === "shag" ? 8 : 0;
  const mkG = (x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([p, col]) => g.addColorStop(p, col)); return g; };
  const y1h = LL ? hy + LL : hy + 1.5, y0h = hy - 11;
  const HG = !o.hair2 ? hc : hl === "ombre" ? mkG(0, y0h, 0, y1h, [[0, hc], [.35, hc], [1, hc2]]) : hl === "tips" ? mkG(0, y0h, 0, y1h, [[0, hc], [.7, hc], [.7, hc2], [1, hc2]]) : hl === "split" ? mkG(-10, 0, 10, 0, [[0, hc], [.5, hc], [.5, hc2], [1, hc2]]) : hl === "roots" ? mkG(0, y0h, 0, y1h, [[0, hc2], [.3, hc2], [.3, hc], [1, hc]]) : hl === "rainbow" ? mkG(0, y0h, 0, y1h, [[0, hc], [.33, hc2], [.66, shade(hc2, -.25), ], [1, hc]]) : hc;
  const HB = o.hair2 && hl === "underlayer" ? hc2 : HG;
  const headFrame = () => { if (adult) { c.translate(0, -8.4); c.scale(0.82, 0.82); } c.translate((o.turn || 0) * 1.7 + (o.hx || 0), -NK + (o.hdy || 0)); if (o.tilt) { c.translate(0, 9); c.rotate(o.tilt); c.translate(0, -9); } };
  const tx = o.htex || "straight", puffy = (tx === "curly" || tx === "coily" || tx === "fluffy") && st !== "buzz" && st !== "afro" && st !== "bald";
  const drawBack = () => {                                                // hair that hangs BEHIND the head (and, seen from the front, behind the body too)
    if (puffy) { const r = tx === "coily" ? 3.3 : tx === "curly" ? 2.8 : 2.3, n = tx === "fluffy" ? 11 : 9, cxh = side ? fl * .6 : 0; for (let i = 0; i < n; i++) { const a = Math.PI * (1.04 + .92 * i / (n - 1)); c.beginPath(); c.arc(cxh + Math.cos(a) * 9.6, hy + Math.sin(a) * 8.9, r, 0, 7); fs(c, HB, 1.2); } }
  if (st === "long" || st === "bob" || st === "wavy" || st === "shag" || st === "halfup" || st === "hime" || st === "mullet") {                    // flowing back-hair: a tapered, curved mass with a strand notch (not a block)
    const L = st === "bob" ? 9 : st === "shag" ? 8 : st === "mullet" ? 10 : st === "long" || st === "hime" ? 13.5 : 12.5, m = side ? -fl : 1, wd = side ? 6.4 : 10.4, hb = c;
    hb.beginPath();
    if (side) { hb.moveTo(m * -1, hy - 7.5); hb.bezierCurveTo(m * 8, hy - 8, m * 11.4, hy + 1, m * 10.2, hy + L * .62); hb.quadraticCurveTo(m * 9.6, hy + L, m * 6.4, hy + L + .4); hb.quadraticCurveTo(m * 3.2, hy + L - 1.6, m * 1.8, hy + 3); hb.closePath(); }
    else { hb.moveTo(-9.4, hy - 3); hb.bezierCurveTo(-11.6, hy + 3, -wd - .4, hy + L * .5, -wd + .6, hy + L - 2); hb.quadraticCurveTo(-wd + 1.4, hy + L + .6, -5.2, hy + L); if (st === "wavy") { hb.quadraticCurveTo(-3.2, hy + L + 2.4, -1.4, hy + L - .4); hb.quadraticCurveTo(1.2, hy + L + 2.4, 3.2, hy + L); } else hb.quadraticCurveTo(0, hy + L - 1.6, 5.2, hy + L); hb.quadraticCurveTo(wd - 1.4, hy + L + .6, wd - .6, hy + L - 2); hb.bezierCurveTo(wd + .4, hy + L * .5, 11.6, hy + 3, 9.4, hy - 3); hb.closePath(); }
    fs(c, HB, 1.3); if (tx === "curly" || tx === "coily") { const r = tx === "coily" ? 2.6 : 2.2; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc((side ? m * (1.8 + i * 1.4) : -8 + i * 3.2), hy + L - .4 + (i % 2) * .6, r, 0, 7); fs(c, HB, 1.1); } }
    c.strokeStyle = shade(hc, -.32); c.lineWidth = .55; c.lineCap = "round"; (side ? [2.4, 4.6, 6.8, 8.6] : [-8, -5.6, 5.6, 8]).forEach((x, i) => { c.beginPath(); const a = side ? m * x : x; c.moveTo(a, hy + 2); c.quadraticCurveTo(a * 1.06, hy + L * .55, a * 1.02 + (i % 2 ? .6 : -.6), hy + L - 2.4); c.stroke(); });
  }
  if (st === "highpony") { c.save(); c.translate(side ? -fl * 5 : up ? 0 : 6, hy - 14); c.rotate(side ? fl * .5 : up ? 0 : -.45); c.beginPath(); c.ellipse(0, 2, 3, 7.4, 0, 0, 7); fs(c, HB, 1.3); c.restore(); }
  if (st === "afro") { c.beginPath(); c.ellipse(side ? -fl * 1.2 : 0, hy - 3, 13.2, 12.6, 0, 0, 7); fs(c, HB, 1.4); }
    if (st === "locs") (side ? [-fl * 8.2, -fl * 5.4] : [-9.6, -6.2, 6.2, 9.6]).forEach((x, i) => { for (let k = 0; k < 4; k++) { c.beginPath(); rr(c, x - 1.5 + (k & 1 ? .3 : -.3), hy + 1 + k * 3.4 + (i % 2) * .8, 3, 3.6, 1.5); fs(c, k & 1 ? hc2 : HB, 1); } });
    if (st === "halfup") { c.beginPath(); c.arc(side ? -fl * 3 : 0, hy - 10.5, 3.9, 0, 7); fs(c, HB, 1.3); }
  if (st === "bun") { c.beginPath(); c.arc(side ? -fl * 3 : 0, hy - 9.5, 4.4, 0, 7); fs(c, HB, 1.3); }
  if (st === "topknot") { c.beginPath(); c.arc(side ? -fl * 2 : 0, hy - 12, 3.4, 0, 7); fs(c, HB, 1.3); }
  if (st === "twinbuns") (side ? [-fl * 3] : [-7.6, 7.6]).forEach((x) => { c.beginPath(); c.arc(x, hy - 10.4, 3.9, 0, 7); fs(c, HB, 1.3); });
  if (st === "pony") { c.save(); c.translate(side ? -fl * 9 : up ? 0 : 9, side ? hy + 2 : up ? hy + 8 : hy + 1); c.rotate(side ? 0 : up ? 0 : -.5); c.beginPath(); c.ellipse(0, 4, 3.2, 6.5, 0, 0, 7); fs(c, HB, 1.3); c.restore(); }
  if (st === "pigtails") (side ? [-fl * 10] : [-10.6, 10.6]).forEach((x, i) => { c.save(); c.translate(x, hy + 3); c.rotate(side ? 0 : (i ? -.4 : .4)); c.beginPath(); c.ellipse(0, 5, 2.9, 6.6, 0, 0, 7); fs(c, HB, 1.3); c.restore(); });
  if (st === "braids") (side ? [-fl * 8.4] : [-9.4, 9.4]).forEach((x) => { for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(x, hy + 4 + k * 3.7, 2.2, 2.1, 0, 0, 7); fs(c, k & 1 ? hc2 : hc, 1.1); } });
  if (st === "curly") [[-8, hy - 2], [8, hy - 2], [-6, hy - 8], [6, hy - 8], [0, hy - 10]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 4.6, 0, 7); fs(c, HB, 1.2); });
  };
  if (!up) { c.save(); if (adult) c.scale(1, 1 / SY); headFrame(); drawBack(); c.restore(); }
  // ---- extras: 20 optional add-ons (wings, capes, horns, crowns, masks, ...)
  const xt = o.extra && o.extra !== "none" ? o.extra : "", xc = o.extraColor || "#eab94e";
  const extraBack = () => {
    if (!xt) return;
    if (xt === "angelwings") [-1, 1].forEach((q) => { c.beginPath(); c.moveTo(q * 3, -19); c.bezierCurveTo(q * 12, -30, q * 19, -22, q * 15.4, -13); c.quadraticCurveTo(q * 15, -10.6, q * 12.6, -12); c.quadraticCurveTo(q * 12.6, -8.8, q * 9.6, -10.6); c.quadraticCurveTo(q * 8, -9, q * 6.4, -11.4); c.closePath(); fs(c, "#fffaf2", 1.2); line(c, q * 5, -17, q * 12.4, -18.4, .5, "#d9d4cc"); line(c, q * 5.4, -14.6, q * 12, -15, .5, "#d9d4cc"); });
    else if (xt === "butterfly") [-1, 1].forEach((q) => { c.beginPath(); c.ellipse(q * 10.6, -21, 6.2, 4.2, q * -.5, 0, 7); fs(c, xc, 1.1); c.beginPath(); c.ellipse(q * 9.4, -13.6, 4.2, 3, q * .5, 0, 7); fs(c, shade(xc, .15), 1.1); c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.arc(q * 11.6, -21.6, 1.1, 0, 7); c.arc(q * 9.6, -13.4, .8, 0, 7); c.fill(); });
    else if (xt === "cape") { c.beginPath(); c.moveTo(-6.2, -19.4); c.lineTo(-10.6, -3.4); c.quadraticCurveTo(0, -.4, 10.6, -3.4); c.lineTo(6.2, -19.4); c.closePath(); fs(c, xc, 1.3); if (up) { c.strokeStyle = shade(xc, -.25); c.lineWidth = .6; for (const x of [-4, 0, 4]) { c.beginPath(); c.moveTo(x * .6, -18.6); c.lineTo(x * 2.2, -3); c.stroke(); } } }
    else if (xt === "foxtail") { const tx0 = side ? -fl * 8 : 7.6; c.beginPath(); c.ellipse(tx0 + (side ? -fl * 3 : 3.4), -8.4, 3.4, 7.4, side ? -fl * -.9 : -.9, 0, 7); fs(c, xc, 1.2); c.beginPath(); c.ellipse(tx0 + (side ? -fl * 5.6 : 6.2), -13.4, 2.2, 2.8, side ? -fl * -.9 : -.9, 0, 7); fs(c, "#fff6ea", 1); }
  };
  const extraFront = () => {
    if (!xt || up) return;
    if (xt === "sash" && !side) { c.beginPath(); c.moveTo(-6.4, -19.4); c.lineTo(-3.4, -19.4); c.lineTo(6.6, -9.6); c.lineTo(3.4, -8.8); c.closePath(); fs(c, xc, 1); star(c, 0, -14, 1.2, "#fff6ea"); }
    else if (xt === "medal" && !side) { c.beginPath(); c.moveTo(-1.8, -19.5); c.lineTo(0, -15.2); c.lineTo(1.8, -19.5); c.closePath(); fs(c, "#c4463c", .7); c.beginPath(); c.arc(0, -14.2, 1.7, 0, 7); fs(c, "#eab94e", .9); star(c, 0, -14.2, .9, "#fff6ea"); }
    else if (xt === "stethoscope") { c.strokeStyle = "#3a3a44"; c.lineWidth = .9; c.beginPath(); c.moveTo(-3.6, -19.6); c.bezierCurveTo(-4.6, -11.6, 4.6, -11.6, 3.6, -19.6); c.stroke(); c.beginPath(); c.arc(0.6, -11.2, 1.4, 0, 7); fs(c, "#c9ced4", .8); }
    else if (xt === "toolbelt") { c.fillStyle = "#8a5f3a"; c.fillRect(-6.8 * bw, -11, 13.6 * bw, 1.7); c.strokeStyle = OUT; c.lineWidth = .6; c.strokeRect(-6.8 * bw, -11, 13.6 * bw, 1.7); [-4.4, 3.4].forEach((x) => { rr(c, x, -10.2, 2.6, 3, .6); fs(c, shade("#8a5f3a", .2), .6); }); line(c, 0.6, -9.2, 0.6, -6.2, 1.1, "#9da7aa"); c.fillStyle = "#c9ced4"; c.fillRect(-.4, -6.6, 2, 1); }
    else if (xt === "bird") { const bx = side ? 0.5 : -6, by = -20.6; c.beginPath(); c.ellipse(bx, by - 1.4, 2.4, 2, 0, 0, 7); fs(c, xc, .9); c.beginPath(); c.arc(bx + 1.5, by - 3.1, 1.1, 0, 7); fs(c, shade(xc, .1), .8); c.fillStyle = "#eab94e"; c.beginPath(); c.moveTo(bx + 2.5, by - 3.2); c.lineTo(bx + 3.6, by - 2.8); c.lineTo(bx + 2.5, by - 2.5); c.closePath(); c.fill(); c.fillStyle = "#2a1d22"; c.beginPath(); c.arc(bx + 1.8, by - 3.4, .25, 0, 7); c.fill(); }
  };
  if (!up) extraBack();
  // ---- legs + shoes
  if (!sit) [-1, 1].forEach((s) => {
    const lift = mv ? Math.max(0, s * sw) * 2.6 : 0, x1 = side ? 0 : s * 3.2 * bw, x2 = side ? s * sw * 4.2 : s * 3.2 * bw;
    if (bottom === "shorts") { line(c, x1, -9, x2, -2 - lift, 3.4, o.skin); line(c, x1, -9, x1 + (x2 - x1) * .38, -6 - lift * .38, 3.9, pants); }
    else if (bottom === "skirt" || bottom === "pleated" || bottom === "tutu" || bottom === "kilt") line(c, x1, -9, x2, -2 - lift, 3.2, o.skin);
    else if (bottom === "jeans") { line(c, x1, -9, x2, -2 - lift, 3.9, pants); line(c, x1 + (x2 - x1) * .12, -8.4, x2 + (x1 - x2) * .04, -3 - lift, .5, shade(pants, .35)); line(c, x1, -3.4 - lift * .9 + (x2 - x1) * 0, x2, -2.2 - lift, 4.1, shade(pants, -.18)); }
    else if (bottom === "bike") { line(c, x1, -9, x2, -2 - lift, 3.2, o.skin); line(c, x1, -9, x1 + (x2 - x1) * .36, -6.2 - lift * .36, 3.5, shade(pants, -.25)); }
    else if (bottom === "leggings") line(c, x1, -9, x2, -2 - lift, 3, shade(pants, -.18));
    else if (bottom === "capri") { line(c, x1, -9, x2, -2 - lift, 3.2, o.skin); line(c, x1, -9, x1 + (x2 - x1) * .62, -5 - lift * .62, 3.9, pants); }
    else if (bottom === "cargo") { line(c, x1, -9, x2, -2 - lift, 4, pants); line(c, x1 + (x2 - x1) * .14, -7.6, x1 + (x2 - x1) * .3, -6, 2.3, shade(pants, -.22)); }
    else line(c, x1, -9, x2, -2 - lift, bottom === "joggers" ? 4.2 : 3.6, pants);
    if (o.socks && o.socks !== "none") { const t0 = o.socks === "ankle" ? .78 : .5, sc = o.sockColor || "#fff6ea", px = (t) => x1 + (x2 - x1) * t, py = (t) => -9 + (-2 - lift + 9) * t; line(c, px(t0), py(t0), x2, -2 - lift, 3.9, sc); if (o.socks === "striped") for (const t of [.58, .7]) line(c, px(t) - 1.7, py(t), px(t) + 1.7, py(t), .9, shade(sc, -.4)); else if (o.socks === "tall") line(c, px(t0) - 1.7, py(t0), px(t0) + 1.7, py(t0), .8, shade(sc, -.25)); }
    const fx2 = x2 + (side ? fl * 1.2 : 0), fy2 = -.6 - lift;
    if (o.shoeStyle === "boot") { rr(c, fx2 - 2.6, fy2 - 3.6, 5.2, 4.6, 1.6); fs(c, shoe, 1.1); c.beginPath(); c.ellipse(fx2 + (side ? fl * 1.2 : 0), fy2 + .6, 3.6, 1.7, 0, 0, 7); fs(c, shade(shoe, .25), 1.1); }
    else if (o.shoeStyle === "hightop") { rr(c, fx2 - 2.7, fy2 - 4.4, 5.4, 5.4, 1.5); fs(c, shoe, 1.1); c.fillStyle = "#fff6ea"; c.fillRect(fx2 - 2.7, fy2 + .2, 5.4, .9); c.beginPath(); c.ellipse(fx2 + (side ? fl * 1 : 0), fy2 + .5, 3.6, 1.6, 0, 0, 7); fs(c, "#fff6ea", 1); for (let q = 0; q < 3; q++) { c.fillStyle = "#fff6ea"; c.fillRect(fx2 - .4, fy2 - 3.6 + q * 1.2, .8, .5); } }
    else if (o.shoeStyle === "loafer") { c.beginPath(); c.ellipse(fx2, fy2, 3.5, 1.8, 0, 0, 7); fs(c, shade(shoe, -.15), 1.1); rr(c, fx2 - 1.2, fy2 - 1.4, 2.4, .9, .3); fs(c, "#eab94e", .5); }
    else if (o.shoeStyle === "rainboot") { rr(c, fx2 - 2.6, fy2 - 6.6, 5.2, 7.6, 1.4); fs(c, shoe, 1.1); c.fillStyle = shade(shoe, .3); c.fillRect(fx2 - 2.6, fy2 - 6.6, 5.2, 1.3); c.beginPath(); c.ellipse(fx2 + (side ? fl * 1.1 : 0), fy2 + .7, 3.7, 1.7, 0, 0, 7); fs(c, shade(shoe, -.25), 1.1); }
    else if (o.shoeStyle === "slipper") { c.beginPath(); c.ellipse(fx2, fy2, 3.6, 2, 0, 0, 7); fs(c, shoe, 1.1); for (let q = -2; q <= 2; q++) { c.beginPath(); c.arc(fx2 + q * 1.4, fy2 - 1.6 + Math.abs(q) * .25, .9, 0, 7); fs(c, shade(shoe, .2), .7); } }
    else if (o.shoeStyle === "skate") { c.beginPath(); c.ellipse(fx2, fy2, 3.5, 1.9, 0, 0, 7); fs(c, shoe, 1.1); c.fillStyle = "#fff6ea"; c.fillRect(fx2 - 3.4, fy2 + .9, 6.8, 1); c.beginPath(); c.moveTo(fx2 - 2, fy2 - 1); c.lineTo(fx2 + 2, fy2 - .2); c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = .6; c.stroke(); }
    else if (o.shoeStyle === "sandal") { c.beginPath(); c.ellipse(fx2, fy2, 3.4, 1.7, 0, 0, 7); fs(c, o.skin, 1.1); c.strokeStyle = shoe; c.lineWidth = 1.2; c.beginPath(); c.moveTo(fx2 - 2.2, fy2 - .3); c.lineTo(fx2 + 2.2, fy2 - .3); c.stroke(); }
    else { c.beginPath(); c.ellipse(fx2, fy2, 3.4, 1.9, 0, 0, 7); fs(c, shoe, 1.1); if (o.shoeStyle === "sneaker") { c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(fx2 - 3, fy2 + .5, 6, .7); } }
  });
  if ((bottom === "pleated" || bottom === "tutu" || bottom === "kilt") && !sit) {
    if (bottom === "tutu") { for (const [w, y, k] of [[11.6, -6.4, .22], [10.4, -7.6, .1], [8.8, -9, 0]] as const) { c.beginPath(); c.moveTo(-w * bw * .6, y - 3.6); c.lineTo(w * bw * .6, y - 3.6); for (let i = 0; i <= 6; i++) c.quadraticCurveTo(w * bw * (.6 - (i + .5) / 6 * 1.2) * -1 * -1, y + 1.4, w * bw * (.6 - (i + 1) / 6 * 1.2), y - .4); c.closePath(); fs(c, shade(pants, k), 1.1); } c.fillStyle = shade(pants, -.3); c.fillRect(-6.6 * bw, -12.2, 13.2 * bw, 1.4); }
    else { c.beginPath(); c.moveTo(-6.6 * bw, -12); c.lineTo(6.6 * bw, -12); c.lineTo(bottom === "kilt" ? 8.4 * bw : 10.2 * bw, -5.4); c.lineTo(bottom === "kilt" ? -8.4 * bw : -10.2 * bw, -5.4); c.closePath(); fs(c, pants, 1.3);
      c.save(); c.clip(); if (bottom === "pleated") { c.strokeStyle = shade(pants, -.3); c.lineWidth = .5; for (let x = -9; x <= 9; x += 1.8) { c.beginPath(); c.moveTo(x * .64, -12); c.lineTo(x * 1.1, -5.4); c.stroke(); } } else { c.strokeStyle = shade(pants, .35); c.lineWidth = .7; for (let x = -9; x <= 9; x += 2.4) { c.beginPath(); c.moveTo(x, -12.5); c.lineTo(x, -5); c.stroke(); } for (let y = -11.4; y < -5; y += 2) { c.beginPath(); c.moveTo(-10, y); c.lineTo(10, y); c.stroke(); } c.strokeStyle = "rgba(0,0,0,.2)"; c.lineWidth = .4; for (let x = -8; x <= 9; x += 4.8) { c.beginPath(); c.moveTo(x, -12.5); c.lineTo(x, -5); c.stroke(); } } c.restore();
      c.fillStyle = shade(pants, -.3); c.fillRect(-6.8 * bw, -12.4, 13.6 * bw, 1.2); if (bottom === "kilt") { c.beginPath(); c.arc(-4.4 * bw, -7.6, .9, 0, 7); fs(c, "#d9d4cc", .5); } }
  }
  if (bottom === "skirt" && !sit) { c.beginPath(); c.moveTo(-6.8 * bw, -12); c.lineTo(6.8 * bw, -12); c.lineTo(9.6 * bw, -5.6); c.lineTo(-9.6 * bw, -5.6); c.closePath(); fs(c, pants, 1.3); c.fillStyle = "rgba(255,255,255,.22)"; c.fillRect(-8.2 * bw, -7.4, 16.4 * bw, 1); }
  // ---- arms (far side first), packs peeking behind
  const arm = (s, near) => { let ax = side ? s * sw * 3.5 : s * 8.2, hy = -9.5 - (mv ? -s * sw * 1.5 : 0); const A = o.arms && (s > 0 ? o.arms.R : o.arms.L); if (A) { ax = side ? fl * Math.abs(A[0]) * 0.9 : A[0]; hy = A[1]; } line(c, side ? 0 : s * 6.6 * bw, -17, ax, hy, 3.2, armCol);
    if (o.wrist && o.wrist !== "none" && (s < 0 || side)) { const sx0 = side ? 0 : s * 6.6 * bw, wx = ax + (sx0 - ax) * .2, wy = hy + (-17 - hy) * .2, wc = o.wristColor || "#eab94e", wk = o.wrist;
      if (wk === "watch") { c.beginPath(); c.arc(wx, wy, 1.9, 0, 7); c.strokeStyle = OUT; c.lineWidth = 2.4; c.stroke(); c.strokeStyle = "#313a3f"; c.lineWidth = 1.3; c.stroke(); rr(c, wx - 1.1, wy - 1.2, 2.2, 2.4, .5); fs(c, "#fffaf2", .6); }
      else if (wk === "beads") { for (let q = -1; q <= 1; q++) { c.beginPath(); c.arc(wx + q * 1.3, wy + Math.abs(q) * .5, .8, 0, 7); fs(c, q ? wc : "#f2e8d8", .5); } }
      else if (wk === "band") { line(c, wx - 1.8, wy, wx + 1.8, wy, 2, wc); }
      else { c.beginPath(); c.arc(wx, wy, 1.8, 0, 7); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke(); c.strokeStyle = wc; c.lineWidth = 1; c.stroke(); } }
    c.beginPath(); c.arc(ax, hy + .6, 1.9, 0, 7); fs(c, o.skin, 1); if (o.thumb && s > 0) { c.beginPath(); c.ellipse(ax + .2, hy - 1.4, .9, 1.6, .12, 0, 7); fs(c, o.skin, 1); } };
  if (side) arm(-fl * -1, false);
  if (side && packStyle === "pack") { rr(c, -fl * 9.5, -19, 7, 10, 3); fs(c, pack, 1.2); }
  else if (side && packStyle === "mini") { rr(c, -fl * 8, -16, 5, 6.5, 2.4); fs(c, pack, 1.1); }
  // ---- neck (behind the shirt; drawn again in front of long back-hair below)
  const neck = (yTop, yBot, front) => { const nx = (side ? fl * .4 : 0) + (o.turn || 0) * 1.7; rr(c, nx - 2.7, yTop, 5.4, yBot - yTop, 1.6); fs(c, o.skin, front ? 0 : 1.2); if (front) { c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.moveTo(nx - 2.7, yTop); c.lineTo(nx - 2.7, yBot); c.moveTo(nx + 2.7, yTop); c.lineTo(nx + 2.7, yBot); c.stroke(); } c.fillStyle = "rgba(110,60,50,.2)"; c.beginPath(); c.ellipse(nx, yTop + 3.4, 2.7, 1.2, 0, 0, 7); c.fill(); };
  neck(-27, -18.4, false);
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
  if (o.emblem && o.emblem !== "none" && !up && !side && top !== "dress" && top !== "overalls") {
    const ec = o.shirt2 && o.shirt2 !== o.shirt ? o.shirt2 : "#fff6ea", ey = -13.4;
    if (o.emblem === "heart") heart(c, 0, ey - .6, 2.2, ec); else if (o.emblem === "star") star(c, 0, ey, 2.6, ec);
    else if (o.emblem === "bolt") { c.beginPath(); c.moveTo(1, ey - 3.4); c.lineTo(-1.8, ey + .4); c.lineTo(-.2, ey + .4); c.lineTo(-1, ey + 3.4); c.lineTo(1.8, ey - .6); c.lineTo(.2, ey - .6); c.closePath(); fs(c, ec, .5); }
    else if (o.emblem === "paw") { c.fillStyle = ec; c.beginPath(); c.ellipse(0, ey + 1, 1.7, 1.3, 0, 0, 7); c.fill(); [[-2, ey - 1.2], [-.7, ey - 2.4], [.7, ey - 2.4], [2, ey - 1.2]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, .7, 0, 7); c.fill(); }); }
    else if (o.emblem === "smile") { c.beginPath(); c.arc(0, ey, 2.6, 0, 7); fs(c, ec, .6); c.fillStyle = "#4a3b3f"; c.beginPath(); c.arc(-.9, ey - .7, .35, 0, 7); c.arc(.9, ey - .7, .35, 0, 7); c.fill(); c.strokeStyle = "#4a3b3f"; c.lineWidth = .5; c.beginPath(); c.arc(0, ey + .2, 1.2, .2 * Math.PI, .8 * Math.PI); c.stroke(); }
  }
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
    else if (top === "henley") { c.beginPath(); c.ellipse(0, -19.3, 3.4, 1.4, 0, 0, 7); fs(c, shade(o.shirt, .12), .9); rr(c, -1.1, -19.4, 2.2, 5.6, .6); fs(c, shade(o.shirt, .22), .7); [-18, -16.4, -14.8].forEach((y) => { c.fillStyle = "#fff6ea"; c.beginPath(); c.arc(0, y, .4, 0, 7); c.fill(); }); }
    else if (top === "flannel") { c.save(); tp(); c.clip(); c.strokeStyle = shade(o.shirt, -.32); c.globalAlpha = .55; c.lineWidth = 1; for (let y = -19; y < -8; y += 2.7) { c.beginPath(); c.moveTo(-8, y); c.lineTo(8, y); c.stroke(); } for (let x = -6; x <= 6; x += 2.7) { c.beginPath(); c.moveTo(x, -20); c.lineTo(x, -8); c.stroke(); } c.globalAlpha = 1; c.restore(); rr(c, -2.4, -19.4, 4.8, 10.8, .6); fs(c, under, .8); [-1, 1].forEach((q) => { c.beginPath(); c.moveTo(q * 4, -19.6); c.lineTo(q * .6, -19.6); c.lineTo(q * 1.2, -16.4); c.closePath(); fs(c, shade(o.shirt, .3), .8); line(c, q * 2.4, -16, q * 2.4, -8.6, .8, shade(o.shirt, -.4)); }); [-14.4, -11.6].forEach((y) => { c.fillStyle = "#fff6ea"; c.beginPath(); c.arc(-1.2, y, .45, 0, 7); c.fill(); }); }
    else if (top === "sailor") { c.beginPath(); c.moveTo(-6.4, -19.6); c.lineTo(-.9, -11.4); c.lineTo(.9, -11.4); c.lineTo(6.4, -19.6); c.lineTo(3.4, -19.6); c.lineTo(0, -15.2); c.lineTo(-3.4, -19.6); c.closePath(); fs(c, shade(o.shirt, -.3), 1); line(c, -5.2, -18.2, -.4, -12.6, .6, "#fff6ea"); line(c, 5.2, -18.2, .4, -12.6, .6, "#fff6ea"); line(c, -4.4, -17.2, -.2, -12, .5, "#fff6ea"); line(c, 4.4, -17.2, .2, -12, .5, "#fff6ea"); c.beginPath(); c.moveTo(-1.4, -15.4); c.lineTo(1.4, -15.4); c.lineTo(0, -12.6); c.closePath(); fs(c, "#c4463c", .7); }
    else if (top === "vneck" || top === "argyle" || top === "fairisle") { if (top === "argyle") { c.save(); tp(); c.clip(); for (let y = -18; y < -8; y += 3.6) for (let x = -7 + (Math.round(y / 3.6) & 1 ? 1.8 : 0); x < 8; x += 3.6) { c.beginPath(); c.moveTo(x, y - 1.8); c.lineTo(x + 1.8, y); c.lineTo(x, y + 1.8); c.lineTo(x - 1.8, y); c.closePath(); c.fillStyle = under; c.globalAlpha = .85; c.fill(); c.globalAlpha = 1; } c.strokeStyle = shade(o.shirt, -.3); c.lineWidth = .35; for (let k = -16; k < 24; k += 3.6) { c.beginPath(); c.moveTo(k - 12, -20); c.lineTo(k + 8, -6); c.moveTo(k + 8 - 12 + 24, -20); c.lineTo(k - 12 + 12 - 12, -6); c.stroke(); } c.restore(); }
      if (top === "fairisle") { c.save(); tp(); c.clip(); [-17.4, -12.4].forEach((y0, bi) => { c.fillStyle = under; c.fillRect(-8, y0 - 1.5, 16, 3); for (let x = -7; x < 8; x += 2.2) { c.fillStyle = bi ? shade(o.shirt, -.3) : "#c4463c"; c.beginPath(); c.moveTo(x, y0 - 1.5); c.lineTo(x + 1.1, y0 + .1); c.lineTo(x + 2.2, y0 - 1.5); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x, y0 + 1.5); c.lineTo(x + 1.1, y0 - .1); c.lineTo(x + 2.2, y0 + 1.5); c.closePath(); c.fill(); } }); c.restore(); }
      c.beginPath(); c.moveTo(-3.6, -19.6); c.lineTo(0, -14.4); c.lineTo(3.6, -19.6); c.closePath(); fs(c, o.skin, 1); c.fillStyle = shade(o.shirt, -.25); c.fillRect(-6.4 * bw, -10.2, 12.8 * bw, 2.2); for (let x = -6; x < 6.4; x += 1.4) { c.fillStyle = "rgba(0,0,0,.12)"; c.fillRect(x, -10.2, .3, 2.2); } }
    else if (top === "cableknit") { for (const x of [-3.8, 0, 3.8]) for (let y = -18; y < -9.6; y += 2.1) { c.beginPath(); c.ellipse(x + ((Math.round(y / 2.1) & 1) ? .7 : -.7), y, 1.1, 1.1, 0, 0, 7); c.strokeStyle = shade(o.shirt, -.3); c.lineWidth = .5; c.stroke(); } c.beginPath(); c.ellipse(0, -19.5, 3.8, 1.7, 0, 0, 7); fs(c, shade(o.shirt, -.12), .9); c.fillStyle = shade(o.shirt, -.25); c.fillRect(-6.4 * bw, -10.2, 12.8 * bw, 2.2); }
    else if (top === "cowl") { c.beginPath(); c.ellipse(0, -19.4, 5.2, 2.8, 0, 0, 7); fs(c, shade(o.shirt, .08), 1); c.beginPath(); c.ellipse(0, -20.4, 4.4, 2, 0, 0, 7); fs(c, shade(o.shirt, .18), 1); c.strokeStyle = shade(o.shirt, -.2); c.lineWidth = .4; for (let q = -3; q <= 3; q++) { c.beginPath(); c.moveTo(q * 1.2, -21.4); c.lineTo(q * 1.5, -17.4); c.stroke(); } c.fillStyle = shade(o.shirt, -.25); c.fillRect(-6.4 * bw, -10.2, 12.8 * bw, 2.2); }
    else if (top === "chunky") { c.strokeStyle = shade(o.shirt, -.22); c.lineWidth = .5; for (let y = -17.6; y < -9.6; y += 1.9) { c.beginPath(); c.moveTo(-6.2 * bw, y); c.quadraticCurveTo(0, y + .8, 6.2 * bw, y); c.stroke(); } c.beginPath(); c.ellipse(0, -19.5, 4.6, 2.1, 0, 0, 7); fs(c, shade(o.shirt, .14), 1.1); c.fillStyle = shade(o.shirt, -.3); c.fillRect(-7.2 * bw, -10.4, 14.4 * bw, 2.6); line(c, -6.4 * bw, -18.6, -7.4 * bw, -12, .6, shade(o.shirt, -.25)); line(c, 6.4 * bw, -18.6, 7.4 * bw, -12, .6, shade(o.shirt, -.25)); }
    else if (top === "ziphoodie") { c.beginPath(); c.ellipse(0, -19.6, 6.4 * bw, 3.2, 0, 0, 7); fs(c, shade(o.shirt, .14), 1.2); line(c, 0, -19.4, 0, -8.6, .8, shade(o.shirt, -.45)); c.fillStyle = "#c9b28a"; c.fillRect(-.5, -17, 1, 1.6); [-1, 1].forEach((q) => { rr(c, q * 3.6 - 1.7, -13, 3.4, 3.4, 1); c.lineWidth = .7; c.strokeStyle = shade(o.shirt, -.3); c.stroke(); line(c, q * 1.5, -18.6, q * 1.5, -15.4, .7, under); }); }
    else if (top === "varsity") { line(c, 0, -19.4, 0, -8.6, .6, shade(o.shirt, -.4)); [-17, -14, -11].forEach((y) => { c.fillStyle = "#c9b28a"; c.beginPath(); c.arc(0, y, .55, 0, 7); c.fill(); }); c.fillStyle = under; c.fillRect(-6.6 * bw, -9.8, 13.2 * bw, 1.6); c.fillRect(-3.4, -19.6, 6.8, 1.2); c.font = "800 6px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillStyle = under; c.fillText(String.fromCharCode(65 + (o.id % 26)), -3.2, -13); }
    else if (top === "denim") { c.save(); tp(); c.clip(); c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = .6; for (let y = -20; y < -8; y += 1.4) { c.beginPath(); c.moveTo(-8, y); c.lineTo(8, y); c.stroke(); } c.restore(); [-1, 1].forEach((q) => { rr(c, q * 3.5 - 1.8, -17, 3.6, 3.4, .6); c.lineWidth = .7; c.strokeStyle = "#f0b25c"; c.setLineDash([.9, .6]); c.stroke(); c.setLineDash([]); c.beginPath(); c.moveTo(q * .4, -19.6); c.lineTo(q * 4.2, -19.6); c.lineTo(q * 1.2, -16.6); c.closePath(); fs(c, shade(o.shirt, .12), .8); }); line(c, 0, -17, 0, -8.6, .6, "#f0b25c"); [-14.4, -11.6].forEach((y) => { c.fillStyle = "#c9b28a"; c.beginPath(); c.arc(0, y, .5, 0, 7); c.fill(); }); }
    else if (top === "puffer") { c.strokeStyle = shade(o.shirt, -.35); c.lineWidth = .9; [-16.6, -13.6, -10.6].forEach((y) => { c.beginPath(); c.moveTo(-6.4 * bw, y); c.quadraticCurveTo(0, y + 1.1, 6.4 * bw, y); c.stroke(); }); c.beginPath(); c.ellipse(0, -19.6, 4.2, 1.8, 0, 0, 7); fs(c, shade(o.shirt, .15), 1); line(c, 0, -19, 0, -8.6, .7, shade(o.shirt, -.45)); }
    else if (top === "raincoat") { c.beginPath(); c.ellipse(0, -19.6, 6.4 * bw, 3.2, 0, 0, 7); fs(c, shade(o.shirt, .12), 1.2); [-17, -14.2, -11.4].forEach((y) => { c.fillStyle = "#fff6ea"; c.beginPath(); c.arc(0, y, .65, 0, 7); c.fill(); }); [-1, 1].forEach((q) => { rr(c, q * 3.6 - 1.8, -13, 3.6, 3, .8); c.lineWidth = .7; c.strokeStyle = shade(o.shirt, -.3); c.stroke(); }); line(c, 0, -19.4, 0, -8.6, .5, shade(o.shirt, -.35)); }
    else if (top === "labcoat") { c.fillStyle = "#fff"; c.globalAlpha = .96; tp(); c.fill(); c.globalAlpha = 1; rr(c, -2.2, -19.4, 4.4, 10.8, .6); fs(c, under, .7); [-1, 1].forEach((q) => { c.beginPath(); c.moveTo(q * 4.2, -19.6); c.lineTo(q * .5, -19.6); c.lineTo(q * 1.4, -13.6); c.closePath(); fs(c, "#f4f7fb", .8); }); rr(c, -5.6, -14, 3, 3.2, .5); c.lineWidth = .6; c.strokeStyle = "#9aa7b4"; c.stroke(); line(c, -4.6, -15.6, -4.6, -13.4, .7, "#3b6ea8"); line(c, 0, -13.6, 0, -8.6, .5, "#9aa7b4"); }
    else if (top === "apron") { rr(c, -3.6, -17.8, 7.2, 9.8, 1.4); fs(c, under, 1); line(c, -3, -17.6, -4.6, -19.6, .9, under); line(c, 3, -17.6, 4.6, -19.6, .9, under); rr(c, -2, -13.4, 4, 3, .6); c.lineWidth = .6; c.strokeStyle = shade(under, -.3); c.stroke(); line(c, -3.6, -11, -6.8, -11.4, .8, under); line(c, 3.6, -11, 6.8, -11.4, .8, under); }
    else if (top === "polo") { [-1, 1].forEach((q) => { c.beginPath(); c.moveTo(q * 4.2, -19.6); c.lineTo(q * .4, -19.6); c.lineTo(q * .3, -15.4); c.closePath(); fs(c, shade(o.shirt, .3), .8); }); line(c, 0, -17.6, 0, -13.4, .5, shade(o.shirt, -.3)); [-16.6, -14.6].forEach((y) => { c.fillStyle = "#fff6ea"; c.beginPath(); c.arc(0, y, .45, 0, 7); c.fill(); }); }
    else if (top === "turtleneck") { c.beginPath(); c.ellipse(0, -19.7, 4.4, 2.6, 0, 0, 7); fs(c, shade(o.shirt, .1), 1); for (let q = -2; q <= 2; q++) line(c, q * 1.3, -21.4, q * 1.3, -18.2, .4, shade(o.shirt, -.25)); }
    else if (top === "cardigan") { rr(c, -2.3, -19.4, 4.6, 10.6, 1); fs(c, under, .9); [-1, 1].forEach((q) => line(c, q * 2.3, -19.4, q * 2.3, -9, .9, shade(o.shirt, -.3))); [-17, -14, -11].forEach((y) => { c.fillStyle = shade(o.shirt, .35); c.beginPath(); c.arc(1.2, y, .5, 0, 7); c.fill(); }); }
    else if (top === "track") { line(c, 0, -19.4, 0, -9, .8, shade(o.shirt, -.4)); [-1, 1].forEach((q) => line(c, q * 6.1 * bw, -19.2, q * 5.8 * bw, -9.6, 1.1, under)); c.fillStyle = shade(o.shirt, -.25); c.fillRect(-1.2, -19.6, 2.4, 1.4); }
    else if (top === "dress") { c.fillStyle = shade(o.shirt, -.35); c.fillRect(-6.4 * bw, -13.2, 13.2 * bw, 1.2); }
  }
  if (up) extraBack();
  if (up) { if (packStyle !== "none") { rr(c, -6, -19, 12, 10.5, 4); fs(c, pack, 1.3); c.fillStyle = "rgba(255,255,255,.3)"; c.fillRect(-4, -17.5, 8, 2); } }
  else if (!side && packStyle === "pack") { line(c, -3.6, -19.2, -3.6, -11, 1.5, pack); line(c, 3.6, -19.2, 3.6, -11, 1.5, pack); }
  else if (!side && packStyle === "messenger") { line(c, -5.6, -19.2, 5.2, -9.8, 1.5, pack); rr(c, 3.2, -12.6, 5.6, 5, 1.6); fs(c, pack, 1.1); }
  if (o.scarf) { c.beginPath(); c.ellipse(0, -19.4, 6.6 * bw, 2.4, 0, 0, 7); fs(c, o.scarf, 1.2); if (!up && !side) { rr(c, 1.6, -19, 3.2, 8, 1.4); fs(c, o.scarf, 1.1); c.fillStyle = "rgba(255,255,255,.4)"; c.fillRect(1.9, -15.6, 2.6, .9); } }
  if (o.neckwear && o.neckwear !== "none" && !up) {
    const nc = o.neckColor || "#c4463c", nw = o.neckwear;
    if (nw === "necklace") { c.beginPath(); c.moveTo(-3.4, -19.6); c.quadraticCurveTo(0, side ? -15.6 : -14.4, 3.4, -19.6); c.strokeStyle = nc; c.lineWidth = .8; c.stroke(); c.beginPath(); c.arc(0, side ? -16.2 : -15.2, 1, 0, 7); fs(c, nc, .5); }
    else if (nw === "bowtie") { [-1, 1].forEach((q) => { c.beginPath(); c.moveTo(0, -19); c.lineTo(q * 3.6, -20.6); c.lineTo(q * 3.6, -17.4); c.closePath(); fs(c, nc, .8); }); c.beginPath(); c.arc(0, -19, .9, 0, 7); fs(c, shade(nc, .2), .6); }
    else if (nw === "tie" && !side) { c.beginPath(); c.moveTo(-1.1, -19.6); c.lineTo(1.1, -19.6); c.lineTo(.9, -17.8); c.lineTo(-.9, -17.8); c.closePath(); fs(c, nc, .7); c.beginPath(); c.moveTo(-.9, -17.8); c.lineTo(.9, -17.8); c.lineTo(1.6, -11.6); c.lineTo(0, -10.4); c.lineTo(-1.6, -11.6); c.closePath(); fs(c, nc, .8); }
    else if (nw === "bandana") { c.beginPath(); c.moveTo(-4.6, -20.4); c.quadraticCurveTo(0, -19.4, 4.6, -20.4); c.lineTo(0, -15); c.closePath(); fs(c, nc, 1); c.fillStyle = "rgba(255,255,255,.55)"; [[-2, -19], [1.6, -18.6], [-.2, -16.8]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, .5, 0, 7); c.fill(); }); }
    else if (nw === "lanyard" && !side) { line(c, -2.6, -19.6, -.6, -12.6, .6, nc); line(c, 2.6, -19.6, .6, -12.6, .6, nc); rr(c, -1.8, -12.8, 3.6, 4.6, .8); fs(c, "#fffaf2", .7); c.fillStyle = "#4F91C7"; c.fillRect(-1.2, -12.2, 2.4, .9); }
  }
  extraFront();
  if (o.tag) { c.beginPath(); c.moveTo(-6, -19.5); c.lineTo(-1, -8.5); c.lineTo(-6.6, -9); c.closePath(); c.fillStyle = "#c4463c"; c.fill(); c.beginPath(); c.moveTo(6, -19.5); c.lineTo(1, -8.5); c.lineTo(6.6, -9); c.closePath(); c.fill(); }
  if (o.badge && !up && !side) { c.beginPath(); c.arc(-3.8, -15.4, 1.5, 0, 7); fs(c, o.badge, .9); }
  if (!side) { arm(-1); arm(1); } else arm(fl * 1, true);
  if (adult) c.scale(1, 1 / SY);
  // ---- head + hair (back layer)
  c.save(); headFrame();
  const HX = (adult ? 8.1 : 8.9) * hs, HY = (adult ? 9.2 : 8.3) * hs;
  if (up) drawBack();
  if (!side) [-1, 1].forEach((s) => { const e = o.earShape || "round";
    if (e === "pointy") { c.beginPath(); c.moveTo(s * 8.2, hy - 2); c.lineTo(s * 12.6, hy - 5.6); c.lineTo(s * 9, hy + 3.4); c.closePath(); fs(c, o.skin, 1); c.strokeStyle = "rgba(160,90,80,.4)"; c.lineWidth = .5; c.beginPath(); c.moveTo(s * 9, hy - 1.6); c.lineTo(s * 11, hy - 3.6); c.stroke(); }
    else { c.beginPath(); c.arc(s * (e === "big" ? 9.2 : 8.7), hy + 1, e === "big" ? 2.9 : e === "small" ? 1.3 : 2, 0, 7); fs(c, o.skin, 1); } });
  if (!up || !HAIR_LONG.includes(st)) neck(hy + HY - 3.4, hy + HY + 2.5, true);       // the neck always shows in front of back-hair; from behind, long hair may hide it
  { const fsh = o.faceShape || "oval", h0 = side ? fl * .6 : 0; c.beginPath();
    if (fsh === "round") c.ellipse(h0, hy, HX * 1.05, HY * .96, 0, 0, 7); else if (fsh === "long") c.ellipse(h0, hy, HX * .94, HY * 1.07, 0, 0, 7);
    else if (fsh === "square") rr(c, h0 - HX * .98, hy - HY * .94, HX * 1.96, HY * 1.9, 5.8);
    else if (fsh === "heart") { c.moveTo(h0 - HX, hy - 1); c.bezierCurveTo(h0 - HX, hy - HY * 1.3, h0 + HX, hy - HY * 1.3, h0 + HX, hy - 1); c.bezierCurveTo(h0 + HX, hy + HY * .5, h0 + 2.2, hy + HY * 1.06, h0, hy + HY * 1.05); c.bezierCurveTo(h0 - 2.2, hy + HY * 1.06, h0 - HX, hy + HY * .5, h0 - HX, hy - 1); c.closePath(); }
    else c.ellipse(h0, hy, HX, HY, 0, 0, 7);
    fs(c, o.skin, 1.5); }
  c.fillStyle = "rgba(120,70,60,.13)"; c.beginPath(); c.ellipse(3, hy + 3, 7.5, 6, 0, 0, 7); c.fill();
  // ---- face
  const browFns = [];
  if (!up) {
    const blink = (t * .9 + o.id * 1.7) % 4 < .13, ex = side ? [fl * 4.4] : [-3.5, 3.5], es = o.eyeShape || "round", ec = o.eyeColor, brow = o.brow || "soft", bc = o.browColor || o.hair;
    ex.forEach((x, k) => {
      const ecx = k === 1 && o.eyeColor2 ? o.eyeColor2 : ec;
      if (blink || es === "happy" || (es === "wink" && k === 0 && !side)) { c.strokeStyle = "#3a2a30"; c.lineWidth = 1.1; c.beginPath(); if (es === "happy" && !blink) c.arc(x, hy + .6, 1.7, Math.PI * 1.1, Math.PI * 1.9); else { c.moveTo(x - 1.6, hy); c.lineTo(x + 1.6, hy); } c.stroke(); }
      else {
        const ak = adult ? 0.74 : 1, rx = (es === "wide" || es === "cute" ? 2.1 : es === "oval" ? 1.4 : 1.7) * ak, ry = (es === "wide" ? 2.7 : es === "oval" ? 2.7 : es === "cute" ? 3.1 : 2.3) * (adult ? 0.82 : 1);
        c.fillStyle = ecx || "#3a2a30"; c.beginPath(); c.ellipse(x, hy, rx, ry, 0, 0, 7); c.fill();
        if (ecx) { c.fillStyle = "#2a1d22"; c.beginPath(); c.ellipse(x, hy + .2, rx * .5, ry * .55, 0, 0, 7); c.fill(); }
        c.fillStyle = "#fff"; c.beginPath(); c.arc(x - .5, hy - .9, es === "wide" || es === "cute" ? .95 : .7, 0, 7); c.fill(); if (es === "cute") { c.beginPath(); c.arc(x + .7, hy + 1, .45, 0, 7); c.fill(); }
        if (es === "tired") { c.strokeStyle = shade(o.skin, .3); c.lineWidth = .7; c.beginPath(); c.moveTo(x - 1.5, hy + 2.7); c.quadraticCurveTo(x, hy + 3.5, x + 1.5, hy + 2.7); c.stroke(); }
        if (es === "sleepy" || es === "tired") { c.fillStyle = o.skin; c.beginPath(); c.ellipse(x, hy - 1.1, rx + .5, ry * .62, 0, Math.PI, 2 * Math.PI); c.fill(); c.strokeStyle = "#3a2a30"; c.lineWidth = .9; c.beginPath(); c.moveTo(x - rx - .4, hy - .6); c.lineTo(x + rx + .4, hy - .6); c.stroke(); }
        if (es === "lash") { c.strokeStyle = "#3a2a30"; c.lineWidth = .8; const sg = side ? fl : (k ? 1 : -1); c.beginPath(); c.moveTo(x + sg * rx, hy - 1); c.lineTo(x + sg * (rx + 1.4), hy - 2.2); c.moveTo(x + sg * rx, hy - .1); c.lineTo(x + sg * (rx + 1.6), hy - .6); c.stroke(); }
      }
      if (!blink && o.eyeShadow && es !== "happy") { c.fillStyle = o.eyeShadow; c.globalAlpha = .55; c.beginPath(); c.ellipse(x, hy - 2.1, 2.6, 1.2, 0, 0, 7); c.fill(); c.globalAlpha = 1; }
      if (!blink && o.liner && es !== "happy") { c.strokeStyle = "#2a1d22"; c.lineWidth = .8; c.lineCap = "round"; const sgl = side ? fl : (k ? 1 : -1); c.beginPath(); c.moveTo(x - 2.2, hy - 1.7); c.quadraticCurveTo(x, hy - 3, x + 2.2, hy - 1.7); c.lineTo(x + sgl * 3.6, hy - 2.7); c.stroke(); }
      browFns.push(() => {
      if (brow !== "none") {
        const bw0 = (brow === "thick" ? 1.6 : brow === "thin" ? .6 : .9) + (adult ? 0.45 : 0), bcc = shade(bc, -.3); c.lineCap = "round"; const strokeBrow = () => { c.strokeStyle = "rgba(255,246,234,.38)"; c.lineWidth = bw0 + 1.1; c.stroke(); c.strokeStyle = bcc; c.lineWidth = bw0; c.stroke(); }; c.beginPath();
        if (brow === "worried" || brow === "angled") { const hi = brow === "worried" ? 1 : -1, ik = side ? 0 : k ? 1 : 0; const a1 = ik ? 4.8 : 3.2, a2 = ik ? 3.2 : 4.8; c.moveTo(x - 2, hy - (hi > 0 ? a1 : a2)); c.lineTo(x + 2, hy - (hi > 0 ? a2 : a1)); } else if (brow === "arch") { c.moveTo(x - 2, hy - 3.2); c.quadraticCurveTo(x, hy - 5.2, x + 2, hy - 3.6); } else if (adult) { const sg = side ? 1 : (k ? 1 : -1); c.moveTo(x - 2.2 * sg, hy - 3.5); c.lineTo(x + 2.2 * sg, hy - 4.3); } else { c.moveTo(x - 2, hy - 3.6); c.lineTo(x + 2, hy - 3.9); } strokeBrow();
      }
      if (brow === "unibrow" && k === 0 && !side) { c.lineCap = "round"; c.beginPath(); c.moveTo(-3.8, hy - 3.7); c.lineTo(3.8, hy - 3.7); c.strokeStyle = "rgba(255,246,234,.38)"; c.lineWidth = 2.7; c.stroke(); c.strokeStyle = shade(bc, -.3); c.lineWidth = 1.2; c.stroke(); }
      });
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
    if (o.mark && o.mark !== "none") {
      const mk = o.mark, fx = side ? fl * 5.4 : 4.8;
      if (mk === "bandaid") { c.save(); c.translate(fx, hy + 3.4); c.rotate(-.5); rr(c, -2.4, -.9, 4.8, 1.8, .6); fs(c, "#f2c9a0", .7); c.fillStyle = "#d9a070"; c.fillRect(-.6, -.9, 1.2, 1.8); c.restore(); }
      else if (mk === "dimples") { c.strokeStyle = shade(o.skin, .3); c.lineWidth = .6; c.lineCap = "round"; (side ? [fl * 5.4] : [-4.6, 4.6]).forEach((x) => { c.beginPath(); c.arc(x, hy + 4.4, .8, -.7, .8); c.stroke(); }); }
      else if (mk === "birthmark") { c.fillStyle = "rgba(120,70,50,.38)"; c.beginPath(); c.ellipse(side ? fl * 5.6 : -5, hy + 2.8, 1.5, 1.1, .4, 0, 7); c.fill(); }
      else if (mk === "braces") { /* drawn after the mouth */ }
      else if (mk === "star") star(c, side ? fl * 5.6 : -5.2, hy + 3.2, 1.6, "#EAB94E");
      else if (mk === "paint") (side ? [fl * 5.6] : [-5.4, 5.4]).forEach((x) => heart(c, x, hy + 3.2, 1, "#e8789a"));
      else if (mk === "scar") { c.strokeStyle = shade(o.skin, .45); c.lineWidth = .7; c.beginPath(); c.moveTo(fx - .6, hy - 5.2); c.lineTo(fx + .8, hy - 2.2); c.stroke(); c.lineWidth = .4; c.beginPath(); c.moveTo(fx - 1, hy - 4.2); c.lineTo(fx + .6, hy - 4.6); c.moveTo(fx - .6, hy - 3); c.lineTo(fx + 1.1, hy - 3.4); c.stroke(); }
      else if (mk === "glitter") { c.fillStyle = "#fff6ea"; [[-5.6, hy + 2.6], [-4.4, hy + 3.6], [-6.4, hy + 3.8], [5.6, hy + 2.6], [4.4, hy + 3.6], [6.4, hy + 3.8]].forEach(([x, y], i) => { c.beginPath(); c.arc(side ? fl * (Math.abs(x) - .4) : x, y, .55, 0, 7); c.fillStyle = i % 2 ? "#f8d977" : "#bfe6f5"; c.fill(); }); }
    }
    if (o.nose || adult || (o.noseShape && o.noseShape !== "button")) { c.strokeStyle = shade(o.skin, .3); c.lineWidth = .8; c.lineCap = "round"; c.beginPath(); const nx = side ? fl * 6.4 : 0, nsp = o.noseShape || "button";
      if (nsp === "pointy") { c.moveTo(nx, hy + .6); c.lineTo(nx + (side ? fl * 1.2 : -.9), hy + 3.2); c.lineTo(nx + (side ? 0 : .9), hy + 3.2); c.stroke(); }
      else if (nsp === "wide") { c.arc(nx - (side ? 0 : .8), hy + 2.8, .8, .1 * Math.PI, .9 * Math.PI); c.stroke(); c.beginPath(); c.arc(nx + (side ? fl * .8 : .8), hy + 2.8, .8, .1 * Math.PI, .9 * Math.PI); c.stroke(); }
      else if (nsp === "round") { c.fillStyle = shade(o.skin, .12); c.arc(nx, hy + 2.4, 1.2, 0, 7); c.fill(); c.stroke(); }
      else { c.arc(nx, hy + 2.6, .9, .1 * Math.PI, .9 * Math.PI); c.stroke(); } }
    if (o.nosePin && !up) { c.beginPath(); c.arc(side ? fl * 6.9 : 1.9, hy + 3.2, .65, 0, 7); fs(c, o.nosePin, .4); }
    facialHair(c, o, hy, side, fl);
    const mx = side ? fl * 3.6 : 0, my = hy + 4.7, ms = o.mouthStyle || "smile", lc = o.lip || "#8a4650";
    if (o.mouth) { c.fillStyle = "#7A3B3B"; c.beginPath(); c.ellipse(mx, hy + 4.8, 1.7, .7 + o.mouth * 1.5, 0, 0, 7); c.fill(); }
    else if (ms === "grin") { c.beginPath(); c.moveTo(mx - 2.4, my - .9); c.quadraticCurveTo(mx, my + 2.8, mx + 2.4, my - .9); c.closePath(); c.fillStyle = "#fff"; c.fill(); c.strokeStyle = lc; c.lineWidth = .9; c.stroke(); }
    else if (ms === "smirk") { c.strokeStyle = lc; c.lineWidth = 1; c.lineCap = "round"; c.beginPath(); c.moveTo(mx - 1.8, my); c.quadraticCurveTo(mx + .4, my + 1, mx + 2.2, my - .8); c.stroke(); }
    else if (ms === "flat") { c.strokeStyle = lc; c.lineWidth = 1; c.lineCap = "round"; c.beginPath(); c.moveTo(mx - 1.5, my); c.lineTo(mx + 1.5, my); c.stroke(); }
    else if (ms === "o") { c.fillStyle = "#7A3B3B"; c.beginPath(); c.ellipse(mx, my + .2, 1, 1.2, 0, 0, 7); c.fill(); }
    else if (ms === "tongue") { c.beginPath(); c.moveTo(mx - 2.2, my - .8); c.quadraticCurveTo(mx, my + 2.6, mx + 2.2, my - .8); c.closePath(); c.fillStyle = "#7A3B3B"; c.fill(); c.beginPath(); c.ellipse(mx + .2, my + 1.1, 1.1, .9, 0, 0, 7); c.fillStyle = "#f08a9a"; c.fill(); }
    else if (ms === "teeth") { c.beginPath(); c.moveTo(mx - 2.5, my - .7); c.quadraticCurveTo(mx, my + 3, mx + 2.5, my - .7); c.closePath(); c.fillStyle = "#fff"; c.fill(); c.strokeStyle = lc; c.lineWidth = .8; c.stroke(); c.beginPath(); c.moveTo(mx - 2.2, my - .1); c.lineTo(mx + 2.2, my - .1); c.strokeStyle = "rgba(122,59,59,.45)"; c.lineWidth = .4; c.stroke(); }
    else if (ms === "pout") { c.beginPath(); c.ellipse(mx, my + .3, 1.3, .85, 0, 0, 7); c.fillStyle = lc; c.fill(); }
    else if (ms === "gap") { c.strokeStyle = lc; c.lineWidth = 1; c.lineCap = "round"; c.beginPath(); c.arc(mx, my - .6, 2.1, .12 * Math.PI, .88 * Math.PI); c.stroke(); c.fillStyle = "#fff"; c.fillRect(mx - 1.1, my + 1.3, .9, 1); c.fillRect(mx + .2, my + 1.3, .9, 1); }
    else if (ms === "cat") { c.strokeStyle = lc; c.lineWidth = .9; c.lineCap = "round"; c.beginPath(); c.arc(mx - 1, my - .4, 1.1, .1 * Math.PI, .9 * Math.PI); c.arc(mx + 1, my - .4, 1.1, .1 * Math.PI, .9 * Math.PI); c.stroke(); }
    else { c.strokeStyle = lc; c.lineWidth = 1; c.lineCap = "round"; c.beginPath(); c.arc(mx, hy + (adult ? 5.4 : 4.6), adult ? 1.35 : 1.7, .15 * Math.PI, .85 * Math.PI); c.stroke(); }
  }
  if (!up && o.mark === "braces") { const bx = side ? fl * 3.6 : 0; c.strokeStyle = "#9da7aa"; c.lineWidth = .7; c.beginPath(); c.moveTo(bx - 1.8, hy + 5.2); c.quadraticCurveTo(bx, hy + 6, bx + 1.8, hy + 5.2); c.stroke(); c.fillStyle = "#9da7aa"; for (let q = -1; q <= 1; q++) { c.beginPath(); c.arc(bx + q * 1.1, hy + 5.6 - Math.abs(q) * .15, .35, 0, 7); c.fill(); } }
  if (!up && xt === "mask") { c.beginPath(); if (side) { c.moveTo(fl * 2, hy + 1.4); c.lineTo(fl * 8.4, hy + 2.4); c.lineTo(fl * 7.6, hy + 8.4); c.lineTo(fl * 2, hy + 8.6); } else { c.moveTo(-7.4, hy + 1.8); c.lineTo(7.4, hy + 1.8); c.lineTo(6.8, hy + 8); c.quadraticCurveTo(0, hy + 10.6, -6.8, hy + 8); } c.closePath(); fs(c, "#d9eef8", 1); c.strokeStyle = "rgba(60,110,150,.45)"; c.lineWidth = .5; for (const y of [3.8, 5.8, 7.6]) { c.beginPath(); c.moveTo(side ? fl * 2.4 : -6.6, hy + y); c.lineTo(side ? fl * 7.6 : 6.6, hy + y + .2); c.stroke(); } if (!side) { c.strokeStyle = OUT; c.lineWidth = .7; c.beginPath(); c.moveTo(-7.4, hy + 2.6); c.lineTo(-9, hy + 1); c.moveTo(7.4, hy + 2.6); c.lineTo(9, hy + 1); c.stroke(); } }
  if (!up && xt === "eyepatch") { c.beginPath(); c.ellipse(side ? fl * 4.4 : 3.5, hy, 2.7, 2.5, 0, 0, 7); fs(c, "#2a2a32", 1); if (!side) { c.strokeStyle = "#2a2a32"; c.lineWidth = .8; c.beginPath(); c.moveTo(.9, hy - .6); c.lineTo(-8.8, hy - 2.4); c.moveTo(6, hy - .8); c.lineTo(8.8, hy - 2.6); c.stroke(); } }
  // ---- hair (front layer)
  const sx = side ? -fl * 1.6 : 0, cap = () => {           // side views are drawn as "facing right" and mirrored for left
    const m = side ? fl : 1, q = side ? -1.6 : 0; if (side) { c.save(); c.scale(m, 1); }
    c.beginPath();
    if (side) { c.moveTo(-9.2 + q, hy + 5.4); c.lineTo(-9.3 + q, hy + .5); c.bezierCurveTo(-11 + q, hy - 14, 11 + q, hy - 14, 9.3 + q, hy + .5); c.quadraticCurveTo(7 + q, hy - 5.4, 4 + q, hy - 4.6); c.lineTo(-2.6 + q, hy - 1.6); c.lineTo(-5.4 + q, hy + 3.6); }
    else { c.moveTo(-9.3, hy + .5); c.bezierCurveTo(-11, hy - 14, 11, hy - 14, 9.3, hy + .5); c.quadraticCurveTo(6, hy - 3.4, 2, hy - 4.4); c.quadraticCurveTo(-3, hy - 6, -9.3, hy + .5); }
    c.closePath(); if (side) c.restore();
  };
  if (up && st === "bald") { c.beginPath(); c.ellipse(0, hy - .4, 9.4, 8.9, 0, 0, 7); fs(c, o.skin, 1.4); c.fillStyle = "rgba(255,255,255,.25)"; c.beginPath(); c.ellipse(-2.5, hy - 4, 3.5, 2, 0, 0, 7); c.fill(); }
  else if (up && (st === "balding" || st === "fade" || st === "undercut" || st === "mohawk" || st === "sidecut")) { c.beginPath(); c.ellipse(0, hy - .4, 9.4, 8.9, 0, 0, 7); fs(c, st === "balding" || st === "fade" ? HG : o.skin, 1.4); if (st === "balding") { c.beginPath(); c.ellipse(0, hy - 5, 6, 4.4, 0, 0, 7); fs(c, o.skin, 1); } else if (st === "fade") { c.fillStyle = mkG(0, hy - 9, 0, hy + 8, [[0, hc], [.45, hc], [.95, o.skin]]); c.beginPath(); c.ellipse(0, hy - .4, 9.2, 8.7, 0, 0, 7); c.fill(); } else { c.beginPath(); c.ellipse(0, hy - 6, st === "mohawk" ? 2.6 : 6.4, 5, 0, 0, 7); fs(c, HG, 1.1); } }
  else if (up) { c.beginPath(); c.ellipse(0, hy - .4, 9.4, 8.9, 0, 0, 7); fs(c, HG, 1.4); c.fillStyle = "rgba(255,255,255,.2)"; c.beginPath(); c.ellipse(-2.5, hy - 4, 3.5, 2, 0, 0, 7); c.fill(); }
  else if (st === "buzz") { c.beginPath(); c.moveTo(-8.8 + sx, hy - 1.2); c.bezierCurveTo(-10 + sx, hy - 11, 10 + sx, hy - 11, 8.8 + sx, hy - 1.2); c.quadraticCurveTo(0, hy - 4.6, -8.8 + sx, hy - 1.2); c.closePath(); fs(c, HG, 1.3); }
  else if (st === "undercut") { cap(); fs(c, o.skin, 1.3); c.fillStyle = "rgba(90,60,60,.10)"; c.fill(); c.beginPath(); c.moveTo(-7 + sx, hy - 4); c.bezierCurveTo(-8 + sx, hy - 17, 9 + sx, hy - 16, 7.4 + sx, hy - 4); c.quadraticCurveTo(0, hy - 6, -7 + sx, hy - 4); c.closePath(); fs(c, HG, 1.3); }
  else if (st === "spiky" || st === "messy") { cap(); fs(c, HG, 1.4); const n = st === "spiky" ? 6 : 4; for (let i = 0; i < n; i++) { const a = -Math.PI * (.12 + .76 * i / (n - 1)), bx = Math.cos(a + Math.PI) * 7.6 + sx, by = hy - 3 + Math.sin(a) * 5.4, ln = st === "spiky" ? 6.4 : 4.4 + (i % 2) * 1.6; c.beginPath(); c.moveTo(bx - 2.1, by + 1.4); c.lineTo(bx + (i - n / 2) * .8, by - ln); c.lineTo(bx + 2.1, by + 1.4); c.closePath(); fs(c, HG, 1.2); } cap(); fs(c, HG, 1.2); }
  else if (st === "sidebang" || st === "pixie") { cap(); fs(c, HG, 1.4); c.beginPath(); c.moveTo(-9 + sx, hy - 6); c.quadraticCurveTo(2 + sx, hy - 12, 9.4 + sx, hy - 1.4); c.quadraticCurveTo(st === "pixie" ? 4 + sx : -1 + sx, hy - 3.6, -9 + sx, hy - 6); c.closePath(); fs(c, HG, 1.2); if (st === "pixie" && !side) [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(s * 9.2, hy - 1); c.lineTo(s * 10.4, hy + 5); c.lineTo(s * 7.6, hy + 1); c.closePath(); fs(c, HG, 1); }); }
  else if (st === "curtains") { cap(); fs(c, HG, 1.4); if (!side) { c.strokeStyle = shade(hc, .35); c.lineWidth = 1; c.beginPath(); c.moveTo(0, hy - 9.4); c.quadraticCurveTo(-1.2, hy - 6, -.2, hy - 3.6); c.stroke(); } }
  else if (st === "bald") { c.fillStyle = "rgba(255,255,255,.28)"; c.beginPath(); c.ellipse(-3 + sx, hy - 6.4, 3, 1.4, -.3, 0, 7); c.fill(); }
  else if (st === "fade") { cap(); fs(c, mkG(0, hy - 10, 0, hy + 1, [[0, hc], [.42, hc], [.9, o.skin]]), 1.3); c.fillStyle = "rgba(90,60,60,.08)"; c.fill(); c.beginPath(); c.moveTo(-6.4 + sx, hy - 5.2); c.bezierCurveTo(-7.4 + sx, hy - 16, 8.4 + sx, hy - 15.4, 6.6 + sx, hy - 5.2); c.quadraticCurveTo(sx, hy - 7.6, -6.4 + sx, hy - 5.2); c.closePath(); fs(c, HG, 1.2); }
  else if (st === "sidecut") { cap(); fs(c, HG, 1.4); c.beginPath(); if (side) c.ellipse(-fl * 1.4, hy - 2.6, 3, 3.8, 0, 0, 7); else { c.moveTo(-9.2, hy + .4); c.bezierCurveTo(-9.8, hy - 6.4, -6.6, hy - 8.4, -4.6, hy - 3.8); c.lineTo(-4.6, hy + .2); c.quadraticCurveTo(-7, hy + 1.2, -9.2, hy + .4); c.closePath(); } fs(c, o.skin, 1); c.fillStyle = "rgba(90,60,60,.09)"; c.fill(); }
  else if (st === "balding") { cap(); fs(c, HG, 1.4); c.beginPath(); c.ellipse(side ? -fl * 1.6 : 0, hy - 6.4, side ? 5.4 : 6.8, 4.6, 0, 0, 7); fs(c, o.skin, 1); c.fillStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.ellipse(-2.2 + sx, hy - 8, 2.4, 1.1, -.3, 0, 7); c.fill(); }
  else if (st === "receding") { cap(); fs(c, HG, 1.4); if (!side) [-1, 1].forEach((q) => { c.beginPath(); c.moveTo(q * 9.2, hy - 1.2); c.quadraticCurveTo(q * 6.8, hy - 8, q * 2.4, hy - 4.8); c.quadraticCurveTo(q * 5.6, hy - 3.8, q * 6.4, hy + .2); c.closePath(); fs(c, o.skin, 1); }); else { c.beginPath(); c.moveTo(fl * 6.4 + sx, hy - 6); c.quadraticCurveTo(fl * 8.8 + sx, hy - 3.6, fl * 9 + sx, hy); c.quadraticCurveTo(fl * 5.6 + sx, hy - 2.4, fl * 6.4 + sx, hy - 6); c.closePath(); fs(c, o.skin, 1); } }
  else if (st === "flattop") { c.beginPath(); c.moveTo(-8.8 + sx, hy - 1); c.lineTo(-8.5 + sx, hy - 12.6); c.quadraticCurveTo(sx, hy - 13.8, 8.5 + sx, hy - 12.6); c.lineTo(8.8 + sx, hy - 1); c.quadraticCurveTo(sx, hy - 4.6, -8.8 + sx, hy - 1); c.closePath(); fs(c, HG, 1.3); c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(-6 + sx, hy - 12.2, 12, 1.2); }
  else if (st === "pompadour") { cap(); fs(c, HG, 1.4); c.beginPath(); c.moveTo(-8.4 + sx, hy - 4); c.bezierCurveTo(-12 + sx, hy - 19, 10 + sx, hy - 21, 9 + sx, hy - 4); c.quadraticCurveTo(sx, hy - 9, -8.4 + sx, hy - 4); c.closePath(); fs(c, HG, 1.3); }
  else if (st === "quiff") { cap(); fs(c, HG, 1.4); c.beginPath(); c.moveTo(-3 + sx, hy - 7); c.bezierCurveTo(-5 + sx, hy - 16, 9 + sx, hy - 17.5, 8.4 + sx, hy - 5); c.quadraticCurveTo(3 + sx, hy - 8.4, -3 + sx, hy - 7); c.closePath(); fs(c, HG, 1.3); }
  else if (st === "bantuknots") { cap(); fs(c, HG, 1.4); [[-6.8, -6.6], [-3.4, -10], [0, -11.4], [3.4, -10], [6.8, -6.6]].forEach(([x, y]) => { c.beginPath(); c.arc(x + sx, hy + y, 2.7, 0, 7); fs(c, HG, 1.1); c.strokeStyle = shade(hc, -.3); c.lineWidth = .5; c.beginPath(); c.arc(x + sx, hy + y, 1.2, 0, 5); c.stroke(); }); }
  else if (st === "highpony") { cap(); fs(c, HG, 1.4); c.beginPath(); c.arc(sx, hy - 10.4, 2.4, 0, 7); fs(c, shade(hc, -.15), 1.1); c.beginPath(); c.arc(sx, hy - 12.6, 1.3, 0, 7); fs(c, "#e07a66", .8); }
  else if (st === "hime") { cap(); fs(c, HG, 1.4); if (!side) { [-1, 1].forEach((q) => { c.beginPath(); c.moveTo(q * 8.2, hy - 2); c.lineTo(q * 9.6, hy + 9.4); c.lineTo(q * 7.4, hy + 9.4); c.lineTo(q * 7, hy); c.closePath(); fs(c, HG, 1); }); } }
  else if (st === "mohawk") { c.beginPath(); c.moveTo(-8.8 + sx, hy - 1.4); c.bezierCurveTo(-10 + sx, hy - 10, 10 + sx, hy - 10, 8.8 + sx, hy - 1.4); c.quadraticCurveTo(sx, hy - 4.4, -8.8 + sx, hy - 1.4); c.closePath(); fs(c, o.skin, 1.1); c.fillStyle = "rgba(90,60,60,.10)"; c.fill(); const wd = side ? 3 : 3.4; c.beginPath(); c.moveTo(-wd + sx, hy - 3.6); for (let i = 0; i < 5; i++) { const x = -wd + (2 * wd * i) / 4; c.lineTo(x + sx, hy - 11.4 - (i === 2 ? 2.6 : i % 2 ? .6 : 0)); if (i < 4) c.lineTo(x + wd / 4 + sx, hy - 9.6); } c.lineTo(wd + sx, hy - 3.6); c.closePath(); fs(c, HG, 1.2); }
  else if (st === "bowl") { c.beginPath(); c.moveTo(-10 + sx, hy + 3.4); c.bezierCurveTo(-11.6 + sx, hy - 14, 11.6 + sx, hy - 14, 10 + sx, hy + 3.4); c.lineTo(8.6 + sx, hy - 1.4); c.quadraticCurveTo(sx, hy - 4.4, -8.6 + sx, hy - 1.4); c.closePath(); fs(c, HG, 1.3); }
  else if (st === "slick") { cap(); fs(c, HG, 1.4); c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 1.4; c.lineCap = "round"; c.beginPath(); c.moveTo(-6 + sx, hy - 7.4); c.quadraticCurveTo(sx, hy - 11, 6 + sx, hy - 6.6); c.stroke(); }
  else if (st === "cornrows") { cap(); fs(c, HG, 1.4); c.strokeStyle = shade(hc, .38); c.lineWidth = .8; c.lineCap = "round"; [-6, -3.6, -1.2, 1.2, 3.6, 6].forEach((i) => { c.beginPath(); c.moveTo(i * 1.15 + sx, hy - 3.6 + Math.abs(i) * .22); c.quadraticCurveTo(i * .9 + sx, hy - 8, i * .35 + sx, hy - 11); c.stroke(); }); }
  else if (st === "afro") { c.beginPath(); c.moveTo(-9 + sx, hy - 1); c.bezierCurveTo(-10 + sx, hy - 13, 10 + sx, hy - 13, 9 + sx, hy - 1); c.quadraticCurveTo(0 + sx, hy - 5.4, -9 + sx, hy - 1); c.closePath(); fs(c, HG, 1.3); }
  else { cap(); fs(c, HG, 1.4); }
  if (st !== "buzz") {                                                    // defined strands: flowing lines over the hair so it reads as hair, not a flat shape
    c.save(); c.strokeStyle = shade(hc, -.34); c.globalAlpha = .75; c.lineWidth = .6; c.lineCap = "round";
    const sg = (i) => (i < 0 ? -1 : 1);
    const inHair = (x, y) => (x / 9) ** 2 + ((y - (hy - 3)) / 8) ** 2 < 1 && y < hy - 1;
    if (tx === "curly" || tx === "coily") { const rr2 = tx === "coily" ? .85 : 1.35, stp = tx === "coily" ? 2.3 : 3.1; for (let y = hy - 10; y < hy - 1.6; y += stp * .86) for (let x = -8 + ((Math.round(y) & 1) ? stp / 2 : 0); x < 8.4; x += stp) if (inHair(x, y)) { c.beginPath(); c.arc(x + sx, y, rr2, 0, Math.PI * 1.75); c.stroke(); } }
    else if (tx === "braided") { for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(-4.6 + sx, hy - 10.4 + k * 1.9); c.lineTo(sx, hy - 8.4 + k * 1.9); c.lineTo(4.6 + sx, hy - 10.4 + k * 1.9); c.stroke(); } }
    else if (tx === "silky") { c.globalAlpha = .9; c.strokeStyle = "rgba(255,255,255,.62)"; c.lineWidth = 1.7; [[-6, -2.2], [1.2, 3.6]].forEach(([x0, x1]) => { c.beginPath(); c.moveTo(x0 + sx, hy - 6.6); c.quadraticCurveTo((x0 + x1) / 2 + sx, hy - 10, x1 + sx, hy - 6.2); c.stroke(); }); }
    else if (tx === "wavy") { const wv = (i, sg) => { c.beginPath(); c.moveTo(i * .4 + sx, hy - 10 + Math.abs(i) * .2); c.quadraticCurveTo(i * 1.1 + 1.8 * sg + sx, hy - 8, i * 1.2 + sx, hy - 6); c.quadraticCurveTo(i * 1.2 - 1.8 * sg + sx, hy - 4, i * 1.45 + sx, hy - 1.6); c.stroke(); }; (up ? [-6, -3, 0, 3, 6] : [-6, -3.4, 3.4, 6]).forEach((i, k) => wv(i, k & 1 ? 1 : -1)); }
    else if (up) [-6, -3.2, 0, 3.2, 6].forEach((i) => { c.beginPath(); c.moveTo(i * .25, hy - 7.6); c.quadraticCurveTo(i * 1.0, hy - 3, i * 1.3, hy + 5.6); c.stroke(); });
    else if (side) [0, 1, 2, 3].forEach((k) => { c.beginPath(); c.moveTo(sx + fl * (2.8 - k * 1.8), hy - 9.6 + k * .5); c.quadraticCurveTo(sx - fl * (1.2 + k * 1.6), hy - 6.2 + k, sx - fl * (7.6 + k * .2), hy - .6 + k * 1.6); c.stroke(); });
    else [-6, -3.4, 3.4, 6].forEach((i) => { c.beginPath(); c.moveTo(i * .4, hy - 10 + Math.abs(i) * .2); c.quadraticCurveTo(i * 1.15, hy - 7.2, i * 1.4 + sg(i) * .9, hy - 1.6 + Math.abs(i) * .15); c.stroke(); });
    if (tx === "frizzy") { c.strokeStyle = shade(hc, -.15); c.lineWidth = .7; for (let i = 0; i < 12; i++) { const a = Math.PI * (1.06 + .88 * i / 11), r0 = 9, r1 = 10.6 + (i % 3) * .7, cxh = side ? fl * .6 : 0; c.beginPath(); c.moveTo(cxh + Math.cos(a) * r0, hy + Math.sin(a) * (r0 - .6)); c.quadraticCurveTo(cxh + Math.cos(a + .1) * (r1 + .8), hy + Math.sin(a + .1) * (r1 - .4), cxh + Math.cos(a + .22 * (i % 2 ? 1 : -1)) * r1, hy + Math.sin(a) * (r1 + .4)); c.stroke(); } }
    c.restore();
  }
  if (!up && o.hair2 && hl === "stripes") { c.save(); c.strokeStyle = o.hair2; c.lineWidth = 1.5; c.lineCap = "round"; [-5, -1.6, 2, 5.2].forEach((i) => { c.beginPath(); c.moveTo(i * .4 + sx, hy - 10.4); c.quadraticCurveTo(i * 1.15 + sx, hy - 7.4, i * 1.35 + sx, hy - 2.6); c.stroke(); }); c.restore(); }
  if (!up && o.hair2 && hl === "frontpiece") { c.beginPath(); c.moveTo(-1.5 + sx, hy - 10); c.quadraticCurveTo(-8 + sx, hy - 7, -9.2 + sx, hy + 3.4); c.quadraticCurveTo(-4.6 + sx, hy - 3, -1.5 + sx, hy - 10); c.closePath(); fs(c, o.hair2, 1); }
  if (up && o.hair2 && (hl === "underlayer" || hl === "stripes" || hl === "frontpiece")) { c.save(); c.strokeStyle = o.hair2; c.lineWidth = 1.4; c.lineCap = "round"; [-4, 0, 4].forEach((i) => { c.beginPath(); c.moveTo(i * .3, hy - 8); c.quadraticCurveTo(i * 1.1, hy - 3, i * 1.3, hy + 5); c.stroke(); }); c.restore(); }
  if (!up && o.hair2 && hl === "streak") { c.strokeStyle = o.hair2; c.lineWidth = 1.3; c.lineCap = "round"; c.beginPath(); c.moveTo(-5 + sx, hy - 6.2); c.quadraticCurveTo(-3 + sx, hy - 8.6, 0 + sx, hy - 9); c.moveTo(1 + sx, hy - 9); c.quadraticCurveTo(4 + sx, hy - 8, 6 + sx, hy - 5.4); c.stroke(); }
  if (!up) { c.fillStyle = "rgba(255,255,255,.22)"; c.beginPath(); c.ellipse(-3 + sx, hy - 6.4, 3.4, 1.5, -.3, 0, 7); c.fill(); }
  if ((st === "long" || st === "wavy" || st === "locs" || st === "halfup") && !up && !side) [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(s * 8.2, hy - 1); c.quadraticCurveTo(s * 10.6, hy + 4, s * 9.6, hy + 11); c.quadraticCurveTo(s * 8.8, hy + 12, s * 8.2, hy + 10.2); c.quadraticCurveTo(s * 8.6, hy + 4, s * 8.2, hy - 1); c.closePath(); fs(c, HG, 1); });
  if (side && !up) { c.beginPath(); c.ellipse(-fl * 1.2 + fl * .6, hy + 2.2, 1.5, 2.2, 0, 0, 7); fs(c, o.skin, 1); c.fillStyle = "rgba(160,90,80,.25)"; c.beginPath(); c.ellipse(-fl * 1.2 + fl * .6, hy + 2.4, .6, 1.1, 0, 0, 7); c.fill(); if (o.glasses) { c.strokeStyle = o.glassColor || "#5b4048"; c.lineWidth = .9; c.beginPath(); c.moveTo(fl * 1.1, hy - .6); c.lineTo(-fl * .6, hy + .9); c.stroke(); } }
  const noFringe = ["buzz", "bald", "mohawk", "afro", "curly", "balding", "fade", "bantuknots", "flattop", "pompadour", "quiff", "bowl", "hime", "undercut", "sidecut", "receding", "bun", "topknot", "twinbuns"].includes(st);
  if (!up && o.fringe && o.fringe !== "none" && !side && !noFringe) {
    const fr = o.fringe;
    if (fr === "straight") { c.beginPath(); c.moveTo(-9 + sx, hy - 5.6); c.quadraticCurveTo(sx, hy - 10.8, 9 + sx, hy - 5.6); c.lineTo(8.6 + sx, hy - 1.6); c.quadraticCurveTo(sx, hy - 3, -8.6 + sx, hy - 1.6); c.closePath(); fs(c, HG, 1.1); }
    else if (fr === "side") { c.beginPath(); c.moveTo(-9 + sx, hy - 6); c.quadraticCurveTo(2 + sx, hy - 12, 9.4 + sx, hy - 1.4); c.quadraticCurveTo(-1 + sx, hy - 3.6, -9 + sx, hy - 6); c.closePath(); fs(c, HG, 1.1); }
    else if (fr === "curtain") [-1, 1].forEach((q) => { c.beginPath(); c.moveTo(sx, hy - 9.8); c.quadraticCurveTo(q * 8 + sx, hy - 8.4, q * 8.8 + sx, hy - .6); c.quadraticCurveTo(q * 4.6 + sx, hy - 3.4, sx, hy - 9.8); c.closePath(); fs(c, HG, 1); });
    else if (fr === "wispy") [-6, -3.6, -1.2, 1.2, 3.6, 6].forEach((x, i) => { c.beginPath(); c.moveTo(x - 1.2 + sx, hy - 5.4); c.lineTo(x + (i % 2 ? .5 : -.5) + sx, hy - .2 + (i % 3) * .5); c.lineTo(x + 1.2 + sx, hy - 5.4); c.closePath(); fs(c, HG, .8); });
  }
  if (!up && o.part && o.part !== "none" && !noFringe && st !== "mohawk") { const px = o.part === "left" ? -2.6 : o.part === "right" ? 2.6 : 0; c.strokeStyle = shade(hc, .42); c.lineWidth = .6; c.lineCap = "round"; c.beginPath(); c.moveTo(px + sx, hy - 9.8); c.quadraticCurveTo(px * 1.3 + sx, hy - 6.8, px * 1.6 + sx, hy - 3.8); c.stroke(); }
  if (!up) browFns.forEach((f) => f());                                    // eyebrows are painted last so a fringe never hides them
  if (o.clip && !up) { c.save(); c.translate(side ? -fl * 1.4 + sx : 6.4, hy - 6.2); c.rotate(side ? 0 : -.5); [0, 1].forEach((i) => { rr(c, -2 + i * 1.2, -.7 + i * 1.8, 4.4, 1.5, .7); fs(c, o.clip, .8); }); c.restore(); }
  // ---- accessories on the head
  const hatC = o.hatColor || "#e07a66", ht = o.hat;
  if (o.earrings && !up) (side ? [-fl * 0.6] : [-9, 9]).forEach((x) => { const es2 = o.earStyle || "stud";
    if (es2 === "hoop") { c.beginPath(); c.arc(x, hy + 6.2, 2.1, 0, 7); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke(); c.strokeStyle = o.earrings; c.lineWidth = 1.1; c.stroke(); }
    else if (es2 === "dangle") { line(c, x, hy + 4.4, x, hy + 7.4, .7, o.earrings); c.beginPath(); c.arc(x, hy + 8.2, 1.3, 0, 7); fs(c, o.earrings, .8); c.beginPath(); c.arc(x, hy + 4.4, .7, 0, 7); fs(c, o.earrings, .6); }
    else if (es2 === "pearl") { c.beginPath(); c.arc(x, hy + 4.8, 1.5, 0, 7); fs(c, "#fff6ea", .8); c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.arc(x - .4, hy + 4.3, .4, 0, 7); c.fill(); }
    else if (es2 === "cuff") { c.beginPath(); c.arc(x, hy + 2.2, 1.1, 0, 7); fs(c, o.earrings, .7); c.beginPath(); c.arc(x, hy + 4.6, 1.2, 0, 7); fs(c, o.earrings, .8); }
    else { c.beginPath(); c.arc(x, hy + 4.6, 1.2, 0, 7); fs(c, o.earrings, .8); } });
  if (ht === "cap") { c.beginPath(); c.moveTo(-9.4 + sx, hy - 2.8); c.bezierCurveTo(-9.8 + sx, hy - 15, 9.8 + sx, hy - 15, 9.4 + sx, hy - 2.8); c.closePath(); fs(c, hatC, 1.3); if (!up) { c.beginPath(); if (side) c.ellipse(fl * 9.2 + sx, hy - 3, 5.2, 1.7, 0, 0, 7); else c.ellipse(0, hy - 2.6, 7.4, 2, 0, 0, 7); fs(c, shade(hatC, .18), 1.1); } c.beginPath(); c.arc(0, hy - 12.2, 1, 0, 7); fs(c, shade(hatC, .2), .8); }
  else if (ht === "beanie") { c.beginPath(); c.moveTo(-9.8 + sx, hy - 2.4); c.bezierCurveTo(-10.4 + sx, hy - 17, 10.4 + sx, hy - 17, 9.8 + sx, hy - 2.4); c.closePath(); fs(c, hatC, 1.3); rr(c, -10 + sx, hy - 4.6, 20, 3.8, 1.6); fs(c, shade(hatC, -.25), 1.1); c.beginPath(); c.arc(sx, hy - 14, 2.3, 0, 7); fs(c, shade(hatC, -.35), 1); }
  else if (ht === "bucket") { c.beginPath(); c.moveTo(-8 + sx, hy - 4); c.lineTo(-7 + sx, hy - 11.4); c.lineTo(7 + sx, hy - 11.4); c.lineTo(8 + sx, hy - 4); c.closePath(); fs(c, hatC, 1.3); c.beginPath(); c.ellipse(sx, hy - 4.4, 12.2, 2.8, 0, 0, 7); fs(c, shade(hatC, .1), 1.2); }
  else if (ht === "beret") { c.beginPath(); c.ellipse(2 + sx, hy - 8.6, 9, 3.6, -.12, 0, 7); fs(c, hatC, 1.3); c.beginPath(); c.arc(3 + sx, hy - 12.2, 1, 0, 7); fs(c, shade(hatC, .25), .8); }
  else if (ht === "crown") { c.beginPath(); c.moveTo(-6 + sx, hy - 8); c.lineTo(-6.6 + sx, hy - 14); c.lineTo(-3 + sx, hy - 11); c.lineTo(0 + sx, hy - 15.4); c.lineTo(3 + sx, hy - 11); c.lineTo(6.6 + sx, hy - 14); c.lineTo(6 + sx, hy - 8); c.closePath(); fs(c, o.hatColor || "#EAB94E", 1.2); [-3, 0, 3].forEach((x) => { c.beginPath(); c.arc(x + sx, hy - 9.4, .7, 0, 7); c.fillStyle = "#e07a66"; c.fill(); }); }
  else if (ht === "catears") [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(s * 2.6 + sx, hy - 8.4); c.lineTo(s * 6.2 + sx, hy - 15.6); c.lineTo(s * 9 + sx, hy - 6.2); c.closePath(); fs(c, hc, 1.2); c.beginPath(); c.moveTo(s * 4.2 + sx, hy - 8.8); c.lineTo(s * 6.2 + sx, hy - 12.8); c.lineTo(s * 7.6 + sx, hy - 7.6); c.closePath(); c.fillStyle = "#f0a6b5"; c.fill(); });
  else if (ht === "headphones") { c.strokeStyle = OUT; c.lineWidth = 3.6; c.beginPath(); c.arc(sx, hy - .5, 10.4, Math.PI * 1.06, Math.PI * 1.94); c.stroke(); c.strokeStyle = hatC; c.lineWidth = 2; c.stroke(); if (!up) (side ? [fl * 9.2] : [-9.8, 9.8]).forEach((x) => { rr(c, x - 1.7, hy - 3, 3.4, 6.2, 1.4); fs(c, hatC, 1.1); }); }
  else if (ht === "bandana") { c.beginPath(); c.moveTo(-9.4 + sx, hy - 1.2); c.bezierCurveTo(-10 + sx, hy - 14, 10 + sx, hy - 14, 9.4 + sx, hy - 1.2); c.quadraticCurveTo(sx, hy - 5, -9.4 + sx, hy - 1.2); c.closePath(); fs(c, hatC, 1.2); c.fillStyle = "rgba(255,255,255,.55)"; [[-5, -6.6], [-1.6, -8.4], [2.4, -7.6], [5.6, -5.6], [0, -5.6]].forEach(([x, y]) => { c.beginPath(); c.arc(x + sx, hy + y, .55, 0, 7); c.fill(); }); [-1, 1].forEach((q) => { c.beginPath(); c.moveTo((side ? -fl * 9.2 : 9.2) + sx, hy - 1); c.lineTo((side ? -fl * 9.2 : 9.2) + sx + q * 3 * (side ? -fl : 1), hy + 2.6 + q); c.lineTo((side ? -fl * 9.2 : 9.2) + sx + q * .6, hy + 1.6); c.closePath(); fs(c, hatC, .9); }); }
  else if (ht === "visor") { c.strokeStyle = OUT; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-9.2 + sx, hy - 2.6); c.quadraticCurveTo(sx, hy - 12.4, 9.2 + sx, hy - 2.6); c.stroke(); c.strokeStyle = hatC; c.lineWidth = 2; c.stroke(); if (!up) { c.beginPath(); if (side) c.ellipse(fl * 9.2 + sx, hy - 3.2, 5.4, 1.7, 0, 0, 7); else c.ellipse(sx, hy - 3, 7.8, 2, 0, 0, 7); fs(c, shade(hatC, .18), 1.1); } }
  else if (ht === "sunhat") { c.beginPath(); c.ellipse(sx, hy - 4.2, 14, 3.8, 0, 0, 7); fs(c, shade(hatC, .12), 1.3); c.beginPath(); c.moveTo(-7.6 + sx, hy - 4.6); c.bezierCurveTo(-7.8 + sx, hy - 15, 7.8 + sx, hy - 15, 7.6 + sx, hy - 4.6); c.closePath(); fs(c, hatC, 1.3); rr(c, -7.6 + sx, hy - 8, 15.2, 2.2, 1); fs(c, shade(hatC, -.3), .9); }
  else if (ht === "headband" && !up) { c.strokeStyle = OUT; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-9 + sx, hy - 1.2); c.quadraticCurveTo(sx, hy - 12, 9 + sx, hy - 1.2); c.stroke(); c.strokeStyle = hatC; c.lineWidth = 2; c.stroke(); }
  else if (ht === "headband") { c.strokeStyle = hatC; c.lineWidth = 2; c.beginPath(); c.moveTo(-9, hy - 1.2); c.quadraticCurveTo(0, hy - 12, 9, hy - 1.2); c.stroke(); }
  else if (ht === "bow") { const bx = side ? -fl * 1.5 : 6.6, by = hy - 9.6; [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + s * 5.4, by - 2.8); c.lineTo(bx + s * 5.4, by + 2.8); c.closePath(); fs(c, hatC, 1.1); }); c.beginPath(); c.arc(bx, by, 1.5, 0, 7); fs(c, shade(hatC, .2), 1); }
  else if (ht === "flower") { const bx = side ? -fl * 2 : -6, by = hy - 8.4; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; c.beginPath(); c.arc(bx + Math.cos(a) * 2.3, by + Math.sin(a) * 2.3, 1.8, 0, 7); fs(c, hatC, .9); } c.beginPath(); c.arc(bx, by, 1.3, 0, 7); fs(c, "#EAB94E", .8); }
  if (xt) {                                                               // head extras
    const hx2 = side ? -fl * 1.6 : 0;
    if (xt === "halo") { c.beginPath(); c.ellipse(hx2, hy - 13.4, 6.4, 2, 0, 0, 7); c.strokeStyle = OUT; c.lineWidth = 2.8; c.stroke(); c.strokeStyle = xc; c.lineWidth = 1.5; c.stroke(); }
    else if (xt === "horns") [-1, 1].forEach((q) => { c.beginPath(); c.moveTo(hx2 + q * 3.2, hy - 8.6); c.quadraticCurveTo(hx2 + q * 6.6, hy - 11.4, hx2 + q * 5.4, hy - 15.6); c.quadraticCurveTo(hx2 + q * 8.2, hy - 12.6, hx2 + q * 8.2, hy - 7.4); c.closePath(); fs(c, xc, 1.1); });
    else if (xt === "bunny") [-1, 1].forEach((q) => { c.beginPath(); c.ellipse(hx2 + q * 4.4, hy - 16, 2.1, 6.2, q * .22, 0, 7); fs(c, "#fffaf2", 1.1); c.beginPath(); c.ellipse(hx2 + q * 4.5, hy - 15.6, 1, 4.4, q * .22, 0, 7); c.fillStyle = "#f0a6b5"; c.fill(); });
    else if (xt === "antlers") [-1, 1].forEach((q) => { c.strokeStyle = OUT; c.lineWidth = 2.6; c.lineCap = "round"; c.beginPath(); c.moveTo(hx2 + q * 4, hy - 9); c.lineTo(hx2 + q * 6.6, hy - 15); c.moveTo(hx2 + q * 5.6, hy - 12.6); c.lineTo(hx2 + q * 8.6, hy - 13.6); c.moveTo(hx2 + q * 6.6, hy - 15); c.lineTo(hx2 + q * 5.6, hy - 18); c.stroke(); c.strokeStyle = "#9a653d"; c.lineWidth = 1.2; c.stroke(); });
    else if (xt === "unicorn") { c.beginPath(); c.moveTo(hx2 - 1.8, hy - 9.2); c.lineTo(hx2, hy - 18); c.lineTo(hx2 + 1.8, hy - 9.2); c.closePath(); fs(c, xc, 1); c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = .6; for (const y of [-11.4, -13.4, -15.4]) { c.beginPath(); c.moveTo(hx2 - 1.5 + (y + 11.4) * -.1, hy + y); c.lineTo(hx2 + 1.5 + (y + 11.4) * .1, hy + y - .8); c.stroke(); } }
    else if (xt === "antennae") [-1, 1].forEach((q) => { c.strokeStyle = OUT; c.lineWidth = 1.8; c.beginPath(); c.moveTo(hx2 + q * 2.6, hy - 9); c.quadraticCurveTo(hx2 + q * 5, hy - 14, hx2 + q * 6.6, hy - 15.4); c.stroke(); c.strokeStyle = "#313a3f"; c.lineWidth = .8; c.stroke(); c.beginPath(); c.arc(hx2 + q * 6.8, hy - 15.8, 1.5, 0, 7); fs(c, xc, .9); });
    else if (xt === "tiara") { c.beginPath(); c.moveTo(hx2 - 6, hy - 6); c.lineTo(hx2 - 5.4, hy - 9.6); c.lineTo(hx2 - 2.6, hy - 8); c.lineTo(hx2, hy - 11.4); c.lineTo(hx2 + 2.6, hy - 8); c.lineTo(hx2 + 5.4, hy - 9.6); c.lineTo(hx2 + 6, hy - 6); c.quadraticCurveTo(hx2, hy - 8, hx2 - 6, hy - 6); c.closePath(); fs(c, "#d9d4cc", 1); [[0, -9.4], [-3.6, -7.6], [3.6, -7.6]].forEach(([x, y], i) => { c.beginPath(); c.arc(hx2 + x, hy + y, .7, 0, 7); fs(c, i ? "#8fc9e8" : xc, .4); }); }
    else if (xt === "flowercrown") for (let i = 0; i < 7; i++) { const a = Math.PI * (1.12 + .76 * i / 6), px = hx2 + Math.cos(a) * 8.2, py = hy - 1 + Math.sin(a) * 7.6; c.beginPath(); c.arc(px, py, 1.8, 0, 7); fs(c, i % 3 === 0 ? xc : i % 3 === 1 ? "#f28f7e" : "#fff6ea", .8); c.beginPath(); c.arc(px, py, .6, 0, 7); c.fillStyle = "#eab94e"; c.fill(); }
    else if (xt === "sparkles") [[-9, -8, 1.8], [9.4, -5, 1.4], [6, -13, 1.2]].forEach(([x, y, r]) => star(c, hx2 + x, hy + y, r * 1.5, xc));
  }
  c.restore();
  if (o.tag) { const my2 = hy - 19 - NK + Math.sin(t * 4) * 1.5; c.beginPath(); c.moveTo(-5, my2 - 5); c.lineTo(5, my2 - 5); c.lineTo(0, my2 + 1); c.closePath(); fs(c, "#f28f7e", 1.3); }
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
      c.fillStyle = o.eyeColor || "#3a2a30"; c.beginPath(); c.arc(x + (side ? .25 : 0) + (ek === "up" ? .25 : 0) + (o.lookX || 0), y + .02 + (ek === "up" ? -.2 : 0) + (ek === "narrow" ? .12 : 0) + (o.lookY || 0), ek === "wide" ? .42 : .5, 0, 7); c.fill(); if (ek === "wet") { c.fillStyle = "rgba(190,225,255,.9)"; c.beginPath(); c.ellipse(x + .1, y + .28, .55, .22, 0, 0, 7); c.fill(); }
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
  if (o.shadow) { c.fillStyle = o.shadow; c.globalAlpha = .5; (side ? [2.2] : [-1.9, 1.9]).forEach((dx) => { c.beginPath(); c.ellipse(cx + dx, cy - .55, side ? .95 : 1.3, .55, 0, 0, 7); c.fill(); }); c.globalAlpha = 1; }
  if (o.liner) { c.beginPath(); (side ? [[2.2, 1]] : [[-1.9, -1], [1.9, 1]]).forEach(([dx, sg]) => { c.moveTo(cx + dx + sg * .85, cy + .05); c.lineTo(cx + dx + sg * 1.9, cy - .6); }); stroke1(c, "#1a1210", .4); }
  if (o.blush === true) { c.fillStyle = o.blushColor || "rgba(255,110,125,.16)"; (side ? [2.6] : [-2.8, 2.8]).forEach((dx) => { c.beginPath(); c.ellipse(cx + dx, cy + 2.1, 1.0, .6, 0, 0, 7); c.fill(); }); }
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
    if (long || bob) { const L = long ? 8.4 : 4.4; if (false) { c.beginPath(); c.moveTo(cx - 3, cy - 4); c.lineTo(cx - 4.6, cy + L); c.lineTo(cx + .8, cy + L - .4); c.lineTo(cx + 1.4, cy); c.closePath(); fillH(); } else { c.beginPath(); if (side) { c.moveTo(cx - 1.2, cy - 5); c.bezierCurveTo(cx - 5.4, cy - 5.6, cx - 6.6, cy + 1, cx - 5.6, cy + L * .6); c.quadraticCurveTo(cx - 5.2, cy + L + .4, cx - 2.6, cy + L); c.quadraticCurveTo(cx - .4, cy + L - 2.2, cx + .6, cy + 2); c.closePath(); fillH(); [-4.8, -3.2, -1.6].forEach((x) => { c.beginPath(); c.moveTo(cx + x, cy); c.quadraticCurveTo(cx + x - .4, cy + L * .5, cx + x - .2, cy + L - 1.4); stroke1(c, hl, .3); }); }
      else { c.beginPath(); c.moveTo(cx - 4.9, cy - 3); c.bezierCurveTo(cx - 6.2, cy + 1, cx - 6.4, cy + L * .5, cx - 5.8, cy + L - 1.4); c.quadraticCurveTo(cx - 5.2, cy + L + .8, cx - 3.2, cy + L); c.quadraticCurveTo(cx, cy + L - 1.2, cx + 3.2, cy + L); c.quadraticCurveTo(cx + 5.2, cy + L + .8, cx + 5.8, cy + L - 1.4); c.bezierCurveTo(cx + 6.4, cy + L * .5, cx + 6.2, cy + 1, cx + 4.9, cy - 3); c.closePath(); fillH(); [-4.4, -2.6, 2.6, 4.4].forEach((x) => { c.beginPath(); c.moveTo(cx + x, cy); c.quadraticCurveTo(cx + x * 1.06, cy + L * .5, cx + x * 1.04, cy + L - 1.4); stroke1(c, hl, .3); }); } } }
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
  if (long && !side) [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(cx + s * 4.2, cy - 1); c.quadraticCurveTo(cx + s * 5.6, cy + 3.4, cx + s * 5.2, cy + 7.4); c.lineTo(cx + s * 3.8, cy + 6); c.quadraticCurveTo(cx + s * 4.4, cy + 2.6, cx + s * 3.6, cy); c.closePath(); fillH(); });
  if (!buzz && st !== "afro" && st !== "curly") { c.save(); c.globalAlpha = .7; const sw2 = side ? [0, 1, 2] : [-3, -1.6, 1.6, 3]; sw2.forEach((i) => { c.beginPath(); if (side) { c.moveTo(cx + 2.2 - i * 1.5, cy - 5); c.quadraticCurveTo(cx - 1 - i, cy - 3.6 + i * .4, cx - 3.4 - i * .3, cy + .2 + i * .6); } else { c.moveTo(cx + i * .5, cy - 5.2 + Math.abs(i) * .2); c.quadraticCurveTo(cx + i * 1.2, cy - 3.8, cx + i * 1.45 + (i < 0 ? -.4 : .4), cy - .6); } stroke1(c, hl, .28); }); c.restore(); }
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
    c.beginPath(); c.arc(hx, hy + .9, 1.7, 0, 7); fs(c, sk, 1); if (o.thumb && s > 0) { c.beginPath(); c.ellipse(hx + .2, hy - 1.1, .9, 1.7, .12, 0, 7); fs(c, sk, 1); }
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
  const mir = side && fl < 0; c.save(); if (o.hx || o.hdy) c.translate(o.hx || 0, o.hdy || 0); if (o.tilt) { c.translate(0, SHY); c.rotate(o.tilt); c.translate(0, -SHY); } if (mir) c.scale(-1, 1); { const EE = EMO[o.emote]; if (EE && EE.droop) c.translate(0, EE.droop * .5 + Math.sin(t * 1.5) * .12); if (o.emote === "frustrated") c.translate(0, -.2 + Math.sin(t * 14) * .18); if (o.emote === "joy") c.translate(0, -Math.abs(Math.sin(t * 6)) * .5); }
  const view = up ? "back" : side ? "side" : "front", hx0 = side ? .4 : 0;
  adultHair(c, o, hx0, cy, view, "back");
  if (!up) { const nb = SHY - (top === "turtleneck" || acc === "scarf" || o.scarf ? 2.8 : .8); c.beginPath(); c.moveTo(-1.9, cy + 2); c.lineTo(-1.9, nb); c.lineTo(1.9, nb); c.lineTo(1.9, cy + 2); c.closePath(); c.fillStyle = sk; c.fill(); c.fillStyle = "rgba(110,60,50,.22)"; c.beginPath(); c.ellipse(0, cy + 5.6, 2.0, 1.0, 0, 0, 7); c.fill(); c.strokeStyle = OUT; c.lineWidth = .9; c.beginPath(); c.moveTo(-1.9, cy + 4.6); c.lineTo(-1.9, nb); c.moveTo(1.9, cy + 4.6); c.lineTo(1.9, nb); c.stroke(); }   // the neck always shows in front of back-hair
  if (!side) [-1, 1].forEach((s) => { c.beginPath(); c.ellipse(s * 4.2, cy + .8, .9, 1.5, 0, 0, 7); fs(c, sk, .8); });
  else { c.beginPath(); c.ellipse(hx0 - .8, cy + .9, 1, 1.6, 0, 0, 7); fs(c, sk, .8); }
  headPath(c, hx0, cy, up ? "front" : view); fs(c, sk, 1.15);
  if (!up) { c.fillStyle = "rgba(120,70,60,.13)"; c.beginPath(); c.ellipse(hx0 + (side ? -1 : 2.2), cy + 2.4, 2.8, 2.6, 0, 0, 7); c.fill(); if (o.beard === "full") adultBeard(c, o, hx0, cy, side); adultFace(c, o, hx0, cy, side, t); if (o.beard === "mustache" || o.beard === "full") adultStache(c, o, hx0, cy, side); if (o.lines) { c.beginPath(); c.moveTo(hx0 + (side ? 3 : 3.6), cy + .3); c.lineTo(hx0 + (side ? 3.4 : 4), cy + .9); c.moveTo(hx0 + (side ? 2.8 : 3.4), cy + .8); c.lineTo(hx0 + (side ? 3.3 : 3.9), cy + 1.5); if (!side) { c.moveTo(hx0 - 3.6, cy + .3); c.lineTo(hx0 - 4, cy + .9); c.moveTo(hx0 - 3.4, cy + .8); c.lineTo(hx0 - 3.9, cy + 1.5); } stroke1(c, shade(sk, .22), .28); } }
  adultHair(c, o, hx0, cy, view, "front");
  if (o.teen && !up) { c.fillStyle = "rgba(168,92,64,.75)"; const fk = side ? [[hx0 - 2.2, cy + 2.2], [hx0 - 1, cy + 3]] : [[-3, cy + 2.3], [-2.1, cy + 3.1], [-3.4, cy + 3.3], [3, cy + 2.3], [2.1, cy + 3.1], [3.4, cy + 3.3]]; for (const [x, y] of fk) { c.beginPath(); c.arc(x, y, .32, 0, 7); c.fill(); } if (!side) { c.beginPath(); c.moveTo(-1.6, cy + 5.5); c.lineTo(1.6, cy + 5.5); c.strokeStyle = "rgba(210,215,225,.95)"; c.lineWidth = .5; c.stroke(); } }

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
  if (o.teen) { const pk = o.packColor || "#E8604C"; if (up || side) { rr(c, side ? -fl * 4.9 - 3 : -5.2, -36.4, side ? 6 : 10.4, 12.5, 2.2); fs(c, pk, 1); c.fillStyle = "rgba(255,255,255,.28)"; c.fillRect(side ? -fl * 4.9 - 1.5 : -3.4, -31, side ? 3 : 6.8, 1.1); } else { for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 3.8, SHY + .4); c.lineTo(sx * 3.1, -24.8); c.strokeStyle = pk; c.lineWidth = 1.3; c.lineCap = "round"; c.stroke(); } } }
  if (o.tag) { const my2 = cy - 12 + Math.sin(t * 4) * 1.2; c.beginPath(); c.moveTo(-3.4, my2 - 3.4); c.lineTo(3.4, my2 - 3.4); c.lineTo(0, my2 + 1); c.closePath(); fs(c, "#f28f7e", 1); }
  c.restore();
}
