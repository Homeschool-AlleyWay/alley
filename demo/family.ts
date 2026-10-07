/** Family accounts. A PARENT signs up (email + password, or Google); children are profiles under the parent (a nickname, a grade band and a 4-digit PIN).
 *  Children never give an email address. The parent signs in once on a device; kids then pick their profile and type their PIN, and their progress,
 *  avatar, grades and phone data follow them to any device the parent signs in on. Guests can still play with nothing saved online.
 *  Locker PHOTOS never leave the device. The backend is swappable (window.__FAMILY_BACKEND) so the whole flow can be tested without Firebase. */
import { gradesFromState } from "../src/hall3d/lockerui";
import { SUBJECT_NAME } from "../src/game/progress";

interface User { uid: string; email: string | null; verified: boolean }
interface KidDoc { id: string; name: string; age: string; salt: string; hash: string; created: number }
interface Backend {
  onUser(cb: (u: User | null) => void): void; signUp(e: string, p: string): Promise<User>; signIn(e: string, p: string): Promise<User>; google(): Promise<User>; reset(e: string): Promise<void>; signOut(): Promise<void>; verifyEmail(): Promise<void>;
  kids(uid: string): Promise<KidDoc[]>; saveKid(uid: string, k: KidDoc): Promise<void>; deleteKid(uid: string, id: string): Promise<void>;
  getData(uid: string, kid: string, key: string): Promise<{ json: string; at: number } | null>; setData(uid: string, kid: string, key: string, json: string, at: number): Promise<void>; deleteAccount(uid: string): Promise<void>;
}
const SYNC = ["unify.social.v1", "unify.progress.v1", "unify.locker.v1", "unify.assess.on", "flip.chats", "flip.unread", "flip.reminders", "flip.events", "flip.homework"];
const FKEY = "unify.family.v1", GUEST_BACKUP = "unify.guest.backup.v1", STASH = "unify.locker.pics.";
interface Local { mode?: "guest" | "family"; kid?: string; kidName?: string }
const lget = (): Local => { try { return JSON.parse(localStorage.getItem(FKEY) || "{}"); } catch { return {}; } };
const lset = (v: Local) => { try { localStorage.setItem(FKEY, JSON.stringify(v)); } catch { /* private mode */ } };
const sdoc = (k: string) => k.replace(/\./g, "_");

