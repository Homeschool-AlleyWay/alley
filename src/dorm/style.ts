/** Render styles for My Dorm. Both implement the same Style contract (types.ts). */
import type { Style, StyleId } from "./types";
import { createPapercut } from "./style-papercut";
import { createPixar } from "./style-pixar";

export const STYLES: Record<StyleId, Style> = { papercut: createPapercut(), pixar: createPixar() };
export const getStyle = (id: StyleId): Style => STYLES[id] ?? STYLES.papercut;
/** ?style=pixar|papercut, default papercut */
export function styleFromUrl(): StyleId {
  try { const s = new URLSearchParams(location.search).get("style"); return s === "pixar" ? "pixar" : "papercut"; } catch { return "papercut"; }
}
