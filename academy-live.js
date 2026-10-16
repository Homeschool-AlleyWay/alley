/* UNIFY Academy live layer: shows what the Newsroom publishes (bulletin, banner, events) on every page, live. Include after supabase-config.js and supabase-client.js. Inside the shell iframe it only listens; the top window draws the UI. */
(function () {
  "use strict";
  if (window.__live) return;
  var PAL = {
    sun: { n: "Sun", c: ["#FFE27A", "#FFB84D"], t: "#4A3B3F" },
    sky: { n: "Sky", c: ["#BFE3FF", "#7FB8E8", "#4F91C7"], t: "#1F2F44" },
    mint: { n: "Mint", c: ["#C9F2DC", "#8FDDB5"], t: "#1F4034" },
    berry: { n: "Berry", c: ["#E56B9A", "#9B3F8C"], t: "#FFFFFF" },
    sunset: { n: "Sunset", c: ["#FFB36B", "#F0707A", "#B8508F"], t: "#FFFFFF" },
    ocean: { n: "Ocean", c: ["#2E86C1", "#1B4F8A"], t: "#FFFFFF" },
    forest: { n: "Forest", c: ["#4C9A5F", "#25613A"], t: "#FFFFFF" },
    night: { n: "Night", c: ["#3B3F72", "#1B1D3F"], t: "#FFFFFF" },
    candy: { n: "Candy", c: ["#FFC2E0", "#C7B6FF", "#A8E6FF"], t: "#4A3B3F" },
    paper: { n: "Paper", c: ["#F3E7CF", "#EADFCB"], t: "#4A3B3F" }
  };
  var topWin = window.parent === window;
  var st = { posts: [], events: [], settings: {}, canEdit: false };
  var rawP = [], rawE = [], subs = [], seenP = null, seenE = null, client = null, ui = {}, boardTab = "", busy = false;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function now() { return Date.now(); }
  function ms(s) { var t = Date.parse(s); return isNaN(t) ? 0 : t; }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function grad(item) {
    var p = PAL[item.theme] || PAL.sun, c = p.c.slice();
    if (item.accent) c.push(item.accent);
    return "linear-gradient(120deg," + c.join(",") + ")";
  }
  function txtCol(item) { return (PAL[item.theme] || PAL.sun).t; }
  function fmt(s) { try { return new Date(s).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit", month: "short", day: "numeric" }); } catch (e) { return ""; } }
  function grade() {
    try {
      var f = JSON.parse(localStorage.getItem("unify.family.link") || "null");
      if (!f) return null;
      if (typeof f.grade === "number" && f.grade >= 0 && f.grade <= 12) return f.grade;
      if (f.grade !== undefined && f.grade !== null && f.grade !== "" && !isNaN(+f.grade)) return Math.max(0, Math.min(12, +f.grade));
      var m = { k2: 1, g35: 4, g68: 7, hs: 10 };
      return m[f.band] !== undefined ? m[f.band] : null;
    } catch (e) { return null; }
  }
  function gOk(i, g) { return g === null || (i.grade_min <= g && g <= i.grade_max); }
  function evState(e) {
    var t = now(), s = ms(e.starts_at), en = e.ends_at ? ms(e.ends_at) : 0;
    if (e.live) return "live";
    if (en && en < t) return "ended";
    if (s > t) return s - t < 3600000 ? "soon" : "upcoming";
    return en ? "live" : "ended";
  }

  /* ---------- data ---------- */
  function compute() {
    var t = now(), g = grade(), s = st.settings, lay = s["bulletin.layout"] || {}, ev = s["events.display"] || {};
    var days = Math.max(1, Math.min(30, +ev.showUpcomingDays || 14));
    st.posts = rawP.filter(function (p) { return p.status === "published" && ms(p.starts_at) <= t && (!p.ends_at || ms(p.ends_at) > t) && gOk(p, g); });
    st.posts.sort(function (a, b) {
      if (lay.sort !== "newest" && a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return ms(b.starts_at) - ms(a.starts_at);
    });
    st.events = rawE.filter(function (e) {
      if (e.status !== "published" || !gOk(e, g)) return false;
      var stt = evState(e);
      if (stt === "live") return true;
      if (stt === "ended") return ev.showEnded === true && ms(e.starts_at) > t - 86400000;
      return ms(e.starts_at) < t + days * 86400000;
    }).sort(function (a, b) { return ms(a.starts_at) - ms(b.starts_at); });
  }
  function emit() {
    var d = { posts: st.posts, events: st.events, settings: st.settings };
    st.data = d;
    try { window.dispatchEvent(new CustomEvent("academy:live", { detail: d })); } catch (e) {}
    relay();
    subs.forEach(function (f) { try { f(d); } catch (e) {} });
  }
  function relay(target) {
    var m = { type: "academy:live", posts: st.posts, events: st.events, settings: st.settings };
    var fr = target ? [target] : document.querySelectorAll("iframe");
    Array.prototype.forEach.call(fr, function (f) { try { f.contentWindow.postMessage(m, window.location.origin); } catch (e) {} });
  }
  async function getClient() {
    if (client) return client;
    if (!window.__SUPABASE || !window.__supa) return null;
    try { client = await window.__supa(); } catch (e) { client = null; }
    return client;
  }
  async function refresh() {
    if (!topWin || busy) return;
    busy = true;
    try {
      var c = await getClient();
      if (c) {
        var a = new Date(now() - 7200000).toISOString(), n = new Date().toISOString();
        var r = await Promise.all([
          c.from("news_posts").select("*").eq("status", "published").or("ends_at.is.null,ends_at.gt." + n).order("pinned", { ascending: false }).order("starts_at", { ascending: false }).limit(60),
          c.from("academy_events").select("*").eq("status", "published").or("live.eq.true,ends_at.gt." + a + ",starts_at.gt." + a).order("starts_at", { ascending: true }).limit(60),
          c.from("app_settings").select("key,value").in("key", ["newsroom.theme", "bulletin.layout", "live.banner", "events.display"])
        ]);
        if (!r[0].error) rawP = r[0].data || [];
        if (!r[1].error) rawE = r[1].data || [];
        if (!r[2].error) { var s = {}; (r[2].data || []).forEach(function (x) { s[x.key] = x.value || {}; }); st.settings = s; }
      }
    } catch (e) {}
    busy = false;
    announce();
    tick();
  }
  function tick() { compute(); draw(); emit(); }
  function announce() {
    compute();
    var ids = {}, eids = {}, fresh = null;
    st.posts.forEach(function (p) { ids[p.id] = 1; if (seenP && !seenP[p.id] && !fresh) fresh = p.title; });
    st.events.forEach(function (e) { var k = e.id + (evState(e) === "live" ? ":L" : ""); eids[k] = 1; if (seenE && !seenE[k] && !fresh) fresh = (evState(e) === "live" ? "LIVE: " : "") + e.title; });
    if (seenP && fresh) { toast("New on the board: " + fresh); pulse(); }
    seenP = ids; seenE = eids;
  }
  async function checkEdit() {
    try {
      var c = await getClient(); if (!c) return;
      var r = await c.rpc("can_edit", { p_app: "newsroom" });
      st.canEdit = r.error ? false : r.data === true;
      live.canEdit = st.canEdit;
    } catch (e) { st.canEdit = false; live.canEdit = false; }
    if (ui.deskBtn) ui.deskBtn.hidden = !st.canEdit;
  }

  /* ---------- UI ---------- */
  var CSS = ".al-strip{position:fixed;left:0;right:0;z-index:90;display:none;align-items:center;gap:10px;padding:3px 10px;min-height:28px;font:500 13px Fredoka,system-ui,sans-serif;color:#4A3B3F;background:#F3E7CF;box-shadow:0 2px 0 #C9B28A;pointer-events:none}.al-strip.on{display:flex}.al-strip>*{pointer-events:auto}.al-ban{padding:2px 10px;border-radius:10px;font-weight:600;background:#4F91C7;color:#fff}.al-ban.alert{background:#c0392b}.al-ban.party{background:#E07A66}.al-tick{flex:1;overflow:hidden;white-space:nowrap;min-width:0;pointer-events:none}.al-tick span{display:inline-block;padding-left:100%;animation:alt 40s linear infinite}@keyframes alt{to{transform:translateX(-100%)}}.al-chip{font:inherit;color:#4A3B3F;border:1px solid #fff;border-radius:12px;min-height:28px;padding:2px 12px;cursor:pointer;box-shadow:0 2px 0 #C9B28A;background-size:200% 200%;max-width:55vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.al-chip.live{animation:alsh 3s ease infinite}@keyframes alsh{50%{background-position:100% 50%}}.al-btn{z-index:95}.al-float{position:fixed;left:10px;bottom:10px;font:500 14px Fredoka,system-ui,sans-serif;color:#4A3B3F;background:#F3E7CF;border:1px solid #fff;border-radius:12px;min-height:36px;padding:5px 14px;cursor:pointer;box-shadow:0 2px 0 #C9B28A,0 6px 10px rgba(80,50,40,.28)}.al-pulse{animation:alpu .8s ease 4}@keyframes alpu{50%{transform:scale(1.15);box-shadow:0 0 0 6px rgba(224,122,102,.5)}}.al-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:101;background:#4A3B3F;color:#fff;border-radius:12px;padding:8px 16px;font:500 14px Fredoka,system-ui,sans-serif;max-width:90vw;box-shadow:0 6px 16px rgba(0,0,0,.35)}.al-ov{position:fixed;inset:0;z-index:100;background:rgba(40,25,20,.55);display:flex;align-items:center;justify-content:center;padding:10px}.al-sheet{background:#EADFCB;color:#4A3B3F;border-radius:16px;box-shadow:0 3px 0 #C9B28A,0 12px 24px rgba(80,50,40,.3);width:min(920px,100%);max-height:92vh;display:flex;flex-direction:column;font-family:Fredoka,system-ui,sans-serif}.al-sheet header{display:flex;align-items:center;gap:8px;padding:12px 14px;flex-wrap:wrap}.al-sheet h2{margin:0;font-size:20px;flex:1}.al-tabs{display:flex;gap:6px;padding:0 14px 8px;flex-wrap:wrap}.al-b{font:inherit;color:#4A3B3F;background:#F3E7CF;border:1px solid #fff;border-radius:12px;min-height:36px;padding:4px 14px;cursor:pointer;box-shadow:0 2px 0 #C9B28A}.al-b.sel{background:#E07A66;color:#fff}.al-b:focus-visible,.al-chip:focus-visible,.al-float:focus-visible{outline:3px solid #4F91C7;outline-offset:2px}.al-wall{overflow:auto;padding:6px 14px 16px;display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}.al-wall.c1{grid-template-columns:1fr}.al-wall.c2{grid-template-columns:repeat(2,1fr)}.al-wall.c3{grid-template-columns:repeat(3,1fr)}@media(max-width:620px){.al-wall.c2,.al-wall.c3{grid-template-columns:1fr}}.al-card{border-radius:16px;padding:12px 14px;box-shadow:0 3px 0 #C9B28A,0 8px 14px rgba(80,50,40,.25);background-size:200% 200%;overflow-wrap:anywhere}.al-card.pin{animation:alsh 6s ease infinite}.al-card h3{margin:0 0 4px;font-size:1.1em}.al-card p{margin:4px 0;white-space:pre-wrap}.al-card small{opacity:.8}.al-card .ic{font-size:1.6em;float:right;margin-left:8px}.al-compact .al-card{padding:7px 10px}.al-empty{padding:24px;text-align:center;opacity:.8;grid-column:1/-1}@media(prefers-reduced-motion:reduce){.al-tick span,.al-chip.live,.al-card.pin,.al-pulse{animation:none!important}.al-tick span{padding-left:0;overflow:hidden;text-overflow:ellipsis}}";
  function ensureUI() {
    if (ui.strip || !topWin || !document.body) return;
    var s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s);
    ui.strip = el("div", "al-strip"); ui.strip.setAttribute("role", "status");
    ui.ban = el("span", "al-ban"); ui.tick = el("div", "al-tick"); ui.tickIn = el("span"); ui.tick.appendChild(ui.tickIn);
    ui.chip = el("button", "al-chip"); ui.chip.type = "button"; ui.chip.onclick = joinEvent;
    ui.strip.appendChild(ui.ban); ui.strip.appendChild(ui.tick); ui.strip.appendChild(ui.chip);
    document.body.appendChild(ui.strip);
    var btn = el("button", "al-btn", "📌 Bulletin"); btn.id = "tBoard"; btn.type = "button"; btn.setAttribute("aria-label", "Open the bulletin board");
    var ph = document.querySelector('#sideMenu .dyn[data-g="go"]');   // the shell keeps every action button in its side menu (Go group)
    if (ph && ph.parentNode) ph.parentNode.insertBefore(btn, ph); else { btn.className = "al-float al-btn"; document.body.appendChild(btn); }
    btn.onclick = openBoard; ui.btn = btn;
    window.addEventListener("resize", place);
  }
  function place() {
    if (!ui.strip) return;
    var nav = document.querySelector("nav"), top = 0;
    if (nav) { var r = nav.getBoundingClientRect(); if (r.height) top = Math.max(0, r.bottom); }
    ui.strip.style.top = top + "px";
  }
  function pulse() { if (!ui.btn) return; ui.btn.classList.remove("al-pulse"); void ui.btn.offsetWidth; ui.btn.classList.add("al-pulse"); }
  function toast(msg) {
    if (!topWin || !document.body) return;
    var t = el("div", "al-toast", msg); t.setAttribute("role", "status"); document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4500);
  }
  function nextEvent() {
    var l = null, n = null;
    st.events.forEach(function (e) { var s = evState(e); if (s === "live" && !l) l = e; else if ((s === "soon" || s === "upcoming") && !n) n = e; });
    return l || n;
  }
  function draw() {
    if (!topWin) return;
    ensureUI(); if (!ui.strip) return;
    var s = st.settings, b = s["live.banner"] || {}, lay = s["bulletin.layout"] || {}, any = false;
    var bOn = b.text && (!b.until || ms(b.until) > now());
    ui.ban.hidden = !bOn;
    if (bOn) { ui.ban.textContent = String(b.text).slice(0, 200); ui.ban.className = "al-ban " + (b.tone === "alert" || b.tone === "party" ? b.tone : ""); any = true; }
    var pins = lay.ticker === false ? [] : st.posts.filter(function (p) { return p.pinned; });
    ui.tick.hidden = !pins.length;
    if (pins.length) { ui.tickIn.textContent = pins.map(function (p) { return p.icon + " " + p.title; }).join("   •   "); any = true; }
    var e = nextEvent(); ui.ev = e; ui.chip.hidden = !e;
    if (e) {
      var live = evState(e) === "live";
      ui.chip.textContent = live ? "🎤 LIVE NOW: " + e.title + " — Join" : "Up next: " + e.title + " at " + fmt(e.starts_at);
      ui.chip.style.backgroundImage = grad(e); ui.chip.style.color = txtCol(e);
      ui.chip.className = "al-chip" + (live ? " live" : "");
      ui.chip.setAttribute("aria-label", ui.chip.textContent);
      any = true;
    }
    ui.strip.classList.toggle("on", !!any);
    place();
    if (ui.wall) renderBoard();
  }
  function joinEvent() {
    var e = ui.ev; if (!e) return;
    var A = window.__academy, subj = ["math", "ela", "science", "history", "careers", "life"];
    try {
      if (!A) { toast("Go to: " + e.room); return; }
      if (e.room === "auditorium") A.enter("news");
      else if (e.room === "classroom") A.enter(subj.indexOf(e.subject) >= 0 ? e.subject : "math");
      else if (e.room === "hallway") A.show("hall");
      else if (e.room === "newsroom") A.show("news");
      else if (e.room === "field-trip") A.enter("trip");
      else if (e.room === "open-door") A.enter("open");
    } catch (x) { toast("Go to: " + e.room); }
  }

  /* ---------- board modal ---------- */
  function card(it, kind, s) {
    var lay = s["bulletin.layout"] || {}, th = s["newsroom.theme"] || {};
    var c = el("article", "al-card" + ((it.pinned || it.live) ? " pin" : ""));
    c.style.backgroundImage = grad(it); c.style.color = txtCol(it);
    if (th.radius !== undefined && !isNaN(+th.radius)) c.style.borderRadius = Math.max(0, Math.min(24, +th.radius)) + "px";
    c.appendChild(el("span", "ic", it.icon || "📌"));
    c.appendChild(el("h3", "", (it.pinned ? "📌 " : "") + it.title));
    if (it.body || it.description) c.appendChild(el("p", "", it.body || it.description));
    var meta = [];
    if (kind === "event") { meta.push(({ auditorium: "Auditorium", classroom: "Classroom", hallway: "Hallway", newsroom: "Newsroom", "field-trip": "Field trip", "open-door": "The Open Door" })[it.room] || it.room); if (it.host) meta.push("with " + it.host); meta.push(evState(it) === "live" ? "LIVE NOW" : fmt(it.starts_at)); }
    else { if (lay.showAuthor !== false && it.author_name) meta.push("by " + it.author_name); if (lay.showDates !== false) meta.push(fmt(it.starts_at)); if (it.kind !== "bulletin") meta.push(it.kind); }
    if (meta.length) c.appendChild(el("small", "", meta.join(" · ")));
    return c;
  }
  function renderBoard() {
    var s = st.settings, lay = s["bulletin.layout"] || {}, th = s["newsroom.theme"] || {};
    var boards = [];
    st.posts.forEach(function (p) { var b = p.board || "main"; if (boards.indexOf(b) < 0) boards.push(b); });
    if (!boardTab) boardTab = boards[0] || "Events";
    ui.tabs.textContent = "";
    boards.concat(["Events"]).forEach(function (b) {
      var x = el("button", "al-b" + (b === boardTab ? " sel" : ""), b === "Events" ? "🎤 Events" : b); x.type = "button";
      x.setAttribute("aria-pressed", b === boardTab ? "true" : "false");
      x.onclick = function () { boardTab = b; renderBoard(); }; ui.tabs.appendChild(x);
    });
    ui.wall.textContent = "";
    ui.wall.className = "al-wall" + (/^[123]$/.test(String(lay.columns)) ? " c" + lay.columns : "") + (th.density === "compact" ? " al-compact" : "");
    ui.sheet.style.fontSize = (Math.max(0.9, Math.min(1.3, +th.fontScale || 1)) * 16) + "px";
    var list = boardTab === "Events" ? st.events : st.posts.filter(function (p) { return (p.board || "main") === boardTab; });
    list.forEach(function (it) { ui.wall.appendChild(card(it, boardTab === "Events" ? "event" : "post", s)); });
    if (!list.length) ui.wall.appendChild(el("div", "al-empty", boardTab === "Events" ? "No events coming up. Check back soon!" : "Nothing posted here yet."));
  }
  function openBoard() {
    if (!topWin) { try { window.parent.postMessage({ type: "academy:open-board" }, window.location.origin); } catch (e) {} return; }
    ensureUI(); if (!document.body || ui.ov) return;
    var ov = el("div", "al-ov"), sh = el("div", "al-sheet"), h = el("header");
    sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-label", "Bulletin board");
    h.appendChild(el("h2", "", "📌 Bulletin"));
    ui.deskBtn = el("button", "al-b", "Open the Desk"); ui.deskBtn.type = "button"; ui.deskBtn.hidden = !st.canEdit; ui.deskBtn.onclick = function () { closeBoard(); openDesk(); };
    var cl = el("button", "al-b", "Close"); cl.type = "button"; cl.setAttribute("aria-label", "Close the bulletin board"); cl.onclick = closeBoard;
    h.appendChild(ui.deskBtn); h.appendChild(cl);
    ui.tabs = el("div", "al-tabs"); ui.wall = el("div", "al-wall");
    sh.appendChild(h); sh.appendChild(ui.tabs); sh.appendChild(ui.wall); ov.appendChild(sh);
    ov.onclick = function (e) { if (e.target === ov) closeBoard(); };
    ov.onkeydown = function (e) { if (e.key === "Escape") closeBoard(); };
    document.body.appendChild(ov); ui.ov = ov; ui.sheet = sh; ui.prev = document.activeElement;
    renderBoard(); cl.focus();
  }
  function closeBoard() {
    if (ui.ov && ui.ov.parentNode) ui.ov.parentNode.removeChild(ui.ov);
    ui.ov = ui.wall = ui.tabs = null;
    try { if (ui.prev && ui.prev.focus) ui.prev.focus(); } catch (e) {}
  }
  function openDesk() {
    try { window.postMessage({ type: "academy:open-desk" }, window.location.origin); if (!topWin) window.parent.postMessage({ type: "academy:open-desk" }, window.location.origin); } catch (e) {}
    if (topWin && !window.__academy) location.href = "newsdesk.html";
  }

  /* ---------- wiring ---------- */
  var live = window.__live = {
    openBoard: openBoard, closeBoard: closeBoard, openDesk: openDesk, refresh: refresh, data: st.data, canEdit: false,
    on: function (f) { if (typeof f === "function") subs.push(f); }
  };
  live.data = { posts: [], events: [], settings: {} };
  st.data = live.data;
  Object.defineProperty(live, "data", { get: function () { return st.data; } });

  window.addEventListener("message", function (e) {
    if (e.origin !== window.location.origin) return;
    var m = e.data; if (!m || typeof m !== "object") return;
    if (m.type === "academy:open-board" && topWin) openBoard();
    if (m.type === "academy:live" && !topWin) {
      st.posts = m.posts || []; st.events = m.events || []; st.settings = m.settings || {};
      st.data = { posts: st.posts, events: st.events, settings: st.settings };
      subs.forEach(function (f) { try { f(st.data); } catch (x) {} });
    }
  });
  if (!topWin) return;

  document.addEventListener("load", function (e) { if (e.target && e.target.tagName === "IFRAME") relay(e.target); }, true);
  function start() {
    ensureUI();
    refresh().then(checkEdit);
    setInterval(function () { announce(); tick(); }, 20000);
    setInterval(refresh, 60000);
    getClient().then(function (c) {
      if (!c) return;
      try {
        var d; var go = function () { clearTimeout(d); d = setTimeout(refresh, 400); };
        ["news_posts", "academy_events", "app_settings"].forEach(function (t) {
          c.channel("academy-live-" + t).on("postgres_changes", { event: "*", schema: "public", table: t }, go).subscribe();
        });
        c.auth.onAuthStateChange(function () { checkEdit(); });
      } catch (e) {}
    }).catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
