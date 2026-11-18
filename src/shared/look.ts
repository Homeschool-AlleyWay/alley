// Which look the whole app uses. The normal academy is "papercut"; the separate Pixar build sets window.UNIFY_LOOK = "pixar"
// (through look.js, loaded first on every page). ?look=pixar|papercut also works for testing and is remembered.
export type LookId = "papercut" | "pixar";
const KEY = "unify.look";
export function lookId(): LookId {
  try {
    const w = window as unknown as { UNIFY_LOOK?: string };
    const q = new URLSearchParams(location.search).get("look");
    if (q === "pixar" || q === "papercut") { try { localStorage.setItem(KEY, q); } catch { /* ignore */ } return q; }
    if (w.UNIFY_LOOK === "pixar" || w.UNIFY_LOOK === "papercut") return w.UNIFY_LOOK;
    const s = localStorage.getItem(KEY);
    if (s === "pixar" || s === "papercut") return s;
  } catch { /* private mode etc. */ }
  return "papercut";
}
export const isPixar = (): boolean => lookId() === "pixar";
