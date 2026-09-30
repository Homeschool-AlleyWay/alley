import { createHallGame } from "../src/game/HallGame";
import { VIRTUAL_INPUT } from "../src/game/input";
import { PERIODS, clockStr, type HallwayScene } from "../src/game/scenes/HallwayScene";
createHallGame(document.getElementById("game")!);
const sc = () => (window as any).__hall as HallwayScene | undefined;
const $ = (id: string) => document.getElementById(id)!;

/* touch pad -> virtual input */
const held: Record<string, boolean> = {};
const upd = () => { VIRTUAL_INPUT.x = (held.r ? 1 : 0) - (held.l ? 1 : 0); VIRTUAL_INPUT.y = (held.d ? 1 : 0) - (held.u ? 1 : 0); };
document.querySelectorAll<HTMLElement>("[data-k]").forEach((b) => { const k = b.dataset.k!; b.addEventListener("pointerdown", (e) => { e.preventDefault(); held[k] = true; upd(); });
  ["pointerup", "pointerleave", "pointercancel"].forEach((e) => b.addEventListener(e, () => { held[k] = false; upd(); })); });

/* HUD */
$("bSpd").onclick = () => { const s = sc(); if (!s) return; s.speed = s.speed === 1 ? 4 : s.speed === 4 ? 16 : 1; $("bSpd").textContent = `Speed x${s.speed}`; };
$("bDbg").onclick = () => sc()?.toggleDebug();
$("bView").onclick = () => { const s = sc(); if (!s) return; s.toggleOverview(); $("bView").textContent = s.overview ? "Close-up" : "Overview"; };
let toastT = 0;
const toast = (m: string) => { const t = $("toast"); t.textContent = m; t.classList.toggle("show", !!m); clearTimeout(toastT); if (m) toastT = window.setTimeout(() => t.classList.remove("show"), 3500); };
let bound = false;
setInterval(() => {
  const s = sc(); if (!s || !s.players_ready) return;
  if (!bound) { s.events.on("toast", toast); bound = true; }
  const P = PERIODS[Math.max(0, s.idx)];
  $("clk").textContent = clockStr(s.clock); $("per").textContent = P.name;
  ($("fill") as HTMLElement).style.width = `${((s.clock - P.start) / P.len) * 100}%`;
  const seen = s.students.filter((x) => !x.hidden).length;
  $("cnt").textContent = `${seen} in the hall, ${s.students.length - seen} in class or away`;
  const [r, g, b, a] = s.tint; ($("tint") as HTMLElement).style.background = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  $("dA").textContent = s.subjectFor("A").toUpperCase(); $("dB").textContent = s.subjectFor("B").toUpperCase();
}, 200);

/* paper grain: generated once, laid over everything with multiply */
(() => {
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d")!, d = x.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = 226 + Math.random() * 29; d.data[i] = v; d.data[i + 1] = v * 0.965; d.data[i + 2] = v * 0.9; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); x.lineCap = "round";
  for (let i = 0; i < 260; i++) { x.strokeStyle = `rgba(255,250,240,${0.08 + Math.random() * 0.16})`; x.lineWidth = 0.6 + Math.random() * 0.5; const px = Math.random() * 256, py = Math.random() * 256, a = Math.random() * 6.28, l = 3 + Math.random() * 9; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  $("paper").style.backgroundImage = `url(${c.toDataURL()})`;
})();
