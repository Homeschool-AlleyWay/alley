/* UNIFY Flip Phone: people network (real accounts messaging real accounts).
 *
 * Who may talk to whom (enforced here AND in firestore.rules):
 *   - the same family: always (a parent and their own children, brothers and sisters)
 *   - two grown-ups: yes (any account that joined as an adult)
 *   - two students: only in the SAME grade band (K-2, 3-5, 6-8, high school), and only if BOTH families switched on "open to other families"
 *   - an adult and somebody else's child: never. If a parent wants to talk to another family, the parent talks to the other parent.
 * Students only exist inside a parent's family account (no child login, no child email); their ids look like <parentUid>_<kidId>.
 * Backends: "cloud" (Firestore, needs the rules in firestore.rules published) or "local" (this browser only, used for testing / offline demo).
 */
(function () {
  "use strict";
  var FBV = "https://www.gstatic.com/firebasejs/10.14.1/";
  var BANDS = { k2: "K-2", g35: "Grades 3-5", g68: "Grades 6-8", hs: "High school", adult: "Grown-up" };
  var famOf = function (id) { return String(id).split("_")[0]; };
  /** the single source of truth for the rule (mirrored in firestore.rules) */
  function canChat(a, b) {
    if (!a || !b || a.id === b.id) return false;
    if (famOf(a.id) === famOf(b.id)) return true;
    if (a.role === "adult" && b.role === "adult") return true;
    if (a.role === "kid" && b.role === "kid" && a.band === b.band && a.open === true && b.open === true) return true;
    return false;
  }
  var why = function (a, b) {
    if (canChat(a, b)) return "";
    if (a.role !== b.role) return "Grown-ups and kids from different families can't message each other. A parent can message the other parent.";
    if (a.role === "kid" && a.band !== b.band) return "Students can only message students in their own grade band (" + BANDS[a.band] + ").";
    if (a.role === "kid") return "Both families need to switch on 'open to other families' first.";
    return "That conversation isn't allowed.";
  };
  var tidOf = function (x, y) { return [x, y].sort().join("|"); };
  var clean = function (h) { return String(h || "").toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20); };
  var bad = /(fuck|shit|bitch|nigg|fag|cunt|dick|porn|sex|rape|nazi|kill)/;

  /* ------------------------------------------------------------------ identity: who am I on this device? */
  function link() { try { return JSON.parse(localStorage.getItem("unify.family.link") || "null"); } catch (e) { return null; } }

  /* ------------------------------------------------------------------ local backend (same browser only) */
  function localBackend() {
    var K = "unify.net.local", db = function () { try { return JSON.parse(localStorage.getItem(K) || "null") || { users: {}, handles: {}, threads: {}, msgs: {} }; } catch (e) { return { users: {}, handles: {}, threads: {}, msgs: {} }; } };
    var put = function (d) { localStorage.setItem(K, JSON.stringify(d)); };
    var listeners = []; addEventListener("storage", function (e) { if (e.key === K) listeners.forEach(function (f) { f(); }); });
    var myId = function () { var l = link(); if (l && l.kid) return (l.uid || "local") + "_" + l.kid; var s = sessionStorage.getItem("unify.net.localId"); if (!s) { s = "L" + Math.random().toString(36).slice(2, 10); sessionStorage.setItem("unify.net.localId", s); } return s; };
    return {
      kind: "local",
      identity: function () { var l = link(); return Promise.resolve({ id: myId(), role: l && l.kid ? "kid" : "adult", band: l && l.kid ? l.band : "adult" }); },
      getUser: function (id) { return Promise.resolve(db().users[id] || null); },
      byHandle: function (h) { var d = db(), id = d.handles[h]; return Promise.resolve(id ? d.users[id] : null); },
      saveUser: function (u) { var d = db(); if (d.handles[u.handle] && d.handles[u.handle] !== u.id) return Promise.reject(new Error("That handle is taken.")); var old = d.users[u.id]; if (old && old.handle !== u.handle) delete d.handles[old.handle]; d.users[u.id] = u; d.handles[u.handle] = u.id; put(d); listeners.forEach(function (f) { f(); }); return Promise.resolve(); },
      ensureThread: function (me, other) { var d = db(), t = tidOf(me, other); if (!d.threads[t]) { d.threads[t] = { a: [me, other].sort()[0], b: [me, other].sort()[1], at: Date.now() }; d.msgs[t] = []; put(d); } return Promise.resolve(t); },
      send: function (t, from, text) { var d = db(); (d.msgs[t] = d.msgs[t] || []).push({ id: Math.random().toString(36).slice(2), from: from, text: text, at: Date.now() }); d.threads[t].at = Date.now(); put(d); listeners.forEach(function (f) { f(); }); return Promise.resolve(); },
      watch: function (me, cb) { var run = function () { var d = db(), out = []; Object.keys(d.threads).forEach(function (t) { var th = d.threads[t]; if (th.a === me || th.b === me) out.push({ tid: t, other: th.a === me ? th.b : th.a, msgs: d.msgs[t] || [], user: d.users[th.a === me ? th.b : th.a] || null }); }); cb(out); }; listeners.push(run); run(); return function () { listeners = listeners.filter(function (f) { return f !== run; }); }; }
    };
  }

  /* ------------------------------------------------------------------ cloud backend (Firestore) */
  function cloudBackend() {
    var boot = null;
    var init = function () { return boot || (boot = (async function () {
      var cfg = window.__FIREBASE; if (!cfg) throw new Error("No Firebase config");
      var R = await Promise.all([import(FBV + "firebase-app.js"), import(FBV + "firebase-auth.js"), import(FBV + "firebase-firestore.js")]);
      var A = R[0], Au = R[1], F = R[2], app = A.getApps().length ? A.getApp() : A.initializeApp(cfg), auth = Au.getAuth(app), db = F.getFirestore(app);
      if (!auth.currentUser) await new Promise(function (res, rej) { var off = Au.onAuthStateChanged(auth, function (u) { if (u) { off(); res(); } }); Au.signInAnonymously(auth).catch(function (e) { off(); rej(e); }); });
      return { Au: Au, F: F, auth: auth, db: db };
    })()); };
    var D = function (f, path) { return f.F.doc.apply(null, [f.db].concat(path)); };
    return {
      kind: "cloud",
      identity: async function () { var f = await init(), l = link(), u = f.auth.currentUser, anon = u.isAnonymous; if (l && l.kid && !anon) return { id: u.uid + "_" + l.kid, role: "kid", band: l.band }; return { id: u.uid, role: "adult", band: "adult" }; },
      getUser: async function (id) { var f = await init(), s = await f.F.getDoc(D(f, ["netUsers", id])); return s.exists() ? s.data() : null; },
      byHandle: async function (h) { var f = await init(), s = await f.F.getDoc(D(f, ["netHandles", h])); if (!s.exists()) return null; var u = await f.F.getDoc(D(f, ["netUsers", s.data().id])); return u.exists() ? u.data() : null; },
      saveUser: async function (u) { var f = await init(), old = await f.F.getDoc(D(f, ["netUsers", u.id])); u.owner = f.auth.currentUser.uid;
        if (!old.exists() || old.data().handle !== u.handle) { try { await f.F.setDoc(D(f, ["netHandles", u.handle]), { id: u.id, owner: u.owner }); } catch (e) { throw new Error("That handle is taken."); } if (old.exists()) { try { await f.F.deleteDoc(D(f, ["netHandles", old.data().handle])); } catch (e) { /* stale handle */ } } }
        await f.F.setDoc(D(f, ["netUsers", u.id]), u); },
      ensureThread: async function (me, other) { var f = await init(), t = tidOf(me, other), s = await f.F.getDoc(D(f, ["netThreads", t]));
        if (!s.exists()) { var uo = await f.F.getDoc(D(f, ["netUsers", other])); var owners = [f.auth.currentUser.uid, uo.data().owner].filter(function (x, i, a) { return a.indexOf(x) === i; }); var ab = [me, other].sort(); await f.F.setDoc(D(f, ["netThreads", t]), { a: ab[0], b: ab[1], owners: owners, at: Date.now() }); } return t; },
      send: async function (t, from, text) { var f = await init(); await f.F.addDoc(f.F.collection(f.db, "netThreads", t, "msgs"), { from: from, text: text, at: Date.now() }); await f.F.updateDoc(D(f, ["netThreads", t]), { at: Date.now() }); },
      watch: function (me, cb) { var offs = [], state = {}, alive = true, push = function () { cb(Object.keys(state).map(function (k) { return state[k]; }).sort(function (a, b) { return (b.last || 0) - (a.last || 0); })); };
        init().then(function (f) { if (!alive) return; var q = f.F.query(f.F.collection(f.db, "netThreads"), f.F.where("owners", "array-contains", f.auth.currentUser.uid));
          offs.push(f.F.onSnapshot(q, function (snap) { snap.docChanges().forEach(function (ch) { var th = ch.doc.data(), t = ch.doc.id; if (th.a !== me && th.b !== me) return; if (state[t]) return; var other = th.a === me ? th.b : th.a; state[t] = { tid: t, other: other, msgs: [], user: null, last: 0 };
              f.F.getDoc(D(f, ["netUsers", other])).then(function (s) { if (state[t]) { state[t].user = s.exists() ? s.data() : null; push(); } });
              offs.push(f.F.onSnapshot(f.F.query(f.F.collection(f.db, "netThreads", t, "msgs"), f.F.orderBy("at"), f.F.limit(80)), function (ms) { state[t].msgs = ms.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); state[t].last = state[t].msgs.length ? state[t].msgs[state[t].msgs.length - 1].at : 0; push(); })); }); }, function () { /* offline */ })); }).catch(function () { cb([]); });
        return function () { alive = false; offs.forEach(function (o) { try { o(); } catch (e) { /* ignore */ } }); }; }
    };
  }

  /* ------------------------------------------------------------------ public API */
  var B = null, ME = null;
  function backend() { if (B) return B; B = window.__PHONE_NET_BACKEND || (window.__FIREBASE && !window.__PHONE_NET_LOCAL ? cloudBackend() : localBackend()); return B; }
  window.PhoneNet = {
    BANDS: BANDS, canChat: canChat, why: why, famOf: famOf, clean: clean,
    mode: function () { return backend().kind; },
    meId: function () { return ME && ME.user ? ME.user.id : null; },
    /** my profile on the network, or null if I haven't joined yet. {ident, user} */
    me: async function () { var b = backend(), id = await b.identity(), u = await b.getUser(id.id); ME = { ident: id, user: u }; return ME; },
    join: async function (o) {
      var b = backend(), id = await b.identity(), h = clean(o.handle); if (h.length < 3) throw new Error("Pick a handle with at least 3 letters or numbers.");
      if (bad.test(h)) throw new Error("Please pick a friendlier handle.");
      var name = String(o.name || "").trim().slice(0, 24); if (!name) throw new Error("Add the name people will see.");
      if (bad.test(name.toLowerCase())) throw new Error("Please pick a friendlier name.");
      var prev = await b.getUser(id.id);
      var u = { id: id.id, handle: h, name: name, role: id.role, band: id.band, open: id.role === "kid" ? !!(prev && prev.open) : true, at: prev ? prev.at : Date.now() };
      await b.saveUser(u); ME = { ident: id, user: u }; return u; },
    setOpen: async function (on) { if (!ME || !ME.user) throw new Error("Join first."); if (ME.user.role !== "kid") return; ME.user.open = !!on; await backend().saveUser(ME.user); },
    /** start (or reopen) a conversation with a handle. Throws with a friendly reason when the rule says no. */
    start: async function (handle) {
      var b = backend(); if (!ME || !ME.user) throw new Error("Join first."); var o = await b.byHandle(clean(handle));
      if (!o) throw new Error("Nobody has that handle."); if (o.id === ME.user.id) throw new Error("That's you!");
      var w = why(ME.user, o); if (w) throw new Error(w); var t = await b.ensureThread(ME.user.id, o.id); return { tid: t, other: o }; },
    send: async function (tid, text) { text = String(text || "").trim().slice(0, 500); if (!text) return; await backend().send(tid, ME.user.id, text); },
    watch: function (cb) { return backend().watch(ME.user.id, cb); }
  };
})();
