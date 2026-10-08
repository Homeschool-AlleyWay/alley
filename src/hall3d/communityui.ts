/** The "Friends & clubs" tab of the Today panel. */
import { Clubs, CLUBS, ShowTell, Story, type Club } from "../game/community";
import { parentUnlocked } from "../game/safety";
import { Social } from "./social";
const E = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", parent?: HTMLElement, text = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e; };
const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const net = () => (window as any).PhoneNet;

function meeting(b: HTMLElement, c: Club, back: () => void) {
  b.innerHTML = ""; const mem = Clubs.members(c), card = E("div", "hb-card", b); E("h3", "", card, `${c.icon} ${c.name} meeting`);
  E("div", "", card, "Today's teammates: " + mem.map((m) => m.first).join(", ")).style.fontSize = "13px";
  let round = 0, score = 0; const area = E("div", "", b);
  const step = () => {
    area.innerHTML = ""; if (round >= c.rounds.length) {
      Clubs.finish(c, c.id && Clubs.meetsToday(c) ? score : Math.min(1, score)); const k = E("div", "hb-card", area); E("b", "", k, "Meeting finished! 🎉"); E("div", "", k, `Your team got ${score} of ${c.rounds.length} ideas just right. ${score >= 2 && Clubs.meetsToday(c) ? "You earned a collection item for your locker or Chat Chow table!" : "Come back on meeting day for a prize."}`); E("button", "hb-b", area, "Back to clubs").onclick = back; return; }
    const r = c.rounds[round], k = E("div", "hb-card", area); E("b", "", k, `Round ${round + 1} of ${c.rounds.length}`); E("div", "", k, r.prompt).style.margin = "6px 0";
    for (const o of r.options) { const btn = E("button", "hb-b", k, o.t); btn.style.display = "block"; btn.style.margin = "4px 0"; btn.onclick = () => { const m = mem[(round + (o.good ? 0 : 1)) % Math.max(1, mem.length)]; if (o.good) score++; area.innerHTML = ""; const f = E("div", "hb-card", area); E("b", "", f, o.good ? "✔ Nice teamwork" : "↺ Let's learn from that"); E("div", "", f, `${m?.first ?? "A teammate"}: "${o.say}"`); E("button", "hb-b", area, round + 1 >= c.rounds.length ? "Finish" : "Next round").onclick = () => { round++; step(); }; }; }
  };
  step();
}

export function communityTab(b: HTMLElement, redraw: () => void, _hooks?: unknown) {
  b.innerHTML = ""; E("h3", "", b, "📰 School buzz today"); for (const l of Story.buzz()) E("div", "hb-card", b, l);
  /* visit friends */
  E("h3", "", b, "👋 Visit friends"); const vc = E("div", "hb-card", b), P = net();
  E("div", "", vc, "Friends you already message on the phone can appear in each other's hallways. Only people you have a conversation with can see you, and only while you both have this switched on. Grown-ups control it with the parent code.").style.fontSize = "13px";
  if (!P) E("div", "", vc, "The people network isn't available here."); else {
    const on = P.presence.enabled(), row = E("label", "", vc); const cb = E("input", "", row); cb.type = "checkbox"; cb.checked = on; E("span", "", row, "Let my friends see me in the hallway");
    cb.onchange = () => { if (!parentUnlocked()) { cb.checked = !cb.checked; alert("Ask a parent to unlock the Grown-ups tab first."); return; } P.presence.setEnabled(cb.checked); (window as any).dispatchEvent(new CustomEvent("unify:presence-change")); };
    E("div", "", vc, "Not joined yet? Open the phone → People, pick a handle, and add friends there.").style.fontSize = "12px";
  }
  /* clubs */
  E("h3", "", b, "🎒 Clubs"); const mine = new Set(Clubs.mine().map((c) => c.id));
  for (const c of CLUBS) {
    const k = E("div", "hb-card", b), r = E("div", "hb-q", k); E("div", "ic", r, c.icon); const t = E("div", "", r); E("b", "", t, c.name); const meets = Clubs.meetsToday(c); E("div", "", t, `${c.blurb} Meets ${DAY[c.day]}s${meets ? " · TODAY" : ""}.`).style.fontSize = "13px";
    const row = E("div", "", k); row.style.marginTop = "6px";
    if (mine.has(c.id)) { const att = Clubs.attended(c); const a = E("button", "hb-b on", row, att ? "Attended today ✔" : meets ? "Go to today's meeting" : "Drop in for a practice meeting"); a.onclick = () => meeting(b, c, redraw); E("button", "hb-b", row, "Leave club").onclick = () => { Clubs.leave(c.id); redraw(); }; }
    else E("button", "hb-b", row, "Join").onclick = () => { Clubs.join(c.id); redraw(); };
  }
  /* plays and show-and-tell */
  E("h3", "", b, "🎭 Write a play or show-and-tell"); const w = E("div", "hb-card", b);
  E("div", "", w, "Write 2 to 8 short lines (one per line). A grown-up approves it, then the principals perform it on the auditorium stage on a Friday show. Keep it kind, and don't include names, places or contact details.").style.fontSize = "13px";
  const ti = E("input", "", w); ti.type = "text"; ti.placeholder = "Title"; ti.maxLength = 50; ti.style.width = "100%"; ti.style.margin = "6px 0";
  const ta = E("textarea", "", w); ta.rows = 5; ta.style.width = "100%"; ta.placeholder = "Narrator: Once upon a time...\nLittle Fox: I have an idea!"; ta.style.font = "inherit";
  const note = E("div", "", w); note.style.fontSize = "13px";
  E("button", "hb-b", w, "Save my piece").onclick = () => { const r = ShowTell.submit(ti.value, ta.value, Social.profile.name || "A student"); note.textContent = r.note; if (r.ok) { ti.value = ""; ta.value = ""; setTimeout(redraw, 1500); } };
  const mineP = ShowTell.all(); if (mineP.length) { E("div", "", w, "Your pieces:").style.marginTop = "8px"; for (const p of mineP) { const r = E("div", "", w); r.style.cssText = "display:flex;gap:6px;align-items:center;margin:3px 0;font-size:13px"; E("span", "", r, `${p.approved ? "✅ on the stage list" : "⏳ waiting for a grown-up"} · ${p.title}`).style.flex = "1";
    if (parentUnlocked()) { if (!p.approved) E("button", "hb-b", r, "Approve").onclick = () => { ShowTell.approve(p.id, true); redraw(); }; else E("button", "hb-b", r, "Unapprove").onclick = () => { ShowTell.approve(p.id, false); redraw(); }; }
    E("button", "hb-b", r, "Delete").onclick = () => { ShowTell.remove(p.id); redraw(); }; } }
}
