/** Entry for news.html: the 3D papercut newsroom. Falls back to the classic 2D page (news2d.html) when WebGL is not available. */
import { Broadcast } from "../src/news/broadcast";
import { startNewsroom, type NoteItem, type ViewName } from "../src/news/room3d";
import { FIELD_REPORT_MAX, bandOf, loadCloud, loadLocal } from "../src/news/fieldreports";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const classic = () => { location.replace("news2d.html" + location.search); };
const bc = new Broadcast(loadLocal(), bandOf());
let room: ReturnType<typeof startNewsroom>;
try { room = startNewsroom($("gl"), bc); } catch (err) { console.warn("newsroom 3D failed:", err); classic(); throw new Error("WebGL unavailable: using the classic newsroom"); }
(window as any).__newsroom = { room, bc };
$("boot").hidden = true;

/* ---- report list (never more than FIELD_REPORT_MAX; high-school badge) ---- */
const list = $("rlist"), count = $("rcount");
function paintList() {
  list.textContent = ""; count.textContent = `${bc.list.length} / ${FIELD_REPORT_MAX}`;
  bc.list.forEach((r, i) => {
    const b = document.createElement("button"); b.className = "ritem" + (i === bc.idx ? " on" : ""); b.type = "button"; b.dataset.id = r.id;
    const n = document.createElement("span"); n.className = "num"; n.textContent = String(i + 1);
    const t = document.createElement("span"); t.className = "rt"; t.textContent = r.title;
    const tag = document.createElement("small"); tag.textContent = r.topic; t.appendChild(tag);
    b.append(n, t); if (r.audience === "hs") { const h = document.createElement("span"); h.className = "hs"; h.textContent = "High school"; b.appendChild(h); }
    b.onclick = () => { bc.jump(i); if (matchMedia("(max-width:700px)").matches) $("drawer").classList.remove("open"); };
    list.appendChild(b);
  });
  list.querySelector(".ritem.on")?.scrollIntoView({ block: "nearest" });
  $("nowt").textContent = bc.current ? bc.current.title : "";
  const hsTag = $("nowhs"); hsTag.hidden = bc.current?.audience !== "hs";
  const pp = $("bPlay"); pp.textContent = bc.playing ? "⏸" : "▶"; pp.setAttribute("aria-label", bc.playing ? "Pause" : "Play");
}
let lastIdx = -1; bc.onChange = () => { paintList(); lastIdx = bc.idx; };
paintList(); setInterval(() => { if (bc.idx !== lastIdx) { paintList(); lastIdx = bc.idx; } }, 400);

/* ---- controls ---- */
$("bPlay").onclick = () => bc.setPlaying(!bc.playing); $("bNext").onclick = () => bc.next(); $("bPrev").onclick = () => bc.prev();
const voiceBtn = $("bVoice"); voiceBtn.onclick = () => { bc.narrate = !bc.narrate; voiceBtn.classList.toggle("on", bc.narrate); voiceBtn.textContent = bc.narrate ? "🔊" : "🔇"; if (!bc.narrate) try { speechSynthesis.cancel(); } catch { /* none */ } else bc.setPlaying(true); };
document.querySelectorAll<HTMLElement>("[data-view]").forEach((b) => (b.onclick = () => { room.setView(b.dataset.view as ViewName); document.querySelectorAll("[data-view]").forEach((x) => x.classList.toggle("on", x === b)); }));
$("bList").onclick = () => $("drawer").classList.toggle("open");
room.onScreen = () => bc.setPlaying(!bc.playing);
if (innerWidth / innerHeight < 0.9) { room.setView("screen"); document.querySelectorAll("[data-view]").forEach((x) => x.classList.toggle("on", (x as HTMLElement).dataset.view === "screen")); }

/* ---- bulletin board notes: the academy feed (relayed by the shell), the desk's local demo posts, or a welcome note ---- */
const KINDS = ["bulletin", "announcement", "story", "alert"];
function fromFeed(posts: any[], events: any[]): NoteItem[] {
  const a = (posts || []).map((p) => ({ id: "p" + p.id, kind: KINDS.includes(p.kind) ? p.kind : "bulletin", title: String(p.title || ""), body: String(p.body || ""), when: p.starts_at, pinned: !!p.pinned }));
  const e = (events || []).map((x) => ({ id: "e" + x.id, kind: "event", title: String(x.title || ""), body: [x.description, x.room ? "Room: " + x.room : "", x.host ? "Host: " + x.host : ""].filter(Boolean).join("\n"), when: x.starts_at, pinned: !!x.live }));
  return [...a, ...e].sort((x, y) => Number(y.pinned) - Number(x.pinned));
}
function localNotes(): NoteItem[] {
  try { const o = JSON.parse(localStorage.getItem("unify.newsdesk.local") || "null"); if (o && o.news_posts) return fromFeed(o.news_posts.filter((p: any) => p.status === "published"), (o.academy_events || []).filter((p: any) => p.status === "published")); } catch { /* none */ }
  return [];
}
const WELCOME: NoteItem[] = [{ id: "w1", kind: "bulletin", title: "Welcome to the Newsroom", body: "Watch the field reports on the big screen. Press next to skip to the following report.", pinned: true }, { id: "w2", kind: "announcement", title: "Class times board", body: "Pick today's session times on the class-times board in the plaza." }, { id: "w3", kind: "story", title: "Field reports", body: `Up to ${FIELD_REPORT_MAX} short papercut films about science, nature, community, history, sports, arts, safety and tech.` }];
let feed: NoteItem[] = localNotes();
const paintNotes = () => room.setNotes(feed.length ? feed : WELCOME);
paintNotes();
addEventListener("message", (e) => { const m = e.data; if (!m) return; if (m.type === "academy:live") { feed = fromFeed(m.posts, m.events); paintNotes(); } else if (m.type === "unify:hide") { bc.setPlaying(false); } else if (m.type === "unify:show") { bc.setPlaying(true); } });
addEventListener("academy:live", ((e: CustomEvent) => { feed = fromFeed(e.detail?.posts, e.detail?.events); paintNotes(); }) as EventListener);
const np = $("note");
room.onNote = (n) => { $("noteKind").textContent = n.kind; $("noteTitle").textContent = n.title; $("noteBody").textContent = n.body || "No more details."; $("noteWhen").textContent = n.when ? new Date(n.when).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""; np.hidden = false; };
$("noteX").onclick = () => { np.hidden = true; }; addEventListener("keydown", (e) => { if (e.key === "Escape") np.hidden = true; });

/* ---- shared newsroom list from the cloud (if the setting exists); local list otherwise ---- */
(async () => { try { const w = window as any; if (!w.__SUPABASE || !w.__supa) return; const c = await w.__supa(), s = await loadCloud(c); if (s) bc.setStore(s); } catch { /* local list stays */ } })();
