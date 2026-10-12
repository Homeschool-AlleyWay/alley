/** Collage panel + frame state. Pictures live in IndexedDB on this device only (src/dorm/photos.ts); the layout only remembers which ids are in the frame. */
import * as photos from "../photos";
import type { PhotoRec } from "../photos";
import type { DormLayout } from "../types";
import { E, btn } from "./dom";

export class Collage {
  recs: PhotoRec[] = []; private url = new Map<string, string>(); private busy = false; private listeners = new Set<() => void>();
  constructor(private apply: (urls: string[]) => void, private layout: () => DormLayout, private save: () => void) {}
  /** ids in the frame: the student's choice, else the newest 12 */
  frameIds(): string[] { const have = new Set(this.recs.map((r) => r.id)), ch = this.layout().photos; return (ch ? ch.filter((i) => have.has(i)) : this.recs.map((r) => r.id)).slice(0, 12); }
  private inFrame(id: string) { return this.frameIds().includes(id); }
  setFrame(ids: string[]) { this.layout().photos = ids.slice(0, 12); this.save(); this.push(); }
  toggle(id: string): string | null {
    const ids = this.frameIds(); const i = ids.indexOf(id);
    if (i >= 0) ids.splice(i, 1); else if (ids.length >= 12) return "The frame holds 12 pictures. Take one out first."; else ids.push(id);
    this.setFrame(ids); return null;
  }
  push() { this.apply(this.frameIds().map((i) => this.url.get(i)!).filter(Boolean)); this.listeners.forEach((f) => f()); }
  onUpdate(f: () => void) { this.listeners.add(f); return () => this.listeners.delete(f); }
  async refresh() {
    if (this.busy) return; this.busy = true;
    try { const recs = await photos.listPhotos(); for (const [id, u] of this.url) if (!recs.some((r) => r.id === id)) { URL.revokeObjectURL(u); this.url.delete(id); } for (const r of recs) if (!this.url.has(r.id)) this.url.set(r.id, URL.createObjectURL(r.blob)); this.recs = recs; } catch { /* keep what we had */ }
    this.busy = false; this.push();
  }
  urlOf(id: string) { return this.url.get(id) ?? ""; }
  async add(files: Blob[], kind: photos.PhotoKind = "photo"): Promise<string> {
    let err = ""; for (const f of files) { const r = await photos.addPhoto(f, kind); if (!r.ok) { err = r.error; break; } }
    await this.refresh(); return err;
  }
  async remove(id: string) { await photos.deletePhoto(id); if (this.layout().photos) this.layout().photos = this.layout().photos!.filter((x) => x !== id); this.save(); await this.refresh(); }
  async caption(id: string, t: string) { await photos.captionPhoto(id, t); const r = this.recs.find((x) => x.id === id); if (r) r.caption = t.slice(0, 120); }
  dispose() { for (const u of this.url.values()) URL.revokeObjectURL(u); this.url.clear(); }
}

export function openCollage(body: HTMLElement, c: Collage, snapshot: () => Promise<Blob | null>): () => void {
  E("p", "dp-note", body, "📌 Photos stay on this device. Nothing here is uploaded.");
  const msg = E("div", "dp-err", body); msg.setAttribute("aria-live", "polite");
  const row = E("div", "dp-row", body), file = E("input", "", body) as HTMLInputElement; file.type = "file"; file.accept = "image/*"; file.multiple = true; file.hidden = true; file.setAttribute("aria-label", "Choose pictures");
  btn(row, "➕ Add pictures", () => file.click(), "dp-btn go");
  btn(row, "📷 Snapshot this room", async () => { msg.textContent = ""; const b = await snapshot(); if (!b) { msg.textContent = "Couldn't take the snapshot. Try again."; return; } msg.textContent = (await c.add([b], "photo")) || ""; }, "dp-btn");
  file.onchange = async () => { const fs = Array.from(file.files ?? []); file.value = ""; if (fs.length) msg.textContent = (await c.add(fs)) || ""; };
  const count = E("div", "dp-lab", body), grid = E("div", "thumbs", body), askDel = { id: "" };
  const draw = () => {
    grid.innerHTML = ""; const ids = c.frameIds(); count.textContent = `In the frame: ${ids.length} of 12`;
    if (!c.recs.length) E("p", "dp-note", grid, "No pictures yet. Add some, snapshot your room, or tap 📸 at the top of school to save a screenshot of class.").style.gridColumn = "1/-1";
    for (const r of c.recs) {
      const t = E("div", "th", grid), im = E("img", "", t) as HTMLImageElement; im.src = c.urlOf(r.id); im.alt = r.caption || (r.kind === "screenshot" ? "School screenshot" : "Picture"); im.loading = "lazy";
      const on = ids.includes(r.id), pin = btn(t, on ? "📌" : "📍", () => { const e = c.toggle(r.id); msg.textContent = e ?? ""; }, "dp-btn dp-sm pin" + (on ? " on" : ""), (on ? "Take out of the frame: " : "Put in the frame: ") + (r.caption || "picture")); pin.setAttribute("aria-pressed", String(on));
      const cap = E("input", "dp-in", t) as HTMLInputElement; cap.type = "text"; cap.maxLength = 120; cap.value = r.caption; cap.placeholder = "Caption"; cap.setAttribute("aria-label", "Caption"); cap.style.minHeight = "36px"; cap.style.padding = "4px 8px"; cap.onchange = () => c.caption(r.id, cap.value);
      const del = btn(t, askDel.id === r.id ? "Really delete?" : "🗑 Delete", () => { if (askDel.id === r.id) { askDel.id = ""; c.remove(r.id); } else { askDel.id = r.id; draw(); } }, "dp-btn dp-sm" + (askDel.id === r.id ? " go" : ""), "Delete picture");
      void del;
    }
  };
  draw(); const off = c.onUpdate(draw); c.refresh();
  return () => { off(); };
}
