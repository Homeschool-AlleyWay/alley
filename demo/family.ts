/** Family accounts. A PARENT signs up (email + password, or Google); children are profiles under the parent (a nickname, a grade band and a 4-digit PIN).
 *  Children never give an email address. The parent signs in once on a device; kids then pick their profile and type their PIN, and their progress,
 *  avatar, grades and phone data follow them to any device the parent signs in on. Guests can still play with nothing saved online.
 *  Locker PHOTOS never leave the device. The backend is swappable (window.__FAMILY_BACKEND) so the whole flow can be tested without Firebase. */
import { gradesFromState } from "../src/hall3d/lockerui";
import { SUBJECT_NAME } from "../src/game/progress";

interface User { uid: string; email: string | null; verified: boolean }
interface KidDoc { id: string; name: string; age: string; salt: string; hash: string; created: number; color?: string; icon?: string }
/** the parent/family profile, stored on the family document itself */
interface Profile { family: string; name: string; role: string; color: string; salt?: string; hash?: string; updated: number }
interface Backend {
  onUser(cb: (u: User | null) => void): void; signUp(e: string, p: string): Promise<User>; signIn(e: string, p: string): Promise<User>; google(): Promise<User>; reset(e: string): Promise<void>; signOut(): Promise<void>; verifyEmail(): Promise<void>;
  profile(uid: string): Promise<Profile | null>; saveProfile(uid: string, p: Profile): Promise<void>;
  kids(uid: string): Promise<KidDoc[]>; saveKid(uid: string, k: KidDoc): Promise<void>; deleteKid(uid: string, id: string): Promise<void>;
  getData(uid: string, kid: string, key: string): Promise<{ json: string; at: number } | null>; setData(uid: string, kid: string, key: string, json: string, at: number): Promise<void>; deleteAccount(uid: string): Promise<void>;
}
const SYNC = ["unify.social.v1", "unify.progress.v1", "unify.locker.v1", "unify.assess.on", "flip.chats", "flip.unread", "flip.reminders", "flip.events", "flip.homework", "unify.opendoor.v1"];
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
    async profile(uid) { const f = await init(); const d = await f.F.getDoc(f.F.doc(f.db, "families", uid)); return d.exists() && d.data().profile ? (d.data().profile as Profile) : null; },
    async saveProfile(uid, p) { const f = await init(); await f.F.setDoc(f.F.doc(f.db, "families", uid), { profile: p }, { merge: true }); },
    async kids(uid) { const f = await init(); const s = await f.F.getDocs(kd(f, uid)); return s.docs.map((d: any) => ({ id: d.id, ...d.data() })).sort((a: KidDoc, b: KidDoc) => a.created - b.created); },
    async saveKid(uid, k) { const f = await init(); const { id, ...rest } = k; await f.F.setDoc(f.F.doc(f.db, "families", uid, "kids", id), rest); },
    async deleteKid(uid, id) { const f = await init(); for (const k of SYNC) { try { await f.F.deleteDoc(f.F.doc(f.db, "families", uid, "kids", id, "data", sdoc(k))); } catch { /* none */ } } await f.F.deleteDoc(f.F.doc(f.db, "families", uid, "kids", id)); },
    async getData(uid, kid, key) { const f = await init(); const s = await f.F.getDoc(f.F.doc(f.db, "families", uid, "kids", kid, "data", sdoc(key))); return s.exists() ? { json: s.data().json, at: s.data().at } : null; },
    async setData(uid, kid, key, json, at) { const f = await init(); await f.F.setDoc(f.F.doc(f.db, "families", uid, "kids", kid, "data", sdoc(key)), { json, at }); },
    async deleteAccount(uid) { const f = await init(); for (const k of await this.kids(uid)) await this.deleteKid(uid, k.id); try { await f.F.deleteDoc(f.F.doc(f.db, "families", uid)); } catch { /* none */ } if (f.auth.currentUser) await f.Au.deleteUser(f.auth.currentUser); },
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
.fm-sw{display:flex;gap:7px;flex-wrap:wrap}.fm-sw button{width:34px;height:34px;border-radius:50%;border:3px solid transparent;cursor:pointer;font-size:18px;padding:0;background:#fff}.fm-sw button.on{border-color:var(--ink,#4A3B3F)}.fm-bot{margin-top:6px;padding-top:10px;border-top:1px solid rgba(74,59,63,.2);display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.fm-lab{font-size:12px;color:var(--soft,#8A7A70);margin-bottom:-4px}.fm-who{display:flex;align-items:center;gap:10px}.fm-who i{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:600;color:#fff}
.fm-tb{width:100%;border-collapse:collapse}.fm-tb td,.fm-tb th{padding:5px 6px;text-align:left;border-bottom:1px solid rgba(74,59,63,.15);font-size:14px}
`;
const E = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", parent?: HTMLElement, text = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e; };
const COLORS = ["#E07A66", "#4F91C7", "#5E9C72", "#B8A8DA", "#EAB94E", "#C98569"];
const errText = (e: any): string => { const c = e?.code || e?.message || String(e); return ({
  "auth/operation-not-allowed": "That sign-in method isn't switched on yet. (Owner: Firebase console, Authentication, Sign-in method.)", "auth/email-already-in-use": "There's already an account with that email. Try signing in.", "auth/invalid-email": "That email doesn't look right.", "auth/weak-password": "Use a password with at least 6 characters.",
  "auth/invalid-credential": "Wrong email or password.", "auth/wrong-password": "Wrong email or password.", "auth/user-not-found": "No account with that email.", "auth/too-many-requests": "Too many tries. Wait a minute and try again.", "auth/unauthorized-domain": "This web address isn't authorized for sign-in yet. (Owner: add it under Authentication, Settings, Authorized domains.)",
  "auth/popup-closed-by-user": "The Google window was closed.", "auth/network-request-failed": "No internet connection.", "permission-denied": "The cloud refused that. (Owner: publish the latest firestore.rules.)", "auth/requires-recent-login": "For safety, sign out, sign in again, and then try once more." } as Record<string, string>)[c] ?? `Something went wrong (${c}).`; };

let B: Backend, USER: User | null = null, KIDS: KidDoc[] = [], root: HTMLElement, panel: HTMLElement, btn: HTMLButtonElement;
let PROFILE: Profile | null = null, PROFILE_LOADED = false;
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
  try { const kd = kid ?? null; if (kd && USER) localStorage.setItem("unify.family.link", JSON.stringify({ uid: USER.uid, kid: kd.id, band: (kd as any).age ?? (kd as any).band ?? "hs" })); else localStorage.removeItem("unify.family.link"); } catch { /* private mode */ }
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

async function route() {
  if (!USER) { welcome(); return; }
  if (!PROFILE_LOADED) { card("One moment…"); try { PROFILE = await B.profile(USER.uid); } catch { PROFILE = null; } PROFILE_LOADED = true; }
  if (!PROFILE && !sessionStorage.getItem("unify.family.skipsetup")) parentSetup(false); else if (!role()) void checkin(); else profiles();
}
const ICONS = ["🦊", "🐼", "🦄", "🐯", "🐸", "🦉", "🐙", "🚀", "⚽", "🎨", "🎸", "🌟"];
const AGE_NAME: Record<string, string> = { k2: "Grades K-2", g35: "Grades 3-5", g68: "Grades 6-8", hs: "High school" };
const ROLES = ["Mom", "Dad", "Guardian", "Grandparent", "Other"];
const bubble = (parent: HTMLElement, o: { color: string; icon?: string; name: string }) => { const i = E("i", "", parent, o.icon || o.name.slice(0, 1).toUpperCase()); i.style.background = o.color; return i; };
const kidColor = (k: KidDoc, i: number) => k.color || COLORS[i % COLORS.length];
/** pick one swatch from a list (colors or icons) */
function swatches(parent: HTMLElement, label: string, items: string[], cur: string, isColor: boolean, set: (v: string) => void) {
  E("div", "fm-lab", parent, label); const w = E("div", "fm-sw", parent);
  items.forEach((v) => { const b = E("button", v === cur ? "on" : "", w, isColor ? "" : v); b.type = "button"; if (isColor) b.style.background = v; b.setAttribute("aria-label", v); b.onclick = () => { set(v); w.querySelectorAll("button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); }; });
}
const unlocked = () => !PROFILE?.hash || sessionStorage.getItem("unify.family.unlock") === "1";
/** parent-only actions ask for the parent PIN first (when the parent set one), once per visit */
function gate(next: () => void) {
  if (unlocked()) { next(); return; }
  card("Parent PIN"); E("p", "fm-sm", panel, "Parents only. Type your parent PIN to continue."); const pin = E("input", "fm-in fm-pin", panel) as HTMLInputElement; pin.type = "password"; pin.inputMode = "numeric"; pin.maxLength = 4; pin.autocomplete = "off"; const err = E("div", "fm-err", panel), row = E("div", "fm-row", panel);
  const go = E("button", "fm-b go", row, "Unlock"), back = E("button", "fm-b", row, "Back"); back.onclick = () => profiles();
  const tryIt = async () => { if (!/^\d{4}$/.test(pin.value) || (await hashPin(PROFILE!.salt!, pin.value)) !== PROFILE!.hash) { err.textContent = "That's not the parent PIN."; pin.value = ""; return; } sessionStorage.setItem("unify.family.unlock", "1"); next(); };
  go.onclick = tryIt; pin.onkeydown = (e) => { if (e.key === "Enter") void tryIt(); }; setTimeout(() => pin.focus(), 50);
}

function welcome(tab: "in" | "up" = "up") {
  card("UNIFY Academy family account");
  E("p", "", panel, "A parent signs up once. Children get their own profile with a PIN, so kids never need an email address, and their progress follows them to any device.");
  const tabs = E("div", "fm-tab", panel); const t1 = E("button", "fm-b" + (tab === "up" ? " on" : ""), tabs, "Create account"), t2 = E("button", "fm-b" + (tab === "in" ? " on" : ""), tabs, "Sign in"); t1.onclick = () => welcome("up"); t2.onclick = () => welcome("in");
  const em = E("input", "fm-in", panel) as HTMLInputElement; em.type = "email"; em.placeholder = "Parent email"; em.autocomplete = "email"; const pw = E("input", "fm-in", panel) as HTMLInputElement; pw.type = "password"; pw.placeholder = "Password (6+ characters)"; pw.autocomplete = tab === "up" ? "new-password" : "current-password";
  let consent: HTMLInputElement | null = null; if (tab === "up") { const l = E("label", "fm-sm", panel); consent = E("input", "", l) as HTMLInputElement; consent.type = "checkbox"; l.appendChild(document.createTextNode(" I am a parent or guardian (18 or older) and I let my child use UNIFY Academy. We save only the nickname, avatar and progress I enter, under my account. No ads, no tracking, no photos online.")); }
  const err = E("div", "fm-err", panel), go = E("button", "fm-b pri", panel, tab === "up" ? "Create parent account" : "Sign in");
  const run = async (fn: () => Promise<User>) => { err.textContent = ""; go.setAttribute("disabled", ""); try { USER = await fn(); PROFILE_LOADED = false; PROFILE = null; route(); } catch (e) { err.textContent = errText(e); } go.removeAttribute("disabled"); };
  go.onclick = () => { if (tab === "up" && !consent!.checked) { err.textContent = "Please confirm you are a parent or guardian."; return; } if (!em.value.trim() || pw.value.length < 6) { err.textContent = "Enter an email and a password of at least 6 characters."; return; } void run(() => (tab === "up" ? B.signUp(em.value.trim(), pw.value) : B.signIn(em.value.trim(), pw.value))); };
  const g = E("button", "fm-b", panel, "Continue with Google"); g.onclick = () => { if (tab === "up" && !consent!.checked) { err.textContent = "Please confirm you are a parent or guardian."; return; } void run(() => B.google()); };
  const row = E("div", "fm-row", panel); if (tab === "in") { const f = E("button", "fm-b", row, "Forgot password"); f.onclick = async () => { if (!em.value.trim()) { err.textContent = "Type your email first."; return; } try { await B.reset(em.value.trim()); err.style.color = "#2f7a4c"; err.textContent = "Check your email for a reset link."; } catch (e) { err.textContent = errText(e); } }; }
  const gu = E("button", "fm-b", row, "Just try it (guest, nothing saved online)"); gu.onclick = () => { if (lget().mode !== "family") lset({ mode: "guest" }); close(); paintBtn(); };
}


/* ---------------- check-in: shown whenever the app is opened; a child types their code, or the parent types the parent code ---------------- */
const role = () => sessionStorage.getItem("unify.family.ci");
const setRole = (r: string | null) => { if (r) sessionStorage.setItem("unify.family.ci", r); else sessionStorage.removeItem("unify.family.ci"); if (r !== "parent") sessionStorage.removeItem("unify.family.unlock"); };
/** is this code already used by the parent or another child? (codes must be unique so one code means one person) */
async function codeTaken(code: string, exceptKid?: string): Promise<boolean> {
  if (PROFILE?.hash && (await hashPin(PROFILE.salt!, code)) === PROFILE.hash) return true;
  for (const k of KIDS) if (k.id !== exceptKid && (await hashPin(k.salt, code)) === k.hash) return true; return false;
}
const codeBox = (parent: HTMLElement, ph = "Your code") => { const i = E("input", "fm-in fm-pin", parent) as HTMLInputElement; i.type = "password"; i.inputMode = "numeric"; i.maxLength = 4; i.placeholder = ph; i.autocomplete = "off"; return i; };
const bottomBar = (items: [string, () => void][]) => { const b = E("div", "fm-bot", panel); for (const [t, f] of items) { const x = E("button", "fm-b", b, t); x.onclick = f; } };

async function checkin() {
  root.classList.add("show"); card("Check in"); E("p", "fm-sm", panel, "Loading…");
  if (!PROFILE_LOADED) { try { PROFILE = await B.profile(USER!.uid); } catch { PROFILE = null; } PROFILE_LOADED = true; }
  try { KIDS = await B.kids(USER!.uid); } catch { KIDS = []; }
  card(PROFILE?.family ? `${PROFILE.family}: check in` : "Check in"); E("p", "", panel, "Type your code to check in. Children use their own code. Parents use the parent code.");
  const w = E("div", "fm-row", panel); w.style.justifyContent = "center"; KIDS.slice(0, 12).forEach((k, i) => { const b = E("i", "", w, k.icon || k.name.slice(0, 1).toUpperCase()); b.style.cssText = `background:${kidColor(k, i)};width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;color:#fff`; b.title = k.name; });
  const code = codeBox(panel), err = E("div", "fm-err", panel), go = E("button", "fm-b pri", panel, "Check in");
  const run = async () => {
    if (!/^\d{4}$/.test(code.value)) { err.textContent = "Type your 4 numbers."; return; } go.setAttribute("disabled", ""); err.textContent = "";
    const kid = await (async () => { for (const k of KIDS) if ((await hashPin(k.salt, code.value)) === k.hash) return k; return null; })();
    if (kid) { setRole("kid"); err.style.color = "#2f7a4c"; err.textContent = `Welcome, ${kid.name}!`; try { if (activeKid === kid.id) { close(); paintBtn(); } else await activate(kid); } catch (e) { err.style.color = ""; err.textContent = errText(e); go.removeAttribute("disabled"); } return; }
    if (PROFILE?.hash && (await hashPin(PROFILE.salt!, code.value)) === PROFILE.hash) { setRole("parent"); sessionStorage.setItem("unify.family.unlock", "1"); profiles(); return; }
    err.textContent = "That code isn't right. Try again."; code.value = ""; go.removeAttribute("disabled"); };
  go.onclick = () => void run(); code.oninput = () => { if (code.value.length === 4) void run(); }; code.onkeydown = (e) => { if (e.key === "Enter") void run(); }; setTimeout(() => code.focus(), 60);
  if (!PROFILE?.hash) { const pn = E("div", "fm-sm", panel, "No parent code is set yet. "); const pb = E("button", "fm-b", pn, "I'm the parent"); pb.onclick = () => { setRole("parent"); profiles(); }; }
  bottomBar([["Switch account", async () => { setRole(null); sessionStorage.removeItem("unify.family.skipsetup"); PROFILE = null; PROFILE_LOADED = false; await activate(null); await B.signOut(); }], ["Play as guest", () => { lset({ mode: "guest" }); setRole(null); void activate(null); }]]);
}