/* ---------------- Firebase backend (loaded from the CDN only when needed) ---------------- */
function firebaseBackend(): Backend {
  const FBV = "https://www.gstatic.com/firebasejs/10.14.1/"; let boot: Promise<any> | null = null;
  const init = () => (boot ??= (async () => { const cfg = (window as any).__FIREBASE; if (!cfg) throw new Error("No Firebase config"); const imp = (u: string) => import(/* @vite-ignore */ FBV + u);
    const [A, Au, F] = await Promise.all([imp("firebase-app.js"), imp("firebase-auth.js"), imp("firebase-firestore.js")]); const app = A.getApps().length ? A.getApp() : A.initializeApp(cfg); return { Au, F, auth: Au.getAuth(app), db: F.getFirestore(app) }; })());
  const U = (u: any): User => ({ uid: u.uid, email: u.email, verified: !!u.emailVerified });
  const kd = (f: any, uid: string) => f.F.collection(f.db, "families", uid, "kids");
  return {
    onUser(cb) { init().then((f) => f.Au.onAuthStateChanged(f.auth, (u: any) => cb(u && !u.isAnonymous ? U(u) : null))).catch(() => cb(null)); },
    async signUp(e, p) { const f = await init(); const c = await f.Au.createUserWithEmailAndPassword(f.auth, e, p); try { await f.Au.sendEmailVerification(c.user); } catch { /* optional */ } return U(c.user); },
    async signIn(e, p) { const f = await init(); return U((await f.Au.signInWithEmailAndPassword(f.auth, e, p)).user); },
    async google() { const f = await init(); return U((await f.Au.signInWithPopup(f.auth, new f.Au.GoogleAuthProvider())).user); },
    async reset(e) { const f = await init(); await f.Au.sendPasswordResetEmail(f.auth, e); },
    async signOut() { const f = await init(); await f.Au.signOut(f.auth); },
    async verifyEmail() { const f = await init(); if (f.auth.currentUser) await f.Au.sendEmailVerification(f.auth.currentUser); },
    async kids(uid) { const f = await init(); const s = await f.F.getDocs(kd(f, uid)); return s.docs.map((d: any) => ({ id: d.id, ...d.data() })).sort((a: KidDoc, b: KidDoc) => a.created - b.created); },
    async saveKid(uid, k) { const f = await init(); const { id, ...rest } = k; await f.F.setDoc(f.F.doc(f.db, "families", uid, "kids", id), rest); },
    async deleteKid(uid, id) { const f = await init(); for (const k of SYNC) { try { await f.F.deleteDoc(f.F.doc(f.db, "families", uid, "kids", id, "data", sdoc(k))); } catch { /* none */ } } await f.F.deleteDoc(f.F.doc(f.db, "families", uid, "kids", id)); },
    async getData(uid, kid, key) { const f = await init(); const s = await f.F.getDoc(f.F.doc(f.db, "families", uid, "kids", kid, "data", sdoc(key))); return s.exists() ? { json: s.data().json, at: s.data().at } : null; },
    async setData(uid, kid, key, json, at) { const f = await init(); await f.F.setDoc(f.F.doc(f.db, "families", uid, "kids", kid, "data", sdoc(key)), { json, at }); },
    async deleteAccount(uid) { const f = await init(); for (const k of await this.kids(uid)) await this.deleteKid(uid, k.id); if (f.auth.currentUser) await f.Au.deleteUser(f.auth.currentUser); },
  };
}

/* ---------------- state helpers ---------------- */
const readKey = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const writeKey = (k: string, v: string | null) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* full */ } };
/** what goes to the cloud: the synced keys, with locker PHOTOS removed */
function snapshot(): Record<string, string> { const o: Record<string, string> = {}; for (const k of SYNC) { let v = readKey(k); if (v == null) continue; if (k === "unify.locker.v1") { try { const j = JSON.parse(v); for (const id of Object.keys(j.d || {})) j.d[id].pics = []; v = JSON.stringify(j); } catch { continue; } } o[k] = v; } return o; }
const anyLocal = () => SYNC.some((k) => readKey(k) != null);
function clearLocal(kid: string | null) { if (kid) { const l = readKey("unify.locker.v1"); if (l) writeKey(STASH + kid, l); } for (const k of SYNC) writeKey(k, null); }
/** put a kid's saved locker photos back when the same locker is loaded on this device again */
function restoreStash(kid: string) { const s = readKey(STASH + kid), cur = readKey("unify.locker.v1"); if (!s || !cur) return; try { const a = JSON.parse(s), b = JSON.parse(cur); if (a.mine === b.mine && b.mine != null) { const id = String(b.mine); if (a.d?.[id] && b.d?.[id] && !(b.d[id].pics || []).length) b.d[id].pics = a.d[id].pics || []; writeKey("unify.locker.v1", JSON.stringify(b)); } } catch { /* ignore */ } }
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
const rnd = (n = 8) => hex(crypto.getRandomValues(new Uint8Array(n)).buffer);
const hashPin = async (salt: string, pin: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + pin)));

