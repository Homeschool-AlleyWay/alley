/** Style panel: the two looks, graphics quality, auto-rotate, time of day and room labels. */
import type { StyleId } from "../types";
import { E, btn } from "./dom";

export type Gfx = "auto" | "high" | "low";
export type TimeOpt = "auto" | "day" | "night";
export interface StyleCtx {
  style(): StyleId; setStyle(s: StyleId): void; gfx(): Gfx; setGfx(g: Gfx): void; gfxNow(): string;
  spin(): boolean; setSpin(b: boolean): void; time(): TimeOpt; setTime(t: TimeOpt): void; labels(): boolean; setLabels(b: boolean): void;
}
export function openStylePanel(body: HTMLElement, c: StyleCtx): () => void {
  const group = <T extends string>(title: string, opts: [T, string][], get: () => T, set: (v: T) => void, note?: () => string) => {
    E("div", "dp-lab", body, title); const row = E("div", "dp-row", body), nt = note ? E("div", "dp-note", body) : null;
    const draw = () => { row.innerHTML = ""; for (const [id, l] of opts) { const b = btn(row, l, () => { set(id); draw(); }, "dp-btn" + (get() === id ? " on" : "")); b.setAttribute("aria-pressed", String(get() === id)); } if (nt && note) nt.textContent = note(); };
    draw();
  };
  group<StyleId>("Look", [["papercut", "✂️ Paper cut"], ["pixar", "🎬 Movie"]], c.style, c.setStyle, () => "Your room and your avatar are rebuilt in the new look. Nothing is lost.");
  group<Gfx>("Graphics", [["auto", "Auto"], ["high", "High"], ["low", "Low"]], c.gfx, c.setGfx, () => `Now using: ${c.gfxNow()}. Choose Low if the room feels slow.`);
  group<"on" | "off">("Spin the room", [["off", "Off"], ["on", "Slowly spin"]], () => (c.spin() ? "on" : "off"), (v) => c.setSpin(v === "on"));
  group<TimeOpt>("Time of day", [["auto", "Follows the clock"], ["day", "Daytime"], ["night", "Night"]], c.time, c.setTime);
  group<"on" | "off">("Names on things", [["on", "Show"], ["off", "Hide"]], () => (c.labels() ? "on" : "off"), (v) => c.setLabels(v === "on"), () => "Name tags are shown in the Paper cut look.");
  E("p", "dp-note", body, "Tip: drag to look around, pinch or scroll to zoom. Tap the wardrobe, desk, folder, binder, mirror, backpack or collage.");
  return () => {};
}