/** a child's own profile: change nickname, icon and color, change their code, see their own report card */
async function kidHome() {
  const k = KIDS.find((x) => x.id === activeKid) ?? (USER ? (await B.kids(USER.uid).catch(() => [])).find((x: KidDoc) => x.id === activeKid) : null); if (!k) { open(); return; }
  root.classList.add("show"); let color = k.color || COLORS[0], icon = k.icon || ICONS[0]; card(`${k.name}'s profile`);
  const w = E("div", "fm-who", panel); bubble(w, { color, icon: k.icon, name: k.name }); E("div", "fm-sm", w, `${AGE_NAME[k.age] ?? ""} · ${syncMsg || "Your progress is saved"}`);
  let prog: any = null; try { prog = JSON.parse(readKey("unify.progress.v1") || "null"); } catch { /* none */ }
  const g = gradesFromState(prog), t = E("table", "fm-tb", panel), hd = E("tr", "", t); ["Class", "Lessons", "Grade"].forEach((h) => E("th", "", hd, h)); for (const x of g) { const r = E("tr", "", t); E("td", "", r, SUBJECT_NAME[x.subject]); E("td", "", r, `${x.done} of ${x.total}`); E("td", "", r, x.letter).style.fontWeight = "700"; }
  E("div", "fm-lab", panel, "My nickname"); const nm = E("input", "fm-in", panel) as HTMLInputElement; nm.maxLength = 14; nm.value = k.name;
  swatches(panel, "My icon", ICONS, icon, false, (v) => { icon = v; }); swatches(panel, "My color", COLORS, color, true, (v) => { color = v; });
  const err = E("div", "fm-err", panel), row = E("div", "fm-row", panel), save = E("button", "fm-b pri", row, "Save changes"), cc = E("button", "fm-b", row, "Change my code"), cl = E("button", "fm-b", row, "Close"); cl.onclick = close;
  save.onclick = async () => { const name = nm.value.trim().slice(0, 14); if (!name) { err.textContent = "Type a nickname."; return; } if (KIDS.some((x) => x.id !== k.id && x.name.toLowerCase() === name.toLowerCase())) { err.textContent = "Someone in your family already has that nickname."; return; }
    try { k.name = name; k.color = color; k.icon = icon; await B.saveKid(USER!.uid, k); lset({ ...lget(), kidName: name }); paintBtn(); err.style.color = "#2f7a4c"; err.textContent = "Saved."; } catch (e) { err.style.color = ""; err.textContent = errText(e); } };
  cc.onclick = () => { card("Change my code"); const o = codeBox(panel, "My code now"), n1 = codeBox(panel, "New code"), n2 = codeBox(panel, "New code again"), e2 = E("div", "fm-err", panel), r2 = E("div", "fm-row", panel), ok = E("button", "fm-b pri", r2, "Change it"), bk = E("button", "fm-b", r2, "Back"); bk.onclick = () => void kidHome();
    ok.onclick = async () => { if ((await hashPin(k.salt, o.value)) !== k.hash) { e2.textContent = "That's not your code."; return; } if (!/^\d{4}$/.test(n1.value) || n1.value !== n2.value) { e2.textContent = "The new code is 4 numbers, typed twice the same."; return; } if (await codeTaken(n1.value, k.id)) { e2.textContent = "That code is taken. Pick a different one."; return; }
      try { k.salt = rnd(8); k.hash = await hashPin(k.salt, n1.value); await B.saveKid(USER!.uid, k); void kidHome(); } catch (e) { e2.textContent = errText(e); } }; };
  bottomBar([["Switch account", () => { setRole(null); void checkin(); }]]);
}

