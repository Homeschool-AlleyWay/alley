/** Weather you can see: rain, snow, drifting leaves or petals and fog as a light overlay on the school view (pointer-transparent, behind the buttons),
 *  matching the real weather in the family's area when they opted in, otherwise the season. Gentle by design: no flashes, and it can be switched off. */
import { World, weatherNow, seasonOf, themeOf, type Weather } from "../game/world";
interface Pt { x: number; y: number; v: number; s: number; r: number; a: number }
export class WeatherFx {
  cv = document.createElement("canvas"); c = this.cv.getContext("2d")!; pts: Pt[] = []; last = performance.now(); kind: "rain" | "snow" | "leaf" | "petal" | "none" = "none"; fog = 0; tint = "";
  constructor(host: HTMLElement) {
    Object.assign(this.cv.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "6" }); host.appendChild(this.cv);
    addEventListener("resize", () => this.fit()); this.fit(); World.onChange(() => this.pick()); this.pick(); requestAnimationFrame(this.loop);
  }
  private fit() { this.cv.width = innerWidth; this.cv.height = innerHeight; }
  pick() {
    const w: Weather = weatherNow().weather, season = seasonOf(), th = themeOf(); this.pts = [];
    const fx = World.prefs.weatherFx; let k: WeatherFx["kind"] = "none"; this.fog = 0;
    if (fx) { if (w === "rain" || w === "storm") k = "rain"; else if (w === "snow") k = "snow"; else if (w === "fog") { this.fog = 0.18; } else if (th?.id === "autumn" || (!th && season === "autumn")) k = "leaf"; else if (th?.id === "spring" || (!th && season === "spring")) k = "petal"; }
    this.kind = k; this.tint = w === "storm" ? "rgba(40,50,80,.18)" : w === "rain" ? "rgba(70,90,120,.10)" : w === "cloud" ? "rgba(120,130,150,.06)" : "";
    const n = k === "rain" ? (w === "storm" ? 170 : 110) : k === "snow" ? 90 : k === "none" ? 0 : 26;
    for (let i = 0; i < n; i++) this.pts.push({ x: Math.random(), y: Math.random(), v: 0.35 + Math.random() * 0.65, s: 0.6 + Math.random() * 1.2, r: Math.random() * 6.28, a: Math.random() });
  }
  private loop = (t: number) => {
    const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t; const c = this.c, W = this.cv.width, H = this.cv.height; c.clearRect(0, 0, W, H);
    if (this.tint) { c.fillStyle = this.tint; c.fillRect(0, 0, W, H); } if (this.fog) { c.fillStyle = `rgba(235,235,240,${this.fog})`; c.fillRect(0, 0, W, H); }
    for (const p of this.pts) {
      if (this.kind === "rain") { p.y += p.v * dt * 1.9; p.x -= dt * 0.12; c.strokeStyle = "rgba(190,215,245,.5)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(p.x * W, p.y * H); c.lineTo(p.x * W - 4, p.y * H + 14 * p.s); c.stroke(); }
      else if (this.kind === "snow") { p.y += p.v * dt * 0.28; p.x += Math.sin(t / 900 + p.r) * dt * 0.03; c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.arc(p.x * W, p.y * H, 1.6 + p.s * 1.4, 0, 6.28); c.fill(); }
      else { p.y += p.v * dt * 0.12; p.x += Math.sin(t / 1200 + p.r) * dt * 0.06; p.r += dt * 1.4; c.save(); c.translate(p.x * W, p.y * H); c.rotate(p.r); c.fillStyle = this.kind === "leaf" ? ["#E8833A", "#C2452D", "#EAB94E"][Math.floor(p.a * 3)] : ["#F7B6C8", "#FFFFFF", "#FBE08A"][Math.floor(p.a * 3)]; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(0, 0, 5 * p.s, 2.6 * p.s, 0, 0, 6.28); c.fill(); c.restore(); }
      if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); } if (p.x < -0.05) p.x = 1.05; if (p.x > 1.05) p.x = -0.05;
    }
    requestAnimationFrame(this.loop);
  };
}