/* ---------------- UI ---------------- */
const CSS = `
#fam{position:fixed;inset:0;z-index:120;display:none;align-items:center;justify-content:center;background:rgba(40,30,30,.55);font-family:var(--ui,"Fredoka","Trebuchet MS",system-ui,sans-serif);color:var(--ink,#4A3B3F)}#fam.show{display:flex}
.fm-p{width:min(520px,94vw);max-height:92vh;overflow:auto;background:var(--kraft,#F3E7CF);border:1px solid rgba(255,255,255,.75);border-radius:16px;box-shadow:0 3px 0 var(--edge,#C9B28A),0 14px 34px rgba(60,40,30,.45);padding:16px;display:flex;flex-direction:column;gap:10px;box-sizing:border-box}
.fm-p h2{font-size:21px;margin:0;font-weight:600}.fm-p p{margin:0;font-size:14px;line-height:1.4}.fm-sm{font-size:12px;color:var(--soft,#8A7A70)}
.fm-b{font:inherit;font-size:15px;padding:8px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.8);background:#FFF9F0;color:inherit;cursor:pointer;box-shadow:0 2px 0 var(--edge,#C9B28A);min-height:40px}.fm-b.pri{background:var(--acc,#E07A66);color:#fff;box-shadow:0 2px 0 #b95a48}.fm-b.go{background:#4E8A64;color:#fff;box-shadow:0 2px 0 #35674a}.fm-b:disabled{opacity:.55}.fm-b:active{transform:translateY(2px);box-shadow:none}
.fm-in{font:inherit;font-size:16px;padding:9px 11px;border-radius:10px;border:1px solid var(--edge,#C9B28A);background:#fff;width:100%;box-sizing:border-box}
.fm-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.fm-err{color:#a8322a;font-size:14px;min-height:18px}
.fm-kid{display:flex;align-items:center;gap:12px;background:#FFF9F0;border-radius:12px;padding:10px 12px;border:1px solid rgba(74,59,63,.15)}.fm-kid i{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:600;font-size:20px;color:#fff}.fm-kid b{flex:1;font-size:17px}
.fm-pin{letter-spacing:12px;text-align:center;font-size:28px}.fm-tab{display:flex;gap:6px}.fm-tab .fm-b.on{background:var(--acc,#E07A66);color:#fff}
.fm-tb{width:100%;border-collapse:collapse}.fm-tb td,.fm-tb th{padding:5px 6px;text-align:left;border-bottom:1px solid rgba(74,59,63,.15);font-size:14px}
`;
const E = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", parent?: HTMLElement, text = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e; };
const COLORS = ["#E07A66", "#4F91C7", "#5E9C72", "#B8A8DA", "#EAB94E", "#C98569"];
const errText = (e: any): string => { const c = e?.code || e?.message || String(e); return ({
  "auth/operation-not-allowed": "That sign-in method isn't switched on yet. (Owner: Firebase console, Authentication, Sign-in method.)", "auth/email-already-in-use": "There's already an account with that email. Try signing in.", "auth/invalid-email": "That email doesn't look right.", "auth/weak-password": "Use a password with at least 6 characters.",
  "auth/invalid-credential": "Wrong email or password.", "auth/wrong-password": "Wrong email or password.", "auth/user-not-found": "No account with that email.", "auth/too-many-requests": "Too many tries. Wait a minute and try again.", "auth/unauthorized-domain": "This web address isn't authorized for sign-in yet. (Owner: add it under Authentication, Settings, Authorized domains.)",
  "auth/popup-closed-by-user": "The Google window was closed.", "auth/network-request-failed": "No internet connection.", "permission-denied": "The cloud refused that. (Owner: publish the latest firestore.rules.)", "auth/requires-recent-login": "For safety, sign out, sign in again, and then try once more." } as Record<string, string>)[c] ?? `Something went wrong (${c}).`; };

let B: Backend, USER: User | null = null, KIDS: KidDoc[] = [], root: HTMLElement, panel: HTMLElement, btn: HTMLButtonElement;
let activeKid: string | null = null, lastPushed: Record<string, string> = {}, pushing = false, syncMsg = "";