/** the parent and family profile: shown right after sign-up, and any time from "My profile" */
function parentSetup(edit: boolean) {
  const cur = PROFILE; let color = cur?.color || COLORS[0], role = cur?.role || "Mom";
  card(edit ? "My family profile" : "Set up your family");
  if (!edit) E("p", "", panel, "Tell us about your family. Only you can see this. Then add each child, as many as you like.");
  E("div", "fm-lab", panel, "Family name"); const fam = E("input", "fm-in", panel) as HTMLInputElement; fam.placeholder = "The Rivera family"; fam.maxLength = 40; fam.value = cur?.family || "";
  E("div", "fm-lab", panel, "Your name"); const nm = E("input", "fm-in", panel) as HTMLInputElement; nm.placeholder = "Your first name"; nm.maxLength = 30; nm.value = cur?.name || "";
  E("div", "fm-lab", panel, "You are the…"); const rs = E("select", "fm-in", panel) as HTMLSelectElement; ROLES.forEach((r) => { const o = E("option", "", rs, r); o.setAttribute("value", r); }); rs.value = role; rs.onchange = () => { role = rs.value; };
  swatches(panel, "Your color", COLORS, color, true, (v) => { color = v; });
  E("div", "fm-lab", panel, cur?.hash ? "Parent code (leave empty to keep it)" : "Parent code, 4 numbers. You type it at check-in to open the family screen.");
  const p1 = E("input", "fm-in fm-pin", panel) as HTMLInputElement, p2 = E("input", "fm-in fm-pin", panel) as HTMLInputElement; for (const [i, ph] of [[p1, "PIN"], [p2, "PIN again"]] as const) { i.type = "password"; i.inputMode = "numeric"; i.maxLength = 4; i.placeholder = ph; i.autocomplete = "off"; i.style.letterSpacing = "6px"; }
  const err = E("div", "fm-err", panel), row = E("div", "fm-row", panel), save = E("button", "fm-b pri", row, edit ? "Save" : "Save and add children");
  save.onclick = async () => {
    if (!fam.value.trim() || !nm.value.trim()) { err.textContent = "Please type your family name and your name."; return; }
    if ((!cur?.hash || p1.value || p2.value) && (!/^\d{4}$/.test(p1.value) || p1.value !== p2.value)) { err.textContent = "The parent code is 4 numbers, typed twice the same."; return; }
    if (p1.value && KIDS.length && await codeTaken(p1.value)) { err.textContent = "A child already uses that code. Pick a different one."; return; }
    save.setAttribute("disabled", "");
    try { const p: Profile = { family: fam.value.trim(), name: nm.value.trim(), role, color, updated: Date.now() };
      if (cur?.hash) { p.salt = cur.salt; p.hash = cur.hash; } if (p1.value) { p.salt = rnd(8); p.hash = await hashPin(p.salt, p1.value); sessionStorage.setItem("unify.family.unlock", "1"); setRole("parent"); }
      await B.saveProfile(USER!.uid, p); PROFILE = p; PROFILE_LOADED = true; paintBtn(); if (edit) profiles(); else if (!KIDS.length) addKid(true); else profiles(); }
    catch (e) { err.textContent = errText(e); save.removeAttribute("disabled"); } };
  const back = E("button", "fm-b", row, edit ? "Back" : "Skip for now"); back.onclick = () => { if (!edit) sessionStorage.setItem("unify.family.skipsetup", "1"); profiles(); };
}

