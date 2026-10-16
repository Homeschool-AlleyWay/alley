/* Calm UI: every on-screen button group is small and tucked away. Double-tap (or double-click) the scene to show them; they fade again by themselves
 * after a few seconds. Keyboard shortcuts keep working, and pressing Tab also reveals them. Grown-ups can keep buttons visible from Today > Look & sound. */
(function () {
  "use strict";
  if (window.__calm) return; window.__calm = 1;
  var shell = !!window.__calmShell, root = document.documentElement, T = null, MS = 7000;
  var G = shell ? "" : ".hud,.rot,#top,.hint,#steps,#emoBtn,#skipArr";
  var COMPACT = "#emoBtn,#skipArr,.calm-g button,.calm-g .tag,.calm-g .btn,#talkChip,#lockerChip,#boardChip,.tabs button";
  var css = document.createElement("style");
  css.textContent =
    ".calm-g{transition:opacity .25s ease,transform .25s ease;gap:5px!important}" +
    "html.calm-off .calm-g,html.calm-off .calm-g *{opacity:0!important;pointer-events:none!important}" +
    "html.calm-off .calm-g{transform:translateY(-3px)}" +
    COMPACT + "{font-size:12px!important;min-height:28px!important;padding:3px 9px!important;border-radius:9px!important;box-shadow:0 1px 0 rgba(120,90,60,.35),0 3px 6px rgba(0,0,0,.18)!important;opacity:.95}" +
    ".calm-g .tag{padding:3px 9px!important}.calm-g .tag .bar{width:56px!important;height:5px!important}" +
    ".rot button{min-width:0!important;width:34px!important;height:34px!important;padding:0!important}" +
    ((!shell && parent !== window && !/classroom/.test(location.pathname)) ? "html:not(.calm-off) .hud,html:not(.calm-off) #top{top:calc(50px + env(safe-area-inset-top,0px))!important}" : "") +
    ".pad{opacity:.3;transform:scale(.7);transform-origin:bottom right;transition:opacity .2s}.pad:active,.pad:has(button:active){opacity:.85}" +
    "#calmHint{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:90;background:rgba(74,59,63,.78);color:#fff;font:12px/1.2 'Fredoka','Trebuchet MS',system-ui,sans-serif;padding:6px 12px;border-radius:99px;pointer-events:none;opacity:0;transition:opacity .4s}" +
    "#calmHint.on{opacity:1}" +
    (shell ? "body{padding:0!important}" : "");
  document.head.appendChild(css);
  function mark() { if (!G) return; var n = document.querySelectorAll(G); for (var i = 0; i < n.length; i++) n[i].classList.add("calm-g"); }
  function always() { try { return localStorage.getItem("unify.ui.always") === "1"; } catch (e) { return false; } }
  function tell(show) { if (!shell) try { parent.postMessage({ type: "unify:ui", show: show }, "*"); } catch (e) { /* ignore */ } }
  function set(show) { clearTimeout(T); root.classList.toggle("calm-off", !show); tell(show); if (show && !always()) T = setTimeout(function () { set(false); }, MS); }
  function bump() { if (!root.classList.contains("calm-off") && !always()) { clearTimeout(T); T = setTimeout(function () { set(false); }, MS); } }
  mark(); new MutationObserver(mark).observe(document.body, { childList: true, subtree: true });
  root.classList.add("calm-off"); if (always()) set(true);
  var hint = document.createElement("div"); hint.id = "calmHint"; hint.textContent = "Double-tap for buttons"; document.body.appendChild(hint);
  if (!shell && !always()) try { if (!sessionStorage.getItem("unify.calm.seen")) { sessionStorage.setItem("unify.calm.seen", "1"); setTimeout(function () { hint.classList.add("on"); setTimeout(function () { hint.classList.remove("on"); }, 4200); }, 1800); } } catch (e) { /* ignore */ }
  var last = 0, lx = 0, ly = 0, dx = 0, dy = 0, moved = false;
  var inUI = function (t) { return t && t.closest && t.closest("button,input,textarea,select,a,label,.calm-g,.hb,.menu,#goMenu,#cap,#ask,#picker,.panel,[role=dialog],.lpanel"); };
  addEventListener("pointerdown", function (e) { dx = e.clientX; dy = e.clientY; moved = false; if (inUI(e.target)) bump(); }, true);
  addEventListener("pointermove", function (e) { if (Math.abs(e.clientX - dx) + Math.abs(e.clientY - dy) > 12) moved = true; }, true);
  addEventListener("pointerup", function (e) {
    if (inUI(e.target) || moved) { last = 0; return; }
    var now = e.timeStamp || Date.now();
    if (now - last < 450 && Math.hypot(e.clientX - lx, e.clientY - ly) < 40) { last = 0; set(root.classList.contains("calm-off")); } else { last = now; lx = e.clientX; ly = e.clientY; }
  }, true);
  addEventListener("keydown", function (e) { if (e.key === "Tab") set(true); else bump(); }, true);
  addEventListener("unify:ui-pref", function () { if (always()) set(true); else set(false); });
  if (shell) addEventListener("message", function (e) { var m = e.data; if (m && m.type === "unify:ui") { clearTimeout(T); root.classList.toggle("calm-off", !m.show); } });
  /* Shell bridge: when a scene page is embedded in index.html its top button bars are hidden; the shell shows the same buttons in its side menu
   * (Go / Me / Tools) and the camera choices in its Views pull-down. We publish them (postMessage, same origin only) and act on the shell's clicks. */
  if (!shell && parent !== window) {
    var page = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
    var $ = function (id) { return document.getElementById(id); };
    var A = function (g, ids) { return ids.map(function (i) { return { g: g, id: i }; }); };
    var HALLV = ["Close-up", "Overview", "First person"];
    var CFG = {
      hallway3d: { acts: [].concat(A("go", ["bToday", "bTimes"]), A("me", ["bFriends", "bLocker", "bOpenLocker", "bAvatar", "bCloset", "bTake"]), A("tools", ["bSpd", "bGfx"])), walk: true,
        views: function () { var t = ($("bView") || {}).textContent || ""; return { options: HALLV.map(function (n) { return { id: n, label: n }; }), current: HALLV.filter(function (n) { return t.indexOf(n) >= 0; })[0] || HALLV[0] }; },
        pick: function (id) { var b = $("bView"); for (var i = 0; b && i < 3 && b.textContent.indexOf(id) < 0; i++) b.click(); } },
      classroom3d: { acts: [].concat(A("go", ["bTimes", "bBook", "bElect", "bPacks"]), A("me", ["bFriends", "bAvatar", "bCloset"]), A("tools", ["bHand", "bSkip", "bLab", "bNext", "bExtra", "bVoice", "bTake", "bAssess"])),
        views: function () { return dv("[data-cam]", "cam", "auto"); }, pick: function (id) { var b = document.querySelector('[data-cam="' + id + '"]'); if (b) b.click(); } },
      auditorium3d: { acts: [].concat(A("go", ["bNews", "bShow", "bAssembly"]), A("tools", ["bSound", "bPrayer", "bSkip"])),
        views: function () { return dv("[data-v]", "v", "audience"); }, pick: function (id) { var b = document.querySelector('[data-v="' + id + '"]'); if (b) b.click(); } },
      fieldtrip: { acts: [].concat(A("go", ["bTrips"]), A("tools", ["bGyro", "bVR", "bNotes", "bVoice"])) }
    }[page];
    if (CFG) {
      var hide = document.createElement("style");
      hide.textContent = ".hud button,.menu,#goMenu,#top{display:none!important}";   // the lesson / clock readouts in .hud stay
      document.head.appendChild(hide);
      var dv = function (sel, key, dflt) {
        var bs = document.querySelectorAll(sel), cur = dflt, o = [];
        for (var i = 0; i < bs.length; i++) { o.push({ id: bs[i].dataset[key], label: bs[i].textContent.trim() }); if (bs[i].classList.contains("on")) cur = bs[i].dataset[key]; }
        return { options: o, current: cur };
      };
      var SO = location.origin === "null" ? "*" : location.origin;
      var trust = function (e) { return e.source === parent && (location.origin === "null" || e.origin === location.origin); };
      var keyEl = function (k) {
        if (k.indexOf("id:") === 0) return $(k.slice(3));
        if (k.indexOf("go:") === 0) return $("goMenu") ? $("goMenu").querySelectorAll("button")[+k.slice(3)] : null;
        return null;
      };
      var vis = function (el) { return !!el && !el.hidden && !el.closest("[hidden]"); };
      var last = "";
      var publish = function (force) {
        var acts = [];
        CFG.acts.forEach(function (a) { var el = $(a.id); if (el) acts.push({ key: "id:" + a.id, group: a.g, label: el.textContent.replace(/\s+/g, " ").trim(), hidden: !vis(el), pressed: el.hasAttribute("aria-pressed") ? el.getAttribute("aria-pressed") === "true" : null }); });
        if (CFG.walk && $("goMenu")) $("goMenu").querySelectorAll("button").forEach(function (b, i) { acts.push({ key: "go:" + i, group: "go", label: "Walk to " + b.textContent.trim(), hidden: false, pressed: null }); });
        var m = { type: "shell:scene", page: page, actions: acts, views: CFG.views ? CFG.views() : null }, j = JSON.stringify(m);
        if (j !== last || force === true) { last = j; try { parent.postMessage(m, SO); } catch (x) { /* ignore */ } }
      };
      addEventListener("message", function (e) {
        var m = e.data; if (!m || !trust(e)) return;
        if (m.type === "shell:request") publish(true);
        else if (m.type === "shell:click") { var el = keyEl(String(m.key)); if (el) { el.click(); setTimeout(publish, 60); } }
        else if (m.type === "shell:view" && CFG.pick) { CFG.pick(String(m.id)); setTimeout(publish, 60); }
      });
      setInterval(publish, 700); setTimeout(publish, 300);
    }
  }
})();
