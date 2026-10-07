/** The hallway news TV: headlines from the live news service (the same one the Newsroom uses), or the school bulletin when it can't be reached. */
import { slotsFor, clock12, SUBJECT_NAME, ALL_SUBJECTS } from "./progress";

export interface NewsItem { tag: string; title: string; sub: string; link?: string }
let items: NewsItem[] = [], live = false, loadedAt = 0, loading = false; const subs = new Set<() => void>();
const ageGrade = (): string => { try { const a = JSON.parse(localStorage.getItem("unify.social.v1") || "{}").profile?.avatar?.age; return ({ k2: "2", g35: "4", g68: "7", hs: "10" } as any)[a] ?? "6"; } catch { return "6"; } };

/** school bulletin: today's session times, so the TV is never blank */
export function bulletin(): NewsItem[] {
  const out: NewsItem[] = [{ tag: "SCHOOL BULLETIN", title: "Welcome to UNIFY Academy", sub: "Check the class-times board on the plaza to book today's sessions." }];
  for (const s of ALL_SUBJECTS.slice(0, 4)) out.push({ tag: "TODAY'S CLASSES", title: `${SUBJECT_NAME[s]} sessions`, sub: slotsFor(s).map(clock12).join("  ·  ") });
  out.push({ tag: "REMINDER", title: "Visit your locker", sub: "Your grades and report card are inside. Press L at any locker." });
  return out;
}
export const newsItems = (): NewsItem[] => (items.length ? items : bulletin());
export const newsIsLive = () => live;
export const onNews = (f: () => void) => { subs.add(f); };

/** fetch the broadcast once in a while (every 30 minutes); fail quietly to the bulletin */
export async function loadNews(force = false): Promise<void> {
  if (loading || (!force && Date.now() - loadedAt < 30 * 60e3 && items.length)) return; loading = true;
  try {
    const p = new URLSearchParams(); p.set("grade", ageGrade()); p.set("edition", new Date().getHours() < 12 ? "am" : "pm"); try { p.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { /* none */ }
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 14000); const r = await fetch("/api/broadcast?" + p.toString(), { cache: "no-store", signal: ac.signal }); clearTimeout(to);
    if (!r.ok) throw new Error(String(r.status)); const j = await r.json(); const st: any[] = Array.isArray(j.stories) ? j.stories : [];
    const got = st.filter((x) => x && x.title).slice(0, 12).map((x): NewsItem => ({ tag: String(x.source || "NEWS").toUpperCase().slice(0, 28), title: String(x.title).slice(0, 150), sub: String(x.snippet || "").slice(0, 220), link: typeof x.link === "string" ? x.link : undefined }));
    if (got.length) { items = got; live = true; loadedAt = Date.now(); subs.forEach((f) => f()); }
  } catch { /* offline or no service: the bulletin stays */ }
  loading = false;
}

/* ---------------- the full panel (tap the TV) ---------------- */
const CSS = `.ntv{position:fixed;inset:0;z-index:74;display:none;align-items:center;justify-content:center;background:rgba(40,30,30,.6);font-family:var(--ui,"Fredoka","Trebuchet MS",system-ui,sans-serif);color:var(--ink,#4A3B3F)}.ntv.show{display:flex}
.ntv-p{width:min(640px,96vw);max-height:92vh;overflow:auto;background:var(--kraft,#F3E7CF);border-radius:16px;border:1px solid rgba(255,255,255,.75);box-shadow:0 3px 0 var(--edge,#C9B28A),0 14px 34px rgba(60,40,30,.45);padding:14px;display:flex;flex-direction:column;gap:8px;box-sizing:border-box}
.ntv-p h2{margin:0;font-size:20px;font-weight:600}.ntv-i{background:#fffdf8;border-radius:10px;padding:8px 10px;border:1px solid rgba(74,59,63,.15)}.ntv-i small{color:#c4463c;font-weight:600;font-size:11px;letter-spacing:.4px}.ntv-i b{display:block;font-size:16px;margin:2px 0}.ntv-i span{font-size:14px;color:var(--soft,#8A7A70)}
.ntv-b{font:inherit;font-size:14px;padding:7px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.8);background:#FFF9F0;color:inherit;cursor:pointer;box-shadow:0 2px 0 var(--edge,#C9B28A);min-height:36px}`;
let root: HTMLElement | null = null, styled = false;
export function openNewsPanel(onClose: () => void, onNewsroom?: () => void) {
  if (!styled) { styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }
  if (!root) { root = document.createElement("div"); root.className = "ntv"; document.body.appendChild(root); } const R = root; R.innerHTML = ""; R.classList.add("show");
  const P = document.createElement("div"); P.className = "ntv-p"; R.appendChild(P); const h = document.createElement("h2"); h.textContent = live ? "UNIFY News: today's headlines" : "School bulletin (the news service isn't connected)"; P.appendChild(h);
  for (const it of newsItems()) { const d = document.createElement("div"); d.className = "ntv-i"; const t = document.createElement("small"); t.textContent = it.tag; const b = document.createElement("b"); b.textContent = it.title; const sp = document.createElement("span"); sp.textContent = it.sub; d.append(t, b, sp); P.appendChild(d); }
  const row = document.createElement("div"); row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap"; P.appendChild(row);
  const close = () => { R.classList.remove("show"); onClose(); };
  if (onNewsroom) { const n = document.createElement("button"); n.className = "ntv-b"; n.textContent = "Open the Newsroom"; n.onclick = () => { close(); onNewsroom(); }; row.appendChild(n); }
  const c = document.createElement("button"); c.className = "ntv-b"; c.textContent = "Close"; c.onclick = close; row.appendChild(c); R.onclick = (e) => { if (e.target === R) close(); };
}