async function pushNow(): Promise<void> {
  if (!USER || !activeKid || pushing) return; pushing = true;
  try { const s = snapshot(), at = Date.now(); for (const k of Object.keys(s)) if (lastPushed[k] !== s[k]) { await B.setData(USER.uid, activeKid, k, s[k], at); lastPushed[k] = s[k]; } localStorage.setItem("unify.family.at." + activeKid, String(at)); syncMsg = "Saved " + new Date(at).toLocaleTimeString(); }
  catch (e) { syncMsg = "Couldn't save: " + errText(e); } pushing = false; paintBtn();
}
/** copy a kid's cloud data over this device's data. force = take everything; otherwise only documents newer than the last time this device synced */
async function pull(uid: string, kid: string, force: boolean): Promise<boolean> {
  const seen = force ? 0 : Number(readKey("unify.family.at." + kid) || 0); let changed = false, newest = seen;
  for (const k of SYNC) { const d = await B.getData(uid, kid, k); if (d && d.at > seen) { if (readKey(k) !== d.json) changed = true; writeKey(k, d.json); newest = Math.max(newest, d.at); } }
  if (newest > seen) writeKey("unify.family.at." + kid, String(newest)); restoreStash(kid); return changed;
}
const paintBtn = () => { btn.textContent = activeKid ? `👪 ${lget().kidName ?? "Family"}` : USER ? "👪 Who's playing?" : "👪 Sign in"; btn.title = activeKid ? syncMsg || "Family account" : "Family accounts: save your progress and use it on any device"; };

/** switch the device to a kid (or to guest): save the current one, swap the local data, then reload so every part of the game re-reads it */
async function activate(kid: KidDoc | null, importLocal = false): Promise<void> {
  if (USER && activeKid) await pushNow();
  const before = lget();
  if (kid && USER) {
    if (before.mode !== "family" && anyLocal()) { const g: Record<string, string | null> = {}; for (const k of SYNC) g[k] = readKey(k); writeKey(GUEST_BACKUP, JSON.stringify(g)); }   // never lose guest progress
    const carry: Record<string, string | null> = {}; if (importLocal) for (const k of SYNC) carry[k] = readKey(k);
    clearLocal(activeKid);
    if (importLocal) { for (const k of SYNC) if (carry[k] != null) writeKey(k, carry[k]); } else await pull(USER.uid, kid.id, true);
    lset({ mode: "family", kid: kid.id, kidName: kid.name });
  } else { clearLocal(activeKid); try { const g = JSON.parse(readKey(GUEST_BACKUP) || "{}"); for (const k of SYNC) if (g[k] != null) writeKey(k, g[k]); } catch { /* ignore */ } lset({ mode: "guest" }); }
  location.reload();
}

function open() { root.classList.add("show"); route(); }
function close() { root.classList.remove("show"); }
const card = (title: string) => { panel.innerHTML = ""; E("h2", "", panel, title); };

function route() { if (!USER) welcome(); else profiles(); }

