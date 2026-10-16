/** A painted glimpse of the room behind a door (classroom, parent classroom or auditorium). Drawn once per room and used twice: on the doorway behind the opening leaf,
 *  and as the big "peek" picture that fades in while the door swings open and before the player walks through. */
export type PeekKind = "class" | "open" | "aud";
const cache = new Map<string, HTMLCanvasElement>();
const grad = (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) => { const g = c.createLinearGradient(x0, y0, x1, y1); for (const [o, col] of stops) g.addColorStop(o, col); return g; };
export function peekCanvas(kind: PeekKind, accent: string, w = 512, h = 384): HTMLCanvasElement {
  const key = `${kind}${accent}${w}`; const hit = cache.get(key); if (hit) return hit;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const c = cv.getContext("2d")!, hz = h * 0.56, vx = w / 2;
  if (kind === "aud") {
    c.fillStyle = grad(c, 0, 0, 0, h, [[0, "#1d1a38"], [0.55, "#2d2a52"], [1, "#171528"]]); c.fillRect(0, 0, w, h);
    c.fillStyle = "#9a6a40"; c.fillRect(w * 0.12, hz - h * 0.02, w * 0.76, h * 0.1); c.fillStyle = "#6e4a2a"; c.fillRect(w * 0.12, hz + h * 0.06, w * 0.76, h * 0.03);        // stage deck
    c.fillStyle = grad(c, 0, 0, w, 0, [[0, "#2a2650"], [1, "#34246e"]]); c.fillRect(w * 0.2, h * 0.08, w * 0.6, hz - h * 0.1);                                               // big screen
    c.fillStyle = "#f6c85f"; c.font = `700 ${h * 0.07}px 'Trebuchet MS',sans-serif`; c.textAlign = "center"; c.fillText("UNIFY ACADEMY", vx, h * 0.28);
    for (const sx of [0, 1]) { c.fillStyle = grad(c, sx ? w : 0, 0, sx ? w * 0.8 : w * 0.2, 0, [[0, "#5e1520"], [0.6, "#b32a3c"], [1, "#7a1f2b"]]); c.beginPath(); c.moveTo(sx ? w : 0, 0); c.lineTo(sx ? w * 0.78 : w * 0.22, 0); c.lineTo(sx ? w * 0.84 : w * 0.16, hz + h * 0.08); c.lineTo(sx ? w : 0, h * 0.78); c.fill(); }
    c.fillStyle = "rgba(255,240,200,.16)"; c.beginPath(); c.moveTo(w * 0.3, 0); c.lineTo(w * 0.7, 0); c.lineTo(w * 0.62, hz + h * 0.06); c.lineTo(w * 0.38, hz + h * 0.06); c.fill();   // spotlight
    c.fillStyle = "#7a5230"; c.fillRect(vx - w * 0.04, hz - h * 0.08, w * 0.08, h * 0.1);                                                                                       // podium
    c.fillStyle = "#3b2f6b"; c.fillRect(vx - w * 0.028, hz - h * 0.2, w * 0.056, h * 0.12); c.fillStyle = "#e8c39a"; c.beginPath(); c.arc(vx, hz - h * 0.225, w * 0.024, 0, 7); c.fill();   // presenter
    for (let r = 0; r < 6; r++) { const t = (r + 1) / 6, y = hz + h * 0.14 + t * t * h * 0.34, n = 5 + r * 2, sz = w * (0.03 + t * 0.05); for (let i = 0; i < n; i++) { const x = vx + (i - (n - 1) / 2) * sz * 1.5 * (1 + t * 0.2); c.fillStyle = ["#8e1f33", "#9c2438", "#841c2f"][(i + r) % 3]; c.beginPath(); c.roundRect(x - sz / 2, y - sz * 0.5, sz, sz * 0.8, sz * 0.25); c.fill(); } }
  } else {
    const warm = kind === "open";
    c.fillStyle = grad(c, 0, 0, 0, hz, [[0, warm ? "#FBE9C6" : "#F7ECD6"], [1, warm ? "#F0D3A0" : "#E8D9B8"]]); c.fillRect(0, 0, w, hz);                                                 // back wall
    c.fillStyle = grad(c, 0, hz, 0, h, [[0, "#C98B4D"], [1, "#8c5a2c"]]); c.fillRect(0, hz, w, h - hz);                                                                           // wood floor
    c.strokeStyle = "rgba(60,30,10,.22)"; c.lineWidth = 1; for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(vx + i * w * 0.04, hz); c.lineTo(vx + i * w * 0.2, h); c.stroke(); }
    c.fillStyle = "#313A3F"; c.fillRect(w * 0.31, h * 0.1, w * 0.38, h * 0.3); c.fillStyle = "#cfe6ff"; c.fillRect(w * 0.325, h * 0.115, w * 0.35, h * 0.27);                                // screen
    c.fillStyle = accent; c.font = `700 ${h * 0.07}px 'Trebuchet MS',sans-serif`; c.textAlign = "center"; c.fillText(warm ? "OPEN DOOR" : "TODAY", vx, h * 0.27);
    for (const sx of [0.04, 0.72]) { c.fillStyle = "#9DA7AA"; c.fillRect(w * sx, h * 0.14, w * 0.24, h * 0.26); c.fillStyle = "#2f5a48"; c.fillRect(w * sx + 5, h * 0.14 + 5, w * 0.24 - 10, h * 0.26 - 10); c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(w * sx + 14, h * (0.2 + i * 0.045)); c.lineTo(w * sx + w * (0.1 + (i % 3) * 0.04), h * (0.2 + i * 0.045)); c.stroke(); } }
    c.fillStyle = "#C98B4D"; c.fillRect(w * 0.22, hz - h * 0.05, w * 0.18, h * 0.05); c.fillStyle = "#9A653D"; c.fillRect(w * 0.23, hz, w * 0.01, h * 0.06); c.fillRect(w * 0.38, hz, w * 0.01, h * 0.06);   // teacher desk
    c.fillStyle = "rgba(255,255,255,.65)"; c.fillRect(w * 0.06, h * 0.45 - 4, w * 0.04, 4);
    c.fillStyle = "#4A3B3F"; c.fillRect(vx - w * 0.03, hz - h * 0.12, w * 0.06, h * 0.13); c.fillStyle = accent; c.fillRect(vx - w * 0.035, hz - h * 0.2, w * 0.07, h * 0.1); c.fillStyle = "#e8c39a"; c.beginPath(); c.arc(vx, hz - h * 0.235, w * 0.027, 0, 7); c.fill();   // teacher
    for (let r = 0; r < 4; r++) { const t = (r + 1) / 4, e = Math.pow(t, 1.5), y = hz + h * 0.07 + e * h * 0.36, sz = w * (0.05 + e * 0.07); for (let i = -2; i <= 2; i++) { const x = vx + i * sz * 2.3; c.fillStyle = "#D9A86B"; c.fillRect(x - sz, y - sz * 0.55, sz * 2, sz * 0.5); c.fillStyle = "#9A653D"; c.fillRect(x - sz * 0.9, y - sz * 0.05, sz * 0.12, sz * 0.5); c.fillRect(x + sz * 0.78, y - sz * 0.05, sz * 0.12, sz * 0.5);
        if (r < 3 && i !== 0) { c.fillStyle = ["#e8c39a", "#c98a5c", "#f0c29b", "#8a5a3c"][(i + r + 8) % 4]; c.beginPath(); c.arc(x, y - sz * 1.0, sz * 0.38, 0, 7); c.fill(); c.fillStyle = ["#4F91C7", "#E07A66", "#88B89A", "#EAB94E"][(i + r + 8) % 4]; c.fillRect(x - sz * 0.45, y - sz * 0.65, sz * 0.9, sz * 0.4); } } }
  }
  const v = c.createRadialGradient(vx, h * 0.5, h * 0.2, vx, h * 0.5, h * 0.85); v.addColorStop(0, "rgba(255,240,210,0)"); v.addColorStop(1, "rgba(30,20,10,.35)"); c.fillStyle = v; c.fillRect(0, 0, w, h);
  cache.set(key, cv); return cv;
}
