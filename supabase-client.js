/* Loads supabase-js (self-hosted in vendor/supabase.js, built from the npm package) on demand and shares one client (and one saved sign-in) across the game, the phone and the people network. Needs supabase-config.js first. */
(function () {
  "use strict";
  var cfg = window.__SUPABASE; if (!cfg) return; var p = null; var SRC = document.currentScript && document.currentScript.src ? new URL("vendor/supabase.js", document.currentScript.src).href : "vendor/supabase.js";
  window.__supa = function () {
    return p || (p = import(SRC).then(function (m) {
      return m.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "unify-academy-auth" }, realtime: { params: { eventsPerSecond: 5 } } });
    }));
  };
})();