function welcome(tab: "in" | "up" = "up") {
  card("UNIFY Academy family account");
  E("p", "", panel, "A parent signs up once. Children get their own profile with a PIN, so kids never need an email address, and their progress follows them to any device.");
  const tabs = E("div", "fm-tab", panel); const t1 = E("button", "fm-b" + (tab === "up" ? " on" : ""), tabs, "Create account"), t2 = E("button", "fm-b" + (tab === "in" ? " on" : ""), tabs, "Sign in"); t1.onclick = () => welcome("up"); t2.onclick = () => welcome("in");
  const em = E("input", "fm-in", panel) as HTMLInputElement; em.type = "email"; em.placeholder = "Parent email"; em.autocomplete = "email"; const pw = E("input", "fm-in", panel) as HTMLInputElement; pw.type = "password"; pw.placeholder = "Password (6+ characters)"; pw.autocomplete = tab === "up" ? "new-password" : "current-password";
  let consent: HTMLInputElement | null = null; if (tab === "up") { const l = E("label", "fm-sm", panel); consent = E("input", "", l) as HTMLInputElement; consent.type = "checkbox"; l.appendChild(document.createTextNode(" I am a parent or guardian (18 or older) and I let my child use UNIFY Academy. We save only the nickname, avatar and progress I enter, under my account. No ads, no tracking, no photos online.")); }
  const err = E("div", "fm-err", panel), go = E("button", "fm-b pri", panel, tab === "up" ? "Create parent account" : "Sign in");
  const run = async (fn: () => Promise<User>) => { err.textContent = ""; go.setAttribute("disabled", ""); try { USER = await fn(); route(); } catch (e) { err.textContent = errText(e); } go.removeAttribute("disabled"); };
  go.onclick = () => { if (tab === "up" && !consent!.checked) { err.textContent = "Please confirm you are a parent or guardian."; return; } if (!em.value.trim() || pw.value.length < 6) { err.textContent = "Enter an email and a password of at least 6 characters."; return; } void run(() => (tab === "up" ? B.signUp(em.value.trim(), pw.value) : B.signIn(em.value.trim(), pw.value))); };
  const g = E("button", "fm-b", panel, "Continue with Google"); g.onclick = () => { if (tab === "up" && !consent!.checked) { err.textContent = "Please confirm you are a parent or guardian."; return; } void run(() => B.google()); };
  const row = E("div", "fm-row", panel); if (tab === "in") { const f = E("button", "fm-b", row, "Forgot password"); f.onclick = async () => { if (!em.value.trim()) { err.textContent = "Type your email first."; return; } try { await B.reset(em.value.trim()); err.style.color = "#2f7a4c"; err.textContent = "Check your email for a reset link."; } catch (e) { err.textContent = errText(e); } }; }
  const gu = E("button", "fm-b", row, "Just try it (guest, nothing saved online)"); gu.onclick = () => { if (lget().mode !== "family") lset({ mode: "guest" }); close(); paintBtn(); };
}

async function profiles() {
  card(`Who's playing?`); const u = USER!; E("div", "fm-sm", panel, u.email ?? "Signed in");
  if (!u.verified && u.email) { const v = E("div", "fm-sm", panel, "Please check your email and verify it. "); const r = E("button", "fm-b", v, "Send again"); r.onclick = async () => { try { await B.verifyEmail(); r.textContent = "Sent"; } catch (e) { r.textContent = errText(e); } }; }
  const list = E("div", "", panel); list.style.cssText = "display:flex;flex-direction:column;gap:8px"; const msg = E("div", "fm-err", panel);
  try { KIDS = await B.kids(u.uid); } catch (e) { msg.textContent = errText(e); KIDS = []; }
  if (!KIDS.length) E("p", "", list, "No children yet. Add the first profile.");
  KIDS.forEach((k, i) => { const r = E("div", "fm-kid", list), av = E("i", "", r, k.name.slice(0, 1).toUpperCase()); av.style.background = COLORS[i % COLORS.length]; E("b", "", r, k.name); const p = E("button", "fm-b go", r, activeKid === k.id ? "Playing" : "Play"); p.onclick = () => pinPad(k); const m = E("button", "fm-b", r, "Parent tools"); m.onclick = () => tools(k); });
  const row = E("div", "fm-row", panel); const add = E("button", "fm-b pri", row, "Add a child"); add.onclick = () => addKid(); const so = E("button", "fm-b", row, "Sign out"); so.onclick = async () => { await activate(null); await B.signOut(); };
  const cl = E("button", "fm-b", row, "Close"); cl.onclick = close;
  E("div", "fm-sm", panel, "Children use their nickname and a 4-digit PIN. The PIN switches between profiles on a shared device; your parent account is what keeps the data safe.");
}