async function profiles() {
  card(PROFILE?.family || `Who's playing?`); const u = USER!;
  if (PROFILE) { const w = E("div", "fm-who", panel); bubble(w, { color: PROFILE.color, name: PROFILE.name }); E("div", "fm-sm", w, `${PROFILE.name} (${PROFILE.role}) · ${u.email ?? "signed in"}`); } else E("div", "fm-sm", panel, u.email ?? "Signed in");
  if (!u.verified && u.email) { const v = E("div", "fm-sm", panel, "Please check your email and verify it. "); const r = E("button", "fm-b", v, "Send again"); r.onclick = async () => { try { await B.verifyEmail(); r.textContent = "Sent"; } catch (e) { r.textContent = errText(e); } }; }
  const list = E("div", "", panel); list.style.cssText = "display:flex;flex-direction:column;gap:8px"; const msg = E("div", "fm-err", panel);
  try { KIDS = await B.kids(u.uid); } catch (e) { msg.textContent = errText(e); KIDS = []; }
  E("h2", "", list, KIDS.length ? `Who's playing? (${KIDS.length} ${KIDS.length === 1 ? "child" : "children"})` : "Add your first child");
  if (!KIDS.length) E("p", "", list, "No children yet. Add as many profiles as you need, one for each child.");
  KIDS.forEach((k, i) => { const r = E("div", "fm-kid", list); bubble(r, { color: kidColor(k, i), icon: k.icon, name: k.name }); const nb = E("div", "", r); nb.style.flex = "1"; E("b", "", nb, k.name); E("div", "fm-sm", nb, AGE_NAME[k.age] ?? ""); const p = E("button", "fm-b go", r, activeKid === k.id ? "Playing" : "Play"); p.onclick = () => (role() === "parent" ? void (async () => { try { setRole("parent"); await activate(k); } catch (e) { msg.textContent = errText(e); } })() : pinPad(k)); const m = E("button", "fm-b", r, "Parent tools"); m.onclick = () => gate(() => void tools(k)); });
  const row = E("div", "fm-row", panel); const add = E("button", "fm-b pri", row, KIDS.length ? "Add another child" : "Add a child"); add.onclick = () => gate(() => addKid());
  if (KIDS.length) { const ov = E("button", "fm-b", row, "Family overview"); ov.onclick = () => gate(() => void overview()); }
  const mp = E("button", "fm-b", row, "My profile"); mp.onclick = () => gate(() => parentSetup(true));
  const cl = E("button", "fm-b", row, "Close"); cl.onclick = close;
  E("div", "fm-sm", panel, "Each child has their own 4-digit code to check in, and you have the parent code. Codes are different for everyone.");
  bottomBar([["Switch account", () => { setRole(null); void checkin(); }]]);
}

