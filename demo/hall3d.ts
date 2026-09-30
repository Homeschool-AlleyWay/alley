import { HallScene } from "../src/hall3d/HallScene";
import { PERIODS, clockStr } from "../src/hall3d/logic";
const $ = (id: string) => document.getElementById(id)!;
const hall = new HallScene($("game")); (window as any).__hall = hall;
hall.onToast = (m) => { const t = $("toast"); t.textContent = m; t.classList.toggle("show", !!m); clearTimeout((hall as any)._tt); if (m) (hall as any)._tt = setTimeout(() => t.classList.remove("show"), 3500); };
const held: Record<string, boolean> = {};
const upd = () => { hall.input.x = (held.r ? 1 : 0) - (held.l ? 1 : 0); hall.input.y = (held.d ? 1 : 0) - (held.u ? 1 : 0); };
document.querySelectorAll<HTMLElement>("[data-k]").forEach((b) => { const k = b.dataset.k!; b.addEventListener("pointerdown", (e) => { e.preventDefault(); held[k] = true; upd(); }); ["pointerup", "pointerleave", "pointercancel"].forEach((e) => b.addEventListener(e, () => { held[k] = false; upd(); })); });
$("bSpd").onclick = () => { hall.speed = hall.speed === 1 ? 4 : hall.speed === 4 ? 16 : 1; $("bSpd").textContent = `Speed x${hall.speed}`; };
const NAMES = { close: "Close-up", overview: "Overview", first: "First person" } as const;
$("bView").onclick = () => { const v = hall.cycleView(); $("bView").textContent = `View: ${NAMES[v]}`; };
setInterval(() => {
  const P = PERIODS[Math.max(0, hall.idx)]; $("clk").textContent = clockStr(hall.clock); $("per").textContent = P.name; ($("fill") as HTMLElement).style.width = `${((hall.clock - P.start) / P.len) * 100}%`;
  const seen = hall.students.filter((x) => !x.hidden).length; $("cnt").textContent = `${seen} in the hall, ${hall.students.length - seen} in class or away`;
  const [r, g, b, a] = hall.tint; ($("tint") as HTMLElement).style.background = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  $("dA").textContent = hall.subjectFor("A").toUpperCase(); $("dB").textContent = hall.subjectFor("B").toUpperCase();
}, 200);
(() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d")!, d = x.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = 226 + Math.random() * 29; d.data[i] = v; d.data[i + 1] = v * 0.965; d.data[i + 2] = v * 0.9; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); x.lineCap = "round"; for (let i = 0; i < 260; i++) { x.strokeStyle = `rgba(255,250,240,${0.08 + Math.random() * 0.16})`; x.lineWidth = 0.6 + Math.random() * 0.5; const px = Math.random() * 256, py = Math.random() * 256, a = Math.random() * 6.28, l = 3 + Math.random() * 9; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  $("paper").style.backgroundImage = `url(${c.toDataURL()})`; })();
