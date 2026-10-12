/* UNIFY Academy: "Who's here" bar. School-wide presence + six fixed emotes (no free text).
 * Load after supabase-config.js, supabase-client.js and phone-net.js. Shell top window only. */
(function () {
  "use strict";
  if (window.parent !== window || !window.PhoneNet || window.__presence) return;
  var PN = window.PhoneNet, P = PN.presence;
  var VIEW = { hall: "hall", news: "newsroom", stage: "auditorium", open: "open-door", trip: "field-trip" };
  var CLASS = { math: "class-math", ela: "class-ela", science: "class-science", history: "class-history", careers: "class-careers", carryingcareers: "class-careers", life: "class-life", "life lessons": "class-life" };
  var NAMES = { hall: "Hallway", newsroom: "Newsroom", auditorium: "Auditorium", "open-door": "The Open Door", "field-trip": "Field trip", "class-math": "Math classroom", "class-ela": "ELA classroom", "class-science": "Science classroom", "class-history": "History classroom", "class-careers": "CarryingCareers classroom", "class-life": "Life Lessons classroom" };
  var ls = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lset = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };
  var curRoom = "hall", unwatch = null, list = [], joined = false, sel = null, seen = {}, timers = [], bar, dead = false, fl = el("div", { id: "apFloat" }), hinted = false;

  function roomNow() {
    var a = window.__academy, v = a && a.view; if (!v) return curRoom;
    if (v === "aud") {
      var t = ((document.getElementById("room") || {}).textContent || "").toLowerCase();
      var k = Object.keys(CLASS).filter(function (x) { return t.indexOf(x) >= 0; }).sort(function (p, q) { return q.length - p.length; })[0];
      return k ? CLASS[k] : (curRoom.indexOf("class-") === 0 ? curRoom : "class-math");
    }
    return VIEW[v] || "hall";
  }
  function myState() {
    var av = {}; try { av = (JSON.parse(ls("unify.social.v1") || "null") || {}).profile || {}; av = av.avatar || {}; } catch (e) { /* ignore */ }
    var h = curRoom === "hall" ? P.hallPos() : {};
    return { avatar: av, x: h.x || 0, z: h.z || 0, dir: h.dir || 0, moving: false };
  }
  function setRoom(r, quiet) { curRoom = P.setRoom(r); if (!quiet) P.announce(myState(), true); resub(); render(); }
  function resub() {
    if (unwatch) { unwatch(); unwatch = null; }
    try { unwatch = P.watchRoom(curRoom, function (l) { list = l; track(l); render(); }); } catch (e) { list = []; }
  }

  /* ---------- UI */
  var css = "#apBar{position:fixed;left:50%;bottom:calc(10px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:85;max-width:calc(100vw - 16px);background:#F3E7CF;border:1px solid rgba(255,255,255,.8);border-radius:14px;box-shadow:0 2px 0 #C9B28A,0 8px 18px rgba(80,50,40,.3);font:500 13px/1.2 Fredoka,'Trebuchet MS',system-ui,sans-serif;color:#4A3B3F;padding:6px 10px;display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;justify-content:center}" +
    "#apBar.pill{padding:4px 12px;cursor:pointer}#apBar button{font:inherit;color:inherit;background:#fff8;border:1px solid rgba(255,255,255,.8);border-radius:10px;min-height:28px;padding:1px 6px;cursor:pointer;box-shadow:0 1px 0 #C9B28A}" +
    "#apBar button:focus-visible{outline:3px solid #4F91C7;outline-offset:1px}#apBar .rn{font-weight:600}#apBar .chip{position:relative;display:inline-flex;align-items:center;gap:4px;padding:1px 6px 1px 2px}" +
    "#apBar .av{width:20px;height:20px;border-radius:50%;position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#fff;background:#8A7A70;flex:none}" +
    "#apBar .av b{position:absolute;left:0;right:0;top:0;height:9px;border-radius:10px 10px 0 0}#apBar .av i{position:absolute;left:0;right:0;bottom:0;height:7px}#apBar .nm{max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}" +
    "#apCard{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);width:230px;background:#F3E7CF;border:1px solid rgba(255,255,255,.8);border-radius:14px;box-shadow:0 2px 0 #C9B28A,0 8px 18px rgba(80,50,40,.3);padding:10px;font-size:12px;text-align:left}" +
    "#apCard p{margin:4px 0}#apFloat{position:absolute;left:0;right:0;bottom:100%;height:0;pointer-events:none}.apE{position:absolute;bottom:0;font-size:24px;animation:apUp 4s ease-out forwards}" +
    "@keyframes apUp{0%{transform:translate(-50%,0);opacity:0}10%{opacity:1}100%{transform:translate(-50%,-70px);opacity:0}}@media(prefers-reduced-motion:reduce){.apE{animation:apFade 4s forwards;transform:translate(-50%,-20px)}@keyframes apFade{0%,80%{opacity:1}100%{opacity:0}}}" +
    "@media(max-width:700px){body.cls #apBar{display:none}}";
  function el(tag, props, kids) { var e = document.createElement(tag); Object.keys(props || {}).forEach(function (k) { if (k === "text") e.textContent = props[k]; else if (k === "style") e.style.cssText = props[k]; else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), props[k]); else e.setAttribute(k, props[k]); }); (kids || []).forEach(function (c) { if (c) e.appendChild(c); }); return e; }
  function avatar(spec, name) {
    spec = spec || {}; var a = el("span", { class: "av", style: spec.skin ? "background:" + safe(spec.skin) : "" });
    if (spec.skin) { a.appendChild(el("b", { style: "background:" + safe(spec.hair || "#4A3B3F") })); a.appendChild(el("i", { style: "background:" + safe(spec.shirt || "#4F91C7") })); }
    else a.textContent = String(name || "?").trim().slice(0, 1).toUpperCase();
    return a;
  }
  function safe(c) { c = String(c); return /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i.test(c) ? c : "#888"; }
  var collapsed = function () { return !joined || ls("unify.presence.bar") === "0"; };

  function render() {
    if (dead || !bar) return; bar.textContent = "";
    var pill = collapsed(); bar.className = pill ? "pill" : "";
    if (!joined) {
      var txt = hinted ? "👁 Who's here" : "Sign in with your family account to see classmates"; hinted = true;
      bar.appendChild(el("span", { text: txt })); bar.onclick = null; return;
    }
    if (pill) { bar.appendChild(el("span", { text: "👁 " + (NAMES[curRoom] || curRoom) + " · " + list.length })); bar.onclick = function () { lset("unify.presence.bar", "1"); render(); }; return; }
    bar.onclick = null;
    bar.appendChild(el("span", { class: "rn", text: NAMES[curRoom] || curRoom }));
    var chips = el("span", { style: "display:inline-flex;gap:2px;flex-wrap:wrap" });
    chips.appendChild(chip({ id: "__me", name: "You", spec: myState().avatar }, true));
    list.slice(0, 8).forEach(function (p) { chips.appendChild(chip(p)); });
    if (list.length > 8) chips.appendChild(el("span", { text: "+" + (list.length - 8) }));
    bar.appendChild(chips);
    var em = el("span", { style: "display:inline-flex;gap:2px" });
    P.EMOTES.forEach(function (e) { em.appendChild(el("button", { type: "button", title: e.label, "aria-label": e.label, text: e.emoji, onclick: function () { sendEmote(e.id); } })); });
    bar.appendChild(em);
    var on = P.enabled();
    bar.appendChild(el("button", { type: "button", "aria-pressed": String(on), text: "👁 Visible: " + (on ? "on" : "off"), onclick: function () { P.setEnabled(!P.enabled()); if (P.enabled()) P.announce(myState(), true); render(); } }));
    bar.appendChild(el("button", { type: "button", title: "Collapse", "aria-label": "Collapse", text: "−", onclick: function () { lset("unify.presence.bar", "0"); render(); } }));
    var them = sel && list.filter(function (p) { return p.id === sel; })[0]; if (them) bar.appendChild(card(them)); else sel = null;
    bar.appendChild(fl);
  }
  function chip(p, me) {
    var c = el("button", { type: "button", class: "chip", "data-id": p.id, title: p.name, onclick: function () { if (!me) { sel = sel === p.id ? null : p.id; render(); } } }, [avatar(p.spec, p.name), el("span", { class: "nm", text: p.name || "?" })]);
    return c;
  }
  function card(p) {
    var line = p.grade != null ? PN.gradeName(p.grade) : (PN.BANDS[p.band] || "");
    var kids = [el("b", { text: p.name }), el("p", { text: line })];
    if (p.canChat && p.open) kids.push(el("button", { type: "button", text: "Say hi in Messages", onclick: function () { var b = document.getElementById("tPhone"); if (b) b.click(); } }));
    else { if (p.why) kids.push(el("p", { text: p.why })); kids.push(el("p", { text: "You can send emotes to anyone." })); }
    return el("div", { id: "apCard" }, kids);
  }
  function float(id, emoji) {
    var f = fl, c = bar && bar.querySelector('[data-id="' + id + '"]'); if (!f || !c) return;
    var s = el("span", { class: "apE", text: emoji, style: "left:" + (c.offsetLeft + c.offsetWidth / 2) + "px" }); f.appendChild(s); timers.push(setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 4100));
  }
  function track(l) { l.forEach(function (p) { if (p.emote && seen[p.id] !== p.emoteAt) { seen[p.id] = p.emoteAt; var e = P.EMOTES.filter(function (x) { return x.id === p.emote; })[0]; if (e) { render(); float(p.id, e.emoji); } } }); }
  function sendEmote(id) { if (!P.emote(id)) return false; var e = P.EMOTES.filter(function (x) { return x.id === id; })[0]; float("__me", e.emoji); return true; }

  /* ---------- boot */
  function boot() {
    if (dead) return;
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    bar = el("div", { id: "apBar", role: "region", "aria-label": "Who's here" }); document.body.appendChild(bar);
    render();
    PN.me().catch(function () { return null; }).then(function () { return P.autoJoin(); }).then(function (ok) {
      if (dead) return; joined = !!ok; if (!joined) { render(); return; }
      curRoom = roomNow(); P.setRoom(curRoom); P.announce(myState(), true); resub(); render();
      timers.push(setInterval(function () { var r = roomNow(); if (r !== curRoom) setRoom(r); }, 400));
      timers.push(setInterval(function () { P.announce(myState()); }, 5000));
    }).catch(function () { /* stay quiet */ });
  }
  window.addEventListener("pagehide", function () { try { P.clear(); } catch (e) { /* ignore */ } });
  window.addEventListener("unify:presence-change", function () { if (!P.enabled()) list = []; render(); });
  window.__presence = {
    setRoom: function (r) { setRoom(r); }, room: function () { return curRoom; }, emote: sendEmote,
    refresh: function () { resub(); render(); },
    destroy: function () { dead = true; timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); if (unwatch) unwatch(); try { P.clear(); } catch (e) { /* ignore */ } if (bar && bar.parentNode) bar.parentNode.removeChild(bar); delete window.__presence; }
  };
  setTimeout(function () { if (document.body) boot(); else document.addEventListener("DOMContentLoaded", boot); }, 2500);
})();