/** every child at a glance: lessons done and grade per class */
async function overview() {
  card(`${PROFILE?.family || "Family"} overview`); const body = E("div", "", panel), msg = E("div", "fm-err", panel); const back = E("button", "fm-b", panel, "Back"); back.onclick = () => profiles();
  E("p", "fm-sm", body, "Loading…"); const rows: { k: KidDoc; g: ReturnType<typeof gradesFromState> }[] = [];
  try { for (const k of KIDS) { let prog: any = null; const d = await B.getData(USER!.uid, k.id, "unify.progress.v1"); prog = d ? JSON.parse(d.json) : null; if (activeKid === k.id) { try { prog = JSON.parse(readKey("unify.progress.v1") || "null") ?? prog; } catch { /* keep cloud copy */ } } rows.push({ k, g: gradesFromState(prog) }); } } catch (e) { msg.textContent = errText(e); }
  body.innerHTML = ""; const t = E("table", "fm-tb", body), hd = E("tr", "", t); ["Child", ...Object.values(SUBJECT_NAME).slice(0, 0), "Lessons done", "Best class", "Needs work"].forEach((h) => E("th", "", hd, h));
  for (const { k, g } of rows) { const r = E("tr", "", t); E("td", "", r, `${k.icon ?? ""} ${k.name}`.trim()); const done = g.reduce((a, x) => a + x.done, 0), tot = g.reduce((a, x) => a + x.total, 0); E("td", "", r, `${done} of ${tot}`); const sc = g.filter((x) => x.labPct != null).sort((a, b) => (b.labPct ?? 0) - (a.labPct ?? 0)); E("td", "", r, sc.length ? `${SUBJECT_NAME[sc[0].subject]} (${sc[0].letter})` : "none yet"); E("td", "", r, sc.length > 1 ? SUBJECT_NAME[sc[sc.length - 1].subject] : "none yet"); }
  if (!rows.length) E("p", "fm-sm", body, "No progress saved yet.");
}

