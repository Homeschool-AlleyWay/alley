/* UNIFY Flip Phone: people network (real accounts messaging real accounts).
 *
 * Who may talk to whom (enforced here AND in net_allowed() in supabase/academy-schema.sql):
 *   - the same family: always (a parent and their own children, brothers and sisters)
 *   - two grown-ups: yes (any account that joined as an adult)
 *   - two students: only in the same grade or one grade above/below, and only if BOTH families switched on "open to other families"
 *   - an adult and somebody else's child: never. If a parent wants to talk to another family, the parent talks to the other parent.
 * Students only exist inside a parent's family account (no child login, no child email); their ids look like <parentUid>_<kidId>.
 * Backends: "cloud" (Supabase, needs the schema applied) or "local" (this browser only, used for testing / offline demo).
 */
(function () {
  "use strict";
  var BANDS = { k2: "K-2", g35: "Grades 3-5", g68: "Grades 6-8", hs: "High school", adult: "Grown-up" };
  var famOf = function (id) { return String(id).split("_")[0]; };
  var BAND_GRADE = { k2: 1, g35: 4, g68: 7, hs: 10 };
  var bandGrade = function (band) { return BAND_GRADE[band]; };
  var gradeName = function (g) { g = Number(g); return g === 0 ? "Kindergarten" : "Grade " + g; };
  var isNum = function (g) { return typeof g === "number" && isFinite(g); };
  /** same grade or one above/below when both grades are known, else the same band */
  var gradeOk = function (a, b) { return isNum(a.grade) && isNum(b.grade) ? Math.abs(a.grade - b.grade) <= 1 : a.band === b.band; };
  /** the single source of truth for the rule (mirrored in net_allowed() in supabase/migrations/20261012000000_school_wide_presence.sql) */
  function canChat(a, b) {
    if (!a || !b || a.id === b.id) return false;
    if (famOf(a.id) === famOf(b.id)) return true;
    if (a.role === "adult" && b.role === "adult") return true;
    if (a.role === "kid" && b.role === "kid" && gradeOk(a, b) && a.open === true && b.open === true) return true;
    return false;
  }
  var why = function (a, b) {
    if (canChat(a, b)) return "";
    if (a.role !== b.role) return "Grown-ups and kids from different families can't message each other. A parent can message the other parent.";
    if (a.role === "kid" && !gradeOk(a, b)) {
      if (!isNum(a.grade)) return "Students can only message students in their own grade band (" + BANDS[a.band] + ").";
      var gs = [a.grade - 1, a.grade, a.grade + 1].filter(function (g) { return g >= 0 && g <= 12; }).map(gradeName);
      return "Students can message students in their own grade or one grade above or below (" + gs.join(", ") + ").";
    }
    if (a.role === "kid") return "Both families need to switch on 'open to other families' first.";
    return "That conversation isn't allowed.";
  };
  var tidOf = function (x, y) { return [x, y].sort().join("|"); };
  var clean = function (h) { return String(h || "").toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20); };
  var bad = /(fuck|shit|bitch|nigg|fag|cunt|dick|porn|sex|rape|nazi|kill)/;

  /* safety: message filter + parent block list (mirrors src/game/safety.ts; the block list is stored by the parent tools on this device) */
  var BADRE = /\b(fuck\w*|shit\w*|bitch\w*|cunt|dick|nigg\w*|fag\w*|porn\w*|sex\w*|rape|nazi)\b/i;
  var PERSONAL = [[/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, "an email address"], [/\b(?:\+?\d[\s().-]?){9,}\b/g, "a phone number"], [/\bhttps?:\/\/\S+|\bwww\.\S+/gi, "a link"], [/\b\d{1,5}\s+[A-Za-z]+\s+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|court|ct|blvd|way)\b/gi, "an address"]];
  function cleanMessage(text) {
    var t = String(text || "").trim().slice(0, 500);
    if (BADRE.test(t)) return { text: "", blocked: "Let's keep it kind and school-friendly. That message wasn't sent." };
    var hit = null; PERSONAL.forEach(function (p) { p[0].lastIndex = 0; if (p[0].test(t)) { hit = p[1]; p[0].lastIndex = 0; t = t.replace(p[0], "\u2592\u2592\u2592"); } });
    return { text: t, blocked: hit ? "For safety, " + hit + " was hidden. Please don't share personal details online." : null };
  }
  var isBlocked = function (h) { try { var s = JSON.parse(localStorage.getItem("unify.safety.v1") || "null"); return !!(s && s.blocked && s.blocked.indexOf(String(h || "").toLowerCase()) >= 0); } catch (e) { return false; } };
  var kidMe = function () { return ME && ME.user && ME.user.role === "kid"; };

  /* ------------------------------------------------------------------ identity: who am I on this device? */
  function link() { try { return JSON.parse(localStorage.getItem("unify.family.link") || "null"); } catch (e) { return null; } }
  /** the family uid: a student's own sign-in (kidLogin) acts for the family */
  function famUid(authId) { var l = link(); return l && l.kidLogin && l.uid ? l.uid : authId; }
  function myGrade(l) { return l && l.kid ? (isNum(l.grade) ? l.grade : bandGrade(l.band)) : undefined; }
  var colErr = function (e) { return !!e && (e.code === "42703" || e.code === "PGRST204" || /column/i.test(e.message || "")); };

  /* ------------------------------------------------------------------ local backend (same browser only) */
  function localBackend() {
    var K = "unify.net.local", db = function () { try { return JSON.parse(localStorage.getItem(K) || "null") || { users: {}, handles: {}, threads: {}, msgs: {} }; } catch (e) { return { users: {}, handles: {}, threads: {}, msgs: {} }; } };
    var put = function (d) { localStorage.setItem(K, JSON.stringify(d)); };
    var listeners = []; addEventListener("storage", function (e) { if (e.key === K) listeners.forEach(function (f) { f(); }); });
    var myId = function () { var l = link(); if (l && l.kid) return (l.uid || "local") + "_" + l.kid; var s = sessionStorage.getItem("unify.net.localId"); if (!s) { s = "L" + Math.random().toString(36).slice(2, 10); sessionStorage.setItem("unify.net.localId", s); } return s; };
    return {
      kind: "local",
      identity: function () { var l = link(); return Promise.resolve({ id: myId(), role: l && l.kid ? "kid" : "adult", band: l && l.kid ? l.band : "adult", grade: myGrade(l) }); },
      getUser: function (id) { return Promise.resolve(db().users[id] || null); },
      byHandle: function (h) { var d = db(), id = d.handles[h]; return Promise.resolve(id ? d.users[id] : null); },
      saveUser: function (u) { var d = db(); if (d.handles[u.handle] && d.handles[u.handle] !== u.id) return Promise.reject(new Error("That handle is taken.")); var old = d.users[u.id]; if (old && old.handle !== u.handle) delete d.handles[old.handle]; d.users[u.id] = u; d.handles[u.handle] = u.id; put(d); listeners.forEach(function (f) { f(); }); return Promise.resolve(); },
      ensureThread: function (me, other) { var d = db(), t = tidOf(me, other); if (!d.threads[t]) { d.threads[t] = { a: [me, other].sort()[0], b: [me, other].sort()[1], at: Date.now() }; d.msgs[t] = []; put(d); } return Promise.resolve(t); },
      send: function (t, from, text) { var d = db(); (d.msgs[t] = d.msgs[t] || []).push({ id: Math.random().toString(36).slice(2), from: from, text: text, at: Date.now() }); d.threads[t].at = Date.now(); put(d); listeners.forEach(function (f) { f(); }); return Promise.resolve(); },
      announce: function (me, doc) { var K2 = "unify.net.presence", m; try { m = JSON.parse(localStorage.getItem(K2) || "null") || {}; } catch (e) { m = {}; } m[me] = doc; Object.keys(m).forEach(function (k) { if (Date.now() - m[k].at > 60000) delete m[k]; }); try { localStorage.setItem(K2, JSON.stringify(m)); } catch (e) { /* full */ } return Promise.resolve(); },
      clearPresence: function (me) { var K2 = "unify.net.presence"; try { var m = JSON.parse(localStorage.getItem(K2) || "null") || {}; delete m[me]; localStorage.setItem(K2, JSON.stringify(m)); } catch (e) { /* ignore */ } return Promise.resolve(); },
      watchPresence: function (me, cb, room) { var K2 = "unify.net.presence", run = function () { var m; try { m = JSON.parse(localStorage.getItem(K2) || "null") || {}; } catch (e) { m = {}; } cb(Object.keys(m).filter(function (k) { return k !== me && (!room || m[k].room === room); }).map(function (k) { return m[k]; })); }; var h = function (e) { if (e.key === K2) run(); }; addEventListener("storage", h); var iv = setInterval(run, 2000); run(); return function () { removeEventListener("storage", h); clearInterval(iv); }; },
      watch: function (me, cb) { var run = function () { var d = db(), out = []; Object.keys(d.threads).forEach(function (t) { var th = d.threads[t]; if (th.a === me || th.b === me) out.push({ tid: t, other: th.a === me ? th.b : th.a, msgs: d.msgs[t] || [], user: d.users[th.a === me ? th.b : th.a] || null }); }); cb(out); }; listeners.push(run); run(); return function () { listeners = listeners.filter(function (f) { return f !== run; }); }; }
    };
  }


  /* ------------------------------------------------------------------ cloud backend (Supabase) */
  function supaBackend() {
    var cl = function () { return window.__supa(); };
    var oops = function (e, fallback) { var x = new Error((e && e.message) || fallback || "Something went wrong"); x.code = e && (e.code || e.error_code); return x; };
    var uid = null;
    var signedIn = async function (c) {
      var s = (await c.auth.getSession()).data.session;
      if (!s) { var r = await c.auth.signInAnonymously(); if (r.error) { var e = oops(r.error); if (r.error.code === "anonymous_provider_disabled") e.message = "Anonymous sign-in is switched off. (Owner: Supabase dashboard, Authentication, Sign In / Providers, turn on Allow anonymous sign-ins.)"; throw e; } s = r.data.session; }
      uid = s.user.id; return s.user;
    };
    var toUser = function (r) { return r ? { id: r.id, handle: r.handle, name: r.name, role: r.role, band: r.band, open: !!r.open, at: Number(r.at), owner: r.owner, grade: r.grade == null ? undefined : Number(r.grade), visible: r.visible !== false } : null; };
    var fromRow = function (m) { return { id: m.id, from: m.from_id, text: m.text, at: Number(m.at) }; };
    return {
      kind: "cloud",
      identity: async function () { var c = await cl(), u = await signedIn(c), l = link(); if (l && l.kid && !u.is_anonymous) return { id: famUid(u.id) + "_" + l.kid, role: "kid", band: l.band, grade: myGrade(l), anon: false }; return { id: u.id, role: "adult", band: "adult", anon: !!u.is_anonymous }; },
      getUser: async function (id) { var c = await cl(); await signedIn(c); var r = await c.from("net_users").select("*").eq("id", id).maybeSingle(); if (r.error) throw oops(r.error); return toUser(r.data); },
      byHandle: async function (h) { var c = await cl(); await signedIn(c); var r = await c.from("net_users").select("*").eq("handle", h).maybeSingle(); if (r.error) throw oops(r.error); return toUser(r.data); },
      saveUser: async function (u) { var c = await cl(), me = await signedIn(c); var row = { id: u.id, owner: famUid(me.id), handle: u.handle, name: u.name, role: u.role, band: u.band, open: !!u.open, at: u.at }; if (isNum(u.grade)) row.grade = u.grade; var r = await c.from("net_users").upsert(row); if (r.error && "grade" in row && colErr(r.error)) { delete row.grade; r = await c.from("net_users").upsert(row); } if (r.error) { if (r.error.code === "23505") throw new Error("That handle is taken."); throw oops(r.error, "Could not save your profile."); } u.owner = row.owner; },
      ensureThread: async function (me, other) {
        var c = await cl(), mu = await signedIn(c), t = tidOf(me, other), ex = await c.from("net_threads").select("tid").eq("tid", t).maybeSingle(); if (ex.error) throw oops(ex.error); if (ex.data) return t;
        var uo = await c.from("net_users").select("owner").eq("id", other).maybeSingle(); if (uo.error || !uo.data) throw oops(uo.error, "That person isn't available.");
        var ab = [me, other].sort(), owners = [famUid(mu.id), uo.data.owner].filter(function (x, i, a) { return a.indexOf(x) === i; });
        var r = await c.from("net_threads").insert({ tid: t, a: ab[0], b: ab[1], owners: owners, at: Date.now() }); if (r.error && r.error.code !== "23505") throw oops(r.error, "That conversation isn't allowed."); return t; },
      send: async function (t, from, text) { var c = await cl(); await signedIn(c); var r = await c.from("net_msgs").insert({ tid: t, from_id: from, text: text, at: Date.now() }); if (r.error) throw oops(r.error, "Could not send."); await c.from("net_threads").update({ at: Date.now() }).eq("tid", t); },
      watch: function (me, cb) {
        var alive = true, state = {}, ch = null, iv = null, busy = false;
        var push = function () { if (alive) cb(Object.keys(state).map(function (k) { return state[k]; }).sort(function (a, b) { return (b.last || 0) - (a.last || 0); })); };
        var load = async function () {
          if (busy || !alive) return; busy = true;
          try {
            var c = await cl(), u = await signedIn(c);
            var th = await c.from("net_threads").select("*").contains("owners", [famUid(u.id)]); if (th.error) throw th.error;
            for (var i = 0; i < th.data.length; i++) {
              var t = th.data[i]; if (t.a !== me && t.b !== me) continue; var other = t.a === me ? t.b : t.a;
              if (!state[t.tid]) { state[t.tid] = { tid: t.tid, other: other, msgs: [], user: null, last: 0 }; var us = await c.from("net_users").select("*").eq("id", other).maybeSingle(); state[t.tid].user = toUser(us.data); }
              var ms = await c.from("net_msgs").select("*").eq("tid", t.tid).order("at", { ascending: false }).limit(80); if (ms.error) throw ms.error;
              var list = ms.data.map(fromRow).reverse(), st = state[t.tid]; if (list.length !== st.msgs.length || (list.length && st.msgs[st.msgs.length - 1].id !== list[list.length - 1].id)) { st.msgs = list; st.last = list.length ? list[list.length - 1].at : 0; }
            }
            push();
          } catch (e) { push(); } finally { busy = false; }
        };
        cl().then(function (c) { if (!alive) return; ch = c.channel("net-" + Math.random().toString(36).slice(2)).on("postgres_changes", { event: "INSERT", schema: "public", table: "net_msgs" }, load).on("postgres_changes", { event: "INSERT", schema: "public", table: "net_threads" }, load).subscribe(); }).catch(function () { /* polling still works */ });
        load(); iv = setInterval(load, 4000);
        return function () { alive = false; clearInterval(iv); if (ch) cl().then(function (c) { c.removeChannel(ch); }); };
      },
      announce: async function (me, doc) { var c = await cl(), u = await signedIn(c); var d = Object.assign({}, doc); delete d.viewers; delete d.owner; var row = { id: me, owner: famUid(u.id), doc: d, viewers: [], at: Date.now(), room: d.room || "hall" }; var r = await c.from("net_presence").upsert(row); if (r.error && colErr(r.error)) { delete row.room; r = await c.from("net_presence").upsert(row); } if (r.error) throw oops(r.error); },
      clearPresence: async function (me) { var c = await cl(); await c.from("net_presence").delete().eq("id", me); },
      watchPresence: function (me, cb, room) {
        var alive = true, run = async function () { if (!alive) return; try { var c = await cl(); await signedIn(c); var since = Date.now() - 20000, r = room ? await c.from("net_presence").select("id,doc,at,room").eq("room", room).gt("at", since).limit(200) : await c.from("net_presence").select("id,doc,at,room").gt("at", since).limit(200);
            if (r.error && colErr(r.error)) { r = await c.from("net_presence").select("id,doc,at").gt("at", since).limit(200); if (!r.error && room) r.data = r.data.filter(function (x) { return !x.doc || !x.doc.room || x.doc.room === room; }); }
            if (r.error) throw r.error; cb(r.data.filter(function (x) { return x.id !== me; }).map(function (x) { return Object.assign({}, x.doc, { id: x.id, at: Number(x.at), room: x.room || (x.doc && x.doc.room) || "hall" }); })); } catch (e) { cb([]); } };
        run(); var iv = setInterval(run, 2500); return function () { alive = false; clearInterval(iv); };
      }
    };
  }

  /* ------------------------------------------------------------------ public API */
  var B = null, ME = null;
  function backend() { if (B) return B; B = window.__PHONE_NET_BACKEND || (window.__SUPABASE && window.__supa && !window.__PHONE_NET_LOCAL ? supaBackend() : localBackend()); return B; }
  window.PhoneNet = {
    BANDS: BANDS, gradeName: gradeName, bandGrade: bandGrade, canChat: canChat, why: why, famOf: famOf, clean: clean,
    mode: function () { return backend().kind; },
    meId: function () { return ME && ME.user ? ME.user.id : null; },
    /** my profile on the network, or null if I haven't joined yet. {ident, user} */
    me: async function () { var b = backend(), id = await b.identity(), u = await b.getUser(id.id); if (u && u.grade == null && id.grade != null) u.grade = id.grade; ME = { ident: id, user: u }; return ME; },
    join: async function (o) {
      var b = backend(), id = await b.identity(), h = clean(o.handle); if (h.length < 3) throw new Error("Pick a handle with at least 3 letters or numbers.");
      if (bad.test(h)) throw new Error("Please pick a friendlier handle.");
      var name = String(o.name || "").trim().slice(0, 24); if (!name) throw new Error("Add the name people will see.");
      if (bad.test(name.toLowerCase())) throw new Error("Please pick a friendlier name.");
      var prev = await b.getUser(id.id);
      var u = { id: id.id, handle: h, name: name, role: id.role, band: id.band, grade: id.grade, visible: prev ? prev.visible : undefined, open: id.role === "kid" ? !!(prev && prev.open) : true, at: prev ? prev.at : Date.now() };
      await b.saveUser(u); ME = { ident: id, user: u }; return u; },
    setOpen: async function (on) { if (!ME || !ME.user) throw new Error("Join first."); if (ME.user.role !== "kid") return; ME.user.open = !!on; await backend().saveUser(ME.user); },
    /** start (or reopen) a conversation with a handle. Throws with a friendly reason when the rule says no. */
    start: async function (handle) {
      var b = backend(); if (!ME || !ME.user) throw new Error("Join first."); var o = await b.byHandle(clean(handle));
      if (!o) throw new Error("Nobody has that handle."); if (o.id === ME.user.id) throw new Error("That's you!");
      if (isBlocked(o.handle)) throw new Error("That person is on your blocked list. A parent can change this in the Today panel.");
      var w = why(ME.user, o); if (w) throw new Error(w); var t = await b.ensureThread(ME.user.id, o.id); return { tid: t, other: o }; },
    send: async function (tid, text) { var c = cleanMessage(text); if (c.blocked && !c.text) throw new Error(c.blocked); text = c.text; if (!text) return; await backend().send(tid, ME.user.id, text); if (c.blocked) throw new Error(c.blocked); },
    cleanMessage: cleanMessage,
    /** a parent (PIN unlocked) reports and blocks a handle from the phone */
    block: function (handle, why) { try { var s = JSON.parse(localStorage.getItem("unify.safety.v1") || "null") || {}; s.blocked = s.blocked || []; s.reports = s.reports || []; var h = String(handle || "").toLowerCase(); if (s.blocked.indexOf(h) < 0) s.blocked.push(h); s.reports.push({ at: Date.now(), who: h, why: String(why || "").slice(0, 120) }); localStorage.setItem("unify.safety.v1", JSON.stringify(s)); } catch (e) { /* ignore */ } },
    isBlocked: isBlocked,
    /** conversations as seen by this device: blocked people are hidden, incoming text is filtered for children */
    /** school-wide presence: everyone the server lets me see appears in the room I am in; emotes only (no free text) */
    presence: (function () {
      var EMOTES = [{ id: "wave", emoji: "\uD83D\uDC4B", label: "Wave" }, { id: "thumbsup", emoji: "\uD83D\uDC4D", label: "Thumbs up" }, { id: "heart", emoji: "\u2764\uFE0F", label: "Heart" }, { id: "laugh", emoji: "\uD83D\uDE02", label: "Laugh" }, { id: "star", emoji: "\u2B50", label: "Star" }, { id: "clap", emoji: "\uD83D\uDC4F", label: "Clap" }];
      var last = 0, lastSt = {}, mem = "hall", ls = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
      var on = function () { return ls("unify.presence.on") !== "0"; };
      var cleanRoom = function (r) { r = String(r || "").toLowerCase(); return /^[a-z0-9-]{1,40}$/.test(r) ? r : "hall"; };
      var room = function () { var r = ls("unify.room"); return r ? cleanRoom(r) : mem; };
      var emoteNow = function () { try { var e = JSON.parse(ls("unify.emote") || "null"); if (e && Date.now() - e.at < 4000 && EMOTES.some(function (x) { return x.id === e.id; })) return e; } catch (x) { /* ignore */ } return null; };
      function announce(st, force) {
        if (!on() || !ME || !ME.user) return; var now = Date.now(); if (!force && now - last < 2500) return; last = now; st = st || {}; lastSt = st;
        if (room() === "hall" && typeof st.x === "number" && (st.x || st.z)) { try { localStorage.setItem("unify.hallpos", JSON.stringify({ x: st.x, z: st.z, dir: st.dir | 0 })); } catch (e) { /* ignore */ } }
        var u = ME.user, doc = { id: u.id, handle: u.handle, name: u.name, avatar: JSON.stringify(st.avatar || {}).slice(0, 1800), x: st.x, z: st.z, dir: st.dir | 0, moving: !!st.moving, at: now, room: room(), grade: u.grade, band: u.band, role: u.role, open: !!u.open }, em = emoteNow();
        if (em) { doc.emote = em.id; doc.emoteAt = em.at; }
        Promise.resolve().then(function () { return backend().announce(u.id, doc); }).catch(function () { /* offline or tables missing: stay quiet */ });
      }
      function entry(x, me) {
        var sp = {}; try { sp = JSON.parse(x.avatar); } catch (e) { /* ignore */ }
        var them = { id: x.id, role: x.role, band: x.band, grade: x.grade, open: x.open }, em = x.emote && x.emoteAt && Date.now() - x.emoteAt < 4000 && EMOTES.some(function (e) { return e.id === x.emote; });
        var o = { id: x.id, name: x.name, handle: x.handle, spec: sp, x: x.x, z: x.z, dir: x.dir, moving: x.moving, grade: x.grade, band: x.band, role: x.role, open: x.open, room: x.room, canChat: canChat(me, them), why: why(me, them) };
        if (em) { o.emote = x.emote; o.emoteAt = x.emoteAt; } return o;
      }
      function watchIn(rm, cb) {
        if (!ME || !ME.user) return function () {}; var me = ME.user;
        return backend().watchPresence(me.id, function (arr) { var now = Date.now(); cb(arr.filter(function (x) { return x && x.id !== me.id && now - x.at < 20000 && !isBlocked(x.handle); }).map(function (x) { return entry(x, me); })); }, rm);
      }
      return {
        EMOTES: EMOTES, enabled: on, room: room,
        setRoom: function (r) { mem = cleanRoom(r); try { localStorage.setItem("unify.room", mem); } catch (e) { /* ignore */ } return mem; },
        clear: function () { if (ME && ME.user) backend().clearPresence(ME.user.id); },
        setEnabled: function (v) { try { localStorage.setItem("unify.presence.on", v ? "1" : "0"); } catch (e) { /* ignore */ } if (!v && ME && ME.user) backend().clearPresence(ME.user.id); try { window.dispatchEvent(new CustomEvent("unify:presence-change", { detail: { on: !!v } })); } catch (e) { /* ignore */ } },
        /** call every second or so with the current state; throttled to one write every 2.5 s */
        announce: function (st, now) { announce(st, !!now); },
        /** last hallway position, so the shell heartbeat does not move the avatar */
        hallPos: function () { try { return JSON.parse(ls("unify.hallpos") || "null") || {}; } catch (e) { return {}; } },
        emote: function (id) { if (!EMOTES.some(function (e) { return e.id === id; })) return false; try { localStorage.setItem("unify.emote", JSON.stringify({ id: id, at: Date.now() })); } catch (e) { return false; } announce(lastSt, true); return true; },
        watchRoom: watchIn,
        watchAll: function (cb) { return watchIn(null, cb); },
        watch: function (cb) { return watchIn("hall", cb); },
        autoJoin: async function () {
          try {
            var b = backend(), m = await window.PhoneNet.me(); if (m.user) return true;
            if (b.kind === "cloud" && m.ident.anon) return false;
            var l = link(), name = "", sp; try { sp = JSON.parse(localStorage.getItem("unify.social.v1") || "null"); name = sp && sp.profile && sp.profile.name || ""; } catch (e) { /* ignore */ }
            name = String(name || (l && l.kidName) || "Student").trim().slice(0, 24) || "Student";
            for (var i = 0; i < 5; i++) {
              var h = clean(name).slice(0, 16), r = ""; while (r.length < 4) r += Math.random().toString(36).slice(2); h += r.slice(0, 4);
              try { await window.PhoneNet.join({ name: name, handle: h }); return true; } catch (e) { if (!/taken/i.test(e && e.message || "")) return false; }
            }
            return false;
          } catch (e) { return false; }
        }
      };
    })(),
    watch: function (cb) { return backend().watch(ME.user.id, function (list) { cb(list.filter(function (t) { return !(t.user && isBlocked(t.user.handle)); }).map(function (t) { if (!kidMe()) return t; return Object.assign({}, t, { msgs: t.msgs.map(function (m) { return m.from === ME.user.id ? m : Object.assign({}, m, { text: cleanMessage(m.text).text || "\u2026" }); }) }); })); }); }
  };
})();
