/** Tiny DOM helpers shared by the dorm page panels. */
export const E = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", parent?: HTMLElement | null, text = "") => {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e;
};
export const btn = (parent: HTMLElement, label: string, fn: () => void, cls = "dp-btn", aria?: string) => {
  const b = E("button", cls, parent, label); b.type = "button"; b.onclick = fn; if (aria) b.setAttribute("aria-label", aria); return b;
};
export const debounce = <A extends unknown[]>(fn: (...a: A) => void, ms: number) => { let t = 0; return (...a: A) => { clearTimeout(t); t = window.setTimeout(() => fn(...a), ms); }; };
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** read a JSON value from localStorage without ever throwing */
export const lsGet = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v == null ? d : (JSON.parse(v) as T); } catch { return d; } };
export const lsRaw = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
export const lsSet = (k: string, v: string): boolean => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