function pinPad(k: KidDoc) {
  card(`Hi ${k.name}! Type your PIN`); const pin = E("input", "fm-in fm-pin", panel) as HTMLInputElement; pin.type = "password"; pin.inputMode = "numeric"; pin.maxLength = 4; pin.autocomplete = "off"; const err = E("div", "fm-err", panel); const row = E("div", "fm-row", panel);
  const go = E("button", "fm-b go", row, "Let's go"); const back = E("button", "fm-b", row, "Back"); back.onclick = () => profiles();
  const tryIt = async () => { if (!/^\d{4}$/.test(pin.value)) { err.textContent = "Type your 4 numbers."; return; } if ((await hashPin(k.salt, pin.value)) !== k.hash) { err.textContent = "That's not the right PIN."; pin.value = ""; return; } go.setAttribute("disabled", ""); err.textContent = "Loading your game…"; try { await activate(k); } catch (e) { err.textContent = errText(e); go.removeAttribute("disabled"); } };
  go.onclick = tryIt; pin.onkeydown = (e) => { if (e.key === "Enter") void tryIt(); }; setTimeout(() => pin.focus(), 50);
}

function addKid(first = false) {
  let color = COLORS[KIDS.length % COLORS.length], icon = ICONS[KIDS.length % ICONS.length];
  card(first ? "Add your first child" : "Add a child"); E("p", "fm-sm", panel, "Use a nickname or first name only. No last names, no email.");
  const nm = E("input", "fm-in", panel) as HTMLInputElement; nm.placeholder = "Nickname"; nm.maxLength = 14;
  const ag = E("select", "fm-in", panel) as HTMLSelectElement; for (const [v, l] of Object.entries(AGE_NAME)) { const o = E("option", "", ag, l); o.setAttribute("value", v); } ag.value = "g35";
  swatches(panel, "Pick an icon", ICONS, icon, false, (v) => { icon = v; }); swatches(panel, "Pick a color", COLORS, color, true, (v) => { color = v; });
  const p1 = E("input", "fm-in fm-pin", panel) as HTMLInputElement, p2 = E("input", "fm-in fm-pin", panel) as HTMLInputElement; for (const [i, ph] of [[p1, "Child's code (4 numbers)"], [p2, "Code again"]] as const) { i.type = "password"; i.inputMode = "numeric"; i.maxLength = 4; i.placeholder = ph; i.autocomplete = "off"; i.style.letterSpacing = "6px"; }
  const l = E("label", "fm-sm", panel), imp = E("input", "", l) as HTMLInputElement; imp.type = "checkbox"; l.appendChild(document.createTextNode(" Start from the progress already saved on this device")); imp.disabled = !anyLocal() || KIDS.length > 0; if (imp.disabled) l.style.opacity = ".5";
  const err = E("div", "fm-err", panel), row = E("div", "fm-row", panel), save = E("button", "fm-b pri", row, "Create and play"), more = E("button", "fm-b pri", row, "Save and add another"), back = E("button", "fm-b", row, "Back"); back.onclick = () => profiles();
  const make = async (play: boolean) => {
    const name = nm.value.trim().slice(0, 14); if (!name) { err.textContent = "Type a nickname."; return; } if (KIDS.some((k) => k.name.toLowerCase() === name.toLowerCase())) { err.textContent = "You already have a child with that nickname."; return; } if (!/^\d{4}$/.test(p1.value)) { err.textContent = "The PIN is 4 numbers."; return; } if (p1.value !== p2.value) { err.textContent = "The two PINs don't match."; return; } if (await codeTaken(p1.value)) { err.textContent = "That code is already used in your family. Pick a different one."; return; }
    save.setAttribute("disabled", ""); more.setAttribute("disabled", "");
    try { const salt = rnd(8), kid: KidDoc = { id: "k" + rnd(6), name, age: ag.value, salt, hash: await hashPin(salt, p1.value), created: Date.now(), color, icon }; await B.saveKid(USER!.uid, kid); KIDS.push(kid);
      if (play) { err.textContent = "Created!"; await activate(kid, imp.checked); } else { addKid(); const n = panel.querySelector(".fm-sm"); if (n) { n.textContent = `${name} is added. Add the next child.`; (n as HTMLElement).style.color = "#2f7a4c"; } } }
    catch (e) { err.textContent = errText(e); save.removeAttribute("disabled"); more.removeAttribute("disabled"); } };
  save.onclick = () => void make(true); more.onclick = () => void make(false);
  if (first) { const sk = E("div", "fm-sm", panel, "You can add more children any time from the family screen."); void sk; }
}

