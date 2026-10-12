/* UNIFY Mail client library: academy-only mail (name@unify.mail), never delivered outside UNIFY.
   Needs supabase-config.js + supabase-client.js first (otherwise it reports status "nocfg"). Local demo mode: localStorage 'unify.mail.demo'='1'. */
(function () {
  "use strict";
  var DOMAIN = "unify.mail", LK = "unify.mail.local", DK = "unify.mail.demo";
  var ADDR_RE = /^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]@unify\.mail$/;
  var names = {}, mayCache = {}, cached = null;
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function demo() { return ls(DK) === "1"; }
  function msg(e) { return new Error((e && e.message) || String(e || "Something went wrong.")); }
  function cl() { return window.__SUPABASE && window.__supa && location.protocol !== "file:" ? window.__supa() : Promise.reject(new Error("Mail isn't switched on yet.")); }

  /* ---------- local demo backend ---------- */
  var LOCAL_ADDRS = [{ addr: "you@unify.mail", display: "You", kind: "adult" }, { addr: "teacher@unify.mail", display: "Teacher", kind: "staff" }];
  function ldb() {
    var d = null; try { d = JSON.parse(ls(LK)); } catch (e) {}
    if (!d || !d.msgs) {
      d = { msgs: [{ id: "m1", from: "teacher@unify.mail", to: ["you@unify.mail"], subject: "Welcome to UNIFY Mail", body: "Hello!\n\nThis is a demo inbox saved only in this browser. Try replying.", replyTo: null, sentAt: new Date().toISOString() }], st: { "m1|you@unify.mail": { folder: "inbox", read: false, starred: false }, "m1|teacher@unify.mail": { folder: "sent", read: true, starred: false } } };
      ls(LK, JSON.stringify(d));
    }
    return d;
  }
  function lsave(d) { ls(LK, JSON.stringify(d)); }
  function llist(folder, addr) {
    var d = ldb(), out = [];
    d.msgs.forEach(function (m) {
      var s = d.st[m.id + "|" + addr]; if (!s) return;
      if (folder === "starred" ? (!s.starred || s.folder === "trash") : (folder !== "all" && s.folder !== folder)) return;
      out.push({ id: m.id, from: m.from, to: m.to, subject: m.subject, body: m.body, replyTo: m.replyTo, sentAt: m.sentAt, folder: s.folder, read: s.read, starred: s.starred, addr: addr });
    });
    return out.sort(function (a, b) { return a.sentAt < b.sentAt ? 1 : -1; });
  }

  /* ---------- rules (mirror the database checks, for instant feedback) ---------- */
  function precheck(text) {
    return /(https?:\/\/|www\.)/i.test(text) || /[a-z0-9._+-]+@(?![a-z0-9.-]*unify\.mail)[a-z0-9-]+\.[a-z]{2,}/i.test(text) || /(\+?[0-9][ ().-]?){9,}/.test(text) ? "Links, outside email addresses and phone numbers can't be sent." : "";
  }

  /* ---------- core ---------- */
  async function loadMe() {
    if (demo()) return { status: "demo", demo: true, userId: "demo", email: "you@unify.mail", addrs: LOCAL_ADDRS.slice(0, 1), isAdmin: false, isKid: false, kids: [], needsClaim: false };
    if (!window.__SUPABASE || !window.__supa || location.protocol === "file:") return { status: "nocfg", addrs: [], kids: [] };
    try {
      var c = await cl(), s = (await c.auth.getSession()).data.session;
      if (!s) return { status: "signedout", addrs: [], kids: [] };
      var u = s.user, r = await c.from("mail_addresses").select("addr,display,kind").eq("owner", u.id).order("addr");
      if (r.error) return { status: "missing", error: r.error.message, addrs: [], kids: [] };
      var addrs = r.data || [];
      var ad = await c.rpc("is_admin"), kl = await c.rpc("my_kid_login");
      var isKid = !!(kl.data && kl.data.length), kids = [];
      if (!isKid) {
        var kr = await c.from("kids").select("id,name,login_email").not("login_email", "is", null);
        kids = (kr.data || []).map(function (k) { return { id: k.id, name: k.name, addr: k.login_email }; });
      }
      return { status: "ok", userId: u.id, email: u.email, addrs: addrs, isAdmin: ad.data === true, isKid: isKid, kids: kids, needsClaim: !isKid && !addrs.length };
    } catch (e) { return { status: "missing", error: e.message, addrs: [], kids: [] }; }
  }
  function me(fresh) { if (!cached || fresh) cached = loadMe(); return cached; }
  function ready(fresh) { return me(fresh).then(function (m) { return m.status; }); }
  function myAddrs() { return me().then(function (m) { return m.addrs.map(function (a) { return a.addr; }); }); }

  async function claim(local, display) {
    if (demo()) throw new Error("Not available in demo mode.");
    var r = await (await cl()).rpc("mail_claim", { p_local: local, p_display: display || "" });
    if (r.error) throw msg(r.error); cached = null; return r.data;
  }
  async function adminCreate(local, display, kind) {
    var r = await (await cl()).rpc("mail_admin_address", { p_local: local, p_display: display || "", p_kind: kind });
    if (r.error) throw msg(r.error); return r.data;
  }
  async function adminList() {
    var r = await (await cl()).from("mail_addresses").select("addr,display,kind").in("kind", ["staff", "system"]).order("addr");
    if (r.error) throw msg(r.error); return r.data || [];
  }
  async function send(o) {
    if (demo()) {
      var d = ldb(), to = (o.to || []).map(function (x) { return String(x).toLowerCase(); });
      if (!to.length) throw new Error("Choose between 1 and 20 people.");
      to.forEach(function (t) { if (!LOCAL_ADDRS.some(function (a) { return a.addr === t; }) || t === o.from) throw new Error("You cannot write to " + t + "."); });
      var m = { id: "m" + Date.now() + Math.floor(Math.random() * 1e4), from: o.from, to: to, subject: String(o.subject || "").slice(0, 150), body: String(o.body || "").slice(0, 8000), replyTo: o.replyTo || null, sentAt: new Date().toISOString() };
      d.msgs.push(m); d.st[m.id + "|" + o.from] = { folder: "sent", read: true, starred: false };
      to.forEach(function (t) { d.st[m.id + "|" + t] = { folder: "inbox", read: false, starred: false }; });
      lsave(d); return m.id;
    }
    var r = await (await cl()).rpc("mail_send", { p_from: o.from, p_to: o.to, p_subject: o.subject || "", p_body: o.body || "", p_reply_to: o.replyTo || null });
    if (r.error) throw msg(r.error); return r.data;
  }
  async function list(folder, addr) {
    if (demo()) return llist(folder, addr);
    var c = await cl(), q = c.from("mail_state").select("msg,addr,folder,read,starred").eq("addr", addr).limit(300);
    if (folder === "starred") q = q.eq("starred", true).neq("folder", "trash"); else if (folder && folder !== "all") q = q.eq("folder", folder);
    var s = await q; if (s.error) throw msg(s.error);
    var ids = (s.data || []).map(function (x) { return x.msg; }); if (!ids.length) return [];
    var m = await c.from("mail_messages").select("id,from_addr,to_addrs,subject,body,reply_to,sent_at").in("id", ids); if (m.error) throw msg(m.error);
    var by = {}; (m.data || []).forEach(function (x) { by[x.id] = x; });
    var out = [];
    s.data.forEach(function (x) { var y = by[x.msg]; if (y) out.push({ id: y.id, from: y.from_addr, to: y.to_addrs, subject: y.subject, body: y.body, replyTo: y.reply_to, sentAt: y.sent_at, folder: x.folder, read: x.read, starred: x.starred, addr: addr }); });
    return out.sort(function (a, b) { return a.sentAt < b.sentAt ? 1 : -1; });
  }
  async function mark(id, addr, patch) {
    var p = {}; if ("read" in patch) p.read = !!patch.read; if ("starred" in patch) p.starred = !!patch.starred;
    if (demo()) { var d = ldb(), s = d.st[id + "|" + addr]; if (s) { Object.assign(s, p); lsave(d); } return; }
    var r = await (await cl()).from("mail_state").update(p).eq("msg", id).eq("addr", addr); if (r.error) throw msg(r.error);
  }
  async function move(id, addr, folder) {
    if (demo()) { var d = ldb(), s = d.st[id + "|" + addr]; if (s && s.folder !== "sent") { s.folder = folder; lsave(d); } return; }
    var r = await (await cl()).rpc("mail_move", { p_msg: id, p_addr: addr, p_folder: folder }); if (r.error) throw msg(r.error);
  }
  async function unread() {
    try {
      var a = await myAddrs(); if (!a.length) return 0;
      if (demo()) return a.reduce(function (n, x) { return n + llist("inbox", x).filter(function (m) { return !m.read; }).length; }, 0);
      var r = await (await cl()).from("mail_state").select("msg", { count: "exact", head: true }).in("addr", a).eq("folder", "inbox").eq("read", false);
      return r.error ? 0 : r.count || 0;
    } catch (e) { return 0; }
  }
  function watchUnread(cb) {
    var last = -1, dead = false, ch = null, cl0 = null, t = null;
    async function tick(kind) { var n = await unread(); if (dead) return; if (n !== last || kind === "event") { last = n; try { cb(n, kind || "count"); } catch (e) {} } }
    tick(); t = setInterval(function () { tick(); }, 30000);
    function onSt(e) { if (e.key === LK) tick("event"); } window.addEventListener("storage", onSt);
    if (!demo() && window.__SUPABASE && location.protocol !== "file:") me().then(function (m) {
      if (dead || m.status !== "ok") return;
      return cl().then(function (c) { cl0 = c; ch = c.channel("unify-mail-" + Math.random().toString(36).slice(2)).on("postgres_changes", { event: "*", schema: "public", table: "mail_state" }, function () { tick("event"); }).subscribe(); });
    }).catch(function () {});
    return function () { dead = true; clearInterval(t); window.removeEventListener("storage", onSt); try { if (ch && cl0) cl0.removeChannel(ch); } catch (e) {} };
  }
  async function directory(query) {
    var q = String(query || "").replace(/[,()%*\\]/g, " ").trim().toLowerCase(), rows;
    if (demo()) rows = LOCAL_ADDRS.filter(function (a) { return !q || a.addr.indexOf(q) > -1 || a.display.toLowerCase().indexOf(q) > -1; });
    else {
      var b = (await cl()).from("mail_addresses").select("addr,display,kind").limit(30);
      if (q) b = b.or("addr.ilike.%" + q + "%,display.ilike.%" + q + "%");
      var r = await b; if (r.error) throw msg(r.error); rows = r.data || [];
    }
    rows.forEach(function (a) { names[a.addr] = a.display; });
    var rank = { staff: 0, system: 1, adult: 2, kid: 3 };
    return rows.slice().sort(function (a, b) { return rank[a.kind] - rank[b.kind] || (a.display < b.display ? -1 : 1); });
  }
  async function lookup(addrs) {
    var miss = (addrs || []).filter(function (a) { return a && !names[a]; }); if (!miss.length) return;
    if (demo()) { LOCAL_ADDRS.forEach(function (a) { names[a.addr] = a.display; }); return; }
    try { var r = await (await cl()).from("mail_addresses").select("addr,display").in("addr", miss.slice(0, 100)); (r.data || []).forEach(function (a) { names[a.addr] = a.display; }); } catch (e) {}
  }
  function nameOf(addr) { return names[addr] || ""; }
  async function mayWrite(from, to) {
    var k = from + ">" + to; if (k in mayCache) return mayCache[k];
    var ok = true;
    if (from === to) ok = false;
    else if (!demo()) { try { var r = await (await cl()).rpc("mail_may_send", { p_from: from, p_to: to }); ok = r.error ? true : r.data === true; } catch (e) { ok = true; } }
    return (mayCache[k] = ok);
  }
  async function familyMailboxes() { return (await me()).kids; }
  function compose(o) {
    o = o || {}; var m = { type: "mail:compose", to: o.to || "", subject: o.subject || "", body: o.body || "" };
    try { window.top.postMessage(m, "*"); } catch (e) {}
    if (window.parent && window.parent !== window.top) try { window.parent.postMessage(m, "*"); } catch (e) {}
  }

  window.UnifyMail = { DOMAIN: DOMAIN, ADDR_RE: ADDR_RE, ready: ready, me: me, claim: claim, send: send, list: list, mark: mark, move: move, unread: unread, watchUnread: watchUnread, directory: directory, familyMailboxes: familyMailboxes, compose: compose, mayWrite: mayWrite, nameOf: nameOf, lookup: lookup, precheck: precheck, adminCreate: adminCreate, adminList: adminList, demo: function (on) { if (on !== undefined) { ls(DK, on ? "1" : null); cached = null; } return demo(); }, client: cl };
})();
