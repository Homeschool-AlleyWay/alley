/** Computer panel: the UNIFY desktop launcher. In the school shell each icon asks the shell to open that app; standalone they link to index.html. */
import { E } from "./dom";

const um = (): any => { try { return (window as any).UnifyMail || (window.parent !== window ? (window.parent as any).UnifyMail : null) || null; } catch { return null; } };
export const canEditDesk = (): boolean => { try { return !!(window.parent !== window && (window.parent as any).__live?.canEdit === true); } catch { return false; } };
export async function unreadMail(): Promise<number> { try { const m = um(); if (m?.unread) return Number(await m.unread()) || 0; } catch { /* mail not set up */ } return 0; }
export const inShell = () => window.parent !== window;

interface App { app: string; icon: string; name: string; color: string }
export const APPS: App[] = [
  { app: "mail", icon: "✉️", name: "Mail", color: "#4F91C7" }, { app: "news", icon: "📰", name: "News", color: "#E07A66" }, { app: "phone", icon: "💬", name: "Messages", color: "#4E8A64" },
  { app: "games", icon: "🎮", name: "Games", color: "#8D6BD4" }, { app: "desk", icon: "🗞️", name: "Newsroom Desk", color: "#2B3A55" }, { app: "opendoor", icon: "🚪", name: "The Open Door", color: "#E8A33D" },
];

export function openComputer(body: HTMLElement): () => void {
  const scr = E("div", "desk-screen", body); E("h3", "", scr, "💻 UNIFY desktop"); E("div", "dp-note", scr, "Pick an app to open it.").style.color = "#dbe9f5";
  const grid = E("div", "app-grid", scr), apps = APPS.filter((a) => a.app !== "desk" || canEditDesk()), badges: Record<string, HTMLElement> = {};
  for (const a of apps) {
    const el: HTMLElement = inShell() ? E("button", "app", grid) : Object.assign(E("a", "app", grid), { href: "index.html" });
    el.style.background = a.color; E("b", "", el, a.icon); E("span", "", el, a.name); el.setAttribute("aria-label", a.name);
    if (el instanceof HTMLButtonElement) { el.type = "button"; el.onclick = () => window.parent.postMessage({ type: "unify:open-app", app: a.app }, "*"); }
    badges[a.app] = el;
  }
  if (!inShell()) E("p", "dp-note", scr, "These open inside UNIFY Academy.").style.color = "#dbe9f5";
  let dead = false;
  unreadMail().then((n) => { if (dead || !n) return; const el = badges.mail; if (el) { E("i", "", el, String(n)); el.setAttribute("aria-label", `Mail, ${n} unread`); } });
  return () => { dead = true; };
}