/** change a child's nickname, grade band, icon and color */
function editKid(k: KidDoc) {
  let color = k.color || COLORS[0], icon = k.icon || ICONS[0];
  card(`Edit ${k.name}`); const nm = E("input", "fm-in", panel) as HTMLInputElement; nm.maxLength = 14; nm.value = k.name;
  const ag = E("select", "fm-in", panel) as HTMLSelectElement; for (const [v, l] of Object.entries(AGE_NAME)) { const o = E("option", "", ag, l); o.setAttribute("value", v); } ag.value = k.age;
  swatches(panel, "Icon", ICONS, icon, false, (v) => { icon = v; }); swatches(panel, "Color", COLORS, color, true, (v) => { color = v; });
  const err = E("div", "fm-err", panel), row = E("div", "fm-row", panel), save = E("button", "fm-b pri", row, "Save"), back = E("button", "fm-b", row, "Back"); back.onclick = () => void tools(k);
  save.onclick = async () => { const name = nm.value.trim().slice(0, 14); if (!name) { err.textContent = "Type a nickname."; return; } if (KIDS.some((x) => x.id !== k.id && x.name.toLowerCase() === name.toLowerCase())) { err.textContent = "Another child already has that nickname."; return; }
    try { k.name = name; k.age = ag.value; k.color = color; k.icon = icon; await B.saveKid(USER!.uid, k); if (activeKid === k.id) lset({ ...lget(), kidName: name }); paintBtn(); void tools(k); } catch (e) { err.textContent = errText(e); } };
}

