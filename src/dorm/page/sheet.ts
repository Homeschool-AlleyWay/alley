/** The dock (buttons) and the sheet (one panel at a time: right side on desktop, bottom sheet on phones). */
import { E } from "./dom";

export interface PanelDef {
  id: string; icon: string; label: string; title?: string;
  /** fill the body; return a cleanup function. `fill` makes the body a non-scrolling flex column (the avatar editor scrolls itself) */
  open(body: HTMLElement): void | (() => void);
  fill?: boolean;
}
export interface DockItem { id: string; icon: string; label: string; onClick(): void; cls?: string }

export class Shell {
  readonly dock: HTMLElement; readonly sheet: HTMLElement; readonly body: HTMLElement; private h2: HTMLElement; private closeBtn: HTMLButtonElement;
  private panels = new Map<string, PanelDef>(); private buttons = new Map<string, HTMLButtonElement>(); private cleanup: (() => void) | null = null;
  openId: string | null = null; private opener: HTMLElement | null = null;
  onChange: (id: string | null, prev: string | null) => void = () => {};
  constructor(root: HTMLElement) {
    this.dock = E("nav", "", root); this.dock.id = "dock"; this.dock.setAttribute("aria-label", "My dorm");
    this.sheet = E("section", "", root); this.sheet.id = "sheet"; this.sheet.tabIndex = -1; this.sheet.setAttribute("role", "dialog");
    const hd = E("header", "", this.sheet); this.h2 = E("h2", "", hd); this.closeBtn = E("button", "x", hd, "✕"); this.closeBtn.type = "button"; this.closeBtn.setAttribute("aria-label", "Close panel"); this.closeBtn.onclick = () => this.close();
    this.body = E("div", "", this.sheet); this.body.id = "sbody";
    this.sheet.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); this.close(); } });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && this.openId && !e.defaultPrevented) { this.close(); } });
    this.sheet.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
  }
  addDock(it: DockItem) {
    const b = E("button", "dk" + (it.cls ? " " + it.cls : ""), this.dock); b.type = "button"; b.dataset.id = it.id; b.dataset.label = it.label; b.id = "dk-" + it.id;
    E("b", "", b, it.icon).setAttribute("aria-hidden", "true"); E("span", "", b, it.label); b.setAttribute("aria-label", it.label);
    b.onclick = () => it.onClick(); this.buttons.set(it.id, b); return b;
  }
  badge(id: string, n: number) {
    const b = this.buttons.get(id); if (!b) return; b.querySelector("i")?.remove();
    if (n > 0) { E("i", "", b, String(n > 99 ? "99+" : n)); b.setAttribute("aria-label", `${b.dataset.label ?? b.textContent} (${n} new)`); }
  }
  register(p: PanelDef) { this.panels.set(p.id, p); const b = this.addDock({ id: p.id, icon: p.icon, label: p.label, onClick: () => this.toggle(p.id) }); b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-haspopup", "dialog"); return b; }
  toggle(id: string) { if (this.openId === id) this.close(); else this.open(id); }
  open(id: string) {
    const p = this.panels.get(id); if (!p) return;
    const prev = this.openId; if (prev) this.teardown();
    this.opener = this.buttons.get(id) ?? null;
    this.openId = id; this.h2.textContent = `${p.icon} ${p.title ?? p.label}`; this.sheet.setAttribute("aria-label", p.title ?? p.label);
    this.body.innerHTML = ""; this.body.className = p.fill ? "fill" : ""; this.body.scrollTop = 0; this.sheet.classList.add("show");
    for (const [k, b] of this.buttons) b.setAttribute("aria-pressed", String(k === id)); this.buttons.get(id)?.setAttribute("aria-expanded", "true");
    this.cleanup = p.open(this.body) || null;
    this.onChange(id, prev);
    this.sheet.focus({ preventScroll: true });
  }
  private teardown() { try { this.cleanup?.(); } catch { /* panel cleanup must never break the page */ } this.cleanup = null; this.body.innerHTML = ""; }
  close() {
    if (!this.openId) return; const prev = this.openId; this.teardown(); this.openId = null; this.sheet.classList.remove("show");
    for (const b of this.buttons.values()) { b.setAttribute("aria-pressed", "false"); b.removeAttribute("aria-expanded"); }
    this.onChange(null, prev);
    const o = this.opener; this.opener = null; try { o?.focus({ preventScroll: true }); } catch { /* ignore */ }
  }
  /** how much of the screen the sheet covers, for shifting the 3D view (px) */
  coverage(): { x: number; y: number } {
    if (!this.openId) return { x: 0, y: 0 };
    const r = this.sheet.getBoundingClientRect(), mobile = matchMedia("(max-width:700px)").matches;
    return mobile ? { x: 0, y: r.height + (innerHeight - r.bottom) } : { x: r.width + (innerWidth - r.right), y: 0 };
  }
}
