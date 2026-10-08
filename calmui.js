/* Calm UI: every on-screen button group is small and tucked away. Double-tap (or double-click) the scene to show them; they fade again by themselves
 * after a few seconds. Keyboard shortcuts keep working, and pressing Tab also reveals them. Grown-ups can keep buttons visible from Today > Look & sound. */
(function () {
  "use strict";
  if (window.__calm) return; window.__calm = 1;
  var shell = !!window.__calmShell, root = document.documentElement, T = null, MS = 7000;
  var G = shell ? "nav" : ".hud,.rot,#top,.hint,#steps,#emoBtn,#skipArr";
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
    (shell ? "nav .brand,#room{display:none!important}nav button,nav .tag{white-space:nowrap}nav{position:fixed!important;z-index:60;left:8px;right:8px;top:calc(6px + env(safe-area-inset-top,0px));height:34px;align-items:flex-start!important;padding:0!important;background:transparent!important;flex-wrap:nowrap!important;overflow-x:auto}nav .brand{font-size:13px!important}#room{font-size:11px!important}body{padding:0!important}" : "");
  document.head.appendChild(css);
  function mark() { var n = document.querySelectorAll(G); for (var i = 0; i < n.length; i++) n[i].classList.add("calm-g"); }
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
})();