async function tools(k: KidDoc) {
  card(`${k.name}: parent tools`); const body = E("div", "", panel); const msg = E("div", "fm-err", panel); const back = E("button", "fm-b", panel, "Back"); back.onclick = () => profiles();
  let prog: any = null; try { const d = await B.getData(USER!.uid, k.id, "unify.progress.v1"); prog = d ? JSON.parse(d.json) : null; } catch (e) { msg.textContent = errText(e); }
  if (activeKid === k.id) { try { prog = JSON.parse(readKey("unify.progress.v1") || "null") ?? prog; } catch { /* keep cloud copy */ } }
  E("h2", "", body, "Report card"); const g = gradesFromState(prog), t = E("table", "fm-tb", body), hd = E("tr", "", t); ["Class", "Lessons", "Labs", "Grade"].forEach((h) => E("th", "", hd, h));
  for (const x of g) { const r = E("tr", "", t); E("td", "", r, SUBJECT_NAME[x.subject]); E("td", "", r, `${x.done} of ${x.total}`); E("td", "", r, x.labPct == null ? "none yet" : `${Math.round(x.labPct * 100)}%`); E("td", "", r, x.letter).style.fontWeight = "700"; }
  const days = prog?.days ? Object.keys(prog.days).sort() : []; E("p", "fm-sm", body, days.length ? `Last class planned: ${days[days.length - 1]}` : "No classes planned yet.");
  const row = E("div", "fm-row", body);
  const ed = E("button", "fm-b", row, "Edit profile"); ed.onclick = () => editKid(k);
  const rp = E("button", "fm-b", row, "Change code"); rp.onclick = () => { const n = prompt("New 4-digit code for " + k.name); if (n && /^\d{4}$/.test(n)) void (async () => { if (await codeTaken(n, k.id)) { msg.style.color = ""; msg.textContent = "That code is already used in your family."; return; } k.salt = rnd(8); k.hash = await hashPin(k.salt, n); await B.saveKid(USER!.uid, k); msg.style.color = "#2f7a4c"; msg.textContent = "Code changed."; })(); else if (n) msg.textContent = "A code is 4 numbers."; };
  const rm = E("button", "fm-b", row, "Delete this profile"); rm.onclick = async () => { if (!confirm(`Delete ${k.name} and all of their saved progress? This cannot be undone.`)) return; try { await B.deleteKid(USER!.uid, k.id); if (activeKid === k.id) { clearLocal(null); lset({ mode: "family" }); activeKid = null; } profiles(); } catch (e) { msg.textContent = errText(e); } };
  const da = E("button", "fm-b", row, "Delete my account and everything"); da.onclick = async () => { if (!confirm("Delete the parent account, every child profile and all saved data? This cannot be undone.")) return; try { await B.deleteAccount(USER!.uid); clearLocal(null); lset({ mode: "guest" }); location.reload(); } catch (e) { msg.textContent = errText(e); } };
}

/* ---------------- start ---------------- */
function start() {
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  root = E("div", "", document.body); root.id = "fam"; panel = E("div", "fm-p", root); root.addEventListener("keydown", (e) => e.stopPropagation()); root.addEventListener("click", (e) => { if (e.target === root && (USER || lget().mode)) close(); });
  const nav = document.querySelector("nav"), phone = document.getElementById("tPhone"); btn = E("button", "") as HTMLButtonElement; btn.id = "tFam"; if (nav && phone) nav.insertBefore(btn, phone.nextSibling); else document.body.appendChild(btn); btn.onclick = () => { if (USER && role() === "kid" && activeKid) void kidHome(); else if (USER && !role()) void checkin(); else open(); };
  activeKid = lget().mode === "family" ? lget().kid ?? null : null; paintBtn();
  if (!(window as any).__FIREBASE && !(window as any).__FAMILY_BACKEND) { btn.style.display = "none"; return; }       // no cloud configured: guest play only
  B = (window as any).__FAMILY_BACKEND ?? firebaseBackend();
  B.onUser(async (u) => {
    if ((u?.uid ?? null) !== (USER?.uid ?? null)) { PROFILE = null; PROFILE_LOADED = false; }
    USER = u;
    if (u && activeKid) { try { KIDS = await B.kids(u.uid); if (!KIDS.some((k) => k.id === activeKid)) { clearLocal(null); lset({ mode: "family" }); activeKid = null; } else if (await pull(u.uid, activeKid, false) && !sessionStorage.getItem("unify.family.reloaded")) { sessionStorage.setItem("unify.family.reloaded", "1"); location.reload(); return; } } catch { /* offline: keep playing */ } }
    if (!u && activeKid) activeKid = null;                                  // signed out elsewhere: stop syncing, keep playing locally
    paintBtn(); if (u && !role()) { void checkin(); return; } if (!u && lget().mode === "family") { open(); return; } if (!lget().mode && !root.classList.contains("show")) open();
  });
  setInterval(() => { if (document.visibilityState === "visible" && activeKid) void pushNow(); }, 15000);
  addEventListener("pagehide", () => { void pushNow(); }); document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") void pushNow(); });
  (window as any).__family = { open, pushNow, get kid() { return activeKid; }, get user() { return USER; } };
}
if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
