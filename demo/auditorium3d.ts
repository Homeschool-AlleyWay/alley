import { Auditorium3D, PRINCIPALS } from "../src/aud3d/Auditorium3D";
import { runShow, showOfDay, isShowtime, type Show } from "../src/aud3d/shows";
import { runAssembly, prayerOn, setPrayer, assemblyDay, markAssemblyDone } from "../src/aud3d/assembly";
const $ = (id: string) => document.getElementById(id)!;
const A = new Auditorium3D($("game")); (window as any).__aud = A;
let sound = true, cancelled = false, running = false, newsFrame: HTMLIFrameElement | null = null;
const cap = $("cap"), capName = $("capName"), capText = $("capText");
const caption = (n: string, t: string) => { cap.classList.add("show"); capName.textContent = n; capText.textContent = t; };
const post = (m: any) => { try { parent.postMessage(m, "*"); } catch { /* standalone */ } };

/* ---- view buttons ---- */
document.querySelectorAll<HTMLElement>("[data-v]").forEach((b) => (b.onclick = () => { A.setView(b.dataset.v!); document.querySelectorAll("[data-v]").forEach((x) => x.classList.toggle("on", x === b)); }));
$("bSound").onclick = () => { sound = !sound; $("bSound").textContent = sound ? "🔊 Sound on" : "🔇 Sound off"; if (!sound) try { speechSynthesis.cancel(); } catch { /* none */ } };
const prayerBtn = $("bPrayer"); const paintPrayer = () => { prayerBtn.textContent = prayerOn() ? "Prayer: on" : "Prayer: off"; }; paintPrayer(); prayerBtn.onclick = () => { setPrayer(!prayerOn()); paintPrayer(); };
$("bLeave").onclick = () => { cancelled = true; try { speechSynthesis.cancel(); } catch { /* none */ } post({ type: "unify:stage-exit" }); };

/* ---- the live newsroom on the big screen (the same broadcast as the Newsroom tab, with anchors and field reports) ---- */
function startNews() {
  if (newsFrame) return; const f = document.createElement("iframe"); f.src = "news.html?embed=1"; f.allow = "geolocation; autoplay"; f.style.cssText = "position:fixed;left:0;top:0;width:960px;height:540px;opacity:.01;pointer-events:none;z-index:-1;border:0"; document.body.appendChild(f); newsFrame = f;
  f.addEventListener("load", () => { const t = setInterval(() => { try { const d = f.contentDocument!, cv = d.getElementById("cv") as HTMLCanvasElement | null, go = d.getElementById(sound ? "goSound" : "goSilent") as HTMLElement | null; if (cv && go) { clearInterval(t); go.click(); A.newsCanvas = cv; } } catch { /* not ready */ } }, 400); });
}
function liveNews() { cancelled = true; try { speechSynthesis.cancel(); } catch { /* none */ } A.speaking = null; A.standing = false; A.bowing = false; cap.classList.remove("show"); startNews(); A.setScreen("news"); ($("ask") as HTMLElement).classList.add("show"); $("bAssembly").hidden = false; }
$("bNews").onclick = liveNews;
($("askForm") as HTMLFormElement).onsubmit = (e) => { e.preventDefault(); const i = $("askIn") as HTMLInputElement, q = i.value.trim(); if (!q) return; liveNews(); setTimeout(() => { try { (newsFrame!.contentWindow as any).__unify?.ask?.(q); } catch { /* not ready */ } }, 400); caption("You asked the anchors", q); setTimeout(() => cap.classList.remove("show"), 5000); i.value = ""; };

/* ---- assembly ---- */
async function assembly() {
  if (running) return; running = true; cancelled = false; A.chatter = true; setTimeout(() => { A.chatter = false; }, 3800); $("bAssembly").hidden = true; ($("ask") as HTMLElement).classList.remove("show"); A.setScreen("assembly", "Good morning, UNIFY Academy", []);
  const done = await runAssembly({ A, caption, soundOn: () => sound, cancelled: () => cancelled }); running = false;
  if (done) { caption("Assembly", "Assembly is over. Heading to class."); setTimeout(() => { cap.classList.remove("show"); post({ type: "unify:stage-exit" }); }, 2800); } else if (!cancelled) liveNews();
}
/* ---- stage shows: plays, reenactments, musicals (one rotates in daily; Fridays are Showtime) ---- */
const todays = showOfDay(), showBtn = $("bShow");
showBtn.textContent = (isShowtime() ? "🎭 Showtime: " : "🎭 Show: ") + todays.title; showBtn.classList.toggle("on", isShowtime());
async function show(s: Show) {
  if (running) return; running = true; cancelled = false; $("bAssembly").hidden = true; ($("ask") as HTMLElement).classList.remove("show");
  const done = await runShow({ A, caption, soundOn: () => sound, cancelled: () => cancelled }, s); running = false; A.chatter = false; A.cheer = false;
  if (done) { caption("Showtime", "That's the end of the show. Thank you for coming!"); setTimeout(() => cap.classList.remove("show"), 3500); } else if (!cancelled) liveNews();
}
showBtn.onclick = () => { cancelled = true; try { speechSynthesis.cancel(); } catch { /* none */ } setTimeout(() => { running = false; void show(todays); }, 350); };
$("bSkip").onclick = () => { cancelled = true; markAssemblyDone(); try { speechSynthesis.cancel(); } catch { /* none */ } running = false; liveNews(); post({ type: "unify:stage-exit" }); };
$("bAssembly").onclick = () => void assembly();
addEventListener("message", (e) => { const m = e.data; if (m && m.type === "unify:stage-show") { A.resize(); if (!running && assemblyDay() !== new Date().toDateString()) void assembly(); else if (!running) liveNews(); } else if (m && m.type === "unify:stage-hide") { cancelled = true; A.cheer = false; A.chatter = false; try { speechSynthesis.cancel(); } catch { /* none */ } } });
post({ type: "unify:stage-ready" });
if (parent === window) setTimeout(() => void assembly(), 800);
void PRINCIPALS;