function pinPad(k: KidDoc) {
  card(`Hi ${k.name}! Type your PIN`); const pin = E("input", "fm-in fm-pin", panel) as HTMLInputElement; pin.type = "password"; pin.inputMode = "numeric"; pin.maxLength = 4; pin.autocomplete = "off"; const err = E("div", "fm-err", panel); const row = E("div", "fm-row", panel);
  const go = E("button", "fm-b go", row, "Let's go"); const back = E("button", "fm-b", row, "Back"); back.onclick = () => profiles();
  const tryIt = async () => { if (!/^\d{4}$/.test(pin.value)) { err.textContent = "Type your 4 numbers."; return; } if ((await hashPin(k.salt, pin.value)) !== k.hash) { err.textContent = "That's not the right PIN."; pin.value = ""; return; } go.setAttribute("disabled", ""); err.textContent = "Loading your game…"; try { await activate(k); } catch (e) { err.textContent = errText(e); go.removeAttribute("disabled"); } };
  go.onclick = tryIt; pin.onkeydown = (e) => { if (e.key === "Enter") void tryIt(); }; setTimeout(() => pin.focus(), 50);
}

function addKid() {
  card("Add a child"); E("p", "fm-sm", panel, "Use a nickname or first name only.");
  const nm = E("input", "fm-in", panel) as HTMLInputElement; nm.placeholder = "Nickname"; nm.maxLength = 14;
  const ag = E("select", "fm-in", panel) as HTMLSelectElement; for (const [v, l] of [["k2", "Grades K-2"], ["g35", "Grades 3-5"], ["g68", "Grades 6-8"], ["hs", "High school"]]) { const o = E("option", "", ag, l); o.setAttribute("value", v); } ag.value = "g35";
  const p1 = E("input", "fm-in fm-pin", panel) as HTMLInputElement, p2 = E("input", "fm-in fm-pin", panel) as HTMLInputElement; for (const [i, ph] of [[p1, "PIN"], [p2, "PIN again"]] as const) { i.type = "password"; i.inputMode = "numeric"; i.maxLength = 4; i.placeholder = ph; i.autocomplete = "off"; i.style.letterSpacing = "6px"; }
  const l = E("label", "fm-sm", panel), imp = E("input", "", l) as HTMLInputElement; imp.type = "checkbox"; l.appendChild(document.createTextNode(" Start from the progress already saved on this device")); imp.disabled = !anyLocal(); if (!anyLocal()) l.style.opacity = ".5";
  const err = E("div", "fm-err", panel), row = E("div", "fm-row", panel), save = E("button", "fm-b pri", row, "Create profile"), back = E("button", "fm-b", row, "Back"); back.onclick = () => profiles();
  save.onclick = async () => {
    const name = nm.value.trim().slice(0, 14); if (!name) { err.textContent = "Type a nickname."; return; } if (!/^\d{4}$/.test(p1.value)) { err.textContent = "The PIN is 4 numbers."; return; } if (p1.value !== p2.value) { err.textContent = "The two PINs don't match."; return; }
    save.setAttribute("disabled", ""); try { const salt = rnd(8), kid: KidDoc = { id: "k" + rnd(6), name, age: ag.value, salt, hash: await hashPin(salt, p1.value), created: Date.now() }; await B.saveKid(USER!.uid, kid); KIDS.push(kid);
      if (!readKey("unify.social.v1") || !imp.checked) { /* fresh profile */ } err.textContent = "Created!"; await activate(kid, imp.checked); } catch (e) { err.textContent = errText(e); save.removeAttribute("disabled"); } };
}

