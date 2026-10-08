import { Trip3D, TRIPS, type Trip, type Spot } from "../src/trip3d/Trip3D";
import { Quests } from "../src/game/quests";
const $ = (id: string) => document.getElementById(id)!;
const trip = new Trip3D($("game"));
let voiceOn = true, cur: Trip | null = null; const notes: Record<string, string[]> = {};
const speak = (t: string) => { try { speechSynthesis.cancel(); if (!voiceOn) { trip.talking(true); setTimeout(() => trip.talking(false), Math.min(9000, t.length * 55)); return; } const u = new SpeechSynthesisUtterance(t); u.rate = 0.95; u.onstart = () => trip.talking(true); u.onend = () => trip.talking(false); u.onerror = () => trip.talking(false); trip.talking(true); speechSynthesis.speak(u); } catch { trip.talking(true); setTimeout(() => trip.talking(false), 4000); } };
const cap = (name: string, text: string) => { $("capName").textContent = name; $("capText").textContent = text; $("cap").classList.add("show"); };
const renderNotes = () => { const n = cur ? notes[cur.id] ?? [] : []; $("nl").innerHTML = n.length ? n.map((x) => `<div>• ${x}</div>`).join("") : "Find the glowing orbs to collect facts."; };
trip.onHover = (s, pct) => { ($("ret") as HTMLElement).style.transform = `rotate(${pct * 360}deg)`; ($("ret") as HTMLElement).style.borderTopColor = s ? "#FFE27A" : "transparent"; };
trip.onFact = (s: Spot, all: boolean) => {
  if (!cur) return; cap(trip.guideName, `${s.title}. ${s.fact}`); speak(`${s.title}. ${s.fact}`);
  const n = (notes[cur.id] ??= []); const line = `${s.title}: ${s.fact.split(". ")[0]}.`; if (!n.includes(line)) n.push(line); renderNotes();
  if (all) { try { localStorage.setItem("unify.trip.visit", String(Date.now())); } catch { /* private */ } Quests.track("trip", cur.id); setTimeout(() => cap(trip.guideName, "You found every spot on this trip. Great exploring! Pick another trip or head back to school."), 9000); }
};
function start(t: Trip) { cur = t; $("picker").style.display = "none"; trip.load(t); renderNotes(); cap(trip.guideName, `Welcome to ${t.name}! ${t.blurb} Look for the glowing orbs.`); speak(`Welcome to ${t.name}. ${t.blurb}`); }
for (const t of TRIPS) { const b = document.createElement("button"); b.className = "card"; b.innerHTML = `<b>${t.icon}</b>${t.name}<span>${t.blurb}</span>`; b.onclick = () => start(t); $("cards").appendChild(b); }
$("bTrips").onclick = () => { try { speechSynthesis.cancel(); } catch { /* none */ } $("cap").classList.remove("show"); $("picker").style.display = "flex"; };
$("bBack").onclick = () => { try { speechSynthesis.cancel(); } catch { /* none */ } if (parent !== window) parent.postMessage({ type: "unify:stage-exit" }, "*"); else history.back(); };
$("bVR").onclick = () => { const on = !trip.vr; trip.setVR(on); document.body.classList.toggle("vr", on); $("bVR").classList.toggle("on", on); $("bVR").textContent = on ? "🕶 Exit VR" : "🕶 Cardboard VR"; if (on && matchMedia("(pointer:coarse)").matches) $("bGyro").hidden = false; };
$("bGyro").onclick = async () => { const ok = await trip.enableGyro(); $("bGyro").textContent = ok ? "📱 Tilt on" : "📱 Tilt unavailable"; $("bGyro").classList.toggle("on", ok); };
$("bNotes").onclick = () => $("notes").classList.toggle("show");
$("bVoice").onclick = () => { voiceOn = !voiceOn; $("bVoice").classList.toggle("on", voiceOn); $("bVoice").textContent = voiceOn ? "🔊 Guide voice" : "🔇 Voice off"; if (!voiceOn) try { speechSynthesis.cancel(); } catch { /* none */ } };
if (matchMedia("(pointer:coarse)").matches) $("bGyro").hidden = false;
addEventListener("message", (e) => { if (e.data?.type === "unify:trip-show") { $("picker").style.display = cur ? "none" : "flex"; } });
(window as any).__trip = trip; (window as any).__start = (i: number) => start(TRIPS[i]);