async function tools(k: KidDoc) {
  card(`${k.name}: parent tools`); const body = E("div", "", panel); const msg = E("div", "fm-err", panel); const back = E("button", "fm-b", panel, "Back"); back.onclick = () => profiles();
  let prog: any = null; try { const d = await B.getData(USER!.uid, k.id, "unify.progress.v1"); prog = d ? JSON.parse(d.json) : null; } catch (e) { msg.textContent = errText(e); }
  if (activeKid === k.id) { try { prog = JSON.parse(readKey("unify.progress.v1") || "null") ?? prog; } catch { /* keep cloud copy */ } }
  E("h2", "", body, "Report card"); const g = gradesFromState(prog), t = E("table", "fm-tb", body), hd = E("tr", "", t); ["Class", "Lessons", "Labs", "Grade"].forEach((h) => E("th", "", hd, h));
  for (const x of g) { const r = E("tr", "", t); E("td", "", r, SUBJECT_NAME[x.subject]); E("td", "", r, `${x.done} of ${x.total}`); E("td", "", r, x.labPct == null ? "none yet" : `${Math.round(x.labPct * 100)}%`); E("td", "", r, x.letter).style.fontWeight = "700"; }
  const days = prog?.days ? Object.keys(prog.days).sort() : []; E("p", "fm-sm", body, days.length ? `Last class planned: ${days[days.length - 1]}` : "No classes planned yet.");
  const row = E("div", "fm-row", body);
  const rp = E("button", "fm-b", row, "Change PIN"); rp.onclick = () => { const n = prompt("New 4-digit PIN for " + k.name); if (n && /^\d{4}$/.test(n)) void (async () => { k.salt = rnd(8); k.hash = await hashPin(k.salt, n); await B.saveKid(USER!.uid, k); msg.style.color = "#2f7a4c"; msg.textContent = "PIN changed."; })(); else if (n) msg.textContent = "A PIN is 4 numbers."; };
  const rm = E("button", "fm-b", row, "Delete this profile"); rm.onclick = async () => { if (!confirm(`Delete ${k.name} and all of their saved progress? This cannot be undone.`)) return; try { await B.deleteKid(USER!.uid, k.id); if (activeKid === k.id) { clearLocal(null); lset({ mode: "family" }); activeKid = null; } profiles(); } catch (e) { msg.textContent = errText(e); } };
  const da = E("button", "fm-b", row, "Delete my account and everything"); da.onclick = async () => { if (!confirm("Delete the parent account, every child profile and all saved data? This cannot be undone.")) return; try { await B.deleteAccount(USER!.uid); clearLocal(null); lset({ mode: "guest" }); location.reload(); } catch (e) { msg.textContent = errText(e); } };
}

/* ---------------- start ---------------- */
function start() {
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  root = E("div", "", document.body); root.id = "fam"; panel = E("div", "fm-p", root); root.addEventListener("keydown", (e) => e.stopPropagation()); root.addEventListener("click", (e) => { if (e.target === root && (USER || lget().mode)) close(); });
  const nav = document.querySelector("nav"), phone = document.getElementById("tPhone"); btn = E("button", "") as HTMLButtonElement; btn.id = "tFam"; if (nav && phone) nav.insertBefore(btn, phone.nextSibling); else document.body.appendChild(btn); btn.onclick = open;
  activeKid = lget().mode === "family" ? lget().kid ?? null : null; paintBtn();
  if (!(window as any).__FIREBASE && !(window as any).__FAMILY_BACKEND) { btn.style.display = "none"; return; }       // no cloud configured: guest play only
  B = (window as any).__FAMILY_BACKEND ?? firebaseBackend();
  B.onUser(async (u) => {
    USER = u;
    if (u && activeKid) { try { KIDS = await B.kids(u.uid); if (!KIDS.some((k) => k.id === activeKid)) { clearLocal(null); lset({ mode: "family" }); activeKid = null; } else if (await pull(u.uid, activeKid, false) && !sessionStorage.getItem("unify.family.reloaded")) { sessionStorage.setItem("unify.family.reloaded", "1"); location.reload(); return; } } catch { /* offline: keep playing */ } }
    if (!u && activeKid) activeKid = null;                                  // signed out elsewhere: stop syncing, keep playing locally
    paintBtn(); if (!lget().mode && !root.classList.contains("show")) open();
  });
  setInterval(() => { if (document.visibilityState === "visible" && activeKid) void pushNow(); }, 15000);
  addEventListener("pagehide", () => { void pushNow(); }); document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") void pushNow(); });
  (window as any).__family = { open, pushNow, get kid() { return activeKid; }, get user() { return USER; } };
}
if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
